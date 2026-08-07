import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Segmented } from "antd";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import {
  Inbox,
  Plus,
  Route as RouteIcon,
  Search,
  Sparkles,
  Wallet,
} from "lucide-react";
import Badge from "../../shared/components/Badge";
import Button from "../../shared/components/Button";
import Input from "../../shared/components/Input";
import { LIBRARY_LANE } from "../../shared/constants/board";
import { formatPrice } from "../../shared/utils/format";
import { planTotals } from "../../shared/utils/planStats";
import type { Id, Item, Unit } from "../../shared/types/models";
import BoardLane, { LANE_SORT_PREFIX, type MoveTarget } from "./BoardLane";
import { BoardItemPreview } from "./BoardItemCard";
import { unitColor } from "./timeline/colors";

/**
 * 2 chế độ kéo, chọn bằng `Segmented` ở đầu board. Tách hẳn ra thay vì cho kéo lẫn lộn
 * vì 2 thao tác này cần 2 kiểu va chạm khác nhau (lane xếp NGANG, hoạt động xếp DỌC
 * trong lane) — trộn chung thì dnd-kit hay chọn nhầm đích, và cầm nhầm thứ mình muốn kéo.
 * Ở chế độ nào thì CHỈ loại tương ứng được đăng ký với dnd-kit.
 */
type BoardMode = "unit" | "item";

interface Lane {
  id: Id;
  unit?: Unit;
  items: Item[];
  isLibrary?: boolean;
}

export interface PlanBoardProps {
  planUnits: Unit[];
  itemsByUnit: Map<Id, Item[]>;
  libraryItems: Item[];
  freeUnits: Unit[];
  hasLocations: boolean;
  onMoveItem: (itemId: Id, toLane: Id, toIndex: number | null) => void;
  /** Ghi lại `order_index` cho toàn bộ chặng của kế hoạch theo đúng thứ tự truyền vào. */
  onReorderUnits: (unitIds: Id[]) => void;
  onAddUnit: (unitId: Id) => void;
  onQuickCreateUnit: (name: string) => Promise<void>;
  onRemoveUnit: (unitId: Id) => void;
  onEditUnit: (unit: Unit) => void;
  onDeleteUnit: (unitId: Id) => void;
  onCreateUnit: () => void;
  onCreateItem: (unitId: Id | null) => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (itemId: Id) => void;
}

