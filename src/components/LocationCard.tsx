import { Popconfirm } from "antd";
import { Image as ImageIcon, Locate, MapPin, Pencil, Trash2 } from "lucide-react";
import Badge from "../shared/components/Badge";
import IconButton from "../shared/components/IconButton";
import { formatDistance } from "../shared/utils/format";
import type { Id, LocationRow } from "../shared/types/models";

export interface LocationCardProps {
  location: LocationRow;
  /** Đang được "soi" trên bản đồ (bay tới + pin đậm). */
  isFocused: boolean;
  /** Khoảng cách tới tâm vùng tìm kiếm, chỉ có khi đang lọc "quanh đây". */
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
  const cover = location.images?.[0];

  return (
    <div
      onClick={() => onOpenDetail(location)}
      className={`group surface flex min-h-[132px] cursor-pointer overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${
        isFocused ? "border-brand-300 ring-1 ring-brand-200" : "hover:border-brand-200"
      }`}
    >
      {cover ? (
        <img src={cover} alt="" className="w-24 shrink-0 object-cover" />
      ) : (
        <div className="flex w-24 shrink-0 items-center justify-center bg-slate-100 text-slate-300">
          <MapPin className="h-6 w-6" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-[15px] font-bold leading-snug">{location.name}</h3>
          <div className="flex shrink-0 gap-0.5">
            <IconButton
              size="sm"
              tone={isFocused ? "active" : "brand"}
              icon={Locate}
              onClick={() => onFocusMap(location.id)}
              aria-label="Soi trên bản đồ"
              title="Soi trên bản đồ"
            />
            <span className="flex gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              <IconButton
                size="sm"
                tone="brand"
                icon={Pencil}
                onClick={() => onEdit(location)}
                aria-label="Sửa"
              />
              <Popconfirm
                title="Xoá địa điểm này?"
                okText="Xoá"
                cancelText="Huỷ"
                okButtonProps={{ danger: true }}
                onConfirm={() => onDelete(location.id)}
              >
                <IconButton size="sm" tone="danger" icon={Trash2} aria-label="Xoá" />
              </Popconfirm>
            </span>
          </div>
        </div>

        {/* Chiều cao cố định dù có mô tả hay không, để mọi thẻ cao bằng nhau. */}
        <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-slate-500">
          {location.description || <span className="text-slate-300">Chưa có mô tả</span>}
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
