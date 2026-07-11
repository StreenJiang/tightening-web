# 拧紧流程控制系统 — 项目骨架设计

> 日期：2026-07-11 | 阶段：骨架搭建 | 状态：已实现

## 1. 概述

搭建 `tightening-web` 前端项目骨架，为后续模块开发提供统一的基础框架。本期不实现任何业务逻辑。

### 1.1 目标机器

N2840 工控主板 + 4GB DDR3 + 64GB SSD，应用本地运行（工控机浏览器打开 `localhost`），后续与中心 MES 服务器有交互。显示设备为 10-15 寸工控屏（典型 1024×768 或 1280×1024）。

### 1.2 设计原则

- **六标准：** 高可维护性、高可读性、高内聚、低耦合、高性能、轻量。YAGNI 默认立场。
- **触摸优先：** 触摸反馈用 JS `pointerdown/up` + `.pressed` class + `scale()`，不依赖 CSS `:active`。hover 仅 `@media (hover: hover)` 下生效。全局 `button` 统一 `touch-action: manipulation` + `-webkit-tap-highlight-color: transparent`。
- PRODUCT.md 定义了品牌个性（现代简洁 + 工业高端黄）、反参考、无障碍要求。

## 2. 技术栈

| 项 | 选型 | 说明 |
|---|------|------|
| 框架 | Vue 3.5 + Composition API | |
| 语言 | TypeScript 6.0（erasableSyntaxOnly） | |
| 构建 | Vite 8 + Rolldown | |
| 路由 | Vue Router 4 | hash mode |
| 状态管理 | Pinia | sidebar + theme 两个 store |
| 国际化 | vue-i18n | 中英双语 |
| 图标 | @iconify/vue + @iconify-json/mdi | |
| UI 组件库 | **无** | 手写 CSS |
| CSS | CSS 变量 + `html.dark` class | 亮色/暗色/跟随系统三种模式 |

## 3. 目录结构（当前实现）

```
src/
├── layout/
│   ├── MainLayout.vue       # 顶栏 + 侧边栏 + 内容区 + 底栏（42 行）
│   ├── Sidebar.vue          # 菜单渲染 + 折叠浮层 + 淡出（243 行）
│   ├── TopBar.vue           # 标题 + 主题下拉 + 语言切换（154 行）
│   └── FooterBar.vue        # 时钟 + 设备状态指示器（77 行）
├── router/
│   └── index.ts             # MODULES.map() 生成 6 路由 + 404（36 行）
├── stores/
│   ├── sidebar.ts           # 折叠状态 + localStorage（32 行）
│   └── theme.ts             # setMode() + matchMedia + onUnmounted 清理（38 行）
├── locales/
│   ├── zh-CN.json           # 中文
│   └── en.json              # 英文
├── i18n.ts                  # vue-i18n 实例（15 行）
├── shared/
│   ├── components/
│   │   ├── IconButton.vue       # 通用图标按钮（30 行）
│   │   ├── MenuItem.vue         # 菜单选项（28 行）
│   │   ├── DeviceIndicator.vue  # 设备状态方块（30 行）
│   │   └── PlaceholderCard.vue  # 占位卡片（46 行）
│   └── composables/
│       └── usePointerPress.ts   # 触摸按压状态（6 行）
├── modules/
│   ├── ModulePlaceholderPage.vue # 统一占位页，读 route.meta（18 行）
│   └── NotFoundPage.vue          # 404 页面（74 行）
├── App.vue                  # <router-view />（6 行）
├── main.ts                  # createApp + plugins（12 行）
└── style.css                # CSS 变量 + 暗色模式 + 全局重置（92 行）

总计：20 个源文件，979 行代码
```

## 4. 布局架构

侧边栏 + 顶栏 + 底栏常驻布局：

```
┌──────────────────────────────────────────────┐
│  顶栏 (TopBar)        [主题▼] [EN/中] [用户]   │ 56px
├──────────┬───────────────────────────────────┤
│ 侧边栏   │  内容区                            │ flex: 1
│ 220/60px │  <router-view>                    │
├──────────┴───────────────────────────────────┤
│  底栏 (FooterBar)    [时间]  [扳手][芯片]...   │ 44px
└──────────────────────────────────────────────┘
```

`ModulePlaceholderPage` 统一居中布局（`height: 100%` + flex center），最小分辨率（1024×768）下无滚动条。

### 4.1 侧边栏

- **展开态：** 220px，图标 + i18n 文字，当前路由高亮（`--color-sidebar-active` 金色背景）
- **折叠态：** 60px，仅图标。悬停弹出浮层（`getBoundingClientRect()` 动态定位），移开立即消失
- **点击淡出：** 折叠态点击菜单项 → 浮层保持 1.2s → 0.8s CSS opacity 淡出 → DOM 移除。期间 `clickLocked` 锁保护不被鼠标事件中断；`onMouseEnter` 可切换浮层内容并重置计时
- **默认状态：** localStorage 持久化，首次展开
- **右侧分隔：** 1px `var(--color-sidebar-border)`
- **触摸反馈：** `usePointerPress` composable + `scale(0.97)`

### 4.2 顶栏

- **左侧：** `IconButton` 折叠按钮 + i18n 标题
- **右侧：**
  - `IconButton` 主题下拉 —— 点击弹出三个 `MenuItem`（亮色/暗色/跟随系统），`getBoundingClientRect()` 动态定位，点击外部关闭
  - `IconButton` 语言切换 —— 显示 `EN`/`中` 文字标签
  - `IconButton` 用户头像占位
- **亮色模式：** 顶栏与内容区同色（`--color-topbar-bg: #fafafa`），底部 1px 线分隔
- **暗色模式：** 顶栏与侧边栏统一深色（`#18181b`）

