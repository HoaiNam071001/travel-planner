import { CalendarClock, Clock, Copy, MapPin, Pencil, Route as RouteIcon, Wallet } from "lucide-react";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import Badge from "../shared/components/Badge";
import { formatDateTimeRange, formatDuration, formatPrice } from "../shared/utils/format";
import { itemDurationMinutes, itemRange } from "../shared/utils/schedule";
import type { Item } from "../shared/types/models";

export interface ItemDetailModalProps {
  open: boolean;
  item: Item | null;
  unitName?: string | null;
  onClose: () => void;
  onEdit: (item: Item) => void;
  onClone?: (item: Item) => void;
}

export default function ItemDetailModal({
  open,
  item,
  unitName,
  onClose,
  onEdit,
  onClone,
}: ItemDetailModalProps) {
  const duration = item ? formatDuration(itemDurationMinutes(item)) : null;
  const range = itemRange(item);
  const rangeLabel = range ? formatDateTimeRange(range.start, range.end) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item?.name}
      footer={
        item && (
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Đóng</Button>
            {onClone && (
              <Button icon={<Copy className="h-4 w-4" />} onClick={() => onClone(item)}>
                Nhân bản
              </Button>
            )}
            <Button variant="primary" icon={<Pencil className="h-4 w-4" />} onClick={() => onEdit(item)}>
              Sửa
            </Button>
          </div>
        )
      }
    >
      {item && (
        <div className="pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {rangeLabel && (
              <Badge tone="brand" icon={CalendarClock} numeric>
                {rangeLabel}
              </Badge>
            )}
            {duration && (
              <Badge icon={Clock} numeric>
                {duration}
              </Badge>
            )}
            {item.price != null && Number(item.price) > 0 && (
              <Badge tone="emerald" icon={Wallet} numeric>
                {formatPrice(item.price)}
              </Badge>
            )}
            <Badge tone={unitName ? "violet" : "neutral"} icon={RouteIcon}>
              {unitName ?? "Chưa gắn chặng"}
            </Badge>
          </div>

          {item.note && <p className="mt-4 text-sm leading-relaxed text-slate-600">{item.note}</p>}

          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Địa điểm ({item.locations?.length ?? 0})
          </p>

          {(item.locations?.length ?? 0) === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">
              Hoạt động này chưa gắn địa điểm nào.
            </p>
          ) : (
            <ol className="space-y-2">
              {item.locations.map((loc, index) => (
                <li key={loc.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-semibold text-white tnum">
                    {index + 1}
                  </span>
                  {loc.images?.[0] ? (
                    <img
                      src={loc.images[0]}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{loc.name}</p>
                    <p className="font-mono text-xs text-slate-400 tnum">
                      {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </Modal>
  );
}
