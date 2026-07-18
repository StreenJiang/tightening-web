<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import MissionBasicForm from './components/MissionBasicForm.vue'
import ScrollPanel from 'primevue/scrollpanel'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Breadcrumb from 'primevue/breadcrumb'
import { fetchMission, createMission, updateMission } from '@/shared/api/mission'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { ProductMission } from '@/shared/types/mission'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const id = route.params.id ? Number(route.params.id) : null
const isEdit = id !== null
const loading = ref(false)
const saving = ref(false)

const form = ref<ProductMission>({
  name: '',
  enabled: true,
  maxNgCount: null,
  passwordRequiredAfterNg: false,
  multiDeviceIndependent: false,
  skipScrew: false,
  isInspection: false,
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
      toast.add({ severity: 'error', detail: t('mission.edit.loadFailed'), life: 3000 })
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
    toast.add({ severity: 'error', detail: t('mission.edit.nameRequired'), life: 3000 })
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
    toast.add({ severity: 'success', detail: t('mission.edit.saveSuccess'), life: 2000 })
    setTimeout(() => {
      router.push({ path: '/mission', query: { page: route.query.page, name: route.query.name } })
    }, 300)
  } catch (e) {
    toast.add({
      severity: 'error',
      detail: `${t('mission.edit.saveFailed')}: ${(e as Error).message}`,
      life: 5000,
    })
  } finally {
    saving.value = false
  }
}

async function handleBack() {
  if (isDirty()) {
    confirm.require({
      header: t('mission.edit.unsavedTitle'),
      message: t('mission.edit.unsavedMessage'),
      rejectLabel: t('mission.edit.unsavedStay'),
      acceptLabel: t('mission.edit.unsavedLeave'),
      accept: () => {
        router.push({ path: '/mission', query: { page: route.query.page, name: route.query.name } })
      },
    })
  } else {
    router.push({ path: '/mission', query: { page: route.query.page, name: route.query.name } })
  }
}

onBeforeRouteLeave(async (_to, _from) => {
  if (isDirty()) {
    const leave = await new Promise<boolean>((resolve) => {
      confirm.require({
        header: t('mission.edit.unsavedTitle'),
        message: t('mission.edit.unsavedMessage'),
        rejectLabel: t('mission.edit.unsavedStay'),
        acceptLabel: t('mission.edit.unsavedLeave'),
        accept: () => resolve(true),
        reject: () => resolve(false),
      })
    })
    if (!leave) return false
  }
})

const title = computed(() =>
  isEdit
    ? t('mission.edit.editTitle', { name: form.value.name })
    : t('mission.edit.createTitle'),
)

function goToMissionList(e: { originalEvent: Event }) {
  router.push('/mission')
  e.originalEvent.preventDefault()
}
function breadcrumbNoop(e: { originalEvent: Event }) {
  e.originalEvent.preventDefault()
}

const breadcrumbItems = computed(() => [
  { label: t('breadcrumb.mission'), command: goToMissionList },
  { label: t('breadcrumb.missionList'), command: goToMissionList },
  { label: isEdit ? t('breadcrumb.missionEdit') : t('breadcrumb.missionNew'), command: breadcrumbNoop },
])
</script>

<template>
  <div class="edit-page">
    <Breadcrumb :model="breadcrumbItems" class="edit-breadcrumb" />

    <nav class="edit-nav">
      <Button
        icon="pi pi-arrow-left" severity="secondary" text rounded
        :aria-label="String(t('mission.edit.back'))"
        @click="handleBack"
      />
      <h1 class="edit-title">{{ title }}</h1>
    </nav>

    <ScrollPanel class="edit-body">
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
          <Card>
            <template #title>{{ t('mission.edit.meta') }}</template>
            <template #content>
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
            </template>
          </Card>
        </aside>
      </div>
    </ScrollPanel>

    <div class="edit-actions">
      <Button
        :label="String(t('mission.edit.cancel'))"
        severity="secondary" text
        :disabled="saving"
        @click="handleBack"
      />
      <Button
        :label="saving ? String(t('mission.edit.saving')) : String(t('mission.edit.save'))"
        :disabled="saving"
        @click="handleSave"
      />
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
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

.edit-body {
  flex: 1;
  min-height: 0;
}

.edit-title {
  font-size: 22px;
  font-weight: 700;
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

.side-meta { margin: 0; }
.side-meta dt {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 12px 0 2px 0;
}
.side-meta dt:first-child { margin-top: 0; }
.side-meta dd { font-size: 14px; font-weight: 500; margin: 0; }
.side-empty { font-size: 13px; color: var(--color-text-secondary); }

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding: 12px 20px;
  background: var(--color-surface);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

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

.edit-breadcrumb {
  padding: 0;
  background: transparent;
  border: none;
  margin-bottom: 8px;
}
</style>
