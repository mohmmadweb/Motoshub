import type { ReactNode } from "react";
import { Check } from "lucide-react";

export type StepState = "done" | "current" | "todo";
export type Step = { label: ReactNode; description?: ReactNode; state?: StepState; body?: ReactNode };

/**
 * گام‌شمار v6.8:
 * - `vertical` (`.fn`): نقطه‌ی شماره‌دار ۲۸px + ریل ۲px + متن/بدنه (روند صورت‌جلسه، نامه، گردش دانش)
 * - `horizontal` (`.stepper`): دایره‌های ۲۸px با خط اتصال ۲px
 * وضعیت هر گام از `state` یا در غیاب آن از `current` (اندیس گام جاری) به دست می‌آید.
 */
export default function Stepper({
  steps,
  current,
  orientation = "vertical",
  className = "",
}: {
  steps: Step[];
  current?: number;
  orientation?: "vertical" | "horizontal";
  className?: string;
}) {
  const stateOf = (s: Step, i: number): StepState =>
    s.state ?? (current === undefined ? "todo" : i < current ? "done" : i === current ? "current" : "todo");

  const dot = (st: StepState, i: number) => (
    <span
      className={`relative z-[1] w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${
        st === "done"
          ? "bg-brand-600 text-[var(--color-on-primary)]"
          : st === "current"
            ? "bg-teal-50 text-teal-700 ring-4 ring-teal-500/25 border border-teal-500"
            : "bg-ink-100 text-ink-500"
      }`}
      aria-hidden
    >
      {st === "done" ? <Check size={16} strokeWidth={2.5} /> : (i + 1).toLocaleString("fa-IR")}
    </span>
  );

  if (orientation === "horizontal") {
    return (
      <ol className={`flex items-start ${className}`}>
        {steps.map((s, i) => {
          const st = stateOf(s, i);
          return (
            <li key={i} className="flex-1 flex flex-col items-center text-center relative min-w-0" aria-current={st === "current" ? "step" : undefined}>
              {i > 0 && (
                <span className={`absolute top-3.5 end-1/2 w-full h-0.5 -translate-y-1/2 ${stateOf(steps[i - 1], i - 1) === "done" ? "bg-brand-600" : "bg-ink-200"}`} aria-hidden />
              )}
              {dot(st, i)}
              <span className={`mt-1.5 text-[13px] leading-5 px-1 ${st === "todo" ? "text-ink-500" : "text-ink-900 font-medium"}`}>{s.label}</span>
              {s.description && <span className="text-xs leading-5 text-ink-500 px-1">{s.description}</span>}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={className}>
      {steps.map((s, i) => {
        const st = stateOf(s, i);
        const last = i === steps.length - 1;
        return (
          <li key={i} className="relative flex gap-3 pb-5 last:pb-0" aria-current={st === "current" ? "step" : undefined}>
            {!last && <span className={`absolute top-7 bottom-0 start-[13px] w-0.5 ${st === "done" ? "bg-brand-600" : "bg-ink-200"}`} aria-hidden />}
            {dot(st, i)}
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={`text-sm leading-6 ${st === "todo" ? "text-ink-600" : "text-ink-900 font-bold"}`}>{s.label}</p>
              {s.description && <p className="text-[12.5px] leading-5 text-ink-500">{s.description}</p>}
              {s.body && <div className="mt-2">{s.body}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
