import { Link } from "react-router-dom";
import { projects } from "../data/mock";
import Badge from "../components/Badge";

const healthTone: Record<string, "green" | "yellow" | "red"> = {
  سبز: "green",
  زرد: "yellow",
  قرمز: "red",
};

export default function Projects() {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">مدیریت پروژه</h1>
          <p className="text-sm text-ink-400 mt-1">پروژه‌ها، تسک‌ها، گانت چارت و بودجه — هسته‌ی برگرفته از میزیتو</p>
        </div>
        <button className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-brand-700">
          + پروژه جدید
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <Link key={p.id} to={`/app/projects/${p.id}`} className="card p-4 hover:shadow-md transition-shadow flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Badge tone={healthTone[p.health]}>وضعیت: {p.health}</Badge>
              <span className="text-xs text-ink-400">مهلت {p.deadline}</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm">{p.name}</h3>
              <p className="text-xs text-ink-400 mt-1">کارفرما: {p.client}</p>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
                <span>پیشرفت</span>
                <span>{p.progress}٪</span>
              </div>
              <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                <div className="h-full bg-brand-500" style={{ width: `${p.progress}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-ink-400">
              <span>مصرف بودجه: {p.budgetUsed}٪</span>
              <span>{p.tasks.length} تسک</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
