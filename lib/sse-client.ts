/**
 * 클라이언트용 SSE 파싱 유틸리티.
 * ReadableStream을 읽어 완전한 SSE 이벤트 단위로 yield한다.
 */

export interface ParsedSSEEvent {
  event: string;
  data: unknown;
}

/**
 * SSE 엔드포인트에 POST 요청을 보내고 이벤트를 스트리밍한다.
 */
export async function* fetchSSE(
  url: string,
  body: unknown
): AsyncGenerator<ParsedSSEEvent> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API 오류 (${response.status}): ${errorBody}`);
  }

  if (!response.body) {
    throw new Error("응답 스트림이 없습니다.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE 이벤트는 빈 줄(\n\n)로 구분
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? ""; // 마지막 불완전한 부분은 버퍼에 보관

    for (const part of parts) {
      if (!part.trim()) continue;

      const event = parseSSEBlock(part);
      if (event) yield event;
    }
  }

  // 남은 버퍼 처리
  if (buffer.trim()) {
    const event = parseSSEBlock(buffer);
    if (event) yield event;
  }
}

/**
 * 단일 SSE 블록을 파싱한다.
 * "event: xxx\ndata: yyy" 형태를 파싱.
 */
function parseSSEBlock(block: string): ParsedSSEEvent | null {
  let eventName = "message";
  let dataStr = "";

  for (const line of block.split("\n")) {
    if (line.startsWith("event: ")) {
      eventName = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      const raw = line.slice(6);
      if (raw === "[DONE]") {
        return { event: "done", data: {} };
      }
      dataStr += raw;
    }
  }

  if (!dataStr) return null;

  try {
    return { event: eventName, data: JSON.parse(dataStr) };
  } catch {
    return { event: eventName, data: dataStr };
  }
}
