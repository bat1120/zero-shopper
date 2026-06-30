import { getProfile, deleteProfile } from "@/lib/user-profile";
import { hasSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

/** GET /api/profile — 현재 세션의 개인화 메모리 요약. 세션 ID는 x-session-id 헤더. */
export async function GET(req: Request) {
  const sessionId = req.headers.get("x-session-id") ?? "";
  if (!hasSupabase()) return Response.json({ enabled: false });
  const rec = await getProfile(sessionId);
  return Response.json({
    enabled: true,
    summary: rec?.summary ?? "",
    profile: rec?.profile ?? null,
    turns: rec?.turns ?? 0,
  });
}

/** DELETE /api/profile — 개인화 메모리 초기화. 멱등(없어도 성공). */
export async function DELETE(req: Request) {
  const sessionId = req.headers.get("x-session-id") ?? "";
  // 메모리 초기화는 멱등: 프로필이 없어도(이미 비어 있어도) 성공으로 본다.
  // (DB 오류는 deleteProfile 내부에서 로깅됨)
  const cleared = await deleteProfile(sessionId);
  return Response.json({ ok: true, cleared });
}
