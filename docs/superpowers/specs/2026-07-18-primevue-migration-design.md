# PrimeVue 全量迁移设计

日期: 2026-07-18 | 状态: 已批准

## 目标

用 PrimeVue v4 (Aura 主题, Styled 模式) 替换项目中所有手写组件，不保留任何自建组件，最小化手写 CSS。

## 核心决策

| 决策 | 选择 |
|------|------|
| PrimeVue 版本 | v4 |
| 主题 | Aura |
| 模式 | Styled |
| 替换策略 | 一次性全量替换 |
| 图标库 | primeicons（替换 @iconify/vue） |
| 品牌色 | `definePreset` 覆盖 Aura 令牌 |
| 暗色主题 | `darkModeSelector: 'html.dark'`（复用现有 `useThemeStore`） |
| 数据模型 | `enabled` 等 0/1 字段改为 `boolean`，API 层做序列化转换 |
| Toast/Confirm | `useToast` / `useConfirm` composable（删 store） |

## 依赖变更

```diff
+ primevue
+ @primevue/themes
+ primeicons
- @iconify/vue
- @iconify-json/mdi
```

## main.ts 变更

```ts
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import { definePreset } from '@primevue/themes'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'

const TighteningPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '#fef9e7',
      100: '#fef0c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#c49700',
      600: '#a87e00',
      700: '#8b6500',
      800: '#6d4f00',
      900: '#543b00',
      950: '#3d2a00',
    },
    colorScheme: {
      light: {
        surface:        '#fcfcfb',  // --color-surface
        surfaceNav:     '#f3f2ef',  // --color-sidebar-bg
        surfaceHeader:  '#fafafa',  // --color-topbar-bg
        surfaceFooter:  '#f4f4f2',  // --color-footer-bg
        background:     '#fafafa',  // --color-bg
        border:         '#e4e4e7',  // --color-border
        textMuted:      '#71717a',  // --color-text-secondary
      },
      dark: {
        surface:        '#27272a',
        surfaceNav:     '#1c1c1f',
        surfaceHeader:  '#18181b',
        surfaceFooter:  '#1c1c1f',
        background:     '#18181b',
        border:         '#3f3f46',
        textMuted:      '#a1a1aa',
      },
    },
  },
})

app.use(PrimeVue, {
  theme: {
    preset: TighteningPreset,
    options: {
      darkModeSelector: 'html.dark',
    },
  },
  ripple: false,    // N2840 关波纹
})
app.use(ToastService)
app.use(ConfirmationService)
```


## 组件映射（13+4 个）

### 共享组件 → PrimeVue

| 移除 | 替换为 | 复杂度 |
|------|--------|--------|
| `Card.vue` | `Card` | 低 |
| `ToggleSwitch.vue` | `ToggleSwitch`（数据 0/1 → boolean） | 低 |
| `ScrollArea.vue` | `ScrollPanel` | 低 |
| `IconButton.vue` | `Button`（icon + variant + severity） | 低 |
| `MenuItem.vue` | `Button`（variant="text"） | 低 |
| `PlaceholderCard.vue` | `Message` | 低 |
| `ConfirmDialog.vue` | `ConfirmDialog` + `useConfirm` composable | 中 |
| `ToastNotification.vue` | `Toast` + `useToast` composable | 中 |
| `ConnectionIndicator.vue` | `Button` + `Tag` 组合 | 中 |
| `ConnectionStatusModal.vue` | `Dialog` | 低 |
| `ServerConfigModal.vue` | `Dialog` + `InputText` | 中 |
| `DeviceDetailModal.vue` | `Dialog` | 低 |
| `DeviceIndicator.vue` | `Button`（icon + severity 色） | 低 |

### 布局组件 → PrimeVue

| 组件 | 替换方案 |
|------|---------|
| `MainLayout.vue` | 保留 flex 结构，子组件全换 PrimeVue |
| `Sidebar.vue` | `PanelMenu`（展开）+ `Popover` + `Menu`（折叠 flyout） |
| `TopBar.vue` | `Toolbar` + `Button` + `Popover` |
| `FooterBar.vue` | 保留 flex 结构 + `Toolbar` + `Button` |

## 图标映射

