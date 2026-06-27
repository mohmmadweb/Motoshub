import { HelpCircle, Users, BookOpen, KanbanSquare, ShieldCheck, MessageCircleQuestion } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";

const guides = [
  { icon: Users, title: "شروع کار با گروه‌ها و انجمن", desc: "نحوه‌ی ایجاد گروه، دعوت اعضا و مدیریت پست‌ها" },
  { icon: BookOpen, title: "مدیریت دانش", desc: "بارگذاری سند، دسته‌بندی و جستجوی پیشرفته" },
  { icon: KanbanSquare, title: "مدیریت پروژه", desc: "ساخت تسک، اولویت‌بندی و خوانش گانت چارت" },
  { icon: ShieldCheck, title: "امنیت حساب کاربری", desc: "مدیریت نشست‌های فعال و ورود دومرحله‌ای" },
];

export default function Help() {
  return (
    <div>
      <PageHeader title="راهنما" description="راهنمای کامل کاربری و راهبری موتوشاب" icon={<HelpCircle size={18} />} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {guides.map((g) => (
          <div key={g.title} className="card p-4 flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-navy-900 text-white flex items-center justify-center shrink-0">
              <g.icon size={16} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-ink-900">{g.title}</h3>
              <p className="text-xs text-ink-500 mt-1">{g.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5 flex items-center gap-3 bg-brand-50 border-brand-200">
        <MessageCircleQuestion size={20} className="text-brand-700 shrink-0" />
        <p className="text-sm text-brand-800">سوال دیگری دارید؟ از طریق گفتگو با پشتیبانی فنی سازمان خود در تماس باشید.</p>
      </div>
    </div>
  );
}