### 4.3 底栏

- **高度：** 44px
- **左侧：** 实时时钟（`setInterval` 每秒更新，`font-mono`）
- **右侧：** 5 个 `DeviceIndicator`，间距 6px
  - 32×32 圆角正方形（`border-radius: 7px`），背景 `var(--color-surface)`
  - 图标 20px，颜色表状态：`--color-status-offline`（灰）、`--color-status-ok`（绿）、`--color-status-error`（红）
  - 骨架期全部 `offline`（灰色）
  - `title` 属性显示设备名和状态文字
- **触摸反馈：** `usePointerPress` + `scale(0.92)`

## 5. 主题

`useThemeStore`（Pinia setup store），`setMode(m)` 切换，localStorage 持久化：

| 模式 | `html` 状态 | 行为 |
|------|------------|------|
| `light` | 无 `.dark` class | `:root` 变量生效 |
| `dark` | 添加 `.dark` class | 覆盖为暗色变量 |
| `system` | 跟随 `matchMedia('(prefers-color-scheme: dark)')` | 监听 `change` 事件，`onUnmounted` 清理 |

### 5.1 色板

工业金黄主色调（`#c49700` 亮 / `#e8b830` 暗）。亮色模式全界面浅色系，暗色模式全暗。

| Token | 亮色 | 暗色 |
|-------|------|------|
| `--color-bg` | `#fafafa` | `#18181b` |
| `--color-primary` | `#c49700` | `#e8b830` |
| `--color-primary-hover` | `#a87e00` | `#f0c840` |
| `--color-sidebar-bg` | `#f3f2ef` | `#1c1c1f` |
| `--color-topbar-bg` | `#fafafa` | `#18181b` |
| `--color-footer-bg` | `#f4f4f2` | `#1c1c1f` |
| `--color-surface` | `#fcfcfb` | `#27272a` |

## 6. 路由设计

```typescript
// router/index.ts — 36 行，MODULES 数组 + .map() 生成路由
const MODULES = [
  { path: 'workplace',   name: 'Workplace',   icon: 'mdi:view-dashboard' },
  { path: 'mission',     name: 'Mission',     icon: 'mdi:clipboard-list' },
  { path: 'workstation', name: 'Workstation', icon: 'mdi:monitor-screenshot' },
  { path: 'analysis',    name: 'Analysis',    icon: 'mdi:chart-bar' },
  { path: 'device',      name: 'Device',      icon: 'mdi:cog' },
  { path: 'integration', name: 'Integration', icon: 'mdi:connection' },
]

const routes = [
  { path: '/', component: MainLayout, redirect: '/workplace',
    children: MODULES.map(m => ({
      path: m.path, name: m.name,
      meta: { titleKey: `menu.${m.path}`, icon: m.icon },
      component: () => import('@/modules/ModulePlaceholderPage.vue'),
    })),
  },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/modules/NotFoundPage.vue') },
]
```

- 所有 6 个模块共用 `ModulePlaceholderPage.vue`，从 `route.meta` 读取 `titleKey`/`icon`
- hash history mode，所有路由懒加载

## 7. 国际化

`vue-i18n`，默认 `zh-CN`，`fallbackLocale: 'zh-CN'`，中英双语完整翻译。

## 8. 共享组件

| 组件 | Props | 行数 | 用途 |
|------|-------|------|------|
| `IconButton` | `icon?`, `label?`, `title?` | 30 | 44px 通用图标按钮 |
| `MenuItem` | `icon?`, `label`, `active?` | 28 | 下拉菜单选项 |
| `DeviceIndicator` | `icon`, `label`, `status` | 30 | 32×32 设备状态方块 |
| `PlaceholderCard` | `titleKey`, `icon?` | 46 | 占位页面居中卡片 |

### 8.1 触摸反馈机制

`usePointerPress` composable（6 行）统一管理：`pressed` ref + `onDown()`/`onUp()`，三个按钮组件共用。Sidebar 的 `RouterLink` 内联 `pressedPath` 实现相同的 `.pressed` + `scale()` 模式。

全局 `button { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }` 消除触摸延迟和闪烁。`:focus-visible` 全局环。

## 9. 性能特征

- 构建产物 82KB gzipped（框架开销：Vue + Router + Pinia + i18n + iconify）
- 2 个懒加载 chunk：`ModulePlaceholderPage`（0.8KB）、`NotFoundPage`（0.7KB）
- 动画仅 CSS transform/opacity
- 触控目标 ≥ 44px（DeviceIndicator 例外：32px，footer 精度要求低）
- 小工控屏基准 1024×768

## 10. 验收标准

1. `npm run dev` 正常启动
2. 顶栏 + 侧边栏 + 内容区 + 底栏 完整显示，`<html lang="zh-CN">`
3. 侧边栏 6 个菜单项，中/英文切换正常
4. `ModulePlaceholderPage` 统一居中，最小分辨率无滚动条
5. 底栏时间每秒更新，5 个 DeviceIndicator（灰），上下左右间距 6px 一致
6. 侧边栏折叠/展开，折叠态悬停浮层对齐；点击后 1.2s 可见 → 0.8s 淡出消失
7. 所有按钮触摸按下有缩放反馈，松手恢复，不残留
8. 主题下拉 MenuItem × 3，点击外部关闭，选项有触摸反馈
9. 语言按钮显示 `EN`/`中`，切换后文字变化
10. 亮色模式全界面浅色，暗色模式全界面暗色
11. 404 路径显示 NotFoundPage
12. `npm run build`（`vue-tsc -b` + `vite build`）零错误
