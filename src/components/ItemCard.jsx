import { Popconfirm } from "antd";
import { Clock, GripVertical, MapPin, Pencil, Route as RouteIcon, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Badge from "../shared/components/Badge";
import IconButton from "../shared/components/IconButton";
import { formatPrice, formatTimeRange } from "../shared/utils/format";

const VISIBLE_LOCATIONS = 2;

export default function ItemCard({ item, unitName, onOpenDetail, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const locations = item.locations ?? [];
  const extraCount = locations.length - VISIBLE_LOCATIONS;
  const cover = locations.find((l) => l.images?.length)?.images?.[0];
  const time = formatTimeRange(item.start_time, item.end_time);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => onOpenDetail(item)}
      className={`group surface flex cursor-pointer flex-col overflow-hidden transition duration-200 hover:border-brand-200 hover:shadow-card-hover ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {cover && (
        <img src={cover} alt="" className="h-28 w-full object-cover" />
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-1">
            <button
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="-ml-1 mt-0.5 cursor-grab touch-none rounded p-0.5 text-slate-300 transition hover:text-slate-500 active:cursor-grabbing"
              aria-label="Kéo để sắp xếp"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <h3 className="min-w-0 text-[15px] font-bold leading-snug">{item.name}</h3>
          </div>

          <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <IconButton
              size="sm"
              tone="brand"
              icon={Pencil}
              onClick={() => onEdit(item)}
              aria-label="Sửa"
            />
            <Popconfirm
              title="Xoá hoạt động này?"
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(item.id)}
            >
              <IconButton size="sm" tone="danger" icon={Trash2} aria-label="Xoá" />
            </Popconfirm>
          </div>
        </div>

        {locations.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {locations.slice(0, VISIBLE_LOCATIONS).map((loc) => (
              <Badge key={loc.id} size="sm" tone="amber" icon={MapPin}>
                {loc.name}
              </Badge>
            ))}
            {extraCount > 0 && (
              <Badge size="sm">+{extraCount} địa điểm</Badge>
            )}
          </div>
        )}

        {item.note && (
          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-slate-500">{item.note}</p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-3.5 text-xs text-slate-500">
          {time && (
            <span className="inline-flex items-center gap-1 font-mono tnum">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {time}
            </span>
          )}
          {item.price != null && Number(item.price) > 0 && (
            <span className="ml-auto font-semibold text-slate-800 tnum">
              {formatPrice(item.price)}
            </span>
          )}
        </div>

        {/* Cho biết hoạt động đang thuộc chặng nào — trước đây phải sang trang Chặng mới biết. */}
        <p className="mt-2.5 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-400">
          <RouteIcon className="h-3 w-3 shrink-0" />
          {unitName ? (
            <span className="truncate text-slate-500">{unitName}</span>
          ) : (
            "Chưa gắn chặng nào"
          )}
        </p>
      </div>
    </div>
  );
}
