const SHORT_LINK_HOSTS = ["maps.app.goo.gl", "goo.gl"];

export function isShortGoogleMapsLink(url) {
  try {
    return SHORT_LINK_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

// Tách tên địa điểm + lat/lng từ URL Google Maps đầy đủ. Ưu tiên toạ độ trong
// `!3d..!4d..` (vị trí thật của place) vì toạ độ sau `@` chỉ là tâm khung nhìn
// bản đồ, có thể lệch khá xa vị trí place khi user đã kéo/zoom bản đồ.
export function parseGoogleMapsUrl(url) {
  const placeMatch = url.match(/\/place\/([^/@]+)/);
  const name = placeMatch ? decodeURIComponent(placeMatch[1].replace(/\+/g, " ")) : "";

  const dataCoordMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const qCoordMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  const atCoordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const coordMatch = dataCoordMatch || qCoordMatch || atCoordMatch;

  if (!coordMatch) return null;

  return {
    name,
    lat: parseFloat(coordMatch[1]),
    lng: parseFloat(coordMatch[2]),
  };
}
