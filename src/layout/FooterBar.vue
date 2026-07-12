<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import DeviceIndicator from '@/shared/components/DeviceIndicator.vue'
import DeviceDetailModal from '@/shared/components/DeviceDetailModal.vue'
import { type DeviceGroup, aggregateStatus } from '@/shared/types/device'

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

const deviceGroups: DeviceGroup[] = [
  { icon: 'mdi:tools', label: '拧紧枪', instances: [
    { name: '拧紧枪 #1', status: 'ok' },
    { name: '拧紧枪 #2', status: 'ok' },
  ]},
  { icon: 'mdi:memory', label: '控制器', instances: [
    { name: '控制器 #1', status: 'ok' },
    { name: '控制器 #2', status: 'error' },
  ]},
  { icon: 'mdi:developer-board', label: 'PLC', instances: [
    { name: 'PLC #1', status: 'ok' },
  ]},
  { icon: 'mdi:server-network', label: 'MES', instances: [
    { name: 'MES', status: 'offline' },
  ]},
  { icon: 'mdi:barcode-scan', label: '扫描枪', instances: [
    { name: '扫描枪 #1', status: 'error' },
    { name: '扫描枪 #2', status: 'error' },
  ]},
]

const groupSnapshots = deviceGroups.map(g => ({ group: g, status: aggregateStatus(g.instances) }))

const modalVisible = ref(false)
const selectedGroup = ref<DeviceGroup | null>(null)

function openModal(group: DeviceGroup) {
  selectedGroup.value = group
  modalVisible.value = true
}

function closeModal() {
  modalVisible.value = false
  selectedGroup.value = null
}
</script>

<template>
  <footer class="footer">
    <div class="footer-left">
      <span class="footer-time">{{ formatTime(now) }}</span>
    </div>
    <div class="footer-right">
      <DeviceIndicator
        v-for="s in groupSnapshots"
        :key="s.group.label"
        :icon="s.group.icon"
        :label="s.group.label"
        :status="s.status"
        @click="openModal(s.group)"
      />
    </div>
  </footer>

  <DeviceDetailModal
    :visible="modalVisible"
    :device="selectedGroup"
    @close="closeModal"
  />
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
