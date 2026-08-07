import { CalendarClock, Clock, Copy, Map, MapPin, Pencil, Sparkles, Wallet } from "lucide-react";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import Badge from "../shared/components/Badge";
import StatTile from "../shared/components/StatTile";
import { formatDateTimeRange, formatDuration, formatPrice } from "../shared/utils/format";
import { unitStats } from "../shared/utils/planStats";
import { computeItemSchedule, unitRange } from "../shared/utils/schedule";
import type { Item, Unit } from "../shared/types/models";

export interface UnitDetailModalProps {
  open: boolean;
  unit: Unit | null;
  items: Item[];
  planName?: string | null;
  onClose: () => void;
  onEdit: (unit: Unit) => void;
  onClone?: (unit: Unit) => void;
}

export default function UnitDetailModal({
  open,
  unit,
  items,
  planName,
  onClose,
  onEdit,
  onClone,
}: UnitDetailModalProps) {
  const stats = unitStats(items, unit?.break_minutes);
  const range = unitRange(unit);
  const rangeLabel = range ? formatDateTimeRange(range.start, range.end) : null;
  const schedule = computeItemSchedule(unit, items, unit?.break_minutes ?? 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={unit?.name}
      footer={
        unit && (
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Đóng</Button>
            {onClone && (
              <Button icon={<Copy className="h-4 w-4" />} onClick={() => onClone(unit)}>
                Nhân bản
              </Button>
            )}
            <Button variant="primary" icon={<Pencil className="h-4 w-4" />} onClick={() => onEdit(unit)}>
              Sửa
            </Button>
          </div>
        )
      }
    >
      {unit && (
        <div className="pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {unit.unit_type && <Badge tone="brand">{unit.unit_type.name}</Badge>}
            {rangeLabel && (
              <Badge icon={CalendarClock} numeric>
                {rangeLabel}
              </Badge>
            )}
            <Badge tone={planName ? "violet" : "neutral"} icon={Map}>
              {planName ?? "Chưa gắn kế hoạch"}
            </Badge>
          </div>

          {unit.description && (
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">{unit.description}</p>
          )}

          {/* Tổng của chặng = tổng hợp từ các hoạt động bên trong (tính động). */}
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <StatTile icon={Sparkles} label="Hoạt động" value={stats.itemCount} />
            <StatTile icon={Clock} label="Thời lượng" value={formatDuration(stats.minutes) ?? "—"} />
            <StatTile
              icon={Wallet}
              label="Chi phí"
              value={stats.cost > 0 ? formatPrice(stats.cost) : "—"}
            />
          </div>

          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Hoạt động ({items.length})
          </p>

          {items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/16 bg-surface-secondary/40 py-6 text-center text-xs text-text-muted">
              Chặng này chưa có hoạt động nào.
            </p>
          ) : (
            <ol className="space-y-2">
              {items.map((item, index) => {
                const slot = schedule.find((entry) => entry.item.id === item.id);
                return (
                  <li key={item.id} className="rounded-xl border border-border/10 bg-surface-elevated/64 p-3">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-[11px] font-semibold text-text-primary tnum">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-text-primary">{item.name}</p>
                          {item.price != null && Number(item.price) > 0 && (
                            <span className="shrink-0 text-sm font-semibold text-text-secondary tnum">
                              {formatPrice(item.price)}
                            </span>
                          )}
                        </div>

                        {item.locations?.length > 0 && (
                          <p className="mt-1 flex items-start gap-1.5 text-xs text-text-secondary">
                            <MapPin className="mt-px h-3.5 w-3.5 shrink-0 text-text-muted" />
                            <span>{item.locations.map((l) => l.name).join(" → ")}</span>
                          </p>
                        )}

                        {slot && (
                          <span
                            className={`mt-1.5 inline-flex items-center gap-1 font-mono text-[11px] tnum ${
                              slot.inferred ? "text-text-muted" : "text-primary"
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            {slot.start.format("HH:mm")} - {slot.end.format("HH:mm")}
                            {slot.inferred && <span className="italic">(dự kiến)</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </Modal>
  );
}
