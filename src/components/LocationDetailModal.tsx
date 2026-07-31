import { ExternalLink, Locate, MapPin, Pencil } from "lucide-react";
import Modal from "../shared/components/Modal";
import Button from "../shared/components/Button";
import Badge from "../shared/components/Badge";
import type { Id, LocationRow } from "../shared/types/models";

export interface LocationDetailModalProps {
  open: boolean;
  location: LocationRow | null;
  onClose: () => void;
  onEdit: (location: LocationRow) => void;
  onFocusMap?: (id: Id) => void;
}

export default function LocationDetailModal({
  open,
  location,
  onClose,
  onEdit,
  onFocusMap,
}: LocationDetailModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={location?.name}
      footer={
        location && (
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Đóng</Button>
            {onFocusMap && (
              <Button
                icon={<Locate className="h-4 w-4" />}
                onClick={() => {
                  onFocusMap(location.id);
                  onClose();
                }}
              >
                Soi trên bản đồ
              </Button>
            )}
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
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="amber" icon={MapPin} numeric>
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </Badge>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
            >
              Mở trên Google Maps
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {location.description && (
            <p className="mt-3.5 text-sm leading-relaxed text-slate-600">{location.description}</p>
          )}

          {location.images?.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {location.images.map((src, index) => (
                <div
                  key={`${src}-${index}`}
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
