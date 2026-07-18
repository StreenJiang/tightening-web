# Mission List 面包屑 & DataView 重新设计方案

**日期**: 2026-07-18

---

## 概述

1. 更新 CLAUDE.md，明确 PrimeVue styled 组件使用规范
2. Mission 页面添加面包屑导航
3. Mission 列表从表格式改为 DataView 网格卡片
4. 分页从自定义按钮改为 PrimeVue Paginator
5. 主题切换简化为单击按钮
6. 搜索空状态与无数据空状态分离
7. 暗色模式 `darkModeSelector` 修正
8. 连接状态指示器优化（圆点 + 标签 + 点击弹窗）

---

## 1. CLAUDE.md 更新

- 新增 **"PrimeVue 使用规范"** 一节
- 更新"项目结构"和"当前状态"，反映路由、状态管理、i18n 等已有基础设施

### PrimeVue 使用规范

- 所有 UI 组件统一使用 PrimeVue v4 **styled 模式**（非 unstyled）
- 组件微调优先级：**pt 属性 > Design Token > 原生 props（severity/size/variant） > scoped CSS**
- 只有 PrimeVue 原生方式无法实现时，才使用 scoped CSS
- 全局主题变量定义在 `src/theme/preset.ts`，通过 `definePreset` 扩展 Aura

---

## 2. 面包屑导航

### 组件选型

使用 PrimeVue `Breadcrumb` 组件。

### 位置

主内容区顶部，页面内容上方。

### 路径结构

**列表页**（两级，均不可跳转——已在当前页）：
- 任务管理 › 任务列表

**编辑/新建页**（三级）：
- 任务管理 › 任务列表 › 编辑任务（或 新建任务）
- "任务管理"和"任务列表"均可点击，跳回 `/mission`

### 实现细节

- PrimeVue Breadcrumb 每个 item 渲染为 `<a>` 标签，无 `url` 时默认 `href="#"`，必须 `preventDefault` 拦截
- `command` 回调函数提取为 setup 作用域稳定引用（`goToMissionList` / `breadcrumbNoop`），避免 computed 中每次重建内联箭头函数
- 列表页：两级均不可跳转（已在当前页）；编辑/新建页：前两级可跳回 `/mission`，第三级不可点击

---

## 3. DataView 网格卡片

### 组件选型

PrimeVue `DataView`，`layout="grid"`，自定义 `#grid` 插槽。

### 卡片结构（垂直布局）

```
┌──────────────────┐
│ ┌──────────────┐ │
│ │              │ │
│ │    缩略图    │ │  ← 4:3 比例，铺满卡片宽度
│ │              │ │
│ │  [点检徽章]  │ │  ← 右上角绝对定位
│ └──────────────┘ │
│   任务名称       │
│   [Toggle][✏️][🗑️]│
└──────────────────┘
```

### 网格布局

- `grid-template-columns` 通过 CSS 变量 `--card-grid-cols` 统一控制
- 默认 `repeat(auto-fill, minmax(210px, 1fr))`
- ≥1800px `repeat(auto-fill, minmax(280px, 1fr))`
- DataView 内部容器背景通过 `pt` 设为透明

### 点检标签

- 使用 `var(--p-highlight-color)` + `var(--p-highlight-background)` 设计令牌，亮/暗自动适配
- 绝对定位在缩略图右上角

### 交互

- 点击整卡 → 进入编辑页
- 点击 ToggleSwitch / 编辑 / 删除 → `@click.stop` 不触发整卡跳转
- 悬停 → 边框高亮 + 阴影浮起

---

## 4. Paginator 分页

### 组件选型

PrimeVue `Paginator`，配置 `:always-show="true"`（PrimeVue 默认在单页时隐藏整个组件）。

### Props 绑定

```ts
const paginatorFirst = computed(() => (store.pagination.page - 1) * store.pagination.size)
```

```vue
<Paginator
  v-if="store.missions.length > 0"
  :rows="store.pagination.size"
  :total-records="store.pagination.total || store.missions.length"
  :first="paginatorFirst"
  :rows-per-page-options="ROWS_PER_PAGE"
  :always-show="true"
  @page="onPageChange"
/>
```

---

## 5. 主题切换

- 由三模式 Popover（亮/暗/系统）简化为单击按钮
- 单击切换：暗→亮，其他→暗
- 图标：暗色模式显示太阳（切亮），亮色模式显示月亮（切暗）

---

## 6. 搜索空状态

- 有搜索关键词但无结果：显示搜索图标 + "未找到匹配的任务"（无新建按钮）
- 无搜索且无数据：显示剪贴板图标 + "暂无任务" + 引导新建按钮

---

## 7. 连接状态指示器

### 结构

- 彩色圆点（绿/红/黄/蓝）+ 文字标签，包裹在 PrimeVue `Button` 中
- 圆点通过 `conn-dot` + `conn-dot--{status}` CSS 类控制颜色
- 按钮 `gap: 4px` 控制图标与标签间距

### 交互

- **connected** → Dialog 显示绿色勾、地址、延迟、关闭按钮
- **disconnected** → Dialog 显示黄色警告、错误原因、重连按钮
- **unconfigured** → Dialog 跳转服务器配置弹窗
- Dialog 标题通过 `connDialogTitle` computed 动态切换

### 代码质量

- `CONN_LABEL_KEYS` 静态映射提到模块作用域，`connLabel` computed 只做 `t()` 调用
- Dialog 内重复内联样式提取为 `.status-detail` CSS 类

---

## 8. 暗色模式修正

**根因**：`darkModeSelector: 'html.dark'` 触发 CSS Nesting，浏览器解析为 `html.dark :root`（后代选择器）。`:root` 是 `<html>` 自身，不可能是后代的 `<html class="dark">` → 暗色规则永不匹配。

**修复**：改为 `darkModeSelector: '.dark'`，生成 `.dark{...}` 规则，正确匹配 `<html class="dark">`。

---

## 涉及文件

| 文件 | 变更 |
|------|------|
| `CLAUDE.md` | PrimeVue 规范 + 项目描述更新 |
| `src/main.ts` | `darkModeSelector` 修正 (`.dark`) |
| `src/layout/TopBar.vue` | 主题切换简化 + 连接状态指示器优化 |
| `src/modules/mission/MissionListPage.vue` | DataView 网格 + 面包屑 + Paginator + 搜索空状态 |
| `src/modules/mission/MissionEditPage.vue` | 面包屑（三级，命令函数提取） |
| `src/locales/zh-CN.json` | 新增 breadcrumb + noResult key |
| `src/locales/en.json` | 新增 breadcrumb + noResult key |

---

## 不变项

- 路由结构不变
- Mission store API 不变
- MissionEditPage 核心逻辑（表单、保存、脏检查）不变
- 主题 preset 不变
- MainLayout / Sidebar / FooterBar 不变
