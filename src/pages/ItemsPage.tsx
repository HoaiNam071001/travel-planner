import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Sparkles, Plus, Search } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  reorderItems,
  type ItemInput,
} from "../services/items.service";
import { listLocations } from "../services/locations.service";
import { listUnits } from "../services/units.service";
import Button from "../shared/components/Button";
import EmptyState from "../shared/components/EmptyState";
import Input from "../shared/components/Input";
import PageHeader from "../shared/components/PageHeader";
import ItemCard from "../components/ItemCard";
import ItemFormModal from "../components/ItemFormModal";
import ItemDetailModal from "../components/ItemDetailModal";
import type { Id, Item, LocationRow, Unit } from "../shared/types/models";

// Bộ lọc theo trạng thái gắn chặng — trả lời nhanh câu "hoạt động nào còn chưa xếp?".
const UNASSIGNED = "unassigned";
const ALL = "all";

interface FormModalState {
  open: boolean;
  mode: "create" | "edit";
  item: Item | null;
  cloneFrom: Item | null;
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState<string>(ALL);
  const [formModal, setFormModal] = useState<FormModalState>({
    open: false,
    mode: "create",
    item: null,
    cloneFrom: null,
  });
  const [detailItem, setDetailItem] = useState<Item | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [itemsRes, locationsRes, unitsRes] = await Promise.all([
      listItems(),
      listLocations(),
      listUnits(),
    ]);

    if (itemsRes.error) {
      setError("Không tải được danh sách hoạt động: " + itemsRes.error.message);
    } else {
      setItems(itemsRes.data ?? []);
    }
    setLocations(locationsRes.data ?? []);
    setUnits(unitsRes.data ?? []);
    setLoading(false);
  }

  const unitNameById = useMemo(
    () => new Map(units.map((u) => [u.id, u.name] as const)),
    [units]
  );
  const unassignedCount = useMemo(() => items.filter((i) => !i.unit_id).length, [items]);

  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return items.filter((item) => {
      if (unitFilter === UNASSIGNED && item.unit_id) return false;
      if (unitFilter !== ALL && unitFilter !== UNASSIGNED && item.unit_id !== unitFilter) {
        return false;
      }
      return !keyword || item.name.toLowerCase().includes(keyword);
    });
  }, [items, search, unitFilter]);

  // Kéo-thả chỉ sắp xếp được khi đang xem toàn bộ danh sách: khi lọc/tìm kiếm thì
  // thứ tự hiển thị không phải thứ tự thật nên lưu lại sẽ sai.
  const canReorder = unitFilter === ALL && !search.trim();

  function openCreateModal() {
    setFormModal({ open: true, mode: "create", item: null, cloneFrom: null });
  }

  function openEditModal(item: Item) {
    setDetailItem(null);
    setFormModal({ open: true, mode: "edit", item, cloneFrom: null });
  }

  // Nhân bản: mở modal TẠO MỚI với field mồi từ hoạt động gốc (kể cả địa điểm — không
  // độc quyền như chặng, mang theo không "cướp" của hoạt động gốc).
  function openCloneModal(item: Item) {
    setDetailItem(null);
    setFormModal({ open: true, mode: "create", item: null, cloneFrom: item });
  }

  function closeFormModal() {
    setFormModal((prev) => ({ ...prev, open: false }));
  }

  async function handleDelete(id: Id) {
    const { error: deleteError } = await deleteItem(id);
    if (deleteError) {
      setError("Không xoá được hoạt động: " + deleteError.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (detailItem?.id === id) setDetailItem(null);
  }

  async function handleFormSubmit(values: ItemInput) {
    if (formModal.mode === "edit" && formModal.item) {
      const { data, error: updateError } = await updateItem(formModal.item.id, values);
      if (updateError || !data) {
        return { error: "Không lưu được thay đổi: " + (updateError?.message ?? "") };
      }
      setItems((prev) => prev.map((i) => (i.id === data.id ? { ...i, ...data } : i)));
    } else {
      const { data, error: insertError } = await createItem(values);
      if (insertError || !data) {
        return { error: "Không thêm được hoạt động: " + (insertError?.message ?? "") };
      }
      setItems((prev) => [...prev, data]);
    }
    closeFormModal();
    return {};
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const next = arrayMove(prev, oldIndex, newIndex);
      void reorderItems(next.map((i) => i.id)).then(({ error: reorderError }) => {
        if (reorderError) setError("Không lưu được thứ tự: " + reorderError.message);
      });
      return next;
    });
  }

  const grid = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleItems.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          unitName={item.unit_id ? unitNameById.get(item.unit_id) : null}
          onOpenDetail={setDetailItem}
          onEdit={openEditModal}
          onClone={openCloneModal}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <PageHeader
        icon={Sparkles}
        title="Hoạt động"
        subtitle="Việc cần làm, gắn với địa điểm + giá + khung giờ bắt đầu/kết thúc"
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            Thêm hoạt động
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={unitFilter === ALL} onClick={() => setUnitFilter(ALL)}>
            Tất cả ({items.length})
          </FilterChip>
          <FilterChip active={unitFilter === UNASSIGNED} onClick={() => setUnitFilter(UNASSIGNED)}>
            Chưa gắn chặng ({unassignedCount})
          </FilterChip>
          {units.map((unit) => (
            <FilterChip
              key={unit.id}
              active={unitFilter === unit.id}
              onClick={() => setUnitFilter(unitFilter === unit.id ? ALL : unit.id)}
            >
              {unit.name}
            </FilterChip>
          ))}

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm hoạt động..."
            prefix={<Search className="h-3.5 w-3.5 text-slate-400" />}
            allowClear
            className="ml-auto"
            style={{ width: 210 }}
          />
        </div>
      </PageHeader>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
          {error}
        </p>
      )}

      {!loading && locations.length === 0 && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
          Chưa có địa điểm nào. Thêm địa điểm ở trang Địa điểm để gắn vào hoạt động.
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-200/50" />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={items.length === 0 ? "Chưa có hoạt động nào" : "Không có hoạt động nào khớp"}
          hint={
            items.length === 0
              ? "Hoạt động là một việc cụ thể trong chuyến đi — ăn trưa, tham quan, di chuyển..."
              : "Thử bỏ bộ lọc hoặc xoá từ khoá tìm kiếm."
          }
          action={
            items.length === 0 && (
              <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
                Thêm hoạt động
              </Button>
            )
          }
        />
      ) : canReorder ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleItems.map((i) => i.id)} strategy={rectSortingStrategy}>
            {grid}
          </SortableContext>
        </DndContext>
      ) : (
        grid
      )}

      <ItemFormModal
        open={formModal.open}
        mode={formModal.mode}
        item={formModal.item}
        cloneFrom={formModal.cloneFrom}
        locations={locations}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
      />

      <ItemDetailModal
        open={!!detailItem}
        item={detailItem}
        unitName={detailItem?.unit_id ? unitNameById.get(detailItem.unit_id) : null}
        onClose={() => setDetailItem(null)}
        onEdit={openEditModal}
        onClone={openCloneModal}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`max-w-[190px] truncate rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition ${
        active
          ? "bg-brand-600 text-white ring-brand-600"
          : "bg-white text-slate-600 ring-slate-200 hover:ring-brand-300"
      }`}
    >
      {children}
    </button>
  );
}
