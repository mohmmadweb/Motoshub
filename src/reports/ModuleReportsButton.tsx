// ---------------------------------------------------------------------------
// دکمه‌ی «گزارش‌ساز» برای سربرگ هر ماژول — گزارش‌ساز را در پنجره‌ی تقریباً تمام‌صفحه باز می‌کند.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BarChart3, X } from "lucide-react";
import Button from "../components/ui/Button";
import { ReportBuilder } from "./ReportBuilder";
import { moduleLabel, type ReportModule } from "./types";

export function ReportBuilderModal({
  open,
  onClose,
  module,
  defaultSourceId,
  initialReportId,
}: {
  open: boolean;
  onClose: () => void;
  module: ReportModule;
  defaultSourceId?: string;
  initialReportId?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // وقتی دیالوگ تأیید یا برگه‌ی تنظیمات باز است، Esc مال آن‌هاست
      if (e.key === "Escape" && !document.querySelector('[role="alertdialog"]')) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4" dir="rtl" role="dialog" aria-modal="true" aria-label={`گزارش‌ساز ${moduleLabel[module]}`}>
      <div className="absolute inset-0 bg-ink-900/45" onClick={onClose} />
      <div className="relative w-full max-w-7xl h-full sm:h-[calc(100vh-2rem)] bg-ink-50 sm:rounded-2xl shadow-2xl border border-ink-200 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-ink-200 bg-white">
          <span className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
            <BarChart3 size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-sm text-ink-900 truncate">گزارش‌ساز {moduleLabel[module]}</h2>
            <p className="text-[11px] text-ink-500 truncate">گزارش دلخواه بسازید، ذخیره کنید، به اشتراک بگذارید و به داشبورد بیاورید</p>
          </div>
          <button onClick={onClose} aria-label="بستن" className="w-9 h-9 rounded-lg hover:bg-ink-100 flex items-center justify-center shrink-0 text-ink-600">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 p-3 sm:p-4">
          <ReportBuilder module={module} defaultSourceId={defaultSourceId} initialReportId={initialReportId} />
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ModuleReportsButton({
  module,
  label = "گزارش‌ساز",
  defaultSourceId,
  variant = "secondary",
  size = "md",
}: {
  module: ReportModule;
  label?: string;
  defaultSourceId?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} icon={<BarChart3 size={14} />} onClick={() => setOpen(true)} title={`گزارش‌ساز ${moduleLabel[module]}`}>
        {label}
      </Button>
      <ReportBuilderModal open={open} onClose={() => setOpen(false)} module={module} defaultSourceId={defaultSourceId} />
    </>
  );
}

export default ModuleReportsButton;
