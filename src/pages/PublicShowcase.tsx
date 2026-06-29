import { Link } from "react-router-dom";
import { Globe2, LogIn, Layers } from "lucide-react";
import PublicContentTabs from "../components/PublicContentTabs";
import SiteHeader from "../components/SiteHeader";

export default function PublicShowcase() {
  return (
    <div dir="rtl" className="min-h-screen bg-white flex flex-col">
      <SiteHeader />

      <section className="px-6 lg:px-16 pt-12 pb-6 max-w-3xl mx-auto text-center">
        <span className="tag-pill bg-emerald-50 text-emerald-700 border border-emerald-200 mx-auto inline-flex">
          <Globe2 size={12} /> محتوای عمومی
        </span>
        <h1 className="text-2xl lg:text-3xl font-extrabold leading-[1.4] text-ink-900 mt-4">
          نمونه‌ای از فعالیت عمومی سازمان‌های فعال روی موتوشاب
        </h1>
        <p className="text-ink-500 mt-4 text-sm leading-7 max-w-xl mx-auto">
          هر سازمان روی موتوشاب می‌تواند مشخص کند کدام موضوع انجمن، یادداشت بلاگ، رویداد، رسانه یا سند دانش به‌صورت
          عمومی منتشر شود. هر بخش، تب جداگانه‌ی خودش را دارد — بدون نیاز به ورود.
        </p>
      </section>

      <section className="px-6 lg:px-16 pb-16 max-w-5xl mx-auto flex-1 w-full">
        <PublicContentTabs linkMode="login" />
        <div className="card p-4 mt-6 flex items-center justify-between gap-3 bg-ink-50 border-ink-100">
          <p className="text-xs text-ink-500">برای مشاهده‌ی کامل، تعامل و عضویت در فضای کاری این سازمان وارد شوید.</p>
          <Link to="/login" className="btn bg-navy-900 text-white hover:bg-navy-800 text-xs px-3.5 py-2 shrink-0">
            <LogIn size={13} /> ورود
          </Link>
        </div>
      </section>

      <footer className="px-6 lg:px-16 py-6 text-center text-xs text-ink-400 border-t border-ink-100 flex items-center justify-center gap-2">
        <Layers size={14} /> پروتوتایپ داخلی — داده‌های این نسخه نمایشی است.
      </footer>
    </div>
  );
}
