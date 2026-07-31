import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Map, Plus } from "lucide-react";
import { listPlans, createPlan, updatePlan, deletePlan, type PlanInput } from "../services/plans.service";
import { listUnits } from "../services/units.service";
import { listItems } from "../services/items.service";
import { planPath } from "../shared/constants/routes";
import { groupItemsByUnit, planTotals, unitsForPlan } from "../shared/utils/planStats";
import Button from "../shared/components/Button";
import EmptyState from "../shared/components/EmptyState";
import PageHeader from "../shared/components/PageHeader";
import PlanCard from "../components/PlanCard";
import PlanFormModal from "../components/PlanFormModal";
import type { Id, Item, Plan, Unit } from "../shared/types/models";

interface FormModalState {
  open: boolean;
  mode: "create" | "edit";
  plan: Plan | null;
}

export default function PlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formModal, setFormModal] = useState<FormModalState>({
    open: false,
    mode: "create",
    plan: null,
  });

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [plansRes, unitsRes, itemsRes] = await Promise.all([listPlans(), listUnits(), listItems()]);

    if (plansRes.error) {
      setError("Không tải được danh sách kế hoạch: " + plansRes.error.message);
    } else {
      setPlans(plansRes.data ?? []);
    }
    setUnits(unitsRes.data ?? []);
    setItems(itemsRes.data ?? []);
    setLoading(false);
  }

  const itemsByUnit = useMemo(() => groupItemsByUnit(items), [items]);

  async function handleDelete(id: Id) {
    const { error: deleteError } = await deletePlan(id);
    if (deleteError) {
      setError("Không xoá được kế hoạch: " + deleteError.message);
      return;
    }
    await loadData();
  }

  async function handleFormSubmit(values: PlanInput) {
    if (formModal.mode === "edit" && formModal.plan) {
      const { error: updateError } = await updatePlan(formModal.plan.id, values);
      if (updateError) return { error: "Không lưu được thay đổi: " + updateError.message };
      setFormModal((prev) => ({ ...prev, open: false }));
      await loadData();
      return {};
    }

    const { data, error: createError } = await createPlan(values);
    if (createError || !data) {
      return { error: "Không thêm được kế hoạch: " + (createError?.message ?? "") };
    }

    // Tạo xong đi thẳng vào màn hình xây dựng — đó mới là nơi ghép chặng/hoạt động.
    navigate(`${planPath(data.id)}?tab=build`);
    return {};
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <PageHeader
        icon={Map}
        title="Kế hoạch"
        subtitle="Mỗi kế hoạch gom nhiều chặng — mở ra để xem tổng quan, xây dựng hoặc xếp lịch trình"
        actions={
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setFormModal({ open: true, mode: "create", plan: null })}
          >
            Kế hoạch mới
          </Button>
        }
      />

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
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Map}
          title="Chưa có kế hoạch nào"
          hint="Tạo kế hoạch đầu tiên, rồi thêm chặng và kéo-thả hoạt động vào từng chặng."
          action={
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setFormModal({ open: true, mode: "create", plan: null })}
            >
              Kế hoạch mới
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const totals = planTotals(unitsForPlan(units, plan.id), itemsByUnit);
            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                unitCount={totals.unitCount}
                itemCount={totals.itemCount}
                totalCost={totals.cost}
                onEdit={(p) => setFormModal({ open: true, mode: "edit", plan: p })}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      <PlanFormModal
        open={formModal.open}
        mode={formModal.mode}
        plan={formModal.plan}
        onClose={() => setFormModal((prev) => ({ ...prev, open: false }))}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
