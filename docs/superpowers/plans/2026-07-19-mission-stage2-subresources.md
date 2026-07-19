# Mission Stage 2 — 子资源管理 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在编辑页以 Card 区段形式添加前置任务和条码规则管理，统一 FormData 保存。

**Architecture:** 两个新 Card 组件（MissionPrereqCard、MissionBarcodeCard）追加在 MissionBasicForm 下方。子资源数据以本地 state 管理，保存时与主表单一起打包为 multipart/form-data 一次提交。巡检绑定简化为 `inspectionBoundMissionIds: number[]`。

**Tech Stack:** Vue 3.5 + TypeScript 6.0 + PrimeVue 4 + scoped CSS

## 后端接口说明

**保存：** `POST/PUT /api/missions` (multipart/form-data)
- `dto` part: JSON of `ProductMissionSaveDTO`（含 `prerequisites`、`barcodeRules`、`inspectionBoundMissionIds` 嵌套列表）
- 子资源独立 POST/DELETE 端点已删除
- `BarCodeRuleSaveItem` 新增 `seq`（序号）、`clientRef`（前端 UUID）
- `PrerequisiteSaveItem` 新增 `barcodeRuleId`（真实 ID）、`barcodeRuleRef`（引用 clientRef UUID）
- 后端通过 `clientRef` → 真实 ID 映射解析新规则引用

**读取：** GET 端点保留
- `GET /api/missions/{id}/prerequisites` → `List<MissionPrerequisiteDTO>`（含 `barcodeRuleId`、`prerequisiteMissionName`）
- `GET /api/missions/{id}/barcode-rules` → `List<BarCodeMatchingRuleDTO>`
- `GET /api/missions/{id}` 直接返回 `inspectionBoundMissionIds`，无需独立获取巡检绑定

**枚举：**
- PrerequisiteType: 1=SAME_TRACE（产品码前置），2=MATERIAL_TRACE（物料码前置），3=INSPECTION_CHAIN（点检链）
- BarCodeRuleType: 1=PRODUCT_TRACE（产品追溯码），2=MATERIAL_BARCODE（物料码）
- 均有 `@JsonValue`/`@JsonCreator` 注解，前端发送整数 code

**后端相关提交（Java tightening 项目）：**
- `0f9f5bb` — `feat: add seq field to bar code matching rules`
- `68d3c32` — `fix: add barcodeRuleId to prerequisites and improve mission save error handling`
- `8a185fb` — `feat: resolve barcodeRuleRef via clientRef for new rules in mission save`

## Global Constraints

- PrimeVue v4 styled 模式，pt > Design Token > props > scoped CSS
- 类型 boolean ↔ 0/1 转换（toApi/fromApi）
- Segment 段位：UI 1-based 含末尾 → 存时转 0-based 不含末尾（s = start-1, e = end）
- 产品追溯码最多 1 个，物料码依赖产品追溯码存在
- 前置任务通常 0-1 个
- 巡检绑定改为数组 `boundMissionIds: number[]`，`ProductMission` 新增 `inspectionBoundMissionIds` 字段
- **前端校验**：Dialog 层校验 segments/expectedLength + 段位行实时标红；保存层防御性校验产品追溯码不重复、物料码依赖
- **无产品码时不 disable 按钮**，点击弹 toast 提示，用户可知原因

---

### Task 1: 更新类型定义

**Files:**
- Modify: `src/shared/types/mission.ts`

**Interfaces:**
- Produces: `MissionPrerequisite`, `BarCodeMatchingRule`, `Segment`, `ProductMissionSavePayload`
- Modify: `ProductMission` 接口追加 `inspectionBoundMissionIds?: number[]`

- [ ] **Step 1: `ProductMission` 追加 `inspectionBoundMissionIds`**

```typescript
// 在 ProductMission 接口的 inspectionScope 之后追加：
export interface ProductMission {
  // ... 现有字段 ...
  inspectionScope: number
  inspectionBoundMissionIds?: number[]  // NEW — GET /{id} 直接返回
  createTime?: string
  modifyTime?: string
}
```

- [ ] **Step 2: 追加新类型定义**

