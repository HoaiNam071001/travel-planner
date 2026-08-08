import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Popconfirm, Segmented } from "antd";
import {
  ArrowLeft,
  CalendarRange,
  LayoutList,
  Pencil,
  Receipt,
  Share2,
  SlidersHorizontal,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  getPlan,
  updatePlan,
  deletePlan,
  setPlanShareToken,
  type PlanInput,
} from "../services/plans.service";
import {
  listUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  patchUnitTimes,
  assignUnitsToPlan,
  unassignUnitsFromPlan,
  type UnitInput,
  type UnitTimePatch,
} from "../services/units.service";
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  reorderItems,
  patchItemTimes,
  assignItemsToUnit,
  unassignItemsFromUnit,
  type ItemInput,
  type ItemTimePatch,
} from "../services/items.service";
import { listLocations } from "../services/locations.service";
import { listUnitTypes, createUnitType, deleteUnitType } from "../services/unitTypes.service";
import {
  listPlanExpenses,
  createPlanExpense,
  updatePlanExpense,
  patchPlanExpenseTimes,
  deletePlanExpense,
  type PlanExpenseInput,
  type PlanExpenseTimePatch,
} from "../services/planExpenses.service";
import { ROUTES } from "../shared/constants/routes";
import { LIBRARY_LANE } from "../shared/constants/board";
import { groupItemsByUnit, unitsForPlan } from "../shared/utils/planStats";
import { useTranslation } from "../i18n/useAppTranslation";
import Button from "../shared/components/Button";
import Card from "../shared/components/Card";
import EmptyState from "../shared/components/EmptyState";
import Modal from "../shared/components/Modal";
import PlanOverview from "../components/plan/PlanOverview";
import PlanBoard from "../components/plan/PlanBoard";
import PlanTimeline from "../components/plan/PlanTimeline";
import PlanExpenses from "../components/plan/PlanExpenses";
import PlanFormModal from "../components/PlanFormModal";
import UnitFormModal from "../components/UnitFormModal";
import ItemFormModal from "../components/ItemFormModal";
import PlanExpenseFormModal from "../components/PlanExpenseFormModal";
import UnitDetailModal from "../components/UnitDetailModal";
import ItemDetailModal from "../components/ItemDetailModal";
import ShareModal from "../components/plan/ShareModal";
import { useAuth } from "../context/AuthContext";
import type { Id, Item, LocationRow, Plan, PlanExpense, Unit, UnitType } from "../shared/types/models";
import type { WriteResult } from "../services/types";

type TabKey = "overview" | "build" | "schedule" | "expenses";

const TAB_ICONS: { value: TabKey; icon: LucideIcon }[] = [
  { value: "overview", icon: LayoutList },
  { value: "build", icon: SlidersHorizontal },
  { value: "schedule", icon: CalendarRange },
  { value: "expenses", icon: Receipt },
];

interface UnitFormState {
  open: boolean;
  unit: Unit | null;
}

interface ItemFormState {
  open: boolean;
  item: Item | null;
  unitId: Id | null;
}

interface ExpenseFormState {
  open: boolean;
  expense: PlanExpense | null;
}

