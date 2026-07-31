// Kiểu dữ liệu miền (domain) dùng chung cho service + UI. Tên cột giữ nguyên
// snake_case như trong Postgres để service không phải map qua lại.

export type Id = string;

/** Chuỗi ISO 8601 (cột `timestamptz`), vd "2026-02-12T08:00:00+07:00". */
export type IsoDateTime = string;

/** Chuỗi "YYYY-MM-DD" (cột `date`) — dùng cho `plans.start_date`/`end_date`. */
export type IsoDate = string;

export interface UserProfile {
  user_id: Id;
  email: string | null;
  full_name: string | null;
  avatar: string | null;
  created_at: IsoDateTime;
}

export interface LocationRow {
  id: Id;
  user_id: Id;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  images: string[];
  created_at: IsoDateTime;
}

/** Địa điểm đã gắn vào 1 hoạt động — chỉ lấy các cột cần cho UI. */
export type ItemLocation = Pick<LocationRow, "id" | "name" | "lat" | "lng" | "images">;

export interface ItemRow {
  id: Id;
  user_id: Id;
  unit_id: Id | null;
  name: string;
  price: number | null;
  /** Thời lượng dự phòng khi không có `start_time`/`end_time`. */
  duration_minutes: number | null;
  start_time: IsoDateTime | null;
  end_time: IsoDateTime | null;
  note: string | null;
  order_index: number;
  created_at: IsoDateTime;
}

/** Hoạt động sau khi service join + sắp xếp bảng nối `item_locations`. */
export interface Item extends ItemRow {
  locations: ItemLocation[];
}

export interface UnitType {
  id: Id;
  user_id: Id;
  name: string;
  created_at: IsoDateTime;
}

export interface UnitRow {
  id: Id;
  user_id: Id;
  plan_id: Id | null;
  unit_type_id: Id | null;
  name: string;
  description: string | null;
  start_date: IsoDateTime | null;
  end_date: IsoDateTime | null;
  /** Khoảng thời gian mặc định của chặng, luôn có (mặc định 360 phút = 6h). */
  duration_minutes: number;
  break_minutes: number;
  order_index: number;
  created_at: IsoDateTime;
}

/** Chặng kèm "loại" đã join từ `unit_types`. */
export interface Unit extends UnitRow {
  unit_type: Pick<UnitType, "id" | "name"> | null;
}

export interface PlanExpenseRow {
  id: Id;
  user_id: Id;
  plan_id: Id;
  location_id: Id | null;
  name: string;
  price: number | null;
  link: string | null;
  note: string | null;
  start_time: IsoDateTime | null;
  end_time: IsoDateTime | null;
  /** Thời lượng dự phòng khi chỉ có 1 trong 2 mốc start_time/end_time. */
  duration_minutes: number | null;
  created_at: IsoDateTime;
}

/** Chi phí khác sau khi service join địa điểm (nếu có). */
export interface PlanExpense extends PlanExpenseRow {
  location: ItemLocation | null;
}

export interface Plan {
  id: Id;
  user_id: Id;
  name: string;
  description: string | null;
  start_date: IsoDate | null;
  end_date: IsoDate | null;
  /** Token ngẫu nhiên cho link xem trước công khai (`/p/:token`) — null = tắt chia sẻ. */
  share_token: string | null;
  created_at: IsoDateTime;
}

/** 1 lượt mời cộng tác — người được mời có toàn quyền sửa kế hoạch như chủ sở hữu. */
export interface PlanCollaborator {
  id: Id;
  plan_id: Id;
  user_id: Id;
  /** Denormalize để hiển thị — KHÔNG join sang `users` (RLS bảng đó chỉ cho tự đọc dòng của mình). */
  invited_email: string;
  created_at: IsoDateTime;
}

export interface UnitRoute {
  unit_id: Id;
  user_id: Id;
  distance_km: number | null;
  duration_min: number | null;
  route_geometry: unknown;
  updated_at: IsoDateTime;
}

/** Thống kê tính động của 1 chặng (không lưu trong DB). */
export interface UnitStats {
  itemCount: number;
  cost: number;
  minutes: number;
}

/** Thống kê tính động của 1 kế hoạch. */
export interface PlanTotals extends UnitStats {
  unitCount: number;
  locationCount: number;
}
