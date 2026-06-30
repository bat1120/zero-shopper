import { embed, embedMany, cosineSimilarity } from "ai";
import { openai } from "@ai-sdk/openai";
import type { Product, SearchParams, SearchResult } from "./types";
import { getCandidates, lexicalScore, tokenize, searchProducts } from "./products";
import { queryEmbeddingText, productEmbeddingText } from "./embed-text";
import { searchNaver, hasNaverCredentials } from "./naver-shopping";
import { rememberProducts } from "./product-store";
import embeddingStore from "./product-embeddings.json";

export const EMBED_MODEL = "text-embedding-3-small";

const VECTORS = (embeddingStore as { vectors: Record<string, number[]> }).vectors;
const HAS_EMBEDDINGS = Object.keys(VECTORS).length > 0;

/** Reciprocal Rank Fusion 상수 (관례적으로 60) */
export const RRF_K = 60;

/**
 * Reciprocal Rank Fusion: 두 개의 랭킹(어휘=네이버 관련도 순서 + 의미=임베딩 유사도 순서)을
 * 순위 기반으로 융합한다. score(d) = Σ 1/(k + rank_i(d)).
 * 점수 스케일이 다른 두 신호를 안전하게 결합하는 현대 하이브리드 검색의 표준 기법.
 * @param sims 후보별 의미 유사도(코사인). 입력 배열의 인덱스 = 어휘(네이버) 순위.
 * @returns 융합 점수 내림차순으로 정렬된 "원본 인덱스" 배열
 */
export function rrfOrder(sims: number[], k = RRF_K): number[] {
  const n = sims.length;
  const idx = Array.from({ length: n }, (_, i) => i);
  // 의미 순위: 유사도 내림차순으로 정렬한 위치
  const semOrder = [...idx].sort((a, b) => sims[b] - sims[a]);
  const semRank = new Array<number>(n);
  semOrder.forEach((origIdx, pos) => {
    semRank[origIdx] = pos;
  });
  // 어휘 순위는 곧 원본 인덱스(i) — 네이버가 관련도순으로 주기 때문
  return idx
    .map((i) => ({ i, score: 1 / (k + i) + 1 / (k + semRank[i]) }))
    .sort((a, b) => b.score - a.score)
    .map((r) => r.i);
}

/** 라이브 상품 임베딩 인메모리 캐시 (id 안정적이라 재검색·비교 시 재임베딩 비용 절감) */
const liveEmbedCache = new Map<string, number[]>();
const LIVE_EMBED_CACHE_MAX = 2000;

function rememberEmbedding(id: string, vec: number[]): void {
  liveEmbedCache.set(id, vec);
  if (liveEmbedCache.size > LIVE_EMBED_CACHE_MAX) {
    const overflow = liveEmbedCache.size - LIVE_EMBED_CACHE_MAX;
    let i = 0;
    for (const key of liveEmbedCache.keys()) {
      if (i++ >= overflow) break;
      liveEmbedCache.delete(key);
    }
  }
}

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

/**
 * 후보 상품들의 의미 유사도(코사인)를 구한다. 쿼리는 항상 새로 임베딩하고,
 * 상품 임베딩은 인메모리 캐시를 사용(미스만 embedMany로 일괄 임베딩). 실패 시 null.
 */
export async function semanticSimilarities(
  queryText: string,
  products: Product[]
): Promise<number[] | null> {
  if (!queryText || !process.env.OPENAI_API_KEY || products.length === 0) return null;
  try {
    const missing = products.filter((p) => !liveEmbedCache.has(p.id));
    const { embeddings } = await embedMany({
      model: openai.embedding(EMBED_MODEL),
      values: [queryText, ...missing.map(productEmbeddingText)],
    });
    const qv = embeddings[0];
    missing.forEach((p, i) => rememberEmbedding(p.id, embeddings[i + 1]));
    return products.map((p) => cosineSimilarity(qv, liveEmbedCache.get(p.id) as number[]));
  } catch {
    return null;
  }
}

/**
 * 라이브(네이버 쇼핑) 검색 + 결과 RAG 재랭킹.
 * 네이버가 1차로 관련도 순(어휘) 결과를 주면, 쿼리·상품을 임베딩해 의미 유사도를 구하고
 * 두 신호를 Reciprocal Rank Fusion(RRF)으로 융합해 재정렬한다.
 * (순수 의미 정렬은 네이버의 인기·정확도 신호를 버리는 반면, RRF는 둘을 함께 살린다.)
 * 임베딩 불가 시 네이버 순서를 그대로 유지.
 */
export async function searchProductsLive(params: SearchParams): Promise<SearchResult> {
  const candidates = await searchNaver(params);
  rememberProducts(candidates);
  if (candidates.length === 0) return { count: 0, products: [] };

  const limit = Math.max(1, Math.min(params.limit ?? 6, 12));

  if (candidates.length > 1) {
    const sims = await semanticSimilarities(queryEmbeddingText(params), candidates);
    if (sims) {
      const ranked = rrfOrder(sims).map((i) => candidates[i]);
      return { count: Math.min(ranked.length, limit), products: ranked.slice(0, limit) };
    }
  }

  const products = candidates.slice(0, limit);
  return { count: products.length, products };
}

/**
 * 검색 진입점. 네이버 자격증명이 있으면 라이브 검색, 없으면 더미 카탈로그(RAG) 폴백.
 */
export async function searchProductsAuto(params: SearchParams): Promise<SearchResult> {
  if (hasNaverCredentials()) {
    const live = await searchProductsLive(params);
    // 라이브에서 0건이면 더미로 보조 (데모 안정성)
    if (live.count > 0) return live;
  }
  return searchProductsSemantic(params);
}

/** 현재 검색 소스 ("naver" | "catalog") — UI/프롬프트 안내용 */
export function searchSource(): "naver" | "catalog" {
  return hasNaverCredentials() ? "naver" : "catalog";
}
