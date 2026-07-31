import dayjs, { type Dayjs } from "dayjs";
import { HOUR_MS } from "../../../shared/utils/schedule";

// Quy đổi thời gian <-> pixel cho tab Lịch trình. Tách riêng khỏi component để
// phần "đúng tỉ lệ thời gian" có thể suy luận (và sửa) một chỗ duy nhất.

/** Các mức zoom (px cho mỗi giờ) — nhỏ nhất xem được cả tháng, lớn nhất xem theo giờ. */
export const ZOOM_LEVELS = [3, 6, 12, 24, 48] as const;

export interface TimeScale {
  /** 00:00 của ngày bắt đầu kế hoạch. */
  origin: Dayjs;
  /** 24:00 của ngày kết thúc kế hoạch. */
  end: Dayjs;
  pxPerHour: number;
  /** Bề rộng toàn bộ dải thời gian (px). */
  width: number;
  totalMs: number;
  /** Mốc 00:00 của từng ngày trong kế hoạch. */
  days: Dayjs[];
  /** Khoảng cách giữa 2 vạch giờ (giờ) — tự giãn ra khi zoom nhỏ. */
  hourStep: number;
  xOf: (time: Dayjs) => number;
  widthOf: (from: Dayjs, to: Dayjs) => number;
  timeAt: (x: number) => Dayjs;
}

/** Vạch giờ phải rộng tối thiểu ~48px thì nhãn mới đọc được. */
function pickHourStep(pxPerHour: number): number {
  const candidates = [1, 2, 3, 4, 6, 8, 12, 24];
  return candidates.find((step) => step * pxPerHour >= 48) ?? 24;
}

export function createScale(
  planStart: string,
  planEnd: string,
  pxPerHour: number
): TimeScale {
  const origin = dayjs(planStart).startOf("day");
  const end = dayjs(planEnd).endOf("day").add(1, "millisecond");
  const totalMs = Math.max(end.diff(origin), HOUR_MS);
  const width = (totalMs / HOUR_MS) * pxPerHour;

  const dayTotal = Math.max(Math.ceil(totalMs / (24 * HOUR_MS)), 1);
  const days = Array.from({ length: dayTotal }, (_, i) => origin.add(i, "day"));

  return {
    origin,
    end,
    pxPerHour,
    width,
    totalMs,
    days,
    hourStep: pickHourStep(pxPerHour),
    xOf: (time) => (time.diff(origin) / HOUR_MS) * pxPerHour,
    widthOf: (from, to) => (Math.max(to.diff(from), 0) / HOUR_MS) * pxPerHour,
    timeAt: (x) => origin.add((x / pxPerHour) * HOUR_MS, "millisecond"),
  };
}

/** Mức zoom vừa đủ để cả kế hoạch lọt vào bề rộng `containerWidth`. */
export function fitZoom(planStart: string, planEnd: string, containerWidth: number): number {
  const hours = Math.max(
    dayjs(planEnd).endOf("day").diff(dayjs(planStart).startOf("day"), "hour"),
    1
  );
  const ideal = containerWidth / hours;
  // Chọn mức lớn nhất mà vẫn vừa khung; nếu không mức nào vừa thì lấy mức nhỏ nhất.
  const fitting = ZOOM_LEVELS.filter((level) => level <= ideal);
  return fitting.length > 0 ? Math.max(...fitting) : ZOOM_LEVELS[0];
}
