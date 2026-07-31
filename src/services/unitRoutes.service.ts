// Cache quãng đường/thời gian di chuyển giữa các địa điểm TRONG 1 chặng (bảng
// `unit_routes`, PK = unit_id). Không có cột signature riêng — lưu kèm luôn trong
// `route_geometry` jsonb để biết khi nào cache lệch với thứ tự địa điểm hiện tại của
// chặng mà không cần thêm cột/migration (xem CLAUDE.md mục unit_routes).
import { supabase } from "../lib/supabaseClient";
import { TABLES } from "../shared/constants/tables";
import type { LatLng } from "../shared/utils/geo";
import { locationSequenceSignature, unitLocationSequence } from "../shared/utils/unitRoute";
import type { Id, Item, Unit, UnitRoute } from "../shared/types/models";
import { fetchRoute, hasOrsKey, type RouteLeg, type RouteResult } from "./openRouteService";
import type { QueryResult, WriteResult } from "./types";

interface RouteGeometryPayload {
  signature: string;
  geometry: LatLng[];
  legs: RouteLeg[];
  mode: "real" | "fallback";
}

function isRouteGeometryPayload(value: unknown): value is RouteGeometryPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "signature" in value &&
    "geometry" in value &&
    "mode" in value
  );
}

export async function getRouteForUnit(unitId: Id): Promise<QueryResult<UnitRoute>> {
  return supabase.from(TABLES.UNIT_ROUTES).select<string, UnitRoute>("*").eq("unit_id", unitId).maybeSingle();
}

export async function upsertRouteForUnit(
  unitId: Id,
  signature: string,
  route: RouteResult
): Promise<WriteResult> {
  const payload: RouteGeometryPayload = {
    signature,
    geometry: route.geometry,
    legs: route.legs,
    mode: route.mode,
  };
  return supabase.from(TABLES.UNIT_ROUTES).upsert({
    unit_id: unitId,
    distance_km: route.distanceKm,
    duration_min: route.durationMin,
    route_geometry: payload,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Chỗ duy nhất mọi UI (Tổng quan + 2 modal bản đồ) nên gọi để lấy quãng đường của 1
 * chặng: đọc cache `unit_routes`, chỉ gọi lại ORS khi thứ tự/địa điểm đổi (signature
 * lệch) hoặc khi vừa có key mà cache cũ đang ở chế độ fallback.
 */
export async function resolveUnitRoute(unit: Unit, items: Item[]): Promise<RouteResult | null> {
  const points = unitLocationSequence(items);
  if (points.length < 2) return null;

  const signature = locationSequenceSignature(points);
  const { data: cached } = await getRouteForUnit(unit.id);
  const cachedPayload = isRouteGeometryPayload(cached?.route_geometry) ? cached.route_geometry : null;

  const cacheIsFresh =
    cachedPayload?.signature === signature && (cachedPayload.mode === "real" || !hasOrsKey());

  if (cacheIsFresh && cachedPayload) {
    return {
      distanceKm: cached?.distance_km ?? 0,
      durationMin: cached?.duration_min ?? null,
      geometry: cachedPayload.geometry,
      legs: cachedPayload.legs,
      mode: cachedPayload.mode,
    };
  }

  const route = await fetchRoute(points);
  await upsertRouteForUnit(unit.id, signature, route);
  return route;
}
