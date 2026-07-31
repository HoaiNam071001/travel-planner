// Gọi thẳng OpenRouteService (ORS) Directions API từ client bằng free API key (giống
// cách project đã lộ Supabase anon key ở client — xem CLAUDE.md). Chưa cấu hình key,
// chưa đủ điểm, hoặc gọi lỗi -> luôn rơi về fallback đường chim bay (Haversine), không
// throw, để UI không bao giờ bị chặn vì thiếu key.
import { distanceMeters, type LatLng } from "../shared/utils/geo";

const ORS_KEY = import.meta.env.VITE_OPENROUTESERVICE_KEY as string | undefined;
const ORS_PROFILE = "driving-car";

/** Dùng để quyết định có nên recompute cache đang ở mode "fallback" hay không. */
export function hasOrsKey(): boolean {
  return Boolean(ORS_KEY);
}

export interface RouteLeg {
  distanceKm: number;
  /** null khi ở chế độ fallback — đường chim bay không suy đoán được thời gian di chuyển. */
  durationMin: number | null;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number | null;
  geometry: LatLng[];
  /** 1 phần tử / cặp điểm liên tiếp trong `points` truyền vào — để hiện từng chặng nhỏ. */
  legs: RouteLeg[];
  mode: "real" | "fallback";
}

function fallbackRoute(points: LatLng[]): RouteResult {
  const legs: RouteLeg[] = [];
  for (let i = 1; i < points.length; i++) {
    legs.push({ distanceKm: distanceMeters(points[i - 1]!, points[i]!) / 1000, durationMin: null });
  }
  return {
    distanceKm: legs.reduce((sum, leg) => sum + leg.distanceKm, 0),
    durationMin: null,
    geometry: points,
    legs,
    mode: "fallback",
  };
}

interface OrsDirectionsResponse {
  features?: {
    geometry?: { coordinates?: [number, number][] };
    properties?: {
      summary?: { distance?: number; duration?: number };
      segments?: { distance?: number; duration?: number }[];
    };
  }[];
}

export async function fetchRoute(points: LatLng[]): Promise<RouteResult> {
  if (points.length < 2 || !ORS_KEY) return fallbackRoute(points);

  try {
    const res = await fetch(`https://api.openrouteservice.org/v2/directions/${ORS_PROFILE}/geojson`, {
      method: "POST",
      headers: { Authorization: ORS_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: points.map((p) => [p.lng, p.lat]) }),
    });
    if (!res.ok) return fallbackRoute(points);

    const data = (await res.json()) as OrsDirectionsResponse;
    const feature = data.features?.[0];
    const coords = feature?.geometry?.coordinates;
    const summary = feature?.properties?.summary;
    const segments = feature?.properties?.segments;
    if (!coords?.length || !summary) return fallbackRoute(points);

    const legs: RouteLeg[] =
      segments?.length === points.length - 1
        ? segments.map((seg) => ({
            distanceKm: (seg.distance ?? 0) / 1000,
            durationMin: (seg.duration ?? 0) / 60,
          }))
        : [];

    return {
      distanceKm: (summary.distance ?? 0) / 1000,
      durationMin: (summary.duration ?? 0) / 60,
      geometry: coords.map(([lng, lat]) => ({ lat, lng })),
      legs,
      mode: "real",
    };
  } catch {
    return fallbackRoute(points);
  }
}
