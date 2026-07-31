import { Popconfirm } from "antd";
import { CalendarClock, Clock, CornerUpLeft, MapPin, Pencil, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatPrice, formatDuration, formatTime } from "../../shared/utils/format";
import { itemDurationMinutes, itemRange } from "../../shared/utils/schedule";
import IconButton from "../../shared/components/IconButton";
import type { Id, Item } from "../../shared/types/models";
import { itemColorInUnit, type UnitColor } from "./timeline/colors";

export interface BoardItemCardProps {
  item: Item;
  laneId: Id;
  /** Màu chặng cha (từ `colors.ts`) — undefined ở lane kho (không tô màu). */
  laneColor?: UnitColor;
  /** Thứ tự trong lane — chọn sắc thái xoay vòng cho `laneColor`. */
  itemIndex?: number;
  onEdit: (item: Item) => void;
  onDelete: (id: Id) => void;
  onSendToLibrary?: (id: Id) => void;
}

// Thẻ hoạt động trong Plan Builder. Kéo bằng cả thẻ (PointerSensor có
// activationConstraint distance 5 nên click vào nút bên trong vẫn ăn).
export default function BoardItemCard({
  item,
  laneId,
  laneColor,
  itemIndex = 0,
  onEdit,
  onDelete,
  onSendToLibrary,
}: BoardItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "item", laneId },
  });

  const range = itemRange(item);
  const minutes = itemDurationMinutes(item);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group rounded-xl border p-2.5 shadow-xs transition ${
        isDragging ? "opacity-40" : "hover:shadow-card"
      } ${
        laneColor
          ? `border-l-4 ${laneColor.accentBorder} border-y border-r border-y-slate-200 border-r-slate-200 ${itemColorInUnit(laneColor, itemIndex)}`
          : "border-slate-200 bg-white hover:border-brand-300"
      } cursor-grab active:cursor-grabbing`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-slate-800">
          {item.name}
        </p>

        {/* Actions chỉ hiện khi hover để thẻ đỡ rối. */}
        <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          {onSendToLibrary && (
            <IconButton
              size="sm"
              icon={CornerUpLeft}
              onClick={() => onSendToLibrary(item.id)}
              title="Gỡ khỏi chặng, trả về kho"
              aria-label="Gỡ khỏi chặng"
            />
          )}
          <IconButton
            size="sm"
            tone="brand"
            icon={Pencil}
            onClick={() => onEdit(item)}
            aria-label="Sửa hoạt động"
          />
          <Popconfirm
            title="Xoá hoạt động này?"
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(item.id)}
          >
            <IconButton size="sm" tone="danger" icon={Trash2} aria-label="Xoá hoạt động" />
          </Popconfirm>
        </div>
      </div>

      {range && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-brand-700 tnum">
          <CalendarClock className="h-3 w-3 shrink-0" />
          {formatTime(range.start)} - {formatTime(range.end)}
        </p>
      )}

      {item.locations?.length > 0 && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{item.locations.map((l) => l.name).join(" → ")}</span>
        </p>
      )}

      {(minutes > 0 || item.price != null) && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
          {minutes > 0 && (
            <span className="inline-flex items-center gap-1 font-mono tnum">
              <Clock className="h-3 w-3 text-slate-400" />
              {formatDuration(minutes)}
            </span>
          )}
          {item.price != null && Number(item.price) > 0 && (
            <span className="ml-auto font-semibold text-slate-700 tnum">
              {formatPrice(item.price)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Bản rút gọn dùng cho DragOverlay (không gắn sortable, không có action).
export function BoardItemPreview({ item }: { item: Item }) {
  return (
    <div className="w-[268px] rotate-1 cursor-grabbing rounded-xl border border-brand-300 bg-white p-2.5 shadow-pop">
      <p className="text-[13px] font-semibold leading-snug text-slate-800">{item.name}</p>
      {item.locations?.length > 0 && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{item.locations.map((l) => l.name).join(" → ")}</span>
        </p>
      )}
    </div>
  );
}
