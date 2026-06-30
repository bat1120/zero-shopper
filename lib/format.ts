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
  /** 라이브 API 상품은 평점이 없을 수 있음 */
  rating?: number;
  emoji?: string;
  /** 실제 상품 이미지 URL (네이버 등 라이브 API) */
  imageUrl?: string;
  /** 구매/상세 페이지 링크 (라이브 API) */
  link?: string;
  /** 판매처 */
  mall?: string;
  tags?: string[];
  useCases?: string[];
  summary: string;
}

/** 결정 도우미 도구 output의 표시용 타입 */
export interface DecisionOption {
  /** 사용자의 우선순위 라벨 (예: "가볍고 휴대성이 중요") */
  label: string;
  productId: string;
  /** 이 우선순위에 맞는 상품명 (서버에서 ID로 resolve) */
  productName: string;
  /** 이 상품이 그 우선순위에 맞는 한 줄 근거 */
  reason: string;
}
export interface DecisionGuideData {
  /** 결정을 가르는 핵심 질문 */
  question: string;
  options: DecisionOption[];
}

/** 비교 도구 output의 표시용 타입 */
export interface CompareItem {
  id: string;
  name: string;
  price: number;
  /** 라이브 API 상품은 평점이 없을 수 있음 */
  rating?: number;
  mall?: string;
  link?: string;
  category?: string;
  specs: Record<string, string>;
  pros: string[];
  cons: string[];
}
