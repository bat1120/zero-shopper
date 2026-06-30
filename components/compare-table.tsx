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
          <tr className="border-b border-white/5">
            <td className="sticky left-0 bg-[#12121c] px-3 py-2 text-white/40">평점</td>
            {items.map((it) => (
              <td key={it.id} className="px-3 py-2 text-amber-300/90">
                {formatRating(it.rating)}
              </td>
            ))}
          </tr>
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
        </tbody>
      </table>
    </div>
  );
}
