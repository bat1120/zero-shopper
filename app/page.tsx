"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Square, Search, Scale, Sparkles } from "lucide-react";
import { ProductCardGrid, ProductCard } from "@/components/product-card";
import { CompareTable } from "@/components/compare-table";
import { MarkdownLite } from "@/components/markdown-lite";
import type { ProductCardData, CompareItem } from "@/lib/format";

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
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const busy = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    sendMessage({ text: value });
    setInput("");
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
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
              if (e.key === "Enter" && !e.shiftKey) {
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
          더미 카탈로그 기반 데모입니다. 추천 상품·가격은 실제와 다를 수 있어요.
        </p>
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
        제로쇼퍼가 의도를 파악해 카탈로그에서 찾아 비교하고 추천해 드려요.
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
          <PartView key={i} part={part} onAsk={onAsk} />
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
    if (part.state === "output-available") {
      const products = (part.output?.products ?? []) as ProductCardData[];
      return (
        <div className="space-y-1.5">
          <ToolLabel icon={<Search className="h-3.5 w-3.5" />} text={`상품 ${products.length}개 검색됨`} />
          <ProductCardGrid products={products} onAsk={onAsk} />
        </div>
      );
    }
    return <ToolRunningChip label="카탈로그에서 상품을 찾는 중…" />;
  }

  // 3) 비교 도구
  if (part.type === "tool-compare_products") {
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
    if (part.state === "output-available" && part.output?.found) {
      return <ProductCard p={part.output.product as ProductCardData} onAsk={onAsk} />;
    }
    if (part.state !== "output-available") {
      return <ToolRunningChip label="상세 정보를 불러오는 중…" />;
    }
  }

  return null;
}

function ToolLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-white/40">
      {icon}
      {text}
    </div>
  );
}
