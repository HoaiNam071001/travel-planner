# Travel Planner — bối cảnh dự án

Đây là project cá nhân giúp lên kế hoạch đi chơi: lưu địa điểm, tạo các "mục" (item)
gắn với địa điểm + giá + khung giờ, gom các mục vào "đơn vị" (unit = 1 ngày),
và nhiều unit gộp thành 1 "kế hoạch" (plan) tổng.

## Tech stack đã chọn (ưu tiên free, dùng cá nhân)

- Frontend: React + Vite, TailwindCSS, lucide-react (icon)
- UI components: Ant Design (`antd`) — Button/Modal/Input/DatePicker dùng qua wrapper ở
  `src/shared/components/`, theme khớp palette stone/cyan ở `src/shared/theme/antdTheme.js`
  (màu chính `#06B6D4`, tương ứng Tailwind `cyan-500`)
- Bản đồ: react-leaflet + leaflet, tile OpenStreetMap (free, không cần API key) — dùng ở
  trang Địa điểm để hiện vị trí trên bản đồ
- Routing: react-router-dom
- Backend/Database: Supabase (Postgres + Auth + Storage) — không viết server riêng,
  gọi qua tầng service (`src/services/*.service.js`), client dùng chung ở
  `src/lib/supabaseClient.js`
- Auth: Supabase Auth, đăng nhập bằng Google OAuth — session quản lý qua
  `src/context/AuthContext.jsx` (`useAuth()`), route được bảo vệ bởi
  `src/routes/ProtectedRoute.jsx`
- Tính khoảng cách/thời gian di chuyển: OpenRouteService API (free key, không cần thẻ tín dụng)
- Drag & drop (kéo item vào unit): dnd-kit
- Deploy frontend: Vercel hoặc Netlify (free tier)
- Giải mã link Google Maps (dán vào modal địa điểm để tự điền tên + lat/lng): Supabase Edge
  Function `supabase/functions/resolve-maps-link` (theo redirect của link rút gọn
  `maps.app.goo.gl/...` phía server để né CORS), gọi qua
  `src/services/mapsLink.service.js`; parse URL đầy đủ ra tên/toạ độ bằng
  `src/shared/utils/googleMapsLink.js` (thuần regex, không cần gọi mạng)

## Kiến trúc code

- `src/shared/constants/tables.js` — enum tên bảng (`TABLES`), mọi service dùng chung,
  tránh chuỗi `"locations"` rải rác.
- `src/shared/constants/routes.js` — enum đường dẫn route (`ROUTES`), router + `Header`
  dùng chung.
- `src/shared/components/` — component UI dùng chung, wrap antd + style khớp Tailwind
  palette hiện có: `Button`, `Modal`, `Input`/`TextArea`, `DatePicker`, `ImageUrlInput`
  (input thêm ảnh từ URL, có preview + xoá). Luôn ưu tiên dùng lại các component này thay
  vì viết `<button>`/`<input>` thô hoặc import thẳng từ `antd` ở trang/component khác.
- `src/shared/theme/antdTheme.js` — theme token antd (màu chính cyan-500 `#06B6D4`, bo góc),
  áp dụng qua `<ConfigProvider>` bọc toàn app ở `main.jsx`.
- `src/services/*.service.js` — 1 file/bảng, là nơi duy nhất gọi `supabase.from(...)`.
  `locations.service.js` đã CRUD thật; `items`/`units`/`plans`/`unitRoutes` service hiện
  là stub (throw "not implemented"), chờ tính năng tương ứng trong roadmap.
- `src/context/AuthContext.jsx` — `AuthProvider` + `useAuth()`, theo dõi session qua
  `supabase.auth.onAuthStateChange`.
- `src/layouts/AppLayout.jsx` + `src/components/Header.jsx` — layout chung (header + nội
  dung) cho mọi trang đã đăng nhập.
- `src/pages/*` — 1 file/trang, map với route trong `App.jsx`.
- `src/components/LocationsMap.jsx` — bản đồ react-leaflet dùng chung cho các trang cần
  hiện vị trí (hiện đang dùng ở `LocationsPage`); fix icon marker mặc định của Leaflet ở
  `src/shared/map/leafletIconFix.js` (bắt buộc khi bundle bằng Vite).
- `src/shared/utils/googleMapsLink.js` — parse URL Google Maps đầy đủ ra tên + lat/lng bằng
  regex (không gọi mạng); `src/services/mapsLink.service.js` gọi Edge Function
  `resolve-maps-link` để theo redirect của link rút gọn `maps.app.goo.gl/...` trước, rồi mới
  parse — dùng ở `LocationFormModal` (ô "Dán link Google Maps").

## Data model (Postgres, xem `supabase/schema.sql`)

- `users`: user_id (PK, = `auth.users.id`), email, full_name, avatar — **tự động tạo bằng
  Postgres trigger** khi có user mới đăng nhập lần đầu (không phải app tự upsert).
- `locations`: id, user_id (FK), name, description, lat, lng, images (text[])
- `items` (mục nhỏ): id, user_id (FK), unit_id (FK, **nullable** — item có thể tồn tại độc lập
  chưa gắn unit nào), location_id (FK), name, price, start_time, end_time, note, order_index
- `units` (1 ngày / 1 đơn vị): id, user_id (FK), plan_id (FK, nullable), name, description,
  date, order_index
