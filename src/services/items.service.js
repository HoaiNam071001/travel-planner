import { supabase } from "../lib/supabaseClient";
import { TABLES } from "../shared/constants/tables";

const SELECT_WITH_LOCATIONS = `*, ${TABLES.ITEM_LOCATIONS}(order_index, location:locations(id, name, lat, lng, images))`;

// Supabase không đảm bảo thứ tự của bảng con item_locations khi join, nên luôn
// sắp xếp lại theo order_index ở client rồi gom thành mảng `locations` phẳng.
function normalizeItem(item) {
  if (!item) return item;
  const { item_locations, ...rest } = item;
  const locations = (item_locations ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((il) => il.location)
    .filter(Boolean);
  return { ...rest, locations };
}

async function attachLocations(itemId, locationIds) {
  if (!locationIds.length) return { error: null };
  const rows = locationIds.map((location_id, index) => ({
    item_id: itemId,
    location_id,
    order_index: index,
  }));
  return supabase.from(TABLES.ITEM_LOCATIONS).insert(rows);
}

async function fetchItemWithLocations(itemId) {
  const { data, error } = await supabase
    .from(TABLES.ITEMS)
    .select(SELECT_WITH_LOCATIONS)
    .eq("id", itemId)
    .single();

  return { data: normalizeItem(data), error };
}

export async function listItems() {
  const { data, error } = await supabase
    .from(TABLES.ITEMS)
    .select(SELECT_WITH_LOCATIONS)
    .order("created_at", { ascending: true });

  return { data: data?.map(normalizeItem), error };
}

export async function createItem({ name, price, start_time, end_time, note, locationIds = [] }) {
  const { data: item, error } = await supabase
    .from(TABLES.ITEMS)
    .insert({ name, price, start_time, end_time, note })
    .select()
    .single();
  if (error) return { data: null, error };

  const { error: attachError } = await attachLocations(item.id, locationIds);
  if (attachError) return { data: null, error: attachError };

  return fetchItemWithLocations(item.id);
}

export async function updateItem(
  id,
  { name, price, start_time, end_time, note, locationIds = [] }
) {
  const { error } = await supabase
    .from(TABLES.ITEMS)
    .update({ name, price, start_time, end_time, note })
    .eq("id", id);
  if (error) return { data: null, error };

  const { error: deleteError } = await supabase
    .from(TABLES.ITEM_LOCATIONS)
    .delete()
    .eq("item_id", id);
  if (deleteError) return { data: null, error: deleteError };

  const { error: attachError } = await attachLocations(id, locationIds);
  if (attachError) return { data: null, error: attachError };

  return fetchItemWithLocations(id);
}

export async function deleteItem(id) {
  return supabase.from(TABLES.ITEMS).delete().eq("id", id);
}
