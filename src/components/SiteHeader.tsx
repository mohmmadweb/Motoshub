import { Link, useLocation, useNavigate } from "react-router-dom";
import { Building2, Globe2 } from "lucide-react";
import { usePublicFeed } from "../context/ContentContext";

const navItems = [
  { id: "top", label: "صفحه اصلی" },
  { id: "modules", label: "امکانات پلتفرم" },
  { id: "security", label: "امنیت و انطباق" },
];

export default function SiteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const publicFeed = usePublicFeed();

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
      <div className="flex items-center justify-between px-6 lg:px-16 h-16 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-9 h-9 rounded-lg bg-navy-900 flex items-center justify-center text-white">
            <Building2 size={18} />
          </span>
          <span className="font-bold text-ink-900">موتوشاب</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => goToSection(item.id)} className="text-[13px] font-medium text-ink-600 hover:text-brand-700">
              {item.label}
            </button>
          ))}
          <Link to="/public" className="flex items-center gap-1.5 text-[13px] font-medium text-ink-600 hover:text-brand-700">
            <Globe2 size={14} />
            محتوای عمومی
            {publicFeed.length > 0 && <span className="text-[10px] bg-ink-100 text-ink-500 rounded-full px-1.5">{publicFeed.length}</span>}
          </Link>
        </nav>

        <Link to="/login" className="btn bg-navy-900 text-white hover:bg-navy-800 text-[13px] px-4 py-2 shrink-0">
          ورود به پلتفرم
        </Link>
      </div>
    </header>
  );
}