- `plans` (kế hoạch tổng): id, user_id (FK), name, description, start_date, end_date
- `unit_routes` (cache khoảng cách): unit_id, user_id (FK), distance_km, duration_min,
  route_geometry — tính bằng OpenRouteService Matrix API, chỉ recompute khi thứ tự/địa
  điểm trong unit đổi

Mọi bảng dữ liệu (trừ `users`) có cột `user_id uuid not null default auth.uid()` và **bật
Row Level Security (RLS)** — mỗi user chỉ đọc/ghi được dữ liệu của chính mình, chặn thật ở
tầng DB chứ không chỉ lọc ở UI.

Tổng cost/quãng đường của Plan = tổng hợp từ Unit, Unit tổng hợp từ Item — **tính động
(computed), không lưu cứng** ngoại trừ cache route ở trên.

## ⚠️ Bước thủ công bắt buộc — bật Google OAuth provider

Đăng nhập Google **sẽ không hoạt động** cho tới khi làm thủ công trong Supabase Dashboard
(không thể làm bằng code):

1. Google Cloud Console → tạo OAuth 2.0 Client ID (Web application) → Authorized redirect
   URI = `https://<project-ref>.supabase.co/auth/v1/callback`
2. Supabase Dashboard → Authentication → Providers → Google: bật, dán Client ID/Secret
3. Supabase Dashboard → Authentication → URL Configuration: set Site URL + Additional
   Redirect URLs (vd `http://localhost:5173` cho dev)

## ⚠️ Bước thủ công bắt buộc — deploy Edge Function `resolve-maps-link`

Ô "Dán link Google Maps" trong modal địa điểm chỉ giải mã được **link rút gọn**
(`maps.app.goo.gl/...`) sau khi Edge Function này được deploy lên Supabase (chưa deploy thì
link đầy đủ vẫn parse được bình thường vì phần đó chạy client-side thuần regex, không cần
Edge Function):

1. Cài Supabase CLI (`npm i -g supabase` hoặc `brew install supabase/tap/supabase`)
2. `supabase login` rồi `supabase link --project-ref <project-ref>`
3. `supabase functions deploy resolve-maps-link`

## Roadmap tính năng

1. ✅ **Location Manager** (`src/pages/LocationsPage.jsx`) — CRUD địa điểm qua modal
   (xem/sửa/tạo), đã nối Supabase thật qua `src/services/locations.service.js` (bảng
   `locations`, xem `supabase/schema.sql`). List bên trái (mỗi thẻ có nút sửa, nút bật/tắt
   hiện trên bản đồ, bấm vào thẻ mở modal xem chi tiết + ảnh); bản đồ bên phải
   (`src/components/LocationsMap.jsx`) chỉ hiện khi có ít nhất 1 địa điểm đang bật xem bản
   đồ, còn lại list hiện full-width dạng lưới. Modal tạo/sửa có ô dán link Google Maps
   (đầy đủ hoặc rút gọn `maps.app.goo.gl`) để tự điền tên + lat/lng, xem
   `src/shared/utils/googleMapsLink.js` + Edge Function `resolve-maps-link` ở trên.
2. ✅ **Đăng nhập Google + layout + services layer** — `src/pages/LoginPage.jsx`,
   `src/context/AuthContext.jsx`, `src/routes/ProtectedRoute.jsx`, layout
   Header + content (`src/layouts/AppLayout.jsx`), bảng `users`, RLS theo `user_id` trên
   mọi bảng dữ liệu. Header có đủ 4 trang điều hướng (Địa điểm/Mục/Đơn vị/Kế hoạch),
   3 trang sau còn là placeholder "Đang phát triển".
3. ⏳ Item Manager — CRUD mục nhỏ, chọn location từ danh sách trên, unit_id để trống ban đầu
   (trang `src/pages/ItemsPage.jsx`, service `src/services/items.service.js` đã có sẵn
   khung, cần code phần CRUD thật)
4. ⏳ Unit Manager — tạo đơn vị/ngày, kéo-thả (dnd-kit) item vào unit
5. ⏳ Tính tổng cost/thời gian của 1 unit dựa trên các item bên trong
6. ⏳ Gọi OpenRouteService tính khoảng cách + thời gian di chuyển giữa các item trong unit
7. ⏳ Vẽ bản đồ + tuyến đường (react-leaflet)
8. ⏳ Trang Plan tổng hợp nhiều unit

## Việc cần làm tiếp theo (ngay bây giờ)

- Chạy file `supabase/schema.sql` (đã viết lại, có bảng `users` + `user_id` + RLS) trong
  Supabase SQL Editor
- Bật Google OAuth provider thủ công trong Supabase Dashboard (xem mục "⚠️ Bước thủ công
  bắt buộc" ở trên) — bắt buộc trước khi test đăng nhập được
- Deploy Edge Function `resolve-maps-link` (xem mục "⚠️ Bước thủ công bắt buộc" thứ 2 ở
  trên) — bắt buộc để ô dán link Google Maps giải mã được link rút gọn
- Làm tiếp **Item Manager** (bước 3 trong roadmap): code CRUD thật vào
  `src/services/items.service.js` (thay các hàm stub) + xây UI trong
  `src/pages/ItemsPage.jsx` — theo mẫu code đã có ở `locations.service.js` /
  `LocationsPage.jsx`
- Cài thêm `dnd-kit` khi bắt đầu bước 4 (Unit Manager), `react-leaflet` + `leaflet` khi
  bắt đầu bước 7 (bản đồ) — chưa cần bây giờ
