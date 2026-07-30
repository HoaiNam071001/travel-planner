import { supabase } from "../lib/supabaseClient";
import { TABLES } from "../shared/constants/tables";
import { assignUnitsToPlan, unassignUnitsFromPlan } from "./units.service";

export async function listPlans() {
  return supabase.from(TABLES.PLANS).select("*").order("start_date", { ascending: true });
}

export async function getPlan(id) {
  return supabase.from(TABLES.PLANS).select("*").eq("id", id).single();
}

export async function createPlan({ name, description, start_date, end_date, unitIds = [] }) {
  const { data: plan, error } = await supabase
    .from(TABLES.PLANS)
    .insert({ name, description, start_date, end_date })
    .select()
    .single();
  if (error) return { data: null, error };

  const { error: assignError } = await assignUnitsToPlan(plan.id, unitIds);
  if (assignError) return { data: null, error: assignError };

  return { data: plan, error: null };
}

// `unitIds` để `undefined` (PlanFormModal chỉ sửa metadata — việc gán chặng làm ở
// trang Xây dựng kế hoạch) thì hàm không đụng tới quan hệ plan-unit.
// `previousUnitIds` là danh sách chặng đang gắn với kế hoạch này TRƯỚC khi sửa
// (page truyền vào từ state đã tải sẵn) — dùng để biết chặng nào bị bỏ ra cần
// gỡ plan_id, tách biệt với `unitIds` là danh sách mới sau khi sửa.
export async function updatePlan(
  id,
  { name, description, start_date, end_date, unitIds },
  previousUnitIds = []
) {
  const { data: plan, error } = await supabase
    .from(TABLES.PLANS)
    .update({ name, description, start_date, end_date })
    .eq("id", id)
    .select()
    .single();
  if (error) return { data: null, error };

  if (!unitIds) return { data: plan, error: null };

  const removedUnitIds = previousUnitIds.filter((unitId) => !unitIds.includes(unitId));
  const { error: unassignError } = await unassignUnitsFromPlan(removedUnitIds);
  if (unassignError) return { data: null, error: unassignError };

  const { error: assignError } = await assignUnitsToPlan(id, unitIds);
  if (assignError) return { data: null, error: assignError };

  return { data: plan, error: null };
}

export async function deletePlan(id) {
  return supabase.from(TABLES.PLANS).delete().eq("id", id);
}
