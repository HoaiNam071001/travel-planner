import dayjs from "dayjs";

// Tập trung mọi định dạng hiển thị (tiền, ngày, giờ, thời lượng) — trước đây mỗi
// card/modal tự viết lại `formatRange` riêng nên format lệch nhau giữa các trang.

export function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

// Rút gọn cho stat tile / badge: 12.400.000 -> "12,4 tr".
export function formatPriceShort(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(".", ",")} tỉ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function formatDate(date) {
  return date ? dayjs(date).format("DD/MM/YYYY") : null;
}

export function formatDateRange(start, end) {
  if (!start || !end) return null;
  const from = dayjs(start);
  const to = dayjs(end);
  // Cùng năm thì bỏ năm ở đầu cho gọn: "12/02 - 16/02/2026".
  return from.isSame(to, "year")
    ? `${from.format("DD/MM")} - ${to.format("DD/MM/YYYY")}`
    : `${from.format("DD/MM/YYYY")} - ${to.format("DD/MM/YYYY")}`;
}

export function formatDateTimeRange(start, end) {
  if (!start || !end) return null;
  const from = dayjs(start);
  const to = dayjs(end);
  // Cùng ngày thì chỉ hiện giờ kết thúc: "12/02 08:00 - 18:00".
  return from.isSame(to, "day")
    ? `${from.format("DD/MM HH:mm")} - ${to.format("HH:mm")}`
    : `${from.format("DD/MM HH:mm")} - ${to.format("DD/MM HH:mm")}`;
}

// `items.start_time` / `end_time` là cột `time` của Postgres -> "08:00:00".
export function formatTimeRange(startTime, endTime) {
  if (!startTime || !endTime) return null;
  return `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`;
}

export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (!hours) return `${mins} phút`;
  return mins ? `${hours}h${String(mins).padStart(2, "0")}` : `${hours} giờ`;
}

// Thời lượng của 1 hoạt động, tính từ khung giờ start_time/end_time (phút).
// Khung giờ qua nửa đêm (vd 22:00 - 01:00) được cộng thêm 1 ngày.
export function itemDurationMinutes(item) {
  if (!item?.start_time || !item?.end_time) return 0;
  const toMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const diff = toMinutes(item.end_time) - toMinutes(item.start_time);
  return diff >= 0 ? diff : diff + 24 * 60;
}

// Số ngày của 1 khoảng thời gian, tính cả ngày đầu và ngày cuối.
export function dayCount(start, end) {
  if (!start || !end) return 0;
  return dayjs(end).startOf("day").diff(dayjs(start).startOf("day"), "day") + 1;
}
