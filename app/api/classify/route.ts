import { NextResponse } from "next/server";
import { classifyAndGenerateManual } from "@/lib/claude-client";
import { fetchLawsForIncident, formatLawContext } from "@/lib/law-api";
import { getLawMapping } from "@/lib/law-map";
import type { ClassificationResult, IncidentType } from "@/lib/types";

export const maxDuration = 60; // Vercel Pro: 최대 60초

/**
 * POST /api/classify
 * 신고 내용을 분류하고 매뉴얼을 SSE 스트리밍으로 반환한다.
 *
 * 흐름:
 * 1. 신고 내용 수신
 * 2. 법제처 API로 주요 법령 조문 사전 조회 (가장 빈번한 3개 유형 대상)
 * 3. Claude API로 분류 + 매뉴얼 생성 (스트리밍)
 * 4. 분류 결과 확정 후 해당 유형 법령 추가 조회
 * 5. SSE로 classification → manual → law → done 이벤트 전송
 */
export async function POST(request: Request) {
  let body: { input?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식" }, { status: 400 });
  }

  const input = body.input?.trim();
  if (!input || input.length < 5) {
    return NextResponse.json(
      { error: "신고 내용을 5자 이상 입력해주세요." },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // 사전 법령 조회: 빈 컨텍스트로 시작, 분류 후 추가 조회
        let lawContext = "";

        // Claude API 스트리밍
        let classificationResult: ClassificationResult | null = null;

        for await (const event of classifyAndGenerateManual(input, lawContext)) {
          // 분류 결과 추출 시 법령 추가 조회
          if (event.event === "classification") {
            classificationResult = JSON.parse(event.data) as ClassificationResult;
            send("classification", classificationResult);

            // 분류된 유형으로 법령 조회
            const incidentType = classificationResult.incidentType as IncidentType;
            const mapping = getLawMapping(incidentType);

            if (mapping) {
              const articles = await fetchLawsForIncident(incidentType);
              lawContext = formatLawContext(articles);
              send("law", { articles, formatted: lawContext });
            }

            // 매뉴얼 정보도 law-map에서 보강
            if (mapping) {
              send("manual_data", {
                riskFlags: mapping.riskFlags,
                evidence: mapping.evidence,
                procedure: mapping.procedure,
                requiredDocuments: mapping.documents,
              });
            }
          } else if (event.event === "manual") {
            send("manual", JSON.parse(event.data));
          } else if (event.event === "error") {
            send("error", JSON.parse(event.data));
          }
        }

        send("done", {});
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "알 수 없는 오류",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
