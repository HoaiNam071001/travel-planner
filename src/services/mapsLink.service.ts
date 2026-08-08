import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";

interface ResolveMapsLinkResponse {
  finalUrl?: string;
  error?: string;
}

export interface ResolveMapsLinkResult {
  finalUrl?: string;
  error?: string;
}

// Gọi Edge Function `resolve-maps-link` để theo redirect của link Google Maps
// rút gọn (maps.app.goo.gl/...) và lấy về URL đầy đủ.
export async function resolveShortMapsLink(url: string): Promise<ResolveMapsLinkResult> {
  const { data, error } = await supabase.functions.invoke<ResolveMapsLinkResponse>(
    "resolve-maps-link",
    { body: { url } }
  );

  if (error) {
    return { error: error.message ?? i18n.t("locations:errors.resolveShortLink") };
  }
  if (data?.error) {
    return { error: data.error };
  }
  return { finalUrl: data?.finalUrl };
}
