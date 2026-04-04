import {
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
  type IRunOptions,
  type ISectionPropertiesOptions,
  type IStylesOptions,
} from "docx";

/** A4 용지 + 여백 설정 */
export const PAGE_PROPERTIES: ISectionPropertiesOptions = {
  page: {
    size: {
      width: 11906,  // A4 width (twips)
      height: 16838, // A4 height (twips)
    },
    margin: {
      top: convertMillimetersToTwip(25),
      bottom: convertMillimetersToTwip(25),
      left: convertMillimetersToTwip(20),
      right: convertMillimetersToTwip(20),
    },
  },
};

/** 기본 폰트 설정 */
export const FONT_NAME = "맑은 고딕";

export const BODY_FONT: IRunOptions = {
  font: FONT_NAME,
  size: 22, // 11pt = 22 half-points
};

export const TITLE_FONT: IRunOptions = {
  font: FONT_NAME,
  size: 28, // 14pt
  bold: true,
};

export const HEADING_FONT: IRunOptions = {
  font: FONT_NAME,
  size: 24, // 12pt
  bold: true,
};

/** 문서 스타일 정의 */
export const DOCUMENT_STYLES: IStylesOptions = {
  default: {
    document: {
      run: {
        font: FONT_NAME,
        size: 22,
      },
      paragraph: {
        spacing: {
          after: 120,
          line: 360, // 1.5배 줄간격
        },
      },
    },
    heading1: {
      run: {
        font: FONT_NAME,
        size: 28,
        bold: true,
      },
      paragraph: {
        spacing: { before: 240, after: 120 },
        alignment: AlignmentType.CENTER,
      },
    },
    heading2: {
      run: {
        font: FONT_NAME,
        size: 24,
        bold: true,
      },
      paragraph: {
        spacing: { before: 200, after: 80 },
      },
    },
  },
};

/** 표 테두리 공통 스타일 */
export const TABLE_BORDER = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: "000000",
};

export const TABLE_BORDERS = {
  top: TABLE_BORDER,
  bottom: TABLE_BORDER,
  left: TABLE_BORDER,
  right: TABLE_BORDER,
  insideHorizontal: TABLE_BORDER,
  insideVertical: TABLE_BORDER,
};
