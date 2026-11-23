// ---------------------------------------------------------------------------
// ناوبری پایین موبایل (≤۷۶۸) — همان برچسب‌های اپ موبایل واقعی (main_bottom_nav.dart):
// خانه، جستجو، اعلان‌ها، پیام‌ها + «منو» که کشوی منو را باز می‌کند.
// «منو» با onMenu یا رویداد window «motoshub:open-menu» (سربرگ به آن گوش می‌دهد) باز می‌شود.
// یک فاصله‌گذار هم‌ارتفاع رندر می‌کند تا انتهای محتوا زیر نوار پنهان نشود.
// ---------------------------------------------------------------------------
import { NavLink } from "react-router-dom";
import { Bell, House, Menu, MessagesSquare, Search } from "lucide-react";
import { useInbox } from "../context/InboxContext";
import { useSocial } from "../context/SocialContext";
import { useI18n } from "../i18n";
import { ICON_STROKE, ICON_STROKE_ACTIVE } from "./ui/Icon";

const badge = (n: number) => (n > 99 ? "۹۹+" : n.toLocaleString("fa-IR"));

export default function MobileBottomNav({ onMenu }: { onMenu?: () => void }) {
  const inbox = useInbox();
  const s = useSocial();
  const { t } = useI18n();
  const chatUnread = s.myChats(["direct_message", "group"]).reduce((a, c) => a + (c.muted_by.includes(s.me) ? 0 : s.unreadCount(c)), 0);

  const items = [
    { to: "/dashboard", end: true, label: "خانه", icon: House, count: 0 },
    { to: "/globalsearch", end: false, label: "جستجو", icon: Search, count: 0 },
    { to: "/notifications", end: false, label: "اعلان‌ها", icon: Bell, count: inbox.unread },
    { to: "/conversations", end: false, label: "پیام‌ها", icon: MessagesSquare, count: chatUnread },
  ];
  const cls = (active: boolean) => `relative flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-[11.5px] ${active ? "text-teal-700 font-bold" : "text-ink-500"}`;

  const openMenu = () => (onMenu ? onMenu() : window.dispatchEvent(new CustomEvent("motoshub:open-menu")));

  return (
    <>
      <div className="h-16 md:hidden" aria-hidden />
      <nav data-shell className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-[8px] border-t border-border pb-[env(safe-area-inset-bottom)]" aria-label="ناوبری اصلی موبایل" dir="rtl">
        <div className="flex items-stretch max-w-lg mx-auto">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => cls(isActive)}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-0 inset-x-5 h-0.5 rounded-full bg-teal-500" />}
                  <span className="relative">
                    <it.icon size={22} strokeWidth={isActive ? ICON_STROKE_ACTIVE : ICON_STROKE} />
                    {it.count > 0 && (
                      <span className="absolute -top-1.5 -end-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-brand-600 text-on-primary text-[10px] leading-[17px] text-center font-bold">{badge(it.count)}</span>
                    )}
                  </span>
                  {t(it.label)}
                </>
              )}
            </NavLink>
          ))}
          <button type="button" onClick={openMenu} className={cls(false)} aria-label="باز کردن منو">
            <Menu size={22} strokeWidth={ICON_STROKE} />
            {t("منو")}
          </button>
        </div>
      </nav>
    </>
  );
}
