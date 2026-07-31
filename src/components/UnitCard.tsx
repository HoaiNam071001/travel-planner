import { Popconfirm } from "antd";
import { CalendarClock, Clock, Map, Pencil, Sparkles, Trash2, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Badge from "../shared/components/Badge";
import IconButton from "../shared/components/IconButton";
import { formatDateTimeRange, formatDuration, formatPrice } from "../shared/utils/format";
import { unitRange } from "../shared/utils/schedule";
import type { Id, Unit, UnitStats } from "../shared/types/models";

export interface UnitCardProps {
  unit: Unit;
  stats: UnitStats;
  planName?: string | null;
  onOpenDetail: (unit: Unit) => void;
  onEdit: (unit: Unit) => void;
  onDelete: (id: Id) => void;
}

export default function UnitCard({
  unit,
  stats,
  planName,
  onOpenDetail,
  onEdit,
  onDelete,
}: UnitCardProps) {
  const range = unitRange(unit);
  const rangeLabel = range ? formatDateTimeRange(range.start, range.end) : null;

  return (
    <div
      onClick={() => onOpenDetail(unit)}
      className="group surface flex cursor-pointer flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-bold leading-snug">{unit.name}</h3>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <IconButton size="sm" tone="brand" icon={Pencil} onClick={() => onEdit(unit)} aria-label="Sửa" />
          <Popconfirm
            title="Xoá chặng này?"
            description="Hoạt động bên trong sẽ được gỡ ra, không bị xoá."
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(unit.id)}
          >
            <IconButton size="sm" tone="danger" icon={Trash2} aria-label="Xoá" />
          </Popconfirm>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {unit.unit_type && (
          <Badge tone="brand" size="sm">
            {unit.unit_type.name}
          </Badge>
        )}
        {planName ? (
          <Badge tone="violet" size="sm" icon={Map}>
            {planName}
          </Badge>
        ) : (
          <Badge size="sm">Chưa gắn kế hoạch</Badge>
        )}
      </div>

      {rangeLabel ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 tnum">
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {rangeLabel}
        </p>
      ) : (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-400">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          Chưa xếp lịch
        </p>
      )}

      {unit.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">{unit.description}</p>
      )}

      {/* Tổng chi phí / thời lượng của chặng — tính động từ các hoạt động bên trong. */}
      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-slate-100 pt-3.5 [&>div]:min-w-0">
        <Stat icon={Sparkles} label="Hoạt động" value={stats.itemCount} />
        <Stat icon={Clock} label="Thời lượng" value={formatDuration(stats.minutes) ?? "—"} />
        <Stat icon={Wallet} label="Chi phí" value={stats.cost > 0 ? formatPrice(stats.cost) : "—"} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-800 tnum">{value}</p>
    </div>
  );
}
