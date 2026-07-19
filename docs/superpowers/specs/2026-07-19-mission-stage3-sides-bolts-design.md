# Mission Stage 3 — 产品面与螺栓编辑 设计文档

**日期**: 2026-07-19
**状态**: 设计完成，待实施

---

## 1. 背景

Stage 1 完成了任务列表 + 基础信息 CRUD，Stage 2 完成了子资源管理（前置任务、条码规则、巡检绑定）。Stage 3 按原始规划实现产品面（ProductSide）和螺栓（ProductBolt）编辑能力，包括图片上传、Canvas 编辑、螺栓点位标注。

### 1.1 后端接口

**读取：**

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `api/sides?missionId=` | 列出任务下所有面（不含图片 blob）|
| `GET` | `api/sides/{id}` | 单面基本信息 |
| `GET` | `api/sides/{sideId}/image?type=original\|rendered\|thumbnail` | 获取图片二进制 |
| `GET` | `api/bolts?sideId=` | 列出面下所有螺栓 |

**保存**（统一走 `POST/PUT api/missions`，multipart/form-data）：

- `dto` JSON（`ProductMissionSaveDTO`）已包含 `sides: List<ProductSideSaveItem>`，每个面含 `bolts: List<ProductBoltSaveItem>`
- 图片作为独立 multipart 文件字段，key 格式：`sides[0].image`、`sides[0].renderedImage`、`sides[0].thumbnail`（数组下标与 sides 列表对齐）
- 独立 POST/PUT/DELETE 端点：无（Stage 2 统一保存模式）

### 1.2 数据模型

```typescript
// ===== 产品面 =====
export interface ProductSide {
  id?: number
  productMissionId?: number
  name: string
  createTime?: string
  modifyTime?: string
}

// ===== 螺栓 =====
export interface ProductBolt {
  id?: number
  productSideId?: number
  boltSerialNum: number        // 序号，前端自动递增
  parameterSetId?: number      // PSet 程序号
  torqueMin?: number | null
  torqueMax?: number | null
  angleMin?: number | null
  angleMax?: number | null
  armLocation?: string         // 力臂坐标（文本）
  locationXPercent: number     // 百分比 0-100
  locationYPercent: number     // 百分比 0-100
}

// ===== Save Payload 扩展 =====
export interface ProductSideSaveItem {
  id?: number
  name: string
  clientRef?: string           // 前端 UUID，新面关联用
  bolts: ProductBoltSaveItem[]
}

export interface ProductBoltSaveItem {
  id?: number
  boltSerialNum: number
  parameterSetId?: number
  torqueMin?: number | null
  torqueMax?: number | null
  angleMin?: number | null
  angleMax?: number | null
  armLocation?: string
  locationXPercent: number
  locationYPercent: number
  partsBarcodes?: Array<{ id?: number; barCodeMatchingRuleId?: number; barcodeRuleRef?: string }>
}
```

### 1.3 关键业务规则

- 面数量：无上限，但实际客户基本只用 1 个面
- 螺栓数量：无上限
- 螺栓点位坐标始终为百分比（0-100），与图片缩放/旋转状态解耦
- 级联删除：删面时该面下所有螺栓一并提交删除（或不含在保存数据中）
- 图片三种类型：`original`（原图）、`rendered`（用户编辑后的图片）、`thumbnail`（缩略图）
- 图片上传大小上限：5MB（单个文件），超限 toast 提示 "图片大小不能超过 5MB"

---

## 2. 整体架构

### 2.1 文件结构（新增/修改）

```
src/
├── shared/
│   ├── types/mission.ts         ← 修改：追加 Side/Bolt 类型
│   └── api/mission.ts           ← 修改：追加 fetchSides/fetchSideImage/fetchBolts
├── modules/mission/
│   ├── components/
│   │   ├── SideCanvas.vue             ← 新建：Canvas 编辑器 + 螺栓标记层
│   │   ├── MissionSidesSection.vue    ← 新建：多面容器（Tab + Canvas 切换）
│   │   └── BoltPropertyDialog.vue     ← 新建：螺栓属性编辑弹窗
│   └── MissionEditPage.vue      ← 修改：集成 SidesSection + 暂存按钮 + FormData 扩展
└── locales/
    ├── zh-CN.json               ← 修改：追加 side.* / bolt.* 键
    └── en.json                  ← 修改：追加 side.* / bolt.* 键
```

