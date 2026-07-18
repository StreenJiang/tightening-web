import { get, post, put, del } from './request'
import type { ProductMission, MissionQuery } from '@/shared/types/mission'

const BASE = '/api/missions'

function toApi(data: ProductMission): Record<string, unknown> {
  return {
    ...data,
    enabled: data.enabled ? 1 : 0,
    skipScrew: data.skipScrew ? 1 : 0,
    passwordRequiredAfterNg: data.passwordRequiredAfterNg ? 1 : 0,
    multiDeviceIndependent: data.multiDeviceIndependent ? 1 : 0,
    isInspection: data.isInspection ? 1 : 0,
  }
}

function fromApi(raw: Record<string, unknown>): ProductMission {
  return {
    ...raw,
    enabled: raw.enabled === 1,
    skipScrew: raw.skipScrew === 1,
    passwordRequiredAfterNg: raw.passwordRequiredAfterNg === 1,
    multiDeviceIndependent: raw.multiDeviceIndependent === 1,
    isInspection: raw.isInspection === 1,
  } as ProductMission
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

export function createMission(data: ProductMission) {
  return post<string>(BASE, toApi(data))
}

export function updateMission(id: number, data: ProductMission) {
  return put<string>(`${BASE}/${id}`, toApi(data))
}

export function deleteMission(id: number) {
  return del(`${BASE}/${id}`)
}
