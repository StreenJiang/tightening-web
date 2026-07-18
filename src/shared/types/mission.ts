export interface ProductMission {
  id?: number
  name: string
  maxNgCount: number | null
  passwordRequiredAfterNg: boolean
  enabled: boolean
  multiDeviceIndependent: boolean
  skipScrew: boolean
  isInspection: boolean
  inspectionScope: number
  createTime?: string
  modifyTime?: string
}

export interface MissionQuery {
  page: number
  size: number
  name?: string
}
