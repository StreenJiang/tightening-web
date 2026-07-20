import type { BoltState, ProductBoltSaveItem } from '@/shared/types/mission'
import { generateUUID } from '@/shared/utils/uuid'

/** BoltState → ProductBoltSaveItem，供 SideCanvas.getBoltData() 和 MissionSidesSection 回退路径共用 */
export function boltStateToSaveItem(b: BoltState): ProductBoltSaveItem {
  const pb = b._partsBarcode
  return {
    id: b.id,
    serialNum: b.serialNum,
    parameterSetId: b.parameterSetId,
    torqueMin: b.torqueMin,
    torqueMax: b.torqueMax,
    angleMin: b.angleMin,
    angleMax: b.angleMax,
    armLocation: b.armLocation,
    locationXPercent: b.locationXPercent,
    locationYPercent: b.locationYPercent,
    partsBarcode: pb ? {
      ...(pb._ruleDef?.id == null ? { barcodeRuleRef: pb.barcodeRuleRef } : {}),
      barcodeRule: pb._ruleDef ? (
        pb._ruleDef.id != null
          ? { id: pb._ruleDef.id, name: pb._ruleDef.name, ruleType: pb._ruleDef.ruleType, expectedLength: pb._ruleDef.expectedLength, segments: pb._ruleDef.segments }
          : pb._ruleDef
      ) : undefined,
    } : undefined,
  }
}

/** ProductBoltSaveItem → BoltState（逆向转换），供 onSideSync 将 canvas 同步数据转回 UI 格式 */
export function saveItemToBoltState(item: ProductBoltSaveItem, existingLocalId?: string): BoltState {
  const spb = item.partsBarcode
  const rule = spb?.barcodeRule
  return {
    ...item,
    _localId: existingLocalId ?? generateUUID(),
    _partsBarcode: spb ? {
      id: spb.id,
      barcodeRuleRef: spb.barcodeRuleRef,
      name: rule?.name ?? '',
      _ruleDef: rule ? {
        id: rule.id,
        name: rule.name,
        ruleType: rule.ruleType,
        expectedLength: rule.expectedLength ?? null,
        segments: rule.segments,
        clientRef: rule.clientRef,
      } : null,
    } : undefined,
  } as BoltState
}
