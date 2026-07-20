<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import RadioButton from 'primevue/radiobutton'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { fetchPrerequisites, fetchMissions, fetchBarcodeRules } from '@/shared/api/mission'
import type { MissionPrerequisite, ProductMission, BarCodeMatchingRule } from '@/shared/types/mission'

const props = defineProps<{
  missionId: number | null
  isInspection: boolean
  externalRules?: BarCodeMatchingRule[]  // 来自 BarcodeCard 未保存的规则
}>()

const { t } = useI18n()
const confirm = useConfirm()

const prereq = ref<MissionPrerequisite | null>(null)        // type 1 or 3
const materialPrereqs = ref<MaterialPair[]>([])               // type 2, multiple
const loading = ref(false)
const allMissions = ref<ProductMission[]>([])
const materialCodes = ref<BarCodeMatchingRule[]>([])          // ruleType=2 barcode rules

interface MaterialPair {
  prerequisiteMissionId: number
  prerequisiteMissionName: string
  materialCode: string       // barcode rule name (展示用)
  barcodeRuleId: number       // barcode rule id (真实或临时)
}

const prereqTypeOptions = [
  { label: 'mission.edit.prereq.typeSameTrace', value: 1 },
  { label: 'mission.edit.prereq.typeMaterialTrace', value: 2 },
  { label: 'mission.edit.prereq.typeInspectionChain', value: 3 },
]

function prereqTypeLabel(type: number): string {
  const opt = prereqTypeOptions.find(o => o.value === type)
  return opt ? t(opt.label) : ''
}

const hasAnyPrereq = computed(() => prereq.value !== null || materialPrereqs.value.length > 0)

// dialog editing state: null=adding, 'prereq'=editing type1/3, number=editing material pair index
const editingTarget = ref<null | 'prereq' | number>(null)

// ---- load ----

async function loadPrerequisite() {
  if (!props.missionId) return
  loading.value = true
  try {
    const list = await fetchPrerequisites(props.missionId)
    prereq.value = null
    materialPrereqs.value = []
    for (const item of list) {
      if (!item.prerequisiteMissionName) {
        item.prerequisiteMissionName = await resolveMissionName(item.prerequisiteMissionId)
      }
      if (item.prerequisiteType === 2) {
        materialPrereqs.value.push({
          prerequisiteMissionId: item.prerequisiteMissionId,
          prerequisiteMissionName: item.prerequisiteMissionName ?? `#${item.prerequisiteMissionId}`,
          barcodeRuleId: item.barcodeRuleId ?? 0,
          materialCode: '',
        })
      } else {
        prereq.value = item
      }
    }
  } catch { /* ignore */ }
  finally {
    loading.value = false
    resolveMaterialNames()
  }
}

function resolveMaterialNames() {
  for (const mp of materialPrereqs.value) {
    if (mp.materialCode) continue // already resolved
    const rule = allMaterialCodeRules.value.find(r => r.id === mp.barcodeRuleId)
    if (rule) mp.materialCode = rule.name
  }
}

const missionNameCache = new Map<number, string>()

async function resolveMissionName(missionId: number): Promise<string> {
  if (missionNameCache.has(missionId)) return missionNameCache.get(missionId)!
  try {
    const data = await fetchMissions({ page: 1, size: 500 })
    data.records.forEach(m => { if (m.id) missionNameCache.set(m.id, m.name) })
    return missionNameCache.get(missionId) ?? `#${missionId}`
  } catch {
    return `#${missionId}`
  }
}

async function loadMaterialCodes() {
  if (!props.missionId) return
  try {
    materialCodes.value = await fetchBarcodeRules(props.missionId)
    materialCodes.value = materialCodes.value.filter(r => r.ruleType === 2)
  } catch { /* ignore */ }
}

// ---- dialog ----

const dialogVisible = ref(false)
const dialogType = ref<1 | 2 | 3>(1)
const dialogMission = ref<ProductMission | null>(null)
const dialogMaterialCodeId = ref<number | null>(null)

async function openDialog(target: null | 'prereq' | number = null) {
  if (allMissions.value.length === 0) {
    try {
      const data = await fetchMissions({ page: 1, size: 500 })
      allMissions.value = data.records.filter(m => m.id !== props.missionId)
    } catch { /* ignore */ }
  }
  if (props.missionId) loadMaterialCodes()
  editingTarget.value = target

  if (target === 'prereq' && prereq.value) {
    dialogType.value = prereq.value.prerequisiteType as 1 | 2 | 3
    dialogMission.value = allMissions.value.find(m => m.id === prereq.value!.prerequisiteMissionId) ?? null
    dialogMaterialCodeId.value = null
  } else if (typeof target === 'number' && materialPrereqs.value[target]) {
    const mp = materialPrereqs.value[target]
    dialogType.value = 2
    dialogMission.value = allMissions.value.find(m => m.id === mp.prerequisiteMissionId) ?? null
    dialogMaterialCodeId.value = mp.barcodeRuleId
  } else {
    dialogType.value = 1
    dialogMission.value = null
    dialogMaterialCodeId.value = null
  }
  dialogVisible.value = true
}

