<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useConfirmStore } from '@/stores/confirm'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const confirmStore = useConfirmStore()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && confirmStore.visible) {
    confirmStore.cancel()
  }
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="confirmStore.visible"
        class="dialog-overlay"
        @click.self="confirmStore.cancel()"
      >
        <div class="dialog-panel" role="dialog" aria-modal="true">
          <h3 class="dialog-title">{{ confirmStore.opts.title }}</h3>
          <p class="dialog-message">{{ confirmStore.opts.message }}</p>
          <div class="dialog-actions">
            <button class="dialog-btn cancel" @click="confirmStore.cancel()">
              {{ confirmStore.opts.cancelLabel || t('common.close') }}
            </button>
            <button class="dialog-btn confirm" @click="confirmStore.confirm()">
              {{ confirmStore.opts.confirmLabel || t('mission.edit.save') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog-panel {
  background: var(--color-surface);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  padding: 24px;
  min-width: 360px;
  max-width: 440px;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 12px 0;
}

.dialog-message {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.dialog-btn {
  padding: 0 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.dialog-btn.cancel {
  background: transparent;
  color: var(--color-text-secondary);
}

.dialog-btn.cancel:hover {
  color: var(--color-text);
}

.dialog-btn.confirm {
  background: var(--color-primary);
  color: #fcfcfb;
}

html.dark .dialog-btn.confirm {
  color: #1a1a1a;
}

.dialog-btn.confirm:hover {
  opacity: 0.9;
}

.dialog-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.modal-enter-active { transition: opacity 150ms ease-out; }
.modal-leave-active { transition: opacity 120ms ease-in; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
</style>
