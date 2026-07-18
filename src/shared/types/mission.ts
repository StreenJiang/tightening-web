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
  createTime?: string
  modifyTime?: string
}

export interface InspectionMissionBinding {
  id?: number
  inspectionMissionId: number
  boundMissionId: number
}

export interface MissionQuery {
  page: number
  size: number
  name?: string
}
