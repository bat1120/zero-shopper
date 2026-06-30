/**
 * 제로쇼퍼 E2E 회귀 테스트 하네스
 *
 * 실행:
 *   node scripts/test-harness.mjs                 # 결정적 테스트만(입력검증·삭제·목록)
 *   RUN_LLM=1 node scripts/test-harness.mjs       # + LLM 행동 테스트(OpenAI 필요)
 *   BASE_URL=https://zero-shopper.vercel.app node scripts/test-harness.mjs
 *
 * 의존성 없음(Node 내장 fetch). 실패 시 exit code 1 → CI/반복 루프에서 게이트로 사용.
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const RUN_LLM = process.env.RUN_LLM === "1" || process.argv.includes("--llm");
const REQ_TIMEOUT = Number(process.env.REQ_TIMEOUT ?? 45000);

let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

async function fetchT(url, opts = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), REQ_TIMEOUT);
  try {
    return await fetch(url, { ...opts, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

/** /api/chat 호출 → {status, stream, toolNames:Set, text, json} */
async function chat(body, sessionId) {
  const res = await fetchT(`${BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionId ? { "x-session-id": sessionId } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("text/event-stream")) {
    const raw = await res.text();
    const toolNames = new Set(
      [...raw.matchAll(/"toolName":"([^"]+)"/g)].map((m) => m[1])
    );
    const text = [...raw.matchAll(/"delta":"((?:[^"\\]|\\.)*)"/g)]
      .map((m) => {
        try {
          return JSON.parse(`"${m[1]}"`);
        } catch {
          return "";
        }
      })
      .join("");
    return { status: res.status, stream: true, toolNames, text, raw };
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* 빈 본문 */
  }
  return { status: res.status, stream: false, toolNames: new Set(), text: "", raw: "", json };
}

function userMsg(text) {
  return { messages: [{ id: "u1", role: "user", parts: [{ type: "text", text }] }] };
}

async function main() {
  console.log(`제로쇼퍼 테스트 하네스 → ${BASE}  (LLM 테스트: ${RUN_LLM ? "ON" : "OFF"})`);

  // ── A. 입력 검증 (LLM 불필요, 항상 실행) ──────────────────────────────
  section("[A] 입력 검증 — 잘못된 요청은 500이 아니라 400");
  check("깨진 JSON 본문 → 400", (await chat("not json at all")).status === 400);
  check("빈 객체 {} → 400", (await chat({})).status === 400);
  check("messages가 문자열 → 400", (await chat({ messages: "hi" })).status === 400);
  check("messages 빈 배열 → 400", (await chat({ messages: [] })).status === 400);
  check(
    "role 이상/parts 누락 → 400",
    (await chat({ messages: [{ role: "banana" }] })).status === 400
  );

  // ── B. 대화 이력/프로필 라우트 (LLM 불필요) ───────────────────────────
  section("[B] 대화/프로필 라우트 — 소유·존재 검증");
  const sid = `harness-${Date.now()}`;
  const delRes = await fetchT(`${BASE}/api/conversations/does-not-exist-xyz`, {
    method: "DELETE",
    headers: { "x-session-id": sid },
  });
  check("없는 대화 DELETE → 404", delRes.status === 404, `got ${delRes.status}`);

  const getRes = await fetchT(`${BASE}/api/conversations/does-not-exist-xyz`, {
    headers: { "x-session-id": sid },
  });
  check("없는 대화 GET → 404", getRes.status === 404, `got ${getRes.status}`);

  const listRes = await fetchT(`${BASE}/api/conversations`, {
    headers: { "x-session-id": sid },
  });
  check("대화 목록 GET → 200", listRes.status === 200, `got ${listRes.status}`);

  const profRes = await fetchT(`${BASE}/api/profile`, {
    headers: { "x-session-id": sid },
  });
  check("프로필 GET → 200", profRes.status === 200, `got ${profRes.status}`);

  // ── C. LLM 행동 (OpenAI 필요, RUN_LLM=1 일 때만) ──────────────────────
  if (RUN_LLM) {
    section("[C] LLM 행동 — 역할 게이트 / 검색 / 결정 도우미");

    const poem = await chat(userMsg("봄에 대한 시 한 편 써줘"));
    check(
      "비쇼핑(시) → search_products 호출 안 함",
      !poem.toolNames.has("search_products"),
      `tools=[${[...poem.toolNames]}]`
    );
    check("비쇼핑(시) → 쇼핑으로 유도하는 텍스트", /쇼핑|상품|찾으시|도와/.test(poem.text));

    const code = await chat(userMsg("파이썬으로 퀵소트 코드 짜줘"));
    check(
      "비쇼핑(코드) → search_products 호출 안 함",
      !code.toolNames.has("search_products"),
      `tools=[${[...code.toolNames]}]`
    );

    const buy = await chat(userMsg("5만원으로 살만한 무선 이어폰 추천해줘"));
    check("쇼핑 → search_products 호출", buy.toolNames.has("search_products"));
    check("쇼핑 → 비어있지 않은 추천 텍스트", buy.text.trim().length > 10);

    // LLM 행동은 표본 1개당 노이즈가 있으므로 "역량" 검증은 최대 3회 재시도해
    // 어느 시도에서든 도구가 등장하면 통과로 본다(100% 재현이 아니라 가능성 검증).
    let sawCompare = false;
    let sawDecision = false;
    let lastTools = [];
    for (let attempt = 1; attempt <= 3 && !(sawCompare && sawDecision); attempt++) {
      const dec = await chat(
        userMsg(
          "캠핑 입문용 텐트 두세 개 비교해줘. 휴대성이 중요할지 실내 공간이 중요할지 고민돼서 결정을 못 하겠어"
        )
      );
      lastTools = [...dec.toolNames];
      if (dec.toolNames.has("compare_products")) sawCompare = true;
      if (dec.toolNames.has("decision_guide")) sawDecision = true;
    }
    check("비교+고민 → compare_products 호출(최대 3회)", sawCompare, `last=[${lastTools}]`);
    check("비교+고민 → decision_guide 호출(최대 3회)", sawDecision, `last=[${lastTools}]`);

    // 크로스턴 복원: 직전 턴의 라이브 상품(nv- id)을 재검색 없이 비교 요청 →
    // product-store 복원이 동작하면 compare 결과가 빈 배열이 아니라 그 상품을 담아야 함.
    const rehy = await chat({
      messages: [
        { id: "u1", role: "user", parts: [{ type: "text", text: "무선 이어폰 추천" }] },
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-search_products",
              toolCallId: "c1",
              state: "output-available",
              input: { query: "무선 이어폰" },
              output: {
                count: 2,
                products: [
                  { id: "nv-rehydrate-1", name: "테스트이어폰A", brand: "A", category: "이어폰", price: 39000, mall: "테스트몰", link: "https://example.com/a", tags: [], useCases: [], summary: "A" },
                  { id: "nv-rehydrate-2", name: "테스트이어폰B", brand: "B", category: "이어폰", price: 59000, mall: "테스트몰", link: "https://example.com/b", tags: [], useCases: [], summary: "B" },
                ],
              },
            },
            { type: "text", text: "테스트이어폰A와 테스트이어폰B를 추천해요." },
          ],
        },
        {
          id: "u2",
          role: "user",
          parts: [{ type: "text", text: "방금 추천한 그 두 개(테스트이어폰A, 테스트이어폰B)를 compare_products로 비교해줘" }],
        },
      ],
    });
    check("크로스턴 복원 → compare_products 호출", rehy.toolNames.has("compare_products"));
    check(
      "크로스턴 복원 → 비교결과에 nv- 상품 복원됨(빈 배열 아님)",
      rehy.raw.includes("nv-rehydrate-1") && rehy.raw.includes("nv-rehydrate-2"),
      "compare 출력이 비어있음(콜드 캐시 복원 실패)"
    );
  } else {
    section("[C] LLM 행동 — 건너뜀 (RUN_LLM=1 로 활성화)");
  }

  // ── 요약 ─────────────────────────────────────────────────────────────
  console.log(`\n${"=".repeat(48)}`);
  console.log(`결과: ${pass} 통과 / ${fail} 실패 (총 ${pass + fail})`);
  if (fail) {
    console.log("실패 항목:");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  } else {
    console.log("✅ 전부 통과");
    process.exit(0);
  }
}

main().catch((e) => {
  console.error("하네스 실행 오류:", e?.message ?? e);
  process.exit(2);
});
