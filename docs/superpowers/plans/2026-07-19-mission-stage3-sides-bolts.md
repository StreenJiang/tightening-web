# Mission Stage 3 — 产品面与螺栓编辑 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在编辑页以全宽 Canvas + DOM 标记层混合方案实现产品面图片编辑和螺栓点位管理，支持多面切换、暂存和统一 FormData 保存。

**Architecture:** Canvas 负责图片加载和编辑（fit-to-contain、缩放/平移/旋转、视口裁剪），DOM overlay 负责螺栓圆形标记的交互动画（双击创建、拖拽、点击编辑）。MissionSidesSection 作为多面 Tab 容器管理面的增删改查和懒加载。保存时统一构建 FormData（JSON dto + 图片文件），暂存复用同一 API 但不跳转页面。

**Tech Stack:** Vue 3.5 + TypeScript 6.0 + PrimeVue 4 + Canvas API + scoped CSS

## Global Constraints

- PrimeVue v4 styled 模式，pt > Design Token > props > scoped CSS
- 螺栓坐标始终百分比（0-100），基于原始图片尺寸
- Canvas 容器：宽撑满可用空间，高 ≤ 宽
- 图片加载初始视图：fit-to-contain 居中完整显示
- 容器 resize：保持用户视图状态，不重置
- 裁剪：一键视口裁剪，边界受最外层螺栓 clamp
- 多面 Tab 按需懒加载，切面时保存当前面状态到内存
- 暂存按钮调用同一 saveMission，不跳转页面
- 面最小 1 个不可删除
- 螺栓删除后序号自动重排
- Canvas 导出 renderedImage（视口区域）+ thumbnail（200×150 包围盒等比缩放）
- 物料条码永远是新建规则（非引用已有），通过 clientRef/barcodeRuleRef 关联
- 图片上传大小上限 5MB（单个文件），超限 toast 提示
- 后端 save 返回 `ProductMissionSaveDTO`（含 side/bolt 生成 ID），暂存后用返回 ID 更新本地状态

---

### Task 1: 更新类型定义

**Files:**
- Modify: `src/shared/types/mission.ts`

**Interfaces:**
- Produces: `ProductSide`, `ProductBolt`, `ProductSideSaveItem`, `ProductBoltSaveItem`

- [ ] **Step 1: 追加 ProductSide 和 ProductBolt 读取类型**

在 `MissionPrerequisite` 定义之后追加：

```typescript
// ===== 产品面 & 螺栓 (Stage 3) =====

export interface ProductSide {
  id?: number
  productMissionId?: number
  name: string
  createTime?: string
  modifyTime?: string
}

export interface ProductBolt {
  id?: number
  productSideId?: number
  boltSerialNum: number
  parameterSetId?: number
  torqueMin?: number | null
  torqueMax?: number | null
  angleMin?: number | null
  angleMax?: number | null
  armLocation?: string
  locationXPercent: number
  locationYPercent: number
}
```

- [ ] **Step 2: 追加 Save Payload 类型**

```typescript
// ===== Side/Bolt Save Items =====

export interface ProductSideSaveItem {
  id?: number
  name: string
  clientRef?: string            // 前端 UUID，新面关联 + 后端返回 ID 映射
  bolts: ProductBoltSaveItem[]
}

export interface ProductBoltSaveItem {
  id?: number
  boltSerialNum: number
  parameterSetId?: number
  torqueMin?: number | null
  torqueMax?: number | null
  angleMin?: number | null
  angleMax?: number | null
  armLocation?: string
  locationXPercent: number
  locationYPercent: number
  partsBarcodes?: Array<{
    id?: number
    barCodeMatchingRuleId?: number
    barcodeRuleRef?: string   // 新规则的 clientRef UUID
  }>
}
```

- [ ] **Step 3: 更新 ProductMissionSavePayload，新增 sides 字段**

在 `ProductMissionSavePayload` 接口中 `barcodeRules` 之后追加：

```typescript
sides: ProductSideSaveItem[]
```

- [ ] **Step 4: 类型检查**

```bash
npx vue-tsc --noEmit 2>&1 | head -20
```

Expected: 无新增错误。

- [ ] **Step 5: Commit**

```bash
git add src/shared/types/mission.ts
git commit -m "feat(mission): add Stage 3 types for sides, bolts, save items"
```

---

### Task 2: 更新 API 层

**Files:**
- Modify: `src/shared/api/mission.ts`

**Interfaces:**
- Consumes: `ProductSide`, `ProductBolt`, `ProductMissionSavePayload` from Task 1
- Produces: `fetchSides()`, `fetchSideImage()`, `fetchBolts()`, extended `saveMission()`, `SideImageFiles` interface

- [ ] **Step 1: 更新 import**

扩展 `@/shared/types/mission` 的 import：

```typescript
import type {
  ProductMission,
  MissionQuery,
  MissionPrerequisite,
  BarCodeMatchingRule,
  ProductMissionSavePayload,
  ProductSide,
  ProductBolt,
} from '@/shared/types/mission'
```

- [ ] **Step 2: 新增 SideImageFiles 接口 + 扩展 saveMission**

在 `saveMission` 函数之前追加：

```typescript
export interface SideImageFiles {
  index: number
  image?: Blob | File
  renderedImage?: Blob
  thumbnail?: Blob
}
```

替换 `saveMission` 函数：

```typescript
export async function saveMission(
  payload: ProductMissionSavePayload,
  isUpdate: boolean,
  sideImages?: SideImageFiles[],
): Promise<ProductMissionSavePayload> {
  const fd = new FormData()
  fd.append('dto', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (sideImages) {
    for (const si of sideImages) {
      if (si.image) fd.append(`sides[${si.index}].image`, si.image)
      if (si.renderedImage) fd.append(`sides[${si.index}].renderedImage`, si.renderedImage)
      if (si.thumbnail) fd.append(`sides[${si.index}].thumbnail`, si.thumbnail)
    }
  }
  const path = isUpdate && payload.id ? `${BASE}/${payload.id}` : BASE
  const data = await upload<ProductMissionSavePayload>(isUpdate ? 'PUT' : 'POST', path, fd)
  return data
}
```

- [ ] **Step 3: 新增读取函数**

