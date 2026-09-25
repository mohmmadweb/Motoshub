import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Newspaper,
  Users,
  UsersRound,
  UserPlus,
  MessagesSquare,
  CalendarDays,
  BookMarked,
  Image,
  MessageCircle,
  Megaphone,
  Hash,
  BookOpen,
  KanbanSquare,
  ListTodo,
  FolderKanban,
  FolderOpen,
  FileSignature,
  PiggyBank,
  FlaskConical,
  BarChart3,
  Gauge,
  Settings,
  HelpCircle,
  GraduationCap,
  Bot,
  Palette,
  LifeBuoy,
  Award,
  KeyRound,
  Network,
  Lightbulb,
  ChevronDown,
} from "lucide-react";
import { useTenancy } from "../context/TenancyContext";

/**
 * ناوبری نقش‌محور، در دو سطح:
 *  - کلاستر = محصول/ماژول (نمای کلی، شبکه اجتماعی، مدیریت پروژه، دانش و نوآوری، مدیریت سامانه)
 *  - گروه = دسته‌ی داخلی همان محصول (مثلاً «همکاران»، «دانش و محتوا» در شبکه اجتماعی)
 *  - adminOnly: فقط نقش‌های دارای پنل راهبری · viewPerm: فقط با مجوز دیدنِ همان ماژول.
 * هر نقش فقط آیتم‌های مجاز خودش را می‌بیند؛ کلاستر یا گروهِ خالی نمایش داده نمی‌شود.
 */
type Item = { to: string; label: string; icon: typeof Users; end?: boolean; adminOnly?: boolean; viewPerm?: string };
export type ClusterId = "home" | "social" | "pm" | "knowledge" | "admin";
export const navClusters: Record<ClusterId, { title: string; icon: typeof Users }> = {
  home: { title: "نمای کلی", icon: LayoutDashboard },
  social: { title: "شبکه اجتماعی", icon: Network },
  pm: { title: "مدیریت پروژه", icon: KanbanSquare },
  knowledge: { title: "دانش و نوآوری", icon: Lightbulb },
  admin: { title: "مدیریت سامانه", icon: Settings },
};

