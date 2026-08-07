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
import { Dropdown, Slider } from "antd";
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
  Receipt,
  Route as RouteIcon,
  Search,
  Sparkles,
  Trash2,
  Unlink,
  Wallet,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Badge from "../../shared/components/Badge";
import EmptyState from "../../shared/components/EmptyState";
import IconButton from "../../shared/components/IconButton";
import Input from "../../shared/components/Input";
import {
  dayCount,
  formatDateTimeRange,
  formatDuration,
  formatPrice,
  formatPriceShort,
} from "../../shared/utils/format";
import { expenseColor, expenseColorIndex, planTotals, unitStats } from "../../shared/utils/planStats";
import {
  clampTime,
  computeItemSchedule,
  itemDurationMinutes,
  itemRange,
  snapToMinutes,
  unitDurationMinutes,
  unitRange,
  type TimeRange,
} from "../../shared/utils/schedule";
import type { Id, Item, Plan, PlanExpense, Unit } from "../../shared/types/models";
import type { ItemTimePatch } from "../../services/items.service";
import type { PlanExpenseTimePatch } from "../../services/planExpenses.service";
import type { UnitTimePatch } from "../../services/units.service";
import TimelineBar from "./timeline/TimelineBar";
import { HoverPopover, ItemPopoverContent, UnitPopoverContent } from "./timeline/TimelineBarPopover";
import {
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  clampBarToCanvas,
  clampZoom,
  createScale,
  fitZoom,
  type TimeScale,
} from "./timeline/scale";
import { itemColorInUnit, priceShadeIndex, unitColor, type UnitColor } from "./timeline/colors";
import { useTimelineDrag, type DragDraft, type DragTarget } from "./timeline/useTimelineDrag";
import { useRowReorder } from "./timeline/useRowReorder";

const LABEL_WIDTH = 216;
const HEADER_HEIGHT = 46;
// Hàng thấp hơn trước (52/34) để nhiều chặng lọt vào khung nhìn hơn — gantt dài
// vài chục hàng thì chiều cao là thứ đắt nhất.
const UNIT_ROW_HEIGHT = 38;
const ITEM_ROW_HEIGHT = 26;
/** Bề rộng 1 dải sọc nền (giờ) — 00:00-04:00 trắng, 04:00-08:00 xanh nhạt, xen kẽ. */
const BAND_HOURS = 4;
const SNAP_MINUTES = 15;
/** Khớp với `minMinutes` mặc định của `useTimelineDrag` — truyền tường minh để dùng lại
 * đúng giá trị này khi "vẽ" giờ mới cho hoạt động chưa có ngày (xem `startUndatedItemDraw`). */
const MIN_ITEM_MINUTES = 30;
const REVEAL_STEP = 20;
/** Bề rộng tối thiểu (px) cho hoạt động chưa có giờ riêng lẫn thời lượng — đủ để bấm-kéo. */
const UNDATED_ITEM_WIDTH_PX = 32;

/** Tên "group" cho `useRowReorder` — xem chú thích trong `useRowReorder.ts`. */
const UNIT_GROUP = "units";
const ITEM_GROUP_PREFIX = "items:";

/**
 * Ghép thứ tự mới của 1 TẬP CON (`subset`) vào danh sách đầy đủ (`all`): những phần tử
 * không nằm trong tập con giữ nguyên chỗ, các ô còn lại được lấp theo đúng thứ tự mới.
 * Dùng khi kéo sắp lại chặng trên gantt — ở đó chỉ thấy chặng đã xếp lịch, nhưng khi ghi
 * `order_index` thì phải ghi cho toàn bộ chặng của kế hoạch.
 */
