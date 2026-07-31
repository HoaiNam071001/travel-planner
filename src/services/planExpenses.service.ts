import { supabase } from "../lib/supabaseClient";
import { TABLES } from "../shared/constants/tables";
import type { Id, IsoDateTime, PlanExpense, PlanExpenseRow } from "../shared/types/models";
import type { ListResult, QueryResult, WriteResult } from "./types";

const SELECT_WITH_LOCATION = `*, location:locations(id, name, lat, lng, images)`;

export interface PlanExpenseInput {
  plan_id: Id;
  name: string;
  price: number | null;
  link: string | null;
  note: string | null;
  start_time: IsoDateTime | null;
  end_time: IsoDateTime | null;
  duration_minutes: number | null;
  location_id: Id | null;
}

/** Sửa lẻ mốc thời gian (kéo-thả trên tab Lịch trình) — không đụng tới các cột khác. */
export type PlanExpenseTimePatch = Partial<
  Pick<PlanExpenseRow, "start_time" | "end_time" | "duration_minutes">
>;

export async function listPlanExpenses(planId: Id): Promise<ListResult<PlanExpense>> {
  return supabase
    .from(TABLES.PLAN_EXPENSES)
    .select<string, PlanExpense>(SELECT_WITH_LOCATION)
    .eq("plan_id", planId)
    .order("created_at", { ascending: true });
}

/** Không lọc theo kế hoạch — dùng ở PlansPage để gộp tổng chi phí theo từng thẻ kế hoạch. */
export async function listAllPlanExpenses(): Promise<ListResult<PlanExpense>> {
  return supabase
    .from(TABLES.PLAN_EXPENSES)
    .select<string, PlanExpense>(SELECT_WITH_LOCATION)
    .order("created_at", { ascending: true });
}

export async function createPlanExpense(input: PlanExpenseInput): Promise<QueryResult<PlanExpense>> {
  return supabase
    .from(TABLES.PLAN_EXPENSES)
    .insert(input)
    .select<string, PlanExpense>(SELECT_WITH_LOCATION)
    .single();
}

export async function updatePlanExpense(
  id: Id,
  input: PlanExpenseInput
): Promise<QueryResult<PlanExpense>> {
  return supabase
    .from(TABLES.PLAN_EXPENSES)
    .update(input)
    .eq("id", id)
    .select<string, PlanExpense>(SELECT_WITH_LOCATION)
    .single();
}

/** Chỉ sửa mốc thời gian — dùng khi kéo-thả trên tab Lịch trình. */
export async function patchPlanExpenseTimes(id: Id, patch: PlanExpenseTimePatch): Promise<WriteResult> {
  return supabase.from(TABLES.PLAN_EXPENSES).update(patch).eq("id", id);
}

export async function deletePlanExpense(id: Id): Promise<WriteResult> {
  return supabase.from(TABLES.PLAN_EXPENSES).delete().eq("id", id);
}