export default function PlanBoard({
  planUnits,
  itemsByUnit,
  libraryItems,
  freeUnits,
  hasLocations,
  onMoveItem,
  onReorderUnits,
  onAddUnit,
  onQuickCreateUnit,
  onRemoveUnit,
  onEditUnit,
  onDeleteUnit,
  onCreateUnit,
  onCreateItem,
  onEditItem,
  onDeleteItem,
}: PlanBoardProps) {
  const [mode, setMode] = useState<BoardMode>("unit");
  const [activeId, setActiveId] = useState<Id | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const totals = useMemo(() => planTotals(planUnits, itemsByUnit), [planUnits, itemsByUnit]);

  const filteredLibrary = useMemo(() => {
    const keyword = librarySearch.trim().toLowerCase();
    if (!keyword) return libraryItems;
    return libraryItems.filter((i) => i.name.toLowerCase().includes(keyword));
  }, [libraryItems, librarySearch]);

  // Lane 0 luôn là kho hoạt động, các lane sau là chặng theo đúng thứ tự trong kế hoạch.
  const lanes = useMemo<Lane[]>(
    () => [
      { id: LIBRARY_LANE, isLibrary: true, items: filteredLibrary },
      ...planUnits.map((unit) => ({ id: unit.id, unit, items: itemsByUnit.get(unit.id) ?? [] })),
    ],
    [filteredLibrary, planUnits, itemsByUnit]
  );

  // Danh sách đích cho nút "Chuyển tới…" trên từng thẻ hoạt động — cách đổi chặng KHÔNG
  // cần kéo (kéo ngang qua chục lane rất cực), luôn dùng được ở cả 2 chế độ.
  const moveTargets = useMemo<MoveTarget[]>(
    () => [
      { id: LIBRARY_LANE, name: "Kho hoạt động", isLibrary: true },
      ...planUnits.map((unit, index) => ({ id: unit.id, name: `${index + 1}. ${unit.name}` })),
    ],
    [planUnits]
  );

  const laneSortIds = useMemo(() => planUnits.map((u) => LANE_SORT_PREFIX + u.id), [planUnits]);

  const activeItem = useMemo(() => {
    if (!activeId || activeId.startsWith(LANE_SORT_PREFIX)) return null;
    for (const lane of lanes) {
      const found = lane.items.find((i) => i.id === activeId);
      if (found) return found;
    }
    return null;
  }, [lanes, activeId]);

  const activeUnit = useMemo(() => {
    if (!activeId?.startsWith(LANE_SORT_PREFIX)) return null;
    const unitId = activeId.slice(LANE_SORT_PREFIX.length);
    return planUnits.find((u) => u.id === unitId) ?? null;
  }, [activeId, planUnits]);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeKey = String(active.id);
    if (activeKey.startsWith(LANE_SORT_PREFIX)) {
      const ids = laneSortIds.slice();
      const from = ids.indexOf(activeKey);
      const to = ids.indexOf(String(over.id));
      if (from === -1 || to === -1) return;
      const [moved] = ids.splice(from, 1);
      if (!moved) return;
      ids.splice(to, 0, moved);
      onReorderUnits(ids.map((id) => id.slice(LANE_SORT_PREFIX.length)));
      return;
    }

    const overData = over.data.current as { type?: string; laneId?: Id } | undefined;
    const toLane = overData?.type === "item" ? overData.laneId : (overData?.laneId ?? String(over.id));
    if (!toLane) return;

    // Thả lên 1 thẻ trong lane chặng thì chèn đúng vị trí thẻ đó; thả vào vùng trống
    // của lane (hoặc thả vào kho — kho không có thứ tự riêng) thì thêm vào cuối.
    if (overData?.type === "item" && toLane !== LIBRARY_LANE) {
      const lane = lanes.find((l) => l.id === toLane);
      const toIndex = lane?.items.findIndex((i) => i.id === over.id) ?? -1;
      onMoveItem(activeKey, toLane, toIndex === -1 ? null : toIndex);
      return;
    }
    onMoveItem(activeKey, toLane, null);
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<BoardMode>
            value={mode}
            onChange={setMode}
            options={[
              {
                value: "unit",
                label: (
                  <span className="flex items-center gap-1.5 px-1 font-medium">
                    <RouteIcon className="h-3.5 w-3.5" />
                    Sắp chặng
                  </span>
                ),
              },
              {
                value: "item",
                label: (
                  <span className="flex items-center gap-1.5 px-1 font-medium">
                    <Sparkles className="h-3.5 w-3.5" />
                    Sắp hoạt động
                  </span>
                ),
              },
            ]}
          />
          <Badge tone="brand" icon={RouteIcon} numeric>
            {totals.unitCount} chặng
          </Badge>
          <Badge tone="violet" icon={Sparkles} numeric>
            {totals.itemCount} hoạt động
          </Badge>
          {totals.cost > 0 && (
            <Badge tone="emerald" icon={Wallet} numeric>
              {formatPrice(totals.cost)}
            </Badge>
          )}
        </div>

        <Button icon={<Plus className="h-4 w-4" />} onClick={onCreateUnit}>
          Chặng mới (chi tiết)
        </Button>
      </div>

      <p className="mb-3 text-xs text-text-muted">
        {mode === "unit"
          ? "Kéo tay cầm ở đầu mỗi chặng để đổi thứ tự. Hoạt động đang khoá — đổi chặng cho nó bằng nút “Chuyển tới…” trên từng thẻ."
          : "Kéo hoạt động giữa các chặng hoặc lên xuống trong 1 chặng để sắp thứ tự. Chặng đang khoá, quay lại “Sắp chặng” để đổi thứ tự chặng."}
      </p>

      {!hasLocations && (
        <p className="mb-4 rounded-2xl bg-warning/12 px-3.5 py-2.5 text-xs text-warning shadow-xs ring-1 ring-inset ring-warning/16">
          Chưa có địa điểm nào — hoạt động tạo ở đây sẽ chưa gắn địa điểm. Thêm địa điểm ở trang Địa
          điểm rồi sửa lại hoạt động khi cần.
        </p>
      )}

      <DndContext
        sensors={sensors}
        // Lane xếp ngang -> so tâm là đủ và ổn định; hoạt động xếp dọc trong lane hẹp ->
        // closestCorners bám mép tốt hơn khi thả gần đầu/cuối danh sách.
        collisionDetection={mode === "unit" ? closestCenter : closestCorners}
        // Đo lại vùng thả LIÊN TỤC thay vì chỉ 1 lần lúc bắt đầu kéo: board vừa cuộn ngang
        // (cả dải lane) vừa cuộn dọc (bên trong từng lane), nên rect đo 1 lần sẽ cũ ngay
        // khi vừa cuộn — đó là lúc thả bị "lệch" vào nhầm lane/nhầm vị trí.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={handleDragEnd}
      >
        <div className="scroll-thin flex items-start gap-3 overflow-x-auto pb-4">
          <SortableContext items={laneSortIds} strategy={horizontalListSortingStrategy}>
            {lanes.map((lane, laneIndex) => (
              <BoardLane
                key={lane.id}
                laneId={lane.id}
                unit={lane.unit}
                index={laneIndex - 1} // lane 0 là kho nên chặng đầu tiên có index 0
                items={lane.items}
                isLibrary={lane.isLibrary}
                mode={mode}
                color={lane.isLibrary ? undefined : unitColor(laneIndex - 1)}
                moveTargets={moveTargets}
                onMoveItemTo={(itemId, toLane) => onMoveItem(itemId, toLane, null)}
                onEditUnit={onEditUnit}
                onRemoveUnit={onRemoveUnit}
                onDeleteUnit={onDeleteUnit}
                onCreateItem={onCreateItem}
                onEditItem={onEditItem}
                onDeleteItem={onDeleteItem}
                header={
                  lane.isLibrary ? (
                    <Input
                      size="small"
                      value={librarySearch}
                      onChange={(e) => setLibrarySearch(e.target.value)}
                      placeholder="Tìm hoạt động..."
                      prefix={<Search className="h-3.5 w-3.5 text-text-muted" />}
                      allowClear
                    />
                  ) : null
                }
              />
            ))}
          </SortableContext>

          <AddUnitLane
            freeUnits={freeUnits}
            onAddUnit={onAddUnit}
            onQuickCreateUnit={onQuickCreateUnit}
          />
        </div>

        {/*
          Portal ra thẳng `document.body`: `DragOverlay` định vị bằng `position: fixed`, mà
          bọc ngoài board có `animate-fade-up` — animation này kết thúc ở `translateY(0)` với
          `fill-mode: both`, tức transform VẪN còn (khác `none`) sau khi chạy xong. Một
          transform bất kỳ tạo ra containing block mới cho con `fixed`, nên overlay bị tính
          toạ độ theo cái div đó thay vì theo viewport -> thẻ đang kéo lệch hẳn khỏi con trỏ.
        */}
        {createPortal(
          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
            {activeItem && <BoardItemPreview item={activeItem} />}
            {activeUnit && (
              <div className="w-[232px] rotate-1 cursor-grabbing rounded-2xl border border-primary/16 bg-surface-elevated/96 px-3 py-2.5 shadow-pop backdrop-blur-sm">
                <p className="truncate text-[13px] font-bold text-text-primary">{activeUnit.name}</p>
                <p className="mt-0.5 text-[11px] text-text-muted tnum">
                  {(itemsByUnit.get(activeUnit.id) ?? []).length} hoạt động
                </p>
              </div>
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  );
}

interface AddUnitLaneProps {
  freeUnits: Unit[];
  onAddUnit: (unitId: Id) => void;
  onQuickCreateUnit: (name: string) => Promise<void>;
}

function AddUnitLane({ freeUnits, onAddUnit, onQuickCreateUnit }: AddUnitLaneProps) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    await onQuickCreateUnit(trimmed);
    setCreating(false);
    setName("");
  }

  return (
    <section className="flex max-h-[calc(100vh-15rem)] w-[248px] shrink-0 flex-col rounded-2xl border border-dashed border-border/16 bg-surface-secondary/56 p-3 shadow-card">
      <h3 className="text-[13px] font-bold text-text-primary">Thêm chặng</h3>
      <p className="mt-0.5 text-[11px] leading-relaxed text-text-muted">
        Nhập tên để tạo nhanh, hoặc chọn một chặng đã có sẵn.
      </p>

      <div className="mt-3 flex gap-1.5">
        <Input
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onPressEnter={submit}
          placeholder="VD: Ngày 3 - Đà Lạt"
        />
        <Button
          size="small"
          variant="primary"
          loading={creating}
          onClick={submit}
          icon={<Plus className="h-3.5 w-3.5" />}
          aria-label="Tạo chặng"
        />
      </div>

      {freeUnits.length > 0 && (
        <>
          <p className="mt-4 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Chặng chưa gắn kế hoạch ({freeUnits.length})
          </p>
          <div className="scroll-thin mt-2 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
            {freeUnits.map((unit) => (
              <button
                key={unit.id}
                type="button"
                onClick={() => onAddUnit(unit.id)}
                className="flex w-full items-center gap-2 rounded-xl border border-border/12 bg-surface-elevated/82 px-2.5 py-2 text-left transition hover:bg-surface-elevated hover:shadow-xs"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-secondary/88 text-text-secondary">
                  <Inbox className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-text-primary">
                  {unit.name}
                </span>
                <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
