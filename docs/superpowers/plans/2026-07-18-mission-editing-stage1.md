# Mission Editing Stage 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build mission list page + basic info CRUD (8 fields) for the tightening control system.

**Architecture:** Shared API layer (`request.ts` → `mission.ts`) → Pinia stores (`toast`, `confirm`, `mission`) → Vue SFC pages (`MissionListPage`, `MissionEditPage`) with shared components (`ToggleSwitch`, `ToastNotification`, `ConfirmDialog`, `MissionBasicForm`). Typographic form layout — no cards, no borders, pure spacing rhythm. Linear-style row list — no vertical dividers, no header backgrounds.

**Tech Stack:** Vue 3.5 + TypeScript 6.0, Vite 8, Pinia, Vue Router (hash), vue-i18n, @iconify/vue, scoped CSS (no preprocessor), zero UI libraries

## Global Constraints

- TypeScript 6.0 `erasableSyntaxOnly` mode — no `enum`, use `type` unions
- No UI libraries — hand-written components only
- Animation: `transform` / `opacity` only; 120-200ms duration; `ease-out` curves
- Touch targets ≥44px
- `contain: layout style` on scroll containers
- No runtime `color-mix()` — precomputed CSS variables only from `src/style.css`
- `box-shadow` blur radius ≤12px
- Theme: light default, `html.dark` class toggle
- i18n: `zh-CN` and `en`, composition mode (`useI18n()`)
- Color: yellow (`--color-primary`) ≤5% surface area; no yellow in tabs/tables/headings

---

### Task 1: i18n — Add all `mission.*` keys

**Files:**
- Modify: `src/locales/zh-CN.json`
- Modify: `src/locales/en.json`

**Interfaces:**
- Produces: i18n keys consumed by all mission components

- [ ] **Step 1: Append `mission` block to zh-CN.json**

Add after the last top-level key (`"server"`):

```json
"mission": {
  "list": {
    "search": "搜索任务名称...",
    "create": "新建任务",
    "empty": "暂无任务",
    "emptyHint": "点击新建创建第一个拧紧任务",
    "deleteConfirm": "确定删除任务 {name}？",
    "thumbnail": "任务缩略图",
    "paginationPrev": "较旧",
    "paginationNext": "较新",
    "columns": { "name": "名称", "enabled": "启用", "inspection": "点检" },
    "action": { "edit": "编辑任务", "delete": "删除任务" },
    "toggleFailed": "状态切换失败"
  },
  "edit": {
    "createTitle": "新建任务",
    "editTitle": "编辑任务 - {name}",
    "back": "返回列表",
    "groups": { "basic": "基本属性", "execution": "执行控制", "inspection": "点检配置" },
    "fields": {
      "name": "任务名称", "enabled": "启用", "maxNgCount": "最大NG数",
      "passwordAfterNg": "NG后需密码", "multiDevice": "多设备独立",
      "skipScrew": "跳过螺钉", "isInspection": "点检任务",
      "inspectionScope": "检查范围", "inspectionScopeAll": "全部螺栓",
      "inspectionScopeChosen": "指定螺栓"
    },
    "save": "保存", "saving": "保存中...", "cancel": "取消",
    "unsavedTitle": "未保存的更改",
    "unsavedMessage": "有未保存的更改，确定离开？",
    "nameDuplicate": "任务名称已存在", "nameRequired": "请输入任务名称",
    "saveSuccess": "保存成功", "saveFailed": "保存失败",
    "loadFailed": "加载任务失败"
  },
  "delete": {
    "confirm": "确定删除任务 {name}？此操作不可撤销。",
    "success": "删除成功"
  }
}
```

- [ ] **Step 2: Append `mission` block to en.json**

```json
"mission": {
  "list": {
    "search": "Search mission name...",
    "create": "New Mission",
    "empty": "No missions",
    "emptyHint": "Create your first mission",
    "deleteConfirm": "Delete mission {name}?",
    "thumbnail": "Mission thumbnail",
    "paginationPrev": "Older",
    "paginationNext": "Newer",
    "columns": { "name": "Name", "enabled": "Enabled", "inspection": "Inspection" },
    "action": { "edit": "Edit mission", "delete": "Delete mission" },
    "toggleFailed": "Toggle failed"
  },
  "edit": {
    "createTitle": "New Mission",
    "editTitle": "Edit Mission - {name}",
    "back": "Back to list",
    "groups": { "basic": "Basic Properties", "execution": "Execution Controls", "inspection": "Inspection Config" },
    "fields": {
      "name": "Mission Name", "enabled": "Enabled", "maxNgCount": "Max NG Count",
      "passwordAfterNg": "Password After NG", "multiDevice": "Multi-Device Independent",
      "skipScrew": "Skip Screw", "isInspection": "Inspection Mission",
      "inspectionScope": "Inspection Scope", "inspectionScopeAll": "All Bolts",
      "inspectionScopeChosen": "Chosen Bolts"
    },
    "save": "Save", "saving": "Saving...", "cancel": "Cancel",
    "unsavedTitle": "Unsaved Changes",
    "unsavedMessage": "Unsaved changes will be lost. Leave?",
    "nameDuplicate": "Mission name already exists", "nameRequired": "Mission name is required",
    "saveSuccess": "Saved successfully", "saveFailed": "Save failed",
    "loadFailed": "Failed to load mission"
  },
  "delete": {
    "confirm": "Delete {name}? This cannot be undone.",
    "success": "Deleted successfully"
  }
}
```

