import { Link } from "react-router-dom";
import { KanbanSquare, Plus, Wallet, ListChecks, ClipboardList, PlayCircle } from "lucide-react";
import { projects, playbookTemplates } from "../data/mock";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";

const healthTone: Record<string, BadgeTone> = {
  سبز: "success",
  زرد: "warning",
  قرمز: "danger",
};

export default function Projects() {
  return (
    <div>
      <PageHeader
        title="مدیریت پروژه"
        description="پروژه‌های پژوهشی، فناورانه و آموزشی با بودجه، تسک و گانت چارت"
        icon={<KanbanSquare size={18} />}
        actions={
          <Button variant="primary" icon={<Plus size={15} />}>
            پروژه جدید
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {projects.map((p) => (
          <Link key={p.id} to={`/app/projects/${p.id}`} className="card p-4 hover:border-brand-300 transition-colors flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Badge tone={healthTone[p.health]}>وضعیت: {p.health}</Badge>
              <span className="text-xs text-ink-400">مهلت {p.deadline}</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-ink-900">{p.name}</h3>
              <p className="text-xs text-ink-400 mt-1">کارفرما: {p.client}</p>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
                <span>پیشرفت</span>
                <span>{p.progress}٪</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                <div className="h-full bg-brand-500" style={{ width: `${p.progress}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-ink-400 pt-2 border-t border-ink-100">
              <span className="flex items-center gap-1">
                <Wallet size={12} /> مصرف بودجه: {p.budgetUsed}٪
              </span>
              <span className="flex items-center gap-1">
                <ListChecks size={12} /> {p.tasks.length} تسک
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <ClipboardList size={15} className="text-brand-600" /> قالب‌های فرآیند عملیاتی (Playbooks)
          </h2>
          <p className="text-xs text-ink-400 mt-0.5">رویه‌های تکرارشونده (مثل تحویل پروژه یا واکنش به حادثه) را به یک گردش‌کار چک‌لیستی تبدیل کنید.</p>
        </div>
        <Button variant="secondary" size="sm" icon={<Plus size={13} />}>قالب جدید</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {playbookTemplates.map((pb) => (
          <div key={pb.id} className="card p-4">
            <p className="text-sm font-semibold text-ink-900">{pb.name}</p>
            <p className="text-xs text-ink-400 mt-1">{pb.category} · {pb.steps} مرحله</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100">
              <span className="text-[11px] text-ink-400">{pb.usedCount} بار اجراشده</span>
              <Button variant="ghost" size="sm" icon={<PlayCircle size={13} />}>اجرا</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
