// «+» ایجاد سریع (نوار بالا، v6.8): کارت‌هایی که به صفحه‌ی مقصد با ?new=… می‌روند و خود صفحه
// دیالوگ ایجاد را باز می‌کند (قرارداد C3). هر کارت فقط با مجوز دیدن صفحه‌ی مقصد نمایش داده می‌شود.
import { useNavigate } from "react-router-dom";
import { BookOpen, Briefcase, CalendarDays, CircleHelp, Contact, Mail, type LucideIcon } from "lucide-react";
import Modal from "./ui/Modal";
import { useTenancy } from "../context/TenancyContext";
import { useI18n } from "../i18n";

type Card = { id: string; title: string; hint: string; icon: LucideIcon; to: string; perm: string };

/** مقصدهای ایجاد (C3) */
export const quickCreateCards: Card[] = [
  { id: "task", title: "کار جدید", hint: "برای خودتان یا تیم", icon: Briefcase, to: "/activities?new=task", perm: "projects.tasks" },
  { id: "meeting", title: "جلسه جدید", hint: "زمان و شرکت‌کنندگان", icon: CalendarDays, to: "/events?new=meeting", perm: "events.list" },
  { id: "doc", title: "سند دانش", hint: "در مخزن دانش", icon: BookOpen, to: "/knowledge/documents?new=1", perm: "knowledge.upload" },
  { id: "question", title: "پرسش جدید", hint: "از همکاران بپرسید", icon: CircleHelp, to: "/forums?new=question", perm: "forum.list" },
  { id: "letter", title: "نامه جدید", hint: "پیش‌نویس در دبیرخانه", icon: Mail, to: "/secretariat?new=letter", perm: "secretariat.register" },
  { id: "customer", title: "پرونده مشتری", hint: "حقیقی یا حقوقی", icon: Contact, to: "/customers?new=customer", perm: "crm.manage" },
];

export default function QuickCreate({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { hasPermission } = useTenancy();
  const { t } = useI18n();
  const cards = quickCreateCards.filter((c) => hasPermission(c.perm));
  return (
    <Modal open={open} onClose={onClose} title={t("ایجاد سریع")} description="چه چیزی می‌خواهید بسازید؟">
      {cards.length === 0 ? (
        <p className="text-[14px] text-ink-500">در دسترسی فعلی موردی برای ایجاد ندارید.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {cards.map((c, i) => (
            <button
              key={c.id}
              type="button"
              data-autofocus={i === 0 ? true : undefined}
              onClick={() => {
                onClose();
                navigate(c.to);
              }}
              className="group flex flex-col items-center text-center gap-2 rounded-xl border border-border bg-card px-3 py-4 transition hover:-translate-y-0.5 hover:shadow-sm hover:border-teal-500 outline-none focus-visible:border-teal-500 focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              <span className="w-11 h-11 rounded-[10px] bg-teal-50 text-teal-700 flex items-center justify-center">
                <c.icon size={22} aria-hidden />
              </span>
              <span className="text-[15px] font-bold text-ink-900">{t(c.title)}</span>
              <span className="text-[12.5px] text-ink-500">{c.hint}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