- [ ] **Step 3: Verify JSON validity**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/locales/zh-CN.json','utf8')); console.log('zh-CN OK')" && node -e "JSON.parse(require('fs').readFileSync('src/locales/en.json','utf8')); console.log('en OK')"`
Expected: `zh-CN OK` and `en OK`

---

### Task 2: TypeScript types — `shared/types/mission.ts`

**Files:**
- Create: `src/shared/types/mission.ts`

**Interfaces:**
- Produces: `ProductMission`, `MissionQuery` — consumed by API layer, store, and all components

- [ ] **Step 1: Create the types file**

```ts
export interface ProductMission {
  id?: number
  name: string
  maxNgCount: number | null
  passwordRequiredAfterNg: number  // 0 | 1
  enabled: number                  // 0 | 1
  multiDeviceIndependent: number   // 0 | 1
  skipScrew: number                // 0 | 1
  isInspection: number             // 0 | 1
  inspectionScope: number | null   // 1 = ALL | 2 = CHOSEN
  createTime?: string
  modifyTime?: string
}

export interface MissionQuery {
  page: number
  size: number
  name?: string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx vue-tsc --noEmit --project tsconfig.app.json 2>&1`
Expected: No errors. If there are pre-existing errors in other files, confirm no NEW errors from `mission.ts`.

---

### Task 3: Shared API request layer — `shared/api/request.ts`

**Files:**
- Create: `src/shared/api/request.ts`

**Interfaces:**
- Produces: `get<T>`, `post<T>`, `put<T>`, `del<T>` — consumed by `shared/api/mission.ts`

- [ ] **Step 1: Create the request utility**

```ts
const BASE = ''

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (json.code !== 200) throw new Error(json.message)
  return json.data as T
}

export const get = <T>(path: string) => request<T>('GET', path)
export const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body)
export const put = <T>(path: string, body?: unknown) => request<T>('PUT', path, body)
export const del = (path: string) => request<void>('DELETE', path)
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx vue-tsc --noEmit --project tsconfig.app.json 2>&1`
Expected: No new errors.

---

### Task 4: Mission API — `shared/api/mission.ts`

**Files:**
- Create: `src/shared/api/mission.ts`

**Interfaces:**
- Consumes: `get/post/put/del` from `shared/api/request.ts`, `ProductMission`, `MissionQuery` from `shared/types/mission.ts`
- Produces: `fetchMissions`, `fetchMission`, `checkName`, `createMission`, `updateMission`, `deleteMission`

- [ ] **Step 1: Create mission API**

```ts
import { get, post, put, del } from './request'
import type { ProductMission, MissionQuery } from '@/shared/types/mission'

const BASE = '/api/missions'

export function fetchMissions(params: MissionQuery) {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page))
  qs.set('size', String(params.size))
  if (params.name) qs.set('name', params.name)
  return get<{ records: ProductMission[]; total: number; size: number; current: number }>(`${BASE}?${qs}`)
}

export function fetchMission(id: number) {
  return get<ProductMission>(`${BASE}/${id}`)
}

export function checkName(name: string, excludeId?: number) {
  const qs = new URLSearchParams()
  qs.set('name', name)
  if (excludeId) qs.set('excludeId', String(excludeId))
  return get<boolean>(`${BASE}/check-name?${qs}`)
}

export function createMission(data: ProductMission) {
  return post<string>(BASE, data)
}

export function updateMission(id: number, data: ProductMission) {
  return put<string>(`${BASE}/${id}`, data)
}

export function deleteMission(id: number) {
  return del(`${BASE}/${id}`)
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx vue-tsc --noEmit --project tsconfig.app.json 2>&1`
Expected: No new errors.

---

### Task 5: Toast store — `stores/toast.ts`

**Files:**
- Create: `src/stores/toast.ts`

**Interfaces:**
- Produces: `useToastStore` with `{ visible, message, type, show(msg, type?, ms?), hide() }`
- Consumed by: any page/component and `ToastNotification.vue`

- [ ] **Step 1: Create toast store**

```ts
import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useToastStore = defineStore('toast', () => {
  const visible = ref(false)
  const message = ref('')
  const type = ref<'success' | 'error'>('success')
  let timer: ReturnType<typeof setTimeout>

  function show(msg: string, t: 'success' | 'error' = 'success', ms = 2000) {
    clearTimeout(timer)
    message.value = msg
    type.value = t
    visible.value = true
    if (ms > 0) timer = setTimeout(() => { visible.value = false }, ms)
  }

  function hide() {
    visible.value = false
    clearTimeout(timer)
  }

  return { visible, message, type, show, hide }
})
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx vue-tsc --noEmit --project tsconfig.app.json 2>&1`
Expected: No new errors.

