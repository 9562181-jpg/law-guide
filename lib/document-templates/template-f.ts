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
 * F: 긴급응급조치결정서 문서를 생성한다.
 * 섹션: 행위자·피해자 인적사항, 스토킹 행위 내용, 조치유형·사유, 조치일시
 */
export function buildDocumentF(content: DocumentContent): Document {
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
          text: content.title || "긴급응급조치결정서",
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
