import { supabase } from "../lib/supabaseClient";
import { TABLES } from "../shared/constants/tables";
import type { Id, UnitType } from "../shared/types/models";
import type { ListResult, QueryResult, WriteResult } from "./types";

export async function listUnitTypes(): Promise<ListResult<UnitType>> {
  return supabase.from(TABLES.UNIT_TYPES).select("*").order("created_at", { ascending: true });
}

export async function createUnitType(name: string): Promise<QueryResult<UnitType>> {
  return supabase.from(TABLES.UNIT_TYPES).insert({ name }).select().single();
}

export async function deleteUnitType(id: Id): Promise<WriteResult> {
  return supabase.from(TABLES.UNIT_TYPES).delete().eq("id", id);
}
