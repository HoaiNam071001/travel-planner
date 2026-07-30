import { Popconfirm } from "antd";
import { Image as ImageIcon, Map, MapPin, Pencil, Trash2 } from "lucide-react";
import Badge from "../shared/components/Badge";
import IconButton from "../shared/components/IconButton";

export default function LocationCard({
  location,
  isViewedOnMap,
  onOpenDetail,
  onEdit,
  onToggleMap,
  onDelete,
}) {
  const cover = location.images?.[0];

  return (
    <div
      onClick={() => onOpenDetail(location)}
      className={`group surface flex cursor-pointer overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${
        isViewedOnMap ? "border-brand-300 ring-1 ring-brand-200" : "hover:border-brand-200"
      }`}
    >
      {cover && <img src={cover} alt="" className="w-24 shrink-0 object-cover" />}

      <div className="min-w-0 flex-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-[15px] font-bold leading-snug">{location.name}</h3>
          <div className="flex shrink-0 gap-0.5">
            <IconButton
              size="sm"
              tone={isViewedOnMap ? "active" : "brand"}
              icon={Map}
              onClick={() => onToggleMap(location.id)}
              aria-label={isViewedOnMap ? "Ẩn khỏi bản đồ" : "Xem trên bản đồ"}
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

        {location.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500">
            {location.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
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
