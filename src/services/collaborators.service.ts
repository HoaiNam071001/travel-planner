import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";
import { TABLES } from "../shared/constants/tables";
import type { Id, PlanCollaborator } from "../shared/types/models";
import type { ListResult, QueryResult, WriteResult } from "./types";

export async function listCollaborators(planId: Id): Promise<ListResult<PlanCollaborator>> {
  return supabase
    .from(TABLES.PLAN_COLLABORATORS)
    .select("*")
    .eq("plan_id", planId)
    .order("created_at", { ascending: true });
}

// Mời theo email tài khoản ĐÃ CÓ — tra user_id qua RPC `find_user_id_by_email` (bảng
// `users` RLS chỉ cho tự đọc dòng của mình nên client không tự query được), rồi mới
// insert vào plan_collaborators (id người mời do RPC tra ra, không phải auth.uid()).
export async function inviteCollaborator(
  planId: Id,
  email: string
): Promise<QueryResult<PlanCollaborator>> {
  const trimmed = email.trim();
  if (!trimmed) return { data: null, error: new Error(i18n.t("planDetail:share.emailRequired")) };

  const { data: matches, error: lookupError } = await supabase.rpc("find_user_id_by_email", {
    target_email: trimmed,
  });
  if (lookupError) return { data: null, error: lookupError };

  const match = matches?.[0];
  if (!match) {
    return {
      data: null,
      error: new Error(i18n.t("planDetail:share.accountNotFound")),
    };
  }

  const { data, error } = await supabase
    .from(TABLES.PLAN_COLLABORATORS)
    .insert({ plan_id: planId, user_id: match.user_id, invited_email: trimmed })
    .select()
    .single();

  if (error) {
    // Vi phạm unique (plan_id, user_id) — đã mời người này rồi.
    if (error.code === "23505") {
      return { data: null, error: new Error(i18n.t("planDetail:share.alreadyInvited")) };
    }
    return { data: null, error };
  }

  return { data, error: null };
}

export async function removeCollaborator(id: Id): Promise<WriteResult> {
  return supabase.from(TABLES.PLAN_COLLABORATORS).delete().eq("id", id);
}
