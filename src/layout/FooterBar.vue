<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { aggregateStatus, statusLabel } from '@/shared/types/device'
import type { DeviceGroup } from '@/shared/types/device'
import { useI18n } from 'vue-i18n'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

const { t } = useI18n()

const now = ref(new Date())
let timer: ReturnType<typeof setInterval>

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})
onUnmounted(() => clearInterval(timer))

function formatTime(d: Date): string {
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${d.getFullYear()}-${mo}-${day} ${h}:${mi}:${s}`
}

const deviceGroups: DeviceGroup[] = [
  {
    icon: 'pi pi-wrench', label: '拧紧枪',
    instances: [
      { name: '拧紧枪 #1', status: 'ok' },
      { name: '拧紧枪 #2', status: 'ok' },
    ],
  },
  {
    icon: 'pi pi-microchip', label: '控制器',
    instances: [
      { name: '控制器 #1', status: 'ok' },
      { name: '控制器 #2', status: 'error' },
    ],
  },
  {
    icon: 'pi pi-th-large', label: 'PLC',
    instances: [{ name: 'PLC #1', status: 'ok' }],
  },
  {
    icon: 'pi pi-server', label: 'MES',
    instances: [{ name: 'MES', status: 'offline' }],
  },
  {
    icon: 'pi pi-barcode', label: '扫描枪',
    instances: [
      { name: '扫描枪 #1', status: 'error' },
      { name: '扫描枪 #2', status: 'error' },
    ],
  },
]

const groupSnapshots = deviceGroups.map((g) => ({
  group: g,
  status: aggregateStatus(g.instances),
}))

function severityFor(s: string): 'success' | 'danger' | 'secondary' | 'warn' {
  const map: Record<string, 'success' | 'danger' | 'secondary' | 'warn'> = {
    ok: 'success',
    error: 'danger',
    offline: 'secondary',
    warning: 'warn',
  }
  return map[s] ?? 'secondary'
}

const modalVisible = ref(false)
const selectedGroup = ref<DeviceGroup | null>(null)

function openModal(g: DeviceGroup) {
  selectedGroup.value = g
  modalVisible.value = true
}

function closeModal() {
  modalVisible.value = false
  selectedGroup.value = null
}
</script>

<template>
  <Toolbar class="footer">
    <template #start>
      <span class="footer-time">{{ formatTime(now) }}</span>
    </template>
    <template #end>
      <div class="footer-devices">
        <Button
          v-for="s in groupSnapshots"
          :key="s.group.label"
          :icon="s.group.icon"
          :severity="severityFor(s.status)"
          text

          :title="`${s.group.label}：${t(statusLabel(s.status))}`"
          @click="openModal(s.group)"
        />
      </div>
    </template>
  </Toolbar>

  <Dialog
    v-model:visible="modalVisible"
    :header="selectedGroup?.label ?? ''"
    modal
    :style="{ minWidth: '320px' }"
    @update:visible="closeModal"
  >
    <ul v-if="selectedGroup">
      <li
        v-for="inst in selectedGroup.instances"
        :key="inst.name"
        style="display:flex;align-items:center;gap:8px;padding:6px 0"
      >
        <span
          style="width:10px;height:10px;border-radius:50%;flex-shrink:0"
          :style="{
            background:
              inst.status === 'ok'
                ? 'var(--p-green-500)'
                : inst.status === 'error'
                  ? 'var(--p-red-500)'
                  : 'var(--p-gray-400)',
          }"
        />
        <span style="flex:1;font-size:14px">{{ inst.name }}</span>
        <span style="font-size:12px;color:var(--color-text-secondary)">
          {{ t(statusLabel(inst.status)) }}
        </span>
      </li>
    </ul>
  </Dialog>
</template>

<style scoped>
.footer {
  height: var(--footer-height);
  flex-shrink: 0;
  padding: 0 16px;
  background: var(--color-footer-bg);
  border: none;
  border-top: 1px solid var(--color-border);
}

.footer-devices {
  display: flex;
  gap: 4px;
}

.footer-devices :deep(.p-button) {
  background: rgba(0, 0, 0, 0.04);
}
html.dark .footer-devices :deep(.p-button) {
  background: rgba(255, 255, 255, 0.06);
}

.footer-time {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
