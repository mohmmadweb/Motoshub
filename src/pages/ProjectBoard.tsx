import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  LayoutGrid,
  GanttChartSquare,
  FileText,
  Wallet,
  Plus,
  Milestone,
  ShieldAlert,
  Users,
  Receipt,
  CircleDollarSign,
  CalendarCheck2,
} from "lucide-react";
import { projects, type Task } from "../data/mock";
import { projectDetails, type ProjectMilestone, type ProjectRisk } from "../data/mockDetails";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import Tabs from "../components/ui/Tabs";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Drawer from "../components/ui/Drawer";
import DataTable, { type Column } from "../components/ui/DataTable";
import { useToast } from "../components/ui/ToastProvider";

const statuses: Task["status"][] = ["برنامه‌ریزی", "در حال انجام", "بازبینی", "انجام‌شده"];
const priorityTone: Record<Task["priority"], BadgeTone> = {
  کم: "neutral",
  متوسط: "warning",
  زیاد: "danger",
};

const milestoneTone: Record<ProjectMilestone["status"], BadgeTone> = {
  "انجام‌شده": "success",
  "در حال انجام": "brand",
  "پیش‌رو": "neutral",
  "در خطر": "danger",
};

const riskSeverityTone: Record<ProjectRisk["severity"], BadgeTone> = {
  کم: "neutral",
  متوسط: "warning",
  بحرانی: "danger",
};

const riskStatusTone: Record<ProjectRisk["status"], BadgeTone> = {
  باز: "danger",
  "در حال رفع": "warning",
  بسته: "success",
};

const expenseTone: Record<string, BadgeTone> = {
  "پرداخت‌شده": "success",
  "در انتظار تأیید": "warning",
  "برنامه‌ریزی‌شده": "neutral",
};

type ViewId = "board" | "gantt" | "milestones" | "budget" | "risks" | "team" | "minutes";

