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
  missionId?: number
  prerequisiteMissionId: number
  prerequisiteType: 1 | 2 | 3 // 1=SAME_TRACE 2=MATERIAL_TRACE 3=INSPECTION_CHAIN
  prerequisiteMissionName?: string // 展示用，非 API 字段
  barcodeRuleId?: number   // 物料前置关联的条码规则 ID
}

export interface BarCodeMatchingRule {
  id?: number
  name: string
  productMissionId?: number
  ruleType: 1 | 2 // 1=PRODUCT_TRACE 2=MATERIAL_BARCODE
  partNumber?: string
  expectedLength?: number | null
  segments: string // JSON string，e.g. '[{"s":0,"e":3,"v":"ABC"}]'
  clientRef?: string // 前端生成的 UUID，用于新增时前后关联
}

/** UI 层 segment：1-based 含末尾 */
export interface Segment {
  s: number // 存时 0-based inclusive
  e: number // 存时 0-based exclusive
  v: string
}

/** 统一保存 payload，映射 ProductMissionSaveDTO */
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
  prerequisites: Array<{
    id?: number
    prerequisiteMissionId: number
    prerequisiteType: number
    barcodeRuleId?: number       // 已有规则的真实 ID
    barcodeRuleRef?: string      // 新规则的 clientRef UUID
  }>
  barcodeRules: Array<{
    id?: number
    name: string
    ruleType: number
    partNumber?: string
    expectedLength?: number | null
    segments: string // JSON string
    seq?: number       // 物料码序号
    clientRef?: string // 前端 UUID，新规则关联用
  }>
}
