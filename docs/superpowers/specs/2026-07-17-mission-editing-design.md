# 任务编辑界面 — 设计文档

**日期**: 2026-07-17
**状态**: Stage 1 实现中（组件迁移至 PrimeVue 待定）

---

## 1. 背景

`MissionPage.vue` 当前为占位页面（"功能开发中"）。需开发完整的任务管理功能，包括任务列表、创建/编辑、删除及子资源管理。

### 1.1 后端接口总览

后端 `ProductMissionController` 提供 15 个 REST 端点，`MissionLifecycleController` 提供 5 个运行时端点。基础路径 `api/missions`。

**CRUD 端点**：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `api/missions?page=&size=&name=` | 分页列表（名称模糊搜索） |
| `GET` | `api/missions/{id}` | 获取单个任务 |
| `GET` | `api/missions/check-name?name=&excludeId=` | 名称唯一性校验 |
| `POST` | `api/missions` | 创建任务 |
| `PUT` | `api/missions/{id}` | 更新任务 |
| `DELETE` | `api/missions/{id}` | 级联删除 |

**子资源端点**：

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST/GET/DELETE` | `api/missions/{id}/prerequisites` | 前置任务管理 |
| `POST/GET/DELETE` | `api/missions/{id}/inspection-bindings` | 点检绑定管理 |
| `POST/GET/DELETE` | `api/missions/{id}/barcode-rules` | 条码规则管理 |

**运行时端点**：

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `api/missions/{id}/trigger` | 触发任务执行 |
| `POST` | `api/missions/{id}/interrupt` | 中断执行 |
| `GET` | `api/missions/{id}/status` | 查询实时状态 |
| `POST` | `api/missions/{id}/validate-product-barcode` | 校验产品追溯码 |
| `POST` | `api/missions/{id}/validate-parts-barcode` | 校验零件条码 |

### 1.2 ProductMission 数据模型

#### 主实体 — `ProductMission`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `id` | Long | AUTO | 主键 |
| `name` | String | — | 任务名称（唯一） |
| `maxNgCount` | Integer | — | 最大 NG 次数 |
| `passwordRequiredAfterNg` | Integer | — | NG 后是否需要密码 |
| `enabled` | Integer | 1 | 启用状态 |
| `multiDeviceIndependent` | Integer | 0 | 多设备独立模式 |
| `skipScrew` | Integer | 0 | 跳螺钉模式 |
| `isInspection` | Integer | 0 | 是否点检任务 |
| `inspectionScope` | InspectionScope | — | 点检范围（仅 isInspection=1 时） |
| `deleted/creatorId/modifierId/createTime/modifyTime` | BaseEntity | — | 审计字段 |

#### 子资源

| 实体 | 关键字段 |
|------|----------|
| `MissionPrerequisite` | missionId, prerequisiteMissionId, prerequisiteType(1/2/3) |
| `InspectionMissionBinding` | inspectionMissionId, boundMissionId |
| `BarCodeMatchingRule` | name, ruleType(1/2), partNumber, expectedLength, segments(JSON) |
| `ProductSide` | productMissionId, name, imageData, renderedImageData, thumbnailData |
| `ProductBolt` | productSideId, position/angle 等拧紧参数 |

#### 枚举值

| 枚举 | 值 | 含义 |
|------|-----|------|
| `PrerequisiteType` | 1=SAME_TRACE, 2=PARTS_TRACE, 3=INSPECTION_CHAIN | 前置依赖类型 |
| `InspectionScope` | 1=ALL, 2=CHOSEN | 点检范围 |
| `BarCodeRuleType` | 1=PRODUCT_TRACE, 2=PARTS_BARCODE | 条码规则类型 |
| `MissionResult` | 0=NG, 1=OK | 执行结果 |

### 1.3 关键业务规则

1. **名称唯一性** — `check-name` 端点支持编辑时排除自身 ID
2. **循环依赖检测** — 添加前置任务时 BFS 验证无环
3. **前置类型兼容** — INSPECTION_CHAIN 只能指向前置点检任务；SAME_TRACE/PARTS_TRACE 只能指向普通任务
4. **点检绑定限制** — 不能将点检任务绑定到另一个点检任务
5. **条码规则** — 每个任务最多一个 PRODUCT_TRACE 规则；segment value 长度必须匹配字符位置范围
6. **级联删除** — 删除任务时移除所有关联的 sides, bolts, prerequisites, bindings, barcode rules

---

## 2. 分阶段规划

| 阶段 | 内容 | 依赖 |
|------|------|------|
| **Stage 1** | 任务列表页 + 基础信息 CRUD（8 字段） | 无 |
| **Stage 2** | 前置任务 + 点检绑定 + 条码规则管理 | Stage 1 |
| **Stage 3** | 产品面/螺栓编辑（图片上传、标注、点位管理） | Stage 1 |

本文档聚焦 **Stage 1**，为 Stage 2/3 预留架构扩展点。

---

## 3. 路由设计

| 路径 | 组件 | 说明 |
|------|------|------|
| `/mission` | `MissionListPage.vue` | 任务列表（替换当前 MissionPage） |
| `/mission/new` | `MissionEditPage.vue` | 新建任务 |
| `/mission/:id/edit` | `MissionEditPage.vue` | 编辑已有任务 |

路由定义（追加到 `src/router/index.ts` MODULES 的 mission 子路由中）。

---

## 4. Stage 1 — 详细设计

### 4.1 文件结构

```
src/
├── modules/
│   └── mission/                          # 新增目录
│       ├── MissionListPage.vue           # 列表页（替代当前 MissionPage）
│       ├── MissionEditPage.vue           # 编辑/新建页
│       └── components/
│           └── MissionBasicForm.vue      # 基础信息表单（排版分组，无卡片边框）
├── shared/
│   ├── components/
│   │   └── ToggleSwitch.vue             # Apple 风格细长 pill toggle（通用组件）
│   ├── types/
│   │   └── mission.ts                   # 任务相关 TS 类型
│   └── api/
│       └── mission.ts                   # API 调用函数（fetch 封装）
├── stores/
│   └── mission.ts                       # Pinia store（列表状态、缓存）
└── locales/
    ├── zh-CN.json                        # 新增 mission.* 键
    └── en.json                           # 新增 mission.* 键
