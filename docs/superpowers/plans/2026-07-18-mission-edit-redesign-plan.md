# Mission Edit Page UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign MissionEditPage and MissionBasicForm with a modern SaaS card-based layout, replacing hand-rolled HTML sections with PrimeVue Card components while preserving all existing functionality.

**Architecture:** MissionBasicForm gets Card-wrapped form groups with colored dot headers. Inspection mode opens in a Dialog instead of inline expand. MissionEditPage gets a Tag status badge in the top bar, PrimeVue Skeleton loading states, transparent top bar with auto-margin push to bottom bar, and border-top divider for the bottom action bar. No props/events interfaces change.

**Tech Stack:** Vue 3 SFC, PrimeVue v4 styled-mode (Card, Dialog, Tag, Skeleton, ToggleSwitch, InputText, InputNumber, RadioButton, Checkbox, Button, Breadcrumb, ScrollPanel), vue-i18n

## Global Constraints

- PrimeVue v4 styled mode — all UI through PrimeVue components
- Style priority: `pt` props > Design Tokens > scoped CSS
- Card visual styles live in scoped CSS (not pt), except when pt is the only hook available
- Props/events of MissionBasicForm must NOT change (`modelValue` / `update:modelValue` / `isEdit`)
- All user-facing text through vue-i18n `t()` function
- No new npm dependencies
- Router guards (`handleBack` / `onBeforeRouteLeave`) unchanged
- Existing `snapshot` dirty-check logic in MissionEditPage untouched

## Design decisions captured during grilling

| # | Decision | Reason |
|---|----------|--------|
| 1 | Card styles in scoped CSS, not `pt:root:style` | Single source of truth, no `!important` battles |
| 2 | Inspection mode → Dialog with temp state | No layout jump, native PrimeVue transition, enough space for mission list |
| 3 | Cancel in Dialog → confirm dialog before discarding | Same pattern as page-leave dirty-check |
| 4 | Sidebar metadata labels i18n'd | Consistency — all visible text already goes through `t()` |
| 5 | Split horizontal shadows `0 1px 3px → 0 1px` + bottom border card separator | Single-horizon shadow avoids dark-mode invisibility; border fills the contrast gap at the bottom edge only |
| 6 | Top bar transparent, bottom bar has `border-top` | Top bar elements are heavy enough alone; bottom bar needs an anchor to the content |

---

### Task 1: Add i18n keys

**Files:**
- Modify: `src/locales/zh-CN.json`
- Modify: `src/locales/en.json`

**Interfaces:**
- Produces: `mission.edit.statusDraft`, `mission.edit.metaCreateTime`, `mission.edit.metaModifyTime`, `mission.edit.metaEmpty`, `mission.edit.inspectionDialogTitle`, `mission.edit.inspectionDialogOk`, `mission.edit.inspectionDiscardTitle`, `mission.edit.inspectionDiscardMessage`, `mission.edit.inspectionDiscardStay`, `mission.edit.inspectionDiscardLeave` — used by MissionEditPage (Task 3) and MissionBasicForm (Task 2)

- [ ] **Step 1: Add Chinese keys**

In `src/locales/zh-CN.json`, after `"editTitle": "编辑任务 - {name}",` (line 79), add:

```json
"statusDraft": "草稿",
```

After `"meta": "任务信息",` (line 90), add:

```json
"metaCreateTime": "创建时间",
"metaModifyTime": "修改时间",
"metaEmpty": "暂无记录",
```

After `"loadFailed": "加载任务失败"` (line 98), add:

```json
"inspectionDialogTitle": "点检配置",
"inspectionDialogOk": "确定",
"inspectionDiscardTitle": "放弃更改？",
"inspectionDiscardMessage": "关闭将丢弃对点检配置的更改，确定放弃？",
"inspectionDiscardLeave": "放弃",
"inspectionDiscardStay": "继续配置"
```

- [ ] **Step 2: Add English keys**

In `src/locales/en.json`, after `"editTitle": "Edit Mission - {name}",` (line 79), add:

```json
"statusDraft": "Draft",
```

After `"meta": "Info",` (line 90), add:

```json
"metaCreateTime": "Created",
"metaModifyTime": "Modified",
"metaEmpty": "No records",
```

After `"loadFailed": "Failed to load mission"` (line 98), add:

```json
"inspectionDialogTitle": "Inspection Config",
"inspectionDialogOk": "OK",
"inspectionDiscardTitle": "Discard Changes?",
"inspectionDiscardMessage": "Changes to inspection config will be lost. Discard?",
"inspectionDiscardLeave": "Discard",
"inspectionDiscardStay": "Continue"
```

