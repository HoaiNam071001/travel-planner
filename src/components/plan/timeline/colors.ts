// Bảng màu cố định gán theo vị trí chặng (không theo id) để cùng 1 chặng luôn ra cùng
// 1 màu trong phiên làm việc, và màu ổn định theo đúng thứ tự hiển thị (order_index).
// Dùng thẳng các thang màu mặc định của Tailwind (luôn có sẵn dù không khai báo trong
// tailwind.config.js) thay vì chỉ dựa vào `brand` — để phân biệt được nhiều chặng cạnh
// nhau. Chặng dùng mức đậm (600/700), hoạt động thuộc chặng đó dùng các mức lạt hơn,
// và mỗi hoạt động trong CÙNG 1 chặng lại xoay vòng qua 1 trong 4 sắc thái (`itemVariants`)
// để phân biệt được với hoạt động liền kề, thay vì tất cả dùng chung 1 màu như trước.

export interface UnitColor {
  /** Thanh chặng trên gantt — nền đậm, chữ trắng. */
  bar: string;
  /** Chấm tròn nhỏ dùng ở panel "chưa xếp"/label để nhận diện màu chặng. */
  dot: string;
  /** Chữ/icon dùng trên nền sáng cần tông màu chặng (vd số thứ tự ở tab Tổng quan). */
  solidChip: string;
  /** Viền trái mỏng cho hàng hoạt động ở tab Tổng quan. */
  accentBorder: string;
  /** Nền lạt cho khung lane chặng ở tab Xây dựng (board). */
  tintBg: string;
  /** 4 sắc thái xoay vòng cho hoạt động CÓ giờ riêng — cùng tông chặng nhưng phân biệt được với nhau. */
  itemVariants: string[];
  /** 4 sắc thái xoay vòng cho hoạt động CHƯA có giờ riêng (giờ dự kiến) — mờ hơn, viền chấm. */
  itemInferredVariants: string[];
}

