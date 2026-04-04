import type { DocumentCode, IncidentType, ParsedArticle } from "../types";
import { DOCUMENT_NAMES } from "../types";
import { DOCUMENT_DETAIL } from "../rules/police-doc-rules";

/**
 * 서류별 구조 가이드를 반환한다.
 * police-doc-rules.ts의 상세 가이드를 사용한다.
 */
function getDocumentStructure(code: string): string {
  return DOCUMENT_DETAIL[code] ?? `## ${DOCUMENT_NAMES[code as DocumentCode]} (구조 미정의)`;
}

/**
 * 서류 생성 사용자 프롬프트를 조합한다.
 */
export function buildDocGenerateUserPrompt(params: {
  originalInput: string;
  processingResult: string;
  incidentType: IncidentType;
  documentSet: DocumentCode[];
  lawArticles: ParsedArticle[];
}): string {
  const docStructures = params.documentSet
    .map((code) => getDocumentStructure(code))
    .join("\n\n---\n\n");

  const lawText = params.lawArticles.length > 0
    ? params.lawArticles
        .map((a) => `### ${a.lawName} ${a.articleNumber} (${a.articleTitle})\n${a.content}`)
        .join("\n\n")
    : "[법령 조회 실패 — 직접 확인 필요]";

  return `# 신고 내용
${params.originalInput}

# 처리 결과
${params.processingResult}

# 신고 유형
${params.incidentType}

# 관련 법령 원문
${lawText}

# 생성 대상 서류
${params.documentSet.map((code) => `- ${code}: ${DOCUMENT_NAMES[code]}`).join("\n")}

# 서류별 작성 가이드 (필수 준수)
아래 각 서류의 문체 규칙, 필수 기재항목, 종결어를 반드시 준수하세요.

${docStructures}

# 요청
위 정보를 기반으로 각 서류의 초안을 작성하세요.
- 각 서류는 해당 작성 가이드의 문체·종결어·필수항목을 반드시 준수
- 범죄사실은 구성요건 동사표에 따라 종결
- 미확인 정보는 [입력 필요]로 표시
- 법적 단정 표현 금지
- 각 서류를 별도의 JSON 객체로 작성하고, 전체를 JSON 배열로 감싸세요.
- JSON 외의 텍스트를 포함하지 마세요.

출력 형식:
\`\`\`json
[
  {
    "type": "서류코드",
    "title": "서류 제목",
    "sections": [
      { "heading": "섹션 제목", "body": "본문 내용" }
    ],
    "metadata": { "date": "작성일시", "officer": "[입력 필요]", "department": "[입력 필요]" }
  }
]
\`\`\``;
}
