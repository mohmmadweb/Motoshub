import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Search, LogOut, UserCircle, Menu, X, Sun, Moon, Compass, Languages, Plus, Eye } from "lucide-react";
import Avatar from "./Avatar";
import Kbd from "./ui/Kbd";
import { type PresenceStatus } from "../data/mock";
import { UserStatusMenu } from "./UserStatus";
import { useUserStatus, type UserStatusCode } from "../iam/userStatus";

/** نقطه‌ی وضعیت روی آواتار از «وضعیت من» (iam/userStatus) */
const presenceOf: Record<UserStatusCode, PresenceStatus> = { available: "online", busy: "dnd", in_meeting: "dnd", on_leave: "away", custom: "online" };
import { personalFor } from "../data/personal";
import { NavTree, ShellBrand } from "./Sidebar";
import { useTheme } from "../context/ThemeContext";
import ScopeSwitcher, { DemoPersonaList } from "./ScopeSwitcher";
import InstallAppButton from "./InstallAppButton";
import QuickCreate from "./QuickCreate";
import { useTenancy } from "../context/TenancyContext";
import { useProjectsPM } from "../context/ProjectsContext";
import { useInbox } from "../context/InboxContext";
import { useI18n } from "../i18n";
import { startTour } from "./GuidedTour";

// نوار بالای v6.8: جستجو (Ctrl K) · تغییر سازمان · راهنمای سامانه · روشن/تیره · «+» ایجاد سریع · اعلان‌ها · منوی آواتار

const iconBtn = "btn btn-ghost btn-icon relative shrink-0 !text-ink-600";

