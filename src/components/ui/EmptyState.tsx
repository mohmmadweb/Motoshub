import type { ReactNode } from "react";
import { EmptyLeaves } from "./brand-leaf";

/**
 * حالت خالی v6.8 (`.empty`): حاشیه‌ی خط‌چین، زمینه‌ی subtle، گوشه‌ی ۱۴،
 * برگ‌های برند پشت کاشی ۵۶px، عنوان پررنگ، توضیح کم‌رنگ و دکمه‌ی اختیاری.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** دکمه/لینک اقدام (مثلاً «ایجاد اولین مورد») */
  action?: ReactNode;
  /** بدون برگ‌ها و با فاصله‌ی کمتر — برای داخل کارت‌ها و جدول‌ها */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center text-center gap-2.5 rounded-xl border border-dashed border-ink-300 bg-ink-50 ${compact ? "px-5 py-6" : "px-5 py-9"} ${className}`}
    >
      {icon && (
        <span className="relative w-28 h-16 flex items-center justify-center mb-1">
          {!compact && <EmptyLeaves />}
          <span className="relative w-14 h-14 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs text-teal-700 flex items-center justify-center motion-safe:animate-[bob_5s_ease-in-out_infinite] [&_svg]:w-7 [&_svg]:h-7">
            {icon}
          </span>
        </span>
      )}
      <p className="text-[15px] font-bold text-ink-800">{title}</p>
      {description && <p className="text-sm leading-6 text-ink-500 max-w-[30rem]">{description}</p>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}
