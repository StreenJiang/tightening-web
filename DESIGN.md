# DESIGN.md — tightening-web

> 从 `src/style.css` 提取的设计令牌与约定。`/impeccable document` 可重新生成。

## Design Tokens

### Colors

#### Core

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-bg` | `#fafafa` | `#18181b` | 主背景 |
| `--color-surface` | `#fcfcfb` | `#27272a` | 卡片、弹窗、按钮表面 |
| `--color-text` | `#18181b` | `#f4f4f5` | 正文 |
| `--color-text-secondary` | `#71717a` | `#a1a1aa` | 辅助文字 |
| `--color-border` | `#e4e4e7` | `#3f3f46` | 边框、分割线 |

#### Brand

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-primary` | `#c49700` | `#e8b830` | 主强调色（工业黄） |
| `--color-primary-hover` | `#a87e00` | `#f0c840` | 悬停态 |

#### Semantic

| Token | Light | Dark | Meaning |
|-------|-------|------|---------|
| `--color-status-ok` | `#16a34a` | same | 正常/在线 |
| `--color-status-error` | `#dc2626` | same | 异常/错误 |
| `--color-status-warning` | `#f59e0b` | `#fbbf24` | 部分异常（混合状态） |
| `--color-status-offline` | `#d4d4d8` | `#52525b` | 离线/未配置 |
| `--color-modal-overlay` | `rgba(0,0,0,0.45)` | `rgba(0,0,0,0.6)` | 模态遮罩 |

**预计算背景色**（替代运行时 `color-mix()`，降低 N2840 开销）：

| Token | Light | Dark |
|-------|-------|------|
| `--color-status-ok-bg` | `rgba(22,163,74,0.12)` | same |
| `--color-status-error-bg` | `rgba(220,38,38,0.12)` | same |
| `--color-status-warning-bg` | `rgba(245,158,11,0.12)` | `rgba(251,191,36,0.12)` |
| `--color-status-offline-bg` | `rgba(212,212,216,0.12)` | `rgba(82,82,91,0.12)` |
| `--color-border-subtle` | `rgba(228,228,231,0.25)` | `rgba(63,63,70,0.25)` |

#### Surface — Sidebar

| Token | Light | Dark |
|-------|-------|------|
| `--color-sidebar-bg` | `#f3f2ef` | `#1c1c1f` |
| `--color-sidebar-text` | `#52525b` | `#a1a1aa` |
| `--color-sidebar-hover` | `#e8e8e3` | `#27272a` |
| `--color-sidebar-active` | `#c49700` | `#e8b830` |
| `--color-sidebar-active-text` | `#faf9f3` | `#1a1a1a` |
| `--color-sidebar-border` | `#e4e4e7` | `#3f3f46` |

#### Surface — TopBar / FooterBar

| Token | Light | Dark |
|-------|-------|------|
| `--color-topbar-bg` | `#fafafa` | `#18181b` |
| `--color-topbar-border` | `#e4e4e7` | `#27272a` |
| `--color-footer-bg` | `#f4f4f2` | `#1c1c1f` |
| `--color-footer-border` | `#e4e4e7` | `#3f3f46` |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--sidebar-expanded` | `220px` | 侧边栏展开宽度 |
| `--sidebar-collapsed` | `60px` | 侧边栏折叠宽度 |
| `--topbar-height` | `56px` | 顶栏高度 |
| `--footer-height` | `52px` | 底栏高度 |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-sans` | `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` | 正文/UI 文本 |
| `--font-mono` | `ui-monospace, 'Cascadia Code', Consolas, monospace` | 时钟等等宽数字 |

**Base**: `14px` / `line-height: 1.5`

### Radius & Shadow

| Element | Radius | Notes |
|---------|--------|-------|
| Sidebar links | `6px` | `.sidebar-link` |
| Device buttons | `7px` | `.device-btn` |
| Close button | `6px` | `.modal-close-btn` |
| Modal panel | `8px` | `.modal-panel` |
| Flyout | `8px` | `.sidebar-flyout` |

Modal shadow: `0 4px 24px rgba(0,0,0,0.25)`
Flyout shadow: `0 4px 12px rgba(0,0,0,0.3)`

### Z-Index

| Layer | Value | Usage |
|-------|-------|-------|
| Sidebar flyout | `1000` | 折叠态悬停浮层 |
| Modal overlay | `2000` | 模态弹窗遮罩 |

## Conventions

### Code Organization

- 共享类型与工具函数集中在 `src/shared/types/` — 类型定义 + 纯函数（无 UI 依赖）
- 组件内仅保留视图逻辑，领域逻辑（aggregateStatus、statusLabel）抽取到共享模块

### Touch

- 所有交互目标 `≥44px`（适配戴手套操作）
- `-webkit-tap-highlight-color: transparent`
- `touch-action: manipulation` 全局禁用双击缩放

### Motion

- 仅使用 `transform` 和 `opacity` 过渡（N2840 性能约束）
- 侧边栏展开/折叠：`width 0.2s ease`
- 按钮 hover/press：`background 0.1s, transform 0.1s`
- 模态弹窗：`opacity 0.15s ease-out`

### Interaction

- Press 反馈：`transform: scale(0.92)` 或 `scale(0.97)`
- Hover：仅 `@media (hover: hover)` 下生效
- Focus visible：`2px solid --color-primary`，`offset: 2px`

### Theme

- 默认亮色，支持 `html.dark` 自动切换
- 语义色（ok/error）亮暗主题保持一致
- 离线色暗色下加深以保持可辨识

### Performance

目标硬件 N2840（Bay Trail 4GB DDR3 + 集成 GPU）：

- CSS `contain: layout style` 应用于 Sidebar、MainContent、ModalPanel — 局部变更不触发全局 re-layout
- 禁止运行时 `color-mix()`：所有半透明背景预计算为 CSS 变量（`--color-*-bg`）
- `box-shadow` 模糊半径 ≤12px — 降低集成 GPU paint 开销
- 动画属性限定为 `transform` / `opacity` — GPU 合成层，不触发 paint/layout