- [ ] **Step 3: Verify JSON validity**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/locales/zh-CN.json','utf8')); console.log('zh-CN OK')" && node -e "JSON.parse(require('fs').readFileSync('src/locales/en.json','utf8')); console.log('en OK')"`
Expected: `zh-CN OK` then `en OK`

- [ ] **Step 4: Commit**

```bash
git add src/locales/zh-CN.json src/locales/en.json
git commit -m "feat(i18n): add draft tag, meta labels, inspection dialog keys"
```

---

### Task 2: Redesign MissionBasicForm with Cards + Inspection Dialog

**Files:**
- Modify: `src/modules/mission/components/MissionBasicForm.vue`

**Interfaces:**
- Consumes: `mission.edit.groups.*`, `mission.edit.fields.*`, `mission.edit.inspectionDialogTitle`, `mission.edit.inspectionDialogOk`, `mission.edit.inspectionDiscardTitle`, `mission.edit.inspectionDiscardMessage`, `mission.edit.inspectionDiscardStay`, `mission.edit.inspectionDiscardLeave` i18n keys
- Produces: unchanged — `modelValue` prop, `update:modelValue` emit, `isEdit` prop

- [ ] **Step 1: Add new imports**

In `<script setup>`, add alongside existing imports:

```typescript
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import { useConfirm } from 'primevue/useconfirm'
```

- [ ] **Step 2: Add Dialog temp state and handlers**

In `<script setup>`, after the existing `toggleBindMission` function (line 98), add:

```typescript
const confirm = useConfirm()
const inspectionDialogVisible = ref(false)

// Temporary state for inspection config inside Dialog
const tempInspectionScope = ref(1)
const tempBoundMissionIds = ref<number[]>([])

watch(() => props.modelValue.isInspection, (val) => {
  if (val) {
    tempInspectionScope.value = props.modelValue.inspectionScope || 1
    tempBoundMissionIds.value = [...boundMissionIds.value]
    inspectionDialogVisible.value = true
  } else {
    inspectionDialogVisible.value = false
    tempBoundMissionIds.value = []
  }
})

function onInspectionDialogOk() {
  update('inspectionScope', tempInspectionScope.value)
  // boundMissionIds reactive will sync when form saves; keep in component local state
  inspectionDialogVisible.value = false
}

function onInspectionDialogCancel() {
  if (isDialogDirty()) {
    confirm.require({
      header: t('mission.edit.inspectionDiscardTitle'),
      message: t('mission.edit.inspectionDiscardMessage'),
      rejectLabel: t('mission.edit.inspectionDiscardStay'),
      acceptLabel: t('mission.edit.inspectionDiscardLeave'),
      accept: () => {
        update('isInspection', false)
      },
    })
  } else {
    update('isInspection', false)
  }
}

function isDialogDirty(): boolean {
  return (
    tempInspectionScope.value !== props.modelValue.inspectionScope ||
    JSON.stringify([...tempBoundMissionIds.value].sort()) !== JSON.stringify([...boundMissionIds.value].sort())
  )
}

function toggleBindMissionInDialog(id: number) {
  const idx = tempBoundMissionIds.value.indexOf(id)
  if (idx === -1) {
    tempBoundMissionIds.value.push(id)
  } else {
    tempBoundMissionIds.value.splice(idx, 1)
  }
}
```

Replace the existing `toggleBindMission` function body — it now delegates (used by the Dialog temp state, not directly in the card):

```typescript
function toggleBindMission(id: number) {
  toggleBindMissionInDialog(id)
}
```

- [ ] **Step 3: Replace template — basic group**

Replace the existing `<div class="form-group">` for basic properties (lines 104-128) with:

```vue
<Card class="form-card">
  <template #title>
    <div class="card-header">
      <span class="card-dot card-dot--primary" />
      <span>{{ t('mission.edit.groups.basic') }}</span>
    </div>
  </template>
  <template #content>
    <div class="form-row form-row-name">
      <label class="form-label">{{ t('mission.edit.fields.name') }}</label>
      <div class="form-field">
        <InputText
          :model-value="modelValue.name"
          :placeholder="String(t('mission.edit.fields.name'))"
          :class="{ 'p-invalid': nameError }"
          fluid
          @update:model-value="update('name', ($event as string) ?? '')"
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
        @update:model-value="update('enabled', $event as boolean)"
      />
    </div>
  </template>
</Card>
```

