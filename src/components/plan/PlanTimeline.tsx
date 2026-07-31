import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Dropdown } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Unlink,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Badge from "../../shared/components/Badge";
import EmptyState from "../../shared/components/EmptyState";
import IconButton from "../../shared/components/IconButton";
import { formatDateTimeRange, formatDuration, formatPrice } from "../../shared/utils/format";
import { unitStats } from "../../shared/utils/planStats";
import {
  computeItemSchedule,
  itemDurationMinutes,
  unitDurationMinutes,
  unitRange,
  type TimeRange,
} from "../../shared/utils/schedule";
import type { Id, Item, Plan, Unit } from "../../shared/types/models";
import type { ItemTimePatch } from "../../services/items.service";
import type { UnitTimePatch } from "../../services/units.service";
import TimelineBar from "./timeline/TimelineBar";
import { ZOOM_LEVELS, createScale, fitZoom } from "./timeline/scale";
import { useTimelineDrag, type DragDraft, type DragTarget } from "./timeline/useTimelineDrag";

const LABEL_WIDTH = 216;
const HEADER_HEIGHT = 52;
const UNIT_ROW_HEIGHT = 52;
const ITEM_ROW_HEIGHT = 34;
const SNAP_MINUTES = 15;

export interface PlanTimelineProps {
  plan: Plan | null;
  planUnits: Unit[];
  itemsByUnit: Map<Id, Item[]>;
  onScheduleUnit: (unitId: Id, patch: UnitTimePatch) => void;
  onScheduleItem: (itemId: Id, patch: ItemTimePatch) => void;
  onEditUnit: (unit: Unit) => void;
  onRemoveUnit: (unitId: Id) => void;
  onDeleteUnit: (unitId: Id) => void;
  onCreateItem: (unitId: Id) => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (itemId: Id) => void;
}

interface UnitRow {
  unit: Unit;
  items: Item[];
  range: TimeRange;
}

/**
 * Tab "Lịch trình": dải thời gian của kế hoạch vẽ đúng tỉ lệ, mỗi chặng là 1
 * thanh kéo-thả được (kéo giữa để dời, kéo 2 mép để đổi giờ bắt đầu/kết thúc).
 * Chặng chưa có giờ — hoặc nằm ngoài khoảng thời gian kế hoạch — nằm ở cột
 * "Chưa xếp lịch" bên phải, kéo vào lịch là xếp được.
 */
