export type CategoryId =
  | "pointer" | "touch" | "control" | "text" | "feedback" | "overlay" | "nav"
  | "image" | "video" | "gallery" | "motion" | "desktop" | "a11y" | "perf" | "render" | "data" | "devflow";

export interface Category {
  id: CategoryId;
  name: string;
  blurb: string;
}

export interface Term {
  id: string;
  name: string;          // 한국어 명칭
  en: string;            // 영어 명칭
  aliases: string[];     // 다른 이름, 검색어
  category: CategoryId;
  summary: string;       // 한 줄 요약
  description: string;  // 설명
  examples: string[];    // 어디서 볼 수 있나
  related: string[];     // 관련 용어 id
  demo?: string;         // 데모 컴포넌트 키
}
