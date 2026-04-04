"use client";

import { useState, useCallback } from "react";
import InputForm from "@/components/InputForm";
import ManualView from "@/components/ManualView";
import DocumentList from "@/components/DocumentList";
import ChatPanel from "@/components/ChatPanel";
import { fetchSSE } from "@/lib/sse-client";
import type {
  AppPhase,
  ChatMessage,
  ClassificationResult,
  DocumentCode,
  IncidentType,
  ManualContent,
  ParsedArticle,
} from "@/lib/types";

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>("input");
  const [reportContent, setReportContent] = useState("");
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [manual, setManual] = useState<ManualContent | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 채팅 상태
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStreamingText, setChatStreamingText] = useState("");
  const [isChatStreaming, setIsChatStreaming] = useState(false);

  // 법령 컨텍스트 (채팅에서 사용)
  const [lawContext, setLawContext] = useState("");

  const handleReset = useCallback(() => {
    setPhase("input");
    setReportContent("");
    setClassification(null);
    setManual(null);
    setStreamingText("");
    setIsStreaming(false);
    setError(null);
    setChatMessages([]);
    setChatStreamingText("");
    setLawContext("");
  }, []);

  const handleSubmit = useCallback(
    async (input: string, mode: "classify" | "generate") => {
      setReportContent(input);
      setError(null);
      setStreamingText("");
      setClassification(null);
      setManual(null);

      if (mode === "classify") {
        setPhase("analyzing");
        setIsStreaming(true);

        try {
          for await (const event of fetchSSE("/api/classify", { input })) {
            switch (event.event) {
              case "classification": {
                const data = event.data as ClassificationResult;
                setClassification(data);
                break;
              }
              case "manual_data": {
                const data = event.data as {
                  riskFlags: string[];
                  evidence: string[];
                  procedure: string[];
                  requiredDocuments: DocumentCode[];
                };
                setManual((prev) => ({
                  incidentType: (prev?.incidentType ?? "기타") as IncidentType,
                  procedure: data.procedure,
                  riskFlags: data.riskFlags,
                  evidence: data.evidence,
                  judgmentCriteria: [],
                  requiredDocuments: data.requiredDocuments,
                  lawArticles: prev?.lawArticles ?? [],
                }));
                break;
              }
              case "law": {
                const data = event.data as {
                  articles: ParsedArticle[];
                  formatted: string;
                };
                setLawContext(data.formatted);
                setManual((prev) =>
                  prev ? { ...prev, lawArticles: data.articles } : null
                );
                break;
              }
              case "manual": {
                const data = event.data as { chunk: string };
                setStreamingText((prev) => prev + data.chunk);
                break;
              }
              case "done":
                setPhase("result");
                break;
              case "error": {
                const data = event.data as { message: string };
                setError(data.message);
                setPhase("result");
                break;
              }
            }
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "분석 중 오류 발생");
          setPhase("result");
        } finally {
          setIsStreaming(false);
        }
      } else {
        setPhase("generating_doc");
      }
    },
    []
  );

  const incidentType: IncidentType = classification?.incidentType ?? "기타";

  const handleChatSend = useCallback(
    async (message: string) => {
      const newMessages: ChatMessage[] = [
        ...chatMessages,
        { role: "user", content: message },
      ];
      setChatMessages(newMessages);
      setIsChatStreaming(true);
      setChatStreamingText("");

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages,
            context: {
              incidentType: classification?.incidentType ?? "",
              manualSummary: streamingText.slice(0, 500),
              lawContext,
            },
          }),
        });

        if (!response.ok) throw new Error("채팅 API 오류");
        if (!response.body) throw new Error("응답 스트림 없음");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.trim()) continue;
            const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;

            const raw = dataLine.slice(6);
            if (raw === "[DONE]") continue;

            try {
              const parsed = JSON.parse(raw) as { text?: string; error?: string };
              if (parsed.text) {
                fullResponse += parsed.text;
                setChatStreamingText(fullResponse);
              }
            } catch {
              // 파싱 실패 무시
            }
          }
        }

        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: fullResponse },
        ]);
        setChatStreamingText("");
      } catch (err) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `오류: ${err instanceof Error ? err.message : "알 수 없는 오류"}`,
          },
        ]);
      } finally {
        setIsChatStreaming(false);
      }
    },
    [chatMessages, classification, streamingText, lawContext]
  );

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1
            className="text-lg font-bold text-gray-900 cursor-pointer"
            onClick={handleReset}
          >
            🚔 112 경찰 처리 보조 시스템
          </h1>
          {phase !== "input" && (
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              새 신고
            </button>
          )}
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 입력 단계 */}
        {phase === "input" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <InputForm onSubmit={handleSubmit} />
          </div>
        )}

        {/* 분석 중 / 결과 */}
        {(phase === "analyzing" || phase === "result") && (
          <div className="space-y-6">
            {/* 원본 입력 표시 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-500 mb-1">신고 내용</div>
              <div className="text-sm text-gray-800">{reportContent}</div>
            </div>

            {/* 에러 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* 매뉴얼 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <ManualView
                classification={classification}
                manual={manual}
                streamingText={streamingText}
                isStreaming={isStreaming}
              />
            </div>

            {/* 서류 생성 (결과 단계에서만) */}
            {phase === "result" && classification && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <DocumentList
                  incidentType={incidentType}
                  originalInput={reportContent}
                />
              </div>
            )}

            {/* 추가 질문 채팅 */}
            {phase === "result" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <ChatPanel
                  messages={chatMessages}
                  onSendMessage={handleChatSend}
                  isStreaming={isChatStreaming}
                  streamingText={chatStreamingText}
                />
              </div>
            )}
          </div>
        )}

        {/* 서류 생성 모드 (직접 진입) */}
        {phase === "generating_doc" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-500 mb-1">신고 내용</div>
              <div className="text-sm text-gray-800">{reportContent}</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <DocumentList
                incidentType="기타"
                originalInput={reportContent}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
