# i18n 全覆盖 + 远程服务器连接状态

**日期**: 2026-07-12
**状态**: 已实现

## 概述

两个任务：

1. **i18n 全覆盖** — 修复 `statusLabel()` 和关闭按钮的硬编码中文
2. **远程服务器连接状态** — TopBar 标题旁新增连接状态指示器 + 配置/状态弹窗

## 实际实现

### 文件变更

```
src/
├── locales/
│   ├── zh-CN.json          ✏️ +26 keys (device.status.*, server.*, common.close)
│   └── en.json             ✏️ 同上
├── shared/
│   ├── types/
│   │   └── device.ts       ✏️ statusLabel() 返回 i18n key 路径
│   ├── components/
│   │   ├── DeviceDetailModal.vue  ✏️ t() 包裹 + :title="t('common.close')"
│   │   ├── DeviceIndicator.vue    ✏️ title 用 t() 包裹
│   │   ├── ConnectionIndicator.vue  ✨ 状态圆点 + 文字，纯 CSS 圆点
│   │   ├── ServerConfigModal.vue    ✨ 未配置弹窗
│   │   └── ConnectionStatusModal.vue ✨ 未连接弹窗
│   └── stores/
│       └── serverConnection.ts  ✨ Pinia store + dev mock
├── layout/
│   ├── TopBar.vue          ✏️ 集成 Indicator + 弹窗 + onMounted fetchStatus
│   └── Sidebar.vue         ✏️ .sidebar-link 加 user-select: none
└── style.css               ✏️ 全局 button 加 user-select: none; a 保持可选
```

### i18n Key 清单

| 分组 | Key | zh-CN | en |
|------|-----|-------|-----|
| common | close | 关闭 | Close |
| device.status | ok | 正常 | Normal |
| | error | 连接异常 | Error |
| | warning | 部分异常 | Warning |
| | offline | 未配置 | Offline |
| server | connected | 远程服务器已连接 | Remote Server Connected |
| | disconnected | 远程服务器未连接 | Remote Server Disconnected |
| | unconfigured | 远程服务器未配置 | Remote Server Unconfigured |
| | connecting | 远程服务器连接中... | Remote Server Connecting... |
| | address | 服务器地址 | Server Address |
| | addressPlaceholder | 请输入服务器地址 | Enter server address |
| | testConnection | 测试连接 | Test Connection |
| | testing | 测试中... | Testing... |
| | testSuccess | 连接成功 | Connection Successful |
| | testFailed | 连接失败 | Connection Failed |
| | testFailedDetail | 连接失败：{reason} | Connection Failed: {reason} |
| | saveFailed | 保存失败 | Save Failed |
| | reconnectFailed | 重连失败 | Reconnect Failed |
| | save | 保存 | Save |
| | configureTitle | 配置远程服务器 | Configure Server |
| | disconnectTitle | 服务器连接状态 | Server Connection Status |
| | reason | 断开原因 | Reason |
| | manualReconnect | 手动重连 | Reconnect |
| | latency | 延迟 | Latency |
| | latencyValue | 延迟 {n}ms | {n}ms latency |

### 数据流

```
App mount (TopBar onMounted)
    ↓ conn.fetchStatus()
serverConnection store
    ├── dev (API_BASE='') → mock 3s 延迟 → connected (192.168.1.100:8080, 12ms)
    └── prod → GET /api/server/status
    ↓ reactive state
ConnectionIndicator (TopBar 标题右侧，纯色圆点)
    ├── loading    → 灰色圆点呼吸 + "远程服务器连接中..."
    ├── connected  → 绿色圆点 + "远程服务器已连接"，hover tooltip 显示地址+延迟
    ├── disconnected → 黄色圆点 + "远程服务器未连接"，点击打开 ConnectionStatusModal
    └── unconfigured → 灰色圆点 + "远程服务器未配置"，点击打开 ServerConfigModal
```

### ConnectionIndicator

- **视觉**: 10px 纯色圆点（`border-radius: 50%`）+ 文字标签
- **颜色**: 使用现有 CSS 语义变量 (`--color-status-ok/warning/offline`)
- **loading**: 灰色圆点，`opacity` 脉冲动画（`0.35 ↔ 1`）
- **触控**: `min-height: 44px`，`font-size: 13px`
- **文字**: 始终可选（`user-select: none` 仅作用于父级 `<button>`）
- 使用 `usePointerPress` composable 提供 press 反馈

### ServerConfigModal

- **触发**: `unconfigured` 状态点击
- **内容**: 标题 + 地址输入框 + 测试连接按钮 + 保存按钮
- **状态流**: idle → testing → success/fail
  - 初始: 输入框可用，保存按钮 disabled
  - 测试成功: 绿色提示 + 保存按钮可用
  - 测试失败: 红色提示 + 原因（通过 `testFailedDetail` key 含 `{reason}` 参数，避免硬编码冒号）
  - 保存失败: 红色 `t('server.saveFailed')` 提示（与测试反馈同位置）
- **焦点**: `watch(visible)` 控制，打开聚焦关闭按钮，关闭归还焦点
- **关闭**: Escape / overlay 点击 / 关闭按钮
- `canSave` 为 `computed`（非函数），依赖 `testResult` + `saving`

### ConnectionStatusModal

- **触发**: `disconnected` 状态点击
- **内容**: 标题 + 警告图标 + 断开原因 + 手动重连按钮
- **重连**: 调用 `store.reconnect()`，失败时显示 `t('server.reconnectFailed')` 红色提示
- **焦点/关闭**: 同 ServerConfigModal

### serverConnection Store

- **状态**: `status` (loading/connected/disconnected/unconfigured), `address`, `latency`, `errorReason`
- **Actions**: `fetchStatus()`, `saveConfig(address)`, `testConnection(address)`, `reconnect()`
- **Dev Mock**: `API_BASE = ''` + `MOCK_DELAY = 3000` — fetchStatus 延迟 3s 返回 connected mock 数据；testConnection 延迟 1.5s 返回成功
- **Prod**: 接管 `API_BASE` 常量，所有 fetch 使用 `API_BASE` 前缀
- **错误处理**: fetchStatus catch → `unconfigured`；saveConfig/reconnect 错误上抛给调用方

### TopBar 布局微调

- 左右 padding: `8px → 12px`
- `.topbar-left` gap: `4px → 8px`
- 全局 `button` 添加 `user-select: none`
- 标题 `font-size: 16px font-weight: 600`

## 设计约束（已遵守）

- 所有交互目标 ≥44px ✓
- 动画仅 opacity/transform ✓
- 弹窗 Teleport + modal-fade 过渡 ✓
- 颜色仅使用现有 CSS 语义变量 ✓
- fetchStatus 失败 fallback 为 unconfigured ✓
- 前端不做轮询 ✓
