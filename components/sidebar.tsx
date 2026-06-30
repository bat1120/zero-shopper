"use client";

import { Plus, MessageSquare, Trash2, X, Sparkles } from "lucide-react";
import type { ConversationSummary } from "@/lib/conversations";

export function Sidebar({
  conversations,
  activeId,
  enabled,
  open,
  memory,
  onNew,
  onSelect,
  onDelete,
  onClose,
  onClearMemory,
}: {
  conversations: ConversationSummary[];
  activeId: string;
  enabled: boolean;
  open: boolean;
  /** 개인화 메모리 요약 (없으면 미표시) */
  memory: { summary: string; turns: number } | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onClearMemory: () => void;
}) {
  return (
    <>
      {/* 모바일 백드롭 */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={
          (open ? "fixed inset-y-0 left-0 z-40 flex" : "hidden") +
          " w-72 flex-col border-r border-white/10 bg-[#0d0d14] md:static md:flex"
        }
      >
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-xs font-semibold text-white/40">대화 이력</span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="사이드바 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <button
            onClick={onNew}
            className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white transition hover:border-brand-400/40 hover:bg-white/[0.08]"
          >
            <Plus className="h-4 w-4" /> 새 대화
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          {!enabled ? (
            <p className="px-2 py-3 text-[11px] leading-relaxed text-white/30">
              이력 저장이 꺼져 있어요.
              <br />
              (서버에 Supabase 환경변수를 설정하면 활성화됩니다)
            </p>
          ) : conversations.length === 0 ? (
            <p className="px-2 py-3 text-[11px] text-white/30">아직 저장된 대화가 없어요.</p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => {
                const active = c.id === activeId;
                return (
                  <li key={c.id}>
                    <div
                      className={
                        "group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition " +
                        (active
                          ? "bg-brand-500/15 text-white"
                          : "text-white/60 hover:bg-white/[0.05] hover:text-white")
                      }
                    >
                      <button
                        onClick={() => onSelect(c.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-white/30" />
                        <span className="truncate">{c.title}</span>
                      </button>
                      <button
                        onClick={() => onDelete(c.id)}
                        className="shrink-0 rounded p-1 text-white/30 transition hover:bg-white/10 hover:text-rose-300 group-hover:text-white/40"
                        aria-label="대화 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {enabled && memory?.summary ? (
          <div className="border-t border-white/10 px-3 py-3">
            <div className="rounded-lg border border-brand-400/20 bg-brand-500/[0.07] p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-brand-300">
                  <Sparkles className="h-3 w-3" /> 맞춤 메모리
                </span>
                <button
                  onClick={onClearMemory}
                  className="text-[10px] text-white/30 transition hover:text-rose-300"
                >
                  지우기
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-white/55">{memory.summary}</p>
              <p className="mt-1 text-[10px] text-white/25">대화 {memory.turns}회 학습됨</p>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