```typescript
// 追加到文件末尾

export interface MissionPrerequisite {
  id?: number
  missionId?: number
  prerequisiteMissionId: number
  prerequisiteType: 1 | 2 | 3 // 1=SAME_TRACE 2=MATERIAL_TRACE 3=INSPECTION_CHAIN
  prerequisiteMissionName?: string // 展示用，非 API 字段
}

export interface BarCodeMatchingRule {
  id?: number
  name: string
  productMissionId?: number
  ruleType: 1 | 2 // 1=PRODUCT_TRACE 2=MATERIAL_BARCODE
  partNumber?: string
  expectedLength?: number | null
  segments: string // JSON string，e.g. '[{"s":0,"e":3,"v":"ABC"}]'
}

/** UI 层 segment：1-based 含末尾 */
export interface Segment {
  s: number // 存时 0-based inclusive
  e: number // 存时 0-based exclusive
  v: string
}

/** 统一保存 payload，映射 ProductMissionSaveDTO */
export interface ProductMissionSavePayload {
  id?: number
  name: string
  maxNgCount: number | null
  passwordRequiredNgCount: number | null
  enabled: number // 0|1
  multiDeviceIndependent: number
  skipScrew: number
  isInspection: number
  inspectionScope: number
  inspectionBoundMissionIds: number[]
  prerequisites: Array<{
    id?: number
    prerequisiteMissionId: number
    prerequisiteType: number
  }>
  barcodeRules: Array<{
    id?: number
    name: string
    ruleType: number
    partNumber?: string
    expectedLength?: number | null
    segments: string // JSON string
    seq?: number       // 物料码序号
    clientRef?: string // 前端 UUID，新规则关联用
  }>
  prerequisites: Array<{
    id?: number
    prerequisiteMissionId: number
    prerequisiteType: number
    barcodeRuleId?: number   // 已有规则的真实 ID
    barcodeRuleRef?: string  // 新规则的 clientRef UUID
  }>
}
```

- [ ] **Step 2: 类型检查**

```bash
npx vue-tsc --noEmit src/shared/types/mission.ts 2>&1 | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types/mission.ts
git commit -m "feat(mission): add Stage 2 types for prerequisites, barcode rules, save payload"
```

---

### Task 2: 更新 API 层

**Files:**
- Modify: `src/shared/api/request.ts`
- Modify: `src/shared/api/mission.ts`

**Interfaces:**
- Consumes: `ProductMissionSavePayload`, `MissionPrerequisite`, `BarCodeMatchingRule` from Task 1
- Produces: `saveMission()`, `fetchPrerequisites()`, `fetchBarcodeRules()`, `uploadFormData()`

- [ ] **Step 1: 在 request.ts 添加 FormData 上传函数**

```typescript
// 追加到现有 export 语句之前

export async function upload<T>(method: string, path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    body: formData,
    // 不设置 Content-Type，让浏览器自动带 boundary
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (json.code !== 200) throw new Error(json.message)
  return json.data as T
}
```

- [ ] **Step 2: 重写 mission.ts 的 createMission / updateMission，新增读取函数**

完整替换文件内容：

```typescript
import { get, post, put, del, upload } from './request'
import type {
  ProductMission,
  MissionQuery,
  MissionPrerequisite,
  BarCodeMatchingRule,
  ProductMissionSavePayload,
} from '@/shared/types/mission'

const BASE = '/api/missions'

function toApi(data: ProductMission): Record<string, unknown> {
  return {
    ...data,
    enabled: data.enabled ? 1 : 0,
    skipScrew: data.skipScrew ? 1 : 0,
    multiDeviceIndependent: data.multiDeviceIndependent ? 1 : 0,
    isInspection: data.isInspection ? 1 : 0,
  }
}

function fromApi(raw: Record<string, unknown>): ProductMission {
  return {
    ...raw,
    enabled: raw.enabled === 1,
    skipScrew: raw.skipScrew === 1,
    multiDeviceIndependent: raw.multiDeviceIndependent === 1,
    isInspection: raw.isInspection === 1,
  } as ProductMission
}

export async function fetchMissions(params: MissionQuery) {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page))
  qs.set('size', String(params.size))
  if (params.name) qs.set('name', params.name)
  const data = await get<{ records: Record<string, unknown>[]; total: number; size: number; current: number }>(`${BASE}?${qs}`)
  return { ...data, records: data.records.map(fromApi) }
}

export async function fetchMission(id: number) {
  const raw = await get<Record<string, unknown>>(`${BASE}/${id}`)
  return fromApi(raw)
}

export function checkName(name: string, excludeId?: number) {
  const qs = new URLSearchParams()
  qs.set('name', name)
  if (excludeId) qs.set('excludeId', String(excludeId))
  return get<boolean>(`${BASE}/check-name?${qs}`)
}

export function deleteMission(id: number) {
  return del(`${BASE}/${id}`)
}

// ---- 统一保存 (multipart/form-data) ----

export async function saveMission(payload: ProductMissionSavePayload, isUpdate: boolean): Promise<string> {
  const fd = new FormData()
  fd.append('dto', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  const path = isUpdate && payload.id ? `${BASE}/${payload.id}` : BASE
  return upload<string>(isUpdate ? 'PUT' : 'POST', path, fd)
}

// ---- 读取子资源 (GET 端点保留) ----

export function fetchPrerequisites(missionId: number) {
  return get<MissionPrerequisite[]>(`${BASE}/${missionId}/prerequisites`)
}

export function fetchBarcodeRules(missionId: number) {
  return get<BarCodeMatchingRule[]>(`${BASE}/${missionId}/barcode-rules`)
}

// ---- 巡检绑定：GET /{id} 已返回 inspectionBoundMissionIds，无需独立 API ----
```

