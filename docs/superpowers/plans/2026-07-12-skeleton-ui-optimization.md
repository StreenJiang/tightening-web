# 骨架 UI 优化 — 实现计划（已完成）

> **状态**: 已实现，构建通过

## 实际改动清单

| # | 内容 | 文件 |
|---|------|------|
| 1 | 菜单图标调整 | `src/router/index.ts` |
| 2 | 独立页面组件 | `src/modules/*Page.vue` (6 new) |
| 3 | 设备数据重构 + 预计算聚合状态 | `src/layout/FooterBar.vue` |
| 4 | DeviceIndicator 44px + click emit + warning | `src/shared/components/DeviceIndicator.vue` |
| 5 | DeviceDetailModal（标题栏 + 实例列表 + ARIA + 焦点修复） | `src/shared/components/DeviceDetailModal.vue` (new) |
| 6 | CSS 变量（footer, overlay, warning, 预计算背景） | `src/style.css` |
| 7 | 共享设备类型 + aggregateStatus + statusLabel | `src/shared/types/device.ts` (new) |
| 8 | 菜单标签 | `src/locales/zh-CN.json`, `en.json` |
| 9 | 领域术语修正 | `CONTEXT.md` |
| 10 | 设计令牌文档 | `DESIGN.md` (new) |

## 关键技术决策

- 聚合状态：全 ok→绿，全 error→红，全 offline→灰，混合→橙
- 弹窗 header：设备身份组（8px gap）+ 状态 tag（14px gap），52px 固定高度
- 状态 tag pill 背景：`rgba()` 预计算 CSS 变量替代 `color-mix()`（N2840 性能）
- 状态文字：共享 `statusLabel()` 查找表，3 处统一
- 聚合逻辑：单次遍历 `for` 循环，跨组件复用
- FooterBar 预计算 `groupSnapshots`，1 秒时钟渲染零重算
- Modal 焦点：`watch(visible)` 替代 `onMounted`，正确捕获触发按钮
- 每个路由独立懒加载页面组件
