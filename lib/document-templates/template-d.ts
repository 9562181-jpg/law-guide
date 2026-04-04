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
 * D: 현행범인체포서 문서를 생성한다.
 * 섹션: 피의자 인적사항, 죄명·적용법조, 현행범/준현행범 구분,
 *       체포일시·장소, 범죄사실, 체포사유, 미란다 고지, 변명 기회
 */
export function buildDocumentD(content: DocumentContent): Document {
  const children: (Paragraph | ReturnType<typeof createApprovalTable>)[] = [];

  children.push(createApprovalTable());
  children.push(new Paragraph({ children: [] }));

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: content.title || "현행범인체포서",
          font: FONT_NAME,
          size: 28,
          bold: true,
        }),
      ],
    })
  );

  children.push(new Paragraph({ children: [] }));

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
      const lines = section.body.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: line, font: FONT_NAME, size: 22 }),
            ],
          })
        );
      }
    }
  }

  children.push(createDisclaimer());

  return new Document({
    styles: DOCUMENT_STYLES,
    sections: [{ properties: PAGE_PROPERTIES, children }],
  });
}
