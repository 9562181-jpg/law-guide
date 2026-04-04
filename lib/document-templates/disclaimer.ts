import { AlignmentType, Paragraph, TextRun } from "docx";
import { FONT_NAME } from "./common-styles";

/**
 * AI 초안 면책 안내 문구.
 * 모든 서류 하단에 삽입한다.
 */
export function createDisclaimer(): Paragraph {
  return new Paragraph({
    spacing: { before: 400, after: 0 },
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({
        text: "※ 본 문서는 AI 보조 도구가 생성한 초안입니다. 법적 효력을 위해 담당자 검토 및 결재가 필요합니다.",
        font: FONT_NAME,
        size: 16, // 8pt
        italics: true,
        color: "888888",
      }),
    ],
  });
}
