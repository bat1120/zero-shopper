import { ArrowRight, ExternalLink } from "lucide-react";
import { formatPrice, formatRating, type ProductCardData } from "@/lib/format";

export function ProductCard({
  p,
  onAsk,
}: {
  p: ProductCardData;
  /** 카드를 클릭하면 에이전트에게 보낼 질문을 트리거 (없으면 클릭 불가) */
  onAsk?: (text: string) => void;
}) {
  const clickable = Boolean(onAsk);
  const ask = () => onAsk?.(`'${p.name}' 더 자세히 알려줘`);

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? ask : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                ask();
              }
            }
          : undefined
      }
      className={
        "group relative flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-brand-400/40 hover:bg-white/[0.06]" +
        (clickable ? " cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400/50" : "")
      }
    >
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-600/30 to-brand-400/10 text-2xl">
        {/* 이모지 베이스 — 이미지가 없거나 로드 실패 시 그대로 노출 */}
        <span aria-hidden>{p.emoji ?? "🛍️"}</span>
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imageUrl}
            alt={p.name}
            loading="lazy"
            onError={(e) => {
              // 죽은 이미지 URL은 깨진 아이콘 대신 이모지 베이스가 보이도록 숨김
              e.currentTarget.style.visibility = "hidden";
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{p.name}</p>
            <p className="truncate text-xs text-white/40">
              {[p.brand, p.category].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-brand-300">{formatPrice(p.price)}</p>
            {typeof p.rating === "number" ? (
              <p className="text-xs text-amber-300/90">{formatRating(p.rating)}</p>
            ) : p.mall ? (
              <p className="truncate text-[11px] text-white/40">{p.mall}</p>
            ) : null}
          </div>
        </div>
        {p.summary ? (
          <p className="mt-1 line-clamp-2 text-xs text-white/60">{p.summary}</p>
        ) : null}
        {p.tags?.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {p.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-medium text-brand-300"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
        {p.link ? (
          <a
            href={p.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand-300 hover:text-brand-200"
          >
            구매 페이지 <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
      {clickable && (
        <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-0.5 text-[10px] text-white/0 transition-colors group-hover:text-brand-300">
          자세히 <ArrowRight className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}

export function ProductCardGrid({
  products,
  onAsk,
}: {
  products: ProductCardData[];
  onAsk?: (text: string) => void;
}) {
  if (!products?.length) {
    return (
      <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
        조건에 맞는 상품을 찾지 못했어요.
      </p>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {products.map((p) => (
        <ProductCard key={p.id} p={p} onAsk={onAsk} />
      ))}
    </div>
  );
}
