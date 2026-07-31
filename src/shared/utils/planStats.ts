import type { Id, Item, PlanExpense, PlanTotals, Unit, UnitStats } from "../types/models";
import { itemDurationMinutes } from "./schedule";
import { unitColor, type UnitColor } from "../../components/plan/timeline/colors";

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
  itemsByUnit: Map<Id, Item[]> = new Map(),
  expenses: PlanExpense[] = []
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

  // "Chi phí khác" cộng vào tổng chi phí nhưng KHÔNG cộng vào tổng thời lượng — stat đó
  // giữ đúng nghĩa "thời lượng hoạt động", không lẫn với chi phí không phải hoạt động.
  for (const expense of expenses) {
    totals.cost += Number(expense.price) || 0;
  }

  totals.locationCount = locationIds.size;
  return totals;
}

// "Chi phí khác" (plan_expenses) gắn thẳng vào plan, không qua units — khác items nên
// gom theo plan_id thay vì unit_id.
export function groupExpensesByPlan(expenses: PlanExpense[] = []): Map<Id, PlanExpense[]> {
  const byPlan = new Map<Id, PlanExpense[]>();
  for (const expense of expenses) {
    const list = byPlan.get(expense.plan_id);
    if (list) list.push(expense);
    else byPlan.set(expense.plan_id, [expense]);
  }
  for (const list of byPlan.values()) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  return byPlan;
}

/**
 * Không có field phân loại (category) cho "chi phí khác" — phân biệt các khoản bằng màu,
 * tái dùng thẳng bảng màu của `unitColor()` xoay vòng theo thứ tự `created_at`, để cùng 1
 * khoản chi phí luôn ra cùng 1 màu ở cả tab "Chi phí khác" lẫn gantt tab Lịch trình.
 */
export function expenseColorIndex(expenses: PlanExpense[] = []): Map<Id, number> {
  const sorted = expenses.slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
  const map = new Map<Id, number>();
  sorted.forEach((expense, index) => map.set(expense.id, index));
  return map;
}

export function expenseColor(index: number): UnitColor {
  return unitColor(index);
}
