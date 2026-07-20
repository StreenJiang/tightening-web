# Backend API Alignment — 前端适配设计

**日期**: 2026-07-20  
**状态**: 已确认  
**目标**: 前端代码适配后端最新 API 变更

---

## 1. 背景

后端 `tightening` (Java) 在近期做了多轮接口重构，前端 `tightening-web` 需要同步适配。主要变更集中在 ProductMission 模块的 DTO 结构和新增端点。

### 后端关键 commit（最近 8 个）

| Commit | 说明 |
|---|---|
| `5494621` | feat: add mission enable/disable endpoint |
| `166fdf5` | refactor: unify API error response format and add frontend API guide |
| `23f4bb0` | refactor: inline bolt barcode rules and rename SaveItem to DetailItem |
| `7057c8c` | refactor: consolidate mission detail API and remove redundant endpoints |
| `440b203` | feat: include first side thumbnail in mission list API |
| `e71911d` | refactor: replace multipart image upload with Base64 in side data |
| `f20a0b0` | feat: return full mission data with IDs from save API |
| `8a185fb` | feat: resolve barcodeRuleRef via clientRef for new rules in mission save |

---

## 2. 变更分析

### 2.1 新增端点: `PUT /api/missions/{id}/enabled`

**后端定义**:
```
PUT /api/missions/{id}/enabled
Body: {"code": 0 | 1}
Response: ApiResponse<String>  // code=200, message="ok", data=null
```

**当前前端问题**: `store.toggleEnabled()` 通过 `saveMission()` 发送完整 payload 来切换启用状态，浪费带宽且语义不清晰。

**适配方案**: 新增 `setEnabled()` API 函数，store 直接调用此端点。

### 2.2 DTO 重命名: SaveItem → DetailItem

后端将 `*SaveItem` 全部重命名为 `*DetailItem`（`ProductSideDetailItem`, `ProductBoltDetailItem`, `BoltPartsBarcodeDetailItem` 等）。JSON 序列化字段名不变，前端类型命名无需强制同步，但可择机统一。

**决策**: 本次不重命名前端类型——保持 `ProductSideSaveItem`/`ProductBoltSaveItem` 等命名，因为它们是前端用来构建 POST/PUT body 的，语义上仍是 "Save" 的。重命名仅增加 diff 噪音，无实际价值。

### 2.3 `ProductBoltDetailItem` 结构变化（**Breaking**）

| 字段 | 旧 | 新 | 影响 |
|---|---|---|---|
| `boltName` | 无 | String | **新增**，前端需支持 |
| `enabled` | 无 | Integer | **新增**，前端需支持 |
| `deviceBindings` | 无 | List\<BoltDeviceBindingDetailItem\> | **新增**，前端需支持 |
| `partsBarcodes` | List | **单对象** `partsBarcode` | **Breaking**，前端多处需改 |

**适配方案**:
1. Types: `ProductBolt` 和 `ProductBoltSaveItem` 中 `partsBarcodes` → `partsBarcode`（单对象）
2. Types: 新增 `BoltDeviceBinding` 接口
3. `BoltPropertyDialog` — 已使用 `_partsBarcodes?.[0]` 取第一个，改为 `_partsBarcode` 直接存取
4. `SideCanvas.getBoltData()` — `partsBarcodes: [...]` → `partsBarcode: {...}`
5. `MissionEditPage` — 回填逻辑中 `rBolt.partsBarcodes` → `rBolt.partsBarcode`
6. `MissionSidesSection.getSidesData()` — 同上

### 2.4 `BoltPartsBarcodeDetailItem` 结构变化

**旧** (前端当前理解):
```json
{ "id": 1, "barCodeMatchingRuleId": 5, "barcodeRuleRef": "uuid" }
```

**新** (后端实际返回):
```json
{
  "barcodeRuleRef": "uuid",
  "barcodeRule": {
    "id": 5,
    "name": "...",
    "ruleType": 2,
    "partNumber": "...",
    "expectedLength": 10,
    "segments": "[...]",
    "seq": 1,
    "clientRef": "uuid"
  }
}
```

**关键变化**: 不再通过 `barCodeMatchingRuleId` 关联已有规则，而是直接嵌入完整的 `barcodeRule` 对象。这意味着前端回填逻辑需要从 `barcodeRule` 而非 lookup map 中获取规则详情。

