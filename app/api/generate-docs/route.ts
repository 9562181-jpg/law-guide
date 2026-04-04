import { NextResponse } from "next/server";
import { generateDocuments } from "@/lib/claude-client";
import { fetchLawsForIncident } from "@/lib/law-api";
import type { DocumentCode, IncidentType } from "@/lib/types";

export const maxDuration = 60;

/**
 * POST /api/generate-docs
 * 서류 초안 텍스트를 생성하여 JSON으로 반환한다.
 * docx 변환 없이 Claude가 생성한 서류 내용을 그대로 전달.
 */
export async function POST(request: Request) {
  let body: {
    originalInput?: string;
    processingResult?: string;
    incidentType?: IncidentType;
    documentSet?: DocumentCode[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식" }, { status: 400 });
  }

  const { originalInput, processingResult, incidentType, documentSet } = body;

  if (!originalInput || !processingResult || !incidentType || !documentSet?.length) {
    return NextResponse.json(
      { error: "필수 필드가 누락되었습니다." },
      { status: 400 }
    );
  }

  try {
    const lawArticles = await fetchLawsForIncident(incidentType);

    const documents = await generateDocuments({
      originalInput,
      processingResult,
      incidentType,
      documentSet,
      lawArticles,
    });

    // 서류 텍스트를 그대로 반환
    const results = documents.map((doc) => ({
      type: doc.type,
      title: doc.title,
      sections: doc.sections,
      metadata: doc.metadata,
      // 전체 본문을 하나의 텍스트로 합침 (복사 편의)
      fullText: doc.sections
        .map((s) => {
          let text = "";
          if (s.heading) text += `[${s.heading}]\n`;
          if (s.body) text += s.body;
          return text;
        })
        .join("\n\n"),
    }));

    return NextResponse.json({ documents: results });
  } catch (err) {
    console.error("[generate-docs] 서류 생성 오류:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "서류 생성 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
