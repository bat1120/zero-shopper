"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Square, Search, Scale, Sparkles, Menu } from "lucide-react";
import { ProductCardGrid, ProductCard } from "@/components/product-card";
import { CompareTable } from "@/components/compare-table";
import { DecisionGuide } from "@/components/decision-guide";
import { MarkdownLite } from "@/components/markdown-lite";
import { Sidebar } from "@/components/sidebar";
import type { ProductCardData, CompareItem, DecisionGuideData } from "@/lib/format";
import type { ConversationSummary } from "@/lib/conversations";

const SUGGESTIONS = [
  "캠핑 처음인데 10만 원으로 살 만한 2인 텐트 추천해줘",
  "지하철 출퇴근용 노이즈캔슬링 이어폰, 30만 원 이하로 찾아줘",
  "대학생인데 가볍고 100만 원 안쪽인 노트북 골라줘",
  "러닝 입문이고 무릎이 안 좋아. 어떤 러닝화가 맞을까?",
  "원룸 자취생인데 로봇청소기 하나 들이고 싶어",
];

// 진행 중인 도구 호출을 보여주는 작은 상태 칩
function ToolRunningChip({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/60">
      <span className="flex gap-0.5">
        <span className="typing-dot h-1 w-1 rounded-full bg-brand-400" />
        <span className="typing-dot h-1 w-1 rounded-full bg-brand-400 [animation-delay:0.2s]" />
        <span className="typing-dot h-1 w-1 rounded-full bg-brand-400 [animation-delay:0.4s]" />
      </span>
      {label}
    </div>
  );
}

