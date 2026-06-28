import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

type Tone = "success" | "info" | "warning";
type ToastItem = { id: number; message: string; tone: Tone };

const toneStyles: Record<Tone, { bg: string; icon: typeof CheckCircle2 }> = {
  success: { bg: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  info: { bg: "border-brand-200 bg-brand-50 text-brand-800", icon: Info },
  warning: { bg: "border-amber-200 bg-amber-50 text-amber-800", icon: AlertTriangle },
};

const ToastContext = createContext<{ notify: (message: string, tone?: Tone) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const notify = useCallback((message: string, tone: Tone = "success") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-full max-w-sm px-4" dir="rtl">
        {toasts.map((t) => {
          const { bg, icon: Icon } = toneStyles[t.tone];
          return (
            <div key={t.id} className={`flex items-start gap-2.5 rounded-lg border ${bg} px-3.5 py-2.5 text-xs shadow-lg`}>
              <Icon size={15} className="shrink-0 mt-0.5" />
              <span className="flex-1 leading-5">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
                <X size={13} />
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
