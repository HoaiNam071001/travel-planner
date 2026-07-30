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

// Hoạt động mới luôn thêm vào cuối danh sách (thứ tự do kéo-thả quyết định).
async function nextOrderIndex() {
  const { data } = await supabase
    .from(TABLES.ITEMS)
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1);
  return (data?.[0]?.order_index ?? -1) + 1;
}

export async function listItems() {
  const { data, error } = await supabase
    .from(TABLES.ITEMS)
    .select(SELECT_WITH_LOCATIONS)
    .order("order_index", { ascending: true });

  return { data: data?.map(normalizeItem), error };
}

export async function reorderItems(orderedIds) {
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from(TABLES.ITEMS).update({ order_index: index }).eq("id", id)
    )
  );
  return { error: results.find((r) => r.error)?.error ?? null };
}

export async function createItem({ name, price, duration_minutes, note, locationIds = [] }) {
  const order_index = await nextOrderIndex();
  const { data: item, error } = await supabase
    .from(TABLES.ITEMS)
    .insert({ name, price, duration_minutes, note, order_index })
    .select()
    .single();
  if (error) return { data: null, error };

  const { error: attachError } = await attachLocations(item.id, locationIds);
  if (attachError) return { data: null, error: attachError };

  return fetchItemWithLocations(item.id);
}

export async function updateItem(
  id,
  { name, price, duration_minutes, note, locationIds = [] }
) {
  const { error } = await supabase
    .from(TABLES.ITEMS)
    .update({ name, price, duration_minutes, note })
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

// Dùng bởi units.service.js — items.service.js là nơi duy nhất gọi
// supabase.from(TABLES.ITEMS), kể cả khi thao tác xuất phát từ trang Chặng.
export async function assignItemsToUnit(unitId, itemIds) {
  const results = await Promise.all(
    itemIds.map((id, index) =>
      supabase.from(TABLES.ITEMS).update({ unit_id: unitId, order_index: index }).eq("id", id)
    )
  );
  return { error: results.find((r) => r.error)?.error ?? null };
}

export async function unassignItemsFromUnit(itemIds) {
  if (!itemIds.length) return { error: null };
  const results = await Promise.all(
    itemIds.map((id) =>
      supabase.from(TABLES.ITEMS).update({ unit_id: null, order_index: 0 }).eq("id", id)
    )
  );
  return { error: results.find((r) => r.error)?.error ?? null };
}
