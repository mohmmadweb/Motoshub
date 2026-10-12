import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { GanttChartSquare, LayoutGrid, Plus, Archive, Eye, ChevronDown, Info, X, KanbanSquare, CalendarRange, Share2, Timer } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { useTenancy } from "../context/TenancyContext";
import { useProjectsPM } from "../context/ProjectsContext";
import { activeTasks, budgetUsage, findTask, projectProgress } from "../pm/selectors";
import { fa } from "../pm/jalali";
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
import SettingsTab from "./project/SettingsTab";
import SprintsTab from "./project/SprintsTab";
import WorkloadTab from "./project/WorkloadTab";
import TaskDrawer from "./project/TaskDrawer";
import TaskCreateModal from "./project/TaskCreateModal";
import FlowTab from "./project/FlowTab";
import DecisionsTab from "./project/DecisionsTab";
import IntakeTab from "./project/IntakeTab";
import ProjectSearch from "./project/ProjectSearch";
import { useProjectAccess } from "../pm/useProjectAccess";
import { TAB_RESOURCE, groupLabel, scopeLabel, type ResourceId } from "../pm/access";

const validTabs: TabId[] = ["overview", "board", "sprints", "workload", "gantt", "graph", "calendar", "milestones", "budget", "time", "risks", "issues", "team", "communication", "minutes", "documents", "reports", "history", "notifications", "settings", "flow", "decisions", "intake"];
/** تب‌هایی که برداشته شده‌اند — لینک‌های قدیمی به نمای کلی می‌روند */
const removedTabs: Record<string, string> = {
  playbooks: "بخش «Playbook» از صفحه‌ی پروژه برداشته شد؛ رویدادهای اجرای آن در «تاریخچه» ثبت است و قالب‌ها در فهرست پروژه‌ها مانده‌اند.",
  knowledge: "«دانش و درس‌آموخته‌ها» از صفحه‌ی پروژه برداشته شد؛ درس‌آموخته‌ها در خلاصه‌ی اختتام همین صفحه و در مدیریت دانش (پرونده‌ی دانش پروژه‌ها) هستند.",
};
/** نماهای داخل «وظایف» (سوییچر نما) */
const taskViews: TabId[] = ["board", "sprints", "gantt", "graph"];