export default function PlanTimeline({
  plan,
  planUnits,
  itemsByUnit,
  onScheduleUnit,
  onScheduleItem,
  onEditUnit,
  onRemoveUnit,
  onDeleteUnit,
  onCreateItem,
  onEditItem,
  onDeleteItem,
}: PlanTimelineProps) {
  const [zoom, setZoom] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<Id>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const parkingRef = useRef<HTMLDivElement | null>(null);

  const hasWindow = Boolean(plan?.start_date && plan?.end_date);
  const scale = useMemo(
    () => createScale(plan?.start_date ?? "", plan?.end_date ?? "", zoom ?? ZOOM_LEVELS[2]),
    [plan?.start_date, plan?.end_date, zoom]
  );

  // Lần đầu mở: chọn mức zoom vừa đủ để cả kế hoạch lọt trong khung nhìn.
  useLayoutEffect(() => {
    if (zoom !== null || !hasWindow || !plan?.start_date || !plan?.end_date) return;
    const width = (scrollRef.current?.clientWidth ?? 0) - LABEL_WIDTH;
    if (width > 0) setZoom(fitZoom(plan.start_date, plan.end_date, width));
  }, [hasWindow, plan?.start_date, plan?.end_date, zoom]);

  const { scheduled, parked } = useMemo(() => {
    const inside: UnitRow[] = [];
    const outside: Unit[] = [];
    for (const unit of planUnits) {
      const range = unitRange(unit);
      // Nằm ngoài khoảng thời gian kế hoạch cũng coi như chưa xếp -> về cột chờ.
      const fits =
        range && range.start.isBefore(scale.end) && range.end.isAfter(scale.origin) && hasWindow;
      if (range && fits) inside.push({ unit, items: itemsByUnit.get(unit.id) ?? [], range });
      else outside.push(unit);
    }
    inside.sort((a, b) => a.range.start.valueOf() - b.range.start.valueOf());
    return { scheduled: inside, parked: outside };
  }, [planUnits, itemsByUnit, scale.origin, scale.end, hasWindow]);

  const { draft, startDrag, startScheduling, isDragging } = useTimelineDrag({
    scale,
    canvasRef,
    parkingRef,
    snapMinutes: SNAP_MINUTES,
    onCommit: handleCommit,
    onUnschedule: handleUnschedule,
  });

  // Trong lúc kéo, chặn bôi đen chữ cho đỡ rối mắt.
  useEffect(() => {
    if (!isDragging) return;
    const previous = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.userSelect = previous;
    };
  }, [isDragging]);

  function handleCommit(committed: DragDraft) {
    const minutes = Math.max(committed.end.diff(committed.start, "minute"), 1);
    if (committed.kind === "unit") {
      onScheduleUnit(committed.id, {
        start_date: committed.start.toISOString(),
        end_date: committed.end.toISOString(),
        duration_minutes: minutes,
      });
      return;
    }
    onScheduleItem(committed.id, {
      start_time: committed.start.toISOString(),
      end_time: committed.end.toISOString(),
      duration_minutes: minutes,
    });
  }

  function handleUnschedule(target: DragTarget) {
    if (target.kind !== "unit") return;
    onScheduleUnit(target.id, { start_date: null, end_date: null });
  }

  function toggleExpand(unitId: Id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  }

  /** Khoảng thời gian đang hiển thị của 1 thanh: bản nháp khi kéo, DB khi không. */
  function liveRange(kind: "unit" | "item", id: Id, fallback: TimeRange): TimeRange {
    if (draft && draft.kind === kind && draft.id === id) {
      return { start: draft.start, end: draft.end };
    }
    return fallback;
  }

  function changeZoom(direction: 1 | -1) {
    const current = zoom ?? ZOOM_LEVELS[2];
    const index = ZOOM_LEVELS.indexOf(current as (typeof ZOOM_LEVELS)[number]);
    const nextIndex = Math.min(
      Math.max((index === -1 ? 2 : index) + direction, 0),
      ZOOM_LEVELS.length - 1
    );
    setZoom(ZOOM_LEVELS[nextIndex] ?? current);
  }

  if (!hasWindow) {
    return (
      <div className="animate-fade-up">
        <EmptyState
          icon={CalendarClock}
          title="Kế hoạch chưa có khoảng thời gian"
          hint="Đặt ngày bắt đầu và kết thúc cho kế hoạch (nút Sửa thông tin ở trên) để xếp lịch cho từng chặng."
        />
      </div>
    );
  }

  const now = dayjs();
  const showNow = now.isAfter(scale.origin) && now.isBefore(scale.end);
  const draggingUnitId = draft?.kind === "unit" ? draft.id : null;
  const schedulingUnit =
    draft?.mode === "schedule" ? planUnits.find((u) => u.id === draft.id) ?? null : null;

  return (
    <div className="animate-fade-up grid gap-4 lg:grid-cols-[minmax(0,1fr)_264px]">
      <section className="surface overflow-hidden">
        {/* ------------------------------------------------------------ toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Badge tone="brand" icon={CalendarClock} numeric>
            {formatDateTimeRange(scale.origin, scale.end.subtract(1, "minute"))}
          </Badge>
          <span className="hidden text-xs text-slate-400 lg:block">
            Kéo thanh để dời chặng, kéo 2 mép để đổi giờ bắt đầu/kết thúc (bước {SNAP_MINUTES}{" "}
            phút).
          </span>

          <div className="ml-auto flex items-center gap-1">
            <IconButton
              icon={ZoomOut}
              onClick={() => changeZoom(-1)}
              aria-label="Thu nhỏ"
              disabled={(zoom ?? ZOOM_LEVELS[2]) === ZOOM_LEVELS[0]}
            />
            <span className="w-16 text-center text-[11px] text-slate-400 tnum">
              {scale.pxPerHour}px/giờ
            </span>
            <IconButton
              icon={ZoomIn}
              onClick={() => changeZoom(1)}
              aria-label="Phóng to"
              disabled={(zoom ?? ZOOM_LEVELS[2]) === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
            />
          </div>
        </div>

        {scheduled.length === 0 && parked.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            Kế hoạch chưa có chặng nào — thêm ở tab Xây dựng.
          </p>
        ) : (
          // Cuộn cả 2 chiều trong CÙNG 1 khung: nhờ vậy cột nhãn dính trái và hàng
          // ngày/giờ dính trên đều bám theo đúng như gantt thường thấy.
          <div ref={scrollRef} className="scroll-thin max-h-[64vh] overflow-auto">
            <div className="flex" style={{ width: LABEL_WIDTH + scale.width }}>
              {/* --------------------------------------------------- cột nhãn */}
              <div
                className="sticky left-0 z-30 shrink-0 border-r border-slate-200 bg-white"
                style={{ width: LABEL_WIDTH }}
              >
                <div
                  className="sticky top-0 z-10 flex items-end border-b border-slate-200 bg-white px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                  style={{ height: HEADER_HEIGHT }}
                >
                  Chặng
                </div>

                {scheduled.map(({ unit, items }) => (
                  <div key={unit.id}>
                    <UnitLabel
                      unit={unit}
                      itemCount={items.length}
                      expanded={expanded.has(unit.id)}
                      onToggle={() => toggleExpand(unit.id)}
                      onEdit={() => onEditUnit(unit)}
                      onRemove={() => onRemoveUnit(unit.id)}
                      onDelete={() => onDeleteUnit(unit.id)}
                      onCreateItem={() => onCreateItem(unit.id)}
                    />
                    {expanded.has(unit.id) &&
                      items.map((item) => (
                        <ItemLabel
                          key={item.id}
                          item={item}
                          onEdit={() => onEditItem(item)}
                          onDelete={() => onDeleteItem(item.id)}
                        />
                      ))}
                  </div>
                ))}

                {schedulingUnit && (
                  <div
                    className="flex items-center border-b border-dashed border-brand-300 bg-brand-50/60 px-3 text-[11px] font-semibold text-brand-700"
                    style={{ height: UNIT_ROW_HEIGHT }}
                  >
                    {schedulingUnit.name}
                  </div>
                )}
              </div>

              {/* ------------------------------------------------- dải thời gian */}
              <div className="shrink-0" style={{ width: scale.width }}>
                <div ref={canvasRef} className="relative" style={{ width: scale.width }}>
                  <TimelineHeader
                    days={scale.days}
                    hourStep={scale.hourStep}
                    pxPerHour={scale.pxPerHour}
                    xOf={scale.xOf}
                    width={scale.width}
                  />

                  {/* Lưới dọc theo ngày, vẽ phía sau các thanh. */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0"
                    style={{ top: HEADER_HEIGHT }}
                  >
                    {scale.days.map((day) => (
                      <span
                        key={day.toISOString()}
                        className="absolute top-0 h-full w-px bg-slate-200"
                        style={{ left: scale.xOf(day) }}
                      />
                    ))}
                    {showNow && (
                      <span
                        className="absolute top-0 h-full w-0.5 bg-rose-400/80"
                        style={{ left: scale.xOf(now) }}
                      />
                    )}
                  </div>

                  {scheduled.map(({ unit, items, range }) => {
                    const live = liveRange("unit", unit.id, range);
                    const stats = unitStats(items, unit.break_minutes);
                    const schedule = computeItemSchedule(unit, items, unit.break_minutes);

                    return (
                      <div key={unit.id}>
                        <div
                          className="relative border-b border-slate-100"
                          style={{ height: UNIT_ROW_HEIGHT }}
                        >
                          <TimelineBar
                            left={scale.xOf(live.start)}
                            width={scale.widthOf(live.start, live.end)}
                            tone="unit"
                            dragging={draggingUnitId === unit.id}
                            label={unit.name}
                            meta={live.start.format("HH:mm")}
                            title={`${unit.name} · ${formatDateTimeRange(live.start, live.end) ?? ""}`}
                            onPointerDownBody={(event) =>
                              startDrag(event, { kind: "unit", id: unit.id, ...range }, "move")
                            }
                            onPointerDownStart={(event) =>
                              startDrag(
                                event,
                                { kind: "unit", id: unit.id, ...range },
                                "resize-start"
                              )
                            }
                            onPointerDownEnd={(event) =>
                              startDrag(event, { kind: "unit", id: unit.id, ...range }, "resize-end")
                            }
                          />

                          {stats.cost > 0 && (
                            <span
                              className="pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap pl-2 text-[11px] text-slate-400 tnum"
                              style={{ left: scale.xOf(live.end) }}
                            >
                              {formatPrice(stats.cost)}
                            </span>
                          )}
                        </div>

                        {expanded.has(unit.id) &&
                          items.map((item) => {
                            const slot = schedule.find((entry) => entry.item.id === item.id);
                            const base: TimeRange = slot
                              ? { start: slot.start, end: slot.end }
                              : { start: live.start, end: live.start };
                            const itemLive = liveRange("item", item.id, base);
                            const inferred = slot?.inferred !== false;

                            return (
                              <div
                                key={item.id}
                                className="relative border-b border-slate-100 bg-slate-50/40"
                                style={{ height: ITEM_ROW_HEIGHT }}
                              >
                                <TimelineBar
                                  left={scale.xOf(itemLive.start)}
                                  width={scale.widthOf(itemLive.start, itemLive.end)}
                                  tone={inferred ? "inferred" : "item"}
                                  dragging={draft?.kind === "item" && draft.id === item.id}
                                  label={item.name}
                                  meta={formatDuration(itemDurationMinutes(item)) ?? undefined}
                                  title={`${item.name} · ${
                                    formatDateTimeRange(itemLive.start, itemLive.end) ?? ""
                                  }${inferred ? " (giờ dự kiến)" : ""}`}
                                  onPointerDownBody={(event) =>
                                    startDrag(
                                      event,
                                      { kind: "item", id: item.id, parentId: unit.id, ...base },
                                      "move"
                                    )
                                  }
                                  onPointerDownStart={(event) =>
                                    startDrag(
                                      event,
                                      { kind: "item", id: item.id, parentId: unit.id, ...base },
                                      "resize-start"
                                    )
                                  }
                                  onPointerDownEnd={(event) =>
                                    startDrag(
                                      event,
                                      { kind: "item", id: item.id, parentId: unit.id, ...base },
                                      "resize-end"
                                    )
                                  }
                                />
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}

                  {/* Hàng "thả vào đây" khi đang kéo 1 chặng từ cột chờ. */}
                  {draft?.mode === "schedule" && (
                    <div
                      className="relative border-b border-dashed border-brand-300 bg-brand-50/60"
                      style={{ height: UNIT_ROW_HEIGHT }}
                    >
                      {!draft.overParking && (
                        <TimelineBar
                          left={scale.xOf(draft.start)}
                          width={scale.widthOf(draft.start, draft.end)}
                          tone="unit"
                          dragging
                          preview
                          label={schedulingUnit?.name ?? "Chặng"}
                          meta={draft.start.format("DD/MM HH:mm")}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------- cột chưa xếp */}
      <aside
        ref={parkingRef}
        className={`surface flex max-h-[64vh] flex-col p-3 transition ${
          isDragging && draft?.kind === "unit" && draft.mode !== "schedule"
            ? "ring-2 ring-rose-300"
            : ""
        }`}
      >
        <h3 className="text-[13px] font-bold text-slate-700">Chưa xếp lịch ({parked.length})</h3>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
          Kéo một chặng vào dải thời gian để xếp giờ. Kéo ngược ra đây để gỡ khỏi lịch.
        </p>

        <div className="scroll-thin mt-3 flex-1 space-y-2 overflow-y-auto pr-0.5">
          {parked.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-[11px] text-slate-400">
              Mọi chặng đều đã có giờ.
            </p>
          ) : (
            parked.map((unit) => (
              <ParkedUnitCard
                key={unit.id}
                unit={unit}
                itemCount={itemsByUnit.get(unit.id)?.length ?? 0}
                dragging={draft?.mode === "schedule" && draft.id === unit.id}
                onPointerDown={(event) => {
                  const start = scale.origin;
                  startScheduling(event, {
                    kind: "unit",
                    id: unit.id,
                    start,
                    end: start.add(unitDurationMinutes(unit), "minute"),
                  });
                }}
                onEdit={() => onEditUnit(unit)}
              />
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- sub-components

interface TimelineHeaderProps {
  days: Dayjs[];
  hourStep: number;
  pxPerHour: number;
  width: number;
  xOf: (time: Dayjs) => number;
}

function TimelineHeader({ days, hourStep, pxPerHour, width, xOf }: TimelineHeaderProps) {
  return (
    <div
      className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur"
      style={{ height: HEADER_HEIGHT, width }}
    >
      {days.map((day) => (
        <div
          key={day.toISOString()}
          className="absolute top-0 flex h-7 items-center border-l border-slate-200 px-2 text-[11px] font-semibold text-slate-600"
          style={{ left: xOf(day), width: 24 * pxPerHour }}
        >
          <span className="truncate tnum">{day.format("ddd DD/MM")}</span>
        </div>
      ))}

      {days.flatMap((day) =>
        Array.from({ length: Math.floor(24 / hourStep) }, (_, i) => i * hourStep).map((hour) => {
          const tick = day.add(hour, "hour");
          return (
            <span
              key={tick.toISOString()}
              className="absolute bottom-1 text-[10px] text-slate-400 tnum"
              style={{ left: xOf(tick) + 2 }}
            >
              {tick.format("HH:mm")}
            </span>
          );
        })
      )}
    </div>
  );
}

interface UnitLabelProps {
  unit: Unit;
  itemCount: number;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onDelete: () => void;
  onCreateItem: () => void;
}

function UnitLabel({
  unit,
  itemCount,
  expanded,
  onToggle,
  onEdit,
  onRemove,
  onDelete,
  onCreateItem,
}: UnitLabelProps) {
  return (
    <div
      className="group flex items-center gap-1 border-b border-slate-100 px-2 pr-1"
      style={{ height: UNIT_ROW_HEIGHT }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label={expanded ? "Thu gọn hoạt động" : "Xem hoạt động"}
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-slate-800">{unit.name}</p>
        <p className="truncate text-[11px] text-slate-400 tnum">
          {itemCount} hoạt động
          {unit.unit_type ? ` · ${unit.unit_type.name}` : ""}
        </p>
      </div>

      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        menu={{
          items: [
            {
              key: "edit",
              icon: <Pencil className="h-4 w-4" />,
              label: "Sửa chặng",
              onClick: onEdit,
            },
            {
              key: "add-item",
              icon: <Plus className="h-4 w-4" />,
              label: "Thêm hoạt động",
              onClick: onCreateItem,
            },
            {
              key: "remove",
              icon: <Unlink className="h-4 w-4" />,
              label: "Gỡ khỏi kế hoạch",
              onClick: onRemove,
            },
            { type: "divider" },
            {
              key: "delete",
              danger: true,
              icon: <Trash2 className="h-4 w-4" />,
              label: "Xoá chặng",
              onClick: onDelete,
            },
          ],
        }}
      >
        <IconButton size="sm" icon={MoreHorizontal} aria-label="Tuỳ chọn chặng" />
      </Dropdown>
    </div>
  );
}

function ItemLabel({
  item,
  onEdit,
  onDelete,
}: {
  item: Item;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group flex items-center gap-1 border-b border-slate-100 bg-slate-50/40 pl-8 pr-1"
      style={{ height: ITEM_ROW_HEIGHT }}
    >
      <p className="min-w-0 flex-1 truncate text-[12px] text-slate-600">{item.name}</p>
      <span className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <IconButton size="sm" tone="brand" icon={Pencil} onClick={onEdit} aria-label="Sửa hoạt động" />
        <IconButton size="sm" tone="danger" icon={Trash2} onClick={onDelete} aria-label="Xoá hoạt động" />
      </span>
    </div>
  );
}

interface ParkedUnitCardProps {
  unit: Unit;
  itemCount: number;
  dragging: boolean;
  onPointerDown: (event: ReactPointerEvent) => void;
  onEdit: () => void;
}

function ParkedUnitCard({ unit, itemCount, dragging, onPointerDown, onEdit }: ParkedUnitCardProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      className={`group cursor-grab touch-none rounded-xl border bg-white p-2.5 shadow-xs transition active:cursor-grabbing ${
        dragging ? "border-brand-400 opacity-60" : "border-slate-200 hover:border-brand-300"
      }`}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
        <p className="min-w-0 flex-1 text-[12px] font-semibold leading-snug text-slate-800">
          {unit.name}
        </p>
        <IconButton
          size="sm"
          tone="brand"
          icon={Pencil}
          onClick={onEdit}
          // Chặn pointerdown để bấm nút sửa không bị hiểu nhầm thành bắt đầu kéo thẻ.
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="Sửa chặng"
          className="opacity-0 transition group-hover:opacity-100"
        />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <Badge size="sm" numeric>
          {itemCount} hoạt động
        </Badge>
        <Badge size="sm" tone="brand" icon={Clock} numeric>
          {formatDuration(unitDurationMinutes(unit)) ?? "—"}
        </Badge>
      </div>
    </div>
  );
}