function mergeOrder(all: Id[], subset: Id[]): Id[] {
  const inSubset = new Set(subset);
  let cursor = 0;
  return all.map((id) => (inSubset.has(id) ? (subset[cursor++] ?? id) : id));
}

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
  /** "Chi phí khác" của kế hoạch — không thuộc chặng nào, gom vào 1 hàng cha ảo trên gantt. */
  expenses: PlanExpense[];
  onScheduleExpense: (expenseId: Id, patch: PlanExpenseTimePatch) => void;
  onUnscheduleExpense: (expenseId: Id) => void;
  onEditExpense: (expense: PlanExpense) => void;
  onDeleteExpense: (expenseId: Id) => void;
  /** Kéo tay cầm ở cột nhãn để sắp lại `order_index` của các chặng trong kế hoạch. */
  onReorderUnits: (unitIds: Id[]) => void;
  /** Kéo tay cầm để sắp lại `order_index` của các hoạt động BÊN TRONG 1 chặng. */
  onReorderItems: (unitId: Id, itemIds: Id[]) => void;
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
  expenses,
  onScheduleExpense,
  onUnscheduleExpense,
  onEditExpense,
  onDeleteExpense,
  onReorderUnits,
  onReorderItems,
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
  const [expensesExpanded, setExpensesExpanded] = useState(true);
  const [panelOpen, setPanelOpen] = useState(
    () => libraryItems.length > 0 || freeUnits.length > 0 || planUnits.some((u) => !u.start_date)
  );
  const [unitSearch, setUnitSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  /** Toạ độ X (trong hệ canvas) của con trỏ khi rê trên gantt — vẽ đường dóng dash. */
  const [hoverX, setHoverX] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const unitParkingRef = useRef<HTMLDivElement | null>(null);
  const itemParkingRef = useRef<HTMLDivElement | null>(null);
  const expenseParkingRef = useRef<HTMLDivElement | null>(null);

  const hasWindow = Boolean(plan?.start_date && plan?.end_date);
  const scale = useMemo(
    () => createScale(plan?.start_date ?? "", plan?.end_date ?? "", zoom ?? ZOOM_DEFAULT),
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

  // Thứ tự hàng = `order_index` của chặng (planUnits đã sắp sẵn), KHÔNG sắp lại theo giờ
  // bắt đầu — có vậy thứ tự nhìn thấy ở đây mới khớp tab Xây dựng/Tổng quan và mới có
  // nghĩa để kéo sắp lại bằng tay.
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
    return { scheduledRows: rows, unscheduledUnits: unscheduled };
  }, [planUnits, itemsByUnit]);

  const reorder = useRowReorder((group, ids) => {
    if (group === UNIT_GROUP) {
      // `ids` chỉ gồm chặng ĐÃ xếp lịch; ghép lại vào danh sách đầy đủ để chặng chưa xếp
      // giữ nguyên chỗ của nó trong `order_index` chung thay vì bị dồn xuống cuối.
      onReorderUnits(mergeOrder(planUnits.map((u) => u.id), ids));
      return;
    }
    onReorderItems(group.slice(ITEM_GROUP_PREFIX.length), ids);
  });

  // Áp thứ tự đang kéo (nếu có) lên cả cột nhãn lẫn canvas — 2 bên cùng đọc 1 mảng.
  const rows = useMemo(() => {
    const order = reorder.orderOf(UNIT_GROUP, scheduledRows.map((r) => r.unit.id));
    const byId = new Map(scheduledRows.map((r) => [r.unit.id, r]));
    return order.flatMap((id) => {
      const row = byId.get(id);
      if (!row) return [];
      const itemOrder = reorder.orderOf(
        ITEM_GROUP_PREFIX + id,
        row.items.map((i) => i.id)
      );
      const itemById = new Map(row.items.map((i) => [i.id, i]));
      return [{ ...row, items: itemOrder.flatMap((itemId) => itemById.get(itemId) ?? []) }];
    });
  }, [scheduledRows, reorder]);

  const rowUnitIds = useMemo(() => rows.map((r) => r.unit.id), [rows]);

  // Giá cao nhất trong kế hoạch — mốc chung để quy đổi giá của từng hoạt động ra độ đậm
  // của màu (xem `priceShadeIndex`), nhờ vậy 2 chặng cạnh nhau vẫn so được với nhau.
  const maxItemPrice = useMemo(() => {
    let max = 0;
    for (const items of itemsByUnit.values()) {
      for (const item of items) max = Math.max(max, Number(item.price) || 0);
    }
    return max;
  }, [itemsByUnit]);

  const totals = useMemo(
    () => planTotals(planUnits, itemsByUnit, expenses),
    [planUnits, itemsByUnit, expenses]
  );

  // Màu theo thứ tự created_at trong TOÀN BỘ danh sách chi phí (ổn định, không đổi khi 1
  // khoản được lên lịch/gỡ lịch) — không có field phân loại nên phân biệt bằng màu.
  const expenseColorIndexById = useMemo(() => expenseColorIndex(expenses), [expenses]);
  const expenseColorOf = useCallback(
    (expenseId: Id) => expenseColor(expenseColorIndexById.get(expenseId) ?? 0),
    [expenseColorIndexById]
  );
  const { scheduledExpenses, unscheduledExpenses } = useMemo(() => {
    const scheduled = expenses.filter((e) => e.start_time);
    const unscheduled = expenses.filter((e) => !e.start_time);
    scheduled.sort((a, b) => dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf());
    return { scheduledExpenses: scheduled, unscheduledExpenses: unscheduled };
  }, [expenses]);
  // Khoảng thời gian tóm tắt của hàng cha "Chi phí khác" — suy ra từ min/max của các
  // khoản con đã lên lịch, không lưu riêng (hàng cha không có dữ liệu DB của chính nó).
  const expensesSummaryRange = useMemo<TimeRange | null>(() => {
    if (scheduledExpenses.length === 0) return null;
    let start = dayjs(scheduledExpenses[0]!.start_time);
    let end = itemRange(scheduledExpenses[0])!.end;
    for (const expense of scheduledExpenses) {
      const range = itemRange(expense);
      if (!range) continue;
      if (range.start.isBefore(start)) start = range.start;
      if (range.end.isAfter(end)) end = range.end;
    }
    return { start, end };
  }, [scheduledExpenses]);

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
    expenseParkingRef,
    resolveRowTarget,
    snapMinutes: SNAP_MINUTES,
    minMinutes: MIN_ITEM_MINUTES,
    onCommit: handleCommit,
    onUnschedule: handleUnschedule,
  });

  // Hoạt động chưa có giờ riêng LẪN không có `duration_minutes` (chưa từng đặt giờ)
  // được xếp lịch suy ra 0 phút -> không có thanh thật để "dời", nên bấm-kéo ở đây
  // không dời thanh mà "vẽ" thanh mới: điểm bấm = giờ bắt đầu, kéo tới đâu là giờ kết
  // thúc tới đó (tái dùng mode "resize-end" của engine kéo, chỉ khác điểm xuất phát).
  const startUndatedItemDraw = useCallback(
    (event: ReactPointerEvent, item: Item, unitId: Id) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const x = event.clientX - canvas.getBoundingClientRect().left;
      const start = clampTime(
        snapToMinutes(scale.timeAt(x), SNAP_MINUTES),
        scale.origin,
        scale.end.subtract(MIN_ITEM_MINUTES, "minute")
      );
      startDrag(
        event,
        { kind: "item", id: item.id, parentId: unitId, start, end: start.add(MIN_ITEM_MINUTES, "minute") },
        "resize-end",
        scale.xOf(start)
      );
    },
    [scale, startDrag]
  );

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

    if (committed.kind === "expense") {
      // Chi phí không có "hàng" riêng để thả vào — chỉ có 1 đích duy nhất là "Chi phí
      // khác", giống cách kéo 1 chặng chưa xếp lịch (không cần overRowId).
      onScheduleExpense(committed.id, {
        start_time: committed.start.toISOString(),
        end_time: committed.end.toISOString(),
        duration_minutes: minutes,
      });
      setExpensesExpanded(true);
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
    if (target.kind === "expense") {
      onUnscheduleExpense(target.id);
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
  function liveRange(kind: "unit" | "item" | "expense", id: Id, fallback: TimeRange): TimeRange {
    if (draft && draft.kind === kind && draft.id === id && draft.mode !== "schedule") {
      return { start: draft.start, end: draft.end };
    }
    return fallback;
  }

  /** ± đi 1 bước lớn (5 nấc) cho nhanh; slider mới là chỗ chỉnh mịn từng nấc. */
  function changeZoom(direction: 1 | -1) {
    setZoom(clampZoom((zoom ?? ZOOM_DEFAULT) + direction * ZOOM_STEP * 5));
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
  const filteredUnscheduledExpenses = unscheduledExpenses.filter((e) =>
    e.name.toLowerCase().includes(expenseSearch.trim().toLowerCase())
  );

  return (
    <div className="animate-fade-up space-y-4">
      <UnscheduledPanel
        open={panelOpen}
        onToggle={() => setPanelOpen((v) => !v)}
        unitParkingRef={unitParkingRef}
        itemParkingRef={itemParkingRef}
        expenseParkingRef={expenseParkingRef}
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
        expenses={filteredUnscheduledExpenses}
        totalExpenses={unscheduledExpenses.length}
        expenseSearch={expenseSearch}
        onExpenseSearchChange={setExpenseSearch}
        isUnitDropTarget={isDragging && draft?.kind === "unit" && draft.mode !== "schedule"}
        isItemDropTarget={isDragging && draft?.kind === "item" && draft.mode !== "schedule"}
        isExpenseDropTarget={isDragging && draft?.kind === "expense" && draft.mode !== "schedule"}
        colorOf={colorOf}
        expenseColorOf={expenseColorOf}
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
        onStartSchedulingExpense={(event, expense) => {
          const start = scale.origin;
          const duration = itemDurationMinutes(expense) || 60;
          startScheduling(event, {
            kind: "expense",
            id: expense.id,
            start,
            end: start.add(duration, "minute"),
          });
        }}
        onEditUnit={onEditUnit}
        onEditItem={onEditItem}
        onEditExpense={onEditExpense}
      />

      <section className="surface overflow-hidden">
        {/* ------------------------------------------------------------ toolbar */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border/10 px-4 py-2.5">
          <Badge tone="brand" icon={CalendarClock} numeric>
            {formatDateTimeRange(scale.origin, scale.end.subtract(1, "minute"))}
          </Badge>
          <Badge icon={CalendarClock} numeric>
            {dayCount(plan?.start_date, plan?.end_date)} ngày
          </Badge>
          <Badge tone={unscheduledUnits.length > 0 ? "amber" : "emerald"} icon={RouteIcon} numeric>
            {scheduledRows.length}/{planUnits.length} chặng đã xếp
          </Badge>
          <Badge tone="violet" icon={Sparkles} numeric>
            {totals.itemCount} hoạt động
          </Badge>
          {totals.minutes > 0 && (
            <Badge icon={Clock} numeric>
              {formatDuration(totals.minutes)}
            </Badge>
          )}
          {totals.cost > 0 && (
            <Badge tone="emerald" icon={Wallet} numeric>
              {formatPrice(totals.cost)}
            </Badge>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <IconButton
              icon={ZoomOut}
              onClick={() => changeZoom(-1)}
              aria-label="Thu nhỏ"
              disabled={(zoom ?? ZOOM_DEFAULT) <= ZOOM_MIN}
            />
            <Slider
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={ZOOM_STEP}
              value={zoom ?? ZOOM_DEFAULT}
              onChange={(value) => setZoom(clampZoom(value))}
              tooltip={{ formatter: (value) => `${value ?? 0}px/giờ` }}
              className="!my-0 w-28 shrink-0"
            />
            <IconButton
              icon={ZoomIn}
              onClick={() => changeZoom(1)}
              aria-label="Phóng to"
              disabled={(zoom ?? ZOOM_DEFAULT) >= ZOOM_MAX}
            />
            <span className="w-16 shrink-0 text-right text-[11px] text-text-muted tnum">
              {scale.pxPerHour}px/giờ
            </span>
          </div>
        </div>

        {rows.length === 0 && scheduledExpenses.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-muted">
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
                className="sticky left-0 z-30 shrink-0 border-r border-border/10 bg-surface/94 backdrop-blur"
                style={{ width: LABEL_WIDTH }}
              >
                <div
                  className="sticky top-0 z-10 flex items-end border-b border-border/10 bg-surface/94 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted backdrop-blur"
                  style={{ height: HEADER_HEIGHT }}
                >
                  Chặng
                </div>

                {rows.map(({ unit, items }, rowIndex) => {
                  const itemIds = items.map((i) => i.id);
                  return (
                    <div key={unit.id} data-reorder-group={UNIT_GROUP} data-reorder-id={unit.id}>
                      <UnitLabel
                        unit={unit}
                        order={rowIndex + 1}
                        color={colorOf(unit.id)}
                        itemCount={items.length}
                        expanded={expanded.has(unit.id)}
                        dragging={reorder.draft?.activeId === unit.id}
                        onReorderStart={(event) =>
                          reorder.start(event, UNIT_GROUP, rowUnitIds, unit.id)
                        }
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
                            order={itemIndex + 1}
                            maxPrice={maxItemPrice}
                            group={ITEM_GROUP_PREFIX + unit.id}
                            dragging={reorder.draft?.activeId === item.id}
                            onReorderStart={(event) =>
                              reorder.start(event, ITEM_GROUP_PREFIX + unit.id, itemIds, item.id)
                            }
                            onView={() => onViewItem(item)}
                            onEdit={() => onEditItem(item)}
                            onDelete={() => onDeleteItem(item.id)}
                          />
                        ))}
                    </div>
                  );
                })}

                {schedulingUnit && (
                  <div
                    className="flex items-center gap-1.5 border-b border-dashed border-primary/20 bg-primary/10 px-3 text-[11px] font-semibold text-primary"
                    style={{ height: UNIT_ROW_HEIGHT }}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${colorOf(schedulingUnit.id).dot}`} />
                    {schedulingUnit.name}
                  </div>
                )}

                {/* "Chi phí khác" — hàng cha ẢO (không phải 1 unit thật), gom các khoản
                    chi phí đã có giờ làm hàng con, giống cấu trúc chặng -> hoạt động. */}
                {expenses.length > 0 && (
                  <div>
                    <ExpenseGroupLabel
                      count={expenses.length}
                      scheduledCount={scheduledExpenses.length}
                      expanded={expensesExpanded}
                      onToggle={() => setExpensesExpanded((v) => !v)}
                    />
                    {expensesExpanded &&
                      scheduledExpenses.map((expense) => (
                        <ExpenseLabel
                          key={expense.id}
                          expense={expense}
                          color={expenseColorOf(expense.id)}
                          onEdit={() => onEditExpense(expense)}
                          onDelete={() => onDeleteExpense(expense.id)}
                        />
                      ))}
                  </div>
                )}
              </div>

              {/* ------------------------------------------------- dải thời gian */}
              <div className="shrink-0" style={{ width: scale.width }}>
                <div
                  ref={canvasRef}
                  className="relative"
                  style={{ width: scale.width }}
                  onPointerMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setHoverX(event.clientX - rect.left);
                  }}
                  onPointerLeave={() => setHoverX(null)}
                >
                  {/* Sọc nền xen kẽ theo khung 4 giờ — vẽ TRƯỚC header để header (nền
                      trắng mờ, sticky) vẫn nằm đè lên trên khi cuộn dọc. */}
                  <TimeBands scale={scale} />

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
                        className="absolute top-0 h-full w-px bg-border/14"
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

                  {rows.map(({ unit, items, range }) => {
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
                          className={`relative border-b border-border/10 transition-colors ${
                            isItemDropRow ? "bg-primary/8" : ""
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
                          items.map((item) => {
                            const slot = schedule.find((entry) => entry.item.id === item.id);
                            const base: TimeRange = slot
                              ? { start: slot.start, end: slot.end }
                              : { start: live.start, end: live.start };
                            const itemLive = liveRange("item", item.id, base);
                            const inferred = slot?.inferred !== false;
                            // Chưa từng đặt giờ VÀ không có `duration_minutes` -> xếp lịch suy
                            // ra 0 phút, không có thanh thật để "dời". Cho 1 bề rộng tối thiểu
                            // để bấm được, và bấm-kéo sẽ "vẽ" giờ mới thay vì dời thanh rỗng.
                            const isUndated = inferred && itemDurationMinutes(item) === 0;
                            const itemClamped = clampBarToCanvas(
                              scale.xOf(itemLive.start),
                              isUndated
                                ? UNDATED_ITEM_WIDTH_PX
                                : scale.widthOf(itemLive.start, itemLive.end),
                              scale.width
                            );

                            return (
                              <div
                                key={item.id}
                                data-unit-row-id={unit.id}
                                className="relative border-b border-border/10 bg-surface-secondary/38"
                                style={{ height: ITEM_ROW_HEIGHT }}
                              >
                                <HoverPopover
                                  content={
                                    isUndated ? (
                                      <p className="text-xs text-text-secondary">
                                        <span className="font-bold text-text-primary">{item.name}</span> chưa có giờ —
                                        kéo thanh này để đặt giờ.
                                      </p>
                                    ) : (
                                      <ItemPopoverContent item={item} range={itemLive} inferred={inferred} />
                                    )
                                  }
                                >
                                  <TimelineBar
                                    left={itemClamped.left}
                                    width={itemClamped.width}
                                    colorClass={
                                      isUndated
                                        ? "border border-dashed border-border/18 bg-surface-elevated/82"
                                        : // Sắc thái theo GIÁ chứ không theo thứ tự trong chặng:
                                          // hoạt động càng đắt thanh càng đậm.
                                          itemColorInUnit(
                                            color,
                                            priceShadeIndex(item.price, maxItemPrice),
                                            inferred
                                          )
                                    }
                                    dragging={
                                      draft?.kind === "item" && draft.id === item.id && draft.mode !== "schedule"
                                    }
                                    clippedLeft={itemClamped.clippedLeft}
                                    clippedRight={itemClamped.clippedRight}
                                    title={
                                      isUndated
                                        ? `${item.name} · Kéo để đặt giờ`
                                        : `${item.name} · ${
                                            formatDateTimeRange(itemLive.start, itemLive.end) ?? ""
                                          }${inferred ? " (giờ dự kiến)" : ""}`
                                    }
                                    onClick={() => {
                                      if (!wasDraggedRef.current) onViewItem(item);
                                    }}
                                    onPointerDownBody={(event) =>
                                      isUndated
                                        ? startUndatedItemDraw(event, item, unit.id)
                                        : startDrag(
                                            event,
                                            { kind: "item", id: item.id, parentId: unit.id, ...base },
                                            "move",
                                            itemClamped.left
                                          )
                                    }
                                    onPointerDownStart={
                                      isUndated
                                        ? undefined
                                        : (event) =>
                                            startDrag(
                                              event,
                                              { kind: "item", id: item.id, parentId: unit.id, ...base },
                                              "resize-start",
                                              itemClamped.left
                                            )
                                    }
                                    onPointerDownEnd={
                                      isUndated
                                        ? undefined
                                        : (event) =>
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
                            className="relative border-b border-dashed border-primary/18 bg-primary/8"
                            style={{ height: ITEM_ROW_HEIGHT }}
                          >
                            <TimelineBar
                              left={scale.xOf(draft.start)}
                              width={scale.widthOf(draft.start, draft.end)}
                              colorClass={itemColorInUnit(color, 1)}
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
                      className="relative border-b border-dashed border-primary/20 bg-primary/10"
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

                  {/* "Chi phí khác" — hàng header CHỈ hiện dải tóm tắt (không kéo/resize
                      được, xem ExpenseGroupLabel), các khoản con bên dưới mới kéo được. */}
                  {expenses.length > 0 && (
                    <div>
                      <div className="relative border-b border-border/10" style={{ height: UNIT_ROW_HEIGHT }}>
                        {expensesSummaryRange &&
                          (() => {
                            const clamped = clampBarToCanvas(
                              scale.xOf(expensesSummaryRange.start),
                              scale.widthOf(expensesSummaryRange.start, expensesSummaryRange.end),
                              scale.width
                            );
                            return (
                              <div
                                title={`Chi phí khác · ${
                                  formatDateTimeRange(expensesSummaryRange.start, expensesSummaryRange.end) ?? ""
                                }`}
                                className="absolute inset-y-2 rounded-lg bg-surface-elevated/78 ring-1 ring-border/20"
                                style={{ left: clamped.left, width: clamped.width }}
                              />
                            );
                          })()}
                      </div>

                      {expensesExpanded &&
                        scheduledExpenses.map((expense) => {
                          const range = itemRange(expense)!;
                          const live = liveRange("expense", expense.id, range);
                          const color = expenseColorOf(expense.id);
                          const clamped = clampBarToCanvas(
                            scale.xOf(live.start),
                            scale.widthOf(live.start, live.end),
                            scale.width
                          );

                          return (
                            <div
                              key={expense.id}
                              className="relative border-b border-border/10 bg-surface-secondary/36"
                              style={{ height: ITEM_ROW_HEIGHT }}
                            >
                              <TimelineBar
                                left={clamped.left}
                                width={clamped.width}
                                colorClass={color.bar}
                                dragging={
                                  draft?.kind === "expense" &&
                                  draft.id === expense.id &&
                                  draft.mode !== "schedule"
                                }
                                clippedLeft={clamped.clippedLeft}
                                clippedRight={clamped.clippedRight}
                                title={`${expense.name} · ${formatDateTimeRange(live.start, live.end) ?? ""}`}
                                onClick={() => {
                                  if (!wasDraggedRef.current) onEditExpense(expense);
                                }}
                                onPointerDownBody={(event) =>
                                  startDrag(event, { kind: "expense", id: expense.id, ...range }, "move", clamped.left)
                                }
                                onPointerDownStart={(event) =>
                                  startDrag(
                                    event,
                                    { kind: "expense", id: expense.id, ...range },
                                    "resize-start",
                                    clamped.left
                                  )
                                }
                                onPointerDownEnd={(event) =>
                                  startDrag(
                                    event,
                                    { kind: "expense", id: expense.id, ...range },
                                    "resize-end",
                                    clamped.left
                                  )
                                }
                              />
                            </div>
                          );
                        })}

                      {/* Hàng "thả vào đây" khi đang kéo 1 khoản chi phí từ panel vào. */}
                      {draft?.kind === "expense" && draft.mode === "schedule" && (
                        <div
                          className="relative border-b border-dashed border-primary/20 bg-primary/10"
                          style={{ height: ITEM_ROW_HEIGHT }}
                        >
                          {!draft.overParking && (
                            <TimelineBar
                              left={scale.xOf(draft.start)}
                              width={scale.widthOf(draft.start, draft.end)}
                              colorClass={expenseColorOf(draft.id).bar}
                              dragging
                              preview
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Đường dóng khi chỉ rê chuột (không kéo) — đọc nhanh "chỗ này là mấy
                      giờ" mà không phải nhìn chéo lên hàng ngày/giờ. */}
                  {hoverX !== null && !isDragging && <HoverGuide x={hoverX} scale={scale} />}
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
      className="sticky top-0 z-10 border-b border-border/10 bg-surface/92 backdrop-blur"
      style={{ height: HEADER_HEIGHT, width }}
    >
      {days.map((day) => (
        <div
          key={day.toISOString()}
          className="absolute top-0 flex h-7 items-center border-l border-border/10 px-2 text-[11px] font-semibold text-text-secondary"
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
              className="absolute bottom-1 text-[10px] text-text-muted tnum"
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

/**
 * Sọc nền xen kẽ theo khung `BAND_HOURS` giờ (00:00-04:00 trắng, 04:00-08:00 xanh nhạt...).
 * Một ngày chia chẵn 6 khung nên hoạ tiết lặp y hệt nhau ở mọi ngày — mắt bám được "đang
 * nhìn buổi nào trong ngày" mà không phải dóng lên hàng giờ ở trên.
 */
function TimeBands({ scale }: { scale: TimeScale }) {
  const bandWidth = BAND_HOURS * scale.pxPerHour;
  const bandCount = Math.ceil(scale.totalMs / (BAND_HOURS * 60 * 60 * 1000));

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {Array.from({ length: bandCount }, (_, i) => i)
        .filter((i) => i % 2 === 1)
        .map((i) => (
          <span
            key={i}
            className="absolute inset-y-0 bg-surface-secondary/40"
            style={{ left: i * bandWidth, width: bandWidth }}
          />
        ))}
    </div>
  );
}

/** Đường dóng dọc dạng gạch đứt bám theo con trỏ, chạy suốt lên tận hàng ngày/giờ. */
function HoverGuide({ x, scale }: { x: number; scale: TimeScale }) {
  if (x < 0 || x > scale.width) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 z-20" style={{ left: x }}>
      <span className="absolute inset-y-0 left-0 border-l border-dashed border-border/30" />
      {/* `sticky` để nhãn giờ luôn dính ở mép trên khung cuộn, không trôi mất khi
          cuộn xuống các chặng phía dưới. */}
      <span className="sticky top-1 block whitespace-nowrap rounded-full bg-surface-elevated/94 px-1.5 py-0.5 text-[10px] font-semibold text-text-primary shadow-xs tnum">
        {scale.timeAt(x).format("HH:mm")}
      </span>
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
      <span className="absolute inset-y-0 left-0 w-px bg-primary/60" />
      <span
        className={`absolute top-1.5 whitespace-nowrap rounded-full bg-surface-elevated/96 px-2 py-0.5 text-[10px] font-semibold text-text-primary shadow-pop tnum ${
          align === "right" ? "right-1.5" : "left-1.5"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/** Tay cầm kéo sắp thứ tự, đặt trước tên ở cột nhãn (xem `useRowReorder`). */
function ReorderGrip({
  onPointerDown,
  label,
}: {
  onPointerDown: (event: ReactPointerEvent) => void;
  label: string;
}) {
  return (
    <span
      onPointerDown={onPointerDown}
      role="button"
      tabIndex={-1}
      aria-label={label}
      title={label}
      className="shrink-0 cursor-grab touch-none rounded text-text-muted opacity-0 transition hover:text-text-primary active:cursor-grabbing group-hover:opacity-100"
    >
      <GripVertical className="h-3.5 w-3.5" />
    </span>
  );
}

interface UnitLabelProps {
  unit: Unit;
  /** Số thứ tự hiển thị (1-based) — chính là `order_index` sau khi sắp. */
  order: number;
  color: UnitColor;
  itemCount: number;
  expanded: boolean;
  dragging: boolean;
  onReorderStart: (event: ReactPointerEvent) => void;
  onToggle: () => void;
  onView: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onDelete: () => void;
  onCreateItem: () => void;
}

function UnitLabel({
  unit,
  order,
  color,
  itemCount,
  expanded,
  dragging,
  onReorderStart,
  onToggle,
  onView,
  onEdit,
  onRemove,
  onDelete,
  onCreateItem,
}: UnitLabelProps) {
  return (
    <div
      className={`group flex items-center gap-0.5 border-b border-border/10 pl-1 pr-1 transition-colors ${
        dragging ? "bg-primary/10 ring-1 ring-inset ring-primary/20" : ""
      }`}
      style={{ height: UNIT_ROW_HEIGHT }}
    >
      <ReorderGrip onPointerDown={onReorderStart} label="Kéo để đổi thứ tự chặng" />
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 rounded p-0.5 text-text-muted transition hover:bg-surface-elevated/60 hover:text-text-primary"
        aria-label={expanded ? "Thu gọn hoạt động" : "Xem hoạt động"}
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />

      <button type="button" onClick={onView} className="min-w-0 flex-1 pl-1 text-left leading-tight">
        <p className="truncate text-[12px] font-semibold text-text-primary">
          <span className="text-text-muted tnum">{order}.</span> {unit.name}
        </p>
        <p className="truncate text-[10px] text-text-muted tnum">
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

/** Chấm màu mờ dần theo giá — cùng thang với độ đậm của thanh trên gantt. */
const ITEM_DOT_OPACITY = [0.4, 0.6, 0.8, 1];

function ItemLabel({
  item,
  color,
  order,
  maxPrice,
  group,
  dragging,
  onReorderStart,
  onView,
  onEdit,
  onDelete,
}: {
  item: Item;
  color: UnitColor;
  order: number;
  maxPrice: number;
  group: string;
  dragging: boolean;
  onReorderStart: (event: ReactPointerEvent) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      data-reorder-group={group}
      data-reorder-id={item.id}
      className={`group flex items-center gap-1 border-b border-border/10 bg-surface-secondary/38 pl-4 pr-1 transition-colors ${
        dragging ? "bg-primary/10 ring-1 ring-inset ring-primary/20" : ""
      }`}
      style={{ height: ITEM_ROW_HEIGHT }}
    >
      <ReorderGrip onPointerDown={onReorderStart} label="Kéo để đổi thứ tự hoạt động" />
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${color.dot}`}
        style={{ opacity: ITEM_DOT_OPACITY[priceShadeIndex(item.price, maxPrice)] }}
      />
      <button
        type="button"
        onClick={onView}
        className="min-w-0 flex-1 truncate text-left text-[11px] text-text-secondary"
      >
        <span className="text-text-muted tnum">{order}.</span> {item.name}
      </button>
      <span className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <IconButton size="sm" tone="brand" icon={Pencil} onClick={onEdit} aria-label="Sửa hoạt động" />
        <IconButton size="sm" tone="danger" icon={Trash2} onClick={onDelete} aria-label="Xoá hoạt động" />
      </span>
    </div>
  );
}

/**
 * Hàng cha "Chi phí khác" — KHÔNG phải 1 `unit` thật (không có id/màu/type riêng), chỉ là
 * 1 nhóm ảo gom mọi khoản chi phí đã lên lịch làm hàng con. Không có menu sửa/gỡ/xoá vì
 * bản thân nhóm này không tồn tại trong DB — chỉ chevron mở rộng.
 */
function ExpenseGroupLabel({
  count,
  scheduledCount,
  expanded,
  onToggle,
}: {
  count: number;
  scheduledCount: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex items-center gap-1 border-b border-t-2 border-border/10 border-t-border/16 bg-surface-secondary/42 px-2 pr-1"
      style={{ height: UNIT_ROW_HEIGHT }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 rounded p-0.5 text-text-muted transition hover:bg-surface-elevated/60 hover:text-text-primary"
        aria-label={expanded ? "Thu gọn chi phí khác" : "Xem chi phí khác"}
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      <Receipt className="h-3.5 w-3.5 shrink-0 text-text-muted" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-text-primary">Chi phí khác</p>
        <p className="truncate text-[11px] text-text-muted tnum">
          {scheduledCount}/{count} đã lên lịch
        </p>
      </div>
    </div>
  );
}

function ExpenseLabel({
  expense,
  color,
  onEdit,
  onDelete,
}: {
  expense: PlanExpense;
  color: UnitColor;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group flex items-center gap-1.5 border-b border-border/10 bg-surface-secondary/38 pl-8 pr-1"
      style={{ height: ITEM_ROW_HEIGHT }}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${color.dot}`} />
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 truncate text-left text-[12px] text-text-secondary"
      >
        {expense.name}
      </button>
      <span className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <IconButton size="sm" tone="brand" icon={Pencil} onClick={onEdit} aria-label="Sửa chi phí" />
        <IconButton size="sm" tone="danger" icon={Trash2} onClick={onDelete} aria-label="Xoá chi phí" />
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
  expenseParkingRef: RefObject<HTMLDivElement | null>;
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
  expenses: PlanExpense[];
  totalExpenses: number;
  expenseSearch: string;
  onExpenseSearchChange: (value: string) => void;
  isUnitDropTarget: boolean;
  isItemDropTarget: boolean;
  isExpenseDropTarget: boolean;
  colorOf: (unitId: Id) => UnitColor;
  expenseColorOf: (expenseId: Id) => UnitColor;
  onStartSchedulingUnit: (event: ReactPointerEvent, unit: Unit) => void;
  onStartSchedulingItem: (event: ReactPointerEvent, item: Item) => void;
  onStartSchedulingExpense: (event: ReactPointerEvent, expense: PlanExpense) => void;
  onEditUnit: (unit: Unit) => void;
  onEditItem: (item: Item) => void;
  onEditExpense: (expense: PlanExpense) => void;
}

function UnscheduledPanel({
  open,
  onToggle,
  unitParkingRef,
  itemParkingRef,
  expenseParkingRef,
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
  expenses,
  totalExpenses,
  expenseSearch,
  onExpenseSearchChange,
  isUnitDropTarget,
  isItemDropTarget,
  isExpenseDropTarget,
  colorOf,
  expenseColorOf,
  onStartSchedulingUnit,
  onStartSchedulingItem,
  onStartSchedulingExpense,
  onEditUnit,
  onEditItem,
  onEditExpense,
}: UnscheduledPanelProps) {
  return (
    <section className="surface overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-surface-elevated/48"
      >
        <Inbox className="h-4 w-4 text-text-muted" />
        <span className="text-[13px] font-bold text-text-primary">Chưa xếp lịch</span>
        <span className="text-xs text-text-muted tnum">
          {totalUnscheduledUnits + totalFreeUnits} chặng · {totalLibraryItems} hoạt động ·{" "}
          {totalExpenses} chi phí
        </span>
        {open ? (
          <ChevronUp className="ml-auto h-4 w-4 text-text-muted" />
        ) : (
          <ChevronDown className="ml-auto h-4 w-4 text-text-muted" />
        )}
      </button>

      {open && (
        <div className="grid gap-3 border-t border-border/10 p-3.5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border/10 sm:p-0">
          <div
            ref={unitParkingRef}
            className={`rounded-xl p-3 transition sm:rounded-none sm:p-3.5 ${
              isUnitDropTarget ? "bg-rose-50/60 ring-2 ring-inset ring-rose-300" : ""
            }`}
          >
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
              <RouteIcon className="h-3.5 w-3.5" />
              Chặng chưa xếp
            </div>
            <Input
              size="small"
              value={unitSearch}
              onChange={(e) => onUnitSearchChange(e.target.value)}
              placeholder="Tìm chặng..."
              prefix={<Search className="h-3.5 w-3.5 text-text-muted" />}
              allowClear
              className="mb-2.5"
            />
            <ScrollRevealList
              items={unscheduledUnits}
              keyOf={(u) => u.id}
              resetKey={unitSearch}
              emptyHint="Mọi chặng đều đã có giờ."
              renderItem={(unit) => {
                const stats = unitStats(itemsByUnit.get(unit.id) ?? [], unit.break_minutes);
                return (
                  <UnscheduledUnitCard
                    unit={unit}
                    color={colorOf(unit.id)}
                    itemCount={stats.itemCount}
                    cost={stats.cost}
                    onPointerDown={(event) => onStartSchedulingUnit(event, unit)}
                    onEdit={() => onEditUnit(unit)}
                  />
                );
              }}
            />

            {freeUnits.length > 0 && (
              <>
                <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Chặng chưa gắn kế hoạch nào ({freeUnits.length})
                </p>
                <ScrollRevealList
                  items={freeUnits}
                  keyOf={(u) => u.id}
                  resetKey={unitSearch}
                  emptyHint="Không có chặng nào."
                  renderItem={(unit) => {
                    const stats = unitStats(itemsByUnit.get(unit.id) ?? [], unit.break_minutes);
                    return (
                      <UnscheduledUnitCard
                        unit={unit}
                        itemCount={stats.itemCount}
                        cost={stats.cost}
                        onPointerDown={(event) => onStartSchedulingUnit(event, unit)}
                        onEdit={() => onEditUnit(unit)}
                      />
                    );
                  }}
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
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
              <Sparkles className="h-3.5 w-3.5" />
              Hoạt động chưa gắn chặng
            </div>
            <Input
              size="small"
              value={itemSearch}
              onChange={(e) => onItemSearchChange(e.target.value)}
              placeholder="Tìm hoạt động..."
              prefix={<Search className="h-3.5 w-3.5 text-text-muted" />}
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

          <div
            ref={expenseParkingRef}
            className={`rounded-xl p-3 transition sm:rounded-none sm:p-3.5 ${
              isExpenseDropTarget ? "bg-rose-50/60 ring-2 ring-inset ring-rose-300" : ""
            }`}
          >
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
              <Receipt className="h-3.5 w-3.5" />
              Chi phí chưa xếp lịch
            </div>
            <Input
              size="small"
              value={expenseSearch}
              onChange={(e) => onExpenseSearchChange(e.target.value)}
              placeholder="Tìm chi phí..."
              prefix={<Search className="h-3.5 w-3.5 text-text-muted" />}
              allowClear
              className="mb-2.5"
            />
            <ScrollRevealList
              items={expenses}
              keyOf={(e) => e.id}
              resetKey={expenseSearch}
              emptyHint="Mọi chi phí đều đã có giờ (hoặc chưa có khoản nào)."
              renderItem={(expense) => (
                <UnscheduledExpenseCard
                  expense={expense}
                  color={expenseColorOf(expense.id)}
                  onPointerDown={(event) => onStartSchedulingExpense(event, expense)}
                  onEdit={() => onEditExpense(expense)}
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
      <p className="rounded-xl border border-dashed border-border/18 bg-surface-secondary/46 py-6 text-center text-[11px] text-text-muted">
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
        <div ref={sentinelRef} className="py-1 text-center text-[10px] text-text-muted">
          Cuộn để xem thêm…
        </div>
      )}
    </div>
  );
}

/** Số tiền gọn, đặt cạnh tên thay vì 1 Badge riêng — đỡ chiếm chỗ trên thẻ nhỏ của panel. */
function InlineCost({ value }: { value: number | string | null | undefined }) {
  if (value == null || Number(value) <= 0) return null;
  return (
    <span className="shrink-0 text-[11px] font-semibold text-emerald-600 tnum">
      {formatPriceShort(value)}
    </span>
  );
}

interface UnscheduledUnitCardProps {
  unit: Unit;
  /** Không truyền = chặng chưa gắn kế hoạch nào, chưa có màu theo `planUnits`. */
  color?: UnitColor;
  itemCount: number;
  cost: number;
  onPointerDown: (event: ReactPointerEvent) => void;
  onEdit: () => void;
}

function UnscheduledUnitCard({ unit, color, itemCount, cost, onPointerDown, onEdit }: UnscheduledUnitCardProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="group cursor-grab touch-none rounded-xl border border-border/12 bg-surface-elevated/84 p-2.5 shadow-xs transition hover:bg-surface-elevated active:cursor-grabbing"
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${color?.dot ?? "bg-surface-elevated"}`} />
        <div className="flex min-w-0 flex-1 items-baseline justify-between gap-1.5">
          <p className="min-w-0 truncate text-[12px] font-semibold leading-snug text-text-primary">{unit.name}</p>
          <InlineCost value={cost} />
        </div>
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
      className="group cursor-grab touch-none rounded-xl border border-border/12 bg-surface-elevated/84 p-2.5 shadow-xs transition hover:bg-surface-elevated active:cursor-grabbing"
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
        <div className="flex min-w-0 flex-1 items-baseline justify-between gap-1.5">
          <p className="min-w-0 truncate text-[12px] font-semibold leading-snug text-text-primary">{item.name}</p>
          <InlineCost value={item.price} />
        </div>
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
        {item.locations?.length > 0 && (
          <Badge size="sm" numeric>
            {item.locations.length} địa điểm
          </Badge>
        )}
      </div>
    </div>
  );
}

interface UnscheduledExpenseCardProps {
  expense: PlanExpense;
  color: UnitColor;
  onPointerDown: (event: ReactPointerEvent) => void;
  onEdit: () => void;
}

function UnscheduledExpenseCard({ expense, color, onPointerDown, onEdit }: UnscheduledExpenseCardProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="group cursor-grab touch-none rounded-xl border border-border/12 bg-surface-elevated/84 p-2.5 shadow-xs transition hover:bg-surface-elevated active:cursor-grabbing"
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${color.dot}`} />
        <div className="flex min-w-0 flex-1 items-baseline justify-between gap-1.5">
          <p className="min-w-0 truncate text-[12px] font-semibold leading-snug text-text-primary">{expense.name}</p>
          <InlineCost value={expense.price} />
        </div>
        <IconButton
          size="sm"
          tone="brand"
          icon={Pencil}
          onClick={onEdit}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="Sửa chi phí"
          className="opacity-0 transition group-hover:opacity-100"
        />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-5">
        {expense.location && (
          <Badge size="sm" numeric>
            {expense.location.name}
          </Badge>
        )}
      </div>
    </div>
  );
}
