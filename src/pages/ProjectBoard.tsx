import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { GanttChartSquare, LayoutGrid, Wallet, Plus, Archive, Eye, History, Bell, Settings, ChevronDown } from "lucide-react";
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
import { ProjectKnowledgeFile } from "./knowledge/ProjectKnowledge";

const validTabs: TabId[] = ["overview", "board", "gantt", "graph", "calendar", "milestones", "budget", "time", "risks", "issues", "team", "communication", "minutes", "documents", "reports", "history", "notifications", "playbooks", "knowledge", "settings"];

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
  const [moreOpen, setMoreOpen] = useState(false);

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

  // تب‌های اصلی همیشه دیده می‌شوند؛ بقیه در منوی «بیشتر» — تا نوار شلوغ نشود
  type TabDef = { id: TabId; label: string; count?: number };
  const primary: TabDef[] = [
    { id: "overview", label: "نمای کلی" },
    { id: "board", label: "بورد وظایف", count: ts.length },
    { id: "gantt", label: "گانت چارت" },
    { id: "graph", label: "گراف وابستگی وظایف" },
    { id: "milestones", label: "مایل‌ستون‌ها" },
    { id: "budget", label: "مالی و بودجه" },
    { id: "risks", label: "ریسک‌ها", count: openRisks || undefined },
    { id: "team", label: "تیم پروژه" },
    { id: "minutes", label: "جلسات" },
  ];
  const more: TabDef[] = [
    { id: "calendar", label: "تقویم" },
    { id: "time", label: "ثبت زمان" },
    { id: "issues", label: "مشکلات", count: openIssues || undefined },
    { id: "reports", label: "گزارش‌ها" },
    { id: "communication", label: "کانال‌ها و گفتگو" },
    { id: "documents", label: "اسناد" },
    { id: "playbooks", label: "Playbook" },
    { id: "knowledge", label: "دانش و درس‌آموخته‌ها" },
    { id: "history", label: "تاریخچه رویدادها" },
    { id: "notifications", label: "اعلان‌ها و خودکارسازی", count: unreadHere || undefined },
    { id: "settings", label: "تنظیمات پروژه" },
  ];
  const activeMore = more.find((t) => t.id === view);

  const openCreate = (status?: string) => {
    setCreateStatus(status);
    setCreateOpen(true);
  };

  const tabBtn = (t: TabDef) => (
    <button
      key={t.id}
      role="tab"
      aria-selected={view === t.id}
      onClick={() => goTab(t.id)}
      className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${view === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"}`}
    >
      {t.label}
      {t.count !== undefined && <span className={`text-[10px] rounded-full px-1.5 ${view === t.id ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500"}`}>{fa(t.count)}</span>}
    </button>
  );

  const iconAction = (tab: TabId, label: string, Icon: typeof Bell, badge?: number) => (
    <button onClick={() => goTab(tab)} title={label} aria-label={label} className={`relative w-9 h-9 rounded-lg border flex items-center justify-center ${view === tab ? "border-brand-300 bg-brand-50 text-brand-700" : "border-ink-200 bg-white text-ink-500 hover:text-ink-800"}`}>
      <Icon size={16} />
      {badge ? <span className="absolute -top-1 -left-1 bg-rose-600 text-white text-[10px] rounded-full min-w-4 h-4 px-0.5 flex items-center justify-center">{fa(badge)}</span> : null}
    </button>
  );

  const progress = projectProgress(p);
  const usage = Math.round(budgetUsage(p));
  const healthDot = p.meta.health === "سبز" ? "bg-emerald-500" : p.meta.health === "زرد" ? "bg-amber-500" : "bg-rose-500";

  return (
    <ProjectPageContext.Provider value={{ p, pid: id, canEdit, canManage, can: (perm: string) => canEdit && hasPermission(perm), hasPerm: hasPermission, refDate: pm.refDate, openTask: setTaskId, goTab, focusId }}>
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
            <div className="flex items-center gap-2">
              {iconAction("history", "تاریخچه رویدادها", History)}
              {iconAction("notifications", "اعلان‌ها و خودکارسازی", Bell, unreadHere)}
              {canManage && iconAction("settings", "تنظیمات پروژه", Settings)}
              {canEdit && (
                <Button variant="primary" icon={<Plus size={15} />} onClick={() => openCreate()}>
                  تسک جدید
                </Button>
              )}
            </div>
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

        {view === "overview" ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatCard label="پیشرفت کلی" value={`${fa(progress)}٪`} tone="brand" icon={<GanttChartSquare size={16} />} />
            <StatCard label="مصرف بودجه" value={`${fa(usage)}٪`} hint={`${fmtRial(paidTotal(p))} از ${fmtRial(p.budget.total)}`} tone="warning" icon={<Wallet size={16} />} />
            <StatCard label="تعداد تسک" value={fa(ts.length)} icon={<LayoutGrid size={16} />} />
            <StatCard label="وضعیت سلامت" value={p.meta.health} hint={`مرحله: ${p.meta.phase}`} tone={p.meta.health === "سبز" ? "success" : p.meta.health === "زرد" ? "warning" : "danger"} />
          </div>
        ) : (
          <div className="card px-4 py-2.5 mb-4 flex items-center gap-x-6 gap-y-2 flex-wrap text-xs text-ink-600">
            <span className="flex items-center gap-2 min-w-[180px]">
              پیشرفت
              <span className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden w-24">
                <span className="block h-full bg-brand-500" style={{ width: `${progress}%` }} />
              </span>
              <b className="text-ink-900">{fa(progress)}٪</b>
            </span>
            <span>
              بودجه: <b className="text-ink-900">{fa(usage)}٪</b> مصرف‌شده
            </span>
            <span>
              <b className="text-ink-900">{fa(ts.length)}</b> تسک
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${healthDot}`} /> سلامت: <b className="text-ink-900">{p.meta.health}</b>
            </span>
            <span>
              مرحله: <b className="text-ink-900">{p.meta.phase}</b>
            </span>
          </div>
        )}

        {/* موبایل: فهرست کشویی */}
        <div className="sm:hidden mb-4">
          <select value={view} onChange={(e) => goTab(e.target.value as TabId)} className="input-field" aria-label="بخش پروژه">
            {[...primary, ...more].map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
                {t.count !== undefined ? ` (${fa(t.count)})` : ""}
              </option>
            ))}
          </select>
        </div>
        {/* دسکتاپ: یک ردیف تب اصلی + «بیشتر» */}
        <div className="hidden sm:flex items-stretch border-b border-ink-200 mb-5" role="tablist">
          <div className="flex items-stretch overflow-x-auto">{primary.map(tabBtn)}</div>
          {activeMore && tabBtn(activeMore)}
          <div className="relative">
            <button onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} className="flex items-center gap-1 px-3 py-2.5 text-[13px] font-medium text-ink-500 hover:text-ink-800 whitespace-nowrap h-full">
              بیشتر <ChevronDown size={14} className={moreOpen ? "rotate-180" : ""} />
            </button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMoreOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-30 w-56 bg-white border border-ink-200 rounded-xl shadow-xl py-1.5">
                  {more.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setMoreOpen(false);
                        goTab(t.id);
                      }}
                      className={`w-full text-right px-3 py-2 text-[13px] flex items-center justify-between hover:bg-ink-50 ${view === t.id ? "text-brand-700 font-medium" : "text-ink-700"}`}
                    >
                      {t.label}
                      {t.count !== undefined && <span className="text-[10px] rounded-full px-1.5 bg-ink-100 text-ink-500">{fa(t.count)}</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
        {view === "knowledge" && <ProjectKnowledgeFile projectId={id} inProjectPage />}

        {canEdit && <TaskCreateModal open={createOpen} onClose={() => setCreateOpen(false)} defaultStatus={createStatus} />}
        <TaskDrawer taskId={taskId} onClose={() => setTaskId(null)} />
        <p className="sr-only">
          <Link to="/dashboard/projects">بازگشت به فهرست پروژه‌ها</Link>
        </p>
      </div>
    </ProjectPageContext.Provider>
  );
}