---

### Task 6: Confirm store — `stores/confirm.ts`

**Files:**
- Create: `src/stores/confirm.ts`

**Interfaces:**
- Produces: `useConfirmStore` with `{ visible, opts, open(o): Promise<boolean>, confirm(), cancel() }`
- Consumed by: any page/component and `ConfirmDialog.vue`

- [ ] **Step 1: Create confirm store**

```ts
import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface ConfirmOptions {
  title: string
  message: string
}

export const useConfirmStore = defineStore('confirm', () => {
  const visible = ref(false)
  const opts = ref<ConfirmOptions>({ title: '', message: '' })
  let resolveFn: ((val: boolean) => void) | null = null

  function open(o: ConfirmOptions): Promise<boolean> {
    opts.value = o
    visible.value = true
    return new Promise(resolve => { resolveFn = resolve })
  }

  function confirm() {
    visible.value = false
    resolveFn?.(true)
    resolveFn = null
  }

  function cancel() {
    visible.value = false
    resolveFn?.(false)
    resolveFn = null
  }

  return { visible, opts, open, confirm, cancel }
})
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx vue-tsc --noEmit --project tsconfig.app.json 2>&1`
Expected: No new errors.

---

### Task 7: ToggleSwitch — `shared/components/ToggleSwitch.vue`

**Files:**
- Create: `src/shared/components/ToggleSwitch.vue`

**Interfaces:**
- Produces: `<ToggleSwitch>` component
- Props: `modelValue: number` (0|1), `disabled?: boolean`
- Emits: `update:modelValue`

- [ ] **Step 1: Create ToggleSwitch component**

```vue
<script setup lang="ts">
defineProps<{
  modelValue: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue === 1"
    :disabled="disabled"
    class="toggle-switch"
    :class="{ active: modelValue === 1 }"
    @click="emit('update:modelValue', modelValue === 1 ? 0 : 1)"
  >
    <span class="toggle-knob" />
  </button>
</template>

<style scoped>
.toggle-switch {
  position: relative;
  width: 40px;
  height: 24px;
  border-radius: 12px;
  border: none;
  background: var(--color-border);
  cursor: pointer;
  transition: background 120ms ease-out;
  flex-shrink: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.toggle-switch.active {
  background: rgba(196, 151, 0, 0.2);
}

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-text-secondary);
  transition: transform 120ms ease-out, background 120ms ease-out;
}

.toggle-switch.active .toggle-knob {
  transform: translateX(16px);
  background: var(--color-primary);
}

.toggle-switch:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.toggle-switch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx vue-tsc --noEmit --project tsconfig.app.json 2>&1`
Expected: No new errors.

---

### Task 8: ToastNotification — `shared/components/ToastNotification.vue`

**Files:**
- Create: `src/shared/components/ToastNotification.vue`

**Interfaces:**
- Consumes: `useToastStore` from `stores/toast.ts`

- [ ] **Step 1: Create ToastNotification component**

```vue
<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
const toast = useToastStore()
</script>

<template>
  <Teleport to="body">
    <transition name="toast">
      <div v-if="toast.visible" class="toast" :class="toast.type" role="status" aria-live="polite">
        {{ toast.message }}
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  z-index: 3000;
  pointer-events: none;
  text-align: center;
  max-width: 480px;
}

.toast.success {
  background: var(--color-status-ok-bg);
  color: var(--color-status-ok);
}

.toast.error {
  background: var(--color-status-error-bg);
  color: var(--color-status-error);
}

.toast-enter-active { transition: opacity 150ms ease-out, transform 150ms ease-out; }
.toast-leave-active { transition: opacity 120ms ease-in, transform 120ms ease-in; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
.toast-leave-to   { opacity: 0; transform: translateX(-50%) translateY(-8px); }
</style>
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx vue-tsc --noEmit --project tsconfig.app.json 2>&1`
Expected: No new errors.

---

### Task 9: ConfirmDialog — `shared/components/ConfirmDialog.vue`

**Files:**
- Create: `src/shared/components/ConfirmDialog.vue`

**Interfaces:**
- Consumes: `useConfirmStore` from `stores/confirm.ts`

- [ ] **Step 1: Create ConfirmDialog component**

