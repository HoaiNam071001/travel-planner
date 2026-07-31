# Travel Planner — bối cảnh dự án

Đây là project cá nhân giúp lên kế hoạch đi chơi: lưu địa điểm, tạo các "hoạt động" (item,
tên bảng/route vẫn là `items` — chỉ đổi tên hiển thị tiếng Việt) gắn với địa điểm + giá +
khung giờ, gom các hoạt động vào "chặng" (unit, tên bảng/route vẫn là `units`) — mỗi chặng
có khoảng thời gian riêng (start/end datetime) + "loại" động do user tự tạo (vd Ngày, Tuần),
và nhiều chặng gộp thành 1 "kế hoạch" (plan) tổng.

## Tech stack đã chọn (ưu tiên free, dùng cá nhân)

- Frontend: React + Vite + **TypeScript**, TailwindCSS, lucide-react (icon)
- **TypeScript strict, không dùng `any`** — `tsconfig.json` bật `strict` + `noImplicitAny` +
  `noUnusedLocals/Parameters`; `npm run typecheck` (hoặc `npm run build`, đã chạy `tsc
  --noEmit` trước khi bundle) phải sạch. Kiểu miền tập trung ở `src/shared/types/models.ts`,
  schema cho supabase-js ở `src/lib/database.types.ts` (viết tay, để mọi truy vấn
  `supabase.from(...)` được suy kiểu thay vì trả `any`), hình dạng `{ data, error }` chung
  của service ở `src/services/types.ts`. Cần "mở khoá" 1 interface cho supabase thì dùng
  `Cols<T>` trong `database.types.ts` (interface không có index signature ngầm).
- UI components: Ant Design (`antd`) — Button/Modal/Input/DatePicker dùng qua wrapper ở
  `src/shared/components/`, theme khớp design system ở `src/shared/theme/antdTheme.ts`
- Design system (xem mục "Design system" bên dưới): neutral **slate**, brand **cyan**
  khai báo thành thang `brand-*` trong `tailwind.config.js` (`brand-500` = `#06B6D4`);
  font Inter (body) + Plus Jakarta Sans (`font-display`, cho tiêu đề) + JetBrains Mono
  (`font-mono`, cho số/giờ/toạ độ), load qua Google Fonts ở `index.html`
- Bản đồ: react-leaflet + leaflet — tile **CARTO Voyager** (mặc định, sáng & sạch hơn OSM
  thô) và **Esri World Imagery** (lớp "Vệ tinh"), cả 2 đều free không cần API key; đổi lớp
  bằng nút nổi trên bản đồ. Pin là `divIcon` tự vẽ (`.tp-pin` trong `src/index.css`)
- Drag & drop trên trục thời gian (tab Lịch trình của kế hoạch) **không dùng dnd-kit** mà
  dùng pointer event thô: xem `src/components/plan/timeline/`
- Routing: react-router-dom
- Backend/Database: Supabase (Postgres + Auth + Storage) — không viết server riêng,
  gọi qua tầng service (`src/services/*.service.ts`), client dùng chung ở
  `src/lib/supabaseClient.ts`
- Auth: Supabase Auth, đăng nhập bằng Google OAuth — session quản lý qua
  `src/context/AuthContext.tsx` (`useAuth()`), route được bảo vệ bởi
  `src/routes/ProtectedRoute.tsx`
- Tính khoảng cách/thời gian di chuyển: OpenRouteService API (free key, không cần thẻ tín dụng)
- Drag & drop: `@dnd-kit/core` + `@dnd-kit/sortable` — 3 chỗ dùng:
  1. lưới trang Hoạt động (`ItemsPage`, `rectSortingStrategy`),
  2. cột "đã chọn" của `DualListPicker` (`verticalListSortingStrategy`),
  3. **Plan Builder** (`src/components/plan/PlanBoard.tsx`) — board nhiều lane, kéo hoạt
     động **giữa các lane** (mỗi lane là 1 chặng, lane đầu là kho hoạt động chưa gắn chặng)
     bằng 1 `DndContext` + `closestCorners` + `useDroppable` cho từng lane
- Deploy frontend: Vercel hoặc Netlify (free tier)
- Giải mã link Google Maps (dán vào modal địa điểm để tự điền tên + lat/lng): Supabase Edge
  Function `supabase/functions/resolve-maps-link` (theo redirect của link rút gọn
  `maps.app.goo.gl/...` phía server để né CORS), gọi qua
  `src/services/mapsLink.service.ts`; parse URL đầy đủ ra tên/toạ độ bằng
  `src/shared/utils/googleMapsLink.ts` (thuần regex, không cần gọi mạng)

