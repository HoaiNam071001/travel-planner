import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, Tooltip, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import { Crosshair, Loader2, Locate } from "lucide-react";
import "../shared/map/leafletIconFix";
import { BASEMAPS, type BasemapKey } from "../shared/map/basemaps";
import MapBasemapSwitcher from "../shared/components/MapBasemapSwitcher";
import type { Id, LocationRow } from "../shared/types/models";
import type { LatLng } from "../shared/utils/geo";
import { formatDistance } from "../shared/utils/format";

/** Bán kính mặc định của nút "tìm địa điểm quanh đây". */
export const AREA_SEARCH_RADIUS_M = 700;

/** Pin tự vẽ (divIcon) — gọn và đúng màu brand hơn icon mặc định của Leaflet. */
function pinIcon(active: boolean): L.DivIcon {
  const fill = active ? "#0E7490" : "#06B6D4";
  return L.divIcon({
    className: "tp-pin",
    html: `<span class="tp-pin__shape" style="background:${fill}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -22],
  });
}

interface FitBoundsProps {
  locations: LocationRow[];
  focusId: Id | null | undefined;
}

/** Tự canh khung nhìn khi tập địa điểm đổi, và bay tới địa điểm đang được chọn. */
function ViewController({ locations, focusId }: FitBoundsProps) {
  const map = useMap();
  const signature = locations.map((l) => l.id).join(",");

  useEffect(() => {
    if (locations.length === 0) return;
    const first = locations[0];
    if (!first) return;
    if (locations.length === 1) {
      map.setView([first.lat, first.lng], 15);
      return;
    }
    map.fitBounds(
      L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng] as [number, number])),
      { padding: [48, 48], maxZoom: 16 }
    );
    // signature đại diện cho tập địa điểm; `locations` đổi tham chiếu mỗi render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, map]);

  useEffect(() => {
    const target = locations.find((l) => l.id === focusId);
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, map]);

  return null;
}

interface MapOverlayProps {
  basemap: BasemapKey;
  onBasemapChange: (key: BasemapKey) => void;
  onSearchArea?: (center: LatLng, radiusMeters: number) => void;
  searching?: boolean;
}

/**
 * Thanh nút nổi trên bản đồ. Render bên trong `MapContainer` nên phải chặn sự kiện
 * chuột lan xuống Leaflet, nếu không bấm nút sẽ kéo cả bản đồ.
 */
function MapOverlay({ basemap, onBasemapChange, onSearchArea, searching }: MapOverlayProps) {
  const map = useMap();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    L.DomEvent.disableClickPropagation(node);
    L.DomEvent.disableScrollPropagation(node);
  }, []);

  return (
    <div ref={ref} className="pointer-events-auto absolute left-3 right-3 top-3 z-[500] flex flex-wrap items-center gap-2">
      {onSearchArea && (
        <button
          type="button"
          disabled={searching}
          onClick={() => {
            const center = map.getCenter();
            onSearchArea({ lat: center.lat, lng: center.lng }, AREA_SEARCH_RADIUS_M);
          }}
          className="group flex items-center gap-1.5 rounded-full border border-border/60 bg-surface-elevated/92 px-3.5 py-2 text-xs font-semibold text-text-primary shadow-pop backdrop-blur transition hover:-translate-y-px hover:bg-surface-elevated disabled:translate-y-0 disabled:opacity-70"
        >
          {searching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <Crosshair className="h-3.5 w-3.5 text-primary transition group-hover:scale-110" />
          )}
          {searching ? "Đang tìm..." : `Tìm địa điểm ở đây (${AREA_SEARCH_RADIUS_M}m)`}
        </button>
      )}

      <MapBasemapSwitcher value={basemap} onChange={onBasemapChange} className="ml-auto" />
    </div>
  );
}

export interface LocationsMapProps {
  locations: LocationRow[];
  /** Địa điểm đang được chọn ở danh sách — bản đồ sẽ bay tới và tô đậm pin. */
  focusId?: Id | null;
  /** Vòng tròn bán kính đang lọc quanh 1 điểm (nút "tìm quanh đây"). */
  area?: { center: LatLng; radiusMeters: number } | null;
  onSelectLocation?: (location: LocationRow) => void;
  onSearchArea?: (center: LatLng, radiusMeters: number) => void;
  searching?: boolean;
}

export default function LocationsMap({
  locations,
  focusId,
  area,
  onSelectLocation,
  onSearchArea,
  searching,
}: LocationsMapProps) {
  const [basemap, setBasemap] = useState<BasemapKey>("voyager");
  const tiles = BASEMAPS[basemap];

  // Toạ độ khởi tạo: địa điểm đầu tiên, hoặc trung tâm TP.HCM khi chưa có gì.
  const center = useMemo<[number, number]>(() => {
    const first = locations[0];
    if (area) return [area.center.lat, area.center.lng];
    return first ? [first.lat, first.lng] : [10.7769, 106.7009];
  }, [locations, area]);

  return (
    <MapContainer center={center} zoom={13} zoomControl={false} scrollWheelZoom className="h-full w-full">
      <ZoomControl position="bottomleft" />
      <TileLayer
        key={basemap}
        attribution={tiles.attribution}
        url={tiles.url}
        subdomains={tiles.subdomains}
        maxZoom={tiles.maxZoom}
      />

      <ViewController locations={locations} focusId={focusId} />
      <MapOverlay
        basemap={basemap}
        onBasemapChange={setBasemap}
        onSearchArea={onSearchArea}
        searching={searching}
      />

      {area && (
        <Circle
          center={[area.center.lat, area.center.lng]}
          radius={area.radiusMeters}
          pathOptions={{ color: "#06B6D4", weight: 1.5, fillColor: "#06B6D4", fillOpacity: 0.08 }}
        />
      )}

      {locations.map((loc) => (
        <Marker
          key={loc.id}
          position={[loc.lat, loc.lng]}
          icon={pinIcon(loc.id === focusId)}
          eventHandlers={{ click: () => onSelectLocation?.(loc) }}
        >
          <Tooltip direction="top" offset={[0, -22]} opacity={1}>
            <span className="font-medium">{loc.name}</span>
            {area && (
              <span className="ml-1 text-text-muted tnum">
                · {formatDistance(distanceFromArea(loc, area.center))}
              </span>
            )}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}

function distanceFromArea(loc: LocationRow, center: LatLng): number {
  return L.latLng(loc.lat, loc.lng).distanceTo(L.latLng(center.lat, center.lng));
}

/** Nút nhỏ dùng lại ở LocationCard để "soi" 1 địa điểm trên bản đồ. */
export const FocusOnMapIcon = Locate;
