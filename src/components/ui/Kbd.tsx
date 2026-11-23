import type { ReactNode } from "react";

/** کلید میان‌بُر (مثل «Ctrl K») — ۱۲px، گوشه‌ی ۶، چپ‌به‌راست */
export default function Kbd({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      dir="ltr"
      className={`inline-flex items-center h-6 px-1.5 rounded-[6px] border border-ink-200 bg-ink-50 text-ink-600 text-xs font-sans leading-none whitespace-nowrap ${className}`}
    >
      {children}
    </kbd>
  );
}
