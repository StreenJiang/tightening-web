import { get, post, put, del } from './request'
import type {
  ProductMission,
  MissionQuery,
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

/** GET /{id} — 后端现返回 ProductMissionDetailDTO（含 sides + Base64 图片） */
export async function fetchMission(id: number): Promise<ProductMissionSavePayload> {
  return get<ProductMissionSavePayload>(`${BASE}/${id}`)
}

export function checkName(name: string, excludeId?: number) {
  const qs = new URLSearchParams()
  qs.set('name', name)
  if (excludeId) qs.set('excludeId', String(excludeId))
  return get<boolean>(`${BASE}/check-name?${qs}`)
}

export function setEnabled(id: number, enabled: boolean) {
  return put(`${BASE}/${id}/enabled`, { code: enabled ? 1 : 0 })
}

export function deleteMission(id: number) {
  return del(`${BASE}/${id}`)
}

// ---- 统一保存 (JSON body, 图片 Base64 编码在产品面里) ----

export async function saveMission(
  payload: ProductMissionSavePayload,
  isUpdate: boolean,
): Promise<ProductMissionSavePayload> {
  const path = isUpdate && payload.id ? `${BASE}/${payload.id}` : BASE
  return isUpdate ? put<ProductMissionSavePayload>(path, payload) : post<ProductMissionSavePayload>(BASE, payload)
}

// ---- 子资源（从缓存的 detail 返回，避免调用已删除的独立端点） ----

export function cacheDetail(detail: ProductMissionSavePayload) {
  (window as any).__missionDetail = detail
}

function getCachedDetail(): ProductMissionSavePayload | null {
  return (window as any).__missionDetail ?? null
}

export function fetchPrerequisites(_missionId: number): Promise<any[]> {
  return Promise.resolve(getCachedDetail()?.prerequisites ?? [])
}

export function fetchBarcodeRules(_missionId: number): Promise<any[]> {
  return Promise.resolve(getCachedDetail()?.barcodeRules ?? [])
}
