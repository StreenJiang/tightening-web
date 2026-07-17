export interface ProductMission {
  id?: number
  name: string
  maxNgCount: number | null
  passwordRequiredAfterNg: number  // 0 | 1
  enabled: number                  // 0 | 1
  multiDeviceIndependent: number   // 0 | 1
  skipScrew: number                // 0 | 1
  isInspection: number             // 0 | 1
  inspectionScope: number   // 0 = NONE | 1 = ALL | 2 = CHOSEN
  createTime?: string
  modifyTime?: string
}

export interface MissionQuery {
  page: number
  size: number
  name?: string
}
