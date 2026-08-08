import { useEffect, useMemo, useState } from "react";
import { Route as RouteIcon, Plus } from "lucide-react";
import {
  listUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  type UnitInput,
} from "../services/units.service";
import { listItems } from "../services/items.service";
import { listPlans } from "../services/plans.service";
import { listUnitTypes, createUnitType, deleteUnitType } from "../services/unitTypes.service";
import { useTranslation } from "../i18n/useAppTranslation";
import { groupItemsByUnit, unitStats } from "../shared/utils/planStats";
import type { Id, Item, Plan, Unit, UnitType } from "../shared/types/models";
import Button from "../shared/components/Button";
import EmptyState from "../shared/components/EmptyState";
import PageHeader from "../shared/components/PageHeader";
import UnitCard from "../components/UnitCard";
import UnitFormModal from "../components/UnitFormModal";
import UnitDetailModal from "../components/UnitDetailModal";
import UnitTypeFilterBar from "../components/UnitTypeFilterBar";

interface FormModalState {
  open: boolean;
  mode: "create" | "edit";
  unit: Unit | null;
  cloneFrom: Unit | null;
  initialItemIds: Id[];
  previousItemIds: Id[];
}

export default function UnitsPage() {
  const { t } = useTranslation(["units", "common"]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formModal, setFormModal] = useState<FormModalState>({
    open: false,
    mode: "create",
    unit: null,
    cloneFrom: null,
    initialItemIds: [],
    previousItemIds: [],
  });
  const [detailUnit, setDetailUnit] = useState<Unit | null>(null);
  const [typeFilter, setTypeFilter] = useState<Id | null>(null);

  useEffect(() => {
    void loadData();
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
      setError(t("units:errors.load", { message: unitsRes.error.message }));
    } else {
      setUnits(unitsRes.data ?? []);
      setError("");
    }
    setItems(itemsRes.data ?? []);
    setUnitTypes(typesRes.data ?? []);
    setPlans(plansRes.data ?? []);
    setLoading(false);
  }

  const itemsByUnit = useMemo(() => groupItemsByUnit(items), [items]);
  const planNameById = useMemo(() => new Map(plans.map((p) => [p.id, p.name] as const)), [plans]);

  function openCreateModal() {
    setFormModal({
      open: true,
      mode: "create",
      unit: null,
      cloneFrom: null,
      initialItemIds: [],
      previousItemIds: [],
    });
  }

  function openEditModal(unit: Unit) {
    setDetailUnit(null);
    const currentItemIds = (itemsByUnit.get(unit.id) ?? []).map((i) => i.id);
    setFormModal({
      open: true,
      mode: "edit",
      unit,
      cloneFrom: null,
      initialItemIds: currentItemIds,
      previousItemIds: currentItemIds,
    });
  }

  function openCloneModal(unit: Unit) {
    setDetailUnit(null);
    setFormModal({
      open: true,
      mode: "create",
      unit: null,
      cloneFrom: unit,
      initialItemIds: [],
      previousItemIds: [],
    });
  }

  function closeFormModal() {
    setFormModal((prev) => ({ ...prev, open: false }));
  }

  async function handleDelete(id: Id) {
    const { error: deleteError } = await deleteUnit(id);
    if (deleteError) {
      setError(t("units:errors.delete", { message: deleteError.message }));
      return;
    }
    if (detailUnit?.id === id) setDetailUnit(null);
    await loadData();
  }

  async function handleFormSubmit(values: UnitInput) {
    const result =
      formModal.mode === "edit" && formModal.unit
        ? await updateUnit(formModal.unit.id, values, formModal.previousItemIds)
        : await createUnit(values);

    if (result.error) {
      return {
        error: t(formModal.mode === "edit" ? "units:errors.save" : "units:errors.create", {
          message: result.error.message,
        }),
      };
    }

    closeFormModal();
    await loadData();
    return {};
  }

  async function handleCreateType(name: string): Promise<UnitType | null> {
    const { data, error: createError } = await createUnitType(name);
    if (createError || !data) {
      setError(t("units:errors.createType", { message: createError?.message ?? "" }));
      return null;
    }
    setUnitTypes((prev) => [...prev, data]);
    return data;
  }

  async function handleDeleteType(id: Id) {
    const { error: deleteError } = await deleteUnitType(id);
    if (deleteError) {
      setError(t("units:errors.deleteType", { message: deleteError.message }));
      return;
    }
    setUnitTypes((prev) => prev.filter((type) => type.id !== id));
    setUnits((prev) =>
      prev.map((unit) => (unit.unit_type_id === id ? { ...unit, unit_type_id: null, unit_type: null } : unit))
    );
    setTypeFilter((prev) => (prev === id ? null : prev));
  }

  const filteredUnits = typeFilter ? units.filter((unit) => unit.unit_type_id === typeFilter) : units;

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <PageHeader
        icon={RouteIcon}
        title={t("units:title")}
        subtitle={t("units:subtitle")}
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            {t("units:create")}
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
          <span className="text-xs text-text-muted tnum">{t("units:count", { count: filteredUnits.length })}</span>
        </div>
      </PageHeader>

      {error && <p className="mb-4 rounded-xl bg-danger/10 px-3.5 py-2.5 text-xs text-danger">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface-soft h-52 animate-pulse" />
          ))}
        </div>
      ) : filteredUnits.length === 0 ? (
        <EmptyState
          icon={RouteIcon}
          title={units.length === 0 ? t("units:empty.defaultTitle") : t("units:empty.filteredTitle")}
          hint={units.length === 0 ? t("units:empty.defaultHint") : t("units:empty.filteredHint")}
          action={
            units.length === 0 && (
              <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
                {t("units:create")}
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
              planName={unit.plan_id ? planNameById.get(unit.plan_id) : null}
              onOpenDetail={setDetailUnit}
              onEdit={openEditModal}
              onClone={openCloneModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <UnitFormModal
        open={formModal.open}
        mode={formModal.mode}
        unit={formModal.unit}
        cloneFrom={formModal.cloneFrom}
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
        items={detailUnit ? (itemsByUnit.get(detailUnit.id) ?? []) : []}
        planName={detailUnit?.plan_id ? planNameById.get(detailUnit.plan_id) : null}
        onClose={() => setDetailUnit(null)}
        onEdit={openEditModal}
        onClone={openCloneModal}
      />
    </div>
  );
}
