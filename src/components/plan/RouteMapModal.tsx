import { Loader2, MapPin, Route as RouteIcon } from "lucide-react";
import Modal from "../../shared/components/Modal";
import Badge from "../../shared/components/Badge";
import { formatDistance, formatDuration } from "../../shared/utils/format";
import type { ItemLocation } from "../../shared/types/models";
import type { RouteResult } from "../../services/openRouteService";
import RouteMap from "./RouteMap";

export interface RouteMapModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  points: ItemLocation[];
  route: RouteResult | null;
  loading: boolean;
}

export default function RouteMapModal({ open, onClose, title, points, route, loading }: RouteMapModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={720} footer={null}>
      <div className="space-y-4">
        <div className="relative h-96 w-full overflow-hidden rounded-2xl">
          {loading ? (
            <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <RouteMap points={points} geometry={route?.geometry ?? null} mode={route?.mode ?? null} />
          )}
        </div>

        {!loading && route && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge icon={RouteIcon} tone="brand" numeric>
              {formatDistance(route.distanceKm * 1000)}
            </Badge>
            {route.durationMin != null && (
              <Badge numeric>{formatDuration(route.durationMin)}</Badge>
            )}
            {route.mode === "fallback" && (
              <span className="text-xs text-slate-400">
                Ước tính theo đường chim bay — thêm ORS API key để có tuyến đường thật.
              </span>
            )}
          </div>
        )}

        {!loading && route && route.legs.length === points.length - 1 && (
          <ol className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
            {route.legs.map((leg, index) => {
              const from = points[index];
              const to = points[index + 1];
              if (!from || !to) return null;
              return (
                <li key={`${from.id}-${to.id}-${index}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-slate-600">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{from.name}</span>
                    <span className="text-slate-300">→</span>
                    <span className="truncate">{to.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500 tnum">
                    {formatDistance(leg.distanceKm * 1000)}
                    {leg.durationMin != null && ` · ${formatDuration(leg.durationMin)}`}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Modal>
  );
}