- [ ] **Step 3: 类型检查**

```bash
npx vue-tsc --noEmit 2>&1 | head -20
```

Expected: no new errors in api files.

- [ ] **Step 4: Commit**

```bash
git add src/shared/api/request.ts src/shared/api/mission.ts
git commit -m "feat(mission): add FormData upload support and unified save API"
```

---

### Task 3: 更新 i18n 语言文件

**Files:**
- Modify: `src/locales/zh-CN.json`
- Modify: `src/locales/en.json`

- [ ] **Step 1: 在 zh-CN.json 的 `mission.edit` 对象中追加 key**

在 `"inspectionDiscardStay"` 之后、`"delete"` 之前插入：

```json
"prereq": {
  "title": "前置任务",
  "empty": "暂无前置任务",
  "add": "添加前置任务",
  "dialogTitle": "添加前置任务",
  "selectMission": "选择任务",
  "typeLabel": "依赖类型",
  "typeSameTrace": "同码追溯",
  "typeMaterialTrace": "物料码追溯",
  "typeInspectionChain": "巡检链",
  "removeConfirm": "确定移除此前置任务？"
},
"barcode": {
  "title": "条码规则",
  "empty": "暂无条码规则",
  "add": "添加规则",
  "edit": "编辑规则",
  "productTrace": "产品追溯码",
  "materialCode": "物料码",
  "dialogAddTitle": "添加条码规则",
  "dialogEditTitle": "编辑条码规则",
  "ruleName": "规则名称",
  "ruleType": "规则类型",
  "expectedLength": "期望总长度",
  "segments": "段位配置",
  "segmentStart": "起始",
  "segmentEnd": "结束",
  "segmentValue": "期望值",
  "addSegment": "添加段位",
  "removeSegment": "删除段位",
  "needProductFirst": "请先添加产品追溯码",
  "deleteProductWarn": "删除产品追溯码将同时移除所有物料码规则",
  "atLeastOne": "段位配置和期望总长度至少填写一项",
  "segLengthMismatch": "期望值长度与区间宽度不匹配",
  "deleteRule": "删除规则",
  "deleteRuleConfirm": "确定删除条码规则 {name}？"
}
```

- [ ] **Step 2: 在 en.json 的 `mission.edit` 对象中追加对应英文 key**

```json
"prereq": {
  "title": "Prerequisite",
  "empty": "No prerequisite",
  "add": "Add Prerequisite",
  "dialogTitle": "Add Prerequisite",
  "selectMission": "Select Mission",
  "typeLabel": "Dependency Type",
  "typeSameTrace": "Same Trace",
  "typeMaterialTrace": "Material Trace",
  "typeInspectionChain": "Inspection Chain",
  "removeConfirm": "Remove this prerequisite?"
},
"barcode": {
  "title": "Barcode Rules",
  "empty": "No barcode rules",
  "add": "Add Rule",
  "edit": "Edit Rule",
  "productTrace": "Product Trace",
  "materialCode": "Material Code",
  "dialogAddTitle": "Add Barcode Rule",
  "dialogEditTitle": "Edit Barcode Rule",
  "ruleName": "Rule Name",
  "ruleType": "Rule Type",
  "expectedLength": "Expected Length",
  "segments": "Segments",
  "segmentStart": "Start",
  "segmentEnd": "End",
  "segmentValue": "Value",
  "addSegment": "Add Segment",
  "removeSegment": "Remove Segment",
  "needProductFirst": "Add a product trace rule first",
  "deleteProductWarn": "Deleting the product trace rule will also remove all material code rules",
  "atLeastOne": "At least one of segments or expected length is required",
  "segLengthMismatch": "Value length does not match range width",
  "deleteRule": "Delete Rule",
  "deleteRuleConfirm": "Delete barcode rule {name}?"
}
```

