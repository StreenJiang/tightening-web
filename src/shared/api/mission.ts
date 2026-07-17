import { get, post, put, del } from './request'
import type { ProductMission, MissionQuery } from '@/shared/types/mission'

const BASE = '/api/missions'

export function fetchMissions(params: MissionQuery) {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page))
  qs.set('size', String(params.size))
  if (params.name) qs.set('name', params.name)
  return get<{ records: ProductMission[]; total: number; size: number; current: number }>(`${BASE}?${qs}`)
}

export function fetchMission(id: number) {
  return get<ProductMission>(`${BASE}/${id}`)
}

export function checkName(name: string, excludeId?: number) {
  const qs = new URLSearchParams()
  qs.set('name', name)
  if (excludeId) qs.set('excludeId', String(excludeId))
  return get<boolean>(`${BASE}/check-name?${qs}`)
}

export function createMission(data: ProductMission) {
  return post<string>(BASE, data)
}

export function updateMission(id: number, data: ProductMission) {
  return put<string>(`${BASE}/${id}`, data)
}

export function deleteMission(id: number) {
  return del(`${BASE}/${id}`)
}
