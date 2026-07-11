<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import DeviceIndicator from '@/shared/components/DeviceIndicator.vue'

const now = ref(new Date())
let timer: ReturnType<typeof setInterval>

onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => clearInterval(timer))

function formatTime(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${mo}-${day} ${h}:${mi}:${s}`
}

interface Device { icon: string; label: string; status: 'offline' | 'ok' | 'error' }

const devices: Device[] = [
  { icon: 'mdi:tools', label: '拧紧枪', status: 'offline' },
  { icon: 'mdi:memory', label: '控制器', status: 'offline' },
  { icon: 'mdi:developer-board', label: 'PLC', status: 'offline' },
  { icon: 'mdi:server-network', label: 'MES', status: 'offline' },
  { icon: 'mdi:barcode-scan', label: '扫描枪', status: 'offline' },
]
</script>

<template>
  <footer class="footer">
    <div class="footer-left">
      <span class="footer-time">{{ formatTime(now) }}</span>
    </div>
    <div class="footer-right">
      <DeviceIndicator
        v-for="d in devices"
        :key="d.label"
        :icon="d.icon"
        :label="d.label"
        :status="d.status"
      />
    </div>
  </footer>
</template>

<style scoped>
.footer {
  height: var(--footer-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--color-footer-bg);
  border-top: 1px solid var(--color-footer-border);
  flex-shrink: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.footer-left {
  display: flex;
  align-items: center;
}

.footer-time {
  font-family: var(--font-mono);
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
