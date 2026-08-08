import { ExternalLink, Locate, MapPin, Pencil } from "lucide-react";
import { useTranslation } from "../i18n/useAppTranslation";
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
  const { t } = useTranslation(["locations", "common"]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={location?.name}
      footer={
        location && (
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>{t("common:actions.close")}</Button>
            {onFocusMap && (
              <Button
                icon={<Locate className="h-4 w-4" />}
                onClick={() => {
                  onFocusMap(location.id);
                  onClose();
                }}
              >
                {t("locations:card.focus")}
              </Button>
            )}
            <Button
              variant="primary"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => onEdit(location)}
            >
              {t("locations:card.edit")}
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
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {t("locations:detail.openInGoogleMaps")}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {location.description && (
            <p className="mt-3.5 text-sm leading-relaxed text-text-secondary">{location.description}</p>
          )}

          {location.images?.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {location.images.map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  className="aspect-square overflow-hidden rounded-xl border border-border/10 bg-surface-secondary/76"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-text-muted">{t("locations:detail.noImages")}</p>
          )}
        </div>
      )}
    </Modal>
  );
}
