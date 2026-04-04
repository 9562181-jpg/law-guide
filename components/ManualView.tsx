"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ClassificationResult, ManualContent, ParsedArticle } from "@/lib/types";
import RiskBadge from "./RiskBadge";

interface ManualViewProps {
  classification: ClassificationResult | null;
  manual: ManualContent | null;
  streamingText: string;
  isStreaming: boolean;
}

export default function ManualView({
  classification,
  manual,
  streamingText,
  isStreaming,
}: ManualViewProps) {
  return (
    <div className="space-y-6">
      {/* 분류 결과 배지 */}
      {classification && (
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">
            {classification.incidentType}
            {classification.subType && ` (${classification.subType})`}
          </span>
          <span className="text-sm text-gray-500">{classification.summary}</span>
        </div>
      )}

      {/* law-map 기반 매뉴얼 데이터 */}
      {manual && (
        <>
          {/* 리스크 플래그 */}
          {manual.riskFlags.length > 0 && (
            <Section title="리스크 플래그" icon="⚠️">
              <div className="flex flex-wrap gap-2">
                {manual.riskFlags.map((flag, i) => (
                  <RiskBadge key={i} text={flag} level="high" />
                ))}
              </div>
            </Section>
          )}

          {/* 현장 처리 절차 */}
          {manual.procedure.length > 0 && (
            <Section title="현장 처리 절차" icon="📋">
              <ol className="space-y-1.5 text-sm text-gray-700">
                {manual.procedure.map((step, i) => (
                  <li
                    key={i}
                    className={step.startsWith("  ") ? "ml-6 text-gray-500" : ""}
                  >
                    {step}
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {/* 필요 증거 체크리스트 */}
          {manual.evidence.length > 0 && (
            <Section title="필요 증거 체크리스트" icon="📎">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-gray-700">
                {manual.evidence.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">☐</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* 관련 법령 */}
          {manual.lawArticles.length > 0 && (
            <Section title="관련 법령" icon="📖">
              <div className="space-y-3">
                {manual.lawArticles.map((article, i) => (
                  <LawArticleCard key={i} article={article} />
                ))}
              </div>
            </Section>
          )}

          {/* 예상 필요 서류 */}
          {manual.requiredDocuments.length > 0 && (
            <Section title="예상 필요 서류" icon="📄">
              <div className="flex flex-wrap gap-2">
                {manual.requiredDocuments.map((code) => (
                  <span
                    key={code}
                    className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {/* Claude 스트리밍 텍스트 — 마크다운 렌더링 */}
      {streamingText && (
        <Section title="AI 분석" icon="🤖">
          <div className="prose prose-sm max-w-none text-gray-700 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_li]:text-sm [&_p]:text-sm [&_p]:mb-2 [&_strong]:text-gray-900 [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-500">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {streamingText}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function LawArticleCard({ article }: { article: ParsedArticle }) {
  return (
    <details className="group rounded-lg border border-gray-200 bg-gray-50">
      <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 transition">
        {article.lawName} {article.articleNumber}
        {article.articleTitle && ` (${article.articleTitle})`}
      </summary>
      <div className="px-4 py-3 text-sm text-gray-600 border-t border-gray-200 whitespace-pre-wrap">
        {article.content || "[조문 내용 없음]"}
      </div>
    </details>
  );
}
