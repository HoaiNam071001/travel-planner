import { useEffect, useMemo, useState } from "react";
import { Pagination } from "antd";
import { CalendarClock, Plus, Minus, X, GripVertical, Route } from "lucide-react";
import dayjs from "dayjs";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import Input, { TextArea } from "../shared/components/Input";
import DatePicker from "../shared/components/DatePicker";

const { RangePicker } = DatePicker;
const PAGE_SIZE = 5;

function toFormState(plan, initialUnitIds) {
  return {
    dateRange:
      plan?.start_date && plan?.end_date
        ? [dayjs(plan.start_date), dayjs(plan.end_date)]
        : null,
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    unitIds: initialUnitIds ?? [],
  };
}

function formatRange(startDate, endDate) {
  if (!startDate || !endDate) return null;
  return `${dayjs(startDate).format("DD/MM/YYYY HH:mm")} - ${dayjs(endDate).format("DD/MM/YYYY HH:mm")}`;
}

function UnitIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 text-stone-400">
      <Route className="h-4 w-4" />
    </div>
  );
}

function UnitMeta({ unit, itemCount }) {
  const range = formatRange(unit.start_date, unit.end_date);
  return (
    <p className="truncate text-xs text-stone-400">
      {unit.unit_type?.name && <span className="mr-1.5 text-cyan-700">{unit.unit_type.name}</span>}
      {range && (
        <span className="mr-1.5">
          <CalendarClock className="mr-0.5 inline h-3 w-3" />
          {range}
        </span>
      )}
      {itemCount} hoạt động
    </p>
  );
}

function SortableUnitRow({ unit, itemCount, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: unit.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-2"
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="cursor-grab touch-none text-stone-300 hover:text-stone-500 active:cursor-grabbing"
        aria-label="Kéo để sắp xếp"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[10px] font-medium text-stone-500">
        {index + 1}
      </span>
      <UnitIcon />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-stone-800">{unit.name}</p>
        <UnitMeta unit={unit} itemCount={itemCount} />
      </div>
      <button
        type="button"
        onClick={() => onRemove(unit.id)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-red-50 hover:text-red-600"
        aria-label="Bỏ khỏi kế hoạch"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function PlanFormModal({
  open,
  mode,
  plan,
  initialUnitIds,
  units,
  items,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => toFormState(plan, initialUnitIds));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (open) {
      setForm(toFormState(plan, initialUnitIds));
      setSearch("");
      setPage(1);
      setError("");
    }
  }, [open, plan, initialUnitIds]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  function itemCountForUnit(unitId) {
    return items.filter((i) => i.unit_id === unitId).length;
  }

  const pool = useMemo(
    () => units.filter((u) => !u.plan_id || u.plan_id === plan?.id),
    [units, plan]
  );

  const filteredPool = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return pool;
    return pool.filter((u) => u.name.toLowerCase().includes(keyword));
  }, [pool, search]);

  const pagedPool = filteredPool.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedUnits = form.unitIds
    .map((id) => units.find((u) => u.id === id))
    .filter(Boolean);

  function toggleUnit(id) {
    setForm((f) => ({
      ...f,
      unitIds: f.unitIds.includes(id) ? f.unitIds.filter((x) => x !== id) : [...f.unitIds, id],
    }));
  }

  function removeUnit(id) {
    setForm((f) => ({ ...f, unitIds: f.unitIds.filter((x) => x !== id) }));
  }

  function clearAllUnits() {
    setForm((f) => ({ ...f, unitIds: [] }));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setForm((f) => {
      const oldIndex = f.unitIds.indexOf(active.id);
      const newIndex = f.unitIds.indexOf(over.id);
      return { ...f, unitIds: arrayMove(f.unitIds, oldIndex, newIndex) };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Cần nhập tên kế hoạch.");
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      name: form.name,
      description: form.description,
      start_date: form.dateRange ? form.dateRange[0].format("YYYY-MM-DD") : null,
      end_date: form.dateRange ? form.dateRange[1].format("YYYY-MM-DD") : null,
      unitIds: form.unitIds,
    });
    setSubmitting(false);

    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Sửa kế hoạch" : "Thêm kế hoạch mới"}
      footer={null}
      width={880}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Tên kế hoạch</label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: Tết 2026 - Đà Lạt"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">
            Khoảng thời gian
          </label>
          <RangePicker
            className="w-full"
            format="DD/MM/YYYY"
            value={form.dateRange}
            onChange={(dateRange) => setForm((f) => ({ ...f, dateRange }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Mô tả</label>
          <TextArea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ghi chú ngắn về kế hoạch này"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Left: pool */}
          <div className="rounded-lg border border-stone-200 p-3">
            <p className="mb-2 text-xs font-medium text-stone-500">Chọn chặng</p>
            <Input.Search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên chặng..."
              allowClear
            />
            <div className="mt-2 h-72 space-y-2 overflow-y-auto pr-1">
              {pagedPool.length === 0 && (
                <p className="py-8 text-center text-xs text-stone-400">
                  Không tìm thấy chặng nào.
                </p>
              )}
              {pagedPool.map((unit) => {
                const selected = form.unitIds.includes(unit.id);
                return (
                  <div
                    key={unit.id}
                    className={`flex items-center gap-2 rounded-lg border p-2 ${
                      selected ? "border-cyan-300 bg-cyan-50/50" : "border-stone-200"
                    }`}
                  >
                    <UnitIcon />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-stone-800">{unit.name}</p>
                      <UnitMeta unit={unit} itemCount={itemCountForUnit(unit.id)} />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleUnit(unit.id)}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        selected
                          ? "bg-red-50 text-red-600 hover:bg-red-100"
                          : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                      }`}
                      aria-label={selected ? "Bỏ khỏi kế hoạch" : "Thêm vào kế hoạch"}
                    >
                      {selected ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
            {filteredPool.length > PAGE_SIZE && (
              <div className="mt-2 flex justify-center">
                <Pagination
                  size="small"
                  current={page}
                  pageSize={PAGE_SIZE}
                  total={filteredPool.length}
                  onChange={setPage}
                />
              </div>
            )}
          </div>

          {/* Right: selected, drag to reorder */}
          <div className="rounded-lg border border-stone-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-stone-500">
                Đã chọn ({selectedUnits.length}) — kéo để sắp xếp
              </p>
              {selectedUnits.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllUnits}
                  className="text-xs text-stone-400 hover:text-red-600"
                >
                  Bỏ chọn tất cả
                </button>
              )}
            </div>
            <div className="h-72 space-y-2 overflow-y-auto pr-1">
              {selectedUnits.length === 0 ? (
                <p className="py-8 text-center text-xs text-stone-400">
                  Chưa chọn chặng nào.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={form.unitIds} strategy={verticalListSortingStrategy}>
                    {selectedUnits.map((unit, idx) => (
                      <SortableUnitRow
                        key={unit.id}
                        unit={unit}
                        itemCount={itemCountForUnit(unit.id)}
                        index={idx}
                        onRemove={removeUnit}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose}>Huỷ</Button>
          <Button variant="primary" htmlType="submit" loading={submitting}>
            {mode === "edit" ? "Lưu thay đổi" : "Thêm kế hoạch"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