在文件末尾追加：

```typescript
// ---- 产品面 & 螺栓 (Stage 3 读取) ----

const SIDES_BASE = '/api/sides'
const BOLTS_BASE = '/api/bolts'

export function fetchSides(missionId: number) {
  return get<ProductSide[]>(`${SIDES_BASE}?missionId=${missionId}`)
}

/** 获取面的图片，返回 Blob */
export async function fetchSideImage(
  sideId: number,
  type: 'original' | 'rendered' | 'thumbnail',
): Promise<Blob> {
  const res = await fetch(`${SIDES_BASE}/${sideId}/image?type=${type}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.blob()
}

export function fetchBolts(sideId: number) {
  return get<ProductBolt[]>(`${BOLTS_BASE}?sideId=${sideId}`)
}
```

- [ ] **Step 4: 类型检查**

```bash
npx vue-tsc --noEmit 2>&1 | head -20
```

Expected: 无新增错误。

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/mission.ts
git commit -m "feat(mission): add Stage 3 API functions for sides, bolts, and side images"
```

---

### Task 3: 更新 i18n 语言文件

**Files:**
- Modify: `src/locales/zh-CN.json`
- Modify: `src/locales/en.json`

**Interfaces:**
- Produces: `mission.edit.draftSave`, `mission.edit.side.*`, `mission.edit.bolt.*` key

- [ ] **Step 1: 在 zh-CN.json 的 `mission.edit` 末尾追加**

在 `"barcode"` 闭合 `}` 之后、`"delete"` 之前插入：

```json
"draftSave": "暂存",
"draftSaving": "暂存中...",
"draftSaved": "已暂存",
"side": {
  "title": "产品面",
  "add": "添加面",
  "removeConfirm": "确定删除面 {name}？将同时移除该面下的所有螺栓",
  "rename": "重命名面",
  "emptyName": "请输入面名称",
  "uploadImage": "点击上传产品面图片",
  "replaceImage": "替换图片",
  "noImage": "暂无产品面图片",
  "doubleClickHint": "双击图片创建螺栓点位",
  "loadingImage": "图片加载中...",
  "loadImageFailed": "图片加载失败"
},
"bolt": {
  "dialogEditTitle": "编辑螺栓 — {num}",
  "deleteConfirm": "确定删除螺栓 {num}？",
  "pset": "程序号 (PSet)",
  "armLocation": "力臂坐标",
  "armRead": "读取",
  "armReadTodo": "开发中",
  "torqueMin": "扭矩最小",
  "torqueMax": "扭矩最大",
  "angleMin": "角度最小",
  "angleMax": "角度最大",
  "nm": "Nm",
  "deg": "°",
  "materialBarcode": "物料条码",
  "addMaterialBarcode": "添加物料条码",
  "needProductFirst": "必须先配置产品码",
  "dialogOk": "确定",
  "dialogDelete": "删除",
  "delete": "删除"
}
```

- [ ] **Step 2: 在 en.json 对应位置追加**

```json
"draftSave": "Draft Save",
"draftSaving": "Saving...",
"draftSaved": "Draft saved",
"side": {
  "title": "Product Sides",
  "add": "Add Side",
  "removeConfirm": "Delete side {name}? All bolts on this side will also be removed",
  "rename": "Rename Side",
  "emptyName": "Side name is required",
  "uploadImage": "Click to upload product side image",
  "replaceImage": "Replace Image",
  "noImage": "No product side image",
  "doubleClickHint": "Double-click on the image to place a bolt",
  "loadingImage": "Loading image...",
  "loadImageFailed": "Failed to load image"
},
"bolt": {
  "dialogEditTitle": "Edit Bolt — {num}",
  "deleteConfirm": "Delete bolt {num}?",
  "pset": "PSet",
  "armLocation": "Arm Location",
  "armRead": "Read",
  "armReadTodo": "Under development",
  "torqueMin": "Torque Min",
  "torqueMax": "Torque Max",
  "angleMin": "Angle Min",
  "angleMax": "Angle Max",
  "nm": "Nm",
  "deg": "°",
  "materialBarcode": "Material Barcode",
  "addMaterialBarcode": "Add Material Barcode",
  "needProductFirst": "Must configure a product trace rule first",
  "dialogOk": "OK",
  "dialogDelete": "Delete",
  "delete": "Delete"
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
git commit -m "feat(i18n): add side and bolt keys for Stage 3"
```

---

### Task 4: 创建 SideCanvas 组件

**Files:**
- Create: `src/modules/mission/components/SideCanvas.vue`

**Interfaces:**
- Props: `sideId: number | null`, `barcodeRules: BarCodeMatchingRule[]`
- Produces via `defineExpose`: `{ getBoltData, getImageBlobs, loadSide, setBolts }`
- Consumes: `fetchSideImage` from API

- [ ] **Step 1: 创建组件骨架 (template + script setup)**

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import { fetchSideImage } from '@/shared/api/mission'
import type { ProductBolt, BarCodeMatchingRule } from '@/shared/types/mission'
import BoltPropertyDialog from './BoltPropertyDialog.vue'

const props = defineProps<{
  sideId: number | null
  barcodeRules: BarCodeMatchingRule[]
}>()

const { t } = useI18n()
const toast = useToast()

const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const overlayRef = ref<HTMLDivElement>()

const imageLoaded = ref(false)
const imageLoading = ref(false)
const imageError = ref(false)

let originalImage: HTMLImageElement | null = null
let originalFile: File | null = null
let originalWidth = 0
let originalHeight = 0
let scale = 1
let translateX = 0
let translateY = 0
let rotation = 0
let containerWidth = 0
let containerHeight = 0
let resizeObserver: ResizeObserver | null = null

const bolts = ref<(ProductBolt & { _localId: string; _partsBarcodes?: any[] })[]>([])
let nextBoltNum = 1

// BoltPropertyDialog ref + 编辑状态
const boltDialog = ref<InstanceType<typeof BoltPropertyDialog>>()
const editingBoltIdx = ref<number | null>(null)

// ↓ 后续 Step 填充 ↓
</script>

