# i18n 全覆盖 + 远程服务器连接状态 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 statusLabel() 和关闭按钮的硬编码中文，TopBar 标题旁新增远程服务器连接状态指示器 + 配置/状态弹窗。

**Architecture:** i18n 侧：`statusLabel()` 改为返回 i18n key 路径，调用方用 `t()` 包裹。连接状态侧：新增 Pinia store 管理状态（登录时单次请求后端），3 个新组件（Indicator + 2 个 Modal），TopBar 集成弹窗管理模式。

**Tech Stack:** Vue 3.5 + TypeScript + Pinia + vue-i18n + Iconify

## Global Constraints

- 所有交互目标 ≥44px（N2840 触屏适配）
- 动画仅 opacity/transform（禁止 layout 属性动画）
- 弹窗使用 Teleport to body + modal-fade 过渡（参考 DeviceDetailModal）
- 颜色仅使用现有 CSS 语义变量，不新增色值
- fetchStatus 失败默认显示 unconfigured，不阻塞页面渲染
- 前端不做轮询，登录时单次请求后端获取状态

---

### Task 1: i18n — 更新语言文件

**Files:**
- Modify: `src/locales/zh-CN.json`
- Modify: `src/locales/en.json`

**Interfaces:**
- Produces: `common.close`, `device.status.*`, `server.*` i18n keys 供后续所有任务使用

- [ ] **Step 1: 更新 zh-CN.json**

`src/locales/zh-CN.json` 替换为：

```json
{
  "app": {
    "title": "拧紧控制系统"
  },
  "menu": {
    "workplace": "工作台",
    "mission": "任务管理",
    "workstation": "站点管理",
    "analysis": "数据分析",
    "device": "设备管理",
    "integration": "系统集成"
  },
  "common": {
    "underConstruction": "功能开发中",
    "notFound": "页面不存在",
    "backHome": "返回首页",
    "expandSidebar": "展开侧边栏",
    "collapseSidebar": "收起侧边栏",
    "switchLanguage": "切换语言",
    "themeLight": "亮色模式",
    "themeDark": "暗色模式",
    "themeSystem": "跟随系统",
    "themeSwitch": "切换主题",
    "close": "关闭"
  },
  "device": {
    "status": {
      "ok": "正常",
      "error": "连接异常",
      "warning": "部分异常",
      "offline": "未配置"
    }
  },
  "server": {
    "connected": "已连接",
    "disconnected": "未连接",
    "unconfigured": "未配置",
    "connecting": "连接中...",
    "address": "服务器地址",
    "addressPlaceholder": "请输入服务器地址",
    "testConnection": "测试连接",
    "testing": "测试中...",
    "testSuccess": "连接成功",
    "testFailed": "连接失败",
    "testFailedDetail": "连接失败：{reason}",
    "saveFailed": "保存失败",
    "reconnectFailed": "重连失败",
    "save": "保存",
    "configureTitle": "配置远程服务器",
    "disconnectTitle": "服务器连接状态",
    "reason": "断开原因",
    "manualReconnect": "手动重连",
    "latency": "延迟",
    "latencyValue": "延迟 {n}ms"
  }
}
```

- [ ] **Step 2: 更新 en.json**

`src/locales/en.json` 替换为：

