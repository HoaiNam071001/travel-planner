import { useEffect, useMemo, useState } from "react";
import { Pagination, Popconfirm } from "antd";
import { MapPin, Plus, Minus, X, GripVertical, Sparkles } from "lucide-react";
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

function toFormState(unit, initialItemIds) {
  return {
    unit_type_id: unit?.unit_type_id ?? null,
    dateRange:
      unit?.start_date && unit?.end_date
        ? [dayjs(unit.start_date), dayjs(unit.end_date)]
        : null,
    name: unit?.name ?? "",
    description: unit?.description ?? "",
    itemIds: initialItemIds ?? [],
  };
}

function ActivityThumb({ item }) {
  const image = item.locations?.[0]?.images?.[0];
  return image ? (
    <img src={image} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-stone-200 object-cover" />
  ) : (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 text-stone-400">
      <Sparkles className="h-4 w-4" />
    </div>
  );
}

function SortableActivityRow({ item, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
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
      <ActivityThumb item={item} />
      <p className="min-w-0 flex-1 truncate text-sm text-stone-800">{item.name}</p>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-red-50 hover:text-red-600"
        aria-label="Bỏ khỏi chặng"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function UnitTypePicker({ types, selectedId, onSelect, onDelete }) {
  if (types.length === 0) {
    return (
      <p className="text-xs text-stone-400">
        Chưa có loại nào. Thêm loại ở trang danh sách chặng trước.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {types.map((t) => {
        const selected = t.id === selectedId;
        return (
          <span
            key={t.id}
            onClick={() => onSelect(selected ? null : t.id)}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-xs transition ${
              selected
                ? "bg-cyan-600 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {t.name}
            <Popconfirm
              title="Xoá loại này?"
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={(e) => {
                e?.stopPropagation?.();
                onDelete(t.id);
              }}
            >
              <X
                className={`h-3 w-3 ${selected ? "text-cyan-100 hover:text-white" : "text-stone-400 hover:text-red-600"}`}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </span>
        );
      })}
    </div>
  );
}

export default function UnitFormModal({
  open,
  mode,
  unit,
  initialItemIds,
  items,
  unitTypes,
  onClose,
  onSubmit,
  onDeleteType,
}) {
  const [form, setForm] = useState(() => toFormState(unit, initialItemIds));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (open) {
      setForm(toFormState(unit, initialItemIds));
      setSearch("");
      setPage(1);
      setError("");
    }
  }, [open, unit, initialItemIds]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const pool = useMemo(
    () => items.filter((i) => !i.unit_id || i.unit_id === unit?.id),
    [items, unit]
  );

  const filteredPool = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return pool;
    return pool.filter((i) => i.name.toLowerCase().includes(keyword));
  }, [pool, search]);

  const pagedPool = filteredPool.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedItems = form.itemIds
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean);

  function toggleItem(id) {
    setForm((f) => ({
      ...f,
      itemIds: f.itemIds.includes(id) ? f.itemIds.filter((x) => x !== id) : [...f.itemIds, id],
    }));
  }

  function removeItem(id) {
    setForm((f) => ({ ...f, itemIds: f.itemIds.filter((x) => x !== id) }));
  }

  function clearAllItems() {
    setForm((f) => ({ ...f, itemIds: [] }));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setForm((f) => {
      const oldIndex = f.itemIds.indexOf(active.id);
      const newIndex = f.itemIds.indexOf(over.id);
      return { ...f, itemIds: arrayMove(f.itemIds, oldIndex, newIndex) };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Cần nhập tên chặng.");
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      name: form.name,
      description: form.description,
      unit_type_id: form.unit_type_id,
      start_date: form.dateRange ? form.dateRange[0].toISOString() : null,
      end_date: form.dateRange ? form.dateRange[1].toISOString() : null,
      itemIds: form.itemIds,
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
      title={mode === "edit" ? "Sửa chặng" : "Thêm chặng mới"}
      footer={null}
      width={880}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Tên chặng</label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: Ngày 1 - Sài Gòn, Tuần 1..."
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Loại</label>
          <UnitTypePicker
            types={unitTypes}
            selectedId={form.unit_type_id}
            onSelect={(unit_type_id) => setForm((f) => ({ ...f, unit_type_id }))}
            onDelete={(id) => {
              onDeleteType(id);
              if (form.unit_type_id === id) setForm((f) => ({ ...f, unit_type_id: null }));
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">
            Khoảng thời gian
          </label>
          <RangePicker
            className="w-full"
            showTime={{ format: "HH:mm" }}
            format="DD/MM/YYYY HH:mm"
            value={form.dateRange}
            onChange={(dateRange) => setForm((f) => ({ ...f, dateRange }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Mô tả</label>
          <TextArea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ghi chú ngắn về chặng này"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Left: pool */}
          <div className="rounded-lg border border-stone-200 p-3">
            <p className="mb-2 text-xs font-medium text-stone-500">Chọn hoạt động</p>
            <Input.Search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoạt động..."
              allowClear
            />
            <div className="mt-2 h-72 space-y-2 overflow-y-auto pr-1">
              {pagedPool.length === 0 && (
                <p className="py-8 text-center text-xs text-stone-400">
                  Không tìm thấy hoạt động nào.
                </p>
              )}
              {pagedPool.map((item) => {
                const selected = form.itemIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 rounded-lg border p-2 ${
                      selected ? "border-cyan-300 bg-cyan-50/50" : "border-stone-200"
                    }`}
                  >
                    <ActivityThumb item={item} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-stone-800">{item.name}</p>
                      <p className="truncate text-xs text-stone-400">
                        {item.locations?.length > 0 ? (
                          <>
                            <MapPin className="mr-0.5 inline h-3 w-3" />
                            {item.locations.map((l) => l.name).join(", ")}
                          </>
                        ) : (
                          "Chưa gắn địa điểm"
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        selected
                          ? "bg-red-50 text-red-600 hover:bg-red-100"
                          : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                      }`}
                      aria-label={selected ? "Bỏ khỏi chặng" : "Thêm vào chặng"}
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
                Đã chọn ({selectedItems.length}) — kéo để sắp xếp
              </p>
              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllItems}
                  className="text-xs text-stone-400 hover:text-red-600"
                >
                  Bỏ chọn tất cả
                </button>
              )}
            </div>
            <div className="h-72 space-y-2 overflow-y-auto pr-1">
              {selectedItems.length === 0 ? (
                <p className="py-8 text-center text-xs text-stone-400">
                  Chưa chọn hoạt động nào.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={form.itemIds} strategy={verticalListSortingStrategy}>
                    {selectedItems.map((item, idx) => (
                      <SortableActivityRow
                        key={item.id}
                        item={item}
                        index={idx}
                        onRemove={removeItem}
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
            {mode === "edit" ? "Lưu thay đổi" : "Thêm chặng"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
