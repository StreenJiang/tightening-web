import type { BoltState, ProductBoltSaveItem } from '@/shared/types/mission'

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
