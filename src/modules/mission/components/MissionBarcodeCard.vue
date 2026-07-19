<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import RadioButton from 'primevue/radiobutton'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Tag from 'primevue/tag'
import { generateUUID } from '@/shared/utils/uuid'
import { fetchBarcodeRules } from '@/shared/api/mission'
import type { BarCodeMatchingRule, Segment } from '@/shared/types/mission'

const props = defineProps<{
  missionId: number | null
  boundMaterialCodeIds?: number[]  // 已被前置任务引用的条码规则 ID
}>()

const { t } = useI18n()
const confirm = useConfirm()
const toast = useToast()

const rules = ref<BarCodeMatchingRule[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingRuleId = ref<number | null>(null)
const ruleName = ref('')
const ruleType = ref<1 | 2>(1)
const expectedLength = ref<number | null>(null)
const segments = ref<Segment[]>([])

// 自动递增序号（物料码规则展示用）
const nextSeq = computed(() => {
  const max = rules.value
    .filter(r => r.ruleType === 2)
    .reduce((m, r) => {
      const n = parseInt(r.partNumber ?? '0', 10)
      return n > m ? n : m
    }, 0)
  return String(max + 1)
})

const productTraceExists = computed(() =>
  rules.value.some(r => r.ruleType === 1)
)

// 产品追溯码始终排第一
const sortedRules = computed(() =>
  [...rules.value].sort((a, b) => a.ruleType - b.ruleType)
)

const ruleTypeOptions = [
  { label: 'mission.edit.barcode.productTrace', value: 1 },
  { label: 'mission.edit.barcode.materialCode', value: 2 },
]

async function loadRules() {
  if (!props.missionId) return
  loading.value = true
  try {
    rules.value = await fetchBarcodeRules(props.missionId)
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function onClickAdd() {
  editingRuleId.value = null
  ruleName.value = ''
  ruleType.value = productTraceExists.value ? 2 : 1
  expectedLength.value = null
  segments.value = []
  dialogVisible.value = true
}

function parseSegments(json: string): Segment[] {
  if (!json) return []
  try {
    const arr = JSON.parse(json) as Array<{ s: number; e: number; v: string }>
    // API 格式 (0-based exclusive) → UI 格式 (1-based inclusive)
    return arr.map(s => ({ s: s.s + 1, e: s.e, v: s.v }))
  } catch { return [] }
}

function openEditDialog(rule: BarCodeMatchingRule) {
  editingRuleId.value = rule.id ?? null
  ruleName.value = rule.name
  ruleType.value = rule.ruleType
  expectedLength.value = rule.expectedLength ?? null
  segments.value = parseSegments(rule.segments)
  dialogVisible.value = true
}

function addSegment() {
  segments.value.push({ s: 0, e: 0, v: '' })
}

function removeSegment(index: number) {
  segments.value.splice(index, 1)
}

function updateUiSegment(index: number, field: 's' | 'e' | 'v', value: string | number) {
  const seg = segments.value[index]
  if (!seg) return
  if (field === 'v') {
    seg.v = value as string
  } else {
    seg[field] = (value as number) || 0
  }
}

function isSegLengthMismatch(seg: Segment): boolean {
  return seg.v.length > 0 && seg.e > 0 && seg.v.length !== (seg.e - seg.s + 1)
}

function onDialogOk() {
  if (!ruleName.value.trim()) return

  // 校验：segments 和 expectedLength 至少填一个
  const hasSegments = segments.value.length > 0 && segments.value.some(s => s.e > 0 && s.v)
  const hasLength = expectedLength.value != null && expectedLength.value > 0
  if (!hasSegments && !hasLength) {
    toast.add({
      severity: 'warn',
      summary: '警告',
      detail: t('mission.edit.barcode.atLeastOne'),
      life: 3000,
    })
    return
  }

  // 校验：段位值长度必须匹配区间宽度
  for (const seg of segments.value) {
    if (isSegLengthMismatch(seg)) {
      toast.add({
        severity: 'warn',
        summary: '警告',
        detail: t('mission.edit.barcode.segLengthMismatch'),
        life: 3000,
      })
      return
    }
  }

  // 转换 UI→API + 序列化 JSON
  const apiSegments = segments.value
    .filter(seg => seg.e > 0 && seg.v)  // 过滤空行
    .map(seg => ({ s: seg.s - 1, e: seg.e, v: seg.v }))
  const existing = editingRuleId.value != null
    ? rules.value.find(r => r.id === editingRuleId.value)
    : undefined

  const mapped: BarCodeMatchingRule = {
    name: ruleName.value.trim(),
    ruleType: ruleType.value,
    partNumber: existing?.partNumber ?? nextSeq.value,
    expectedLength: expectedLength.value,
    segments: apiSegments.length > 0 ? JSON.stringify(apiSegments) : '',
  }

  if (editingRuleId.value != null && existing) {
    // 编辑已有规则（含临时负 ID）
    mapped.id = editingRuleId.value
    const idx = rules.value.indexOf(existing)
    rules.value[idx] = mapped
  } else {
    // 新增：给临时负 ID + UUID 便于前置任务关联
    mapped.id = --tempIdCounter
    mapped.clientRef = generateUUID()
    rules.value.push(mapped)
  }
  dialogVisible.value = false
}

// 临时 ID 计数器
let tempIdCounter = 0

function reorderSeq() {
  let seq = 1
  for (const r of rules.value) {
    if (r.ruleType === 2) r.partNumber = String(seq++)
  }
}

function onDeleteRule(rule: BarCodeMatchingRule) {
  if (rule.ruleType === 1) {
    // 检查物料码是否被前置任务引用
    const materialIds = rules.value.filter(r => r.ruleType === 2).map(r => r.id)
    const bound = (props.boundMaterialCodeIds ?? []).filter(id => materialIds.includes(id))
    if (bound.length > 0) {
      toast.add({ severity: 'warn', summary: '警告', detail: t('mission.edit.barcode.deleteBlockedByPrereq'), life: 4000 })
      return
    }
    confirm.require({
      message: t('mission.edit.barcode.deleteProductWarn'),
      header: t('mission.edit.barcode.deleteRule'),
      rejectLabel: t('mission.edit.cancel'),
      acceptLabel: t('mission.edit.inspectionDialogOk'),
      accept: () => {
        rules.value = rules.value.filter(r => r.ruleType !== 2 && r !== rule)
        reorderSeq()
      },
    })
  } else {
    // 检查物料码是否被前置任务引用
    if ((props.boundMaterialCodeIds ?? []).includes(rule.id!)) {
      toast.add({ severity: 'warn', summary: '警告', detail: t('mission.edit.barcode.materialBoundToPrereq', { name: rule.name }), life: 3000 })
      return
    }
    confirm.require({
      message: t('mission.edit.barcode.deleteRuleConfirm', { name: rule.name }),
      header: t('mission.edit.barcode.deleteRule'),
      rejectLabel: t('mission.edit.cancel'),
      acceptLabel: t('mission.edit.inspectionDialogOk'),
      accept: () => {
        rules.value = rules.value.filter(r => r !== rule)
        reorderSeq()
      },
    })
  }
}

function getData(): Array<{
  id?: number
  name: string
  ruleType: number
  partNumber?: string
  expectedLength?: number | null
  segments: string
}> {
  return rules.value.map(r => ({
    id: r.id != null && r.id > 0 ? r.id : undefined,
    name: r.name,
    ruleType: r.ruleType,
    partNumber: r.partNumber,
    expectedLength: r.expectedLength,
    segments: r.segments,
    seq: r.ruleType === 2 ? parseInt(r.partNumber ?? '0', 10) || undefined : undefined,
    clientRef: r.clientRef,
  }))
}

defineExpose({ getData, loadRules, localRules: rules })

onMounted(() => {
  if (props.missionId) loadRules()
})
</script>

<template>
  <Card class="form-card">
    <template #title>
      <div class="card-header">
        <span>{{ t('mission.edit.barcode.title') }}</span>
      </div>
    </template>
    <template #content>

      <div v-if="loading" class="card-loading">加载中...</div>

      <div v-else>
        <div v-if="rules.length === 0" class="card-empty">
          <span>{{ t('mission.edit.barcode.empty') }}</span>
          <Button
            icon="pi pi-plus" size="small" severity="secondary" text
            :label="String(t('mission.edit.barcode.add'))"
            @click="onClickAdd"
          />
        </div>

        <template v-else>
          <div v-for="rule in sortedRules" :key="rule.id ?? rule.name" class="rule-row">
            <div class="rule-info">
              <span class="tag-slot">
                <Tag
                  :severity="rule.ruleType === 1 ? 'warn' : 'info'"
                  :value="String(t(rule.ruleType === 1 ? 'mission.edit.barcode.productTrace' : 'mission.edit.barcode.materialCode'))"
                />
              </span>
              <span class="rule-name">{{ rule.name }}</span>
              <span v-if="rule.ruleType === 2" class="rule-seq">{{ rule.partNumber }}</span>
            </div>
            <div class="rule-actions">
              <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" @click="openEditDialog(rule)" />
              <Button icon="pi pi-trash" severity="secondary" text rounded size="small" @click="onDeleteRule(rule)" />
            </div>
          </div>
          <div class="rule-add-row">
            <Button
              icon="pi pi-plus" size="small" severity="secondary" text
              :label="String(t('mission.edit.barcode.add'))"
              @click="onClickAdd"
            />
          </div>
        </template>
      </div>

      <!-- Add/Edit Dialog -->
      <Dialog
        v-model:visible="dialogVisible"
        modal
        :header="String(t(editingRuleId ? 'mission.edit.barcode.dialogEditTitle' : 'mission.edit.barcode.dialogAddTitle'))"
        :style="{ width: '520px' }"
      >
        <div class="dialog-row">
          <label class="dialog-label">{{ t('mission.edit.barcode.ruleType') }}</label>
          <div class="dialog-content">
            <div class="radio-group">
              <label v-for="opt in ruleTypeOptions" :key="opt.value" class="radio-item">
                <RadioButton v-model="ruleType" name="ruleType" :value="opt.value" :disabled="editingRuleId != null || (opt.value === 1 && productTraceExists && editingRuleId == null) || (opt.value === 2 && !productTraceExists)" />
                <span>{{ t(opt.label) }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="dialog-row">
          <label class="dialog-label">{{ t('mission.edit.barcode.ruleName') }}</label>
          <div class="dialog-content">
            <InputText v-model="ruleName" fluid autofocus />
          </div>
        </div>

        <div v-if="ruleType === 2" class="dialog-row">
          <label class="dialog-label">{{ t('mission.edit.barcode.partNumber') }}</label>
          <div class="dialog-content">
            <span class="dialog-seq">{{ editingRuleId ? (rules.find(r => r.id === editingRuleId)?.partNumber ?? nextSeq) : nextSeq }}</span>
          </div>
        </div>

        <div class="dialog-row">
          <label class="dialog-label">{{ t('mission.edit.barcode.expectedLength') }}</label>
          <div class="dialog-content">
            <InputNumber v-model="expectedLength" :min="0" />
          </div>
        </div>

        <div class="dialog-row">
          <label class="dialog-label">{{ t('mission.edit.barcode.segments') }}</label>
          <div class="dialog-content">
            <div v-if="segments.length > 0" class="segment-table">
              <div class="segment-header">
                <span class="seg-col">{{ t('mission.edit.barcode.segmentStart') }}</span>
                <span class="seg-col">{{ t('mission.edit.barcode.segmentEnd') }}</span>
                <span class="seg-col seg-col-wide">{{ t('mission.edit.barcode.segmentValue') }}</span>
                <span class="seg-col-action" />
              </div>
              <div v-for="(seg, idx) in segments" :key="idx" class="segment-row" :class="{ 'seg-row-error': isSegLengthMismatch(seg) }">
                <InputNumber :model-value="seg.s" :min="1" fluid @update:model-value="updateUiSegment(idx, 's', $event ?? 0)" />
                <InputNumber :model-value="seg.e" :min="1" fluid @update:model-value="updateUiSegment(idx, 'e', $event ?? 0)" />
                <InputText :model-value="seg.v" fluid @update:model-value="updateUiSegment(idx, 'v', ($event as string) ?? '')" />
                <Button icon="pi pi-times" severity="secondary" text rounded size="small" :aria-label="String(t('mission.edit.barcode.removeSegment'))" @click="removeSegment(idx)" />
              </div>
            </div>
            <Button icon="pi pi-plus" size="small" severity="secondary" text :label="String(t('mission.edit.barcode.addSegment'))" @click="addSegment" />
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
            :disabled="!ruleName.trim()"
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

/* rule list */
.rule-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  margin-bottom: 6px;
}

.rule-info {
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

.rule-seq {
  font-size: 12px;
  font-weight: 700;
  color: var(--p-primary-500);
  background: var(--p-primary-50);
  border-radius: 4px;
  padding: 1px 6px;
  flex-shrink: 0;
}
html.dark .rule-seq {
  background: rgba(250, 204, 21, 0.12);
}

.rule-name {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rule-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.rule-add-row {
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

.dialog-seq {
  font-size: 14px;
  font-weight: 700;
  color: var(--p-primary-500);
  background: var(--p-primary-50);
  border-radius: 4px;
  padding: 2px 8px;
  display: inline-block;
}
html.dark .dialog-seq {
  background: rgba(250, 204, 21, 0.12);
}

.radio-group {
  display: flex;
  gap: 16px;
  padding-top: 4px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  font-size: 14px;
  cursor: pointer;
}

/* segment table */
.segment-table {
  background: var(--p-surface-50);
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
}
html.dark .segment-table {
  background: rgba(255, 255, 255, 0.03);
}

.segment-header,
.segment-row {
  display: grid;
  grid-template-columns: 52px 52px 1fr 28px;
  gap: 6px;
  align-items: center;
}

.segment-header {
  font-size: 11px;
  color: var(--p-surface-400);
  font-weight: 600;
  margin-bottom: 6px;
  padding: 0 4px;
}

.segment-row {
  margin-bottom: 6px;
  padding: 2px 4px;
  border-radius: 4px;
}
.segment-row:last-child { margin-bottom: 0; }

.seg-row-error {
  outline: 1.5px solid var(--p-red-400);
  outline-offset: -1px;
}
</style>
