import { useEffect, useState } from "react";
import { InputNumber, TimePicker } from "antd";
import { MapPin } from "lucide-react";
import dayjs from "dayjs";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import Field from "../shared/components/Field";
import Input, { TextArea } from "../shared/components/Input";
import DualListPicker from "./DualListPicker";

const { RangePicker } = TimePicker;

function toFormState(item) {
  return {
    locationIds: item?.locations?.map((loc) => loc.id) ?? [],
    name: item?.name ?? "",
    price: item?.price ?? null,
    timeRange:
      item?.start_time && item?.end_time
        ? [dayjs(item.start_time, "HH:mm:ss"), dayjs(item.end_time, "HH:mm:ss")]
        : null,
    note: item?.note ?? "",
  };
}

export function LocationThumb({ location, size = "h-9 w-9" }) {
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

export default function ItemFormModal({ open, mode, item, locations, onClose, onSubmit }) {
  const [form, setForm] = useState(() => toFormState(item));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(item));
      setError("");
    }
  }, [open, item]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Cần nhập tên hoạt động.");
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      locationIds: form.locationIds,
      name: form.name.trim(),
      price: form.price,
      start_time: form.timeRange ? form.timeRange[0].format("HH:mm:ss") : null,
      end_time: form.timeRange ? form.timeRange[1].format("HH:mm:ss") : null,
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Khung giờ" hint="không bắt buộc">
            <RangePicker
              className="w-full"
              format="HH:mm"
              minuteStep={5}
              value={form.timeRange}
              onChange={(timeRange) => setForm((f) => ({ ...f, timeRange }))}
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
              parser={(value) => value.replace(/\./g, "")}
            />
          </Field>
        </div>

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