## Design system

Hướng thiết kế: **light SaaS** (nền `slate-50`, card trắng bo 16px, shadow nhiều lớp rất
nhẹ) + **hero tối** (gradient `slate-950` → `brand-800`, phủ `.hero-grid`) cho phần Tổng
quan kế hoạch và cột trái trang đăng nhập.

- `tailwind.config.js` — thang màu `brand-*`, shadow `xs`/`card`/`card-hover`/`pop`,
  animation `fade-in`/`fade-up`/`scale-in`, 3 font family.
- `src/index.css` — base (nền, `h1..h4` tự dùng `font-display`, focus ring brand) + các
  class dùng lại: `.surface` (card trắng chuẩn), `.surface-muted`, `.scroll-thin`
  (thanh cuộn mảnh cho các cột của Plan Builder), `.hero-grid`, `.tnum` (tabular figures
  cho mọi con số: giá/giờ/toạ độ).
- Quy ước: **không** viết lại chuỗi `rounded-... border-... shadow-...` dài ở từng file —
  dùng `.surface` hoặc primitive dưới đây.

## Kiến trúc code

- `src/shared/constants/tables.ts` — enum tên bảng (`TABLES`), mọi service dùng chung,
  tránh chuỗi `"locations"` rải rác.
- `src/shared/constants/routes.ts` — enum đường dẫn route (`ROUTES`) + helper
  `planPath(id)`, router + `Header` + `PlanCard` dùng chung.
- `src/shared/constants/board.ts` — `LIBRARY_LANE`, id giả của lane "kho hoạt động" trong
  Plan Builder (để phân biệt với lane là chặng thật).
- `src/shared/components/` — component UI dùng chung. Wrapper antd: `Button`, `Modal`,
  `Input`/`TextArea`, `DatePicker`, `ImageUrlInput`. Primitive của design system:
  `Badge` (mọi chip metadata, có `tone` neutral/brand/amber/emerald/violet/rose/inverse),
  `StatTile` (ô số liệu, `inverse` khi đặt trên hero tối), `PageHeader` (icon gradient +
  tiêu đề + actions + hàng filter), `EmptyState`, `Field` (label + control cho form
  modal), `IconButton` (nút icon nhỏ trên card, `forwardRef` nên dùng được làm trigger
  của `Popconfirm`/`Dropdown`). Luôn ưu tiên dùng lại thay vì viết `<button>`/`<span>` thô
  hoặc import thẳng từ `antd`.
- `src/shared/utils/format.ts` — **nơi duy nhất** định dạng hiển thị: `formatPrice`,
  `formatPriceShort`, `formatDate`, `formatTime`, `formatDateRange`, `formatDateTimeRange`,
  `formatDuration`, `formatDistance`, `dayCount`. Trước đây mỗi card tự viết lại
  `formatRange` nên format lệch nhau giữa các trang — đừng lặp lại chuyện đó. File này
  **chỉ định dạng**, không tính giờ.
- `src/shared/utils/schedule.ts` — **nơi duy nhất** tính "chạy từ lúc nào tới lúc nào":
  `itemRange`/`itemDurationMinutes`, `unitRange`/`unitDurationMinutes`,
  `computeItemSchedule(unit, items, breakMinutes)`, `snapToMinutes`/`clampTime`,
  `DEFAULT_UNIT_DURATION_MINUTES = 360`. **Quy tắc bất di bất dịch: có mốc kết thúc thì
  mốc kết thúc thắng**, chỉ khi thiếu mới lấy `bắt đầu + duration_minutes`. Mọi chỗ hiển
  thị khoảng thời gian của hoạt động/chặng đều phải đi qua đây, đừng tự `dayjs().add()`.
- `src/shared/utils/planStats.ts` — tính động cost/thời lượng: `groupItemsByUnit(items)`
  → `Map<unitId, item[]>` đã sắp thứ tự, `unitStats(items, breakMinutes)` →
  `{itemCount, cost, minutes}` (thời lượng **nội dung**, khác với khoảng thời gian đã xếp
  lịch của chặng — cái đó là `unitRange()`), `unitsForPlan(units, planId)`,
  `planTotals(planUnits, itemsByUnit)`.
