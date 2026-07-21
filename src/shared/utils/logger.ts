export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  id?: number
  timestamp: number
  level: LogLevel
  module: string
  message: string
  data?: unknown
}

const MAX_BUFFER = 500
const RETENTION_DAYS = 7
const DB_NAME = 'tightening-logs'
const DB_VERSION = 1
const STORE_NAME = 'logs'
let logVersion = 0

// ── Memory ring buffer ──

const buffer: LogEntry[] = []

function pushBuffer(entry: LogEntry) {
  buffer.push(entry)
  if (buffer.length > MAX_BUFFER) buffer.shift()
  logVersion++
}

// ── IndexedDB (singleton connection) ──

let _db: IDBDatabase | null = null
let _dbPromise: Promise<IDBDatabase> | null = null

async function getDB(): Promise<IDBDatabase> {
  if (_db) return _db
  if (!_dbPromise) {
    _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    }).then(db => {
      _db = db
      _dbPromise = null
      db.onclose = () => { _db = null }
      db.onerror = () => { _db = null }
      return db
    })
  }
  return _dbPromise
}

async function persistEntry(entry: LogEntry) {
  try {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).add(entry)
  } catch { /* IndexedDB unavailable */ }
}

// ── Cleanup old entries (7 day retention, deferred to first write) ──

let cleanupRan = false

async function cleanupOld() {
  if (cleanupRan) return
  cleanupRan = true
  try {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('timestamp')
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
    const range = IDBKeyRange.upperBound(cutoff)
    const req = index.openCursor(range)
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) { store.delete(cursor.primaryKey); cursor.continue() }
    }
  } catch { /* ignore */ }
}

// ── Query (uses timestamp index when from/to provided) ──

export async function queryLogs(opts: {
  level?: LogLevel
  module?: string
  from?: number
  to?: number
  limit?: number
} = {}): Promise<LogEntry[]> {
  const results: LogEntry[] = []
  try {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const hasRange = opts.from != null || opts.to != null
    const cursorSource = hasRange
      ? store.index('timestamp').openCursor(
          IDBKeyRange.bound(opts.from ?? 0, opts.to ?? Date.now()), 'prev')
      : store.openCursor(null, 'prev')
    await new Promise<void>((resolve) => {
      cursorSource.onsuccess = () => {
        const cursor = cursorSource.result
        if (!cursor || (opts.limit && results.length >= opts.limit)) return resolve()
        const e = cursor.value as LogEntry
        if (opts.level && e.level !== opts.level) { cursor.continue(); return }
        if (opts.module && e.module !== opts.module) { cursor.continue(); return }
        results.push(e)
        cursor.continue()
      }
      cursorSource.onerror = () => resolve()
    })
  } catch { /* ignore */ }
  return results
}

export function getLogVersion(): number {
  return logVersion
}

export function getMemoryLogs(): readonly LogEntry[] {
  return buffer
}

// ── Core log function ──

function log(level: LogLevel, module: string, message: string, data?: unknown) {
  const entry: LogEntry = { timestamp: Date.now(), level, module, message, data }
  pushBuffer(entry)
  persistEntry(entry)
  cleanupOld()

  if (import.meta.env.DEV) {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.log
    fn(`[${module}] ${message}`, data ?? '')
  }
}

export function createLogger(module: string) {
  return {
    debug: (msg: string, data?: unknown) => log('debug', module, msg, data),
    info: (msg: string, data?: unknown) => log('info', module, msg, data),
    warn: (msg: string, data?: unknown) => log('warn', module, msg, data),
    error: (msg: string, data?: unknown) => log('error', module, msg, data),
  }
}