export default function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  // نوار ناوبری پایینِ موبایل منو را با این رویداد باز می‌کند
  useEffect(() => {
    const open = () => setNavOpen(true);
    window.addEventListener("motoshub:open-menu", open);
    return () => window.removeEventListener("motoshub:open-menu", open);
  }, []);
  useEffect(() => {
    if (!navOpen && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setNavOpen(false);
      setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen, menuOpen]);
  const navigate = useNavigate();
  const { resolved, setMode } = useTheme();
  const { t, dir, lang, active: langs, setLang } = useI18n();
  const { actingUser, session, role } = useTenancy();
  const { store: pmStore } = useProjectsPM();
  const inbox = useInbox();
  // اعلان‌های شخصی + اعلان‌های پروژه که گیرنده‌شان همین کاربر است
  const unread = personalFor(actingUser.id).notifications.filter((n) => !n.read).length + pmStore.notifications.filter((n) => n.recipient === actingUser.name && !n.read).length + inbox.unread;
  const myStatus = useUserStatus(actingUser.id);
  const status: PresenceStatus = presenceOf[myStatus.code];
  const close = () => setMenuOpen(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const themeSeg = (
    <div role="radiogroup" aria-label="حالت نمایش" className="inline-flex items-center h-10 rounded-[10px] bg-ink-100 p-1 gap-0.5">
      {(["light", "dark"] as const).map((m) => {
        const on = resolved === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setMode(m)}
            className={`h-8 px-3 rounded-lg text-[13px] transition-colors ${on ? "bg-card text-ink-900 font-bold shadow-xs" : "text-ink-500 hover:text-ink-800"}`}
          >
            {t(m === "light" ? "روشن" : "تیره")}
          </button>
        );
      })}
    </div>
  );

  return (
    <header data-shell className="sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 h-16 bg-card/92 backdrop-blur-[8px] border-b border-border">
      {/* ناوبری موبایل (≤۷۶۸) */}
      <button onClick={() => setNavOpen(true)} data-tour="nav-mobile" aria-label="باز کردن منوی ناوبری" className={`${iconBtn} md:hidden`}>
        <Menu size={22} />
      </button>

      {/* کشو با پورتال روی body: backdrop-blur نوار بالا برای فرزندان fixed قاب می‌سازد */}
      {navOpen &&
        createPortal(
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="منوی ناوبری" dir={dir}>
          <div className="absolute inset-0 bg-[var(--color-overlay)] animate-fadein" onClick={() => setNavOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-[260px] max-w-[85vw] bg-card shadow-lg flex flex-col animate-[slideIn_0.2s_ease-out]">
            <div className="flex items-center justify-between gap-2 px-3.5 min-h-14 border-b border-border">
              <ShellBrand />
              <button onClick={() => setNavOpen(false)} aria-label="بستن منو" className="btn btn-ghost btn-icon btn-sm shrink-0">
                <X size={18} />
              </button>
            </div>
            <NavTree mobile onNavigate={() => setNavOpen(false)} />
          </div>
        </div>,
          document.body
        )}

      <form
        data-tour="search"
        role="search"
        className="flex-1 max-w-[520px] relative"
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get("q")?.toString().trim() ?? "";
          navigate(value ? `/globalsearch?q=${encodeURIComponent(value)}` : "/globalsearch");
        }}
      >
        <Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none" aria-hidden />
        <input
          name="q"
          placeholder={t("جستجو در کاریز…")}
          aria-label="جستجوی سراسری"
          className="w-full h-10 rounded-[10px] border border-ink-200 bg-input-bg ps-10 pe-3 sm:pe-20 text-[14px] text-ink-900 outline-none transition-colors hover:border-ink-300 focus:border-teal-500 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-teal-500)_25%,transparent)] placeholder:text-ink-500"
        />
        <button type="button" onClick={onOpenPalette} title="رفتن سریع (Ctrl+K)" className="hidden sm:flex absolute end-2 top-1/2 -translate-y-1/2" aria-label="باز کردن رفتن سریع">
          <Kbd>Ctrl K</Kbd>
        </button>
      </form>

      <div className="flex items-center gap-1 sm:gap-2">
        <span data-tour="scope" className="hidden sm:inline-flex">
          <ScopeSwitcher />
        </span>
        <button onClick={() => startTour("intro")} data-tour="tour-button" title={t("راهنمای سامانه")} aria-label={t("راهنمای سامانه")} className={`${iconBtn} hidden sm:inline-flex`}>
          <Compass size={20} />
        </button>
        <span className="hidden md:inline-flex">{themeSeg}</span>
        <button onClick={() => setCreateOpen(true)} title={t("ایجاد سریع")} aria-label={t("ایجاد سریع")} className="btn btn-outline btn-icon shrink-0">
          <Plus size={20} />
        </button>
        <Link
          to="/notifications"
          data-tour="notifications"
          aria-label={unread ? `${t("اعلان‌ها")} — ${unread.toLocaleString("fa-IR")} خوانده‌نشده` : t("اعلان‌ها")}
          className={iconBtn}
        >
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-on-primary text-[10px] leading-[18px] text-center font-bold ring-2 ring-[var(--color-card)] motion-safe:animate-[bellp_4s_ease-in-out_infinite]">
              {unread > 99 ? "۹۹+" : unread.toLocaleString("fa-IR")}
            </span>
          )}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            data-tour="avatar"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={`منوی حساب — ${actingUser.name}`}
            className="flex items-center rounded-full p-0.5 transition-shadow hover:ring-2 hover:ring-teal-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            <Avatar name={actingUser.name} color={actingUser.avatarColor} size={36} status={status} />
          </button>

          {menuOpen && (
            <>
              <div role="menu" className="absolute end-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-lg z-20 py-1.5 max-h-[calc(100vh-5rem)] overflow-y-auto animate-fadein" dir={dir}>
                <div className="px-3.5 pt-1.5 pb-2.5 flex items-center gap-2.5">
                  <Avatar name={actingUser.name} color={actingUser.avatarColor} size={40} status={status} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-ink-900 truncate">{actingUser.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[11.5px] font-bold bg-teal-50 text-teal-700 rounded-full px-2 py-px">{role.title}</span>
                      <span className="text-[11.5px] text-ink-500">
                        {t("سطح")} {session.level}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-border my-1" />
                <Link role="menuitem" to={`/profile/${actingUser.id}`} onClick={close} className="flex items-center gap-2.5 px-3.5 py-2 text-[14px] text-ink-800 hover:bg-ink-50">
                  <UserCircle size={18} className="text-ink-500" /> {t("نمایه")}
                </Link>

                <UserStatusMenu onDone={close} />

                <div className="md:hidden px-3.5 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-[13px] text-ink-700 flex items-center gap-2">
                    {resolved === "dark" ? <Moon size={16} className="text-ink-500" /> : <Sun size={16} className="text-ink-500" />} {t("حالت نمایش")}
                  </span>
                  {themeSeg}
                </div>
                <div className="sm:hidden px-3.5 py-1.5">
                  <ScopeSwitcher />
                </div>
                <button
                  role="menuitem"
                  onClick={() => {
                    close();
                    startTour("intro");
                  }}
                  className="sm:hidden w-full flex items-center gap-2.5 px-3.5 py-2 text-[14px] text-ink-800 hover:bg-ink-50 text-start"
                >
                  <Compass size={18} className="text-ink-500" /> {t("راهنمای سامانه")}
                </button>

                <div className="h-px bg-border my-1" />
                <p className="px-3.5 pt-1 pb-1 text-[11.5px] font-bold text-ink-500 flex items-center gap-1.5">
                  <Eye size={13} /> {t("مشاهده به‌عنوان")}
                </p>
                <DemoPersonaList onPick={close} />

                {langs.length > 1 && (
                  <>
                    <div className="h-px bg-border my-1" />
                    <p className="px-3.5 py-1 text-[11.5px] font-bold text-ink-500 flex items-center gap-1.5">
                      <Languages size={13} /> {t("زبان")}
                    </p>
                    <div className="px-2.5 pb-1.5 flex items-center gap-1" role="radiogroup" aria-label={t("زبان")}>
                      {langs.map((l) => (
                        <button
                          key={l.code}
                          role="radio"
                          aria-checked={lang.code === l.code}
                          onClick={() => setLang(l.code)}
                          className={`flex-1 py-1.5 rounded-lg text-[12px] ${lang.code === l.code ? "bg-teal-50 text-teal-700 font-bold" : "text-ink-600 hover:bg-ink-50"}`}
                        >
                          {l.native}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <InstallAppButton compact className="w-full px-3.5 py-2" />
                <div className="h-px bg-border my-1" />
                <Link role="menuitem" to="/" onClick={close} className="flex items-center gap-2.5 px-3.5 py-2 text-[14px] text-danger-fg hover:bg-danger-soft">
                  <LogOut size={18} /> {t("خروج")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
      <QuickCreate open={createOpen} onClose={() => setCreateOpen(false)} />
    </header>
  );
}
