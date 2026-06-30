import type { Product, SearchParams, SearchResult } from "./types";

/**
 * 더미 상품 카탈로그.
 * 실제 서비스라면 DB/외부 커머스 API에서 가져오겠지만, 사전 과제에서는
 * 에이전트의 "판단 흐름"을 보여주는 것이 목적이므로 정적 카탈로그를 사용한다.
 * 각 카테고리에 가격/포지셔닝이 다른 상품을 여러 개 두어 비교가 의미 있도록 구성.
 */
export const PRODUCTS: Product[] = [
  // ───────────────────────── 노트북 ─────────────────────────
  {
    id: "lt-01",
    name: "에어북 13 M-라이트",
    brand: "노바",
    category: "노트북",
    price: 1290000,
    rating: 4.7,
    reviewCount: 2841,
    emoji: "💻",
    tags: ["가벼움", "긴배터리", "휴대성", "사무용"],
    useCases: ["대학생", "재택근무", "출퇴근", "카페작업"],
    specs: { 무게: "1.06kg", 화면: "13.3인치", 배터리: "최대 18시간", CPU: "8코어", RAM: "16GB", 저장: "512GB" },
    pros: ["1kg대 초경량", "배터리 하루 종일", "발열·소음 적음"],
    cons: ["포트가 적음", "게임 성능은 약함"],
    summary: "들고 다니기 좋은 초경량 사무·학습용 노트북",
  },
  {
    id: "lt-02",
    name: "프로북 14 크리에이터",
    brand: "노바",
    category: "노트북",
    price: 2390000,
    rating: 4.6,
    reviewCount: 1190,
    emoji: "💻",
    tags: ["고성능", "영상편집", "디스플레이"],
    useCases: ["영상편집", "디자인", "개발"],
    specs: { 무게: "1.55kg", 화면: "14.2인치 미니LED", 배터리: "최대 14시간", CPU: "12코어", RAM: "32GB", 저장: "1TB" },
    pros: ["색 정확도 높은 디스플레이", "영상편집 쾌적", "포트 다양"],
    cons: ["가격대 높음", "무게 다소 있음"],
    summary: "영상·디자인 작업용 고성능 크리에이터 노트북",
  },
  {
    id: "lt-03",
    name: "밸류북 15",
    brand: "지트",
    category: "노트북",
    price: 690000,
    rating: 4.2,
    reviewCount: 5230,
    emoji: "💻",
    tags: ["가성비", "입문용", "대화면"],
    useCases: ["대학생", "문서작업", "인강"],
    specs: { 무게: "1.7kg", 화면: "15.6인치", 배터리: "최대 9시간", CPU: "6코어", RAM: "8GB", 저장: "256GB" },
    pros: ["저렴한 가격", "큰 화면", "기본 문서작업 충분"],
    cons: ["다소 무거움", "고사양 작업엔 부족"],
    summary: "문서·인강 위주 가성비 입문 노트북",
  },
  {
    id: "lt-04",
    name: "게이밍 엣지 16",
    brand: "랩터",
    category: "노트북",
    price: 1990000,
    rating: 4.5,
    reviewCount: 980,
    emoji: "💻",
    tags: ["게이밍", "고주사율", "고성능"],
    useCases: ["게임", "개발", "영상편집"],
    specs: { 무게: "2.3kg", 화면: "16인치 165Hz", 배터리: "최대 7시간", CPU: "14코어", GPU: "RTX급 외장", RAM: "16GB", 저장: "1TB" },
    pros: ["강력한 게임 성능", "165Hz 부드러운 화면", "쿨링 우수"],
    cons: ["무겁고 배터리 짧음", "팬 소음"],
    summary: "고사양 게임·작업을 위한 게이밍 노트북",
  },
  {
    id: "lt-05",
    name: "에어북 13 베이직",
    brand: "노바",
    category: "노트북",
    price: 990000,
    rating: 4.4,
    reviewCount: 3110,
    emoji: "💻",
    tags: ["가벼움", "가성비", "휴대성"],
    useCases: ["대학생", "재택근무", "출퇴근"],
    specs: { 무게: "1.1kg", 화면: "13.3인치", 배터리: "최대 15시간", CPU: "8코어", RAM: "8GB", 저장: "256GB" },
    pros: ["가벼운데 합리적 가격", "배터리 우수"],
    cons: ["RAM 8GB로 멀티태스킹은 아쉬움"],
    summary: "휴대성과 가격의 균형을 잡은 경량 노트북",
  },

  // ───────────────────────── 무선이어폰 ─────────────────────────
  {
    id: "eb-01",
    name: "에코버즈 프로",
    brand: "사운디",
    category: "무선이어폰",
    price: 299000,
    rating: 4.6,
    reviewCount: 8420,
    emoji: "🎧",
    tags: ["노이즈캔슬링", "통화품질", "프리미엄"],
    useCases: ["출퇴근", "운동", "통화"],
    specs: { 노이즈캔슬링: "강력", 배터리: "이어폰 6h+케이스 24h", 방수: "IPX4", 연결: "멀티포인트" },
    pros: ["뛰어난 노이즈캔슬링", "통화 잘 들림", "멀티포인트 편리"],
    cons: ["가격대 높음"],
    summary: "지하철·사무실 소음을 확실히 잡는 프리미엄 이어폰",
  },
  {
    id: "eb-02",
    name: "에코버즈 에어",
    brand: "사운디",
    category: "무선이어폰",
    price: 119000,
    rating: 4.3,
    reviewCount: 12030,
    emoji: "🎧",
    tags: ["가성비", "가벼움", "입문용"],
    useCases: ["출퇴근", "인강", "일상"],
    specs: { 노이즈캔슬링: "약함", 배터리: "이어폰 5h+케이스 20h", 방수: "IPX4", 연결: "단일" },
    pros: ["저렴한 가격", "가볍고 편한 착용감"],
    cons: ["노이즈캔슬링 거의 없음"],
    summary: "가볍게 쓰기 좋은 가성비 무선이어폰",
  },
  {
    id: "eb-03",
    name: "스포츠핏 버즈",
    brand: "런온",
    category: "무선이어폰",
    price: 159000,
    rating: 4.5,
    reviewCount: 4310,
    emoji: "🎧",
    tags: ["운동용", "방수", "안정적착용"],
    useCases: ["운동", "러닝", "헬스"],
    specs: { 노이즈캔슬링: "보통", 배터리: "이어폰 8h+케이스 24h", 방수: "IP67", 연결: "멀티포인트" },
    pros: ["격한 운동에도 안 빠지는 이어훅", "강력한 방수·방진", "배터리 길다"],
    cons: ["음질은 평이함"],
    summary: "러닝·헬스에 최적화된 방수 스포츠 이어폰",
  },
  {
    id: "eb-04",
    name: "퓨어사운드 X",
    brand: "사운디",
    category: "무선이어폰",
    price: 219000,
    rating: 4.7,
    reviewCount: 2670,
    emoji: "🎧",
    tags: ["음질", "고해상도", "프리미엄"],
    useCases: ["음악감상", "일상"],
    specs: { 노이즈캔슬링: "보통", 배터리: "이어폰 7h+케이스 28h", 방수: "IPX4", 연결: "멀티포인트", 코덱: "고해상도 지원" },
    pros: ["음질 디테일 우수", "고해상도 코덱 지원"],
    cons: ["노이즈캔슬링은 최상급은 아님"],
    summary: "음질을 중시하는 사람을 위한 고해상도 이어폰",
  },

  // ───────────────────────── 헤드폰 ─────────────────────────
  {
    id: "hp-01",
    name: "오버이어 스튜디오",
    brand: "사운디",
    category: "헤드폰",
    price: 449000,
    rating: 4.7,
    reviewCount: 3920,
    emoji: "🎧",
    tags: ["노이즈캔슬링", "장시간착용", "프리미엄"],
    useCases: ["출장", "집중작업", "음악감상"],
    specs: { 노이즈캔슬링: "최상", 배터리: "최대 35시간", 무게: "255g", 연결: "멀티포인트" },
    pros: ["업계 최상급 노이즈캔슬링", "오래 써도 편한 착용감", "배터리 길다"],
    cons: ["부피가 커 휴대 불편", "가격 높음"],
    summary: "비행기·집중작업에 좋은 최상급 노이즈캔슬링 헤드폰",
  },
  {
    id: "hp-02",
    name: "데일리 오버이어",
    brand: "지트",
    category: "헤드폰",
    price: 159000,
    rating: 4.2,
    reviewCount: 2110,
    emoji: "🎧",
    tags: ["가성비", "일상용"],
    useCases: ["일상", "인강", "재택근무"],
    specs: { 노이즈캔슬링: "보통", 배터리: "최대 40시간", 무게: "230g", 연결: "단일" },
    pros: ["가격 대비 무난한 성능", "배터리 매우 길다"],
    cons: ["노이즈캔슬링·음질 평범"],
    summary: "부담 없는 가격의 일상용 헤드폰",
  },
  {
    id: "hp-03",
    name: "프로 모니터링 H7",
    brand: "런온",
    category: "헤드폰",
    price: 329000,
    rating: 4.6,
    reviewCount: 870,
    emoji: "🎧",
    tags: ["음질", "유선", "모니터링"],
    useCases: ["음악작업", "음악감상"],
    specs: { 노이즈캔슬링: "없음(밀폐형)", 배터리: "유선", 무게: "290g", 연결: "유선" },
    pros: ["왜곡 적은 정확한 사운드", "내구성 좋음"],
    cons: ["유선만 지원", "외출용으로는 부담"],
    summary: "정확한 사운드가 필요한 작업·감상용 유선 헤드폰",
  },

  // ───────────────────────── 캠핑 텐트 ─────────────────────────
  {
    id: "tt-01",
    name: "이지업 2인 돔텐트",
    brand: "아웃필드",
    category: "캠핑텐트",
    price: 99000,
    rating: 4.3,
    reviewCount: 3450,
    emoji: "⛺",
    tags: ["입문용", "원터치", "가성비", "경량"],
    useCases: ["캠핑", "백패킹", "차박"],
    specs: { 수용인원: "2인", 무게: "2.4kg", 설치: "원터치 5분", 방수: "내수압 2000mm" },
    pros: ["혼자서도 5분 설치", "가볍고 저렴", "입문용으로 충분"],
    cons: ["강풍·폭우엔 약함", "내부 공간 아담"],
    summary: "처음 캠핑 입문자에게 좋은 원터치 경량 텐트",
  },
  {
    id: "tt-02",
    name: "패밀리 리빙쉘 4인",
    brand: "아웃필드",
    category: "캠핑텐트",
    price: 349000,
    rating: 4.6,
    reviewCount: 1620,
    emoji: "⛺",
    tags: ["가족용", "넓은공간", "거실형"],
    useCases: ["캠핑", "글램핑", "오토캠핑"],
    specs: { 수용인원: "4~5인", 무게: "9.8kg", 설치: "약 20분", 방수: "내수압 3000mm" },
    pros: ["거실+침실 분리 공간", "비바람에 강함", "가족 캠핑 적합"],
    cons: ["무겁고 설치 시간 김", "백패킹엔 부적합"],
    summary: "가족 오토캠핑용 넓은 거실형 텐트",
  },
  {
    id: "tt-03",
    name: "백패커 초경량 1인",
    brand: "트레일",
    category: "캠핑텐트",
    price: 219000,
    rating: 4.5,
    reviewCount: 740,
    emoji: "⛺",
    tags: ["초경량", "백패킹", "1인"],
    useCases: ["백패킹", "등산", "혼캠"],
    specs: { 수용인원: "1인", 무게: "1.1kg", 설치: "약 8분", 방수: "내수압 2500mm" },
    pros: ["배낭에 쏙 들어가는 무게", "혼자 산행에 최적"],
    cons: ["공간이 좁음", "가격 다소 있음"],
    summary: "배낭여행·등산용 1인 초경량 텐트",
  },
  {
    id: "tt-04",
    name: "올웨더 4계절 돔",
    brand: "트레일",
    category: "캠핑텐트",
    price: 459000,
    rating: 4.7,
    reviewCount: 510,
    emoji: "⛺",
    tags: ["사계절", "내구성", "악천후"],
    useCases: ["캠핑", "동계캠핑", "백패킹"],
    specs: { 수용인원: "2~3인", 무게: "3.6kg", 설치: "약 12분", 방수: "내수압 5000mm" },
    pros: ["겨울·강풍에도 안정적", "튼튼한 폴대", "결로 적음"],
    cons: ["가격 높음", "여름엔 다소 더움"],
    summary: "동계·악천후까지 커버하는 사계절 텐트",
  },

  // ───────────────────────── 러닝화 ─────────────────────────
  {
    id: "rn-01",
    name: "클라우드런 쿠션",
    brand: "런온",
    category: "러닝화",
    price: 159000,
    rating: 4.6,
    reviewCount: 6210,
    emoji: "👟",
    tags: ["입문용", "쿠션", "편안함"],
    useCases: ["러닝", "조깅", "일상"],
    specs: { 쿠션: "두꺼움", 무게: "265g", 드롭: "10mm", 용도: "데일리 조깅" },
    pros: ["푹신한 쿠션으로 무릎 부담 적음", "초보 조깅에 적합"],
    cons: ["빠른 스피드 주행엔 무거움"],
    summary: "달리기 입문·조깅에 좋은 쿠션 러닝화",
  },
  {
    id: "rn-02",
    name: "레이스 카본 엘리트",
    brand: "런온",
    category: "러닝화",
    price: 289000,
    rating: 4.7,
    reviewCount: 1340,
    emoji: "👟",
    tags: ["대회용", "카본플레이트", "고반발"],
    useCases: ["마라톤", "기록단축", "러닝"],
    specs: { 쿠션: "고반발", 무게: "195g", 드롭: "8mm", 용도: "대회·템포런" },
    pros: ["카본플레이트로 추진력", "가볍다", "기록 단축에 유리"],
    cons: ["내구성 짧음", "초보엔 과함"],
    summary: "기록 단축을 노리는 러너용 카본 대회화",
  },
  {
    id: "rn-03",
    name: "트레일 그립 X",
    brand: "아웃필드",
    category: "러닝화",
    price: 179000,
    rating: 4.4,
    reviewCount: 980,
    emoji: "👟",
    tags: ["트레일", "접지력", "방수"],
    useCases: ["트레일러닝", "등산", "산길"],
    specs: { 쿠션: "보통", 무게: "300g", 드롭: "6mm", 용도: "비포장·산길" },
    pros: ["험한 길 접지력 우수", "발 보호 좋음"],
    cons: ["도로 주행엔 둔함"],
    summary: "산길·비포장에 강한 트레일 러닝화",
  },
  {
    id: "rn-04",
    name: "데일리 조거 베이직",
    brand: "지트",
    category: "러닝화",
    price: 89000,
    rating: 4.1,
    reviewCount: 4520,
    emoji: "👟",
    tags: ["가성비", "입문용", "일상"],
    useCases: ["일상", "가벼운조깅", "산책"],
    specs: { 쿠션: "보통", 무게: "280g", 드롭: "10mm", 용도: "일상·가벼운 조깅" },
    pros: ["저렴한 가격", "일상 겸용 무난"],
    cons: ["본격 러닝엔 부족"],
    summary: "산책·가벼운 조깅용 가성비 운동화",
  },

  // ───────────────────────── 로봇청소기 ─────────────────────────
  {
    id: "rc-01",
    name: "클린봇 올인원 물걸레",
    brand: "홈텍",
    category: "로봇청소기",
    price: 1290000,
    rating: 4.6,
    reviewCount: 2210,
    emoji: "🤖",
    tags: ["물걸레", "자동세척", "프리미엄"],
    useCases: ["반려동물", "넓은집", "맞벌이"],
    specs: { 흡입력: "강력", 물걸레: "회전+자동세척건조", 먼지통: "자동비움 스테이션", 매핑: "LiDAR" },
    pros: ["물걸레까지 한 번에", "스테이션이 알아서 비우고 세척", "정밀 매핑"],
    cons: ["가격 높음", "스테이션 부피 큼"],
    summary: "물걸레·자동세척까지 다 되는 올인원 프리미엄 로봇청소기",
  },
  {
    id: "rc-02",
    name: "클린봇 에어 흡입",
    brand: "홈텍",
    category: "로봇청소기",
    price: 399000,
    rating: 4.3,
    reviewCount: 5870,
    emoji: "🤖",
    tags: ["가성비", "흡입전용", "원룸"],
    useCases: ["원룸", "자취", "1인가구"],
    specs: { 흡입력: "보통", 물걸레: "없음", 먼지통: "수동", 매핑: "자이로" },
    pros: ["부담 없는 가격", "원룸·소형 평수에 충분"],
    cons: ["물걸레 없음", "넓은 집엔 부족"],
    summary: "자취·원룸에 적당한 가성비 흡입 로봇청소기",
  },
  {
    id: "rc-03",
    name: "펫케어 클린봇",
    brand: "홈텍",
    category: "로봇청소기",
    price: 790000,
    rating: 4.5,
    reviewCount: 1430,
    emoji: "🤖",
    tags: ["반려동물", "강력흡입", "엉킴방지"],
    useCases: ["반려동물", "털많은집"],
    specs: { 흡입력: "매우강력", 물걸레: "간단(고정형)", 먼지통: "대용량", 매핑: "LiDAR" },
    pros: ["반려동물 털 흡입에 특화", "브러시 엉킴 방지", "대용량 먼지통"],
    cons: ["물걸레 기능은 기본 수준"],
    summary: "반려동물 털 청소에 특화된 강력 흡입 로봇청소기",
  },
  {
    id: "rc-04",
    name: "심플 클린봇 미니",
    brand: "지트",
    category: "로봇청소기",
    price: 219000,
    rating: 4.0,
    reviewCount: 3260,
    emoji: "🤖",
    tags: ["초가성비", "입문용", "소형"],
    useCases: ["원룸", "자취", "보조청소"],
    specs: { 흡입력: "약함", 물걸레: "없음", 먼지통: "소형", 매핑: "랜덤패턴" },
    pros: ["매우 저렴", "가벼운 먼지 청소엔 OK"],
    cons: ["매핑 없어 비효율", "흡입력 약함"],
    summary: "최저가로 시작하는 보조용 미니 로봇청소기",
  },

  // ───────────────────────── 커피머신 ─────────────────────────
  {
    id: "cf-01",
    name: "바리스타 프로 에스프레소",
    brand: "브루마스터",
    category: "커피머신",
    price: 890000,
    rating: 4.7,
    reviewCount: 1120,
    emoji: "☕",
    tags: ["에스프레소", "홈카페", "프리미엄"],
    useCases: ["홈카페", "라떼", "에스프레소"],
    specs: { 타입: "반자동 에스프레소", 스팀: "전문가용 스팀완드", 그라인더: "내장", 압력: "9bar" },
    pros: ["카페 수준 에스프레소", "라떼아트 가능한 스팀", "그라인더 내장"],
    cons: ["가격·크기 부담", "학습 곡선 있음"],
    summary: "홈카페 마니아를 위한 반자동 에스프레소 머신",
  },
  {
    id: "cf-02",
    name: "원터치 캡슐 브루어",
    brand: "브루마스터",
    category: "커피머신",
    price: 159000,
    rating: 4.4,
    reviewCount: 8830,
    emoji: "☕",
    tags: ["캡슐", "간편", "입문용"],
    useCases: ["사무실", "1인가구", "간편커피"],
    specs: { 타입: "캡슐", 스팀: "없음", 그라인더: "없음", 추출: "버튼 한 번" },
    pros: ["버튼 한 번이면 끝", "관리 쉬움", "저렴"],
    cons: ["캡슐 비용 지속", "커스터마이즈 제한"],
    summary: "버튼 하나로 끝내는 간편 캡슐 커피머신",
  },
  {
    id: "cf-03",
    name: "드립마스터 전자동",
    brand: "브루마스터",
    category: "커피머신",
    price: 329000,
    rating: 4.5,
    reviewCount: 2040,
    emoji: "☕",
    tags: ["전자동", "아메리카노", "대용량"],
    useCases: ["사무실", "가족", "아메리카노"],
    specs: { 타입: "전자동 드립", 스팀: "없음", 그라인더: "내장", 용량: "대용량 보온포트" },
    pros: ["원두 갈아 자동 드립", "대용량으로 여러 잔", "관리 간편"],
    cons: ["에스프레소·라떼는 불가"],
    summary: "원두로 여러 잔 내리는 전자동 드립 커피머신",
  },

  // ───────────────────────── 모니터 ─────────────────────────
  {
    id: "mn-01",
    name: "울트라뷰 27 4K",
    brand: "비전",
    category: "모니터",
    price: 549000,
    rating: 4.6,
    reviewCount: 3120,
    emoji: "🖥️",
    tags: ["4K", "고해상도", "작업용"],
    useCases: ["디자인", "영상편집", "재택근무"],
    specs: { 크기: "27인치", 해상도: "4K UHD", 주사율: "60Hz", 패널: "IPS", 색재현: "99% sRGB" },
    pros: ["선명한 4K 작업 화면", "정확한 색감", "넓은 작업 공간"],
    cons: ["게임용 고주사율은 아님"],
    summary: "디자인·영상작업에 좋은 27인치 4K 모니터",
  },
  {
    id: "mn-02",
    name: "게이밍 240 커브드",
    brand: "비전",
    category: "모니터",
    price: 459000,
    rating: 4.5,
    reviewCount: 1890,
    emoji: "🖥️",
    tags: ["게이밍", "고주사율", "커브드"],
    useCases: ["게임", "e스포츠"],
    specs: { 크기: "27인치", 해상도: "QHD", 주사율: "240Hz", 패널: "VA 커브드", 응답속도: "1ms" },
    pros: ["240Hz 초부드러운 게임", "몰입감 있는 커브드"],
    cons: ["색 작업용으론 평범"],
    summary: "FPS·e스포츠를 위한 240Hz 게이밍 모니터",
  },
  {
    id: "mn-03",
    name: "오피스 24 FHD",
    brand: "지트",
    category: "모니터",
    price: 159000,
    rating: 4.2,
    reviewCount: 7640,
    emoji: "🖥️",
    tags: ["가성비", "사무용", "입문용"],
    useCases: ["문서작업", "재택근무", "사무실"],
    specs: { 크기: "24인치", 해상도: "FHD", 주사율: "75Hz", 패널: "IPS", 색재현: "sRGB 95%" },
    pros: ["저렴한 사무용", "눈 편한 IPS", "기본기 충실"],
    cons: ["해상도·크기 평범"],
    summary: "문서·사무 작업용 가성비 24인치 모니터",
  },
  {
    id: "mn-04",
    name: "울트라와이드 34",
    brand: "비전",
    category: "모니터",
    price: 729000,
    rating: 4.6,
    reviewCount: 1410,
    emoji: "🖥️",
    tags: ["울트라와이드", "멀티태스킹", "몰입감"],
    useCases: ["개발", "주식", "멀티태스킹", "재택근무"],
    specs: { 크기: "34인치", 해상도: "UWQHD", 주사율: "100Hz", 패널: "IPS 커브드", 비율: "21:9" },
    pros: ["창 여러 개 동시에", "개발·트레이딩에 쾌적"],
    cons: ["책상 공간 많이 차지"],
    summary: "멀티태스킹·개발에 좋은 34인치 울트라와이드",
  },

  // ───────────────────────── 기계식 키보드 ─────────────────────────
  {
    id: "kb-01",
    name: "택틸 메카 87",
    brand: "키온",
    category: "키보드",
    price: 139000,
    rating: 4.6,
    reviewCount: 4210,
    emoji: "⌨️",
    tags: ["기계식", "타건감", "텐키리스"],
    useCases: ["타이핑", "개발", "사무"],
    specs: { 배열: "텐키리스(87키)", 스위치: "택타일 갈축", 연결: "유선", 키캡: "PBT" },
    pros: ["또렷한 택타일 타건감", "PBT 키캡 내구성", "콤팩트"],
    cons: ["무선 미지원"],
    summary: "타이핑 손맛 좋은 텐키리스 기계식 키보드",
  },
  {
    id: "kb-02",
    name: "사일런트 오피스 보드",
    brand: "키온",
    category: "키보드",
    price: 99000,
    rating: 4.3,
    reviewCount: 2670,
    emoji: "⌨️",
    tags: ["저소음", "기계식", "사무용", "무선"],
    useCases: ["사무", "재택근무", "공용공간"],
    specs: { 배열: "풀배열", 스위치: "저소음 적축", 연결: "무선+유선", 키캡: "ABS" },
    pros: ["조용해서 사무실·카페 OK", "무선 지원"],
    cons: ["타건감은 호불호"],
    summary: "사무실에서 눈치 안 보이는 저소음 무선 키보드",
  },
  {
    id: "kb-03",
    name: "게이밍 RGB 메카",
    brand: "랩터",
    category: "키보드",
    price: 169000,
    rating: 4.5,
    reviewCount: 1980,
    emoji: "⌨️",
    tags: ["게이밍", "RGB", "빠른반응"],
    useCases: ["게임", "e스포츠"],
    specs: { 배열: "풀배열", 스위치: "리니어 적축", 연결: "유선", 기능: "N키 롤오버, RGB" },
    pros: ["빠른 입력 반응", "화려한 RGB", "동시입력 안정적"],
    cons: ["타건 소음 있음"],
    summary: "빠른 반응이 필요한 게이머용 RGB 기계식 키보드",
  },
];