- `src/shared/utils/geo.ts` — `distanceMeters` (Haversine) + `boundingBox`, dùng cho nút
  "Tìm địa điểm ở đây" trên bản đồ (lọc thô bằng bbox ở Postgres rồi lọc chính xác ở client,
  không cần bật PostGIS).
- `src/shared/theme/antdTheme.ts` — theme token antd (brand cyan, neutral slate, bo góc,
  shadow), áp dụng qua `<ConfigProvider>` bọc toàn app ở `main.tsx`.
- `src/services/*.service.ts` — 1 file/bảng, là nơi duy nhất gọi `supabase.from(...)` cho
  bảng đó (kể cả khi thao tác xuất phát từ trang khác — vd `units.service.ts` gọi hàm
  `assignItemsToUnit`/`unassignItemsFromUnit` export từ `items.service.ts` thay vì tự
  `supabase.from(TABLES.ITEMS)`). `locations`/`items`/`units`/`unitTypes`/`plans` đã CRUD
  thật; `unitRoutes` service vẫn là stub, chờ roadmap.
  **Quy ước quan hệ**: `updateUnit`/`updatePlan` coi `itemIds`/`unitIds` **`undefined` =
  không đụng tới quan hệ** (chỉ sửa metadata) — dùng khi form mở từ Plan Builder, nơi việc
  gán đã làm bằng kéo-thả.
- `src/context/AuthContext.tsx` — `AuthProvider` + `useAuth()`, theo dõi session qua
  `supabase.auth.onAuthStateChange`.
- `src/layouts/AppLayout.tsx` + `src/components/Header.tsx` — layout chung cho mọi trang đã
  đăng nhập: header sticky nền mờ (`backdrop-blur`), nav dạng segmented pill, avatar mở
  `Dropdown` (tên/email + đăng xuất).
- `src/pages/*` — 1 file/trang, map với route trong `App.tsx`. Container chuẩn của trang:
  `mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6`.
- `src/components/plan/` — các mảnh của trang chi tiết kế hoạch (`PlanOverview`,
  `PlanBoard`, `BoardLane`, `BoardItemCard`, `PlanTimeline`); đây là feature nhiều mảnh nên
  được gom thư mục con, phần còn lại của `src/components/` vẫn phẳng.
- `src/components/plan/timeline/` — phần "gantt" của tab Lịch trình, tách 3 mảnh để phần
  toán pixel↔thời gian suy luận được một chỗ: `scale.ts` (`createScale`/`fitZoom`,
  `xOf`/`timeAt`/`widthOf`, `ZOOM_LEVELS`), `useTimelineDrag.ts` (engine kéo/kéo-mép/kéo-từ-
  cột-chờ bằng pointer event thô + snap 15 phút, trả `draft` để vẽ preview), `TimelineBar.tsx`
  (thanh có 2 mép resize; hẹp quá thì nhãn tự nhảy ra ngoài bên phải).
- `src/components/DualListPicker.tsx` — UI 2 cột "chọn + sắp thứ tự" dùng chung cho
  `ItemFormModal` (chọn địa điểm) và `UnitFormModal` (chọn hoạt động): trái là danh sách
  nguồn có search + `Pagination` (5 dòng/trang), phải là danh sách đã chọn kéo-thả sắp xếp
  lại được. Cần picker kiểu này ở chỗ mới thì dùng lại nó, đừng copy.
- `src/components/LocationsMap.tsx` — bản đồ react-leaflet dùng chung: đổi lớp nền
  (Voyager/Vệ tinh), nút **"Tìm địa điểm ở đây (700m)"** (lấy tâm khung nhìn hiện tại),
  vòng tròn bán kính đang lọc, pin `divIcon` + tooltip, bấm pin gọi `onSelectLocation` (trang
  Địa điểm mở đúng modal chi tiết như khi bấm thẻ trong danh sách). Nút nổi nằm *bên trong*
  `MapContainer` nên bắt buộc `L.DomEvent.disableClickPropagation`, không thì bấm nút sẽ kéo
  cả bản đồ. Fix icon marker mặc định của Leaflet ở `src/shared/map/leafletIconFix.ts`
  (bắt buộc khi bundle bằng Vite).