- [ ] **Step 3: 验证 JSON 格式**

```bash
node -e "JSON.parse(require('fs').readFileSync('src/locales/zh-CN.json','utf8')); console.log('zh-CN OK')"
node -e "JSON.parse(require('fs').readFileSync('src/locales/en.json','utf8')); console.log('en OK')"
```

Expected: `zh-CN OK` and `en OK`.

- [ ] **Step 4: Commit**

```bash
git add src/locales/zh-CN.json src/locales/en.json
git commit -m "feat(i18n): add prerequisite and barcode rule keys for Stage 2"
```

---

### Task 4: 创建 MissionPrereqCard 组件

**Files:**
- Create: `src/modules/mission/components/MissionPrereqCard.vue`

**Interfaces:**
- Consumes: `MissionPrerequisite`, `MissionQuery`, `ProductMission` from types; `fetchPrerequisites`, `fetchMissions` from API
- Produces: exposes `getData(): MissionPrerequisite[]` (id-less for new items), `validate(): boolean`

- [ ] **Step 1: 创建组件文件**

```vue
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
import { fetchPrerequisites, fetchMissions } from '@/shared/api/mission'
import type { MissionPrerequisite, ProductMission } from '@/shared/types/mission'

const props = defineProps<{
  missionId: number | null
}>()

const { t } = useI18n()
const confirm = useConfirm()

const prereq = ref<MissionPrerequisite | null>(null)
const loading = ref(false)
const allMissions = ref<ProductMission[]>([])

const prereqTypeOptions = [
  { label: 'mission.edit.prereq.typeSameTrace', value: 1 },
  { label: 'mission.edit.prereq.typeMaterialTrace', value: 2 },
  { label: 'mission.edit.prereq.typeInspectionChain', value: 3 },
]

const prereqTypeLabel = computed(() => {
  if (!prereq.value) return ''
  const opt = prereqTypeOptions.find(o => o.value === prereq.value!.prerequisiteType)
  return opt ? t(opt.label) : ''
})

// Dialog state
const dialogVisible = ref(false)
const selectedMission = ref<ProductMission | null>(null)
const selectedType = ref<1 | 2 | 3>(1)

async function loadPrerequisite() {
  if (!props.missionId) return
  loading.value = true
  try {
    const list = await fetchPrerequisites(props.missionId)
    if (list.length > 0) {
      const item = list[0]
      prereq.value = item
      // 后端 JOIN 返回名称（如果还没加字段，fallback 查列表）
      if (!item.prerequisiteMissionName) {
        item.prerequisiteMissionName = await resolveMissionName(item.prerequisiteMissionId)
      }
    }
  } catch { /* ignore */ }
  finally { loading.value = false }
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

async function openDialog() {
  if (allMissions.value.length === 0) {
    try {
      const data = await fetchMissions({ page: 1, size: 500 })
      allMissions.value = data.records.filter(
        m => !m.isInspection && m.id !== props.missionId,
      )
    } catch { /* ignore */ }
  }
  selectedMission.value = null
  selectedType.value = 1
  dialogVisible.value = true
}

function onDialogOk() {
  if (!selectedMission.value) return
  prereq.value = {
    prerequisiteMissionId: selectedMission.value.id!,
    prerequisiteType: selectedType.value,
    prerequisiteMissionName: selectedMission.value.name,
  }
  dialogVisible.value = false
}

function onRemove() {
  confirm.require({
    message: t('mission.edit.prereq.removeConfirm'),
    header: t('mission.edit.prereq.title'),
    rejectLabel: t('mission.edit.cancel'),
    acceptLabel: t('mission.edit.unsavedLeave'),
    accept: () => { prereq.value = null },
  })
}

function getData(): MissionPrerequisite[] {
  if (!prereq.value) return []
  return [{
    prerequisiteMissionId: prereq.value.prerequisiteMissionId,
    prerequisiteType: prereq.value.prerequisiteType,
  }]
}

function validate(): boolean {
  return true // prerequisite is optional
}

defineExpose({ getData, validate, loadPrerequisite })

onMounted(() => {
  if (props.missionId) loadPrerequisite()
})
</script>

<template>
  <Card class="form-card">
    <template #title>
      <div class="card-header">
        <span class="card-dot card-dot--orange" />
        <span>{{ t('mission.edit.prereq.title') }}</span>
      </div>
    </template>
    <template #content>
      <div v-if="loading" class="card-loading">加载中...</div>

      <div v-else-if="!prereq" class="card-empty">
        <span>{{ t('mission.edit.prereq.empty') }}</span>
        <Button
          icon="pi pi-plus" size="small" severity="secondary" text
          :label="String(t('mission.edit.prereq.add'))"
          @click="openDialog"
        />
      </div>

      <div v-else class="prereq-item">
        <div class="prereq-info">
          <span class="prereq-name">{{ prereq.prerequisiteMissionName ?? `#${prereq.prerequisiteMissionId}` }}</span>
          <Tag severity="info" :value="prereqTypeLabel" />
        </div>
        <Button
          icon="pi pi-times" severity="secondary" text rounded size="small"
          :aria-label="String(t('mission.edit.prereq.removeConfirm'))"
          @click="onRemove"
        />
      </div>

      <Dialog
        v-model:visible="dialogVisible"
        modal
        :header="String(t('mission.edit.prereq.dialogTitle'))"
        :style="{ width: '420px' }"
      >
        <div class="dialog-field">
          <label class="dialog-label">{{ t('mission.edit.prereq.selectMission') }}</label>
          <Select
            v-model="selectedMission"
            :options="allMissions"
            :option-label="(m: ProductMission) => m.name"
            :placeholder="String(t('mission.edit.prereq.selectMission'))"
            fluid
            filter
          />
        </div>
        <div class="dialog-field">
          <label class="dialog-label">{{ t('mission.edit.prereq.typeLabel') }}</label>
          <div class="radio-group">
            <label
              v-for="opt in prereqTypeOptions" :key="opt.value"
              class="radio-item"
            >
              <RadioButton
                v-model="selectedType"
                name="prereqType"
                :value="opt.value"
              />
              <span>{{ t(opt.label) }}</span>
            </label>
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
            :disabled="!selectedMission"
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
}

