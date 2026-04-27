/** 신고 유형 */
export type IncidentType =
  | "가정폭력"
  | "폭행상해"
  | "절도"
  | "교통사고"
  | "자살자해"
  | "실종"
  | "스토킹"
  | "주거침입"
  | "사기"
  | "손괴"
  | "모욕명예훼손"
  | "주취자"
  | "업무방해"
  | "경범죄"
  | "공무집행방해"
  | "성폭력"
  | "아동학대"
  | "노인학대"
  | "장애인학대"
  | "음주운전"
  | "마약"
  | "성매매"
  | "보이스피싱"
  | "사이버범죄"
  | "협박"
  | "기타";

/** 서류 코드 */
export type DocumentCode = "A" | "B" | "C" | "D" | "E" | "F" | "seizure";

/** 법령 참조 (매핑 테이블용) */
export interface LawReference {
  name: string;
  id?: string;
  articles: string[];
}

/** 법령 매핑 항목 */
export interface LawMapping {
  laws: LawReference[];
  documents: DocumentCode[];
  riskFlags: string[];
  evidence: string[];
  procedure: string[];
}

/** 법제처 API 파싱 결과 — 조문 단위 */
export interface ParsedArticle {
  lawName: string;
  articleNumber: string;
  articleTitle: string;
  content: string;
  paragraphs?: ArticleParagraph[];
}

export interface ArticleParagraph {
  number: number;
  content: string;
  subparagraphs?: { number: number; content: string }[];
}
