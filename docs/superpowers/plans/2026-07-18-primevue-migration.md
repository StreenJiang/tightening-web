# PrimeVue 全量迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 PrimeVue v4 (Aura styled mode) 替换所有手写组件，删除 confirm/toast store，数据模型 0/1 → boolean。

**Architecture:** install PrimeVue → create `definePreset` → rewrite layout components → rewrite pages → delete old files → verify.

**Tech Stack:** Vue 3.5, PrimeVue v4, Aura, primeicons, Pinia, vue-router, vue-i18n

**Spec:** `docs/superpowers/specs/2026-07-18-primevue-migration-design.md`

## Global Constraints

- PrimeVue v4 Styled Mode + Aura + `definePreset` 覆盖品牌色
- 删 @iconify/vue + @iconify-json/mdi，改用 primeicons
- `ProductMission` 5 个 toggle 字段 `number` → `boolean`，API 层 `boolean ↔ 0/1`
- 删 `stores/confirm.ts`、`stores/toast.ts`、`shared/composables/usePointerPress.ts`
- `ripple: false`，`darkModeSelector: 'html.dark'`

---

### Task 1: 安装依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装**

```bash
npm i primevue @primevue/themes primeicons
```

- [ ] **Step 2: 卸载**

```bash
npm uninstall @iconify/vue @iconify-json/mdi
```

---

### Task 2: 创建主题预设 + 配置 main.ts

**Files:**
- Create: `src/theme/preset.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Produces: `tighteningPreset`

- [ ] **Step 1: 创建 `src/theme/preset.ts`**

```ts
import Aura from '@primevue/themes/aura'
import { definePreset } from '@primevue/themes'

export const tighteningPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fef9e7', 100: '#fef0c7', 200: '#fde68a',
      300: '#fcd34d', 400: '#fbbf24',
      500: '#c49700', 600: '#a87e00',
      700: '#8b6500', 800: '#6d4f00', 900: '#543b00', 950: '#3d2a00',
    },
    colorScheme: {
      light: {
        surface: '#fcfcfb', surfaceNav: '#f3f2ef',
        surfaceHeader: '#fafafa', surfaceFooter: '#f4f4f2',
        background: '#fafafa', border: '#e4e4e7', textMuted: '#71717a',
      },
      dark: {
        surface: '#27272a', surfaceNav: '#1c1c1f',
        surfaceHeader: '#18181b', surfaceFooter: '#1c1c1f',
        background: '#18181b', border: '#3f3f46', textMuted: '#a1a1aa',
      },
    },
  },
})
```

- [ ] **Step 2: 更新 `src/main.ts`**

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import { tighteningPreset } from './theme/preset'
import i18n from './i18n'
import router from './router'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.use(router)
app.use(PrimeVue, {
  theme: { preset: tighteningPreset, options: { darkModeSelector: 'html.dark' } },
  ripple: false,
})
app.use(ToastService)
app.use(ConfirmationService)
app.directive('tooltip', Tooltip)
app.mount('#app')
```

---

### Task 3: 精简 style.css

**Files:**
- Modify: `src/style.css`

删除所有颜色/状态/排版 CSS 变量，只保留布局尺寸、字体、reset 样式。

- [ ] **Step 1: 替换 style.css 内容**

```css
:root {
  --sidebar-expanded: 220px;
  --sidebar-collapsed: 60px;
  --topbar-height: 56px;
  --footer-height: 52px;
  --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: ui-monospace, 'Cascadia Code', Consolas, monospace;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  min-height: 100vh;
  overflow: hidden;
}

a { color: inherit; text-decoration: none; }
ul, ol { list-style: none; }

:focus-visible {
  outline: 2px solid var(--p-primary-500);
  outline-offset: 2px;
}
```

---

### Task 4: 数据模型 — number → boolean + API 序列化

**Files:**
- Modify: `src/shared/types/mission.ts`
- Modify: `src/shared/api/mission.ts`
- Modify: `src/stores/mission.ts`

