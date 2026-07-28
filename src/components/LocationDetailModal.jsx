import { MapPin, Pencil } from "lucide-react";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";

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
        <>
          {location.description && (
            <p className="mb-3 text-sm text-stone-600">{location.description}</p>
          )}

          <span className="mb-4 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-mono text-xs text-amber-800">
            <MapPin className="h-3 w-3" />
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </span>

          {location.images?.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {location.images.map((src, idx) => (
                <div
                  key={`${src}-${idx}`}
                  className="aspect-square overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-stone-400">Chưa có ảnh.</p>
          )}
        </>
      )}
    </Modal>
  );
}
