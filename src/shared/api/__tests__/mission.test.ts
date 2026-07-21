import { describe, it, expect } from 'vitest'
import { baseFields } from '../mission'

describe('baseFields', () => {
  const sampleMission = {
    id: 1,
    name: 'Test Mission',
    maxNgCount: 3,
    passwordRequiredNgCount: 5,
    enabled: true,
    multiDeviceIndependent: false,
    skipScrew: true,
    isInspection: false,
    inspectionScope: 2,
    inspectionBoundMissionIds: [10, 20],
  }

  it('converts boolean → 0/1 integer', () => {
    const result = baseFields(sampleMission)
    expect(result.enabled).toBe(1)
    expect(result.multiDeviceIndependent).toBe(0)
    expect(result.skipScrew).toBe(1)
    expect(result.isInspection).toBe(0)
  })

  it('passes through string and number fields', () => {
    const result = baseFields(sampleMission)
    expect(result.name).toBe('Test Mission')
    expect(result.maxNgCount).toBe(3)
    expect(result.passwordRequiredNgCount).toBe(5)
    expect(result.inspectionScope).toBe(2)
  })

  it('defaults inspectionBoundMissionIds to empty array when undefined', () => {
    const result = baseFields({ ...sampleMission, inspectionBoundMissionIds: undefined })
    expect(result.inspectionBoundMissionIds).toEqual([])
  })

  it('passes through inspectionBoundMissionIds when set', () => {
    const result = baseFields(sampleMission)
    expect(result.inspectionBoundMissionIds).toEqual([10, 20])
  })
})