export default function Home() {
  const sessionIdRef = useRef<string>("");
  const conversationIdRef = useRef<string>("");
  const loadingConvRef = useRef(false); // 과거 대화 로딩 중에는 전송 차단(레이스 방지)

  // transport는 한 번만 생성 — body에 현재 대화/세션 ID를 ref로 주입
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            id: conversationIdRef.current,
            sessionId: sessionIdRef.current,
          },
        }),
      })
  );

  const { messages, sendMessage, status, error, stop, setMessages } = useChat({ transport });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 대화 이력 (사이드바)
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [memory, setMemory] = useState<{ summary: string; turns: number } | null>(null);
  const prevStatus = useRef(status);

  const busy = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

  const refreshMemory = useCallback(async () => {
    try {
      const res = await fetch("/api/profile", {
        headers: { "x-session-id": sessionIdRef.current },
      });
      const data = await res.json();
      setMemory(
        data.enabled && data.summary
          ? { summary: data.summary, turns: Number(data.turns) || 0 }
          : null
      );
    } catch {
      /* 무시 */
    }
  }, []);

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", {
        headers: { "x-session-id": sessionIdRef.current },
      });
      const data = await res.json();
      setHistoryEnabled(Boolean(data.enabled));
      setConversations(data.conversations ?? []);
    } catch {
      /* 무시 */
    }
  }, []);

  // 세션 ID(localStorage) + 새 대화 ID 초기화
  useEffect(() => {
    let sid = localStorage.getItem("zeroshopper_session");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("zeroshopper_session", sid);
    }
    sessionIdRef.current = sid;
    conversationIdRef.current = crypto.randomUUID();
    setActiveId(conversationIdRef.current);
    refreshList();
    refreshMemory();
  }, [refreshList, refreshMemory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  // 턴 종료(ready 전환) 시 목록 갱신 — 새 대화 등장/제목 갱신 반영
  useEffect(() => {
    const was = prevStatus.current;
    prevStatus.current = status;
    if (was !== "ready" && status === "ready" && messages.length > 0) {
      refreshList();
      // 프로필은 응답 직후 백그라운드로 갱신되므로 약간 지연 후 다시 읽음
      const t = setTimeout(refreshMemory, 2600);
      return () => clearTimeout(t);
    }
  }, [status, messages.length, refreshList, refreshMemory]);

  function submit(text: string) {
    const value = text.trim();
    if (!value || busy || loadingConvRef.current) return;
    sendMessage({ text: value });
    setInput("");
  }

  function newChat() {
    if (busy) stop();
    conversationIdRef.current = crypto.randomUUID();
    setActiveId(conversationIdRef.current);
    setMessages([]);
    setSidebarOpen(false);
  }

  async function loadConversation(id: string) {
    if (busy || loadingConvRef.current || id === conversationIdRef.current) {
      setSidebarOpen(false);
      return;
    }
    loadingConvRef.current = true;
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        headers: { "x-session-id": sessionIdRef.current },
      });
      if (!res.ok) return;
      const data = await res.json();
      conversationIdRef.current = id;
      setActiveId(id);
      setMessages(data.messages ?? []);
    } catch {
      /* 무시 */
    } finally {
      loadingConvRef.current = false;
      setSidebarOpen(false);
    }
  }

  async function removeConversation(id: string) {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        headers: { "x-session-id": sessionIdRef.current },
      });
    } catch {
      /* 무시 */
    }
    if (id === conversationIdRef.current) newChat();
    refreshList();
  }

  async function clearMemory() {
    try {
      await fetch("/api/profile", {
        method: "DELETE",
        headers: { "x-session-id": sessionIdRef.current },
      });
    } catch {
      /* 무시 */
    }
    setMemory(null);
  }

  return (
    <div className="flex h-dvh w-full">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        enabled={historyEnabled}
        open={sidebarOpen}
        memory={memory}
        onNew={newChat}
        onSelect={loadConversation}
        onDelete={removeConversation}
        onClose={() => setSidebarOpen(false)}
        onClearMemory={clearMemory}
      />
      <div className="mx-auto flex h-dvh w-full min-w-0 max-w-3xl flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="대화 이력 열기"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-black text-white">
            Z
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight text-white">제로쇼퍼</h1>
            <p className="text-[11px] leading-tight text-white/40">상황 기반 AI 쇼핑 에이전트</p>
          </div>
        </div>
        <span className="rounded-full border border-brand-400/30 bg-brand-500/10 px-2.5 py-1 text-[11px] font-medium text-brand-300">
          (주)제로 사전과제 프로토타입
        </span>
      </header>

      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
        {isEmpty ? (
          <EmptyState onPick={submit} />
        ) : (
          <div className="space-y-5 py-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} onAsk={submit} />
            ))}
            {status === "submitted" && (
              <div className="flex justify-start">
                <ToolRunningChip label="생각하는 중…" />
              </div>
            )}
            {!busy &&
              messages.length > 0 &&
              messages[messages.length - 1].role === "assistant" && (
                <FollowUps onPick={submit} />
              )}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            오류가 발생했어요: {error.message}
            <br />
            (서버에 OPENAI_API_KEY가 설정되어 있는지 확인해 주세요.)
          </div>
        )}
      </div>

      {/* 입력창 */}
      <div className="px-4 pb-4 pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 focus-within:border-brand-400/40"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // IME 조합 중(한글 등)의 Enter는 글자 확정용이므로 전송하지 않는다
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={1}
            placeholder="상황을 자유롭게 말해보세요. 예) 캠핑 입문인데 10만 원으로 뭐 살까?"
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          {busy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
              aria-label="중지"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition enabled:hover:bg-brand-500 disabled:opacity-40"
              aria-label="보내기"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </form>
        <p className="mt-2 text-center text-[10px] text-white/25">
          네이버 쇼핑 검색 + AI 추천 데모입니다. 가격·재고는 실시간과 다를 수 있어요.
        </p>
      </div>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-2xl shadow-lg shadow-brand-700/30">
        🛍️
      </div>
      <h2 className="text-xl font-bold text-white">무엇을 사야 할지 고민이신가요?</h2>
      <p className="mt-2 max-w-md text-sm text-white/50">
        스펙을 몰라도 괜찮아요. <strong className="text-white/80">상황</strong>만 말해주면
        제로쇼퍼가 의도를 파악해 네이버 쇼핑에서 찾아 비교하고 추천해 드려요.
      </p>

      <div className="mt-7 grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="group flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-sm text-white/70 transition hover:border-brand-400/40 hover:bg-white/[0.06] hover:text-white"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
            <span>{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// 추천 직후 대화를 자연스럽게 잇는 후속 질문 칩
const FOLLOW_UPS = [
  "더 저렴한 대안 있어?",
  "방금 추천한 것들 비교해줘",
  "가장 인기 많은 걸로 추천해줘",
];

function FollowUps({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 pl-1 animate-fade-up">
      {FOLLOW_UPS.map((f) => (
        <button
          key={f}
          onClick={() => onPick(f)}
          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/60 transition hover:border-brand-400/40 hover:bg-white/[0.06] hover:text-white"
        >
          {f}
        </button>
      ))}
    </div>
  );
}

type ChatMessage = ReturnType<typeof useChat>["messages"][number];

function MessageBubble({
  message,
  onAsk,
}: {
  message: ChatMessage;
  onAsk: (text: string) => void;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("");
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-up">
      <div className="w-full max-w-[92%] space-y-2">
        {message.parts.map((part, i) => (
          <PartView key={`${part.type}-${i}`} part={part} onAsk={onAsk} />
        ))}
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function PartView({ part, onAsk }: { part: any; onAsk: (text: string) => void }) {
  // 1) 일반 텍스트
  if (part.type === "text") {
    if (!part.text?.trim()) return null;
    return (
      <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.04] px-4 py-3">
        <MarkdownLite text={part.text} />
      </div>
    );
  }

  // 2) 상품 검색 도구
  if (part.type === "tool-search_products") {
    if (part.state === "output-error") return <ToolErrorChip label="상품 검색에 실패했어요" />;
    if (part.state === "output-available") {
      const products = (part.output?.products ?? []) as ProductCardData[];
      return (
        <div className="space-y-1.5">
          <ToolLabel icon={<Search className="h-3.5 w-3.5" />} text={`상품 ${products.length}개 검색됨`} />
          <ProductCardGrid products={products} onAsk={onAsk} />
        </div>
      );
    }
    return <ToolRunningChip label="상품을 찾는 중…" />;
  }

  // 3) 비교 도구
  if (part.type === "tool-compare_products") {
    if (part.state === "output-error") return <ToolErrorChip label="상품 비교에 실패했어요" />;
    if (part.state === "output-available") {
      const items = (part.output?.products ?? []) as CompareItem[];
      return (
        <div className="space-y-1.5">
          <ToolLabel icon={<Scale className="h-3.5 w-3.5" />} text="상품 비교" />
          <CompareTable items={items} />
        </div>
      );
    }
    return <ToolRunningChip label="상품을 비교하는 중…" />;
  }

  // 4) 단일 상세 도구
  if (part.type === "tool-get_product_detail") {
    if (part.state === "output-error") return <ToolErrorChip label="상세 정보를 불러오지 못했어요" />;
    if (part.state === "output-available") {
      if (part.output?.found) {
        return <ProductCard p={part.output.product as ProductCardData} onAsk={onAsk} />;
      }
      return null; // 상품을 못 찾음(found=false) → 조용히 무시
    }
    return <ToolRunningChip label="상세 정보를 불러오는 중…" />;
  }

  // 5) 결정 도우미 도구
  if (part.type === "tool-decision_guide") {
    if (part.state === "output-error") return null;
    if (part.state === "output-available") {
      return <DecisionGuide data={part.output as DecisionGuideData} onPick={onAsk} />;
    }
    return <ToolRunningChip label="결정을 돕는 중…" />;
  }

  return null;
}

function ToolErrorChip({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200">
      {label}
    </div>
  );
}

function ToolLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-white/40">
      {icon}
      {text}
    </div>
  );
}
