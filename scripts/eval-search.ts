/**
 * 검색 랭킹 품질 평가 하네스.
 * 라벨링된 쿼리 세트에 대해 세 가지 전략의 Top-1 / Recall@3 / MRR 을 측정한다.
 *   1) lexical-baseline : 초기 버전(동의어·태그가중 없음)
 *   2) lexical-enhanced : 현재 어휘 버전(동의어 + 태그가중)
 *   3) rag-hybrid       : 의미(임베딩) + 어휘 하이브리드
 * 실행: OPENAI_API_KEY=... npx tsx scripts/eval-search.ts
 */
import type { SearchParams } from "../lib/types";
import { searchProducts } from "../lib/products";
import { searchProductsSemantic } from "../lib/semantic-search";
import embeddingStore from "../lib/product-embeddings.json";

// ③ RAG 경로가 실제로 임베딩을 썼는지. 키/임베딩이 없으면 searchProductsSemantic은
// 어휘 검색으로 폴백하므로, 그 수치를 'RAG 성능'으로 보고하면 안 된다(정직성 가드).
const HAS_EMB =
  Object.keys((embeddingStore as { vectors: Record<string, number[]> }).vectors).length > 0;
const RAG_ACTIVE = HAS_EMB && Boolean(process.env.OPENAI_API_KEY);

interface EvalItem {
  intent: string;
  params: SearchParams;
  expectedId: string;
}

// 각 쿼리는 "이상적인 1순위 상품"을 라벨로 가진다. params 는 LLM이 추출했을 법한 구조화 필드.
const EVAL: EvalItem[] = [
  { intent: "사무실에서 조용히 쓸 기계식 키보드", params: { query: "사무실에서 조용히 쓸 기계식 키보드", category: "키보드", keywords: "조용한 기계식", useCase: "사무실" }, expectedId: "kb-02" },
  { intent: "타이핑 손맛 좋은 텐키리스 기계식 키보드", params: { query: "타이핑 손맛 좋은 텐키리스 기계식 키보드", category: "키보드", keywords: "타건감 텐키리스" }, expectedId: "kb-01" },
  { intent: "게임용 RGB 기계식 키보드", params: { query: "게임용 화려한 RGB 기계식 키보드", category: "키보드", keywords: "게이밍 RGB" }, expectedId: "kb-03" },
  { intent: "게임용 고성능 노트북", params: { query: "고사양 게임용 노트북", category: "노트북", keywords: "게이밍 고성능" }, expectedId: "lt-04" },
  { intent: "영상편집용 고성능 노트북", params: { query: "영상편집 잘 되는 고성능 노트북", category: "노트북", keywords: "영상편집 고성능", useCase: "영상편집" }, expectedId: "lt-02" },
  { intent: "가볍고 저렴한 대학생 노트북", params: { query: "가볍고 저렴한 대학생용 노트북", category: "노트북", keywords: "가벼운 가성비", useCase: "대학생", maxPrice: 1000000 }, expectedId: "lt-05" },
  { intent: "운동할 때 안 빠지는 무선이어폰", params: { query: "운동할 때 귀에서 안 빠지는 방수 무선이어폰", category: "무선이어폰", keywords: "운동 방수", useCase: "운동" }, expectedId: "eb-03" },
  { intent: "지하철 출퇴근용 노이즈캔슬링 이어폰", params: { query: "지하철 출퇴근에 쓸 강력한 노이즈캔슬링 무선이어폰", category: "무선이어폰", keywords: "노이즈캔슬링", useCase: "출퇴근" }, expectedId: "eb-01" },
  { intent: "가성비 좋은 입문용 무선이어폰", params: { query: "저렴한 입문용 무선이어폰", category: "무선이어폰", keywords: "가성비 입문" }, expectedId: "eb-02" },
  { intent: "음질 좋은 고해상도 무선이어폰", params: { query: "음질 좋은 고해상도 무선이어폰", category: "무선이어폰", keywords: "음질 고해상도" }, expectedId: "eb-04" },
  { intent: "비행기에서 쓸 최고급 노이즈캔슬링 헤드폰", params: { query: "비행기에서 쓸 최상급 노이즈캔슬링 헤드폰", category: "헤드폰", keywords: "노이즈캔슬링 프리미엄", useCase: "출장" }, expectedId: "hp-01" },
  { intent: "음악 작업용 유선 모니터링 헤드폰", params: { query: "정확한 사운드의 유선 모니터링 헤드폰", category: "헤드폰", keywords: "유선 모니터링 음질" }, expectedId: "hp-03" },
  { intent: "캠핑 입문 가벼운 2인 텐트", params: { query: "캠핑 처음인데 가벼운 2인용 입문 텐트", category: "캠핑텐트", keywords: "입문 경량 2인", useCase: "캠핑" }, expectedId: "tt-01" },
  { intent: "가족 오토캠핑용 넓은 텐트", params: { query: "가족이 함께 쓸 넓은 거실형 오토캠핑 텐트", category: "캠핑텐트", keywords: "가족 넓은", useCase: "오토캠핑" }, expectedId: "tt-02" },
  { intent: "백패킹용 초경량 1인 텐트", params: { query: "등산 백패킹용 초경량 1인 텐트", category: "캠핑텐트", keywords: "초경량 1인 백패킹", useCase: "백패킹" }, expectedId: "tt-03" },
  { intent: "겨울 동계 캠핑용 튼튼한 텐트", params: { query: "겨울 동계 캠핑에도 견디는 튼튼한 사계절 텐트", category: "캠핑텐트", keywords: "사계절 내구성 동계" }, expectedId: "tt-04" },
  { intent: "무릎 안 좋은 달리기 입문 러닝화", params: { query: "무릎이 안 좋은데 달리기 입문용 쿠션 러닝화", category: "러닝화", keywords: "입문 쿠션", useCase: "조깅" }, expectedId: "rn-01" },
  { intent: "마라톤 기록 단축용 러닝화", params: { query: "마라톤 대회 기록 단축용 카본 러닝화", category: "러닝화", keywords: "대회 카본 고반발", useCase: "마라톤" }, expectedId: "rn-02" },
  { intent: "산길 트레일 러닝화", params: { query: "비포장 산길 트레일 러닝화", category: "러닝화", keywords: "트레일 접지력", useCase: "트레일러닝" }, expectedId: "rn-03" },
  { intent: "반려동물 털 청소 로봇청소기", params: { query: "강아지 털 잘 치우는 로봇청소기", category: "로봇청소기", keywords: "반려동물 강력흡입", useCase: "반려동물" }, expectedId: "rc-03" },
  { intent: "원룸 자취 가성비 로봇청소기", params: { query: "원룸 자취생용 가성비 로봇청소기", category: "로봇청소기", keywords: "가성비 원룸", useCase: "원룸" }, expectedId: "rc-02" },
  { intent: "홈카페 에스프레소 라떼 머신", params: { query: "홈카페에서 에스프레소랑 라떼 내리는 머신", category: "커피머신", keywords: "에스프레소 홈카페", useCase: "홈카페" }, expectedId: "cf-01" },
  { intent: "사무실 간편 캡슐 커피머신", params: { query: "사무실에서 버튼 한 번으로 간편한 캡슐 커피머신", category: "커피머신", keywords: "캡슐 간편", useCase: "사무실" }, expectedId: "cf-02" },
  { intent: "디자인 작업용 4K 모니터", params: { query: "디자인 작업용 색 정확한 4K 모니터", category: "모니터", keywords: "4K 고해상도", useCase: "디자인" }, expectedId: "mn-01" },
  { intent: "FPS 게임용 고주사율 모니터", params: { query: "FPS 게임용 240Hz 고주사율 모니터", category: "모니터", keywords: "게이밍 고주사율", useCase: "게임" }, expectedId: "mn-02" },
];

