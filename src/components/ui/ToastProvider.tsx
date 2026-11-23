import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { IconDefaults } from "./Icon";

type Tone = "success" | "info" | "warning";
/** گزینه‌های اعلان کوتاه؛ `undo` دکمه‌ی «بازگردانی» نشان می‌دهد */
export type ToastOptions = { tone?: Tone; undo?: () => void; undoLabel?: string; duration?: number };
type ToastItem = { id: number; message: string; tone: Tone; undo?: () => void; undoLabel?: string };

const toneIcon: Record<Tone, { cls: string; icon: typeof CircleCheck }> = {
  success: { cls: "text-emerald-600", icon: CircleCheck },
  info: { cls: "text-info", icon: Info },
  warning: { cls: "text-amber-600", icon: TriangleAlert },
};

/** امضای قدیمی `notify(text, tone)` و امضای جدید `notify(text, { undo })` هر دو پذیرفته می‌شوند */
type Notify = (message: string, toneOrOptions?: Tone | ToastOptions) => void;

const ToastContext = createContext<{ notify: Notify } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const notify = useCallback<Notify>(
    (message, toneOrOptions) => {
      const opts: ToastOptions = typeof toneOrOptions === "string" ? { tone: toneOrOptions } : (toneOrOptions ?? {});
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, message, tone: opts.tone ?? "success", undo: opts.undo, undoLabel: opts.undoLabel }]);
      setTimeout(() => dismiss(id), opts.duration ?? (opts.undo ? 6000 : 3500));
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      <IconDefaults>{children}</IconDefaults>
      <div
        className="fixed bottom-20 lg:bottom-5 start-5 z-[60] flex flex-col gap-2 w-[min(22rem,calc(100vw-2.5rem))]"
        dir="rtl"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const { cls, icon: Icon } = toneIcon[t.tone];
          return (
            <div
              key={t.id}
              className="flex items-start gap-2.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)] text-ink-900 px-3.5 py-3 text-sm leading-6 shadow-lg animate-toastin"
            >
              <Icon size={20} strokeWidth={1.5} className={`shrink-0 ${cls}`} />
              <span className="flex-1 min-w-0">{t.message}</span>
              {t.undo && (
                <button
                  type="button"
                  onClick={() => {
                    t.undo?.();
                    dismiss(t.id);
                  }}
                  className="shrink-0 font-bold text-[var(--color-link)] hover:underline underline-offset-4"
                >
                  {t.undoLabel ?? "بازگردانی"}
                </button>
              )}
              <button type="button" onClick={() => dismiss(t.id)} aria-label="بستن" className="shrink-0 text-ink-400 hover:text-ink-700 mt-0.5">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
