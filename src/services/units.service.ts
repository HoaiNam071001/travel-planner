import { supabase } from "../lib/supabaseClient";
import { TABLES } from "../shared/constants/tables";
import { DEFAULT_UNIT_DURATION_MINUTES } from "../shared/utils/schedule";
import type { Id, IsoDateTime, Unit, UnitRow } from "../shared/types/models";
import { assignItemsToUnit, unassignItemsFromUnit } from "./items.service";
import type { ListResult, QueryResult, ServiceError, WriteResult } from "./types";

const SELECT_WITH_TYPE = "*, unit_type:unit_types(id, name)";

export interface UnitInput {
  name: string;
  description: string | null;
  unit_type_id: Id | null;
  start_date: IsoDateTime | null;
  /** `undefined` = không đụng tới cột này (form mở từ Plan Builder). */
  end_date?: IsoDateTime | null;
  duration_minutes?: number;
  break_minutes?: number;
  /** `undefined` = không đụng tới quan hệ chặng-hoạt động. */
  itemIds?: Id[];
}

/** Sửa lẻ mốc thời gian của chặng (kéo-thả trên tab Lịch trình). */
export interface UnitTimePatch {
  start_date?: IsoDateTime | null;
  end_date?: IsoDateTime | null;
  duration_minutes?: number;
}

export async function listUnits(): Promise<ListResult<Unit>> {
  return supabase
    .from(TABLES.UNITS)
    .select<string, Unit>(SELECT_WITH_TYPE)
    .order("order_index", { ascending: true });
}

// Chặng mới luôn thêm vào cuối danh sách (thứ tự do kéo-thả quyết định).
async function nextOrderIndex(): Promise<number> {
  const { data } = await supabase
    .from(TABLES.UNITS)
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1);
  return (data?.[0]?.order_index ?? -1) + 1;
}

function firstError(results: WriteResult[]): ServiceError | null {
  return results.find((r) => r.error)?.error ?? null;
}

export async function createUnit(input: UnitInput): Promise<QueryResult<Unit>> {
  const order_index = await nextOrderIndex();
  const { data: unit, error } = await supabase
    .from(TABLES.UNITS)
    .insert({
      name: input.name,
      description: input.description,
      unit_type_id: input.unit_type_id,
      start_date: input.start_date,
      end_date: input.end_date ?? null,
      // Chặng nào cũng có khoảng thời gian — mặc định 6h nếu form không gửi.
      duration_minutes: input.duration_minutes ?? DEFAULT_UNIT_DURATION_MINUTES,
      break_minutes: input.break_minutes ?? 0,
      order_index,
    })
    .select<string, Unit>(SELECT_WITH_TYPE)
    .single();
  if (error || !unit) return { data: null, error };

  const { error: assignError } = await assignItemsToUnit(unit.id, input.itemIds ?? []);
  if (assignError) return { data: null, error: assignError };

  return { data: unit, error: null };
}

// `itemIds` để `undefined` (UnitFormModal mở từ Plan Builder — việc gắn hoạt động
// làm bằng kéo-thả) thì hàm không đụng tới quan hệ unit-item.
// `previousItemIds` là danh sách hoạt động đang gắn với unit này TRƯỚC khi sửa
// (page truyền vào từ state đã tải sẵn) — dùng để biết hoạt động nào bị bỏ ra
// cần gỡ unit_id, tách biệt với `itemIds` là danh sách mới sau khi sửa.
export async function updateUnit(
  id: Id,
  input: UnitInput,
  previousItemIds: Id[] = []
): Promise<QueryResult<Unit>> {
  const updates: Partial<UnitRow> = {
    name: input.name,
    description: input.description,
    unit_type_id: input.unit_type_id,
    start_date: input.start_date,
  };
  if (input.end_date !== undefined) updates.end_date = input.end_date;
  if (input.duration_minutes !== undefined) updates.duration_minutes = input.duration_minutes;
  if (input.break_minutes !== undefined) updates.break_minutes = input.break_minutes;

  const { data: unit, error } = await supabase
    .from(TABLES.UNITS)
    .update(updates)
    .eq("id", id)
    .select<string, Unit>(SELECT_WITH_TYPE)
    .single();
  if (error || !unit) return { data: null, error };

  if (!input.itemIds) return { data: unit, error: null };

  const removedItemIds = previousItemIds.filter((itemId) => !input.itemIds?.includes(itemId));
  const { error: unassignError } = await unassignItemsFromUnit(removedItemIds);
  if (unassignError) return { data: null, error: unassignError };

  const { error: assignError } = await assignItemsToUnit(id, input.itemIds);
  if (assignError) return { data: null, error: assignError };

  return { data: unit, error: null };
}

/** Chỉ sửa mốc thời gian — dùng khi kéo-thả chặng trên tab Lịch trình. */
export async function patchUnitTimes(id: Id, patch: UnitTimePatch): Promise<WriteResult> {
  return supabase.from(TABLES.UNITS).update(patch).eq("id", id);
}

export async function deleteUnit(id: Id): Promise<WriteResult> {
  return supabase.from(TABLES.UNITS).delete().eq("id", id);
}

// Dùng bởi plans.service.ts — units.service.ts là nơi duy nhất gọi
// supabase.from(TABLES.UNITS), kể cả khi thao tác xuất phát từ trang Kế hoạch.
export async function assignUnitsToPlan(planId: Id, unitIds: Id[]): Promise<WriteResult> {
  const results = await Promise.all(
    unitIds.map((id, index) =>
      supabase.from(TABLES.UNITS).update({ plan_id: planId, order_index: index }).eq("id", id)
    )
  );
  return { error: firstError(results) };
}

export async function unassignUnitsFromPlan(unitIds: Id[]): Promise<WriteResult> {
  if (!unitIds.length) return { error: null };
  const results = await Promise.all(
    unitIds.map((id) =>
      supabase.from(TABLES.UNITS).update({ plan_id: null, order_index: 0 }).eq("id", id)
    )
  );
  return { error: firstError(results) };
}
