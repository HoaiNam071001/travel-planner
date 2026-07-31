-- Travel Planner schema
-- Chạy toàn bộ file này trong Supabase Dashboard > SQL Editor.
-- Dùng IF NOT EXISTS nên chạy lại nhiều lần vẫn an toàn.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users: hồ sơ public, đồng bộ tự động từ auth.users qua trigger bên dưới
-- ---------------------------------------------------------------------------
create table if not exists users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar text,
  created_at timestamptz not null default now()
);

alter table users enable row level security;

drop policy if exists "Users can view own profile" on users;
create policy "Users can view own profile" on users
  for select using (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on users;
create policy "Users can update own profile" on users
  for update using (auth.uid() = user_id);

-- Tự tạo hàng trong public.users khi có user mới đăng nhập lần đầu (auth.users insert)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (user_id, email, full_name, avatar)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- plans
-- ---------------------------------------------------------------------------
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

alter table plans enable row level security;

drop policy if exists "Users manage own plans" on plans;
create policy "Users manage own plans" on plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- unit_types — danh sách "loại" cho đơn vị/chặng (vd Ngày, Tuần...), do user tự
-- tạo dần khi dùng (động), không có sẵn danh sách cố định.
-- ---------------------------------------------------------------------------
create table if not exists unit_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table unit_types enable row level security;

drop policy if exists "Users manage own unit_types" on unit_types;
create policy "Users manage own unit_types" on unit_types
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- units (hiển thị là "Chặng")
-- ---------------------------------------------------------------------------
create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_id uuid references plans(id) on delete set null,
  name text not null,
  description text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

-- Đổi từ 1 cột `date` (chỉ ngày) sang start_date/end_date (timestamptz).
-- Thêm "loại" động qua unit_types. Thêm break_minutes (khoảng nghỉ giữa hoạt động).
-- `duration_minutes` = khoảng thời gian mặc định của chặng (luôn có, mặc định 6h);
-- khi `end_date` có giá trị thì end_date được ưu tiên hơn start_date + duration.
-- Dùng add/drop column if (not) exists nên chạy lại nhiều lần vẫn an toàn.
alter table units drop column if exists date;
alter table units add column if not exists start_date timestamptz;
alter table units add column if not exists end_date timestamptz;
alter table units add column if not exists unit_type_id uuid references unit_types(id) on delete set null;
alter table units add column if not exists break_minutes int not null default 0;
alter table units add column if not exists duration_minutes int not null default 360;

alter table units enable row level security;

drop policy if exists "Users manage own units" on units;
create policy "Users manage own units" on units
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- locations
-- ---------------------------------------------------------------------------
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text,
  lat double precision not null,
  lng double precision not null,
  images text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table locations enable row level security;

drop policy if exists "Users manage own locations" on locations;
create policy "Users manage own locations" on locations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- items
-- ---------------------------------------------------------------------------
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  name text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

-- 1 hoạt động (item) có thể gắn nhiều địa điểm, theo thứ tự — thay cho cột
-- `location_id` cũ (1-1). Nếu bảng `items` đã tồn tại từ trước (đã chạy schema
-- bản cũ), lệnh dưới xoá cột thừa; chạy lại vẫn an toàn vì có `if exists`.
alter table items drop column if exists location_id;

-- `create table if not exists` là no-op nếu bảng đã tồn tại, nên MỌI cột (kể cả
-- những cột tưởng như "gốc") đều phải có dòng `add column if not exists` riêng ở
-- đây — nếu chỉ khai báo trong khối create table phía trên, cột sẽ không bao giờ
-- được thêm vào DB đã tồn tại từ trước (đây chính xác là lỗi đã gặp với
-- `duration_minutes`: khai trong create table nhưng thiếu alter, nên bảng cũ
-- không có cột này -> PostgREST báo "could not find column ... in schema cache").
alter table items add column if not exists price numeric;
alter table items add column if not exists note text;

-- Giờ bắt đầu/kết thúc của hoạt động là mốc thời gian đầy đủ (timestamptz), không
-- phải cột `time` như bản đầu. `duration_minutes` là khoảng thời gian dự phòng:
-- khi có `end_time` thì end_time được ưu tiên hơn start_time + duration_minutes.
alter table items add column if not exists start_time timestamptz;
alter table items add column if not exists end_time timestamptz;
alter table items add column if not exists duration_minutes int;

alter table items enable row level security;

drop policy if exists "Users manage own items" on items;
create policy "Users manage own items" on items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- item_locations — bảng nối nhiều-nhiều items <-> locations, có order_index
-- để giữ thứ tự địa điểm trong 1 hoạt động.
-- ---------------------------------------------------------------------------
create table if not exists item_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

alter table item_locations enable row level security;

drop policy if exists "Users manage own item_locations" on item_locations;
create policy "Users manage own item_locations" on item_locations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_item_locations_item_id on item_locations(item_id);
create index if not exists idx_item_locations_location_id on item_locations(location_id);
create index if not exists idx_item_locations_user_id on item_locations(user_id);

-- ---------------------------------------------------------------------------
-- unit_routes — không có cột chủ sở hữu tự nhiên (PK = unit_id), nên denormalize
-- thêm user_id thay vì viết policy subquery join units cho mỗi lần check quyền.
-- ---------------------------------------------------------------------------
create table if not exists unit_routes (
  unit_id uuid primary key references units(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  distance_km double precision,
  duration_min double precision,
  route_geometry jsonb,
  updated_at timestamptz not null default now()
);

alter table unit_routes enable row level security;

drop policy if exists "Users manage own unit_routes" on unit_routes;
create policy "Users manage own unit_routes" on unit_routes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_units_plan_id on units(plan_id);
create index if not exists idx_units_user_id on units(user_id);
create index if not exists idx_units_unit_type_id on units(unit_type_id);
create index if not exists idx_unit_types_user_id on unit_types(user_id);
create index if not exists idx_items_unit_id on items(unit_id);
create index if not exists idx_items_user_id on items(user_id);
create index if not exists idx_locations_user_id on locations(user_id);
create index if not exists idx_plans_user_id on plans(user_id);
create index if not exists idx_unit_routes_user_id on unit_routes(user_id);

-- ---------------------------------------------------------------------------
-- plans: thêm cột share_token cho link xem trước công khai (null = tắt chia sẻ)
-- ---------------------------------------------------------------------------
alter table plans add column if not exists share_token text unique;

-- ---------------------------------------------------------------------------
-- plan_collaborators — chia sẻ 1 kế hoạch cho user khác (mời bằng email),
-- người được mời có toàn quyền sửa như chủ sở hữu (không phân biệt vai trò).
-- LƯU Ý: khác mọi bảng khác trong file này, `user_id` ở đây KHÔNG có
-- `default auth.uid()` — giá trị là id của người ĐƯỢC MỜI (không phải người
-- đang gọi), nên client bắt buộc phải điền tay khi insert.
-- ---------------------------------------------------------------------------
create table if not exists plan_collaborators (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_email text not null,
  created_at timestamptz not null default now(),
  unique (plan_id, user_id)
);

alter table plan_collaborators enable row level security;

create index if not exists idx_plan_collaborators_plan_id on plan_collaborators(plan_id);
create index if not exists idx_plan_collaborators_user_id on plan_collaborators(user_id);

-- ---------------------------------------------------------------------------
-- Chia sẻ kế hoạch — hàm & RLS.
-- 4 hàm dưới đây CHỦ Ý dùng `security invoker` (mặc định): khi được gọi bên
-- trong policy của bảng khác, hàm chạy với đúng auth.uid() của người đang
-- truy vấn, nên subquery bên trong vẫn bị RLS của bảng đó lọc lại theo đúng
-- user hiện tại. Nếu đổi sang `security definer`, hàm sẽ bỏ qua RLS và luôn
-- "thấy" hết dữ liệu bất kể ai gọi — sai mục đích, có thể lộ dữ liệu người khác.
-- ---------------------------------------------------------------------------
create or replace function is_plan_collaborator(target_plan_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from plan_collaborators
    where plan_id = target_plan_id and user_id = auth.uid()
  );
$$;

create or replace function unit_is_shared_with_me(target_unit_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from units u
    where u.id = target_unit_id and u.plan_id is not null and is_plan_collaborator(u.plan_id)
  );
$$;

create or replace function item_is_shared_with_me(target_item_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from items i
    where i.id = target_item_id and i.unit_id is not null and unit_is_shared_with_me(i.unit_id)
  );
$$;

create or replace function owner_shared_with_me(owner_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from plan_collaborators pc
    join plans p on p.id = pc.plan_id
    where p.user_id = owner_id and pc.user_id = auth.uid()
  );
$$;

-- plans: select/update mở cho chủ sở hữu HOẶC collaborator; insert/delete chỉ
-- chủ sở hữu (RLS là row-level, đây là ranh giới rõ nhất đặt được).
drop policy if exists "Users manage own plans" on plans;

drop policy if exists "Plans are selectable by owner or collaborator" on plans;
create policy "Plans are selectable by owner or collaborator" on plans
  for select using (auth.uid() = user_id or is_plan_collaborator(id));

drop policy if exists "Plans are insertable by owner" on plans;
create policy "Plans are insertable by owner" on plans
  for insert with check (auth.uid() = user_id);

drop policy if exists "Plans are updatable by owner or collaborator" on plans;
create policy "Plans are updatable by owner or collaborator" on plans
  for update
  using (auth.uid() = user_id or is_plan_collaborator(id))
  with check (auth.uid() = user_id or is_plan_collaborator(id));

drop policy if exists "Plans are deletable by owner" on plans;
create policy "Plans are deletable by owner" on plans
  for delete using (auth.uid() = user_id);

-- units: chủ sở hữu HOẶC collaborator của kế hoạch chứa chặng đó.
drop policy if exists "Users manage own units" on units;
create policy "Users manage own units" on units
  for all
  using (auth.uid() = user_id or (plan_id is not null and is_plan_collaborator(plan_id)))
  with check (auth.uid() = user_id or (plan_id is not null and is_plan_collaborator(plan_id)));

-- items: chủ sở hữu HOẶC collaborator của kế hoạch chứa chặng của hoạt động.
drop policy if exists "Users manage own items" on items;
create policy "Users manage own items" on items
  for all
  using (auth.uid() = user_id or (unit_id is not null and unit_is_shared_with_me(unit_id)))
  with check (auth.uid() = user_id or (unit_id is not null and unit_is_shared_with_me(unit_id)));

-- item_locations: theo hoạt động cha.
drop policy if exists "Users manage own item_locations" on item_locations;
create policy "Users manage own item_locations" on item_locations
  for all
  using (auth.uid() = user_id or item_is_shared_with_me(item_id))
  with check (auth.uid() = user_id or item_is_shared_with_me(item_id));

-- locations / unit_types: collaborator cần đọc + chọn được từ thư viện của
-- chủ kế hoạch khi sửa nội dung được chia sẻ — nới lỏng có chủ đích (app cá
-- nhân quy mô nhỏ): collaborator thấy TOÀN BỘ địa điểm/loại của owner, không
-- chỉ phần liên quan tới kế hoạch đang chia sẻ (RLS row-level, không lọc mịn
-- hơn theo ngữ cảnh truy vấn được).
drop policy if exists "Users manage own locations" on locations;
create policy "Users manage own locations" on locations
  for all
  using (auth.uid() = user_id or owner_shared_with_me(user_id))
  with check (auth.uid() = user_id or owner_shared_with_me(user_id));

drop policy if exists "Users manage own unit_types" on unit_types;
create policy "Users manage own unit_types" on unit_types
  for all
  using (auth.uid() = user_id or owner_shared_with_me(user_id))
  with check (auth.uid() = user_id or owner_shared_with_me(user_id));

-- plan_collaborators: chủ kế hoạch toàn quyền trên các dòng của kế hoạch mình
-- (mời/gỡ); người được mời chỉ thấy đúng dòng của mình.
drop policy if exists "Owners manage collaborators" on plan_collaborators;
create policy "Owners manage collaborators" on plan_collaborators
  for all
  using (plan_id in (select id from plans where user_id = auth.uid()))
  with check (plan_id in (select id from plans where user_id = auth.uid()));

drop policy if exists "Collaborators view own row" on plan_collaborators;
create policy "Collaborators view own row" on plan_collaborators
  for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- plan_expenses — "Chi phí khác": chi phí gắn thẳng vào 1 kế hoạch, không qua
-- units/items (vé xe/máy bay, thuê xe, khách sạn, mua sắm...). start_time/end_time
-- đều optional (khác items — items bắt buộc phải có start_time nếu có end_time);
-- có giờ thì kéo-thả được trên gantt tab Lịch trình, không thì chỉ là 1 dòng chi
-- phí quản lý ở tab riêng "Chi phí khác".
-- ---------------------------------------------------------------------------
create table if not exists plan_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_id uuid not null references plans(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  name text not null,
  price numeric,
  link text,
  note text,
  start_time timestamptz,
  end_time timestamptz,
  duration_minutes int,
  created_at timestamptz not null default now()
);

alter table plan_expenses enable row level security;

-- plan_id ở đây NOT NULL (khác units.plan_id nullable) nên không cần hàm SQL riêng
-- kiểu unit_is_shared_with_me — is_plan_collaborator(plan_id) là đủ.
drop policy if exists "Users manage own plan_expenses" on plan_expenses;
create policy "Users manage own plan_expenses" on plan_expenses
  for all
  using (auth.uid() = user_id or is_plan_collaborator(plan_id))
  with check (auth.uid() = user_id or is_plan_collaborator(plan_id));

create index if not exists idx_plan_expenses_plan_id on plan_expenses(plan_id);
create index if not exists idx_plan_expenses_user_id on plan_expenses(user_id);
create index if not exists idx_plan_expenses_location_id on plan_expenses(location_id);

-- ---------------------------------------------------------------------------
-- find_user_id_by_email — tra email ra user_id để mời collaborator.
-- `security definer` CÓ CHỦ Ý: bảng `users` chỉ cho tự đọc dòng của mình.
-- ---------------------------------------------------------------------------
create or replace function find_user_id_by_email(target_email text)
returns table(user_id uuid, full_name text, avatar text)
language sql stable security definer set search_path = public as $$
  select user_id, full_name, avatar from users where lower(email) = lower(target_email);
$$;

grant execute on function find_user_id_by_email(text) to authenticated;

-- ---------------------------------------------------------------------------
-- get_shared_plan — trả 1 kế hoạch (đọc) cho link xem trước công khai, chỉ khi
-- biết ĐÚNG token (không liệt kê/đoán được). `security definer` CÓ CHỦ Ý:
-- người gọi là `anon`, hàng rào an ninh duy nhất là biết đúng share_token.
-- ---------------------------------------------------------------------------
create or replace function get_shared_plan(token text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  found_plan plans%rowtype;
  result jsonb;
begin
  if token is null or token = '' then
    return null;
  end if;

  select * into found_plan from plans where share_token = token;
  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'plan', to_jsonb(found_plan) - 'user_id' - 'share_token',
    'units', coalesce((
      select jsonb_agg(to_jsonb(u) - 'user_id' order by u.order_index)
      from units u where u.plan_id = found_plan.id
    ), '[]'::jsonb),
    'unit_types', coalesce((
      select jsonb_agg(distinct (to_jsonb(ut) - 'user_id'))
      from unit_types ut
      where ut.id in (select unit_type_id from units where plan_id = found_plan.id and unit_type_id is not null)
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(to_jsonb(i) - 'user_id' order by i.order_index)
      from items i where i.unit_id in (select id from units where plan_id = found_plan.id)
    ), '[]'::jsonb),
    'locations', coalesce((
      select jsonb_agg(distinct jsonb_build_object(
        'id', l.id, 'name', l.name, 'lat', l.lat, 'lng', l.lng, 'images', l.images
      ))
      from locations l
      where l.id in (
        select il.location_id from item_locations il
        where il.item_id in (select i.id from items i where i.unit_id in (select id from units where plan_id = found_plan.id))
      )
    ), '[]'::jsonb),
    'item_locations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'item_id', il.item_id, 'location_id', il.location_id, 'order_index', il.order_index
      ) order by il.order_index)
      from item_locations il
      where il.item_id in (select i.id from items i where i.unit_id in (select id from units where plan_id = found_plan.id))
    ), '[]'::jsonb),
    -- Chỉ trả TỔNG chi phí (không phải từng dòng) — trang xem trước công khai chỉ cần
    -- cộng đúng vào "Tổng chi phí"/biểu đồ phân bổ, không liệt kê chi tiết từng khoản
    -- "Chi phí khác" ra ngoài để tránh lộ chi tiêu riêng tư qua link công khai.
    'expenses_total', coalesce((
      select sum(pe.price) from plan_expenses pe
      where pe.plan_id = found_plan.id
    ), 0)
  ) into result;

  return result;
end;
$$;

grant execute on function get_shared_plan(text) to anon, authenticated;

-- Supabase/PostgREST cache "hình dạng" schema để tự sinh REST API; thường tự
-- reload sau DDL nhưng đôi khi không kịp (nhất là chạy nhiều alter liền nhau
-- trong SQL Editor) -> lỗi "Could not find the 'x' column ... in schema cache"
-- dù cột đã thật sự tồn tại. Câu lệnh dưới ép PostgREST nạp lại schema ngay.
notify pgrst, 'reload schema';