- [ ] **Step 1: 更新 `src/shared/types/mission.ts`**

```ts
export interface ProductMission {
  id?: number
  name: string
  maxNgCount: number | null
  passwordRequiredAfterNg: boolean
  enabled: boolean
  multiDeviceIndependent: boolean
  skipScrew: boolean
  isInspection: boolean
  inspectionScope: number
  createTime?: string
  modifyTime?: string
}

export interface MissionQuery {
  page: number
  size: number
  name?: string
}
```

- [ ] **Step 2: 更新 `src/shared/api/mission.ts`**

在文件顶部添加转换函数，改造 fetchMissions/fetchMission/createMission/updateMission：

```ts
import { get, post, put, del } from './request'
import type { ProductMission, MissionQuery } from '@/shared/types/mission'

const BASE = '/api/missions'

function toApi(data: ProductMission): Record<string, unknown> {
  return {
    ...data,
    enabled: data.enabled ? 1 : 0,
    skipScrew: data.skipScrew ? 1 : 0,
    passwordRequiredAfterNg: data.passwordRequiredAfterNg ? 1 : 0,
    multiDeviceIndependent: data.multiDeviceIndependent ? 1 : 0,
    isInspection: data.isInspection ? 1 : 0,
  }
}

function fromApi(raw: Record<string, unknown>): ProductMission {
  return {
    ...raw,
    enabled: raw.enabled === 1,
    skipScrew: raw.skipScrew === 1,
    passwordRequiredAfterNg: raw.passwordRequiredAfterNg === 1,
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

export function createMission(data: ProductMission) {
  return post<string>(BASE, toApi(data))
}

export function updateMission(id: number, data: ProductMission) {
  return put<string>(`${BASE}/${id}`, toApi(data))
}

export function deleteMission(id: number) {
  return del(`${BASE}/${id}`)
}
```

- [ ] **Step 3: 更新 `src/stores/mission.ts`**

toggleEnabled 适配 boolean：

```ts
async function toggleEnabled(mission: ProductMission) {
  const previous = mission.enabled
  mission.enabled = !mission.enabled
  try {
    await updateMission(mission.id!, { ...mission })
  } catch {
    mission.enabled = previous
    useToastStore().show('mission.list.toggleFailed', 'error')
  }
}
```

---

### Task 5: App.vue — 切换 Toast/ConfirmDialog 为 PrimeVue

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 替换 App.vue**

```vue
<script setup lang="ts">
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
</script>

<template>
  <router-view />
  <Toast position="top-center" />
  <ConfirmDialog />
</template>
```

---

### Task 6: 替换 PlaceholderPage（×5 页面）

**Files:**
- Modify: `src/modules/WorkplacePage.vue`
- Modify: `src/modules/WorkstationPage.vue`
- Modify: `src/modules/AnalysisPage.vue`
- Modify: `src/modules/DevicePage.vue`
- Modify: `src/modules/IntegrationPage.vue`

五个文件结构相同，`PlaceholderCard` → `Message`。以 WorkplacePage 为例：

- [ ] **Step 1: 替换每个页面**

```vue
<script setup lang="ts">
import Message from 'primevue/message'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <div class="page-wrapper">
    <Message severity="info" :closable="false">
      {{ t('menu.workplace') }} — {{ t('common.underConstruction') }}
    </Message>
  </div>
</template>

<style scoped>
.page-wrapper { height: 100%; display: flex; align-items: center; justify-content: center; }
</style>
```

其他 4 个页面替换 `t('menu.workplace')` 为对应 titleKey。

---

### Task 7: 重写 TopBar

**Files:**
- Modify: `src/layout/TopBar.vue`

用 Toolbar + Button + Popover + Dialog 全量重写，内联 ConnectionIndicator/ServerConfigModal/ConnectionStatusModal 逻辑。

