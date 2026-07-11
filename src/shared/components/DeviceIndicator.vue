<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { usePointerPress } from '@/shared/composables/usePointerPress'

defineProps<{ icon: string; label: string; status: 'offline' | 'ok' | 'error' }>()
const { pressed, onDown, onUp } = usePointerPress()
</script>

<template>
  <button class="device-btn" :class="[`status-${status}`, { pressed }]"
    :title="`${label}：${status === 'ok' ? '正常' : status === 'error' ? '连接异常' : '未配置'}`"
    @pointerdown="onDown" @pointerup="onUp" @pointerleave="onUp">
    <Icon :icon="icon" class="device-icon" />
  </button>
</template>

<style scoped>
.device-btn {
  width: 32px; height: 32px; min-height: 0; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-surface);
  transition: background 0.1s, transform 0.1s;
}
@media (hover: hover) { .device-btn:hover { background: var(--color-border); } }
.device-btn.pressed { background: var(--color-border); transform: scale(0.92); }
.device-btn.status-offline .device-icon { color: var(--color-status-offline); }
.device-btn.status-ok      .device-icon { color: var(--color-status-ok); }
.device-btn.status-error   .device-icon { color: var(--color-status-error); }
.device-icon { font-size: 20px; flex-shrink: 0; }
</style>
