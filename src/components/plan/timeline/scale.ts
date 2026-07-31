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

export interface ClampedBar {
  left: number;
  width: number;
  /** Bị kẹp ở mép trái — thanh gốc bắt đầu trước `scale.origin`. */
  clippedLeft: boolean;
  /** Bị kẹp ở mép phải — thanh gốc kết thúc sau `scale.end`. */
  clippedRight: boolean;
}

/**
 * Kẹp vị trí/độ rộng 1 thanh vào trong `[0, canvasWidth]` để chặng/hoạt động có ngày
 * nằm ngoài khoảng thời gian kế hoạch vẫn hiện được (dán vào rìa) và luôn bấm/kéo được,
 * thay vì biến mất khỏi canvas hoặc yêu cầu cuộn tới toạ độ âm.
 */
export function clampBarToCanvas(
  left: number,
  width: number,
  canvasWidth: number,
  minVisible = 18
): ClampedBar {
  const right = left + width;
  const clippedLeft = left < 0;
  const clippedRight = right > canvasWidth;

  const clampedLeft = Math.min(Math.max(left, 0), Math.max(canvasWidth - minVisible, 0));
  const clampedRight = Math.max(Math.min(right, canvasWidth), Math.min(minVisible, canvasWidth));
  const clampedWidth = Math.max(clampedRight - clampedLeft, minVisible);

  return { left: clampedLeft, width: clampedWidth, clippedLeft, clippedRight };
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
