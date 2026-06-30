import type { Product } from "./types";
import { PRODUCTS } from "./products";

/**
 * 라이브 API(네이버) 상품은 영속 저장소가 없어서, 검색으로 본 상품을 메모리에 캐시해 둔다.
 * 한 번의 대화 요청(POST /api/chat) 안에서 search → compare/detail 가 같은 프로세스를 타므로,
 * 멀티스텝 도구 호출에서 ID로 상품을 다시 찾을 수 있다.
 */
const cache = new Map<string, Product>();
const MAX = 800;

export function rememberProducts(products: Product[]): void {
  for (const p of products) cache.set(p.id, p);
  if (cache.size > MAX) {
    const overflow = cache.size - MAX;
    let i = 0;
    for (const k of cache.keys()) {
      if (i++ >= overflow) break;
      cache.delete(k);
    }
  }
}

/** 캐시 우선, 없으면 정적 더미 카탈로그에서 조회 */
export function resolveProduct(id: string): Product | undefined {
  return cache.get(id) ?? PRODUCTS.find((p) => p.id === id);
}

export function resolveProducts(ids: string[]): Product[] {
  return ids
    .map((id) => resolveProduct(id))
    .filter((p): p is Product => Boolean(p));
}
