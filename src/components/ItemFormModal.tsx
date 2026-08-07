import { useEffect, useState, type FormEvent } from "react";
import { InputNumber } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { MapPin } from "lucide-react";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import Field from "../shared/components/Field";
import Input, { TextArea } from "../shared/components/Input";
import DatePicker from "../shared/components/DatePicker";
import DurationInput from "../shared/components/DurationInput";
import DualListPicker from "./DualListPicker";
import { useTranslation } from "../i18n/useAppTranslation";
import { formatDuration } from "../shared/utils/format";
import { itemDurationMinutes } from "../shared/utils/schedule";
import type { Id, Item, ItemLocation, LocationRow } from "../shared/types/models";
import type { ItemInput } from "../services/items.service";

const { RangePicker } = DatePicker;

export interface ItemFormResult {
  error?: string;
}

interface ItemFormState {
  locationIds: Id[];
  name: string;
  price: number | null;
  timeRange: [Dayjs | null, Dayjs | null] | null;
  duration: number;
  note: string;
}

function toFormState(item: Item | null | undefined): ItemFormState {
  return {
    locationIds: item?.locations?.map((loc) => loc.id) ?? [],
    name: item?.name ?? "",
    price: item?.price ?? null,
    timeRange: item?.start_time
      ? [dayjs(item.start_time), item.end_time ? dayjs(item.end_time) : null]
      : null,
    duration: itemDurationMinutes(item),
    note: item?.note ?? "",
  };
}

export function LocationThumb({
  location,
  size = "h-9 w-9",
}: {
  location: ItemLocation | LocationRow;
  size?: string;
}) {
  return location.images?.[0] ? (
    <img
      src={location.images[0]}
      alt=""
      className={`${size} shrink-0 rounded-lg border border-border/10 object-cover`}
    />
  ) : (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-lg border border-border/10 bg-surface-secondary/80 text-text-muted`}
    >
      <MapPin className="h-4 w-4" />
    </div>
  );
}

export interface ItemFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  item: Item | null;
  cloneFrom?: Item | null;
  locations: LocationRow[];
  onClose: () => void;
  onSubmit: (values: ItemInput) => Promise<ItemFormResult | void>;
}

export default function ItemFormModal({
  open,
  mode,
  item,
  cloneFrom,
  locations,
  onClose,
  onSubmit,
}: ItemFormModalProps) {
  const { t } = useTranslation(["common", "forms", "validation"]);
  const [form, setForm] = useState<ItemFormState>(() => toFormState(item ?? cloneFrom));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(item ?? cloneFrom));
      setError("");
    }
  }, [open, item, cloneFrom]);

  const start = form.timeRange?.[0] ?? null;
  const end = form.timeRange?.[1] ?? null;
  const derivedMinutes = start && end ? Math.max(end.diff(start, "minute"), 0) : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError(t("validation:itemNameRequired"));
      return;
    }
    if (start && end && !end.isAfter(start)) {
      setError(t("validation:endAfterStart"));
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      locationIds: form.locationIds,
      name: form.name.trim(),
      price: form.price,
      start_time: start ? start.toISOString() : null,
      end_time: end ? end.toISOString() : null,
      duration_minutes: derivedMinutes ?? (form.duration || null),
      note: form.note,
    });
    setSubmitting(false);

    if (result?.error) setError(result.error);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? t("forms:item.editTitle") : t("forms:item.createTitle")}
      footer={null}
      width={880}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Field label={t("forms:item.fields.name")}>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="..."
            autoFocus
          />
        </Field>

        <Field label={t("forms:item.fields.timeRange")} hint={t("forms:item.hints.timeRange")}>
          <RangePicker
            className="w-full"
            showTime={{ format: "HH:mm", minuteStep: 5 }}
            format="DD/MM/YYYY HH:mm"
            allowEmpty={[false, true]}
            value={form.timeRange}
            onChange={(range) =>
              setForm((current) => ({
                ...current,
                timeRange: range ? [range[0] ?? null, range[1] ?? null] : null,
              }))
            }
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label={t("forms:item.fields.duration")}
            hint={
              derivedMinutes != null
                ? t("forms:item.hints.duration.derived")
                : t("forms:item.hints.duration.optional")
            }
          >
            <DurationInput
              value={derivedMinutes ?? form.duration}
              onChange={(duration) => setForm((current) => ({ ...current, duration }))}
              disabled={derivedMinutes != null}
            />
          </Field>
          <Field label={t("forms:item.fields.price")} hint={t("forms:item.hints.price")}>
            <InputNumber
              className="w-full"
              min={0}
              value={form.price}
              onChange={(price) => setForm((current) => ({ ...current, price }))}
              placeholder="0"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              parser={(value) => Number((value ?? "").replace(/\./g, ""))}
            />
          </Field>
        </div>

        {derivedMinutes != null && (
          <p className="rounded-xl border border-primary/14 bg-primary/10 px-3.5 py-2 text-xs text-primary">
            {formatDuration(derivedMinutes) ?? "0"}
          </p>
        )}

        <Field
          label={t("forms:item.fields.locations")}
          hint={
            locations.length === 0
              ? "No locations yet"
              : "Right column order is the visit order"
          }
        >
          <DualListPicker
            poolLabel="Pool"
            selectedLabel="Selected"
            searchPlaceholder="Search..."
            emptyPoolText="No matching locations."
            emptySelectedText="No locations selected."
            items={locations}
            selectedIds={form.locationIds}
            onChange={(locationIds) => setForm((current) => ({ ...current, locationIds }))}
            renderThumb={(location) => <LocationThumb location={location} />}
            renderMeta={(location) => (
              <p className="truncate font-mono text-[11px] text-text-muted tnum">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
            )}
          />
        </Field>

        <Field label={t("forms:item.fields.note")} hint={t("forms:item.hints.note")}>
          <TextArea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="..."
            rows={2}
          />
        </Field>

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
