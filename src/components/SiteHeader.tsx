import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MessagesSquare, NotebookPen, CalendarDays, Image as ImageIcon, BookOpen, Newspaper, Users, Menu, X } from "lucide-react";
import { useContent } from "../context/ContentContext";

// ترتیب طبق بازبینی UX: صفحه اصلی | امکانات | امنیت | انجمن | بلاگ | پایگاه دانش | رویدادها | تصاویر و ویدیو | اخبار | گروه‌ها
const pageLinks = [
  { id: "top", label: "صفحه اصلی" },
  { id: "modules", label: "امکانات پلتفرم" },
  { id: "security", label: "امنیت و انطباق" },
] as const;

const moduleLinks = [
  { section: "forum", label: "انجمن", icon: MessagesSquare },
  { section: "blog", label: "بلاگ", icon: NotebookPen },
  { section: "knowledge", label: "پایگاه دانش", icon: BookOpen },
  { section: "events", label: "رویدادها", icon: CalendarDays },
  { section: "media", label: "تصاویر و ویدیو", icon: ImageIcon },
  { section: "news", label: "اخبار", icon: Newspaper },
  { section: "groups", label: "گروه‌ها", icon: Users },
] as const;

export default function SiteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { forumTopics, blogPosts, events, mediaItems, knowledgeDocs, newsItems, groups } = useContent();

  const publicCounts: Record<(typeof moduleLinks)[number]["section"], number> = {
    forum: forumTopics.filter((t) => t.visibility === "عمومی").length,
    blog: blogPosts.filter((b) => b.visibility === "عمومی").length,
    events: events.filter((e) => e.visibility === "عمومی").length,
    media: mediaItems.filter((m) => m.visibility === "عمومی").length,
    knowledge: knowledgeDocs.filter((d) => d.visibility === "عمومی").length,
    news: newsItems.filter((n) => n.visibility === "عمومی").length,
    groups: groups.filter((g) => g.privacy === "عمومی").length,
  };

  const goToSection = (id: string) => {
    setMobileOpen(false);
    if (location.pathname === "/") {
      if (id === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }
    navigate("/");
    if (id !== "top") {
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-ink-200">
      {/* منوی تک‌ردیفه — طبق بازبینی UX همه‌ی مقصدها در یک ردیف */}
      <div className="flex items-center justify-between gap-3 px-4 lg:px-8 h-16 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/bonyad-logo.png" alt="بنیاد مستضعفان انقلاب اسلامی" className="h-9 w-auto" />
          <span className="font-bold text-ink-900 sr-only">بنیاد مستضعفان</span>
        </Link>

        <nav className="hidden xl:flex items-center gap-0.5 flex-1 justify-center" aria-label="ناوبری اصلی">
          {pageLinks.map((item) => (
            <button
              key={item.id}
              onClick={() => goToSection(item.id)}
              className={`px-2.5 py-2 text-[12.5px] font-medium rounded-md whitespace-nowrap transition-colors ${
                location.pathname === "/" ? "text-ink-700 hover:text-brand-700 hover:bg-brand-50/60" : "text-ink-500 hover:text-brand-700 hover:bg-brand-50/60"
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="w-px h-5 bg-ink-200 mx-1.5" aria-hidden />
          {moduleLinks.map((m) => {
            const active = location.pathname.startsWith(`/public/${m.section}`);
            return (
              <Link
                key={m.section}
                to={`/public/${m.section}`}
                title={`${publicCounts[m.section].toLocaleString("fa-IR")} مطلب عمومی در ${m.label}`}
                className={`flex items-center gap-1.5 px-2.5 py-2 text-[12.5px] font-medium rounded-md whitespace-nowrap transition-colors ${
                  active ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:text-brand-700 hover:bg-brand-50/60"
                }`}
              >
                {m.label}
                {publicCounts[m.section] > 0 && (
                  <span
                    aria-label={`${publicCounts[m.section].toLocaleString("fa-IR")} مطلب عمومی`}
                    className={`text-[10px] rounded-full px-1.5 py-px ${active ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500"}`}
                  >
                    {publicCounts[m.section].toLocaleString("fa-IR")}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link to="/login" className="btn bg-navy-900 text-white hover:bg-navy-800 text-[13px] px-4 py-2">
            ورود به پلتفرم
          </Link>
          {/* همبرگر — زیر xl */}
          <button
            className="xl:hidden p-2 rounded-md text-ink-600 hover:bg-ink-50"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "بستن منو" : "باز کردن منو"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* منوی موبایل/تبلت */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-ink-100 bg-white px-6 py-3 max-h-[75vh] overflow-y-auto">
          {pageLinks.map((item) => (
            <button
              key={item.id}
              onClick={() => goToSection(item.id)}
              className="w-full text-right text-sm font-medium text-ink-700 py-2.5 hover:text-brand-700"
            >
              {item.label}
            </button>
          ))}

          <div className="h-px bg-ink-100 my-2" />
          <p className="text-[11px] text-ink-400 font-semibold mb-1 tracking-wide">محتوای عمومی</p>

          {moduleLinks.map((m) => {
            const active = location.pathname.startsWith(`/public/${m.section}`);
            return (
              <Link
                key={m.section}
                to={`/public/${m.section}`}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 text-sm font-medium py-2.5 ${active ? "text-brand-700" : "text-ink-700 hover:text-brand-700"}`}
              >
                <m.icon size={15} />
                {m.label}
                {publicCounts[m.section] > 0 && (
                  <span className="text-[10px] text-ink-400">({publicCounts[m.section].toLocaleString("fa-IR")} مطلب)</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