- `src/shared/utils/googleMapsLink.ts` — parse URL Google Maps đầy đủ ra tên + lat/lng bằng
  regex (không gọi mạng); `src/services/mapsLink.service.ts` gọi Edge Function
  `resolve-maps-link` để theo redirect của link rút gọn `maps.app.goo.gl/...` trước, rồi mới
  parse — dùng ở `LocationFormModal` (ô "Dán link Google Maps").

## Data model (Postgres, xem `supabase/schema.sql`)

- `users`: user_id (PK, = `auth.users.id`), email, full_name, avatar — **tự động tạo bằng
  Postgres trigger** khi có user mới đăng nhập lần đầu (không phải app tự upsert).
- `locations`: id, user_id (FK), name, description, lat, lng, images (text[])
- `items` (hoạt động, tên bảng/code vẫn là `items`): id, user_id (FK), unit_id (FK,
  **nullable** — hoạt động có thể tồn tại độc lập chưa gắn unit nào), name, price,
  **start_time, end_time (timestamptz — mốc thời gian đầy đủ, không phải cột `time`)**,
  duration_minutes, note, order_index. Ưu tiên: có `end_time` thì lấy `end_time`, không thì
  `start_time + duration_minutes` (xem `schedule.ts`). **1 hoạt động có thể gắn nhiều địa
  điểm** qua bảng nối `item_locations` (không phải cột `location_id` 1-1 nữa)
- `item_locations`: id, user_id (FK), item_id (FK), location_id (FK), order_index — giữ
  thứ tự địa điểm trong 1 hoạt động; `src/services/items.service.ts` tự join + sắp xếp lại
  ở client thành mảng `item.locations` (không expose cấu trúc bảng nối ra UI)
- `units` (hiển thị là "Chặng", tên bảng/route/service vẫn giữ `units`): id, user_id (FK),
  plan_id (FK, nullable), unit_type_id (FK tới `unit_types`, nullable), name, description,
  start_date, end_date (timestamptz — chọn cả ngày lẫn giờ), **duration_minutes (not null,
  default 360 = 6h — chặng nào cũng có khoảng thời gian)**, break_minutes, order_index.
  Ưu tiên giống hoạt động: có `end_date` thì `end_date` thắng, không thì `start_date +
  duration_minutes`. `start_date = null` = chưa xếp lịch. 1 chặng gom nhiều
  hoạt động qua `items.unit_id` (1-nhiều, không phải bảng nối) — `order_index` của `items`
  khi đó biểu diễn thứ tự hoạt động **trong chặng đó**; hoạt động chưa gắn chặng nào thì
  `order_index` biểu diễn thứ tự trong danh sách Hoạt động chung
- `unit_types` ("loại" của chặng, vd Ngày/Tuần...): id, user_id (FK), name — **danh sách
  động do user tự tạo dần** qua `src/services/unitTypes.service.ts`, không có sẵn cố định;
  tạo/xoá ngay trong `UnitFormModal` (chip chọn loại, có ô thêm loại mới + nút xoá từng loại)
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
   URI = `https://<project-ref>.supabase.co/auth/v1/callback`; Authorized JavaScript origins
   thêm domain thật sẽ dùng để đăng nhập (vd `http://localhost:5173`, domain Vercel)
2. Supabase Dashboard → Authentication → Providers → Google: bật, dán Client ID/Secret
3. Supabase Dashboard → Authentication → URL Configuration: set Site URL + Additional
   Redirect URLs (vd `http://localhost:5173` cho dev)

**Mỗi khi deploy lên domain mới (vd Vercel)**: phải quay lại bước 3 để thêm domain đó vào
Site URL / Additional Redirect URLs (dùng `https://*.vercel.app` nếu có preview deployment),
nếu không đăng nhập Google sẽ lỗi `bad_oauth_state` — do Supabase fallback redirect về Site
URL cũ (thường là `http://localhost:3000` mặc định lúc tạo project) thay vì domain thật vừa
deploy, khiến state/PKCE verifier không khớp domain.

## ⚠️ Bước thủ công bắt buộc — deploy Edge Function `resolve-maps-link`

Ô "Dán link Google Maps" trong modal địa điểm chỉ giải mã được **link rút gọn**
(`maps.app.goo.gl/...`) sau khi Edge Function này được deploy lên Supabase (chưa deploy thì
link đầy đủ vẫn parse được bình thường vì phần đó chạy client-side thuần regex, không cần
Edge Function):

1. Cài Supabase CLI (`npm i -g supabase` hoặc `brew install supabase/tap/supabase`)
2. `supabase login` rồi `supabase link --project-ref <project-ref>`
3. `supabase functions deploy resolve-maps-link`

