import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import { currentUser, notifications } from "../data/mock";

export default function Topbar() {
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 lg:px-6 py-3 bg-white/80 backdrop-blur border-b border-ink-100">
      <div className="flex-1 max-w-md">
        <input
          type="text"
          placeholder="جستجو در پست‌ها، گروه‌ها، اسناد و پروژه‌ها…"
          className="w-full bg-ink-50 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/app/notifications"
          className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-ink-50 text-lg"
        >
          🔔
          {unread > 0 && (
            <span className="absolute -top-1 -left-1 bg-rose-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
              {unread}
            </span>
          )}
        </Link>
        <Link to={`/app/profile/${currentUser.id}`} className="flex items-center gap-2">
          <Avatar name={currentUser.name} color={currentUser.avatarColor} size={36} online />
          <span className="hidden md:block text-sm font-medium">{currentUser.name}</span>
        </Link>
      </div>
    </header>
  );
}
