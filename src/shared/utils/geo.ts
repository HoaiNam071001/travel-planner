// Tính khoảng cách đường chim bay giữa 2 toạ độ (Haversine) — dùng cho nút
// "Tìm địa điểm quanh đây" trên bản đồ. Không gọi mạng, không cần API key.

const EARTH_RADIUS_M = 6_371_000;

export interface LatLng {
  lat: number;
  lng: number;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Hộp bao (bounding box) quanh 1 điểm với bán kính mét — dùng để lọc thô ở tầng
 * Postgres (`lat/lng between`) trước khi lọc chính xác bằng Haversine ở client.
 */
export function boundingBox(center: LatLng, radiusMeters: number) {
  const latDelta = (radiusMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  const cosLat = Math.cos(toRad(center.lat));
  // Gần cực thì cos(lat) tiến về 0 -> chặn dưới để không chia cho ~0.
  const lngDelta = latDelta / Math.max(Math.abs(cosLat), 1e-6);

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}
