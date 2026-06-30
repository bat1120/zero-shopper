import { getConversationMessages, deleteConversation } from "@/lib/conversations";

export const runtime = "nodejs";

/** GET /api/conversations/[id] — 대화 전체 메시지 로드 (세션 소유 확인). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = req.headers.get("x-session-id") ?? "";
  const messages = await getConversationMessages(id, sessionId);
  if (messages === null) {
    return Response.json({ error: "대화를 찾을 수 없습니다." }, { status: 404 });
  }
  return Response.json({ id, messages });
}

/** DELETE /api/conversations/[id] — 대화 삭제 (세션 소유 확인). */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = req.headers.get("x-session-id") ?? "";
  const ok = await deleteConversation(id, sessionId);
  if (!ok) return Response.json({ error: "삭제 실패" }, { status: 400 });
  return Response.json({ ok: true });
}