```json
{
  "app": {
    "title": "Tightening Control System"
  },
  "menu": {
    "workplace": "Workplace",
    "mission": "Mission",
    "workstation": "Stations",
    "analysis": "Analysis",
    "device": "Devices",
    "integration": "Integration"
  },
  "common": {
    "underConstruction": "Under Development",
    "notFound": "Page Not Found",
    "backHome": "Back to Home",
    "expandSidebar": "Expand Sidebar",
    "collapseSidebar": "Collapse Sidebar",
    "switchLanguage": "Switch Language",
    "themeLight": "Light",
    "themeDark": "Dark",
    "themeSystem": "System",
    "themeSwitch": "Switch Theme",
    "close": "Close"
  },
  "device": {
    "status": {
      "ok": "Normal",
      "error": "Error",
      "warning": "Warning",
      "offline": "Offline"
    }
  },
  "server": {
    "connected": "Connected",
    "disconnected": "Disconnected",
    "unconfigured": "Unconfigured",
    "connecting": "Connecting...",
    "address": "Server Address",
    "addressPlaceholder": "Enter server address",
    "testConnection": "Test Connection",
    "testing": "Testing...",
    "testSuccess": "Connection Successful",
    "testFailed": "Connection Failed",
    "testFailedDetail": "Connection Failed: {reason}",
    "saveFailed": "Save Failed",
    "reconnectFailed": "Reconnect Failed",
    "save": "Save",
    "configureTitle": "Configure Server",
    "disconnectTitle": "Server Connection Status",
    "reason": "Reason",
    "manualReconnect": "Reconnect",
    "latency": "Latency",
    "latencyValue": "{n}ms latency"
  }
}
```

- [ ] **Step 3: 验证**

运行 `npm run dev`，确认应用无报错，语言切换正常，新增 key 可访问。

- [ ] **Step 4: 提交**

```bash
git add src/locales/zh-CN.json src/locales/en.json
git commit -m "feat(i18n): add device status, server connection, and close keys"
```

---

### Task 2: i18n — statusLabel() 改为返回 i18n key

**Files:**
- Modify: `src/shared/types/device.ts:28-30`

**Interfaces:**
- Consumes: `device.status.*` i18n keys from Task 1
- Produces: `statusLabel()` now returns i18n key path (e.g. `'device.status.ok'`) instead of Chinese text

- [ ] **Step 1: 修改 statusLabel() 返回值**

将 `src/shared/types/device.ts` 第 28-30 行：

```ts
export function statusLabel(s: string): string {
  return { ok: '正常', error: '连接异常', warning: '部分异常', offline: '未配置' }[s] ?? '未配置'
}
```

替换为：

```ts
export function statusLabel(s: string): string {
  return { ok: 'device.status.ok', error: 'device.status.error', warning: 'device.status.warning', offline: 'device.status.offline' }[s] ?? 'device.status.offline'
}
```

- [ ] **Step 2: 验证**

运行 `npm run dev`，确认类型检查通过。此时页面上的状态文字会显示原始 key（如 `device.status.ok`）而非翻译文字，这是预期行为 — Task 3/4 会修复调用方。

- [ ] **Step 3: 提交**

```bash
git add src/shared/types/device.ts
git commit -m "refactor(i18n): change statusLabel() to return i18n key path"
```

---

### Task 3: i18n — 修复 DeviceDetailModal 和 DeviceIndicator

**Files:**
- Modify: `src/shared/components/DeviceDetailModal.vue`
- Modify: `src/shared/components/DeviceIndicator.vue`

**Interfaces:**
- Consumes: `statusLabel()` from Task 2 (now returns i18n key), `common.close` from Task 1

- [ ] **Step 1: 修复 DeviceDetailModal.vue**

`src/shared/components/DeviceDetailModal.vue`，两处修改：

修改 1 — `<script setup>` 中加入 i18n（第 6 行后插入）：

```ts
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
```

修改 2 — 模板中所有 `statusLabel(...)` 调用用 `t()` 包裹，关闭按钮 title 改为 i18n：

第 50 行：
```html
{{ statusLabel(aggStatus) }}
```
改为：
```html
{{ t(statusLabel(aggStatus)) }}
```

第 53 行：
```html
<button ref="closeBtnRef" class="modal-close-btn" @click="handleClose" title="关闭">
```
改为：
```html
<button ref="closeBtnRef" class="modal-close-btn" @click="handleClose" :title="t('common.close')">
```

第 62 行：
```html
{{ statusLabel(inst.status) }}
```
改为：
```html
{{ t(statusLabel(inst.status)) }}
```

- [ ] **Step 2: 修复 DeviceIndicator.vue**