- [ ] **Step 4: Replace template — execution group**

Replace lines 131-163 with:

```vue
<Card class="form-card">
  <template #title>
    <div class="card-header">
      <span class="card-dot card-dot--purple" />
      <span>{{ t('mission.edit.groups.execution') }}</span>
    </div>
  </template>
  <template #content>
    <div class="form-row">
      <label class="form-label">{{ t('mission.edit.fields.maxNgCount') }}</label>
      <InputNumber
        :model-value="modelValue.maxNgCount ?? undefined"
        :min="0"
        :max="999"
        @update:model-value="update('maxNgCount', $event ?? null)"
      />
    </div>
    <div class="form-row">
      <label class="form-label">{{ t('mission.edit.fields.skipScrew') }}</label>
      <ToggleSwitch
        :model-value="modelValue.skipScrew"
        @update:model-value="update('skipScrew', $event as boolean)"
      />
    </div>
    <div class="form-row">
      <label class="form-label">{{ t('mission.edit.fields.passwordAfterNg') }}</label>
      <ToggleSwitch
        :model-value="modelValue.passwordRequiredAfterNg"
        @update:model-value="update('passwordRequiredAfterNg', $event as boolean)"
      />
    </div>
    <div class="form-row">
      <label class="form-label">{{ t('mission.edit.fields.multiDevice') }}</label>
      <ToggleSwitch
        :model-value="modelValue.multiDeviceIndependent"
        @update:model-value="update('multiDeviceIndependent', $event as boolean)"
      />
    </div>
  </template>
</Card>
```

- [ ] **Step 5: Replace template — inspection group (switch only) + Dialog**

Replace lines 165-220 with:

```vue
<Card class="form-card">
  <template #title>
    <div class="card-header">
      <span class="card-dot card-dot--green" />
      <span>{{ t('mission.edit.groups.inspection') }}</span>
    </div>
  </template>
  <template #content>
    <div class="form-row">
      <label class="form-label">{{ t('mission.edit.fields.isInspection') }}</label>
      <ToggleSwitch
        :model-value="modelValue.isInspection"
        @update:model-value="update('isInspection', $event as boolean)"
      />
    </div>
  </template>
</Card>

<Dialog
  v-model:visible="inspectionDialogVisible"
  modal
  :header="t('mission.edit.inspectionDialogTitle')"
  :style="{ width: '480px' }"
>
  <template #footer>
    <Button
      :label="String(t('mission.edit.cancel'))"
      severity="secondary" text
      @click="onInspectionDialogCancel"
    />
    <Button
      :label="String(t('mission.edit.inspectionDialogOk'))"
      @click="onInspectionDialogOk"
    />
  </template>

  <div class="form-row radio-row">
    <label class="form-label">{{ t('mission.edit.fields.inspectionScope') }}</label>
    <div class="radio-group">
      <label class="radio-item">
        <RadioButton
          v-model="tempInspectionScope"
          name="inspectionScope"
          :value="1"
        />
        <span>{{ t('mission.edit.fields.inspectionScopeAll') }}</span>
      </label>
      <label class="radio-item">
        <RadioButton
          v-model="tempInspectionScope"
          name="inspectionScope"
          :value="2"
        />
        <span>{{ t('mission.edit.fields.inspectionScopeChosen') }}</span>
      </label>
    </div>
  </div>

  <div
    v-if="tempInspectionScope === 2"
    class="mission-picker"
  >
    <p class="picker-hint">{{ t('mission.edit.fields.inspectionSelectMissions') }}</p>
    <div v-if="availableMissions.length === 0" class="picker-empty">
      暂无可用拧紧任务
    </div>
    <label
      v-for="m in availableMissions"
      :key="m.id"
      class="picker-item"
    >
      <Checkbox
        :model-value="tempBoundMissionIds.includes(m.id!)"
        binary
        @update:model-value="toggleBindMissionInDialog(m.id!)"
      />
      <span>{{ m.name }}</span>
    </label>
  </div>
</Dialog>
```

- [ ] **Step 6: Keep `watch(onInspection)` for loading available missions**

The existing watcher (lines 75-89) should be updated to watch `tempInspectionScope` instead of `props.modelValue.inspectionScope`, since the scope is now set inside the Dialog:

