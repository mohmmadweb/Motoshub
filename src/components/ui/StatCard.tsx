import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Progress from "./Progress";

/** شمارش رو به بالای اعداد (فقط برای مقدار عددی؛ با کاهش حرکت غیرفعال) */
export function useCountUp(target: number, ms = 700) {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [v, setV] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce || !Number.isFinite(target)) {
      setV(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Number.isInteger(target) ? Math.round(target * eased) : +(target * eased).toFixed(1));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduce]);
  return v;
}

function Value({ value }: { value: string | number }) {
  const n = useCountUp(typeof value === "number" ? value : 0);
  return <>{typeof value === "number" ? n.toLocaleString("fa-IR") : value}</>;
}

const toneMap = {
  neutral: "bg-teal-50 text-teal-700",
  brand: "bg-teal-50 text-teal-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-rose-50 text-rose-700",
} as const;

/**
 * کاشی شاخص (v6.8 `.kpi`): برچسب ۱۲/۲۰، مقدار ۲۸/۴۴، کاشی آیکون ۴۴×۴۴ فیروزه‌ای،
 * نوار پیشرفت و زیرنویس اختیاری. `variant="hero"` = کاشی شیشه‌ای روی قهرمان «امروز».
 * props قبلی (label/value/hint/icon/tone) بدون تغییر.
 */
export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  progress,
  href,
  onClick,
  variant = "card",
  className = "",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
  /** ۰ تا ۱۰۰ — نوار زیر مقدار */
  progress?: number;
  href?: string;
  onClick?: () => void;
  variant?: "card" | "hero";
  className?: string;
}) {
  if (variant === "hero") {
    const inner = (
      <>
        <b>
          <Value value={value} />
        </b>
        <span className="text-[13px] leading-5 text-white/85">{label}</span>
      </>
    );
    if (href) return <Link to={href} className={`hero-stat ${className}`}>{inner}</Link>;
    return (
      <button type="button" onClick={onClick} className={`hero-stat ${className}`}>
        {inner}
      </button>
    );
  }

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="cap">{label}</p>
        {/* اعداد بلند (مثل مبالغ ریالی) نباید کارت را از صفحه بیرون بزنند */}
        <p className="t-kpi text-ink-900 break-words">
          <Value value={value} />
        </p>
        {progress !== undefined && <Progress value={progress} size="sm" className="mt-2" label={label} />}
        {hint && <p className="cap mt-1">{hint}</p>}
      </div>
      {icon && (
        <span className={`w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0 [&_svg]:w-5 [&_svg]:h-5 ${toneMap[tone]}`}>{icon}</span>
      )}
    </>
  );
  const cls = `card p-5 flex items-start justify-between gap-3 text-start ${className}`;
  if (href) return <Link to={href} className={`${cls} card-link`}>{content}</Link>;
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={`${cls} card-link w-full`}>
        {content}
      </button>
    );
  return <div className={cls}>{content}</div>;
}
