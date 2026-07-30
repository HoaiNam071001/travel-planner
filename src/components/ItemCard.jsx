import { MapPin, Clock, Wallet, Pencil, Trash2, GripVertical } from "lucide-react";
import { Popconfirm } from "antd";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const VISIBLE_LOCATIONS = 2;

export default function ItemCard({ item, onOpenDetail, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const locations = item.locations ?? [];
  const extraCount = locations.length - VISIBLE_LOCATIONS;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onOpenDetail(item)}
      className="group relative cursor-pointer rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab touch-none rounded p-0.5 text-stone-300 hover:text-stone-500 active:cursor-grabbing"
            aria-label="Kéo để sắp xếp"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <h3 className="truncate font-serif text-base leading-snug text-stone-900">
            {item.name}
          </h3>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="rounded-full p-1.5 text-stone-400 hover:bg-cyan-50 hover:text-cyan-700"
            aria-label="Sửa"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <Popconfirm
            title="Xoá hoạt động này?"
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(item.id)}
          >
            <button
              onClick={(e) => e.stopPropagation()}
              className="rounded-full p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Xoá"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Popconfirm>
        </div>
      </div>

      {item.note && <p className="mb-3 text-sm text-stone-500 line-clamp-2">{item.note}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {locations.slice(0, VISIBLE_LOCATIONS).map((loc) => (
          <span
            key={loc.id}
            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-800"
          >
            <MapPin className="h-3 w-3" />
            {loc.name}
          </span>
        ))}
        {extraCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
            +{extraCount} địa điểm
          </span>
        )}
        {item.start_time && item.end_time && (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 font-mono text-xs text-stone-600">
            <Clock className="h-3 w-3" />
            {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
          </span>
        )}
        {item.price != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800">
            <Wallet className="h-3 w-3" />
            {Number(item.price).toLocaleString("vi-VN")} đ
          </span>
        )}
      </div>
    </div>
  );
}
