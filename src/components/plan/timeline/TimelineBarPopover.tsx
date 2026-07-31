import type { ReactElement, ReactNode } from "react";
import { Popover } from "antd";
import { CalendarClock, Clock, MapPin, Sparkles, Wallet } from "lucide-react";
import Badge from "../../../shared/components/Badge";
import { formatDateTimeRange, formatDuration, formatPrice } from "../../../shared/utils/format";
import type { TimeRange } from "../../../shared/utils/schedule";
import type { Item, Unit, UnitStats } from "../../../shared/types/models";

/**
 * Popover chi tiết khi hover 1 thanh trên gantt (500ms). Dùng antd `Popover` thay vì tự
 * dựng floating layer: nó tự portal ra `document.body` nên không bị `overflow-auto` của
 * khung cuộn gantt cắt mất, và tự chọn hướng đặt khi gần rìa màn hình.
 */
export function HoverPopover({ content, children }: { content: ReactNode; children: ReactElement }) {
  return (
    <Popover
      content={<div className="max-w-[260px]">{content}</div>}
      trigger="hover"
      mouseEnterDelay={0.5}
      mouseLeaveDelay={0.1}
      placement="top"
    >
      {children}
    </Popover>
  );
}

export function UnitPopoverContent({
  unit,
  stats,
  range,
}: {
  unit: Unit;
  stats: UnitStats;
  range: TimeRange;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[13px] font-bold text-slate-800">{unit.name}</p>
        {unit.unit_type && (
          <Badge size="sm" tone="brand" className="mt-1">
            {unit.unit_type.name}
          </Badge>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <CalendarClock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="tnum">{formatDateTimeRange(range.start, range.end)}</span>
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge size="sm" icon={Sparkles} numeric>
          {stats.itemCount} hoạt động
        </Badge>
        {stats.minutes > 0 && (
          <Badge size="sm" icon={Clock} numeric>
            {formatDuration(stats.minutes)}
          </Badge>
        )}
        {stats.cost > 0 && (
          <Badge size="sm" tone="emerald" icon={Wallet} numeric>
            {formatPrice(stats.cost)}
          </Badge>
        )}
      </div>

      {unit.description && (
        <p className="text-xs leading-relaxed text-slate-500">{unit.description}</p>
      )}
    </div>
  );
}

export function ItemPopoverContent({
  item,
  range,
  inferred,
}: {
  item: Item;
  range: TimeRange;
  inferred: boolean;
}) {
  const thumb = item.locations?.find((l) => l.images?.length)?.images?.[0];

  return (
    <div className="flex gap-3">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-bold text-slate-800">{item.name}</p>
          {item.price != null && Number(item.price) > 0 && (
            <span className="shrink-0 text-xs font-semibold text-slate-700 tnum">
              {formatPrice(item.price)}
            </span>
          )}
        </div>

        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="tnum">{formatDateTimeRange(range.start, range.end)}</span>
          {inferred && <span className="text-slate-400">(dự kiến)</span>}
        </p>

        {item.locations?.length > 0 && (
          <p className="flex items-start gap-1.5 text-xs text-slate-500">
            <MapPin className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{item.locations.map((l) => l.name).join(" → ")}</span>
          </p>
        )}

        {item.note && <p className="text-xs leading-relaxed text-slate-400">{item.note}</p>}
      </div>

      {thumb && (
        <img src={thumb} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover" />
      )}
    </div>
  );
}
