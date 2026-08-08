import { CalendarClock, Clock, Copy, MapPin, Pencil, Route as RouteIcon, Wallet } from "lucide-react";
import { useTranslation } from "../i18n/useAppTranslation";
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
  const { t } = useTranslation(["items", "common"]);
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
            <Button onClick={onClose}>{t("common:actions.close")}</Button>
            {onClone && (
              <Button icon={<Copy className="h-4 w-4" />} onClick={() => onClone(item)}>
                {t("items:card.clone")}
              </Button>
            )}
            <Button variant="primary" icon={<Pencil className="h-4 w-4" />} onClick={() => onEdit(item)}>
              {t("items:card.edit")}
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
              {unitName ?? t("items:detail.unassignedUnit")}
            </Badge>
          </div>

          {item.note && <p className="mt-4 text-sm leading-relaxed text-text-secondary">{item.note}</p>}

          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t("items:detail.locationsHeading", { count: item.locations?.length ?? 0 })}
          </p>

          {(item.locations?.length ?? 0) === 0 ? (
            <p className="rounded-xl border border-dashed border-border/16 bg-surface-secondary/40 py-6 text-center text-xs text-text-muted">
              {t("items:detail.locationsEmpty")}
            </p>
          ) : (
            <ol className="space-y-2">
              {item.locations.map((loc, index) => (
                <li key={loc.id} className="flex items-center gap-3 rounded-xl border border-border/10 bg-surface-elevated/64 p-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-[11px] font-semibold text-text-primary tnum">
                    {index + 1}
                  </span>
                  {loc.images?.[0] ? (
                    <img
                      src={loc.images[0]}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg border border-border/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border/10 bg-surface-secondary/80 text-text-muted">
                      <MapPin className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{loc.name}</p>
                    <p className="font-mono text-xs text-text-muted tnum">
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
