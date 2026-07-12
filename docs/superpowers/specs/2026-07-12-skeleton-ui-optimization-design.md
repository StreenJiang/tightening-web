# 骨架 UI 优化 — 设计文档

**日期**: 2026-07-12
**状态**: 已实现

---

## 背景

项目处于初始脚手架阶段，对菜单图标、设备状态栏、设备弹窗、路由页面进行骨架优化。

## 最终设计

### 1. 菜单图标

| 菜单项 | 图标 | 说明 |
|--------|------|------|
| 工作台 | `mdi:monitor-screenshot` | 操作工拧紧操作界面 |
| 任务管理 | `mdi:clipboard-text-outline` | 任务创建/追踪 |
| 站点管理 | `mdi:worker` | 产线物理工位 |
| 数据分析 | `mdi:chart-bar` | 统计报表 |
| 设备管理 | `mdi:cog` | 设备注册/校准 |
| 系统集成 | `mdi:connection` | MES/PLC 对接 |

### 2. 设备状态栏

每个设备类型可包含多个实例，底部图标显示聚合状态：

| 聚合规则 | 图标颜色 |
|----------|----------|
| 全部正常 | 绿 (`ok`) |
| 全部异常 | 红 (`error`) |
| 全部离线 | 灰 (`offline`) |
| 混合状态 | 橙 (`warning`) |

新增 `--color-status-warning`（亮色 `#f59e0b` / 暗色 `#fbbf24`）。

模拟数据：拧紧枪 2 台 ok，控制器 1 ok + 1 error，PLC 1 ok，MES 1 offline，扫描枪 2 error。五种状态全部覆盖。

### 3. 设备弹窗

- 标题栏：设备图标（金色 18px）+ 设备名（15px/600）+ 聚合状态 tag pill（色点 + 文字，12% 透明背景）
- 内容区：实例列表（色点 + 名称 + 状态文字），行高 48px，底部分割线
- 交互：遮罩关闭 + X 按钮关闭 + Escape 键 + 焦点管理
- ARIA：`role="dialog"` + `aria-modal="true"`
- 适配：`max-width: 90vw; max-height: 80vh`，header 固定 52px
- 动画：opacity 0.15s ease-out
- 触摸：X 按钮 44×44，DeviceIndicator 44×44

### 4. 触摸目标 & 布局

- DeviceIndicator：32→44px，图标 20→22px
- `--footer-height`：44→52px
- 全部交互目标 ≥44px

### 5. 路由页面

每个模块使用独立懒加载页面组件（`WorkplacePage.vue` 等），不再共享单一占位页面。

### 6. N2840 性能优化

- CSS `contain: layout style` 锁住 Sidebar、MainContent、ModalPanel 布局边界
- 全部 `color-mix()` 替换为预计算 rgba CSS 变量，消除运行时颜色混合
- `box-shadow` 模糊半径从 24px 降至 12px
- 零视觉变化，纯底层优化

### 7. 代码简化（/simplify）

- 共享类型文件 `src/shared/types/device.ts` — `DeviceStatus`/`DeviceInstance`/`DeviceGroup` 统一导出
- `aggregateStatus()` — 单次遍历替代 3 次 `.every()`，跨组件复用
- `statusLabel()` — 查找表替代 3 处内联三元式
- FooterBar 预计算 `groupSnapshots` — 静态数据不随 1 秒时钟渲染重算
- Modal 焦点管理 `onMounted` → `watch(visible)` — `previousFocus` 现在正确指向触发按钮

## 涉及文件

| 文件 | 操作 |
|------|------|
| `src/router/index.ts` | 修改图标 + 独立页面组件 |
| `src/style.css` | `--footer-height`, `--color-modal-overlay`, `--color-status-warning` |
| `src/layout/FooterBar.vue` | DeviceGroup + 预计算状态 + 弹窗接入 |
| `src/shared/components/DeviceIndicator.vue` | click emit + 44px + warning + statusLabel |
| `src/shared/components/DeviceDetailModal.vue` | 新建：标题栏 + 实例列表 + ARIA + 焦点修复 + Esc |
| `src/shared/types/device.ts` | 新建设备类型 + aggregateStatus + statusLabel |
| `src/modules/{Workplace,Mission,Workstation,Analysis,Device,Integration}Page.vue` | 新建 6 个独立占位页面 |
| `src/locales/zh-CN.json` | `workstation`: "站点" → "站点管理" |
| `src/locales/en.json` | `workstation`: "Workstation" → "Stations" |
| `CONTEXT.md` | 修正工作台/站点定义 |
| `DESIGN.md` | 新建设计令牌文档 |
