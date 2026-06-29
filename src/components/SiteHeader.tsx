import { Link, useLocation, useNavigate } from "react-router-dom";
import { Building2, MessagesSquare, NotebookPen, CalendarDays, Image as ImageIcon, BookOpen } from "lucide-react";
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
] as const;

const aboutLinks = [
  { id: "modules", label: "امکانات پلتفرم" },
  { id: "security", label: "امنیت و انطباق" },
];

export default function SiteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { forumTopics, blogPosts, events, mediaItems, knowledgeDocs } = useContent();

  const publicCounts: Record<(typeof moduleLinks)[number]["section"], number> = {
    forum: forumTopics.filter((t) => t.visibility === "عمومی").length,
    blog: blogPosts.filter((b) => b.visibility === "عمومی").length,
    events: events.filter((e) => e.visibility === "عمومی").length,
    media: mediaItems.filter((m) => m.visibility === "عمومی").length,
    knowledge: knowledgeDocs.filter((d) => d.visibility === "عمومی").length,
  };

  const goToSection = (id: string) => {
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

        <nav className="hidden lg:flex items-center gap-5 overflow-x-auto">
          {sectionLinks.map((item) => (
            <button key={item.id} onClick={() => goToSection(item.id)} className="text-[13px] font-medium text-ink-600 hover:text-brand-700 whitespace-nowrap">
              {item.label}
            </button>
          ))}

          <span className="w-px h-4 bg-ink-200" />

          {moduleLinks.map((m) => (
            <Link
              key={m.section}
              to={`/public/${m.section}`}
              className="flex items-center gap-1.5 text-[13px] font-medium text-ink-600 hover:text-brand-700 whitespace-nowrap"
            >
              <m.icon size={13} />
              {m.label}
              {publicCounts[m.section] > 0 && (
                <span className="text-[10px] bg-ink-100 text-ink-500 rounded-full px-1.5">{publicCounts[m.section]}</span>
              )}
            </Link>
          ))}

          <span className="w-px h-4 bg-ink-200" />

          {aboutLinks.map((item) => (
            <button key={item.id} onClick={() => goToSection(item.id)} className="text-[13px] font-medium text-ink-600 hover:text-brand-700 whitespace-nowrap">
              {item.label}
            </button>
          ))}
        </nav>

        <Link to="/login" className="btn bg-navy-900 text-white hover:bg-navy-800 text-[13px] px-4 py-2 shrink-0">
          ورود به پلتفرم
        </Link>
      </div>
    </header>
  );
}