// ──────────────────────────────────────────────────────────────
// 검색 / 비교 로직
// ──────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

/**
 * 동의어 그룹. 사용자가 쓰는 일상어를 카탈로그의 태그/요약 용어와 연결한다.
 * 예: "조용히" → 카탈로그의 "저소음" 과 매칭되게.
 * 각 항목은 norm() 적용 후(공백 제거·소문자) 기준으로 비교한다.
 */
const SYNONYM_GROUPS: string[][] = [
  ["저소음", "조용", "조용히", "무소음", "사일런트", "정숙"],
  ["노이즈캔슬링", "노캔", "소음차단", "소음", "노이즈"],
  ["가벼움", "가벼운", "가볍", "경량", "라이트"],
  ["가성비", "저렴", "싼", "합리적", "가격", "저가"],
  ["게이밍", "게임", "게임용", "gaming"],
  ["고성능", "고사양", "강력", "빠른", "고스펙"],
  ["입문", "초보", "처음", "입문용", "비기너"],
  ["방수", "방진", "생활방수", "땀"],
  ["휴대", "휴대성", "이동", "들고다니"],
  ["사무", "오피스", "업무", "사무실", "회사"],
  ["운동", "러닝", "헬스", "조깅", "달리기"],
  ["대화면", "큰화면", "큰", "대형"],
  ["프리미엄", "고급", "최고급"],
];

