import { Popconfirm } from "antd";
import {
  CalendarClock,
  Clock,
  Copy,
  GripVertical,
  MapPin,
  Pencil,
  Route as RouteIcon,
  Trash2,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "../i18n/useAppTranslation";
import Badge from "../shared/components/Badge";
import IconButton from "../shared/components/IconButton";
import { formatDateTimeRange, formatDuration, formatPrice } from "../shared/utils/format";
import { itemDurationMinutes, itemRange } from "../shared/utils/schedule";
import type { Id, Item } from "../shared/types/models";

const VISIBLE_LOCATIONS = 2;

export interface ItemCardProps {
  item: Item;
  unitName?: string | null;
  onOpenDetail: (item: Item) => void;
  onEdit: (item: Item) => void;
  onClone: (item: Item) => void;
  onDelete: (id: Id) => void;
}

export default function ItemCard({
  item,
  unitName,
  onOpenDetail,
  onEdit,
  onClone,
  onDelete,
}: ItemCardProps) {
  const { t } = useTranslation("items");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const locations = item.locations ?? [];
  const extraCount = locations.length - VISIBLE_LOCATIONS;
  const cover = locations.find((l) => l.images?.length)?.images?.[0];
  const duration = formatDuration(itemDurationMinutes(item));
  const range = itemRange(item);
  const rangeLabel = range ? formatDateTimeRange(range.start, range.end) : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => onOpenDetail(item)}
      className={`group surface flex cursor-pointer flex-col overflow-hidden transition duration-200 hover:bg-surface-elevated/84 hover:shadow-card-hover ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {cover && <img src={cover} alt="" className="h-28 w-full object-cover" />}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-1">
            <button
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="-ml-1 mt-0.5 cursor-grab touch-none rounded p-0.5 text-text-muted transition hover:text-text-secondary active:cursor-grabbing"
              aria-label={t("card.drag")}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <h3 className="min-w-0 text-[15px] font-bold leading-snug text-text-primary">{item.name}</h3>
          </div>

          <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <IconButton size="sm" tone="brand" icon={Pencil} onClick={() => onEdit(item)} aria-label={t("card.edit")} />
            <IconButton size="sm" icon={Copy} onClick={() => onClone(item)} aria-label={t("card.clone")} />
            <Popconfirm
              title={t("card.deleteTitle")}
              okText={t("common:actions.delete")}
              cancelText={t("common:actions.cancel")}
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(item.id)}
            >
              <IconButton size="sm" tone="danger" icon={Trash2} aria-label={t("card.delete")} />
            </Popconfirm>
          </div>
        </div>

        {rangeLabel && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary tnum">
            <CalendarClock className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            {rangeLabel}
          </p>
        )}

        {locations.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {locations.slice(0, VISIBLE_LOCATIONS).map((loc) => (
              <Badge key={loc.id} size="sm" tone="amber" icon={MapPin}>
                {loc.name}
              </Badge>
            ))}
            {extraCount > 0 && <Badge size="sm">{t("card.moreLocations", { count: extraCount })}</Badge>}
          </div>
        )}

        {item.note && <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-text-secondary">{item.note}</p>}

        <div className="mt-auto flex items-center gap-2 pt-3.5 text-xs text-text-secondary">
          {duration && (
            <span className="inline-flex items-center gap-1 font-mono tnum">
              <Clock className="h-3.5 w-3.5 text-text-muted" />
              {duration}
            </span>
          )}
          {item.price != null && Number(item.price) > 0 && (
            <span className="ml-auto font-semibold text-text-primary tnum">{formatPrice(item.price)}</span>
          )}
        </div>

        <p className="mt-2.5 flex items-center gap-1.5 border-t border-border/8 pt-2.5 text-[11px] text-text-muted">
          <RouteIcon className="h-3 w-3 shrink-0" />
          {unitName ? <span className="truncate text-text-secondary">{unitName}</span> : t("card.noUnit")}
        </p>
      </div>
    </div>
  );
}
