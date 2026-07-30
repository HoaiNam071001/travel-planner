import { MapPin, Pencil } from "lucide-react";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import Badge from "../shared/components/Badge";

export default function LocationDetailModal({ open, location, onClose, onEdit }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={location?.name}
      footer={
        location && (
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Đóng</Button>
            <Button
              variant="primary"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => onEdit(location)}
            >
              Sửa
            </Button>
          </div>
        )
      }
    >
      {location && (
        <div className="pt-1">
          <Badge tone="amber" icon={MapPin} numeric>
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </Badge>

          {location.description && (
            <p className="mt-3.5 text-sm leading-relaxed text-slate-600">{location.description}</p>
          )}

          {location.images?.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {location.images.map((src, idx) => (
                <div
                  key={`${src}-${idx}`}
                  className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-400">Chưa có ảnh.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
