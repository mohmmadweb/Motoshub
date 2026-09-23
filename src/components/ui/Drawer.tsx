import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export default function Drawer({
  open,
  onClose,
  title,
  children,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  // بستن با کلید Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end" dir="rtl">
      <div className="absolute inset-0 bg-ink-900/30" onClick={onClose} />
      <div className={`relative w-full ${width} bg-white h-full shadow-2xl flex flex-col animate-in`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <h2 className="font-bold text-sm">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