```vue
<script setup lang="ts">
import { useConfirmStore } from '@/stores/confirm'
const confirmStore = useConfirmStore()
</script>

<template>
  <Teleport to="body">
    <transition name="modal">
      <div
        v-if="confirmStore.visible"
        class="dialog-overlay"
        @click.self="confirmStore.cancel()"
        @keydown.escape="confirmStore.cancel()"
      >
        <div class="dialog-panel" role="dialog" aria-modal="true">
          <h3 class="dialog-title">{{ confirmStore.opts.title }}</h3>
          <p class="dialog-message">{{ confirmStore.opts.message }}</p>
          <div class="dialog-actions">
            <button class="dialog-btn cancel" @click="confirmStore.cancel()">
              {{ $t('mission.edit.cancel') }}
            </button>
            <button class="dialog-btn confirm" @click="confirmStore.confirm()">
              {{ $t('mission.edit.save') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog-panel {
  background: var(--color-surface);
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
  padding: 24px;
  min-width: 360px;
  max-width: 440px;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 12px 0;
}

.dialog-message {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.dialog-btn {
  height: 36px;
  padding: 0 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.dialog-btn.cancel {
  background: transparent;
  color: var(--color-text-secondary);
}

.dialog-btn.cancel:hover {
  color: var(--color-text);
}

.dialog-btn.confirm {
  background: var(--color-primary);
  color: #fff;
}

html.dark .dialog-btn.confirm {
  color: #1a1a1a;
}

.dialog-btn.confirm:hover {
  opacity: 0.9;
}

.dialog-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.modal-enter-active { transition: opacity 150ms ease-out; }
.modal-leave-active { transition: opacity 120ms ease-in; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx vue-tsc --noEmit --project tsconfig.app.json 2>&1`
Expected: No new errors.

---

### Task 10: App.vue — Mount shared components

**Files:**
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `ToastNotification`, `ConfirmDialog`

- [ ] **Step 1: Add global components to App.vue**

Replace `src/App.vue`:

```vue
<script setup lang="ts">
import ToastNotification from '@/shared/components/ToastNotification.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
</script>

<template>
  <router-view />
  <ToastNotification />
  <ConfirmDialog />
</template>
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx vue-tsc --noEmit --project tsconfig.app.json 2>&1`
Expected: No new errors.

---

### Task 11: Mission store — `stores/mission.ts`

**Files:**
- Create: `src/stores/mission.ts`

**Interfaces:**
- Consumes: `fetchMissions`, `updateMission`, `deleteMission` from `shared/api/mission.ts`; `useToastStore` from `stores/toast.ts`
- Produces: `useMissionStore` with `{ missions, loading, pagination, searchName, loadMissions, toggleEnabled, removeMission }`

- [ ] **Step 1: Create mission store**

```ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchMissions, updateMission, deleteMission } from '@/shared/api/mission'
import { useToastStore } from './toast'
import type { ProductMission } from '@/shared/types/mission'

export const useMissionStore = defineStore('mission', () => {
  const missions = ref<ProductMission[]>([])
  const loading = ref(false)
  const pagination = ref({ page: 1, size: 20, total: 0 })
  const searchName = ref('')

  async function loadMissions(query?: { page?: number; name?: string }) {
    if (query) {
      if (query.page !== undefined) pagination.value.page = query.page
      if (query.name !== undefined) searchName.value = query.name
    }
    loading.value = true
    try {
      const data = await fetchMissions({
        page: pagination.value.page,
        size: pagination.value.size,
        name: searchName.value || undefined,
      })
      missions.value = data.records
      pagination.value.total = data.total
      pagination.value.size = data.size
      pagination.value.page = data.current
    } finally {
      loading.value = false
    }
  }

  async function toggleEnabled(mission: ProductMission) {
    const previous = mission.enabled
    mission.enabled = mission.enabled === 1 ? 0 : 1
    try {
      await updateMission(mission.id!, { ...mission, enabled: mission.enabled })
    } catch {
      mission.enabled = previous
      useToastStore().show('mission.list.toggleFailed', 'error')
    }
  }

  async function removeMission(id: number) {
    await deleteMission(id)
    await loadMissions()
    useToastStore().show('mission.delete.success', 'success')
  }

  return { missions, loading, pagination, searchName, loadMissions, toggleEnabled, removeMission }
})
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx vue-tsc --noEmit --project tsconfig.app.json 2>&1`
Expected: No new errors.

---

### Task 12: MissionBasicForm — `modules/mission/components/MissionBasicForm.vue`

**Files:**
- Create: `src/modules/mission/components/MissionBasicForm.vue`

**Interfaces:**
- Consumes: `ToggleSwitch` from `shared/components/ToggleSwitch.vue`; `i18n` `mission.edit.*` keys; `checkName` from API
- Props: `modelValue: ProductMission`, `isEdit: boolean`
- Emits: `update:modelValue`

- [ ] **Step 1: Create MissionBasicForm**

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ToggleSwitch from '@/shared/components/ToggleSwitch.vue'
import { checkName } from '@/shared/api/mission'
import type { ProductMission } from '@/shared/types/mission'

const props = defineProps<{
  modelValue: ProductMission
  isEdit: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ProductMission]
}>()

const { t } = useI18n()

const nameError = ref('')
const nameChecking = ref(false)
let checkTimer: ReturnType<typeof setTimeout>

