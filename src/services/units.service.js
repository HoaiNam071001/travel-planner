import { supabase } from "../lib/supabaseClient";
import { TABLES } from "../shared/constants/tables";
import { assignItemsToUnit, unassignItemsFromUnit } from "./items.service";

const SELECT_WITH_TYPE = "*, unit_type:unit_types(id, name)";

export async function listUnits() {
  return supabase
    .from(TABLES.UNITS)
    .select(SELECT_WITH_TYPE)
    .order("order_index", { ascending: true });
}

// Chặng mới luôn thêm vào cuối danh sách (thứ tự do kéo-thả quyết định, dùng ở
// bước Plan sau này).
async function nextOrderIndex() {
  const { data } = await supabase
    .from(TABLES.UNITS)
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1);
  return (data?.[0]?.order_index ?? -1) + 1;
}

export async function createUnit({
  name,
  description,
  unit_type_id,
  start_date,
  end_date,
  itemIds = [],
}) {
  const order_index = await nextOrderIndex();
  const { data: unit, error } = await supabase
    .from(TABLES.UNITS)
    .insert({ name, description, unit_type_id, start_date, end_date, order_index })
    .select(SELECT_WITH_TYPE)
    .single();
  if (error) return { data: null, error };

  const { error: assignError } = await assignItemsToUnit(unit.id, itemIds);
  if (assignError) return { data: null, error: assignError };

  return { data: unit, error: null };
}

// `previousItemIds` là danh sách hoạt động đang gắn với unit này TRƯỚC khi sửa
// (page truyền vào từ state đã tải sẵn) — dùng để biết hoạt động nào bị bỏ ra
// cần gỡ unit_id, tách biệt với `itemIds` là danh sách mới sau khi sửa.
export async function updateUnit(
  id,
  { name, description, unit_type_id, start_date, end_date, itemIds = [] },
  previousItemIds = []
) {
  const { data: unit, error } = await supabase
    .from(TABLES.UNITS)
    .update({ name, description, unit_type_id, start_date, end_date })
    .eq("id", id)
    .select(SELECT_WITH_TYPE)
    .single();
  if (error) return { data: null, error };

  const removedItemIds = previousItemIds.filter((itemId) => !itemIds.includes(itemId));
  const { error: unassignError } = await unassignItemsFromUnit(removedItemIds);
  if (unassignError) return { data: null, error: unassignError };

  const { error: assignError } = await assignItemsToUnit(id, itemIds);
  if (assignError) return { data: null, error: assignError };

  return { data: unit, error: null };
}

export async function deleteUnit(id) {
  return supabase.from(TABLES.UNITS).delete().eq("id", id);
}

// Dùng bởi plans.service.js — units.service.js là nơi duy nhất gọi
// supabase.from(TABLES.UNITS), kể cả khi thao tác xuất phát từ trang Kế hoạch.
export async function assignUnitsToPlan(planId, unitIds) {
  const results = await Promise.all(
    unitIds.map((id, index) =>
      supabase.from(TABLES.UNITS).update({ plan_id: planId, order_index: index }).eq("id", id)
    )
  );
  return { error: results.find((r) => r.error)?.error ?? null };
}

export async function unassignUnitsFromPlan(unitIds) {
  if (!unitIds.length) return { error: null };
  const results = await Promise.all(
    unitIds.map((id) =>
      supabase.from(TABLES.UNITS).update({ plan_id: null, order_index: 0 }).eq("id", id)
    )
  );
  return { error: results.find((r) => r.error)?.error ?? null };
}
