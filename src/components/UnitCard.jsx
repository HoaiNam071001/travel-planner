import { CalendarClock, Pencil, Sparkles, Trash2 } from "lucide-react";
import { Popconfirm } from "antd";
import dayjs from "dayjs";

function formatRange(startDate, endDate) {
  if (!startDate || !endDate) return null;
  return `${dayjs(startDate).format("DD/MM/YYYY HH:mm")} - ${dayjs(endDate).format("DD/MM/YYYY HH:mm")}`;
}

export default function UnitCard({ unit, itemCount, onOpenDetail, onEdit, onDelete }) {
  const range = formatRange(unit.start_date, unit.end_date);

  return (
    <div
      onClick={() => onOpenDetail(unit)}
      className="group relative cursor-pointer rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-serif text-base leading-snug text-stone-900">{unit.name}</h3>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(unit);
            }}
            className="rounded-full p-1.5 text-stone-400 hover:bg-cyan-50 hover:text-cyan-700"
            aria-label="Sửa"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <Popconfirm
            title="Xoá chặng này?"
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(unit.id)}
          >
            <button
              onClick={(e) => e.stopPropagation()}
              className="rounded-full p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Xoá"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Popconfirm>
        </div>
      </div>

      {unit.description && (
        <p className="mb-3 text-sm text-stone-500 line-clamp-2">{unit.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {unit.unit_type && (
          <span className="inline-flex items-center rounded-full bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800">
            {unit.unit_type.name}
          </span>
        )}
        {range && (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 font-mono text-xs text-stone-600">
            <CalendarClock className="h-3 w-3" />
            {range}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
          <Sparkles className="h-3 w-3" />
          {itemCount} hoạt động
        </span>
      </div>
    </div>
  );
}