### 2.2 组件关系

```
MissionEditPage.vue
├── MissionBasicForm.vue       (已有 — 3 张 Card)
├── MissionBarcodeCard.vue     (已有 — 条码规则 Card)
├── MissionPrereqCard.vue      (已有 — 前置任务 Card)
└── MissionSidesSection.vue    ← NEW — 全宽区段
    ├── Tab 栏（切面、新增面、重命名、删除面）
    └── SideCanvas.vue         ← 当前激活面
        ├── <canvas>           ← 图片显示 + 旋转/缩放/平移/裁剪
        └── <div> overlay      ← 螺栓圆形标记（DOM，显示序号）
            └── BoltPropertyDialog.vue  ← 双击创建后自动弹出，或点击标记弹出
```

### 2.3 页面布局

Sides Section 放在所有已有 Card 下方，**全宽展开**，突破右侧栏限制：

```
┌─ Breadcrumb ──────────────────────────────────────────────┐
├─ 顶栏：← │ 标题 │ [草稿] ───────────────────────────────┤
├───────────────────────────────────────────────────────────┤
│ ┌─ 左侧主区域 ──────────────┐ ┌─ 右侧栏 ────────────────┐│
│ │  基本属性 Card            │ │  元数据                  ││
│ │  执行控制 Card            │ │  创建时间                 ││
│ │  点检配置 Card            │ │  修改时间                 ││
│ │  条码规则 Card            │ │                          ││
│ │  前置任务 Card            │ │                          ││
│ └───────────────────────────┘ └──────────────────────────┘│
│                                                           │
│ ┌─ MissionSidesSection ──────────────────────────────────┐│
│ │  产品面                                   [+ 添加面]    ││
│ │  ─────────────────────────────────────────────────────  ││
│ │  ┌───────────┬───────────┐                             ││
│ │  │ ● 面-1 [×]│  面-2 [×] │    ← Tab 栏                 ││
│ │  └───────────┴───────────┘                             ││
│ │  ┌─────────────────────────────────────────────────┐   ││
│ │  │              Canvas + Bolt 标记层                 │   ││
│ │  │                                                  │   ││
│ │  │                🔴①     🔴②                       │   ││
│ │  │                                                  │   ││
│ │  └─────────────────────────────────────────────────┘   ││
│ └────────────────────────────────────────────────────────┘│
├───────────────────────────────────────────────────────────┤
│                              [暂存]    [取消]    [保存]    │
└───────────────────────────────────────────────────────────┘
```

底部按钮组：`[暂存]` / `[取消]` 间距 24px / `[保存]` 间距 12px。暂存为 outlined secondary，取消为 text secondary，保存为 filled primary。

---

## 3. SideCanvas — 核心交互组件

采用**混合方案**：Canvas 负责图片编辑，DOM overlay 负责螺栓标记交互。

### 3.1 Canvas 层（图片编辑）

**容器尺寸规则：**

- 宽度 = 撑满可用空间
- 高度 = `min(图片按宽度撑满时的高度, 容器当前宽度)`
- 简而言之：Canvas 是宽度上限的方形容器，对竖图 fit-to-contain，对横图自然撑开

**图片初始视图（首次加载 / 容器尺寸变化）：**

- 每次加载图片时（编辑页首次打开、切面、未来工作台展示），执行 fit-to-contain：等比缩放使图片完整居中显示在容器内
- 容器尺寸变化时（浏览器 resize、侧栏折叠/展开）：保持用户当前视图状态（缩放等级、平移偏移、旋转角度不变），不重置为 fit-to-contain。图片超出新边界的部分被自然裁剪

**用户操作（在初始视图基础上）：**

- **缩放**：鼠标滚轮 / 双指捏合
- **平移**：拖拽空白区域
- **旋转**：工具栏旋转按钮 / 手势
- **裁剪**：一键裁剪到当前视口——放大/平移后，点击裁剪按钮，当前可见区域即为裁剪结果，不可见区域被删除。裁剪边界自动受最外层螺栓点位 clamp，不允许裁掉任何点位（最外层点位是裁剪的天然最小边界）
- **工具栏**（浮在 Canvas 上方）：旋转按钮、缩放滑条、裁剪按钮、重置（回到初始 fit-to-contain 视图）
- **上传**：`<input type="file" accept="image/*">`，替换当前图片，Canvas 回到初始视图
- **导出**：保存时从 Canvas 导出为 PNG/JPG Blob 作为 `renderedImage`（基于裁剪后的视口区域）

