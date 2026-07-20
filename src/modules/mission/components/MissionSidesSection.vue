<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import SideCanvas from './SideCanvas.vue'
import { generateUUID } from '@/shared/utils/uuid'
import { boltStateToSaveItem } from '@/shared/utils/mission'
import type { BarCodeMatchingRule, ProductSideSaveItem, BoltState, ProductBoltSaveItem } from '@/shared/types/mission'

interface SideState {
  id?: number
  name: string
  clientRef: string
  imageBase64?: string
  thumbnailUrl?: string
  thumbnailBase64?: string
  bolts: BoltState[]
  canvasRef?: InstanceType<typeof SideCanvas>
}

const _sides = defineModel<SideState[]>('_sides', { required: true })

const props = defineProps<{
  missionId: number | null
  barcodeRules: BarCodeMatchingRule[]
  onTouch?: () => void
}>()

const { t } = useI18n()
const confirm = useConfirm()

const dialogVisible = ref(false)
const editingIndex = ref<number | null>(null)

function openDialog(idx: number) {
  editingIndex.value = idx
  dialogVisible.value = true
}

function onDialogVisibleChange(visible: boolean) {
  if (!visible) {
    // Prevent immediate close — gate through confirm first
    const idx = editingIndex.value
    if (idx !== null && _sides.value[idx]?.canvasRef?.isDirtyAndUncropped?.()) {
      confirm.require({
        header: '未裁剪确认',
        message: '裁剪之后才能保存已调整的图片，是否确定关闭？',
        rejectLabel: '继续编辑',
        acceptLabel: '确定关闭',
        accept: () => { dialogVisible.value = false; editingIndex.value = null },
        reject: () => { /* keep dialog open */ },
      })
    } else {
      dialogVisible.value = false
      editingIndex.value = null
    }
  }
}

function closeDialog() {
  dialogVisible.value = false
  editingIndex.value = null
}

async function onSideSync(clientRef: string, data: { imageBlob: Blob | null; bolts: ProductBoltSaveItem[] }) {
  const idx = _sides.value.findIndex(s => s.clientRef === clientRef)
  if (idx === -1) return
  _sides.value[idx].bolts = data.bolts as unknown as BoltState[]
  props.onTouch?.()
  if (data.imageBlob) {
    const b64 = await blobToBase64(data.imageBlob)
    _sides.value[idx].imageBase64 = b64
    generateThumb(b64, _sides.value[idx])
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(b64: string, mime = 'image/png'): Blob {
  const byteChars = atob(b64)
  const byteNums = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i)
  return new Blob([new Uint8Array(byteNums)], { type: mime })
}

async function generateThumb(b64: string, side: SideState) {
  const blob = base64ToBlob(b64)
  const img = new Image()
  const url = URL.createObjectURL(blob)
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(); img.src = url })
  URL.revokeObjectURL(url)
  const c = document.createElement('canvas')
  const maxW = 240, maxH = 180
  const s = Math.min(maxW / img.width, maxH / img.height)
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#e5e5e5'; ctx.fillRect(0, 0, c.width, c.height)  // light gray bg
  ctx.drawImage(img, 0, 0, c.width, c.height)
  const tb = await new Promise<Blob | null>(resolve => c.toBlob(b => resolve(b), 'image/jpeg', 0.85))
  if (tb) {
    if (side.thumbnailUrl) URL.revokeObjectURL(side.thumbnailUrl)
    side.thumbnailUrl = URL.createObjectURL(tb)
    // Also store as Base64 for save payload
    const reader = new FileReader()
    reader.onloadend = () => { side.thumbnailBase64 = (reader.result as string).split(',')[1] }
    reader.readAsDataURL(tb)
  }
}

async function onDialogOpened() {
  const idx = editingIndex.value
  if (idx === null) return
  const side = _sides.value[idx]
  // Restore bolts and image from form data (populated from detail API)
  if (side.canvasRef) {
    if (side.imageBase64) {
      const blob = base64ToBlob(side.imageBase64)
      await side.canvasRef.loadSide(side.id ?? 0, blob)
    }
    side.canvasRef.setBolts(side.bolts)
  }
}

function addSide() {
  const idx = _sides.value.length
  _sides.value.push({ name: `面-${idx + 1}`, clientRef: generateUUID(), bolts: [] })
  props.onTouch?.()
  openDialog(idx)
}