## Roadmap tính năng

1. ✅ **Location Manager** (`src/pages/LocationsPage.tsx`) — CRUD địa điểm qua modal
   (xem/sửa/tạo), nối Supabase thật qua `src/services/locations.service.ts`. Bố cục 2 cột:
   danh sách bên trái + **bản đồ luôn hiện** bên phải (sticky, cao gần hết màn hình).
   - **Tìm theo tên**: ô search debounce 300ms, lọc ở tầng Postgres (`ilike`, đã escape
     `%`/`_`), **không** lọc ở client.
   - **Phân trang + infinite scroll**: `listLocationsPage({search, offset, limit})` trả
     `{rows, total, hasMore}` (`LOCATIONS_PAGE_SIZE = 12`, sắp theo `created_at` giảm dần);
     trang dùng `IntersectionObserver` trên 1 ô "mồi" cuối danh sách để tải tiếp. Mỗi lần
     đổi từ khoá là 1 "phiên" mới (`requestRef`), phản hồi của phiên cũ bị bỏ qua.
   - **Tìm quanh đây**: nút trên bản đồ lấy tâm khung nhìn → `listLocationsNear(center,
     700m)` (bbox ở Postgres + Haversine ở client, xem `geo.ts`), danh sách chuyển sang
     chế độ vùng (kèm badge khoảng cách + vòng tròn trên bản đồ, có nút "Bỏ lọc vùng").
   - Bấm pin trên bản đồ mở **đúng modal chi tiết** như khi bấm thẻ; nút 🎯 trên thẻ bay
     tới địa điểm đó (`focusId`).
   - Modal tạo/sửa có ô dán link Google Maps (đầy đủ hoặc rút gọn `maps.app.goo.gl`) để tự
     điền tên + lat/lng, xem `googleMapsLink.ts` + Edge Function `resolve-maps-link` ở trên.
2. ✅ **Đăng nhập Google + layout + services layer** — `src/pages/LoginPage.tsx` (2 cột:
   pitch trên nền tối + nút Google), `src/context/AuthContext.tsx`,
   `src/routes/ProtectedRoute.tsx`, layout Header + content (`src/layouts/AppLayout.tsx`),
   bảng `users`, RLS theo `user_id` trên mọi bảng dữ liệu. Header điều hướng 4 trang
   (Kế hoạch/Chặng/Hoạt động/Địa điểm — xếp theo thứ tự từ tổng tới chi tiết); route mặc
   định là `/plans`.
3. ✅ **Item Manager** (`src/pages/ItemsPage.tsx`, hiển thị là "Hoạt động" — tên bảng/route/
   service vẫn giữ `items` để khớp schema) — CRUD hoạt động qua modal
   (`src/components/ItemFormModal.tsx`), **1 hoạt động chọn được nhiều địa điểm theo thứ
   tự** qua `DualListPicker`. Địa điểm là **không bắt buộc** (schema cho phép, và Plan
   Builder cần tạo nhanh hoạt động rỗng rồi bổ sung sau). **Thời gian bắt đầu - kết thúc**
   dùng `DatePicker.RangePicker` (`showTime`, `allowEmpty={[false, true]}` — được phép chỉ
   nhập giờ bắt đầu); khi đã có cả 2 mốc thì 2 ô "Giờ/Phút" (thời lượng) chuyển sang
   read-only và hiện giá trị suy ra từ khung giờ. Giá dùng `InputNumber` định dạng số
   nghìn. List hiện dạng lưới
   (`src/components/ItemCard.tsx`: ảnh bìa lấy từ địa điểm đầu tiên có ảnh, tối đa 2 badge
   địa điểm + "+N địa điểm", chân thẻ ghi **đang thuộc chặng nào**), bấm vào thẻ mở
   `src/components/ItemDetailModal.tsx`. Trang có hàng lọc: Tất cả / Chưa gắn chặng / theo
   từng chặng + ô search — trả lời nhanh câu "hoạt động nào còn chưa xếp?". Lưới hỗ trợ
   **kéo-thả sắp xếp lại** (dnd-kit `rectSortingStrategy`) lưu vào `items.order_index` qua
   `reorderItems()`; kéo-thả **chỉ bật khi đang xem toàn bộ** (không lọc/không search), vì
   khi lọc thì thứ tự hiển thị không phải thứ tự thật nên lưu lại sẽ sai.
