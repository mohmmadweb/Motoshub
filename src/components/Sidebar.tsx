import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Newspaper,
  Users,
  MessagesSquare,
  CalendarDays,
  NotebookPen,
  Image,
  MessageCircle,
  BookOpen,
  KanbanSquare,
  FileSignature,
  PiggyBank,
  FlaskConical,
  BarChart3,
  Settings,
  HelpCircle,
  GraduationCap,
  Bot,
  Palette,
  UserPlus,
  ListChecks,
  Trophy,
  LifeBuoy,
  Award,
  KeyRound,
} from "lucide-react";
import { useTenancy } from "../context/TenancyContext";

/**
 * ناوبری نقش‌محور:
 *  - adminOnly: فقط نقش‌های دارای پنل راهبری.
 *  - viewPerm: آیتم فقط وقتی دیده می‌شود که نقش، مجوزِ دیدنِ آن ماژول را داشته باشد.
 *    ماژول‌های اجتماعیِ باز (دوستان، نظرسنجی، مسابقات، جایزه) و صفحه‌های شخصی
 *    (ظاهر، تیکت، راهنما، نقش و دسترسی) viewPerm ندارند و برای همه دیده می‌شوند.
 */
type Item = { to: string; label: string; icon: typeof Users; end?: boolean; adminOnly?: boolean; viewPerm?: string };

export const navSections: { title: string; items: Item[] }[] = [
  {
    title: "نمای کلی",
    items: [
      { to: "/dashboard", label: "داشبورد فعالیت‌ها", icon: LayoutDashboard, end: true },
      { to: "/dashboard/news", label: "اخبار سازمان", icon: Newspaper, viewPerm: "news.list" },
      { to: "/dashboard/assistant", label: "دستیار هوشمند", icon: Bot, viewPerm: "assistant.chat" },
    ],
  },
  {
    title: "شبکه اجتماعی",
    items: [
      { to: "/dashboard/groups", label: "گروه‌های تعاملی", icon: Users, viewPerm: "groups.list" },
      { to: "/dashboard/forum", label: "انجمن", icon: MessagesSquare, viewPerm: "forum.list" },
      { to: "/dashboard/events", label: "رویدادها و جلسات", icon: CalendarDays, viewPerm: "events.list" },
      { to: "/dashboard/blog", label: "بلاگ", icon: NotebookPen, viewPerm: "blog.list" },
      { to: "/dashboard/media", label: "تصاویر و ویدیو", icon: Image, viewPerm: "media.list" },
      { to: "/dashboard/chat", label: "گفتگو", icon: MessageCircle, viewPerm: "chat.view" },
      { to: "/dashboard/friends", label: "دوستان و دنبال‌کردن", icon: UserPlus },
      { to: "/dashboard/polls", label: "نظرسنجی و آزمون", icon: ListChecks },
      { to: "/dashboard/competitions", label: "مسابقات و چالش‌ها", icon: Trophy },
    ],
  },
  {
    title: "دانش و پروژه",
    items: [
      { to: "/dashboard/knowledge", label: "مدیریت دانش", icon: BookOpen, viewPerm: "knowledge.list" },
      { to: "/dashboard/projects", label: "مدیریت پروژه", icon: KanbanSquare, viewPerm: "projects.list" },
      { to: "/dashboard/contracts", label: "قراردادهای فناورانه", icon: FileSignature, viewPerm: "contracts.list" },
      { to: "/dashboard/funds", label: "صندوق نوآوری و شتاب‌دهی", icon: PiggyBank, viewPerm: "funds.list" },
      { to: "/dashboard/research", label: "فرصت‌های پژوهشی", icon: FlaskConical, viewPerm: "research.list" },
      { to: "/dashboard/award", label: "جایزه نوآوری و فناوری", icon: Award },
      { to: "/dashboard/training", label: "آموزش و توانمندسازی", icon: GraduationCap, viewPerm: "training.list" },
      { to: "/dashboard/reports", label: "گزارش‌گیری پیشرفته", icon: BarChart3, viewPerm: "reports.view" },
    ],
  },
  {
    title: "مدیریت",
    items: [
      { to: "/dashboard/admin", label: "پنل راهبری", icon: Settings, adminOnly: true },
      { to: "/dashboard/access", label: "نقش و دسترسی من", icon: KeyRound },
      { to: "/dashboard/appearance", label: "ظاهر و برندسازی", icon: Palette },
      { to: "/dashboard/tickets", label: "تیکت پشتیبانی", icon: LifeBuoy },
      { to: "/dashboard/help", label: "راهنما", icon: HelpCircle },
    ],
  },
];

/** فیلترِ مشترکِ منو بر اساس دسترسی — هم Sidebar و هم Topbar از همین استفاده می‌کنند */
export function filterNavSections(ctx: { canAccessAdmin: boolean; hasPermission: (id: string) => boolean }) {
  return navSections
    .map((s) => ({
      ...s,
      items: s.items.filter(
        (i) => (!i.adminOnly || ctx.canAccessAdmin) && (!i.viewPerm || ctx.hasPermission(i.viewPerm))
      ),
    }))
    .filter((s) => s.items.length > 0);
}

export default function Sidebar() {
  const { identity, canAccessAdmin, hasPermission, session, activeScopeLabel } = useTenancy();
  const visibleSections = filterNavSections({ canAccessAdmin, hasPermission });
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

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {visibleSections.map((section) => (
          <div key={section.title}>
            <p className="text-[10.5px] font-semibold text-navy-300 uppercase tracking-wide px-2.5 mb-1.5">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors ${
                      isActive ? "bg-brand-600 text-white" : "text-navy-200 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  <item.icon size={16} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

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
