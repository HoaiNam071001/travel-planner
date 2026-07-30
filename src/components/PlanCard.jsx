import { Link } from "react-router-dom";
import { Popconfirm } from "antd";
import { ArrowRight, CalendarClock, Pencil, Route as RouteIcon, Sparkles, Trash2 } from "lucide-react";
import Badge from "../shared/components/Badge";
import IconButton from "../shared/components/IconButton";
import { planPath } from "../shared/constants/routes";
import { dayCount, formatDateRange, formatPrice } from "../shared/utils/format";

export default function PlanCard({ plan, unitCount, itemCount, totalCost, onEdit, onDelete }) {
  const range = formatDateRange(plan.start_date, plan.end_date);
  const days = dayCount(plan.start_date, plan.end_date);

  return (
    <Link
      to={planPath(plan.id)}
      className="group surface relative flex flex-col overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover"
    >
      {/* Vệt gradient mảnh ở mép trên, sáng lên khi hover. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-700 opacity-0 transition group-hover:opacity-100"
      />

      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[17px] font-bold leading-snug">{plan.name}</h3>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <IconButton
            size="sm"
            tone="brand"
            icon={Pencil}
            onClick={(e) => {
              e.preventDefault();
              onEdit(plan);
            }}
            aria-label="Sửa kế hoạch"
          />
          <Popconfirm
            title="Xoá kế hoạch này?"
            description="Các chặng bên trong sẽ được gỡ ra, không bị xoá."
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(plan.id)}
          >
            <IconButton
              size="sm"
              tone="danger"
              icon={Trash2}
              onClick={(e) => e.preventDefault()}
              aria-label="Xoá kế hoạch"
            />
          </Popconfirm>
        </div>
      </div>

      {range && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 tnum">
          <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
          {range}
          {days > 0 && <span className="text-slate-400">· {days} ngày</span>}
        </p>
      )}

      {plan.description && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">
          {plan.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Badge tone="brand" size="sm" icon={RouteIcon} numeric>
          {unitCount} chặng
        </Badge>
        <Badge tone="violet" size="sm" icon={Sparkles} numeric>
          {itemCount} hoạt động
        </Badge>
      </div>

      <div className="mt-4 flex items-end justify-between gap-2 border-t border-slate-100 pt-3.5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Tổng chi phí
          </p>
          <p className="mt-0.5 font-display text-lg font-bold text-slate-900 tnum">
            {totalCost > 0 ? formatPrice(totalCost) : "—"}
          </p>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-brand-700 opacity-0 transition group-hover:opacity-100">
          Mở kế hoạch
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
