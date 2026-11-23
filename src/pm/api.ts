// ---------------------------------------------------------------------------
// شکل API واقعی ماژول پروژه (workspace `/api/v1/workspace/projects/…`، DATA_ALIGNMENT §2 و §11).
//
// انبار دمو (ProjectsContext) داده را به شکل داخلی نگه می‌دارد چون صفحه‌های چند بسته (میزکار، جستجو،
// دانش، گزارش‌ساز، …) مستقیماً همین شکل را می‌خوانند؛ این فایل «تنها مبدل» به شکل دقیق سریالایزرهای
// بک‌اند است: نام فیلدها، enumهای عددی، اشیای تودرتو و پاکت صفحه‌بندی workspace. هر فهرستی که باید
// شبیه API باشد از همین تابع‌ها می‌گذرد (گانت، دکمه‌ی «API»، خروجی‌ها).
//   - `<Entity>Api`       دقیقاً مطابق سریالایزر واقعی
//   - `<Entity>Proposed`  «پیشنهادی» — در API فعلی نیست (میزیتو، دمو)
// ---------------------------------------------------------------------------
import { paginateWorkspace, type Ep, type PageQuery, type WorkspacePage } from "../api/envelopes";
import { dayNum, fromDayNum, toEnDigits } from "./jalali";
import { columnLabel, isDone, kindOf, taskLoggedHours } from "./selectors";
import { assigneesOf, phaseSpan, phasesOf } from "./rules";
import type { ColumnKind, LifecyclePhase, PMPriority, PMTask, ProjectState } from "./types";