const PALETTE: UnitColor[] = [
  {
    bar: "bg-brand-600 ring-brand-700/40",
    dot: "bg-brand-500",
    solidChip: "bg-brand-600",
    accentBorder: "border-brand-400",
    tintBg: "bg-cyan-500/10",
    itemVariants: [
      "bg-brand-100 text-brand-800 ring-brand-300/70",
      "bg-brand-200 text-brand-900 ring-brand-400/60",
      "bg-brand-300/80 text-brand-950 ring-brand-500/50",
      "bg-brand-400/60 text-brand-950 ring-brand-600/50",
    ],
    itemInferredVariants: [
      "bg-brand-50 text-brand-500 ring-brand-200 ring-dashed",
      "bg-brand-50/80 text-brand-400 ring-brand-300/60 ring-dashed",
      "bg-brand-100/70 text-brand-500 ring-brand-300/50 ring-dashed",
      "bg-brand-100/50 text-brand-400 ring-brand-400/40 ring-dashed",
    ],
  },
  {
    bar: "bg-violet-600 ring-violet-700/40",
    dot: "bg-violet-500",
    solidChip: "bg-violet-600",
    accentBorder: "border-violet-400",
    tintBg: "bg-violet-500/10",
    itemVariants: [
      "bg-violet-100 text-violet-800 ring-violet-300/70",
      "bg-violet-200 text-violet-900 ring-violet-400/60",
      "bg-violet-300/80 text-violet-950 ring-violet-500/50",
      "bg-violet-400/60 text-violet-950 ring-violet-600/50",
    ],
    itemInferredVariants: [
      "bg-violet-50 text-violet-500 ring-violet-200 ring-dashed",
      "bg-violet-50/80 text-violet-400 ring-violet-300/60 ring-dashed",
      "bg-violet-100/70 text-violet-500 ring-violet-300/50 ring-dashed",
      "bg-violet-100/50 text-violet-400 ring-violet-400/40 ring-dashed",
    ],
  },
  {
    bar: "bg-amber-600 ring-amber-700/40",
    dot: "bg-amber-500",
    solidChip: "bg-amber-600",
    accentBorder: "border-amber-400",
    tintBg: "bg-amber-500/10",
    itemVariants: [
      "bg-amber-100 text-amber-800 ring-amber-300/70",
      "bg-amber-200 text-amber-900 ring-amber-400/60",
      "bg-amber-300/80 text-amber-950 ring-amber-500/50",
      "bg-amber-400/60 text-amber-950 ring-amber-600/50",
    ],
    itemInferredVariants: [
      "bg-amber-50 text-amber-600 ring-amber-200 ring-dashed",
      "bg-amber-50/80 text-amber-500 ring-amber-300/60 ring-dashed",
      "bg-amber-100/70 text-amber-600 ring-amber-300/50 ring-dashed",
      "bg-amber-100/50 text-amber-500 ring-amber-400/40 ring-dashed",
    ],
  },
  {
    bar: "bg-emerald-600 ring-emerald-700/40",
    dot: "bg-emerald-500",
    solidChip: "bg-emerald-600",
    accentBorder: "border-emerald-400",
    tintBg: "bg-emerald-500/10",
    itemVariants: [
      "bg-emerald-100 text-emerald-800 ring-emerald-300/70",
      "bg-emerald-200 text-emerald-900 ring-emerald-400/60",
      "bg-emerald-300/80 text-emerald-950 ring-emerald-500/50",
      "bg-emerald-400/60 text-emerald-950 ring-emerald-600/50",
    ],
    itemInferredVariants: [
      "bg-emerald-50 text-emerald-600 ring-emerald-200 ring-dashed",
      "bg-emerald-50/80 text-emerald-500 ring-emerald-300/60 ring-dashed",
      "bg-emerald-100/70 text-emerald-600 ring-emerald-300/50 ring-dashed",
      "bg-emerald-100/50 text-emerald-500 ring-emerald-400/40 ring-dashed",
    ],
  },
  {
    bar: "bg-rose-600 ring-rose-700/40",
    dot: "bg-rose-500",
    solidChip: "bg-rose-600",
    accentBorder: "border-rose-400",
    tintBg: "bg-rose-500/10",
    itemVariants: [
      "bg-rose-100 text-rose-800 ring-rose-300/70",
      "bg-rose-200 text-rose-900 ring-rose-400/60",
      "bg-rose-300/80 text-rose-950 ring-rose-500/50",
      "bg-rose-400/60 text-rose-950 ring-rose-600/50",
    ],
    itemInferredVariants: [
      "bg-rose-50 text-rose-500 ring-rose-200 ring-dashed",
      "bg-rose-50/80 text-rose-400 ring-rose-300/60 ring-dashed",
      "bg-rose-100/70 text-rose-500 ring-rose-300/50 ring-dashed",
      "bg-rose-100/50 text-rose-400 ring-rose-400/40 ring-dashed",
    ],
  },
  {
    bar: "bg-indigo-600 ring-indigo-700/40",
    dot: "bg-indigo-500",
    solidChip: "bg-indigo-600",
    accentBorder: "border-indigo-400",
    tintBg: "bg-indigo-500/10",
    itemVariants: [
      "bg-indigo-100 text-indigo-800 ring-indigo-300/70",
      "bg-indigo-200 text-indigo-900 ring-indigo-400/60",
      "bg-indigo-300/80 text-indigo-950 ring-indigo-500/50",
      "bg-indigo-400/60 text-indigo-950 ring-indigo-600/50",
    ],
    itemInferredVariants: [
      "bg-indigo-50 text-indigo-500 ring-indigo-200 ring-dashed",
      "bg-indigo-50/80 text-indigo-400 ring-indigo-300/60 ring-dashed",
      "bg-indigo-100/70 text-indigo-500 ring-indigo-300/50 ring-dashed",
      "bg-indigo-100/50 text-indigo-400 ring-indigo-400/40 ring-dashed",
    ],
  },
  {
    bar: "bg-orange-600 ring-orange-700/40",
    dot: "bg-orange-500",
    solidChip: "bg-orange-600",
    accentBorder: "border-orange-400",
    tintBg: "bg-orange-500/10",
    itemVariants: [
      "bg-orange-100 text-orange-800 ring-orange-300/70",
      "bg-orange-200 text-orange-900 ring-orange-400/60",
      "bg-orange-300/80 text-orange-950 ring-orange-500/50",
      "bg-orange-400/60 text-orange-950 ring-orange-600/50",
    ],
    itemInferredVariants: [
      "bg-orange-50 text-orange-600 ring-orange-200 ring-dashed",
      "bg-orange-50/80 text-orange-500 ring-orange-300/60 ring-dashed",
      "bg-orange-100/70 text-orange-600 ring-orange-300/50 ring-dashed",
      "bg-orange-100/50 text-orange-500 ring-orange-400/40 ring-dashed",
    ],
  },
  {
    bar: "bg-teal-600 ring-teal-700/40",
    dot: "bg-teal-500",
    solidChip: "bg-teal-600",
    accentBorder: "border-teal-400",
    tintBg: "bg-teal-500/10",
    itemVariants: [
      "bg-teal-100 text-teal-800 ring-teal-300/70",
      "bg-teal-200 text-teal-900 ring-teal-400/60",
      "bg-teal-300/80 text-teal-950 ring-teal-500/50",
      "bg-teal-400/60 text-teal-950 ring-teal-600/50",
    ],
    itemInferredVariants: [
      "bg-teal-50 text-teal-600 ring-teal-200 ring-dashed",
      "bg-teal-50/80 text-teal-500 ring-teal-300/60 ring-dashed",
      "bg-teal-100/70 text-teal-600 ring-teal-300/50 ring-dashed",
      "bg-teal-100/50 text-teal-500 ring-teal-400/40 ring-dashed",
    ],
  },
];

