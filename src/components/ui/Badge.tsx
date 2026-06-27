import type { ReactNode } from "react";

export type BadgeTone = "brand" | "success" | "warning" | "danger" | "neutral" | "navy";

const tones: Record<BadgeTone, string> = {
  brand: "bg-brand-50 text-brand-700 border border-brand-200",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-rose-50 text-rose-700 border border-rose-200",
  neutral: "bg-ink-100 text-ink-600 border border-ink-200",
  navy: "bg-navy-700 text-white border border-navy-700",
};

export default function Badge({ children, tone = "neutral", icon }: { children: ReactNode; tone?: BadgeTone; icon?: ReactNode }) {
  return (
    <span className={`tag-pill ${tones[tone]}`}>
      {icon}
      {children}
    </span>
  );
}