- [ ] **Step 1: 完整脚本部分**

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSidebarStore } from '@/stores/sidebar'
import { useThemeStore } from '@/stores/theme'
import { useServerConnectionStore } from '@/stores/serverConnection'
import type { ThemeMode } from '@/stores/theme'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import Popover from 'primevue/popover'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Tag from 'primevue/tag'

const { t, locale } = useI18n()
const sidebar = useSidebarStore()
const theme = useThemeStore()
const conn = useServerConnectionStore()

const configModalVisible = ref(false)
const statusModalVisible = ref(false)
const themeOp = ref<InstanceType<typeof Popover> | null>(null)

function toggleLocale() {
  locale.value = locale.value === 'zh-CN' ? 'en' : 'zh-CN'
}
const localeLabel = computed(() => locale.value === 'zh-CN' ? 'EN' : '中')

const themeIcon = computed(() => {
  const icons: Record<ThemeMode, string> = {
    light: 'pi pi-sun', dark: 'pi pi-moon', system: 'pi pi-palette',
  }
  return icons[theme.mode]
})

function selectTheme(m: ThemeMode) {
  theme.setMode(m)
  themeOp.value?.hide()
}

const themeOptions: { mode: ThemeMode; key: string; icon: string }[] = [
  { mode: 'light', key: 'common.themeLight', icon: 'pi pi-sun' },
  { mode: 'dark', key: 'common.themeDark', icon: 'pi pi-moon' },
  { mode: 'system', key: 'common.themeSystem', icon: 'pi pi-palette' },
]

const connSeverity = computed(() => {
  const map: Record<string, 'success' | 'danger' | 'warn' | 'info'> = {
    connected: 'success', disconnected: 'danger', unconfigured: 'warn', loading: 'info',
  }
  return map[conn.status] ?? 'info'
})

const connLabel = computed(() => {
  const map: Record<string, string> = {
    connected: 'server.connected', disconnected: 'server.disconnected',
    unconfigured: 'server.unconfigured', loading: 'server.connecting',
  }
  return t(map[conn.status] ?? 'server.unconfigured')
})

function onConnClick() {
  if (conn.status === 'unconfigured') configModalVisible.value = true
  else if (conn.status === 'disconnected') statusModalVisible.value = true
}

// ---- ServerConfig 逻辑 ----
const address = ref('')
const testing = ref(false)
const testResult = ref<'idle' | 'success' | 'fail'>('idle')
const testError = ref('')
const saving = ref(false)
const saveError = ref('')

function resetConfig() {
  address.value = ''; testing.value = false; testResult.value = 'idle'
  testError.value = ''; saving.value = false; saveError.value = ''
}

const canSave = computed(() => testResult.value === 'success' && !saving.value)

async function handleTest() {
  if (!address.value.trim()) return
  testing.value = true; testResult.value = 'idle'; testError.value = ''
  try {
    const r = await conn.testConnection(address.value.trim())
    if (r.success) testResult.value = 'success'
    else { testResult.value = 'fail'; testError.value = r.errorReason }
  } catch { testResult.value = 'fail' }
  finally { testing.value = false }
}

async function handleSave() {
  if (!canSave) return
  saving.value = true
  try { await conn.saveConfig(address.value.trim()); configModalVisible.value = false }
  catch { saveError.value = t('server.saveFailed') }
  finally { saving.value = false }
}

