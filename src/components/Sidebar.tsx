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
  Building2,
} from "lucide-react";
import { currentTenant } from "../data/mock";

type Item = { to: string; label: string; icon: typeof Users };

const sections: { title: string; items: Item[] }[] = [
  {
    title: "نمای کلی",
    items: [
      { to: "/app/dashboard", label: "داشبورد فعالیت‌ها", icon: LayoutDashboard },
      { to: "/app/news", label: "اخبار سازمان", icon: Newspaper },
    ],
  },
  {
    title: "شبکه اجتماعی",
    items: [
      { to: "/app/groups", label: "گروه‌های تعاملی", icon: Users },
      { to: "/app/forum", label: "انجمن", icon: MessagesSquare },
      { to: "/app/events", label: "رویدادها و جلسات", icon: CalendarDays },
      { to: "/app/blog", label: "بلاگ", icon: NotebookPen },
      { to: "/app/media", label: "تصاویر و ویدیو", icon: Image },
      { to: "/app/chat", label: "گفتگو", icon: MessageCircle },
    ],
  },
  {
    title: "دانش و پروژه",
    items: [
      { to: "/app/knowledge", label: "مدیریت دانش", icon: BookOpen },
      { to: "/app/projects", label: "مدیریت پروژه", icon: KanbanSquare },
      { to: "/app/contracts", label: "قراردادهای فناورانه", icon: FileSignature },
      { to: "/app/funds", label: "صندوق نوآوری و شتاب‌دهی", icon: PiggyBank },
      { to: "/app/research", label: "فرصت‌های پژوهشی", icon: FlaskConical },
      { to: "/app/reports", label: "گزارش‌گیری پیشرفته", icon: BarChart3 },
    ],
  },
  {
    title: "مدیریت",
    items: [
      { to: "/app/admin", label: "پنل راهبری", icon: Settings },
      { to: "/app/help", label: "راهنما", icon: HelpCircle },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-[260px] shrink-0 border-l border-ink-200 bg-navy-900 h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-white/10">
        <span className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center text-white shrink-0">
          <Building2 size={18} />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-sm leading-4 text-white truncate">موتوشاب</p>
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
