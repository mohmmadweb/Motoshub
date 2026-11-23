const toFa = (n: number) => n.toLocaleString("fa-IR");

export type ProgressTone = "accent" | "primary" | "success" | "warning" | "danger";

const fills: Record<ProgressTone, string> = {
  accent: "bg-teal-500",
  primary: "bg-brand-600",
  success: "bg-emerald-600",
  warning: "bg-amber-500",
  danger: "bg-rose-600",
};
const heights = { md: "h-2", sm: "h-1.5", xs: "h-1" } as const;

/**
 * نوار پیشرفت v6.8: ۸px (ردیف‌ها ۶/۴)، گوشه‌ی کامل، ریل خاکستری، پرشدگی فیروزه‌ای.
 * با `showValue` درصد کنار نوار نمایش داده می‌شود.
 */
export default function Progress({
  value,
  tone = "accent",
  size = "md",
  label,
  showValue,
  className = "",
}: {
  value: number;
  tone?: ProgressTone;
  size?: keyof typeof heights;
  label?: string;
  showValue?: boolean;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex-1 ${heights[size]} rounded-full bg-ink-100 overflow-hidden`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-label={label}
      >
        <div className={`h-full rounded-full origin-right animate-grow ${fills[tone]}`} style={{ width: `${v}%` }} />
      </div>
      {showValue && <span className="text-xs text-ink-500 tabular-nums shrink-0">{toFa(v)}٪</span>}
    </div>
  );
}