.card-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.card-dot--orange { background: var(--p-orange-400); }

.card-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  color: var(--p-surface-500);
}

.card-loading {
  font-size: 14px;
  color: var(--p-surface-500);
}

.prereq-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.prereq-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.prereq-name {
  font-size: 14px;
  font-weight: 500;
}

.dialog-field {
  margin-bottom: 16px;
}

.dialog-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--p-surface-600);
  margin-bottom: 6px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  font-size: 14px;
  cursor: pointer;
}
</style>
```

- [ ] **Step 2: 类型检查**

```bash
npx vue-tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/mission/components/MissionPrereqCard.vue
git commit -m "feat(mission): add MissionPrereqCard component"
```

---

### Task 5: 创建 MissionBarcodeCard 组件

**Files:**
- Create: `src/modules/mission/components/MissionBarcodeCard.vue`

**Interfaces:**
- Consumes: `BarCodeMatchingRule`, `Segment` from types; `fetchBarcodeRules` from API
- Produces: exposes `getData(): BarCodeMatchingRule[]`, `validate(): boolean`

- [ ] **Step 1: 创建组件文件**

```vue
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
import { fetchBarcodeRules } from '@/shared/api/mission'
import type { BarCodeMatchingRule, Segment } from '@/shared/types/mission'

const props = defineProps<{
  missionId: number | null
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

const productTraceExists = computed(() =>
  rules.value.some(r => r.ruleType === 1)
)

const canAddMaterialCode = computed(() => productTraceExists.value)
const canAddProductTrace = computed(() => !productTraceExists.value)

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

function openAddDialog() {
  // 无产品追溯码时，不能添加物料码
  if (!productTraceExists.value) {
    toast.add({
      severity: 'warn',
      detail: t('mission.edit.barcode.needProductFirst'),
      life: 3000,
    })
    return
  }
  // 产品追溯码已存在时只能加物料码
  editingRuleId.value = null
  ruleName.value = ''
  ruleType.value = productTraceExists.value ? 2 : 1
  expectedLength.value = null
  segments.value = []
  dialogVisible.value = true
}

function onClickAdd() {
  if (!productTraceExists.value) {
    // 第一个规则总是产品追溯码
    editingRuleId.value = null
    ruleName.value = ''
    ruleType.value = 1
    expectedLength.value = null
    segments.value = []
    dialogVisible.value = true
  } else {
    openAddDialog()
  }
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
  const mapped: BarCodeMatchingRule = {
    name: ruleName.value.trim(),
    ruleType: ruleType.value,
    expectedLength: expectedLength.value,
    segments: apiSegments.length > 0 ? JSON.stringify(apiSegments) : '',
  }
  if (editingRuleId.value) {
    mapped.id = editingRuleId.value
    const idx = rules.value.findIndex(r => r.id === editingRuleId.value)
    if (idx !== -1) rules.value[idx] = mapped
    else rules.value.push(mapped)
  } else {
    rules.value.push(mapped)
  }
  dialogVisible.value = false
}

function onDeleteRule(rule: BarCodeMatchingRule) {
  if (rule.ruleType === 1) {
    // 删除产品追溯码 → 级联删除所有物料码
    confirm.require({
      message: t('mission.edit.barcode.deleteProductWarn'),
      header: t('mission.edit.barcode.deleteRule'),
      rejectLabel: t('mission.edit.cancel'),
      acceptLabel: t('mission.edit.unsavedLeave'),
      accept: () => {
        rules.value = rules.value.filter(r => r.id !== rule.id && r.ruleType !== 2)
      },
    })
  } else {
    confirm.require({
      message: t('mission.edit.barcode.deleteRuleConfirm', { name: rule.name }),
      header: t('mission.edit.barcode.deleteRule'),
      rejectLabel: t('mission.edit.cancel'),
      acceptLabel: t('mission.edit.unsavedLeave'),
      accept: () => {
        rules.value = rules.value.filter(r => r.id !== rule.id)
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
    id: r.id,
    name: r.name,
    ruleType: r.ruleType,
    partNumber: r.partNumber,
    expectedLength: r.expectedLength,
    segments: r.segments,  // 已是 JSON string，直接透传
  }))
}

function validate(): boolean {
  return true // optional
}

defineExpose({ getData, validate, loadRules })

onMounted(() => {
  if (props.missionId) loadRules()
})
</script>

<template>
  <Card class="form-card">
    <template #title>
      <div class="card-header">
        <span class="card-dot card-dot--cyan" />
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
          <div v-for="rule in rules" :key="rule.id ?? rule.name" class="rule-row">
            <div class="rule-info">
              <span class="rule-name">{{ rule.name }}</span>
              <Tag
                :severity="rule.ruleType === 1 ? 'warn' : 'info'"
                :value="String(t(rule.ruleType === 1 ? 'mission.edit.barcode.productTrace' : 'mission.edit.barcode.materialCode'))"
              />
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
        <div class="dialog-field">
          <label class="dialog-label">{{ t('mission.edit.barcode.ruleName') }}</label>
          <InputText v-model="ruleName" fluid />
        </div>

        <div class="dialog-field">
          <label class="dialog-label">{{ t('mission.edit.barcode.ruleType') }}</label>
          <div class="radio-group">
            <label
              v-for="opt in ruleTypeOptions" :key="opt.value"
              class="radio-item"
            >
              <RadioButton
                v-model="ruleType"
                name="ruleType"
                :value="opt.value"
                :disabled="editingRuleId != null"
              />
              <span>{{ t(opt.label) }}</span>
            </label>
          </div>
        </div>

        <div class="dialog-field">
          <label class="dialog-label">{{ t('mission.edit.barcode.expectedLength') }}</label>
          <InputNumber v-model="expectedLength" :min="0" />
        </div>

        <div class="dialog-field">
          <label class="dialog-label">{{ t('mission.edit.barcode.segments') }}</label>
          <div v-if="segments.length > 0" class="segment-table">
            <div class="segment-header">
              <span class="seg-col">{{ t('mission.edit.barcode.segmentStart') }}</span>
              <span class="seg-col">{{ t('mission.edit.barcode.segmentEnd') }}</span>
              <span class="seg-col seg-col-wide">{{ t('mission.edit.barcode.segmentValue') }}</span>
              <span class="seg-col-action" />
            </div>
            <div v-for="(seg, idx) in segments" :key="idx" class="segment-row" :class="{ 'seg-row-error': isSegLengthMismatch(seg) }">
              <InputNumber
                :model-value="seg.s"
                :min="1"
                class="seg-input"
                @update:model-value="updateUiSegment(idx, 's', $event ?? 0)"
              />
              <InputNumber
                :model-value="seg.e"
                :min="1"
                class="seg-input"
                @update:model-value="updateUiSegment(idx, 'e', $event ?? 0)"
              />
              <InputText
                :model-value="seg.v"
                class="seg-input-wide"
                @update:model-value="updateUiSegment(idx, 'v', ($event as string) ?? '')"
              />
              <Button
                icon="pi pi-times" severity="secondary" text rounded size="small"
                :aria-label="String(t('mission.edit.barcode.removeSegment'))"
                @click="removeSegment(idx)"
              />
            </div>
          </div>
          <Button
            icon="pi pi-plus" size="small" severity="secondary" text
            :label="String(t('mission.edit.barcode.addSegment'))"
            class="add-segment-btn"
            @click="addSegment"
          />
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
}

.card-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.card-dot--cyan { background: var(--p-cyan-400); }

.card-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  color: var(--p-surface-500);
}

