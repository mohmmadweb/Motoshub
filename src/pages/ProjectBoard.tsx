import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { GanttChartSquare, LayoutGrid, Wallet, Plus, Archive, Eye } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { useTenancy } from "../context/TenancyContext";
import { useProjectsPM } from "../context/ProjectsContext";
import { activeTasks, budgetUsage, paidTotal, projectProgress } from "../pm/selectors";
import { fa, fmtRial } from "../pm/jalali";
import { ProjectPageContext, type TabId } from "./project/shared";
import { ProjectIcon } from "./project/projectIcons";
import OverviewTab from "./project/OverviewTab";
import BoardTab from "./project/BoardTab";
import GanttTab from "./project/GanttTab";
import GraphTab from "./project/GraphTab";
import CalendarTab from "./project/CalendarTab";
import MilestonesTab from "./project/MilestonesTab";
import FinanceTab from "./project/FinanceTab";
import TimeTab from "./project/TimeTab";
import RisksTab from "./project/RisksTab";
import IssuesTab from "./project/IssuesTab";
import TeamTab from "./project/TeamTab";
import CommunicationTab from "./project/CommunicationTab";
import MeetingsTab from "./project/MeetingsTab";
import DocumentsTab from "./project/DocumentsTab";
import ReportsTab from "./project/ReportsTab";
import HistoryTab from "./project/HistoryTab";
import NotificationsTab from "./project/NotificationsTab";
import PlaybooksTab from "./project/PlaybooksTab";
import SettingsTab from "./project/SettingsTab";
import TaskDrawer from "./project/TaskDrawer";
import TaskCreateModal from "./project/TaskCreateModal";

const validTabs: TabId[] = ["overview", "board", "gantt", "graph", "calendar", "milestones", "budget", "time", "risks", "issues", "team", "communication", "minutes", "documents", "reports", "history", "notifications", "playbooks", "settings"];

