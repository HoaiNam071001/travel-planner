// Tile miễn phí, không cần API key. CARTO Voyager nhìn "sạch" hơn OSM mặc định
// (chữ nhỏ, màu nhạt) nên marker và tuyến đường nổi lên rõ hơn. Dùng chung cho mọi bản
// đồ trong app (LocationsMap, RouteMap) để chỉ có 1 nơi khai báo URL tile.
export const BASEMAPS = {
  voyager: {
    label: "Sáng",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  },
  satellite: {
    label: "Vệ tinh",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics",
    subdomains: "abc",
    maxZoom: 19,
  },
} as const;

export type BasemapKey = keyof typeof BASEMAPS;
