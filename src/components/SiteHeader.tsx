import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Building2, MessagesSquare, NotebookPen, CalendarDays, Image as ImageIcon, BookOpen, Newspaper, Menu, X } from "lucide-react";
import { useContent } from "../context/ContentContext";

const sectionLinks = [
  { id: "top", label: "صفحه اصلی" },
];

const moduleLinks = [
  { section: "forum", label: "انجمن", icon: MessagesSquare },
  { section: "blog", label: "بلاگ", icon: NotebookPen },
  { section: "events", label: "رویدادها", icon: CalendarDays },
  { section: "media", label: "تصاویر و ویدیو", icon: ImageIcon },
  { section: "knowledge", label: "مدیریت دانش", icon: BookOpen },
  { section: "news", label: "اخبار", icon: Newspaper },
] as const;

const aboutLinks = [
  { id: "modules", label: "امکانات پلتفرم" },
  { id: "security", label: "امنیت و انطباق" },
];

export default function SiteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { forumTopics, blogPosts, events, mediaItems, knowledgeDocs, newsItems } = useContent();

  const publicCounts: Record<(typeof moduleLinks)[number]["section"], number> = {
    forum: forumTopics.filter((t) => t.visibility === "عمومی").length,
    blog: blogPosts.filter((b) => b.visibility === "عمومی").length,
    events: events.filter((e) => e.visibility === "عمومی").length,
    media: mediaItems.filter((m) => m.visibility === "عمومی").length,
    knowledge: knowledgeDocs.filter((d) => d.visibility === "عمومی").length,
    news: newsItems.filter((n) => n.visibility === "عمومی").length,
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
      <div className="flex items-center justify-between gap-4 px-6 lg:px-16 h-16 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-9 h-9 rounded-lg bg-navy-900 flex items-center justify-center text-white">
            <Building2 size={18} />
          </span>
          <span className="font-bold text-ink-900">موتوشاب</span>
        </Link>

        {/* Desktop nav — visible on lg+ */}
        <nav className="hidden lg:flex items-center gap-4 overflow-x-auto">
          {sectionLinks.map((item) => (
            <button key={item.id} onClick={() => goToSection(item.id)} className="text-[13px] font-medium text-ink-600 hover:text-brand-700 whitespace-nowrap">
              {item.label}
            </button>
          ))}

          <span className="w-px h-4 bg-ink-200 shrink-0" />

          {moduleLinks.map((m) => {
            const active = location.pathname === `/public/${m.section}`;
            return (
              <Link
                key={m.section}
                to={`/public/${m.section}`}
                className={`flex items-center gap-1 text-[12px] font-medium whitespace-nowrap ${active ? "text-brand-700" : "text-ink-600 hover:text-brand-700"}`}
              >
                <m.icon size={12} />
                {m.label}
                {publicCounts[m.section] > 0 && (
                  <span className={`text-[10px] rounded-full px-1.5 ${active ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500"}`}>
                    {publicCounts[m.section]}
                  </span>
                )}
              </Link>
            );
          })}

          <span className="w-px h-4 bg-ink-200 shrink-0" />

          {aboutLinks.map((item) => (
            <button key={item.id} onClick={() => goToSection(item.id)} className="text-[12px] font-medium text-ink-600 hover:text-brand-700 whitespace-nowrap">
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/login" className="btn bg-navy-900 text-white hover:bg-navy-800 text-[13px] px-4 py-2 shrink-0">
            ورود به پلتفرم
          </Link>
          {/* Hamburger — visible below lg */}
          <button
            className="lg:hidden p-2 rounded-md text-ink-600 hover:bg-ink-50"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="باز کردن منو"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-ink-100 bg-white px-6 py-3 max-h-[75vh] overflow-y-auto">
          {sectionLinks.map((item) => (
            <button
              key={item.id}
              onClick={() => goToSection(item.id)}
              className="w-full text-right text-sm font-medium text-ink-700 py-2.5 hover:text-brand-700 flex items-center gap-2"
            >
              {item.label}
            </button>
          ))}

          <div className="h-px bg-ink-100 my-2" />
          <p className="text-[11px] text-ink-400 font-semibold mb-1 tracking-wide">محتوای عمومی</p>

          {moduleLinks.map((m) => {
            const active = location.pathname === `/public/${m.section}`;
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
                  <span className={`text-[10px] rounded-full px-1.5 ${active ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500"}`}>
                    {publicCounts[m.section]}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="h-px bg-ink-100 my-2" />

          {aboutLinks.map((item) => (
            <button
              key={item.id}
              onClick={() => goToSection(item.id)}
              className="w-full text-right text-sm font-medium text-ink-700 py-2.5 hover:text-brand-700"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
