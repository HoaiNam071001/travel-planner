import { supabase } from "../lib/supabaseClient";
import type { Id, IsoDate, IsoDateTime, Item, ItemLocation, Unit } from "../shared/types/models";
import type { QueryResult } from "./types";

// Trang preview công khai (`/p/:token`) không đăng nhập nên KHÔNG dùng
// units.service.ts/items.service.ts (2 file đó luôn query qua RLS theo auth.uid()) —
// toàn bộ dữ liệu đọc-only tới từ 1 lần gọi RPC `get_shared_plan` (security definer,
// xem supabase/schema.sql), trả về 1 khối jsonb rồi tự join lại ở client.

export interface SharedPlanPayload {
  plan: {
    id: Id;
    name: string;
    description: string | null;
    start_date: IsoDate | null;
    end_date: IsoDate | null;
  };
  units: Unit[];
  items: Item[];
  /** Tổng "Chi phí khác" của kế hoạch — chỉ số tổng, không liệt kê từng khoản (xem get_shared_plan). */
  expensesTotal: number;
}

interface RawUnit {
  id: Id;
  plan_id: Id | null;
  unit_type_id: Id | null;
  name: string;
  description: string | null;
  start_date: IsoDateTime | null;
  end_date: IsoDateTime | null;
  duration_minutes: number;
  break_minutes: number;
  order_index: number;
  created_at: IsoDateTime;
}

interface RawItem {
  id: Id;
  unit_id: Id | null;
  name: string;
  price: number | null;
  duration_minutes: number | null;
  start_time: IsoDateTime | null;
  end_time: IsoDateTime | null;
  note: string | null;
  order_index: number;
  created_at: IsoDateTime;
}

interface RawUnitType {
  id: Id;
  name: string;
  created_at: IsoDateTime;
}

interface RawItemLocation {
  item_id: Id;
  location_id: Id;
  order_index: number;
}

interface RawPayload {
  plan: SharedPlanPayload["plan"] | null;
  units: RawUnit[];
  unit_types: RawUnitType[];
  items: RawItem[];
  locations: ItemLocation[];
  item_locations: RawItemLocation[];
  expenses_total: number;
}

export async function fetchSharedPlan(token: string): Promise<QueryResult<SharedPlanPayload>> {
  const { data, error } = await supabase.rpc("get_shared_plan", { token });
  if (error) return { data: null, error };
  if (!data) return { data: null, error: null };

  const raw = data as RawPayload;
  if (!raw.plan) return { data: null, error: null };

  const unitTypeById = new Map(raw.unit_types.map((t) => [t.id, { id: t.id, name: t.name }] as const));
  const locationById = new Map(raw.locations.map((l) => [l.id, l] as const));

  const locationsByItem = new Map<Id, ItemLocation[]>();
  for (const link of raw.item_locations.slice().sort((a, b) => a.order_index - b.order_index)) {
    const location = locationById.get(link.location_id);
    if (!location) continue;
    const list = locationsByItem.get(link.item_id) ?? [];
    list.push(location);
    locationsByItem.set(link.item_id, list);
  }

  // `user_id` không có trong payload (đã lọc ở RPC, xem get_shared_plan) — điền rỗng vì
  // không component đọc-only nào dùng tới, chỉ để khớp kiểu `Unit`/`Item` dùng chung.
  const units: Unit[] = raw.units.map((u) => ({
    ...u,
    user_id: "",
    unit_type: u.unit_type_id ? (unitTypeById.get(u.unit_type_id) ?? null) : null,
  }));

  const items: Item[] = raw.items.map((i) => ({
    ...i,
    user_id: "",
    locations: locationsByItem.get(i.id) ?? [],
  }));

  return {
    data: { plan: raw.plan, units, items, expensesTotal: Number(raw.expenses_total) || 0 },
    error: null,
  };
}
