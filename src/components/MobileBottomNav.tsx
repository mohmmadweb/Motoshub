// ---------------------------------------------------------------------------
// ناوبری پایین موبایل (زیر lg): داشبورد، گفتگو، اعلان‌ها، جستجو، منو.
// «منو» منوی موبایل موجود را با onMenu باز می‌کند؛ اگر onMenu داده نشود رویداد
// window «motoshub:open-menu» فرستاده می‌شود تا هدر بتواند به آن گوش دهد.
// یک فاصله‌گذار هم‌ارتفاع رندر می‌کند تا انتهای محتوا زیر نوار پنهان نشود.
// ---------------------------------------------------------------------------
import { NavLink } from "react-router-dom";
import { Bell, LayoutDashboard, Menu, MessageCircle, Search } from "lucide-react";
import { useInbox } from "../context/InboxContext";
import { useSocial } from "../context/SocialContext";

const badge = (n: number) => (n > 99 ? "۹۹+" : n.toLocaleString("fa-IR"));

export default function MobileBottomNav({ onMenu }: { onMenu?: () => void }) {
  const inbox = useInbox();
  const s = useSocial();
  const chatUnread = s.myChats(["direct_message", "group"]).reduce((a, c) => a + (c.muted_by.includes(s.me) ? 0 : s.unreadCount(c)), 0);

  const items = [
    { to: "/dashboard", end: true, label: "داشبورد", icon: LayoutDashboard, count: 0 },
    { to: "/dashboard/chat", end: false, label: "گفتگو", icon: MessageCircle, count: chatUnread },
    { to: "/dashboard/notifications", end: false, label: "اعلان‌ها", icon: Bell, count: inbox.unread },
    { to: "/dashboard/search", end: false, label: "جستجو", icon: Search, count: 0 },
  ];
  const cls = (active: boolean) => `relative flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-[11px] font-medium ${active ? "text-brand-700" : "text-ink-500"}`;

  const openMenu = () => (onMenu ? onMenu() : window.dispatchEvent(new CustomEvent("motoshub:open-menu")));

  return (
    <>
      <div className="h-16 lg:hidden" aria-hidden />
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-ink-200 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]" aria-label="ناوبری اصلی موبایل" dir="rtl">
        <div className="flex items-stretch max-w-lg mx-auto">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => cls(isActive)}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-0 inset-x-5 h-0.5 rounded-full bg-brand-600" />}
                  <span className="relative">
                    <it.icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
                    {it.count > 0 && (
                      <span className="absolute -top-1.5 -left-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white text-[10px] leading-[17px] text-center font-bold">{badge(it.count)}</span>
                    )}
                  </span>
                  {it.label}
                </>
              )}
            </NavLink>
          ))}
          <button type="button" onClick={openMenu} className={cls(false)} aria-label="باز کردن منو">
            <Menu size={20} strokeWidth={1.8} />
            منو
          </button>
        </div>
      </nav>
    </>
  );
}
