import { useEffect, useState } from "react";
import { Popconfirm, InputNumber as AntInputNumber } from "antd";
import { Check, MapPin, Plus, Sparkles, X } from "lucide-react";
import dayjs from "dayjs";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import Field from "../shared/components/Field";
import Input, { TextArea } from "../shared/components/Input";
import DatePicker from "../shared/components/DatePicker";
import DualListPicker from "./DualListPicker";

const InputNumber = AntInputNumber;

function toFormState(unit, initialItemIds) {
  return {
    unit_type_id: unit?.unit_type_id ?? null,
    start_date: unit?.start_date ? dayjs(unit.start_date) : null,
    break_minutes: unit?.break_minutes ?? 0,
    name: unit?.name ?? "",
    description: unit?.description ?? "",
    itemIds: initialItemIds ?? [],
  };
}

function ActivityThumb({ item }) {
  const image = item.locations?.find((l) => l.images?.length)?.images?.[0];
  return image ? (
    <img
      src={image}
      alt=""
      className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover"
    />
  ) : (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
      <Sparkles className="h-4 w-4" />
    </div>
  );
}

// Chip chọn "loại" chặng — danh sách động do user tự tạo (bảng unit_types).
function UnitTypePicker({ types, selectedId, onSelect, onCreate, onDelete }) {
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
            className={`group inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition ${
              selected
                ? "bg-brand-600 text-white ring-brand-600"
                : "bg-white text-slate-600 ring-slate-200 hover:ring-brand-300"
            }`}
          >
            {type.name}
            <Popconfirm
              title="Xoá loại này?"
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(type.id)}
            >
              <X
                onClick={(e) => e.stopPropagation()}
                className={`h-3 w-3 transition ${
                  selected
                    ? "text-white/60 hover:text-white"
                    : "text-slate-300 hover:text-rose-600"
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
            placeholder="Tên loại mới"
            style={{ width: 130 }}
          />
          <Button size="small" variant="primary" onClick={submit} icon={<Check className="h-3.5 w-3.5" />} />
        </span>
      ) : (
        onCreate && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm loại
          </button>
        )
      )}
    </div>
  );
}

export default function UnitFormModal({
  open,
  mode,
  unit,
  initialItemIds,
  items = [],
  unitTypes = [],
  // Trong Plan Builder việc gắn hoạt động đã làm bằng kéo-thả nên ẩn picker đi;
  // khi ẩn, `itemIds` không được gửi lên -> updateUnit không đụng tới quan hệ.
  showItemPicker = true,
  onClose,
  onSubmit,
  onCreateType,
  onDeleteType,
}) {
  const [form, setForm] = useState(() => toFormState(unit, initialItemIds));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(unit, initialItemIds));
      setError("");
    }
  }, [open, unit, initialItemIds]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Cần nhập tên chặng.");
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      name: form.name.trim(),
      description: form.description,
      unit_type_id: form.unit_type_id,
      start_date: form.start_date ? form.start_date.toISOString() : null,
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
      title={mode === "edit" ? "Sửa chặng" : "Thêm chặng mới"}
      footer={null}
      width={showItemPicker ? 880 : 560}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Field label="Tên chặng">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: Ngày 1 - Sài Gòn, Tuần 1..."
            autoFocus
          />
        </Field>

        <Field label="Loại" hint="tự tạo, vd Ngày / Tuần">
          <UnitTypePicker
            types={unitTypes}
            selectedId={form.unit_type_id}
            onSelect={(unit_type_id) => setForm((f) => ({ ...f, unit_type_id }))}
            onCreate={onCreateType}
            onDelete={(id) => {
              onDeleteType?.(id);
              if (form.unit_type_id === id) setForm((f) => ({ ...f, unit_type_id: null }));
            }}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Bắt đầu chặng" hint="không bắt buộc — để tính giờ hoạt động">
            <DatePicker
              className="w-full"
              showTime={{ format: "HH:mm" }}
              format="DD/MM/YYYY HH:mm"
              value={form.start_date}
              onChange={(date) => setForm((f) => ({ ...f, start_date: date }))}
            />
          </Field>
          <Field label="Nghỉ giữa hoạt động (phút)" hint="không bắt buộc">
            <InputNumber
              className="w-full"
              min={0}
              value={form.break_minutes}
              onChange={(val) => setForm((f) => ({ ...f, break_minutes: val || 0 }))}
              placeholder="0"
            />
          </Field>
        </div>

        <Field label="Mô tả" hint="không bắt buộc">
          <TextArea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ghi chú ngắn về chặng này"
            rows={2}
          />
        </Field>

        {showItemPicker && (
          <Field label="Hoạt động" hint="thứ tự bên phải là thứ tự trong chặng">
            <DualListPicker
              poolLabel="Chọn hoạt động"
              selectedLabel="Đã chọn"
              searchPlaceholder="Tìm theo tên hoạt động..."
              emptyPoolText="Không tìm thấy hoạt động nào."
              emptySelectedText="Chưa chọn hoạt động nào."
              // Chỉ hiện hoạt động chưa gắn chặng nào hoặc đang gắn chính chặng này,
              // tránh "cướp" ngầm hoạt động của chặng khác.
              items={items.filter((i) => !i.unit_id || i.unit_id === unit?.id)}
              selectedIds={form.itemIds}
              onChange={(itemIds) => setForm((f) => ({ ...f, itemIds }))}
              renderThumb={(item) => <ActivityThumb item={item} />}
              renderMeta={(item) => (
                <p className="truncate text-[11px] text-slate-400">
                  {item.locations?.length > 0 ? (
                    <>
                      <MapPin className="mr-0.5 inline h-3 w-3" />
                      {item.locations.map((l) => l.name).join(", ")}
                    </>
                  ) : (
                    "Chưa gắn địa điểm"
                  )}
                </p>
              )}
            />
          </Field>
        )}

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose}>Huỷ</Button>
          <Button variant="primary" htmlType="submit" loading={submitting}>
            {mode === "edit" ? "Lưu thay đổi" : "Thêm chặng"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
