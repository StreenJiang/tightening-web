<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { usePointerPress } from '@/shared/composables/usePointerPress'
import { statusLabel } from '@/shared/types/device'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

defineProps<{ icon: string; label: string; status: 'offline' | 'ok' | 'error' | 'warning' }>()
defineEmits<{ click: [] }>()
const { pressed, onDown, onUp } = usePointerPress()
</script>

<template>
  <button class="device-btn" :class="[`status-${status}`, { pressed }]"
    :title="`${label}：${t(statusLabel(status))}`"
    @pointerdown="onDown" @pointerup="onUp" @pointerleave="onUp"
    @click="$emit('click')">
    <Icon :icon="icon" class="device-icon" />
  </button>
</template>

<style scoped>
.device-btn {
  width: 44px; height: 44px; min-height: 0; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-surface);
  transition: background 0.1s, transform 0.1s;
}
@media (hover: hover) { .device-btn:hover { background: var(--color-border); } }
.device-btn.pressed { background: var(--color-border); transform: scale(0.92); }
.device-btn.status-offline .device-icon { color: var(--color-status-offline); }
.device-btn.status-ok      .device-icon { color: var(--color-status-ok); }
.device-btn.status-error   .device-icon { color: var(--color-status-error); }
.device-btn.status-warning .device-icon { color: var(--color-status-warning); }
.device-icon { font-size: 22px; flex-shrink: 0; }
</style>
