import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, Search, ChevronDown, LogOut, UserCircle, Settings, ShieldCheck, Command, Menu, X, Sun, Moon, Palette } from "lucide-react";
import Avatar from "./Avatar";
import { currentUser, notifications, userPresence, currentTenant, type PresenceStatus } from "../data/mock";
import { navSections } from "./Sidebar";
import { useTheme } from "../context/ThemeContext";

const statusOptions: { id: PresenceStatus; label: string; dot: string }[] = [
  { id: "online", label: "آنلاین", dot: "bg-emerald-500" },
  { id: "away", label: "غایب", dot: "bg-amber-500" },
  { id: "dnd", label: "مزاحم نشوید", dot: "bg-rose-500" },
  { id: "offline", label: "نامرئی", dot: "bg-ink-300" },
];

export default function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const unread = notifications.filter((n) => !n.read).length;
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [status, setStatus] = useState<PresenceStatus>(userPresence[currentUser.id] ?? "online");
  const navigate = useNavigate();
  const { resolved, setMode } = useTheme();

  const toggleDark = () => setMode(resolved === "dark" ? "light" : "dark");

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 lg:px-6 h-16 bg-white border-b border-ink-200">
      {/* ناوبری موبایل */}
      <button
        onClick={() => setNavOpen(true)}
        aria-label="باز کردن منوی ناوبری"
        className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-ink-100 text-ink-600 shrink-0"
      >
        <Menu size={20} />
      </button>

      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-label="منوی ناوبری">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNavOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-navy-900 shadow-2xl flex flex-col animate-[slideIn_0.2s_ease-out]">
            <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
              <p className="font-bold text-sm text-white truncate">{currentTenant.name}</p>
              <button onClick={() => setNavOpen(false)} aria-label="بستن منو" className="w-9 h-9 rounded-lg hover:bg-white/10 text-navy-200 flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
              {navSections.map((section) => (
                <div key={section.title}>
                  <p className="text-[10.5px] font-semibold text-navy-300 uppercase tracking-wide px-2.5 mb-1.5">{section.title}</p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setNavOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-2.5 py-2.5 rounded-md text-[13.5px] font-medium transition-colors ${
                            isActive ? "bg-brand-600 text-white" : "text-navy-200 hover:bg-white/5 hover:text-white"
                          }`
                        }
                      >
                        <item.icon size={17} className="shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-md flex items-center gap-2">
        <form
          className="flex-1 relative"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("q")?.toString().trim() ?? "";
            navigate(value ? `/dashboard/search?q=${encodeURIComponent(value)}` : "/dashboard/search");
          }}
        >
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <input
            name="q"
            placeholder="جستجو در کل سامانه… (Enter)"
            aria-label="جستجوی سراسری"
            className="w-full bg-ink-50 border border-ink-200 rounded-lg pr-9 pl-3 py-2 text-[13px] outline-none focus:border-brand-400 focus:bg-white transition-colors"
          />
        </form>
        <button
          onClick={onOpenPalette}
          title="رفتن به سریع (Ctrl+K)"
          className="hidden md:flex items-center gap-1 bg-ink-50 border border-ink-200 rounded-lg px-2.5 py-2 text-ink-400 hover:border-ink-300 shrink-0"
        >
          <Command size={13} />
          <span className="text-[10px]">K</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleDark}
          title={resolved === "dark" ? "حالت روشن" : "حالت تیره"}
          aria-label={resolved === "dark" ? "تغییر به حالت روشن" : "تغییر به حالت تیره"}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-ink-100 text-ink-600"
        >
          {resolved === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Link
          to="/dashboard/notifications"
          className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-ink-100 text-ink-600"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute top-1.5 left-1.5 bg-rose-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {unread}
            </span>
          )}
        </Link>

        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 pl-1 pr-1 py-1 rounded-lg hover:bg-ink-100">
            <Avatar name={currentUser.name} color={currentUser.avatarColor} size={34} status={status} />
            <span className="hidden md:block text-[13px] font-medium">{currentUser.name}</span>
            <ChevronDown size={14} className="text-ink-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 mt-2 w-60 bg-white border border-ink-200 rounded-lg shadow-lg z-20 py-1.5" dir="rtl">
                <p className="px-3.5 py-1 text-[11px] text-ink-400">وضعیت حضور</p>
                <div className="px-2 pb-1.5 flex items-center gap-1">
                  {statusOptions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStatus(s.id)}
                      title={s.label}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] ${
                        status === s.id ? "bg-ink-100 font-medium text-ink-800" : "text-ink-500 hover:bg-ink-50"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      {s.label}
                    </button>
                  ))}
                </div>
                <div className="h-px bg-ink-100 my-1" />
                <Link to={`/dashboard/profile/${currentUser.id}`} onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-ink-50">
                  <UserCircle size={15} className="text-ink-400" /> پروفایل من
                </Link>
                <Link to="/dashboard/profile/u1?tab=security" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-ink-50">
                  <ShieldCheck size={15} className="text-ink-400" /> امنیت و نشست‌ها
                </Link>
                <Link to="/dashboard/appearance" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-ink-50">
                  <Palette size={15} className="text-ink-400" /> ظاهر و برندسازی
                </Link>
                <Link to="/dashboard/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-ink-50">
                  <Settings size={15} className="text-ink-400" /> پنل راهبری
                </Link>
                <div className="h-px bg-ink-100 my-1" />
                <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-rose-600 hover:bg-rose-50">
                  <LogOut size={15} /> خروج از حساب
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
