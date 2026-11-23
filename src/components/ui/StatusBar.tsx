const toFa = (n: number) => n.toLocaleString("fa-IR");

export type StatusTone = "success" | "warning" | "danger" | "info" | "accent" | "primary" | "neutral";

const fills: Record<StatusTone, string> = {
  success: "bg-emerald-600",
  warning: "bg-amber-500",
  danger: "bg-rose-600",
  info: "bg-info",
  accent: "bg-teal-500",
  primary: "bg-brand-600",
  neutral: "bg-ink-300",
};

export type StatusSegment = { label: string; value: number; tone: StatusTone };

/** نوار وضعیت انباشته (v6.8 `.sbar`): ۱۴px با فاصله‌ی ۲px بین بخش‌ها + راهنما */
export default function StatusBar({
  segments,
  legend = true,
  className = "",
}: {
  segments: StatusSegment[];
  legend?: boolean;
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const shown = segments.filter((s) => s.value > 0);
  return (
    <div className={className}>
      <div className="flex h-3.5 gap-0.5 rounded-full overflow-hidden bg-ink-100" role="img" aria-label={segments.map((s) => `${s.label}: ${toFa(s.value)}`).join("، ")}>
        {total > 0 &&
          shown.map((s) => (
            <span key={s.label} className={`h-full ${fills[s.tone]}`} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label}: ${toFa(s.value)}`} />
          ))}
      </div>
      {legend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {segments.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 text-xs text-ink-600">
              <i className={`w-2.5 h-2.5 rounded-[3px] ${fills[s.tone]}`} aria-hidden />
              {s.label}
              <b className="font-bold text-ink-800">{toFa(s.value)}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