function update<K extends keyof ProductMission>(key: K, value: ProductMission[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

async function validateName() {
  clearTimeout(checkTimer)
  const name = props.modelValue.name.trim()
  if (!name) {
    nameError.value = t('mission.edit.nameRequired')
    return
  }
  if (name.length > 50) {
    nameError.value = '名称不能超过50个字符'
    return
  }
  nameChecking.value = true
  checkTimer = setTimeout(async () => {
    try {
      const excludeId = props.isEdit ? props.modelValue.id : undefined
      const isDup = await checkName(name, excludeId)
      nameError.value = isDup ? t('mission.edit.nameDuplicate') : ''
    } catch {
      // 校验失败不阻塞保存
    } finally {
      nameChecking.value = false
    }
  }, 400)
}

function onNameBlur() {
  validateName()
}

watch(() => props.modelValue.isInspection, (val) => {
  if (val === 0) {
    update('inspectionScope', null)
  }
})
</script>

<template>
  <form class="mission-form" @submit.prevent>
    <!-- 基本属性 -->
    <div class="form-group">
      <h3 class="group-title">{{ t('mission.edit.groups.basic') }}</h3>
      <div class="form-row">
        <label class="form-label">{{ t('mission.edit.fields.name') }}</label>
        <div class="form-field">
          <input
            type="text"
            class="form-input"
            :class="{ error: nameError }"
            :value="modelValue.name"
            :placeholder="t('mission.edit.fields.name')"
            @input="update('name', ($event.target as HTMLInputElement).value)"
            @blur="onNameBlur"
          />
          <span v-if="nameChecking" class="field-spinner" />
          <p v-if="nameError" class="field-error">{{ nameError }}</p>
        </div>
      </div>
      <div class="form-row">
        <label class="form-label">{{ t('mission.edit.fields.enabled') }}</label>
        <ToggleSwitch
          :model-value="modelValue.enabled"
          @update:model-value="update('enabled', $event)"
        />
      </div>
    </div>

    <!-- 执行控制 -->
    <div class="form-group">
      <h3 class="group-title">{{ t('mission.edit.groups.execution') }}</h3>
      <div class="form-row">
        <label class="form-label">{{ t('mission.edit.fields.maxNgCount') }}</label>
        <input
          type="number"
          class="form-input number"
          :value="modelValue.maxNgCount ?? ''"
          min="0"
          max="999"
          @input="update('maxNgCount', ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="form-row">
        <label class="form-label">{{ t('mission.edit.fields.skipScrew') }}</label>
        <ToggleSwitch
          :model-value="modelValue.skipScrew"
          @update:model-value="update('skipScrew', $event)"
        />
      </div>
      <div class="form-row">
        <label class="form-label">{{ t('mission.edit.fields.passwordAfterNg') }}</label>
        <ToggleSwitch
          :model-value="modelValue.passwordRequiredAfterNg"
          @update:model-value="update('passwordRequiredAfterNg', $event)"
        />
      </div>
      <div class="form-row">
        <label class="form-label">{{ t('mission.edit.fields.multiDevice') }}</label>
        <ToggleSwitch
          :model-value="modelValue.multiDeviceIndependent"
          @update:model-value="update('multiDeviceIndependent', $event)"
        />
      </div>
    </div>

    <!-- 点检配置 -->
    <div class="form-group">
      <h3 class="group-title">{{ t('mission.edit.groups.inspection') }}</h3>
      <div class="form-row">
        <label class="form-label">{{ t('mission.edit.fields.isInspection') }}</label>
        <ToggleSwitch
          :model-value="modelValue.isInspection"
          @update:model-value="update('isInspection', $event)"
        />
      </div>
      <div v-if="modelValue.isInspection === 1" class="form-row radio-row">
        <label class="form-label">{{ t('mission.edit.fields.inspectionScope') }}</label>
        <div class="radio-group">
          <label class="radio-item">
            <input
              type="radio"
              name="inspectionScope"
              :checked="modelValue.inspectionScope === 1"
              @change="update('inspectionScope', 1)"
            />
            <span>{{ t('mission.edit.fields.inspectionScopeAll') }}</span>
          </label>
          <label class="radio-item">
            <input
              type="radio"
              name="inspectionScope"
              :checked="modelValue.inspectionScope === 2"
              @change="update('inspectionScope', 2)"
            />
            <span>{{ t('mission.edit.fields.inspectionScopeChosen') }}</span>
          </label>
        </div>
      </div>
    </div>
  </form>
</template>

<style scoped>
.mission-form {
  max-width: 560px;
}

.form-group {
  margin-bottom: 40px;
}

.group-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-secondary);
  margin: 0 0 8px 0;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 6px 0;
}

.form-label {
  font-size: 14px;
  color: var(--color-text);
  white-space: nowrap;
}

.form-field {
  flex: 1;
  max-width: 320px;
  position: relative;
}

.form-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  font-size: 16px;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  outline: none;
  box-sizing: border-box;
}

.form-input.number {
  width: 80px;
}

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(196, 151, 0, 0.15);
}

.form-input.error {
  border-color: var(--color-status-error);
}

.field-error {
  font-size: 14px;
  color: var(--color-status-error);
  margin: 4px 0 0 0;
}

.field-spinner {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: translateY(-50%) rotate(360deg); }
}

.radio-row {
  align-items: flex-start;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  font-size: 14px;
  color: var(--color-text);
  cursor: pointer;
}

