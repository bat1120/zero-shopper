import { openai } from "@ai-sdk/openai";
import {
  streamText,
  tool,
  stepCountIs,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  searchProducts,
  compareProducts,
  getProduct,
  listCategories,
} from "@/lib/products";

// 스트리밍 응답을 위해 Edge 대신 Node 런타임 사용, 최대 실행 시간 여유 확보
export const runtime = "nodejs";
export const maxDuration = 30;

// 환경변수로 모델 교체 가능 (기본값은 tool calling을 안정적으로 지원하는 경량 모델)
const MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1-mini";

const SYSTEM_PROMPT = `당신은 "제로쇼퍼(ZeroShopper)"라는 이름의 한국어 AI 쇼핑 큐레이션 에이전트입니다.
사용자가 자연어로 처한 "상황"을 말하면, 그 맥락을 해석해 우리 카탈로그 안에서 가장 알맞은 상품을 찾아 비교하고 추천합니다.

[취급 카테고리]
${listCategories().join(", ")}

[행동 원칙]
1. 거의 항상 먼저 search_products를 호출하세요. 사용자 메시지에 위 카테고리 이름(노트북, 무선이어폰, 헤드폰, 캠핑텐트, 러닝화, 로봇청소기, 커피머신, 모니터, 키보드 등)이나 상품 용도가 언급되면, 그것이 곧 카테고리 단서이므로 **묻지 말고 즉시 search_products를 호출**하세요.
   - "카테고리를 알 수 없다", "무엇을 찾는지 모르겠다"고 되묻는 것은 금지입니다. 카테고리 이름이 문장에 있으면 그게 카테고리입니다.
   - 예) "5만 원으로 노트북 살 수 있어?" → search_products(category="노트북", maxPrice=50000) 호출. (결과가 없으면 솔직히 안내)
   - 예) "원룸 자취생인데 로봇청소기 들이고 싶어" → search_products(category="로봇청소기", useCase="원룸") 호출.
   - 예) "캠핑 처음인데 10만 원으로 2인 텐트" → search_products(category="캠핑텐트", maxPrice=100000, useCase="캠핑") 호출.
   - 예산이 없으면 maxPrice를 비우고 호출하면 됩니다. 부족한 조건은 합리적으로 가정하세요.
   - 되묻기는 카테고리조차 전혀 가늠할 수 없을 때(예: "뭐 살 거 없나?")만, 딱 1가지를 짧게 물으세요.
2. 추천은 반드시 search_products로 찾은 실제 카탈로그 상품만 사용하세요. 카탈로그에 없는 상품을 지어내지 마세요.
3. 비교는 텍스트로만 하지 말고 도구로 하세요. 사용자가 "비교"를 요청했거나, 최종 추천 후보가 2개 이상이라면 **반드시 compare_products 도구를 호출**해 비교표를 띄운 뒤 추천하세요. (compare_products의 productIds에는 search_products 결과의 id를 넣습니다.)
4. 최종 답변은 한국어로 간결하게:
   - 추천 1~2개를 고르고, "왜 이 상황에 적합한지"를 사용자의 상황·예산·용도와 연결해 설명하세요.
   - 가격은 원(₩) 단위로 표기하고, 트레이드오프(장단점)를 솔직하게 알려주세요.
   - 상품 카드와 비교표는 화면에 따로 렌더링되므로, 텍스트에서 모든 스펙을 장황하게 나열하지 말고 "판단의 근거"에 집중하세요.
5. 답변 톤은 친근하고 신뢰감 있게. 과장 광고처럼 말하지 말고, 솔직한 조언자처럼 말하세요.

[한국어 금액 단위 — 매우 중요]
- "N만 원" = N × 10,000원. 예: "10만 원" = 100,000원, "100만 원" = 1,000,000원, "30만 원" = 300,000원.
- "N천 원" = N × 1,000원. 도구의 minPrice/maxPrice에는 이렇게 환산한 "원 단위" 정수를 넣으세요. (예: "100만 원 이하" → maxPrice=1000000)

[검색 결과가 비었을 때]
- search_products가 0건을 반환하면 엉뚱한 카테고리를 추천하지 말고, "해당 예산/조건에는 OO이(가) 없다"고 솔직히 말한 뒤, 예산을 얼마로 올리면 선택지가 생기는지 제안하세요.`;

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "OPENAI_API_KEY가 설정되지 않았습니다. 프로젝트 루트에 .env.local 파일을 만들고 OPENAI_API_KEY=sk-... 를 추가하세요.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai(MODEL),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    // 도구 호출 → 결과 반영 → 추가 도구 호출 또는 최종 답변까지 멀티스텝 루프 허용
    stopWhen: stepCountIs(6),
    tools: {
      search_products: tool({
        description:
          "사용자의 상황/예산/용도에 맞는 상품 후보를 카탈로그에서 검색한다. 추천 전에 반드시 먼저 호출한다.",
        inputSchema: z.object({
          keywords: z
            .string()
            .optional()
            .describe("자유 키워드. 상품명/태그/용도/요약에서 매칭 (예: '가벼운 노트북', '노이즈캔슬링')"),
          category: z
            .string()
            .optional()
            .describe(`카테고리 부분 일치. 가능한 값 예: ${listCategories().join(", ")}`),
          minPrice: z.number().optional().describe("최소 가격(원)"),
          maxPrice: z.number().optional().describe("최대 가격(원). 예산 상한이 있으면 반드시 채운다."),
          useCase: z
            .string()
            .optional()
            .describe("사용 상황/용도 (예: '캠핑', '재택근무', '운동', '대학생')"),
          sortBy: z
            .enum(["relevance", "price_asc", "price_desc", "rating"])
            .optional()
            .describe("정렬 기준. 기본 relevance, 저렴한 순은 price_asc, 평점순은 rating"),
          limit: z.number().optional().describe("최대 결과 개수 (기본 6)"),
        }),
        execute: async (params) => {
          const { count, products } = searchProducts(params);
          // 토큰 절약을 위해 LLM에는 핵심 필드만 전달 (UI는 별도 output 전체를 사용)
          return {
            count,
            products: products.map((p) => ({
              id: p.id,
              name: p.name,
              brand: p.brand,
              category: p.category,
              price: p.price,
              rating: p.rating,
              emoji: p.emoji,
              tags: p.tags,
              useCases: p.useCases,
              summary: p.summary,
            })),
          };
        },
      }),

      compare_products: tool({
        description:
          "여러 상품을 ID로 받아 핵심 스펙/장단점을 비교한다. 후보가 2개 이상이고 비교가 의사결정에 도움될 때 호출한다.",
        inputSchema: z.object({
          productIds: z
            .array(z.string())
            .min(2)
            .describe("비교할 상품 ID 목록 (search_products 결과의 id 사용). 최소 2개."),
        }),
        execute: async ({ productIds }) => {
          const products = compareProducts(productIds);
          return {
            count: products.length,
            products: products.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              rating: p.rating,
              specs: p.specs,
              pros: p.pros,
              cons: p.cons,
            })),
          };
        },
      }),

      get_product_detail: tool({
        description: "특정 상품 1개의 상세 정보(스펙/장단점/리뷰 수)를 가져온다.",
        inputSchema: z.object({
          productId: z.string().describe("상세를 볼 상품 ID"),
        }),
        execute: async ({ productId }) => {
          const p = getProduct(productId);
          if (!p) return { found: false as const, productId };
          return { found: true as const, product: p };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
