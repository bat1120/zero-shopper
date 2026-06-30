import { listConversations } from "@/lib/conversations";
import { hasSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

/** GET /api/conversations — 현재 세션의 대화 목록(최신순). 세션 ID는 x-session-id 헤더. */
export async function GET(req: Request) {
  const sessionId = req.headers.get("x-session-id") ?? "";
  if (!hasSupabase()) return Response.json({ enabled: false, conversations: [] });
  const conversations = await listConversations(sessionId);
  return Response.json({ enabled: true, conversations });
}
