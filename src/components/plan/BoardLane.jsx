import { Dropdown } from "antd";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Unlink,
  Wallet,
} from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Badge from "../../shared/components/Badge";
import IconButton from "../../shared/components/IconButton";
import { formatDateTimeRange, formatDuration, formatPriceShort } from "../../shared/utils/format";
import { unitStats } from "../../shared/utils/planStats";
import BoardItemCard from "./BoardItemCard";

// 1 lane = 1 chặng, hoặc lane "kho hoạt động chưa gắn chặng" (isLibrary).
export default function BoardLane({
  laneId,
  unit,
  index,
  items,
  isLibrary = false,
  canMoveLeft = false,
  canMoveRight = false,
  onMoveUnit,
  onEditUnit,
  onRemoveUnit,
  onDeleteUnit,
  onCreateItem,
  onEditItem,
  onDeleteItem,
  onSendItemToLibrary,
  header,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: laneId, data: { type: "lane", laneId } });
  const stats = unitStats(items);
  const range = unit ? formatDateTimeRange(unit.start_date, unit.end_date) : null;

  return (
    <section
      className={`flex max-h-[calc(100vh-15rem)] w-[292px] shrink-0 flex-col rounded-2xl border transition ${
        isLibrary
          ? "border-slate-200 bg-slate-100/70"
          : "border-slate-200/80 bg-white shadow-card"
      } ${isOver ? "ring-2 ring-brand-300 ring-offset-2 ring-offset-slate-50" : ""}`}
    >
      <header className="shrink-0 space-y-2.5 px-3 pb-2.5 pt-3">
        <div className="flex items-start gap-2">
          {isLibrary ? (
            <span className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200/80 text-slate-500">
              <Inbox className="h-4 w-4" />
            </span>
          ) : (
            <span className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 font-display text-[11px] font-bold text-white tnum">
              {String(index + 1).padStart(2, "0")}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[13px] font-bold leading-tight">
              {isLibrary ? "Kho hoạt động" : unit.name}
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-400 tnum">
              {items.length} hoạt động
              {isLibrary ? " chưa gắn chặng" : ""}
            </p>
          </div>

          {!isLibrary && (
            <div className="flex shrink-0 items-center">
              <IconButton
                size="sm"
                icon={ChevronLeft}
                disabled={!canMoveLeft}
                onClick={() => onMoveUnit(unit.id, -1)}
                className={canMoveLeft ? "" : "opacity-30"}
                aria-label="Chuyển chặng lên trước"
              />
              <IconButton
                size="sm"
                icon={ChevronRight}
                disabled={!canMoveRight}
                onClick={() => onMoveUnit(unit.id, 1)}
                className={canMoveRight ? "" : "opacity-30"}
                aria-label="Chuyển chặng xuống sau"
              />
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
            </div>
          )}
        </div>

        {!isLibrary && (range || stats.cost > 0 || stats.minutes > 0 || unit.unit_type) && (
          <div className="flex flex-wrap items-center gap-1">
            {unit.unit_type && (
              <Badge size="sm" tone="brand">
                {unit.unit_type.name}
              </Badge>
            )}
            {range && (
              <Badge size="sm" icon={CalendarClock} numeric>
                {range}
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
        ref={setNodeRef}
        className="scroll-thin min-h-[96px] flex-1 space-y-2 overflow-y-auto px-2.5 pb-2.5"
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <BoardItemCard
              key={item.id}
              item={item}
              laneId={laneId}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              onSendToLibrary={isLibrary ? undefined : onSendItemToLibrary}
            />
          ))}
        </SortableContext>

        {items.length === 0 && (
          <div
            className={`flex h-24 items-center justify-center rounded-xl border border-dashed px-3 text-center text-[11px] leading-relaxed transition ${
              isOver
                ? "border-brand-400 bg-brand-50/60 text-brand-700"
                : "border-slate-300 text-slate-400"
            }`}
          >
            {isLibrary ? "Kéo hoạt động vào đây để gỡ khỏi chặng" : "Kéo hoạt động vào chặng này"}
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-slate-100 p-2">
        <button
          type="button"
          onClick={() => onCreateItem(isLibrary ? null : unit.id)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm hoạt động
        </button>
      </footer>
    </section>
  );
}