```typescript
watch(
  tempInspectionScope,
  async (val) => {
    if (val === 2 && availableMissions.value.length === 0) {
      try {
        const data = await fetchMissions({ page: 1, size: 500 })
        availableMissions.value = data.records.filter(
          (m) => !m.isInspection && m.id !== props.modelValue.id,
        )
      } catch {
        /* ignore */
      }
    }
  },
)
```

Remove the old `watch(() => props.modelValue.inspectionScope, ...)` and `watch(() => props.modelValue.isInspection, ...)` — handled by the new watchers.

- [ ] **Step 7: Keep other script logic unchanged**

The existing `update`, `validateName`, `onNameBlur`, `toggleBindMission`, `onUnmounted`, and `watch(onName)` functions remain as-is.

- [ ] **Step 8: Replace `<style scoped>` block**

Replace entire existing `<style scoped>` (lines 224-360) with:

```css
<style scoped>
/* Card appearance — uses scoped CSS, not pt:root:style, per design decision #1 */
.form-card {
  border-radius: 12px;
  box-shadow: 0 1px var(--p-surface-200);
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
.card-dot--primary { background: var(--p-primary-400); }
.card-dot--purple  { background: var(--p-purple-400); }
.card-dot--green   { background: var(--p-green-400); }

.form-row {
  display: flex;
  align-items: center;
  min-height: 40px;
  gap: 16px;
}
.form-row + .form-row {
  margin-top: 8px;
}

.form-row-name {
  min-height: auto;
  align-items: flex-start;
}
.form-row-name .form-label {
  padding-top: 10px;
}

.form-label {
  width: 110px;
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
  text-align: right;
  color: var(--p-surface-600);
}

.form-field {
  flex: 1;
  max-width: 480px;
  position: relative;
}

.field-error {
  font-size: 13px;
  color: var(--p-red-500);
  margin: 4px 0 0 0;
}

.field-spinner {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border: 2px solid var(--p-surface-300);
  border-top-color: var(--p-primary-500);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: translateY(-50%) rotate(360deg); }
}

.radio-row {
  min-height: auto;
  align-items: flex-start;
  padding-top: 6px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  font-size: 14px;
  cursor: pointer;
}

.mission-picker {
  margin-top: 12px;
  margin-left: 126px;
  padding: 12px;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.picker-hint {
  font-size: 12px;
  color: var(--p-surface-500);
  margin: 0 0 8px 0;
}

.picker-empty {
  font-size: 13px;
  color: var(--p-surface-500);
  padding: 8px 0;
}

.picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
  padding: 0 4px;
}
.picker-item:hover {
  background: var(--p-surface-100);
}
</style>
```

- [ ] **Step 9: Verify type-check and build**

Run: `npx vue-tsc -b --noEmit 2>&1 | tail -5`
Expected: No errors (clean exit)

- [ ] **Step 10: Commit**

```bash
git add src/modules/mission/components/MissionBasicForm.vue
git commit -m "feat(mission): redesign form as Cards with inspection Dialog"
```

---

### Task 3: Redesign MissionEditPage shell

**Files:**
- Modify: `src/modules/mission/MissionEditPage.vue`

**Interfaces:**
- Consumes: `mission.edit.statusDraft`, `mission.edit.metaCreateTime`, `mission.edit.metaModifyTime`, `mission.edit.metaEmpty` i18n keys (from Task 1), redesigned MissionBasicForm component (from Task 2)
- Produces: unchanged — page route and behavior identical

- [ ] **Step 1: Add Tag and Skeleton imports**

In `<script setup>`, add after existing imports:

```typescript
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
```

- [ ] **Step 2: Update top bar — transparent, add draft Tag**

Replace the `<nav class="edit-nav">` block (lines 147-154) with:

```vue
<nav class="edit-nav">
  <Button
    icon="pi pi-arrow-left" severity="secondary" text rounded
    :aria-label="String(t('mission.edit.back'))"
    @click="handleBack"
  />
  <h1 class="edit-title">{{ title }}</h1>
  <Tag v-if="!isEdit" severity="warn" :value="t('mission.edit.statusDraft')" />
</nav>
```

- [ ] **Step 3: Replace skeleton loading with PrimeVue Skeleton**

Replace the `<div v-if="loading" class="skeleton-container">` block (lines 157-173) with:

```vue
<div v-if="loading" class="skeleton-layout">
  <div class="skeleton-main">
    <Skeleton height="140px" border-radius="12px" style="margin-bottom:16px" />
    <Skeleton height="210px" border-radius="12px" style="margin-bottom:16px" />
    <Skeleton height="120px" border-radius="12px" />
  </div>
  <div v-if="isEdit" class="skeleton-sidebar">
    <Skeleton height="100px" border-radius="12px" />
  </div>
</div>
```