export default function ProjectBoard() {
  const { id } = useParams();
  const project = projects.find((p) => p.id === id);
  const detail = id ? projectDetails[id] : undefined;
  const [view, setView] = useState<ViewId>("board");
  const [tasks, setTasks] = useState<Task[]>(project?.tasks ?? []);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState<Task["priority"]>("متوسط");
  const [taskDue, setTaskDue] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { notify } = useToast();

  if (!project) return <p>پروژه پیدا نشد.</p>;

  const submitTask = () => {
    if (!taskTitle.trim()) {
      notify("عنوان تسک الزامی است.", "warning");
      return;
    }
    const newTask: Task = {
      id: `t-${Date.now()}`,
      title: taskTitle.trim(),
      status: "برنامه‌ریزی",
      assignee: taskAssignee.trim() || "بدون مسئول",
      priority: taskPriority,
      due: taskDue.trim() || "نامشخص",
      progress: 0,
    };
    setTasks((prev) => [newTask, ...prev]);
    notify(`تسک «${newTask.title}» به ستون «برنامه‌ریزی» اضافه شد.`);
    setTaskOpen(false);
    setTaskTitle("");
    setTaskAssignee("");
    setTaskPriority("متوسط");
    setTaskDue("");
  };

  const moveTask = (task: Task, status: Task["status"]) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status, progress: status === "انجام‌شده" ? 100 : t.progress } : t
      )
    );
    setSelectedTask((prev) => (prev && prev.id === task.id ? { ...prev, status } : prev));
    notify(`تسک «${task.title}» به وضعیت «${status}» منتقل شد.`, "info");
  };

  const expenseColumns: Column<NonNullable<typeof detail>["expenses"][number]>[] = [
    { key: "title", label: "شرح هزینه", render: (e) => <span className="font-medium text-ink-900">{e.title}</span> },
    { key: "category", label: "سرفصل" },
    { key: "amount", label: "مبلغ" },
    { key: "date", label: "تاریخ" },
    { key: "status", label: "وضعیت", render: (e) => <Badge tone={expenseTone[e.status]}>{e.status}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title={project.name}
        description={`کارفرما: ${project.client} · مهلت: ${project.deadline}${detail ? ` · مدیر پروژه: ${detail.manager}` : ""}`}
        icon={<GanttChartSquare size={18} />}
        breadcrumb={[{ label: "مدیریت پروژه", to: "/dashboard/projects" }, { label: project.name }]}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setTaskOpen(true)}>
            تسک جدید
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="پیشرفت کلی" value={`${project.progress}٪`} tone="brand" icon={<GanttChartSquare size={16} />} />
        <StatCard
          label="مصرف بودجه"
          value={`${project.budgetUsed}٪`}
          hint={detail ? `${detail.budgetSpent} از ${detail.budgetTotal}` : undefined}
          tone="warning"
          icon={<Wallet size={16} />}
        />
        <StatCard label="تعداد تسک" value={tasks.length} icon={<LayoutGrid size={16} />} />
        <StatCard label="وضعیت سلامت" value={project.health} tone={project.health === "سبز" ? "success" : project.health === "زرد" ? "warning" : "danger"} />
      </div>

      <Tabs<ViewId>
        tabs={[
          { id: "board", label: "بورد وظایف", count: tasks.length },
          { id: "gantt", label: "گانت چارت" },
          { id: "milestones", label: "مایل‌ستون‌ها", count: detail?.milestones.length },
          { id: "budget", label: "مالی و بودجه", count: detail?.expenses.length },
          { id: "risks", label: "ریسک‌ها", count: detail?.risks.filter((r) => r.status !== "بسته").length },
          { id: "team", label: "تیم پروژه", count: detail?.team.length },
          { id: "minutes", label: "صورت‌جلسات", count: detail?.minutes.length },
        ]}
        active={view}
        onChange={setView}
      />

      {view === "board" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statuses.map((status) => {
            const columnTasks = tasks.filter((t) => t.status === status);
            return (
              <div key={status} className="bg-ink-100/70 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs font-bold text-ink-600">{status}</h3>
                  <span className="text-xs text-ink-400">{columnTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {columnTasks.map((t) => (
                    <button key={t.id} onClick={() => setSelectedTask(t)} className="card p-3 w-full text-right hover:border-brand-300 transition-colors">
                      <p className="text-xs font-medium leading-5 text-ink-900">{t.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
                        <span className="text-[11px] text-ink-400">{t.due}</span>
                      </div>
                      <p className="text-[11px] text-ink-500 mt-2">مسئول: {t.assignee}</p>
                    </button>
                  ))}
                  {columnTasks.length === 0 && <p className="text-[11px] text-ink-400 text-center py-3">خالی</p>}
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
              {tasks.map((t, i) => (
                <div key={t.id} className="grid grid-cols-[200px_1fr] items-center gap-2">
                  <p className="text-xs font-medium truncate text-ink-800">{t.title}</p>
                  <div className="h-6 bg-ink-100 rounded-md relative overflow-hidden">
                    <div
                      className="absolute top-0 h-full rounded-md bg-brand-600 flex items-center px-2"
                      style={{ right: `${(i * 12) % 60}%`, width: `${Math.max(t.progress, 15)}%` }}
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

      {view === "milestones" &&
        (detail && detail.milestones.length > 0 ? (
          <div className="card p-5">
            <div className="space-y-0">
              {detail.milestones.map((m, i) => (
                <div key={m.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                        m.status === "انجام‌شده" ? "bg-emerald-500" : m.status === "در حال انجام" ? "bg-brand-600" : m.status === "در خطر" ? "bg-rose-500" : "bg-ink-300"
                      }`}
                    />
                    {i < detail.milestones.length - 1 && <span className="w-px flex-1 bg-ink-200" />}
                  </div>
                  <div className="pb-6 flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5">
                        <Milestone size={14} className="text-brand-600" /> {m.title}
                      </p>
                      <Badge tone={milestoneTone[m.status]}>{m.status}</Badge>
                    </div>
                    <p className="text-xs text-ink-400 mt-1">سررسید: {m.due}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState icon={<Milestone size={20} />} title="مایل‌ستونی تعریف نشده" description="نقاط عطف کلیدی پروژه را برای پایش مدیریتی تعریف کنید." />
        ))}

      {view === "budget" &&
        (detail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard label="بودجه مصوب" value={detail.budgetTotal} tone="brand" icon={<CircleDollarSign size={16} />} />
              <StatCard label="هزینه‌کرد تاکنون" value={detail.budgetSpent} tone="warning" icon={<Receipt size={16} />} />
              <StatCard label="حامی مالی (اسپانسر)" value={detail.sponsor} icon={<Wallet size={16} />} />
            </div>
            <DataTable columns={expenseColumns} rows={detail.expenses} emptyTitle="هزینه‌ای ثبت نشده" />
          </div>
        ) : (
          <EmptyState icon={<Wallet size={20} />} title="اطلاعات مالی ثبت نشده" description="بودجه مصوب و هزینه‌کرد پروژه پس از ثبت در واحد مالی اینجا نمایش داده می‌شود." />
        ))}

      {view === "risks" &&
        (detail && detail.risks.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {detail.risks.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5">
                    <ShieldAlert size={15} className="text-rose-600 shrink-0" /> {r.title}
                  </p>
                  <Badge tone={riskStatusTone[r.status]}>{r.status}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge tone={riskSeverityTone[r.severity]}>شدت: {r.severity}</Badge>
                  <Badge tone="neutral">احتمال: {r.probability}</Badge>
                  <span className="text-[11px] text-ink-400 mr-auto">مسئول: {r.owner}</span>
                </div>
                <p className="text-xs text-ink-500 mt-3 leading-6 border-t border-ink-100 pt-3">
                  <span className="font-medium text-ink-700">اقدام کاهشی: </span>
                  {r.mitigation}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<ShieldAlert size={20} />} title="ریسکی ثبت نشده" description="ریسک‌ها و مسائل پروژه را برای پایش در کمیته راهبری ثبت کنید." />
        ))}

      {view === "team" &&
        (detail && detail.team.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {detail.team.map((m) => (
              <div key={m.id} className="card p-4">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                    <Users size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">{m.name}</p>
                    <p className="text-xs text-ink-400">{m.role}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
                    <span>تخصیص به پروژه</span>
                    <span>{m.allocation}٪</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                    <div className="h-full bg-brand-500" style={{ width: `${m.allocation}%` }} />
                  </div>
                </div>
                <p className="text-[11px] text-ink-400 mt-3 pt-3 border-t border-ink-100">{m.openTasks} تسک باز</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Users size={20} />} title="عضوی ثبت نشده" description="اعضای تیم و میزان تخصیص آن‌ها را تعریف کنید." />
        ))}

      {view === "minutes" &&
        (detail && detail.minutes.length > 0 ? (
          <div className="space-y-3">
            {detail.minutes.map((mn) => (
              <div key={mn.id} className="card p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-600 flex items-center justify-center shrink-0">
                    <FileText size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{mn.title}</p>
                    <p className="text-xs text-ink-400 mt-0.5">{mn.date} · {mn.attendees} حاضر</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="brand" icon={<CalendarCheck2 size={11} />}>{mn.decisions} مصوبه</Badge>
                  <Badge tone="warning">{mn.followUps} پیگیری</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<FileText size={20} />} title="صورت‌جلسات این پروژه" description="آرشیو صورت‌جلسات از ماژول مدیریت دانش با دسته‌بندی این پروژه نمایش داده می‌شود." />
        ))}

      <Modal open={taskOpen} onClose={() => setTaskOpen(false)} title="ایجاد تسک جدید" description="تسک جدید در ستون «برنامه‌ریزی» قرار می‌گیرد.">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان تسک</label>
            <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="مثلاً: برگزاری جلسه هماهنگی با پیمانکار" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">مسئول</label>
              <input value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} placeholder="نام مسئول" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">سررسید</label>
              <input value={taskDue} onChange={(e) => setTaskDue(e.target.value)} placeholder="۱۴۰۵/۰۵/۰۱" className="input-field" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">اولویت</label>
            <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as Task["priority"])} className="input-field">
              <option value="کم">کم</option>
              <option value="متوسط">متوسط</option>
              <option value="زیاد">زیاد</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitTask}>ایجاد تسک</Button>
            <Button variant="secondary" onClick={() => setTaskOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Drawer open={selectedTask !== null} onClose={() => setSelectedTask(null)} title="جزئیات تسک">
        {selectedTask && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-ink-900 leading-6">{selectedTask.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge tone={priorityTone[selectedTask.priority]}>اولویت: {selectedTask.priority}</Badge>
                <Badge tone="neutral">سررسید: {selectedTask.due}</Badge>
              </div>
            </div>
            <div className="text-xs text-ink-600 space-y-2">
              <p><span className="text-ink-400">مسئول:</span> {selectedTask.assignee}</p>
              <p><span className="text-ink-400">وضعیت فعلی:</span> {selectedTask.status}</p>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
                <span>پیشرفت</span>
                <span>{selectedTask.progress}٪</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                <div className="h-full bg-brand-500" style={{ width: `${selectedTask.progress}%` }} />
              </div>
            </div>
            <div className="border-t border-ink-100 pt-4">
              <p className="text-xs font-medium text-ink-600 mb-2">انتقال به وضعیت:</p>
              <div className="flex flex-wrap gap-2">
                {statuses
                  .filter((s) => s !== selectedTask.status)
                  .map((s) => (
                    <Button key={s} variant="secondary" size="sm" onClick={() => moveTask(selectedTask, s)}>
                      {s}
                    </Button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
