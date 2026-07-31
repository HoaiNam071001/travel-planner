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
  /** [bắt đầu, kết thúc] — kết thúc có thể để trống, khi đó dùng thời lượng. */
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
      className={`${size} shrink-0 rounded-lg border border-slate-200 object-cover`}
    />
  ) : (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400`}
    >
      <MapPin className="h-4 w-4" />
    </div>
  );
}

export interface ItemFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  item: Item | null;
  /** Chỉ dùng để "mồi" giá trị ban đầu khi nhân bản (mode vẫn là "create", `item` vẫn null). */
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
  // Có mốc kết thúc thì mốc kết thúc thắng — thời lượng chỉ còn là số hiển thị.
  const derivedMinutes = start && end ? Math.max(end.diff(start, "minute"), 0) : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Cần nhập tên hoạt động.");
      return;
    }
    if (start && end && !end.isAfter(start)) {
      setError("Thời gian kết thúc phải sau thời gian bắt đầu.");
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
      title={mode === "edit" ? "Sửa hoạt động" : "Thêm hoạt động mới"}
      footer={null}
      width={880}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Field label="Tên hoạt động">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: Ăn trưa, tham quan bảo tàng..."
            autoFocus
          />
        </Field>

        <Field label="Bắt đầu - kết thúc" hint="không bắt buộc — có thể chỉ nhập giờ bắt đầu">
          <RangePicker
            className="w-full"
            showTime={{ format: "HH:mm", minuteStep: 5 }}
            format="DD/MM/YYYY HH:mm"
            allowEmpty={[false, true]}
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
          <p className="rounded-xl border border-brand-100 bg-brand-50/70 px-3.5 py-2 text-xs text-brand-800">
            Thời lượng {formatDuration(derivedMinutes) ?? "0 phút"} được tính từ khung giờ đã chọn.
          </p>
        )}

        <Field
          label="Địa điểm"
          hint={
            locations.length === 0
              ? "chưa có địa điểm nào — thêm ở trang Địa điểm"
              : "thứ tự bên phải là thứ tự ghé qua"
          }
        >
          <DualListPicker
            poolLabel="Chọn địa điểm"
            selectedLabel="Đã chọn"
            searchPlaceholder="Tìm theo tên địa điểm..."
            emptyPoolText="Không tìm thấy địa điểm nào."
            emptySelectedText="Chưa chọn địa điểm nào."
            items={locations}
            selectedIds={form.locationIds}
            onChange={(locationIds) => setForm((f) => ({ ...f, locationIds }))}
            renderThumb={(location) => <LocationThumb location={location} />}
            renderMeta={(location) => (
              <p className="truncate font-mono text-[11px] text-slate-400 tnum">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
            )}
          />
        </Field>

        <Field label="Ghi chú" hint="không bắt buộc">
          <TextArea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Ghi chú ngắn về hoạt động này"
            rows={2}
          />
        </Field>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose}>Huỷ</Button>
          <Button variant="primary" htmlType="submit" loading={submitting}>
            {mode === "edit" ? "Lưu thay đổi" : "Thêm hoạt động"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
