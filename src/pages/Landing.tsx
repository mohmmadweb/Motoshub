import { Link } from "react-router-dom";
import { Building2, Users, BookOpen, KanbanSquare, ShieldCheck, ArrowLeft, CheckCircle2, Network } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import PublicFooter from "../components/PublicFooter";
import { holdings, companies } from "../data/tenancy";

const modules = [
  { icon: Users, title: "شبکه اجتماعی سازمانی", desc: "گروه، انجمن، رویداد، گپ، اعلان و اخبار داخلی برای واحدها و هلدینگ‌ها" },
  { icon: BookOpen, title: "مدیریت دانش", desc: "آرشیو اسناد، قراردادها و مصوبات با جستجوی پیشرفته و دسته‌بندی" },
  { icon: KanbanSquare, title: "مدیریت پروژه و تسک", desc: "بورد، گانت چارت، بودجه و گزارش پیشرفت طرح‌ها و پروژه‌ها" },
  { icon: Building2, title: "چندسازمانی (Multi-tenant)", desc: "هر مشتری، فضای کاری، اعضا و برند کاملاً مستقل خودش را دارد" },
];

// آمار معنادار برای بازدیدکننده — از ساختار واقعی سازمان، نه اصطلاحات داخلی تیم فنی
const totalUsers = companies.reduce((s, c) => s + c.users, 0);
const stats = [
  { value: holdings.length.toLocaleString("fa-IR"), label: "هلدینگ زیرمجموعه" },
  { value: companies.length.toLocaleString("fa-IR"), label: "شرکت متصل" },
  { value: totalUsers.toLocaleString("fa-IR"), label: "کاربر سازمانی" },
];

export default function Landing() {
  return (
    <div dir="rtl" className="min-h-screen bg-white flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* هیرو — تصویر تمام‌عرض؛ عنوان و متن داخل خود هیرو (بازبینی UX) */}
        <section
          id="top"
          className="relative flex items-center min-h-[26rem] lg:min-h-[30rem]"
          style={{ backgroundImage: "url(/img/meeting.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="absolute inset-0 bg-gradient-to-l from-navy-950/95 via-navy-900/85 to-navy-900/60" />
          <div className="relative px-6 lg:px-16 max-w-7xl mx-auto w-full py-14">
            <div className="max-w-2xl">
              {/* برچسب معرفی — متن ساده، نه چیزی شبیه دکمه */}
              <p className="text-[12px] font-semibold text-brand-300 tracking-wide mb-4">
                پلتفرم شبکه اجتماعی و فضای کاری سازمانی
              </p>
              <h1 className="text-3xl lg:text-[2.6rem] font-extrabold leading-[1.35] text-white">
                یک پلتفرم، چند سازمان مستقل —
                <br /> هر کدام با فضای کاری اختصاصی خودش
              </h1>
              <p className="text-navy-200 mt-5 text-[15px] leading-8">
                سامانه‌ی بنیاد مستضعفان ترکیبی از هسته‌ی اجتماعی سازمانی و موتور مدیریت پروژه/دانش است که به هر
                مجموعه، یک نمونه‌ی مستقل با اعضا، برند و دامنه‌ی خودش می‌دهد؛ با حفظ مرز سازمانی در تعامل بین مجموعه‌ها.
              </p>
              <div className="flex items-center gap-3 mt-8 flex-wrap">
                <Link to="/login" className="btn bg-brand-500 text-white hover:bg-brand-600 px-5 py-2.5">
                  مشاهده‌ی فضای کاری نمونه <ArrowLeft size={15} />
                </Link>
                <Link to="/public/news" className="btn bg-white/10 text-white border border-white/25 hover:bg-white/20 px-5 py-2.5">
                  مرور محتوای عمومی
                </Link>
              </div>

              <dl className="flex items-center gap-8 mt-10">
                {stats.map((s) => (
                  <div key={s.label}>
                    <dt className="sr-only">{s.label}</dt>
                    <dd className="text-2xl font-extrabold text-white">{s.value}</dd>
                    <dd className="text-[11.5px] text-navy-300 mt-0.5">{s.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* امکانات پلتفرم — عنوان بخش دیده می‌شود تا مقصد لینک منو روشن باشد */}
        <section id="modules" className="px-6 lg:px-16 py-14 max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl font-extrabold text-ink-900">امکانات پلتفرم</h2>
            <p className="text-sm text-ink-400 mt-2">چهار ستون اصلی سامانه — هر ماژول به‌صورت مستقل قابل فعال‌سازی است</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((m) => (
              <div key={m.title} className="card p-5">
                <span className="w-10 h-10 rounded-lg bg-navy-900 text-white flex items-center justify-center mb-3">
                  <m.icon size={18} />
                </span>
                <h3 className="font-bold text-sm mb-1.5 text-ink-900">{m.title}</h3>
                <p className="text-xs text-ink-500 leading-6">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* امنیت و انطباق — عنوان بخش با عنوان منو یکی است */}
        <section id="security" className="bg-navy-900 px-6 lg:px-16 py-14">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-xl font-extrabold text-white">امنیت و انطباق</h2>
              <p className="text-sm text-navy-300 mt-2">طراحی‌شده برای راهبری چندسازمانی با الزامات نهادهای نظارتی</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
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
                  <span className="font-semibold text-sm">آماده‌ی ارزیابی نهادهای نظارتی</span>
                </div>
                <p className="text-xs text-navy-200 leading-6">
                  ثبت کامل رخدادهای حساس (Audit Log)، آماده برای ارائه به نهادهایی مانند افتا، و پشتیبانی از
                  SSO/LDAP برای سازمان‌هایی با زیرساخت احراز هویت داخلی.
                </p>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 text-[11.5px] text-navy-300">
                  <Network size={13} className="text-brand-400" />
                  تفکیک کامل داده در سطح هلدینگ و شرکت — هر کاربر فقط محتوای دامنه‌ی خودش را می‌بیند.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