```

### 4.2 列表页 (`MissionListPage.vue`)

**设计方向**：Linear 风格的行列表，非传统数据网格。去掉垂直分割线和列头背景色，用留白和排版区分列。

**布局**：

```
┌─────────────────────────────────────────────────────────┐
│  🔍 搜索任务名称...                       [+ 新建任务]    │
│                                                         │
│  名称             启用    点检                            │
│  ─────────────────────────────────────────────────────── │
│  [img] 任务-A      ●───    —        ✎  🗑               │
│  [img] 任务-B      ●───   全部       ✎  🗑               │
│  [img] 任务-C      ○───   指定       ✎  🗑               │
│  ─────────────────────────────────────────────────────── │
│                                                         │
│                                     ← 较旧   较新 →      │
└─────────────────────────────────────────────────────────┘
```

**视觉规范**：

| 元素 | 规格 |
|------|------|
| 搜索框 | 280px 宽，`mdi:magnify` 18px 图标前缀，placeholder "搜索任务名称..." |
| 新建按钮 | 右对齐，黄色填充，`mdi:plus` 前缀 |
| 列头 | `12px/600/uppercase`，`letter-spacing: 0.5px`，`color: --color-text-secondary` |
| 行高 | 60px（48px 缩略图 + 12px 上下 padding） |
| 缩略图 | 48×48px，`border-radius: 4px`，无边框。无图时显示 `mdi:clipboard-text-outline` 28px, opacity 0.2 |
| 任务名称 | `16px/500`，`color: --color-text` |
| 行分割 | 底边 `1px solid var(--color-border-subtle)` |
| 行 hover | `rgba(0,0,0,0.03)` light / `rgba(255,255,255,0.03)` dark |
| 分页器 | 简化："← 较旧 / 较新 →" 文字链接 + 页码数字，不用完整分页组件 |
| 无竖线 | 列之间不对齐的竖线全部去掉 |

**操作列**：

- 编辑：32×32px ghost icon button，`mdi:pencil-outline` 18px，color: `--color-text-secondary`，hover 出现 `--color-primary` + 32×32 浅灰圆形背景
- 删除：同上规格，`mdi:delete-outline` 18px，hover 出现 `--color-status-error`
- 两按钮间距 8px

**空状态**：

```
                    [clipboard-icon, 64px, opacity 0.12]
                    暂无任务
                    点击新建创建第一个拧紧任务
                    [+ 新建任务]
