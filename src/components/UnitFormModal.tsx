import { useEffect, useState, type FormEvent } from "react";
import { Popconfirm, InputNumber } from "antd";
import { Check, MapPin, Plus, Sparkles, X } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import Field from "../shared/components/Field";
import Input, { TextArea } from "../shared/components/Input";
import DatePicker from "../shared/components/DatePicker";
import DurationInput from "../shared/components/DurationInput";
import DualListPicker from "./DualListPicker";
import { useTranslation } from "../i18n/useAppTranslation";
import { formatDateTimeRange, formatDuration } from "../shared/utils/format";
import { DEFAULT_UNIT_DURATION_MINUTES } from "../shared/utils/schedule";
import type { Id, Item, Unit, UnitType } from "../shared/types/models";
import type { UnitInput } from "../services/units.service";

export interface UnitFormResult {
  error?: string;
}

interface UnitFormState {
  unit_type_id: Id | null;
  start_date: Dayjs | null;
  end_date: Dayjs | null;
  duration: number;
  break_minutes: number;
  name: string;
  description: string;
  itemIds: Id[];
}

function toFormState(unit: Unit | null | undefined, initialItemIds: Id[] | undefined): UnitFormState {
  return {
    unit_type_id: unit?.unit_type_id ?? null,
    start_date: unit?.start_date ? dayjs(unit.start_date) : null,
    end_date: unit?.end_date ? dayjs(unit.end_date) : null,
    duration: unit?.duration_minutes ?? DEFAULT_UNIT_DURATION_MINUTES,
    break_minutes: unit?.break_minutes ?? 0,
    name: unit?.name ?? "",
    description: unit?.description ?? "",
    itemIds: initialItemIds ?? [],
  };
}

function ActivityThumb({ item }: { item: Item }) {
  const image = item.locations?.find((location) => location.images?.length)?.images?.[0];
  return image ? (
    <img src={image} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-border/10 object-cover" />
  ) : (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/10 bg-surface-secondary/80 text-text-muted">
      <Sparkles className="h-4 w-4" />
    </div>
  );
}

interface UnitTypePickerProps {
  types: UnitType[];
  selectedId: Id | null;
  onSelect: (id: Id | null) => void;
  onCreate?: (name: string) => Promise<UnitType | null>;
  onDelete: (id: Id) => void;
}

function UnitTypePicker({ types, selectedId, onSelect, onCreate, onDelete }: UnitTypePickerProps) {
  const { t } = useTranslation("common");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = await onCreate?.(trimmed);
    if (created) onSelect(created.id);
    setName("");
    setAdding(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {types.map((type) => {
        const selected = type.id === selectedId;
        return (
          <span
            key={type.id}
            onClick={() => onSelect(selected ? null : type.id)}
            className={`group inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition ${
              selected
                ? "gradient-brand text-white ring-transparent shadow-xs"
                : "bg-surface-elevated text-text-secondary ring-border/60 hover:bg-surface-secondary"
            }`}
          >
            {type.name}
            <Popconfirm
              title="Delete this type?"
              okText={t("actions.delete")}
              cancelText={t("actions.cancel")}
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(type.id)}
            >
              <X
                onClick={(event) => event.stopPropagation()}
                className={`h-3 w-3 transition ${
                  selected ? "text-white/60 hover:text-white" : "text-text-muted hover:text-danger"
                }`}
              />
            </Popconfirm>
          </span>
        );
      })}

      {adding ? (
        <span className="inline-flex items-center gap-1">
          <Input
            size="small"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onPressEnter={submit}
            onBlur={() => !name.trim() && setAdding(false)}
            placeholder="..."
            style={{ width: 130 }}
          />
          <Button size="small" variant="primary" onClick={submit} icon={<Check className="h-3.5 w-3.5" />} />
        </span>
      ) : (
        onCreate && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/16 bg-surface-elevated/42 px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-primary/18 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("actions.add")}
          </button>
        )
      )}
    </div>
  );
}

export interface UnitFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  unit: Unit | null;
  cloneFrom?: Unit | null;
  initialItemIds?: Id[];
  items?: Item[];
  unitTypes?: UnitType[];
  showItemPicker?: boolean;
  onClose: () => void;
  onSubmit: (values: UnitInput) => Promise<UnitFormResult | void>;
  onCreateType?: (name: string) => Promise<UnitType | null>;
  onDeleteType?: (id: Id) => void;
}

