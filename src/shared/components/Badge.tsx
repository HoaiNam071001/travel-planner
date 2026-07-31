import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Chip/pill dùng chung cho mọi metadata (giờ, giá, số lượng, loại chặng...).
// Trước đây chuỗi `inline-flex items-center gap-1 rounded-full bg-...` được
// copy lại ở gần như mọi card/modal — giờ tập trung ở đây.
const TONES = {
  neutral: "bg-slate-100 text-slate-600 ring-slate-200/70",
  brand: "bg-brand-50 text-brand-700 ring-brand-200/70",
  amber: "bg-amber-50 text-amber-700 ring-amber-200/70",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  violet: "bg-violet-50 text-violet-700 ring-violet-200/70",
  rose: "bg-rose-50 text-rose-700 ring-rose-200/70",
  // Dùng trên nền tối (hero của trang Tổng quan kế hoạch).
  inverse: "bg-white/10 text-white/85 ring-white/15",
} as const;

const SIZES = {
  sm: "px-2 py-0.5 text-[11px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
} as const;

export type BadgeTone = keyof typeof TONES;
export type BadgeSize = keyof typeof SIZES;

export interface BadgeProps {
  tone?: BadgeTone;
  size?: BadgeSize;
  icon?: LucideIcon;
  numeric?: boolean;
  className?: string;
  children?: ReactNode;
}

export default function Badge({
  tone = "neutral",
  size = "md",
  icon: Icon,
  numeric = false,
  className = "",
  children,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${
        TONES[tone]
      } ${SIZES[size]} ${numeric ? "tnum" : ""} ${className}`}
    >
      {Icon && <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />}
      {children}
    </span>
  );
}