onMounted(() => conn.fetchStatus())
</script>
```

- [ ] **Step 2: 模板部分**

```vue
<template>
  <Toolbar class="topbar">
    <template #start>
      <Button icon="pi pi-bars" severity="secondary" text rounded
        @click="sidebar.toggle()" />
      <span class="topbar-title">{{ t('app.title') }}</span>
      <Button severity="secondary" text @click="onConnClick">
        <template #icon>
          <Tag :severity="connSeverity" value="" rounded
            :pt="{ root: { style: { width:'10px', height:'10px', padding:'0' } } }" />
        </template>
        <span class="conn-label">{{ connLabel }}</span>
      </Button>
    </template>
    <template #end>
      <Button :icon="themeIcon" severity="secondary" text rounded
        @click="(e: Event) => themeOp?.toggle(e)" />
      <Popover ref="themeOp">
        <div class="theme-popover">
          <Button v-for="opt in themeOptions" :key="opt.mode"
            :icon="opt.icon" :label="t(opt.key)"
            :severity="theme.mode === opt.mode ? 'primary' : 'secondary'" text
            @click="selectTheme(opt.mode)" />
        </div>
      </Popover>

      <Button :label="localeLabel" severity="secondary" text rounded
        @click="toggleLocale" />
      <Button icon="pi pi-user" severity="secondary" text rounded />
    </template>
  </Toolbar>

  <!-- 连接状态弹窗 -->
  <Dialog v-model:visible="statusModalVisible"
    :header="t('server.disconnectTitle')" modal>
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <i class="pi pi-exclamation-circle" style="color: var(--p-yellow-500)" />
        <span>{{ t('server.disconnected') }}</span>
      </div>
      <div v-if="conn.errorReason" class="text-sm" style="color: var(--p-text-muted-color)">
        {{ t('server.reason') }}: {{ conn.errorReason }}
      </div>
    </div>
    <template #footer>
      <Button icon="pi pi-refresh" :label="t('server.manualReconnect')"
        @click="conn.reconnect()" />
    </template>
  </Dialog>

  <!-- 服务器配置弹窗 -->
  <Dialog v-model:visible="configModalVisible"
    :header="t('server.configureTitle')" modal @show="resetConfig">
    <div class="flex flex-col gap-3">
      <label class="text-sm">{{ t('server.address') }}</label>
      <InputText v-model="address" :placeholder="t('server.addressPlaceholder')"
        :disabled="testing" />
      <Message v-if="testResult === 'success'" severity="success">
        {{ t('server.testSuccess') }}
      </Message>
      <Message v-else-if="testResult === 'fail'" severity="error">
        {{ testError || t('server.testFailed') }}
      </Message>
      <Message v-if="saveError" severity="error">{{ saveError }}</Message>
    </div>
    <template #footer>
      <Button :label="t('server.testConnection')"
        :loading="testing" :disabled="!address.trim()" severity="secondary"
        @click="handleTest" />
      <Button :label="t('server.save')" :disabled="!canSave" @click="handleSave" />
    </template>
  </Dialog>
