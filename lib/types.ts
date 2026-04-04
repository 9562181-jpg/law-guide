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
  | "기타";

/** 서류 코드 */
export type DocumentCode = "A" | "B" | "C" | "D" | "E" | "F" | "seizure";

/** 처리 유형 */
export type DispositionType =
  | "현장종결"
  | "타부서인계_일반"
  | "타부서인계_절도"
  | "현행범체포";

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

/** 분류 결과 (Claude 응답 파싱 후) */
export interface ClassificationResult {
  incidentType: IncidentType;
  subType?: string;
  summary: string;
}

/** 매뉴얼 내용 */
export interface ManualContent {
  incidentType: IncidentType;
  subType?: string;
  procedure: string[];
  riskFlags: string[];
  evidence: string[];
  judgmentCriteria: string[];
  requiredDocuments: DocumentCode[];
  lawArticles: ParsedArticle[];
}

/** 서류 생성 요청 */
export interface DocGenerateRequest {
  originalInput: string;
  processingResult: string;
  incidentType: IncidentType;
  dispositionType: DispositionType;
  documentSet: DocumentCode[];
  lawArticles: ParsedArticle[];
}

/** 서류 생성 결과 (Claude JSON 응답) */
export interface DocumentContent {
  type: DocumentCode;
  title: string;
  sections: DocumentSection[];
  metadata: {
    date: string;
    officer?: string;
    department?: string;
  };
}

export interface DocumentSection {
  heading?: string;
  body: string;
  table?: string[][];
}

/** SSE 이벤트 타입 */
export interface SSEEvent {
  event: "classification" | "manual" | "law" | "done" | "error";
  data: string;
}

/** 채팅 메시지 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** 앱 전체 상태 (클라이언트) */
export type AppPhase = "input" | "analyzing" | "result" | "generating_doc";

export interface AppState {
  phase: AppPhase;
  reportContent: string;
  classification: ClassificationResult | null;
  manual: ManualContent | null;
  streamingText: string;
  documents: GeneratedDocument[];
  chatMessages: ChatMessage[];
  error: string | null;
}

export interface GeneratedDocument {
  type: DocumentCode;
  title: string;
  preview: string;
  downloading: boolean;
}

/** 서류 코드 → 한글 이름 매핑 */
export const DOCUMENT_NAMES: Record<DocumentCode, string> = {
  A: "112종결내용",
  B: "입건전조사보고서",
  C: "발생보고서",
  D: "현행범인체포서",
  E: "긴급임시조치결정서",
  F: "긴급응급조치결정서",
  seizure: "압수경위서",
};
