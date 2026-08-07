import { useEffect, useState, type FormEvent } from "react";
import { InputNumber, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { MapPin } from "lucide-react";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import Field from "../shared/components/Field";
import Input, { TextArea } from "../shared/components/Input";
import DatePicker from "../shared/components/DatePicker";
import DurationInput from "../shared/components/DurationInput";
import { LocationThumb } from "./ItemFormModal";
import { formatDuration } from "../shared/utils/format";
import { itemDurationMinutes } from "../shared/utils/schedule";
import type { Id, LocationRow, PlanExpense } from "../shared/types/models";
import type { PlanExpenseInput } from "../services/planExpenses.service";

const { RangePicker } = DatePicker;

export interface PlanExpenseFormResult {
  error?: string;
}

interface PlanExpenseFormState {
  name: string;
  price: number | null;
  link: string;
  note: string;
  locationId: Id | null;
  /** [bắt đầu, kết thúc] — cả 2 đầu đều optional, khác Item (item bắt buộc có bắt đầu). */
  timeRange: [Dayjs | null, Dayjs | null] | null;
  duration: number;
}

function toFormState(expense: PlanExpense | null | undefined): PlanExpenseFormState {
  return {
    name: expense?.name ?? "",
    price: expense?.price ?? null,
    link: expense?.link ?? "",
    note: expense?.note ?? "",
    locationId: expense?.location_id ?? null,
    timeRange: expense?.start_time
      ? [dayjs(expense.start_time), expense.end_time ? dayjs(expense.end_time) : null]
      : expense?.end_time
        ? [null, dayjs(expense.end_time)]
        : null,
    duration: itemDurationMinutes(expense),
  };
}

export interface PlanExpenseFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  expense: PlanExpense | null;
  planId: Id | undefined;
  locations: LocationRow[];
  onClose: () => void;
  onSubmit: (values: PlanExpenseInput) => Promise<PlanExpenseFormResult | void>;
}

export default function PlanExpenseFormModal({
  open,
  mode,
  expense,
  planId,
  locations,
  onClose,
  onSubmit,
}: PlanExpenseFormModalProps) {
  const [form, setForm] = useState<PlanExpenseFormState>(() => toFormState(expense));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(expense));
      setError("");
    }
  }, [open, expense]);

  const start = form.timeRange?.[0] ?? null;
  const end = form.timeRange?.[1] ?? null;
  // Có cả 2 mốc thì mốc kết thúc thắng — thời lượng chỉ còn là số hiển thị (giống Item).
  const derivedMinutes = start && end ? Math.max(end.diff(start, "minute"), 0) : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Cần nhập tên khoản chi phí.");
      return;
    }
    if (!planId) return;
    if (start && end && !end.isAfter(start)) {
      setError("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      plan_id: planId,
      name: form.name.trim(),
      price: form.price,
      link: form.link.trim() || null,
      note: form.note.trim() || null,
      location_id: form.locationId,
      start_time: start ? start.toISOString() : null,
      end_time: end ? end.toISOString() : null,
      duration_minutes: derivedMinutes ?? (form.duration || null),
    });
    setSubmitting(false);

    if (result?.error) setError(result.error);
  }

  const selectedLocation = locations.find((loc) => loc.id === form.locationId) ?? null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Sửa chi phí" : "Thêm chi phí khác"}
      footer={null}
      width={640}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Field label="Tên khoản chi phí">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: Vé máy bay, thuê khách sạn, mua sắm..."
            autoFocus
          />
        </Field>

        <Field label="Bắt đầu - kết thúc" hint="không bắt buộc — để trống nếu chỉ là 1 khoản chi phí">
          <RangePicker
            className="w-full"
            showTime={{ format: "HH:mm", minuteStep: 5 }}
            format="DD/MM/YYYY HH:mm"
            allowEmpty={[true, true]}
            value={form.timeRange}
            onChange={(range) =>
              setForm((f) => ({
                ...f,
                timeRange: range ? [range[0] ?? null, range[1] ?? null] : null,
              }))
            }
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Khoảng thời gian"
            hint={derivedMinutes != null ? "tính từ khung giờ" : "không bắt buộc"}
          >
            <DurationInput
              value={derivedMinutes ?? form.duration}
              onChange={(duration) => setForm((f) => ({ ...f, duration }))}
              disabled={derivedMinutes != null}
            />
          </Field>
          <Field label="Giá (đ)" hint="không bắt buộc">
            <InputNumber
              className="w-full"
              min={0}
              value={form.price}
              onChange={(price) => setForm((f) => ({ ...f, price }))}
              placeholder="0"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              parser={(value) => Number((value ?? "").replace(/\./g, ""))}
            />
          </Field>
        </div>

        {derivedMinutes != null && (
          <p className="rounded-xl border border-primary/14 bg-primary/10 px-3.5 py-2 text-xs text-primary">
            Thời lượng {formatDuration(derivedMinutes) ?? "0 phút"} được tính từ khung giờ đã chọn.
          </p>
        )}

        <Field
          label="Địa điểm"
          hint={locations.length === 0 ? "chưa có địa điểm nào — thêm ở trang Địa điểm" : "không bắt buộc"}
        >
          <div className="flex items-center gap-2">
            {selectedLocation && <LocationThumb location={selectedLocation} size="h-9 w-9" />}
            <Select
              className="w-full"
              showSearch
              allowClear
              placeholder="Không gắn địa điểm nào"
              value={form.locationId ?? undefined}
              onChange={(value) => setForm((f) => ({ ...f, locationId: value ?? null }))}
              onClear={() => setForm((f) => ({ ...f, locationId: null }))}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
              notFoundContent={
                <span className="flex items-center gap-1.5 px-1 py-1 text-xs text-text-muted">
                  <MapPin className="h-3.5 w-3.5" /> Không tìm thấy địa điểm.
                </span>
              }
            />
          </div>
        </Field>

        <Field label="Link" hint="không bắt buộc — vd link đặt phòng/vé">
          <Input
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            placeholder="https://..."
          />
        </Field>

        <Field label="Ghi chú" hint="không bắt buộc">
          <TextArea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Ghi chú ngắn về khoản chi phí này"
            rows={2}
          />
        </Field>

        {error && (
          <p className="rounded-xl border border-danger/20 bg-danger/8 px-3.5 py-2.5 text-xs text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose}>Huỷ</Button>
          <Button variant="primary" htmlType="submit" loading={submitting}>
            {mode === "edit" ? "Lưu thay đổi" : "Thêm chi phí"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
