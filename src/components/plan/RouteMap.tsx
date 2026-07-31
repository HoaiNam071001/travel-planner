import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "../../shared/map/leafletIconFix";
import type { LatLng } from "../../shared/utils/geo";
import type { ItemLocation } from "../../shared/types/models";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Điểm đầu/cuối tô màu khác để phân biệt hướng đi, các điểm giữa dùng màu brand. */
function pinColor(index: number, total: number): string {
  if (index === 0) return "#059669";
  if (index === total - 1) return "#E11D48";
  return "#0891B2";
}

function numberedPinIcon(index: number, total: number): L.DivIcon {
  return L.divIcon({
    className: "tp-pin-num",
    html: `<span class="tp-pin-num__shape" style="background:${pinColor(index, total)}"><span class="tp-pin-num__label">${index + 1}</span></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

interface FitBoundsProps {
  bounds: LatLng[];
}

function FitBounds({ bounds }: FitBoundsProps) {
  const map = useMap();
  const signature = bounds.map((p) => `${p.lat},${p.lng}`).join(";");

  useEffect(() => {
    if (bounds.length === 0) return;
    const first = bounds[0];
    if (!first) return;
    if (bounds.length === 1) {
      map.setView([first.lat, first.lng], 15);
      return;
    }
    map.fitBounds(
      L.latLngBounds(bounds.map((p) => [p.lat, p.lng] as [number, number])),
      { padding: [40, 40], maxZoom: 16 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, map]);

  return null;
}

export interface RouteMapProps {
  points: ItemLocation[];
  /** Toạ độ đường nối — polyline thật (ORS) hoặc đường thẳng (fallback), null = chưa có. */
  geometry: LatLng[] | null;
  mode: "real" | "fallback" | null;
}

export default function RouteMap({ points, geometry, mode }: RouteMapProps) {
  const center = useMemo<[number, number]>(() => {
    const first = points[0];
    return first ? [first.lat, first.lng] : [10.7769, 106.7009];
  }, [points]);

  return (
    <MapContainer center={center} zoom={13} zoomControl={false} scrollWheelZoom className="h-full w-full">
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} subdomains="abcd" maxZoom={20} />

      <FitBounds bounds={points} />

      {geometry && geometry.length > 1 && (
        <Polyline
          positions={geometry.map((p): [number, number] => [p.lat, p.lng])}
          pathOptions={
            mode === "fallback"
              ? { color: "#94A3B8", weight: 3, dashArray: "6 8" }
              : { color: "#0891B2", weight: 4 }
          }
        />
      )}

      {points.map((point, index) => (
        <Marker key={`${point.id}-${index}`} position={[point.lat, point.lng]} icon={numberedPinIcon(index, points.length)}>
          <Tooltip direction="top" offset={[0, -24]} opacity={1}>
            <span className="font-medium">
              {index + 1}. {point.name}
            </span>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
