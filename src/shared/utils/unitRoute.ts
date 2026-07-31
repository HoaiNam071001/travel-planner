// Suy ra chuỗi điểm địa lý của 1 chặng (nối phẳng địa điểm của từng hoạt động, theo đúng
// thứ tự hoạt động trong chặng rồi thứ tự địa điểm trong từng hoạt động) — dùng làm input
// cho openRouteService.fetchRoute và để phát hiện khi nào cache unit_routes bị lệch.
import type { RouteLeg } from "../../services/openRouteService";
import type { Item, ItemLocation } from "../types/models";

/** `items` phải đã sort theo `order_index` trong chặng (vd qua `groupItemsByUnit`). */
export function unitLocationSequence(items: Item[]): ItemLocation[] {
  const points: ItemLocation[] = [];
  for (const item of items) {
    for (const loc of item.locations ?? []) {
      points.push(loc);
    }
  }
  return points;
}

export function locationSequenceSignature(locations: ItemLocation[]): string {
  return locations.map((l) => l.id).join("|");
}

/**
 * Chặng di chuyển giữa hoạt động `i` và `i+1` — chỉ có giá trị khi CẢ HAI đều có địa
 * điểm (không "nhảy cóc" qua hoạt động không có địa điểm ở giữa). `legs` phải được tính
 * từ đúng `unitLocationSequence(items)` của cùng mảng `items` truyền vào đây.
 */
export function itemTransitionLegs(items: Item[], legs: RouteLeg[]): (RouteLeg | null)[] {
  let cursor = 0;
  const ranges = items.map((item) => {
    const count = item.locations?.length ?? 0;
    if (count === 0) return null;
    const range = { start: cursor, end: cursor + count - 1 };
    cursor += count;
    return range;
  });

  const result: (RouteLeg | null)[] = [];
  for (let i = 0; i < items.length - 1; i++) {
    const from = ranges[i];
    const to = ranges[i + 1];
    result.push(from && to ? legs[from.end] ?? null : null);
  }
  return result;
}
