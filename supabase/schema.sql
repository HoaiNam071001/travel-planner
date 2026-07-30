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

-- Đổi từ 1 cột `date` (chỉ ngày) sang mốc bắt đầu (start_date chỉ, không có end_date).
-- Thêm "loại" động qua unit_types. Thêm break_minutes (khoảng nghỉ giữa hoạt động).
-- Dùng add/drop column if (not) exists nên chạy lại nhiều lần vẫn an toàn.
alter table units drop column if exists date;
alter table units add column if not exists start_date timestamptz;
alter table units add column if not exists unit_type_id uuid references unit_types(id) on delete set null;
alter table units add column if not exists break_minutes int not null default 0;
alter table units drop column if exists end_date;

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
  price numeric,
  duration_minutes int,
  note text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

-- 1 hoạt động (item) có thể gắn nhiều địa điểm, theo thứ tự — thay cho cột
-- `location_id` cũ (1-1). Nếu bảng `items` đã tồn tại từ trước (đã chạy schema
-- bản cũ), lệnh dưới xoá cột thừa; chạy lại vẫn an toàn vì có `if exists`.
alter table items drop column if exists location_id;
alter table items drop column if exists start_time;
alter table items drop column if exists end_time;

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
