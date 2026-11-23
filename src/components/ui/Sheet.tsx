import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useOverlayA11y } from "./Modal";

/**
 * برگه‌ی کناری v6.8 (`.sheet`): چسبیده به انتهای خطی (سمت چپ در RTL)، عرض min(560px,100%)،
 * سرآیند با «پیش‌عنوان» (مثل «کار · پروژه») + عنوان ۲۴/۳۶، بدنه‌ی پیمایشی ۲۰/۲۴،
 * و نوار پایین چسبان برای دکمه‌ها. ورود با انیمیشن sheetin.
 */
export default function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  actions,
  footer,
  children,
  width,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** خط کوچک بالای عنوان (نوع · والد) */
  eyebrow?: ReactNode;
  /** دکمه‌های کنار عنوان (پیش از دکمه‌ی بستن) */
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** کلاس عرض دلخواه (مثل max-w-lg)؛ پیش‌فرض ۵۶۰px */
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOverlayA11y(ref, open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end" dir="rtl">
      <div className="absolute inset-0 bg-[var(--color-overlay)] animate-fadein" onClick={onClose} data-sheet-scrim />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        data-sheet
        className={`relative w-full ${width ?? "max-w-[560px]"} h-full bg-[var(--color-card)] text-ink-900 shadow-lg flex flex-col outline-none animate-sheetin`}
      >
        <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-[var(--color-border)]">
          <div className="flex-1 min-w-0">
            {eyebrow && <p className="cap mb-0.5">{eyebrow}</p>}
            <h2 className="t-sheet text-ink-900 break-words max-sm:text-xl max-sm:leading-8">{title}</h2>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0 pt-1">{actions}</div>}
          <button type="button" onClick={onClose} aria-label="بستن" className="btn btn-outline btn-icon shrink-0">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center gap-2 flex-wrap px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-card)]">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** بخش درون برگه با عنوان ۱۶/۲۶ (فاصله‌ی بخش‌ها ۲۰px) */
export function SheetSection({ title, actions, children, className = "" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`[&+&]:mt-5 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 mb-2">
          {title && <h3 className="t-card text-ink-900">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
