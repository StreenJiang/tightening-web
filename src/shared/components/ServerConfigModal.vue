<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'
import { useServerConnectionStore } from '@/stores/serverConnection'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const store = useServerConnectionStore()

const address = ref('')
const testing = ref(false)
const testResult = ref<'idle' | 'success' | 'fail'>('idle')
const testError = ref('')
const saving = ref(false)
const saveError = ref('')

const closeBtnRef = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) handleClose()
}

watch(() => props.visible, (v) => {
  if (v) {
    previousFocus = document.activeElement as HTMLElement | null
    address.value = ''
    testing.value = false
    testResult.value = 'idle'
    testError.value = ''
    saving.value = false
    saveError.value = ''
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

const canSave = computed(() => testResult.value === 'success' && !saving.value)

async function handleTest() {
  if (!address.value.trim()) return
  testing.value = true
  testResult.value = 'idle'
  testError.value = ''
  try {
    const result = await store.testConnection(address.value.trim())
    if (result.success) {
      testResult.value = 'success'
    } else {
      testResult.value = 'fail'
      testError.value = result.errorReason
    }
  } catch {
    testResult.value = 'fail'
    testError.value = ''
  } finally {
    testing.value = false
  }
}

async function handleSave() {
  if (!canSave) return
  saving.value = true
  try {
    await store.saveConfig(address.value.trim())
    handleClose()
  } catch {
    saveError.value = t('server.saveFailed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" role="dialog" aria-modal="true" @click.self="handleClose">
        <div class="modal-panel">
          <header class="modal-header">
            <span class="modal-title">{{ t('server.configureTitle') }}</span>
            <button ref="closeBtnRef" class="modal-close-btn" @click="handleClose" :title="t('common.close')">
              <Icon icon="mdi:close" class="modal-close-icon" />
            </button>
          </header>

          <div class="modal-body">
            <label class="field-label">{{ t('server.address') }}</label>
            <input
              v-model="address"
              type="text"
              class="field-input"
              :placeholder="t('server.addressPlaceholder')"
              :readonly="testing"
              @keyup.enter="handleTest"
            />

            <div v-if="testResult === 'success'" class="test-msg test-msg-ok">
              <Icon icon="mdi:check-circle" class="test-msg-icon" />
              {{ t('server.testSuccess') }}
            </div>
            <div v-else-if="testResult === 'fail'" class="test-msg test-msg-err">
              <Icon icon="mdi:alert-circle" class="test-msg-icon" />
              {{ testError ? t('server.testFailedDetail', { reason: testError }) : t('server.testFailed') }}
            </div>

            <div v-if="saveError" class="test-msg test-msg-err">
              <Icon icon="mdi:alert-circle" class="test-msg-icon" />
              {{ saveError }}
            </div>
          </div>

          <footer class="modal-footer">
            <button
              class="btn btn-secondary"
              :disabled="testing || !address.trim()"
              @click="handleTest"
            >
              {{ testing ? t('server.testing') : t('server.testConnection') }}
            </button>
            <button
              class="btn btn-primary"
              :disabled="!canSave"
              @click="handleSave"
            >
              {{ t('server.save') }}
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
  gap: 12px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.field-input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-bg);
  outline: none;
  transition: border-color 0.1s;
}

.field-input:focus {
  border-color: var(--color-primary);
}

.field-input:read-only {
  opacity: 0.6;
}

.test-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
}

.test-msg-ok { color: var(--color-status-ok); }
.test-msg-err { color: var(--color-status-error); }

.test-msg-icon {
  font-size: 18px;
  flex-shrink: 0;
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
  transition: background 0.1s, opacity 0.1s;
}

.btn:disabled {
  opacity: 0.4;
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

.btn-secondary {
  background: var(--color-border);
  color: var(--color-text);
}

@media (hover: hover) {
  .btn-secondary:not(:disabled):hover {
    filter: brightness(0.92);
  }
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
