<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { type DeviceGroup, aggregateStatus, statusLabel } from '@/shared/types/device'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  device: DeviceGroup | null
}>()
const emit = defineEmits<{ close: [] }>()

const aggStatus = computed(() => aggregateStatus(props.device?.instances ?? []))

const closeBtnRef = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) emit('close')
}

function handleClose() {
  emit('close')
  previousFocus?.focus()
}

watch(() => props.visible, (v) => {
  if (v) {
    previousFocus = document.activeElement as HTMLElement | null
    nextTick(() => closeBtnRef.value?.focus())
  }
})

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" role="dialog" aria-modal="true" @click.self="handleClose">
        <div class="modal-panel">
          <header class="modal-header">
            <div class="modal-header-left">
              <span v-if="device" class="modal-device-identity">
                <Icon :icon="device.icon" class="modal-device-icon" />
                <span class="modal-device-label">{{ device.label }}</span>
              </span>
              <span v-if="device" class="modal-status-tag" :class="`tag-${aggStatus}`">
                <span class="modal-status-dot" :class="`dot-${aggStatus}`"></span>
                {{ t(statusLabel(aggStatus)) }}
              </span>
            </div>
            <button ref="closeBtnRef" class="modal-close-btn" @click="handleClose" :title="t('common.close')">
              <Icon icon="mdi:close" class="modal-close-icon" />
            </button>
          </header>
          <div class="modal-body">
            <ul v-if="device" class="instance-list">
              <li v-for="inst in device.instances" :key="inst.name" class="instance-item">
                <span class="instance-dot" :class="`dot-${inst.status}`"></span>
                <span class="instance-name">{{ inst.name }}</span>
                <span class="instance-status">{{ t(statusLabel(inst.status)) }}</span>
              </li>
            </ul>
          </div>
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
  min-width: 320px;
  max-width: 90vw;
  max-height: 80vh;
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

.modal-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.modal-device-identity {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.modal-device-icon {
  font-size: 18px;
  flex-shrink: 0;
  color: var(--color-primary);
}

.modal-device-label {
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
  color: var(--color-text);
}

.modal-status-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}
.modal-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 10px;
}
.tag-offline { background: var(--color-status-offline-bg); color: var(--color-text-secondary); }
.tag-ok      { background: var(--color-status-ok-bg);      color: var(--color-status-ok); }
.tag-error   { background: var(--color-status-error-bg);   color: var(--color-status-error); }
.tag-warning { background: var(--color-status-warning-bg); color: var(--color-status-warning); }
.dot-offline { background: var(--color-status-offline); }
.dot-ok      { background: var(--color-status-ok); }
.dot-error   { background: var(--color-status-error); }
.dot-warning { background: var(--color-status-warning); }

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
  padding: 0;
  overflow-y: auto;
}

.instance-list {
  margin: 0;
}

.instance-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  user-select: none;
  -webkit-user-select: none;
}

.instance-item + .instance-item {
  padding-top: 6px;
}

.instance-item:active {
  transform: scale(0.98);
  transition: transform 0.08s;
}

.instance-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}

.instance-name {
  flex: 1;
  font-size: 14px;
  font-weight: 450;
  color: var(--color-text);
  margin-left: 4px;
}

.instance-status {
  font-size: 12px;
  font-weight: 500;
}

.instance-item:has(.dot-ok) .instance-status      { color: var(--color-status-ok); }
.instance-item:has(.dot-error) .instance-status   { color: var(--color-status-error); }
.instance-item:has(.dot-offline) .instance-status { color: var(--color-text-secondary); }
.instance-item:has(.dot-warning) .instance-status { color: var(--color-status-warning); }

@media (hover: hover) {
  .instance-item:hover {
    background: var(--color-border-subtle);
    border-radius: 6px;
  }
}

/* fade transition — 仅 opacity，不触发布局重排 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease-out;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
