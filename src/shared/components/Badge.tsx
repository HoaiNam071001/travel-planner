import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

const TONES = {
  neutral: "bg-surface-secondary text-text-secondary ring-border/80",
  brand: "bg-primary/12 text-primary ring-primary/20",
  amber: "bg-warning/12 text-warning ring-warning/20",
  emerald: "bg-success/12 text-success ring-success/20",
  violet: "bg-violet-500/12 text-violet-300 dark:text-violet-200 ring-violet-500/20",
  rose: "bg-danger/12 text-danger ring-danger/20",
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
