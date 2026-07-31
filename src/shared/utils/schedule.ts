import dayjs, { type Dayjs } from "dayjs";
import type { Item, ItemRow, Unit, UnitRow } from "../types/models";

// Nơi duy nhất quyết định "một hoạt động/chặng chạy từ lúc nào tới lúc nào".
//
// Quy tắc chung cho cả hoạt động lẫn chặng: **có mốc kết thúc thì mốc kết thúc
// được ưu tiên**, không lấy mốc bắt đầu + khoảng thời gian nữa. Chỉ khi thiếu mốc
// kết thúc mới rơi về `bắt đầu + duration_minutes`.

/** Chặng mới luôn có khoảng thời gian, mặc định 6 tiếng. */
export const DEFAULT_UNIT_DURATION_MINUTES = 360;

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;

export interface TimeRange {
  start: Dayjs;
  end: Dayjs;
}

type ItemTimes = Pick<ItemRow, "start_time" | "end_time" | "duration_minutes">;
type UnitTimes = Pick<UnitRow, "start_date" | "end_date" | "duration_minutes">;

function resolveRange(
  start: string | null | undefined,
  end: string | null | undefined,
  fallbackMinutes: number
): TimeRange | null {
  if (!start) return null;
  const from = dayjs(start);
  if (!from.isValid()) return null;

  if (end) {
    const to = dayjs(end);
    // Mốc kết thúc thắng — chỉ bỏ qua nếu dữ liệu hỏng (không hợp lệ / trước lúc bắt đầu).
    if (to.isValid() && !to.isBefore(from)) return { start: from, end: to };
  }
  return { start: from, end: from.add(Math.max(fallbackMinutes, 0), "minute") };
}

// --------------------------------------------------------------------- item

/** Khung giờ thực tế của 1 hoạt động, hoặc null nếu chưa đặt giờ bắt đầu. */
export function itemRange(item: ItemTimes | null | undefined): TimeRange | null {
  if (!item) return null;
  return resolveRange(item.start_time, item.end_time, Number(item.duration_minutes) || 0);
}

/**
 * Thời lượng của 1 hoạt động (phút): khoảng cách giữa 2 mốc nếu có đủ, ngược lại
 * là `duration_minutes` nhập tay.
 */
export function itemDurationMinutes(item: ItemTimes | null | undefined): number {
  if (!item) return 0;
  if (item.start_time && item.end_time) {
    const range = itemRange(item);
    if (range) return Math.max(range.end.diff(range.start, "minute"), 0);
  }
  return Math.max(Number(item.duration_minutes) || 0, 0);
}

// --------------------------------------------------------------------- unit

/** Khoảng thời gian của 1 chặng (phút) — end_date được ưu tiên hơn duration. */
export function unitDurationMinutes(unit: UnitTimes | null | undefined): number {
  if (!unit) return DEFAULT_UNIT_DURATION_MINUTES;
  if (unit.start_date && unit.end_date) {
    const range = resolveRange(unit.start_date, unit.end_date, 0);
    if (range) {
      const diff = range.end.diff(range.start, "minute");
      if (diff > 0) return diff;
    }
  }
  return Math.max(Number(unit.duration_minutes) || DEFAULT_UNIT_DURATION_MINUTES, 1);
}

/** Khoảng thời gian thực tế của 1 chặng, hoặc null nếu chưa đặt ngày bắt đầu. */
export function unitRange(unit: UnitTimes | null | undefined): TimeRange | null {
  if (!unit) return null;
  return resolveRange(
    unit.start_date,
    unit.end_date,
    Number(unit.duration_minutes) || DEFAULT_UNIT_DURATION_MINUTES
  );
}

// ------------------------------------------------------------------ lịch trình

export interface ScheduledItem {
  item: Item;
  start: Dayjs;
  end: Dayjs;
  /** true khi giờ được suy ra từ chặng chứ không phải giờ nhập tay của hoạt động. */
  inferred: boolean;
}

/**
 * Xếp giờ cho các hoạt động trong 1 chặng: hoạt động nào tự có `start_time` thì
 * giữ nguyên giờ của nó, còn lại nối tiếp nhau từ mốc kết thúc trước đó (cộng
 * khoảng nghỉ). Trả về mảng rỗng nếu chặng chưa có giờ bắt đầu.
 */
export function computeItemSchedule(
  unit: Unit | null | undefined,
  items: Item[],
  breakMinutes = 0
): ScheduledItem[] {
  if (!unit?.start_date || items.length === 0) return [];

  let cursor = dayjs(unit.start_date);
  const schedule: ScheduledItem[] = [];

  items.forEach((item, index) => {
    const own = itemRange(item);
    const start = own ? own.start : cursor;
    const end = own ? own.end : start.add(itemDurationMinutes(item), "minute");
    schedule.push({ item, start, end, inferred: !own });

    cursor = index < items.length - 1 && breakMinutes > 0 ? end.add(breakMinutes, "minute") : end;
  });

  return schedule;
}

// --------------------------------------------------------------- tiện ích chung

/** Làm tròn 1 mốc thời gian về bội số `step` phút gần nhất (dùng khi kéo-thả). */
export function snapToMinutes(value: Dayjs, step: number): Dayjs {
  if (step <= 0) return value;
  const ms = step * MINUTE_MS;
  return dayjs(Math.round(value.valueOf() / ms) * ms);
}

/** Kẹp `value` vào trong đoạn [min, max]. */
export function clampTime(value: Dayjs, min: Dayjs, max: Dayjs): Dayjs {
  if (value.isBefore(min)) return min;
  if (value.isAfter(max)) return max;
  return value;
}

/** 2 khoảng thời gian có giao nhau không (chạm mép không tính là giao). */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start.isBefore(b.end) && b.start.isBefore(a.end);
}
