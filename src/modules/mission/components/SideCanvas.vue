<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import type { ProductBolt, BarCodeMatchingRule, BoltState, BoltDialogData, SideCanvasSyncData } from '@/shared/types/mission'
import { generateUUID } from '@/shared/utils/uuid'
import BoltPropertyDialog from './BoltPropertyDialog.vue'

const props = defineProps<{
  sideId: number | null
  clientRef: string
  barcodeRules: BarCodeMatchingRule[]
  onSync?: (data: SideCanvasSyncData) => void
}>()

const { t } = useI18n()
const toast = useToast()

const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const fileInput = ref<HTMLInputElement>()

const imageLoaded = ref(false)
const imageLoading = ref(false)
const imageError = ref(false)

let originalImage: HTMLImageElement | null = null
let cachedImageBlob: Blob | null = null   // for reopen persistence
let croppedConfirmed = true                // starts clean; markDirty() sets to false
let originalWidth = 0
let originalHeight = 0
let scale = 1
let translateX = 0
let translateY = 0
let rotation = 0
let containerWidth = 0
let containerHeight = 0
let resizeObserver: ResizeObserver | null = null

const bolts = ref<BoltState[]>([])
let nextBoltNum = 1

const boltDialog = ref<InstanceType<typeof BoltPropertyDialog>>()
const editingBoltIdx = ref<number | null>(null)

// ── fit-to-contain + Canvas rendering ──

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
  const cx = containerWidth / 2
  const cy = containerHeight / 2
  ctx.translate(cx + translateX, cy + translateY)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.scale(scale, scale)
  ctx.drawImage(originalImage, -originalWidth / 2, -originalHeight / 2, originalWidth, originalHeight)
  ctx.restore()
}

function boltMarkerStyle(bolt: ProductBolt): Record<string, string> {
  // Percent → image pixel (center origin)
  const ix = (bolt.locationXPercent / 100 - 0.5) * originalWidth
  const iy = (bolt.locationYPercent / 100 - 0.5) * originalHeight
  // Apply full canvas transform: rotate then scale then translate
  const rad = (rotation * Math.PI) / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  const rx = ix * cos - iy * sin
  const ry = ix * sin + iy * cos
  const cx = containerWidth / 2
  const cy = containerHeight / 2
  const sx = cx + translateX + rx * scale
  const sy = cy + translateY + ry * scale
  return { left: `${sx}px`, top: `${sy}px` }
}

// ── ResizeObserver ──

function setupResizeObserver() {
  const el = containerRef.value
  if (!el) return
  resizeObserver = new ResizeObserver(([entry]) => {
    const r = entry?.contentRect
    if (!r || r.width === 0) return
    const nw = r.width
    const nh = r.height
    if (Math.abs(nw - containerWidth) < 3 && Math.abs(nh - containerHeight) < 3) return
    containerWidth = nw
    containerHeight = nh   // use actual height, not square
    if (originalImage && imageLoaded.value) renderCanvas()
  })
  resizeObserver.observe(el)
}

// ── Image loading ──

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
    cachedImageBlob = blob    // cache for Dialog reopen
    resetView()
    imageLoaded.value = true
  } catch {
    imageError.value = true
  } finally {
    imageLoading.value = false
  }
}

function handleReset() {
  croppedConfirmed = true
  resetView()
}

function resetView() {
  if (!originalImage) return
  // Ensure container has dimensions (ResizeObserver may not have fired yet)
  if (containerWidth === 0) {
    const el = containerRef.value
    if (el) {
      const rect = el.getBoundingClientRect()
      containerWidth = rect.width || 400
      containerHeight = rect.height || 400
    } else {
      containerWidth = 400; containerHeight = 400
    }
    canvasRef.value!.width = containerWidth
    canvasRef.value!.height = containerHeight
  }
  const fit = calcFitToContain(originalWidth, originalHeight, containerWidth, containerHeight)
  scale = fit.scale
  // Canvas renders image centered at (cx, cy), so translate stays 0 for centering
  translateX = 0
  translateY = 0
  rotation = 0
  renderCanvas()
}

