<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import DataView from 'primevue/dataview'
import Breadcrumb from 'primevue/breadcrumb'
import Paginator from 'primevue/paginator'
import ToggleSwitch from 'primevue/toggleswitch'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Button from 'primevue/button'
import { useMissionStore } from '@/stores/mission'
import { useConfirm } from 'primevue/useconfirm'
import type { ProductMission } from '@/shared/types/mission'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useMissionStore()
const confirm = useConfirm()

const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout>

const ROWS_PER_PAGE = [10, 20, 50]
const dataviewPt = {
  root: { style: { background: 'transparent' } },
  content: { style: { background: 'transparent' } },
  grid: { style: { background: 'transparent' } },
}

function goToMissionList(e: { originalEvent: Event }) {
  router.push('/mission')
  e.originalEvent.preventDefault()
}
function breadcrumbNoop(e: { originalEvent: Event }) {
  e.originalEvent.preventDefault()
}

const breadcrumbItems = computed(() => [
  { label: t('breadcrumb.mission'), command: goToMissionList },
  { label: t('breadcrumb.missionList'), command: breadcrumbNoop },
])

const paginatorFirst = computed(() => (store.pagination.page - 1) * store.pagination.size)

onMounted(() => {
  const page = route.query.page ? Number(route.query.page) : 1
  const name = route.query.name ? String(route.query.name) : ''
  searchInput.value = name
  store.loadMissions({ page, name })
})

onUnmounted(() => clearTimeout(searchTimer))

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    store.searchName = searchInput.value
    store.pagination.page = 1
    store.loadMissions({ page: 1, name: searchInput.value || undefined })
    router.replace({ query: { name: searchInput.value || undefined } })
  }, 300)
}

function onPageChange(event: { first: number; rows: number; page: number; pageCount?: number }) {
  const page = event.page + 1
  const name = store.searchName || undefined
  store.pagination.page = page
  store.pagination.size = event.rows
  store.loadMissions({ page, name })
  router.replace({ query: { page, name } })
}

function goToCreate() {
  router.push({ path: '/mission/new' })
}

function goToEdit(mission: ProductMission) {
  router.push({
    path: `/mission/${mission.id}/edit`,
    query: { page: store.pagination.page, name: store.searchName || undefined },
  })
}

async function handleDelete(mission: ProductMission) {
  confirm.require({
    header: t('mission.list.deleteConfirm', { name: mission.name }),
    message: t('mission.delete.confirm', { name: mission.name }),
    acceptLabel: t('mission.list.action.delete'),
    rejectLabel: t('common.close'),
    accept: () => store.removeMission(mission.id!),
  })
}

function inspectionLabel(m: ProductMission): string {
  return m.isInspection ? t('mission.list.columns.inspection') : '—'
}
</script>

