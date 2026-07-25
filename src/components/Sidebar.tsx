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
} from "lucide-react";
import { currentTenant } from "../data/mock";

type Item = { to: string; label: string; icon: typeof Users; end?: boolean };

export const navSections: { title: string; items: Item[] }[] = [
  {
    title: "نمای کلی",
    items: [
      { to: "/dashboard", label: "داشبورد فعالیت‌ها", icon: LayoutDashboard, end: true },
      { to: "/dashboard/news", label: "اخبار سازمان", icon: Newspaper },
      { to: "/dashboard/assistant", label: "دستیار هوشمند", icon: Bot },
    ],
  },
  {
    title: "شبکه اجتماعی",
    items: [
      { to: "/dashboard/groups", label: "گروه‌های تعاملی", icon: Users },
      { to: "/dashboard/forum", label: "انجمن", icon: MessagesSquare },
      { to: "/dashboard/events", label: "رویدادها و جلسات", icon: CalendarDays },
      { to: "/dashboard/blog", label: "بلاگ", icon: NotebookPen },
      { to: "/dashboard/media", label: "تصاویر و ویدیو", icon: Image },
      { to: "/dashboard/chat", label: "گفتگو", icon: MessageCircle },
      { to: "/dashboard/friends", label: "دوستان و دنبال‌کردن", icon: UserPlus },
      { to: "/dashboard/polls", label: "نظرسنجی و آزمون", icon: ListChecks },
      { to: "/dashboard/competitions", label: "مسابقات و چالش‌ها", icon: Trophy },
    ],
  },
  {
    title: "دانش و پروژه",
    items: [
      { to: "/dashboard/knowledge", label: "مدیریت دانش", icon: BookOpen },
      { to: "/dashboard/projects", label: "مدیریت پروژه", icon: KanbanSquare },
      { to: "/dashboard/contracts", label: "قراردادهای فناورانه", icon: FileSignature },
      { to: "/dashboard/funds", label: "صندوق نوآوری و شتاب‌دهی", icon: PiggyBank },
      { to: "/dashboard/research", label: "فرصت‌های پژوهشی", icon: FlaskConical },
      { to: "/dashboard/award", label: "جایزه نوآوری و فناوری", icon: Award },
      { to: "/dashboard/training", label: "آموزش و توانمندسازی", icon: GraduationCap },
      { to: "/dashboard/reports", label: "گزارش‌گیری پیشرفته", icon: BarChart3 },
    ],
  },
  {
    title: "مدیریت",
    items: [
      { to: "/dashboard/admin", label: "پنل راهبری", icon: Settings },
      { to: "/dashboard/appearance", label: "ظاهر و برندسازی", icon: Palette },
      { to: "/dashboard/tickets", label: "تیکت پشتیبانی", icon: LifeBuoy },
      { to: "/dashboard/help", label: "راهنما", icon: HelpCircle },
    ],
  },
];

const sections = navSections;

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-[260px] shrink-0 border-l border-ink-200 bg-navy-900 h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-white/10">
        <span className="h-9 rounded-lg bg-white flex items-center justify-center px-1.5 shrink-0">
          <img src="/bonyad-logo.png" alt="بنیاد مستضعفان انقلاب اسلامی" className="h-7 w-auto" />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-sm leading-4 text-white truncate">بنیاد مستضعفان</p>
          <p className="text-[11px] text-navy-300 leading-4 truncate">{currentTenant.name}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section) => (
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
          <span className="font-semibold text-white">پلن {currentTenant.plan}</span>
          <span>{currentTenant.users.toLocaleString("fa-IR")} کاربر</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-brand-400" style={{ width: "62%" }} />
        </div>
      </div>
    </aside>
  );
}
