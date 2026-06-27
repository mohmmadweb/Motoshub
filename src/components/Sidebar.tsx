import { NavLink } from "react-router-dom";
import { currentTenant } from "../data/mock";

const navItems = [
  { to: "/app/dashboard", label: "داشبورد", icon: "🏠" },
  { to: "/app/groups", label: "گروه‌های تعاملی", icon: "👥" },
  { to: "/app/forum", label: "انجمن", icon: "💬" },
  { to: "/app/chat", label: "گفتگو", icon: "✉️" },
  { to: "/app/knowledge", label: "مدیریت دانش", icon: "📚" },
  { to: "/app/projects", label: "مدیریت پروژه", icon: "📊" },
  { to: "/app/profile/u1", label: "پروفایل من", icon: "🪪" },
  { to: "/app/admin", label: "پنل راهبری", icon: "⚙️" },
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-l border-ink-100 bg-white h-screen sticky top-0 px-4 py-5">
      <div className="flex items-center gap-2 px-2 mb-6">
        <span className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-lg">م</span>
        <div>
          <p className="font-bold text-sm leading-4">موتوشاب</p>
          <p className="text-[11px] text-ink-400 leading-4">{currentTenant.name}</p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50"
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="rounded-xl bg-ink-50 p-3 text-xs text-ink-500">
        <p className="font-semibold text-ink-700 mb-1">پلن سازمانی</p>
        <p>{currentTenant.users.toLocaleString("fa-IR")} کاربر فعال</p>
      </div>
    </aside>
  );
}
