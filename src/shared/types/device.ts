export type DeviceStatus = 'offline' | 'ok' | 'error' | 'warning'

export interface DeviceInstance {
  name: string
  status: 'offline' | 'ok' | 'error'
}

export interface DeviceGroup {
  icon: string
  label: string
  instances: DeviceInstance[]
}

export function aggregateStatus(instances: DeviceInstance[]): DeviceStatus {
  if (instances.length === 0) return 'offline'
  let hasOk = false; let hasError = false; let hasOffline = false
  for (const i of instances) {
    if (i.status === 'ok') hasOk = true
    else if (i.status === 'error') hasError = true
    else if (i.status === 'offline') hasOffline = true
  }
  if (hasOk && !hasError && !hasOffline) return 'ok'
  if (!hasOk && hasError && !hasOffline) return 'error'
  if (!hasOk && !hasError && hasOffline) return 'offline'
  return 'warning'
}

export function statusLabel(s: string): string {
  return { ok: '正常', error: '连接异常', warning: '部分异常', offline: '未配置' }[s] ?? '未配置'
}