export const navSections: { cluster: ClusterId; title: string; items: Item[] }[] = [
  // ------------------------------------------------ نمای کلی
  {
    cluster: "home",
    title: "",
    items: [
      { to: "/dashboard", label: "داشبورد", icon: LayoutDashboard, end: true },
      { to: "/dashboard/assistant", label: "دستیار هوشمند", icon: Bot, viewPerm: "assistant.chat" },
    ],
  },
  // ------------------------------------------------ شبکه اجتماعی (منطبق بر Motoshub Social API)
  {
    cluster: "social",
    title: "همکاران",
    items: [
      { to: "/dashboard/members", label: "اعضای سازمان", icon: Users, viewPerm: "members.view" },
      { to: "/dashboard/connections", label: "ارتباطات من", icon: UserPlus, viewPerm: "relations.use" },
    ],
  },
  {
    cluster: "social",
    title: "دانش و محتوا",
    items: [
      { to: "/dashboard/magazines", label: "مجلات", icon: BookMarked, viewPerm: "magazines.list" },
      { to: "/dashboard/news", label: "اخبار سازمان", icon: Newspaper, viewPerm: "news.list" },
      { to: "/dashboard/media", label: "رسانه", icon: Image, viewPerm: "media.list" },
      { to: "/dashboard/forum", label: "پرسش و پاسخ", icon: MessagesSquare, viewPerm: "forum.list" },
      { to: "/dashboard/topics", label: "هشتگ‌ها و موضوعات", icon: Hash },
    ],
  },
  {
    cluster: "social",
    title: "تعامل و همکاری",
    items: [
      { to: "/dashboard/chat", label: "گفتگوها", icon: MessageCircle, viewPerm: "chat.view" },
      { to: "/dashboard/groups", label: "گروه‌ها", icon: UsersRound, viewPerm: "groups.list" },
      { to: "/dashboard/channels", label: "کانال‌ها", icon: Megaphone, viewPerm: "channels.list" },
    ],
  },
  {
    cluster: "social",
    title: "رویدادها و جلسات",
    items: [{ to: "/dashboard/events", label: "تقویم", icon: CalendarDays, viewPerm: "events.list" }],
  },
  {
    cluster: "social",
    title: "اسناد و فایل‌ها",
    items: [{ to: "/dashboard/files", label: "اسناد و فایل‌ها", icon: FolderOpen, viewPerm: "files.use" }],
  },
  {
    cluster: "social",
    title: "بخش‌های ویژه مدیران",
    items: [{ to: "/dashboard/social-admin", label: "داشبورد مدیریتی شبکه", icon: Gauge, viewPerm: "social.dashboards" }],
  },
  // ------------------------------------------------ مدیریت پروژه
  {
    cluster: "pm",
    title: "پروژه‌ها و فعالیت‌ها",
    items: [
      { to: "/dashboard/projects", label: "پروژه‌های من", icon: KanbanSquare, viewPerm: "projects.list" },
      { to: "/dashboard/my-work", label: "فعالیت‌ها و وظایف", icon: ListTodo, viewPerm: "projects.list" },
      { to: "/dashboard/project-teams", label: "تیم‌ها و مستندات پروژه", icon: FolderKanban, viewPerm: "projects.list" },
    ],
  },
  // ------------------------------------------------ دانش و نوآوری
  {
    cluster: "knowledge",
    title: "",
    items: [
      { to: "/dashboard/knowledge", label: "مدیریت دانش", icon: BookOpen, viewPerm: "knowledge.list" },
      { to: "/dashboard/research", label: "فرصت‌های پژوهشی", icon: FlaskConical, viewPerm: "research.list" },
      { to: "/dashboard/contracts", label: "قراردادهای فناورانه", icon: FileSignature, viewPerm: "contracts.list" },
      { to: "/dashboard/funds", label: "صندوق نوآوری و شتاب‌دهی", icon: PiggyBank, viewPerm: "funds.list" },
      { to: "/dashboard/award", label: "جایزه نوآوری و فناوری", icon: Award },
      { to: "/dashboard/training", label: "آموزش و توانمندسازی", icon: GraduationCap, viewPerm: "training.list" },
    ],
  },
  // ------------------------------------------------ مدیریت سامانه
  {
    cluster: "admin",
    title: "",
    items: [
      { to: "/dashboard/admin", label: "پنل راهبری", icon: Settings, adminOnly: true },
      { to: "/dashboard/reports", label: "گزارش‌گیری پیشرفته", icon: BarChart3, viewPerm: "reports.view" },
      { to: "/dashboard/access", label: "نقش و دسترسی من", icon: KeyRound },
      { to: "/dashboard/appearance", label: "ظاهر و برندسازی", icon: Palette },
      { to: "/dashboard/tickets", label: "تیکت پشتیبانی", icon: LifeBuoy },
      { to: "/dashboard/help", label: "راهنما", icon: HelpCircle },
    ],
  },
];

/** فیلترِ مشترکِ منو بر اساس دسترسی — Sidebar، منوی موبایل و پالت فرمان از همین استفاده می‌کنند */
export function filterNavSections(ctx: { canAccessAdmin: boolean; hasPermission: (id: string) => boolean }) {
  return navSections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => (!i.adminOnly || ctx.canAccessAdmin) && (!i.viewPerm || ctx.hasPermission(i.viewPerm))),
    }))
    .filter((s) => s.items.length > 0);
}

const COLLAPSE_KEY = "motoshub.navCollapsed.v1";
const readCollapsed = (): ClusterId[] => {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? "[]");
  } catch {
    return [];
  }
};

