/**
 * 라이브(네이버 쇼핑) 검색 경로 평가 하네스 — LLM-as-judge 방식.
 *
 * 라이브 결과는 실시간 실제 상품이라 고정 정답(label)을 만들 수 없다. 그래서
 * 각 상황 쿼리에 대해 네이버 후보를 한 번 가져온 뒤, LLM 심판이 각 후보의
 * "상황 적합도"를 0~3으로 채점하고(RAGAS류 relevance grading), 그 채점을 정답으로
 * 세 가지 정렬 전략의 랭킹 품질을 비교한다.
 *   A) 네이버 관련도순 (재랭킹 없음, 베이스라인)
 *   B) 순수 의미 재랭킹 (임베딩 코사인 정렬)
 *   C) RRF 하이브리드 (네이버 순위 + 의미 순위 융합)  ← 현재 프로덕션
 *
 * 지표: nDCG@5(등급 활용), Precision@3(적합=등급≥2), MRR(첫 적합 상품 순위).
 *
 * 실행: npx tsx scripts/eval-live.ts   (.env.local 자동 로드)
 * 주의: 네이버 데이터는 시점에 따라 바뀌므로 절대 수치보다 "전략 간 상대 비교"가 핵심.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { SearchParams, Product } from "../lib/types";
import { searchNaver, hasNaverCredentials } from "../lib/naver-shopping";
import { semanticSimilarities, rrfOrder } from "../lib/semantic-search";
import { queryEmbeddingText } from "../lib/embed-text";

// --- .env.local 로더 (tsx는 자동 로드하지 않음) ---
function loadEnvLocal(): void {
  try {
    const text = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* 파일 없으면 환경변수 그대로 사용 */
  }
}
loadEnvLocal();

const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL ?? "gpt-4.1-mini";
const POOL = 18; // 쿼리당 임베딩/평가 대상 후보 상한 (비용 제한)
const JUDGE_TOP = 6; // 각 전략 상위 N개의 합집합만 심판에 보냄

interface EvalItem {
  intent: string;
  params: SearchParams;
}

// 상황 기반 쿼리 — 일부러 더미 카탈로그에 없는 품목(무선청소기·공기청정기·캠핑의자·미러리스 등)도 포함해
// 라이브 검색의 커버리지를 함께 본다.
const EVAL: EvalItem[] = [
  { intent: "캠핑 처음인데 10만 원으로 살 만한 2인 텐트", params: { query: "캠핑 입문 2인용 텐트", category: "텐트", keywords: "2인 입문", maxPrice: 100000 } },
  { intent: "지하철 출퇴근용 노이즈캔슬링 무선이어폰, 30만 원 이하", params: { query: "출퇴근 노이즈캔슬링 무선이어폰", category: "블루투스이어폰", keywords: "노이즈캔슬링", maxPrice: 300000 } },
  { intent: "대학생인데 가볍고 100만 원 안쪽인 노트북", params: { query: "가벼운 대학생 노트북", category: "노트북", keywords: "가벼운", maxPrice: 1000000 } },
  { intent: "원룸 자취생이 쓸 가성비 로봇청소기", params: { query: "원룸 자취 가성비 로봇청소기", category: "로봇청소기", keywords: "원룸 가성비" } },
  { intent: "홈카페용 에스프레소 머신, 20만 원 이하", params: { query: "홈카페 에스프레소 머신", category: "커피머신", keywords: "에스프레소 홈카페", maxPrice: 200000 } },
  { intent: "강아지 털 잘 빨아들이는 무선청소기", params: { query: "반려동물 털 무선청소기", category: "무선청소기", keywords: "반려동물 강력흡입" } },
  { intent: "디자인 작업용 색 정확한 4K 모니터, 40만 원 이하", params: { query: "디자인 작업 4K 모니터", category: "모니터", keywords: "4K 디자인", maxPrice: 400000 } },
  { intent: "유튜브 입문용 가벼운 미러리스 카메라, 100만 원 이하", params: { query: "입문 미러리스 카메라", category: "미러리스카메라", keywords: "입문 가벼운", maxPrice: 1000000 } },
  { intent: "백패킹용 가벼운 캠핑 의자", params: { query: "백패킹 경량 캠핑 의자", category: "캠핑의자", keywords: "경량 백패킹" } },
  { intent: "사무실에서 조용히 쓸 무선 기계식 키보드", params: { query: "사무실 저소음 무선 기계식 키보드", category: "키보드", keywords: "무선 저소음 기계식" } },
  { intent: "무릎이 안 좋은 러닝 입문자용 쿠션 러닝화", params: { query: "입문 쿠션 러닝화", category: "러닝화", keywords: "입문 쿠션" } },
  { intent: "원룸용 작은 공기청정기", params: { query: "원룸 소형 공기청정기", category: "공기청정기", keywords: "원룸 소형" } },
];

const JudgeSchema = z.object({
  grades: z.array(
    z.object({
      index: z.number().int(),
      relevance: z.number().int().min(0).max(3),
    })
  ),
});

