-- ===========================================================================
-- HOTFIX: "canceling statement due to statement timeout" khi đăng nhập bằng
-- tài khoản KHÁC tài khoản chủ (mọi query trên plans/units/items đều treo).
--
-- Nguyên nhân: 4 hàm helper của tính năng chia sẻ đang là `security invoker`,
-- nên khi được gọi từ trong policy của `plans` chúng lại đọc
-- `plan_collaborators` -> policy bảng đó subquery ngược `plans` -> policy
-- `plans` lại gọi hàm... Vòng lặp RLS này Postgres không bắt được (vì đi qua
-- 1 hàm) nên chỉ phình theo cấp số nhân tới khi hết statement_timeout.
-- Chủ sở hữu không thấy lỗi vì vế `auth.uid() = user_id` của OR đã đúng ngay,
-- hàm gần như không bị gọi; tài khoản khác thì vế đó sai ở MỌI dòng.
--
-- Cách chữa: đổi 4 hàm sang `security definer`. An toàn, vì mỗi hàm tự lọc
-- theo `auth.uid()` của người gọi và chỉ trả về boolean.
--
-- Chạy file này trong Supabase SQL Editor (hoặc chạy lại toàn bộ schema.sql —
-- nội dung đã được đồng bộ). Chạy nhiều lần vẫn an toàn.
-- ===========================================================================

create or replace function is_plan_collaborator(target_plan_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from plan_collaborators
    where plan_id = target_plan_id and user_id = (select auth.uid())
  );
$$;

create or replace function unit_is_shared_with_me(target_unit_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from units u
    where u.id = target_unit_id and u.plan_id is not null and is_plan_collaborator(u.plan_id)
  );
$$;

create or replace function item_is_shared_with_me(target_item_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from items i
    where i.id = target_item_id and i.unit_id is not null and unit_is_shared_with_me(i.unit_id)
  );
$$;

create or replace function owner_shared_with_me(owner_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from plan_collaborators pc
    join plans p on p.id = pc.plan_id
    where p.user_id = owner_id and pc.user_id = (select auth.uid())
  );
$$;

grant execute on function is_plan_collaborator(uuid) to authenticated;
grant execute on function unit_is_shared_with_me(uuid) to authenticated;
grant execute on function item_is_shared_with_me(uuid) to authenticated;
grant execute on function owner_shared_with_me(uuid) to authenticated;

create index if not exists idx_plan_collaborators_user_plan
  on plan_collaborators(user_id, plan_id);