.card-loading {
  font-size: 14px;
  color: var(--p-surface-500);
}

.rule-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
}

.rule-row + .rule-row {
  border-top: 1px solid var(--color-border);
}

.rule-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rule-name {
  font-size: 14px;
  font-weight: 500;
}

.rule-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rule-add-row {
  margin-top: 8px;
}

.dialog-field {
  margin-bottom: 16px;
}

.dialog-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--p-surface-600);
  margin-bottom: 6px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  font-size: 14px;
  cursor: pointer;
}

.segment-table {
  margin-bottom: 8px;
}

.segment-header {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--p-surface-500);
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.segment-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

.seg-col { width: 64px; }
.seg-col-wide { flex: 1; }
.seg-col-action { width: 36px; }

.seg-input { width: 64px; }
.seg-input-wide { flex: 1; }

.seg-row-error {
  outline: 1px solid var(--p-red-400);
  border-radius: 4px;
}

.add-hint {
  font-size: 13px;
  color: var(--p-surface-500);
}
</style>
```

- [ ] **Step 2: 类型检查**

```bash
npx vue-tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/mission/components/MissionBarcodeCard.vue
git commit -m "feat(mission): add MissionBarcodeCard component"
```

---

### Task 6: 更新 MissionBasicForm — 简化巡检绑定

**Files:**
- Modify: `src/modules/mission/components/MissionBasicForm.vue`

**Changes:**
1. 移除 `addInspectionBinding` / `deleteInspectionBinding` API 调用
2. `onMissionPickerOk` 不再调 API，仅更新 `boundMissionIds` 本地数组
3. `loadBoundMissions` 保留（通过 GET 加载已有绑定）
4. 移除 `originalBindingMap`

**Interfaces:**
- Consumes: `fetchMissions` from API; `inspectionBoundMissionIds` from `ProductMission` type
- Produces: 通过 `defineExpose` 暴露 `getBoundMissionIds(): number[]` + 现有功能不变

- [ ] **Step 1: 更新 import — 删除 addInspectionBinding, deleteInspectionBinding, fetchInspectionBindings**

```typescript
import { checkName, fetchMissions } from '@/shared/api/mission'
```

- [ ] **Step 2: 删除 `originalBindingMap`**

删除这行：
```typescript
const originalBindingMap = ref<Map<number, number>>(new Map())
```

- [ ] **Step 3: 重写 `onMissionPickerOk`**

```typescript
function onMissionPickerOk() {
  // 仅更新本地数组，不再调 API
  boundMissionIds.value = [...tempBoundMissionIds.value]
  missionPickerVisible.value = false
}
```

- [ ] **Step 4: 更新 `loadBoundMissions` — 直接从 mission 数据读取**

```typescript
function loadBoundMissions() {
  // GET /{id} 已返回 inspectionBoundMissionIds，直接使用
  if (props.modelValue.inspectionBoundMissionIds) {
    boundMissionIds.value = [...props.modelValue.inspectionBoundMissionIds]
  }
}
```

- [ ] **Step 5: 更新 watch — 数据加载后自动填充**

```typescript
// 替换原来的 watch(() => props.modelValue.id, ...)
watch(() => props.modelValue.inspectionBoundMissionIds, (ids) => {
  if (ids && ids.length > 0) {
    loadBoundMissions()
  }
})
```

- [ ] **Step 6: 暴露 `getBoundMissionIds`**

在 `</script>` 前新增：

```typescript
defineExpose({ getBoundMissionIds: () => boundMissionIds.value })
```

- [ ] **Step 7: 类型检查**

```bash
npx vue-tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/mission/components/MissionBasicForm.vue
git commit -m "refactor(mission): simplify inspection bindings to local array for unified save"
```

---

### Task 7: 更新 MissionEditPage — 集成子资源 Card + FormData 保存

**Files:**
- Modify: `src/modules/mission/MissionEditPage.vue`

**Interfaces:**
- Consumes: `MissionPrereqCard`, `MissionBarcodeCard` (new components); `saveMission` from API; `ProductMissionSavePayload` from types
- Produces: 完整编辑页 with 子资源管理

- [ ] **Step 1: 更新 import**

```typescript
import MissionPrereqCard from './components/MissionPrereqCard.vue'
import MissionBarcodeCard from './components/MissionBarcodeCard.vue'
import { fetchMission, saveMission } from '@/shared/api/mission'
import type { ProductMission, ProductMissionSavePayload } from '@/shared/types/mission'
```

删除对 `createMission`, `updateMission` 的 import（被 `saveMission` 替代）。

- [ ] **Step 2: 添加子组件 ref**

```typescript
const prereqCard = ref<InstanceType<typeof MissionPrereqCard>>()
const barcodeCard = ref<InstanceType<typeof MissionBarcodeCard>>()
const basicForm = ref<InstanceType<typeof MissionBasicForm>>()
```

- [ ] **Step 3: 更新 `onMounted` — 加载后触发子组件加载**

```typescript
onMounted(async () => {
  if (isEdit && id) {
    loading.value = true
    try {
      const data = await fetchMission(id)
      Object.assign(form.value, data)
      snapshot = JSON.stringify(form.value)
      // 子资源加载由各自组件 onMounted 触发（依赖 missionId prop）
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
```

- [ ] **Step 4: 重写 `handleSave` — 加前端校验 + FormData 统一保存**

```typescript
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

  // 校验条码规则：segments 和 expectedLength 不能同时为空
  const barcodeRules = barcodeCard.value?.getData() ?? []
  for (const r of barcodeRules) {
    const segs = r.segments ? JSON.parse(r.segments) as Array<{ s: number; e: number; v: string }> : []
    const hasSegs = segs.length > 0 && segs.some((s: { e: number; v: string }) => s.e > 0 && s.v)
    const hasLen = r.expectedLength != null && r.expectedLength > 0
    if (!hasSegs && !hasLen) {
      toast.add({
        severity: 'warn',
        detail: `${r.name}: ${t('mission.edit.barcode.atLeastOne')}`,
        life: 3000,
      })
      return
    }
  }

  const boundIds = basicForm.value?.getBoundMissionIds?.() ?? []

  const payload: ProductMissionSavePayload = {
    name,
    maxNgCount: form.value.maxNgCount,
    passwordRequiredNgCount: form.value.passwordRequiredNgCount,
    enabled: form.value.enabled ? 1 : 0,
    multiDeviceIndependent: form.value.multiDeviceIndependent ? 1 : 0,
    skipScrew: form.value.skipScrew ? 1 : 0,
    isInspection: form.value.isInspection ? 1 : 0,
    inspectionScope: form.value.inspectionScope,
    inspectionBoundMissionIds: boundIds,
    prerequisites: prereqCard.value?.getData() ?? [],
    barcodeRules: barcodeCard.value?.getData() ?? [],
  }
  if (isEdit && id) {
    payload.id = id
  }

  saving.value = true
  try {
    await saveMission(payload, isEdit)
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
```

- [ ] **Step 5: 更新模板 — 在 MissionBasicForm 后追加新 Card**

```vue
<MissionBasicForm ref="basicForm" v-model="form" :is-edit="isEdit" />
<MissionPrereqCard
  ref="prereqCard"
  :mission-id="id"
/>
<MissionBarcodeCard
  ref="barcodeCard"
  :mission-id="id"
/>
```

- [ ] **Step 6: 新建模式下重新渲染子组件**

新建时 `id` 为 `null`，子组件不加载数据。新建和编辑模式共用同一组件实例，`id` 不会变化。因此不需要 watch。

- [ ] **Step 7: 类型检查 + 构建验证**

```bash
npx vue-tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/modules/mission/MissionEditPage.vue
git commit -m "feat(mission): integrate prerequisite and barcode cards with unified FormData save"
```

---

### Task 8: 端到端验证

**Files:** None (manual verification)

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 验证编辑模式**
  1. 打开任务列表，点击编辑已有任务
  2. 确认前置任务 Card 加载已有数据
  3. 确认条码规则 Card 加载已有规则
  4. 修改子资源 → 保存 → 刷新页面确认持久化

- [ ] **Step 3: 验证新建模式**
  1. 点击新建任务
  2. 填写基本信息 + 添加前置任务 + 添加条码规则
  3. 保存 → 确认跳转列表
  4. 重新编辑该任务，确认子资源已保存

- [ ] **Step 4: 验证边界情况**
  1. 删除产品追溯码 → 确认弹出级联删除物料码提示
  2. 添加条码规则时不填段位也不填长度 → 确认允许（至少一项可空，但不能同时为空 — 后端校验）
  3. 前置任务 Dialog 中不选任务点确定 → 确认按钮 disabled
  4. 未保存离开 → 确认脏状态检测仍有效