// ---------------------------------------------------------------- ابزار تبدیل
/** شناسه‌ی عددی int64 از شناسه‌ی دمو («t12» → 12، «pr-1717…» → 1717…) */
export function intId(id: string): number {
  const d = id.match(/\d+/g)?.join("");
  if (d) return Number(d.slice(-12));
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
/** UUID ثابت برای ارجاع افراد در workspace (principal_id) — از نام/شناسه‌ی دمو ساخته می‌شود */
export function uuidOf(key: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < key.length; i++) {
    a = Math.imul(a ^ key.charCodeAt(i), 16777619) >>> 0;
    b = Math.imul(b ^ (key.charCodeAt(i) + i), 2246822519) >>> 0;
  }
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  const s = hex(a) + hex(b) + hex(a ^ b) + hex(Math.imul(a, b) >>> 0);
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-a${s.slice(17, 20)}-${s.slice(20, 32)}`;
}
/** تاریخ شمسی دمو («۱۴۰۵/۰۳/۰۸») → ISO میلادی («2026-05-29») */
export function isoDate(j?: string | null): string | null {
  const d = dayNum(j ?? undefined);
  return d === null ? null : new Date(d * 86400000).toISOString().slice(0, 10);
}
/** ISO میلادی → تاریخ شمسی نمایشی دمو */
export function jalaliOf(iso?: string | null): string {
  if (!iso) return "";
  const t = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(t) ? "" : fromDayNum(Math.round(t / 86400000));
}
const isoDateTime = (j?: string | null, time = "09:00") => {
  const d = isoDate(j);
  return d ? `${d}T${toEnDigits(time).padStart(5, "0")}:00Z` : null;
};

// ---------------------------------------------------------------- enumها
/** Task.Status: ۱ برنامه‌ریزی · ۲ برای انجام · ۳ در حال انجام · ۴ بازبینی · ۵ متوقف‌شده · ۶ انجام‌شده */
export type TaskStatusCode = 1 | 2 | 3 | 4 | 5 | 6;
export const STATUS_OF_KIND: Record<ColumnKind, TaskStatusCode> = { backlog: 1, todo: 2, doing: 3, review: 4, blocked: 5, done: 6 };
export const KIND_OF_STATUS: Record<TaskStatusCode, ColumnKind> = { 1: "backlog", 2: "todo", 3: "doing", 4: "review", 5: "blocked", 6: "done" };
export const taskStatusLabel: Record<TaskStatusCode, string> = { 1: "برنامه‌ریزی", 2: "برای انجام", 3: "در حال انجام", 4: "بازبینی", 5: "متوقف‌شده", 6: "انجام‌شده" };
/** Task.Priority: ۱ کم · ۲ متوسط · ۳ زیاد (دموی «بحرانی» ← ۳) */
export type PriorityCode = 1 | 2 | 3;
export const PRIORITY_CODE: Record<PMPriority, PriorityCode> = { کم: 1, متوسط: 2, زیاد: 3, بحرانی: 3 };
/** Project.status: ۱ سبز · ۲ زرد · ۳ قرمز */
export const HEALTH_CODE = { سبز: 1, زرد: 2, قرمز: 3 } as const;
/** Project.phase: ۱ برنامه‌ریزی · ۲ اجرا · ۳ نظارت · ۴ بازبینی · ۵ تکمیل · ۶ خاتمه */
export const PHASE_CODE: Record<LifecyclePhase, 1 | 2 | 3 | 4 | 5 | 6> = { برنامه‌ریزی: 1, اجرا: 2, نظارت: 3, بررسی: 4, تکمیل: 5, اختتام: 6 };

// ---------------------------------------------------------------- انواع
export type PersonRef = { user_id: number; principal_id: string; name: string; username: string; avatar_url: string | null };
const personRef = (name: string): PersonRef => ({ user_id: intId(uuidOf(name)), principal_id: uuidOf(name), name, username: name.replace(/\s+/g, "."), avatar_url: null });

/** دقیقاً مطابق TaskDetailSerializer (workspace) */
export type TaskApi = {
  id: number;
  project: number;
  column: number | null;
  column_title: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  start_date: string;
  due_date: string;
  priority: PriorityCode;
  status: TaskStatusCode;
  progress: number | null;
  sprint: number | null;
  milestone: number | null;
  estimated_time: number | null;
  actual_time: number | null;
  estimated_budget: number | null;
  story_point: number | null;
  labels: string[];
  order: number;
  created_at: string;
  updated_at: string;
};
/** «پیشنهادی» — در API فعلی نیست */
export type TaskProposed = {
  key?: string;
  assignees?: string[];
  approver?: { principal_id: string; state: "pending" | "approved" | "rejected" } | null;
  parent?: number | null;
  phase?: number | null;
  weight?: number | null;
  reminder_at?: string | null;
  checklist?: { id: number; text: string; done: boolean }[];
  watchers?: string[];
};
export type Task = TaskApi & TaskProposed;

/** ProjectListSerializer */
export type ProjectApi = {
  id: number;
  name: string;
  description: string;
  scope_id: string | null;
  owner_id: string;
  owner: PersonRef;
  client_id: string | null;
  client: PersonRef | null;
  start_date: string | null;
  end_date: string | null;
  status: 1 | 2 | 3;
  phase: 1 | 2 | 3 | 4 | 5 | 6;
  priority: PriorityCode;
  is_archived: boolean;
  budget: number;
  financial_sponsor: string;
  category: string;
  tags: string[];
  tasks_count: number;
  progress_percentage: number;
  milestones_count: number;
  risks_count: number;
  meetings_count: number;
  current_active_tasks: number;
  created_at: string;
};
export type ProjectProposed = {
  key?: string;
  modules?: { gantt: boolean; org_minutes: boolean };
  settings?: { members_create_tasks: boolean; members_edit_tasks: boolean; members_extend_due: boolean; board_removal_needs_manager: boolean };
};
export type Project = ProjectApi & ProjectProposed;

/** BoardColumn — ستون بورد = وضعیت کار (تصمیم پیش‌فرض) */
export type BoardColumnApi = { id: number; project: number; title: string; column_type: TaskStatusCode; wip_limit: number | null; order: number; color: string | null };
/** TaskDependency (نوع و تأخیر «پیشنهادی»؛ پیش‌فرض FS) */
export type TaskDependencyApi = { id: number; predecessor: number; successor: number; created_at: string; type?: "FS" | "SS" | "FF" | "SF"; lag?: number };
/** «پیشنهادی» ProjectPhase — بازه‌ی تاریخ از کارهای فاز مشتق می‌شود */
export type ProjectPhaseApi = { id: number; project: number; title: string; order: number; after_phase: number | null; created_at: string; start_date: string | null; end_date: string | null };

/** ProjectGanttSerializer */
export type GanttTaskApi = {
  task_id: number;
  title: string;
  assigned_to: string | null;
  planned_start: string;
  planned_end: string;
  working_seconds: number;
  total_spent_seconds: number;
  time_spent_ratio: number | null;
  status: TaskStatusCode;
  progress: number;
  status_history: { status: TaskStatusCode; started_at: string; ended_at: string | null }[];
  /** «پیشنهادی» WBS */
  parent?: number | null;
  phase?: number | null;
};
export type GanttApi = {
  project_id: number;
  project_name: string;
  gantt_start: string | null;
  gantt_end: string | null;
  tasks: GanttTaskApi[];
  dependencies: TaskDependencyApi[];
  milestones: { id: number; title: string; due_date: string | null; status: 1 | 2 | 3 }[];
  /** «پیشنهادی» */
  phases?: ProjectPhaseApi[];
};

// ---------------------------------------------------------------- مبدل‌ها
export const statusCodeOf = (p: ProjectState, t: PMTask): TaskStatusCode => STATUS_OF_KIND[kindOf(p, t.status)];

export function toTaskApi(p: ProjectState, t: PMTask): Task {
  const colIdx = p.columns.findIndex((c) => c.id === t.status);
  const now = isoDateTime(t.createdAt) ?? "2026-01-01T09:00:00Z";
  const approverState = t.approval ? (t.approval.status === "تأییدشده" ? "approved" : t.approval.status === "ردشده" ? "rejected" : "pending") : null;
  return {
    id: intId(t.id),
    project: intId(p.meta.id),
    column: colIdx >= 0 ? intId(`${p.meta.id}${p.columns[colIdx].id}`) : null,
    column_title: colIdx >= 0 ? columnLabel(p, t.status) : null,
    title: t.title,
    description: t.description || null,
    assigned_to: t.assignee && t.assignee !== "بدون مسئول" ? uuidOf(t.assignee) : null,
    start_date: isoDate(t.start) ?? "",
    due_date: isoDate(t.due) ?? "",
    priority: PRIORITY_CODE[t.priority],
    status: statusCodeOf(p, t),
    progress: isDone(p, t) ? 100 : t.progress,
    sprint: t.sprintId ? intId(t.sprintId) : null,
    milestone: t.milestoneId ? intId(t.milestoneId) : null,
    estimated_time: t.estHours || null,
    actual_time: taskLoggedHours(p, t.id) || null,
    estimated_budget: t.estBudget || null,
    story_point: t.storyPoints ?? null,
    labels: t.labels,
    order: Math.max(0, p.tasks.findIndex((x) => x.id === t.id)),
    created_at: now,
    updated_at: now,
    // «پیشنهادی»
    key: t.key,
    assignees: assigneesOf(t).map(uuidOf),
    approver: t.finalApprover || t.approval ? { principal_id: uuidOf(t.approval?.approver ?? t.finalApprover!), state: approverState ?? "pending" } : null,
    parent: t.parentId ? intId(t.parentId) : null,
    phase: t.phaseId ? intId(t.phaseId) : null,
    weight: t.weight ?? null,
    reminder_at: isoDate(t.reminder),
    checklist: t.checklist.map((c) => ({ id: intId(c.id), text: c.text, done: c.done })),
    watchers: (t.watchers ?? []).map(uuidOf),
  };
}

export function toProjectApi(p: ProjectState): Project {
  const live = p.tasks.filter((t) => !t.archived);
  const done = live.filter((t) => isDone(p, t)).length;
  return {
    id: intId(p.meta.id),
    name: p.meta.name,
    description: p.meta.description,
    scope_id: p.meta.scopeId ?? null,
    owner_id: uuidOf(p.meta.manager),
    owner: personRef(p.meta.manager),
    client_id: p.meta.client ? uuidOf(p.meta.client) : null,
    client: p.meta.client ? personRef(p.meta.client) : null,
    start_date: isoDate(p.meta.start),
    end_date: isoDate(p.meta.deadline),
    status: HEALTH_CODE[p.meta.health],
    phase: PHASE_CODE[p.meta.phase],
    priority: PRIORITY_CODE[p.meta.priority],
    is_archived: p.meta.archived,
    budget: p.budget.total,
    financial_sponsor: p.meta.sponsor,
    category: p.meta.category,
    tags: p.meta.tags,
    tasks_count: live.length,
    progress_percentage: live.length ? Math.round((done / live.length) * 100) : 0,
    milestones_count: p.milestones.length,
    risks_count: p.risks.length,
    meetings_count: p.meetings.length,
    current_active_tasks: live.filter((t) => kindOf(p, t.status) === "doing").length,
    created_at: isoDateTime(p.meta.createdAt) ?? "2026-01-01T09:00:00Z",
    key: p.meta.key,
    modules: p.meta.modules,
    settings: p.meta.settings,
  };
}

export const toColumnsApi = (p: ProjectState): BoardColumnApi[] =>
  p.columns.map((c, i) => ({ id: intId(`${p.meta.id}${c.id}`), project: intId(p.meta.id), title: c.label, column_type: STATUS_OF_KIND[c.kind], wip_limit: c.wip ?? null, order: i, color: null }));

export const toPhasesApi = (p: ProjectState): ProjectPhaseApi[] =>
  phasesOf(p).map((ph, i, all) => {
    const span = phaseSpan(p, ph.id);
    return {
      id: intId(ph.id),
      project: intId(p.meta.id),
      title: ph.title,
      order: ph.order,
      after_phase: i > 0 ? intId(all[i - 1].id) : null,
      created_at: isoDateTime(ph.createdAt) ?? "2026-01-01T09:00:00Z",
      start_date: span ? new Date(span[0] * 86400000).toISOString().slice(0, 10) : null,
      end_date: span ? new Date(span[1] * 86400000).toISOString().slice(0, 10) : null,
    };
  });

/** پاسخ `GET projects/{id}/gantt/` به شکل ProjectGanttSerializer (+ فاز و والد «پیشنهادی») */
export function ganttResponse(p: ProjectState): GanttApi {
  const tasks = p.tasks.filter((t) => !t.archived && dayNum(t.start) !== null && dayNum(t.due) !== null);
  const starts = tasks.map((t) => dayNum(t.start)!);
  const ends = tasks.map((t) => dayNum(t.due)!);
  const iso = (n: number) => new Date(n * 86400000).toISOString().slice(0, 10);
  return {
    project_id: intId(p.meta.id),
    project_name: p.meta.name,
    gantt_start: starts.length ? iso(Math.min(...starts)) : null,
    gantt_end: ends.length ? iso(Math.max(...ends)) : null,
    tasks: tasks.map((t) => {
      const spent = Math.round(taskLoggedHours(p, t.id) * 3600);
      const working = Math.round((t.estHours || 0) * 3600);
      return {
        task_id: intId(t.id),
        title: t.title,
        assigned_to: t.assignee && t.assignee !== "بدون مسئول" ? uuidOf(t.assignee) : null,
        planned_start: isoDate(t.start)!,
        planned_end: isoDate(t.due)!,
        working_seconds: working,
        total_spent_seconds: spent,
        time_spent_ratio: working ? Math.round((spent / working) * 100) / 100 : null,
        status: statusCodeOf(p, t),
        progress: isDone(p, t) ? 100 : t.progress,
        status_history: [],
        parent: t.parentId ? intId(t.parentId) : null,
        phase: t.phaseId ? intId(t.phaseId) : null,
      };
    }),
    dependencies: p.deps.map((d) => ({ id: intId(d.id), predecessor: intId(d.predecessor), successor: intId(d.successor), created_at: isoDateTime(d.createdAt) ?? "2026-01-01T09:00:00Z", type: d.type ?? "FS", lag: d.lag ?? 0 })),
    milestones: p.milestones.map((m) => ({ id: intId(m.id), title: m.title, due_date: isoDate(m.due), status: m.status === "انجام‌شده" ? 3 : m.status === "در حال انجام" ? 2 : 1 })),
    phases: toPhasesApi(p),
  };
}

/** نگاشت task_id عددی پاسخ گانت ← شناسه‌ی داخلی دمو */
export const ganttIndex = (p: ProjectState) => new Map(p.tasks.map((t) => [intId(t.id), t] as const));

// ---------------------------------------------------------------- فهرست‌ها با پاکت workspace
export type TaskQuery = PageQuery & { my_tasks?: string; assigned_to?: string; overdue?: boolean; priority?: PriorityCode; status?: TaskStatusCode; search?: string };

/** `GET /api/v1/workspace/projects/{id}/tasks/` */
export function listTasks(p: ProjectState, q: TaskQuery = {}, ref?: string): WorkspacePage<Task> {
  const r = ref ? dayNum(ref) : null;
  const rows = p.tasks
    .filter((t) => !t.archived)
    .filter((t) => !q.my_tasks || assigneesOf(t).includes(q.my_tasks))
    .filter((t) => !q.assigned_to || t.assignee === q.assigned_to)
    .filter((t) => !q.priority || PRIORITY_CODE[t.priority] === q.priority)
    .filter((t) => !q.status || statusCodeOf(p, t) === q.status)
    .filter((t) => !q.search || t.title.includes(q.search))
    .filter((t) => !q.overdue || (r !== null && !isDone(p, t) && (dayNum(t.due) ?? Infinity) < r))
    .map((t) => toTaskApi(p, t));
  return paginateWorkspace(rows, `/api/v1/workspace/projects/${intId(p.meta.id)}/tasks/`, q);
}

/** `GET /api/v1/workspace/projects/` */
export const listProjects = (projects: ProjectState[], q: PageQuery = {}): WorkspacePage<Project> => paginateWorkspace(projects.map(toProjectApi), "/api/v1/workspace/projects/", q);

// ---------------------------------------------------------------- رجیستری endpointها (دکمه‌ی «API»)
const W = "/api/v1/workspace";
const e = (method: Ep["method"], path: string, proposed = false): Ep => ({ method, path: `${W}${path}`, proposed });
export const pmEndpoints = {
  projects: e("GET", "/projects/"),
  project: e("GET", "/projects/{id}/"),
  createProject: e("POST", "/projects/"),
  copyProject: e("POST", "/projects/{id}/copy/", true),
  tasks: e("GET", "/projects/{project_id}/tasks/"),
  createTask: e("POST", "/projects/{project_id}/tasks/"),
  changeStatus: e("POST", "/projects/{project_id}/tasks/{id}/change_status/"),
  changeColumn: e("POST", "/projects/{project_id}/tasks/{id}/change_column/"),
  reorder: e("POST", "/projects/{project_id}/tasks/reorder/"),
  boardColumns: e("GET", "/projects/{id}/board-columns/"),
  dependencies: e("GET", "/projects/{id}/task-dependencies/"),
  gantt: e("GET", "/projects/{id}/gantt/"),
  phases: e("GET", "/projects/{id}/phases/", true),
  taskTemplates: e("GET", "/projects/{id}/task-templates/", true),
  taskComments: e("GET", "/projects/{project_id}/tasks/{id}/comments/", true),
  taskChecklist: e("GET", "/projects/{project_id}/tasks/{id}/checklist/", true),
  taskApprove: e("POST", "/projects/{project_id}/tasks/{id}/approve/", true),
  taskReject: e("POST", "/projects/{project_id}/tasks/{id}/reject/", true),
  removalRequest: e("POST", "/projects/{project_id}/tasks/{id}/removal-request/", true),
  importTasks: e("POST", "/projects/{id}/tasks/import/", true),
  settings: e("PATCH", "/projects/{id}/settings/", true),
  memberProgress: e("GET", "/projects/{id}/member-progress/"),
  dashboardStats: e("GET", "/projects/dashboard-stats/"),
  allProjectsProgress: e("GET", "/projects/member-all-projects-progress/"),
} satisfies Record<string, Ep>;
