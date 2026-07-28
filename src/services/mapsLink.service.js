import { supabase } from "../lib/supabaseClient";

// Gọi Edge Function `resolve-maps-link` để theo redirect của link Google Maps
// rút gọn (maps.app.goo.gl/...) và lấy về URL đầy đủ.
export async function resolveShortMapsLink(url) {
  const { data, error } = await supabase.functions.invoke("resolve-maps-link", {
    body: { url },
  });

  if (error) {
    return { error: error.message ?? "Không giải mã được link rút gọn." };
  }
  if (data?.error) {
    return { error: data.error };
  }
  return { finalUrl: data?.finalUrl };
}