- [ ] **Step 4: Update sidebar metadata — i18n + Card styling**

Replace the sidebar Card block (lines 180-199) with:

```vue
<aside v-if="isEdit" class="edit-sidebar">
  <Card class="meta-card">
    <template #title>{{ t('mission.edit.meta') }}</template>
    <template #content>
      <dl class="side-meta">
        <template v-if="form.createTime">
          <dt>{{ t('mission.edit.metaCreateTime') }}</dt>
          <dd>{{ form.createTime }}</dd>
        </template>
        <template v-if="form.modifyTime">
          <dt>{{ t('mission.edit.metaModifyTime') }}</dt>
          <dd>{{ form.modifyTime }}</dd>
        </template>
        <template v-if="!form.createTime && !form.modifyTime">
          <dd class="side-empty">{{ t('mission.edit.metaEmpty') }}</dd>
        </template>
      </dl>
    </template>
  </Card>
</aside>
```

- [ ] **Step 5: Update `<style scoped>` block**

Replace entire existing `<style scoped>` (lines 219-309) with:

```css
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

/* Top bar: transparent, pushes content down, no background/border */
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
}

.edit-layout {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

.edit-main {
  flex: 1;
  min-width: 0;
}

/* Sidebar */
.edit-sidebar {
  width: 200px;
  flex-shrink: 0;
  position: sticky;
  top: 16px;
}

.meta-card {
  border-radius: 12px;
  box-shadow: 0 1px var(--p-surface-200);
}

.side-meta { margin: 0; }
.side-meta dt {
  font-size: 12px;
  color: var(--p-surface-500);
  margin: 12px 0 2px 0;
}
.side-meta dt:first-child { margin-top: 0; }
.side-meta dd { font-size: 14px; font-weight: 500; margin: 0; }
.side-empty { font-size: 13px; color: var(--p-surface-500); }

/* Bottom bar: border-top divider, no background */
.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding: 16px 0 0 0;
  border-top: 1px solid var(--p-surface-200);
  flex-shrink: 0;
}

/* Skeleton loading */
.skeleton-layout {
  display: flex;
  gap: 32px;
}
.skeleton-main {
  flex: 1;
  min-width: 0;
}
.skeleton-sidebar {
  width: 200px;
  flex-shrink: 0;
}
</style>
```

- [ ] **Step 6: Verify type-check and build**

Run: `npx vue-tsc -b --noEmit 2>&1 | tail -5`
Expected: No errors (clean exit)

- [ ] **Step 7: Commit**

```bash
git add src/modules/mission/MissionEditPage.vue
git commit -m "feat(mission): redesign page shell with draft Tag, Skeleton, transparent top bar, divider bottom bar"
```

---

### Task 4: Visual verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Wait for the Vite URL to appear.

- [ ] **Step 2: Check create mode**

Navigate to `/mission/new` and verify:
- Breadcrumb renders correctly
- Top bar: `← 新建任务 [草稿]` with warn-colored Tag
- Three form Cards with colored dots (blue/purple/green)
- No sidebar visible
- Toggle inspection ON → Dialog opens with radio buttons + mission picker
- Toggle inspection OFF → if Dialog open, confirm dialog appears

- [ ] **Step 3: Check edit mode**

Navigate to `/mission/:id/edit` and verify:
- Top bar: `← 编辑任务 - [name]` — no Tag
- Cards with pre-filled data
- Sidebar Card with i18n'd createTime/modifyTime
- Skeleton appears briefly during data loading

- [ ] **Step 4: Dialog interaction smoke test**

- Toggle inspection ON → Dialog auto-opens
- Temp state works: switch scope → pick missions → Cancel → confirms discard → switches OFF
- Temp state OK: switch scope → OK → commits to form
- Esc key and close button → same cancel flow
- Form snapshot dirty-check still works correctly with inspection changes

- [ ] **Step 5: Dark mode**

Toggle to dark theme and verify:
- Card shadows use `--p-surface-200` (auto-adapts)
- Bottom bar divider visible
- Labels and text readable

- [ ] **Step 6: General smoke test**

- Type name → spinner + error messages work
- Toggle switches all toggle
- Save → success toast → redirects
- Cancel when dirty → confirm dialog
- `onBeforeRouteLeave` still fires

- [ ] **Step 7: Commit any fixes if needed**
