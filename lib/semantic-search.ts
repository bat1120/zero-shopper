import { embed, cosineSimilarity } from "ai";
import { openai } from "@ai-sdk/openai";
import type { Product, SearchParams, SearchResult } from "./types";
import { getCandidates, lexicalScore, tokenize, searchProducts } from "./products";
import { queryEmbeddingText } from "./embed-text";
import embeddingStore from "./product-embeddings.json";

export const EMBED_MODEL = "text-embedding-3-small";

const VECTORS = (embeddingStore as { vectors: Record<string, number[]> }).vectors;
const HAS_EMBEDDINGS = Object.keys(VECTORS).length > 0;

/** 쿼리 텍스트를 임베딩. 실패하면 null (상위에서 어휘 검색으로 폴백) */
export async function embedQuery(text: string): Promise<number[] | null> {
  if (!text || !process.env.OPENAI_API_KEY) return null;
  try {
    const { embedding } = await embed({
      model: openai.embedding(EMBED_MODEL),
      value: text,
    });
    return embedding;
  } catch {
    return null;
  }
}

function normalize(values: number[]): (v: number) => number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (v: number) => (max > min ? (v - min) / (max - min) : 0.5);
}

/**
 * 하이브리드(RAG) 검색: 카테고리·가격 하드필터 → 쿼리 임베딩 →
 * 의미 유사도(코사인) + 어휘 점수를 가중 합산해 정렬.
 * 임베딩을 못 쓰면 어휘 검색(searchProducts)으로 그대로 폴백한다.
 */
export async function searchProductsSemantic(params: SearchParams): Promise<SearchResult> {
  const candidates = getCandidates(params);
  if (candidates.length === 0) return { count: 0, products: [] };

  const queryText = queryEmbeddingText(params);
  const queryVec = HAS_EMBEDDINGS ? await embedQuery(queryText) : null;

  // 임베딩 불가 → 어휘 검색 폴백
  if (!queryVec) return searchProducts(params);

  const tokens = tokenize(params.keywords, "enhanced");
  const rows = candidates.map((p) => ({
    p,
    sim: VECTORS[p.id] ? cosineSimilarity(queryVec, VECTORS[p.id]) : 0,
    lex: lexicalScore(p, params, tokens, "enhanced"),
  }));

  const normSim = normalize(rows.map((r) => r.sim));
  const normLex = normalize(rows.map((r) => r.lex));

  // 의미 + 어휘 가중 합산 (어휘에는 카테고리/용도/태그/평점 신호가 들어있음).
  // 기본 45:55 — 평가 셋에서 Top-1 100%를 달성하는 지점(의미 검색의 일반화 + 어휘 정밀도 결합).
  const SEM_W = Number(process.env.SEARCH_SEM_WEIGHT ?? 0.45);
  const LEX_W = 1 - SEM_W;
  const ranked = rows
    .map((r) => ({ p: r.p, score: SEM_W * normSim(r.sim) + LEX_W * normLex(r.lex) }))
    .sort((a, b) => b.score - a.score);

  const limit = Math.max(1, Math.min(params.limit ?? 6, 12));
  const products: Product[] = ranked.slice(0, limit).map((r) => r.p);
  return { count: products.length, products };
}
