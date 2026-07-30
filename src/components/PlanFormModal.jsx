import { useEffect, useState } from "react";
import dayjs from "dayjs";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import Field from "../shared/components/Field";
import Input, { TextArea } from "../shared/components/Input";
import DatePicker from "../shared/components/DatePicker";

const { RangePicker } = DatePicker;

function toFormState(plan) {
  return {
    dateRange:
      plan?.start_date && plan?.end_date ? [dayjs(plan.start_date), dayjs(plan.end_date)] : null,
    name: plan?.name ?? "",
    description: plan?.description ?? "",
  };
}

// Chỉ nhập thông tin kế hoạch (tên/thời gian/mô tả). Việc gắn & sắp xếp chặng làm
// ở tab "Xây dựng" của trang chi tiết kế hoạch bằng kéo-thả, nên modal này không
// còn picker chặng nữa và không gửi `unitIds` lên service.
export default function PlanFormModal({ open, mode, plan, onClose, onSubmit }) {
  const [form, setForm] = useState(() => toFormState(plan));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(plan));
      setError("");
    }
  }, [open, plan]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Cần nhập tên kế hoạch.");
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
      title={mode === "edit" ? "Sửa kế hoạch" : "Kế hoạch mới"}
      footer={null}
      width={520}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Field label="Tên kế hoạch">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: Tết 2026 - Đà Lạt"
            autoFocus
          />
        </Field>

        <Field label="Khoảng thời gian" hint="theo ngày">
          <RangePicker
            className="w-full"
            format="DD/MM/YYYY"
            value={form.dateRange}
            onChange={(dateRange) => setForm((f) => ({ ...f, dateRange }))}
          />
        </Field>

        <Field label="Mô tả" hint="không bắt buộc">
          <TextArea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ghi chú ngắn về kế hoạch này"
            rows={3}
          />
        </Field>

        {mode !== "edit" && (
          <p className="rounded-xl border border-brand-100 bg-brand-50/70 px-3.5 py-2.5 text-xs leading-relaxed text-brand-800">
            Tạo xong bạn sẽ vào ngay màn hình xây dựng kế hoạch để thêm chặng và kéo-thả hoạt
            động vào từng chặng.
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose}>Huỷ</Button>
          <Button variant="primary" htmlType="submit" loading={submitting}>
            {mode === "edit" ? "Lưu thay đổi" : "Tạo kế hoạch"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
