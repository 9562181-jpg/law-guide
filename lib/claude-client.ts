import Anthropic from "@anthropic-ai/sdk";
import type {
  ChatMessage,
  ClassificationResult,
  DocumentContent,
  IncidentType,
  ParsedArticle,
  SSEEvent,
} from "./types";
import { buildClassifySystemPrompt, buildDocGenerateSystemPrompt, buildChatSystemPrompt } from "./prompts/system-prompt";
import { buildClassifyUserPrompt } from "./prompts/classify-prompt";
import { buildDocGenerateUserPrompt } from "./prompts/doc-generate-prompt";
import type { DocumentCode } from "./types";

const client = new Anthropic();

/** 분류·매뉴얼·채팅은 haiku (저비용·고속), 서류 생성은 sonnet (품질 우선) */
const MODEL_FAST = "claude-haiku-4-5-20251001";
const MODEL_QUALITY = "claude-sonnet-4-6";

/**
 * Claude 응답에서 JSON을 추출한다.
 * ```json ... ``` 블록이 있으면 그 안의 내용만, 없으면 전체를 파싱 시도.
 */
function extractJson<T>(text: string): T | null {
  // ```json ... ``` 블록 추출
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonBlockMatch ? jsonBlockMatch[1].trim() : text.trim();

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    // 마지막 시도: { 또는 [ 로 시작하는 부분 찾기
    const start = jsonStr.search(/[{[]/);
    if (start === -1) return null;

    try {
      return JSON.parse(jsonStr.slice(start)) as T;
    } catch {
      return null;
    }
  }
}

/**
 * 분류 + 매뉴얼 생성 (스트리밍).
 * SSE 이벤트를 yield하며, 첫 JSON 블록에서 분류 결과를 추출한다.
 */
export async function* classifyAndGenerateManual(
  reportContent: string,
  lawContext: string
): AsyncGenerator<SSEEvent> {
  const systemPrompt = buildClassifySystemPrompt(lawContext);
  const userPrompt = buildClassifyUserPrompt(reportContent);

  let fullText = "";
  let classificationEmitted = false;

  try {
    const stream = client.messages.stream({
      model: MODEL_FAST,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const chunk = event.delta.text;
        fullText += chunk;

        // 첫 JSON 블록이 완성되면 분류 결과 추출
        if (!classificationEmitted && fullText.includes("```json") && fullText.includes("```\n")) {
          const classification = extractJson<ClassificationResult>(fullText);
          if (classification?.incidentType) {
            classificationEmitted = true;
            yield {
              event: "classification",
              data: JSON.stringify(classification),
            };
          }
        }

        // 매뉴얼 텍스트 스트리밍
        yield {
          event: "manual",
          data: JSON.stringify({ chunk }),
        };
      }
    }

    yield { event: "done", data: "{}" };
  } catch (err) {
    const message = err instanceof Anthropic.APIError
      ? `Claude API 오류: ${err.status} ${err.message}`
      : `처리 중 오류: ${err instanceof Error ? err.message : String(err)}`;

    yield {
      event: "error",
      data: JSON.stringify({ message }),
    };
  }
}

/**
 * 서류 초안 생성 (비스트리밍).
 * Claude에게 JSON 형식으로 서류 내용을 받아 파싱한다.
 */
export async function generateDocuments(params: {
  originalInput: string;
  processingResult: string;
  incidentType: IncidentType;
  documentSet: DocumentCode[];
  lawArticles: ParsedArticle[];
}): Promise<DocumentContent[]> {
  const lawContext = params.lawArticles
    .map((a) => `${a.lawName} ${a.articleNumber}: ${a.content}`)
    .join("\n\n");

  const systemPrompt = buildDocGenerateSystemPrompt(lawContext);
  const userPrompt = buildDocGenerateUserPrompt(params);

  const response = await client.messages.create({
    model: MODEL_QUALITY,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const parsed = extractJson<DocumentContent | DocumentContent[]>(text);

  if (!parsed) {
    throw new Error("서류 생성 결과 JSON 파싱 실패");
  }

  return Array.isArray(parsed) ? parsed : [parsed];
}

/**
 * 추가 질문 처리 (스트리밍).
 * 대화 맥락을 유지하며 후속 질문에 응답한다.
 */
export async function* chat(
  messages: ChatMessage[],
  context: {
    incidentType: string;
    manualSummary: string;
    lawContext: string;
  }
): AsyncGenerator<string> {
  const systemPrompt = buildChatSystemPrompt(context);

  try {
    const stream = client.messages.stream({
      model: MODEL_FAST,
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  } catch (err) {
    const message = err instanceof Anthropic.APIError
      ? `Claude API 오류: ${err.status}`
      : "처리 중 오류가 발생했습니다.";
    yield `\n\n⚠️ ${message}`;
  }
}
