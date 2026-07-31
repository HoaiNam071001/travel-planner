import type { Id, Item, PlanTotals, Unit, UnitStats } from "../types/models";
import { itemDurationMinutes } from "./schedule";

// Tổng chi phí/thời lượng của Chặng = tổng hợp từ Hoạt động, của Kế hoạch = tổng
// hợp từ Chặng — luôn tính động (computed) chứ không lưu cột cứng trong DB.

// items (mọi hoạt động) -> Map<unitId, item[]> đã sắp theo order_index.
export function groupItemsByUnit(items: Item[] = []): Map<Id, Item[]> {
  const byUnit = new Map<Id, Item[]>();
  for (const item of items) {
    if (!item.unit_id) continue;
    const list = byUnit.get(item.unit_id);
    if (list) list.push(item);
    else byUnit.set(item.unit_id, [item]);
  }
  for (const list of byUnit.values()) {
    list.sort((a, b) => a.order_index - b.order_index);
  }
  return byUnit;
}

/** Thời lượng ở đây là tổng thời lượng *nội dung* (hoạt động + nghỉ), không phải
 *  khoảng thời gian đã xếp lịch của chặng — cái đó xem `unitRange()`. */
export function unitStats(unitItems: Item[] = [], breakMinutes = 0): UnitStats {
  const itemCount = unitItems.length;
  const baseDuration = unitItems.reduce((sum, i) => sum + itemDurationMinutes(i), 0);
  const breakDuration = Math.max(Number(breakMinutes) || 0, 0) * Math.max(itemCount - 1, 0);
  return {
    itemCount,
    cost: unitItems.reduce((sum, i) => sum + (Number(i.price) || 0), 0),
    minutes: baseDuration + breakDuration,
  };
}

// Các chặng của 1 kế hoạch, đã sắp theo order_index.
export function unitsForPlan(units: Unit[] = [], planId: Id | undefined): Unit[] {
  if (!planId) return [];
  return units
    .filter((u) => u.plan_id === planId)
    .slice()
    .sort((a, b) => a.order_index - b.order_index);
}

export function planTotals(
  planUnits: Unit[] = [],
  itemsByUnit: Map<Id, Item[]> = new Map()
): PlanTotals {
  const totals: PlanTotals = {
    unitCount: planUnits.length,
    itemCount: 0,
    cost: 0,
    minutes: 0,
    locationCount: 0,
  };
  const locationIds = new Set<Id>();

  for (const unit of planUnits) {
    for (const item of itemsByUnit.get(unit.id) ?? []) {
      totals.itemCount += 1;
      totals.cost += Number(item.price) || 0;
      totals.minutes += itemDurationMinutes(item);
      for (const loc of item.locations ?? []) locationIds.add(loc.id);
    }
  }

  totals.locationCount = locationIds.size;
  return totals;
}
