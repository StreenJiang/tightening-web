<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import MissionBasicForm from './components/MissionBasicForm.vue'
import MissionPrereqCard from './components/MissionPrereqCard.vue'
import MissionBarcodeCard from './components/MissionBarcodeCard.vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Breadcrumb from 'primevue/breadcrumb'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import { generateUUID } from '@/shared/utils/uuid'
import { fetchMission, saveMission, baseFields, cacheDetail } from '@/shared/api/mission'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { ProductMission, ProductMissionSavePayload, BoltState } from '@/shared/types/mission'
import MissionSidesSection from './components/MissionSidesSection.vue'

interface FormSideState {
  id?: number
  name: string
  clientRef: string
  imageBase64?: string
  thumbnailUrl?: string
  bolts: BoltState[]
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const id = route.params.id ? Number(route.params.id) : null
const isEdit = id !== null
const loading = ref(false)
const saving = ref(false)
const savingDraft = ref(false)

const form = ref<ProductMission & { _sides: FormSideState[] }>({
  name: '',
  enabled: true,
  maxNgCount: null,
  passwordRequiredNgCount: null,
  multiDeviceIndependent: false,
  skipScrew: false,
  isInspection: false,
  inspectionScope: 0,
  _sides: [],
})

const prereqCard = ref<InstanceType<typeof MissionPrereqCard>>()
const barcodeCard = ref<InstanceType<typeof MissionBarcodeCard>>()
const sidesSection = ref<InstanceType<typeof MissionSidesSection>>()
const basicForm = ref<InstanceType<typeof MissionBasicForm>>()

const externalBarcodeRules = computed(() => barcodeCard.value?.localRules ?? [])

const boundMaterialCodeIds = computed<number[]>(() => prereqCard.value?.getBoundBarcodeRuleIds?.() ?? [])

let snapshot = ''
let leavingConfirmed = false

onMounted(async () => {
  if (isEdit && id) {
    loading.value = true
    try {
      const data = await fetchMission(id)
      // Collect bolt rule IDs — MissionBarcodeCard should hide these
      const boltRuleIds = new Set<number>()
      data.sides?.forEach((s: any) => s.bolts?.forEach((b: any) => {
        if (b.partsBarcode?.barcodeRule?.id) boltRuleIds.add(b.partsBarcode.barcodeRule.id)
      }))
      cacheDetail({ ...data, barcodeRules: (data.barcodeRules || []).filter((r: any) => !boltRuleIds.has(r.id)) })
      const { sides: _apiSides, ...dataRest } = JSON.parse(JSON.stringify(data))
      Object.assign(form.value, {
        ...dataRest,
        enabled: data.enabled === 1,
        multiDeviceIndependent: data.multiDeviceIndependent === 1,
        skipScrew: data.skipScrew === 1,
        isInspection: data.isInspection === 1,
      })
      snapshot = JSON.stringify(form.value)
      // Populate sides from detail response (Base64 images + bolts)
      if (_apiSides) {
        const rulesById = new Map((data.barcodeRules || []).map((r: any) => [r.id, r]))
        form.value._sides = (_apiSides as any[]).map((s: any) => ({
          id: s.id,
          name: s.name,
          clientRef: s.clientRef || generateUUID(),
          imageBase64: s.image || s.renderedImage,
          bolts: s.bolts?.map((b: any) => ({
            ...b, _localId: generateUUID(),
            _partsBarcode: b.partsBarcode ? (() => {
              const rule = b.partsBarcode.barcodeRule || rulesById.get(b.partsBarcode.barCodeMatchingRuleId)
              return {
                id: b.partsBarcode.id,
                barcodeRuleRef: b.partsBarcode.barcodeRuleRef,
                name: rule?.name ?? '',
                _ruleDef: rule ? {
                  id: rule.id,
                  name: rule.name,
                  ruleType: rule.ruleType,
                  expectedLength: rule.expectedLength,
                  segments: rule.segments,
                  ...(rule.id == null && rule.clientRef ? { clientRef: rule.clientRef } : {}),
                } : null,
              }
            })() : null,
          })) ?? [],
        }))
      }
    } catch {
      toast.add({ severity: 'error', summary: '错误', detail: t('mission.edit.loadFailed'), life: 3000 })
      router.push({ path: '/mission' })
    } finally {
      loading.value = false
    }
  } else {
    loading.value = false
    snapshot = JSON.stringify(form.value)
  }

  await nextTick()
  if (isEdit && id) {
    sidesSection.value?.loadFromMissionDetail()
  } else if (!form.value._sides?.length) {
    form.value._sides = [{ name: '面-1', clientRef: generateUUID(), bolts: [] }]
  }
})

const sidesTouched = ref(false)

function markSidesTouched() { sidesTouched.value = true }

function isDirty(): boolean {
  if (sidesTouched.value) return true
  const { _sides, sides, ...rest } = form.value as any
  const { _sides: _snapSides, sides: _snapSides2, ...snapRest } = JSON.parse(snapshot) as any || {}
  return JSON.stringify(rest) !== JSON.stringify(snapRest)
}

async function handleSave(draft = false) {
  const name = form.value.name.trim()
  if (!name) { toast.add({ severity: 'error', summary: '错误', detail: t('mission.edit.nameRequired'), life: 3000 }); return }
  if (form.value.isInspection && form.value.inspectionScope === 0) { toast.add({ severity: 'error', summary: '错误', detail: t('mission.edit.scopeRequired'), life: 3000 }); return }

  const boundIds = basicForm.value?.getBoundMissionIds?.() ?? []
  const sidesData = await sidesSection.value?.getSidesData() ?? []

  // Collect bolt parts barcode rules and merge into barcodeRules
  // NOTE: Bolt parts barcode rules are now INLINE in each bolt's partsBarcode.barcodeRule,
  // so they should NOT also appear in the top-level barcodeRules array.
  // Only mission-level rules (from BarcodeCard) go here.
  const missionBarcodeRules = barcodeCard.value?.getData() ?? []
  const allBarcodeRules = missionBarcodeRules

  const payload: ProductMissionSavePayload = {
    ...baseFields(form.value),
    inspectionBoundMissionIds: boundIds,
    prerequisites: prereqCard.value?.getData() ?? [],
    barcodeRules: allBarcodeRules,
    sides: sidesData,
  }
  if (isEdit && id) payload.id = id

  console.log('=== SAVE PAYLOAD ===', JSON.stringify(payload, (key, val) =>
    key === 'image' || key === 'renderedImage' || key === 'thumbnail'
      ? (typeof val === 'string' && val.length > 100 ? `[BASE64:${val.length}chars]` : val)
      : val
  , 2))

  if (draft) savingDraft.value = true
  else saving.value = true
  try {
    const result = await saveMission(payload, isEdit)
    // Backfill IDs: side/bolt/partsBarcode IDs from backend response
    if (result.sides && form.value._sides) {
      for (let i = 0; i < result.sides.length; i++) {
        const rSide = result.sides[i]
        const fSide = form.value._sides[i]
        if (!fSide) continue
        if (rSide.id) fSide.id = rSide.id
        if (rSide.bolts && fSide.bolts) {
          for (let j = 0; j < rSide.bolts.length; j++) {
            const rBolt = rSide.bolts[j]
            const fBolt = fSide.bolts[j]
            if (!fBolt) continue
            if (rBolt.id) fBolt.id = rBolt.id
            // Backfill partsBarcode ID (single object, not array)
            const fPb = (fBolt as BoltState)._partsBarcode
            if (rBolt.partsBarcode && fPb) {
              const rPb = rBolt.partsBarcode
              if (rPb.id) fPb.id = rPb.id
              if (rPb.barcodeRule?.id && fPb._ruleDef) {
                fPb._ruleDef.id = rPb.barcodeRule.id
                // 已有 DB id 后清空 ref，防止后续保存时 id+ref 冲突
                delete fPb._ruleDef.clientRef
                delete fPb.barcodeRuleRef
              }
            }
          }
        }
      }
    }
    sidesTouched.value = false
    snapshot = JSON.stringify(form.value)
    if (draft) {
      toast.add({ severity: 'success', summary: '成功', detail: t('mission.edit.draftSaved'), life: 2000 })
    } else {
      toast.add({ severity: 'success', summary: '成功', detail: t('mission.edit.saveSuccess'), life: 2000 })
      setTimeout(() => router.push({ path: '/mission', query: { page: route.query.page, name: route.query.name } }), 300)
    }
  } catch (e) {
    toast.add({ severity: 'error', summary: '错误', detail: `${t('mission.edit.saveFailed')}: ${(e as Error).message}`, life: 5000 })
  } finally { saving.value = false; savingDraft.value = false }
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

      <div v-else>
        <div class="edit-layout">
          <div class="edit-main">
            <MissionBasicForm ref="basicForm" v-model="form" :is-edit="isEdit" />
            <MissionBarcodeCard
              ref="barcodeCard"
              :mission-id="id"
              :bound-material-code-ids="boundMaterialCodeIds"
            />
            <MissionPrereqCard
              ref="prereqCard"
              :mission-id="id"
              :is-inspection="form.isInspection"
              :external-rules="externalBarcodeRules"
            />
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

        <MissionSidesSection ref="sidesSection" v-model:_sides="form._sides" :mission-id="id" :barcode-rules="externalBarcodeRules" :on-touch="markSidesTouched" />
      </div>
    </div>

    <div class="edit-actions">
      <Button
        :label="savingDraft ? String(t('mission.edit.draftSaving')) : String(t('mission.edit.draftSave'))"
        severity="secondary" outlined
        :disabled="saving || savingDraft"
        @click="handleSave(true)"
      />
      <div class="edit-actions-right">
        <Button
          :label="String(t('mission.edit.cancel'))"
          severity="secondary" text
          :disabled="saving || savingDraft"
          @click="handleBack"
        />
        <Button
          :label="saving ? String(t('mission.edit.saving')) : String(t('mission.edit.save'))"
          :disabled="saving || savingDraft"
          @click="handleSave(false)"
        />
      </div>
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
  font-size: 14px;
  font-weight: 700;
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
  justify-content: space-between;
  margin-top: 20px;
  padding: 10px 16px;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}

.edit-actions-right {
  display: flex;
  gap: 12px;
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
