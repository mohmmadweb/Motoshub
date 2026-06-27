import { useState } from "react";
import { useParams } from "react-router-dom";
import { projects, type Task } from "../data/mock";
import Badge from "../components/Badge";

const statuses: Task["status"][] = ["برنامه‌ریزی", "در حال انجام", "بازبینی", "انجام‌شده"];
const priorityTone: Record<Task["priority"], "ink" | "yellow" | "red"> = {
  کم: "ink",
  متوسط: "yellow",
  زیاد: "red",
};

export default function ProjectBoard() {
  const { id } = useParams();
  const project = projects.find((p) => p.id === id);
  const [view, setView] = useState<"بورد" | "گانت">("بورد");

  if (!project) return <p>پروژه پیدا نشد.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">{project.name}</h1>
          <p className="text-sm text-ink-400 mt-1">کارفرما: {project.client} · مهلت: {project.deadline}</p>
        </div>
        <div className="flex items-center gap-1 bg-ink-100 rounded-xl p-1">
          {(["بورد", "گانت"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg ${
                view === v ? "bg-white shadow text-brand-700" : "text-ink-500"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "بورد" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statuses.map((status) => {
            const tasks = project.tasks.filter((t) => t.status === status);
            return (
              <div key={status} className="bg-ink-100/60 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs font-bold text-ink-600">{status}</h3>
                  <span className="text-xs text-ink-400">{tasks.length}</span>
                </div>
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <div key={t.id} className="card p-3">
                      <p className="text-xs font-medium leading-5">{t.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
                        <span className="text-[11px] text-ink-400">{t.due}</span>
                      </div>
                      <p className="text-[11px] text-ink-500 mt-2">👤 {t.assignee}</p>
                    </div>
                  ))}
                  {tasks.length === 0 && <p className="text-[11px] text-ink-400 text-center py-3">خالی</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-4 overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[200px_1fr] text-xs font-medium text-ink-400 mb-2 px-1">
              <span>عنوان تسک</span>
              <span>بازه زمانی</span>
            </div>
            <div className="space-y-3">
              {project.tasks.map((t, i) => (
                <div key={t.id} className="grid grid-cols-[200px_1fr] items-center gap-2">
                  <p className="text-xs font-medium truncate">{t.title}</p>
                  <div className="h-6 bg-ink-100 rounded-lg relative overflow-hidden">
                    <div
                      className="absolute top-0 h-full rounded-lg bg-brand-500/90 flex items-center px-2"
                      style={{
                        right: `${i * 12}%`,
                        width: `${Math.max(t.progress, 15)}%`,
                      }}
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
    </div>
  );
}