function rankOf(products: { id: string }[], expectedId: string): number {
  const i = products.findIndex((p) => p.id === expectedId);
  return i < 0 ? 0 : i + 1; // 0 = 미발견
}

interface Metrics {
  top1: number;
  recall3: number;
  mrr: number;
  ranks: number[];
}
function metrics(ranks: number[]): Metrics {
  const n = ranks.length;
  const top1 = ranks.filter((r) => r === 1).length / n;
  const recall3 = ranks.filter((r) => r >= 1 && r <= 3).length / n;
  const mrr = ranks.reduce((s, r) => s + (r >= 1 ? 1 / r : 0), 0) / n;
  return { top1, recall3, mrr, ranks };
}
const pct = (x: number) => (x * 100).toFixed(1) + "%";

async function main() {
  const baseRanks: number[] = [];
  const enhRanks: number[] = [];
  const ragRanks: number[] = [];

  for (const item of EVAL) {
    const p12 = { ...item.params, limit: 12 };
    const base = searchProducts(p12, { lexicalMode: "baseline" });
    const enh = searchProducts(p12, { lexicalMode: "enhanced" });
    const rag = await searchProductsSemantic(p12);
    baseRanks.push(rankOf(base.products, item.expectedId));
    enhRanks.push(rankOf(enh.products, item.expectedId));
    ragRanks.push(rankOf(rag.products, item.expectedId));
  }

  const b = metrics(baseRanks);
  const e = metrics(enhRanks);
  const r = metrics(ragRanks);

  if (!RAG_ACTIVE) {
    console.warn(
      "\n⚠️  OPENAI_API_KEY 또는 임베딩이 없어 ③ RAG 경로가 '어휘 폴백'으로 실행됐습니다."
    );
    console.warn(
      "   아래 ③ 행은 RAG가 아니라 ②와 동일한 어휘 폴백 수치이니 RAG 성능으로 해석하지 마세요.\n"
    );
  }
  const ragLabel = RAG_ACTIVE
    ? "③ RAG 하이브리드(의미+어휘)"
    : "③ RAG(폴백→어휘, 키/임베딩 없음)";

  console.log(`\n평가 쿼리 수: ${EVAL.length}`);
  console.log(
    `SEM_W=${process.env.SEARCH_SEM_WEIGHT ?? "0.45(기본, dev셋 튜닝 = in-sample)"}\n`
  );
  console.log("| 전략 | Top-1 정확도 | Recall@3 | MRR |");
  console.log("| --- | --- | --- | --- |");
  console.log(`| ① 어휘(초기) | ${pct(b.top1)} | ${pct(b.recall3)} | ${b.mrr.toFixed(3)} |`);
  console.log(`| ② 어휘(개선: 동의어+태그가중) | ${pct(e.top1)} | ${pct(e.recall3)} | ${e.mrr.toFixed(3)} |`);
  console.log(`| ${ragLabel} | ${pct(r.top1)} | ${pct(r.recall3)} | ${r.mrr.toFixed(3)} |`);

  // 전략별로 Top-1을 못 맞춘 쿼리 표시
  const fails = (ranks: number[]) =>
    EVAL.filter((_, i) => ranks[i] !== 1).map((it, idx) => `${it.intent}(rank ${ranks[EVAL.indexOf(it)]})`);
  console.log("\n[① 초기 어휘 Top-1 실패]\n - " + fails(baseRanks).join("\n - "));
  console.log("\n[③ RAG Top-1 실패]\n - " + (fails(ragRanks).join("\n - ") || "없음"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
