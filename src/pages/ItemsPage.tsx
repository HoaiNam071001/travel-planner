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
import { useTranslation } from "../i18n/useAppTranslation";
import type { Id, Item, LocationRow, Unit } from "../shared/types/models";
import Button from "../shared/components/Button";
import EmptyState from "../shared/components/EmptyState";
import Input from "../shared/components/Input";
import PageHeader from "../shared/components/PageHeader";
import ItemCard from "../components/ItemCard";
import ItemFormModal from "../components/ItemFormModal";
import ItemDetailModal from "../components/ItemDetailModal";

const UNASSIGNED = "unassigned";
const ALL = "all";

interface FormModalState {
  open: boolean;
  mode: "create" | "edit";
  item: Item | null;
  cloneFrom: Item | null;
}

export default function ItemsPage() {
  const { t } = useTranslation(["items", "common"]);
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
      setError(t("items:errors.load", { message: itemsRes.error.message }));
    } else {
      setItems(itemsRes.data ?? []);
      setError("");
    }
    setLocations(locationsRes.data ?? []);
    setUnits(unitsRes.data ?? []);
    setLoading(false);
  }

  const unitNameById = useMemo(() => new Map(units.map((u) => [u.id, u.name] as const)), [units]);
  const unassignedCount = useMemo(() => items.filter((i) => !i.unit_id).length, [items]);

  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return items.filter((item) => {
      if (unitFilter === UNASSIGNED && item.unit_id) return false;
      if (unitFilter !== ALL && unitFilter !== UNASSIGNED && item.unit_id !== unitFilter) return false;
      return !keyword || item.name.toLowerCase().includes(keyword);
    });
  }, [items, search, unitFilter]);

  const canReorder = unitFilter === ALL && !search.trim();

  function openCreateModal() {
    setFormModal({ open: true, mode: "create", item: null, cloneFrom: null });
  }

  function openEditModal(item: Item) {
    setDetailItem(null);
    setFormModal({ open: true, mode: "edit", item, cloneFrom: null });
  }

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
      setError(t("items:errors.delete", { message: deleteError.message }));
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (detailItem?.id === id) setDetailItem(null);
  }

  async function handleFormSubmit(values: ItemInput) {
    if (formModal.mode === "edit" && formModal.item) {
      const { data, error: updateError } = await updateItem(formModal.item.id, values);
      if (updateError || !data) {
        return { error: t("items:errors.save", { message: updateError?.message ?? "" }) };
      }
      setItems((prev) => prev.map((i) => (i.id === data.id ? { ...i, ...data } : i)));
    } else {
      const { data, error: insertError } = await createItem(values);
      if (insertError || !data) {
        return { error: t("items:errors.create", { message: insertError?.message ?? "" }) };
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
        if (reorderError) setError(t("items:errors.reorder", { message: reorderError.message }));
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
    <div className="mx-auto max-w-6xl pb-10">
      <PageHeader
        icon={Sparkles}
        title={t("items:title")}
        subtitle={t("items:subtitle")}
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            {t("items:create")}
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={unitFilter === ALL} onClick={() => setUnitFilter(ALL)}>
            {t("items:filters.all", { count: items.length })}
          </FilterChip>
          <FilterChip active={unitFilter === UNASSIGNED} onClick={() => setUnitFilter(UNASSIGNED)}>
            {t("items:filters.unassigned", { count: unassignedCount })}
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
            placeholder={t("items:searchPlaceholder")}
            prefix={<Search className="h-3.5 w-3.5 text-text-muted" />}
            allowClear
            className="ml-auto"
            style={{ width: 210 }}
          />
        </div>
      </PageHeader>

      {error && <p className="mb-4 rounded-xl bg-danger/10 px-3.5 py-2.5 text-xs text-danger">{error}</p>}

      {!loading && locations.length === 0 && (
        <p className="mb-4 rounded-xl bg-warning/10 px-3.5 py-2.5 text-xs text-warning">
          {t("items:warnings.missingLocations")}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface-soft h-48 animate-pulse" />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={items.length === 0 ? t("items:empty.defaultTitle") : t("items:empty.filteredTitle")}
          hint={items.length === 0 ? t("items:empty.defaultHint") : t("items:empty.filteredHint")}
          action={
            items.length === 0 && (
              <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
                {t("items:create")}
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
      className={`max-w-[190px] truncate rounded-xl px-3 py-1.5 text-xs font-medium transition ${
        active ? "gradient-brand text-white shadow-xs" : "bg-surface-elevated text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}
