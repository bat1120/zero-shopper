import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 서버 전용 Supabase 클라이언트.
 * service_role 키는 RLS를 우회하므로 절대 클라이언트로 노출하면 안 된다(서버 라우트에서만 사용).
 * 환경변수가 없으면 null → 대화 이력 기능은 자동 비활성화(앱은 그대로 동작).
 */
let cached: SupabaseClient | null = null;

export function hasSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Project URL 정규화. 사용자가 REST 엔드포인트(.../rest/v1/)나 끝 슬래시를 붙여 넣어도
 * 베이스 origin(https://xxxx.supabase.co)만 추출해 supabase-js에 넘긴다.
 */
function normalizeUrl(raw: string): string {
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  }
}

export function getSupabase(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  if (cached) return cached;
  cached = createClient(
    normalizeUrl(process.env.SUPABASE_URL as string),
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return cached;
}
