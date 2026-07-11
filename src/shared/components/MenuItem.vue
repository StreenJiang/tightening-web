<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { usePointerPress } from '@/shared/composables/usePointerPress'

defineProps<{ icon?: string; label: string; active?: boolean }>()
defineEmits<{ click: [e: MouseEvent] }>()
const { pressed, onDown, onUp } = usePointerPress()
</script>

<template>
  <button class="menu-item" :class="{ active, pressed }"
    @click="$emit('click', $event)" @pointerdown="onDown" @pointerup="onUp" @pointerleave="onUp">
    <Icon v-if="icon" :icon="icon" class="menu-item-icon" />
    <span>{{ label }}</span>
  </button>
</template>

<style scoped>
.menu-item {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 10px 12px; border-radius: 6px; font-size: 14px; color: var(--color-text);
  background: transparent; transition: background 0.1s, transform 0.1s; min-height: 44px;
}
@media (hover: hover) { .menu-item:hover { background: var(--color-border); } }
.menu-item.pressed { background: var(--color-border); transform: scale(0.97); }
.menu-item.active { color: var(--color-primary); }
.menu-item-icon { font-size: 20px; flex-shrink: 0; }
</style>