### 3.2 Bolt 标记层（DOM overlay）

- 每个螺栓 = 绝对定位的**圆形** `<div>`，中心显示序号
- **创建**：Canvas 区域双击 → 在点击位置生成新标记（序号自动递增）→ 自动弹出 `BoltPropertyDialog`
- **拖拽**：按住标记可拖动，拖动结束后更新 `locationXPercent/YPercent`
- **点击**：打开 `BoltPropertyDialog` 编辑属性
- **删除**：删除螺栓后剩余标记序号自动重排（如 ①②③④⑤ 删 ② → ①②③④）
- **替换图片**：上传新图片后，已有螺栓点位保留（百分比坐标仍有效），Canvas 变换状态重置为默认
- 坐标始终以百分比存储（0-100），基于原始图片尺寸

### 3.3 坐标映射

```
DOM overlay 坐标 ↔ Canvas 变换矩阵 ↔ 原始图片百分比

保存时: 实时计算当前 overlay 位置 → 反算为百分比（基于原始图宽高）
加载时: 百分比 × 当前图片显示尺寸 → overlay 定位像素
缩放/旋转时: DOM 层坐标通过 Canvas transform matrix 实时重算
```

Canvas 变化（缩放/旋转/平移）触发 DOM 标记层通过 CSS `transform: matrix()` 同步变换。

### 3.4 状态机

```
无图片 ──[上传]──> 编辑中 ──[双击]──> 创建螺栓点位
                                │
                                ├──[拖动]──> 更新位置
                                └──[点击]──> 打开属性面板
```

---

## 4. BoltPropertyDialog — 螺栓属性弹窗

### 4.1 弹窗布局

字段按重要性排序：

```
┌─────────────────────────────────────┐
│  编辑螺栓 — ①                       │
│  ─────────────────────────────────  │
│  程序号 (PSet)   [______________]   │  ← autofocus
│                                     │
│  力臂坐标        [__________] [读取] │  ← 读取按钮预留，点击 toast "开发中"
│                                     │
│  扭矩范围                           │
│    最小 [_______] Nm               │
│    最大 [_______] Nm               │
│                                     │
│  角度范围                           │
│    最小 [_______] °                │
│    最大 [_______] °                │
│                                     │
│  物料条码        [添加物料条码]      │  ← 点击弹窗创建新条码规则，按钮 disabled 当无产品码时提示"必须先配置产品码"
│                                     │
│                      [删除]  [确定]  │
└─────────────────────────────────────┘
```

### 4.2 字段规格

| 字段 | 控件 | 必填 | 说明 |
|------|------|------|------|
| 程序号 (PSet) | InputNumber | 否 | 纯数字，自动 focus（适配扫码枪）|
| 力臂坐标 | InputText + Button | 否 | armLocation 文本，"读取"按钮预留 |
| 扭矩最小 | InputNumber | 否 | 不填 → `null` |
| 扭矩最大 | InputNumber | 否 | 不填 → `null` |
| 角度最小 | InputNumber | 否 | 不填 → `null` |
| 角度最大 | InputNumber | 否 | 不填 → `null` |
| 物料条码 | Button → Dialog | 否 | 创建新的条码规则（非引用已有），通过 clientRef 关联。产品追溯码不存在时按钮 disabled |

### 4.3 交互行为

- **创建时**：双击后立即打开，自动 focus 程序号输入框
- **编辑时**：点击标记打开，显示已有属性值
- **确定**：校验 PSet 为有效数字（非必填但若填了必须 ≥0），校验扭矩/角度的 min ≤ max（若同时填了），关闭弹窗并更新标记
- **删除**：弹出确认 "确定删除螺栓 ①？" → 移除标记 + 关闭面板
- 属性面板关闭后，标记保持选中态（可再次点击编辑）
- 属性数据存内存，随统一保存提交

---

## 5. MissionSidesSection — 多面容器

### 5.1 布局

- **header**："产品面" 标题 + `[+ 添加面]` 按钮
- **Tab 栏**：面名称 Tab，当前选中高亮
- **面操作**：双击 Tab 名称 → inline edit 重命名；× 按钮 → 确认后删除面
- **内容区**：当前激活面的 `SideCanvas`

### 5.2 交互细节

