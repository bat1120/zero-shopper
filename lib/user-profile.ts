import { generateObject, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getSupabase } from "./supabase";

const TABLE = "user_profiles";
const PROFILE_MODEL = process.env.OPENAI_PROFILE_MODEL ?? "gpt-4.1-mini";

export interface UserProfile {
  관심카테고리: string[];
  예산성향: "가성비" | "균형" | "프리미엄" | "불명";
  생활맥락: string[];
  선호: string[];
  기피: string[];
}

export interface ProfileRecord {
  profile: UserProfile;
  summary: string;
  turns: number;
}

/** 세션의 개인화 프로필 로드 (없으면 null). */
export async function getProfile(sessionId: string): Promise<ProfileRecord | null> {
  const db = getSupabase();
  if (!db || !sessionId) return null;
  const { data, error } = await db
    .from(TABLE)
    .select("profile, summary, turns")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) {
    console.error("[profile] get 실패:", error.message);
    return null;
  }
  if (!data) return null;
  return { profile: data.profile as UserProfile, summary: data.summary, turns: data.turns };
}

/** 시스템 프롬프트에 주입할 메모리 블록(없으면 빈 문자열). */
export function profilePromptBlock(rec: ProfileRecord | null): string {
  if (!rec || !rec.summary?.trim()) return "";
  const p = rec.profile ?? ({} as UserProfile);
  const facts: string[] = [];
  if (p.예산성향 && p.예산성향 !== "불명") facts.push(`예산 성향: ${p.예산성향}`);
  if (p.관심카테고리?.length) facts.push(`관심 카테고리: ${p.관심카테고리.join(", ")}`);
  if (p.생활맥락?.length) facts.push(`생활 맥락: ${p.생활맥락.join(", ")}`);
  if (p.선호?.length) facts.push(`선호: ${p.선호.join(", ")}`);
  if (p.기피?.length) facts.push(`기피: ${p.기피.join(", ")}`);
  return `

[사용자 메모리 — 이전 대화들에서 파악한 이 사용자의 성향]
${rec.summary}
${facts.map((f) => `- ${f}`).join("\n")}
- 위 성향을 참고해 더 맞춤한 추천을 하되, **이번 질문의 명시적 조건이 항상 우선**입니다. 성향은 참고일 뿐 단정하거나 강요하지 말고, 자연스럽게 녹이세요(예: "평소 가성비를 중시하셨으니…").`;
}

const ProfileSchema = z.object({
  관심카테고리: z.array(z.string()).describe("반복적으로 관심을 보인 상품 카테고리"),
  예산성향: z.enum(["가성비", "균형", "프리미엄", "불명"]),
  생활맥락: z.array(z.string()).describe("자취/원룸/운동/재택 등 지속적 상황"),
  선호: z.array(z.string()).describe("선호하는 브랜드/특성"),
  기피: z.array(z.string()).describe("피하려는 특성/브랜드"),
  요약: z.string().describe("프롬프트 주입용 1~2문장 자연어 요약(한국어)"),
});

/** UIMessage[] → 대화 텍스트(역할 표시) */
function conversationText(messages: UIMessage[]): string {
  const lines: string[] = [];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const text = m.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join(" ")
      .trim();
    if (text) lines.push(`${m.role === "user" ? "사용자" : "에이전트"}: ${text}`);
  }
  return lines.join("\n").slice(0, 6000);
}

/**
 * 한 대화가 끝나면 기존 프로필 + 새 대화를 보고 선호를 누적 갱신한다.
 * 1회성 요청이 아니라 반복·지속될 만한 선호만 반영(보수적). Supabase/키 없으면 no-op.
 */
export async function updateProfileFromConversation(
  sessionId: string,
  messages: UIMessage[],
  existing: ProfileRecord | null
): Promise<void> {
  const db = getSupabase();
  if (!db || !sessionId || !process.env.OPENAI_API_KEY) return;
  const text = conversationText(messages);
  if (!text) return;

  try {
    const { object } = await generateObject({
      model: openai(PROFILE_MODEL),
      schema: ProfileSchema,
      temperature: 0,
      system:
        "당신은 쇼핑 에이전트의 '사용자 메모리'를 관리하는 정리자입니다. 기존 프로필과 새 대화를 보고, " +
        "일시적인 1회성 요청이 아니라 반복되거나 지속될 만한 선호만 반영해 프로필을 갱신하세요. " +
        "확실하지 않으면 비워 두고(빈 배열/'불명') 단정하지 마세요. 기존 정보는 모순되지 않는 한 보존하고 점진적으로 보강합니다. 요약은 한국어 1~2문장.",
      prompt: `[기존 프로필]\n${JSON.stringify(existing?.profile ?? {})}\n\n[방금 끝난 대화]\n${text}\n\n갱신된 프로필을 출력하세요.`,
    });

    const profile: UserProfile = {
      관심카테고리: object.관심카테고리,
      예산성향: object.예산성향,
      생활맥락: object.생활맥락,
      선호: object.선호,
      기피: object.기피,
    };
    const { error } = await db.from(TABLE).upsert(
      {
        session_id: sessionId,
        profile,
        summary: object.요약,
        turns: (existing?.turns ?? 0) + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );
    if (error) console.error("[profile] upsert 실패:", error.message);
  } catch (e) {
    console.error("[profile] 추출 실패:", e instanceof Error ? e.message : e);
  }
}

/** 프로필 삭제(메모리 초기화). */
export async function deleteProfile(sessionId: string): Promise<boolean> {
  const db = getSupabase();
  if (!db || !sessionId) return false;
  const { error } = await db.from(TABLE).delete().eq("session_id", sessionId);
  if (error) {
    console.error("[profile] delete 실패:", error.message);
    return false;
  }
  return true;
}
