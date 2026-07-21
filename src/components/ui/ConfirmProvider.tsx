import { createContext, useContext, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "./Button";

// دیالوگ تایید سراسری برای اقدامات مخرب (حذف، پاک‌سازی، مسدودسازی)
type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

const ConfirmContext = createContext<((opts: ConfirmOptions) => void) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);

  const close = () => setOpts(null);

  return (
    <ConfirmContext.Provider value={setOpts}>
      {children}
      {opts && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-label={opts.title} onClick={close}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink-900 leading-6">{opts.title}</p>
                {opts.message && <p className="text-xs text-ink-500 mt-1 leading-6">{opts.message}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                className="flex-1 justify-center"
                onClick={() => {
                  opts.onConfirm();
                  close();
                }}
              >
                {opts.confirmLabel ?? "بله، حذف کن"}
              </Button>
              <Button variant="secondary" className="flex-1 justify-center" onClick={close} autoFocus>
                انصراف
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
