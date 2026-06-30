import type { Product, SearchParams } from "./types";

/**
 * 상품을 임베딩(RAG 색인)하기 위한 텍스트.
 * 의미 검색이 잘 되도록 이름·카테고리·태그·용도·요약·핵심 스펙·장점을 한 문단으로 합친다.
 */
export function productEmbeddingText(p: Product): string {
  const specs = Object.entries(p.specs)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
  return [
    `${p.name} (${p.brand}, ${p.category})`,
    p.summary,
    `특성: ${p.tags.join(", ")}`,
    `용도: ${p.useCases.join(", ")}`,
    `스펙: ${specs}`,
    `장점: ${p.pros.join(", ")}`,
  ].join(". ");
}

/**
 * 검색 쿼리를 임베딩하기 위한 텍스트.
 * 사용자의 자연어 의도(query)가 있으면 그것을 우선 사용하고, 없으면 구조화 필드를 조합한다.
 */
export function queryEmbeddingText(params: SearchParams): string {
  if (params.query && params.query.trim()) return params.query.trim();
  return [params.keywords, params.useCase, params.category]
    .filter(Boolean)
    .join(" ")
    .trim();
}