function reloadImage() {
  // Retry from cached blob or show upload zone
  if (cachedImageBlob) loadImageFromBlob(cachedImageBlob)
  else { imageLoaded.value = false; imageError.value = false }
}

function triggerUpload() {
  fileInput.value?.click()
}

const MAX_SIZE = 5 * 1024 * 1024

function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > MAX_SIZE) {
    toast.add({ severity: 'warn', summary: '警告', detail: t('mission.edit.side.uploadImage') + ' 不能超过 5MB', life: 3000 })
    return
  }
  markDirty()
  loadImageFromBlob(file)
}

// ── Zoom / Pan / Rotate ──

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
  markDirty()
  renderCanvas()
}

let panning = false
let pStartX = 0
let pStartY = 0
let pOrigTX = 0
let pOrigTY = 0

function onCanvasMouseDown(e: MouseEvent) {
  if (!imageLoaded.value) return
  panning = true
  pStartX = e.clientX
  pStartY = e.clientY
  pOrigTX = translateX
  pOrigTY = translateY
}

function onCanvasMouseMove(e: MouseEvent) {
  if (!panning) return
  translateX = pOrigTX + e.clientX - pStartX
  translateY = pOrigTY + e.clientY - pStartY
  markDirty()
  renderCanvas()
}

function onCanvasMouseUp() {
  panning = false
}

function zoomIn() {
  scale = Math.min(10, scale * 1.15)
  markDirty()
  renderCanvas()
}
function zoomOut() {
  scale = Math.max(0.1, scale / 1.15)
  markDirty()
  renderCanvas()
}

function pan(dx: number, dy: number) {
  translateX += dx
  translateY += dy
  markDirty()
  renderCanvas()
}

function rotateLeft() {
  rotation = ((rotation - 90) % 360 + 360) % 360
  markDirty()
  renderCanvas()
}

function rotateRight() {
  rotation = ((rotation + 90) % 360 + 360) % 360
  markDirty()
  renderCanvas()
}

// ── Crop ──

async function doCrop() {
  if (!originalImage || !canvasRef.value) return
  // Export current viewport as new image
  const croppedBlob = await new Promise<Blob>((resolve) =>
    canvasRef.value!.toBlob(b => resolve(b!), 'image/png'))
  if (croppedBlob) {
    await loadImageFromBlob(croppedBlob)
    croppedConfirmed = true
    syncToParent()
    toast.add({ severity: 'info', summary: '提示', detail: '已裁剪到当前视口', life: 2000 })
  }
}

// ── Bolt interactions ──

