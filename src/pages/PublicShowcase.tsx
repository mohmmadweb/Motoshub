import { Link, useNavigate, useParams } from "react-router-dom";
import { Globe2, LogIn, Layers, MessagesSquare, NotebookPen, CalendarDays, Image as ImageIcon, BookOpen } from "lucide-react";
import PublicContentTabs, { type ModuleTab } from "../components/PublicContentTabs";
import SiteHeader from "../components/SiteHeader";

const validSections: ModuleTab[] = ["forum", "blog", "events", "media", "knowledge"];

const sectionInfo: Record<ModuleTab, { icon: typeof MessagesSquare; tag: string; title: string; description: string }> = {
  forum: {
    icon: MessagesSquare,
    tag: "انجمن عمومی",
    title: "موضوعات عمومی انجمن موتوشاب",
    description: "پرسش‌و‌پاسخ‌ها و گفتگوهای فنی/تخصصی که سازمان‌های فعال روی موتوشاب به‌صورت عمومی منتشر کرده‌اند.",
  },
  blog: {
    icon: NotebookPen,
    tag: "بلاگ عمومی",
    title: "یادداشت‌های عمومی بلاگ",
    description: "تجربه‌ها، تحلیل‌ها و گزارش‌های فنی منتشرشده توسط اعضای سازمان‌های مختلف روی موتوشاب.",
  },
  events: {
    icon: CalendarDays,
    tag: "رویدادهای عمومی",
    title: "رویدادها و جلسات عمومی",
    description: "کارگاه‌ها، جلسات بازبینی و رویدادهایی که سازمان‌ها به‌صورت عمومی به اطلاع عموم رسانده‌اند.",
  },
  media: {
    icon: ImageIcon,
    tag: "رسانه‌ی عمومی",
    title: "گالری تصاویر و ویدیوی عمومی",
    description: "نمونه‌ای از تصاویر و ویدیوهای عمومی رویدادها و فعالیت‌های سازمان‌های فعال روی موتوشاب.",
  },
  knowledge: {
    icon: BookOpen,
    tag: "دانش عمومی",
    title: "اسناد عمومی بانک دانش",
    description: "مستندات آموزشی و گزارش‌هایی که سازمان‌ها برای استفاده‌ی عمومی در بانک دانش منتشر کرده‌اند.",
  },
};

export default function PublicShowcase() {
  const { section } = useParams();
  const navigate = useNavigate();
  const activeTab: ModuleTab = validSections.includes(section as ModuleTab) ? (section as ModuleTab) : "forum";
  const info = sectionInfo[activeTab];

  return (
    <div dir="rtl" className="min-h-screen bg-white flex flex-col">
      <SiteHeader />

      <section className="px-6 lg:px-16 pt-12 pb-6 max-w-3xl mx-auto text-center">
        <span className="tag-pill bg-emerald-50 text-emerald-700 border border-emerald-200 mx-auto inline-flex">
          <Globe2 size={12} /> {info.tag}
        </span>
        <span className="w-12 h-12 rounded-xl bg-navy-900 text-white flex items-center justify-center mx-auto mt-5">
          <info.icon size={20} />
        </span>
        <h1 className="text-2xl lg:text-3xl font-extrabold leading-[1.4] text-ink-900 mt-4">{info.title}</h1>
        <p className="text-ink-500 mt-4 text-sm leading-7 max-w-xl mx-auto">{info.description}</p>
      </section>

      <section className="px-6 lg:px-16 pb-16 max-w-5xl mx-auto flex-1 w-full">
        <PublicContentTabs linkMode="login" activeTab={activeTab} onTabChange={(t) => navigate(`/public/${t}`)} showTabs={false} />
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
