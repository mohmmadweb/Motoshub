import { Link } from "react-router-dom";
import { ExternalLink, Layers } from "lucide-react";
import CreditFooter from "./CreditFooter";

const quickLinks = [
  { to: "/public/news", label: "اخبار بنیاد" },
  { to: "/public/events", label: "رویدادها و جلسات" },
  { to: "/public/knowledge", label: "پایگاه دانش" },
  { to: "/public/forum", label: "انجمن پرسش‌وپاسخ" },
  { to: "/public/media", label: "تصاویر و ویدیو" },
];

const bonyadLinks = [
  { href: "https://irmf.ir", label: "پایگاه اطلاع‌رسانی بنیاد مستضعفان" },
  { href: "https://irmf.ir/News", label: "اخبار رسمی بنیاد" },
  { href: "https://irmf.ir/درباره-بنیاد", label: "درباره‌ی بنیاد" },
];

/** فوتر مشترک همه‌ی صفحه‌های عمومی — پیوندهای مفید بنیاد + دسترسی سریع */
export default function PublicFooter() {
  return (
    <footer className="bg-navy-950 text-navy-300">
      <div className="px-6 lg:px-16 max-w-7xl mx-auto py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="h-9 rounded-lg bg-white flex items-center justify-center px-1.5">
              <img src="/bonyad-logo.png" alt="بنیاد مستضعفان انقلاب اسلامی" className="h-7 w-auto" />
            </span>
            <span className="font-bold text-white text-sm">بنیاد مستضعفان انقلاب اسلامی</span>
          </div>
          <p className="text-xs leading-6 text-navy-300 max-w-xs">
            شبکه اجتماعی و فضای کاری سازمانی بنیاد — بستر یکپارچه‌ی ارتباط، دانش و همکاری
            هلدینگ‌ها و شرکت‌های زیرمجموعه.
          </p>
        </div>

        <nav aria-label="دسترسی سریع">
          <p className="text-xs font-bold text-white mb-3">دسترسی سریع</p>
          <ul className="space-y-2">
            {quickLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-xs text-navy-300 hover:text-white transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="پیوندهای بنیاد">
          <p className="text-xs font-bold text-white mb-3">پیوندهای مفید بنیاد</p>
          <ul className="space-y-2">
            {bonyadLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-navy-300 hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  {l.label} <ExternalLink size={11} className="opacity-60" />
                </a>
              </li>
            ))}
            <li>
              <Link to="/login" className="text-xs text-navy-300 hover:text-white transition-colors">
                ورود اعضای سازمان
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-[11px] text-navy-300">
        <p className="flex items-center justify-center gap-2">
          <Layers size={12} /> پروتوتایپ داخلی — داده‌های این نسخه نمایشی است.
        </p>
        <CreditFooter dark />
      </div>
    </footer>
  );
}
