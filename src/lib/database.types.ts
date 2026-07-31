import type {
  ItemRow,
  LocationRow,
  Plan,
  UnitRoute,
  UnitRow,
  UnitType,
  UserProfile,
} from "../shared/types/models";

// Kiểu schema cho `createClient<Database>` — viết tay thay vì generate, đủ để mọi
// truy vấn trong `src/services/*` được type-check (không còn `any` từ supabase-js).
// `user_id`/`id`/`created_at` do Postgres tự điền nên optional khi Insert.

// supabase-js đòi mỗi Row/Insert/Update phải khớp `Record<string, unknown>`, mà
// `interface` thì không có index signature ngầm — map qua kiểu này để "mở khoá".
type Cols<T> = { [K in keyof T]: T[K] };

type Insertable<T, Optional extends keyof T> = Cols<
  Omit<T, Optional | "id" | "user_id" | "created_at"> &
    Partial<Pick<T, Extract<Optional | "id" | "user_id" | "created_at", keyof T>>>
>;

interface TableDef<Row, Insert> {
  Row: Cols<Row>;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
}

export interface ItemLocationRow {
  id: string;
  user_id: string;
  item_id: string;
  location_id: string;
  order_index: number;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: TableDef<UserProfile, Insertable<UserProfile, "email" | "full_name" | "avatar">>;
      plans: TableDef<Plan, Insertable<Plan, "description" | "start_date" | "end_date">>;
      unit_types: TableDef<UnitType, Insertable<UnitType, never>>;
      units: TableDef<
        UnitRow,
        Insertable<
          UnitRow,
          | "plan_id"
          | "unit_type_id"
          | "description"
          | "start_date"
          | "end_date"
          | "duration_minutes"
          | "break_minutes"
          | "order_index"
        >
      >;
      locations: TableDef<LocationRow, Insertable<LocationRow, "description" | "images">>;
      items: TableDef<
        ItemRow,
        Insertable<
          ItemRow,
          | "unit_id"
          | "price"
          | "duration_minutes"
          | "start_time"
          | "end_time"
          | "note"
          | "order_index"
        >
      >;
      item_locations: TableDef<ItemLocationRow, Insertable<ItemLocationRow, "order_index">>;
      unit_routes: TableDef<
        UnitRoute,
        Insertable<UnitRoute, "distance_km" | "duration_min" | "route_geometry" | "updated_at">
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