.radio-item input[type="radio"] {
  accent-color: var(--color-primary);
  width: 18px;
  height: 18px;
}
</style>
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx vue-tsc --noEmit --project tsconfig.app.json 2>&1`
Expected: No new errors.

> **Note:** The `@keyframes spin` animation in `.field-spinner` is an exception to the "no animation" rule because (a) it runs only during name validation (≤400ms), (b) the spinner is 16×16px on a single element, and (c) `transform: rotate()` is GPU-composited.

---

### Task 13: MissionEditPage — `modules/mission/MissionEditPage.vue`

**Files:**
- Create: `src/modules/mission/MissionEditPage.vue`

**Interfaces:**
- Consumes: `MissionBasicForm`; `fetchMission`, `createMission`, `updateMission` from API; `useToastStore`, `useConfirmStore`; vue-router `useRoute`/`useRouter`

- [ ] **Step 1: Create MissionEditPage**

```vue
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import MissionBasicForm from './components/MissionBasicForm.vue'
import { fetchMission, createMission, updateMission } from '@/shared/api/mission'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import type { ProductMission } from '@/shared/types/mission'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const confirmStore = useConfirmStore()

const id = route.params.id ? Number(route.params.id) : null
const isEdit = id !== null
const loading = ref(false)
const saving = ref(false)

const form = reactive<ProductMission>({
  name: '',
  enabled: 1,
  maxNgCount: null,
  passwordRequiredAfterNg: 0,
  multiDeviceIndependent: 0,
  skipScrew: 0,
  isInspection: 0,
  inspectionScope: null,
})

let snapshot = ''

onMounted(async () => {
  if (isEdit && id) {
    loading.value = true
    try {
      const data = await fetchMission(id)
      Object.assign(form, data)
      snapshot = JSON.stringify(form)
    } catch {
      toast.show(t('mission.edit.loadFailed'), 'error', 3000)
      router.push({ path: '/mission' })
    } finally {
      loading.value = false
    }
  } else {
    snapshot = JSON.stringify(form)
  }
})

function isDirty(): boolean {
  return JSON.stringify(form) !== snapshot
}

async function handleSave() {
  const name = form.name.trim()
  if (!name) {
    toast.show(t('mission.edit.nameRequired'), 'error')
    return
  }
  saving.value = true
  try {
    if (isEdit && id) {
      await updateMission(id, { ...form, name, id })
    } else {
      await createMission({ ...form, name })
    }
    snapshot = JSON.stringify(form)
    toast.show(t('mission.edit.saveSuccess'), 'success', 2000)
    setTimeout(() => {
      router.push({
        path: '/mission',
        query: { page: route.query.page, name: route.query.name },
      })
    }, 300)
  } catch (e) {
    toast.show(`${t('mission.edit.saveFailed')}: ${(e as Error).message}`, 'error', 5000)
  } finally {
    saving.value = false
  }
}

async function handleBack() {
  if (isDirty()) {
    const confirmed = await confirmStore.open({
      title: t('mission.edit.unsavedTitle'),
      message: t('mission.edit.unsavedMessage'),
    })
    if (!confirmed) return
  }
  router.push({ path: '/mission', query: { page: route.query.page, name: route.query.name } })
}

onBeforeRouteLeave(async (_to, _from, next) => {
  if (isDirty()) {
    const confirmed = await confirmStore.open({
      title: t('mission.edit.unsavedTitle'),
      message: t('mission.edit.unsavedMessage'),
    })
    if (!confirmed) return next(false)
  }
  next()
})

const title = isEdit ? t('mission.edit.editTitle', { name: form.name }) : t('mission.edit.createTitle')
</script>

<template>
  <div class="edit-page">
    <nav class="edit-nav">
      <button class="back-btn" @click="handleBack" :aria-label="String(t('mission.edit.back'))">
        <Icon icon="mdi:arrow-left" width="20" />
      </button>
      <h1 class="edit-title">{{ title }}</h1>
    </nav>

    <div v-if="loading" class="skeleton-container">
      <div class="skeleton-group">
        <div class="skeleton-title" />
        <div class="skeleton-input" />
        <div class="skeleton-input short" />
      </div>
      <div class="skeleton-group">
        <div class="skeleton-title" />
        <div class="skeleton-input short" />
        <div class="skeleton-input" />
        <div class="skeleton-input" />
      </div>
      <div class="skeleton-group">
        <div class="skeleton-title" />
        <div class="skeleton-input short" />
      </div>
    </div>

    <div v-else class="edit-content">
      <MissionBasicForm v-model="form" :is-edit="isEdit" />

      <div class="edit-actions">
        <button class="action-btn cancel" @click="handleBack" :disabled="saving">
          {{ t('mission.edit.cancel') }}
        </button>
        <button class="action-btn save" @click="handleSave" :disabled="saving">
          {{ saving ? t('mission.edit.saving') : t('mission.edit.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edit-page {
  max-width: 620px;
}

.edit-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
}

.back-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.back-btn:hover {
  background: var(--color-surface);
}

.back-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.edit-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.edit-content {
  contain: layout style;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 40px;
}

.action-btn {
  height: 44px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.action-btn.cancel {
  background: transparent;
  color: var(--color-text-secondary);
  padding: 0 16px;
}

.action-btn.cancel:hover {
  color: var(--color-text);
}

.action-btn.save {
  background: var(--color-primary);
  color: #fff;
  padding: 0 24px;
  font-weight: 600;
  min-width: 80px;
}

html.dark .action-btn.save {
  color: #1a1a1a;
}

.action-btn.save:hover { opacity: 0.9; }
.action-btn.save:disabled { opacity: 0.5; cursor: not-allowed; }
.action-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Skeleton */
.skeleton-container { max-width: 560px; }
.skeleton-group { margin-bottom: 40px; }
.skeleton-title {
  width: 80px; height: 12px; border-radius: 3px;
  background: var(--color-border); margin-bottom: 12px;
}
.skeleton-input {
  width: 100%; height: 40px; border-radius: 4px;
  background: var(--color-border); margin-bottom: 8px;
}
.skeleton-input.short { width: 80px; }
</style>
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx vue-tsc --noEmit --project tsconfig.app.json 2>&1`
Expected: No new errors.

---

### Task 14: MissionListPage — `modules/mission/MissionListPage.vue`

**Files:**
- Create: `src/modules/mission/MissionListPage.vue`

**Interfaces:**
- Consumes: `useMissionStore`, `useToastStore`, `useConfirmStore`, `ToggleSwitch`, `Icon`; vue-router

- [ ] **Step 1: Create MissionListPage**

```vue
<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import ToggleSwitch from '@/shared/components/ToggleSwitch.vue'
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
  })
  if (confirmed) {
    await store.removeMission(mission.id!)
  }
}