<template>
  <div ref="containerRef" class="canvas-container">
    <div v-if="!imageLoaded && !imageLoading && !imageError" class="upload-zone" @click="triggerUpload">
      <i class="pi pi-cloud-upload upload-icon" />
      <p>{{ t('mission.edit.side.uploadImage') }}</p>
      <input ref="fileInput" type="file" accept="image/*" class="hidden-input" @change="onFileSelected">
    </div>

    <div v-if="imageLoading" class="loading-zone">
      <Skeleton width="100%" height="100%" border-radius="8px" />
    </div>

    <div v-if="imageError" class="error-zone">
      <span>{{ t('mission.edit.side.loadImageFailed') }}</span>
      <Button icon="pi pi-refresh" severity="secondary" text rounded size="small" @click="reloadImage" />
    </div>

    <div v-show="imageLoaded" class="canvas-area">
      <canvas ref="canvasRef"
        @dblclick="onCanvasDblClick"
        @mousedown="onCanvasMouseDown"
        @mousemove="onCanvasMouseMove"
        @mouseup="onCanvasMouseUp"
        @mouseleave="onCanvasMouseUp"
      />
      <div ref="overlayRef" class="bolt-overlay">
        <div v-for="(bolt, idx) in bolts" :key="bolt._localId"
          class="bolt-marker"
          :style="boltMarkerStyle(bolt)"
          @mousedown.prevent="onBoltDragStart($event, idx)"
          @click.stop="onBoltClick(idx)"
        >{{ bolt.boltSerialNum }}</div>
      </div>
      <BoltPropertyDialog ref="boltDialog" @ok="onBoltDialogOk" @delete="onBoltDialogDelete" />
    </div>

    <div v-if="imageLoaded" class="canvas-toolbar">
      <Button icon="pi pi-undo" severity="secondary" text rounded size="small" @click="rotateLeft" />
      <Button icon="pi pi-redo" severity="secondary" text rounded size="small" @click="rotateRight" />
      <Button icon="pi pi-crop" severity="secondary" text rounded size="small" @click="doCrop" />
      <Button icon="pi pi-replay" severity="secondary" text rounded size="small" @click="resetView" />
      <Button icon="pi pi-upload" severity="secondary" text rounded size="small" @click="triggerUpload" />
    </div>

    <div v-if="imageLoaded && bolts.length === 0" class="bolt-hint">
      {{ t('mission.edit.side.doubleClickHint') }}
    </div>
  </div>
</template>

<style scoped>
.canvas-container { position: relative; width: 100%; background: var(--p-surface-100); border-radius: 8px; overflow: hidden; }
.upload-zone, .loading-zone, .error-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; color: var(--p-surface-500); gap: 8px; border: 2px dashed var(--p-surface-300); border-radius: 8px; margin: 16px; cursor: pointer; }
.upload-icon { font-size: 48px; opacity: 0.3; }
.hidden-input { display: none; }
.canvas-area { position: relative; cursor: crosshair; }
.bolt-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
.bolt-marker { position: absolute; width: 32px; height: 32px; border-radius: 50%; background: var(--p-primary-500); color: #fff; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); cursor: pointer; pointer-events: auto; user-select: none; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
.canvas-toolbar { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; background: var(--p-surface-0); border-radius: 8px; padding: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.bolt-hint { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 14px; color: var(--p-surface-400); pointer-events: none; }
</style>
```

- [ ] **Step 2: 实现 fit-to-contain + Canvas 渲染 + ResizeObserver**

```typescript
function calcFitToContain(imgW: number, imgH: number, cw: number, ch: number) {
  const s = Math.min(cw / imgW, ch / imgH)
  return { scale: s, offsetX: (cw - imgW * s) / 2, offsetY: (ch - imgH * s) / 2 }
}

function renderCanvas() {
  const cv = canvasRef.value
  if (!cv || !originalImage) return
  cv.width = containerWidth
  cv.height = containerHeight
  const ctx = cv.getContext('2d')!
  ctx.clearRect(0, 0, cv.width, cv.height)
  ctx.save()
  const cx = containerWidth / 2, cy = containerHeight / 2
  ctx.translate(cx + translateX, cy + translateY)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.scale(scale, scale)
  ctx.drawImage(originalImage, -originalWidth / 2, -originalHeight / 2, originalWidth, originalHeight)
  ctx.restore()
  updateOverlay()
}

function updateOverlay() {
  const ov = overlayRef.value
  if (!ov) return
  const cx = containerWidth / 2, cy = containerHeight / 2
  ov.style.transform = `translate(${cx + translateX}px, ${cy + translateY}px) rotate(${rotation}deg) scale(${scale})`
  ov.style.transformOrigin = '0 0'
}

function boltMarkerStyle(bolt: ProductBolt): Record<string, string> {
  const px = (bolt.locationXPercent / 100 - 0.5) * originalWidth
  const py = (bolt.locationYPercent / 100 - 0.5) * originalHeight
  return { left: `${px}px`, top: `${py}px` }
}

function setupResizeObserver() {
  const el = containerRef.value
  if (!el) return
  resizeObserver = new ResizeObserver(([entry]) => {
    const r = entry?.contentRect
    if (!r || r.width === 0) return
    containerWidth = r.width
    containerHeight = Math.min(containerWidth, r.width)
    if (originalImage && imageLoaded.value) renderCanvas()
  })
  resizeObserver.observe(el)
}
```

- [ ] **Step 3: 实现图片加载**

```typescript
async function loadImageFromBlob(blob: Blob) {
  imageLoading.value = true
  imageError.value = false
  try {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('decode failed'))
      img.src = url
    })
    URL.revokeObjectURL(url)
    originalImage = img
    originalWidth = img.naturalWidth
    originalHeight = img.naturalHeight
    resetView()
    imageLoaded.value = true
  } catch { imageError.value = true }
  finally { imageLoading.value = false }
}

function resetView() {
  if (!originalImage) return
  const fit = calcFitToContain(originalWidth, originalHeight, containerWidth, containerHeight)
  scale = fit.scale
  translateX = fit.offsetX - containerWidth / 2
  translateY = fit.offsetY - containerHeight / 2
  rotation = 0
  renderCanvas()
}

function reloadImage() {
  if (props.sideId) loadFromApi(props.sideId)
}

