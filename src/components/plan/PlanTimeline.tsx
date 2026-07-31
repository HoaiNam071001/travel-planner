import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Dropdown } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  GripVertical,
  Inbox,
  MoreHorizontal,
  Pencil,
  Plus,
  Route as RouteIcon,
  Search,
  Sparkles,
  Trash2,
  Unlink,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Badge from "../../shared/components/Badge";
import EmptyState from "../../shared/components/EmptyState";
import IconButton from "../../shared/components/IconButton";
import Input from "../../shared/components/Input";
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
import { HoverPopover, ItemPopoverContent, UnitPopoverContent } from "./timeline/TimelineBarPopover";
import { ZOOM_LEVELS, clampBarToCanvas, createScale, fitZoom, type TimeScale } from "./timeline/scale";
import { itemColorInUnit, unitColor, type UnitColor } from "./timeline/colors";
import { useTimelineDrag, type DragDraft, type DragTarget } from "./timeline/useTimelineDrag";

const LABEL_WIDTH = 216;
const HEADER_HEIGHT = 52;
const UNIT_ROW_HEIGHT = 52;
const ITEM_ROW_HEIGHT = 34;
const SNAP_MINUTES = 15;
const REVEAL_STEP = 20;

export interface PlanTimelineProps {
  plan: Plan | null;
  planUnits: Unit[];
  itemsByUnit: Map<Id, Item[]>;
  /** Hoạt động chưa gắn chặng nào — hiện ở cột phải panel "Chưa xếp lịch". */
  libraryItems: Item[];
  /** Chặng chưa gắn kế hoạch nào (không riêng kế hoạch này) — cũng hiện ở panel để kéo thẳng vào. */
  freeUnits: Unit[];
  onScheduleUnit: (unitId: Id, patch: UnitTimePatch) => void;
  /** Kéo 1 chặng chưa thuộc kế hoạch nào (`freeUnits`) vào gantt: gắn vào kế hoạch + xếp giờ cùng lúc. */
  onAttachAndScheduleUnit: (unitId: Id, patch: UnitTimePatch) => void;
  onScheduleItem: (itemId: Id, patch: ItemTimePatch) => void;
  /** Kéo 1 hoạt động từ panel vào 1 hàng chặng trên gantt: gán + xếp giờ cùng lúc. */
  onAssignAndScheduleItem: (itemId: Id, unitId: Id, patch: ItemTimePatch) => void;
  /** Kéo 1 hoạt động đã lên lịch ra panel: gỡ khỏi chặng. */
  onUnassignItem: (itemId: Id) => void;
  onEditUnit: (unit: Unit) => void;
  onRemoveUnit: (unitId: Id) => void;
  onDeleteUnit: (unitId: Id) => void;
  onCreateItem: (unitId: Id) => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (itemId: Id) => void;
  /** Bấm (không kéo) vào thanh/nhãn để xem chi tiết — mở modal chỉ-xem, khác `onEdit*`. */
  onViewUnit: (unit: Unit) => void;
  onViewItem: (item: Item) => void;
}

interface UnitRow {
  unit: Unit;
  items: Item[];
  range: TimeRange;
}

/**
 * Tab "Lịch trình": dải thời gian của kế hoạch vẽ đúng tỉ lệ, mỗi chặng/hoạt động là 1
 * thanh màu kéo-thả được (kéo giữa để dời, kéo 2 mép để đổi giờ). Chặng/hoạt động chưa có
 * giờ nằm ở panel "Chưa xếp lịch" phía trên (2 cột: chặng | hoạt động, đều có search).
 * Chặng có giờ nhưng nằm ngoài khoảng thời gian kế hoạch vẫn hiện ngay trên gantt, chỉ bị
 * kẹp vào rìa canvas — kéo được thẳng từ đó vào giữa lịch.
 */
