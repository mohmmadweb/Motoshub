import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, HelpCircle, BookOpen, LifeBuoy } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { helpForPath } from "../../pages/knowledge/helpArticles";

type Crumb = { label: string; to?: string };

export default function PageHeader({
  title,
  description,
  icon,
  breadcrumb,
  actions,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  breadcrumb?: Crumb[];
  actions?: ReactNode;
}) {
  // عنوان تب مرورگر با صفحه هماهنگ می‌شود (بدون نام برند سازنده)
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);

  return (
    <div className="mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-ink-400 mb-2">
          {breadcrumb.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronLeft size={12} />}
              {c.to ? (
                <Link to={c.to} className="hover:text-brand-600">
                  {c.label}
                </Link>
              ) : (
                <span className="text-ink-600 font-medium">{c.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {icon && (
            <span className="w-10 h-10 rounded-lg bg-navy-800 text-white flex items-center justify-center shrink-0">
              {icon}
            </span>
          )}
          <div>
            <h1 className="text-lg font-bold text-ink-900">{title}</h1>
            {description && <p className="text-[13px] text-ink-500 mt-0.5">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {actions}
          <ContextHelp />
        </div>
      </div>
    </div>
  );
}

/** «؟» راهنمای زمینه‌ای: تا سه مقاله‌ی مرکز راهنما متناسب با صفحه‌ی فعلی */
function ContextHelp() {
  const { pathname, search } = useLocation();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  // در خودِ مرکز راهنما لازم نیست
  if (pathname.startsWith("/dashboard/knowledge") && new URLSearchParams(search).get("tab") === "help") return null;
  if (!pathname.startsWith("/dashboard")) return null;
  const articles = open ? helpForPath(pathname, settings, 3) : [];
  const link = (id: string) => `/dashboard/knowledge?tab=help&article=${encodeURIComponent(id)}`;
  return (
    <span className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-8 h-8 rounded-full border flex items-center justify-center ${open ? "border-brand-400 text-brand-700 bg-brand-50" : "border-ink-200 text-ink-500 hover:text-brand-700 hover:border-brand-300"}`}
        title="راهنمای این صفحه"
        aria-label="راهنمای این صفحه"
        aria-expanded={open}
      >
        <HelpCircle size={16} />
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <span className="absolute z-40 top-full mt-1.5 left-0 w-72 max-w-[calc(100vw-2rem)] bg-white border border-ink-200 rounded-xl shadow-lg p-2 block">
            <span className="block text-[11px] font-bold text-ink-500 px-2 pt-1 pb-1.5">راهنمای این صفحه</span>
            {articles.map((a) => (
              <Link key={a.id} to={link(a.id)} onClick={() => setOpen(false)} className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-ink-50">
                <BookOpen size={14} className="text-brand-600 shrink-0 mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium text-ink-800 leading-5">{a.title}</span>
                  <span className="block text-[11px] text-ink-500 leading-5 line-clamp-2">{a.summary}</span>
                </span>
              </Link>
            ))}
            {articles.length === 0 && <span className="block text-[11.5px] text-ink-400 px-2 py-2">مقاله‌ی ویژه‌ای برای این صفحه نیست.</span>}
            <span className="flex items-center justify-between gap-2 border-t border-ink-100 mt-1 pt-1.5 px-2">
              <Link to="/dashboard/knowledge?tab=help" onClick={() => setOpen(false)} className="text-[11.5px] text-brand-700 hover:underline">
                همه‌ی راهنما
              </Link>
              <Link to={`/dashboard/tickets?new=1&from=${encodeURIComponent(pathname)}`} onClick={() => setOpen(false)} className="text-[11.5px] text-ink-500 hover:text-brand-700 flex items-center gap-1">
                <LifeBuoy size={12} /> گزارش مشکل
              </Link>
            </span>
          </span>
        </>
      )}
    </span>
  );
}
