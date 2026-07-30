import { CalendarClock, Clock, MapPin, Pencil, Wallet } from "lucide-react";
import dayjs from "dayjs";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";

function formatRange(startDate, endDate) {
  if (!startDate || !endDate) return null;
  return `${dayjs(startDate).format("DD/MM/YYYY HH:mm")} - ${dayjs(endDate).format("DD/MM/YYYY HH:mm")}`;
}

export default function UnitDetailModal({ open, unit, items, onClose, onEdit }) {
  const range = unit ? formatRange(unit.start_date, unit.end_date) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={unit?.name}
      footer={
        unit && (
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Đóng</Button>
            <Button
              variant="primary"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => onEdit(unit)}
            >
              Sửa
            </Button>
          </div>
        )
      }
    >
      {unit && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
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
          </div>

          {unit.description && <p className="mb-4 text-sm text-stone-600">{unit.description}</p>}

          <p className="mb-2 text-xs font-medium text-stone-500">
            Hoạt động ({items.length})
          </p>
          <div className="space-y-2">
            {items.length === 0 && (
              <p className="py-6 text-center text-xs text-stone-400">
                Chặng này chưa có hoạt động nào.
              </p>
            )}
            {items.map((item, idx) => (
              <div key={item.id} className="rounded-lg border border-stone-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[10px] font-medium text-stone-500">
                    {idx + 1}
                  </span>
                  <p className="text-sm font-medium text-stone-800">{item.name}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {item.start_time && item.end_time && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 font-mono text-xs text-stone-600">
                      <Clock className="h-3 w-3" />
                      {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                    </span>
                  )}
                  {item.price != null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800">
                      <Wallet className="h-3 w-3" />
                      {Number(item.price).toLocaleString("vi-VN")} đ
                    </span>
                  )}
                </div>
                {item.locations?.length > 0 && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-stone-500">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {item.locations.map((l) => l.name).join(" → ")}
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
