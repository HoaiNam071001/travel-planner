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
  /** Mốc kết thúc: có thì được ưu tiên hơn "bắt đầu + khoảng thời gian". */
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
  const image = item.locations?.find((l) => l.images?.length)?.images?.[0];
  return image ? (
    <img src={image} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover" />
  ) : (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
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

// Chip chọn "loại" chặng — danh sách động do user tự tạo (bảng unit_types).
function UnitTypePicker({ types, selectedId, onSelect, onCreate, onDelete }: UnitTypePickerProps) {
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
                  selected ? "text-white/60 hover:text-white" : "text-slate-300 hover:text-rose-600"
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

export interface UnitFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  unit: Unit | null;
  /** Chỉ dùng để "mồi" giá trị ban đầu khi nhân bản (mode vẫn là "create", `unit` vẫn null). */
  cloneFrom?: Unit | null;
  initialItemIds?: Id[];
  items?: Item[];
  unitTypes?: UnitType[];
  /** Trong Plan Builder việc gắn hoạt động đã làm bằng kéo-thả nên ẩn picker đi;
   *  khi ẩn, `itemIds` không được gửi lên -> updateUnit không đụng tới quan hệ. */
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
  // Xem trước đúng thứ tự ưu tiên mà UI dùng ở mọi nơi khác: end_date > duration.
  const previewEnd = form.end_date ?? form.start_date?.add(manualMinutes, "minute") ?? null;
  const previewRange =
    form.start_date && previewEnd ? formatDateTimeRange(form.start_date, previewEnd) : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Cần nhập tên chặng.");
      return;
    }
    if (form.end_date && form.start_date && !form.end_date.isAfter(form.start_date)) {
      setError("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }
    if (!form.end_date && manualMinutes <= 0) {
      setError("Chặng cần có khoảng thời gian lớn hơn 0 (hoặc nhập thời gian kết thúc).");
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
          <Field label="Bắt đầu chặng" hint="không bắt buộc">
            <DatePicker
              className="w-full"
              showTime={{ format: "HH:mm", minuteStep: 5 }}
              format="DD/MM/YYYY HH:mm"
              value={form.start_date}
              onChange={(date) => setForm((f) => ({ ...f, start_date: date }))}
            />
          </Field>
          <Field label="Kết thúc chặng" hint="có thì ưu tiên hơn khoảng thời gian">
            <DatePicker
              className="w-full"
              showTime={{ format: "HH:mm", minuteStep: 5 }}
              format="DD/MM/YYYY HH:mm"
              value={form.end_date}
              onChange={(date) => setForm((f) => ({ ...f, end_date: date }))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Khoảng thời gian" hint="mặc định 6 giờ">
            <DurationInput
              value={form.duration}
              onChange={(duration) => setForm((f) => ({ ...f, duration }))}
              disabled={Boolean(form.end_date)}
            />
          </Field>
          <Field label="Nghỉ giữa hoạt động (phút)">
            <InputNumber
              className="w-full"
              min={0}
              value={form.break_minutes}
              onChange={(val) => setForm((f) => ({ ...f, break_minutes: val ?? 0 }))}
              placeholder="0"
            />
          </Field>
        </div>

        <p className="rounded-xl border border-brand-100 bg-brand-50/70 px-3.5 py-2 text-xs leading-relaxed text-brand-800">
          {previewRange ? (
            <>
              Chặng chạy <span className="font-semibold tnum">{previewRange}</span>
              {form.end_date
                ? " (theo thời gian kết thúc đã nhập)."
                : ` (bắt đầu + ${formatDuration(manualMinutes) ?? "0 phút"}).`}
            </>
          ) : (
            <>
              Chưa có giờ bắt đầu — chặng sẽ nằm ở cột "chưa xếp lịch" trong tab Lịch trình của kế
              hoạch, kéo vào để xếp giờ.
            </>
          )}
        </p>

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
