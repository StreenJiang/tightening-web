<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import { generateUUID } from '@/shared/utils/uuid'
import { parseSegments } from '@/shared/utils/mission'
import type { ProductBolt, PartsBarcodeState, BoltDialogData } from '@/shared/types/mission'

const { t } = useI18n()
const toast = useToast()

const emit = defineEmits<{
  (e: 'ok', data: BoltDialogData): void
  (e: 'delete'): void
  (e: 'sync', data: BoltDialogData): void
}>()

const visible = ref(false)
const serialNum = ref(0)
const hasProductTrace = ref(false)

const pset = ref<number | null>(null)
const armLocation = ref('')
const torqueMin = ref<number | null>(null)
const torqueMax = ref<number | null>(null)
const angleMin = ref<number | null>(null)
const angleMax = ref<number | null>(null)
const partBarcode = ref<PartsBarcodeState | null>(null)

// mini-dialog
const matVisible = ref(false)
const matName = ref('')
const matExpectedLength = ref<number | null>(null)
const segments = ref<Array<{ s: number; e: number; v: string }>>([])

function open(bolt: ProductBolt & { _partsBarcode?: PartsBarcodeState }, num: number, hasProd: boolean) {
  serialNum.value = num
  hasProductTrace.value = hasProd
  pset.value = bolt.parameterSetId ?? null
  armLocation.value = bolt.armLocation ?? ''
  torqueMin.value = bolt.torqueMin ?? null
  torqueMax.value = bolt.torqueMax ?? null
  angleMin.value = bolt.angleMin ?? null
  angleMax.value = bolt.angleMax ?? null
  partBarcode.value = bolt._partsBarcode ?? null
  visible.value = true
}

function onDelete() {
  emit('delete')
  visible.value = false
}

function onArmRead() {
  toast.add({ severity: 'info', summary: t('mission.edit.bolt.armReadTodo'), life: 3000 })
}

// ── Barcode mini-dialog ──

function openMatDialog(editExisting = false) {
  if (editExisting && partBarcode.value) {
    matName.value = partBarcode.value.name ?? ''
    matExpectedLength.value = partBarcode.value._ruleDef?.expectedLength ?? null
    segments.value = parseSegments(partBarcode.value._ruleDef?.segments)
  } else {
    matName.value = ''
    matExpectedLength.value = null
    segments.value = []
  }
  matVisible.value = true
}

function isSegLengthMismatch(seg: { s: number; e: number; v: string }): boolean {
  return seg.v.length > 0 && seg.e > 0 && seg.v.length !== (seg.e - seg.s + 1)
}

function onMatOk() {
  if (!matName.value.trim()) return

  // Validate: at least one of segments or expectedLength
  const hasSegs = segments.value.length > 0 && segments.value.some(s => s.e > 0 && s.v)
  const hasLen = matExpectedLength.value != null && matExpectedLength.value > 0
  if (!hasSegs && !hasLen) {
    toast.add({ severity: 'warn', summary: '警告', detail: t('mission.edit.barcode.atLeastOne'), life: 3000 })
    return
  }

  // Validate segment lengths
  for (const seg of segments.value) {
    if (isSegLengthMismatch(seg)) {
      toast.add({ severity: 'warn', summary: '警告', detail: t('mission.edit.barcode.segLengthMismatch'), life: 3000 })
      return
    }
  }

  const existing = partBarcode.value
  const uuid = existing?.barcodeRuleRef ?? generateUUID()
  const apiSegs = segments.value
    .filter(s => s.e > 0 && s.v)
    .map(s => ({ s: s.s - 1, e: s.e, v: s.v }))

  partBarcode.value = {
    barcodeRuleRef: uuid,
    name: matName.value.trim(),
    _ruleDef: {
      ...(existing?._ruleDef?.id != null ? { id: existing._ruleDef.id } : {}),
      name: matName.value.trim(),
      ruleType: 2,
      expectedLength: matExpectedLength.value,
      segments: apiSegs.length > 0 ? JSON.stringify(apiSegs) : '',
      ...(existing?._ruleDef?.id != null ? {} : { clientRef: uuid }),
    },
  }
  matVisible.value = false
  // Sync barcode change to DTO immediately
  emit('sync', buildOkData())
}

