import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Search, ChevronDown, LogOut, UserCircle, Settings, ShieldCheck, Command } from "lucide-react";
import Avatar from "./Avatar";
import { currentUser, notifications, userPresence, type PresenceStatus } from "../data/mock";

const statusOptions: { id: PresenceStatus; label: string; dot: string }[] = [
  { id: "online", label: "آنلاین", dot: "bg-emerald-500" },
  { id: "away", label: "غایب", dot: "bg-amber-500" },
  { id: "dnd", label: "مزاحم نشوید", dot: "bg-rose-500" },
  { id: "offline", label: "نامرئی", dot: "bg-ink-300" },
];

export default function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const unread = notifications.filter((n) => !n.read).length;
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState<PresenceStatus>(userPresence[currentUser.id] ?? "online");
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 lg:px-6 h-16 bg-white border-b border-ink-200">
      <div className="flex-1 max-w-md flex items-center gap-2">
        <button
          onClick={() => navigate("/app/search")}
          className="flex-1 flex items-center gap-2 bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 text-[13px] text-ink-400 hover:border-ink-300"
        >
          <Search size={15} />
          <span className="flex-1 text-right">جستجو در پست‌ها، گروه‌ها، اسناد و پروژه‌ها…</span>
        </button>
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
        <Link
          to="/app/notifications"
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
                <Link to={`/app/profile/${currentUser.id}`} onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-ink-50">
                  <UserCircle size={15} className="text-ink-400" /> پروفایل من
                </Link>
                <Link to="/app/profile/u1?tab=security" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-ink-50">
                  <ShieldCheck size={15} className="text-ink-400" /> امنیت و نشست‌ها
                </Link>
                <Link to="/app/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-ink-50">
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
