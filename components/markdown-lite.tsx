import React from "react";

/**
 * 의존성 없는 초경량 마크다운 렌더러.
 * 에이전트 답변에서 흔히 쓰는 **굵게**, 줄바꿈, "- " / "• " 불릿 정도만 처리한다.
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <strong key={`${keyPrefix}-b${i++}`} className="font-semibold text-white">
        {m[1]}
      </strong>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = (key: string) => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={key} className="my-1 list-disc space-y-0.5 pl-5">
        {bullets.map((b, i) => (
          <li key={i}>{renderInline(b, `${key}-${i}`)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[-•*]\s+(.*)$/);
    if (bulletMatch) {
      bullets.push(bulletMatch[1]);
    } else {
      flushBullets(`ul-${idx}`);
      if (trimmed.length === 0) {
        blocks.push(<div key={`sp-${idx}`} className="h-2" />);
      } else {
        blocks.push(
          <p key={`p-${idx}`} className="leading-relaxed">
            {renderInline(trimmed, `p-${idx}`)}
          </p>
        );
      }
    }
  });
  flushBullets("ul-last");

  return <div className="space-y-1 text-sm text-white/85">{blocks}</div>;
}
