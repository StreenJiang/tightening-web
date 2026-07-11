<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { usePointerPress } from '@/shared/composables/usePointerPress'

defineProps<{ icon?: string; label?: string; title?: string }>()
defineEmits<{ click: [e: MouseEvent] }>()
const { pressed, onDown, onUp } = usePointerPress()
</script>

<template>
  <button class="icon-btn" :class="{ pressed }" :title="title"
    @click="$emit('click', $event)" @pointerdown="onDown" @pointerup="onUp" @pointerleave="onUp">
    <Icon v-if="icon" :icon="icon" class="icon-btn-icon" />
    <span v-if="label" class="icon-btn-label">{{ label }}</span>
    <slot />
  </button>
</template>

<style scoped>
.icon-btn {
  display: flex; align-items: center; justify-content: center;
  min-width: 44px; min-height: 44px; padding: 0 10px; border-radius: 6px;
  background: transparent; color: var(--color-text-secondary); font-size: 14px;
  transition: background 0.1s, transform 0.1s; gap: 6px;
}
@media (hover: hover) { .icon-btn:hover { background: var(--color-border); } }
.icon-btn.pressed { background: var(--color-border); transform: scale(0.94); }
.icon-btn-icon { font-size: 22px; flex-shrink: 0; }
.icon-btn-label { font-size: 13px; font-weight: 700; letter-spacing: 0.5px; line-height: 1; }
</style>
