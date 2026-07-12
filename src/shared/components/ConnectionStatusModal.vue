<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'
import { useServerConnectionStore } from '@/stores/serverConnection'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const store = useServerConnectionStore()

const reconnecting = ref(false)
const reconnectError = ref('')
const closeBtnRef = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) handleClose()
}

watch(() => props.visible, (v) => {
  if (v) {
    previousFocus = document.activeElement as HTMLElement | null
    reconnecting.value = false
    reconnectError.value = ''
    document.addEventListener('keydown', onKeydown)
    nextTick(() => closeBtnRef.value?.focus())
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

function handleClose() {
  emit('close')
  previousFocus?.focus()
}

async function handleReconnect() {
  reconnecting.value = true
  try {
    await store.reconnect()
  } catch {
    reconnectError.value = t('server.reconnectFailed')
  } finally {
    reconnecting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" role="dialog" aria-modal="true" @click.self="handleClose">
        <div class="modal-panel">
          <header class="modal-header">
            <span class="modal-title">{{ t('server.disconnectTitle') }}</span>
            <button ref="closeBtnRef" class="modal-close-btn" @click="handleClose" :title="t('common.close')">
              <Icon icon="mdi:close" class="modal-close-icon" />
            </button>
          </header>

          <div class="modal-body">
            <div class="status-row">
              <Icon icon="mdi:alert-circle" class="status-icon-warn" />
              <span class="status-text">{{ t('server.disconnected') }}</span>
            </div>

            <div v-if="store.errorReason" class="reason-block">
              <span class="reason-label">{{ t('server.reason') }}</span>
              <span class="reason-text">{{ store.errorReason }}</span>
            </div>

            <div v-if="reconnectError" class="test-msg test-msg-err">
              <Icon icon="mdi:alert-circle" class="test-msg-icon" />
              {{ reconnectError }}
            </div>
          </div>

          <footer class="modal-footer">
            <button
              class="btn btn-primary"
              :disabled="reconnecting"
              @click="handleReconnect"
            >
              <Icon icon="mdi:refresh" class="btn-icon" />
              {{ t('server.manualReconnect') }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-panel {
  background: var(--color-surface);
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
  contain: layout style;
}

.modal-header {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 0 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.modal-close-btn {
  width: 44px; height: 44px; min-height: 0; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.1s;
}
@media (hover: hover) { .modal-close-btn:hover { background: var(--color-border); } }

.modal-close-icon {
  font-size: 22px;
  flex-shrink: 0;
  color: var(--color-text-secondary);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon-warn {
  font-size: 22px;
  color: var(--color-status-warning);
  flex-shrink: 0;
}

.status-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text);
}

.reason-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: var(--color-bg);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.reason-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.reason-text {
  font-size: 14px;
  color: var(--color-text);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 16px;
}

.btn {
  height: 44px; min-height: 0; min-width: 88px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.1s, opacity 0.1s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-sidebar-active-text);
}

@media (hover: hover) {
  .btn-primary:not(:disabled):hover {
    background: var(--color-primary-hover);
  }
}

.btn-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.test-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
}

.test-msg-err { color: var(--color-status-error); }

.test-msg-icon {
  font-size: 18px;
  flex-shrink: 0;
}

/* fade transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease-out;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
