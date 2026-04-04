"use client";

import { useState, useMemo } from "react";
import type { DocumentCode, DispositionType, IncidentType } from "@/lib/types";
import { DOCUMENT_NAMES } from "@/lib/types";
import { getRequiredDocuments } from "@/lib/law-map";

interface DocumentSection {
  heading?: string;
  body: string;
}

interface GeneratedDoc {
  type: DocumentCode;
  title: string;
  sections: DocumentSection[];
  fullText: string;
  metadata: { date: string; officer?: string; department?: string };
}

interface DocumentListProps {
  incidentType: IncidentType;
  originalInput: string;
}

const DISPOSITION_OPTIONS: { value: DispositionType; label: string }[] = [
  { value: "현장종결", label: "현장조치 종결 (A만)" },
  { value: "타부서인계_일반", label: "타부서 인계 - 일반 (A+C+B)" },
  { value: "타부서인계_절도", label: "타부서 인계 - 절도 (A+C)" },
  { value: "현행범체포", label: "현행범 체포 (A+D+B)" },
];

export default function DocumentList({
  incidentType,
  originalInput,
}: DocumentListProps) {
  const [processingResult, setProcessingResult] = useState("");
  const [dispositionType, setDispositionType] = useState<DispositionType>("타부서인계_일반");
  const [hasSeizure, setHasSeizure] = useState(false);
  const [documents, setDocuments] = useState<GeneratedDoc[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const requiredDocs = useMemo(() => {
    return getRequiredDocuments(incidentType, dispositionType, {
      hasSeizure,
      isDomesticViolence: incidentType === "가정폭력",
      isStalking: incidentType === "스토킹",
    });
  }, [incidentType, dispositionType, hasSeizure]);

  const handleGenerate = async () => {
    if (!processingResult.trim()) return;

    setIsGenerating(true);
    setError(null);
    setDocuments([]);
    setExpandedDoc(null);

    try {
      const response = await fetch("/api/generate-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalInput,
          processingResult: processingResult.trim(),
          incidentType,
          documentSet: requiredDocs,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "서류 생성 실패");
      }

      const data = await response.json();
      setDocuments(data.documents);
      // 첫 번째 서류 자동 펼침
      if (data.documents.length > 0) setExpandedDoc(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "서류 생성 중 오류");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // 모바일 fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <span>📄</span> 서류 초안 생성
      </h3>

      {/* 처리 유형 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          처리 유형
        </label>
        <select
          value={dispositionType}
          onChange={(e) => setDispositionType(e.target.value as DispositionType)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          disabled={isGenerating}
        >
          {DISPOSITION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 압수 여부 */}
      <label className="flex items-center gap-2.5 text-sm text-gray-700 py-1">
        <input
          type="checkbox"
          checked={hasSeizure}
          onChange={(e) => setHasSeizure(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          disabled={isGenerating}
        />
        압수물 있음 (압수경위서 추가)
      </label>

      {/* 생성 대상 서류 미리보기 */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
        <div className="text-xs font-medium text-blue-700 mb-1.5">생성 대상 서류</div>
        <div className="flex flex-wrap gap-1.5">
          {requiredDocs.map((code) => (
            <span
              key={code}
              className="inline-flex items-center rounded-md bg-white border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-800"
            >
              {DOCUMENT_NAMES[code]}
            </span>
          ))}
        </div>
      </div>

      {/* 처리 결과 입력 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          처리 결과를 입력하세요
        </label>
        <textarea
          value={processingResult}
          onChange={(e) => setProcessingResult(e.target.value)}
          placeholder="예: 피해자 분리 완료, 가해자 남편 김OO(1985.3.15)에 대해 긴급임시조치 제1호(퇴거) 신청..."
          className="w-full min-h-[120px] rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition resize-y"
          disabled={isGenerating}
        />
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || !processingResult.trim()}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3.5 text-white font-medium hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition text-sm"
      >
        {isGenerating ? `서류 ${requiredDocs.length}건 생성 중...` : `서류 ${requiredDocs.length}건 초안 생성`}
      </button>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 생성된 서류 초안 목록 */}
      {documents.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="text-sm font-medium text-gray-500">
            초안 생성 완료 ({documents.length}건)
          </div>

          {documents.map((doc, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-white overflow-hidden"
            >
              {/* 서류 헤더 (탭 역할) */}
              <button
                type="button"
                onClick={() => setExpandedDoc(expandedDoc === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 text-sm">
                    {doc.title}
                  </div>
                  {expandedDoc !== i && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">
                      {doc.fullText.slice(0, 80)}...
                    </div>
                  )}
                </div>
                <span className="ml-2 text-gray-400 text-xs shrink-0">
                  {expandedDoc === i ? "접기" : "펼치기"}
                </span>
              </button>

              {/* 서류 본문 (펼쳤을 때) */}
              {expandedDoc === i && (
                <div className="border-t border-gray-200">
                  {/* 복사 버튼 */}
                  <div className="flex justify-end px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <button
                      type="button"
                      onClick={() => handleCopy(doc.fullText, i)}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 active:bg-blue-800 transition"
                    >
                      {copiedIndex === i ? "복사됨!" : "전체 복사"}
                    </button>
                  </div>

                  {/* 본문 내용 */}
                  <div className="px-4 py-4 space-y-4">
                    {doc.sections.map((section, si) => (
                      <div key={si}>
                        {section.heading && (
                          <div className="font-semibold text-sm text-gray-800 mb-1.5 pb-1 border-b border-gray-100">
                            {section.heading}
                          </div>
                        )}
                        {section.body && (
                          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {section.body}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 면책 */}
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs text-gray-400 italic">
                      ※ AI가 생성한 초안입니다. 반드시 검토·수정 후 사용하세요.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
