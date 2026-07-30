import { Clock, MapPin, Pencil, Wallet } from "lucide-react";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";

export default function ItemDetailModal({ open, item, onClose, onEdit }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item?.name}
      footer={
        item && (
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Đóng</Button>
            <Button
              variant="primary"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => onEdit(item)}
            >
              Sửa
            </Button>
          </div>
        )
      }
    >
      {item && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
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

          {item.note && <p className="mb-4 text-sm text-stone-600">{item.note}</p>}

          <p className="mb-2 text-xs font-medium text-stone-500">
            Địa điểm ({item.locations?.length ?? 0})
          </p>
          <div className="space-y-2">
            {(item.locations ?? []).map((loc, idx) => (
              <div
                key={loc.id}
                className="flex items-center gap-3 rounded-lg border border-stone-200 p-2"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-medium text-stone-500">
                  {idx + 1}
                </span>
                {loc.images?.[0] ? (
                  <img
                    src={loc.images[0]}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg border border-stone-200 object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 text-stone-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-800">{loc.name}</p>
                  <p className="font-mono text-xs text-stone-400">
                    {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
