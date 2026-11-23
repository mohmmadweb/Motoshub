import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** پشته‌ی لایه‌های باز: فقط بالاترین لایه به Esc و Tab پاسخ می‌دهد */
const overlayStack: object[] = [];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * رفتار مشترک دیالوگ و برگه‌ی کناری: Esc برای بستن، حبس فوکوس با Tab،
 * فوکوس اولیه روی پنل و بازگرداندن فوکوس به عنصر قبلی پس از بستن.
 */
export function useOverlayA11y(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const token = {};
    overlayStack.push(token);
    const prev = document.activeElement as HTMLElement | null;
    const panel = ref.current;
    if (panel && !panel.contains(document.activeElement)) {
      const auto = panel.querySelector<HTMLElement>("[autofocus], [data-autofocus]");
      (auto ?? panel).focus({ preventScroll: true });
    }
    const onKey = (e: KeyboardEvent) => {
      if (overlayStack[overlayStack.length - 1] !== token) return;
      if (e.key === "Escape") {
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      overlayStack.splice(overlayStack.indexOf(token), 1);
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [open, ref]);
}

/**
 * دیالوگ v6.8 (`.dlg`): گوشه‌ی ۲۰، padding ۲۴، عنوان ۱۸/۳۰، دکمه‌ی بستن ghost،
 * پرده‌ی --overlay، حبس فوکوس و بستن با Esc یا کلیک روی پرده.
 * `width` (کلاس max-w-*) برای سازگاری با فراخوانی‌های موجود حفظ شده؛ `wide` = ۴۴rem.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
  width,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** نوار پایین ثابت (دکمه‌ی اصلی سپس «انصراف») */
  footer?: ReactNode;
  wide?: boolean;
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOverlayA11y(ref, open, onClose);
  if (!open) return null;
  const maxW = width ?? (wide ? "max-w-[44rem]" : "max-w-lg");
  // پورتال به body تا پوشش تیره کل صفحه (از جمله منوی کناری) را بگیرد
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-[var(--color-overlay)] animate-fadein" onClick={onClose} data-sheet-scrim />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative w-full ${maxW} bg-[var(--color-card)] text-ink-900 rounded-2xl shadow-lg max-h-[88vh] flex flex-col outline-none animate-rise`}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
          <div className="min-w-0">
            <h2 className="t-dialog text-ink-900">{title}</h2>
            {description && <p className="text-sm leading-6 text-ink-500 mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="btn btn-ghost btn-icon btn-sm shrink-0 -me-2"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-1">{children}</div>
        {footer && <div className="flex items-center gap-2 px-6 py-4 border-t border-[var(--color-border)]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** نام v6.8 برای همان مؤلفه */
export { Modal as Dialog };
