# Mission List 面包屑 & DataView 重新设计 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Mission 列表页从表格式改为 DataView 网格卡片布局，为 Mission 页面添加面包屑导航，分页改用 PrimeVue Paginator，主题切换简化为单击按钮，连接状态指示器优化，修正暗色模式。

**Architecture:** 变更覆盖 7 个文件——CLAUDE.md 文档更新、main.ts darkModeSelector 修正、TopBar 主题简化 + 连接状态优化、i18n key 新增、MissionEditPage 加面包屑、MissionListPage 全面重写（DataView 网格 + 面包屑 + Paginator + 搜索空状态）。store/router/api 层不变。

**Tech Stack:** Vue 3.5 + TypeScript + PrimeVue v4 (Aura styled) + vue-i18n + Pinia

## Global Constraints

- 所有 UI 组件使用 PrimeVue v4 styled 模式（非 unstyled）
- 组件微调优先级：pt 属性 > Design Token > 原生 props > scoped CSS
- i18n key 命名沿用现有点分隔惯例
- 中英文 locale 文件同步更新
- 路由结构不变、store API 不变、主题 preset 不变

---

### Task 1: 更新 CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**变更内容：**
- 新增 "PrimeVue 使用规范" 章节（styled 模式、pt > Token > props > CSS 优先级）
- 更新技术栈（补充 PrimeVue 4、Vue Router、Pinia、vue-i18n）
- 更新项目结构（反映实际目录 layout/modules/router/shared/stores/theme/locales）
- 更新当前状态（移除"尚未添加路由"等过时描述）

---

### Task 2: 新增 i18n key

**Files:**
- Modify: `src/locales/zh-CN.json`
- Modify: `src/locales/en.json`

**新增 key：**

| Key | zh-CN | en |
|-----|-------|-----|
| `breadcrumb.mission` | 任务管理 | Mission |
| `breadcrumb.missionList` | 任务列表 | Mission List |
| `breadcrumb.missionNew` | 新建任务 | New Mission |
| `breadcrumb.missionEdit` | 编辑任务 | Edit Mission |
| `mission.list.noResult` | 未找到匹配的任务 | No matching missions found |

---

### Task 3: MissionEditPage 添加面包屑

**Files:**
- Modify: `src/modules/mission/MissionEditPage.vue`

**变更内容：**
- 引入 `Breadcrumb from 'primevue/breadcrumb'`
- `goToMissionList` / `breadcrumbNoop` 稳定函数（避免 computed 内每次重建箭头函数）
- 三级面包屑结构（`computed` 响应语言切换）：

```ts
function goToMissionList(e: { originalEvent: Event }) {
  router.push('/mission')
  e.originalEvent.preventDefault()
}
function breadcrumbNoop(e: { originalEvent: Event }) {
  e.originalEvent.preventDefault()
}

const breadcrumbItems = computed(() => [
  { label: t('breadcrumb.mission'), command: goToMissionList },
  { label: t('breadcrumb.missionList'), command: goToMissionList },
  { label: isEdit ? t('breadcrumb.missionEdit') : t('breadcrumb.missionNew'), command: breadcrumbNoop },
])
```

- 模板顶部添加 `<Breadcrumb :model="breadcrumbItems" class="edit-breadcrumb" />`
- 面包屑 CSS 重置（padding/background/border → 0/transparent/none）

---

### Task 4: MissionListPage 全面重写

**Files:**
- Modify: `src/modules/mission/MissionListPage.vue`

**变更内容：**

#### Script
- 组件导入：DataView, Breadcrumb, Paginator, ToggleSwitch, InputText, IconField, InputIcon, Button
- 模块级常量：`ROWS_PER_PAGE`、`dataviewPt`
- `breadcrumbItems`（`computed`，响应语言切换，两级结构）
- `paginatorFirst`（`computed`，1-based→0-based 转换）
- `onPageChange` 处理分页、同步 URL query
- 搜索防抖 300ms

#### Template
- **面包屑**：两级，当前页 "任务列表" 不可点击
- **搜索工具栏**：IconField + InputText（`flex: 1; max-width: 480px`）+ 新建按钮
- **骨架屏**：网格布局，缩略图 + 文字行占位
- **空状态**：
  - 搜索无结果 → 搜索图标 + "未找到匹配的任务"
  - 无搜索无数据 → 剪贴板图标 + "暂无任务" + 新建按钮
- **DataView 网格**：`layout="grid"`，`:pt="dataviewPt"` 设内部容器透明
- **卡片**：垂直布局，缩略图（4:3, position:relative），点检徽章（右上角 absolute），名称，footer（ToggleSwitch + 编辑/删除按钮）
- **Paginator**：`always-show`，复用常量 `ROWS_PER_PAGE`

#### Style
- CSS 变量 `--card-grid-cols` 定义在 `.list-page`，`.mission-grid` 和 `.skeleton-list` 共享
- 默认 `minmax(210px, 1fr)`，`@media (min-width: 1800px)` → `minmax(280px, 1fr)`
- 点检徽章使用 `var(--p-highlight-color)` / `var(--p-highlight-background)` 设计令牌
- 卡片 hover：边框高亮 + 阴影浮起
- DataView 内部容器通过 `pt` 设为透明（避免白底）

---

### Task 5: 主题切换简化

**Files:**
- Modify: `src/layout/TopBar.vue`

**变更内容：**
- 移除 Popover + 三模式选择按钮
- 替换为单击 toggle：`toggleTheme()` → 暗→亮，其他→暗
- 图标：`computed` 根据 `theme.mode === 'dark'` 切换太阳/月亮

---

### Task 6: darkModeSelector 修正

**Files:**
- Modify: `src/main.ts`

**变更内容：**
- `darkModeSelector: 'html.dark'` → `darkModeSelector: '.dark'`
- 根因：`html.dark` 触发 CSS Nesting 生成 `html.dark :root`（后代选择器），`:root` 不可能嵌套在自身内，暗色规则永不匹配
- `.dark` 生成 `.dark{...}` 规则，正确继承到所有子元素

---

### Task 7: 连接状态指示器优化

**Files:**
- Modify: `src/layout/TopBar.vue`

**变更内容：**
- 连接状态按钮：彩色圆点 + 文字标签，包裹在 `Button` 中
- `CONN_LABEL_KEYS` 静态映射提到模块作用域，`connLabel` computed 只做 `t()` 调用
- `connDialogTitle` computed 动态标题（connected 用"已连接"，否则用"连接状态"）
- 点击弹窗：connected（地址+延迟+关闭）、disconnected（原因+重连）、unconfigured（配置弹窗）
- 重复内联样式提取为 `.status-detail` CSS 类
- Dialog 宽度固定 380px
