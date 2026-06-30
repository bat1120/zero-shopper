import React from "react";

/**
 * 의존성 없는 초경량 마크다운 렌더러.
 * 에이전트 답변에서 흔히 쓰는 **굵게**, [라벨](링크), 맨URL,
 * 줄바꿈, "- " / "• " 불릿 정도만 처리한다.
 */
const LinkChip = ({ href, label }: { href: string; label: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="break-all font-medium text-brand-300 underline decoration-brand-300/40 underline-offset-2 hover:text-brand-200"
  >
    {label}
  </a>
);

// **굵게** | [라벨](http…) | 맨 http… URL  (셋 중 하나 매칭)
const INLINE_RE =
  /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>)]+)/g;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      // **굵게**
      nodes.push(
        <strong key={`${keyPrefix}-b${i++}`} className="font-semibold text-white">
          {m[1]}
        </strong>
      );
    } else if (m[3] !== undefined) {
      // [라벨](URL) — 라벨을 클릭 가능한 링크로, 긴 URL은 숨김
      nodes.push(<LinkChip key={`${keyPrefix}-l${i++}`} href={m[3]} label={m[2]} />);
    } else if (m[4] !== undefined) {
      // 맨 URL — 통째로 노출하면 말풍선을 넘치므로 "바로가기 ↗" 칩으로 축약
      nodes.push(<LinkChip key={`${keyPrefix}-u${i++}`} href={m[4]} label="바로가기 ↗" />);
    }
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

  return (
    <div className="space-y-1 break-words text-sm text-white/85">{blocks}</div>
  );
}
