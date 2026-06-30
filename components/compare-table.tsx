import { formatPrice, formatRating, type CompareItem } from "@/lib/format";

export function CompareTable({ items }: { items: CompareItem[] }) {
  if (!items?.length) return null;

  // 모든 상품의 스펙 키를 합집합으로 모아 행을 구성
  const specKeys = Array.from(
    items.reduce((set, it) => {
      Object.keys(it.specs ?? {}).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  // 라이브 상품은 평점/장단점/판매처 유무가 다르므로, 데이터가 있는 행만 노출
  const hasRating = items.some((it) => typeof it.rating === "number");
  const hasMall = items.some((it) => Boolean(it.mall));
  const hasPros = items.some((it) => it.pros?.length);
  const hasCons = items.some((it) => it.cons?.length);

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-white/10">
            <th className="sticky left-0 bg-[#12121c] px-3 py-2 font-medium text-white/40">
              비교 항목
            </th>
            {items.map((it) => (
              <th key={it.id} className="min-w-[130px] px-3 py-2 font-semibold text-white">
                {it.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-white/5">
            <td className="sticky left-0 bg-[#12121c] px-3 py-2 text-white/40">가격</td>
            {items.map((it) => (
              <td key={it.id} className="px-3 py-2 font-semibold text-brand-300">
                {formatPrice(it.price)}
              </td>
            ))}
          </tr>
          {hasRating && (
            <tr className="border-b border-white/5">
              <td className="sticky left-0 bg-[#12121c] px-3 py-2 text-white/40">평점</td>
              {items.map((it) => (
                <td key={it.id} className="px-3 py-2 text-amber-300/90">
                  {typeof it.rating === "number" ? formatRating(it.rating) : "-"}
                </td>
              ))}
            </tr>
          )}
          {hasMall && (
            <tr className="border-b border-white/5">
              <td className="sticky left-0 bg-[#12121c] px-3 py-2 text-white/40">판매처</td>
              {items.map((it) => (
                <td key={it.id} className="px-3 py-2 text-white/80">
                  {it.mall ?? "-"}
                </td>
              ))}
            </tr>
          )}
          {specKeys.map((key) => (
            <tr key={key} className="border-b border-white/5">
              <td className="sticky left-0 bg-[#12121c] px-3 py-2 text-white/40">{key}</td>
              {items.map((it) => (
                <td key={it.id} className="px-3 py-2 text-white/80">
                  {it.specs?.[key] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
          {hasPros && (
            <tr className="border-b border-white/5 align-top">
              <td className="sticky left-0 bg-[#12121c] px-3 py-2 text-white/40">장점</td>
              {items.map((it) => (
                <td key={it.id} className="px-3 py-2 text-emerald-300/80">
                  {it.pros?.map((x) => (
                    <div key={x}>+ {x}</div>
                  ))}
                </td>
              ))}
            </tr>
          )}
          {hasCons && (
            <tr className="align-top">
              <td className="sticky left-0 bg-[#12121c] px-3 py-2 text-white/40">단점</td>
              {items.map((it) => (
                <td key={it.id} className="px-3 py-2 text-rose-300/80">
                  {it.cons?.map((x) => (
                    <div key={x}>- {x}</div>
                  ))}
                </td>
              ))}
            </tr>
          )}
          {items.some((it) => it.link) && (
            <tr className="align-top">
              <td className="sticky left-0 bg-[#12121c] px-3 py-2 text-white/40">링크</td>
              {items.map((it) => (
                <td key={it.id} className="px-3 py-2">
                  {it.link ? (
                    <a
                      href={it.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-300 hover:text-brand-200"
                    >
                      구매 페이지
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