function removeSide(idx: number) {
  if (_sides.value.length <= 1) return
  const name = _sides.value[idx].name
  confirm.require({
    header: t('mission.edit.side.title'),
    message: t('mission.edit.side.removeConfirm', { name }),
    rejectLabel: t('mission.edit.cancel'),
    acceptLabel: t('mission.edit.bolt.dialogDelete'),
    accept: () => {
      if (editingIndex.value === idx) closeDialog()
      const side = _sides.value[idx]
      if (side.thumbnailUrl) URL.revokeObjectURL(side.thumbnailUrl)
      _sides.value.splice(idx, 1)
      props.onTouch?.()
    },
  })
}

/** Called by MissionEditPage after fetchMission returns detail with sides */
function loadFromMissionDetail() {
  for (const side of _sides.value) {
    if (side.imageBase64) {
      generateThumb(side.imageBase64, side)
    }
  }
}

// ── Aggregation ──

function getSidesData(): ProductSideSaveItem[] {
  return _sides.value.map(s => ({
    id: s.id, name: s.name,
    bolts: s.canvasRef?.getBoltData() ?? s.bolts.map(boltStateToSaveItem),
    image: s.imageBase64,
    renderedImage: s.imageBase64,
    thumbnail: s.thumbnailBase64,
  }))
}

function getCanvasRefSetter(idx: number) {
  return (el: unknown) => { if (el) _sides.value[idx].canvasRef = el as InstanceType<typeof SideCanvas> }
}

defineExpose({ getSidesData, loadFromMissionDetail })
</script>

<template>
  <Card class="form-card">
    <template #title>
      <div class="card-hdr">
        <span class="dot dot--green" />
        <span>{{ t('mission.edit.side.title') }}</span>
        <Button icon="pi pi-plus" severity="secondary" text :label="t('mission.edit.side.add')" @click="addSide" class="ml-auto" />
      </div>
    </template>
    <template #content>
      <div v-if="!_sides.length" class="empty">{{ t('mission.edit.side.noImage') }}</div>
      <div v-else class="sides-grid">
        <div v-for="(side, idx) in _sides" :key="side.clientRef" class="side-card" @click="openDialog(idx)">
          <div class="side-thumb">
            <img v-if="side.thumbnailUrl" :src="side.thumbnailUrl" class="thumb-img" />
            <i v-else class="pi pi-image thumb-placeholder" />
          </div>
          <div class="side-name">{{ side.name }}</div>
          <Button v-if="_sides.length > 1" icon="pi pi-times" severity="secondary" text rounded class="side-remove" @click.stop="removeSide(idx)" />
        </div>
      </div>
    </template>
  </Card>

  <Dialog :visible="dialogVisible" modal :closable="true" :draggable="false"
    :header="editingIndex !== null ? _sides[editingIndex]?.name ?? '' : ''"
    :style="{ width: '90vw' }" class="side-edit-dialog"
    @update:visible="onDialogVisibleChange" @show="onDialogOpened">
    <SideCanvas v-for="(s, i) in _sides" :key="s.clientRef" :ref="getCanvasRefSetter(i)"
      v-show="editingIndex === i" :side-id="s.id ?? null" :client-ref="s.clientRef"
      :barcode-rules="barcodeRules" :on-sync="(d: { imageBlob: Blob | null; bolts: ProductBoltSaveItem[] }) => onSideSync(s.clientRef, d)" />
  </Dialog>
</template>

<style scoped>
.form-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; margin-top: 24px; }
.card-hdr { display: flex; align-items: center; gap: 10px; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot--green { background: var(--p-green-400); }
.ml-auto { margin-left: auto; }
.empty { font-size: 14px; color: var(--p-surface-500); }
.sides-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.side-card { position: relative; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; cursor: pointer; transition: box-shadow 0.15s; }
.side-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.side-thumb { aspect-ratio: 4/3; background: var(--p-surface-100); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.thumb-img { width: 100%; height: 100%; object-fit: cover; }
.thumb-placeholder { font-size: 32px; color: var(--p-surface-300); }
.side-name { padding: 8px 10px; font-size: 14px; font-weight: 500; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.side-remove { position: absolute; top: 4px; right: 4px; opacity: 0; transition: opacity 0.15s; }
.side-card:hover .side-remove { opacity: 1; }
</style>

<style>
.side-edit-dialog { max-height: 90vh; }
.side-edit-dialog .p-dialog-content { padding: 0; overflow: hidden; height: calc(90vh - 80px); display: flex; flex-direction: column; }
.side-edit-dialog .p-dialog-content > .side-canvas-root { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.side-edit-dialog .p-dialog { max-height: 95vh; }
</style>