- 最小 1 个面不可删除，最多不限。新建任务默认 1 个命名为 "面-1" 的空面
- 切面时保存当前面的编辑状态（Canvas 变换状态 + 图片 + 螺栓列表）到内存
- 按需加载：仅加载当前激活面的图片和螺栓。切换到其他 Tab 时懒加载该面数据
- 每个面维护独立的 Canvas 状态和 bolt 列表
- 不同面的图片、螺栓完全隔离

---

## 6. 暂存与保存

### 6.1 暂存按钮

- 位置：底部操作栏，`[保存]` 左侧，与 `[取消]` 间距 24px
- 样式：`outlined severity="secondary"`
- 行为：调用 `saveMission`（完整 FormData 提交），但不跳转页面
- 成功 toast "已暂存"（2s），页面停留
- 失败 toast 报错信息，不跳转

### 6.2 保存流程

```
handleSave / handleDraftSave:
  1. 收集基础表单数据 (MissionBasicForm)
  2. 收集条码规则数据 (MissionBarcodeCard)
  3. 收集螺栓物料条码规则 (MissionSidesSection.getPartsBarcodeRules) → 合并到 barcodeRules
  4. 收集前置任务数据 (MissionPrereqCard)
  5. 收集面/螺栓数据 (MissionSidesSection + SideCanvas)
     - 螺栓坐标 → 百分比反算
     - Canvas 画面 → renderedImage Blob
     - 生成 thumbnail Blob
  5. 构建 ProductMissionSavePayload JSON
  6. 构建 FormData:
     fd.append('dto', JSON blob)
     for each side i:
       fd.append(`sides[${i}].image`, original file)
       fd.append(`sides[${i}].renderedImage`, canvas export blob)
       fd.append(`sides[${i}].thumbnail`, thumbnail blob)
  7. saveMission(payload, isEdit, sideImages)
  8. 用返回的 ProductMissionSaveDTO 中 side/bolt 的 ID 更新本地 state（暂存场景避免重复创建）
  9. 正式保存 → toast "保存成功" → router.push 回列表
  10. 暂存 → toast "已暂存" → 停留
```

### 6.3 脏状态检测

- 暂存成功后刷新快照，离开路由守卫仍然生效
- 如果暂存后未做任何修改 → 直接离开，无需确认
- 如果暂存后有修改 → 确认弹窗 "未保存的更改将丢失，确定离开？"

---

## 7. 状态覆盖

| 状态 | 处理 |
|------|------|
| **无图片** | Canvas 区域显示虚线框 + "点击上传产品面图片" + 上传按钮 |
| **图片加载中** | Canvas 区域 Skeleton 占位 |
| **图片加载失败** | 错误文字 + 重试按钮（`pi-refresh`）|
| **空螺栓** | Canvas overlay 引导文字 "双击图片创建螺栓点位" |
| **保存中** | 保存/暂存按钮 spinner + disabled + 文字变 "保存中..." / "暂存中..." |
| **保存成功** | Toast → router.push 回列表（正式保存）|
| **保存失败** | Toast 5s + 关闭按钮，页面不跳 |
| **暂存成功** | Toast 2s "已暂存"，页面停留 |
| **暂存失败** | Toast 5s，页面停留 |
| **面删除确认** | Dialog "确定删除面 {name}？将同时移除该面下的所有螺栓" |
| **螺栓删除确认** | Dialog "确定删除螺栓 {序号}？" |
| **面切换** | 切换 Tab 时本地切换，无需确认（内存切换）|
| **未保存离开** | 现有 Guard 逻辑不变（暂存后更新快照）|

---

## 8. API 层

### 8.1 新增函数

```typescript
// GET /api/sides?missionId=X
export function fetchSides(missionId: number): Promise<ProductSide[]>

// GET /api/sides/{sideId}/image?type=original|rendered|thumbnail
// 返回 Blob（用于 <canvas> 显示或 <img> src）
export function fetchSideImage(sideId: number, type: 'original' | 'rendered' | 'thumbnail'): Promise<Blob>

// GET /api/bolts?sideId=X
export function fetchBolts(sideId: number): Promise<ProductBolt[]>
```

### 8.2 修改现有函数

`saveMission` — 新增 `sideImages` 参数（可选），返回类型从 `string` 改为 `ProductMissionSaveDTO`（后端 save 接口现返回含 side/bolt 生成 ID 的 DTO）。

---

## 9. 类型定义

