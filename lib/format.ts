/** 가격을 "₩1,290,000" 형태로 */
export function formatPrice(won: number): string {
  return "₩" + won.toLocaleString("ko-KR");
}

/** 평점을 별 + 숫자로 (예: ★ 4.7) */
export function formatRating(rating: number): string {
  return `★ ${rating.toFixed(1)}`;
}

/** 검색 결과 상품(에이전트 도구 output)의 표시용 타입 */
export interface ProductCardData {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  rating: number;
  emoji?: string;
  tags: string[];
  useCases?: string[];
  summary: string;
}

/** 비교 도구 output의 표시용 타입 */
export interface CompareItem {
  id: string;
  name: string;
  price: number;
  rating: number;
  specs: Record<string, string>;
  pros: string[];
  cons: string[];
}