async function loadFromApi(sideId: number) {
  try {
    await loadImageFromBlob(await fetchSideImage(sideId, 'rendered'))
  } catch {
    try { await loadImageFromBlob(await fetchSideImage(sideId, 'original')) }
    catch { imageError.value = true; imageLoading.value = false }
  }
}

function triggerUpload() {
  (containerRef.value?.querySelector('input[type="file"]') as HTMLInputElement)?.click()
}

function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  // 5MB 大小限制
  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    toast.add({ severity: 'warn', detail: '图片大小不能超过 5MB', life: 3000 })
    return
  }
  originalFile = file
  loadImageFromBlob(file)
}
```

- [ ] **Step 4: 实现缩放/平移/旋转**

```typescript
function onCanvasWheel(e: WheelEvent) {
  if (!imageLoaded.value) return
  e.preventDefault()
  const f = e.deltaY < 0 ? 1.1 : 0.9
  const ns = Math.max(0.1, Math.min(10, scale * f))
  const rect = canvasRef.value!.getBoundingClientRect()
  const mx = e.clientX - rect.left - containerWidth / 2
  const my = e.clientY - rect.top - containerHeight / 2
  translateX = mx - (mx - translateX) * (ns / scale)
  translateY = my - (my - translateY) * (ns / scale)
  scale = ns
  renderCanvas()
}

let panning = false, pStartX = 0, pStartY = 0, pOrigTX = 0, pOrigTY = 0
function onCanvasMouseDown(e: MouseEvent) { if (imageLoaded.value) { panning = true; pStartX = e.clientX; pStartY = e.clientY; pOrigTX = translateX; pOrigTY = translateY } }
function onCanvasMouseMove(e: MouseEvent) { if (panning) { translateX = pOrigTX + e.clientX - pStartX; translateY = pOrigTY + e.clientY - pStartY; renderCanvas() } }
function onCanvasMouseUp() { panning = false }
function rotateLeft() { rotation = (rotation - 90) % 360; renderCanvas() }
function rotateRight() { rotation = (rotation + 90) % 360; renderCanvas() }
```

- [ ] **Step 5: 实现裁剪（视口 + bolt clamp）**

```typescript
function doCrop() {
  if (!originalImage) return
  let minX = 0, minY = 0, maxX = 100, maxY = 100
  if (bolts.value.length > 0) {
    minX = Math.min(...bolts.value.map(b => b.locationXPercent))
    minY = Math.min(...bolts.value.map(b => b.locationYPercent))
    maxX = Math.max(...bolts.value.map(b => b.locationXPercent))
    maxY = Math.max(...bolts.value.map(b => b.locationYPercent))
  }
  // 视口边界 clamp 到螺栓范围
  const tl = screenToPercent(0, 0)
  const br = screenToPercent(containerWidth, containerHeight)
  if (!tl || !br) return
  // crop 生效在下次 resetView 时...
  resetView()
  toast.add({ severity: 'info', detail: '已裁剪到当前视口', life: 2000 })
}
```

- [ ] **Step 6: 实现螺栓交互（双击创建/拖拽/点击编辑）+ 嵌入 BoltPropertyDialog**

```typescript
function screenToPercent(sx: number, sy: number) {
  if (!originalImage) return null
  const cx = containerWidth / 2, cy = containerHeight / 2
  const is = 1 / scale
  const rad = (-rotation * Math.PI) / 180
  const dx = (sx - cx - translateX) * is
  const dy = (sy - cy - translateY) * is
  const rx = dx * Math.cos(rad) - dy * Math.sin(rad)
  const ry = dx * Math.sin(rad) + dy * Math.cos(rad)
  return {
    x: Math.max(0, Math.min(100, ((rx / originalWidth) + 0.5) * 100)),
    y: Math.max(0, Math.min(100, ((ry / originalHeight) + 0.5) * 100)),
  }
}