export default function PlanTimeline({
  plan,
  planUnits,
  itemsByUnit,
  libraryItems,
  freeUnits,
  onScheduleUnit,
  onAttachAndScheduleUnit,
  onScheduleItem,
  onAssignAndScheduleItem,
  onUnassignItem,
  onEditUnit,
  onRemoveUnit,
  onDeleteUnit,
  onCreateItem,
  onEditItem,
  onDeleteItem,
  onViewUnit,
  onViewItem,
}: PlanTimelineProps) {
  const [zoom, setZoom] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<Id>>(() => new Set());
  const [panelOpen, setPanelOpen] = useState(
    () => libraryItems.length > 0 || freeUnits.length > 0 || planUnits.some((u) => !u.start_date)
  );
  const [unitSearch, setUnitSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const unitParkingRef = useRef<HTMLDivElement | null>(null);
  const itemParkingRef = useRef<HTMLDivElement | null>(null);

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

  // Màu theo vị trí chặng trong `planUnits` (ổn định, không đổi khi chặng chuyển giữa
  // "đã lên lịch" và "chưa xếp") — dùng chung cho gantt lẫn panel phía trên.
  const unitIndexById = useMemo(() => {
    const map = new Map<Id, number>();
    planUnits.forEach((u, i) => map.set(u.id, i));
    return map;
  }, [planUnits]);
  const colorOf = useCallback(
    (unitId: Id): UnitColor => unitColor(unitIndexById.get(unitId) ?? 0),
    [unitIndexById]
  );

  const { scheduledRows, unscheduledUnits } = useMemo(() => {
    const rows: UnitRow[] = [];
    const unscheduled: Unit[] = [];
    for (const unit of planUnits) {
      const range = unit.start_date ? unitRange(unit) : null;
      if (!range) {
        unscheduled.push(unit);
        continue;
      }
      rows.push({ unit, items: itemsByUnit.get(unit.id) ?? [], range });
    }
    rows.sort((a, b) => a.range.start.valueOf() - b.range.start.valueOf());
    return { scheduledRows: rows, unscheduledUnits: unscheduled };
  }, [planUnits, itemsByUnit]);

  // Kéo 1 hoạt động từ panel vào gantt: tìm hàng chặng đang ở dưới con trỏ qua DOM,
  // dựa vào `data-unit-row-id` gắn trên từng hàng chặng/hoạt động bên dưới.
  const resolveRowTarget = useCallback((clientX: number, clientY: number): Id | null => {
    const el = document.elementFromPoint(clientX, clientY);
    const row = el?.closest<HTMLElement>("[data-unit-row-id]");
    return row?.dataset.unitRowId ?? null;
  }, []);

  const { draft, startDrag, startScheduling, isDragging, wasDraggedRef } = useTimelineDrag({
    scale,
    canvasRef,
    unitParkingRef,
    itemParkingRef,
    resolveRowTarget,
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
      const patch: UnitTimePatch = {
        start_date: committed.start.toISOString(),
        end_date: committed.end.toISOString(),
        duration_minutes: minutes,
      };
      // Chặng đến từ "chưa gắn kế hoạch nào" (không phải "đã trong kế hoạch nhưng chưa
      // xếp giờ") thì phải gắn vào kế hoạch này cùng lúc, không chỉ ghi giờ.
      if (freeUnits.some((u) => u.id === committed.id)) {
        onAttachAndScheduleUnit(committed.id, patch);
      } else {
        onScheduleUnit(committed.id, patch);
      }
      return;
    }

    if (committed.mode === "schedule") {
      // Đến từ panel "hoạt động chưa gắn chặng" — cần thả đúng vào 1 hàng chặng.
      const unitId = committed.overRowId;
      if (!unitId) return;
      onAssignAndScheduleItem(committed.id, unitId, {
        start_time: committed.start.toISOString(),
        end_time: committed.end.toISOString(),
        duration_minutes: minutes,
      });
      setExpanded((prev) => new Set(prev).add(unitId));
      return;
    }

    onScheduleItem(committed.id, {
      start_time: committed.start.toISOString(),
      end_time: committed.end.toISOString(),
      duration_minutes: minutes,
    });
  }

  function handleUnschedule(target: DragTarget) {
    if (target.kind === "unit") {
      onScheduleUnit(target.id, { start_date: null, end_date: null });
      return;
    }
    onUnassignItem(target.id);
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
    if (draft && draft.kind === kind && draft.id === id && draft.mode !== "schedule") {
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
  const draggingUnitId = draft?.kind === "unit" && draft.mode !== "schedule" ? draft.id : null;
  const schedulingUnit =
    draft?.kind === "unit" && draft.mode === "schedule"
      ? planUnits.find((u) => u.id === draft.id) ?? null
      : null;
  const itemDropUnitId =
    draft?.kind === "item" && draft.mode === "schedule" ? draft.overRowId : null;

  const filteredUnscheduledUnits = unscheduledUnits.filter((u) =>
    u.name.toLowerCase().includes(unitSearch.trim().toLowerCase())
  );
  const filteredFreeUnits = freeUnits.filter((u) =>
    u.name.toLowerCase().includes(unitSearch.trim().toLowerCase())
  );
  const filteredLibraryItems = libraryItems.filter((i) =>
    i.name.toLowerCase().includes(itemSearch.trim().toLowerCase())
  );

  return (
    <div className="animate-fade-up space-y-4">
      <UnscheduledPanel
        open={panelOpen}
        onToggle={() => setPanelOpen((v) => !v)}
        unitParkingRef={unitParkingRef}
        itemParkingRef={itemParkingRef}
        unscheduledUnits={filteredUnscheduledUnits}
        totalUnscheduledUnits={unscheduledUnits.length}
        freeUnits={filteredFreeUnits}
        totalFreeUnits={freeUnits.length}
        unitSearch={unitSearch}
        onUnitSearchChange={setUnitSearch}
        libraryItems={filteredLibraryItems}
        totalLibraryItems={libraryItems.length}
        itemSearch={itemSearch}
        onItemSearchChange={setItemSearch}
        itemsByUnit={itemsByUnit}
        isUnitDropTarget={isDragging && draft?.kind === "unit" && draft.mode !== "schedule"}
        isItemDropTarget={isDragging && draft?.kind === "item" && draft.mode !== "schedule"}
        colorOf={colorOf}
        onStartSchedulingUnit={(event, unit) => {
          const start = scale.origin;
          startScheduling(event, {
            kind: "unit",
            id: unit.id,
            start,
            end: start.add(unitDurationMinutes(unit), "minute"),
          });
        }}
        onStartSchedulingItem={(event, item) => {
          const start = scale.origin;
          const duration = itemDurationMinutes(item) || 60;
          startScheduling(event, {
            kind: "item",
            id: item.id,
            start,
            end: start.add(duration, "minute"),
          });
        }}
        onEditUnit={onEditUnit}
        onEditItem={onEditItem}
      />

      <section className="surface overflow-hidden">
        {/* ------------------------------------------------------------ toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Badge tone="brand" icon={CalendarClock} numeric>
            {formatDateTimeRange(scale.origin, scale.end.subtract(1, "minute"))}
          </Badge>
          <span className="hidden text-xs text-slate-400 lg:block">
            Kéo thanh để dời, kéo 2 mép để đổi giờ (bước {SNAP_MINUTES} phút) · giữ chuột 0.5s
            để xem chi tiết.
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

        {scheduledRows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            {planUnits.length === 0
              ? "Kế hoạch chưa có chặng nào — thêm ở tab Xây dựng."
              : "Chưa có chặng nào lên lịch — kéo 1 chặng từ panel phía trên vào."}
          </p>
        ) : (
          // Cuộn cả 2 chiều trong CÙNG 1 khung: nhờ vậy cột nhãn dính trái và hàng
          // ngày/giờ dính trên đều bám theo đúng như gantt thường thấy.
          <div ref={scrollRef} className="scroll-thin max-h-[68vh] overflow-auto">
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

                {scheduledRows.map(({ unit, items }) => (
                  <div key={unit.id}>
                    <UnitLabel
                      unit={unit}
                      color={colorOf(unit.id)}
                      itemCount={items.length}
                      expanded={expanded.has(unit.id)}
                      onToggle={() => toggleExpand(unit.id)}
                      onView={() => onViewUnit(unit)}
                      onEdit={() => onEditUnit(unit)}
                      onRemove={() => onRemoveUnit(unit.id)}
                      onDelete={() => onDeleteUnit(unit.id)}
                      onCreateItem={() => onCreateItem(unit.id)}
                    />
                    {expanded.has(unit.id) &&
                      items.map((item, itemIndex) => (
                        <ItemLabel
                          key={item.id}
                          item={item}
                          color={colorOf(unit.id)}
                          itemIndex={itemIndex}
                          onView={() => onViewItem(item)}
                          onEdit={() => onEditItem(item)}
                          onDelete={() => onDeleteItem(item.id)}
                        />
                      ))}
                  </div>
                ))}

                {schedulingUnit && (
                  <div
                    className="flex items-center gap-1.5 border-b border-dashed border-brand-300 bg-brand-50/60 px-3 text-[11px] font-semibold text-brand-700"
                    style={{ height: UNIT_ROW_HEIGHT }}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${colorOf(schedulingUnit.id).dot}`} />
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

                  {scheduledRows.map(({ unit, items, range }) => {
                    const live = liveRange("unit", unit.id, range);
                    const color = colorOf(unit.id);
                    const stats = unitStats(items, unit.break_minutes);
                    const schedule = computeItemSchedule(unit, items, unit.break_minutes);
                    const clamped = clampBarToCanvas(
                      scale.xOf(live.start),
                      scale.widthOf(live.start, live.end),
                      scale.width
                    );
                    const isItemDropRow = itemDropUnitId === unit.id;

                    return (
                      <div key={unit.id}>
                        <div
                          data-unit-row-id={unit.id}
                          className={`relative border-b border-slate-100 transition-colors ${
                            isItemDropRow ? "bg-brand-50/70" : ""
                          }`}
                          style={{ height: UNIT_ROW_HEIGHT }}
                        >
                          <HoverPopover content={<UnitPopoverContent unit={unit} stats={stats} range={live} />}>
                            <TimelineBar
                              left={clamped.left}
                              width={clamped.width}
                              colorClass={color.bar}
                              dragging={draggingUnitId === unit.id}
                              clippedLeft={clamped.clippedLeft}
                              clippedRight={clamped.clippedRight}
                              title={`${unit.name} · ${formatDateTimeRange(live.start, live.end) ?? ""}`}
                              onClick={() => {
                                if (!wasDraggedRef.current) onViewUnit(unit);
                              }}
                              onPointerDownBody={(event) =>
                                startDrag(event, { kind: "unit", id: unit.id, ...range }, "move", clamped.left)
                              }
                              onPointerDownStart={(event) =>
                                startDrag(
                                  event,
                                  { kind: "unit", id: unit.id, ...range },
                                  "resize-start",
                                  clamped.left
                                )
                              }
                              onPointerDownEnd={(event) =>
                                startDrag(
                                  event,
                                  { kind: "unit", id: unit.id, ...range },
                                  "resize-end",
                                  clamped.left
                                )
                              }
                            />
                          </HoverPopover>
                        </div>

                        {expanded.has(unit.id) &&
                          items.map((item, itemIndex) => {
                            const slot = schedule.find((entry) => entry.item.id === item.id);
                            const base: TimeRange = slot
                              ? { start: slot.start, end: slot.end }
                              : { start: live.start, end: live.start };
                            const itemLive = liveRange("item", item.id, base);
                            const inferred = slot?.inferred !== false;
                            const itemClamped = clampBarToCanvas(
                              scale.xOf(itemLive.start),
                              scale.widthOf(itemLive.start, itemLive.end),
                              scale.width
                            );

                            return (
                              <div
                                key={item.id}
                                data-unit-row-id={unit.id}
                                className="relative border-b border-slate-100 bg-slate-50/40"
                                style={{ height: ITEM_ROW_HEIGHT }}
                              >
                                <HoverPopover
                                  content={<ItemPopoverContent item={item} range={itemLive} inferred={inferred} />}
                                >
                                  <TimelineBar
                                    left={itemClamped.left}
                                    width={itemClamped.width}
                                    colorClass={itemColorInUnit(color, itemIndex, inferred)}
                                    dragging={
                                      draft?.kind === "item" && draft.id === item.id && draft.mode !== "schedule"
                                    }
                                    clippedLeft={itemClamped.clippedLeft}
                                    clippedRight={itemClamped.clippedRight}
                                    title={`${item.name} · ${
                                      formatDateTimeRange(itemLive.start, itemLive.end) ?? ""
                                    }${inferred ? " (giờ dự kiến)" : ""}`}
                                    onClick={() => {
                                      if (!wasDraggedRef.current) onViewItem(item);
                                    }}
                                    onPointerDownBody={(event) =>
                                      startDrag(
                                        event,
                                        { kind: "item", id: item.id, parentId: unit.id, ...base },
                                        "move",
                                        itemClamped.left
                                      )
                                    }
                                    onPointerDownStart={(event) =>
                                      startDrag(
                                        event,
                                        { kind: "item", id: item.id, parentId: unit.id, ...base },
                                        "resize-start",
                                        itemClamped.left
                                      )
                                    }
                                    onPointerDownEnd={(event) =>
                                      startDrag(
                                        event,
                                        { kind: "item", id: item.id, parentId: unit.id, ...base },
                                        "resize-end",
                                        itemClamped.left
                                      )
                                    }
                                  />
                                </HoverPopover>
                              </div>
                            );
                          })}

                        {/* Ghost preview khi kéo 1 hoạt động chưa gắn chặng thả đúng vào chặng này. */}
                        {isItemDropRow && draft && (
                          <div
                            className="relative border-b border-dashed border-brand-300 bg-brand-50/40"
                            style={{ height: ITEM_ROW_HEIGHT }}
                          >
                            <TimelineBar
                              left={scale.xOf(draft.start)}
                              width={scale.widthOf(draft.start, draft.end)}
                              colorClass={itemColorInUnit(color, items.length)}
                              dragging
                              preview
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Hàng "thả vào đây" khi đang kéo 1 chặng từ panel vào. */}
                  {schedulingUnit && draft && (
                    <div
                      className="relative border-b border-dashed border-brand-300 bg-brand-50/60"
                      style={{ height: UNIT_ROW_HEIGHT }}
                    >
                      {!draft.overParking && (
                        <TimelineBar
                          left={scale.xOf(draft.start)}
                          width={scale.widthOf(draft.start, draft.end)}
                          colorClass={colorOf(schedulingUnit.id).bar}
                          dragging
                          preview
                        />
                      )}
                    </div>
                  )}

                  {draft && <DragTimeGuide draft={draft} scale={scale} />}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
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

/** Đường dóng dọc + nhãn giờ khi đang kéo — đọc chính xác đang kéo tới thời điểm nào. */
function DragTimeGuide({ draft, scale }: { draft: DragDraft; scale: TimeScale }) {
  const clamp = (x: number) => Math.max(0, Math.min(x, scale.width));
  const showStart = draft.mode !== "resize-end";
  const showEnd = draft.mode !== "resize-start";

  return (
    <>
      {showStart && (
        <GuideLine x={clamp(scale.xOf(draft.start))} label={draft.start.format("ddd DD/MM · HH:mm")} />
      )}
      {showEnd && (
        <GuideLine x={clamp(scale.xOf(draft.end))} label={draft.end.format("ddd DD/MM · HH:mm")} align="right" />
      )}
    </>
  );
}

function GuideLine({ x, label, align = "left" }: { x: number; label: string; align?: "left" | "right" }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-20"
      style={{ left: x, top: HEADER_HEIGHT, bottom: 0 }}
    >
      <span className="absolute inset-y-0 left-0 w-px bg-brand-500/70" />
      <span
        className={`absolute top-1.5 whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white shadow-pop tnum ${
          align === "right" ? "right-1.5" : "left-1.5"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

interface UnitLabelProps {
  unit: Unit;
  color: UnitColor;
  itemCount: number;
  expanded: boolean;
  onToggle: () => void;
  onView: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onDelete: () => void;
  onCreateItem: () => void;
}

function UnitLabel({
  unit,
  color,
  itemCount,
  expanded,
  onToggle,
  onView,
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
      <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />

      <button type="button" onClick={onView} className="min-w-0 flex-1 text-left">
        <p className="truncate text-[13px] font-semibold text-slate-800">{unit.name}</p>
        <p className="truncate text-[11px] text-slate-400 tnum">
          {itemCount} hoạt động
          {unit.unit_type ? ` · ${unit.unit_type.name}` : ""}
        </p>
      </button>

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

const ITEM_DOT_OPACITY = [1, 0.75, 0.55, 0.4];

function ItemLabel({
  item,
  color,
  itemIndex,
  onView,
  onEdit,
  onDelete,
}: {
  item: Item;
  color: UnitColor;
  itemIndex: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/40 pl-8 pr-1"
      style={{ height: ITEM_ROW_HEIGHT }}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${color.dot}`}
        style={{ opacity: ITEM_DOT_OPACITY[itemIndex % ITEM_DOT_OPACITY.length] }}
      />
      <button type="button" onClick={onView} className="min-w-0 flex-1 truncate text-left text-[12px] text-slate-600">
        {item.name}
      </button>
      <span className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <IconButton size="sm" tone="brand" icon={Pencil} onClick={onEdit} aria-label="Sửa hoạt động" />
        <IconButton size="sm" tone="danger" icon={Trash2} onClick={onDelete} aria-label="Xoá hoạt động" />
      </span>
    </div>
  );
}

// -------------------------------------------------------- panel "chưa xếp lịch"

interface UnscheduledPanelProps {
  open: boolean;
  onToggle: () => void;
  unitParkingRef: RefObject<HTMLDivElement | null>;
  itemParkingRef: RefObject<HTMLDivElement | null>;
  unscheduledUnits: Unit[];
  totalUnscheduledUnits: number;
  freeUnits: Unit[];
  totalFreeUnits: number;
  unitSearch: string;
  onUnitSearchChange: (value: string) => void;
  libraryItems: Item[];
  totalLibraryItems: number;
  itemSearch: string;
  onItemSearchChange: (value: string) => void;
  itemsByUnit: Map<Id, Item[]>;
  isUnitDropTarget: boolean;
  isItemDropTarget: boolean;
  colorOf: (unitId: Id) => UnitColor;
  onStartSchedulingUnit: (event: ReactPointerEvent, unit: Unit) => void;
  onStartSchedulingItem: (event: ReactPointerEvent, item: Item) => void;
  onEditUnit: (unit: Unit) => void;
  onEditItem: (item: Item) => void;
}

function UnscheduledPanel({
  open,
  onToggle,
  unitParkingRef,
  itemParkingRef,
  unscheduledUnits,
  totalUnscheduledUnits,
  freeUnits,
  totalFreeUnits,
  unitSearch,
  onUnitSearchChange,
  libraryItems,
  totalLibraryItems,
  itemSearch,
  onItemSearchChange,
  itemsByUnit,
  isUnitDropTarget,
  isItemDropTarget,
  colorOf,
  onStartSchedulingUnit,
  onStartSchedulingItem,
  onEditUnit,
  onEditItem,
}: UnscheduledPanelProps) {
  return (
    <section className="surface overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-slate-50/70"
      >
        <Inbox className="h-4 w-4 text-slate-400" />
        <span className="text-[13px] font-bold text-slate-700">Chưa xếp lịch</span>
        <span className="text-xs text-slate-400 tnum">
          {totalUnscheduledUnits + totalFreeUnits} chặng · {totalLibraryItems} hoạt động
        </span>
        {open ? (
          <ChevronUp className="ml-auto h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="grid gap-3 border-t border-slate-100 p-3.5 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-slate-100 sm:p-0">
          <div
            ref={unitParkingRef}
            className={`rounded-xl p-3 transition sm:rounded-none sm:p-3.5 ${
              isUnitDropTarget ? "bg-rose-50/60 ring-2 ring-inset ring-rose-300" : ""
            }`}
          >
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <RouteIcon className="h-3.5 w-3.5" />
              Chặng chưa xếp
            </div>
            <Input
              size="small"
              value={unitSearch}
              onChange={(e) => onUnitSearchChange(e.target.value)}
              placeholder="Tìm chặng..."
              prefix={<Search className="h-3.5 w-3.5 text-slate-400" />}
              allowClear
              className="mb-2.5"
            />
            <ScrollRevealList
              items={unscheduledUnits}
              keyOf={(u) => u.id}
              resetKey={unitSearch}
              emptyHint="Mọi chặng đều đã có giờ."
              renderItem={(unit) => (
                <UnscheduledUnitCard
                  unit={unit}
                  color={colorOf(unit.id)}
                  itemCount={itemsByUnit.get(unit.id)?.length ?? 0}
                  onPointerDown={(event) => onStartSchedulingUnit(event, unit)}
                  onEdit={() => onEditUnit(unit)}
                />
              )}
            />

            {freeUnits.length > 0 && (
              <>
                <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Chặng chưa gắn kế hoạch nào ({freeUnits.length})
                </p>
                <ScrollRevealList
                  items={freeUnits}
                  keyOf={(u) => u.id}
                  resetKey={unitSearch}
                  emptyHint="Không có chặng nào."
                  renderItem={(unit) => (
                    <UnscheduledUnitCard
                      unit={unit}
                      itemCount={itemsByUnit.get(unit.id)?.length ?? 0}
                      onPointerDown={(event) => onStartSchedulingUnit(event, unit)}
                      onEdit={() => onEditUnit(unit)}
                    />
                  )}
                />
              </>
            )}
          </div>

          <div
            ref={itemParkingRef}
            className={`rounded-xl p-3 transition sm:rounded-none sm:p-3.5 ${
              isItemDropTarget ? "bg-rose-50/60 ring-2 ring-inset ring-rose-300" : ""
            }`}
          >
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Sparkles className="h-3.5 w-3.5" />
              Hoạt động chưa gắn chặng
            </div>
            <Input
              size="small"
              value={itemSearch}
              onChange={(e) => onItemSearchChange(e.target.value)}
              placeholder="Tìm hoạt động..."
              prefix={<Search className="h-3.5 w-3.5 text-slate-400" />}
              allowClear
              className="mb-2.5"
            />
            <ScrollRevealList
              items={libraryItems}
              keyOf={(i) => i.id}
              resetKey={itemSearch}
              emptyHint="Mọi hoạt động đều đã gắn chặng."
              renderItem={(item) => (
                <LibraryItemCard
                  item={item}
                  onPointerDown={(event) => onStartSchedulingItem(event, item)}
                  onEdit={() => onEditItem(item)}
                />
              )}
            />
          </div>
        </div>
      )}
    </section>
  );
}

interface ScrollRevealListProps<T> {
  items: T[];
  keyOf: (item: T) => Id;
  /** Đổi giá trị này (vd từ khoá search) là reset về `REVEAL_STEP` phần tử đầu. */
  resetKey: string;
  renderItem: (item: T) => ReactNode;
  emptyHint: string;
}

/**
 * "Infinite scroll" thuần client-side: dữ liệu (units/items chưa xếp) đã nằm hết trong bộ
 * nhớ (không có API phân trang ở tầng này), nên chỉ cần tăng dần số lượng render khi cuộn
 * tới cuối — không gọi thêm request nào.
 */
function ScrollRevealList<T>({ items, keyOf, resetKey, renderItem, emptyHint }: ScrollRevealListProps<T>) {
  const [count, setCount] = useState(REVEAL_STEP);
  useEffect(() => setCount(REVEAL_STEP), [resetKey]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || count >= items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setCount((c) => Math.min(c + REVEAL_STEP, items.length));
      },
      { rootMargin: "160px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [count, items.length]);

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-[11px] text-slate-400">
        {emptyHint}
      </p>
    );
  }

  const visible = items.slice(0, count);
  return (
    <div className="scroll-thin max-h-64 space-y-2 overflow-y-auto pr-0.5">
      {visible.map((item) => (
        <div key={keyOf(item)}>{renderItem(item)}</div>
      ))}
      {count < items.length && (
        <div ref={sentinelRef} className="py-1 text-center text-[10px] text-slate-400">
          Cuộn để xem thêm…
        </div>
      )}
    </div>
  );
}

interface UnscheduledUnitCardProps {
  unit: Unit;
  /** Không truyền = chặng chưa gắn kế hoạch nào, chưa có màu theo `planUnits`. */
  color?: UnitColor;
  itemCount: number;
  onPointerDown: (event: ReactPointerEvent) => void;
  onEdit: () => void;
}

function UnscheduledUnitCard({ unit, color, itemCount, onPointerDown, onEdit }: UnscheduledUnitCardProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="group cursor-grab touch-none rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs transition hover:border-brand-300 active:cursor-grabbing"
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${color?.dot ?? "bg-slate-300"}`} />
        <p className="min-w-0 flex-1 text-[12px] font-semibold leading-snug text-slate-800">{unit.name}</p>
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

      <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-5">
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

interface LibraryItemCardProps {
  item: Item;
  onPointerDown: (event: ReactPointerEvent) => void;
  onEdit: () => void;
}

function LibraryItemCard({ item, onPointerDown, onEdit }: LibraryItemCardProps) {
  const duration = formatDuration(itemDurationMinutes(item));

  return (
    <div
      onPointerDown={onPointerDown}
      className="group cursor-grab touch-none rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs transition hover:border-brand-300 active:cursor-grabbing"
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
        <p className="min-w-0 flex-1 text-[12px] font-semibold leading-snug text-slate-800">{item.name}</p>
        <IconButton
          size="sm"
          tone="brand"
          icon={Pencil}
          onClick={onEdit}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="Sửa hoạt động"
          className="opacity-0 transition group-hover:opacity-100"
        />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-5">
        {duration && (
          <Badge size="sm" tone="brand" icon={Clock} numeric>
            {duration}
          </Badge>
        )}
        {item.price != null && Number(item.price) > 0 && (
          <Badge size="sm" tone="emerald" numeric>
            {formatPrice(item.price)}
          </Badge>
        )}
        {item.locations?.length > 0 && (
          <Badge size="sm" numeric>
            {item.locations.length} địa điểm
          </Badge>
        )}
      </div>
    </div>
  );
}
