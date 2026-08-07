import { Popconfirm } from "antd";
import { Image as ImageIcon, Locate, MapPin, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "../i18n/useAppTranslation";
import Badge from "../shared/components/Badge";
import IconButton from "../shared/components/IconButton";
import { formatDistance } from "../shared/utils/format";
import type { Id, LocationRow } from "../shared/types/models";

export interface LocationCardProps {
  location: LocationRow;
  isFocused: boolean;
  distance?: number | null;
  onOpenDetail: (location: LocationRow) => void;
  onEdit: (location: LocationRow) => void;
  onFocusMap: (id: Id) => void;
  onDelete: (id: Id) => void;
}

export default function LocationCard({
  location,
  isFocused,
  distance,
  onOpenDetail,
  onEdit,
  onFocusMap,
  onDelete,
}: LocationCardProps) {
  const { t } = useTranslation("locations");
  const cover = location.images?.[0];

  return (
    <div
      onClick={() => onOpenDetail(location)}
      className={`group surface flex min-h-[132px] cursor-pointer overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:bg-surface-elevated/84 hover:shadow-card-hover ${
        isFocused ? "bg-surface-elevated/88 shadow-card-hover" : ""
      }`}
    >
      {cover ? (
        <img src={cover} alt="" className="w-24 shrink-0 object-cover" />
      ) : (
        <div className="flex w-24 shrink-0 items-center justify-center bg-surface-secondary/78 text-text-muted">
          <MapPin className="h-6 w-6" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-[15px] font-bold leading-snug text-text-primary">{location.name}</h3>
          <div className="flex shrink-0 gap-0.5">
            <IconButton
              size="sm"
              tone={isFocused ? "active" : "brand"}
              icon={Locate}
              onClick={() => onFocusMap(location.id)}
              aria-label={t("card.focus")}
              title={t("card.focus")}
            />
            <span className="flex gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              <IconButton size="sm" tone="brand" icon={Pencil} onClick={() => onEdit(location)} aria-label={t("card.edit")} />
              <Popconfirm
                title={t("card.deleteTitle")}
                okText={t("common:actions.delete")}
                cancelText={t("common:actions.cancel")}
                okButtonProps={{ danger: true }}
                onConfirm={() => onDelete(location.id)}
              >
                <IconButton size="sm" tone="danger" icon={Trash2} aria-label={t("card.delete")} />
              </Popconfirm>
            </span>
          </div>
        </div>

        <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-text-secondary">
          {location.description || <span className="text-text-muted">{t("card.noDescription")}</span>}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          {distance != null && (
            <Badge size="sm" tone="brand" icon={Locate} numeric>
              {formatDistance(distance)}
            </Badge>
          )}
          <Badge size="sm" tone="amber" icon={MapPin} numeric>
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </Badge>
          {location.images?.length > 0 && (
            <Badge size="sm" icon={ImageIcon} numeric>
              {location.images.length}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