`src/shared/components/DeviceIndicator.vue`，两处修改：

修改 1 — `<script setup>` 中加入 i18n（第 6 行后插入）：

```ts
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
```

修改 2 — 第 13 行 title 绑定：

```html
:title="`${label}：${statusLabel(status)}`"
```
改为：
```html
:title="`${label}：${t(statusLabel(status))}`"
```

- [ ] **Step 3: 验证**

运行 `npm run dev`，点击 FooterBar 设备指示器打开弹窗：
- 中文：状态标签显示"正常"/"连接异常"/"部分异常"/"未配置"
- English：切换到英文后显示 "Normal"/"Error"/"Warning"/"Offline"
- 关闭按钮 tooltip 显示"关闭"/"Close"

- [ ] **Step 4: 提交**

```bash
git add src/shared/components/DeviceDetailModal.vue src/shared/components/DeviceIndicator.vue
git commit -m "fix(i18n): wrap statusLabel calls with t() and localize close button"
```

---

### Task 4: serverConnection Pinia Store

**Files:**
- Create: `src/stores/serverConnection.ts`

**Interfaces:**
- Produces:
  - `useServerConnectionStore` — Pinia store
  - State: `status: Ref<'connected' | 'disconnected' | 'unconfigured' | 'loading'>`, `address: Ref<string>`, `latency: Ref<number | null>`, `errorReason: Ref<string>`
  - Actions: `fetchStatus()`, `saveConfig(address: string)`, `testConnection(address: string)`, `reconnect()`

- [ ] **Step 1: 创建 store 文件**

新建 `src/stores/serverConnection.ts`：

