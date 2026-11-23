import { useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import Pill, { type PillDot } from "./Pill";

export type FilterPill<T extends string> = { id: T; label: string; count?: number; dot?: PillDot };

/**
 * نوار فیلتر یک‌ردیفه‌ی v6.8 (`.q-bar`): قرص‌ها (با نقطه‌ی رنگی و شمارنده) + جستجو (flex-1) + انتخاب‌گرها.
 * زیر ۶۴۰px فقط قرص‌ها و جستجو می‌مانند و بقیه (children) پشت «فیلترهای بیشتر» با شمارنده‌ی فیروزه‌ای می‌روند.
 * `onClear` دکمه‌ی «پاک کردن» را نشان می‌دهد.
 */
export default function FilterBar<T extends string>({
  pills,
  active,
  onPill,
  search,
  onSearch,
  searchPlaceholder = "جستجو…",
  children,
  activeCount = 0,
  onClear,
  className = "",
}: {
  pills?: FilterPill<T>[];
  active?: T;
  onPill?: (id: T) => void;
  search?: string;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  /** انتخاب‌گرهای اضافه (select.input-field با min-w-[110px]) */
  children?: ReactNode;
  /** تعداد فیلترهای فعالِ پشت «فیلترهای بیشتر» */
  activeCount?: number;
  onClear?: () => void;
  className?: string;
}) {
  const [more, setMore] = useState(false);
  return (
    <div className={`flex flex-wrap items-center gap-2 px-5 py-3 border-b border-[var(--color-border)] max-sm:px-3 ${className}`}>
      {pills && pills.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto max-sm:w-full max-sm:pb-0.5" role="group" aria-label="فیلتر سریع">
          {pills.map((p) => (
            <Pill key={p.id} pressed={active === p.id} dot={p.dot} count={p.count} onClick={() => onPill?.(p.id)}>
              {p.label}
            </Pill>
          ))}
        </div>
      )}
      {onSearch && (
        <label className="relative flex-1 min-w-[12rem]">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search size={18} strokeWidth={1.5} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <input value={search ?? ""} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} className="input-field !pr-9" />
        </label>
      )}
      {children && (
        <>
          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            aria-expanded={more}
            className="sm:hidden btn btn-outline btn-sm"
          >
            <SlidersHorizontal size={16} strokeWidth={1.5} />
            فیلترهای بیشتر
            {activeCount > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-teal-500 text-[var(--color-navy-900)] text-xs font-bold inline-flex items-center justify-center">
                {activeCount.toLocaleString("fa-IR")}
              </span>
            )}
          </button>
          <div className={`${more ? "flex" : "hidden"} sm:flex flex-wrap items-center gap-2 max-sm:w-full [&_select]:min-w-[110px] sm:[&_select]:w-auto max-sm:[&>*]:flex-1`}>
            {children}
          </div>
        </>
      )}
      {onClear && (
        <button type="button" onClick={onClear} className="btn btn-ghost btn-sm">
          <X size={16} strokeWidth={1.5} />
          پاک کردن
        </button>
      )}
    </div>
  );
}