```typescript
// 新增到 shared/types/mission.ts

// ===== API 读取 =====
export interface ProductSide {
  id?: number
  productMissionId?: number
  name: string
  createTime?: string
  modifyTime?: string
}

export interface ProductBolt {
  id?: number
  productSideId?: number
  boltSerialNum: number
  parameterSetId?: number
  torqueMin?: number | null
  torqueMax?: number | null
  angleMin?: number | null
  angleMax?: number | null
  armLocation?: string
  locationXPercent: number
  locationYPercent: number
}

// ===== Save Payload 扩展 =====
export interface ProductSideSaveItem {
  id?: number
  name: string
  clientRef?: string
  bolts: ProductBoltSaveItem[]
}

export interface ProductBoltSaveItem {
  id?: number
  boltSerialNum: number
  parameterSetId?: number
  torqueMin?: number | null
  torqueMax?: number | null
  angleMin?: number | null
  angleMax?: number | null
  armLocation?: string
  locationXPercent: number
  locationYPercent: number
  partsBarcodes?: Array<{
    id?: number
    barCodeMatchingRuleId?: number
  }>
}
```

---

## 10. 设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 技术方案 | 混合方案（Canvas 编辑 + DOM 标记层）| Canvas 精确控制图片编辑，DOM 标记交互天然支持 Vue 事件 |
| 坐标存储 | 百分比（0-100）| 与图片缩放/旋转解耦，保存/加载稳定 |
| 螺栓标记形状 | 圆形 + 序号 | 视觉清晰，适合工控触摸屏 |
| 多面方案 | Tab 页签 | 客户基本只用 1 面，Tab 简洁，不占空间 |
| 面排布 | 全宽，下方独立区段 | Canvas 需要足够宽度，不应受右侧栏挤压 |
| 图片编辑 | 前端 Canvas | 用户不会自己编辑图片再上传 |
| 工具绑定 | 延后到后续 Stage | 属于任务层面功能，本次不实现 |
| PSet | 纯数字输入 | 后端无 PSet 查询接口 |
| 替换图片 | 保留已有螺栓，Canvas 状态回默认 | 百分比坐标独立于图片 |
| 螺栓序号 | 删除后自动重排 | 保持序号连续性 |
| 裁剪方式 | 一键裁剪到当前视口 | 非手动选区；边界受螺栓点位 clamp |
| renderedImage | Canvas 视口导出 | 裁剪后的可见区域画面 |
| 暂存按钮 | 保存左侧，24px 间隔 | 区分"暂存类"和"离开类"操作 |
| thumbnail | 前端 Canvas 等比缩放至 200×150 包围盒 | 保持宽高比，留白填充，导出 PNG Blob |
| 删除面 | 不包含在 save payload 中 | 不包含即视为删除 |

---

## 11. 后端需调整

- ✅ **删除面数据清理** — 已修复：`diffSides`/`diffBolts` 均追加了 existing 清理逻辑
- ✅ **保存接口返回 side/bolt ID** — 已修复：save 返回 `ProductMissionSaveDTO`，含填充 ID 的 sides/bolts 树
- ✅ **`BoltPartsBarcodeSaveItem.barcodeRuleRef`** — 已修复：新增 `barcodeRuleRef` 字段，`diffPartsBarcodes` 通过 `resolveBarcodeRef` 解析

## 12. 遗留项（后续 Stage）

| 功能 | 说明 |
|------|------|
| 工具绑定（deviceBindings）| 移到任务层面，螺栓挂载工具的角色/规格/排序 |
| 力臂坐标"读取" | 从设备实时读取当前臂位置（需设备通讯支持） |

---

## 13. 涉及文件汇总

| 文件 | 操作 | 阶段 |
|------|------|------|
| `src/shared/types/mission.ts` | 修改 | Stage 3 |
| `src/shared/api/mission.ts` | 修改 | Stage 3 |
| `src/modules/mission/components/SideCanvas.vue` | 新建 | Stage 3 |
| `src/modules/mission/components/MissionSidesSection.vue` | 新建 | Stage 3 |
| `src/modules/mission/components/BoltPropertyDialog.vue` | 新建 | Stage 3 |
| `src/modules/mission/MissionEditPage.vue` | 修改 | Stage 3 |
| `src/locales/zh-CN.json` | 修改 | Stage 3 |
| `src/locales/en.json` | 修改 | Stage 3 |