```

图标 `mdi:clipboard-text-outline` 64px，居中。标题 `16px/500`。副标题 `14px/secondary`。新建按钮居中在副标题下方 16px。

**加载状态**：骨架屏。5-6 行，每行：48×48 圆角矩形（模拟缩略图）+ 120px 宽长条（模拟名称）+ 32px 小方块（模拟 toggle）+ 48px 标签条（模拟点检）+ 两个 32px 圆形（模拟操作）。静态灰色块，无动画脉冲（N2840 上避免持续 paint）。

**功能清单**：

- 分页加载，默认 page=1, size=20
- 名称模糊搜索（`?name=`），300ms debounce
- 启用/禁用 toggle switch（乐观更新 → PUT 请求 → 失败回滚）
- 删除：确认弹窗 "确定删除任务 {name}？" → 级联删除
- 整行点击进入编辑页
- 新建按钮跳转 `/mission/new`

### 4.3 编辑页 (`MissionEditPage.vue`)

**设计方向**：排版层级替代卡片边框。三组字段用 uppercase 小标题 + 空白间距分隔，无背景色、无边框、无阴影。表单区域最大宽度 560px（保持行长度在舒适阅读范围）。

**页面框架**：

```
┌──────────────────────────────────────────────────────────┐
│  (●)    编辑任务 - {name}                                │
│                                                          │
│  基础信息                                                 │
│                                                          │
│  基本属性                                                │
│                                                          │
│  任务名称     [________________________]                 │
│  启用         ○───                                       │
│                                                          │
│  执行控制                                                │
│                                                          │
│  最大NG数     [___]                                      │
│                                                          │
│  跳螺钉       ○───                                       │
│  NG后需密码    ○───                                       │
│  多设备独立    ○───                                       │
│                                                          │
│  点检配置                                                │
│                                                          │
│  点检任务     ○───  (勾选后展开 ↓)                        │
│  检查范围     ○ 全部螺栓  ○ 指定螺栓                      │
│                                                          │
│                       [取消]   [保存]                     │
└──────────────────────────────────────────────────────────┘
```

**导航栏**：

- 左上角 44×44 圆形返回按钮（`mdi:arrow-left` 20px），hover 出现 `--color-surface` 背景
- 标题右邻按钮，`20px/600`，`color: --color-text`
- 新建页标题 "新建任务"，编辑页标题 "编辑任务 - {name}"
- 无 "← 返回列表" 文字链接，无面包屑

**Stage 1 Tab 策略**：

Stage 1 **不显示** Tab 导航栏。编辑页只渲染基础信息表单。Stage 2/3 实现时，在导航栏下方追加 Tab 栏。这避免了 "5 Tab 4 灰" 的负面第一印象。

**表单分组**（排版层级，无边线）：

```
基本属性                        ← 12px/600/uppercase/secondary, letter-spacing: 0.5px
                                ← 8px gap
任务名称     [________________]  ← label 14px, input 16px
启用         ○───                ← label 14px, toggle 右对齐
                                ← 40px gap (组间)
执行控制                        ← 12px/600/uppercase/secondary
                                ← 8px gap
最大NG数     [___]               ← 数字输入框 80px 宽
                                ← 16px gap (子组内)
