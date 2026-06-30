// 공통 타입 정의

export interface Product {
  id: string;
  name: string;
  brand: string;
  /** 카테고리 (예: "노트북", "무선이어폰") */
  category: string;
  /** 가격 (원, KRW) */
  price: number;
  /** 평점 0.0 ~ 5.0 (라이브 API 상품은 없을 수 있음) */
  rating?: number;
  /** 리뷰 수 (라이브 API 상품은 없을 수 있음) */
  reviewCount?: number;
  /** 이미지 대용 이모지 (더미 카탈로그용) */
  emoji?: string;
  /** 실제 상품 이미지 URL (네이버 등 라이브 API) */
  imageUrl?: string;
  /** 상품 구매/상세 페이지 링크 (라이브 API) */
  link?: string;
  /** 쇼핑몰/판매처 (라이브 API) */
  mall?: string;
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
  /** 사용자의 자연어 의도 전체 (의미 검색=RAG 임베딩에 사용). 예: "지하철 출퇴근에 쓸 조용한 이어폰" */
  query?: string;
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
