import { useEffect, useState, type FormEvent } from "react";
import dayjs, { type Dayjs } from "dayjs";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import Field from "../shared/components/Field";
import Input, { TextArea } from "../shared/components/Input";
import DatePicker from "../shared/components/DatePicker";
import { useTranslation } from "../i18n/useAppTranslation";
import type { Plan } from "../shared/types/models";
import type { PlanInput } from "../services/plans.service";

const { RangePicker } = DatePicker;

export interface PlanFormResult {
  error?: string;
}

interface PlanFormState {
  dateRange: [Dayjs, Dayjs] | null;
  name: string;
  description: string;
}

function toFormState(plan: Plan | null | undefined): PlanFormState {
  return {
    dateRange:
      plan?.start_date && plan?.end_date ? [dayjs(plan.start_date), dayjs(plan.end_date)] : null,
    name: plan?.name ?? "",
    description: plan?.description ?? "",
  };
}

export interface PlanFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  plan: Plan | null;
  onClose: () => void;
  onSubmit: (values: PlanInput) => Promise<PlanFormResult | void>;
}

export default function PlanFormModal({ open, mode, plan, onClose, onSubmit }: PlanFormModalProps) {
  const { t } = useTranslation(["common", "forms", "validation"]);
  const [form, setForm] = useState<PlanFormState>(() => toFormState(plan));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(plan));
      setError("");
    }
  }, [open, plan]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError(t("validation:planNameRequired"));
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      name: form.name.trim(),
      description: form.description,
      start_date: form.dateRange ? form.dateRange[0].format("YYYY-MM-DD") : null,
      end_date: form.dateRange ? form.dateRange[1].format("YYYY-MM-DD") : null,
    });
    setSubmitting(false);

    if (result?.error) setError(result.error);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? t("forms:plan.editTitle") : t("forms:plan.createTitle")}
      footer={null}
      width={520}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Field label={t("forms:plan.fields.name")}>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: Tet 2026 - Da Lat"
            autoFocus
          />
        </Field>

        <Field label={t("forms:plan.fields.dateRange")} hint={t("forms:plan.hints.dateRange")}>
          <RangePicker
            className="w-full"
            format="DD/MM/YYYY"
            value={form.dateRange}
            onChange={(range) =>
              setForm((current) => ({
                ...current,
                dateRange: range?.[0] && range[1] ? [range[0], range[1]] : null,
              }))
            }
          />
        </Field>

        <Field label={t("forms:plan.fields.description")} hint={t("forms:plan.hints.description")}>
          <TextArea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="..."
            rows={3}
          />
        </Field>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose}>{t("common:actions.cancel")}</Button>
          <Button variant="primary" htmlType="submit" loading={submitting}>
            {mode === "edit" ? t("common:actions.saveChanges") : t("common:actions.create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
