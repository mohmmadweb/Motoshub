import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * دکمه‌ی سیستم طراحی (v6.8)
 * - `secondary` نام قدیمیِ `outline` است و همان ظاهر را می‌گیرد (سازگاری با صفحه‌های موجود).
 * - `tonal` همان «secondary» نمونه‌ی v6.8 است (زمینه‌ی فیروزه‌ای کم‌رنگ).
 * - `danger-outline` و `link` گونه‌های جدیدند؛ `iconOnly` دکمه‌ی مربعی می‌سازد.
 */
export type ButtonVariant = "primary" | "secondary" | "outline" | "tonal" | "ghost" | "danger" | "danger-outline" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-outline",
  outline: "btn-outline",
  tonal: "btn-tonal",
  ghost: "btn-ghost",
  danger: "btn-danger",
  "danger-outline": "btn-danger-outline",
  link: "btn-link",
};

const sizes: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  /** دکمه‌ی فقط‌آیکون (مربع ۴۰/۳۶/۴۸)؛ برای دسترس‌پذیری aria-label بدهید */
  iconOnly?: boolean;
  /** نمایش چرخنده و غیرفعال‌سازی موقت */
  loading?: boolean;
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", iconOnly = false) {
  return `btn ${variants[variant]} ${sizes[size]}${iconOnly ? " btn-icon" : ""}`;
}

export default function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconOnly,
  loading,
  children,
  className = "",
  disabled,
  ...rest
}: Props) {
  return (
    <button
      className={`${buttonClass(variant, size, iconOnly)} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="btn-spinner" aria-hidden /> : icon}
      {children}
    </button>
  );
}
