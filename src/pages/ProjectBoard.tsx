import { useState } from "react";
import { useParams } from "react-router-dom";
import { LayoutGrid, GanttChartSquare, FileText, Wallet } from "lucide-react";
import { projects, type Task } from "../data/mock";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import Tabs from "../components/ui/Tabs";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";

const statuses: Task["status"][] = ["برنامه‌ریزی", "در حال انجام", "بازبینی", "انجام‌شده"];
const priorityTone: Record<Task["priority"], BadgeTone> = {
  کم: "neutral",
  متوسط: "warning",
  زیاد: "danger",
};

type ViewId = "board" | "gantt" | "minutes";

export default function ProjectBoard() {
  const { id } = useParams();
  const project = projects.find((p) => p.id === id);
  const [view, setView] = useState<ViewId>("board");

  if (!project) return <p>پروژه پیدا نشد.</p>;

  return (
    <div>
      <PageHeader
        title={project.name}
        description={`کارفرما: ${project.client} · مهلت: ${project.deadline}`}
        icon={<GanttChartSquare size={18} />}
        breadcrumb={[{ label: "مدیریت پروژه", to: "/app/projects" }, { label: project.name }]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="پیشرفت کلی" value={`${project.progress}٪`} tone="brand" icon={<GanttChartSquare size={16} />} />
        <StatCard label="مصرف بودجه" value={`${project.budgetUsed}٪`} tone="warning" icon={<Wallet size={16} />} />
        <StatCard label="تعداد تسک" value={project.tasks.length} icon={<LayoutGrid size={16} />} />
        <StatCard label="وضعیت سلامت" value={project.health} tone={project.health === "سبز" ? "success" : project.health === "زرد" ? "warning" : "danger"} />
      </div>

      <Tabs<ViewId>
        tabs={[
          { id: "board", label: "بورد وظایف" },
          { id: "gantt", label: "گانت چارت" },
          { id: "minutes", label: "صورت‌جلسات" },
        ]}
        active={view}
        onChange={setView}
      />

      {view === "board" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statuses.map((status) => {
            const tasks = project.tasks.filter((t) => t.status === status);
            return (
              <div key={status} className="bg-ink-100/70 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs font-bold text-ink-600">{status}</h3>
                  <span className="text-xs text-ink-400">{tasks.length}</span>
                </div>
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <div key={t.id} className="card p-3">
                      <p className="text-xs font-medium leading-5 text-ink-900">{t.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
                        <span className="text-[11px] text-ink-400">{t.due}</span>
                      </div>
                      <p className="text-[11px] text-ink-500 mt-2">مسئول: {t.assignee}</p>
                    </div>
                  ))}
                  {tasks.length === 0 && <p className="text-[11px] text-ink-400 text-center py-3">خالی</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "gantt" && (
        <div className="card p-4 overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[200px_1fr] text-xs font-medium text-ink-400 mb-2 px-1">
              <span>عنوان تسک</span>
              <span>بازه زمانی</span>
            </div>
            <div className="space-y-3">
              {project.tasks.map((t, i) => (
                <div key={t.id} className="grid grid-cols-[200px_1fr] items-center gap-2">
                  <p className="text-xs font-medium truncate text-ink-800">{t.title}</p>
                  <div className="h-6 bg-ink-100 rounded-md relative overflow-hidden">
                    <div
                      className="absolute top-0 h-full rounded-md bg-brand-600 flex items-center px-2"
                      style={{ right: `${i * 12}%`, width: `${Math.max(t.progress, 15)}%` }}
                    >
                      <span className="text-[10px] text-white font-medium">{t.progress}٪</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "minutes" && (
        <EmptyState icon={<FileText size={20} />} title="صورت‌جلسات این پروژه" description="آرشیو صورت‌جلسات از ماژول مدیریت دانش با دسته‌بندی این پروژه نمایش داده می‌شود." />
      )}
    </div>
  );
}
