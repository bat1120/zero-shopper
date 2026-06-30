import { openai } from "@ai-sdk/openai";
import {
  streamText,
  tool,
  stepCountIs,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { after } from "next/server";
import { z } from "zod";
import { listCategories } from "@/lib/products";
import { searchProductsAuto, searchSource } from "@/lib/semantic-search";
import { resolveProduct, resolveProducts } from "@/lib/product-store";
import { saveConversation } from "@/lib/conversations";
import {
  getProfile,
  profilePromptBlock,
  updateProfileFromConversation,
  type ProfileRecord,
} from "@/lib/user-profile";

// 스트리밍 응답을 위해 Edge 대신 Node 런타임 사용, 최대 실행 시간 여유 확보
export const runtime = "nodejs";
export const maxDuration = 30;

// 환경변수로 모델 교체 가능 (기본값은 tool calling을 안정적으로 지원하는 경량 모델)
const MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1-mini";

function buildSystemPrompt(profile: ProfileRecord | null): string {
  const live = searchSource() === "naver";
  const sourceLine = live
    ? `상품은 **네이버 쇼핑(실시간)** 에서 검색합니다. 특정 카테고리에 국한되지 않고 사용자가 원하는 거의 모든 상품을 찾을 수 있습니다. (예시 카테고리: ${listCategories().join(", ")} 등)`
    : `상품은 내부 카탈로그에서 검색합니다.

[취급 카테고리]
${listCategories().join(", ")}`;

  const liveNote = live
    ? `
[라이브 데이터 주의]
- 네이버 쇼핑 상품에는 평점·상세 스펙·장단점 데이터가 없을 수 있습니다. 이 경우 가격·판매처·상품명·카테고리와 당신의 일반 지식을 근거로 합리적으로 추천하되, 없는 스펙을 지어내지는 마세요.
- 상품 카드에 실제 이미지와 구매 링크가 함께 표시됩니다.`
    : "";

  return `당신은 "제로쇼퍼(ZeroShopper)"라는 이름의 한국어 AI 쇼핑 큐레이션 에이전트입니다.
사용자가 자연어로 처한 "상황"을 말하면, 그 맥락을 해석해 가장 알맞은 상품을 찾아 비교하고 추천합니다.

${sourceLine}

[행동 원칙]
0. **먼저 "쇼핑 요청인가?"를 판단하세요(게이트).** 사용자 메시지가 상품 구매·추천·비교와 무관하면(시·에세이·코드 작성, 번역, 일반 지식 문답, 잡담 등) **절대 search_products를 호출하지 말고**, 6번에 따라 정중히 거절한 뒤 어떤 상품을 찾는지 물으세요. 상품·용도·구매 의도가 조금이라도 있을 때만 1번으로 진행합니다. (없는 상품 카테고리를 임의로 지어내 검색하는 것은 금지입니다.)
1. 쇼핑 요청이라면, 거의 항상 먼저 search_products를 호출하세요. 사용자 메시지에 상품 종류나 용도가 조금이라도 언급되면 **묻지 말고 즉시 search_products를 호출**하세요.
   - "무엇을 찾는지 모르겠다"고 되묻는 것은 금지입니다. 상품 이름·종류가 문장에 있으면 그게 검색 대상입니다.
   - 예) "5만 원으로 노트북 살 수 있어?" → search_products(query="5만원대 노트북", category="노트북", maxPrice=50000) 호출.
   - 예) "원룸 자취생인데 로봇청소기 들이고 싶어" → search_products(query="원룸 자취생용 로봇청소기", category="로봇청소기", useCase="원룸") 호출.
   - 예산이 없으면 maxPrice를 비우고 호출하면 됩니다. 부족한 조건은 합리적으로 가정하세요.
   - search_products의 query에는 사용자의 문장을 거의 그대로 넣어 의미 기반 검색(RAG)이 잘 되게 하세요. category·maxPrice·useCase는 필터로 함께 채웁니다.
   - 되묻기는 무엇을 찾는지 전혀 가늠할 수 없을 때(예: "뭐 살 거 없나?")만, 딱 1가지를 짧게 물으세요.
2. 추천은 반드시 search_products로 찾은 실제 상품만 사용하세요. 검색에 없는 상품을 지어내지 마세요.
3. 비교는 텍스트로만 하지 말고 도구로 하세요. 사용자가 "비교"를 요청했거나, 최종 추천 후보가 2개 이상이라면 **반드시 compare_products 도구를 호출**해 비교표를 띄운 뒤 추천하세요. (compare_products의 productIds에는 search_products 결과의 id를 넣습니다.)
4. 최종 답변은 한국어로 간결하게:
   - 추천 1~2개를 고르고, "왜 이 상황에 적합한지"를 사용자의 상황·예산·용도와 연결해 설명하세요.
   - 가격은 원(₩) 단위로 표기하고, 트레이드오프를 솔직하게 알려주세요.
   - 상품 카드와 비교표는 화면에 따로 렌더링되므로, 텍스트에서 장황하게 나열하지 말고 "판단의 근거"에 집중하세요.
5. 답변 톤은 친근하고 신뢰감 있게. 과장 광고처럼 말하지 말고, 솔직한 조언자처럼 말하세요.
6. **역할 범위**: 당신은 쇼핑 추천 도우미입니다. 시·에세이·코드 작성, 번역, 일반 지식 문답, 잡담 등 쇼핑과 무관한 작업은 정중히 거절하고("저는 쇼핑 추천을 도와드리는 에이전트예요") 어떤 상품을 찾는지 물어 자연스럽게 본래 역할로 돌아오세요. 단, 상품 선택에 필요한 일반 상식(용도·환경 설명 등)은 답해도 됩니다.

[한국어 금액 단위 — 매우 중요]
- "N만 원" = N × 10,000원. 예: "10만 원" = 100,000원, "100만 원" = 1,000,000원, "30만 원" = 300,000원.
- "N천 원" = N × 1,000원. 도구의 minPrice/maxPrice에는 이렇게 환산한 "원 단위" 정수를 넣으세요. (예: "100만 원 이하" → maxPrice=1000000)

[검색 결과가 비었을 때]
- search_products가 0건을 반환하면 엉뚱한 상품을 추천하지 말고, "해당 조건에는 상품을 못 찾았다"고 솔직히 말한 뒤 조건(예산 등)을 바꿔볼 것을 제안하세요.${liveNote}${profilePromptBlock(profile)}`;
}

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

  // 잘못된/빈 본문은 500이 아니라 400으로 친절히 처리
  let body: { messages?: UIMessage[]; id?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
  }
  const { messages, id, sessionId } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: "messages 배열이 필요합니다." },
      { status: 400 }
    );
  }

  // 메시지 형식(누락된 parts, 잘못된 role 등)이 깨졌으면 500이 아니라 400으로 처리
  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(messages);
  } catch {
    return Response.json({ error: "messages 형식이 올바르지 않습니다." }, { status: 400 });
  }

  // 개인화 메모리: 이전 대화들에서 누적된 사용자 선호를 로드해 프롬프트에 주입
  const profile = sessionId ? await getProfile(sessionId) : null;

  const result = streamText({
    model: openai(MODEL),
    system: buildSystemPrompt(profile),
    messages: modelMessages,
    // 도구 호출 → 결과 반영 → 추가 도구 호출 또는 최종 답변까지 멀티스텝 루프 허용
    stopWhen: stepCountIs(6),
    tools: {
      search_products: tool({
        description:
          "사용자의 상황/예산/용도에 맞는 상품 후보를 카탈로그에서 의미 기반(RAG)으로 검색한다. 추천 전에 반드시 먼저 호출한다.",
        inputSchema: z.object({
          query: z
            .string()
            .optional()
            .describe(
              "사용자의 자연어 의도를 그대로 담은 문장. 의미 검색(RAG)에 사용되니 되도록 채운다. 예: '지하철 출퇴근에 쓸 조용한 노이즈캔슬링 이어폰'"
            ),
          keywords: z
            .string()
            .optional()
            .describe("핵심 키워드(필터·랭킹 보조). 예: '노이즈캔슬링 가벼운'"),
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
          const { count, products } = await searchProductsAuto(params);
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
              mall: p.mall,
              emoji: p.emoji,
              imageUrl: p.imageUrl,
              link: p.link,
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
          const products = resolveProducts(productIds);
          return {
            count: products.length,
            products: products.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              rating: p.rating,
              mall: p.mall,
              link: p.link,
              category: p.category,
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
          const p = resolveProduct(productId);
          if (!p) return { found: false as const, productId };
          return { found: true as const, product: p };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: () => crypto.randomUUID(),
    // 스트림 종료 시 전체 대화(원본 + 응답)를 Supabase에 저장 (미설정 시 no-op).
    // await 하여 저장 완료 후 스트림이 닫히도록 → 클라이언트의 'ready' = 저장 완료 보장.
    onFinish: async ({ messages: finalMessages }) => {
      if (id && sessionId) {
        await saveConversation({ id, sessionId, messages: finalMessages });
      }
      // 다음 질문을 위한 선호 갱신: 응답을 지연시키지 않도록 after()로 응답 종료 후 실행.
      // (서버리스에서 fire-and-forget은 함수가 얼어붙어 중단되므로 after로 함수 수명을 연장)
      if (sessionId) {
        after(() => updateProfileFromConversation(sessionId, finalMessages, profile));
      }
    },
  });
}
