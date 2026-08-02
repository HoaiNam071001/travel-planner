import type { ReactNode } from "react";
import { Dropdown } from "antd";
import {
  CalendarClock,
  Clock,
  GripVertical,
  Inbox,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Unlink,
  Wallet,
} from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Badge from "../../shared/components/Badge";
import IconButton from "../../shared/components/IconButton";
import { formatDateTimeRange, formatDuration, formatPriceShort } from "../../shared/utils/format";
import { unitStats } from "../../shared/utils/planStats";
import { unitRange } from "../../shared/utils/schedule";
import type { Id, Item, Unit } from "../../shared/types/models";
import BoardItemCard, { BoardItemRow } from "./BoardItemCard";
import { itemColorInUnit, type UnitColor } from "./timeline/colors";

/**
 * Id của lane khi nó đóng vai "phần tử sortable" phải KHÁC id khi nó đóng vai "vùng thả
 * hoạt động" — cùng 1 id cho 2 vai thì dnd-kit không phân biệt được đang thả chặng hay
 * đang thả hoạt động vào chặng.
 */
export const LANE_SORT_PREFIX = "lane:";

/** 1 đích cho nút "Chuyển tới…" trên thẻ hoạt động. */
export interface MoveTarget {
  id: Id;
  name: string;
  isLibrary?: boolean;
}

export interface BoardLaneProps {
  laneId: Id;
  unit?: Unit;
  index: number;
  items: Item[];
  isLibrary?: boolean;
  /** "unit" = kéo chặng (hoạt động khoá), "item" = kéo hoạt động (chặng khoá). */
  mode: "unit" | "item";
  /** Màu chặng (từ `colors.ts`) — undefined ở lane kho (không tô màu). */
  color?: UnitColor;
  moveTargets: MoveTarget[];
  onMoveItemTo: (itemId: Id, toLane: Id) => void;
  onEditUnit: (unit: Unit) => void;
  onRemoveUnit: (unitId: Id) => void;
  onDeleteUnit: (unitId: Id) => void;
  onCreateItem: (unitId: Id | null) => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (itemId: Id) => void;
  header?: ReactNode;
}

