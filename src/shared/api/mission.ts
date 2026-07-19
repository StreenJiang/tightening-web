import { get, del, upload } from './request'
import type {
  ProductMission,
  MissionQuery,
  MissionPrerequisite,
  BarCodeMatchingRule,
  ProductMissionSavePayload,
} from '@/shared/types/mission'

const BASE = '/api/missions'

/** API 响应 (0/1 整数) → 前端 boolean */
function fromApi(raw: Record<string, unknown>): ProductMission {
  return {
    ...raw,
    enabled: raw.enabled === 1,
    skipScrew: raw.skipScrew === 1,
    multiDeviceIndependent: raw.multiDeviceIndependent === 1,
    isInspection: raw.isInspection === 1,
  } as ProductMission
}

/** ProductMission 基础字段 → SavePayload 整数格式 */
export function baseFields(m: ProductMission): Pick<ProductMissionSavePayload, 'name' | 'maxNgCount' | 'passwordRequiredNgCount' | 'enabled' | 'multiDeviceIndependent' | 'skipScrew' | 'isInspection' | 'inspectionScope' | 'inspectionBoundMissionIds'> {
  return {
    name: m.name,
    maxNgCount: m.maxNgCount,
    passwordRequiredNgCount: m.passwordRequiredNgCount,
    enabled: m.enabled ? 1 : 0,
    multiDeviceIndependent: m.multiDeviceIndependent ? 1 : 0,
    skipScrew: m.skipScrew ? 1 : 0,
    isInspection: m.isInspection ? 1 : 0,
    inspectionScope: m.inspectionScope,
    inspectionBoundMissionIds: m.inspectionBoundMissionIds ?? [],
  }
}

export async function fetchMissions(params: MissionQuery) {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page))
  qs.set('size', String(params.size))
  if (params.name) qs.set('name', params.name)
  const data = await get<{ records: Record<string, unknown>[]; total: number; size: number; current: number }>(`${BASE}?${qs}`)
  return { ...data, records: data.records.map(fromApi) }
}

export async function fetchMission(id: number) {
  const raw = await get<Record<string, unknown>>(`${BASE}/${id}`)
  return fromApi(raw)
}

export function checkName(name: string, excludeId?: number) {
  const qs = new URLSearchParams()
  qs.set('name', name)
  if (excludeId) qs.set('excludeId', String(excludeId))
  return get<boolean>(`${BASE}/check-name?${qs}`)
}

export function deleteMission(id: number) {
  return del(`${BASE}/${id}`)
}

// ---- 统一保存 (multipart/form-data) ----

export async function saveMission(payload: ProductMissionSavePayload, isUpdate: boolean): Promise<string> {
  const fd = new FormData()
  fd.append('dto', JSON.stringify(payload))
  const path = isUpdate && payload.id ? `${BASE}/${payload.id}` : BASE
  return upload<string>(isUpdate ? 'PUT' : 'POST', path, fd)
}

// ---- 读取子资源 (GET 端点保留) ----

export function fetchPrerequisites(missionId: number) {
  return get<MissionPrerequisite[]>(`${BASE}/${missionId}/prerequisites`)
}

export function fetchBarcodeRules(missionId: number) {
  return get<BarCodeMatchingRule[]>(`${BASE}/${missionId}/barcode-rules`)
}

// ---- 巡检绑定：GET /{id} 已返回 inspectionBoundMissionIds，无需独立 API ----
