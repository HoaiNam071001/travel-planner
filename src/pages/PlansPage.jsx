import { useEffect, useMemo, useState } from "react";
import { Map, Plus } from "lucide-react";
import { listPlans, createPlan, updatePlan, deletePlan } from "../services/plans.service";
import { listUnits } from "../services/units.service";
import { listItems } from "../services/items.service";
import Button from "../shared/components/Button";
import PlanCard from "../components/PlanCard";
import PlanFormModal from "../components/PlanFormModal";
import PlanDetailModal from "../components/PlanDetailModal";

function unitsForPlan(units, planId) {
  return units
    .filter((u) => u.plan_id === planId)
    .slice()
    .sort((a, b) => a.order_index - b.order_index);
}

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [units, setUnits] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formModal, setFormModal] = useState({
    open: false,
    mode: "create",
    plan: null,
    initialUnitIds: [],
    previousUnitIds: [],
  });
  const [detailPlan, setDetailPlan] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [plansRes, unitsRes, itemsRes] = await Promise.all([
      listPlans(),
      listUnits(),
      listItems(),
    ]);

    if (plansRes.error) {
      setError("Không tải được danh sách kế hoạch: " + plansRes.error.message);
    } else {
      setPlans(plansRes.data ?? []);
    }
    setUnits(unitsRes.data ?? []);
    setItems(itemsRes.data ?? []);
    setLoading(false);
  }

  // Đếm số hoạt động + tổng giá theo từng chặng, dùng chung cho mọi kế hoạch —
  // tổng cost của Plan = tổng hợp từ Unit, Unit tổng hợp từ Item (tính động).
  const { itemCountByUnit, costByUnit } = useMemo(() => {
    const counts = {};
    const costs = {};
    for (const item of items) {
      if (!item.unit_id) continue;
      counts[item.unit_id] = (counts[item.unit_id] ?? 0) + 1;
      costs[item.unit_id] = (costs[item.unit_id] ?? 0) + (Number(item.price) || 0);
    }
    return { itemCountByUnit: counts, costByUnit: costs };
  }, [items]);

  function openCreateModal() {
    setFormModal({ open: true, mode: "create", plan: null, initialUnitIds: [], previousUnitIds: [] });
  }

  function openEditModal(plan) {
    setDetailPlan(null);
    const currentUnitIds = unitsForPlan(units, plan.id).map((u) => u.id);
    setFormModal({
      open: true,
      mode: "edit",
      plan,
      initialUnitIds: currentUnitIds,
      previousUnitIds: currentUnitIds,
    });
  }

  function closeFormModal() {
    setFormModal((prev) => ({ ...prev, open: false }));
  }

  async function handleDelete(id) {
    const { error: deleteError } = await deletePlan(id);
    if (deleteError) {
      setError("Không xoá được kế hoạch: " + deleteError.message);
      return;
    }
    if (detailPlan?.id === id) setDetailPlan(null);
    await loadData();
  }

  async function handleFormSubmit(values) {
    const result =
      formModal.mode === "edit"
        ? await updatePlan(formModal.plan.id, values, formModal.previousUnitIds)
        : await createPlan(values);

    if (result.error) {
      return {
        error:
          (formModal.mode === "edit" ? "Không lưu được thay đổi: " : "Không thêm được kế hoạch: ") +
          result.error.message,
      };
    }

    closeFormModal();
    await loadData();
    return {};
  }

  return (
    <div className="min-h-full w-full bg-stone-50 font-sans text-stone-800">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-700 text-stone-50">
              <Map className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl text-cyan-900">Kế hoạch</h1>
              <p className="text-sm text-stone-500">
                Gộp các chặng lại thành một kế hoạch đi chơi hoàn chỉnh
              </p>
            </div>
          </div>

          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            Thêm kế hoạch
          </Button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        <p className="mb-3 text-sm text-stone-500">{plans.length} kế hoạch đã lưu</p>

        {loading ? (
          <div className="rounded-xl border border-dashed border-stone-300 py-16 text-center text-stone-400">
            <p className="text-sm">Đang tải danh sách kế hoạch...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 py-16 text-center text-stone-400">
            <Map className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">Chưa có kế hoạch nào. Thêm kế hoạch đầu tiên nhé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const planUnits = unitsForPlan(units, plan.id);
              const totalCost = planUnits.reduce((sum, u) => sum + (costByUnit[u.id] ?? 0), 0);
              const totalItems = planUnits.reduce((sum, u) => sum + (itemCountByUnit[u.id] ?? 0), 0);
              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  unitCount={planUnits.length}
                  itemCount={totalItems}
                  totalCost={totalCost}
                  onOpenDetail={setDetailPlan}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              );
            })}
          </div>
        )}
      </div>

      <PlanFormModal
        open={formModal.open}
        mode={formModal.mode}
        plan={formModal.plan}
        initialUnitIds={formModal.initialUnitIds}
        units={units}
        items={items}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
      />

      <PlanDetailModal
        open={!!detailPlan}
        plan={detailPlan}
        units={detailPlan ? unitsForPlan(units, detailPlan.id) : []}
        itemCountByUnit={itemCountByUnit}
        costByUnit={costByUnit}
        onClose={() => setDetailPlan(null)}
        onEdit={openEditModal}
      />
    </div>
  );
}
