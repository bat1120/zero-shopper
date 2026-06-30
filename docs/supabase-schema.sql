-- 제로쇼퍼 대화 이력 저장 스키마
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.
--
-- 인증이 없는 프로토타입이므로, 익명 세션 ID(클라이언트 localStorage)로 대화를 구분합니다.
-- 모든 읽기/쓰기는 서버 API 라우트(service_role 키)로만 이뤄지고, RLS로 공개 접근을 차단합니다.

create extension if not exists "pgcrypto";

create table if not exists public.conversations (
  id          uuid        primary key,                       -- 대화 ID (클라이언트가 crypto.randomUUID로 생성)
  session_id  text        not null,                          -- 익명 세션 ID (localStorage)
  title       text        not null default '새 대화',         -- 사이드바 표시용 (첫 사용자 메시지에서 추출)
  messages    jsonb       not null default '[]'::jsonb,      -- 전체 UIMessage[] (매 턴 갱신)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 세션별 최신순 목록 조회용 인덱스
create index if not exists conversations_session_updated_idx
  on public.conversations (session_id, updated_at desc);

-- RLS 활성화: 정책을 만들지 않으므로 anon/public 키로는 접근 불가.
-- 서버의 service_role 키는 RLS를 우회하므로 API 라우트에서만 접근됩니다.
alter table public.conversations enable row level security;
