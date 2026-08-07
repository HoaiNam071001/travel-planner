import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pagination } from "antd";
import { GripVertical, Minus, Plus, Search, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Input from "../shared/components/Input";
import type { Id } from "../shared/types/models";

const PAGE_SIZE = 5;

export interface PickerEntity {
  id: Id;
  name: string;
}

export interface DualListPickerProps<T extends PickerEntity> {
  poolLabel: string;
  selectedLabel: string;
  searchPlaceholder: string;
  emptyPoolText: string;
  emptySelectedText: string;
  items: T[];
  selectedIds: Id[];
  onChange: (ids: Id[]) => void;
  renderThumb?: (entity: T) => ReactNode;
  renderMeta?: (entity: T) => ReactNode;
}

export default function DualListPicker<T extends PickerEntity>({
  poolLabel,
  selectedLabel,
  searchPlaceholder,
  emptyPoolText,
  emptySelectedText,
  items,
  selectedIds,
  onChange,
  renderThumb,
  renderMeta,
}: DualListPickerProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((i) => i.name.toLowerCase().includes(keyword));
  }, [items, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = selectedIds
    .map((id) => items.find((i) => i.id === id))
    .filter((entity): entity is T => Boolean(entity));

  function toggle(id: Id) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onChange(
      arrayMove(
        selectedIds,
        selectedIds.indexOf(String(active.id)),
        selectedIds.indexOf(String(over.id))
      )
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="surface-muted p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          {poolLabel}
        </p>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          prefix={<Search className="h-3.5 w-3.5 text-text-muted" />}
          allowClear
        />

        <div className="scroll-thin mt-2 h-64 space-y-1.5 overflow-y-auto pr-1">
          {paged.length === 0 && (
            <p className="py-10 text-center text-xs text-text-muted">{emptyPoolText}</p>
          )}
          {paged.map((entity) => {
            const isSelected = selectedIds.includes(entity.id);
            return (
              <div
                key={entity.id}
                className={`flex items-center gap-2.5 rounded-xl border p-2 transition ${
                  isSelected
                    ? "border-primary/20 bg-primary/8"
                    : "border-border/10 bg-surface-elevated/76"
                }`}
              >
                {renderThumb?.(entity)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-text-primary">{entity.name}</p>
                  {renderMeta?.(entity)}
                </div>
                <button
                  type="button"
                  onClick={() => toggle(entity.id)}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                    isSelected
                      ? "bg-danger/10 text-danger hover:bg-danger/16"
                      : "bg-primary/10 text-primary hover:bg-primary/16"
                  }`}
                  aria-label={isSelected ? "Bo chon" : "Chon"}
                >
                  {isSelected ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </button>
              </div>
            );
          })}
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="mt-2 flex justify-center">
            <Pagination
              size="small"
              current={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onChange={setPage}
            />
          </div>
        )}
      </div>

      <div className="surface-muted p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {selectedLabel} ({selected.length})
          </p>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-text-muted transition hover:text-danger"
            >
              Bo chon tat ca
            </button>
          )}
        </div>

        <div className="scroll-thin h-[19.5rem] space-y-1.5 overflow-y-auto pr-1">
          {selected.length === 0 ? (
            <p className="py-10 text-center text-xs text-text-muted">{emptySelectedText}</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={selectedIds} strategy={verticalListSortingStrategy}>
                {selected.map((entity, index) => (
                  <SortableRow
                    key={entity.id}
                    entity={entity}
                    index={index}
                    thumb={renderThumb?.(entity)}
                    meta={renderMeta?.(entity)}
                    onRemove={() => toggle(entity.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}

interface SortableRowProps {
  entity: PickerEntity;
  index: number;
  thumb?: ReactNode;
  meta?: ReactNode;
  onRemove: () => void;
}

function SortableRow({ entity, index, thumb, meta, onRemove }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entity.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl border bg-surface-elevated/82 p-2 ${
        isDragging ? "border-primary/20 opacity-50" : "border-border/10"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="cursor-grab touch-none text-text-muted transition hover:text-text-secondary active:cursor-grabbing"
        aria-label="Keo de sap xep"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-secondary text-[10px] font-semibold text-text-primary tnum">
        {index + 1}
      </span>
      {thumb}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-text-primary">{entity.name}</p>
        {meta}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-text-muted transition hover:bg-danger/10 hover:text-danger"
        aria-label="Bo chon"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
