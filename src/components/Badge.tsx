import type { ReactNode } from "react";

type Tone = "brand" | "green" | "yellow" | "red" | "ink";

const tones: Record<Tone, string> = {
  brand: "bg-brand-100 text-brand-700",
  green: "bg-emerald-100 text-emerald-700",
  yellow: "bg-amber-100 text-amber-700",
  red: "bg-rose-100 text-rose-700",
  ink: "bg-ink-100 text-ink-600",
};

export default function Badge({ children, tone = "ink" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`tag-pill ${tones[tone]}`}>{children}</span>;
}
