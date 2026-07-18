<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from 'primevue/card'
import ScrollPanel from 'primevue/scrollpanel'
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

function goToPage(page: number) {
  store.pagination.page = page
  store.loadMissions({ page })
  router.replace({ query: { page, name: store.searchName || undefined } })
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
      <div v-for="n in 5" :key="n" class="skeleton-row">
        <div class="sk-thumb" />
        <div class="sk-name" />
        <div class="sk-toggle" />
        <div class="sk-tag" />
        <div class="sk-action" />
        <div class="sk-action" />
      </div>
    </div>

    <!-- Empty -->
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

    <!-- List -->
    <Card v-else class="list-card">
      <template #content>
        <div class="list-header" role="row">
          <span class="col-thumb" />
          <span class="col-name" role="columnheader">{{ t('mission.list.columns.name') }}</span>
          <span class="col-status" role="columnheader">{{ t('mission.list.columns.enabled') }}</span>
          <span class="col-inspection" role="columnheader">{{ t('mission.list.columns.inspection') }}</span>
          <span class="col-actions" role="columnheader" />
        </div>

        <ScrollPanel class="list-scroll">
          <div class="mission-list" role="table" aria-label="Mission list">
            <div
              v-for="m in store.missions"
              :key="m.id"
              class="list-row"
              role="row"
              @click="goToEdit(m)"
            >
              <span class="col-thumb">
                <span class="thumb-frame">
                  <i class="pi pi-image" style="font-size:32px;opacity:0.25" />
                </span>
              </span>
              <span class="col-name">
                <span class="mission-name">{{ m.name }}</span>
              </span>
              <span class="col-status" @click.stop>
                <ToggleSwitch
                  :model-value="m.enabled"
                  @update:model-value="store.toggleEnabled(m)"
                />
              </span>
              <span class="col-inspection">
                <span v-if="m.isInspection" class="inspection-badge">
                  <i class="pi pi-verified" style="font-size:14px" />
                  <span>{{ inspectionLabel(m) }}</span>
                </span>
                <span v-else class="inspection-dash">—</span>
              </span>
              <span class="col-actions" @click.stop>
                <Button
                  icon="pi pi-pencil" severity="secondary" text rounded
                  :aria-label="String(t('mission.list.action.edit'))"
                  @click="goToEdit(m)"
                />
                <Button
                  icon="pi pi-trash" severity="danger" text rounded
                  :aria-label="String(t('mission.list.action.delete'))"
                  @click="handleDelete(m)"
                />
              </span>
            </div>
          </div>
        </ScrollPanel>
      </template>
    </Card>

    <!-- Pagination -->
    <div v-if="store.missions.length > 0" class="pagination">
      <Button
        :label="'← ' + t('mission.list.paginationPrev')"
        severity="secondary" text size="small"
        :disabled="store.pagination.page <= 1"
        @click="goToPage(store.pagination.page - 1)"
      />
      <span class="page-num">{{ store.pagination.page }}</span>
      <Button
        :label="t('mission.list.paginationNext') + ' →'"
        severity="secondary" text size="small"
        :disabled="store.missions.length < store.pagination.size"
        @click="goToPage(store.pagination.page + 1)"
      />
    </div>
  </div>
</template>

<style scoped>
.list-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  contain: layout style;
}

.list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.list-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-scroll {
  flex: 1;
  min-height: 0;
}

.list-header {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.list-row {
  display: flex;
  align-items: center;
  height: 72px;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 100ms;
}

.list-row:last-child { border-bottom: none; }
.list-row:hover { background: rgba(0, 0, 0, 0.02); }
html.dark .list-row:hover { background: rgba(255, 255, 255, 0.02); }

.col-thumb { width: 72px; flex-shrink: 0; display: flex; align-items: center; }
.col-name { flex: 1; min-width: 0; padding: 0 16px; }
.col-status { width: 72px; flex-shrink: 0; display: flex; justify-content: center; }
.col-inspection { width: 90px; flex-shrink: 0; display: flex; justify-content: center; }
.col-actions { width: 80px; flex-shrink: 0; display: flex; gap: 4px; justify-content: flex-end; }

.thumb-frame {
  width: 52px; height: 52px;
  border-radius: 6px;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mission-name {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspection-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--p-primary-500);
  background: var(--p-primary-50);
  padding: 3px 10px;
  border-radius: 4px;
}

.inspection-dash {
  color: var(--color-text-secondary);
  font-size: 14px;
}

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

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.page-num {
  font-size: 14px;
  font-weight: 500;
  min-width: 24px;
  text-align: center;
}

.skeleton-list { padding: 8px 0; }
.skeleton-row {
  display: flex; align-items: center; height: 80px;
  padding: 10px 12px; gap: 12px;
  border-bottom: 1px solid var(--color-border);
}
.sk-thumb {
  width: 60px; height: 60px; border-radius: 6px;
  background: var(--color-border); flex-shrink: 0;
}
.sk-name {
  width: 140px; height: 16px; border-radius: 4px;
  background: var(--color-border); flex: 1;
}
.sk-toggle {
  width: 32px; height: 20px; border-radius: 10px;
  background: var(--color-border); flex-shrink: 0;
}
.sk-tag {
  width: 48px; height: 20px; border-radius: 4px;
  background: var(--color-border); flex-shrink: 0;
}
.sk-action {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--color-border); flex-shrink: 0;
}
</style>
