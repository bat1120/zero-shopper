import type { UIMessage } from "ai";
import { getSupabase } from "./supabase";

const TABLE = "conversations";

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

/** UIMessage[] 에서 사이드바용 제목 추출 (첫 사용자 텍스트, 최대 60자) */
function deriveTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "새 대화";
  const text = firstUser.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join(" ")
    .trim();
  if (!text) return "새 대화";
  return text.length > 60 ? text.slice(0, 60) + "…" : text;
}

/**
 * 대화 전체를 upsert. 매 턴 onFinish에서 호출되어 전체 메시지 배열을 그대로 덮어쓴다.
 * Supabase 미설정 시 조용히 무시(앱 동작에 영향 없음).
 */
export async function saveConversation(args: {
  id: string;
  sessionId: string;
  messages: UIMessage[];
}): Promise<void> {
  const db = getSupabase();
  if (!db || !args.id || !args.sessionId) return;
  const now = new Date().toISOString();
  const { error } = await db.from(TABLE).upsert(
    {
      id: args.id,
      session_id: args.sessionId,
      title: deriveTitle(args.messages),
      messages: args.messages,
      updated_at: now,
    },
    { onConflict: "id" }
  );
  if (error) console.error("[conversations] save 실패:", error.message);
}

/** 세션의 대화 목록(최신순). */
export async function listConversations(sessionId: string): Promise<ConversationSummary[]> {
  const db = getSupabase();
  if (!db || !sessionId) return [];
  const { data, error } = await db
    .from(TABLE)
    .select("id, title, updated_at")
    .eq("session_id", sessionId)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[conversations] list 실패:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ id: r.id, title: r.title, updatedAt: r.updated_at }));
}

/** 단일 대화의 전체 메시지. 세션 소유 확인 포함. */
export async function getConversationMessages(
  id: string,
  sessionId: string
): Promise<UIMessage[] | null> {
  const db = getSupabase();
  if (!db || !id || !sessionId) return null;
  const { data, error } = await db
    .from(TABLE)
    .select("messages")
    .eq("id", id)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) {
    console.error("[conversations] get 실패:", error.message);
    return null;
  }
  return (data?.messages as UIMessage[]) ?? null;
}

/** 대화 삭제 (세션 소유 확인 포함). 실제로 삭제된 행이 있을 때만 true. */
export async function deleteConversation(id: string, sessionId: string): Promise<boolean> {
  const db = getSupabase();
  if (!db || !id || !sessionId) return false;
  const { error, count } = await db
    .from(TABLE)
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("session_id", sessionId);
  if (error) {
    console.error("[conversations] delete 실패:", error.message);
    return false;
  }
  return (count ?? 0) > 0;
}
