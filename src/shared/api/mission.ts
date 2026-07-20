import * as v from 'valibot'
import { get, post, put, del } from './request'
import type {
  ProductMission,
  MissionQuery,
  ProductMissionSavePayload,
  PrerequisiteSaveItem,
  BarcodeRuleSaveItem,
} from '@/shared/types/mission'

const BASE = '/api/missions'

// ── Valibot schemas for raw API responses (0/1 integers for boolean-like fields) ──

const productMissionRawSchema = v.object({
  id: v.nullish(v.number()),
  name: v.string(),
  maxNgCount: v.nullable(v.number()),
  passwordRequiredNgCount: v.nullable(v.number()),
  enabled: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  multiDeviceIndependent: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  skipScrew: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  isInspection: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  inspectionScope: v.nullish(v.number()),
  inspectionBoundMissionIds: v.nullish(v.array(v.number())),
  thumbnail: v.nullish(v.string()),
  createTime: v.nullish(v.string()),
  modifyTime: v.nullish(v.string()),
})

type ProductMissionRaw = v.InferOutput<typeof productMissionRawSchema>

const missionListResponseSchema = v.object({
  records: v.nullable(v.array(productMissionRawSchema)),
  total: v.number(),
  size: v.number(),
  current: v.number(),
})

/** API 响应 (0/1 整数) → 前端 boolean，null 值转为 undefined，缺失值给兜底 */
function fromApi(raw: ProductMissionRaw): ProductMission {
  return {
    id: raw.id ?? undefined,
    name: raw.name,
    maxNgCount: raw.maxNgCount,
    passwordRequiredNgCount: raw.passwordRequiredNgCount,
    enabled: raw.enabled === 1,
    skipScrew: raw.skipScrew === 1,
    multiDeviceIndependent: raw.multiDeviceIndependent === 1,
    isInspection: raw.isInspection === 1,
    inspectionScope: raw.inspectionScope ?? 0,
    inspectionBoundMissionIds: raw.inspectionBoundMissionIds ?? undefined,
    thumbnail: raw.thumbnail ?? undefined,
    createTime: raw.createTime ?? undefined,
    modifyTime: raw.modifyTime ?? undefined,
  }
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
  const raw = await get<unknown>(`${BASE}?${qs}`)
  const data = v.parse(missionListResponseSchema, raw)
  return { ...data, records: (data.records ?? []).map(fromApi) }
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
): Promise<ProductMissionSavePayload> {
  const isUpdate = !!payload.id
  const path = isUpdate ? `${BASE}/${payload.id}` : BASE
  return isUpdate ? put<ProductMissionSavePayload>(path, payload) : post<ProductMissionSavePayload>(BASE, payload)
}

// ---- 子资源（从缓存的 detail 返回，避免调用已删除的独立端点） ----

export function cacheDetail(detail: ProductMissionSavePayload) {
  window.__missionDetail = detail
}

function getCachedDetail(): ProductMissionSavePayload | null {
  return window.__missionDetail ?? null
}

export function fetchPrerequisites(_missionId: number): Promise<PrerequisiteSaveItem[]> {
  return Promise.resolve(getCachedDetail()?.prerequisites ?? [])
}

export function fetchBarcodeRules(_missionId: number): Promise<BarcodeRuleSaveItem[]> {
  return Promise.resolve(getCachedDetail()?.barcodeRules ?? [])
}
