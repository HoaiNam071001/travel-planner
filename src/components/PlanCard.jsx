import { CalendarClock, Pencil, Route, Trash2, Wallet } from "lucide-react";
import { Popconfirm } from "antd";
import dayjs from "dayjs";

function formatRange(startDate, endDate) {
  if (!startDate || !endDate) return null;
  return `${dayjs(startDate).format("DD/MM/YYYY")} - ${dayjs(endDate).format("DD/MM/YYYY")}`;
}

export default function PlanCard({ plan, unitCount, itemCount, totalCost, onOpenDetail, onEdit, onDelete }) {
  const range = formatRange(plan.start_date, plan.end_date);

  return (
    <div
      onClick={() => onOpenDetail(plan)}
      className="group relative cursor-pointer rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-serif text-base leading-snug text-stone-900">{plan.name}</h3>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(plan);
            }}
            className="rounded-full p-1.5 text-stone-400 hover:bg-cyan-50 hover:text-cyan-700"
            aria-label="Sửa"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <Popconfirm
            title="Xoá kế hoạch này?"
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(plan.id)}
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

      {plan.description && (
        <p className="mb-3 text-sm text-stone-500 line-clamp-2">{plan.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {range && (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 font-mono text-xs text-stone-600">
            <CalendarClock className="h-3 w-3" />
            {range}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800">
          <Route className="h-3 w-3" />
          {unitCount} chặng
        </span>
        {totalCost > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
            <Wallet className="h-3 w-3" />
            {totalCost.toLocaleString("vi-VN")} đ
          </span>
        )}
      </div>

      {itemCount > 0 && (
        <p className="mt-2 text-xs text-stone-400">{itemCount} hoạt động</p>
      )}
    </div>
  );
}
