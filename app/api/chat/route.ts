import { chat } from "@/lib/claude-client";
import type { ChatMessage } from "@/lib/types";

export const maxDuration = 60;

/**
 * POST /api/chat
 * 추가 질문을 SSE 스트리밍으로 처리한다.
 */
export async function POST(request: Request) {
  let body: {
    messages?: ChatMessage[];
    context?: {
      incidentType: string;
      manualSummary: string;
      lawContext: string;
    };
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "잘못된 요청 형식" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, context } = body;

  if (!messages?.length || !context) {
    return new Response(
      JSON.stringify({ error: "messages와 context가 필요합니다." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of chat(messages, context)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: err instanceof Error ? err.message : "오류 발생" })}\n\n`
          )
        );
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
