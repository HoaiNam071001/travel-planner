import type {
  ItemRow,
  LocationRow,
  Plan,
  PlanCollaborator,
  PlanExpenseRow,
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

// `plan_collaborators.user_id` KHÔNG có `default auth.uid()` như mọi bảng khác — giá
// trị là id của người ĐƯỢC MỜI (service tự tra bằng `find_user_id_by_email` rồi điền),
// không phải người đang gọi, nên không dùng `Insertable<T, Optional>` được (helper đó
// unconditionally bỏ `user_id` vì giả định luôn có default).
export interface PlanCollaboratorInsert {
  plan_id: string;
  user_id: string;
  invited_email: string;
  id?: string;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      users: TableDef<UserProfile, Insertable<UserProfile, "email" | "full_name" | "avatar">>;
      plans: TableDef<
        Plan,
        Insertable<Plan, "description" | "start_date" | "end_date" | "share_token">
      >;
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
      plan_collaborators: TableDef<PlanCollaborator, Cols<PlanCollaboratorInsert>>;
      plan_expenses: TableDef<
        PlanExpenseRow,
        Insertable<
          PlanExpenseRow,
          | "location_id"
          | "price"
          | "link"
          | "note"
          | "start_time"
          | "end_time"
          | "duration_minutes"
        >
      >;
    };
    Views: Record<string, never>;
    Functions: {
      find_user_id_by_email: {
        Args: { target_email: string };
        Returns: { user_id: string; full_name: string | null; avatar: string | null }[];
      };
      get_shared_plan: {
        Args: { token: string };
        // jsonb — theo đúng convention `unknown` đã dùng cho unit_routes.route_geometry.
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