// 1 lane = 1 chặng, hoặc lane "kho hoạt động chưa gắn chặng" (isLibrary).
export default function BoardLane({
  laneId,
  unit,
  index,
  items,
  isLibrary = false,
  mode,
  color,
  moveTargets,
  onMoveItemTo,
  onEditUnit,
  onRemoveUnit,
  onDeleteUnit,
  onCreateItem,
  onEditItem,
  onDeleteItem,
  header,
}: BoardLaneProps) {
  const laneDraggable = mode === "unit" && !isLibrary;
  const itemsDraggable = mode === "item";

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: LANE_SORT_PREFIX + laneId,
    disabled: !laneDraggable,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: laneId,
    data: { type: "lane", laneId },
    disabled: !itemsDraggable,
  });

  const stats = unitStats(items, unit?.break_minutes);
  const range = unitRange(unit);
  const rangeLabel = range ? formatDateTimeRange(range.start, range.end) : null;

  return (
    <section
      ref={laneDraggable ? setNodeRef : undefined}
      style={laneDraggable ? { transform: CSS.Transform.toString(transform), transition } : undefined}
      // Chế độ "sắp chặng" thu lane hẹp lại + danh sách hoạt động rút gọn 1 dòng, để
      // nhiều chặng cùng lọt khung nhìn -> kéo đổi thứ tự không phải cuộn ngang liên tục.
      className={`flex shrink-0 flex-col rounded-2xl border transition ${
        mode === "unit" ? "w-[232px] max-h-[calc(100vh-18rem)]" : "w-[268px] max-h-[calc(100vh-15rem)]"
      } ${
        isLibrary
          ? "border-slate-200 bg-slate-100/70"
          : `${color?.accentBorder ?? "border-slate-200/80"} ${color?.tintBg ?? "bg-white shadow-card"}`
      } ${isOver ? "ring-2 ring-brand-300 ring-offset-2 ring-offset-slate-50" : ""} ${
        isDragging ? "opacity-40" : ""
      }`}
      {...(laneDraggable ? attributes : {})}
    >
      <header className="shrink-0 space-y-2 px-2.5 pb-2 pt-2.5">
        <div className="flex items-center gap-1.5">
          {laneDraggable ? (
            <span
              {...listeners}
              className="shrink-0 cursor-grab touch-none rounded text-slate-400 transition hover:text-slate-700 active:cursor-grabbing"
              aria-label="Kéo để đổi thứ tự chặng"
              title="Kéo để đổi thứ tự chặng"
            >
              <GripVertical className="h-4 w-4" />
            </span>
          ) : null}

          {isLibrary ? (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-200/80 text-slate-500">
              <Inbox className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-900 font-display text-[10px] font-bold text-white tnum">
              {String(index + 1).padStart(2, "0")}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[12px] font-bold leading-tight">
              {isLibrary ? "Kho hoạt động" : unit?.name}
            </h3>
            <p className="text-[10px] text-slate-400 tnum">
              {items.length} hoạt động
              {isLibrary ? " chưa gắn chặng" : ""}
              {!isLibrary && stats.cost > 0 ? ` · ${formatPriceShort(stats.cost)}` : ""}
            </p>
          </div>

          {!isLibrary && unit && (
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{
                items: [
                  {
                    key: "edit",
                    icon: <Pencil className="h-4 w-4" />,
                    label: "Sửa chặng",
                    onClick: () => onEditUnit(unit),
                  },
                  {
                    key: "remove",
                    icon: <Unlink className="h-4 w-4" />,
                    label: "Gỡ khỏi kế hoạch",
                    onClick: () => onRemoveUnit(unit.id),
                  },
                  { type: "divider" },
                  {
                    key: "delete",
                    danger: true,
                    icon: <Trash2 className="h-4 w-4" />,
                    label: "Xoá chặng",
                    onClick: () => onDeleteUnit(unit.id),
                  },
                ],
              }}
            >
              <IconButton size="sm" icon={MoreHorizontal} aria-label="Tuỳ chọn chặng" />
            </Dropdown>
          )}
        </div>

        {/* Hàng badge chi tiết chỉ ở chế độ "sắp hoạt động" — chế độ "sắp chặng" cần
            header thấp nhất có thể để nhìn được nhiều chặng cùng lúc. */}
        {mode === "item" &&
          !isLibrary &&
          unit &&
          (rangeLabel || stats.minutes > 0 || unit.unit_type) && (
            <div className="flex flex-wrap items-center gap-1">
              {unit.unit_type && (
                <Badge size="sm" tone="brand">
                  {unit.unit_type.name}
                </Badge>
              )}
              {rangeLabel && (
                <Badge size="sm" icon={CalendarClock} numeric>
                  {rangeLabel}
                </Badge>
              )}
              {stats.minutes > 0 && (
                <Badge size="sm" icon={Clock} numeric>
                  {formatDuration(stats.minutes)}
                </Badge>
              )}
              {stats.cost > 0 && (
                <Badge size="sm" tone="emerald" icon={Wallet} numeric>
                  {formatPriceShort(stats.cost)}
                </Badge>
              )}
            </div>
          )}

        {header}
      </header>

      <div
        ref={itemsDraggable ? setDropRef : undefined}
        className={`scroll-thin flex-1 overflow-y-auto px-2 pb-2 ${
          mode === "unit" ? "min-h-[64px] space-y-1" : "min-h-[96px] space-y-2"
        }`}
      >
        <SortableContext
          items={itemsDraggable ? items.map((i) => i.id) : []}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item, itemIndex) =>
            mode === "unit" ? (
              <BoardItemRow
                key={item.id}
                item={item}
                laneId={laneId}
                laneColor={isLibrary ? undefined : color}
                moveTargets={moveTargets}
                onMoveTo={onMoveItemTo}
                onEdit={onEditItem}
                onDelete={onDeleteItem}
              />
            ) : (
              <BoardItemCard
                key={item.id}
                item={item}
                laneId={laneId}
                laneColor={isLibrary ? undefined : color}
                itemIndex={itemIndex}
                moveTargets={moveTargets}
                onMoveTo={onMoveItemTo}
                onEdit={onEditItem}
                onDelete={onDeleteItem}
              />
            )
          )}
        </SortableContext>

        {items.length === 0 && (
          <div
            className={`flex items-center justify-center rounded-xl border border-dashed px-3 text-center text-[11px] leading-relaxed transition ${
              mode === "unit" ? "h-14" : "h-24"
            } ${isOver ? "border-brand-400 bg-brand-50/60 text-brand-700" : "border-slate-300 text-slate-400"}`}
          >
            {itemsDraggable
              ? isLibrary
                ? "Kéo hoạt động vào đây để gỡ khỏi chặng"
                : "Kéo hoạt động vào chặng này"
              : "Chưa có hoạt động"}
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-slate-100 p-1.5">
        <button
          type="button"
          onClick={() => onCreateItem(isLibrary ? null : (unit?.id ?? null))}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm hoạt động
        </button>
      </footer>
    </section>
  );
}

/** Dùng lại ở `BoardItemCard`/`BoardItemRow` — cùng 1 bảng màu viền trái theo chặng. */
export function laneItemAccent(color: UnitColor | undefined, itemIndex: number): string {
  if (!color) return "border-slate-200 bg-white hover:border-brand-300";
  return `border-l-4 ${color.accentBorder} border-y border-r border-y-slate-200 border-r-slate-200 ${itemColorInUnit(color, itemIndex)}`;
}