async function judge(intent: string, pool: { index: number; p: Product }[]): Promise<Map<number, number>> {
  const list = pool
    .map(
      ({ index, p }) =>
        `${index}. ${p.name} | 카테고리:${p.category} | 가격:${p.price.toLocaleString("ko-KR")}원 | 판매처:${p.mall ?? "-"}`
    )
    .join("\n");

  const { object } = await generateObject({
    model: openai(JUDGE_MODEL),
    schema: JudgeSchema,
    temperature: 0,
    system:
      "당신은 한국어 쇼핑 검색 품질 평가자입니다. 사용자의 '상황'에 각 상품이 얼마나 적합한지 0~3으로 채점하세요. " +
      "3=상황·예산·용도에 매우 적합, 2=적합(올바른 품목, 소소한 미스매치), 1=약하게 관련(주변 품목/액세서리), 0=무관하거나 잘못된 품목. " +
      "상품명·카테고리·가격을 근거로 보수적으로 채점하고, 모든 index에 대해 빠짐없이 등급을 매기세요.",
    prompt: `[사용자 상황]\n${intent}\n\n[후보 상품]\n${list}`,
  });

  const map = new Map<number, number>();
  for (const g of object.grades) map.set(g.index, Math.max(0, Math.min(3, g.relevance)));
  return map;
}

/** 결정적(시드 기반) 0~1 키 — 심판 제시 순서를 재현 가능하게 섞기 위함 (FNV-1a) */
function seededKey(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}

// --- 지표 ---
function dcgAtK(rels: number[], k: number): number {
  let s = 0;
  for (let i = 0; i < Math.min(k, rels.length); i++) s += rels[i] / Math.log2(i + 2);
  return s;
}
function ndcgAtK(orderedRels: number[], allRels: number[], k: number): number {
  const ideal = [...allRels].sort((a, b) => b - a);
  const idcg = dcgAtK(ideal, k);
  return idcg > 0 ? dcgAtK(orderedRels, k) / idcg : 0;
}
function precisionAtK(orderedRels: number[], k: number, thresh = 2): number {
  const top = orderedRels.slice(0, k);
  return top.filter((r) => r >= thresh).length / k;
}
function mrr(orderedRels: number[], thresh = 2): number {
  const i = orderedRels.findIndex((r) => r >= thresh);
  return i < 0 ? 0 : 1 / (i + 1);
}

interface Acc {
  ndcg: number;
  p3: number;
  mrr: number;
}
const pct = (x: number) => (x * 100).toFixed(1) + "%";

async function main() {
  if (!hasNaverCredentials()) throw new Error("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 가 필요합니다.");
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY 가 필요합니다.");

  const strategies = ["네이버 관련도순", "순수 의미 재랭킹", "RRF 하이브리드"] as const;
  const acc: Record<string, Acc> = {};
  for (const s of strategies) acc[s] = { ndcg: 0, p3: 0, mrr: 0 };
  let counted = 0;

  for (const item of EVAL) {
    const candidates = (await searchNaver({ ...item.params, limit: POOL })).slice(0, POOL);
    if (candidates.length < 3) {
      console.log(`· 건너뜀(후보<3): ${item.intent}`);
      continue;
    }
    const sims = await semanticSimilarities(queryEmbeddingText(item.params), candidates);
    if (!sims) throw new Error("임베딩 실패");

    // 세 가지 정렬(원본 인덱스 배열)
    const nativeOrder = candidates.map((_, i) => i);
    const semOrder = [...nativeOrder].sort((a, b) => sims[b] - sims[a]);
    const rrf = rrfOrder(sims);
    const orders: Record<string, number[]> = {
      "네이버 관련도순": nativeOrder,
      "순수 의미 재랭킹": semOrder,
      "RRF 하이브리드": rrf,
    };

    // 세 전략 상위 JUDGE_TOP의 합집합만 채점 (비용 절감, 공정한 풀)
    const poolIdx = Array.from(
      new Set(strategies.flatMap((s) => orders[s].slice(0, JUDGE_TOP)))
    );
    // 제시 순서를 결정적으로 섞는다 — LLM 심판의 위치 편향(앞에 보이는 항목 후한 점수)이
    // 특정 전략(네이버 관련도순) 쪽으로 정답을 기울이지 않도록. rel 매핑은 index 기준이라 안전.
    const shownPool = [...poolIdx].sort(
      (a, b) => seededKey(`${item.intent}:${a}`) - seededKey(`${item.intent}:${b}`)
    );
    const rels = await judge(
      item.intent,
      shownPool.map((index) => ({ index, p: candidates[index] }))
    );
    const relOf = (i: number) => rels.get(i) ?? 0;
    const allRels = poolIdx.map(relOf);

    for (const s of strategies) {
      const orderedRels = orders[s].map(relOf);
      acc[s].ndcg += ndcgAtK(orderedRels, allRels, 5);
      acc[s].p3 += precisionAtK(orderedRels, 3);
      acc[s].mrr += mrr(orderedRels);
    }
    counted++;
    const top = candidates[rrf[0]];
    console.log(`✓ ${item.intent}\n    → RRF 1위: ${top.name} (${top.price.toLocaleString("ko-KR")}원, ${top.mall})`);
  }

  console.log(`\n평가 쿼리 수: ${counted} (심판 모델: ${JUDGE_MODEL})\n`);
  console.log("| 정렬 전략 | nDCG@5 | Precision@3 | MRR |");
  console.log("| --- | --- | --- | --- |");
  for (const s of strategies) {
    const a = acc[s];
    console.log(`| ${s} | ${pct(a.ndcg / counted)} | ${pct(a.p3 / counted)} | ${(a.mrr / counted).toFixed(3)} |`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
