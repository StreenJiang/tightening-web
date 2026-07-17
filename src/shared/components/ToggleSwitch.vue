<script setup lang="ts">
defineProps<{
  modelValue: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue === 1"
    :disabled="disabled"
    class="toggle-switch"
    :class="{ active: modelValue === 1 }"
    @click="emit('update:modelValue', modelValue === 1 ? 0 : 1)"
  >
    <span class="toggle-knob" />
  </button>
</template>

<style scoped>
.toggle-switch {
  position: relative;
  width: 40px;
  height: 44px;
  padding: 10px 0;
  box-sizing: border-box;
  border: none;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.toggle-switch::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 0;
  width: 40px;
  height: 24px;
  border-radius: 12px;
  background: var(--color-border);
  transition: background 120ms ease-out;
}

.toggle-switch.active::before {
  background: rgba(196, 151, 0, 0.2);
}

.toggle-knob {
  position: absolute;
  top: 13px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-text-secondary);
  transition: transform 120ms ease-out, background 120ms ease-out;
  z-index: 1;
}

.toggle-switch.active .toggle-knob {
  transform: translateX(16px);
  background: var(--color-primary);
}

.toggle-switch:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.toggle-switch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
