const BASE = ''

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (json.code !== 200) throw new Error(json.message || `请求失败 (code=${json.code})`)
  return json.data as T
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res)
}

export async function upload<T>(method: string, path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method, body: formData })
  return handleResponse<T>(res)
}

export const get = <T>(path: string) => request<T>('GET', path)
export const del = (path: string) => request<void>('DELETE', path)
