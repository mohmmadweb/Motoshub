import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  BookOpen,
  KanbanSquare,
  ShieldCheck,
  Layers,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

const modules = [
  { icon: Users, title: "شبکه اجتماعی سازمانی", desc: "گروه، انجمن، رویداد، گپ، اعلان و اخبار داخلی — هسته‌ی برگرفته از Motoshub" },
  { icon: BookOpen, title: "مدیریت دانش", desc: "آرشیو اسناد، قراردادها و مصوبات با جستجوی پیشرفته و دسته‌بندی" },
  { icon: KanbanSquare, title: "مدیریت پروژه و تسک", desc: "بورد، گانت چارت، بودجه و گزارش پیشرفت — هسته‌ی برگرفته از Mizito" },
  { icon: Building2, title: "چندسازمانی (Multi-tenant)", desc: "هر مشتری، فضای کاری، اعضا و برند کاملاً مستقل خودش را دارد" },
];

const stats = [
  { value: "۴+", label: "سازمان مستقل فعال" },
  { value: "۱۴", label: "ماژول قابل فعال‌سازی" },
  { value: "۱۲ هفته", label: "زمان استقرار MVP" },
];

export default function Landing() {
  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 lg:px-16 h-16 border-b border-ink-200">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-navy-900 flex items-center justify-center text-white">
            <Building2 size={18} />
          </span>
          <span className="font-bold text-ink-900">موتوشاب</span>
        </div>
        <Link to="/login" className="btn bg-navy-900 text-white hover:bg-navy-800 text-[13px] px-4 py-2">
          ورود به پلتفرم
        </Link>
      </header>

      <section className="px-6 lg:px-16 pt-16 pb-12 max-w-5xl mx-auto text-center">
        <span className="tag-pill bg-brand-50 text-brand-700 border border-brand-200 mx-auto inline-flex">
          پلتفرم شبکه اجتماعی و فضای کاری سازمانی
        </span>
        <h1 className="text-3xl lg:text-[2.75rem] font-extrabold leading-[1.3] text-ink-900 mt-5">
          یک پلتفرم، چند سازمان مستقل —
          <br /> هر کدام با فضای کاری اختصاصی خودش
        </h1>
        <p className="text-ink-500 mt-5 text-[15px] leading-8 max-w-2xl mx-auto">
          موتوشاب ترکیبی از هسته‌ی اجتماعی سازمانی و موتور مدیریت پروژه/دانش است که به هر مشتری، یک نمونه‌ی
          مستقل با اعضا، برند و دامنه‌ی خودش می‌دهد؛ با این قابلیت که در آینده اعضای سازمان‌های مختلف نیز
          بتوانند با حفظ مرز سازمانی، با هم در تعامل باشند.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link to="/login" className="btn bg-navy-900 text-white hover:bg-navy-800 px-5 py-2.5">
            مشاهده‌ی فضای کاری نمونه <ArrowLeft size={15} />
          </Link>
          <Link to="/app/admin" className="btn bg-white border border-ink-200 hover:bg-ink-50 px-5 py-2.5">
            پنل راهبری چندسازمانی
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-12 max-w-md mx-auto">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-xl font-bold text-navy-800">{s.value}</p>
              <p className="text-[11px] text-ink-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 lg:px-16 pb-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {modules.map((m) => (
          <div key={m.title} className="card p-5">
            <span className="w-10 h-10 rounded-lg bg-navy-900 text-white flex items-center justify-center mb-3">
              <m.icon size={18} />
            </span>
            <h3 className="font-bold text-sm mb-1.5 text-ink-900">{m.title}</h3>
            <p className="text-xs text-ink-500 leading-6">{m.desc}</p>
          </div>
        ))}
      </section>

      <section className="bg-navy-900 px-6 lg:px-16 py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-white font-bold text-lg mb-3">طراحی‌شده برای راهبری چندسازمانی</h2>
            <ul className="space-y-2.5 text-sm text-navy-200">
              {[
                "فعال/غیرفعال‌سازی هر ماژول بدون تأثیر بر سایر بخش‌ها",
                "برندسازی کامل: لوگو، رنگ، دامنه‌ی اختصاصی هر سازمان",
                "لایه‌ی امنیتی مستقل: کپچا، ضدویروس، محدودسازی نرخ درخواست",
                "گزارش‌گیری پیشرفته و داشبورد مدیریتی برای هیات‌مدیره",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-brand-400 shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5 bg-white/5 border-white/10">
            <div className="flex items-center gap-2 mb-3 text-white">
              <ShieldCheck size={18} className="text-brand-400" />
              <span className="font-semibold text-sm">امنیت و انطباق سازمانی</span>
            </div>
            <p className="text-xs text-navy-200 leading-6">
              ثبت کامل رخدادهای حساس (Audit Log)، آماده برای ارائه به نهادهایی مانند افتا، و پشتیبانی از
              SSO/LDAP برای سازمان‌هایی با زیرساخت احراز هویت داخلی.
            </p>
          </div>
        </div>
      </section>

      <footer className="px-6 lg:px-16 py-6 text-center text-xs text-ink-400 border-t border-ink-100 flex items-center justify-center gap-2">
        <Layers size={14} /> پروتوتایپ داخلی — داده‌های این نسخه نمایشی است.
      </footer>
    </div>
  );
}
