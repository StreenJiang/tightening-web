<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
const toast = useToastStore()
</script>

<template>
  <Teleport to="body">
    <transition name="toast">
      <div v-if="toast.visible" class="toast" :class="toast.type" role="status" aria-live="polite">
        {{ toast.message }}
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  z-index: 3000;
  pointer-events: none;
  text-align: center;
  max-width: 480px;
  border: none;
}

.toast.success {
  background: var(--color-status-ok-bg);
  color: var(--color-status-ok);
}

.toast.error {
  background: var(--color-status-error-bg);
  color: var(--color-status-error);
}

.toast-enter-active { transition: opacity 150ms ease-out, transform 150ms ease-out; }
.toast-leave-active { transition: opacity 120ms ease-in, transform 120ms ease-in; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
.toast-leave-to   { opacity: 0; transform: translateX(-50%) translateY(-8px); }
</style>