跳螺钉       ○───                ← 每行 44px 高
NG后需密码    ○───
多设备独立    ○───
                                ← 40px gap (组间)
点检配置                        ← 12px/600/uppercase/secondary
                                ← 8px gap
点检任务     ○───                ← 勾选后下方展开
检查范围     ○ 全部螺栓  ○ 指定螺栓  ← radio, 44px 行高
```

**表单字段映射**：

| 分组 | 字段 | 控件 | 规格 |
|------|------|------|------|
| 基本属性 | name | `<input>` text | 全宽，16px，h=40px，1px solid border，focus 时 yellow ring |
| 基本属性 | enabled | ToggleSwitch | 见下方 Toggle 规范 |
| 执行控制 | maxNgCount | `<input>` number | 80px 宽，16px，h=40px |
| 执行控制 | skipScrew | ToggleSwitch | — |
| 执行控制 | passwordRequiredAfterNg | ToggleSwitch | — |
| 执行控制 | multiDeviceIndependent | ToggleSwitch | — |
| 点检配置 | isInspection | ToggleSwitch | 勾选时展开 inspectionScope |
| 点检配置 | inspectionScope | Radio Group | 仅 isInspection=1 时可见，`1=ALL / 2=CHOSEN` |

**ToggleSwitch 组件规范**（Apple 风格细长 pill）：

| 属性 | 值 |
|------|-----|
| 尺寸 | 40×24px (pill)，滑块 18px 圆 |
| 关闭态 | 滑块 `--color-text-secondary`，轨道 `--color-border` |
| 开启态 | 滑块 `--color-primary`，轨道 `--color-primary` at 20% opacity |
| 动画 | `transform translateX` 120ms ease-out |
| Label 间距 | 12px |
| 行高 | ≥44px（触摸目标） |

**按钮区**：

- 取消：44×36px ghost button，文字 "取消"，`14px/500`，`color: --color-text-secondary`，hover 变 `--color-text`
- 保存：44×80px 填充 button，文字 "保存"，`14px/600`，`background: --color-primary`，`color: white` (light) / `color: #1a1a1a` (dark)
- 两按钮右对齐，间距 12px

**交互行为**：

- **返回按钮**：有未保存修改时弹出确认 "未保存的更改将丢失，确定离开吗？"，无修改时直接返回
- **名称校验**：失焦时调用 `/check-name`，重复时名称输入框下方红色 "任务名称已存在"（14px, `--color-status-error`），输入框 border 变红
- **isInspection 联动**：勾选时下方滑出 inspectionScope radio group（max-height transition, 200ms ease-out），取消时收起
- **保存**：校验名称非空 → POST/PUT → 成功 toast "保存成功" → router.push 返回列表；失败 toast "保存失败" + 页面不跳转
- **键盘**：Enter 不触发保存（防止误操作），需显式点击保存按钮

**表单校验规则**：

| 字段 | 规则 | 触发时机 |
|------|------|----------|
| name | 必填，trim 后非空，1-50 字符 | blur |
| name | 唯一性，调用 `/check-name?name=xxx&excludeId=<id>` | blur（debounce 400ms） |
| maxNgCount | 整数 0-999，留空视为 0 | blur |
| inspectionScope | 必选（仅当 isInspection=1） | isInspection 切换时 |

校验错误内联展示在对应字段下方（14px, `--color-status-error`），输入框 border 同步变红。校验未通过时保存按钮仍可点击（校验反馈前置），但提交时汇总所有错误并定位到第一个错误字段。

**新建任务的表单初始值**：

| 字段 | 默认值 |
|------|--------|
| name | `''` |
| enabled | `1` |
| maxNgCount | `null` |
| passwordRequiredAfterNg | `0` |
| skipScrew | `0` |
| multiDeviceIndependent | `0` |
| isInspection | `0` |
| inspectionScope | `null` |

**脏状态追踪 & 列表返回**：