function inspectionLabel(m: ProductMission): string {
  if (m.isInspection !== 1) return '—'
  return t('mission.columns.inspection')
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
      <Icon icon="mdi:clipboard-text-outline" width="64" class="empty-icon" />
      <p class="empty-title">{{ t('mission.list.empty') }}</p>
      <p class="empty-hint">{{ t('mission.list.emptyHint') }}</p>
      <button class="create-btn" @click="goToCreate">
        <Icon icon="mdi:plus" width="18" />
        <span>{{ t('mission.list.create') }}</span>
      </button>
    </div>

    <!-- List -->
    <div v-else class="mission-list" role="table" aria-label="Mission list">
      <div class="list-header" role="row">
        <span class="col-thumb" />
        <span class="col-name" role="columnheader">{{ t('mission.list.columns.name') }}</span>
        <span class="col-enabled" role="columnheader">{{ t('mission.list.columns.enabled') }}</span>
        <span class="col-inspection" role="columnheader">{{ t('mission.list.columns.inspection') }}</span>
        <span class="col-actions" role="columnheader" />
      </div>

      <div
        v-for="m in store.missions"
        :key="m.id"
        class="list-row"
        role="row"
        @click="goToEdit(m)"
      >
        <span class="col-thumb">
          <Icon v-if="!hasThumbnail()" icon="mdi:clipboard-text-outline" width="28" class="thumb-placeholder" />
        </span>
        <span class="col-name">{{ m.name }}</span>
        <span class="col-enabled" @click.stop>
          <ToggleSwitch
            :model-value="m.enabled"
            @update:model-value="store.toggleEnabled(m)"
          />
        </span>
        <span class="col-inspection">
          <span v-if="m.isInspection === 1" class="inspection-tag">{{ inspectionLabel(m) }}</span>
          <span v-else class="inspection-dash">—</span>
        </span>
        <span class="col-actions" @click.stop>
          <button class="ghost-btn" :aria-label="String(t('mission.list.action.edit'))" @click="goToEdit(m)">
            <Icon icon="mdi:pencil-outline" width="18" />
          </button>
          <button class="ghost-btn danger" :aria-label="String(t('mission.list.action.delete'))" @click="handleDelete(m)">
            <Icon icon="mdi:delete-outline" width="18" />
          </button>
        </span>
      </div>
    </div>

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
.list-page { contain: layout style; }

/* Toolbar */
.list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.search-box {
  position: relative;
  width: 280px;
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
  color: #fff;
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
  height: 32px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
  padding: 0 8px;
}

.list-row {
  display: flex;
  align-items: center;
  height: 60px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border-subtle);
  cursor: pointer;
  transition: background 100ms;
}

.list-row:hover { background: rgba(0, 0, 0, 0.03); }
html.dark .list-row:hover { background: rgba(255, 255, 255, 0.03); }

.col-thumb { width: 56px; flex-shrink: 0; display: flex; align-items: center; }
.col-name { flex: 1; font-size: 16px; font-weight: 500; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 16px; }
.col-enabled { width: 72px; flex-shrink: 0; display: flex; justify-content: center; }
.col-inspection { width: 72px; flex-shrink: 0; display: flex; justify-content: center; }
.col-actions { width: 88px; flex-shrink: 0; display: flex; gap: 8px; justify-content: flex-end; }

.thumb-placeholder { opacity: 0.2; color: var(--color-text); }
.inspection-tag { font-size: 12px; font-weight: 500; color: var(--color-primary); background: rgba(196, 151, 0, 0.08); padding: 2px 8px; border-radius: 4px; }
.inspection-dash { color: var(--color-text-secondary); font-size: 14px; }