export default function ProjectBoard() {
  const { id } = useParams();
  const { hasPermission, actingUser } = useTenancy();
  const pm = useProjectsPM();
  const p = pm.getProject(id);
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab") as TabId | null;
  const view: TabId = tabParam && validTabs.includes(tabParam) ? tabParam : "board";
  const focusId = params.get("focus") ?? undefined;
  const [taskId, setTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | undefined>();

  const myRole = p?.members.find((m) => m.name === actingUser.name || m.userId === actingUser.id)?.role;
  const canManage = !!p && hasPermission("projects.tasks") && myRole !== "مشاهده‌گر";
  const canEdit = canManage && !p.meta.archived;
  // لینک مستقیم به یک تسک (مثلاً از اعلان): ?tab=board&focus=t2 ← جزئیات تسک باز می‌شود
  useEffect(() => {
    if (focusId && (view === "board" || view === "overview") && p?.tasks.some((t) => t.id === focusId)) setTaskId(focusId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, view]);
  const unreadHere = useMemo(() => pm.store.notifications.filter((n) => n.projectId === id && !n.read).length, [pm.store.notifications, id]);

  if (!p || !id) {
    return <EmptyState icon={<GanttChartSquare size={20} />} title="پروژه پیدا نشد" description="ممکن است حذف شده باشد. به فهرست پروژه‌ها برگردید." />;
  }

  const goTab = (tab: TabId, entityId?: string) => {
    setTaskId(null);
    const next = new URLSearchParams(params);
    next.set("tab", tab);
    if (entityId) next.set("focus", entityId);
    else next.delete("focus");
    setParams(next, { replace: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const ts = activeTasks(p);
  const openRisks = p.risks.filter((r) => r.status !== "بسته").length;
  const openIssues = p.issues.filter((i) => i.status === "باز" || i.status === "در حال بررسی").length;

  const groups: { label: string; tabs: { id: TabId; label: string; count?: number }[] }[] = [
    { label: "کلیات", tabs: [{ id: "overview", label: "نمای کلی" }] },
    {
      label: "برنامه‌ریزی و وظایف",
      tabs: [
        { id: "board", label: "بورد وظایف", count: ts.length },
        { id: "gantt", label: "گانت چارت" },
        { id: "graph", label: "گراف وابستگی وظایف", count: p.deps.length },
        { id: "calendar", label: "تقویم" },
        { id: "milestones", label: "مایل‌ستون‌ها", count: p.milestones.length },
      ],
    },
    {
      label: "مالی و زمان",
      tabs: [
        { id: "budget", label: "مالی و بودجه", count: p.expenses.length },
        { id: "time", label: "ثبت زمان" },
      ],
    },
    {
      label: "کنترل",
      tabs: [
        { id: "risks", label: "ریسک‌ها", count: openRisks },
        { id: "issues", label: "مشکلات", count: openIssues },
        { id: "reports", label: "گزارش‌ها" },
      ],
    },
    {
      label: "تیم و ارتباطات",
      tabs: [
        { id: "team", label: "تیم پروژه", count: p.members.length },
        { id: "communication", label: "کانال‌ها و گفتگو" },
        { id: "minutes", label: "جلسات و صورت‌جلسات", count: p.minutes.length },
        { id: "documents", label: "اسناد", count: p.documents.length },
      ],
    },
    {
      label: "سامانه",
      tabs: [
        { id: "history", label: "تاریخچه رویدادها", count: p.logs.length },
        { id: "notifications", label: "اعلان‌ها و خودکارسازی", count: unreadHere || undefined },
        { id: "playbooks", label: "Playbook", count: pm.store.executions.filter((e) => e.projectId === id && e.status === "در حال اجرا").length || undefined },
        { id: "settings", label: "تنظیمات" },
      ],
    },
  ];

  const openCreate = (status?: string) => {
    setCreateStatus(status);
    setCreateOpen(true);
  };

  return (
    <ProjectPageContext.Provider value={{ p, pid: id, canEdit, canManage, refDate: pm.refDate, openTask: setTaskId, goTab, focusId }}>
      <div>
        <PageHeader
          title={p.meta.name}
          description={`کارفرما: ${p.meta.client} · مهلت: ${p.meta.deadline} · مدیر پروژه: ${p.meta.manager}`}
          icon={
            <span style={{ color: p.meta.color }}>
              <ProjectIcon name={p.meta.icon} size={18} />
            </span>
          }
          breadcrumb={[{ label: "مدیریت پروژه", to: "/dashboard/projects" }, { label: p.meta.name }]}
          actions={
            canEdit ? (
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => openCreate()}>
                تسک جدید
              </Button>
            ) : null
          }
        />

        {p.meta.archived && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs p-3 flex items-center gap-2">
            <Archive size={14} /> این پروژه بایگانی شده و فقط‌خواندنی است. برای ویرایش از
            <button onClick={() => goTab("settings")} className="underline">
              تنظیمات
            </button>
            بازیابی کنید.
          </div>
        )}
        {myRole === "مشاهده‌گر" && (
          <div className="mb-4 rounded-lg border border-ink-200 bg-ink-50 text-ink-600 text-xs p-3 flex items-center gap-2">
            <Eye size={14} /> نقش شما در این پروژه «مشاهده‌گر» است؛ فقط امکان مشاهده دارید.
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="پیشرفت کلی" value={`${fa(projectProgress(p))}٪`} tone="brand" icon={<GanttChartSquare size={16} />} />
          <StatCard label="مصرف بودجه" value={`${fa(Math.round(budgetUsage(p)))}٪`} hint={`${fmtRial(paidTotal(p))} از ${fmtRial(p.budget.total)}`} tone="warning" icon={<Wallet size={16} />} />
          <StatCard label="تعداد تسک" value={fa(ts.length)} icon={<LayoutGrid size={16} />} />
          <StatCard label="وضعیت سلامت" value={p.meta.health} hint={`مرحله: ${p.meta.phase}`} tone={p.meta.health === "سبز" ? "success" : p.meta.health === "زرد" ? "warning" : "danger"} />
        </div>

        {/* نوار تب‌ها — دسکتاپ: گروه‌بندی‌شده و چندسطری؛ موبایل: فهرست کشویی */}
        <div className="sm:hidden mb-4">
          <select value={view} onChange={(e) => goTab(e.target.value as TabId)} className="input-field" aria-label="بخش پروژه">
            {groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.tabs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                    {t.count !== undefined ? ` (${fa(t.count)})` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="hidden sm:flex flex-wrap items-stretch gap-y-1 border-b border-ink-200 mb-5" role="tablist">
          {groups.map((g, gi) => (
            <Fragment key={g.label}>
              {gi > 0 && <span className="w-px bg-ink-200 my-2 mx-1" aria-hidden />}
              {g.tabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={view === t.id}
                  onClick={() => goTab(t.id)}
                  title={g.label}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${view === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"}`}
                >
                  {t.label}
                  {t.count !== undefined && <span className={`text-[10px] rounded-full px-1.5 ${view === t.id ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500"}`}>{fa(t.count)}</span>}
                </button>
              ))}
            </Fragment>
          ))}
        </div>

        {view === "overview" && <OverviewTab />}
        {view === "board" && <BoardTab onNewTask={openCreate} />}
        {view === "gantt" && <GanttTab />}
        {view === "graph" && <GraphTab />}
        {view === "calendar" && <CalendarTab />}
        {view === "milestones" && <MilestonesTab />}
        {view === "budget" && <FinanceTab />}
        {view === "time" && <TimeTab />}
        {view === "risks" && <RisksTab />}
        {view === "issues" && <IssuesTab />}
        {view === "team" && <TeamTab />}
        {view === "communication" && <CommunicationTab />}
        {view === "minutes" && <MeetingsTab />}
        {view === "documents" && <DocumentsTab />}
        {view === "reports" && <ReportsTab />}
        {view === "history" && <HistoryTab />}
        {view === "notifications" && <NotificationsTab />}
        {view === "playbooks" && <PlaybooksTab />}
        {view === "settings" && <SettingsTab />}

        {canEdit && <TaskCreateModal open={createOpen} onClose={() => setCreateOpen(false)} defaultStatus={createStatus} />}
        <TaskDrawer taskId={taskId} onClose={() => setTaskId(null)} />
        <p className="sr-only">
          <Link to="/dashboard/projects">بازگشت به فهرست پروژه‌ها</Link>
        </p>
      </div>
    </ProjectPageContext.Provider>
  );
}
