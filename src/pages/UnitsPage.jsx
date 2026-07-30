import { useEffect, useState } from "react";
import { Route, Plus } from "lucide-react";
import { listUnits, createUnit, updateUnit, deleteUnit } from "../services/units.service";
import { listItems } from "../services/items.service";
import { listUnitTypes, createUnitType, deleteUnitType } from "../services/unitTypes.service";
import Button from "../shared/components/Button";
import UnitCard from "../components/UnitCard";
import UnitFormModal from "../components/UnitFormModal";
import UnitDetailModal from "../components/UnitDetailModal";
import UnitTypeFilterBar from "../components/UnitTypeFilterBar";

function itemsForUnit(items, unitId) {
  return items
    .filter((i) => i.unit_id === unitId)
    .slice()
    .sort((a, b) => a.order_index - b.order_index);
}

export default function UnitsPage() {
  const [units, setUnits] = useState([]);
  const [items, setItems] = useState([]);
  const [unitTypes, setUnitTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formModal, setFormModal] = useState({
    open: false,
    mode: "create",
    unit: null,
    initialItemIds: [],
    previousItemIds: [],
  });
  const [detailUnit, setDetailUnit] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [unitsRes, itemsRes, typesRes] = await Promise.all([
      listUnits(),
      listItems(),
      listUnitTypes(),
    ]);

    if (unitsRes.error) {
      setError("Không tải được danh sách chặng: " + unitsRes.error.message);
    } else {
      setUnits(unitsRes.data ?? []);
    }
    setItems(itemsRes.data ?? []);
    setUnitTypes(typesRes.data ?? []);
    setLoading(false);
  }

  function openCreateModal() {
    setFormModal({ open: true, mode: "create", unit: null, initialItemIds: [], previousItemIds: [] });
  }

  function openEditModal(unit) {
    setDetailUnit(null);
    const currentItemIds = itemsForUnit(items, unit.id).map((i) => i.id);
    setFormModal({
      open: true,
      mode: "edit",
      unit,
      initialItemIds: currentItemIds,
      previousItemIds: currentItemIds,
    });
  }

  function closeFormModal() {
    setFormModal((prev) => ({ ...prev, open: false }));
  }

  async function handleDelete(id) {
    const { error: deleteError } = await deleteUnit(id);
    if (deleteError) {
      setError("Không xoá được chặng: " + deleteError.message);
      return;
    }
    if (detailUnit?.id === id) setDetailUnit(null);
    await loadData();
  }

  async function handleFormSubmit(values) {
    const result =
      formModal.mode === "edit"
        ? await updateUnit(formModal.unit.id, values, formModal.previousItemIds)
        : await createUnit(values);

    if (result.error) {
      return {
        error:
          (formModal.mode === "edit" ? "Không lưu được thay đổi: " : "Không thêm được chặng: ") +
          result.error.message,
      };
    }

    closeFormModal();
    await loadData();
    return {};
  }

  async function handleCreateType(name) {
    const { data, error: createError } = await createUnitType(name);
    if (createError) {
      setError("Không thêm được loại: " + createError.message);
      return null;
    }
    setUnitTypes((prev) => [...prev, data]);
    return data;
  }

  async function handleDeleteType(id) {
    const { error: deleteError } = await deleteUnitType(id);
    if (deleteError) {
      setError("Không xoá được loại: " + deleteError.message);
      return;
    }
    setUnitTypes((prev) => prev.filter((t) => t.id !== id));
    setUnits((prev) => prev.map((u) => (u.unit_type_id === id ? { ...u, unit_type_id: null, unit_type: null } : u)));
    setTypeFilter((prev) => (prev === id ? null : prev));
  }

  const filteredUnits = typeFilter
    ? units.filter((u) => u.unit_type_id === typeFilter)
    : units;

  return (
    <div className="min-h-full w-full bg-stone-50 font-sans text-stone-800">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-700 text-stone-50">
              <Route className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl text-cyan-900">Chặng</h1>
              <p className="text-sm text-stone-500">
                Gom các hoạt động lại theo ngày/tuần, có thể phân loại
              </p>
            </div>
          </div>

          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            Thêm chặng
          </Button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        <UnitTypeFilterBar
          types={unitTypes}
          selectedId={typeFilter}
          onSelect={setTypeFilter}
          onCreate={handleCreateType}
          onDelete={handleDeleteType}
        />

        <p className="mb-3 text-sm text-stone-500">{filteredUnits.length} chặng đã lưu</p>

        {loading ? (
          <div className="rounded-xl border border-dashed border-stone-300 py-16 text-center text-stone-400">
            <p className="text-sm">Đang tải danh sách chặng...</p>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 py-16 text-center text-stone-400">
            <Route className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">
              {units.length === 0
                ? "Chưa có chặng nào. Thêm chặng đầu tiên nhé."
                : "Không có chặng nào thuộc loại này."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUnits.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                itemCount={itemsForUnit(items, unit.id).length}
                onOpenDetail={setDetailUnit}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <UnitFormModal
        open={formModal.open}
        mode={formModal.mode}
        unit={formModal.unit}
        initialItemIds={formModal.initialItemIds}
        items={items}
        unitTypes={unitTypes}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
        onDeleteType={handleDeleteType}
      />

      <UnitDetailModal
        open={!!detailUnit}
        unit={detailUnit}
        items={detailUnit ? itemsForUnit(items, detailUnit.id) : []}
        onClose={() => setDetailUnit(null)}
        onEdit={openEditModal}
      />
    </div>
  );
}
