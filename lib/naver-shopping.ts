import type { Product, SearchParams } from "./types";

const ENDPOINT = "https://openapi.naver.com/v1/search/shop.json";

export function hasNaverCredentials(): boolean {
  return Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}

/** 네이버 응답의 <b> 태그·HTML 엔티티 제거 */
function decodeHtml(s: string): string {
  return (s ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** 네이버 검색어 구성: 카테고리 + 키워드(간결). 둘 다 없으면 자연어 query 사용 */
function buildSearchTerm(params: SearchParams): string {
  const term = [params.category, params.keywords].filter(Boolean).join(" ").trim();
  if (term) return term;
  return (params.query ?? "").trim();
}

interface NaverItem {
  title: string;
  link: string;
  image: string;
  lprice: string;
  hprice: string;
  mallName: string;
  productId: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
}

/**
 * 네이버 쇼핑 검색 API로 상품을 가져와 Product 형태로 매핑한다.
 * 자격증명/검색어가 없거나 호출 실패 시 빈 배열(상위에서 더미로 폴백).
 */
export async function searchNaver(params: SearchParams): Promise<Product[]> {
  if (!hasNaverCredentials()) return [];
  const term = buildSearchTerm(params);
  if (!term) return [];

  const sort =
    params.sortBy === "price_asc" ? "asc" : params.sortBy === "price_desc" ? "dsc" : "sim";
  const url = `${ENDPOINT}?query=${encodeURIComponent(term)}&display=30&sort=${sort}`;

  let items: NaverItem[] = [];
  try {
    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID as string,
        "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET as string,
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: NaverItem[] };
    items = data.items ?? [];
  } catch {
    return [];
  }

  let products: Product[] = items.map((it) => {
    const catPath = [it.category1, it.category2, it.category3, it.category4]
      .filter(Boolean)
      .map(decodeHtml)
      .join(" > ");
    const category = decodeHtml(it.category2 || it.category1 || params.category || "쇼핑");
    const specs: Record<string, string> = catPath
      ? { 분류: catPath, 판매처: it.mallName }
      : {};
    return {
      id: `nv-${it.productId}`,
      name: decodeHtml(it.title),
      brand: decodeHtml(it.brand || it.maker || it.mallName || ""),
      category,
      price: Number(it.lprice) || 0,
      emoji: "🛍️",
      imageUrl: it.image,
      link: it.link,
      mall: it.mallName,
      tags: [],
      useCases: [],
      specs,
      pros: [],
      cons: [],
      summary: catPath || category,
    } satisfies Product;
  });

  // 가격 하드 필터 (0 이하는 제한 없음)
  products = products.filter((p) => {
    if (typeof params.minPrice === "number" && params.minPrice > 0 && p.price < params.minPrice)
      return false;
    if (typeof params.maxPrice === "number" && params.maxPrice > 0 && p.price > params.maxPrice)
      return false;
    return p.price > 0;
  });

  return products;
}