function removeBarcode() {
  partBarcode.value = null
  emit('sync', buildOkData())
}

function buildOkData(): BoltDialogData {
  return {
    parameterSetId: pset.value,
    armLocation: armLocation.value,
    torqueMin: torqueMin.value,
    torqueMax: torqueMax.value,
    angleMin: angleMin.value,
    angleMax: angleMax.value,
    partsBarcode: partBarcode.value ?? null,
  }
}

// ── OK ──

function rejectNegative(val: number | null, key: string): boolean {
  if (val != null && val < 0) {
    toast.add({ severity: 'warn', summary: '警告', detail: t(key), life: 3000 })
    return true
  }
  return false
}

function onOk() {
  if (pset.value != null && pset.value < 0) {
    toast.add({ severity: 'warn', summary: '警告', detail: t('mission.edit.bolt.psetNegative'), life: 3000 })
    return
  }
  if (rejectNegative(torqueMin.value, 'mission.edit.bolt.torqueNegative')) return
  if (rejectNegative(torqueMax.value, 'mission.edit.bolt.torqueNegative')) return
  if (rejectNegative(angleMin.value, 'mission.edit.bolt.angleNegative')) return
  if (rejectNegative(angleMax.value, 'mission.edit.bolt.angleNegative')) return
  if (torqueMin.value != null && torqueMax.value != null && torqueMin.value > torqueMax.value) {
    toast.add({ severity: 'warn', summary: '警告', detail: t('mission.edit.bolt.torqueRangeInvalid'), life: 3000 })
    return
  }
  if (angleMin.value != null && angleMax.value != null && angleMin.value > angleMax.value) {
    toast.add({ severity: 'warn', summary: '警告', detail: t('mission.edit.bolt.angleRangeInvalid'), life: 3000 })
    return
  }
  emit('ok', buildOkData())
  visible.value = false
}

defineExpose({ open })
</script>

