import { supabase } from "../lib/supabaseClient";
import { TABLES } from "../shared/constants/tables";

export async function listLocations() {
  return supabase
    .from(TABLES.LOCATIONS)
    .select("*")
    .order("created_at", { ascending: true });
}

export async function createLocation({ name, description, lat, lng, images }) {
  return supabase
    .from(TABLES.LOCATIONS)
    .insert({ name, description, lat, lng, images })
    .select()
    .single();
}

export async function updateLocation(id, { name, description, lat, lng, images }) {
  return supabase
    .from(TABLES.LOCATIONS)
    .update({ name, description, lat, lng, images })
    .eq("id", id)
    .select()
    .single();
}

export async function deleteLocation(id) {
  return supabase.from(TABLES.LOCATIONS).delete().eq("id", id);
}
