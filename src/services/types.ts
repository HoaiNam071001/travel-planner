import type { PostgrestError } from "@supabase/supabase-js";

// Mọi service trả về cùng một hình dạng `{ data, error }` như supabase-js để các
// trang xử lý lỗi theo một cách duy nhất.

export type ServiceError = PostgrestError | Error;

export interface QueryResult<T> {
  data: T | null;
  error: ServiceError | null;
}

export interface ListResult<T> {
  data: T[] | null;
  error: ServiceError | null;
}

export interface WriteResult {
  error: ServiceError | null;
}
