import { ref } from 'vue'
import { defineStore } from 'pinia'

export type ConnectionStatus = 'connected' | 'disconnected' | 'unconfigured' | 'loading'

export interface ServerStatusResponse {
  status: 'connected' | 'disconnected' | 'unconfigured'
  address: string
  latency: number | null
  errorReason: string
}

const API_BASE = ''
const MOCK_DELAY = 3000 // ms — 模拟网络延迟，方便测试"连接中"状态

export const useServerConnectionStore = defineStore('serverConnection', () => {
  const status = ref<ConnectionStatus>('loading')
  const address = ref('')
  const latency = ref<number | null>(null)
  const errorReason = ref('')

  async function fetchStatus() {
    status.value = 'loading'
    try {
      if (!API_BASE) {
        // Mock: 模拟远程服务器连接成功，延迟 3s 以便观察"连接中"状态
        await new Promise(r => setTimeout(r, MOCK_DELAY))
        status.value = 'connected'
        address.value = '192.168.1.100:8080'
        latency.value = 12
        errorReason.value = ''
        return
      }
      const res = await fetch(`${API_BASE}/api/server/status`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: ServerStatusResponse = await res.json()
      status.value = data.status
      address.value = data.address
      latency.value = data.latency
      errorReason.value = data.errorReason
    } catch {
      status.value = 'unconfigured'
      address.value = ''
      latency.value = null
      errorReason.value = ''
    }
  }

  async function saveConfig(addr: string) {
    const res = await fetch(`${API_BASE}/api/server/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: addr }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await fetchStatus()
  }

  async function testConnection(addr: string): Promise<{ success: boolean; errorReason: string }> {
    if (!API_BASE) {
      await new Promise(r => setTimeout(r, 1500))
      return { success: true, errorReason: '' }
    }
    const res = await fetch(`${API_BASE}/api/server/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: addr }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  async function reconnect() {
    const res = await fetch(`${API_BASE}/api/server/reconnect`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await fetchStatus()
  }

  return { status, address, latency, errorReason, fetchStatus, saveConfig, testConnection, reconnect }
})
