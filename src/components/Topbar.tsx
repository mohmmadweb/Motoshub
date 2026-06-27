import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Search, ChevronDown, LogOut, UserCircle, Settings, ShieldCheck } from "lucide-react";
import Avatar from "./Avatar";
import { currentUser, notifications } from "../data/mock";

export default function Topbar() {
  const unread = notifications.filter((n) => !n.read).length;
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 lg:px-6 h-16 bg-white border-b border-ink-200">
      <button
        onClick={() => navigate("/app/search")}
        className="flex-1 max-w-md flex items-center gap-2 bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 text-[13px] text-ink-400 hover:border-ink-300"
      >
        <Search size={15} />
        <span className="flex-1 text-right">جستجو در پست‌ها، گروه‌ها، اسناد و پروژه‌ها…</span>
        <kbd className="hidden md:inline text-[10px] bg-white border border-ink-200 rounded px-1.5 py-0.5 text-ink-400">⌘K</kbd>
      </button>

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
            <Avatar name={currentUser.name} color={currentUser.avatarColor} size={34} online />
            <span className="hidden md:block text-[13px] font-medium">{currentUser.name}</span>
            <ChevronDown size={14} className="text-ink-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 mt-2 w-56 bg-white border border-ink-200 rounded-lg shadow-lg z-20 py-1.5" dir="rtl">
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
