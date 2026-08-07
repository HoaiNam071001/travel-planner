import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Map, Plus, Sparkles, Wallet } from "lucide-react";
import { listPlans, createPlan, updatePlan, deletePlan, type PlanInput } from "../services/plans.service";
import { listUnits } from "../services/units.service";
import { listItems } from "../services/items.service";
import { listAllPlanExpenses } from "../services/planExpenses.service";
import { useTranslation } from "../i18n/useAppTranslation";
import { useAuth } from "../context/AuthContext";
import { planPath } from "../shared/constants/routes";
import { groupExpensesByPlan, groupItemsByUnit, planTotals, unitsForPlan } from "../shared/utils/planStats";
import { formatPrice } from "../shared/utils/format";
import Button from "../shared/components/Button";
import Card from "../shared/components/Card";
import EmptyState from "../shared/components/EmptyState";
import PageHeader from "../shared/components/PageHeader";
import PlanCard from "../components/PlanCard";
import PlanFormModal from "../components/PlanFormModal";
import type { Id, Item, Plan, PlanExpense, Unit } from "../shared/types/models";

interface FormModalState {
  open: boolean;
  mode: "create" | "edit";
  plan: Plan | null;
}

export default function PlansPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(["plans", "common"]);
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [expenses, setExpenses] = useState<PlanExpense[]>([]);
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
    const [plansRes, unitsRes, itemsRes, expensesRes] = await Promise.all([
      listPlans(),
      listUnits(),
      listItems(),
      listAllPlanExpenses(),
    ]);

    if (plansRes.error) {
      setError(t("plans:errors.load", { message: plansRes.error.message }));
    } else {
      setPlans(plansRes.data ?? []);
      setError("");
    }
    setUnits(unitsRes.data ?? []);
    setItems(itemsRes.data ?? []);
    setExpenses(expensesRes.data ?? []);
    setLoading(false);
  }

  const itemsByUnit = useMemo(() => groupItemsByUnit(items), [items]);
  const expensesByPlan = useMemo(() => groupExpensesByPlan(expenses), [expenses]);
  const ownedPlans = plans.filter((plan) => plan.user_id === user?.id);
  const sharedPlans = plans.filter((plan) => plan.user_id !== user?.id);

  const summary = useMemo(() => {
    let totalUnits = 0;
    let totalItems = 0;
    let totalCost = 0;

    for (const plan of plans) {
      const totals = planTotals(
        unitsForPlan(units, plan.id),
        itemsByUnit,
        expensesByPlan.get(plan.id) ?? []
      );
      totalUnits += totals.unitCount;
      totalItems += totals.itemCount;
      totalCost += totals.cost;
    }

    return { totalUnits, totalItems, totalCost };
  }, [expensesByPlan, itemsByUnit, plans, units]);

  async function handleDelete(id: Id) {
    const { error: deleteError } = await deletePlan(id);
    if (deleteError) {
      setError(t("plans:errors.delete", { message: deleteError.message }));
      return;
    }
    await loadData();
  }

  async function handleFormSubmit(values: PlanInput) {
    if (formModal.mode === "edit" && formModal.plan) {
      const { error: updateError } = await updatePlan(formModal.plan.id, values);
      if (updateError) return { error: t("plans:errors.save", { message: updateError.message }) };
      setFormModal((prev) => ({ ...prev, open: false }));
      await loadData();
      return {};
    }

    const { data, error: createError } = await createPlan(values);
    if (createError || !data) {
      return { error: t("plans:errors.create", { message: createError?.message ?? "" }) };
    }

    navigate(`${planPath(data.id)}?tab=build`);
    return {};
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        icon={Map}
        title={t("plans:workspaceTitle")}
        subtitle={t("plans:workspaceSubtitle")}
        actions={
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setFormModal({ open: true, mode: "create", plan: null })}
          >
            {t("plans:newPlan")}
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Compass}
            label={t("plans:summary.overview")}
            value={plans.length}
            detail={t("plans:summary.ownedShared", {
              owned: ownedPlans.length,
              shared: sharedPlans.length,
            })}
            emphasized
          />
          <SummaryCard
            icon={Map}
            label={t("plans:summary.units")}
            value={summary.totalUnits}
            detail={t("plans:summary.unitsDetail")}
            tone="cyan"
          />
          <SummaryCard
            icon={Sparkles}
            label={t("plans:summary.items")}
            value={summary.totalItems}
            detail={t("plans:summary.itemsDetail")}
            tone="violet"
          />
          <SummaryCard
            icon={Wallet}
            label={t("plans:summary.spend")}
            value={summary.totalCost > 0 ? formatPrice(summary.totalCost) : "-"}
            detail={t("plans:summary.spendDetail")}
            tone="emerald"
          />
        </div>
      </PageHeader>

      {error && (
        <Card className="border-danger/10 bg-danger/10 px-4 py-3 text-sm text-danger" elevated>
          {error}
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface-soft h-[296px] animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <Card className="p-2" elevated>
          <EmptyState
            icon={Map}
            title={t("plans:empty.title")}
            hint={t("plans:empty.hint")}
            action={
              <Button
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setFormModal({ open: true, mode: "create", plan: null })}
              >
                {t("plans:empty.action")}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <SectionTitle title={t("plans:section.activeTitle")} subtitle={t("plans:section.activeSubtitle")} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {plans.map((plan) => {
              const totals = planTotals(
                unitsForPlan(units, plan.id),
                itemsByUnit,
                expensesByPlan.get(plan.id) ?? []
              );

              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  unitCount={totals.unitCount}
                  itemCount={totals.itemCount}
                  totalCost={totals.cost}
                  isShared={plan.user_id !== user?.id}
                  onEdit={(currentPlan) => setFormModal({ open: true, mode: "edit", plan: currentPlan })}
                  onDelete={handleDelete}
                />
              );
            })}
          </div>
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

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  emphasized = false,
  tone = "cyan",
}: {
  icon: typeof Compass;
  label: string;
  value: string | number;
  detail: string;
  emphasized?: boolean;
  tone?: "cyan" | "violet" | "emerald";
}) {
  const toneStyles: Record<"cyan" | "violet" | "emerald", { panel: string; icon: string }> = {
    cyan: {
      panel:
        "bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_30%),linear-gradient(180deg,rgba(34,211,238,0.04),transparent)]",
      icon: "bg-cyan-500/12 text-cyan-400",
    },
    violet: {
      panel:
        "bg-[radial-gradient(circle_at_top_left,rgba(167,139,250,0.16),transparent_30%),linear-gradient(180deg,rgba(99,102,241,0.04),transparent)]",
      icon: "bg-violet-500/12 text-violet-400",
    },
    emerald: {
      panel:
        "bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.16),transparent_30%),linear-gradient(180deg,rgba(16,185,129,0.04),transparent)]",
      icon: "bg-emerald-500/12 text-emerald-400",
    },
  };

  return (
    <Card className={`relative overflow-hidden p-4 ${emphasized ? "surface-highlight text-white" : "surface-soft"}`} elevated>
      {emphasized && (
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]"
        />
      )}
      {!emphasized && <div aria-hidden className={`absolute inset-0 ${toneStyles[tone].panel}`} />}
      <div className="relative">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-[18px] ${
            emphasized ? "bg-white/12 text-white" : toneStyles[tone].icon
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <p className={`mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] ${emphasized ? "text-white/72" : "text-text-muted"}`}>
          {label}
        </p>
        <p className={`mt-2 font-display text-[28px] font-bold leading-none tnum ${emphasized ? "text-white" : "text-text-primary"}`}>
          {value}
        </p>
        <p className={`mt-3 text-sm leading-6 ${emphasized ? "text-white/75" : "text-text-secondary"}`}>{detail}</p>
      </div>
    </Card>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
      </div>
    </div>
  );
}
