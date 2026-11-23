import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, HelpCircle, BookOpen } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { helpForPath, helpLink, isHelpCenter } from "../../pages/knowledge/helpArticles";
import { useT } from "../../i18n";

type Crumb = { label: string; to?: string };

export default function PageHeader({
  title,
  description,
  icon,
  breadcrumb,
  actions,
  tabs,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  breadcrumb?: Crumb[];
  actions?: ReactNode;
  /** ردیف زبانه‌ها زیر عنوان (v6.8 `.wk-top`): زبانه‌ها و `actions` در یک ردیف حاشیه‌دار */
  tabs?: ReactNode;
}) {
  // عنوان صفحه = برچسب منو؛ با زبان انتخابی کاربر ترجمه می‌شود (F14)
  title = useT()(title);
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
        <nav aria-label="مسیر صفحه" className="flex items-center gap-1 text-[12.5px] text-ink-500 mb-2">
          {breadcrumb.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronLeft size={14} />}
              {c.to ? (
                <Link to={c.to} className="hover:text-[var(--color-link)]">
                  {c.label}
                </Link>
              ) : (
                <span className="text-ink-700 font-medium">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <span className="w-11 h-11 mt-0.5 rounded-[10px] bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 [&_svg]:w-6 [&_svg]:h-6 max-md:hidden">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="t-page text-ink-900">{title}</h1>
            {description && <p className="t-lead mt-0.5">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!tabs && actions}
          <ContextHelp />
        </div>
      </div>
      {tabs && (
        <div className="flex items-end justify-between gap-3 flex-wrap border-b border-ink-100 mt-4">
          <div className="min-w-0 flex-1 [&_[role=tablist]]:border-b-0 [&_[role=tablist]]:mb-0">{tabs}</div>
          {actions && <div className="flex items-center gap-2 flex-wrap pb-2">{actions}</div>}
        </div>
      )}
    </div>
  );
}

/** «؟» راهنمای زمینه‌ای: تا سه مقاله‌ی مرکز راهنما متناسب با صفحه‌ی فعلی */
function ContextHelp() {
  const { pathname, search } = useLocation();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  // در خودِ مرکز راهنما لازم نیست
  if (isHelpCenter(pathname, search)) return null;
  if (pathname.startsWith("/public") || pathname === "/" || pathname === "/login") return null;
  const articles = open ? helpForPath(pathname, settings, 3) : [];
  const link = (id: string) => helpLink(id);
  return (
    <span className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`btn btn-outline btn-icon btn-sm rounded-full ${open ? "!border-teal-500 !text-teal-700 !bg-teal-50" : "!text-ink-500"}`}
        title="راهنمای این صفحه"
        aria-label="راهنمای این صفحه"
        aria-expanded={open}
      >
        <HelpCircle size={20} strokeWidth={1.5} />
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <span className="absolute z-40 top-full mt-1.5 left-0 w-72 max-w-[calc(100vw-2rem)] bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-lg p-2 block animate-fadein">
            <span className="block text-[11px] font-bold text-ink-500 px-2 pt-1 pb-1.5">راهنمای این صفحه</span>
            {articles.map((a) => (
              <Link key={a.id} to={link(a.id)} onClick={() => setOpen(false)} className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-ink-50">
                <BookOpen size={16} className="text-teal-700 shrink-0 mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium text-ink-800 leading-5">{a.title}</span>
                  <span className="block text-[11px] text-ink-500 leading-5 line-clamp-2">{a.summary}</span>
                </span>
              </Link>
            ))}
            {articles.length === 0 && <span className="block text-[11.5px] text-ink-400 px-2 py-2">مقاله‌ی ویژه‌ای برای این صفحه نیست.</span>}
            <span className="flex items-center gap-2 border-t border-ink-100 mt-1 pt-1.5 px-2">
              <Link to={helpLink()} onClick={() => setOpen(false)} className="text-[12.5px] text-[var(--color-link)] hover:underline underline-offset-4">
                همه‌ی راهنما
              </Link>
            </span>
          </span>
        </>
      )}
    </span>
  );
}
