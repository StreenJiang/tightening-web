<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import MissionBasicForm from './components/MissionBasicForm.vue'
import ScrollArea from '@/shared/components/ScrollArea.vue'
import Card from '@/shared/components/Card.vue'
import { fetchMission, createMission, updateMission } from '@/shared/api/mission'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import type { ProductMission } from '@/shared/types/mission'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const confirmStore = useConfirmStore()

const id = route.params.id ? Number(route.params.id) : null
const isEdit = id !== null
const loading = ref(false)
const saving = ref(false)

const form = ref<ProductMission>({
  name: '',
  enabled: 1,
  maxNgCount: null,
  passwordRequiredAfterNg: 0,
  multiDeviceIndependent: 0,
  skipScrew: 0,
  isInspection: 0,
  inspectionScope: 0,
})

let snapshot = ''

onMounted(async () => {
  if (isEdit && id) {
    loading.value = true
    try {
      const data = await fetchMission(id)
      Object.assign(form.value, data)
      snapshot = JSON.stringify(form.value)
    } catch {
      toast.show(t('mission.edit.loadFailed'), 'error', 3000)
      router.push({ path: '/mission' })
    } finally {
      loading.value = false
    }
  } else {
    snapshot = JSON.stringify(form.value)
  }
})

function isDirty(): boolean {
  return JSON.stringify(form.value) !== snapshot
}

async function handleSave() {
  const name = form.value.name.trim()
  if (!name) {
    toast.show(t('mission.edit.nameRequired'), 'error')
    return
  }
  saving.value = true
  try {
    if (isEdit && id) {
      await updateMission(id, { ...form.value, name, id })
    } else {
      await createMission({ ...form.value, name })
    }
    snapshot = JSON.stringify(form.value)
    toast.show(t('mission.edit.saveSuccess'), 'success', 2000)
    setTimeout(() => {
      router.push({
        path: '/mission',
        query: { page: route.query.page, name: route.query.name },
      })
    }, 300)
  } catch (e) {
    toast.show(`${t('mission.edit.saveFailed')}: ${(e as Error).message}`, 'error', 5000)
  } finally {
    saving.value = false
  }
}

async function handleBack() {
  if (isDirty()) {
    const confirmed = await confirmStore.open({
      title: t('mission.edit.unsavedTitle'),
      message: t('mission.edit.unsavedMessage'),
      cancelLabel: t('mission.edit.unsavedStay'),
      confirmLabel: t('mission.edit.unsavedLeave'),
    })
    if (!confirmed) return
  }
  router.push({ path: '/mission', query: { page: route.query.page, name: route.query.name } })
}

onBeforeRouteLeave(async (_to, _from) => {
  if (isDirty()) {
    const confirmed = await confirmStore.open({
      title: t('mission.edit.unsavedTitle'),
      message: t('mission.edit.unsavedMessage'),
      cancelLabel: t('mission.edit.unsavedStay'),
      confirmLabel: t('mission.edit.unsavedLeave'),
    })
    if (!confirmed) return false
  }
})

const title = computed(() =>
  isEdit ? t('mission.edit.editTitle', { name: form.value.name }) : t('mission.edit.createTitle')
)
</script>

<template>
  <div class="edit-page">
    <nav class="edit-nav">
      <button class="back-btn" @click="handleBack" :aria-label="String(t('mission.edit.back'))">
        <Icon icon="mdi:arrow-left" width="20" />
      </button>
      <h1 class="edit-title">{{ title }}</h1>
    </nav>

    <ScrollArea class="edit-body">
      <div v-if="loading" class="skeleton-container">
        <div class="skeleton-group">
          <div class="skeleton-title" />
          <div class="skeleton-input" />
          <div class="skeleton-input short" />
        </div>
        <div class="skeleton-group">
          <div class="skeleton-title" />
          <div class="skeleton-input short" />
          <div class="skeleton-input" />
          <div class="skeleton-input" />
        </div>
        <div class="skeleton-group">
          <div class="skeleton-title" />
          <div class="skeleton-input short" />
        </div>
      </div>

      <div v-else class="edit-layout">
        <div class="edit-main">
          <MissionBasicForm v-model="form" :is-edit="isEdit" />
        </div>

        <aside v-if="isEdit" class="edit-sidebar">
          <Card :title="t('mission.edit.meta')">
            <dl class="side-meta">
              <template v-if="form.createTime">
                <dt>创建时间</dt>
                <dd>{{ form.createTime }}</dd>
              </template>
              <template v-if="form.modifyTime">
                <dt>修改时间</dt>
                <dd>{{ form.modifyTime }}</dd>
              </template>
              <template v-if="!form.createTime && !form.modifyTime">
                <dd class="side-empty">暂无记录</dd>
              </template>
            </dl>
          </Card>
        </aside>
      </div>
    </ScrollArea>

    <div class="edit-actions">
      <button class="action-btn cancel" @click="handleBack" :disabled="saving">
        {{ t('mission.edit.cancel') }}
      </button>
      <button class="action-btn save" @click="handleSave" :disabled="saving">
        {{ saving ? t('mission.edit.saving') : t('mission.edit.save') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.edit-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.edit-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 20px;
  background: var(--color-surface);
  border-radius: 8px;
  border: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

.edit-body {
  flex: 1;
  min-height: 0;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.back-btn:hover {
  background: var(--color-border-subtle);
  color: var(--color-text);
}

.edit-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  letter-spacing: -0.3px;
}

.edit-layout {
  display: flex;
  gap: 48px;
  align-items: flex-start;
}

.edit-main {
  flex: 1;
  min-width: 0;
  contain: layout style;
}

.edit-sidebar {
  width: 220px;
  flex-shrink: 0;
  position: sticky;
  top: 16px;
}

.side-meta {
  margin: 0;
}

.side-meta dt {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 12px 0 2px 0;
}

.side-meta dt:first-child {
  margin-top: 0;
}

.side-meta dd {
  font-size: 14px;
  color: var(--color-text);
  font-weight: 500;
  margin: 0;
}

.side-empty {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding: 12px 20px;
  background: var(--color-surface);
  border-radius: 8px;
  border: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

.action-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  min-width: 80px;
}

.action-btn.cancel {
  background: transparent;
  color: var(--color-text-secondary);
}

.action-btn.cancel:hover {
  background: var(--color-border-subtle);
  color: var(--color-text);
}

.action-btn.save {
  background: var(--color-primary);
  color: #fcfcfb;
  font-weight: 600;
}

html.dark .action-btn.save { color: #1a1a1a; }
.action-btn.save:hover { filter: brightness(1.05); }
.action-btn.save:disabled { opacity: 0.4; cursor: not-allowed; }
.action-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Skeleton */
.skeleton-container { max-width: 640px; }
.skeleton-group { margin-bottom: 32px; }
.skeleton-title {
  width: 80px; height: 12px; border-radius: 3px;
  background: var(--color-border); margin-bottom: 16px;
}
.skeleton-input {
  width: 100%; height: 36px; border-radius: 4px;
  background: var(--color-border); margin-bottom: 8px;
}
.skeleton-input.short { width: 72px; }
</style>