.ghost-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.ghost-btn:hover { background: var(--color-border-subtle); color: var(--color-primary); }
.ghost-btn.danger:hover { color: var(--color-status-error); }
.ghost-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

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
.skeleton-row { display: flex; align-items: center; height: 60px; padding: 6px 8px; gap: 12px; border-bottom: 1px solid var(--color-border-subtle); }
.sk-thumb { width: 48px; height: 48px; border-radius: 4px; background: var(--color-border); flex-shrink: 0; }
.sk-name { width: 120px; height: 16px; border-radius: 4px; background: var(--color-border); flex: 1; }
.sk-toggle { width: 32px; height: 20px; border-radius: 10px; background: var(--color-border); flex-shrink: 0; }
.sk-tag { width: 48px; height: 20px; border-radius: 4px; background: var(--color-border); flex-shrink: 0; }
.sk-action { width: 32px; height: 32px; border-radius: 50%; background: var(--color-border); flex-shrink: 0; }
</style>
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx vue-tsc --noEmit --project tsconfig.app.json 2>&1`
Expected: No new errors.

---

### Task 15: Router — Wire mission routes, remove old placeholder

**Files:**
- Modify: `src/router/index.ts`
- Delete: `src/modules/MissionPage.vue`

- [ ] **Step 1: Update router to use MissionListPage and add sub-routes**

In `src/router/index.ts`, change the mission entry:

```ts
// Before:
{ path: 'mission', name: 'Mission', icon: 'mdi:clipboard-text-outline', page: () => import('@/modules/MissionPage.vue') },

// After — replace with:
{ path: 'mission', name: 'Mission', icon: 'mdi:clipboard-text-outline', page: () => import('@/modules/mission/MissionListPage.vue') },
{ path: 'mission/new', name: 'MissionNew', icon: 'mdi:clipboard-text-outline', page: () => import('@/modules/mission/MissionEditPage.vue') },
{ path: 'mission/:id/edit', name: 'MissionEdit', icon: 'mdi:clipboard-text-outline', page: () => import('@/modules/mission/MissionEditPage.vue') },
```

- [ ] **Step 2: Remove old MissionPage.vue**

Run: `rm src/modules/MissionPage.vue`

- [ ] **Step 3: Verify TypeScript**

Run: `npx vue-tsc --noEmit --project tsconfig.app.json 2>&1`
Expected: No new errors.

---

### Task 16: Verification — Dev server + typecheck

- [ ] **Step 1: Typecheck**

Run: `npx vue-tsc --noEmit --project tsconfig.app.json 2>&1`
Expected: No errors (exit code 0).

- [ ] **Step 2: Build check**

Run: `npm run build 2>&1`
Expected: Build succeeds (exit code 0).

- [ ] **Step 3: Start dev server and click through**

Run: `npm run dev`
Expected: Server starts, navigate to `http://localhost:5173/#/mission` to verify:
- Empty state shows with 64px icon and create button
- Create button opens `/mission/new`
- Form renders 3 groups: basic, execution, inspection
- Toggle "点检任务" to see radio group expand
- Save button shows loading state
- Return button shows unsaved dialog if form is dirty
- List page search box with magnify icon renders

---

## Dependency Graph

```
Task 1 (i18n) ─────────────────────────────────────────────┐
Task 2 (types) ────────────────────────────────────────────┤
Task 3 (request.ts) ──► Task 4 (mission API) ──────────────┤
                          │                                │
                          ▼                                │
Task 5 (toast store) ──► Task 8 (ToastNotification) ──────┤
Task 6 (confirm store) ► Task 9 (ConfirmDialog) ──────────┤
                                                           │
Task 7 (ToggleSwitch) ─────────────────────────────────────┤
                                                           │
                          ▼                                ▼
                    Task 10 (App.vue) ─────────────────────┤
                    Task 11 (mission store) ───────────────┤
                                                           │
                          ▼                                │
                    Task 12 (MissionBasicForm) ────────────┤
                                                           │
                          ▼                                │
                    Task 13 (MissionEditPage) ─────────────┤
                                                           │
                          ▼                                │
                    Task 14 (MissionListPage) ─────────────┤
                                                           │
                          ▼                                ▼
                    Task 15 (Router + cleanup) ─────────────
                                                           │
                          ▼                                │
                    Task 16 (Verification)
```

- T1 (i18n) and T2 (types) can run in parallel
- T5 (toast store) and T6 (confirm store) can run in parallel
- T7 (ToggleSwitch) is independent; can run in parallel with T3-T6
- T8 (ToastNotification) depends on T5
- T9 (ConfirmDialog) depends on T6
- T10 (App.vue) depends on T8 + T9
- T11 (mission store) depends on T4
- T12 (MissionBasicForm) depends on T7 + T11
- T13 (MissionEditPage) depends on T12 + T8 + T9
- T14 (MissionListPage) depends on T7 + T11 + T9
- T15 (Router) depends on T13 + T14
