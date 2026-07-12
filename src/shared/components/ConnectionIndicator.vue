<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePointerPress } from '@/shared/composables/usePointerPress'

const props = defineProps<{
  status: 'connected' | 'disconnected' | 'unconfigured' | 'loading'
  address?: string
  latency?: number
}>()

defineEmits<{ click: [] }>()

const { t } = useI18n()
const { pressed, onDown, onUp } = usePointerPress()

const labelKeyMap: Record<string, string> = {
  connected: 'server.connected',
  disconnected: 'server.disconnected',
  unconfigured: 'server.unconfigured',
  loading: 'server.connecting',
}

const label = computed(() => t(labelKeyMap[props.status]))

const tooltip = computed(() => {
  if (props.status === 'connected' && props.address) {
    return `${props.address} · ${t('server.latencyValue', { n: props.latency ?? 0 })}`
  }
  return label.value
})
</script>

<template>
  <button
    class="conn-indicator"
    :class="[`conn-${props.status}`, { pressed }]"
    :title="tooltip"
    @pointerdown="onDown"
    @pointerup="onUp"
    @pointerleave="onUp"
    @click="$emit('click')"
  >
    <span
      class="conn-dot"
      :class="{ 'conn-dot-pulse': props.status === 'loading' }"
    ></span>
    <span class="conn-label">{{ label }}</span>
  </button>
</template>

<style scoped>
.conn-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: transparent;
  transition: background 0.1s, transform 0.1s;
}

@media (hover: hover) {
  .conn-indicator:hover {
    background: var(--color-border);
  }
}

.conn-indicator.pressed {
  background: var(--color-border);
  transform: scale(0.94);
}

.conn-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.conn-label {
  white-space: nowrap;
}

.conn-connected .conn-dot { background: var(--color-status-ok); }
.conn-disconnected .conn-dot { background: var(--color-status-warning); }
.conn-unconfigured .conn-dot { background: var(--color-status-offline); }
.conn-loading .conn-dot { background: var(--color-text-secondary); }

.conn-dot-pulse {
  animation: conn-pulse 1.2s ease-in-out infinite;
}

@keyframes conn-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
</style>
