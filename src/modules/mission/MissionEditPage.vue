<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import MissionBasicForm from './components/MissionBasicForm.vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Breadcrumb from 'primevue/breadcrumb'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
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
  passwordRequiredNgCount: null,
  multiDeviceIndependent: false,
  skipScrew: false,
  isInspection: false,
  inspectionScope: 0,
})

let snapshot = ''
let leavingConfirmed = false

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
  if (form.value.isInspection && form.value.inspectionScope === 0) {
    toast.add({ severity: 'error', detail: t('mission.edit.scopeRequired'), life: 3000 })
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
        leavingConfirmed = true
        router.push({ path: '/mission', query: { page: route.query.page, name: route.query.name } })
      },
    })
  } else {
    router.push({ path: '/mission', query: { page: route.query.page, name: route.query.name } })
  }
}

onBeforeRouteLeave(async (_to, _from) => {
  if (leavingConfirmed) return
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

function formatDateTime(iso?: string): string {
  if (!iso) return ''
  return iso.slice(0, 19).replace('T', ' ')
}

const metaItems = computed(() => {
  const items: { label: string; value: string }[] = []
  if (form.value.createTime) {
    items.push({ label: t('mission.edit.metaCreateTime'), value: formatDateTime(form.value.createTime) })
  }
  if (form.value.modifyTime) {
    items.push({ label: t('mission.edit.metaModifyTime'), value: formatDateTime(form.value.modifyTime) })
  }
  return items
})

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
      <Tag v-if="!isEdit" severity="warn" :value="t('mission.edit.statusDraft')" />
    </nav>

    <div class="edit-body">
      <div v-if="loading" class="skeleton-layout">
        <div class="skeleton-main">
          <Skeleton height="140px" border-radius="12px" class="skeleton-card" />
          <Skeleton height="210px" border-radius="12px" class="skeleton-card" />
          <Skeleton height="120px" border-radius="12px" />
        </div>
      </div>

      <div v-else class="edit-layout">
        <div class="edit-main">
          <MissionBasicForm v-model="form" :is-edit="isEdit" />
        </div>

        <aside v-if="isEdit" class="edit-sidebar">
          <Card class="meta-card">
            <template #title>
              <div class="meta-header">{{ t('mission.edit.meta') }}</div>
            </template>
            <template #content>
              <dl v-if="metaItems.length > 0" class="side-meta">
                <template v-for="item in metaItems" :key="item.label">
                  <dt>{{ item.label }}</dt>
                  <dd>{{ item.value }}</dd>
                </template>
              </dl>
              <p v-else class="side-empty">{{ t('mission.edit.metaEmpty') }}</p>
            </template>
          </Card>
        </aside>
      </div>
    </div>

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

.edit-breadcrumb {
  padding: 0;
  background: transparent;
  border: none;
  margin-bottom: 8px;
}

.edit-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 0 4px;
  flex-shrink: 0;
}

.edit-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.3px;
}

.edit-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.edit-layout {
  display: flex;
  gap: 28px;
  align-items: flex-start;
}

.edit-main {
  flex: 1;
  min-width: 0;
}

.edit-sidebar {
  width: 180px;
  flex-shrink: 0;
}

.meta-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.meta-header {
  font-size: 13px;
  font-weight: 600;
}

.side-meta { margin: 0; }
.side-meta dt {
  font-size: 11px;
  color: var(--p-surface-500);
  margin: 10px 0 2px 0;
}
.side-meta dt:first-child { margin-top: 0; }
.side-meta dd { font-size: 13px; font-weight: 500; margin: 0; word-break: break-all; }
.side-empty { font-size: 13px; color: var(--p-surface-500); margin: 0; }

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding: 0 4px;
  flex-shrink: 0;
}

/* Skeleton loading */
.skeleton-layout {
  display: flex;
}
.skeleton-card {
  margin-bottom: 16px;
}
.skeleton-main {
  flex: 1;
  min-width: 0;
}
</style>
