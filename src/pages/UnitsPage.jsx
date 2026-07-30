import { useEffect, useMemo, useState } from "react";
import { Route as RouteIcon, Plus } from "lucide-react";
import { listUnits, createUnit, updateUnit, deleteUnit } from "../services/units.service";
import { listItems } from "../services/items.service";
import { listPlans } from "../services/plans.service";
import { listUnitTypes, createUnitType, deleteUnitType } from "../services/unitTypes.service";
import { groupItemsByUnit, unitStats } from "../shared/utils/planStats";
import Button from "../shared/components/Button";
import EmptyState from "../shared/components/EmptyState";
import PageHeader from "../shared/components/PageHeader";
import UnitCard from "../components/UnitCard";
import UnitFormModal from "../components/UnitFormModal";
import UnitDetailModal from "../components/UnitDetailModal";
import UnitTypeFilterBar from "../components/UnitTypeFilterBar";

export default function UnitsPage() {
  const [units, setUnits] = useState([]);
  const [items, setItems] = useState([]);
  const [plans, setPlans] = useState([]);
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
    const [unitsRes, itemsRes, typesRes, plansRes] = await Promise.all([
      listUnits(),
      listItems(),
      listUnitTypes(),
      listPlans(),
    ]);

    if (unitsRes.error) {
      setError("Không tải được danh sách chặng: " + unitsRes.error.message);
    } else {
      setUnits(unitsRes.data ?? []);
    }
    setItems(itemsRes.data ?? []);
    setUnitTypes(typesRes.data ?? []);
    setPlans(plansRes.data ?? []);
    setLoading(false);
  }

  const itemsByUnit = useMemo(() => groupItemsByUnit(items), [items]);
  const planNameById = useMemo(
    () => Object.fromEntries(plans.map((p) => [p.id, p.name])),
    [plans]
  );

  function openCreateModal() {
    setFormModal({ open: true, mode: "create", unit: null, initialItemIds: [], previousItemIds: [] });
  }

  function openEditModal(unit) {
    setDetailUnit(null);
    const currentItemIds = (itemsByUnit.get(unit.id) ?? []).map((i) => i.id);
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
    setUnits((prev) =>
      prev.map((u) => (u.unit_type_id === id ? { ...u, unit_type_id: null, unit_type: null } : u))
    );
    setTypeFilter((prev) => (prev === id ? null : prev));
  }

  const filteredUnits = typeFilter ? units.filter((u) => u.unit_type_id === typeFilter) : units;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <PageHeader
        icon={RouteIcon}
        title="Chặng"
        subtitle="Gom hoạt động theo ngày/tuần — chi phí và thời lượng được tính từ hoạt động bên trong"
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            Thêm chặng
          </Button>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <UnitTypeFilterBar
            types={unitTypes}
            selectedId={typeFilter}
            onSelect={setTypeFilter}
            onCreate={handleCreateType}
            onDelete={handleDeleteType}
          />
          <span className="text-xs text-slate-400 tnum">{filteredUnits.length} chặng</span>
        </div>
      </PageHeader>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-200/50" />
          ))}
        </div>
      ) : filteredUnits.length === 0 ? (
        <EmptyState
          icon={RouteIcon}
          title={units.length === 0 ? "Chưa có chặng nào" : "Không có chặng nào thuộc loại này"}
          hint={
            units.length === 0
              ? "Chặng là một ngày/tuần trong chuyến đi. Bạn cũng có thể tạo chặng ngay trong màn hình xây dựng kế hoạch."
              : "Bỏ bộ lọc loại để xem tất cả các chặng."
          }
          action={
            units.length === 0 && (
              <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
                Thêm chặng
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUnits.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              stats={unitStats(itemsByUnit.get(unit.id) ?? [], unit.break_minutes)}
              planName={unit.plan_id ? planNameById[unit.plan_id] : null}
              onOpenDetail={setDetailUnit}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <UnitFormModal
        open={formModal.open}
        mode={formModal.mode}
        unit={formModal.unit}
        initialItemIds={formModal.initialItemIds}
        items={items}
        unitTypes={unitTypes}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
        onCreateType={handleCreateType}
        onDeleteType={handleDeleteType}
      />

      <UnitDetailModal
        open={!!detailUnit}
        unit={detailUnit}
        items={detailUnit ? itemsByUnit.get(detailUnit.id) ?? [] : []}
        planName={detailUnit?.plan_id ? planNameById[detailUnit.plan_id] : null}
        onClose={() => setDetailUnit(null)}
        onEdit={openEditModal}
      />
    </div>
  );
}