/** `index` = vị trí chặng trong danh sách đã sắp `order_index` (ổn định, không theo id). */
export function unitColor(index: number): UnitColor {
  return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length] ?? PALETTE[0]!;
}

/**
 * Màu cho 1 hoạt động cụ thể bên trong 1 chặng: cùng tông với `color` (chặng cha) nhưng
 * xoay vòng qua 1 trong 4 sắc thái theo `itemIndexInUnit`, để các hoạt động liền kề trong
 * cùng 1 chặng phân biệt được với nhau thay vì tất cả cùng 1 màu.
 */
export function itemColorInUnit(color: UnitColor, itemIndexInUnit: number, inferred = false): string {
  const variants = inferred ? color.itemInferredVariants : color.itemVariants;
  const i = ((itemIndexInUnit % variants.length) + variants.length) % variants.length;
  return variants[i] ?? variants[0]!;
}

/** Số sắc thái mỗi tông màu có — cũng là số bậc giá phân biệt được. */
export const ITEM_SHADE_COUNT = 4;

/**
 * Bậc "đậm nhạt" theo GIÁ thay vì theo thứ tự trong chặng: cùng tông màu với chặng cha,
 * nhưng hoạt động càng đắt thì màu càng đậm — nhìn gantt là đoán được tiền đang đổ vào
 * đâu. `maxPrice` là giá cao nhất trong toàn kế hoạch (mốc so sánh chung, để 2 chặng
 * cạnh nhau vẫn so sánh được với nhau chứ không mỗi chặng một thang riêng).
 *
 * Thang chia theo CĂN BẬC HAI của tỉ lệ giá, không tuyến tính: chi phí du lịch thường
 * lệch mạnh (1 khoản vé máy bay át hết mọi khoản ăn uống), chia tuyến tính thì gần như
 * mọi thứ rơi hết vào bậc 0.
 */
export function priceShadeIndex(
  price: number | string | null | undefined,
  maxPrice: number
): number {
  const value = Number(price) || 0;
  if (value <= 0 || maxPrice <= 0) return 0;
  const ratio = Math.sqrt(Math.min(value / maxPrice, 1));
  return Math.min(Math.round(ratio * (ITEM_SHADE_COUNT - 1)), ITEM_SHADE_COUNT - 1);
}