export default function UnitFormModal({
  open,
  mode,
  unit,
  cloneFrom,
  initialItemIds,
  items = [],
  unitTypes = [],
  showItemPicker = true,
  onClose,
  onSubmit,
  onCreateType,
  onDeleteType,
}: UnitFormModalProps) {
  const { t } = useTranslation(["common", "forms", "validation"]);
  const [form, setForm] = useState<UnitFormState>(() => toFormState(unit ?? cloneFrom, initialItemIds));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(unit ?? cloneFrom, initialItemIds));
      setError("");
    }
  }, [open, unit, cloneFrom, initialItemIds]);

  const manualMinutes = Math.max(form.duration || 0, 0);
  const previewEnd = form.end_date ?? form.start_date?.add(manualMinutes, "minute") ?? null;
  const previewRange =
    form.start_date && previewEnd ? formatDateTimeRange(form.start_date, previewEnd) : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError(t("validation:unitNameRequired"));
      return;
    }
    if (form.end_date && form.start_date && !form.end_date.isAfter(form.start_date)) {
      setError(t("validation:endAfterStart"));
      return;
    }
    if (!form.end_date && manualMinutes <= 0) {
      setError(t("validation:unitDurationPositive"));
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      name: form.name.trim(),
      description: form.description,
      unit_type_id: form.unit_type_id,
      start_date: form.start_date ? form.start_date.toISOString() : null,
      end_date: form.end_date ? form.end_date.toISOString() : null,
      duration_minutes: manualMinutes || DEFAULT_UNIT_DURATION_MINUTES,
      break_minutes: form.break_minutes,
      itemIds: showItemPicker ? form.itemIds : undefined,
    });
    setSubmitting(false);

    if (result?.error) setError(result.error);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? t("forms:unit.editTitle") : t("forms:unit.createTitle")}
      footer={null}
      width={showItemPicker ? 880 : 560}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Field label={t("forms:unit.fields.name")}>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="..."
            autoFocus
          />
        </Field>

        <Field label={t("forms:unit.fields.type")} hint={t("forms:unit.hints.type")}>
          <UnitTypePicker
            types={unitTypes}
            selectedId={form.unit_type_id}
            onSelect={(unit_type_id) => setForm((current) => ({ ...current, unit_type_id }))}
            onCreate={onCreateType}
            onDelete={(id) => {
              onDeleteType?.(id);
              if (form.unit_type_id === id) setForm((current) => ({ ...current, unit_type_id: null }));
            }}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("forms:unit.fields.start")}>
            <DatePicker
              className="w-full"
              showTime={{ format: "HH:mm", minuteStep: 5 }}
              format="DD/MM/YYYY HH:mm"
              value={form.start_date}
              onChange={(date) => setForm((current) => ({ ...current, start_date: date }))}
            />
          </Field>
          <Field label={t("forms:unit.fields.end")}>
            <DatePicker
              className="w-full"
              showTime={{ format: "HH:mm", minuteStep: 5 }}
              format="DD/MM/YYYY HH:mm"
              value={form.end_date}
              onChange={(date) => setForm((current) => ({ ...current, end_date: date }))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("forms:unit.fields.duration")} hint={t("forms:unit.hints.duration")}>
            <DurationInput
              value={form.duration}
              onChange={(duration) => setForm((current) => ({ ...current, duration }))}
              disabled={Boolean(form.end_date)}
            />
          </Field>
          <Field label={t("forms:unit.fields.breakMinutes")}>
            <InputNumber
              className="w-full"
              min={0}
              value={form.break_minutes}
              onChange={(value) => setForm((current) => ({ ...current, break_minutes: value ?? 0 }))}
              placeholder="0"
            />
          </Field>
        </div>

        <p className="rounded-xl border border-primary/14 bg-primary/10 px-3.5 py-2 text-xs leading-relaxed text-primary">
          {previewRange ? previewRange : "..."}
          {!previewRange && ` ${formatDuration(manualMinutes) ?? ""}`.trim()}
        </p>

        <Field label={t("forms:unit.fields.description")} hint={t("forms:unit.hints.description")}>
          <TextArea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="..."
            rows={2}
          />
        </Field>

        {showItemPicker && (
          <Field label={t("forms:unit.fields.items")} hint={t("forms:unit.hints.items")}>
            <DualListPicker
              poolLabel="Pool"
              selectedLabel="Selected"
              searchPlaceholder="Search..."
              emptyPoolText="No matching activities."
              emptySelectedText="No activities selected."
              items={items.filter((currentItem) => !currentItem.unit_id || currentItem.unit_id === unit?.id)}
              selectedIds={form.itemIds}
              onChange={(itemIds) => setForm((current) => ({ ...current, itemIds }))}
              renderThumb={(item) => <ActivityThumb item={item} />}
              renderMeta={(item) => (
                <p className="truncate text-[11px] text-text-muted">
                  {item.locations?.length > 0 ? (
                    <>
                      <MapPin className="mr-0.5 inline h-3 w-3" />
                      {item.locations.map((location) => location.name).join(", ")}
                    </>
                  ) : (
                    "No location"
                  )}
                </p>
              )}
            />
          </Field>
        )}

        {error && (
          <p className="rounded-xl border border-danger/20 bg-danger/8 px-3.5 py-2.5 text-xs text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose}>{t("common:actions.cancel")}</Button>
          <Button variant="primary" htmlType="submit" loading={submitting}>
            {mode === "edit" ? t("common:actions.saveChanges") : t("common:actions.add")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