- `onMounted` 时 `JSON.stringify(form)` 存快照，离开页面时对比判断脏状态
- 保存成功后刷新快照（`JSON.stringify(form)`）
- 返回列表时用 `router.push({ path: '/mission', query: { page, name } })` 保持搜索和分页状态
- 编辑页从 `route.query` 读取 `page`/`name` 参数，保存后带回

### 4.4 TypeScript 类型 (`shared/types/mission.ts`)

```ts
// 与后端 DTO 对齐 (BaseDTO + 业务字段)
export interface ProductMission {
  id?: number
  name: string
  maxNgCount: number | null
  passwordRequiredAfterNg: number  // 0 | 1
  enabled: number                  // 0 | 1
  multiDeviceIndependent: number   // 0 | 1
  skipScrew: number                // 0 | 1
  isInspection: number             // 0 | 1
  inspectionScope: number | null   // 1 | 2
  // BaseEntity fields from API
  createTime?: string
  modifyTime?: string
}

export interface ProductMissionListResponse {
  code: number
  message: string
  data: {
    records: ProductMission[]
    total: number
    size: number
    current: number
  }
}

export interface ProductMissionDetailResponse {
  code: number
  message: string
  data: ProductMission
}

export interface CheckNameResponse {
  code: number
  message: string
  data: boolean  // true = 重复
}

export interface MissionQuery {
  page: number
  size: number
  name?: string
}
```

### 4.5 API 层

#### `shared/api/request.ts` — 共享请求封装

```ts
const BASE = ''

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (json.code !== 200) throw new Error(json.message)
  return json.data as T
}

export const get = <T>(path: string) => request<T>('GET', path)
export const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body)
export const put = <T>(path: string, body?: unknown) => request<T>('PUT', path, body)
export const del = <T>(path: string) => request<T>('DELETE', path)
```

#### `shared/api/mission.ts` — Mission API

```ts
import { get, post, put, del } from './request'

const BASE = '/api/missions'

export function fetchMissions(params: MissionQuery): Promise<ProductMissionListResponse>
export function fetchMission(id: number): Promise<ProductMissionDetailResponse>
export function checkName(name: string, excludeId?: number): Promise<boolean>         // 返回 boolean
export function createMission(data: ProductMission): Promise<string>                  // 返回新 ID
export function updateMission(id: number, data: ProductMission): Promise<string>      // 返回更新 ID
export function deleteMission(id: number): Promise<void>
```

所有函数通过 `request.ts` 封装，自动解包 ApiResponse、检查 code、throw on error。

### 4.6 Store

#### `stores/mission.ts` — 任务列表状态

```ts
export const useMissionStore = defineStore('mission', () => {
  const missions = ref<ProductMission[]>([])
  const loading = ref(false)
  const pagination = ref({ page: 1, size: 20, total: 0 })
  const searchName = ref('')

  // 从 route.query 同步 page/name 状态
  async function loadMissions(query?: { page?: number; name?: string }) { /* fetch + 更新列表 */ }
  async function toggleEnabled(mission: ProductMission) { /* 乐观更新 + 失败回滚 toast */ }
  async function removeMission(id: number) { /* 删除 + reload */ }

  return { missions, loading, pagination, searchName, loadMissions, toggleEnabled, removeMission }
})
```

#### `stores/toast.ts` — Toast 通知（全局）

```ts
export const useToastStore = defineStore('toast', () => {
  const visible = ref(false); const message = ref('')
  const type = ref<'success' | 'error'>('success')
  let timer: ReturnType<typeof setTimeout>

  function show(msg: string, t: 'success' | 'error' = 'success', ms = 2000) {
    clearTimeout(timer)
    message.value = msg; type.value = t; visible.value = true
    if (ms > 0) timer = setTimeout(() => visible.value = false, ms)
  }
  function hide() { visible.value = false; clearTimeout(timer) }
  return { visible, message, type, show, hide }
})
```

#### `stores/confirm.ts` — 确认弹窗（全局）