<template>
  <div class="list-page">
    <!-- Breadcrumb -->
    <Breadcrumb :model="breadcrumbItems" class="list-breadcrumb" />

    <!-- Toolbar -->
    <div class="list-toolbar">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="searchInput"
          :placeholder="String(t('mission.list.search'))"
          fluid
          @input="onSearchInput"
        />
      </IconField>
      <Button
        icon="pi pi-plus"
        :label="String(t('mission.list.create'))"
        @click="goToCreate"
      />
    </div>

    <!-- Skeleton -->
    <div v-if="store.loading" class="skeleton-list">
      <div v-for="n in 5" :key="n" class="skeleton-card">
        <div class="sk-thumb" />
        <div class="sk-body">
          <div class="sk-line wide" />
          <div class="sk-line narrow" />
        </div>
      </div>
    </div>

    <!-- Empty: search with no results -->
    <div v-else-if="store.missions.length === 0 && searchInput" class="empty-state">
      <i class="pi pi-search" style="font-size:56px;opacity:0.12;margin-bottom:16px" />
      <p class="empty-title">{{ t('mission.list.noResult') }}</p>
    </div>

    <!-- Empty: no missions at all -->
    <div v-else-if="store.missions.length === 0" class="empty-state">
      <i class="pi pi-clipboard" style="font-size:56px;opacity:0.12;margin-bottom:16px" />
      <p class="empty-title">{{ t('mission.list.empty') }}</p>
      <p class="empty-hint">{{ t('mission.list.emptyHint') }}</p>
      <Button
        icon="pi pi-plus"
        :label="String(t('mission.list.create'))"
        @click="goToCreate"
      />
    </div>

    <!-- DataView Grid Cards -->
    <DataView
      v-else
      :value="store.missions"
      layout="grid"
      class="list-dataview"
      :pt="dataviewPt"
    >
      <template #grid="slotProps">
        <div class="mission-grid">
          <div
            v-for="m in slotProps.items"
            :key="m.id"
            class="mission-card"
            @click="goToEdit(m)"
          >
            <div class="card-thumb">
              <i class="pi pi-image" />
              <span v-if="m.isInspection" class="inspection-badge">
                <i class="pi pi-verified" />
                <span>{{ inspectionLabel(m) }}</span>
              </span>
            </div>

            <div class="card-body">
              <span class="card-name">{{ m.name }}</span>

              <div class="card-footer" @click.stop>
                <ToggleSwitch
                  :model-value="m.enabled"
                  @update:model-value="store.toggleEnabled(m)"
                />
                <div class="card-actions">
                  <Button
                    icon="pi pi-pencil"
                    severity="secondary"
                    text
                    rounded
                    :aria-label="String(t('mission.list.action.edit'))"
                    @click="goToEdit(m)"
                  />
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    rounded
                    :aria-label="String(t('mission.list.action.delete'))"
                    @click="handleDelete(m)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </DataView>

    <!-- Paginator -->
    <Paginator
      v-if="store.missions.length > 0"
      :rows="store.pagination.size"
      :total-records="store.pagination.total || store.missions.length"
      :first="paginatorFirst"
      :rows-per-page-options="ROWS_PER_PAGE"
      :always-show="true"
      class="list-paginator"
      @page="onPageChange"
    />
  </div>
</template>

<style scoped>
.list-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  --card-grid-cols: repeat(auto-fill, minmax(210px, 1fr));
}

@media (min-width: 1800px) {
  .list-page {
    --card-grid-cols: repeat(auto-fill, minmax(280px, 1fr));
  }
}

.list-breadcrumb {
  padding: 0;
  background: transparent;
  border: none;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.list-toolbar :deep(.p-iconfield) {
  flex: 1;
  max-width: 480px;
}

/* ---- DataView Grid ---- */
.list-dataview {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: transparent;
}

.mission-grid {
  display: grid;
  grid-template-columns: var(--card-grid-cols);
  gap: 16px;
}

.mission-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 150ms, border-color 150ms;
  background: var(--color-surface);
}

.mission-card:hover {
  border-color: var(--p-primary-300);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

html.dark .mission-card:hover {
  border-color: var(--p-primary-600);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* ---- Thumbnail ---- */
.card-thumb {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-thumb .pi-image {
  font-size: 48px;
  opacity: 0.15;
}

.inspection-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 4px;
  color: var(--p-highlight-color);
  background: var(--p-highlight-background);
}

/* ---- Body ---- */
.card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-name {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-secondary);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* ---- Paginator ---- */
.list-paginator {
  flex-shrink: 0;
  margin-top: 16px;
}


/* ---- Empty ---- */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0;
}

.empty-title {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 16px 0;
}

/* ---- Skeleton ---- */
.skeleton-list {
  display: grid;
  grid-template-columns: var(--card-grid-cols);
  gap: 16px;
}

.skeleton-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.sk-thumb {
  aspect-ratio: 4 / 3;
  background: var(--color-border);
}

.sk-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sk-line {
  height: 14px;
  border-radius: 4px;
  background: var(--color-border);
}

.sk-line.wide { width: 60%; }
.sk-line.narrow { width: 35%; }
</style>
