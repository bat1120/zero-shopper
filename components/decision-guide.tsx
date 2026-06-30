import { GitBranch } from "lucide-react";
import type { DecisionGuideData } from "@/lib/format";

/**
 * 결정 도우미 — 비교 후 최종 선택이 사용자의 우선순위(트레이드오프)에서 갈릴 때,
 * 결정 기준 질문 + 선택지를 칩으로 제시. 클릭하면 그 우선순위로 최종 추천을 요청한다.
 */
export function DecisionGuide({
  data,
  onPick,
}: {
  data: DecisionGuideData;
  onPick: (text: string) => void;
}) {
  if (!data?.options?.length) return null;
  return (
    <div className="rounded-2xl rounded-bl-sm border border-brand-400/20 bg-brand-500/[0.06] px-4 py-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-brand-300">
        <GitBranch className="h-3.5 w-3.5" />
        결정 도우미
      </div>
      <p className="mb-2.5 text-sm text-white/85">{data.question}</p>
      <div className="grid gap-1.5">
        {data.options.map((o, i) => (
          <button
            key={`${i}-${o.productId}`}
            onClick={() =>
              onPick(
                `${o.label} 쪽이에요. 그럼 ${o.productName}(으)로 정하고, 제 상황에 맞는 최종 이유와 주의점만 정리해줘`
              )
            }
            className="group flex flex-col gap-0.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:border-brand-400/40 hover:bg-white/[0.06]"
          >
            <span className="text-sm font-medium text-white/90">{o.label}</span>
            <span className="text-xs text-white/50">
              → {o.productName} · {o.reason}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
