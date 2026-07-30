import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Popconfirm, Segmented } from "antd";
import { ArrowLeft, LayoutList, Pencil, SlidersHorizontal, Trash2 } from "lucide-react";
import { getPlan, updatePlan, deletePlan } from "../services/plans.service";
import {
  listUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  assignUnitsToPlan,
  unassignUnitsFromPlan,
} from "../services/units.service";
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  reorderItems,
  assignItemsToUnit,
  unassignItemsFromUnit,
} from "../services/items.service";
import { listLocations } from "../services/locations.service";
import { listUnitTypes, createUnitType, deleteUnitType } from "../services/unitTypes.service";
import { ROUTES } from "../shared/constants/routes";
import { LIBRARY_LANE } from "../shared/constants/board";
import { groupItemsByUnit, unitsForPlan } from "../shared/utils/planStats";
import Button from "../shared/components/Button";
import EmptyState from "../shared/components/EmptyState";
import Modal from "../shared/components/Modal";
import PlanOverview from "../components/plan/PlanOverview";
import PlanBoard from "../components/plan/PlanBoard";
import PlanFormModal from "../components/PlanFormModal";
import UnitFormModal from "../components/UnitFormModal";
import ItemFormModal from "../components/ItemFormModal";

const TABS = [
  { value: "overview", label: "Tổng quan", icon: LayoutList },
  { value: "build", label: "Xây dựng", icon: SlidersHorizontal },
];