/** درخت منو: کلاسترهای جمع‌شونده ← گروه‌ها ← آیتم‌ها (مشترک بین سایدبار و منوی موبایل) */
export function NavTree({ onNavigate, mobile = false }: { onNavigate?: () => void; mobile?: boolean }) {
  const { canAccessAdmin, hasPermission } = useTenancy();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState<ClusterId[]>(readCollapsed);
  const sections = filterNavSections({ canAccessAdmin, hasPermission });
  const order = (Object.keys(navClusters) as ClusterId[]).filter((c) => sections.some((s) => s.cluster === c));
  const isActive = (to: string, end?: boolean) => (end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`));
  const toggle = (c: ClusterId) =>
    setCollapsed((cur) => {
      const next = cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c];
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      } catch {
        /* نادیده */
      }
      return next;
    });

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
      {order.map((c) => {
        const cl = navClusters[c];
        const groups = sections.filter((s) => s.cluster === c);
        const hasActive = groups.some((g) => g.items.some((i) => isActive(i.to, i.end)));
        // کلاسترِ صفحه‌ی فعلی همیشه باز است
        const open = hasActive || !collapsed.includes(c);
        return (
          <div key={c} className={c === "home" ? "pb-1" : "pt-2 border-t border-white/10"}>
            {c !== "home" && (
              <button
                onClick={() => !hasActive && toggle(c)}
                aria-expanded={open}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12.5px] font-bold text-white hover:bg-white/5"
              >
                <cl.icon size={15} className="shrink-0 text-brand-300" />
                <span className="flex-1 text-right">{cl.title}</span>
                {!hasActive && <ChevronDown size={14} className={`text-navy-300 transition-transform ${open ? "" : "-rotate-90"}`} />}
              </button>
            )}
            {open && (
              <div className={c === "home" ? "space-y-0.5" : "mt-1 space-y-2.5"}>
                {groups.map((g) => (
                  <div key={g.title || c}>
                    {g.title && !(g.items.length === 1 && g.items[0].label === g.title) && (
                      <p className="text-[10.5px] font-semibold text-navy-300 px-2.5 mb-1">{g.title}</p>
                    )}
                    <div className="space-y-0.5">
                      {g.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          onClick={onNavigate}
                          className={({ isActive: a }) =>
                            `flex items-center gap-2.5 px-2.5 ${mobile ? "py-2.5 text-[13.5px]" : "py-2 text-[13px]"} rounded-md font-medium transition-colors ${
                              a ? "bg-brand-600 text-white" : "text-navy-200 hover:bg-white/5 hover:text-white"
                            }`
                          }
                        >
                          <item.icon size={mobile ? 17 : 16} className="shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const { identity, session, activeScopeLabel } = useTenancy();
  return (
    <aside className="hidden lg:flex flex-col w-[260px] shrink-0 border-l border-ink-200 bg-navy-900 h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-white/10">
        <span className="h-9 rounded-lg bg-white flex items-center justify-center px-1.5 shrink-0">
          <img src="/bonyad-logo.png" alt="بنیاد مستضعفان انقلاب اسلامی" className="h-7 w-auto" />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-[12.5px] leading-[1.35] text-white line-clamp-2">{identity.name}</p>
          <p className="text-[10.5px] text-navy-300 leading-4 truncate mt-0.5">
            {session.level === "سیستم" ? "فضای کاری سازمانی" : activeScopeLabel}
          </p>
        </div>
      </div>

      <NavTree />

      <div className="m-3 rounded-lg bg-white/5 p-3 text-[11px] text-navy-200">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-white">پلن سازمانی</span>
          <span>{session.memberCompanyIds.length > 0 ? `${session.memberCompanyIds.length.toLocaleString("fa-IR")} عضویت` : "دسترسی کامل"}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-brand-400" style={{ width: "62%" }} />
        </div>
      </div>
    </aside>
  );
}
