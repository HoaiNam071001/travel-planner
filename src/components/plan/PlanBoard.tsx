import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus, Route as RouteIcon, Search, Sparkles, Wallet } from "lucide-react";
import Badge from "../../shared/components/Badge";
import Button from "../../shared/components/Button";
import Input from "../../shared/components/Input";
import { LIBRARY_LANE } from "../../shared/constants/board";
import { formatPrice } from "../../shared/utils/format";
import { planTotals } from "../../shared/utils/planStats";
import type { Id, Item, Unit } from "../../shared/types/models";
import BoardLane from "./BoardLane";
import { BoardItemPreview } from "./BoardItemCard";
import { unitColor } from "./timeline/colors";

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
  onMoveUnit: (unitId: Id, direction: -1 | 1) => void;
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
  onMoveUnit,
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

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    for (const lane of lanes) {
      const found = lane.items.find((i) => i.id === activeId);
      if (found) return found;
    }
    return null;
  }, [lanes, activeId]);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;

    const overData = over.data.current as { type?: string; laneId?: Id } | undefined;
    const toLane = overData?.type === "item" ? overData.laneId : (overData?.laneId ?? String(over.id));
    if (!toLane) return;

    // Thả lên 1 thẻ trong lane chặng thì chèn đúng vị trí thẻ đó; thả vào vùng trống
    // của lane (hoặc thả vào kho — kho không có thứ tự riêng) thì thêm vào cuối.
    if (overData?.type === "item" && toLane !== LIBRARY_LANE) {
      const lane = lanes.find((l) => l.id === toLane);
      const toIndex = lane?.items.findIndex((i) => i.id === over.id) ?? -1;
      onMoveItem(String(active.id), toLane, toIndex === -1 ? null : toIndex);
      return;
    }
    onMoveItem(String(active.id), toLane, null);
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
          <span className="hidden text-xs text-slate-400 lg:block">
            Kéo hoạt động giữa các chặng để sắp xếp lịch trình.
          </span>
        </div>

        <Button icon={<Plus className="h-4 w-4" />} onClick={onCreateUnit}>
          Chặng mới (chi tiết)
        </Button>
      </div>

      {!hasLocations && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
          Chưa có địa điểm nào — hoạt động tạo ở đây sẽ chưa gắn địa điểm. Thêm địa điểm ở trang Địa
          điểm rồi sửa lại hoạt động khi cần.
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={handleDragEnd}
      >
        <div className="scroll-thin flex gap-4 overflow-x-auto pb-4">
          {lanes.map((lane, laneIndex) => (
            <BoardLane
              key={lane.id}
              laneId={lane.id}
              unit={lane.unit}
              index={laneIndex - 1} // lane 0 là kho nên chặng đầu tiên có index 0
              items={lane.items}
              isLibrary={lane.isLibrary}
              color={lane.isLibrary ? undefined : unitColor(laneIndex - 1)}
              canMoveLeft={!lane.isLibrary && laneIndex > 1}
              canMoveRight={!lane.isLibrary && laneIndex < lanes.length - 1}
              onMoveUnit={onMoveUnit}
              onEditUnit={onEditUnit}
              onRemoveUnit={onRemoveUnit}
              onDeleteUnit={onDeleteUnit}
              onCreateItem={onCreateItem}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
              onSendItemToLibrary={(itemId) => onMoveItem(itemId, LIBRARY_LANE, null)}
              header={
                lane.isLibrary ? (
                  <Input
                    size="small"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Tìm hoạt động..."
                    prefix={<Search className="h-3.5 w-3.5 text-slate-400" />}
                    allowClear
                  />
                ) : null
              }
            />
          ))}

          <AddUnitLane
            freeUnits={freeUnits}
            onAddUnit={onAddUnit}
            onQuickCreateUnit={onQuickCreateUnit}
          />
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
          {activeItem && <BoardItemPreview item={activeItem} />}
        </DragOverlay>
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
    <section className="flex max-h-[calc(100vh-15rem)] w-[292px] shrink-0 flex-col rounded-2xl border border-dashed border-slate-300 bg-white/40 p-3">
      <h3 className="text-[13px] font-bold text-slate-600">Thêm chặng</h3>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
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
          <p className="mt-4 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Chặng chưa gắn kế hoạch ({freeUnits.length})
          </p>
          <div className="scroll-thin mt-2 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
            {freeUnits.map((unit) => (
              <button
                key={unit.id}
                type="button"
                onClick={() => onAddUnit(unit.id)}
                className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                  <RouteIcon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
                  {unit.name}
                </span>
                <Plus className="h-3.5 w-3.5 shrink-0 text-brand-600" />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
