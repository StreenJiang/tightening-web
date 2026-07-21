import { describe, it, expect } from 'vitest'
import { parseSegments, boltStateToSaveItem, saveItemToBoltState } from '../mission'
import type { BoltState, ProductBoltSaveItem } from '@/shared/types/mission'

describe('parseSegments', () => {
  it('returns empty array for empty string', () => {
    expect(parseSegments('')).toEqual([])
  })

  it('returns empty array for "[]"', () => {
    expect(parseSegments('[]')).toEqual([])
  })

  it('converts 0-based exclusive to 1-based inclusive', () => {
    const json = '[{"s":0,"e":5,"v":"HELLO"}]'
    const result = parseSegments(json)
    expect(result).toEqual([{ s: 1, e: 5, v: 'HELLO' }])
  })

  it('handles multiple segments', () => {
    const json = '[{"s":0,"e":3,"v":"ABC"},{"s":5,"e":10,"v":"12345"}]'
    const result = parseSegments(json)
    expect(result).toEqual([
      { s: 1, e: 3, v: 'ABC' },
      { s: 6, e: 10, v: '12345' },
    ])
  })

  it('returns empty array for invalid JSON', () => {
    expect(parseSegments('not json')).toEqual([])
  })
})

describe('boltStateToSaveItem', () => {
  it('converts basic bolt fields', () => {
    const bolt: BoltState = {
      _localId: 'uuid-1',
      serialNum: 1,
      locationXPercent: 50,
      locationYPercent: 60,
      parameterSetId: 42,
      torqueMin: 10,
      torqueMax: 20,
      angleMin: 30,
      angleMax: 40,
      armLocation: 'L1',
    }
    const result = boltStateToSaveItem(bolt)
    expect(result.serialNum).toBe(1)
    expect(result.locationXPercent).toBe(50)
    expect(result.locationYPercent).toBe(60)
    expect(result.parameterSetId).toBe(42)
    expect(result.torqueMin).toBe(10)
    expect(result.torqueMax).toBe(20)
    expect(result.angleMin).toBe(30)
    expect(result.angleMax).toBe(40)
    expect(result.armLocation).toBe('L1')
  })

  it('omits partsBarcode when _partsBarcode is undefined', () => {
    const bolt: BoltState = {
      _localId: 'uuid-1',
      serialNum: 1,
      locationXPercent: 0,
      locationYPercent: 0,
    }
    expect(boltStateToSaveItem(bolt).partsBarcode).toBeUndefined()
  })

  it('includes barcodeRuleRef when rule has no DB id', () => {
    const bolt: BoltState = {
      _localId: 'uuid-1',
      serialNum: 1,
      locationXPercent: 0,
      locationYPercent: 0,
      _partsBarcode: {
        barcodeRuleRef: 'ref-uuid',
        name: 'Test',
        _ruleDef: {
          id: undefined,
          name: 'Test',
          ruleType: 2,
          expectedLength: null,
          segments: '',
          clientRef: 'ref-uuid',
        },
      },
    }
    const result = boltStateToSaveItem(bolt)
    expect(result.partsBarcode?.barcodeRuleRef).toBe('ref-uuid')
    expect(result.partsBarcode?.barcodeRule?.name).toBe('Test')
  })

  it('omits barcodeRuleRef when rule has DB id', () => {
    const bolt: BoltState = {
      _localId: 'uuid-1',
      serialNum: 1,
      locationXPercent: 0,
      locationYPercent: 0,
      _partsBarcode: {
        id: 5,
        barcodeRuleRef: 'ref-uuid',
        name: 'Test',
        _ruleDef: {
          id: 99,
          name: 'Test',
          ruleType: 2,
          expectedLength: 8,
          segments: '[]',
        },
      },
    }
    const result = boltStateToSaveItem(bolt)
    expect(result.partsBarcode?.barcodeRuleRef).toBeUndefined()
    expect(result.partsBarcode?.barcodeRule).toBeDefined()
    expect(result.partsBarcode?.barcodeRule?.id).toBe(99)
  })
})

describe('saveItemToBoltState', () => {
  it('converts save item back to bolt state', () => {
    const item: ProductBoltSaveItem = {
      id: 10,
      serialNum: 1,
      locationXPercent: 50,
      locationYPercent: 60,
      name: 'Bolt A',
      parameterSetId: 100,
      enabled: 1,
    }
    const result = saveItemToBoltState(item)
    expect(result.id).toBe(10)
    expect(result.serialNum).toBe(1)
    expect(result._localId).toBeTruthy()
    expect(result._partsBarcode).toBeUndefined()
  })

  it('preserves existing localId', () => {
    const item: ProductBoltSaveItem = {
      serialNum: 1,
      locationXPercent: 0,
      locationYPercent: 0,
    }
    const result = saveItemToBoltState(item, 'existing-uuid')
    expect(result._localId).toBe('existing-uuid')
  })

  it('restores partsBarcode state from save item', () => {
    const item: ProductBoltSaveItem = {
      serialNum: 1,
      locationXPercent: 0,
      locationYPercent: 0,
      partsBarcode: {
        id: 3,
        barcodeRuleRef: 'ref-x',
        barcodeRule: {
          id: 77,
          name: 'MyRule',
          ruleType: 2,
          expectedLength: 10,
          segments: '[]',
        },
      },
    }
    const result = saveItemToBoltState(item)
    expect(result._partsBarcode).toBeDefined()
    expect(result._partsBarcode?.id).toBe(3)
    expect(result._partsBarcode?._ruleDef?.id).toBe(77)
    expect(result._partsBarcode?._ruleDef?.name).toBe('MyRule')
  })
})