export default function ProjectBoard() {
  const { id } = useParams();
  const { hasPermission } = useTenancy();
  const pm = useProjectsPM();
  const p = pm.getProject(id);
  const access = useProjectAccess(id);
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const focusId = params.get("focus") ?? undefined;
  const [taskId, setTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | undefined>();
  const [moreOpen, setMoreOpen] = useState(false);

  // دروازه‌ی بیرونی: مجوز سراسری projects.tasks و دست‌کم یک دسترسی ویرایش در این پروژه؛ سپس دسترسی ریز هر بخش
  const viewOnlyMember = !!access.member && access.viewOnly;
  const outer = !!p && hasPermission("projects.tasks") && !viewOnlyMember;
  const editable = outer && !p.meta.archived;

  const requested = tabParam && validTabs.includes(tabParam as TabId) ? (tabParam as TabId) : null;
  const defaultTab: TabId = access.canSeeTab("board") ? "board" : "overview";
  const view: TabId = !tabParam ? defaultTab : requested && access.canSeeTab(requested) ? requested : "overview";
  const resLabel = (t: string) => {
    const r = TAB_RESOURCE[t];
    return r ? labelOf[t] ?? t : t;
  };
  const notice = !tabParam || view === requested ? null : removedTabs[tabParam] ?? (requested ? `به بخش «${resLabel(requested)}» این پروژه دسترسی ندارید؛ نمای کلی نمایش داده شد.` : null);

  // لینک مستقیم به یک تسک (مثلاً از اعلان): ?tab=board&focus=t2 یا با کلید ?focus=QGJ-12 ← جزئیات تسک باز می‌شود
  useEffect(() => {
    const hit = p ? findTask(p, focusId) : undefined;
    if (hit && (view === "board" || view === "overview") && access.can("tasks")) setTaskId(hit.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, view]);
  // لینک قدیمی «دانش و درس‌آموخته‌ها» ← خلاصه‌ی اختتام در نمای کلی
  useEffect(() => {
    if (tabParam === "knowledge") setTimeout(() => document.getElementById("closure-summary")?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  }, [tabParam]);
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
  const newRequests = (p.intake ?? []).filter((r) => r.status === "جدید").length;

  // ---- ساختار تب‌ها: ۶ تب اصلی + «بیشتر» گروه‌بندی‌شده هم‌نام با گروه‌های دسترسی؛ هیچ نمایی حذف نشده
  type TabDef = { id: TabId; label: string; count?: number };
  const vis = (t: TabDef) => access.canSeeTab(t.id);
  const viewsInTasks: TabDef[] = [
    { id: "board", label: "بورد", count: ts.length },
    { id: "sprints", label: "اسپرینت‌ها" },
    { id: "gantt", label: "گانت" },
    { id: "graph", label: "گراف وابستگی" },
  ].filter((t) => vis(t as TabDef)) as TabDef[];
  type PrimaryDef = TabDef & { match?: TabId[] };
  const primaryAll: PrimaryDef[] = [
    { id: "overview", label: "نمای کلی" },
    ...(viewsInTasks.length ? [{ id: viewsInTasks[0].id, label: "وظایف", count: ts.length, match: taskViews }] : []),
    { id: "milestones", label: "مایل‌ستون‌ها" },
    { id: "budget", label: "مالی" },
    { id: "minutes", label: "جلسات" },
    { id: "team", label: "تیم" },
  ];
  const primary = primaryAll.filter((t) => t.match || vis(t));
  const moreGroups: { label: string; items: TabDef[] }[] = [
    {
      label: groupLabel.control,
      items: [
        { id: "risks", label: "ریسک‌ها", count: openRisks || undefined },
        { id: "issues", label: "مشکلات", count: openIssues || undefined },
        { id: "intake", label: "درخواست‌ها", count: newRequests || undefined },
        { id: "decisions", label: "دفتر تصمیمات" },
      ],
    },
    {
      label: groupLabel.collab,
      items: [
        { id: "communication", label: "کانال‌ها و گفتگو" },
        { id: "documents", label: "اسناد" },
        { id: "calendar", label: "تقویم" },
      ],
    },
    {
      label: groupLabel.time,
      items: [
        { id: "time", label: "ثبت زمان" },
        { id: "workload", label: "بار کاری تیم" },
        { id: "reports", label: "گزارش‌ها" },
        { id: "flow", label: "تحلیل جریان" },
        { id: "history", label: "تاریخچه رویدادها" },
      ],
    },
    {
      label: scopeLabel.admin,
      items: [
        { id: "notifications", label: "اعلان‌ها و خودکارسازی", count: unreadHere || undefined },
        { id: "settings", label: "تنظیمات پروژه" },
      ],
    },
  ]
    .map((g) => ({ ...g, items: (g.items as TabDef[]).filter(vis) }))
    .filter((g) => g.items.length);
  const moreFlat = moreGroups.flatMap((g) => g.items);
  const activeMore = moreFlat.find((t) => t.id === view);
  const isActive = (t: TabDef & { match?: TabId[] }) => (t.match ? t.match.includes(view) : view === t.id);

  // ---- ویرایش در تب جاری = دروازه‌ی بیرونی + «ویرایش» در بخش همان تب (نمای کلی ← تنظیمات)
  const writeRes: ResourceId | null = view === "overview" ? "settings" : TAB_RESOURCE[view] ?? null;
  const canEdit = editable && (!writeRes || access.can(writeRes, "write"));
  const canManage = outer && access.can("settings", "manage");
  const canTaskWrite = editable && access.can("tasks", "write");

  const openCreate = (status?: string) => {
    setCreateStatus(status);
    setCreateOpen(true);
  };

  const tabBtn = (t: TabDef & { match?: TabId[] }) => (
    <button
      key={t.label}
      role="tab"
      aria-selected={isActive(t)}
      onClick={() => goTab(t.id)}
      className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${isActive(t) ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"}`}
    >
      {t.label}
      {t.count !== undefined && <span className={`text-[10px] rounded-full px-1.5 ${isActive(t) ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500"}`}>{fa(t.count)}</span>}
    </button>
  );

  const progress = projectProgress(p);
  const usage = Math.round(budgetUsage(p));
  const healthDot = p.meta.health === "سبز" ? "bg-emerald-500" : p.meta.health === "زرد" ? "bg-amber-500" : "bg-rose-500";
  const viewIcon: Partial<Record<TabId, typeof Info>> = { board: KanbanSquare, sprints: Timer, gantt: CalendarRange, graph: Share2 };

  const ctxBase = { p, pid: id, canManage, hasPerm: hasPermission, refDate: pm.refDate, openTask: setTaskId, goTab, focusId, access, editable };

  return (
    <ProjectPageContext.Provider value={{ ...ctxBase, canEdit, can: (perm: string) => canEdit && hasPermission(perm) }}>
      <div>
        <PageHeader
          title={p.meta.name}
          description={`کارفرما: ${p.meta.client} · مهلت: ${p.meta.deadline} · مدیر پروژه: ${p.meta.manager}`}
          icon={
            <span style={{ color: p.meta.color }}>
              <ProjectIcon name={p.meta.icon} size={18} />
            </span>
          }
          breadcrumb={[{ label: "پروژه‌های من", to: "/dashboard/projects" }, { label: p.meta.name }]}
          actions={
            <div className="flex items-center gap-2">
              <ProjectSearch />
              {canTaskWrite && (
                <Button variant="primary" icon={<Plus size={15} />} onClick={() => openCreate()}>
                  تسک جدید
                </Button>
              )}
            </div>
          }
        />

        {notice && (
          <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 text-brand-800 text-xs p-3 flex items-start gap-2">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span className="flex-1 leading-5">
              {notice}
              {tabParam === "knowledge" && (
                <>
                  {" "}
                  <Link to="/dashboard/knowledge?tab=projects" className="underline">
                    پرونده‌ی دانش پروژه‌ها
                  </Link>
                </>
              )}
            </span>
            <button onClick={() => goTab("overview")} aria-label="بستن" className="text-brand-600 hover:text-brand-800">
              <X size={14} />
            </button>
          </div>
        )}
        {p.meta.archived && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs p-3 flex items-center gap-2 flex-wrap">
            <Archive size={14} /> این پروژه بایگانی شده و فقط‌خواندنی است.
            {access.canSeeTab("settings") && (
              <>
                برای ویرایش از
                <button onClick={() => goTab("settings")} className="underline">
                  تنظیمات
                </button>
                بازیابی کنید.
              </>
            )}
          </div>
        )}
        {viewOnlyMember && (
          <div className="mb-4 rounded-lg border border-ink-200 bg-ink-50 text-ink-600 text-xs p-3 flex items-center gap-2">
            <Eye size={14} /> دسترسی شما در این پروژه فقط مشاهده است؛ برای ویرایش با مدیر پروژه هماهنگ کنید.
          </div>
        )}

        {view !== "overview" && (
          <div className="card px-4 py-2.5 mb-4 flex items-center gap-x-6 gap-y-2 flex-wrap text-xs text-ink-600">
            <span className="flex items-center gap-2 min-w-[180px]">
              پیشرفت
              <span className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden w-24">
                <span className="block h-full bg-brand-500" style={{ width: `${progress}%` }} />
              </span>
              <b className="text-ink-900">{fa(progress)}٪</b>
            </span>
            {access.can("budget") && (
              <span>
                بودجه: <b className="text-ink-900">{fa(usage)}٪</b> مصرف‌شده
              </span>
            )}
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

        {/* موبایل: فهرست کشویی گروه‌بندی‌شده */}
        <div className="sm:hidden mb-4">
          <select value={view} onChange={(e) => goTab(e.target.value as TabId)} className="input-field" aria-label="بخش پروژه">
            <optgroup label="اصلی">
              {primary
                .filter((t) => !t.match)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
            </optgroup>
            {viewsInTasks.length > 0 && (
              <optgroup label="وظایف">
                {viewsInTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                    {t.count !== undefined ? ` (${fa(t.count)})` : ""}
                  </option>
                ))}
              </optgroup>
            )}
            {moreGroups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                    {t.count !== undefined ? ` (${fa(t.count)})` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {/* دسکتاپ: ۶ تب اصلی + «بیشتر» گروه‌بندی‌شده */}
        <div className="hidden sm:flex items-stretch border-b border-ink-200 mb-5" role="tablist">
          <div className="flex items-stretch overflow-x-auto">{primary.map(tabBtn)}</div>
          {activeMore && tabBtn(activeMore)}
          {moreGroups.length > 0 && (
            <div className="relative">
              <button onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} className="flex items-center gap-1 px-3 py-2.5 text-[13px] font-medium text-ink-500 hover:text-ink-800 whitespace-nowrap h-full">
                بیشتر <ChevronDown size={14} className={moreOpen ? "rotate-180" : ""} />
              </button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMoreOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 z-30 w-60 max-h-[70vh] overflow-y-auto bg-white border border-ink-200 rounded-xl shadow-xl py-1.5">
                    {moreGroups.map((g, gi) => (
                      <div key={g.label} className={gi ? "border-t border-ink-100 mt-1 pt-1" : ""}>
                        <p className="px-3 pt-1.5 pb-1 text-[10.5px] font-bold text-ink-400">{g.label}</p>
                        {g.items.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setMoreOpen(false);
                              goTab(t.id);
                            }}
                            className={`w-full text-right px-3 py-1.5 text-[13px] flex items-center justify-between hover:bg-ink-50 ${view === t.id ? "text-brand-700 font-medium" : "text-ink-700"}`}
                          >
                            {t.label}
                            {t.count !== undefined && <span className="text-[10px] rounded-full px-1.5 bg-ink-100 text-ink-500">{fa(t.count)}</span>}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* سوییچر نما در «وظایف»: بورد / اسپرینت‌ها / گانت / گراف وابستگی */}
        {taskViews.includes(view) && viewsInTasks.length > 1 && (
          <div className="hidden sm:flex mb-3">
            <div className="inline-flex rounded-lg border border-ink-200 bg-white overflow-hidden" role="tablist" aria-label="نمای وظایف">
              {viewsInTasks.map((t) => {
                const I = viewIcon[t.id] ?? LayoutGrid;
                return (
                  <button key={t.id} role="tab" aria-selected={view === t.id} onClick={() => goTab(t.id)} className={`px-3 py-1.5 text-xs flex items-center gap-1.5 border-l last:border-l-0 border-ink-200 ${view === t.id ? "bg-navy-900 text-white" : "text-ink-600 hover:bg-ink-50"}`}>
                    <I size={13} /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === "overview" && <OverviewTab />}
        {view === "board" && <BoardTab onNewTask={openCreate} />}
        {view === "sprints" && <SprintsTab />}
        {view === "workload" && <WorkloadTab />}
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
        {view === "settings" && <SettingsTab />}
        {view === "flow" && <FlowTab />}
        {view === "decisions" && <DecisionsTab />}
        {view === "intake" && <IntakeTab />}

        {/* جزئیات و ایجاد تسک همیشه با دسترسی بخش «وظایف» سنجیده می‌شوند، از هر تبی که باز شوند */}
        <ProjectPageContext.Provider value={{ ...ctxBase, canEdit: canTaskWrite, can: (perm: string) => canTaskWrite && hasPermission(perm) }}>
          {canTaskWrite && <TaskCreateModal open={createOpen} onClose={() => setCreateOpen(false)} defaultStatus={createStatus} />}
          {access.can("tasks") && <TaskDrawer taskId={taskId} onClose={() => setTaskId(null)} />}
        </ProjectPageContext.Provider>
        <p className="sr-only">
          <Link to="/dashboard/projects">بازگشت به فهرست پروژه‌ها</Link>
        </p>
      </div>
    </ProjectPageContext.Provider>
  );
}

/** نام فارسی تب‌ها (برای پیام نبودِ دسترسی) */
const labelOf: Record<string, string> = {
  board: "بورد وظایف",
  sprints: "اسپرینت‌ها",
  gantt: "گانت چارت",
  graph: "گراف وابستگی وظایف",
  milestones: "مایل‌ستون‌ها",
  budget: "مالی و بودجه",
  risks: "ریسک‌ها",
  issues: "مشکلات",
  intake: "درخواست‌ها",
  decisions: "دفتر تصمیمات",
  minutes: "جلسات",
  communication: "کانال‌ها و گفتگو",
  documents: "اسناد",
  calendar: "تقویم",
  time: "ثبت زمان",
  workload: "بار کاری تیم",
  reports: "گزارش‌ها",
  flow: "تحلیل جریان",
  history: "تاریخچه رویدادها",
  team: "تیم پروژه",
  settings: "تنظیمات پروژه",
  notifications: "اعلان‌ها و خودکارسازی",
};