<template>
  <Dialog v-model:visible="visible" modal :style="{ width: '440px' }">
    <template #header>
      <span>{{ t('mission.edit.bolt.dialogEditTitle', { num: serialNum }) }}</span>
    </template>

    <div class="bd-body">
      <div class="bd-field">
        <label class="bd-label">{{ t('mission.edit.bolt.pset') }}</label>
        <InputNumber v-model="pset" :min="0" fluid autofocus />
      </div>

      <div class="bd-field">
        <label class="bd-label">{{ t('mission.edit.bolt.armLocation') }}</label>
        <div class="bd-arm">
          <InputText v-model="armLocation" fluid />
          <Button :label="String(t('mission.edit.bolt.armRead'))" @click="onArmRead" />
        </div>
      </div>

      <div class="bd-field">
        <label class="bd-label">{{ t('mission.edit.bolt.torqueMin') }} / {{ t('mission.edit.bolt.torqueMax') }}</label>
        <div class="bd-range">
          <InputNumber v-model="torqueMin" :suffix="` ${t('mission.edit.bolt.nm')}`" fluid />
          <InputNumber v-model="torqueMax" :suffix="` ${t('mission.edit.bolt.nm')}`" fluid />
        </div>
      </div>

      <div class="bd-field">
        <label class="bd-label">{{ t('mission.edit.bolt.angleMin') }} / {{ t('mission.edit.bolt.angleMax') }}</label>
        <div class="bd-range">
          <InputNumber v-model="angleMin" :suffix="` ${t('mission.edit.bolt.deg')}`" fluid />
          <InputNumber v-model="angleMax" :suffix="` ${t('mission.edit.bolt.deg')}`" fluid />
        </div>
      </div>

      <!-- Material Barcode -->
      <div class="bd-field">
        <label class="bd-label">{{ t('mission.edit.bolt.materialBarcode') }}</label>
        <div v-if="partBarcode" class="bd-mb-card">
          <div class="bd-mb-info">
            <i class="pi pi-tag bd-mb-icon" />
            <span class="bd-mb-name">{{ partBarcode.name }}</span>
          </div>
          <div class="bd-mb-actions">
            <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" @click="openMatDialog(true)" />
            <Button icon="pi pi-times" severity="secondary" text rounded size="small" @click="removeBarcode" />
          </div>
        </div>
        <span v-else v-tooltip="!hasProductTrace ? t('mission.edit.bolt.needProductFirst') : ''">
          <Button
            icon="pi pi-plus"
            :label="String(t('mission.edit.bolt.addMaterialBarcode'))"
            :disabled="!hasProductTrace"
            @click="openMatDialog(false)"
          />
        </span>
      </div>
    </div>

    <template #footer>
      <div class="bd-footer-left">
        <Button :label="String(t('mission.edit.bolt.dialogDelete'))" severity="danger" text @click="onDelete" />
      </div>
      <div class="bd-footer-right">
        <Button :label="String(t('mission.edit.bolt.dialogOk'))" @click="onOk" />
      </div>
    </template>
  </Dialog>

  <!-- Barcode mini-dialog -->
  <Dialog v-model:visible="matVisible" modal :header="String(t(partBarcode ? 'mission.edit.barcode.dialogEditTitle' : 'mission.edit.barcode.dialogAddTitle'))" :style="{ width: '380px' }">
    <div class="bd-body">
      <div class="bd-field">
        <label class="bd-label">{{ t('mission.edit.barcode.ruleName') }}</label>
        <InputText v-model="matName" fluid />
      </div>
      <div class="bd-field">
        <label class="bd-label">{{ t('mission.edit.barcode.expectedLength') }}</label>
        <InputNumber v-model="matExpectedLength" fluid />
      </div>
      <div class="bd-field">
        <label class="bd-label">{{ t('mission.edit.barcode.segments') }}</label>
        <div v-if="segments.length > 0" class="segment-table">
          <div class="segment-header">
            <span>{{ t('mission.edit.barcode.segmentStart') }}</span>
            <span>{{ t('mission.edit.barcode.segmentEnd') }}</span>
            <span>{{ t('mission.edit.barcode.segmentValue') }}</span>
            <span />
          </div>
          <div v-for="(seg, i) in segments" :key="i" class="segment-row" :class="{ 'seg-row-error': isSegLengthMismatch(seg) }">
            <InputNumber v-model="seg.s" :min="1" fluid />
            <InputNumber v-model="seg.e" :min="1" fluid />
            <InputText v-model="seg.v" fluid />
            <Button icon="pi pi-times" severity="secondary" text rounded size="small" @click="segments.splice(i, 1)" />
          </div>
        </div>
        <Button icon="pi pi-plus" size="small" severity="secondary" text :label="t('mission.edit.barcode.addSegment')" @click="segments.push({ s: 1, e: 1, v: '' })" />
      </div>
    </div>
    <template #footer>
      <div class="bd-footer-left">
        <Button :label="String(t('mission.edit.cancel'))" severity="secondary" @click="matVisible = false" />
      </div>
      <div class="bd-footer-right">
        <Button :label="String(t('mission.edit.inspectionDialogOk'))" :disabled="!matName.trim()" @click="onMatOk" />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.bd-body { display: flex; flex-direction: column; gap: 16px; }
.bd-field { display: flex; flex-direction: column; gap: 6px; }
.bd-label { font-size: 13px; font-weight: 600; color: var(--p-surface-600); }
.bd-arm, .bd-range { display: flex; flex-direction: row; gap: 8px; }
.bd-arm > :deep(.p-inputtext), .bd-range > :deep(.p-inputnumber) { flex: 1; }
.bd-mb-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 12px;
}
.bd-mb-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bd-mb-icon {
  font-size: 14px;
  color: var(--p-primary-500);
}
.bd-mb-name {
  font-size: 14px;
  font-weight: 500;
}
.bd-mb-actions {
  display: flex;
  gap: 2px;
}
.bd-footer-left { float: left; }
.bd-footer-right { float: right; }

.segment-table { background: var(--p-surface-50); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
.segment-header, .segment-row { display: grid; grid-template-columns: 52px 52px 1fr 28px; gap: 6px; align-items: center; }
.segment-header { font-size: 11px; color: var(--p-surface-400); font-weight: 600; margin-bottom: 6px; padding: 0 4px; }
.segment-row { margin-bottom: 6px; padding: 2px 4px; border-radius: 4px; }
.segment-row:last-child { margin-bottom: 0; }
.seg-row-error { outline: 1.5px solid var(--p-red-400); outline-offset: -1px; }
</style>