| MDI | primeicons |
|-----|------------|
| `mdi:menu` / `mdi:menu-open` | `pi pi-bars` |
| `mdi:magnify` | `pi pi-search` |
| `mdi:plus` | `pi pi-plus` |
| `mdi:arrow-left` | `pi pi-arrow-left` |
| `mdi:square-edit-outline` | `pi pi-pencil` |
| `mdi:trash-can-outline` | `pi pi-trash` |
| `mdi:close` | `pi pi-times` |
| `mdi:white-balance-sunny` | `pi pi-sun` |
| `mdi:weather-night` | `pi pi-moon` |
| `mdi:theme-light-dark` | `pi pi-palette` |
| `mdi:account-circle` | `pi pi-user` |
| `mdi:monitor-screenshot` | `pi pi-desktop` |
| `mdi:clipboard-text-outline` | `pi pi-clipboard` |
| `mdi:worker` | `pi pi-wrench` |
| `mdi:chart-bar` | `pi pi-chart-bar` |
| `mdi:cog` | `pi pi-cog` |
| `mdi:connection` | `pi pi-link` |
| `mdi:check-circle` | `pi pi-check-circle` |
| `mdi:alert-circle` | `pi pi-exclamation-circle` |
| `mdi:refresh` | `pi pi-refresh` |
| `mdi:clipboard-check-outline` | `pi pi-verified` |
| `mdi:image-outline` | `pi pi-image` |
| `mdi:tools` | `pi pi-wrench` |
| `mdi:memory` | `pi pi-microchip` |
| `mdi:developer-board` | `pi pi-th-large` |
| `mdi:server-network` | `pi pi-server` |
| `mdi:barcode-scan` | `pi pi-barcode` |

## 数据模型变更

`ProductMission` 中 5 个 toggle 字段 `number` → `boolean`：

```
enabled: 0/1        →  enabled: boolean
skipScrew: 0/1      →  skipScrew: boolean
passwordRequiredAfterNg: 0/1 → passwordRequiredAfterNg: boolean
multiDeviceIndependent: 0/1  → multiDeviceIndependent: boolean
isInspection: 0/1   →  isInspection: boolean
```

`shared/api/mission.ts` 请求/响应处理中做 `boolean ↔ 0/1` 序列化转换。

## N2840 性能适配

目标硬件 N2840（Bay Trail 4GB DDR3 + 集成 GPU），需延续 DESIGN.md 的性能约束：

- **关波纹** — `ripple: false`，省 GPU paint 开销
- **动画限制** — 全局 CSS 保留 `@media (prefers-reduced-motion) { *, *::before, *::after { animation-duration: 0.01ms !important } }` 的克制策略，Aura 自带过渡仅用 transform/opacity
- **CSS contain** — 布局壳（MainLayout sidebar/content 区域）保留 `contain: layout style`
- **PrimeVue 按需引入** — Vite tree-shaking 自动处理，不额外配置
- **关注点** — Styled Mode 引入的 Aura CSS 体量（预估 ~50KB gzip），首次渲染时需验证。若性能不达预期，可降级为 `definePreset(Aura, { css: { shorthand: true } })` 精简令牌输出

## 删除物清单

- 13 个 `shared/components/*.vue` 文件
- `layout/Sidebar.vue`、`layout/TopBar.vue`、`layout/FooterBar.vue`（重写为 PrimeVue 版）
- `stores/confirm.ts`、`stores/toast.ts`
- `shared/composables/usePointerPress.ts`
- `style.css` 中所有颜色、状态、排版相关 CSS 变量（保留布局尺寸 `--sidebar-*`、`--topbar-height`、`--footer-height`、`--font-sans`、`--font-mono` 及 reset/base 样式）
- `@iconify/vue`、`@iconify-json/mdi` 依赖

## 保留不变

- Pinia stores: `sidebar`、`theme`、`mission`、`serverConnection`
- vue-router、vue-i18n
- Vite 配置
- 页面组件（仅改模板引用和少量 CSS）
- `style.css` 中的 reset/base/布局变量/font-family/scrollbar 样式

## 风险

1. **Sidebar 交互** — PanelMenu 与手写 Sidebar 行为差异，需确保展开/折叠/悬浮飞出的核心体验
2. **primeicons 覆盖率** — 确认所有 MDI 图标在 primeicons 中有等价物
3. **品牌色一致性** — `definePreset` 覆盖后验证亮/暗主题下 sidebar/topbar/footer 表面色是否与当前 DESIGN.md 令牌一致
4. **Toast/Confirm API 差异** — `useToast`/`useConfirm` 的调用方式与现有 store API 不同，页面引用需逐一调整
5. **N2840 首次渲染** — Styled Mode 引入的 Aura CSS 体量需实测，必要时精简令牌输出
