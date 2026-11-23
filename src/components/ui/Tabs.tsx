import type { ReactNode } from "react";

export type TabItem<T extends string> = {
  id: T;
  label: string;
  count?: number;
  icon?: ReactNode;
  /** فقط در گونه‌ی subnav (توضیح ۱۲px زیر عنوان) */
  description?: string;
};

/**
 * زبانه‌ها (v6.8):
 * - `underline` (پیش‌فرض): ۱۴px، زبانه‌ی فعال فیروزه‌ای پررنگ با خط زیر teal-500
 * - `pill`: قرص‌های ۳۲px (گفتگو، فیلترها)
 * - `subnav`: فهرست کارتی عمودی چسبان با آیکون + عنوان + توضیح + شمارنده (تنظیمات، مدیریت دانش)
 */
export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  variant = "underline",
  className,
  ariaLabel,
}: {
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  variant?: "underline" | "pill" | "subnav";
  /** کلاس ظرف؛ اگر داده نشود فاصله‌ی پیش‌فرض قبلی (mb-5) برای underline حفظ می‌شود */
  className?: string;
  ariaLabel?: string;
}) {
  const count = (n: number | undefined, on: boolean) =>
    n !== undefined && (
      <span
        className={`min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full text-xs font-bold leading-none ${
          on ? "bg-teal-50 text-teal-700" : "bg-ink-100 text-ink-500"
        }`}
      >
        {n.toLocaleString("fa-IR")}
      </span>
    );

  if (variant === "pill") {
    return (
      <div role="tablist" aria-label={ariaLabel} className={`flex items-center gap-2 overflow-x-auto ${className ?? ""}`}>
        {tabs.map((t) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(t.id)}
              className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border text-[13px] whitespace-nowrap shrink-0 transition-colors ${
                on ? "bg-teal-50 border-teal-700 text-teal-700 font-bold" : "bg-[var(--color-card)] border-ink-200 text-ink-600 hover:bg-ink-50"
              }`}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && <span className={on ? "" : "text-ink-500"}>{t.count.toLocaleString("fa-IR")}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "subnav") {
    return (
      <nav aria-label={ariaLabel} className={`card p-2 flex flex-col gap-0.5 md:sticky md:top-20 ${className ?? ""}`}>
        {tabs.map((t) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => onChange(t.id)}
              className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-start transition-colors ${
                on ? "bg-teal-50 text-teal-700" : "text-ink-800 hover:bg-ink-100"
              }`}
            >
              {t.icon && <span className={`shrink-0 mt-0.5 [&_svg]:w-5 [&_svg]:h-5 ${on ? "[&_svg]:stroke-[2.25]" : "text-ink-500"}`}>{t.icon}</span>}
              <span className="flex-1 min-w-0">
                <span className={`block text-sm leading-[22px] ${on ? "font-bold" : ""}`}>{t.label}</span>
                {t.description && <span className={`block text-xs leading-5 ${on ? "text-teal-700/80" : "text-ink-500"}`}>{t.description}</span>}
              </span>
              {count(t.count, on)}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <div role="tablist" aria-label={ariaLabel} className={`flex items-center gap-1 border-b border-ink-100 overflow-x-auto ${className ?? "mb-5"}`}>
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${
              on ? "border-teal-500 text-teal-700 font-bold" : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            {t.icon}
            {t.label}
            {count(t.count, on)}
          </button>
        );
      })}
    </div>
  );
}
