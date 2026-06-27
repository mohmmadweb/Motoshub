import type { ReactNode } from "react";

export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
}) {
  const toneMap: Record<string, string> = {
    neutral: "bg-ink-100 text-ink-600",
    brand: "bg-brand-50 text-brand-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700",
  };
  return (
    <div className="card p-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-xl font-bold text-ink-900 mt-1">{value}</p>
        {hint && <p className="text-[11px] text-ink-400 mt-1">{hint}</p>}
      </div>
      {icon && <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${toneMap[tone]}`}>{icon}</span>}
    </div>
  );
}
