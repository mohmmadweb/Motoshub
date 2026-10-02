// دکمه‌ی شناور «گزارش مشکل» — از هر صفحه‌ی داشبورد یک تیکت فشرده برای تیم سازنده ثبت می‌کند.
// مسیر صفحه، عنوان صفحه، مرورگر، اندازه‌ی صفحه، واحد و نقش‌های کاربر و نسخه‌ی سامانه خودکار پیوست می‌شود.
// نیازمند TicketsProvider و TenancyProvider در بالای درخت است.
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bug, CheckCircle2 } from "lucide-react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import { useTenancy } from "../context/TenancyContext";
import { useTicketsMaybe } from "../context/TicketsContext";
import TicketForm from "../pages/tickets/TicketForm";
import type { Ticket } from "../pages/tickets/model";

export function ReportIssueButton({ className = "" }: { className?: string }) {
  const tk = useTicketsMaybe();
  const { hasPermission } = useTenancy();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<Ticket | null>(null);
  const [snap, setSnap] = useState<{ route: string; title: string } | null>(null);

  // در صفحه‌ی تیکت‌ها لازم نیست (دکمه‌ی «تیکت جدید» همان‌جاست)
  if (!tk || !hasPermission("tickets.create") || location.pathname.startsWith("/dashboard/tickets")) return null;

  const close = () => {
    setOpen(false);
    setDone(null);
  };

  return (
    <>
      <button
        onClick={() => {
          setSnap({ route: `${location.pathname}${location.search}`, title: document.title });
          setOpen(true);
        }}
        className={`fixed bottom-4 left-4 z-30 flex items-center gap-1.5 rounded-full bg-white border border-ink-200 shadow-lg text-ink-700 hover:text-brand-700 hover:border-brand-300 h-10 px-3 text-[12.5px] font-medium print:hidden ${className}`}
        aria-label="گزارش مشکل به تیم سازنده"
        title="گزارش مشکل یا درخواست به تیم سازنده"
      >
        <Bug size={16} className="shrink-0" />
        <span className="hidden sm:inline">گزارش مشکل</span>
      </button>

      <Modal open={open} onClose={close} title={done ? "تیکت ثبت شد" : "گزارش مشکل"} description={done ? undefined : `برای تیم سازنده‌ی موتوشاب — صفحه‌ی «${snap?.title ?? ""}» خودکار پیوست می‌شود`} width="max-w-xl">
        {done ? (
          <div className="text-center space-y-3 py-2">
            <span className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </span>
            <p className="text-sm text-ink-800">
              تیکت <span className="font-mono font-bold" dir="ltr">{done.id}</span> برای تیم سازنده ارسال شد.
            </p>
            <p className="text-[12px] text-ink-500">پاسخ‌ها در «تیکت پشتیبانی» و صندوق اعلان‌ها به شما اطلاع داده می‌شود.</p>
            <div className="flex justify-center gap-2 pt-1">
              <Button variant="ghost" onClick={close}>
                بستن
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const id = done.id;
                  close();
                  navigate(`/dashboard/tickets?id=${id}`);
                }}
              >
                مشاهده‌ی تیکت
              </Button>
            </div>
          </div>
        ) : (
          open && <TicketForm compact route={snap?.route} pageTitle={snap?.title} onCancel={close} onCreated={setDone} />
        )}
      </Modal>
    </>
  );
}

export default ReportIssueButton;
