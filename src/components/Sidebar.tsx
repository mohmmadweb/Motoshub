import { NavLink } from "react-router-dom";
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
} from "lucide-react";
import { useTenancy } from "../context/TenancyContext";

/**
 * ناوبری نقش‌محور:
 *  - adminOnly: فقط نقش‌های دارای پنل راهبری.
 *  - viewPerm: آیتم فقط وقتی دیده می‌شود که نقش، مجوزِ دیدنِ آن ماژول را داشته باشد.
 *    ترتیب منو مطابق ساختار «همکاران / دانش و محتوا / تعامل و همکاری / رویدادها /
 *    پروژه‌ها / اسناد / بخش‌های ویژه مدیران» است؛ هر نقش فقط آیتم‌های مجاز خودش را می‌بیند.
 */
type Item = { to: string; label: string; icon: typeof Users; end?: boolean; adminOnly?: boolean; viewPerm?: string };

export const navSections: { title: string; items: Item[] }[] = [
  {
    title: "",
    items: [{ to: "/dashboard", label: "داشبورد", icon: LayoutDashboard, end: true }],
  },
  {
    title: "همکاران",
    items: [
      { to: "/dashboard/members", label: "اعضای سازمان", icon: Users, viewPerm: "members.view" },
      { to: "/dashboard/connections", label: "ارتباطات من", icon: UserPlus, viewPerm: "relations.use" },
    ],
  },
  {
    title: "دانش و محتوا",
    items: [
      { to: "/dashboard/magazines", label: "مجلات", icon: BookMarked, viewPerm: "magazines.list" },
      { to: "/dashboard/news", label: "اخبار سازمان", icon: Newspaper, viewPerm: "news.list" },
      { to: "/dashboard/media", label: "رسانه", icon: Image, viewPerm: "media.list" },
      { to: "/dashboard/forum", label: "پرسش و پاسخ", icon: MessagesSquare, viewPerm: "forum.list" },
      { to: "/dashboard/topics", label: "هشتگ‌ها و موضوعات", icon: Hash },
      { to: "/dashboard/knowledge", label: "مدیریت دانش", icon: BookOpen, viewPerm: "knowledge.list" },
    ],
  },
  {
    title: "تعامل و همکاری",
    items: [
      { to: "/dashboard/chat", label: "گفتگوها", icon: MessageCircle, viewPerm: "chat.view" },
      { to: "/dashboard/groups", label: "گروه‌ها", icon: UsersRound, viewPerm: "groups.list" },
      { to: "/dashboard/channels", label: "کانال‌ها", icon: Megaphone, viewPerm: "channels.list" },
    ],
  },
  {
    title: "رویدادها و جلسات",
    items: [{ to: "/dashboard/events", label: "تقویم", icon: CalendarDays, viewPerm: "events.list" }],
  },
  {
    title: "پروژه‌ها و فعالیت‌ها",
    items: [
      { to: "/dashboard/projects", label: "پروژه‌های من", icon: KanbanSquare, viewPerm: "projects.list" },
      { to: "/dashboard/my-work", label: "فعالیت‌ها و وظایف", icon: ListTodo, viewPerm: "projects.list" },
      { to: "/dashboard/project-teams", label: "تیم‌ها و مستندات پروژه", icon: FolderKanban, viewPerm: "projects.list" },
    ],
  },
  {
    title: "اسناد و فایل‌ها",
    items: [{ to: "/dashboard/files", label: "اسناد و فایل‌ها", icon: FolderOpen, viewPerm: "files.use" }],
  },
  {
    title: "بخش‌های ویژه مدیران",
    items: [
      { to: "/dashboard/admin", label: "پنل راهبری", icon: Settings, adminOnly: true },
      { to: "/dashboard/social-admin", label: "داشبورد مدیریتی شبکه", icon: Gauge, viewPerm: "social.dashboards" },
      { to: "/dashboard/reports", label: "گزارش‌گیری پیشرفته", icon: BarChart3, viewPerm: "reports.export" },
      { to: "/dashboard/assistant", label: "دستیار هوشمند", icon: Bot, viewPerm: "assistant.chat" },
      { to: "/dashboard/contracts", label: "قراردادهای فناورانه", icon: FileSignature, viewPerm: "contracts.list" },
      { to: "/dashboard/funds", label: "صندوق نوآوری و شتاب‌دهی", icon: PiggyBank, viewPerm: "funds.list" },
      { to: "/dashboard/research", label: "فرصت‌های پژوهشی", icon: FlaskConical, viewPerm: "research.list" },
      { to: "/dashboard/award", label: "جایزه نوآوری و فناوری", icon: Award, viewPerm: "research.list" },
      { to: "/dashboard/training", label: "آموزش و توانمندسازی", icon: GraduationCap, viewPerm: "training.create" },
    ],
  },
  {
    title: "حساب کاربری",
    items: [
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
          <div key={section.title || "home"}>
            {section.title && !(section.items.length === 1 && section.items[0].label === section.title) && <p className="text-[10.5px] font-semibold text-navy-300 uppercase tracking-wide px-2.5 mb-1.5">{section.title}</p>}
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
