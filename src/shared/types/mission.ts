export interface ProductMission {
  id?: number
  name: string
  maxNgCount: number | null
  passwordRequiredNgCount: number | null
  enabled: boolean
  multiDeviceIndependent: boolean
  skipScrew: boolean
  isInspection: boolean
  inspectionScope: number
  inspectionBoundMissionIds?: number[]  // GET /{id} 直接返回
  thumbnail?: string        // 首个产品面缩略图 Base64, 列表接口返回
  createTime?: string
  modifyTime?: string
}

export interface MissionQuery {
  page: number
  size: number
  name?: string
}

export interface MissionPrerequisite {
  id?: number
  prerequisiteMissionId: number
  prerequisiteType: 1 | 2 | 3 // 1=SAME_TRACE 2=MATERIAL_TRACE 3=INSPECTION_CHAIN
  prerequisiteMissionName?: string // 展示用，非 API 字段
  barcodeRuleId?: number   // 物料前置关联的条码规则 ID
  barcodeRuleRef?: string  // 新规则的 clientRef UUID
}

// ===== 产品面 & 螺栓 (Stage 3) =====

export interface BoltDeviceBinding {
  id?: number
  deviceId?: number
  deviceRole?: number
  deviceSpec?: number
  sortOrder?: number
}

export interface BoltPartsBarcode {
  id?: number
  barcodeRuleRef?: string
  barCodeMatchingRuleId?: number // GET 响应中返回，用于关联已有条码规则
  barcodeRule?: BarCodeMatchingRule
}

export interface ProductBolt {
  id?: number
  productSideId?: number
  serialNum: number
  name?: string
  parameterSetId?: number
  torqueMin?: number | null
  torqueMax?: number | null
  angleMin?: number | null
  angleMax?: number | null
  armLocation?: string
  locationXPercent: number
  locationYPercent: number
  enabled?: number
  deviceBindings?: BoltDeviceBinding[]
  partsBarcode?: BoltPartsBarcode
}

export interface BarCodeMatchingRule {
  id?: number
  name: string
  ruleType: 1 | 2 // 1=PRODUCT_TRACE 2=MATERIAL_BARCODE
  partNumber?: string
  expectedLength?: number | null
  segments: string // JSON string，e.g. '[{"s":0,"e":3,"v":"ABC"}]'
  seq?: number       // 物料码序号
  clientRef?: string // 前端生成的 UUID，用于新增时前后关联
}

// ===== UI 层内部状态类型 =====

/** UI 层条码规则状态 — API 字段 + UI 专属字段 */
export interface BarcodeRuleState {
  id?: number
  name: string
  ruleType: 1 | 2
  expectedLength?: number | null
  segments: string
  clientRef?: string
}

/** UI 层螺栓物料条码状态 */
export interface PartsBarcodeState {
  id?: number
  barcodeRuleRef?: string
  name: string
  _ruleDef: BarcodeRuleState | null
}

/** UI 层螺栓状态 = API 类型 + 内部字段 */
export type BoltState = ProductBolt & {
  _localId: string
  _partsBarcode?: PartsBarcodeState
}

/** BoltPropertyDialog 数据 */
export interface BoltDialogData {
  parameterSetId: number | null
  armLocation: string
  torqueMin: number | null
  torqueMax: number | null
  angleMin: number | null
  angleMax: number | null
  partsBarcode: PartsBarcodeState | null
}

/** UI 层 segment：1-based 含末尾 */
export interface Segment {
  s: number // 存时 0-based inclusive
  e: number // 存时 0-based exclusive
  v: string
}

/** 统一保存 payload，映射 ProductMissionSaveDTO */

export interface PrerequisiteSaveItem {
  id?: number
  prerequisiteMissionId: number
  prerequisiteType: 1 | 2 | 3
  prerequisiteMissionName?: string // 展示用，GET 响应返回
  barcodeRuleId?: number       // 物料前置关联的条码规则 ID
  barcodeRuleRef?: string      // 新规则的 clientRef UUID
}

export interface BarcodeRuleSaveItem {
  id?: number
  name: string
  ruleType: 1 | 2
  partNumber?: string
  expectedLength?: number | null
  segments: string // JSON string
  seq?: number       // 物料码序号
  clientRef?: string // 前端 UUID，新规则关联用
}

export interface ProductMissionSavePayload {
  id?: number
  name: string
  maxNgCount: number | null
  passwordRequiredNgCount: number | null
  enabled: number // 0|1
  multiDeviceIndependent: number
  skipScrew: number
  isInspection: number
  inspectionScope: number
  inspectionBoundMissionIds: number[]
  prerequisites: PrerequisiteSaveItem[]
  barcodeRules: BarcodeRuleSaveItem[]
  sides: ProductSideSaveItem[]
}

// ===== Side/Bolt Save Items =====

/** SideCanvas → 父组件同步数据 */
export interface SideCanvasSyncData {
  imageBlob: Blob | null
  bolts: ProductBoltSaveItem[]
}

export interface ProductSideSaveItem {
  id?: number
  name: string
  clientRef?: string        // 前端生成的 UUID，GET/POST 均支持
  bolts: ProductBoltSaveItem[]
  image?: string           // Base64, GET 时返回
  renderedImage?: string   // Base64, GET 时返回
  thumbnail?: string       // Base64, GET 时返回
}

export interface ProductBoltSaveItem {
  id?: number
  serialNum: number
  name?: string
  parameterSetId?: number
  torqueMin?: number | null
  torqueMax?: number | null
  angleMin?: number | null
  angleMax?: number | null
  armLocation?: string
  locationXPercent: number
  locationYPercent: number
  enabled?: number
  deviceBindings?: BoltDeviceBinding[]
  partsBarcode?: {
    id?: number
    barcodeRuleRef?: string
    barCodeMatchingRuleId?: number // GET 响应中返回
    barcodeRule?: BarCodeMatchingRule
  }
}