```ts
export const useConfirmStore = defineStore('confirm', () => {
  const visible = ref(false)
  const opts = ref({ title: '', message: '' })
  let resolve: (val: boolean) => void

  function open(o: { title: string; message: string }): Promise<boolean> {
    opts.value = o; visible.value = true
    return new Promise(r => { resolve = r })
  }
  function confirm() { visible.value = false; resolve(true) }
  function cancel() { visible.value = false; resolve(false) }
  return { visible, opts, open, confirm, cancel }
})
```

`ToastNotification` 和 `ConfirmDialog` 挂在 `App.vue` 根模板中，通过 store 驱动。

### 4.7 状态覆盖

| 状态 | 列表页 | 编辑页 |
|------|--------|--------|
| **默认** | 加载后展示行列表 | 加载后填充表单（API 数据 → 本地 state） |
| **空** | 64px 图标 + "暂无任务" + "点击新建创建第一个拧紧任务" + 居中新建按钮 | N/A（新建时表单为空，各字段默认值） |
| **加载** | 5-6 行 skeleton：48×48 圆角矩形 + 120px 长条 + 32px 方块 + 48px 标签 + 2×32px 圆形。静态灰块，无动画 | 3 组 skeleton：标题条 + 1-2 个输入框条。无动画脉冲 |
| **加载错误** | 错误提示文字 + 重试按钮（`mdi:refresh`），居中 | Toast "加载失败"（3s auto-dismiss）+ 自动返回列表 |
| **保存中** | — | 保存按钮显示 spinner + disabled + 文字变 "保存中..." |
| **保存成功** | — | Toast "保存成功"（2s）→ `router.push` 回列表页 |
| **保存失败** | — | Toast "保存失败：{reason}"（5s，含关闭按钮），页面不跳 |
| **名称重复** | — | 名称输入框 border 变红 + 下方红色 "任务名称已存在"（14px, `--color-status-error`） |
| **名称校验中** | — | 名称输入框右侧小 spinner（16px），失焦校验 debounce 400ms |
| **删除确认** | Dialog "确定删除任务 {name}？此操作不可撤销。" | — |
| **启用切换** | 乐观更新 toggle 状态 → 后台 PUT → 失败时回滚 + Toast | — |
| **未保存离开** | — | `beforeRouteLeave` 拦截 → Dialog "有未保存的更改，确定离开？" |

**Dialog 规范**：参考现有 `ServerConfigModal.vue` 模式。遮罩 `rgba(0,0,0,0.45)`，面板 `border-radius: 8px`，`box-shadow: 0 4px 24px rgba(0,0,0,0.25)`。X 按钮 44×44px。Escape 关闭。`role="dialog"` + `aria-modal="true"`。展开动画 opacity 150ms ease-out。

### 4.8 i18n 键（新增）