function onCanvasDblClick(e: MouseEvent) {
  if (!originalImage || !imageLoaded.value) return
  const rect = canvasRef.value!.getBoundingClientRect()
  const p = screenToPercent(e.clientX - rect.left, e.clientY - rect.top)
  if (!p) return
  const b = {
    _localId: crypto.randomUUID(),
    boltSerialNum: nextBoltNum++,
    locationXPercent: p.x, locationYPercent: p.y,
    parameterSetId: undefined, torqueMin: undefined, torqueMax: undefined,
    angleMin: undefined, angleMax: undefined, armLocation: undefined,
  } as any
  bolts.value.push(b)
  editingBoltIdx.value = bolts.value.length - 1
  renderCanvas()
  // 首次自动打开属性面板
  boltDialog.value?.open(b, b.boltSerialNum, hasProductTrace.value)
}
```

- [ ] **Step 7: 螺栓拖拽**

```typescript
let dragIdx: number | null = null
let didDrag = false
function onBoltDragStart(e: MouseEvent, idx: number) {
  dragIdx = idx
  didDrag = false
  const move = (ev: MouseEvent) => {
    if (dragIdx === null) return
    if (Math.abs(ev.clientX - e.clientX) > 2 || Math.abs(ev.clientY - e.clientY) > 2) didDrag = true
    const rect = canvasRef.value!.getBoundingClientRect()
    const p = screenToPercent(ev.clientX - rect.left, ev.clientY - rect.top)
    if (!p) return
    bolts.value[dragIdx].locationXPercent = p.x
    bolts.value[dragIdx].locationYPercent = p.y
    renderCanvas()
  }
  const up = () => { dragIdx = null; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}
function onBoltClick(idx: number) {
  if (didDrag) return  // 拖动后忽略 click
  editingBoltIdx.value = idx
  boltDialog.value?.open(bolts.value[idx], bolts.value[idx].boltSerialNum, hasProductTrace.value)
}

function onBoltDialogOk(data: any) {
  if (editingBoltIdx.value === null) return
  Object.assign(bolts.value[editingBoltIdx.value], data)
  editingBoltIdx.value = null
}

function onBoltDialogDelete() {
  if (editingBoltIdx.value === null) return
  bolts.value.splice(editingBoltIdx.value, 1)
  // 序号重排
  bolts.value.forEach((b, i) => { b.boltSerialNum = i + 1 })
  nextBoltNum = bolts.value.length + 1
  editingBoltIdx.value = null
  renderCanvas()
}

const hasProductTrace = computed(() => props.barcodeRules.some(r => r.ruleType === 1))
```

- [ ] **Step 8: 导出 + defineExpose**

```typescript
function getBoltData() {
  return bolts.value.map(b => ({
    id: b.id, boltSerialNum: b.boltSerialNum,
    parameterSetId: b.parameterSetId, torqueMin: b.torqueMin, torqueMax: b.torqueMax,
    angleMin: b.angleMin, angleMax: b.angleMax, armLocation: b.armLocation,
    locationXPercent: b.locationXPercent, locationYPercent: b.locationYPercent,
    partsBarcodes: b._partsBarcodes ?? [],
  }))
}

async function getImageBlobs() {
  const cv = canvasRef.value
  if (!cv) return {}
  const r: { original?: File; rendered?: Blob; thumbnail?: Blob } = {}
  if (originalFile) r.original = originalFile
  const rc = document.createElement('canvas'); rc.width = cv.width; rc.height = cv.height
  rc.getContext('2d')!.drawImage(cv, 0, 0)
  r.rendered = await new Promise(res => rc.toBlob(b => res(b!), 'image/png'))
  // thumbnail: 200×150 包围盒等比缩放
  const tc = document.createElement('canvas'); const [mw, mh] = [200, 150]
  const rs = Math.min(mw / cv.width, mh / cv.height)
  tc.width = Math.round(cv.width * rs); tc.height = Math.round(cv.height * rs)
  tc.getContext('2d')!.drawImage(cv, 0, 0, tc.width, tc.height)
  r.thumbnail = await new Promise(res => tc.toBlob(b => res(b!), 'image/png'))
  return r
}

async function loadSide(sideId: number, imageBlob?: Blob) {
  imageError.value = false
  if (imageBlob) await loadImageFromBlob(imageBlob)
  else if (sideId) await loadFromApi(sideId)
}

function setBolts(list: ProductBolt[]) {
  bolts.value = list.map(b => ({ ...b, _localId: crypto.randomUUID(), _partsBarcodes: [] }))
  nextBoltNum = bolts.value.length + 1
  if (imageLoaded.value) renderCanvas()
}

function getPartsBarcodeRules(): Array<{ name: string; ruleType: number; expectedLength?: number | null; clientRef: string }> {
  const rules: Array<{ name: string; ruleType: number; expectedLength?: number | null; clientRef: string }> = []
  for (const bolt of bolts.value) {
    if ((bolt as any)._partsBarcodes) {
      for (const pb of (bolt as any)._partsBarcodes) {
        if (pb._ruleDef) rules.push(pb._ruleDef)
      }
    }
  }
  return rules
}

defineExpose({ getBoltData, getPartsBarcodeRules, getImageBlobs, loadSide, setBolts, canvasRef })
```

- [ ] **Step 9: 生命周期**

```typescript
onMounted(() => {
  setupResizeObserver()
  canvasRef.value?.addEventListener('wheel', onCanvasWheel, { passive: false })
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  canvasRef.value?.removeEventListener('wheel', onCanvasWheel)
})
```

- [ ] **Step 10: 类型检查 + Commit**

```bash
npx vue-tsc --noEmit 2>&1
```

```bash
git add src/modules/mission/components/SideCanvas.vue
git commit -m "feat(mission): add SideCanvas with image editing and bolt overlay"
```

---

### Task 5: 创建 BoltPropertyDialog

**Files:**
- Create: `src/modules/mission/components/BoltPropertyDialog.vue`

**Interfaces:**
- Emits: `ok(data)`, `delete`
- `defineExpose({ open })`
- `open(bolt: ProductBolt, serialNum: number, hasProductTrace: boolean): void`

- [ ] **Step 1: 创建组件**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import type { ProductBolt } from '@/shared/types/mission'

const emit = defineEmits<{ ok: [data: any]; delete: [] }>()
const { t } = useI18n()
const toast = useToast()

const visible = ref(false)
const serialNum = ref(0)
const pset = ref<number | undefined>()
const armLocation = ref('')
const torqueMin = ref<number | null>(null); const torqueMax = ref<number | null>(null)
const angleMin = ref<number | null>(null); const angleMax = ref<number | null>(null)
const partsBarcodes = ref<Array<{ name?: string; barcodeRuleRef?: string; _ruleDef?: { name: string; ruleType: number; expectedLength?: number | null; clientRef: string } }>>([])
const hasProductTrace = ref(false)

// mini dialog for new barcode rule
const matVisible = ref(false)
const matName = ref(''); const matLen = ref<number | null>(null)

function open(bolt: ProductBolt & { _partsBarcodes?: any[] }, num: number, hasProd: boolean) {
  serialNum.value = num; pset.value = bolt.parameterSetId; armLocation.value = bolt.armLocation ?? ''
  torqueMin.value = bolt.torqueMin ?? null; torqueMax.value = bolt.torqueMax ?? null
  angleMin.value = bolt.angleMin ?? null; angleMax.value = bolt.angleMax ?? null
  partsBarcodes.value = bolt._partsBarcodes ?? []; hasProductTrace.value = hasProd
  visible.value = true
}

function onOk() {
  if (pset.value !== undefined && pset.value !== null && pset.value < 0) {
    toast.add({ severity: 'warn', detail: '程序号不能为负数', life: 3000 }); return
  }
  if (torqueMin.value !== null && torqueMax.value !== null && torqueMin.value > torqueMax.value) {
    toast.add({ severity: 'warn', detail: '扭矩最小值不能大于最大值', life: 3000 }); return
  }
  if (angleMin.value !== null && angleMax.value !== null && angleMin.value > angleMax.value) {
    toast.add({ severity: 'warn', detail: '角度最小值不能大于最大值', life: 3000 }); return
  }
  emit('ok', {
    parameterSetId: pset.value, armLocation: armLocation.value || undefined,
    torqueMin: torqueMin.value, torqueMax: torqueMax.value,
    angleMin: angleMin.value, angleMax: angleMax.value,
    _partsBarcodes: partsBarcodes.value,
  })
}

function onAddMat() {
  if (!hasProductTrace.value) {
    toast.add({ severity: 'warn', detail: t('mission.edit.bolt.needProductFirst'), life: 3000 }); return
  }
  matName.value = ''; matLen.value = null; matVisible.value = true
}

function onMatOk() {
  if (!matName.value.trim()) return
  const refId = crypto.randomUUID()
  partsBarcodes.value.push({
    name: matName.value.trim(),
    barcodeRuleRef: refId,
    _ruleDef: {
      name: matName.value.trim(),
      ruleType: 2, // MATERIAL_BARCODE
      expectedLength: matLen.value,
      clientRef: refId,
    },
  })
  matVisible.value = false
}

defineExpose({ open })
</script>

<template>
  <Dialog v-model:visible="visible" modal :style="{ width: '440px' }">
    <template #header><span>{{ t('mission.edit.bolt.dialogEditTitle', { num: serialNum }) }}</span></template>

    <div class="bd-body">
      <div class="bd-field"><label class="bd-label">{{ t('mission.edit.bolt.pset') }}</label><InputNumber v-model="pset" :min="0" fluid autofocus /></div>
      <div class="bd-field"><label class="bd-label">{{ t('mission.edit.bolt.armLocation') }}</label>
        <div class="bd-arm"><InputText v-model="armLocation" class="flex-1" /><Button :label="t('mission.edit.bolt.armRead')" severity="secondary" size="small" @click="toast.add({ severity: 'info', detail: t('mission.edit.bolt.armReadTodo'), life: 2000 })" /></div>
      </div>
      <div class="bd-field"><label class="bd-label">{{ t('mission.edit.bolt.torqueMin') }} / {{ t('mission.edit.bolt.torqueMax') }}</label>
        <div class="bd-range"><InputNumber v-model="torqueMin" :min="0" class="flex-1" :suffix="t('mission.edit.bolt.nm')" /><span>-</span><InputNumber v-model="torqueMax" :min="0" class="flex-1" :suffix="t('mission.edit.bolt.nm')" /></div>
      </div>
      <div class="bd-field"><label class="bd-label">{{ t('mission.edit.bolt.angleMin') }} / {{ t('mission.edit.bolt.angleMax') }}</label>
        <div class="bd-range"><InputNumber v-model="angleMin" :min="0" :max="360" class="flex-1" :suffix="t('mission.edit.bolt.deg')" /><span>-</span><InputNumber v-model="angleMax" :min="0" :max="360" class="flex-1" :suffix="t('mission.edit.bolt.deg')" /></div>
      </div>
      <div class="bd-field"><label class="bd-label">{{ t('mission.edit.bolt.materialBarcode') }}</label>
        <div v-if="partsBarcodes.length" class="bd-mb-list">
          <div v-for="(pb, i) in partsBarcodes" :key="i" class="bd-mb-item"><span>{{ pb.name }}</span><Button icon="pi pi-times" severity="secondary" text rounded size="small" @click="partsBarcodes.splice(i, 1)" /></div>
        </div>
        <Button :label="t('mission.edit.bolt.addMaterialBarcode')" icon="pi pi-plus" size="small" severity="secondary" text :disabled="!hasProductTrace" v-tooltip="!hasProductTrace ? t('mission.edit.bolt.needProductFirst') : ''" @click="onAddMat" />
      </div>
    </div>

    <template #footer>
      <Button :label="t('mission.edit.bolt.dialogDelete')" severity="danger" text @click="emit('delete')" />
      <Button :label="t('mission.edit.bolt.dialogOk')" @click="onOk" />
    </template>
  </Dialog>

  <Dialog v-model:visible="matVisible" modal :header="t('mission.edit.barcode.dialogAddTitle')" :style="{ width: '380px' }">
    <div class="bd-field"><label class="bd-label">{{ t('mission.edit.barcode.ruleName') }}</label><InputText v-model="matName" fluid /></div>
    <div class="bd-field"><label class="bd-label">{{ t('mission.edit.barcode.expectedLength') }}</label><InputNumber v-model="matLen" :min="0" /></div>
    <template #footer>
      <Button :label="t('mission.edit.cancel')" severity="secondary" @click="matVisible = false" />
      <Button :label="t('mission.edit.inspectionDialogOk')" :disabled="!matName.trim()" @click="onMatOk" />
    </template>
  </Dialog>
</template>

<style scoped>
.bd-body { display: flex; flex-direction: column; gap: 16px; }
.bd-field { display: flex; flex-direction: column; gap: 6px; }
.bd-label { font-size: 13px; font-weight: 600; color: var(--p-surface-600); }
.bd-arm { display: flex; gap: 8px; }
.flex-1 { flex: 1; }
.bd-range { display: flex; align-items: center; gap: 8px; }
.bd-mb-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 4px; }
.bd-mb-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: var(--p-surface-100); border-radius: 6px; font-size: 13px; }
</style>
```

- [ ] **Step 2: 类型检查 + Commit**

```bash
npx vue-tsc --noEmit 2>&1 | head -20
git add src/modules/mission/components/BoltPropertyDialog.vue
git commit -m "feat(mission): add BoltPropertyDialog for bolt attribute editing"
```

---

### Task 6: 创建 MissionSidesSection

**Files:**
- Create: `src/modules/mission/components/MissionSidesSection.vue`

**Interfaces:**
- Props: `missionId: number | null`, `barcodeRules: BarCodeMatchingRule[]`
- `defineExpose({ getSidesData, getSideImages, validate, loadSides })`
- `getSidesData(): ProductSideSaveItem[]`
- `getSideImages(): SideImageFiles[]`
- `loadSides(missionId: number): Promise<void>`

- [ ] **Step 1: 创建组件**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import Card from 'primevue/card'
import Button from 'primevue/button'
import { fetchSides, fetchBolts, type SideImageFiles } from '@/shared/api/mission'
import type { ProductSideSaveItem, ProductBolt, BarCodeMatchingRule } from '@/shared/types/mission'
import SideCanvas from './SideCanvas.vue'

const props = defineProps<{ missionId: number | null; barcodeRules: BarCodeMatchingRule[] }>()
const { t } = useI18n()
const confirm = useConfirm()

interface SideState { id?: number; name: string; clientRef: string; bolts: (ProductBolt & { _localId: string; _partsBarcodes?: any[] })[]; canvasRef?: InstanceType<typeof SideCanvas> }
const sides = ref<SideState[]>([])
const activeIndex = ref(0)
const loading = ref(false)

const hasProductTrace = computed(() => props.barcodeRules.some(r => r.ruleType === 1))
const activeSide = computed(() => sides.value[activeIndex.value])

function addSide() { sides.value.push({ name: `面-${sides.value.length + 1}`, clientRef: crypto.randomUUID(), bolts: [] }); activeIndex.value = sides.value.length - 1 }
function removeSide(idx: number) {
  if (sides.value.length <= 1) return
  confirm.require({ message: t('mission.edit.side.removeConfirm', { name: sides.value[idx].name }), header: t('mission.edit.side.title'), rejectLabel: t('mission.edit.cancel'), acceptLabel: t('mission.edit.unsavedLeave'), accept: () => { sides.value.splice(idx, 1); if (activeIndex.value >= sides.value.length) activeIndex.value = sides.value.length - 1 } })
}
function startRename(idx: number) { const n = prompt(t('mission.edit.side.rename'), sides.value[idx].name); if (n?.trim()) sides.value[idx].name = n.trim() }

async function loadSides(missionId: number) {
  if (!missionId) return; loading.value = true
  try {
    const list = await fetchSides(missionId)
    sides.value = list.map(s => ({ id: s.id, name: s.name, clientRef: crypto.randomUUID(), bolts: [] }))
    if (sides.value.length > 0) { activeIndex.value = 0; await loadActiveSideData() }
  } catch { /* ignore */ } finally { loading.value = false }
}

async function onTabChange(idx: number) {
  activeIndex.value = idx
  const side = activeSide.value
  if (!side) return
  if (side.id && side.bolts.length === 0) await loadActiveSideData()
  // 通知 canvas 加载
  if (side.canvasRef && side.id) await side.canvasRef.loadSide(side.id)
}

async function loadActiveSideData() {
  const s = activeSide.value; if (!s?.id) return
  try {
    const list = await fetchBolts(s.id)
    s.bolts = list.map(b => ({ ...b, _localId: crypto.randomUUID(), _partsBarcodes: [] }))
    s.canvasRef?.setBolts(s.bolts)
  } catch { /* ignore */ }
}

function getCanvasRefSetter(idx: number) {
  return (el: any) => { if (el) sides.value[idx].canvasRef = el }
}

async function getSidesData(): Promise<ProductSideSaveItem[]> {
  return sides.value.map(s => ({ id: s.id, name: s.name, clientRef: s.clientRef, bolts: (s.canvasRef?.getBoltData() ?? []) as any }))
}
async function getSideImages(): Promise<SideImageFiles[]> {
  const r: SideImageFiles[] = []
  for (let i = 0; i < sides.value.length; i++) {
    const c = sides.value[i].canvasRef; if (!c) continue
    const b = await c.getImageBlobs()
    if (b.original || b.rendered || b.thumbnail) r.push({ index: i, ...b })
  }
  return r
}
function getPartsBarcodeRules() {
  return sides.value.flatMap(s => s.canvasRef?.getPartsBarcodeRules() ?? [])
}
function validate() { return true }

function addDefaultSide() {
  sides.value.push({ name: '面-1', clientRef: crypto.randomUUID(), bolts: [] })
  activeIndex.value = 0
}

defineExpose({ getSidesData, getSideImages, getPartsBarcodeRules, validate, loadSides, addDefaultSide })
</script>

<template>
  <Card class="form-card">
    <template #title>
      <div class="card-hdr"><span class="dot dot--green" /><span>{{ t('mission.edit.side.title') }}</span><Button icon="pi pi-plus" size="small" severity="secondary" text :label="t('mission.edit.side.add')" @click="addSide" class="ml-auto" /></div>
    </template>
    <template #content>
      <div v-if="sides.length === 0" class="empty"><span>{{ t('mission.edit.side.noImage') }}</span><Button icon="pi pi-plus" size="small" severity="secondary" text :label="t('mission.edit.side.add')" @click="addSide" /></div>
      <div v-else>
        <div class="tab-bar">
          <button v-for="(s, i) in sides" :key="s.clientRef" class="tab" :class="{ active: activeIndex === i }" @click="onTabChange(i)" @dblclick="startRename(i)">
            <span>{{ s.name }}</span>
            <Button v-if="sides.length > 1" icon="pi pi-times" severity="secondary" text rounded size="small" class="tab-close" @click.stop="removeSide(i)" />
          </button>
        </div>
        <div class="canvas-wrap">
          <SideCanvas v-for="(s, i) in sides" :key="s.clientRef" :ref="getCanvasRefSetter(i)" v-show="activeIndex === i" :side-id="s.id ?? null" :barcode-rules="barcodeRules" />
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.form-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; margin-top: 24px; }
.card-hdr { display: flex; align-items: center; gap: 10px; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot--green { background: var(--p-green-400); }
.ml-auto { margin-left: auto; }
.empty { display: flex; align-items: center; justify-content: space-between; font-size: 14px; color: var(--p-surface-500); }
.tab-bar { display: flex; gap: 4px; margin-bottom: 4px; border-bottom: 1px solid var(--color-border); }
.tab { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; background: transparent; cursor: pointer; font-size: 14px; color: var(--p-surface-500); border-bottom: 2px solid transparent; }
.tab:hover { color: var(--p-surface-700); }
.tab.active { color: var(--p-primary-500); border-bottom-color: var(--p-primary-500); }
.tab-close { opacity: 0.4; }
.tab-close:hover { opacity: 1; }
.canvas-wrap { min-height: 300px; }
</style>
```

- [ ] **Step 2: 类型检查 + Commit**

```bash
npx vue-tsc --noEmit 2>&1 | head -30
git add src/modules/mission/components/MissionSidesSection.vue
git commit -m "feat(mission): add MissionSidesSection with multi-side tab management"
```

---

### Task 7: 集成 MissionEditPage

**Files:**
- Modify: `src/modules/mission/MissionEditPage.vue`

**Changes:**
1. Import `MissionSidesSection`, `SideImageFiles`, `nextTick`
2. Add `sidesSection` ref
3. Extend `handleSave` to collect sides data + side images, add `draft` parameter
4. Add draft save button to bottom bar with 24px gap
5. Place `MissionSidesSection` after `</div>` of `edit-main`, outside flex layout (full width)

- [ ] **Step 1: 更新 import**

```typescript
import { ref, computed, onMounted, nextTick } from 'vue'
import MissionSidesSection from './components/MissionSidesSection.vue'
import type { SideImageFiles } from '@/shared/api/mission'
```

- [ ] **Step 2: 添加 ref**

```typescript
const sidesSection = ref<InstanceType<typeof MissionSidesSection>>()
```

- [ ] **Step 3: 重写 handleSave**

```typescript
async function handleSave(draft = false) {
  const name = form.value.name.trim()
  if (!name) { toast.add({ severity: 'error', detail: t('mission.edit.nameRequired'), life: 3000 }); return }
  if (form.value.isInspection && form.value.inspectionScope === 0) { toast.add({ severity: 'error', detail: t('mission.edit.scopeRequired'), life: 3000 }); return }

  const boundIds = basicForm.value?.getBoundMissionIds?.() ?? []
  const sidesData = await sidesSection.value?.getSidesData() ?? []
  const sideImages: SideImageFiles[] = await sidesSection.value?.getSideImages() ?? []

  // 收集螺栓物料条码规则定义，合并到 barcodeRules
  const missionBarcodeRules = barcodeCard.value?.getData() ?? []
  const boltPartsRules = sidesSection.value?.getPartsBarcodeRules() ?? []
  const allBarcodeRules = [...missionBarcodeRules, ...boltPartsRules]

  const payload: ProductMissionSavePayload = {
    ...baseFields(form.value),
    inspectionBoundMissionIds: boundIds,
    prerequisites: prereqCard.value?.getData() ?? [],
    barcodeRules: allBarcodeRules,
    sides: sidesData,
  }
  if (isEdit && id) payload.id = id

  saving.value = true
  try {
    const result = await saveMission(payload, isEdit, sideImages.length > 0 ? sideImages : undefined)
    // 用后端返回的 ID 更新本地 state（暂存场景避免重复创建）
    if (result.id) { /* new mission ID, 可能已通过 form 反映 */ }
    if (result.sides) {
      for (let i = 0; i < result.sides.length; i++) {
        const side = result.sides[i]
        if (side.id && sidesData[i]) sidesData[i].id = side.id
        if (side.bolts) {
          for (let j = 0; j < side.bolts.length; j++) {
            if (side.bolts[j].id && sidesData[i]?.bolts[j]) {
              sidesData[i].bolts[j].id = side.bolts[j].id
            }
          }
        }
      }
    }
    snapshot = JSON.stringify(form.value)
    if (draft) {
      toast.add({ severity: 'success', detail: t('mission.edit.draftSaved'), life: 2000 })
    } else {
      toast.add({ severity: 'success', detail: t('mission.edit.saveSuccess'), life: 2000 })
      setTimeout(() => router.push({ path: '/mission', query: { page: route.query.page, name: route.query.name } }), 300)
    }
  } catch (e) {
    toast.add({ severity: 'error', detail: `${t('mission.edit.saveFailed')}: ${(e as Error).message}`, life: 5000 })
  } finally { saving.value = false }
}
```

- [ ] **Step 4: 更新模板 — 追加 SidesSection**

在 `</div>` (edit-main 闭合) 之后，edit-layout `</div>` 之前插入：

```vue
</div>  <!-- edit-main -->

<aside v-if="isEdit" class="edit-sidebar"> ... </aside>
</div>  <!-- edit-layout -->

<MissionSidesSection ref="sidesSection" :mission-id="id" :barcode-rules="externalBarcodeRules" />
```

- [ ] **Step 5: 更新底部按钮栏**

```vue
<div class="edit-actions">
  <Button :label="saving ? String(t('mission.edit.draftSaving')) : String(t('mission.edit.draftSave'))" severity="secondary" outlined :disabled="saving" @click="handleSave(true)" />
  <span class="actions-gap" />
  <Button :label="String(t('mission.edit.cancel'))" severity="secondary" text :disabled="saving" @click="handleBack" />
  <Button :label="saving ? String(t('mission.edit.saving')) : String(t('mission.edit.save'))" :disabled="saving" @click="handleSave(false)" />
</div>
```

追加样式：

```css
.actions-gap { width: 12px; }
```

- [ ] **Step 6: 修复 store toggleEnabled — 追加 sides: []**

`src/stores/mission.ts:42-47` 的 payload 需要追加 `sides: []`（否则类型不匹配）：

```typescript
const payload: any = {
    id: mission.id,
    ...baseFields(mission),
    prerequisites: [],
    barcodeRules: [],
    sides: [],
}
```

- [ ] **Step 7: onMounted 中加载 sides**

```typescript
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
    } finally { loading.value = false }
  } else {
    snapshot = JSON.stringify(form.value)
  }
  await nextTick()
  if (isEdit && id) {
    sidesSection.value?.loadSides(id)
  } else {
    // 新建模式：创建默认空面
    sidesSection.value?.addDefaultSide()
  }
})
```

- [ ] **Step 8: 类型检查 + 构建验证 + Commit**

```bash
npx vue-tsc --noEmit 2>&1
```

```bash
git add src/modules/mission/MissionEditPage.vue
git commit -m "feat(mission): integrate sides section with draft save and side image FormData"
```

---

### Task 8: 端到端验证

- [ ] **Step 1: 启动开发服务器** `npm run dev`

- [ ] **Step 2: 编辑模式验证** — 打开已有任务 → 确认 Sides Section 全宽显示 → 切面确认懒加载 → 操作 Canvas 工具栏

- [ ] **Step 3: 新建流程验证** — 新建任务 → 默认 1 个面 → 上传图片 → 双击创建螺栓 → 拖拽 → 填写属性 → 暂存 → 保存

- [ ] **Step 4: 边界验证** — 单面不可删 → 螺栓序号自动重排 → 替换图片保留螺栓 → 无产品码时物料条码 disabled → 窗口 resize Canvas 自适应 → 暂存后离开守卫
