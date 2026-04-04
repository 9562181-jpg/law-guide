import {
  AlignmentType,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { FONT_NAME, TABLE_BORDERS } from "./common-styles";

/**
 * 결재란 테이블 (기안·검토·결재 3단).
 * 문서 상단 우측에 배치한다.
 */
export function createApprovalTable(): Table {
  const cellWidth = 1200; // twips
  const cellHeight = 600;

  const headerRow = new TableRow({
    children: ["기안", "검토", "결재"].map(
      (label) =>
        new TableCell({
          width: { size: cellWidth, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: label,
                  font: FONT_NAME,
                  size: 18, // 9pt
                  bold: true,
                }),
              ],
            }),
          ],
        })
    ),
  });

  const signRow = new TableRow({
    height: { value: cellHeight, rule: "atLeast" as const },
    children: Array.from({ length: 3 }, () =>
      new TableCell({
        width: { size: cellWidth, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "",
                font: FONT_NAME,
                size: 18,
              }),
            ],
          }),
        ],
      })
    ),
  });

  return new Table({
    rows: [headerRow, signRow],
    width: { size: cellWidth * 3, type: WidthType.DXA },
    borders: TABLE_BORDERS,
    alignment: AlignmentType.RIGHT,
  });
}