const allMaterialCodeRules = computed(() => {
  const saved = materialCodes.value.filter(r => r.ruleType === 2)
  const unsaved = (props.externalRules ?? []).filter(r => r.ruleType === 2)
  const seen = new Set<number>()
  return [...saved, ...unsaved].filter(r => {
    const key = r.id ?? 0
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

const materialCodeOptions = computed(() =>
  allMaterialCodeRules.value.map(r => ({ label: r.name, value: r.id as number }))
)

function onDialogOk() {
  if (!dialogMission.value) return
  if (dialogType.value === 2 && dialogMaterialCodeId.value == null) return

  if (dialogType.value === 2) {
    const rule = allMaterialCodeRules.value.find(r => r.id === dialogMaterialCodeId.value)
    const pair = {
      prerequisiteMissionId: dialogMission.value.id!,
      prerequisiteMissionName: dialogMission.value.name,
      materialCode: rule?.name ?? '',
      barcodeRuleId: dialogMaterialCodeId.value!,
    }
    if (typeof editingTarget.value === 'number') {
      materialPrereqs.value[editingTarget.value] = pair
    } else {
      materialPrereqs.value.push(pair)
    }
  } else {
    const item: MissionPrerequisite = {
      prerequisiteMissionId: dialogMission.value.id!,
      prerequisiteType: dialogType.value,
      prerequisiteMissionName: dialogMission.value.name,
    }
    prereq.value = item
  }
  dialogVisible.value = false
}

function onRemovePrereq() {
  confirm.require({
    message: t('mission.edit.prereq.removeConfirm'),
    header: t('mission.edit.prereq.title'),
    rejectLabel: t('mission.edit.cancel'),
    acceptLabel: t('mission.edit.unsavedLeave'),
    accept: () => { prereq.value = null },
  })
}

function onRemoveMaterialPair(index: number) {
  materialPrereqs.value.splice(index, 1)
}

// ---- save ----

function getData(): Array<{
  id?: number
  prerequisiteMissionId: number
  prerequisiteType: number
  barcodeRuleId?: number
  barcodeRuleRef?: string
}> {
  const result: Array<Record<string, unknown>> = []
  if (prereq.value) {
    result.push({
      prerequisiteMissionId: prereq.value.prerequisiteMissionId,
      prerequisiteType: prereq.value.prerequisiteType,
    })
  }
  for (const mp of materialPrereqs.value) {
    const rule = allMaterialCodeRules.value.find(r => r.id === mp.barcodeRuleId)
    result.push({
      prerequisiteMissionId: mp.prerequisiteMissionId,
      prerequisiteType: 2,
      barcodeRuleId: mp.barcodeRuleId > 0 ? mp.barcodeRuleId : undefined,
      ...(mp.barcodeRuleId > 0 ? {} : { barcodeRuleRef: rule?.clientRef }),
    })
  }
  return result
}

defineExpose({ getData, loadPrerequisite, getBoundBarcodeRuleIds: () => materialPrereqs.value.map(mp => mp.barcodeRuleId) })

onMounted(async () => {
  if (props.missionId) {
    await loadMaterialCodes()
    await loadPrerequisite()
  }
})
</script>

<template>
  <Card class="form-card">
    <template #title>
      <div class="card-header">
<span>{{ t('mission.edit.prereq.title') }}</span>
      </div>
    </template>
    <template #content>
      <div v-if="loading" class="card-loading">加载中...</div>

      <div v-else-if="!hasAnyPrereq" class="card-empty">
        <span>{{ t('mission.edit.prereq.empty') }}</span>
        <Button
          icon="pi pi-plus" size="small" severity="secondary" text
          :label="String(t('mission.edit.prereq.add'))"
          @click="openDialog"
        />
      </div>

      <div v-else>
        <!-- type 1 or 3 -->
        <div v-if="prereq" class="prereq-item">
          <div class="prereq-info">
            <span class="tag-slot">
              <Tag severity="info" :value="prereqTypeLabel(prereq.prerequisiteType)" />
            </span>
            <span class="prereq-name">{{ prereq.prerequisiteMissionName ?? `#${prereq.prerequisiteMissionId}` }}</span>
          </div>
          <div class="prereq-actions">
            <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" @click="openDialog('prereq')" />
            <Button icon="pi pi-times" severity="secondary" text rounded size="small" :aria-label="String(t('mission.edit.prereq.removeConfirm'))" @click="onRemovePrereq" />
          </div>
        </div>

        <!-- type 2 material code pairs -->
        <div v-for="(mp, idx) in materialPrereqs" :key="idx" class="prereq-item">
          <div class="prereq-info">
            <span class="tag-slot">
              <Tag severity="info" :value="t('mission.edit.prereq.typeMaterialTrace')" />
            </span>
            <span class="prereq-name">{{ mp.prerequisiteMissionName }} / {{ mp.materialCode }}</span>
          </div>
          <div class="prereq-actions">
            <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" @click="openDialog(idx)" />
            <Button icon="pi pi-times" severity="secondary" text rounded size="small" @click="onRemoveMaterialPair(idx)" />
          </div>
        </div>

        <!-- add button -->
        <div class="prereq-add-row">
          <Button
            icon="pi pi-plus" size="small" severity="secondary" text
            :label="String(t('mission.edit.prereq.add'))"
            @click="openDialog"
          />
        </div>
      </div>

      <Dialog
        v-model:visible="dialogVisible"
        modal
        :header="String(t('mission.edit.prereq.dialogTitle'))"
        :style="{ width: '480px' }"
      >
        <div class="dialog-row">
          <label class="dialog-label">{{ t('mission.edit.prereq.typeLabel') }}</label>
          <div class="dialog-content">
            <div class="radio-group">
              <label v-for="opt in prereqTypeOptions" :key="opt.value" class="radio-item">
                <RadioButton v-model="dialogType" name="prereqType" :value="opt.value" :disabled="opt.value === 3 && !isInspection" />
                <span>{{ t(opt.label) }}</span>
              </label>
            </div>
          </div>
        </div>

        <div v-if="dialogType === 2" class="dialog-row">
          <label class="dialog-label">{{ t('mission.edit.prereq.selectMaterialCode') }}</label>
          <div class="dialog-content">
            <Select v-model="dialogMaterialCodeId" :options="materialCodeOptions" option-label="label" option-value="value" :placeholder="String(t('mission.edit.prereq.selectMaterialCode'))" :empty-filter-message="String(t('mission.edit.prereq.noMaterialCodes'))" :empty-message="String(t('mission.edit.prereq.noMaterialCodes'))" fluid />
            <div v-if="materialCodeOptions.length === 0" class="field-hint">{{ t('mission.edit.prereq.noMaterialCodes') }}</div>
          </div>
        </div>

        <div class="dialog-row">
          <label class="dialog-label">{{ t('mission.edit.prereq.selectMission') }}</label>
          <div class="dialog-content">
            <Select v-model="dialogMission" :options="allMissions" :option-label="(m: ProductMission) => m.name" :placeholder="String(t('mission.edit.prereq.selectMission'))" fluid filter />
          </div>
        </div>

        <template #footer>
          <Button
            :label="String(t('mission.edit.cancel'))"
            severity="secondary"
            @click="dialogVisible = false"
          />
          <Button
            :label="String(t('mission.edit.inspectionDialogOk'))"
            :disabled="!dialogMission || (dialogType === 2 && dialogMaterialCodeId == null)"
            @click="onDialogOk"
          />
        </template>
      </Dialog>
    </template>
  </Card>
</template>

<style scoped>
.form-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
}

.card-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  color: var(--p-surface-500);
  padding: 4px 0;
}

.card-loading {
  font-size: 14px;
  color: var(--p-surface-500);
}

/* prereq list items */
.prereq-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  margin-bottom: 6px;
}

.prereq-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  min-width: 0;
}
.tag-slot {
  flex-shrink: 0;
  width: 80px;
}

.prereq-name {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prereq-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.prereq-add-row {
  padding: 4px 12px 0;
}

/* dialog */
.dialog-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}
.dialog-row:last-child { margin-bottom: 0; }

.dialog-label {
  width: 80px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--p-surface-500);
  text-align: right;
  padding-top: 8px;
  line-height: 1.3;
}

.dialog-content {
  flex: 1;
  min-width: 0;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 2px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  font-size: 14px;
  cursor: pointer;
}

.field-hint {
  font-size: 13px;
  color: var(--p-surface-400);
  margin-top: 6px;
}
</style>
