import dayjs from "dayjs";
import { itemDurationMinutes } from "./format";

// Tổng chi phí/thời lượng của Chặng = tổng hợp từ Hoạt động, của Kế hoạch = tổng
// hợp từ Chặng — luôn tính động (computed) chứ không lưu cột cứng trong DB.

// items (mọi hoạt động) -> Map<unitId, item[]> đã sắp theo order_index.
export function groupItemsByUnit(items = []) {
  const byUnit = new Map();
  for (const item of items) {
    if (!item.unit_id) continue;
    if (!byUnit.has(item.unit_id)) byUnit.set(item.unit_id, []);
    byUnit.get(item.unit_id).push(item);
  }
  for (const list of byUnit.values()) {
    list.sort((a, b) => a.order_index - b.order_index);
  }
  return byUnit;
}

export function unitStats(unitItems = [], breakMinutes = 0) {
  const itemCount = unitItems.length;
  const baseDuration = unitItems.reduce((sum, i) => sum + itemDurationMinutes(i), 0);
  const breakDuration = breakMinutes * Math.max(itemCount - 1, 0);
  return {
    itemCount,
    cost: unitItems.reduce((sum, i) => sum + (Number(i.price) || 0), 0),
    minutes: baseDuration + breakDuration,
  };
}

// Tính khoảng thời gian của chặng từ start_date + tổng thời lượng hoạt động.
export function unitComputedRange(unit, stats) {
  if (!unit?.start_date) return null;
  const start = dayjs(unit.start_date);
  const end = start.add(stats.minutes, "minute");
  return { start, end };
}

// Tính giờ bắt đầu/kết thúc cho từng hoạt động trong chặng, có tính khoảng nghỉ.
export function computeItemSchedule(unit, items, breakMinutes = 0) {
  if (!unit?.start_date || !items?.length) return [];

  let current = dayjs(unit.start_date);
  const schedule = [];

  items.forEach((item, idx) => {
    const start = current;
    const duration = itemDurationMinutes(item);
    const end = start.add(duration, "minute");
    schedule.push({ item, start, end });

    // Cộng thêm khoảng nghỉ nếu không phải hoạt động cuối cùng
    if (idx < items.length - 1 && breakMinutes > 0) {
      current = end.add(breakMinutes, "minute");
    } else {
      current = end;
    }
  });

  return schedule;
}

// Các chặng của 1 kế hoạch, đã sắp theo order_index.
export function unitsForPlan(units = [], planId) {
  return units
    .filter((u) => u.plan_id === planId)
    .slice()
    .sort((a, b) => a.order_index - b.order_index);
}

export function planTotals(planUnits = [], itemsByUnit = new Map()) {
  const totals = { unitCount: planUnits.length, itemCount: 0, cost: 0, minutes: 0 };
  const locationIds = new Set();

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
