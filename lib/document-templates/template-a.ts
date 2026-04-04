import {
  AlignmentType,
  Document,
  HeadingLevel,
  Paragraph,
  TextRun,
} from "docx";
import type { DocumentContent } from "../types";
import { DOCUMENT_STYLES, FONT_NAME, PAGE_PROPERTIES } from "./common-styles";
import { createApprovalTable } from "./approval-table";
import { createDisclaimer } from "./disclaimer";

/**
 * A: 112종결처리 내용 문서를 생성한다.
 */
export function buildDocumentA(content: DocumentContent): Document {
  const children: (Paragraph | ReturnType<typeof createApprovalTable>)[] = [];

  // 결재란
  children.push(createApprovalTable());

  // 빈 줄
  children.push(new Paragraph({ children: [] }));

  // 제목
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: content.title || "112 종결 보고",
          font: FONT_NAME,
          size: 28,
          bold: true,
        }),
      ],
    })
  );

  // 빈 줄
  children.push(new Paragraph({ children: [] }));

  // 메타데이터 (작성일시)
  if (content.metadata?.date) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: `작성일시: ${content.metadata.date}`,
            font: FONT_NAME,
            size: 20,
            color: "666666",
          }),
        ],
      })
    );
  }

  // 본문 섹션
  for (const section of content.sections) {
    if (section.heading) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 80 },
          children: [
            new TextRun({
              text: section.heading,
              font: FONT_NAME,
              size: 24,
              bold: true,
            }),
          ],
        })
      );
    }

    if (section.body) {
      // 본문을 줄바꿈 기준으로 분리하여 각각 Paragraph로
      const lines = section.body.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: line,
                font: FONT_NAME,
                size: 22,
              }),
            ],
          })
        );
      }
    }
  }

  // 면책 안내
  children.push(createDisclaimer());

  return new Document({
    styles: DOCUMENT_STYLES,
    sections: [
      {
        properties: PAGE_PROPERTIES,
        children,
      },
    ],
  });
}