</template>
```

- [ ] **Step 3: scoped CSS**

```css
.topbar {
  height: var(--topbar-height);
  flex-shrink: 0;
  padding: 0 12px;
}
.topbar-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 8px;
}
.conn-label {
  font-size: 13px;
  margin-left: 4px;
  white-space: nowrap;
}
.theme-popover {
  display: flex;
  flex-direction: column;
  padding: 4px;
  min-width: 150px;
}
```

---

### Task 8: 重写 Sidebar

**Files:**
- Modify: `src/layout/Sidebar.vue`
- Modify: `src/router/index.ts`

- [ ] **Step 1: 更新路由图标 → primeicons**

```ts
// src/router/index.ts — MODULES 图标字段
const MODULES = [
  { path: 'workplace',    icon: 'pi pi-desktop',       page: ... },
  { path: 'mission',      icon: 'pi pi-clipboard',      page: ... },
  { path: 'workstation',  icon: 'pi pi-wrench',         page: ... },
  { path: 'analysis',     icon: 'pi pi-chart-bar',      page: ... },
  { path: 'device',       icon: 'pi pi-cog',            page: ... },
  { path: 'integration',  icon: 'pi pi-link',           page: ... },
]
```

- [ ] **Step 2: 重写 Sidebar.vue**

展开态用 PanelMenu，折叠态用 Button 列 + v-tooltip。

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSidebarStore } from '@/stores/sidebar'
import PanelMenu from 'primevue/panelmenu'
import Button from 'primevue/button'

const router = useRouter()
const route = useRoute()
const sidebar = useSidebarStore()
const { t } = useI18n()

interface MenuItem {
  path: string
  meta: { titleKey: string; icon?: string }
}

const menuItems = computed<MenuItem[]>(() => {
  const root = router.options.routes.find((r) => r.path === '/')
  if (!root?.children) return []
  return root.children
    .filter((r) => r.meta?.titleKey)
    .map((r) => ({
      path: `/${r.path}`.replace(/^\/\//, '/'),
      meta: {
        titleKey: r.meta?.titleKey as string,
        icon: r.meta?.icon as string | undefined,
      },
    }))
})

const panelModel = computed(() =>
  menuItems.value.map(item => ({
    label: t(item.meta.titleKey),
    icon: item.meta.icon,
    command: () => router.push(item.path),
    className: route.path === item.path ? 'p-menuitem-active' : '',
  }))
)

function navigate(path: string) { router.push(path) }
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: sidebar.collapsed }">
    <PanelMenu v-if="!sidebar.collapsed" :model="panelModel" class="sidebar-panel">
      <template #item="{ item }">
        <a class="p-panelmenu-item-link" @click="item.command?.({ originalEvent: $event, item })">
          <span v-if="item.icon" :class="item.icon + ' p-panelmenu-item-icon'"></span>
          <span class="p-panelmenu-item-label">{{ item.label }}</span>
        </a>
      </template>
    </PanelMenu>

    <nav v-else class="sidebar-collapsed-nav">
      <Button
        v-for="item in menuItems" :key="item.path"
        :icon="item.meta.icon"
        severity="secondary" text rounded
        :class="{ 'sidebar-active': route.path === item.path }"
        v-tooltip.right="t(item.meta.titleKey)"
        @click="navigate(item.path)"
      />
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-expanded);
  flex-shrink: 0;
  transition: width 0.2s ease;
  overflow: hidden;
  contain: layout style;
}
.sidebar.collapsed { width: var(--sidebar-collapsed); }

.sidebar-panel { background: transparent; border: none; padding: 8px; }

.sidebar-collapsed-nav {
  display: flex; flex-direction: column; align-items: center;
  padding: 8px 0; gap: 2px;
}
.sidebar-active { color: var(--p-primary-500) !important; }
</style>
```

---

### Task 9: 重写 FooterBar

**Files:**
- Modify: `src/layout/FooterBar.vue`

内联 DeviceIndicator + DeviceDetailModal 逻辑到 FooterBar。

- [ ] **Step 1: 重写 FooterBar.vue**

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { aggregateStatus, statusLabel } from '@/shared/types/device'
import type { DeviceGroup } from '@/shared/types/device'
import { useI18n } from 'vue-i18n'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

const { t } = useI18n()

const now = ref(new Date())
let timer: ReturnType<typeof setInterval>
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => clearInterval(timer))

