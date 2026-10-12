import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
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

export default function AppLayout() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { dir } = useI18n();
  useSiteTitle(useEffectiveBranding().name);

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
    <div className="flex min-h-screen bg-ink-50" dir={dir}>
      <I18nSync />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[100] focus:bg-brand-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg text-sm"
      >
        پرش به محتوای اصلی
      </a>
      <Sidebar />
      <div className="flex-1 min-w-0">
        <ImpersonationBar />
        <ClassificationBanner />
        <Topbar onOpenPalette={() => setPaletteOpen(true)} />
        <main id="main-content" tabIndex={-1} className="p-4 lg:p-6 max-w-7xl mx-auto outline-none">
          <Outlet />
        </main>
        <CreditFooter />
        <MobileBottomNav />
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <GuidedTourHost />
    </div>
  );
}
