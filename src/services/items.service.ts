import { supabase } from "../lib/supabaseClient";
import { TABLES } from "../shared/constants/tables";
import type { Id, IsoDateTime, Item, ItemLocation, ItemRow } from "../shared/types/models";
import type { ListResult, QueryResult, ServiceError, WriteResult } from "./types";

const SELECT_WITH_LOCATIONS = `*, ${TABLES.ITEM_LOCATIONS}(order_index, location:locations(id, name, lat, lng, images))`;

/** Dạng thô trả về từ join — chỉ dùng nội bộ trước khi `normalizeItem`. */
interface ItemWithJoin extends ItemRow {
  item_locations: { order_index: number; location: ItemLocation | null }[] | null;
}

export interface ItemInput {
  name: string;
  price: number | null;
  duration_minutes: number | null;
  start_time: IsoDateTime | null;
  end_time: IsoDateTime | null;
  note: string | null;
  locationIds: Id[];
}

/** Sửa lẻ vài cột (kéo-thả trên lịch trình) — không đụng tới danh sách địa điểm. */
export type ItemTimePatch = Partial<
  Pick<ItemRow, "start_time" | "end_time" | "duration_minutes">
>;

// Supabase không đảm bảo thứ tự của bảng con item_locations khi join, nên luôn
// sắp xếp lại theo order_index ở client rồi gom thành mảng `locations` phẳng.
function normalizeItem(item: ItemWithJoin): Item {
  const { item_locations, ...rest } = item;
  const locations = (item_locations ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((link) => link.location)
    .filter((loc): loc is ItemLocation => Boolean(loc));
  return { ...rest, locations };
}

async function attachLocations(itemId: Id, locationIds: Id[]): Promise<WriteResult> {
  if (!locationIds.length) return { error: null };
  const rows = locationIds.map((location_id, index) => ({
    item_id: itemId,
    location_id,
    order_index: index,
  }));
  return supabase.from(TABLES.ITEM_LOCATIONS).insert(rows);
}

async function fetchItemWithLocations(itemId: Id): Promise<QueryResult<Item>> {
  const { data, error } = await supabase
    .from(TABLES.ITEMS)
    .select<string, ItemWithJoin>(SELECT_WITH_LOCATIONS)
    .eq("id", itemId)
    .single();

  return { data: data ? normalizeItem(data) : null, error };
}

// Hoạt động mới luôn thêm vào cuối danh sách (thứ tự do kéo-thả quyết định).
async function nextOrderIndex(): Promise<number> {
  const { data } = await supabase
    .from(TABLES.ITEMS)
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1);
  return (data?.[0]?.order_index ?? -1) + 1;
}

export async function listItems(): Promise<ListResult<Item>> {
  const { data, error } = await supabase
    .from(TABLES.ITEMS)
    .select<string, ItemWithJoin>(SELECT_WITH_LOCATIONS)
    .order("order_index", { ascending: true });

  return { data: data?.map(normalizeItem) ?? null, error };
}

function firstError(results: WriteResult[]): ServiceError | null {
  return results.find((r) => r.error)?.error ?? null;
}

export async function reorderItems(orderedIds: Id[]): Promise<WriteResult> {
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from(TABLES.ITEMS).update({ order_index: index }).eq("id", id)
    )
  );
  return { error: firstError(results) };
}

export async function createItem(input: ItemInput): Promise<QueryResult<Item>> {
  const { locationIds, ...fields } = input;
  const order_index = await nextOrderIndex();
  const { data: item, error } = await supabase
    .from(TABLES.ITEMS)
    .insert({ ...fields, order_index })
    .select()
    .single();
  if (error || !item) return { data: null, error };

  const { error: attachError } = await attachLocations(item.id, locationIds);
  if (attachError) return { data: null, error: attachError };

  return fetchItemWithLocations(item.id);
}

export async function updateItem(id: Id, input: ItemInput): Promise<QueryResult<Item>> {
  const { locationIds, ...fields } = input;

  const { error } = await supabase.from(TABLES.ITEMS).update(fields).eq("id", id);
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

/**
 * Chỉ sửa mốc thời gian (kéo-thả trên tab Lịch trình). Tách riêng khỏi
 * `updateItem` vì hàm kia ghi đè cả bảng nối địa điểm.
 */
export async function patchItemTimes(id: Id, patch: ItemTimePatch): Promise<WriteResult> {
  return supabase.from(TABLES.ITEMS).update(patch).eq("id", id);
}

export async function deleteItem(id: Id): Promise<WriteResult> {
  return supabase.from(TABLES.ITEMS).delete().eq("id", id);
}

// Dùng bởi units.service.ts — items.service.ts là nơi duy nhất gọi
// supabase.from(TABLES.ITEMS), kể cả khi thao tác xuất phát từ trang Chặng.
export async function assignItemsToUnit(unitId: Id, itemIds: Id[]): Promise<WriteResult> {
  const results = await Promise.all(
    itemIds.map((id, index) =>
      supabase.from(TABLES.ITEMS).update({ unit_id: unitId, order_index: index }).eq("id", id)
    )
  );
  return { error: firstError(results) };
}

export async function unassignItemsFromUnit(itemIds: Id[]): Promise<WriteResult> {
  if (!itemIds.length) return { error: null };
  const results = await Promise.all(
    itemIds.map((id) =>
      supabase.from(TABLES.ITEMS).update({ unit_id: null, order_index: 0 }).eq("id", id)
    )
  );
  return { error: firstError(results) };
}
