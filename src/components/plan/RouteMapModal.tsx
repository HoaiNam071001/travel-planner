import { useState } from "react";
import { Loader2, MapPin, Route as RouteIcon } from "lucide-react";
import { useTranslation } from "../../i18n/useAppTranslation";
import Modal from "../../shared/components/Modal";
import Badge from "../../shared/components/Badge";
import Button from "../../shared/components/Button";
import { formatDistance, formatDuration } from "../../shared/utils/format";
import type { Id, ItemLocation } from "../../shared/types/models";
import type { RouteResult } from "../../services/openRouteService";
import RouteMap from "./RouteMap";

export interface RouteMapModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  points: ItemLocation[];
  route: RouteResult | null;
  loading: boolean;
  onFindRoute: (points: ItemLocation[]) => void;
}

export default function RouteMapModal({
  open,
  onClose,
  title,
  points,
  route,
  loading,
  onFindRoute,
}: RouteMapModalProps) {
  const { t } = useTranslation("planDetail");
  const [selectedIds, setSelectedIds] = useState<Set<Id>>(() => new Set(points.map((p) => p.id)));
  const [fetchedIds, setFetchedIds] = useState<Set<Id> | null>(null);

  const selectedPoints = points.filter((p) => selectedIds.has(p.id));
  const isStale =
    !fetchedIds || fetchedIds.size !== selectedIds.size || [...selectedIds].some((id) => !fetchedIds.has(id));
  const shownRoute = !isStale ? route : null;

  function toggle(id: Id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(selectedIds.size === points.length ? new Set() : new Set(points.map((p) => p.id)));
  }

  function handleFindRoute() {
    setFetchedIds(new Set(selectedIds));
    onFindRoute(selectedPoints);
  }

  return (
    <Modal open={open} onClose={onClose} title={title} width={720} footer={null}>
      <div className="space-y-4">
        <div className="relative h-80 w-full overflow-hidden rounded-2xl">
          {loading ? (
            <div className="flex h-full w-full items-center justify-center bg-surface-secondary/72 text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <RouteMap points={selectedPoints} geometry={shownRoute?.geometry ?? null} mode={shownRoute?.mode ?? null} />
          )}
        </div>

        {points.length > 1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">
                {t("planDetail:routeMap.selectCount", { selected: selectedIds.size, total: points.length })}
              </span>
              <button type="button" onClick={toggleAll} className="text-xs font-medium text-primary hover:underline">
                {selectedIds.size === points.length
                  ? t("planDetail:routeMap.deselectAll")
                  : t("planDetail:routeMap.selectAll")}
              </button>
            </div>
            <ul className="scroll-thin max-h-48 divide-y divide-border/8 overflow-y-auto rounded-2xl bg-surface-elevated/54">
              {points.map((point, index) => (
                <li key={point.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-surface-secondary/72">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(point.id)}
                      onChange={() => toggle(point.id)}
                      className="h-4 w-4 shrink-0 rounded border-border/16 text-primary focus:ring-primary/30"
                    />
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-[10px] font-semibold text-text-secondary">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-text-primary">{point.name}</span>
                  </label>
                </li>
              ))}
            </ul>

            <Button
              variant="primary"
              block
              icon={<RouteIcon className="h-4 w-4" />}
              loading={loading}
              disabled={selectedIds.size < 2}
              onClick={handleFindRoute}
            >
              {t("planDetail:routeMap.findRoute")}
            </Button>
          </div>
        )}

        {!loading && shownRoute && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge icon={RouteIcon} tone="brand" numeric>
              {formatDistance(shownRoute.distanceKm * 1000)}
            </Badge>
            {shownRoute.durationMin != null && <Badge numeric>{formatDuration(shownRoute.durationMin)}</Badge>}
            {shownRoute.mode === "fallback" && (
              <span className="text-xs text-text-muted">{t("planDetail:routeMap.fallbackNote")}</span>
            )}
          </div>
        )}

        {!loading && shownRoute && shownRoute.legs.length === selectedPoints.length - 1 && (
          <ol className="divide-y divide-border/8 rounded-2xl bg-surface-elevated/54">
            {shownRoute.legs.map((leg, index) => {
              const from = selectedPoints[index];
              const to = selectedPoints[index + 1];
              if (!from || !to) return null;
              return (
                <li key={`${from.id}-${to.id}-${index}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-text-secondary">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                    <span className="truncate">{from.name}</span>
                    <span className="text-text-muted">→</span>
                    <span className="truncate">{to.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-text-secondary tnum">
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
