import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Ô số liệu (số chặng / hoạt động / tổng chi phí...). `inverse` dùng trên hero tối.
export interface StatTileProps {
  icon?: LucideIcon;
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  inverse?: boolean;
}

export default function StatTile({ icon: Icon, label, value, sub, inverse = false }: StatTileProps) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 ${
        inverse
          ? "border border-white/10 bg-white/[0.07] backdrop-blur-sm"
          : "border border-slate-200/80 bg-white shadow-card"
      }`}
    >
      <div
        className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${
          inverse ? "text-white/55" : "text-slate-400"
        }`}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <p
        className={`mt-1.5 font-display text-xl font-bold leading-none tnum ${
          inverse ? "text-white" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className={`mt-1 text-[11px] ${inverse ? "text-white/50" : "text-slate-400"}`}>{sub}</p>
      )}
    </div>
  );
}
