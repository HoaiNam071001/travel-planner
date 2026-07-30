import { CalendarClock, Pencil, Route, Sparkles, Wallet } from "lucide-react";
import dayjs from "dayjs";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";

function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return null;
  return `${dayjs(startDate).format("DD/MM/YYYY")} - ${dayjs(endDate).format("DD/MM/YYYY")}`;
}

function formatDateTimeRange(startDate, endDate) {
  if (!startDate || !endDate) return null;
  return `${dayjs(startDate).format("DD/MM/YYYY HH:mm")} - ${dayjs(endDate).format("DD/MM/YYYY HH:mm")}`;
}

export default function PlanDetailModal({ open, plan, units, itemCountByUnit, costByUnit, onClose, onEdit }) {
  const range = plan ? formatDateRange(plan.start_date, plan.end_date) : null;
  const totalCost = units?.reduce((sum, u) => sum + (costByUnit?.[u.id] ?? 0), 0) ?? 0;
  const totalItems = units?.reduce((sum, u) => sum + (itemCountByUnit?.[u.id] ?? 0), 0) ?? 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plan?.name}
      footer={
        plan && (
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Đóng</Button>
            <Button
              variant="primary"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => onEdit(plan)}
            >
              Sửa
            </Button>
          </div>
        )
      }
    >
      {plan && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {range && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 font-mono text-xs text-stone-600">
                <CalendarClock className="h-3 w-3" />
                {range}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800">
              <Route className="h-3 w-3" />
              {units.length} chặng
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
              <Sparkles className="h-3 w-3" />
              {totalItems} hoạt động
            </span>
            {totalCost > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">
                <Wallet className="h-3 w-3" />
                Tổng: {totalCost.toLocaleString("vi-VN")} đ
              </span>
            )}
          </div>

          {plan.description && <p className="mb-4 text-sm text-stone-600">{plan.description}</p>}

          <p className="mb-2 text-xs font-medium text-stone-500">Chặng ({units.length})</p>
          <div className="space-y-2">
            {units.length === 0 && (
              <p className="py-6 text-center text-xs text-stone-400">
                Kế hoạch này chưa có chặng nào.
              </p>
            )}
            {units.map((unit, idx) => {
              const unitRange = formatDateTimeRange(unit.start_date, unit.end_date);
              const cost = costByUnit?.[unit.id] ?? 0;
              return (
                <div key={unit.id} className="rounded-lg border border-stone-200 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[10px] font-medium text-stone-500">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-medium text-stone-800">{unit.name}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {unit.unit_type && (
                      <span className="inline-flex items-center rounded-full bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800">
                        {unit.unit_type.name}
                      </span>
                    )}
                    {unitRange && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 font-mono text-xs text-stone-600">
                        <CalendarClock className="h-3 w-3" />
                        {unitRange}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
                      <Sparkles className="h-3 w-3" />
                      {itemCountByUnit?.[unit.id] ?? 0} hoạt động
                    </span>
                    {cost > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">
                        <Wallet className="h-3 w-3" />
                        {cost.toLocaleString("vi-VN")} đ
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
}