export default function PlanDetailPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "build" ? "build" : "overview";

  const [plan, setPlan] = useState(null);
  const [units, setUnits] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [unitTypes, setUnitTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [deletingUnit, setDeletingUnit] = useState(null);
  const [unitForm, setUnitForm] = useState({ open: false, unit: null });
  const [itemForm, setItemForm] = useState({ open: false, item: null, unitId: null });

  const loadData = useCallback(async () => {
    const [planRes, unitsRes, itemsRes, locationsRes, typesRes] = await Promise.all([
      getPlan(planId),
      listUnits(),
      listItems(),
      listLocations(),
      listUnitTypes(),
    ]);

    if (planRes.error) {
      setNotFound(true);
    } else {
      setPlan(planRes.data);
      setNotFound(false);
    }
    setUnits(unitsRes.data ?? []);
    setItems(itemsRes.data ?? []);
    setLocations(locationsRes.data ?? []);
    setUnitTypes(typesRes.data ?? []);
    setLoading(false);
  }, [planId]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const planUnits = useMemo(() => unitsForPlan(units, planId), [units, planId]);
  const itemsByUnit = useMemo(() => groupItemsByUnit(items), [items]);
  const libraryItems = useMemo(
    () =>
      items
        .filter((i) => !i.unit_id)
        .slice()
        .sort((a, b) => a.order_index - b.order_index),
    [items]
  );
  // Chặng chưa gắn kế hoạch nào — nguồn để "thêm chặng có sẵn" vào kế hoạch này.
  const freeUnits = useMemo(() => units.filter((u) => !u.plan_id), [units]);

  function laneItems(laneId) {
    return laneId === LIBRARY_LANE ? libraryItems : itemsByUnit.get(laneId) ?? [];
  }

  // Mọi thao tác ghi đều cập nhật state trước cho UI phản hồi tức thì, rồi mới gọi
  // service; lỗi thì báo và tải lại để state không lệch với DB.
  async function commit(persist, message) {
    const { error: writeError } = (await persist()) ?? {};
    if (writeError) {
      setError(`${message}: ${writeError.message}`);
      await loadData();
      return false;
    }
    setError("");
    return true;
  }

  // ------------------------------------------------------------------ items
  async function moveItem(itemId, toLane, toIndex) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const fromLane = item.unit_id ?? LIBRARY_LANE;
    const sourceRest = laneItems(fromLane).filter((i) => i.id !== itemId);
    const target = fromLane === toLane ? sourceRest : laneItems(toLane).slice();
    const insertAt = toIndex == null ? target.length : Math.min(Math.max(toIndex, 0), target.length);
    target.splice(insertAt, 0, item);

    if (fromLane === toLane && target.every((i, idx) => i.id === laneItems(toLane)[idx]?.id)) {
      return; // thứ tự không đổi
    }

    const patch = new Map();
    target.forEach((i, idx) =>
      patch.set(i.id, { unit_id: toLane === LIBRARY_LANE ? null : toLane, order_index: idx })
    );
    if (fromLane !== toLane) {
      sourceRest.forEach((i, idx) =>
        patch.set(i.id, { unit_id: fromLane === LIBRARY_LANE ? null : fromLane, order_index: idx })
      );
    }
    setItems((prev) => prev.map((i) => (patch.has(i.id) ? { ...i, ...patch.get(i.id) } : i)));

    await commit(async () => {
      if (toLane === LIBRARY_LANE) {
        const { error: unassignError } = await unassignItemsFromUnit([itemId]);
        if (unassignError) return { error: unassignError };
        // Gỡ khỏi chặng xong mới đánh lại thứ tự trong kho (unassign đặt về 0).
        const { error: reorderError } = await reorderItems(target.map((i) => i.id));
        if (reorderError) return { error: reorderError };
      } else {
        const { error: assignError } = await assignItemsToUnit(toLane, target.map((i) => i.id));
        if (assignError) return { error: assignError };
      }
      if (fromLane !== toLane && fromLane !== LIBRARY_LANE) {
        return assignItemsToUnit(fromLane, sourceRest.map((i) => i.id));
      }
      return { error: null };
    }, "Không lưu được thay đổi hoạt động");
  }

  async function handleItemFormSubmit(values) {
    if (itemForm.item) {
      const { data, error: updateError } = await updateItem(itemForm.item.id, values);
      if (updateError) return { error: "Không lưu được thay đổi: " + updateError.message };
      setItems((prev) => prev.map((i) => (i.id === data.id ? { ...i, ...data } : i)));
      setItemForm({ open: false, item: null, unitId: null });
      return {};
    }

    const { data, error: createError } = await createItem(values);
    if (createError) return { error: "Không thêm được hoạt động: " + createError.message };

    // Hoạt động tạo từ trong 1 chặng thì gắn luôn vào cuối chặng đó.
    const unitId = itemForm.unitId;
    if (unitId && unitId !== LIBRARY_LANE) {
      const ordered = [...laneItems(unitId).map((i) => i.id), data.id];
      const { error: assignError } = await assignItemsToUnit(unitId, ordered);
      if (assignError) return { error: "Không gắn được vào chặng: " + assignError.message };
    }
    setItemForm({ open: false, item: null, unitId: null });
    await loadData();
    return {};
  }

  async function handleDeleteItem(itemId) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    await commit(() => deleteItem(itemId), "Không xoá được hoạt động");
  }

  // ------------------------------------------------------------------ units
  async function addUnitToPlan(unitId) {
    const ordered = [...planUnits.map((u) => u.id), unitId];
    setUnits((prev) =>
      prev.map((u) =>
        u.id === unitId ? { ...u, plan_id: planId, order_index: ordered.length - 1 } : u
      )
    );
    await commit(() => assignUnitsToPlan(planId, ordered), "Không thêm được chặng vào kế hoạch");
  }

  async function removeUnitFromPlan(unitId) {
    const remaining = planUnits.filter((u) => u.id !== unitId).map((u) => u.id);
    setUnits((prev) =>
      prev.map((u) => {
        if (u.id === unitId) return { ...u, plan_id: null, order_index: 0 };
        const idx = remaining.indexOf(u.id);
        return idx === -1 ? u : { ...u, order_index: idx };
      })
    );
    await commit(async () => {
      const { error: unassignError } = await unassignUnitsFromPlan([unitId]);
      if (unassignError) return { error: unassignError };
      return assignUnitsToPlan(planId, remaining);
    }, "Không gỡ được chặng khỏi kế hoạch");
  }

  async function moveUnit(unitId, direction) {
    const ids = planUnits.map((u) => u.id);
    const from = ids.indexOf(unitId);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= ids.length) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);

    setUnits((prev) =>
      prev.map((u) => {
        const idx = ids.indexOf(u.id);
        return idx === -1 ? u : { ...u, order_index: idx };
      })
    );
    await commit(() => assignUnitsToPlan(planId, ids), "Không lưu được thứ tự chặng");
  }

  async function quickCreateUnit(name) {
    const { data, error: createError } = await createUnit({ name, itemIds: [] });
    if (createError) {
      setError("Không thêm được chặng: " + createError.message);
      return;
    }
    const ordered = [...planUnits.map((u) => u.id), data.id];
    await commit(() => assignUnitsToPlan(planId, ordered), "Không thêm được chặng vào kế hoạch");
    await loadData();
  }

  async function handleUnitFormSubmit(values) {
    const { error: writeError } = unitForm.unit
      ? await updateUnit(unitForm.unit.id, values)
      : await createUnit(values);

    if (writeError) {
      return {
        error:
          (unitForm.unit ? "Không lưu được thay đổi: " : "Không thêm được chặng: ") +
          writeError.message,
      };
    }
    setUnitForm({ open: false, unit: null });
    await loadData();
    return {};
  }

  // Xoá chặng là thao tác phá huỷ nhưng trigger nằm trong Dropdown (Popconfirm lồng trong
  // menu item sẽ bị unmount khi menu đóng), nên dùng Modal xác nhận riêng của trang.
  async function handleDeleteUnit() {
    const unitId = deletingUnit?.id;
    setDeletingUnit(null);
    if (!unitId) return;

    setUnits((prev) => prev.filter((u) => u.id !== unitId));
    setItems((prev) =>
      prev.map((i) => (i.unit_id === unitId ? { ...i, unit_id: null, order_index: 0 } : i))
    );
    await commit(() => deleteUnit(unitId), "Không xoá được chặng");
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

  async function handleDeleteType(typeId) {
    const { error: deleteError } = await deleteUnitType(typeId);
    if (deleteError) {
      setError("Không xoá được loại: " + deleteError.message);
      return;
    }
    setUnitTypes((prev) => prev.filter((t) => t.id !== typeId));
    setUnits((prev) =>
      prev.map((u) =>
        u.unit_type_id === typeId ? { ...u, unit_type_id: null, unit_type: null } : u
      )
    );
  }

  // ------------------------------------------------------------------ plan
  async function handlePlanFormSubmit(values) {
    const { error: updateError } = await updatePlan(planId, values);
    if (updateError) return { error: "Không lưu được thay đổi: " + updateError.message };
    setPlan((prev) => ({ ...prev, ...values }));
    setPlanFormOpen(false);
    return {};
  }

  async function handleDeletePlan() {
    const { error: deleteError } = await deletePlan(planId);
    if (deleteError) {
      setError("Không xoá được kế hoạch: " + deleteError.message);
      return;
    }
    navigate(ROUTES.PLANS, { replace: true });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="h-44 animate-pulse rounded-3xl bg-slate-200/60" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/50" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Không tìm thấy kế hoạch này"
          hint="Kế hoạch có thể đã bị xoá, hoặc đường dẫn không đúng."
          action={
            <Button variant="primary" onClick={() => navigate(ROUTES.PLANS)}>
              Về danh sách kế hoạch
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to={ROUTES.PLANS}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Kế hoạch
        </Link>

        <Segmented
          value={tab}
          onChange={(value) => setSearchParams(value === "build" ? { tab: "build" } : {})}
          options={TABS.map(({ value, label, icon: Icon }) => ({
            value,
            label: (
              <span className="flex items-center gap-1.5 px-1 font-medium">
                <Icon className="h-4 w-4" />
                {label}
              </span>
            ),
          }))}
        />

        <div className="flex items-center gap-2">
          <Button icon={<Pencil className="h-4 w-4" />} onClick={() => setPlanFormOpen(true)}>
            Sửa thông tin
          </Button>
          <Popconfirm
            title="Xoá kế hoạch này?"
            description="Các chặng bên trong sẽ được gỡ ra, không bị xoá."
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={handleDeletePlan}
          >
            <Button variant="text" icon={<Trash2 className="h-4 w-4" />} aria-label="Xoá kế hoạch" />
          </Popconfirm>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
          {error}
        </p>
      )}

      {tab === "overview" ? (
        <PlanOverview
          plan={plan}
          planUnits={planUnits}
          itemsByUnit={itemsByUnit}
          onStartBuilding={() => setSearchParams({ tab: "build" })}
          onEditUnit={(unit) => setUnitForm({ open: true, unit })}
        />
      ) : (
        <PlanBoard
          plan={plan}
          planUnits={planUnits}
          itemsByUnit={itemsByUnit}
          libraryItems={libraryItems}
          freeUnits={freeUnits}
          hasLocations={locations.length > 0}
          onMoveItem={moveItem}
          onMoveUnit={moveUnit}
          onAddUnit={addUnitToPlan}
          onQuickCreateUnit={quickCreateUnit}
          onRemoveUnit={removeUnitFromPlan}
          onEditUnit={(unit) => setUnitForm({ open: true, unit })}
          onDeleteUnit={(unitId) => setDeletingUnit(planUnits.find((u) => u.id === unitId))}
          onCreateUnit={() => setUnitForm({ open: true, unit: null })}
          onCreateItem={(unitId) => setItemForm({ open: true, item: null, unitId })}
          onEditItem={(item) => setItemForm({ open: true, item, unitId: item.unit_id })}
          onDeleteItem={handleDeleteItem}
        />
      )}

      <PlanFormModal
        open={planFormOpen}
        mode="edit"
        plan={plan}
        onClose={() => setPlanFormOpen(false)}
        onSubmit={handlePlanFormSubmit}
      />

      <UnitFormModal
        open={unitForm.open}
        mode={unitForm.unit ? "edit" : "create"}
        unit={unitForm.unit}
        unitTypes={unitTypes}
        showItemPicker={false}
        onClose={() => setUnitForm({ open: false, unit: null })}
        onSubmit={handleUnitFormSubmit}
        onCreateType={handleCreateType}
        onDeleteType={handleDeleteType}
      />

      <ItemFormModal
        open={itemForm.open}
        mode={itemForm.item ? "edit" : "create"}
        item={itemForm.item}
        locations={locations}
        onClose={() => setItemForm({ open: false, item: null, unitId: null })}
        onSubmit={handleItemFormSubmit}
      />

      <Modal
        open={!!deletingUnit}
        onClose={() => setDeletingUnit(null)}
        title="Xoá chặng này?"
        width={440}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDeletingUnit(null)}>Huỷ</Button>
            <Button variant="danger" onClick={handleDeleteUnit}>
              Xoá chặng
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          Chặng <span className="font-semibold text-slate-900">{deletingUnit?.name}</span> sẽ bị
          xoá vĩnh viễn. Các hoạt động bên trong <span className="font-medium">không</span> bị
          xoá — chúng sẽ được trả về kho hoạt động chưa gắn chặng.
        </p>
      </Modal>
    </div>
  );
}
