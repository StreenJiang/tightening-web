<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import ToggleSwitch from '@/shared/components/ToggleSwitch.vue'
import ScrollArea from '@/shared/components/ScrollArea.vue'
import Card from '@/shared/components/Card.vue'
import { useMissionStore } from '@/stores/mission'
import { useConfirmStore } from '@/stores/confirm'
import type { ProductMission } from '@/shared/types/mission'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useMissionStore()
const confirmStore = useConfirmStore()

const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout>

onMounted(() => {
  const page = route.query.page ? Number(route.query.page) : 1
  const name = route.query.name ? String(route.query.name) : ''
  searchInput.value = name
  store.loadMissions({ page, name })
})

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
  const confirmed = await confirmStore.open({
    title: t('mission.list.deleteConfirm', { name: mission.name }),
    message: t('mission.delete.confirm', { name: mission.name }),
    confirmLabel: t('mission.list.action.delete'),
  })
  if (confirmed) {
    await store.removeMission(mission.id!)
  }
}

function inspectionLabel(m: ProductMission): string {
  if (m.isInspection !== 1) return '—'
  return t('mission.list.columns.inspection')
}

function hasThumbnail(): boolean { return false }
</script>

<template>
  <div class="list-page">
    <!-- Search & Create -->
    <div class="list-toolbar">
      <div class="search-box">
        <Icon icon="mdi:magnify" width="18" class="search-icon" />
        <input
          v-model="searchInput"
          type="text"
          class="search-input"
          :placeholder="String(t('mission.list.search'))"
          @input="onSearchInput"
        />
      </div>
      <button class="create-btn" @click="goToCreate">
        <Icon icon="mdi:plus" width="18" />
        <span>{{ t('mission.list.create') }}</span>
      </button>
    </div>

    <!-- Loading -->
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
      <Icon icon="mdi:clipboard-text-multiple-outline" width="56" class="empty-icon" />
      <p class="empty-title">{{ t('mission.list.empty') }}</p>
      <p class="empty-hint">{{ t('mission.list.emptyHint') }}</p>
      <button class="create-btn" @click="goToCreate">
        <Icon icon="mdi:plus" width="18" />
        <span>{{ t('mission.list.create') }}</span>
      </button>
    </div>

    <!-- List Card -->
    <Card v-else class="list-card">
      <div class="list-header" role="row">
        <span class="col-thumb" />
        <span class="col-name" role="columnheader">{{ t('mission.list.columns.name') }}</span>
        <span class="col-status" role="columnheader">{{ t('mission.list.columns.enabled') }}</span>
        <span class="col-inspection" role="columnheader">{{ t('mission.list.columns.inspection') }}</span>
        <span class="col-actions" role="columnheader" />
      </div>

      <ScrollArea class="list-scroll">
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
                <Icon v-if="!hasThumbnail()" icon="mdi:image-outline" width="32" class="thumb-placeholder" />
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
              <span v-if="m.isInspection === 1" class="inspection-badge">
                <Icon icon="mdi:clipboard-check-outline" width="14" />
                <span>{{ inspectionLabel(m) }}</span>
              </span>
              <span v-else class="inspection-dash">—</span>
            </span>
            <span class="col-actions" @click.stop>
              <button class="row-btn" :aria-label="String(t('mission.list.action.edit'))" @click="goToEdit(m)">
                <Icon icon="mdi:square-edit-outline" width="18" />
              </button>
              <button class="row-btn" :aria-label="String(t('mission.list.action.delete'))" @click="handleDelete(m)">
                <Icon icon="mdi:trash-can-outline" width="18" />
              </button>
            </span>
          </div>
        </div>
      </ScrollArea>
    </Card>

    <!-- Pagination -->
    <div v-if="store.missions.length > 0" class="pagination">
      <button :disabled="store.pagination.page <= 1" @click="goToPage(store.pagination.page - 1)">
        ← {{ t('mission.list.paginationPrev') }}
      </button>
      <span class="page-num">{{ store.pagination.page }}</span>
      <button
        :disabled="store.missions.length < store.pagination.size"
        @click="goToPage(store.pagination.page + 1)"
      >
        {{ t('mission.list.paginationNext') }} →
      </button>
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

/* Toolbar */
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
  padding: 0;
  overflow: hidden;
}

.list-scroll {
  flex: 1;
  min-height: 0;
}

.search-box {
  position: relative;
  width: 320px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 0 12px 0 34px;
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(196, 151, 0, 0.15);
}

.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  background: var(--color-primary);
  color: #fcfcfb;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

html.dark .create-btn { color: #1a1a1a; }
.create-btn:hover { opacity: 0.9; }
.create-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Empty */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0;
}

.empty-icon { opacity: 0.12; color: var(--color-text); margin-bottom: 16px; }
.empty-title { font-size: 16px; font-weight: 500; color: var(--color-text); margin: 0 0 8px 0; }
.empty-hint { font-size: 14px; color: var(--color-text-secondary); margin: 0 0 16px 0; }

/* List */
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
  border-bottom: 1px solid var(--color-border-subtle);
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

.thumb-placeholder { opacity: 0.25; color: var(--color-text-secondary); }

.mission-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
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
  color: var(--color-primary);
  background: rgba(196, 151, 0, 0.08);
  padding: 3px 10px;
  border-radius: 4px;
}

.inspection-dash { color: var(--color-text-secondary); font-size: 14px; }

.row-btn {
  width: 34px; height: 34px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.row-btn:hover { background: var(--color-border-subtle); color: var(--color-text); }
.row-btn:last-child:hover { background: rgba(220, 38, 38, 0.08); color: var(--color-status-error); }
.row-btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.pagination button {
  height: 36px;
  padding: 0 12px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  border-radius: 4px;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.pagination button:hover:not(:disabled) { color: var(--color-text); background: var(--color-border-subtle); }
.pagination button:disabled { opacity: 0.3; cursor: not-allowed; }
.page-num { font-size: 14px; color: var(--color-text); font-weight: 500; min-width: 24px; text-align: center; }

/* Skeleton */
.skeleton-list { padding: 8px 0; }
.skeleton-row { display: flex; align-items: center; height: 80px; padding: 10px 12px; gap: 12px; border-bottom: 1px solid var(--color-border-subtle); }
.sk-thumb { width: 60px; height: 60px; border-radius: 6px; background: var(--color-border); flex-shrink: 0; }
.sk-name { width: 140px; height: 16px; border-radius: 4px; background: var(--color-border); flex: 1; }
.sk-toggle { width: 32px; height: 20px; border-radius: 10px; background: var(--color-border); flex-shrink: 0; }
.sk-tag { width: 48px; height: 20px; border-radius: 4px; background: var(--color-border); flex-shrink: 0; }
.sk-action { width: 32px; height: 32px; border-radius: 50%; background: var(--color-border); flex-shrink: 0; }
</style>
