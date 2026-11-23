import type { ReactNode } from "react";

/**
 * نشان/چیپ v6.8: ارتفاع ۲۴، گوشه‌ی کامل، ۱۲px.
 * `navy` نام قدیمیِ `solid` است (سازگاری).
 */
export type BadgeTone = "brand" | "success" | "warning" | "danger" | "info" | "neutral" | "solid" | "navy";

const tones: Record<BadgeTone, string> = {
  brand: "bg-teal-50 text-teal-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-rose-50 text-rose-700",
  info: "bg-info-soft text-info-fg",
  neutral: "bg-ink-100 text-ink-600",
  solid: "bg-brand-600 text-[var(--color-on-primary)]",
  navy: "bg-brand-600 text-[var(--color-on-primary)]",
};

/** رنگ نقطه‌ی کوچک کنار متن، هم‌خانواده با تُن */
const dots: Record<BadgeTone, string> = {
  brand: "text-teal-500",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-rose-600",
  info: "text-info",
  neutral: "text-ink-400",
  solid: "",
  navy: "",
};

export default function Badge({
  children,
  tone = "neutral",
  icon,
  dot,
  size = "md",
  className = "",
  title,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
  /** نقطه‌ی ۶px رنگی پیش از متن (مثل اولویت «فوری») */
  dot?: boolean;
  /** `sm` = برچسب وضعیت فشرده‌ی ردیف‌های بورد */
  size?: "md" | "sm";
  className?: string;
  title?: string;
}) {
  return (
    <span className={`tag-pill ${size === "sm" ? "tag-sm" : ""} ${tones[tone]} ${className}`} title={title}>
      {dot && <i className={`tag-dot ${dots[tone]}`} aria-hidden />}
      {icon}
      {children}
    </span>
  );
}