export default function PlanDetailPage() {
  const { t } = useTranslation(["planDetail", "common"]);
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: TabKey =
    tabParam === "build" || tabParam === "schedule" || tabParam === "expenses" ? tabParam : "overview";

  const [plan, setPlan] = useState<Plan | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [expenses, setExpenses] = useState<PlanExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState<UnitFormState>({ open: false, unit: null });
  const [itemForm, setItemForm] = useState<ItemFormState>({
    open: false,
    item: null,
    unitId: null,
  });
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>({ open: false, expense: null });
  const [viewingUnit, setViewingUnit] = useState<Unit | null>(null);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const isOwner = Boolean(plan && user && plan.user_id === user.id);

  const loadData = useCallback(async () => {
    if (!planId) return;
    const [planRes, unitsRes, itemsRes, locationsRes, typesRes, expensesRes] = await Promise.all([
      getPlan(planId),
      listUnits(),
      listItems(),
      listLocations(),
      listUnitTypes(),
      listPlanExpenses(planId),
    ]);

    if (planRes.error || !planRes.data) {
      setNotFound(true);
    } else {
      setPlan(planRes.data);
      setNotFound(false);
    }
    setUnits(unitsRes.data ?? []);
    setItems(itemsRes.data ?? []);
    setLocations(locationsRes.data ?? []);
    setUnitTypes(typesRes.data ?? []);
    setExpenses(expensesRes.data ?? []);
    setLoading(false);
  }, [planId]);

  useEffect(() => {
    setLoading(true);
    void loadData();
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

  function laneItems(laneId: Id): Item[] {
    return laneId === LIBRARY_LANE ? libraryItems : (itemsByUnit.get(laneId) ?? []);
  }

  // Mọi thao tác ghi đều cập nhật state trước cho UI phản hồi tức thì, rồi mới gọi
  // service; lỗi thì báo và tải lại để state không lệch với DB.
  async function commit(persist: () => Promise<WriteResult>, message: string): Promise<boolean> {
    const { error: writeError } = await persist();
    if (writeError) {
      setError(t("planDetail:errors.write", { message, detail: writeError.message }));
      await loadData();
      return false;
    }
    setError("");
    return true;
  }

  // ------------------------------------------------------------------ items
  async function moveItem(itemId: Id, toLane: Id, toIndex: number | null) {
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

    const patch = new Map<Id, { unit_id: Id | null; order_index: number }>();
    target.forEach((i, idx) =>
      patch.set(i.id, { unit_id: toLane === LIBRARY_LANE ? null : toLane, order_index: idx })
    );
    if (fromLane !== toLane) {
      sourceRest.forEach((i, idx) =>
        patch.set(i.id, { unit_id: fromLane === LIBRARY_LANE ? null : fromLane, order_index: idx })
      );
    }
    setItems((prev) => prev.map((i) => ({ ...i, ...(patch.get(i.id) ?? {}) })));

    await commit(async () => {
      if (toLane === LIBRARY_LANE) {
        const { error: unassignError } = await unassignItemsFromUnit([itemId]);
        if (unassignError) return { error: unassignError };
        // Gỡ khỏi chặng xong mới đánh lại thứ tự trong kho (unassign đặt về 0).
        const { error: reorderError } = await reorderItems(target.map((i) => i.id));
        if (reorderError) return { error: reorderError };
      } else {
        const { error: assignError } = await assignItemsToUnit(
          toLane,
          target.map((i) => i.id)
        );
        if (assignError) return { error: assignError };
      }
      if (fromLane !== toLane && fromLane !== LIBRARY_LANE) {
        return assignItemsToUnit(
          fromLane,
          sourceRest.map((i) => i.id)
        );
      }
      return { error: null };
    }, t("planDetail:writeErrors.itemMove"));
  }

  async function handleItemFormSubmit(values: ItemInput) {
    if (itemForm.item) {
      const { data, error: updateError } = await updateItem(itemForm.item.id, values);
      if (updateError || !data) {
        return { error: t("planDetail:errors.write", { message: t("planDetail:writeErrors.genericUpdate"), detail: updateError?.message ?? "" }) };
      }
      setItems((prev) => prev.map((i) => (i.id === data.id ? { ...i, ...data } : i)));
      setItemForm({ open: false, item: null, unitId: null });
      return {};
    }

    const { data, error: createError } = await createItem(values);
    if (createError || !data) {
      return { error: t("planDetail:errors.write", { message: t("planDetail:writeErrors.itemCreate"), detail: createError?.message ?? "" }) };
    }

    // Hoạt động tạo từ trong 1 chặng thì gắn luôn vào cuối chặng đó.
    const unitId = itemForm.unitId;
    if (unitId && unitId !== LIBRARY_LANE) {
      const ordered = [...laneItems(unitId).map((i) => i.id), data.id];
      const { error: assignError } = await assignItemsToUnit(unitId, ordered);
      if (assignError)
        return {
          error: t("planDetail:errors.write", { message: t("planDetail:writeErrors.itemAssign"), detail: assignError.message }),
        };
    }
    setItemForm({ open: false, item: null, unitId: null });
    await loadData();
    return {};
  }

  async function handleDeleteItem(itemId: Id) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    await commit(() => deleteItem(itemId), t("planDetail:writeErrors.itemDelete"));
  }

  /** Kéo-thả trên tab Lịch trình — chỉ đụng tới mốc thời gian của hoạt động. */
  async function scheduleItem(itemId: Id, patch: ItemTimePatch) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
    await commit(() => patchItemTimes(itemId, patch), t("planDetail:writeErrors.itemTimes"));
  }

  /** Kéo 1 hoạt động chưa gắn chặng từ panel vào 1 hàng chặng trên tab Lịch trình. */
  async function assignAndScheduleItem(itemId: Id, unitId: Id, patch: ItemTimePatch) {
    const ordered = [...laneItems(unitId).map((i) => i.id), itemId];
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === itemId) return { ...i, unit_id: unitId, order_index: ordered.length - 1, ...patch };
        return i;
      })
    );
    await commit(async () => {
      const { error: assignError } = await assignItemsToUnit(unitId, ordered);
      if (assignError) return { error: assignError };
      return patchItemTimes(itemId, patch);
    }, t("planDetail:writeErrors.itemSchedule"));
  }

  // ------------------------------------------------------------------ units
  async function addUnitToPlan(unitId: Id) {
    if (!planId) return;
    const ordered = [...planUnits.map((u) => u.id), unitId];
    setUnits((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, plan_id: planId, order_index: ordered.length - 1 } : u))
    );
    await commit(() => assignUnitsToPlan(planId, ordered), t("planDetail:writeErrors.unitAttach"));
  }

  async function removeUnitFromPlan(unitId: Id) {
    if (!planId) return;
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
    }, t("planDetail:writeErrors.unitDetach"));
  }

  /** Ghi lại `order_index` cho toàn bộ chặng của kế hoạch theo đúng `ids`. */
  async function reorderUnits(ids: Id[]) {
    if (!planId) return;
    setUnits((prev) =>
      prev.map((u) => {
        const idx = ids.indexOf(u.id);
        return idx === -1 ? u : { ...u, order_index: idx };
      })
    );
    await commit(() => assignUnitsToPlan(planId, ids), t("planDetail:writeErrors.unitReorder"));
  }

  /** Sắp lại thứ tự hoạt động BÊN TRONG 1 chặng (không đổi chặng cha). */
  async function reorderUnitItems(unitId: Id, ids: Id[]) {
    setItems((prev) =>
      prev.map((i) => {
        const idx = ids.indexOf(i.id);
        return idx === -1 ? i : { ...i, order_index: idx };
      })
    );
    await commit(() => assignItemsToUnit(unitId, ids), t("planDetail:writeErrors.itemReorder"));
  }

  async function quickCreateUnit(name: string) {
    if (!planId) return;
    const { data, error: createError } = await createUnit({
      name,
      description: null,
      unit_type_id: null,
      start_date: null,
      itemIds: [],
    });
    if (createError || !data) {
      setError(t("planDetail:errors.write", { message: t("planDetail:writeErrors.unitCreate"), detail: createError?.message ?? "" }));
      return;
    }
    const ordered = [...planUnits.map((u) => u.id), data.id];
    await commit(() => assignUnitsToPlan(planId, ordered), t("planDetail:writeErrors.unitAttach"));
    await loadData();
  }

  async function handleUnitFormSubmit(values: UnitInput) {
    const { error: writeError } = unitForm.unit
      ? await updateUnit(unitForm.unit.id, values)
      : await createUnit(values);

    if (writeError) {
      return {
        error: t("planDetail:errors.write", {
          message: unitForm.unit ? t("planDetail:writeErrors.genericUpdate") : t("planDetail:writeErrors.unitCreate"),
          detail: writeError.message,
        }),
      };
    }
    setUnitForm({ open: false, unit: null });
    await loadData();
    return {};
  }

  /** Kéo-thả trên tab Lịch trình — chỉ đụng tới mốc thời gian của chặng. */
  async function scheduleUnit(unitId: Id, patch: UnitTimePatch) {
    setUnits((prev) => prev.map((u) => (u.id === unitId ? { ...u, ...patch } : u)));
    await commit(() => patchUnitTimes(unitId, patch), t("planDetail:writeErrors.unitTimes"));
  }

  /** Kéo 1 chặng chưa gắn kế hoạch nào từ panel vào tab Lịch trình: gắn vào kế hoạch
   *  này + xếp giờ cùng lúc — tương tự `assignAndScheduleItem` nhưng cho chặng. */
  async function attachAndScheduleUnit(unitId: Id, patch: UnitTimePatch) {
    if (!planId) return;
    const ordered = [...planUnits.map((u) => u.id), unitId];
    setUnits((prev) =>
      prev.map((u) =>
        u.id === unitId
          ? { ...u, plan_id: planId, order_index: ordered.length - 1, ...patch }
          : u
      )
    );
    await commit(async () => {
      const { error: assignError } = await assignUnitsToPlan(planId, ordered);
      if (assignError) return { error: assignError };
      return patchUnitTimes(unitId, patch);
    }, t("planDetail:writeErrors.unitSchedule"));
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
    await commit(() => deleteUnit(unitId), t("planDetail:writeErrors.unitDelete"));
  }

  async function handleCreateType(name: string): Promise<UnitType | null> {
    const { data, error: createError } = await createUnitType(name);
    if (createError || !data) {
      setError(t("planDetail:errors.write", { message: t("planDetail:writeErrors.typeCreate"), detail: createError?.message ?? "" }));
      return null;
    }
    setUnitTypes((prev) => [...prev, data]);
    return data;
  }

  async function handleDeleteType(typeId: Id) {
    const { error: deleteError } = await deleteUnitType(typeId);
    if (deleteError) {
      setError(t("planDetail:errors.write", { message: t("planDetail:writeErrors.typeDelete"), detail: deleteError.message }));
      return;
    }
    setUnitTypes((prev) => prev.filter((t) => t.id !== typeId));
    setUnits((prev) =>
      prev.map((u) => (u.unit_type_id === typeId ? { ...u, unit_type_id: null, unit_type: null } : u))
    );
  }

  // -------------------------------------------------------------- expenses
  async function handleExpenseFormSubmit(values: PlanExpenseInput) {
    if (expenseForm.expense) {
      const { data, error: updateError } = await updatePlanExpense(expenseForm.expense.id, values);
      if (updateError || !data) {
        return { error: t("planDetail:errors.write", { message: t("planDetail:writeErrors.genericUpdate"), detail: updateError?.message ?? "" }) };
      }
      setExpenses((prev) => prev.map((e) => (e.id === data.id ? data : e)));
      setExpenseForm({ open: false, expense: null });
      return {};
    }

    const { data, error: createError } = await createPlanExpense(values);
    if (createError || !data) {
      return { error: t("planDetail:errors.write", { message: t("planDetail:writeErrors.expenseCreate"), detail: createError?.message ?? "" }) };
    }
    setExpenses((prev) => [...prev, data]);
    setExpenseForm({ open: false, expense: null });
    return {};
  }

  async function handleDeleteExpense(expenseId: Id) {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    await commit(() => deletePlanExpense(expenseId), t("planDetail:writeErrors.expenseDelete"));
  }

  /** Kéo-thả trên tab Lịch trình — chỉ đụng tới mốc thời gian của khoản chi phí. */
  async function scheduleExpense(expenseId: Id, patch: PlanExpenseTimePatch) {
    setExpenses((prev) => prev.map((e) => (e.id === expenseId ? { ...e, ...patch } : e)));
    await commit(() => patchPlanExpenseTimes(expenseId, patch), t("planDetail:writeErrors.expenseTimes"));
  }

  /** Kéo 1 khoản chi phí ngược ra panel "Chưa xếp lịch" — gỡ giờ, giữ duration_minutes. */
  async function unscheduleExpense(expenseId: Id) {
    await scheduleExpense(expenseId, { start_time: null, end_time: null });
  }

  // ------------------------------------------------------------------- plan
  async function handlePlanFormSubmit(values: PlanInput) {
    if (!planId) return {};
    const { error: updateError } = await updatePlan(planId, values);
    if (updateError)
      return {
        error: t("planDetail:errors.write", { message: t("planDetail:writeErrors.genericUpdate"), detail: updateError.message }),
      };
    setPlan((prev) => (prev ? { ...prev, ...values } : prev));
    setPlanFormOpen(false);
    return {};
  }

  async function handleSetShareToken(token: string | null) {
    if (!planId) return;
    setPlan((prev) => (prev ? { ...prev, share_token: token } : prev));
    await commit(() => setPlanShareToken(planId, token), t("planDetail:writeErrors.shareLink"));
  }

  async function handleDeletePlan() {
    if (!planId) return;
    const { error: deleteError } = await deletePlan(planId);
    if (deleteError) {
      setError(t("planDetail:errors.deletePlan", { message: deleteError.message }));
      return;
    }
    navigate(ROUTES.PLANS, { replace: true });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl py-8">
        <div className="h-44 animate-pulse rounded-3xl bg-surface-elevated/70" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-elevated/60" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl py-14">
        <EmptyState
          title={t("planDetail:states.notFoundTitle")}
          hint={t("planDetail:states.notFoundHint")}
          action={
            <Button variant="primary" onClick={() => navigate(ROUTES.PLANS)}>
              {t("planDetail:states.backToPlans")}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-3.5">
        <Link
          to={ROUTES.PLANS}
          className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium text-text-secondary transition hover:bg-surface-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("planDetail:actions.back")}
        </Link>

        <Segmented<TabKey>
          value={tab}
          onChange={(value) => setSearchParams(value === "overview" ? {} : { tab: value })}
          options={TAB_ICONS.map(({ value, icon: Icon }) => ({
            value,
            label: (
              <span className="flex items-center gap-1.5 px-1 font-medium">
                <Icon className="h-4 w-4" />
                {t(`planDetail:tabs.${value}`)}
              </span>
            ),
          }))}
        />

        <div className="flex items-center gap-2">
          {isOwner && (
            <Button icon={<Share2 className="h-4 w-4" />} onClick={() => setShareOpen(true)}>
              {t("planDetail:actions.share")}
            </Button>
          )}
          <Button icon={<Pencil className="h-4 w-4" />} onClick={() => setPlanFormOpen(true)}>
            {t("planDetail:actions.edit")}
          </Button>
          {isOwner && (
            <Popconfirm
              title={t("planDetail:deletePlan.title")}
              description={t("planDetail:deletePlan.description")}
              okText={t("common:actions.delete")}
              cancelText={t("common:actions.cancel")}
              okButtonProps={{ danger: true }}
              onConfirm={handleDeletePlan}
            >
              <Button
                variant="text"
                icon={<Trash2 className="h-4 w-4" />}
                aria-label={t("planDetail:deletePlan.ariaLabel")}
              />
            </Popconfirm>
          )}
        </div>
      </Card>

      {error && (
        <p className="mb-4 rounded-xl border border-danger/20 bg-danger/8 px-3.5 py-2.5 text-xs text-danger">
          {error}
        </p>
      )}

      {tab === "overview" ? (
        <PlanOverview
          plan={plan}
          planUnits={planUnits}
          itemsByUnit={itemsByUnit}
          expenses={expenses}
          onStartBuilding={() => setSearchParams({ tab: "build" })}
          onEditUnit={(unit) => setUnitForm({ open: true, unit })}
          onEditExpense={(expense) => setExpenseForm({ open: true, expense })}
        />
      ) : tab === "schedule" ? (
        <PlanTimeline
          plan={plan}
          planUnits={planUnits}
          itemsByUnit={itemsByUnit}
          libraryItems={libraryItems}
          freeUnits={freeUnits}
          onScheduleUnit={(unitId, patch) => void scheduleUnit(unitId, patch)}
          onAttachAndScheduleUnit={(unitId, patch) => void attachAndScheduleUnit(unitId, patch)}
          onScheduleItem={(itemId, patch) => void scheduleItem(itemId, patch)}
          onAssignAndScheduleItem={(itemId, unitId, patch) => void assignAndScheduleItem(itemId, unitId, patch)}
          onUnassignItem={(itemId) => void moveItem(itemId, LIBRARY_LANE, null)}
          expenses={expenses}
          onScheduleExpense={(expenseId, patch) => void scheduleExpense(expenseId, patch)}
          onUnscheduleExpense={(expenseId) => void unscheduleExpense(expenseId)}
          onEditExpense={(expense) => setExpenseForm({ open: true, expense })}
          onDeleteExpense={(expenseId) => void handleDeleteExpense(expenseId)}
          onReorderUnits={(unitIds) => void reorderUnits(unitIds)}
          onReorderItems={(unitId, itemIds) => void reorderUnitItems(unitId, itemIds)}
          onEditUnit={(unit) => setUnitForm({ open: true, unit })}
          onRemoveUnit={(unitId) => void removeUnitFromPlan(unitId)}
          onDeleteUnit={(unitId) => setDeletingUnit(planUnits.find((u) => u.id === unitId) ?? null)}
          onCreateItem={(unitId) => setItemForm({ open: true, item: null, unitId })}
          onEditItem={(item) => setItemForm({ open: true, item, unitId: item.unit_id })}
          onDeleteItem={(itemId) => void handleDeleteItem(itemId)}
          onViewUnit={setViewingUnit}
          onViewItem={setViewingItem}
        />
      ) : tab === "expenses" ? (
        <PlanExpenses
          expenses={expenses}
          onCreate={() => setExpenseForm({ open: true, expense: null })}
          onEdit={(expense) => setExpenseForm({ open: true, expense })}
          onDelete={(expenseId) => void handleDeleteExpense(expenseId)}
        />
      ) : (
        <PlanBoard
          planUnits={planUnits}
          itemsByUnit={itemsByUnit}
          libraryItems={libraryItems}
          freeUnits={freeUnits}
          hasLocations={locations.length > 0}
          onMoveItem={(itemId, toLane, toIndex) => void moveItem(itemId, toLane, toIndex)}
          onReorderUnits={(unitIds) => void reorderUnits(unitIds)}
          onAddUnit={(unitId) => void addUnitToPlan(unitId)}
          onQuickCreateUnit={quickCreateUnit}
          onRemoveUnit={(unitId) => void removeUnitFromPlan(unitId)}
          onEditUnit={(unit) => setUnitForm({ open: true, unit })}
          onDeleteUnit={(unitId) => setDeletingUnit(planUnits.find((u) => u.id === unitId) ?? null)}
          onCreateUnit={() => setUnitForm({ open: true, unit: null })}
          onCreateItem={(unitId) => setItemForm({ open: true, item: null, unitId })}
          onEditItem={(item) => setItemForm({ open: true, item, unitId: item.unit_id })}
          onDeleteItem={(itemId) => void handleDeleteItem(itemId)}
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

      <PlanExpenseFormModal
        open={expenseForm.open}
        mode={expenseForm.expense ? "edit" : "create"}
        expense={expenseForm.expense}
        planId={planId}
        locations={locations}
        onClose={() => setExpenseForm({ open: false, expense: null })}
        onSubmit={handleExpenseFormSubmit}
      />

      <ShareModal
        open={shareOpen}
        plan={plan}
        onClose={() => setShareOpen(false)}
        onToggleShare={(token) => void handleSetShareToken(token)}
      />

      <UnitDetailModal
        open={!!viewingUnit}
        unit={viewingUnit}
        items={viewingUnit ? (itemsByUnit.get(viewingUnit.id) ?? []) : []}
        planName={plan?.name}
        onClose={() => setViewingUnit(null)}
        onEdit={(unit) => {
          setViewingUnit(null);
          setUnitForm({ open: true, unit });
        }}
      />

      <ItemDetailModal
        open={!!viewingItem}
        item={viewingItem}
        unitName={units.find((u) => u.id === viewingItem?.unit_id)?.name ?? null}
        onClose={() => setViewingItem(null)}
        onEdit={(item) => {
          setViewingItem(null);
          setItemForm({ open: true, item, unitId: item.unit_id });
        }}
      />

      <Modal
        open={!!deletingUnit}
        onClose={() => setDeletingUnit(null)}
        title={t("planDetail:deleteUnit.title")}
        width={440}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDeletingUnit(null)}>{t("common:actions.cancel")}</Button>
            <Button variant="danger" onClick={handleDeleteUnit}>
              {t("planDetail:deleteUnit.confirm")}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-text-secondary">
          {t("planDetail:deleteUnit.description", { name: deletingUnit?.name ?? "" })}
        </p>
      </Modal>
    </div>
  );
}