function formatTime(d: Date): string {
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${d.getFullYear()}-${mo}-${day} ${h}:${mi}:${s}`
}

const deviceGroups: DeviceGroup[] = [
  { icon: 'pi pi-wrench',    label: '拧紧枪', instances: [
    { name: '拧紧枪 #1', status: 'ok' }, { name: '拧紧枪 #2', status: 'ok' },
  ]},
  { icon: 'pi pi-microchip', label: '控制器', instances: [
    { name: '控制器 #1', status: 'ok' }, { name: '控制器 #2', status: 'error' },
  ]},
  { icon: 'pi pi-th-large',  label: 'PLC', instances: [{ name: 'PLC #1', status: 'ok' }] },
  { icon: 'pi pi-server',    label: 'MES', instances: [{ name: 'MES', status: 'offline' }] },
  { icon: 'pi pi-barcode',   label: '扫描枪', instances: [
    { name: '扫描枪 #1', status: 'error' }, { name: '扫描枪 #2', status: 'error' },
  ]},
]

const groupSnapshots = deviceGroups.map(g => ({ group: g, status: aggregateStatus(g.instances) }))

function severityFor(s: string): 'success' | 'danger' | 'secondary' | 'warn' {
  const map: Record<string, 'success' | 'danger' | 'secondary' | 'warn'> = {
    ok: 'success', error: 'danger', offline: 'secondary', warning: 'warn',
  }
  return map[s] ?? 'secondary'
}

const modalVisible = ref(false)
const selectedGroup = ref<DeviceGroup | null>(null)

function openModal(g: DeviceGroup) { selectedGroup.value = g; modalVisible.value = true }
function closeModal() { modalVisible.value = false; selectedGroup.value = null }
</script>

<template>
  <Toolbar class="footer">
    <template #start>
      <span class="footer-time">{{ formatTime(now) }}</span>
    </template>
    <template #end>
      <Button
        v-for="s in groupSnapshots" :key="s.group.label"
        :icon="s.group.icon" :severity="severityFor(s.status)"
        text rounded :title="`${s.group.label}：${t(statusLabel(s.status))}`"
        @click="openModal(s.group)" />
    </template>
  </Toolbar>

  <Dialog v-model:visible="modalVisible"
    :header="selectedGroup?.label ?? ''" modal :style="{ minWidth: '320px' }">
    <ul v-if="selectedGroup">
      <li v-for="inst in selectedGroup.instances" :key="inst.name"
        class="flex items-center gap-2 py-1">
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0"
          :style="{ background: inst.status === 'ok' ? 'var(--p-green-500)'
            : inst.status === 'error' ? 'var(--p-red-500)'
            : inst.status === 'warning' ? 'var(--p-yellow-500)'
            : 'var(--p-gray-400)' }" />
        <span class="flex-1 text-sm">{{ inst.name }}</span>
        <span class="text-xs" style="color: var(--p-text-muted-color)">
          {{ t(statusLabel(inst.status)) }}
        </span>
      </li>
    </ul>
  </Dialog>
</template>

<style scoped>
.footer {
  height: var(--footer-height);
  flex-shrink: 0;
  padding: 0 16px;
}
.footer-time {
  font-family: var(--font-mono);
  font-size: 13px;
}
</style>
```

---

### Task 10: 重写 MissionListPage

**Files:**
- Modify: `src/modules/mission/MissionListPage.vue`

替换 Card/ScrollArea/ToggleSwitch/按钮/图标为 PrimeVue 等价物，toast/confirm 改用 composable。

- [ ] **Step 1: 更新 MissionListPage**

完整替换 import：去掉 `@iconify/vue`、手写组件引用，加上 primevue 组件和 `useConfirm`/`useToast`。模板中 `<Icon icon="mdi:xxx">` → `<i class="pi pi-xxx">`，`toastStore.show()` → `toast.add()`，`confirmStore.open()` → `confirm.require()`。

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from 'primevue/card'
import ScrollPanel from 'primevue/scrollpanel'
import ToggleSwitch from 'primevue/toggleswitch'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Button from 'primevue/button'
import { useMissionStore } from '@/stores/mission'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import type { ProductMission } from '@/shared/types/mission'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useMissionStore()
const confirm = useConfirm()
const toast = useToast()

const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout>

onMounted(() => {
  searchInput.value = route.query.name ? String(route.query.name) : ''
  store.loadMissions({
    page: route.query.page ? Number(route.query.page) : 1,
    name: searchInput.value || undefined,
  })
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

function goToCreate() { router.push({ path: '/mission/new' }) }

function goToEdit(mission: ProductMission) {
  router.push({
    path: `/mission/${mission.id}/edit`,
    query: { page: store.pagination.page, name: store.searchName || undefined },
  })
}

async function handleDelete(mission: ProductMission) {
  confirm.require({
    header: t('mission.list.deleteConfirm', { name: mission.name }),
    message: t('mission.delete.confirm', { name: mission.name }),
    acceptLabel: t('mission.list.action.delete'),
    rejectLabel: t('common.close'),
    accept: () => store.removeMission(mission.id!),
  })
}

function inspectionLabel(m: ProductMission): string {
  return m.isInspection ? t('mission.list.columns.inspection') : '—'
}
</script>
```

模板中搜索框改为 `<IconField><InputIcon class="pi pi-search" /><InputText ... /></IconField>`，按钮改为 `<Button icon="pi pi-xxx" severity="secondary" text rounded />`，pagination 按钮改为 `<Button label="..." severity="secondary" text size="small" />`。

scoped CSS 保留布局和骨架屏样式，删除颜色/字体/按钮细节样式。

---

### Task 11: 重写 MissionEditPage + MissionBasicForm

**Files:**
- Modify: `src/modules/mission/MissionEditPage.vue`
- Modify: `src/modules/mission/components/MissionBasicForm.vue`

- [ ] **Step 1: MissionEditPage**

替换 import：Card → `primevue/card`，ScrollArea → `primevue/scrollpanel`，按钮 → `primevue/button`，toast/confirm → composable。

`toastStore.show(msg, type, ms)` → `toast.add({ severity: type, detail: msg, life: ms })`
`confirmStore.open({...})` → `confirm.require({ header: title, message, accept: ..., reject: ... })`

- [ ] **Step 2: MissionBasicForm**

ToggleSwitch → `primevue/toggleswitch`（v-model boolean）。`<input type="text">` → `InputText`，`<input type="number">` → `InputNumber`，`<input type="radio">` → `RadioButton`。保留 `.form-row`、`.form-label`、`.form-group` 等布局 CSS，颜色引用改为 `var(--p-*)`。

---

### Task 12: 清理旧文件

**Files (delete):**
- `src/shared/components/` 下全部 13 个 .vue
- `src/stores/confirm.ts`
- `src/stores/toast.ts`
- `src/shared/composables/usePointerPress.ts`

- [ ] **Step 1: 删除旧文件**

```bash
rm src/shared/components/Card.vue \
   src/shared/components/ConfirmDialog.vue \
   src/shared/components/ToastNotification.vue \
   src/shared/components/ToggleSwitch.vue \
   src/shared/components/IconButton.vue \
   src/shared/components/MenuItem.vue \
   src/shared/components/ScrollArea.vue \
   src/shared/components/ConnectionIndicator.vue \
   src/shared/components/ConnectionStatusModal.vue \
   src/shared/components/DeviceDetailModal.vue \
   src/shared/components/DeviceIndicator.vue \
   src/shared/components/PlaceholderCard.vue \
   src/shared/components/ServerConfigModal.vue \
   src/stores/confirm.ts \
   src/stores/toast.ts \
   src/shared/composables/usePointerPress.ts
```

- [ ] **Step 2: 清理路由文件中的旧图标**

确认 `src/router/index.ts` 已无 `mdi:` 前缀引用。

---

### Task 13: 类型检查 + 验证

- [ ] **Step 1: 类型检查**

```bash
npx vue-tsc -b --noEmit
```

- [ ] **Step 2: 构建**

```bash
npm run build
```

- [ ] **Step 3: 启动验证**

```bash
npm run dev
```

验证清单：
- [ ] 所有页面可访问
- [ ] 亮/暗主题切换正常
- [ ] 中/英语言切换正常
- [ ] Sidebar 展开/折叠/导航正常
- [ ] TopBar 主题/语言/连接状态弹窗正常
- [ ] FooterBar 时钟 + 设备组点击弹窗正常
- [ ] 任务列表 CRUD + Toast 反馈正常
- [ ] 任务编辑表单保存 + 离开确认正常

---

### Task 14: 更新 DESIGN.md

**Files:**
- Modify: `DESIGN.md`

实施完成后 DESIGN.md 的令牌来源已变（CSS 变量 → PrimeVue definePreset + Aura）。标注此变化，或运行 `impeccable document` 重新生成。