4. ✅ **Unit Manager** (`src/pages/UnitsPage.tsx`, hiển thị là "Chặng" — tên bảng/route/
   service vẫn giữ `units`/`unitTypes` để khớp schema) — CRUD chặng qua modal
   (`src/components/UnitFormModal.tsx`): chọn/tạo/xoá "loại" động (chip có ô "Thêm loại"
   ngay tại chỗ), **giờ bắt đầu + giờ kết thúc (2 `DatePicker` riêng) + khoảng thời gian
   giờ/phút (mặc định 6h)** — nhập giờ kết thúc thì 2 ô khoảng thời gian bị khoá vì
   `end_date` được ưu tiên; modal có dòng xem trước "chặng chạy từ ... tới ...", và **chọn
   hoạt động** qua `DualListPicker`. Picker chỉ hiện hoạt động **chưa gắn chặng nào hoặc
   đang gắn chính chặng đang sửa** (tránh "cướp" ngầm hoạt động của chặng khác). Prop
   `showItemPicker={false}` để ẩn picker khi modal mở từ Plan Builder. List hiện dạng lưới
   (`src/components/UnitCard.tsx`), bấm vào thẻ mở `src/components/UnitDetailModal.tsx`.
   `src/services/units.service.ts` điều phối gán/gỡ hoạt động qua
   `assignItemsToUnit`/`unassignItemsFromUnit` (export từ `items.service.ts`); sau mỗi
   create/update/delete, `UnitsPage` gọi lại `loadData()` để đồng bộ `items` (vì unit_id của
   item có thể đổi) thay vì tự vá state cục bộ.
5. ✅ **Tổng cost + thời lượng của chặng** — tính động qua `unitStats()` (xem
   `src/shared/utils/planStats.ts`), hiện ở `UnitCard` (3 ô: số hoạt động / thời lượng /
   chi phí), `UnitDetailModal` (3 `StatTile`), header mỗi lane trong Plan Builder, và mỗi
   chặng trong Tổng quan kế hoạch. Thời lượng cộng từ `itemDurationMinutes()` của từng hoạt
   động (khung giờ nếu có, không thì `duration_minutes`) + khoảng nghỉ `break_minutes`.
6. ⏳ Gọi OpenRouteService tính khoảng cách + thời gian di chuyển giữa các hoạt động trong chặng
7. ⏳ Vẽ bản đồ + tuyến đường trong trang Tổng quan kế hoạch (react-leaflet, đã cài sẵn)
8. ✅ **Plan Manager** (`src/pages/PlansPage.tsx`) — danh sách kế hoạch dạng lưới
   (`src/components/PlanCard.tsx`: khoảng thời gian/số ngày/số chặng/số hoạt động/tổng chi
   phí), mỗi thẻ là `<Link>` sang trang chi tiết. `PlanFormModal` giờ **chỉ nhập metadata**
   (tên/thời gian/mô tả) — tạo xong `PlansPage` điều hướng thẳng vào
   `/plans/:planId?tab=build`. Tổng chi phí tính động bằng `planTotals()`, **không** lưu cột
   cứng, khớp mục Data model.