const SYNONYM_LOOKUP = SYNONYM_GROUPS.map((g) => g.map(norm));

/** 토큰을 동의어로 확장 (자기 자신 포함). norm 적용된 토큰을 받는다. */
function expandToken(token: string): string[] {
  const out = new Set<string>([token]);
  for (const g of SYNONYM_LOOKUP) {
    if (g.some((term) => term.length >= 2 && (token.includes(term) || term.includes(token)))) {
      g.forEach((term) => out.add(term));
    }
  }
  return [...out];
}

/** 어휘 점수 계산 모드. baseline=초기 버전(동의어/태그가중 없음), enhanced=현재 버전 */
export type LexicalMode = "baseline" | "enhanced";

/** 키워드를 토큰으로 분리 */
export function tokenize(keywords: string | undefined, mode: LexicalMode = "enhanced"): string[] {
  if (!keywords) return [];
  if (mode === "baseline") {
    // 초기 버전: norm 후 콤마/구분자만으로 분리 (다중어가 한 덩어리로 뭉침)
    return norm(keywords).split(/,|·|\//).filter(Boolean);
  }
  // 현재 버전: 공백 포함 분리 후 각 단어 norm
  return keywords.split(/[\s,·/]+/).map(norm).filter(Boolean);
}

/** 가격·카테고리 하드 필터를 적용한 후보 상품 목록 */
export function getCandidates(params: SearchParams): Product[] {
  const { minPrice, maxPrice, category } = params;
  let items = PRODUCTS.filter((p) => {
    if (typeof minPrice === "number" && minPrice > 0 && p.price < minPrice) return false;
    if (typeof maxPrice === "number" && maxPrice > 0 && p.price > maxPrice) return false;
    return true;
  });
  // 카테고리가 지정되면 항상 그 카테고리로 한정. 카탈로그에 없는 카테고리면 빈 목록
  // → "노트북"인데 예산 부족 시 텐트로 폴백되거나, "자동차" 같은 미취급 품목이 섞이는 것을 방지.
  if (category) {
    const cat = norm(category);
    const matchCat = (p: Product) =>
      norm(p.category).includes(cat) || cat.includes(norm(p.category));
    items = items.filter(matchCat);
  }
  return items;
}

/** 한 상품의 어휘 점수 (카테고리·용도·키워드·평점) */
export function lexicalScore(
  p: Product,
  params: SearchParams,
  tokens: string[],
  mode: LexicalMode = "enhanced"
): number {
  let score = 0;
  const { category, useCase } = params;

  if (category && norm(p.category).includes(norm(category))) score += 6;

  if (useCase) {
    const uc = norm(useCase);
    if (p.useCases.some((u) => norm(u).includes(uc) || uc.includes(norm(u)))) score += 5;
  }

  if (mode === "baseline") {
    // 초기 버전: 단일 haystack에 토큰이 그대로 들어있으면 +3 (동의어/태그가중 없음)
    const hay = norm([p.name, p.brand, p.category, p.summary, ...p.tags, ...p.useCases].join(" "));
    for (const t of tokens) if (t && hay.includes(t)) score += 3;
  } else {
    // 현재 버전: 태그 매칭 +4 / 그 외 텍스트 +3, 동의어 확장
    const tagHay = norm(p.tags.join(" "));
    const textHay = norm([p.name, p.brand, p.category, p.summary, ...p.useCases].join(" "));
    for (const t of tokens) {
      if (!t) continue;
      const variants = expandToken(t);
      if (variants.some((v) => v && tagHay.includes(v))) score += 4;
      else if (variants.some((v) => v && textHay.includes(v))) score += 3;
    }
  }

  score += (p.rating ?? 0) * 0.4; // 동점 정렬용 소량 반영
  return score;
}

function clampLimit(limit?: number): number {
  return Math.max(1, Math.min(limit ?? 6, 12));
}

function sortByMode(
  scored: { p: Product; score: number }[],
  sortBy: SearchParams["sortBy"]
): void {
  scored.sort((a, b) => {
    switch (sortBy) {
      case "price_asc":
        return a.p.price - b.p.price;
      case "price_desc":
        return b.p.price - a.p.price;
      case "rating":
        return (b.p.rating ?? 0) - (a.p.rating ?? 0);
      default:
        return b.score - a.score || (b.p.rating ?? 0) - (a.p.rating ?? 0);
    }
  });
}

/**
 * 어휘 기반 상품 검색 (RAG 미사용 / 폴백 경로).
 * opts.lexicalMode 로 초기 버전(baseline)과 현재 버전(enhanced)을 비교할 수 있다(평가용).
 */
export function searchProducts(
  params: SearchParams,
  opts: { lexicalMode?: LexicalMode } = {}
): SearchResult {
  const mode = opts.lexicalMode ?? "enhanced";
  const tokens = tokenize(params.keywords, mode);
  const candidates = getCandidates(params);

  let scored = candidates.map((p) => ({ p, score: lexicalScore(p, params, tokens, mode) }));

  // 검색어/카테고리/용도가 있으면 점수 낮은(무관) 항목 제외
  const hasQuery = Boolean(params.category || params.useCase || tokens.length);
  if (hasQuery) {
    const meaningful = scored.filter(({ score }) => score > 2);
    if (meaningful.length > 0) scored = meaningful;
  }

  sortByMode(scored, params.sortBy);
  const products = scored.slice(0, clampLimit(params.limit)).map(({ p }) => p);
  return { count: products.length, products };
}

/** ID 목록으로 상품을 가져와 비교용으로 반환 (입력 순서 유지) */
export function compareProducts(ids: string[]): Product[] {
  return ids
    .map((id) => PRODUCTS.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));
}

/** 단일 상품 상세 */
export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/** 카테고리 목록 (UI 안내·시스템 프롬프트용) */
export function listCategories(): string[] {
  return Array.from(new Set(PRODUCTS.map((p) => p.category)));
}
