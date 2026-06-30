// 공통 타입 정의

export interface Product {
  id: string;
  name: string;
  brand: string;
  /** 카테고리 (예: "노트북", "무선이어폰") */
  category: string;
  /** 가격 (원, KRW) */
  price: number;
  /** 평점 0.0 ~ 5.0 */
  rating: number;
  /** 리뷰 수 */
  reviewCount: number;
  /** 이미지 대용 이모지 (더미 카탈로그라 실제 이미지 대신 사용) */
  emoji: string;
  /** 특성 태그 (예: "가벼움", "입문용", "가성비") */
  tags: string[];
  /** 적합한 상황/용도 (예: "캠핑", "재택근무", "출퇴근") */
  useCases: string[];
  /** 비교용 핵심 스펙 (키-값) */
  specs: Record<string, string>;
  /** 장점 */
  pros: string[];
  /** 단점 */
  cons: string[];
  /** 한 줄 요약 */
  summary: string;
}

/** search_products 도구의 입력 파라미터 */
export interface SearchParams {
  /** 자유 키워드 (상품명/태그/용도/요약에서 매칭) */
  keywords?: string;
  /** 카테고리 부분 일치 */
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  /** 사용 상황/용도 (예: "캠핑") */
  useCase?: string;
  /** 정렬 기준 */
  sortBy?: "relevance" | "price_asc" | "price_desc" | "rating";
  /** 최대 반환 개수 (기본 6) */
  limit?: number;
}

export interface SearchResult {
  count: number;
  products: Product[];
}