```
mission:
  list:
    search:        zh: "搜索任务名称..."       en: "Search mission name..."
    create:        zh: "新建任务"              en: "New Mission"
    empty:         zh: "暂无任务"              en: "No missions"
    emptyHint:     zh: "点击新建创建第一个拧紧任务"  en: "Create your first mission"
    deleteConfirm: zh: "确定删除任务 {name}？"  en: "Delete mission {name}?"
    thumbnail:     zh: "任务缩略图"             en: "Mission thumbnail"
    paginationPrev: zh: "较旧"                en: "Older"
    paginationNext: zh: "较新"                en: "Newer"
    columns:
      name:       zh: "名称"                  en: "Name"
      enabled:    zh: "启用"                  en: "Enabled"
      inspection: zh: "点检"                  en: "Inspection"
    action:
      edit:       zh: "编辑任务"              en: "Edit mission"
      delete:     zh: "删除任务"              en: "Delete mission"
    toggleFailed: zh: "状态切换失败"           en: "Toggle failed"
  edit:
    createTitle:   zh: "新建任务"              en: "New Mission"
    editTitle:     zh: "编辑任务 - {name}"     en: "Edit Mission - {name}"
    back:          zh: "返回列表"              en: "Back to list"
    groups:
      basic:       zh: "基本属性"              en: "Basic Properties"
      execution:   zh: "执行控制"              en: "Execution Controls"
      inspection:  zh: "点检配置"              en: "Inspection Config"
    fields:
      name:               zh: "任务名称"        en: "Mission Name"
      enabled:            zh: "启用"            en: "Enabled"
      maxNgCount:         zh: "最大NG数"        en: "Max NG Count"
      passwordAfterNg:    zh: "NG后需密码"      en: "Password After NG"
      multiDevice:        zh: "多设备独立"      en: "Multi-Device Independent"
      skipScrew:          zh: "跳过螺钉"        en: "Skip Screw"
      isInspection:       zh: "点检任务"        en: "Inspection Mission"
      inspectionScope:    zh: "检查范围"        en: "Inspection Scope"
      inspectionScopeAll: zh: "全部螺栓"        en: "All Bolts"
      inspectionScopeChosen: zh: "指定螺栓"     en: "Chosen Bolts"
    save:          zh: "保存"                  en: "Save"
    saving:        zh: "保存中..."             en: "Saving..."
    cancel:        zh: "取消"                  en: "Cancel"
    unsavedTitle:  zh: "未保存的更改"           en: "Unsaved Changes"
    unsavedMessage: zh: "有未保存的更改，确定离开？"  en: "Unsaved changes will be lost. Leave?"
    nameDuplicate: zh: "任务名称已存在"          en: "Mission name already exists"
    nameRequired:  zh: "请输入任务名称"          en: "Mission name is required"
    saveSuccess:   zh: "保存成功"               en: "Saved successfully"
    saveFailed:    zh: "保存失败"               en: "Save failed"
    loadFailed:    zh: "加载任务失败"            en: "Failed to load mission"
  delete:
    confirm:       zh: "确定删除任务 {name}？此操作不可撤销。"  en: "Delete {name}? This cannot be undone."
    success:       zh: "删除成功"               en: "Deleted successfully"
```

---

## 5. 设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 视觉方向 | 现代简约 | 干净克制、留白充足、排版层级替代装饰。黄色 ≤5% 面积作锚点 |
| 编辑入口 | 独立路由 `/mission/:id/edit` | 内容量大（含图片标注），非对话框/抽屉能承载 |
| 表单分组 | 排版层级（uppercase 标题+间距），无卡片 | 无背景/border/shadow，比卡片更简约，更省 GPU |
| 表单布局 | 单列，最大宽度 560px | 8 字段，单列保持视线直线下移，560px 舒适阅读 |
| Toggle 风格 | Apple 细长 pill (40×24px) | 现代简约，视觉噪音低，与工业 toggle 区分 |
| 列表风格 | Linear 行列表，无竖线/列头背景 | 现代简约，排版区分列而非网格线 |
| 操作列 | 32×32 ghost icon button | 默认透明，hover 显色，视觉噪音最低 |
| Stage 1 Tab | 不显示 | 避免 "5 Tab 4 灰" 的负面第一印象 |
| 返回导航 | 44×44 圆形 icon 按钮 | 无文字链接/面包屑，更干净 |
| 列表删除 | 简单确认弹窗 | 后端已处理级联逻辑，前端仅需提示 |
| 缩略图位置 | 表格左侧第一列 | 左到右阅读流，视觉锚点快速识别 |
| 点检列显示 | 两态：点检 tag / "—" | 列表快速识别用途，ALL vs CHOSEN 在编辑页区分 |
| 搜索 | 280px + magnify 图标前缀 | Linear 式简洁搜索，300ms debounce |
| 启用切换 | 乐观更新 + 失败回滚 | 即时反馈 + 数据一致性 |
| 未保存守卫 | beforeRouteLeave 确认弹窗 | 防止误操作丢失编辑内容 |
| 分页器 | 简化 "← 较旧 / 较新 →" | 现代简约，不引入完整分页组件 |
| 黄色策略 | 仅主按钮/focus ring/switch active，≤5% | Restrained，黄色不进 Tab/表格 |
| 列表状态保持 | URL query params (`?page=&name=`) | Vue Router 原生能力，刷新不丢 |
| 搜索触发 | 纯 debounce 300ms | 平衡即时性与请求数 |
| 脏状态追踪 | onMounted JSON 快照 + 离开时对比 | 无 watcher 开销，N2840 友好 |
| 表单校验 | name 必填+唯一 + maxNgCount 0-999 + inspectionScope 条件 | 校验规则完整，反馈前置 |
| 返回列表 | `router.push` + query 带 page/name | 比 router.back() 更可靠 |
| Toast/Confirm 调用 | Pinia store 驱动，App.vue 挂载 | 任意页面零配置调用 |
| 骨架屏 | 各页面 inline | 列表/表单形状完全不同，不抽共享 |
| API 解包 | `request.ts` get/post/put/del 封装 | 统一 code 检查 + throw，DRY |

