import dayjs, { type Dayjs } from "dayjs";

// Tập trung mọi định dạng hiển thị (tiền, ngày, giờ, thời lượng) — trước đây mỗi
// card/modal tự viết lại `formatRange` riêng nên format lệch nhau giữa các trang.
// Phần *tính* giờ bắt đầu/kết thúc nằm ở `schedule.ts`, file này chỉ lo hiển thị.

export type DateInput = string | number | Date | Dayjs | null | undefined;

export function formatPrice(value: number | string | null | undefined): string {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

// Rút gọn cho stat tile / badge: 12.400.000 -> "12,4 tr".
export function formatPriceShort(value: number | string | null | undefined): string {
  const n = Number(value || 0);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(".", ",")} tỉ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function formatDate(date: DateInput): string | null {
  return date ? dayjs(date).format("DD/MM/YYYY") : null;
}

export function formatTime(date: DateInput): string | null {
  return date ? dayjs(date).format("HH:mm") : null;
}

export function formatDateRange(start: DateInput, end: DateInput): string | null {
  if (!start || !end) return null;
  const from = dayjs(start);
  const to = dayjs(end);
  // Cùng năm thì bỏ năm ở đầu cho gọn: "12/02 - 16/02/2026".
  return from.isSame(to, "year")
    ? `${from.format("DD/MM")} - ${to.format("DD/MM/YYYY")}`
    : `${from.format("DD/MM/YYYY")} - ${to.format("DD/MM/YYYY")}`;
}

export function formatDateTimeRange(start: DateInput, end: DateInput): string | null {
  if (!start || !end) return null;
  const from = dayjs(start);
  const to = dayjs(end);
  // Cùng ngày thì chỉ hiện giờ kết thúc: "12/02 08:00 - 18:00".
  return from.isSame(to, "day")
    ? `${from.format("DD/MM HH:mm")} - ${to.format("HH:mm")}`
    : `${from.format("DD/MM HH:mm")} - ${to.format("DD/MM HH:mm")}`;
}

export function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = Math.round(minutes % 60);
  if (days > 0) return hours ? `${days} ngày ${hours}h` : `${days} ngày`;
  if (!hours) return `${mins} phút`;
  return mins ? `${hours}h${String(mins).padStart(2, "0")}` : `${hours} giờ`;
}

// Số ngày của 1 khoảng thời gian, tính cả ngày đầu và ngày cuối.
export function dayCount(start: DateInput, end: DateInput): number {
  if (!start || !end) return 0;
  return dayjs(end).startOf("day").diff(dayjs(start).startOf("day"), "day") + 1;
}

/** Khoảng cách dạng "700 m" / "1,2 km" cho tính năng tìm địa điểm quanh đây. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}
