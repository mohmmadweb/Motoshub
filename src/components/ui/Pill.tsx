import type { ButtonHTMLAttributes, ReactNode } from "react";

const toFa = (n: number) => n.toLocaleString("fa-IR");

export type PillDot = "danger" | "warning" | "success" | "info" | "brand" | "neutral";

const dotColor: Record<PillDot, string> = {
  danger: "bg-rose-600",
  warning: "bg-amber-600",
  success: "bg-emerald-600",
  info: "bg-info",
  brand: "bg-teal-500",
  neutral: "bg-ink-400",
};

/**
 * دکمه‌ی قرصی فیلتر/تغییر حالت (v6.8 `.pill`): ۳۲px، گوشه‌ی کامل، ۱۳px.
 * حالت انتخاب با `pressed` (aria-pressed) — زمینه‌ی accent و متن پررنگ.
 */
export default function Pill({
  pressed = false,
  dot,
  count,
  icon,
  children,
  className = "",
  type = "button",
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  pressed?: boolean;
  dot?: PillDot;
  count?: number;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border text-[13px] leading-none whitespace-nowrap shrink-0 transition-colors ${
        pressed
          ? "bg-teal-50 border-teal-700 text-teal-700 font-bold"
          : "bg-[var(--color-card)] border-ink-200 text-ink-700 hover:bg-ink-50"
      } disabled:opacity-45 ${className}`}
      {...rest}
    >
      {dot && <i className={`w-2 h-2 rounded-full shrink-0 ${dotColor[dot]}`} aria-hidden />}
      {icon}
      {children}
      {count !== undefined && <span className={pressed ? "" : "text-ink-500"}>{toFa(count)}</span>}
    </button>
  );
}