function screenToPercent(sx: number, sy: number): { x: number; y: number } | null {
  if (!originalImage) return null
  const cx = containerWidth / 2
  const cy = containerHeight / 2
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
  const b: BoltState = {
    _localId: generateUUID(),
    serialNum: nextBoltNum++,
    locationXPercent: p.x,
    locationYPercent: p.y,
  }
  bolts.value.push(b)
  editingBoltIdx.value = bolts.value.length - 1
  renderCanvas()
  syncToParent()
  boltDialog.value?.open(b, b.serialNum, hasProductTrace.value)
}

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
  const up = () => {
    dragIdx = null
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    if (didDrag) { syncToParent() }
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

function onBoltClick(idx: number) {
  if (didDrag) return
  editingBoltIdx.value = idx
  boltDialog.value?.open(bolts.value[idx], bolts.value[idx].serialNum, hasProductTrace.value)
}

function onBoltDialogSync(data: BoltDialogData) {
  if (editingBoltIdx.value !== null) {
    bolts.value[editingBoltIdx.value]._partsBarcode = data.partsBarcode ?? undefined
    syncToParent()
  }
}

function onBoltDialogOk(data: BoltDialogData) {
  if (editingBoltIdx.value === null) return
  const bolt = bolts.value[editingBoltIdx.value]
  bolt.parameterSetId = data.parameterSetId ?? undefined
  bolt.armLocation = data.armLocation || undefined
  bolt.torqueMin = data.torqueMin ?? undefined
  bolt.torqueMax = data.torqueMax ?? undefined
  bolt.angleMin = data.angleMin ?? undefined
  bolt.angleMax = data.angleMax ?? undefined
  bolt._partsBarcode = data.partsBarcode ?? undefined
  editingBoltIdx.value = null
  syncToParent()
}

function onBoltDialogDelete() {
  if (editingBoltIdx.value === null) return
  bolts.value.splice(editingBoltIdx.value, 1)
  bolts.value.forEach((b, i) => { b.serialNum = i + 1 })
  nextBoltNum = bolts.value.length + 1
  editingBoltIdx.value = null
  renderCanvas()
  syncToParent()
}

const hasProductTrace = computed(() => props.barcodeRules.some(r => r.ruleType === 1))

// ── Export ──

import { boltStateToSaveItem } from '@/shared/utils/mission'

function getBoltData() {
  return bolts.value.map(boltStateToSaveItem)
}

async function loadSide(_sideId: number, imageBlob?: Blob) {
  imageError.value = false
  if (imageBlob) await loadImageFromBlob(imageBlob)
}

function setBolts(list: BoltState[]) {
  bolts.value = list.map(b => ({
    ...b,
    _localId: generateUUID(),
    _partsBarcode: b._partsBarcode
      ?? (b.partsBarcode ? { ...b.partsBarcode, _ruleDef: b.partsBarcode.barcodeRule ?? null, name: b.partsBarcode.barcodeRule?.name ?? '' } : undefined),
  }))
  nextBoltNum = bolts.value.length + 1
  if (imageLoaded.value) renderCanvas()
}

function markDirty() {
  croppedConfirmed = false
}

function syncToParent() {
  props.onSync?.({
    imageBlob: cachedImageBlob,
    bolts: getBoltData(),
  })
}

function isDirtyAndUncropped(): boolean {
  return imageLoaded.value && !croppedConfirmed
}

defineExpose({
  getBoltData,
  loadSide,
  setBolts,
  isDirtyAndUncropped,
  canvasRef,
})

// ── Lifecycle ──

onMounted(() => {
  const el = containerRef.value
  if (el) {
    const rect = el.getBoundingClientRect()
    if (rect.width > 0) {
      containerWidth = rect.width
      containerHeight = rect.height
    }
  }
  setupResizeObserver()
  canvasRef.value?.addEventListener('wheel', onCanvasWheel, { passive: false })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  canvasRef.value?.removeEventListener('wheel', onCanvasWheel)
})
</script>

<template>
  <div class="side-canvas-root">
  <div ref="containerRef" class="canvas-container">
    <!-- Upload zone -->
    <div v-if="!imageLoaded && !imageLoading && !imageError" class="upload-zone" @click="triggerUpload">
      <i class="pi pi-cloud-upload upload-icon" />
      <p>{{ t('mission.edit.side.uploadImage') }}</p>
    </div>
    <input ref="fileInput" type="file" accept="image/*" class="hidden-input" @change="onFileSelected">

    <!-- Loading zone -->
    <div v-if="imageLoading" class="loading-zone">
      <Skeleton width="100%" height="100%" border-radius="8px" />
    </div>

    <!-- Error zone -->
    <div v-if="imageError" class="error-zone">
      <span>{{ t('mission.edit.side.loadImageFailed') }}</span>
      <Button icon="pi pi-refresh" severity="secondary" text rounded size="small" @click="reloadImage" />
    </div>

    <!-- Canvas + bolt overlay -->
    <div v-show="imageLoaded" class="canvas-area">
      <canvas
        ref="canvasRef"
        @dblclick="onCanvasDblClick"
        @mousedown="onCanvasMouseDown"
        @mousemove="onCanvasMouseMove"
        @mouseup="onCanvasMouseUp"
        @mouseleave="onCanvasMouseUp"
      />
      <div class="bolt-overlay">
        <div
          v-for="(bolt, idx) in bolts"
          :key="bolt._localId"
          class="bolt-marker"
          :style="boltMarkerStyle(bolt)"
          @mousedown.prevent="onBoltDragStart($event, idx)"
          @click.stop="onBoltClick(idx)"
        >{{ bolt.serialNum }}</div>
      </div>
      <BoltPropertyDialog ref="boltDialog" @ok="onBoltDialogOk" @delete="onBoltDialogDelete" @sync="onBoltDialogSync" />
      <div v-if="bolts.length === 0" class="bolt-hint-overlay">{{ t('mission.edit.side.doubleClickHint') }}</div>
    </div>

    <!-- Toolbar -->
    <div v-if="imageLoaded" class="canvas-toolbar">
      <div class="tb-group">
        <Button icon="pi pi-search-plus" severity="secondary" text rounded class="tb-btn" v-tooltip="'放大'" @click="zoomIn" />
        <Button icon="pi pi-search-minus" severity="secondary" text rounded class="tb-btn" v-tooltip="'缩小'" @click="zoomOut" />
        <Button icon="pi pi-arrow-up" severity="secondary" text rounded class="tb-btn" v-tooltip="'上移'" @click="pan(0, -40)" />
        <Button icon="pi pi-arrow-down" severity="secondary" text rounded class="tb-btn" v-tooltip="'下移'" @click="pan(0, 40)" />
        <Button icon="pi pi-arrow-left" severity="secondary" text rounded class="tb-btn" v-tooltip="'左移'" @click="pan(-40, 0)" />
        <Button icon="pi pi-arrow-right" severity="secondary" text rounded class="tb-btn" v-tooltip="'右移'" @click="pan(40, 0)" />
      </div>
      <div class="tb-group">
        <Button icon="pi pi-replay" severity="secondary" text rounded class="tb-btn" v-tooltip="'左旋'" @click="rotateLeft" />
        <Button icon="pi pi-refresh" severity="secondary" text rounded class="tb-btn" v-tooltip="'右旋'" @click="rotateRight" />
        <Button icon="pi pi-expand" severity="secondary" text rounded class="tb-btn" v-tooltip="'裁剪'" @click="doCrop" />
        <Button icon="pi pi-sync" severity="secondary" text rounded class="tb-btn" v-tooltip="'重置'" @click="handleReset" />
        <Button icon="pi pi-upload" severity="secondary" text rounded class="tb-btn" v-tooltip="'替换图片'" @click="triggerUpload" />
      </div>
    </div>

  </div>
  </div>
</template>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  background: var(--color-surface);
  border-radius: 8px;
  overflow: hidden;
}

.upload-zone,
.loading-zone,
.error-zone {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--p-surface-500);
  gap: 8px;
  border: 2px dashed var(--p-surface-300);
  border-radius: 8px;
  cursor: pointer;
}

.upload-icon {
  font-size: 48px;
  opacity: 0.3;
}

.hidden-input {
  display: none;
}

.canvas-area {
  position: relative;
  cursor: crosshair;
}

.bolt-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.bolt-marker {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--p-primary-500);
  border: 4px solid var(--p-primary-700);
  opacity: 0.8;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.canvas-toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 6px;
  opacity: 0.5;
  transition: opacity 0.15s;
}

.canvas-toolbar:hover {
  opacity: 1;
}

.tb-group {
  display: flex;
  gap: 4px;
  background: var(--p-surface-0);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.tb-btn {
  width: 48px;
  height: 48px;
  font-size: 1.3rem;
}

.side-canvas-root {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}


.bolt-hint-overlay {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 13px;
  color: var(--p-surface-400);
  background: rgba(255,255,255,0.85);
  padding: 4px 14px;
  border-radius: 12px;
  pointer-events: none;
  z-index: 5;
}
</style>
