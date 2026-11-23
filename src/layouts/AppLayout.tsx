import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CommandPalette from "../components/CommandPalette";
import CreditFooter from "../components/CreditFooter";
import ClassificationBanner from "../components/ClassificationBanner";
import { ImpersonationBar } from "../components/ImpersonationBar";
import MobileBottomNav from "../components/MobileBottomNav";
import { GuidedTourHost } from "../components/GuidedTour";
import { I18nSync, useI18n } from "../i18n";
import { useEffectiveBranding } from "../iam/hooks";
import { PRODUCT_NAME } from "../components/Sidebar";

/**
 * عنوان تب مرورگر = «عنوان صفحه | عنوان سامانه». عنوان سامانه از برند مؤثرِ کانتکست فعلی
 * (مدیریت سامانه ← برند و ظاهر) می‌آید و با تغییر سازمان فوراً عوض می‌شود؛ عنوان صفحه را PageHeader می‌گذارد.
 */
function useSiteTitle(siteTitle: string) {
  const prev = useRef<string[]>([]);
  useEffect(() => {
    const known = new Set([...prev.current, siteTitle]);
    prev.current = [...known];
    const apply = () => {
      const cur = document.title;
      const cut = cur.lastIndexOf(" | ");
      const base = cut >= 0 && known.has(cur.slice(cut + 3)) ? cur.slice(0, cut) : known.has(cur) ? "" : cur;
      const next = base ? `${base} | ${siteTitle}` : siteTitle;
      if (cur !== next) document.title = next;
    };
    apply();
    const el = document.querySelector("title");
    if (!el) return;
    const mo = new MutationObserver(apply);
    mo.observe(el, { childList: true, characterData: true, subtree: true });
    return () => mo.disconnect();
  }, [siteTitle]);
}

/** اسکلت بارگذاری صفحه (داخل پوسته تا منو و نوار بالا ثابت بمانند) */
function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="در حال بارگذاری صفحه">
      <div className="h-9 w-64 rounded-lg bg-ink-100 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-ink-100 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-ink-100 animate-pulse" />
    </div>
  );
}

export default function AppLayout() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { dir } = useI18n();
  const { pathname } = useLocation();
  // عنوان سامانه = برند واحد فعلی؛ اگر واحد برندی نداشته باشد «کاریز»
  useSiteTitle(useEffectiveBranding().name?.trim() || PRODUCT_NAME);
  // ورود صفحه با rise پلکانی؛ کلید = بخش اول مسیر تا جابه‌جایی درون یک ماژول (مثلاً بین گفتگوها) صفحه را دوباره سوار نکند
  const pageKey = pathname.split("/")[1] ?? "";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex min-h-screen" dir={dir}>
      <I18nSync />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[100] focus:bg-brand-600 focus:text-on-primary focus:px-4 focus:py-2 focus:rounded-lg text-sm"
      >
        پرش به محتوای اصلی
      </a>
      <Sidebar />
      <div className="flex-1 min-w-0">
        <ImpersonationBar />
        <ClassificationBanner />
        <Topbar onOpenPalette={() => setPaletteOpen(true)} />
        <main id="main-content" tabIndex={-1} className="px-4 sm:px-6 pt-5 sm:pt-7 pb-10 lg:pb-[72px] max-w-workspace mx-auto outline-none">
          <div key={pageKey} className="rise-stagger">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <div data-shell>
          <CreditFooter />
        </div>
        <MobileBottomNav />
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <GuidedTourHost />
    </div>
  );
}
