/**
 * README용 스크린샷 생성기 (일회성).
 * 설치된 Chrome을 헤드리스로 구동해 프로덕션 사이트를 캡처한다(브라우저 추가 다운로드 없음).
 * 실행: node scripts/shoot.mjs  (사전: npm i -D playwright-core)
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const URL = process.env.SHOOT_URL ?? "https://zero-shopper.vercel.app";
const OUT = resolve(process.cwd(), "docs/screenshots");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function settle(page, ms = 800) {
  await page.waitForTimeout(ms);
}

try {
  // ---------- 데스크톱 ----------
  const ctx = await browser.newContext({
    viewport: { width: 1360, height: 880 },
    deviceScaleFactor: 2,
    locale: "ko-KR",
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await settle(page, 1000);

  // 1) 히어로(빈 화면)
  await page.screenshot({ path: resolve(OUT, "01-hero.png") });
  console.log("✓ 01-hero.png");

  // 2) 대화 결과(상품 카드 + 비교표 + 사이드바)
  await page.getByText("지하철 출퇴근용 노이즈캔슬링").click();
  // 비교표가 뜰 때까지 대기 (LLM+네이버 호출)
  await page.getByText("상품 비교", { exact: false }).waitFor({ timeout: 60000 });
  // 스트림 종료 → 사이드바에 대화가 저장되어 목록(li)이 나타날 때까지 대기
  await page.locator("aside li").first().waitFor({ timeout: 60000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  // 채팅 메시지 영역은 내부 스크롤 컨테이너 — 사이드바(aside)가 아닌 .overflow-y-auto를 고른다.
  const scrollInner = (where) =>
    page.evaluate((w) => {
      const el = [...document.querySelectorAll(".overflow-y-auto")].find((e) => !e.closest("aside"));
      if (el) el.scrollTop = w === "top" ? 0 : el.scrollHeight;
    }, where);
  // lazy 이미지 로딩: 메시지 컨테이너를 끝까지 훑어 트리거 → 위로 복귀
  await page.evaluate(async () => {
    const el = [...document.querySelectorAll(".overflow-y-auto")].find((e) => !e.closest("aside"));
    if (!el) return;
    for (let y = 0; y <= el.scrollHeight; y += 300) {
      el.scrollTop = y;
      await new Promise((r) => setTimeout(r, 120));
    }
    el.scrollTop = 0;
  });
  await page
    .waitForFunction(
      () => Array.from(document.images).every((im) => im.complete && im.naturalWidth > 0),
      { timeout: 15000 }
    )
    .catch(() => {});

  // 02) 상품 카드 그리드 + 사이드바(저장된 대화)
  await scrollInner("top");
  await settle(page, 600);
  await page.screenshot({ path: resolve(OUT, "02-results.png") });
  console.log("✓ 02-results.png");

  // 02b) 비교표 + 근거 기반 추천 + 사이드바
  await scrollInner("bottom");
  await settle(page, 600);
  await page.screenshot({ path: resolve(OUT, "02b-compare.png") });
  console.log("✓ 02b-compare.png");

  // 02c) 결정 도우미 — 비교 후 트레이드오프 질문 카드 (LLM이 호출해야 떠서 최대 3회 재시도)
  const DECISION_PROMPT =
    "캠핑 입문용 텐트 두세 개 비교해줘. 휴대성이 중요할지 실내 공간이 중요할지 고민돼서 결정을 못 하겠어";
  let decisionShown = false;
  for (let attempt = 1; attempt <= 3 && !decisionShown; attempt++) {
    await page.getByRole("button", { name: "새 대화" }).click();
    await settle(page, 500);
    const box = page.locator("textarea");
    await box.click();
    await box.fill(DECISION_PROMPT);
    await page.keyboard.press("Enter");
    try {
      await page.getByText("결정 도우미", { exact: false }).waitFor({ timeout: 55000 });
      decisionShown = true;
    } catch {
      console.warn(`  · 결정 도우미 미발생(시도 ${attempt}/3) — 재시도`);
    }
  }
  if (decisionShown) {
    // 스트림(설명 텍스트)까지 끝나도록 잠깐 대기 후 카드가 보이게 스크롤
    await page.waitForLoadState("networkidle").catch(() => {});
    await settle(page, 1200);
    await page.getByText("결정 도우미", { exact: false }).scrollIntoViewIfNeeded();
    await settle(page, 600);
    await page.screenshot({ path: resolve(OUT, "02c-decision.png") });
    console.log("✓ 02c-decision.png");
  } else {
    console.warn("⚠ 결정 도우미를 트리거하지 못함 — 02c-decision.png 생략");
  }

  await ctx.close();

  // ---------- 모바일 ----------
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "ko-KR",
  });
  const mpage = await mctx.newPage();
  await mpage.goto(URL, { waitUntil: "networkidle" });
  await settle(mpage, 1000);
  await mpage.screenshot({ path: resolve(OUT, "03-mobile.png") });
  console.log("✓ 03-mobile.png");

  // 햄버거 → 사이드바 오버레이
  await mpage.getByRole("button", { name: "대화 이력 열기" }).click();
  await settle(mpage, 600);
  await mpage.screenshot({ path: resolve(OUT, "04-mobile-sidebar.png") });
  console.log("✓ 04-mobile-sidebar.png");

  await mctx.close();
} finally {
  await browser.close();
}
console.log("완료:", OUT);
