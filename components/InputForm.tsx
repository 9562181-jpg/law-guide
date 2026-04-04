"use client";

import { useState } from "react";

const EXAMPLE_INPUTS = [
  {
    label: "가정폭력",
    text: "남편이 아내를 때렸다고 신고, 아이 2명 있음. 피해자가 얼굴 부위 맞았다고 함.",
  },
  {
    label: "폭행상해",
    text: "술집 앞에서 시비 붙어서 한 명이 다른 사람 얼굴을 주먹으로 때림. 피해자 코피 나고 있음.",
  },
  {
    label: "절도",
    text: "편의점에서 물건 훔쳐 달아난 남성. CCTV 확인됨. 피해품은 소주 2병, 과자류.",
  },
];

interface InputFormProps {
  onSubmit: (input: string, mode: "classify" | "generate") => void;
  disabled?: boolean;
}

export default function InputForm({ onSubmit, disabled }: InputFormProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (mode: "classify" | "generate") => {
    if (input.trim().length < 5) return;
    onSubmit(input.trim(), mode);
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="report-input"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          신고 내용을 입력하세요
        </label>
        <textarea
          id="report-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="예: 남편이 아내를 때렸다고 신고, 아이 2명 있음..."
          className="w-full min-h-[120px] rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition resize-y"
          disabled={disabled}
        />
      </div>

      {/* 예시 입력 버튼 */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-500 self-center">예시:</span>
        {EXAMPLE_INPUTS.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => setInput(ex.text)}
            className="rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition"
            disabled={disabled}
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleSubmit("classify")}
          disabled={disabled || input.trim().length < 5}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-3.5 text-white font-medium hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition text-sm"
        >
          매뉴얼 조회
        </button>
        <button
          type="button"
          onClick={() => handleSubmit("generate")}
          disabled={disabled || input.trim().length < 5}
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-3.5 text-white font-medium hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition text-sm"
        >
          서류 생성
        </button>
      </div>
    </div>
  );
}
