import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Lấy 2 giá trị này trong Supabase Dashboard > Project Settings > API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong file .env — xem .env.example"
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
