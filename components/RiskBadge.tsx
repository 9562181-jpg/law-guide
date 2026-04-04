"use client";

interface RiskBadgeProps {
  text: string;
  level?: "high" | "medium" | "low";
}

export default function RiskBadge({ text, level = "high" }: RiskBadgeProps) {
  const colorMap = {
    high: "bg-red-100 text-red-800 border-red-300",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    low: "bg-green-100 text-green-800 border-green-300",
  };

  const iconMap = {
    high: "🔴",
    medium: "🟡",
    low: "🟢",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm font-medium ${colorMap[level]}`}
    >
      <span>{iconMap[level]}</span>
      {text}
    </span>
  );
}