```ts
import { ref } from 'vue'
import { defineStore } from 'pinia'

export type ConnectionStatus = 'connected' | 'disconnected' | 'unconfigured' | 'loading'

export interface ServerStatusResponse {
  status: 'connected' | 'disconnected' | 'unconfigured'
  address: string
  latency: number | null
  errorReason: string
}

const API_BASE = ''

export const useServerConnectionStore = defineStore('serverConnection', () => {
  const status = ref<ConnectionStatus>('loading')
  const address = ref('')
  const latency = ref<number | null>(null)
  const errorReason = ref('')

  async function fetchStatus() {
    status.value = 'loading'
    try {
      const res = await fetch(`${API_BASE}/api/server/status`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: ServerStatusResponse = await res.json()
      status.value = data.status
      address.value = data.address
      latency.value = data.latency
      errorReason.value = data.errorReason
    } catch {
      status.value = 'unconfigured'
      address.value = ''
      latency.value = null
      errorReason.value = ''
    }
  }

  async function saveConfig(addr: string) {
    const res = await fetch(`${API_BASE}/api/server/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: addr }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await fetchStatus()
  }

  async function testConnection(addr: string): Promise<{ success: boolean; errorReason: string }> {
    const res = await fetch(`${API_BASE}/api/server/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: addr }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  async function reconnect() {
    const res = await fetch(`${API_BASE}/api/server/reconnect`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await fetchStatus()
  }

  return { status, address, latency, errorReason, fetchStatus, saveConfig, testConnection, reconnect }
})
```

- [ ] **Step 2: 验证**

运行 `npm run dev`，确认应用无 import 错误。此时 store 已可用但未被任何组件消费（Task 6/7/8 集成）。

- [ ] **Step 3: 提交**

```bash
git add src/stores/serverConnection.ts
git commit -m "feat: add serverConnection Pinia store"
```

---

### Task 5: ConnectionIndicator 组件

**Files:**
- Create: `src/shared/components/ConnectionIndicator.vue`

**Interfaces:**
- Consumes: `server.*` i18n keys from Task 1
- Produces: `<ConnectionIndicator>` — 圆点 + 文字, emits `click`
- Props: `status: 'connected' | 'disconnected' | 'unconfigured' | 'loading'`, `address?: string`, `latency?: number`

- [ ] **Step 1: 创建组件**

新建 `src/shared/components/ConnectionIndicator.vue`：

```vue
<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'
import { usePointerPress } from '@/shared/composables/usePointerPress'

defineProps<{
  status: 'connected' | 'disconnected' | 'unconfigured' | 'loading'
  address?: string
  latency?: number
}>()

defineEmits<{ click: [] }>()

const { t } = useI18n()
const { pressed, onDown, onUp } = usePointerPress()

const iconMap: Record<string, string> = {
  connected: 'mdi:check-circle',
  disconnected: 'mdi:alert-circle',
  unconfigured: 'mdi:help-circle',
  loading: 'mdi:loading',
}

const labelKeyMap: Record<string, string> = {
  connected: 'server.connected',
  disconnected: 'server.disconnected',
  unconfigured: 'server.unconfigured',
  loading: 'server.connecting',
}
</script>

<template>
  <button
    class="conn-indicator"
    :class="[`conn-${status}`, { pressed }]"
    :title="status === 'connected' && address
      ? `${address} · ${t('server.latencyValue', { n: latency ?? 0 })}`
      : t(labelKeyMap[status])"
    @pointerdown="onDown"
    @pointerup="onUp"
    @pointerleave="onUp"
    @click="$emit('click')"
  >
    <Icon
      :icon="iconMap[status]"
      class="conn-dot"
      :class="{ 'conn-dot-spin': status === 'loading' }"
    />
    <span class="conn-label">{{ t(labelKeyMap[status]) }}</span>
  </button>
</template>

<style scoped>
.conn-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: transparent;
  transition: background 0.1s, transform 0.1s;
}

@media (hover: hover) {
  .conn-indicator:hover {
    background: var(--color-border);
  }
}

.conn-indicator.pressed {
  background: var(--color-border);
  transform: scale(0.94);
}

.conn-dot {
  font-size: 16px;
  flex-shrink: 0;
}

.conn-label {
  white-space: nowrap;
}

.conn-connected .conn-dot { color: var(--color-status-ok); }
.conn-disconnected .conn-dot { color: var(--color-status-warning); }
.conn-unconfigured .conn-dot { color: var(--color-status-offline); }
.conn-loading .conn-dot { color: var(--color-text-secondary); }

.conn-dot-spin {
  animation: conn-spin 1.2s linear infinite;
}

@keyframes conn-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
```

- [ ] **Step 2: 验证**

运行 `npm run dev`，组件尚未被引用，确认编译无报错即可。

- [ ] **Step 3: 提交**

```bash
git add src/shared/components/ConnectionIndicator.vue
git commit -m "feat: add ConnectionIndicator component"
```

---

### Task 6: ServerConfigModal 组件

**Files:**
- Create: `src/shared/components/ServerConfigModal.vue`

**Interfaces:**
- Consumes: `server.*` i18n keys from Task 1, `useServerConnectionStore` from Task 4
- Produces: `<ServerConfigModal>` — 未配置时弹窗，含地址输入、测试连接、保存
- Props: `visible: boolean`
- Emits: `close: []`

- [ ] **Step 1: 创建组件**

新建 `src/shared/components/ServerConfigModal.vue`：

```vue
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'
import { useServerConnectionStore } from '@/stores/serverConnection'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const store = useServerConnectionStore()

const address = ref('')
const testing = ref(false)
const testResult = ref<'idle' | 'success' | 'fail'>('idle')
const testError = ref('')
const saving = ref(false)
const saveError = ref('')

const closeBtnRef = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) handleClose()
}

watch(() => props.visible, (v) => {
  if (v) {
    previousFocus = document.activeElement as HTMLElement | null
    address.value = ''
    testing.value = false
    testResult.value = 'idle'
    testError.value = ''
    saving.value = false
    saveError.value = ''
    document.addEventListener('keydown', onKeydown)
    nextTick(() => closeBtnRef.value?.focus())
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

function handleClose() {
  emit('close')
  previousFocus?.focus()
}

const canSave = () => testResult.value === 'success' && !saving.value

async function handleTest() {
  if (!address.value.trim()) return
  testing.value = true
  testResult.value = 'idle'
  testError.value = ''
  try {
    const result = await store.testConnection(address.value.trim())
    if (result.success) {
      testResult.value = 'success'
    } else {
      testResult.value = 'fail'
      testError.value = result.errorReason
    }
  } catch {
    testResult.value = 'fail'
    testError.value = ''
  } finally {
    testing.value = false
  }
}

async function handleSave() {
  if (!canSave()) return
  saving.value = true
  try {
    await store.saveConfig(address.value.trim())
    handleClose()
  } catch {
    saveError.value = t('server.saveFailed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" role="dialog" aria-modal="true" @click.self="handleClose">
        <div class="modal-panel">
          <header class="modal-header">
            <span class="modal-title">{{ t('server.configureTitle') }}</span>
            <button ref="closeBtnRef" class="modal-close-btn" @click="handleClose" :title="t('common.close')">
              <Icon icon="mdi:close" class="modal-close-icon" />
            </button>
          </header>

          <div class="modal-body">
            <label class="field-label">{{ t('server.address') }}</label>
            <input
              v-model="address"
              type="text"
              class="field-input"
              :placeholder="t('server.addressPlaceholder')"
              :readonly="testing"
              @keyup.enter="handleTest"
            />

            <div v-if="testResult === 'success'" class="test-msg test-msg-ok">
              <Icon icon="mdi:check-circle" class="test-msg-icon" />
              {{ t('server.testSuccess') }}
            </div>
            <div v-else-if="testResult === 'fail'" class="test-msg test-msg-err">
              <Icon icon="mdi:alert-circle" class="test-msg-icon" />
              {{ testError ? t('server.testFailedDetail', { reason: testError }) : t('server.testFailed') }}
            </div>

            <div v-if="saveError" class="test-msg test-msg-err">
              <Icon icon="mdi:alert-circle" class="test-msg-icon" />
              {{ saveError }}
            </div>
          </div>

          <footer class="modal-footer">
            <button
              class="btn btn-secondary"
              :disabled="testing || !address.trim()"
              @click="handleTest"
            >
              {{ testing ? t('server.testing') : t('server.testConnection') }}
            </button>
            <button
              class="btn btn-primary"
              :disabled="!canSave()"
              @click="handleSave"
            >
              {{ t('server.save') }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-panel {
  background: var(--color-surface);
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
  contain: layout style;
}

.modal-header {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 0 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.modal-close-btn {
  width: 44px; height: 44px; min-height: 0; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.1s;
}
@media (hover: hover) { .modal-close-btn:hover { background: var(--color-border); } }

.modal-close-icon {
  font-size: 22px;
  flex-shrink: 0;
  color: var(--color-text-secondary);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.field-input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-bg);
  outline: none;
  transition: border-color 0.1s;
}

.field-input:focus {
  border-color: var(--color-primary);
}

.field-input:read-only {
  opacity: 0.6;
}

.test-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
}

.test-msg-ok { color: var(--color-status-ok); }
.test-msg-err { color: var(--color-status-error); }

.test-msg-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 16px;
}

.btn {
  height: 44px; min-height: 0; min-width: 88px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s, opacity 0.1s;
}

.btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-sidebar-active-text);
}

@media (hover: hover) {
  .btn-primary:not(:disabled):hover {
    background: var(--color-primary-hover);
  }
}

.btn-secondary {
  background: var(--color-border);
  color: var(--color-text);
}

@media (hover: hover) {
  .btn-secondary:not(:disabled):hover {
    filter: brightness(0.92);
  }
}

/* fade transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease-out;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
```

- [ ] **Step 2: 验证**

运行 `npm run dev`，确认编译无报错。

- [ ] **Step 3: 提交**

```bash
git add src/shared/components/ServerConfigModal.vue
git commit -m "feat: add ServerConfigModal component"
```

---

### Task 7: ConnectionStatusModal 组件

**Files:**
- Create: `src/shared/components/ConnectionStatusModal.vue`

**Interfaces:**
- Consumes: `server.*` i18n keys from Task 1, `useServerConnectionStore` from Task 4
- Produces: `<ConnectionStatusModal>` — 未连接时弹窗，显示原因 + 手动重连
- Props: `visible: boolean`
- Emits: `close: []`

- [ ] **Step 1: 创建组件**

新建 `src/shared/components/ConnectionStatusModal.vue`：

```vue
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'
import { useServerConnectionStore } from '@/stores/serverConnection'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const store = useServerConnectionStore()

const reconnecting = ref(false)
const reconnectError = ref('')
const closeBtnRef = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) handleClose()
}

watch(() => props.visible, (v) => {
  if (v) {
    previousFocus = document.activeElement as HTMLElement | null
    reconnecting.value = false
    reconnectError.value = ''
    document.addEventListener('keydown', onKeydown)
    nextTick(() => closeBtnRef.value?.focus())
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

function handleClose() {
  emit('close')
  previousFocus?.focus()
}

async function handleReconnect() {
  reconnecting.value = true
  try {
    await store.reconnect()
  } catch {
    reconnectError.value = t('server.reconnectFailed')
  } finally {
    reconnecting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" role="dialog" aria-modal="true" @click.self="handleClose">
        <div class="modal-panel">
          <header class="modal-header">
            <span class="modal-title">{{ t('server.disconnectTitle') }}</span>
            <button ref="closeBtnRef" class="modal-close-btn" @click="handleClose" :title="t('common.close')">
              <Icon icon="mdi:close" class="modal-close-icon" />
            </button>
          </header>

          <div class="modal-body">
            <div class="status-row">
              <Icon icon="mdi:alert-circle" class="status-icon-warn" />
              <span class="status-text">{{ t('server.disconnected') }}</span>
            </div>

            <div v-if="store.errorReason" class="reason-block">
              <span class="reason-label">{{ t('server.reason') }}</span>
              <span class="reason-text">{{ store.errorReason }}</span>
            </div>

            <div v-if="reconnectError" class="test-msg test-msg-err">
              <Icon icon="mdi:alert-circle" class="test-msg-icon" />
              {{ reconnectError }}
            </div>
          </div>

          <footer class="modal-footer">
            <button
              class="btn btn-primary"
              :disabled="reconnecting"
              @click="handleReconnect"
            >
              <Icon icon="mdi:refresh" class="btn-icon" />
              {{ t('server.manualReconnect') }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-panel {
  background: var(--color-surface);
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
  contain: layout style;
}

.modal-header {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 0 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.modal-close-btn {
  width: 44px; height: 44px; min-height: 0; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.1s;
}
@media (hover: hover) { .modal-close-btn:hover { background: var(--color-border); } }

.modal-close-icon {
  font-size: 22px;
  flex-shrink: 0;
  color: var(--color-text-secondary);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon-warn {
  font-size: 22px;
  color: var(--color-status-warning);
  flex-shrink: 0;
}

.status-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text);
}

.reason-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: var(--color-bg);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.reason-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.reason-text {
  font-size: 14px;
  color: var(--color-text);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 16px;
}

.btn {
  height: 44px; min-height: 0; min-width: 88px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.1s, opacity 0.1s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-sidebar-active-text);
}

@media (hover: hover) {
  .btn-primary:not(:disabled):hover {
    background: var(--color-primary-hover);
  }
}

.btn-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.test-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
}

.test-msg-err { color: var(--color-status-error); }

.test-msg-icon {
  font-size: 18px;
  flex-shrink: 0;
}

/* fade transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease-out;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
```

- [ ] **Step 2: 验证**

运行 `npm run dev`，确认编译无报错。

- [ ] **Step 3: 提交**

```bash
git add src/shared/components/ConnectionStatusModal.vue
git commit -m "feat: add ConnectionStatusModal component"
```

---

### Task 8: TopBar 集成 — 加入状态指示器 + 弹窗管理 + 登录时 fetchStatus

**Files:**
- Modify: `src/layout/TopBar.vue`

**Interfaces:**
- Consumes: ConnectionIndicator from Task 5, ServerConfigModal from Task 6, ConnectionStatusModal from Task 7, useServerConnectionStore from Task 4

- [ ] **Step 1: 集成到 TopBar**

`src/layout/TopBar.vue` 需要以下修改：

**修改 1 — `<script setup>` 顶部新增 import**（第 9 行后插入）：

```ts
import ConnectionIndicator from '@/shared/components/ConnectionIndicator.vue'
import ServerConfigModal from '@/shared/components/ServerConfigModal.vue'
import ConnectionStatusModal from '@/shared/components/ConnectionStatusModal.vue'
import { useServerConnectionStore } from '@/stores/serverConnection'
```

**修改 2 — 在 `const { t, locale } = useI18n()` 之后插入 store 和弹窗状态**：

```ts
const conn = useServerConnectionStore()
const configModalVisible = ref(false)
const statusModalVisible = ref(false)
```

**修改 3 — 新增 onMounted 调用 fetchStatus**（在现有 `onMounted` 调用之后追加）：

```ts
onMounted(() => conn.fetchStatus())
```

**修改 4 — 新增点击处理函数**（在 `toggleLocale` 函数旁边）：

```ts
function onConnClick() {
  if (conn.status === 'unconfigured') {
    configModalVisible.value = true
  } else if (conn.status === 'disconnected') {
    statusModalVisible.value = true
  }
  // connected — tooltip 已在 title 属性中处理，无需弹出
}
```

**修改 5 — 模板标题旁插入 ConnectionIndicator**（第 79 行 `<span class="topbar-title">` 之后）：

```html
<ConnectionIndicator
  :status="conn.status"
  :address="conn.address"
  :latency="conn.latency ?? undefined"
  @click="onConnClick"
/>
```

**修改 6 — 模板末尾（`</template>` 之前）加入弹窗**：

```html
<ServerConfigModal :visible="configModalVisible" @close="configModalVisible = false" />
<ConnectionStatusModal :visible="statusModalVisible" @close="statusModalVisible = false" />
```

- [ ] **Step 2: 验证**

运行 `npm run dev`：
- 页面加载时，标题旁显示连接状态（无后端时将 fallback 到"未配置"灰色圆点）
- 点击"未配置"状态 → 弹出 ServerConfigModal
- 模拟：手动修改 store status 为 `disconnected`，点击 → 弹出 ConnectionStatusModal
- 确认 Theme/Language 按钮区域不受影响

运行 `npm run build` 确认类型检查通过。

- [ ] **Step 3: 提交**

```bash
git add src/layout/TopBar.vue
git commit -m "feat: integrate server connection indicator and modals into TopBar"
```

---

### Task 9: 端到端验证

- [ ] **Step 1: i18n 验证**

```bash
npm run build
```
确认无 TypeScript 错误。运行 `npm run dev`，手动验证：

1. 中文环境：FooterBar 设备弹窗状态显示"正常"/"连接异常"等
2. 切换到英文：状态显示 "Normal"/"Error" 等
3. 关闭按钮 tooltip 随语言切换

- [ ] **Step 2: 连接状态验证**

1. 无后端时（开发环境）：状态显示灰色"未配置"
2. 点击弹窗 → 输入地址 → 测试连接（此时后端不可达，显示失败）
3. 关闭弹窗不影响页面

- [ ] **Step 3: 性能验证**

DevTools Performance 面板确认：
- 弹窗打开/关闭仅触发 opacity 动画
- 无 layout thrashing

- [ ] **Step 4: 最终提交（如有遗漏文件）**

```bash
git status
# 如有未提交文件，git add + git commit
```
