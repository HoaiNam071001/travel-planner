import { supabase } from "../lib/supabaseClient";
import { TABLES } from "../shared/constants/tables";

export async function listUnitTypes() {
  return supabase.from(TABLES.UNIT_TYPES).select("*").order("created_at", { ascending: true });
}

export async function createUnitType(name) {
  return supabase.from(TABLES.UNIT_TYPES).insert({ name }).select().single();
}

export async function deleteUnitType(id) {
  return supabase.from(TABLES.UNIT_TYPES).delete().eq("id", id);
}