---

## 6. 技术约束

- **框架**: Vue 3.5 + TypeScript 6.0 (`erasableSyntaxOnly`) + Vite 8
- **UI 库**: 无，手写组件（N2840 性能要求）
- **状态管理**: Pinia (Composition API)
- **路由**: Vue Router (Hash 模式)
- **i18n**: vue-i18n (composition mode)
- **样式**: CSS 变量 + scoped CSS（无预处理器）
- **动画**: 仅 `transform` / `opacity`（N2840 约束）
- **触摸**: ≥44px 命中区域（适配工控触摸屏）
- **主题**: 亮色（办公室桌面场景），亮/暗/系统三种模式
- **性能**: `contain: layout style` 锁布局边界，预计算半透明色

---

## 7. 涉及文件

| 文件 | 操作 | 阶段 |
|------|------|------|
| `src/modules/mission/MissionListPage.vue` | 新建 | Stage 1 |
| `src/modules/mission/MissionEditPage.vue` | 新建 | Stage 1 |
| `src/modules/mission/components/MissionBasicForm.vue` | 新建 | Stage 1 |
| `src/shared/components/ToggleSwitch.vue` | 新建 | Stage 1 |
| `src/shared/components/ToastNotification.vue` | 新建 | Stage 1 |
| `src/shared/components/ConfirmDialog.vue` | 新建 | Stage 1 |
| `src/shared/api/request.ts` | 新建 | Stage 1 |
| `src/stores/toast.ts` | 新建 | Stage 1 |
| `src/stores/confirm.ts` | 新建 | Stage 1 |
| `src/modules/MissionPage.vue` | 删除（替换为 MissionListPage） | Stage 1 |
| `src/shared/types/mission.ts` | 新建 | Stage 1 |
| `src/shared/api/mission.ts` | 新建 | Stage 1 |
| `src/stores/mission.ts` | 新建 | Stage 1 |
| `src/router/index.ts` | 修改（mission 路由拆分） | Stage 1 |
| `src/locales/zh-CN.json` | 追加 `mission.*` | Stage 1 |
| `src/locales/en.json` | 追加 `mission.*` | Stage 1 |
| `src/modules/mission/components/MissionPrereqTab.vue` | 新建 | Stage 2 |
| `src/modules/mission/components/MissionInspectionTab.vue` | 新建 | Stage 2 |
| `src/modules/mission/components/MissionBarcodeTab.vue` | 新建 | Stage 2 |
| `src/modules/mission/components/MissionSidesTab.vue` | 新建 | Stage 3 |

---

## 8. 扩展预留

Stage 2/3 集成方式：
1. 在 `MissionEditPage.vue` 导航栏下方追加 Tab 栏组件
2. 创建 `MissionXxxTab.vue` 组件，通过 `<component :is>` 或 `v-if` 切换
3. 子资源 API 调用走 `src/shared/api/mission.ts` 已有 BASE 路径
4. 表单字段扩展：在 `MissionBasicForm.vue` 的分组间插入新 section 或新增独立 Tab
5. `ToggleSwitch.vue` 作为共享组件可在整个项目中复用
