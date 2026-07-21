<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Select from 'primevue/select'
import { formatDateTime } from '@/shared/utils/date'
import {
  getMemoryLogs, getLogVersion, queryLogs,
  type LogEntry, type LogLevel,
} from '@/shared/utils/logger'
import JsTreeNode from './JsTreeNode.vue'
import { toJsNode } from './js-tree'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const showDb = ref(false)
const dbLogs = ref<LogEntry[]>([])
const dbLoading = ref(false)
const levelFilter = ref<LogLevel | null>(null)
const version = ref(0)
const detailEntry = ref<LogEntry | null>(null)

let pollTimer: ReturnType<typeof setInterval>
onUnmounted(() => clearInterval(pollTimer))

function startPolling() {
  pollTimer = setInterval(() => { version.value = getLogVersion() }, 1000)
}
startPolling()

const memoryLogs = computed(() => {
  version.value
  return [...getMemoryLogs()].reverse()
})

const displayLogs = computed(() => showDb.value ? dbLogs.value : memoryLogs.value)

const levelOptions = [
  { label: '全部', value: null },
  { label: 'Debug', value: 'debug' },
  { label: 'Info', value: 'info' },
  { label: 'Warn', value: 'warn' },
  { label: 'Error', value: 'error' },
]

function showMemoryLogs() { showDb.value = false }

async function loadDbLogs() {
  dbLoading.value = true
  try {
    dbLogs.value = await queryLogs({ level: levelFilter.value ?? undefined, limit: 200 })
    showDb.value = true
  } finally { dbLoading.value = false }
}

function close() { emit('update:visible', false) }

function openDetail(entry: LogEntry) { detailEntry.value = entry }

function levelClass(level: LogLevel) { return `log-level--${level}` }

const detailTree = computed(() => detailEntry.value ? toJsNode(detailEntry.value.data) : null)
</script>

<template>
  <Dialog :visible="visible" modal :style="{ width: '90vw' }" header="系统日志" @update:visible="emit('update:visible', $event)">
    <div class="log-tabs">
      <Button label="内存（当前会话）" :severity="showDb ? 'secondary' : 'primary'" size="small" @click="showMemoryLogs" />
      <div class="log-toolbar">
        <Select v-model="levelFilter" :options="levelOptions" option-label="label" option-value="value" size="small" style="width: 120px" />
        <Button icon="pi pi-search" severity="secondary" size="small" label="查询历史" @click="loadDbLogs" :loading="dbLoading" />
      </div>
    </div>

    <div class="log-list">
      <div v-if="displayLogs.length === 0 && !dbLoading" class="log-empty">暂无日志</div>
      <div v-for="(entry, idx) in displayLogs" :key="idx" class="log-entry" :class="levelClass(entry.level)" @click="openDetail(entry)">
        <span class="log-time">{{ formatDateTime(entry.timestamp) }}</span>
        <span class="log-level">{{ entry.level.toUpperCase() }}</span>
        <span class="log-module">{{ entry.module }}</span>
        <span class="log-message">{{ entry.message }}</span>
        <span v-if="entry.data" class="log-data">{{ JSON.stringify(entry.data) }}</span>
      </div>
    </div>

    <template #footer>
      <Button label="关闭" severity="secondary" text @click="close" />
    </template>
  </Dialog>

  <Dialog v-model:visible="detailEntry" :header="detailEntry ? `${detailEntry.module} — ${detailEntry.level.toUpperCase()}` : ''" modal :style="{ width: '620px' }">
    <div v-if="detailEntry">
      <div class="detail-row"><span class="detail-label">时间</span><span>{{ formatDateTime(detailEntry.timestamp) }}</span></div>
      <div class="detail-row"><span class="detail-label">消息</span><span>{{ detailEntry.message }}</span></div>
      <div v-if="detailTree" class="detail-row">
        <span class="detail-label">数据</span>
        <div class="js-tree">
          <JsTreeNode :node="detailTree" :depth="0" />
        </div>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.log-tabs { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.log-toolbar { display: flex; gap: 8px; }
.log-list {
  max-height: 60vh; overflow-y: auto;
  font-family: var(--font-mono); font-size: 12px;
  background: var(--p-surface-50); border-radius: 8px; padding: 8px;
}
html.dark .log-list { background: rgba(255,255,255,0.03); }
.log-empty { text-align: center; color: var(--p-surface-400); padding: 24px; }
.log-entry {
  display: flex; gap: 10px; padding: 4px 6px;
  border-bottom: 1px solid var(--p-surface-100); cursor: pointer; border-radius: 6px;
}
.log-entry:hover { background: var(--p-surface-100); }
html.dark .log-entry:hover { background: var(--p-surface-800); }
.log-entry:last-child { border-bottom: none; }
.log-time { color: var(--p-surface-400); flex-shrink: 0; }
.log-level { color: var(--p-primary-500); flex-shrink: 0; width: 44px; font-weight: 600; }
.log-level--error .log-level { color: var(--p-red-500); }
.log-level--warn .log-level { color: var(--p-yellow-500); }
.log-module { color: var(--p-surface-600); flex-shrink: 0; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.log-message { flex: 1; word-break: break-all; }
.log-data { color: var(--p-surface-400); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.detail-row { display: flex; gap: 12px; margin-bottom: 12px; font-size: 14px; align-items: flex-start; }
.detail-label { width: 44px; flex-shrink: 0; font-weight: 600; color: var(--p-surface-500); }
.js-tree {
  flex: 1; min-width: 0;
  font-family: var(--font-mono); font-size: 13px; line-height: 1.6;
  background: var(--p-surface-50); border-radius: 6px; padding: 10px 14px;
  max-height: 55vh; overflow: auto;
}
html.dark .js-tree { background: rgba(255,255,255,0.04); }
</style>
