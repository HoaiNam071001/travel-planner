import { supabase } from "../lib/supabaseClient";
import { TABLES } from "../shared/constants/tables";
import type { Id, IsoDate, Plan } from "../shared/types/models";
import { assignUnitsToPlan, unassignUnitsFromPlan } from "./units.service";
import type { ListResult, QueryResult, WriteResult } from "./types";

export interface PlanInput {
  name: string;
  description: string | null;
  start_date: IsoDate | null;
  end_date: IsoDate | null;
  /** `undefined` = không đụng tới quan hệ kế hoạch-chặng. */
  unitIds?: Id[];
}

export async function listPlans(): Promise<ListResult<Plan>> {
  return supabase.from(TABLES.PLANS).select("*").order("start_date", { ascending: true });
}

export async function getPlan(id: Id): Promise<QueryResult<Plan>> {
  return supabase.from(TABLES.PLANS).select("*").eq("id", id).single();
}

export async function createPlan(input: PlanInput): Promise<QueryResult<Plan>> {
  const { data: plan, error } = await supabase
    .from(TABLES.PLANS)
    .insert({
      name: input.name,
      description: input.description,
      start_date: input.start_date,
      end_date: input.end_date,
    })
    .select()
    .single();
  if (error || !plan) return { data: null, error };

  const { error: assignError } = await assignUnitsToPlan(plan.id, input.unitIds ?? []);
  if (assignError) return { data: null, error: assignError };

  return { data: plan, error: null };
}

// `unitIds` để `undefined` (PlanFormModal chỉ sửa metadata — việc gán chặng làm ở
// tab "Xây dựng" của trang chi tiết kế hoạch) thì hàm không đụng tới quan hệ.
// `previousUnitIds` là danh sách chặng đang gắn với kế hoạch này TRƯỚC khi sửa.
export async function updatePlan(
  id: Id,
  input: PlanInput,
  previousUnitIds: Id[] = []
): Promise<QueryResult<Plan>> {
  const { data: plan, error } = await supabase
    .from(TABLES.PLANS)
    .update({
      name: input.name,
      description: input.description,
      start_date: input.start_date,
      end_date: input.end_date,
    })
    .eq("id", id)
    .select()
    .single();
  if (error || !plan) return { data: null, error };

  if (!input.unitIds) return { data: plan, error: null };

  const removedUnitIds = previousUnitIds.filter((unitId) => !input.unitIds?.includes(unitId));
  const { error: unassignError } = await unassignUnitsFromPlan(removedUnitIds);
  if (unassignError) return { data: null, error: unassignError };

  const { error: assignError } = await assignUnitsToPlan(id, input.unitIds);
  if (assignError) return { data: null, error: assignError };

  return { data: plan, error: null };
}

export async function deletePlan(id: Id): Promise<WriteResult> {
  return supabase.from(TABLES.PLANS).delete().eq("id", id);
}