**适配方案**:
1. Types: `bolt.partsBarcode` 类型改为包含可选 `barcodeRule` 嵌入对象
2. `MissionEditPage`: 回填时直接用 `pb.barcodeRule` 而非从 `rulesById` lookup
3. SideCanvas `getBoltData()`: 发送时仍需 map 到后端期望格式（`barcodeRuleRef` + 可选 `barcodeRule` inline）

### 2.5 新增 `BoltDeviceBindingDetailItem`

```java
class BoltDeviceBindingDetailItem {
    Long deviceId;
    Integer deviceRole;   // 设备角色
    Double deviceSpec;    // 设备规格
    Integer sortOrder;    // 排序
}
```

**影响**: 前端类型需新增 `BoltDeviceBinding` 接口。当前编辑页面尚无设备绑定 UI，暂作为数据透传字段——保存时原样回传，编辑时暂不提供 UI。

### 2.6 `PrerequisiteDetailItem` 新增字段

新增 `barcodeRuleRef` (String)，用于关联新建条码规则（通过 clientRef UUID）。

**前端已有此字段**: `MissionPrereqCard.getData()` 已在输出中包含 `barcodeRuleRef`。类型定义需补充。

---

## 3. 实施计划

### 3.1 类型定义更新 (`src/shared/types/mission.ts`)

1. `ProductBolt` 和 `ProductBoltSaveItem`:
   - `partsBarcodes?: Array<...>` → `partsBarcode?: { id?, barcodeRuleRef?, barcodeRule?: BarCodeMatchingRule }`
   - 新增 `boltName?: string`
   - 新增 `enabled?: number`
   - 新增 `deviceBindings?: BoltDeviceBinding[]`

2. 新增接口:
```ts
export interface BoltDeviceBinding {
  id?: number
  deviceId?: number
  deviceRole?: number
  deviceSpec?: number
  sortOrder?: number
}
```

3. `MissionPrerequisite`: 新增 `barcodeRuleRef?: string`

### 3.2 API 层更新 (`src/shared/api/mission.ts`)

新增:
```ts
export function setEnabled(id: number, enabled: boolean) {
  return put(`${BASE}/${id}/enabled`, { code: enabled ? 1 : 0 })
}
```

### 3.3 Store 更新 (`src/stores/mission.ts`)

`toggleEnabled` 改用 `setEnabled` 端点，移除构造完整 payload 的逻辑。

### 3.4 组件适配

| 文件 | 变更内容 |
|---|---|
| `SideCanvas.vue` | `getBoltData()`: `partsBarcodes: [...]` → `partsBarcode: {...}` |
| `BoltPropertyDialog.vue` | `_partsBarcodes?.[0]` → `_partsBarcode`; `buildOkData()` 调整 |
| `MissionEditPage.vue` | 回填: `rBolt.partsBarcodes` → `rBolt.partsBarcode`; 用 `pb.barcodeRule` 替代 `rulesById` lookup |
| `MissionSidesSection.vue` | `getSidesData()`: 数组 → 单对象 |

### 3.5 不做的事项

- **不重命名前端类型** (SaveItem → DetailItem) — 无实际价值
- **不添加设备绑定 UI** — 当前无设计稿，仅透传数据
- **不修改 `boltName`/`enabled` UI** — 同理，待产品需求明确
- **不修改 i18n** — 新字段暂不暴露给用户，无需新的翻译 key

---

## 4. 风险评估

| 风险 | 级别 | 缓解 |
|---|---|---|
| `partsBarcodes`→`partsBarcode` 遗漏 | 中 | Grep 全局搜索 `partsBarcodes` 确保无遗漏 |
| 新旧 API 并存期间的兼容 | 低 | 后端已完成重构，旧端点已删除，无并存期 |
| 设备绑定数据丢失 | 低 | 透传方案保证 GET→PUT 循环不丢失数据 |

---

## 5. 验证方式

1. TypeScript 编译通过 (`npm run build` / `vue-tsc -b`)
2. 列表页: 正常加载、搜索、分页
3. 编辑页: 加载已有任务、螺栓数据正确回显
4. 新增/编辑螺栓: 条码规则保存正确
5. 启用/禁用开关: 使用新端点正常工作
6. 类型安全: 所有 `partsBarcodes` 引用已改为 `partsBarcode`