9. ✅ **Plan Workspace** (`src/pages/PlanDetailPage.tsx`, route `/plans/:planId`) — chỗ làm
   việc chính, thay cho việc phải nhảy qua 3 trang để sửa 1 kế hoạch. Trang tự tải `plan` +
   toàn bộ `units`/`items`/`locations`/`unitTypes` rồi điều phối mọi thao tác ghi; **3 tab**
   chọn bằng `Segmented`, lưu ở query param `?tab=` (`overview` mặc định | `build` |
   `schedule`):
   - **Tổng quan** (`src/components/plan/PlanOverview.tsx`): hero tối gradient (tên kế
     hoạch + khoảng ngày + 4 `StatTile` chặng/hoạt động/tổng chi phí/tổng thời lượng),
     timeline lịch trình theo từng chặng (mỗi hoạt động 1 dòng: cột giờ + chấm timeline +
     tên + chuỗi địa điểm + giá + ảnh bìa), sidebar "Phân bổ chi phí" (thanh % theo từng
     chặng) và "Địa điểm ghé qua" (gom trùng, đếm số lần).
   - **Xây dựng** (`src/components/plan/PlanBoard.tsx`): board kéo-thả. Lane 0 = **kho hoạt
     động chưa gắn chặng** (`LIBRARY_LANE`, có ô search), các lane sau = chặng theo đúng
     `order_index`, lane cuối = ô "Thêm chặng" (tạo nhanh bằng tên, hoặc chọn chặng đã có
     mà chưa gắn kế hoạch nào). Kéo hoạt động giữa các lane để gán/gỡ/sắp thứ tự; đổi thứ
     tự chặng bằng nút ‹ › trên header lane; menu ⋯ mỗi lane để sửa/gỡ khỏi kế hoạch/xoá
     chặng; tạo & sửa hoạt động ngay trong board qua `ItemFormModal`.
   - **Lịch trình** (`src/components/plan/PlanTimeline.tsx`): gantt vẽ **đúng tỉ lệ thời
     gian** trên khoảng ngày của kế hoạch (bắt buộc kế hoạch phải có start/end date).
     - Cột trái là nhãn chặng (sticky-left), phần phải là dải thời gian; **cả 2 nằm trong
       cùng 1 khung cuộn 2 chiều** để hàng ngày/giờ sticky-top và cột nhãn sticky-left hoạt
       động đúng — đừng tách thành 2 khung cuộn riêng.
     - Kéo giữa thanh = dời chặng (giữ nguyên độ dài), kéo 2 mép = đổi giờ bắt đầu/kết thúc,
       snap 15 phút, tối thiểu 30 phút, kẹp trong khoảng kế hoạch. Mỗi lần thả ghi
       `start_date` + `end_date` + `duration_minutes` (giữ 3 cột luôn nhất quán) qua
       `patchUnitTimes()`.
     - Mở rộng 1 chặng (chevron) để thấy hoạt động bên trong thành thanh con: hoạt động
       chưa có giờ riêng vẽ mờ (giờ **dự kiến** suy ra từ chặng qua `computeItemSchedule`),
       kéo/kéo-mép nó sẽ ghi `start_time`/`end_time` thật qua `patchItemTimes()`.
     - Cột **"Chưa xếp lịch"** bên phải chứa chặng chưa có `start_date` **hoặc** nằm ngoài
       khoảng thời gian kế hoạch; kéo từ đó vào lịch để xếp giờ, kéo thanh ngược ra đó để
       gỡ (`start_date = end_date = null`, giữ `duration_minutes`).
     - Zoom bằng 2 nút ±, mức px/giờ trong `ZOOM_LEVELS`; lần đầu mở tự chọn mức vừa khung.
   - Mọi thao tác ghi đi qua helper `commit()` của trang: **cập nhật state trước** cho UI
     phản hồi tức thì, lỗi thì báo + `loadData()` để state không lệch DB. `moveItem()` là
     chỗ dễ sai nhất — nó ghi lại `order_index` cho **cả lane nguồn lẫn lane đích**, và khi
     thả về kho thì `unassignItemsFromUnit()` (đặt `order_index` về 0) rồi mới
     `reorderItems()` để thứ tự trong kho không bị mất sau khi tải lại.

## Việc cần làm tiếp theo (ngay bây giờ)

- **Chạy lại `supabase/schema.sql`** trong Supabase SQL Editor — đợt này thêm
  `items.end_time (timestamptz)` và `units.duration_minutes (int not null default 360)`;
  script dùng `if exists`/`if not exists` nên chạy lại nhiều lần vẫn an toàn. Chưa chạy thì
  form hoạt động/chặng sẽ lỗi khi lưu (cột không tồn tại).
- Bật Google OAuth provider thủ công trong Supabase Dashboard (xem mục "⚠️ Bước thủ công
  bắt buộc" ở trên) — bắt buộc trước khi test đăng nhập được
- Deploy Edge Function `resolve-maps-link` (xem mục "⚠️ Bước thủ công bắt buộc" thứ 2 ở
  trên) — bắt buộc để ô dán link Google Maps giải mã được link rút gọn
- Làm tiếp bước 6 (OpenRouteService tính khoảng cách/thời gian di chuyển giữa các hoạt
  động trong 1 chặng, cache vào bảng `unit_routes` qua `unitRoutes.service.ts` đang là
  stub) rồi bước 7 (vẽ tuyến đường lên bản đồ trong tab Tổng quan của kế hoạch —
  `react-leaflet` + `leaflet` đã cài sẵn, dùng lại `src/components/LocationsMap.tsx`)
