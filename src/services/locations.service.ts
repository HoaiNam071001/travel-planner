import { supabase } from "../lib/supabaseClient";
import { TABLES } from "../shared/constants/tables";
import { boundingBox, distanceMeters, type LatLng } from "../shared/utils/geo";
import type { Id, LocationRow } from "../shared/types/models";
import type { ListResult, QueryResult, WriteResult } from "./types";

export const LOCATIONS_PAGE_SIZE = 12;

export interface LocationInput {
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  images: string[];
}

export interface ListLocationsParams {
  /** Tìm theo tên (không phân biệt hoa thường), lọc ở tầng Postgres. */
  search?: string;
  offset?: number;
  limit?: number;
}

export interface LocationsPage {
  rows: LocationRow[];
  /** Tổng số bản ghi khớp bộ lọc — dùng để biết còn trang sau không. */
  total: number;
  hasMore: boolean;
}

/** `%` và `_` là ký tự đại diện của LIKE nên phải escape để tìm đúng chữ user gõ. */
function escapeLike(keyword: string): string {
  return keyword.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Danh sách địa điểm có phân trang (infinite scroll ở `LocationsPage` gọi liên
 * tiếp với `offset` tăng dần) + tìm theo tên.
 */
export async function listLocationsPage({
  search = "",
  offset = 0,
  limit = LOCATIONS_PAGE_SIZE,
}: ListLocationsParams = {}): Promise<QueryResult<LocationsPage>> {
  let query = supabase
    .from(TABLES.LOCATIONS)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const keyword = search.trim();
  if (keyword) query = query.ilike("name", `%${escapeLike(keyword)}%`);

  const { data, error, count } = await query;
  if (error) return { data: null, error };

  const total = count ?? 0;
  return {
    data: { rows: data ?? [], total, hasMore: offset + (data?.length ?? 0) < total },
    error: null,
  };
}

/** Toàn bộ địa điểm — dùng ở các picker (hoạt động) nơi cần danh sách đầy đủ. */
export async function listLocations(): Promise<ListResult<LocationRow>> {
  return supabase.from(TABLES.LOCATIONS).select("*").order("created_at", { ascending: true });
}

/**
 * Địa điểm nằm trong bán kính `radiusMeters` quanh 1 toạ độ. Lọc thô bằng hộp bao
 * ở Postgres (dùng được index trên lat/lng) rồi lọc chính xác bằng Haversine ở
 * client — không cần bật PostGIS.
 */
export async function listLocationsNear(
  center: LatLng,
  radiusMeters: number
): Promise<ListResult<LocationRow & { distance: number }>> {
  const box = boundingBox(center, radiusMeters);
  const { data, error } = await supabase
    .from(TABLES.LOCATIONS)
    .select("*")
    .gte("lat", box.minLat)
    .lte("lat", box.maxLat)
    .gte("lng", box.minLng)
    .lte("lng", box.maxLng);

  if (error) return { data: null, error };

  const withDistance = (data ?? [])
    .map((row) => ({ ...row, distance: distanceMeters(center, row) }))
    .filter((row) => row.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance);

  return { data: withDistance, error: null };
}

export async function createLocation(input: LocationInput): Promise<QueryResult<LocationRow>> {
  return supabase.from(TABLES.LOCATIONS).insert(input).select().single();
}

export async function updateLocation(
  id: Id,
  input: LocationInput
): Promise<QueryResult<LocationRow>> {
  return supabase.from(TABLES.LOCATIONS).update(input).eq("id", id).select().single();
}

export async function deleteLocation(id: Id): Promise<WriteResult> {
  return supabase.from(TABLES.LOCATIONS).delete().eq("id", id);
}
