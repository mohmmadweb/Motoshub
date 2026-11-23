import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TriangleAlert, CircleHelp } from "lucide-react";
import Button from "./Button";
import { useOverlayA11y } from "./Modal";

// دیالوگ تأیید سراسری (همان قاب دیالوگ v6.8) — پیش‌فرض برای اقدامات مخرب (حذف، پاک‌سازی، مسدودسازی)؛
// با tone="primary" برای تأیید اقدام‌های غیرمخرب (مثلاً «چک‌لیست کامل نیست»).
type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
};

const ConfirmContext = createContext<((opts: ConfirmOptions) => void) | null>(null);

function ConfirmDialog({ opts, close }: { opts: ConfirmOptions; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useOverlayA11y(ref, true, close);
  const danger = (opts.tone ?? "danger") === "danger";
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir="rtl" onClick={close}>
      <div className="absolute inset-0 bg-[var(--color-overlay)] animate-fadein" />
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-label={opts.title}
        tabIndex={-1}
        className="relative bg-[var(--color-card)] text-ink-900 rounded-2xl shadow-lg w-full max-w-[26rem] p-6 outline-none animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <span
            className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${danger ? "bg-rose-50 text-rose-600" : "bg-teal-50 text-teal-700"}`}
          >
            {danger ? <TriangleAlert size={20} strokeWidth={1.5} /> : <CircleHelp size={20} strokeWidth={1.5} />}
          </span>
          <div className="min-w-0">
            <p className="t-dialog text-ink-900">{opts.title}</p>
            {opts.message && <p className="text-sm text-ink-500 mt-1 leading-6">{opts.message}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={danger ? "danger" : "primary"}
            className="flex-1 justify-center"
            onClick={() => {
              opts.onConfirm();
              close();
            }}
          >
            {opts.confirmLabel ?? (danger ? "بله، حذف کن" : "تأیید")}
          </Button>
          <Button variant="ghost" className="flex-1 justify-center" onClick={close} data-autofocus>
            {opts.cancelLabel ?? "انصراف"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const close = () => setOpts(null);
  return (
    <ConfirmContext.Provider value={setOpts}>
      {children}
      {opts && <ConfirmDialog opts={opts} close={close} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
