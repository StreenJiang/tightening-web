import type { ProductMissionSavePayload } from './mission'

declare global {
  interface Window {
    __missionDetail?: ProductMissionSavePayload
  }
}

export {}
