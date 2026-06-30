/**
 * 상품 카탈로그를 임베딩해 lib/product-embeddings.json 으로 저장하는 빌드 스크립트.
 * 실행: OPENAI_API_KEY=... npx tsx scripts/build-embeddings.ts
 * (런타임에는 쿼리만 임베딩하므로, 상품 벡터는 이렇게 미리 만들어 커밋해 둔다.)
 */
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PRODUCTS } from "../lib/products";
import { productEmbeddingText } from "../lib/embed-text";

const MODEL = "text-embedding-3-small";

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY 환경변수가 필요합니다.");
  }
  const texts = PRODUCTS.map(productEmbeddingText);
  console.log(`임베딩 생성 중: ${texts.length}개 상품 (${MODEL})...`);

  const { embeddings } = await embedMany({
    model: openai.embedding(MODEL),
    values: texts,
  });

  const vectors: Record<string, number[]> = {};
  PRODUCTS.forEach((p, i) => {
    // 파일 크기 절약을 위해 소수점 6자리로 반올림
    vectors[p.id] = embeddings[i].map((x) => Math.round(x * 1e6) / 1e6);
  });

  const out = {
    model: MODEL,
    dim: embeddings[0]?.length ?? 0,
    count: PRODUCTS.length,
    vectors,
  };
  const path = resolve(__dirname, "../lib/product-embeddings.json");
  writeFileSync(path, JSON.stringify(out));
  console.log(`완료: ${path} (dim=${out.dim}, count=${out.count})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
