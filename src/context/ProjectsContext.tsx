// ---------------------------------------------------------------------------
// انبار مرکزی ماژول مدیریت پروژه.
// هر تغییر از یک «اکشن» عبور می‌کند؛ اکشن رویداد (event) صادر می‌کند و انبار:
//   ۱) رویداد را در تاریخچه‌ی پروژه ثبت می‌کند (ProjectActivityLog)
//   ۲) طبق قواعد اعلان، گیرنده‌ها را پیدا و اعلان صادر می‌کند
//   ۳) قواعد خودکارسازی (Done ← تکمیل، آزادسازی وابسته‌ها، آستانه‌ی بودجه، …) را اجرا می‌کند
// در محصول واقعی همین منطق سمت سرور است؛ این‌جا برای دمو در مرورگر شبیه‌سازی شده.
// ---------------------------------------------------------------------------
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTenancy } from "./TenancyContext";
import { eventByCode, recipientLabel, type EventCode } from "../pm/events";
import { addDays, dayNum, fmtRial, nowClock, fa } from "../pm/jalali";
import { DEMO_REF_DATE, SYSTEM_ACTOR, defaultAutomation, defaultColumns, seedExecutions, seedProjectGroups, seedProjects, seedTemplates } from "../pm/seed";
import { projectTemplates as seedProjectTemplates, type ProjectTemplate } from "../pm/templates";
import { budgetUsage, columnLabel, isDone, kindOf, openPredecessors, successorsOf, taskActualCost } from "../pm/selectors";
import type {
  ActionItem,
  BoardColumn,
  ColumnKind,
  NotifRule,
  PMChannel,
  PMDocument,
  PMExpense,
  PMIssue,
  PMMeeting,
  PMMember,
  PMMilestone,
  PMMinute,
  PMNotification,
  PMPlaybookTemplate,
  PMRisk,
  PMTask,
  PlaybookExecution,
  PlaybookStepStatus,
  ProjectMeta,
  ProjectState,
  RecipientRole,
  TimeLog,
  PMBudget,
  Announcement,
  ProjectGroup,
} from "../pm/types";

const STORAGE_KEY = "motoshub.pm.v1";
const STORE_VERSION = 5;

type StoreState = {
  version: number;
  refDate: string;
  seq: number;
  projects: ProjectState[];
  templates: PMPlaybookTemplate[];
  projectTemplates: ProjectTemplate[];
  groups: ProjectGroup[];
  executions: PlaybookExecution[];
  notifications: PMNotification[];
};

/** زمینه‌ی رویداد — برای پیدا کردن گیرنده‌ها */
type EvCtx = {
  taskId?: string;
  assignee?: string;
  previousAssignee?: string;
  successorNames?: string[];
  predecessorNames?: string[];
  riskOwner?: string;
  milestoneOwner?: string;
  participants?: string[];
  mentioned?: string[];
  subjectMember?: string;
  playbookStarter?: string;
  issueAssignee?: string;
  issueReporter?: string;
  expenseCreator?: string;
};
type Emitted = { code: EventCode; description: string; entity?: { type: string; id: string }; meta: Record<string, string | number | boolean>; ctx: EvCtx; actor?: string };
type Emit = (code: EventCode, description: string, opts?: { entity?: { type: string; id: string }; meta?: Emitted["meta"]; ctx?: EvCtx; actor?: string }) => void;

const clean = (n?: string) => (n && n !== "بدون مسئول" ? n : undefined);

const tabOfCategory: Record<string, string> = {
  project: "overview",
  member: "team",
  task: "board",
  dependency: "graph",
  board: "board",
  expense: "budget",
  budget: "budget",
  risk: "risks",
  issue: "issues",
  milestone: "milestones",
  meeting: "minutes",
  document: "documents",
  communication: "communication",
  time: "time",
  playbook: "playbooks",
  automation: "notifications",
};

// --------------------------------------------------------------------------
// مسیریابی اعلان: از روی قاعده (پیش‌فرض کاتالوگ یا بازنویسی پروژه) گیرنده‌ها را پیدا می‌کند
// --------------------------------------------------------------------------
function route(p: ProjectState, ev: Emitted, actor: string, s: StoreState): PMNotification[] {
  const def = eventByCode[ev.code];
  const rule: NotifRule | null = p.notifRules[ev.code] ?? def?.notify ?? null;
  if (!rule || !rule.enabled) return [];
  const targets: { name: string; reason: string }[] = [];
  const add = (names: (string | undefined)[], role: RecipientRole) =>
    names.forEach((n) => {
      const nm = clean(n);
      if (nm && !targets.some((t) => t.name === nm)) targets.push({ name: nm, reason: recipientLabel[role] });
    });
  const task = ev.ctx.taskId ? p.tasks.find((t) => t.id === ev.ctx.taskId) : undefined;
  rule.recipients.forEach((role) => {
    switch (role) {
      case "owner":
        add(p.members.filter((m) => m.role === "مالک").map((m) => m.name), role);
        break;
      case "manager":
        add([p.meta.manager], role);
        break;
      case "assignee":
        add([ev.ctx.assignee ?? task?.assignee], role);
        break;
      case "previousAssignee":
        add([ev.ctx.previousAssignee], role);
        break;
      case "successorAssignees":
        add(ev.ctx.successorNames ?? (task ? successorsOf(p, task.id).map((t) => t.assignee) : []), role);
        break;
      case "predecessorAssignees":
        add(ev.ctx.predecessorNames ?? [], role);
        break;
      case "team":
        add(p.members.filter((m) => m.role !== "مشاهده‌گر").map((m) => m.name), role);
        break;
      case "riskOwner":
        add([ev.ctx.riskOwner], role);
        break;
      case "milestoneOwner":
        add([ev.ctx.milestoneOwner], role);
        break;
      case "sponsor":
        add([p.meta.sponsor], role);
        break;
      case "finance":
        add([p.meta.financeOfficer], role);
        break;
      case "participants":
        add(ev.ctx.participants ?? [], role);
        break;
      case "mentioned":
        add(ev.ctx.mentioned ?? [], role);
        break;
      case "subjectMember":
        add([ev.ctx.subjectMember], role);
        break;
      case "playbookStarter":
        add([ev.ctx.playbookStarter], role);
        break;
      case "issueAssignee":
        add([ev.ctx.issueAssignee], role);
        break;
      case "issueReporter":
        add([ev.ctx.issueReporter], role);
        break;
      case "expenseCreator":
        add([ev.ctx.expenseCreator], role);
        break;
    }
  });
  const time = nowClock();
  // انجام‌دهنده‌ی کار برای کار خودش اعلان نمی‌گیرد
  return targets
    .filter((t) => t.name !== actor)
    .map((t) => ({
      id: `nt${++s.seq}`,
      projectId: p.meta.id,
      projectName: p.meta.name,
      event: ev.code,
      text: ev.description,
      recipient: t.name,
      reason: t.reason,
      channels: rule.channels,
      priority: rule.priority,
      actor,
      date: s.refDate,
      time,
      seq: s.seq,
      read: false,
      link: { tab: tabOfCategory[def?.category ?? "project"] ?? "overview", entityId: ev.entity?.id },
    }));
}

const ruleOn = (p: ProjectState, id: string) => p.automation.find((a) => a.id === id)?.enabled ?? false;
const bumpRule = (p: ProjectState, id: string) => {
  const a = p.automation.find((x) => x.id === id);
  if (a) a.runs += 1;
};

/** بررسی‌های پس از هر تغییر: آستانه‌ی بودجه و عبور هزینه‌ی تسک از بودجه‌اش */
function postChecks(p: ProjectState, emit: Emit) {
  const usage = budgetUsage(p);
  if (ruleOn(p, "a3")) {
    p.budget.thresholds.forEach((th) => {
      const fired = p.budget.firedThresholds.includes(th);
      if (usage >= th && !fired) {
        p.budget.firedThresholds.push(th);
        bumpRule(p, "a3");
        emit("BUDGET_THRESHOLD_REACHED", `مصرف بودجه‌ی پروژه به ${fa(usage)}٪ رسید و از آستانه‌ی ${fa(th)}٪ عبور کرد.`, {
          entity: { type: "project", id: p.meta.id },
          meta: { threshold: th, usage_percentage: usage },
          actor: SYSTEM_ACTOR,
        });
      } else if (usage < th && fired) {
        p.budget.firedThresholds = p.budget.firedThresholds.filter((x) => x !== th);
      }
    });
  }
  p.tasks.forEach((t) => {
    if (t.estBudget <= 0) return;
    const key = `taskbudget:${t.id}`;
    const actual = taskActualCost(p, t.id);
    const fired = p.firedReminders.includes(key);
    if (actual > t.estBudget && !fired) {
      p.firedReminders.push(key);
      const over = Math.round(((actual - t.estBudget) / t.estBudget) * 100);
      emit("TASK_BUDGET_EXCEEDED", `هزینه‌ی واقعی تسک «${t.title}» (${fmtRial(actual)}) از بودجه‌ی تخمینی آن ${fa(over)}٪ بیشتر شد.`, {
        entity: { type: "task", id: t.id },
        ctx: { taskId: t.id },
        meta: { estimated_budget: t.estBudget, actual_cost: actual, overrun_percentage: over },
        actor: SYSTEM_ACTOR,
      });
    } else if (actual <= t.estBudget && fired) {
      p.firedReminders = p.firedReminders.filter((k) => k !== key);
    }
  });
}

/** اعمال یک تغییر روی یک پروژه + ثبت تاریخچه + اعلان — تابع خالص روی وضعیت قبلی */
function apply(store: StoreState, pid: string, actor: string, fn: (p: ProjectState, emit: Emit, s: StoreState) => void, opts: { skipPost?: boolean } = {}): StoreState {
  const idx = store.projects.findIndex((x) => x.meta.id === pid);
  if (idx < 0) return store;
  const s: StoreState = { ...store, projects: [...store.projects], notifications: [...store.notifications], executions: [...store.executions], templates: [...store.templates] };
  const p: ProjectState = structuredClone(store.projects[idx]);
  const events: Emitted[] = [];
  const emit: Emit = (code, description, o = {}) => events.push({ code, description, entity: o.entity, meta: o.meta ?? {}, ctx: o.ctx ?? {}, actor: o.actor });
  fn(p, emit, s);
  if (!opts.skipPost) postChecks(p, emit);
  const time = nowClock();
  const fresh: PMNotification[] = [];
  events.forEach((ev) => {
    const who = ev.actor ?? actor;
    s.seq += 1;
    p.logs.push({ id: `lg${s.seq}`, event: ev.code, description: ev.description, actor: who, date: s.refDate, time, seq: s.seq, entity: ev.entity, metadata: ev.meta });
    fresh.push(...route(p, ev, who, s));
  });
  s.notifications = [...fresh.reverse(), ...s.notifications];
  s.projects[idx] = p;
  return s;
}

const nid = (s: StoreState, prefix: string) => `${prefix}${++s.seq}`;

// --------------------------------------------------------------------------
// زمان‌بند روزانه: سررسید فردا، عقب‌افتادگی، یادآوری جلسه، مایل‌ستون در خطر، تعارض وابستگی
// --------------------------------------------------------------------------
function runScheduler(store: StoreState): StoreState {
  let s = store;
  const ref = dayNum(s.refDate)!;
  s.projects
    .filter((p) => !p.meta.archived)
    .forEach((proj) => {
      s = apply(s, proj.meta.id, SYSTEM_ACTOR, (p, emit) => {
        const once = (key: string) => {
          if (p.firedReminders.includes(key)) return false;
          p.firedReminders.push(key);
          return true;
        };
        p.tasks.forEach((t) => {
          if (t.archived || isDone(p, t)) return;
          const due = dayNum(t.due);
          if (due === null) return;
          if (due - ref === 1 && ruleOn(p, "a2") && once(`due-soon:${t.id}:${t.due}`)) {
            bumpRule(p, "a2");
            emit("TASK_DUE_SOON", `سررسید تسک «${t.title}» فردا (${t.due}) است.`, { entity: { type: "task", id: t.id }, ctx: { taskId: t.id }, meta: { due_date: t.due } });
          }
          if (due < ref && ruleOn(p, "a5") && once(`overdue:${t.id}:${t.due}`)) {
            bumpRule(p, "a5");
            emit("TASK_OVERDUE", `تسک «${t.title}» ${fa(ref - due)} روز از سررسید (${t.due}) عقب است.`, { entity: { type: "task", id: t.id }, ctx: { taskId: t.id }, meta: { due_date: t.due, days_overdue: ref - due } });
          }
        });
        p.meetings.forEach((m) => {
          if (m.status !== "برنامه‌ریزی‌شده") return;
          const d = dayNum(m.date);
          if (d !== null && d - ref >= 0 && d - ref <= 1 && once(`meeting-rem:${m.id}:${m.date}`)) {
            emit("MEETING_REMINDER", `جلسه‌ی «${m.title}» ${d === ref ? "امروز" : "فردا"} ساعت ${m.time} برگزار می‌شود.`, { entity: { type: "meeting", id: m.id }, ctx: { participants: m.participants }, meta: { meeting_date: m.date, time: m.time } });
          }
        });
        p.milestones.forEach((m) => {
          if (m.status === "انجام‌شده") return;
          const d = dayNum(m.due);
          if (d === null) return;
          const open = m.taskIds.map((id) => p.tasks.find((t) => t.id === id)).filter((t) => t && !isDone(p, t)) as PMTask[];
          if (open.length && d - ref <= 3 && ruleOn(p, "a6") && once(`ms-risk:${m.id}:${m.due}`)) {
            bumpRule(p, "a6");
            const before = m.status;
            m.status = "در خطر";
            emit("MILESTONE_AT_RISK", d >= ref ? `مایل‌ستون «${m.title}» ${fa(d - ref)} روز دیگر سررسید دارد و ${fa(open.length)} تسک آن تمام نشده است.` : `سررسید مایل‌ستون «${m.title}» ${fa(ref - d)} روز گذشته و ${fa(open.length)} تسک آن باز است.`, {
              entity: { type: "milestone", id: m.id },
              ctx: { milestoneOwner: m.owner },
              meta: { old_status: before, new_status: "در خطر", open_tasks: open.length },
            });
          }
        });
        if (ruleOn(p, "a8")) {
          p.deps.forEach((dp) => {
            const a = p.tasks.find((t) => t.id === dp.predecessor);
            const b = p.tasks.find((t) => t.id === dp.successor);
            if (!a || !b || isDone(p, a) || isDone(p, b)) return;
            const da = dayNum(a.due);
            const db = dayNum(b.start);
            if (da !== null && db !== null && db < da && once(`conflict:${dp.id}:${b.start}:${a.due}`)) {
              emit("DEPENDENCY_CONFLICT", `تسک «${b.title}» (شروع ${b.start}) قبل از پایان پیش‌نیاز «${a.title}» (${a.due}) زمان‌بندی شده است.`, {
                entity: { type: "task", id: b.id },
                ctx: { taskId: b.id, assignee: b.assignee },
                meta: { predecessor: a.id, successor: b.id, overlap_days: da - db },
              });
            }
          });
        }
      });
    });
  return s;
}

function initialStore(): StoreState {
  const templates = seedTemplates();
  const base: StoreState = {
    version: STORE_VERSION,
    refDate: DEMO_REF_DATE,
    seq: 1000,
    projects: seedProjects(),
    templates,
    projectTemplates: seedProjectTemplates,
    groups: seedProjectGroups(),
    executions: seedExecutions(templates),
    notifications: [],
  };
  // زمان‌بند یک بار در شروع اجرا می‌شود تا اعلان‌های «سررسید فردا/عقب‌افتاده» واقعاً از داده ساخته شوند
  return runScheduler(base);
}

function loadStore(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreState;
      if (parsed.version === STORE_VERSION && Array.isArray(parsed.projects)) return parsed;
    }
  } catch {
    /* ذخیره‌سازی مرورگر در دسترس نیست — از داده‌ی نمونه شروع می‌کنیم */
  }
  return initialStore();
}

// --------------------------------------------------------------------------
// ورودی‌های اکشن‌ها
// --------------------------------------------------------------------------
export type NewTaskInput = {
  title: string;
  description?: string;
  assignee: string;
  priority: PMTask["priority"];
  start: string;
  due: string;
  status?: string;
  labels?: string[];
  estBudget?: number;
  estHours?: number;
  predecessors?: string[];
  milestoneId?: string;
};

export type NewProjectInput = Omit<ProjectMeta, "id" | "health" | "phase" | "starred" | "archived" | "createdAt"> & {
  budget: number;
  members: { name: string; title: string; role: PMMember["role"]; userId?: string }[];
  templateId?: string;
};

type Ctx = {
  store: StoreState;
  refDate: string;
  actor: string;
  projects: ProjectState[];
  getProject: (id?: string) => ProjectState | undefined;
  // --- پروژه ---
  createProject: (input: NewProjectInput) => string;
  updateMeta: (pid: string, patch: Partial<ProjectMeta>) => void;
  toggleStar: (pid: string) => void;
  deleteProject: (pid: string) => void;
  saveAsTemplate: (pid: string, name: string) => void;
  saveProjectTemplate: (t: ProjectTemplate) => void;
  removeProjectTemplate: (id: string) => void;
  saveGroup: (g: Omit<ProjectGroup, "id"> & { id?: string }) => void;
  removeGroup: (id: string) => void;
  // --- اعضا ---
  addMember: (pid: string, m: Omit<PMMember, "id">) => void;
  updateMember: (pid: string, id: string, patch: Partial<PMMember>) => void;
  removeMember: (pid: string, id: string) => void;
  // --- بورد ---
  addColumn: (pid: string, label: string, kind: ColumnKind) => void;
  updateColumn: (pid: string, id: string, patch: Partial<BoardColumn>) => void;
  deleteColumn: (pid: string, id: string, moveTo: string) => void;
  moveColumn: (pid: string, id: string, dir: -1 | 1) => void;
  // --- تسک ---
  createTask: (pid: string, input: NewTaskInput) => void;
  updateTask: (pid: string, taskId: string, patch: Partial<PMTask>) => void;
  moveTask: (pid: string, taskId: string, status: string, beforeTaskId?: string) => void;
  deleteTask: (pid: string, taskId: string) => void;
  addChecklistItem: (pid: string, taskId: string, text: string) => void;
  toggleChecklistItem: (pid: string, taskId: string, itemId: string) => void;
  removeChecklistItem: (pid: string, taskId: string, itemId: string) => void;
  addComment: (pid: string, taskId: string, text: string) => void;
  // --- وابستگی ---
  addDependency: (pid: string, pred: string, succ: string) => void;
  removeDependency: (pid: string, depId: string) => void;
  // --- مایل‌ستون/ریسک/مشکل ---
  saveMilestone: (pid: string, m: Omit<PMMilestone, "id"> & { id?: string }) => void;
  deleteMilestone: (pid: string, id: string) => void;
  saveRisk: (pid: string, r: Omit<PMRisk, "id"> & { id?: string }) => void;
  deleteRisk: (pid: string, id: string) => void;
  saveIssue: (pid: string, i: Omit<PMIssue, "id" | "createdAt"> & { id?: string }) => void;
  deleteIssue: (pid: string, id: string) => void;
  // --- مالی و زمان ---
  saveExpense: (pid: string, e: Omit<PMExpense, "id" | "createdBy"> & { id?: string }) => void;
  deleteExpense: (pid: string, id: string) => void;
  updateBudget: (pid: string, patch: Partial<PMBudget>) => void;
  addTimeLog: (pid: string, l: Omit<TimeLog, "id">) => void;
  removeTimeLog: (pid: string, id: string) => void;
  // --- جلسات ---
  saveMeeting: (pid: string, m: Omit<PMMeeting, "id" | "status"> & { id?: string }) => void;
  setMeetingStatus: (pid: string, id: string, status: PMMeeting["status"]) => void;
  saveMinutes: (pid: string, m: Omit<PMMinute, "id"> & { id?: string }, publish: boolean) => void;
  convertAction: (pid: string, minuteId: string, action: ActionItem) => void;
  // --- اسناد و ارتباطات ---
  addDocument: (pid: string, d: Omit<PMDocument, "id" | "uploadedBy" | "date" | "version">) => void;
  newDocumentVersion: (pid: string, id: string) => void;
  removeDocument: (pid: string, id: string) => void;
  createChannel: (pid: string, c: Omit<PMChannel, "id" | "messages">) => void;
  postMessage: (pid: string, channelId: string, text: string, opts?: { replyTo?: string; fileName?: string }) => void;
  togglePin: (pid: string, channelId: string, msgId: string) => void;
  react: (pid: string, channelId: string, msgId: string, reaction: string) => void;
  postAnnouncement: (pid: string, a: Pick<Announcement, "title" | "body" | "pinned">) => void;
  removeAnnouncement: (pid: string, id: string) => void;
  // --- خودکارسازی و اعلان ---
  toggleAutomation: (pid: string, id: string) => void;
  setNotifRule: (pid: string, code: EventCode, rule: NotifRule | null) => void;
  markRead: (id: string, read?: boolean) => void;
  markAllRead: (recipient?: string, projectId?: string) => void;
  removeNotification: (id: string) => void;
  // --- Playbook ---
  saveTemplate: (t: Omit<PMPlaybookTemplate, "id" | "usedCount"> & { id?: string }) => void;
  removeTemplate: (id: string) => void;
  startPlaybook: (templateId: string, pid: string) => void;
  setStepStatus: (execId: string, stepId: string, status: PlaybookStepStatus, notes?: string) => void;
  cancelExecution: (execId: string) => void;
  // --- زمان دمو ---
  advanceDays: (n: number) => void;
  resetDemo: () => void;
};

const ProjectsContext = createContext<Ctx | null>(null);

/** «@محسن_مردعلی» → «محسن مردعلی» اگر عضو پروژه باشد */
function parseMentions(p: ProjectState, text: string): string[] {
  const names = p.members.map((m) => m.name);
  const found = new Set<string>();
  (text.match(/@[^\s،.,!؟?]+/g) ?? []).forEach((tok) => {
    const n = tok.slice(1).replace(/_/g, " ");
    const hit = names.find((x) => x === n);
    if (hit) found.add(hit);
  });
  return [...found];
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<StoreState>(loadStore);
  const { actingUser } = useTenancy();
  const actor = actingUser.name;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      /* پر بودن یا غیرفعال بودن ذخیره‌ساز — دمو بدون ماندگاری ادامه می‌دهد */
    }
  }, [store]);

  const on = (pid: string, fn: (p: ProjectState, emit: Emit, s: StoreState) => void) => setStore((prev) => apply(prev, pid, actor, fn));

  // ---------------------------------------------------------------- تسک (هسته)
  const doMove = (p: ProjectState, emit: Emit, t: PMTask, to: string) => {
    const from = t.status;
    if (from === to) return;
    const fromKind = kindOf(p, from);
    const toKind = kindOf(p, to);
    t.status = to;
    emit("TASK_STATUS_CHANGED", `تسک «${t.title}» از «${columnLabel(p, from)}» به «${columnLabel(p, to)}» منتقل شد.`, {
      entity: { type: "task", id: t.id },
      ctx: { taskId: t.id },
      meta: { old_status: columnLabel(p, from), new_status: columnLabel(p, to), old_kind: fromKind, new_kind: toKind },
    });
    if (toKind === "blocked") emit("TASK_BLOCKED", `تسک «${t.title}» متوقف شد.`, { entity: { type: "task", id: t.id }, ctx: { taskId: t.id } });
    const openPre = openPredecessors(p, t.id);
    if (["doing", "review", "done"].includes(toKind) && ["backlog", "todo"].includes(fromKind) && openPre.length) {
      emit("TASK_STARTED_WITH_OPEN_DEPENDENCY", `تسک «${t.title}» با وجود ${fa(openPre.length)} پیش‌نیاز انجام‌نشده (${openPre.map((x) => `«${x.title}»`).join("، ")}) شروع شد.`, {
        entity: { type: "task", id: t.id },
        ctx: { taskId: t.id, predecessorNames: openPre.map((x) => x.assignee) },
        meta: { open_predecessors: openPre.length },
      });
    }
    if (toKind === "done") {
      if (ruleOn(p, "a1")) {
        const changed = t.progress !== 100 || t.checklist.some((c) => !c.done);
        t.progress = 100;
        t.checklist = t.checklist.map((c) => ({ ...c, done: true }));
        if (changed) {
          bumpRule(p, "a1");
          emit("AUTOMATION_TRIGGERED", `قاعده‌ی «Done ← تکمیل» روی تسک «${t.title}» اجرا شد: پیشرفت ۱۰۰٪ و چک‌لیست کامل.`, { entity: { type: "task", id: t.id }, meta: { rule: "a1" }, actor: SYSTEM_ACTOR });
        }
      }
      if (ruleOn(p, "a4")) {
        successorsOf(p, t.id).forEach((succ) => {
          if (!isDone(p, succ) && openPredecessors(p, succ.id).length === 0) {
            bumpRule(p, "a4");
            emit("TASK_UNBLOCKED", `همه‌ی پیش‌نیازهای تسک «${succ.title}» انجام شد؛ «${succ.assignee}» می‌تواند شروع کند.`, {
              entity: { type: "task", id: succ.id },
              ctx: { taskId: succ.id, assignee: succ.assignee },
              meta: { unblocked_by: t.id },
              actor: SYSTEM_ACTOR,
            });
          }
        });
      }
    }
  };

  const conflictCheck = (p: ProjectState, emit: Emit, t: PMTask) => {
    if (!ruleOn(p, "a8")) return;
    const due = dayNum(t.due);
    const start = dayNum(t.start);
    successorsOf(p, t.id).forEach((b) => {
      const bs = dayNum(b.start);
      if (!isDone(p, t) && due !== null && bs !== null && bs < due) {
        bumpRule(p, "a8");
        emit("DEPENDENCY_CONFLICT", `با تغییر زمان «${t.title}» (پایان ${t.due})، تسک وابسته‌ی «${b.title}» (شروع ${b.start}) قبل از پایان پیش‌نیازش شروع می‌شود.`, {
          entity: { type: "task", id: b.id },
          ctx: { taskId: b.id, assignee: b.assignee },
          meta: { predecessor: t.id, successor: b.id, overlap_days: due - bs },
          actor: SYSTEM_ACTOR,
        });
      }
    });
    openPredecessors(p, t.id).forEach((a) => {
      const ad = dayNum(a.due);
      if (ad !== null && start !== null && start < ad) {
        bumpRule(p, "a8");
        emit("DEPENDENCY_CONFLICT", `تسک «${t.title}» (شروع ${t.start}) قبل از پایان پیش‌نیاز «${a.title}» (${a.due}) زمان‌بندی شده است.`, {
          entity: { type: "task", id: t.id },
          ctx: { taskId: t.id, assignee: t.assignee },
          meta: { predecessor: a.id, successor: t.id, overlap_days: ad - start },
          actor: SYSTEM_ACTOR,
        });
      }
    });
  };

  const insertTask = (p: ProjectState, emit: Emit, s: StoreState, input: NewTaskInput): PMTask => {
    const t: PMTask = {
      id: nid(s, "t"),
      title: input.title,
      description: input.description ?? "",
      status: input.status ?? p.columns[0]?.id ?? "backlog",
      assignee: input.assignee || "بدون مسئول",
      priority: input.priority,
      start: input.start,
      due: input.due,
      progress: 0,
      labels: input.labels ?? [],
      checklist: [],
      estBudget: input.estBudget ?? 0,
      estHours: input.estHours ?? 0,
      comments: [],
      milestoneId: input.milestoneId,
      createdAt: s.refDate,
    };
    p.tasks.unshift(t);
    emit("TASK_CREATED", `تسک «${t.title}» ایجاد شد.`, { entity: { type: "task", id: t.id }, meta: { priority: t.priority, due_date: t.due, status: columnLabel(p, t.status) } });
    if (clean(t.assignee)) emit("TASK_ASSIGNED", `تسک «${t.title}» به «${t.assignee}» واگذار شد.`, { entity: { type: "task", id: t.id }, ctx: { taskId: t.id, assignee: t.assignee }, meta: { assigned_to: t.assignee } });
    if (input.milestoneId) {
      const m = p.milestones.find((x) => x.id === input.milestoneId);
      if (m && !m.taskIds.includes(t.id)) m.taskIds.push(t.id);
    }
    (input.predecessors ?? []).forEach((pre) => {
      const a = p.tasks.find((x) => x.id === pre);
      if (!a) return;
      const dep = { id: nid(s, "dp"), predecessor: pre, successor: t.id, createdAt: s.refDate };
      p.deps.push(dep);
      emit("TASK_DEPENDENCY_ADDED", `تسک «${t.title}» به تسک «${a.title}» وابسته شد.`, { entity: { type: "dependency", id: dep.id }, ctx: { taskId: t.id, assignee: t.assignee, predecessorNames: [a.assignee] }, meta: { predecessor: a.id, successor: t.id } });
    });
    conflictCheck(p, emit, t);
    return t;
  };

  const value: Ctx = {
    store,
    refDate: store.refDate,
    actor,
    projects: store.projects,
    getProject: (id) => store.projects.find((p) => p.meta.id === id),

    // ============================================================ پروژه
    createProject: (input) => {
      const id = `pr-${Date.now()}`;
      setStore((prev) => {
        const tpl = input.templateId ? prev.projectTemplates.find((t) => t.id === input.templateId) : undefined;
        const blank: ProjectState = {
          meta: {
            id,
            name: input.name,
            description: input.description,
            client: input.client,
            sponsor: input.sponsor,
            manager: input.manager,
            health: "سبز",
            priority: input.priority,
            phase: "برنامه‌ریزی",
            start: input.start,
            deadline: input.deadline,
            category: input.category,
            tags: input.tags,
            icon: input.icon,
            color: input.color,
            visibility: input.visibility,
            workspace: input.workspace,
            starred: false,
            archived: false,
            financeOfficer: input.financeOfficer,
            groupId: input.groupId,
            createdAt: prev.refDate,
            scope: input.scope,
            holdingId: input.holdingId,
            companyId: input.companyId,
            authorId: input.authorId,
          },
          columns: tpl ? structuredClone(tpl.columns) : defaultColumns(),
          tasks: [],
          deps: [],
          members: [],
          milestones: [],
          risks: [],
          issues: [],
          expenses: [],
          budget: { total: 0, lines: tpl?.budgetLines.map((l) => ({ category: l, allocated: 0 })) ?? [], revenue: 0, thresholds: [80, 100], firedThresholds: [] },
          timeLogs: [],
          meetings: [],
          minutes: [],
          documents: [],
          channels: [
            { id: "ch1", name: "عمومی", description: "گفتگوی عمومی تیم پروژه", members: "all", messages: [] },
            { id: "ch2", name: "اطلاع‌رسانی", description: "فقط اطلاعیه‌های مهم", members: "all", messages: [] },
          ],
          announcements: [],
          automation: defaultAutomation(),
          notifRules: {},
          logs: [],
          firedReminders: [],
        };
        let s: StoreState = { ...prev, projects: [blank, ...prev.projects] };
        s = apply(s, id, actor, (p, emit, st) => {
          emit("PROJECT_CREATED", `پروژه «${p.meta.name}» ایجاد شد${tpl ? ` (از قالب «${tpl.name}»)` : ""}.`, { entity: { type: "project", id }, meta: { template: tpl?.name ?? "" } });
          input.members.forEach((m) => {
            const mem: PMMember = { id: nid(st, "tm"), name: m.name, title: m.title, role: m.role, allocation: 50, userId: m.userId };
            p.members.push(mem);
            emit("PROJECT_MEMBER_ADDED", `«${m.name}» با نقش «${m.role}» به تیم پروژه اضافه شد.`, { entity: { type: "member", id: mem.id }, ctx: { subjectMember: m.name }, meta: { role: m.role } });
          });
          if (input.budget > 0) {
            p.budget.total = input.budget;
            emit("PROJECT_BUDGET_CHANGED", `بودجه‌ی پروژه ${fmtRial(input.budget)} تعیین شد.`, { entity: { type: "project", id }, meta: { old_budget: 0, new_budget: input.budget } });
          }
          if (tpl) {
            const keyToId = new Map<string, string>();
            tpl.tasks.forEach((tt) => {
              const role = tt.role ? p.members.find((m) => m.title.includes(tt.role!) || m.role === tt.role) : undefined;
              const t = insertTask(p, emit, st, {
                title: tt.title,
                assignee: role?.name ?? input.manager,
                priority: tt.priority,
                start: addDays(input.start, tt.offset),
                due: addDays(input.start, tt.offset + tt.duration - 1),
                labels: tt.labels,
                estHours: tt.hours,
              });
              keyToId.set(tt.key, t.id);
            });
            p.tasks.reverse();
            tpl.deps.forEach(([a, b]) => {
              const pa = keyToId.get(a);
              const pb = keyToId.get(b);
              if (pa && pb) p.deps.push({ id: nid(st, "dp"), predecessor: pa, successor: pb, createdAt: st.refDate });
            });
            tpl.milestones.forEach((ms) => {
              const mm: PMMilestone = { id: nid(st, "m"), title: ms.title, due: addDays(input.start, ms.offset), status: "پیش‌رو", owner: input.manager, taskIds: ms.tasks.map((k) => keyToId.get(k)!).filter(Boolean) };
              p.milestones.push(mm);
              emit("MILESTONE_ADDED", `مایل‌ستون «${mm.title}» ایجاد شد.`, { entity: { type: "milestone", id: mm.id }, ctx: { milestoneOwner: mm.owner } });
            });
          }
        });
        return s;
      });
      return id;
    },

    updateMeta: (pid, patch) =>
      on(pid, (p, emit) => {
        const m = p.meta;
        const e = { entity: { type: "project", id: pid } };
        if (patch.name !== undefined && patch.name !== m.name) emit("PROJECT_NAME_UPDATED", `نام پروژه از «${m.name}» به «${patch.name}» تغییر کرد.`, { ...e, meta: { old_name: m.name, new_name: patch.name } });
        if (patch.description !== undefined && patch.description !== m.description) emit("PROJECT_DESCRIPTION_UPDATED", "توضیحات پروژه به‌روزرسانی شد.", e);
        if (patch.health && patch.health !== m.health) emit("PROJECT_STATUS_CHANGED", `وضعیت پروژه از «${m.health}» به «${patch.health}» تغییر کرد.`, { ...e, meta: { old_status: m.health, new_status: patch.health } });
        if (patch.priority && patch.priority !== m.priority) emit("PROJECT_PRIORITY_CHANGED", `اولویت پروژه از «${m.priority}» به «${patch.priority}» تغییر کرد.`, { ...e, meta: { old_priority: m.priority, new_priority: patch.priority } });
        if (patch.phase && patch.phase !== m.phase) emit("PROJECT_PHASE_CHANGED", `پروژه از مرحله‌ی «${m.phase}» وارد مرحله‌ی «${patch.phase}» شد.`, { ...e, meta: { old_phase: m.phase, new_phase: patch.phase } });
        if (patch.deadline && patch.deadline !== m.deadline) {
          const later = (dayNum(patch.deadline) ?? 0) > (dayNum(m.deadline) ?? 0);
          emit("PROJECT_TIMELINE_CHANGED", `تاریخ پایان پروژه ${later ? "تمدید شد" : "جلو افتاد"} (${m.deadline} ← ${patch.deadline}).`, { ...e, meta: { old_end_date: m.deadline, new_end_date: patch.deadline } });
        }
        if (patch.start && patch.start !== m.start) emit("PROJECT_TIMELINE_CHANGED", `تاریخ شروع پروژه از ${m.start} به ${patch.start} تغییر کرد.`, { ...e, meta: { old_start_date: m.start, new_start_date: patch.start } });
        if (patch.manager && patch.manager !== m.manager) {
          emit("PROJECT_MEMBER_ROLE_CHANGED", `مدیر پروژه از «${m.manager}» به «${patch.manager}» تغییر کرد.`, { ...e, ctx: { subjectMember: patch.manager }, meta: { old_manager: m.manager, new_manager: patch.manager } });
          p.members.forEach((x) => {
            if (x.name === m.manager && x.role === "مدیر پروژه") x.role = "عضو";
            if (x.name === patch.manager) x.role = "مدیر پروژه";
          });
        }
        if (patch.archived !== undefined && patch.archived !== m.archived) emit(patch.archived ? "PROJECT_ARCHIVED" : "PROJECT_RESTORED", patch.archived ? "پروژه بایگانی شد؛ اطلاعات آن حذف نشده و قابل بازیابی است." : "پروژه از بایگانی بازیابی شد.", e);
        const settingKeys: (keyof ProjectMeta)[] = ["icon", "color", "visibility", "workspace", "category", "client", "sponsor", "financeOfficer", "groupId"];
        const changed = settingKeys.filter((k) => patch[k] !== undefined && patch[k] !== m[k]);
        if (patch.tags && patch.tags.join("،") !== m.tags.join("،")) changed.push("tags");
        if (changed.length) {
          const names: Partial<Record<keyof ProjectMeta, string>> = { icon: "آیکون", color: "رنگ", visibility: "سطح دسترسی", workspace: "فضای کاری", category: "دسته‌بندی", client: "کارفرما", sponsor: "حامی مالی", financeOfficer: "مسئول مالی", tags: "برچسب‌ها", groupId: "گروه پروژه" };
          emit("PROJECT_SETTINGS_UPDATED", `تنظیمات پروژه تغییر کرد: ${changed.map((k) => names[k]).join("، ")}.`, { ...e, meta: Object.fromEntries(changed.map((k) => [k, String(patch[k])])) });
        }
        Object.assign(m, patch);
      }),

    toggleStar: (pid) =>
      setStore((prev) => ({ ...prev, projects: prev.projects.map((p) => (p.meta.id === pid ? { ...p, meta: { ...p.meta, starred: !p.meta.starred } } : p)) })),

    deleteProject: (pid) =>
      setStore((prev) => ({
        ...prev,
        projects: prev.projects.filter((p) => p.meta.id !== pid),
        executions: prev.executions.filter((e) => e.projectId !== pid),
        notifications: prev.notifications.filter((n) => n.projectId !== pid),
      })),

    saveAsTemplate: (pid, name) =>
      setStore((prev) => {
        const p = prev.projects.find((x) => x.meta.id === pid);
        if (!p) return prev;
        const start = dayNum(p.meta.start) ?? 0;
        const keyed = p.tasks.filter((t) => !t.archived);
        const tpl: ProjectTemplate = {
          id: `ptpl-${prev.seq + 1}`,
          name,
          description: `ساخته‌شده از پروژه‌ی «${p.meta.name}»`,
          columns: structuredClone(p.columns),
          labels: [...new Set(p.tasks.flatMap((t) => t.labels))],
          roles: [...new Set(p.members.map((m) => m.title))],
          budgetLines: p.budget.lines.map((l) => l.category),
          tasks: keyed.map((t) => ({ key: t.id, title: t.title, offset: Math.max(0, (dayNum(t.start) ?? start) - start), duration: Math.max(1, (dayNum(t.due) ?? 0) - (dayNum(t.start) ?? 0) + 1), priority: t.priority, labels: t.labels, hours: t.estHours })),
          deps: p.deps.map((d) => [d.predecessor, d.successor] as [string, string]),
          milestones: p.milestones.map((m) => ({ title: m.title, offset: Math.max(0, (dayNum(m.due) ?? start) - start), tasks: m.taskIds })),
        };
        return { ...prev, seq: prev.seq + 1, projectTemplates: [...prev.projectTemplates, tpl] };
      }),

    saveProjectTemplate: (t) =>
      setStore((prev) => (prev.projectTemplates.some((x) => x.id === t.id) ? { ...prev, projectTemplates: prev.projectTemplates.map((x) => (x.id === t.id ? t : x)) } : { ...prev, projectTemplates: [...prev.projectTemplates, t] })),
    removeProjectTemplate: (id) => setStore((prev) => ({ ...prev, projectTemplates: prev.projectTemplates.filter((x) => x.id !== id) })),
    saveGroup: (g) =>
      setStore((prev) => {
        if (g.id) return { ...prev, groups: prev.groups.map((x) => (x.id === g.id ? { ...x, ...g, id: x.id } : x)) };
        return { ...prev, seq: prev.seq + 1, groups: [...prev.groups, { ...g, id: `pg${prev.seq + 1}` }] };
      }),
    removeGroup: (id) =>
      setStore((prev) => ({
        ...prev,
        groups: prev.groups.filter((x) => x.id !== id),
        projects: prev.projects.map((p) => (p.meta.groupId === id ? { ...p, meta: { ...p.meta, groupId: undefined } } : p)),
      })),

    // ============================================================ اعضا
    addMember: (pid, m) =>
      on(pid, (p, emit, s) => {
        const mem = { ...m, id: nid(s, "tm") };
        p.members.push(mem);
        emit("PROJECT_MEMBER_ADDED", `«${m.name}» با نقش «${m.role}» به تیم پروژه اضافه شد.`, { entity: { type: "member", id: mem.id }, ctx: { subjectMember: m.name }, meta: { role: m.role, title: m.title } });
        if (m.role === "مدیر پروژه" && p.meta.manager !== m.name) p.meta.manager = m.name;
      }),
    updateMember: (pid, id, patch) =>
      on(pid, (p, emit) => {
        const mem = p.members.find((x) => x.id === id);
        if (!mem) return;
        if (patch.role && patch.role !== mem.role) {
          emit("PROJECT_MEMBER_ROLE_CHANGED", `نقش «${mem.name}» از «${mem.role}» به «${patch.role}» تغییر کرد.`, { entity: { type: "member", id }, ctx: { subjectMember: mem.name }, meta: { old_role: mem.role, new_role: patch.role } });
          if (patch.role === "مدیر پروژه") {
            p.members.forEach((x) => {
              if (x.id !== id && x.role === "مدیر پروژه") x.role = "عضو";
            });
            p.meta.manager = mem.name;
          }
        }
        Object.assign(mem, patch);
      }),
    removeMember: (pid, id) =>
      on(pid, (p, emit) => {
        const mem = p.members.find((x) => x.id === id);
        if (!mem) return;
        p.members = p.members.filter((x) => x.id !== id);
        const open = p.tasks.filter((t) => t.assignee === mem.name && !isDone(p, t)).length;
        emit("PROJECT_MEMBER_REMOVED", `«${mem.name}» از تیم پروژه حذف شد${open ? ` (${fa(open)} تسک باز او نیاز به واگذاری دارد)` : ""}.`, { entity: { type: "member", id }, ctx: { subjectMember: mem.name }, meta: { open_tasks: open } });
      }),

    // ============================================================ بورد
    addColumn: (pid, label, kind) =>
      on(pid, (p, emit, s) => {
        const col = { id: nid(s, "col"), label, kind };
        const doneIdx = p.columns.findIndex((c) => c.kind === "done");
        p.columns.splice(doneIdx >= 0 ? doneIdx : p.columns.length, 0, col);
        emit("BOARD_COLUMN_CREATED", `ستون «${label}» به بورد اضافه شد.`, { entity: { type: "column", id: col.id }, meta: { kind } });
      }),
    updateColumn: (pid, id, patch) =>
      on(pid, (p, emit) => {
        const c = p.columns.find((x) => x.id === id);
        if (!c) return;
        if (patch.label && patch.label !== c.label) emit("BOARD_COLUMN_RENAMED", `نام ستون «${c.label}» به «${patch.label}» تغییر کرد.`, { entity: { type: "column", id }, meta: { old_name: c.label, new_name: patch.label } });
        Object.assign(c, patch);
      }),
    deleteColumn: (pid, id, moveTo) =>
      on(pid, (p, emit) => {
        const c = p.columns.find((x) => x.id === id);
        if (!c || p.columns.length <= 1) return;
        const moved = p.tasks.filter((t) => t.status === id);
        moved.forEach((t) => (t.status = moveTo));
        p.columns = p.columns.filter((x) => x.id !== id);
        emit("BOARD_COLUMN_DELETED", `ستون «${c.label}» حذف شد${moved.length ? ` و ${fa(moved.length)} تسک به «${columnLabel(p, moveTo)}» منتقل شد` : ""}.`, { entity: { type: "column", id }, meta: { moved_tasks: moved.length } });
      }),
    moveColumn: (pid, id, dir) =>
      setStore((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.meta.id !== pid) return p;
          const cols = [...p.columns];
          const i = cols.findIndex((c) => c.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= cols.length) return p;
          [cols[i], cols[j]] = [cols[j], cols[i]];
          return { ...p, columns: cols };
        }),
      })),

    // ============================================================ تسک
    createTask: (pid, input) => on(pid, (p, emit, s) => void insertTask(p, emit, s, input)),

    updateTask: (pid, taskId, patch) =>
      on(pid, (p, emit) => {
        const t = p.tasks.find((x) => x.id === taskId);
        if (!t) return;
        const e = { entity: { type: "task", id: t.id } };
        if (patch.title !== undefined && patch.title.trim() && patch.title !== t.title) {
          emit("TASK_TITLE_UPDATED", `عنوان تسک از «${t.title}» به «${patch.title}» تغییر کرد.`, { ...e, ctx: { taskId }, meta: { old_title: t.title, new_title: patch.title } });
          t.title = patch.title;
        }
        if (patch.description !== undefined && patch.description !== t.description) {
          t.description = patch.description;
          emit("TASK_DESCRIPTION_UPDATED", `شرح تسک «${t.title}» به‌روزرسانی شد.`, e);
        }
        if (patch.assignee !== undefined && patch.assignee !== t.assignee) {
          const old = clean(t.assignee);
          t.assignee = patch.assignee || "بدون مسئول";
          if (!clean(t.assignee)) emit("TASK_REASSIGNED", `مسئول تسک «${t.title}» («${old}») برداشته شد.`, { ...e, ctx: { taskId, previousAssignee: old, assignee: "" }, meta: { old_assignee: old ?? "", new_assignee: "" } });
          else if (old) emit("TASK_REASSIGNED", `تسک «${t.title}» از «${old}» به «${t.assignee}» واگذار شد.`, { ...e, ctx: { taskId, previousAssignee: old, assignee: t.assignee }, meta: { old_assignee: old, new_assignee: t.assignee } });
          else emit("TASK_ASSIGNED", `تسک «${t.title}» به «${t.assignee}» واگذار شد.`, { ...e, ctx: { taskId, assignee: t.assignee }, meta: { assigned_to: t.assignee } });
        }
        if (patch.priority && patch.priority !== t.priority) {
          emit("TASK_PRIORITY_CHANGED", `اولویت تسک «${t.title}» از «${t.priority}» به «${patch.priority}» تغییر کرد.`, { ...e, ctx: { taskId }, meta: { old_priority: t.priority, new_priority: patch.priority } });
          t.priority = patch.priority;
        }
        let timing = false;
        if (patch.due && patch.due !== t.due) {
          const later = (dayNum(patch.due) ?? 0) > (dayNum(t.due) ?? 0);
          const days = Math.abs((dayNum(patch.due) ?? 0) - (dayNum(t.due) ?? 0));
          emit("TASK_DUE_DATE_CHANGED", `سررسید تسک «${t.title}» ${fa(days)} روز ${later ? "عقب افتاد" : "جلو آمد"} (${t.due} ← ${patch.due}).`, { ...e, ctx: { taskId }, meta: { old_due_date: t.due, new_due_date: patch.due, delta_days: later ? days : -days } });
          t.due = patch.due;
          timing = true;
        }
        if (patch.start && patch.start !== t.start) {
          emit("TASK_START_DATE_CHANGED", `تاریخ شروع تسک «${t.title}» از ${t.start} به ${patch.start} تغییر کرد.`, { ...e, ctx: { taskId }, meta: { old_start_date: t.start, new_start_date: patch.start } });
          t.start = patch.start;
          timing = true;
        }
        if (timing) conflictCheck(p, emit, t);
        if (patch.progress !== undefined && patch.progress !== t.progress) {
          emit("TASK_PROGRESS_UPDATED", `پیشرفت تسک «${t.title}» از ${fa(t.progress)}٪ به ${fa(patch.progress)}٪ رسید.`, { ...e, meta: { old_progress: t.progress, new_progress: patch.progress } });
          t.progress = patch.progress;
        }
        if (patch.labels && patch.labels.join("،") !== t.labels.join("،")) {
          emit("TASK_LABELS_UPDATED", `برچسب‌های تسک «${t.title}» به «${patch.labels.join("، ") || "بدون برچسب"}» تغییر کرد.`, { ...e, meta: { labels: patch.labels.join(",") } });
          t.labels = patch.labels;
        }
        if ((patch.estBudget !== undefined && patch.estBudget !== t.estBudget) || (patch.estHours !== undefined && patch.estHours !== t.estHours)) {
          const parts: string[] = [];
          if (patch.estBudget !== undefined && patch.estBudget !== t.estBudget) parts.push(`بودجه‌ی تخمینی ${fmtRial(patch.estBudget)}`);
          if (patch.estHours !== undefined && patch.estHours !== t.estHours) parts.push(`برآورد ${fa(patch.estHours)} ساعت`);
          emit("TASK_ESTIMATE_UPDATED", `برآورد تسک «${t.title}» تغییر کرد: ${parts.join("، ")}.`, { ...e, meta: { est_budget: patch.estBudget ?? t.estBudget, est_hours: patch.estHours ?? t.estHours } });
          if (patch.estBudget !== undefined) t.estBudget = patch.estBudget;
          if (patch.estHours !== undefined) t.estHours = patch.estHours;
        }
        if (patch.milestoneId !== undefined && patch.milestoneId !== t.milestoneId) {
          p.milestones.forEach((m) => (m.taskIds = m.taskIds.filter((x) => x !== t.id)));
          const m = p.milestones.find((x) => x.id === patch.milestoneId);
          if (m) m.taskIds.push(t.id);
          t.milestoneId = patch.milestoneId || undefined;
        }
        if (patch.status && patch.status !== t.status) doMove(p, emit, t, patch.status);
      }),

    moveTask: (pid, taskId, status, beforeTaskId) =>
      on(pid, (p, emit) => {
        const t = p.tasks.find((x) => x.id === taskId);
        if (!t) return;
        if (beforeTaskId !== undefined) {
          p.tasks = p.tasks.filter((x) => x.id !== taskId);
          const at = beforeTaskId ? p.tasks.findIndex((x) => x.id === beforeTaskId) : -1;
          if (at >= 0) p.tasks.splice(at, 0, t);
          else p.tasks.push(t);
        }
        doMove(p, emit, t, status);
      }),

    deleteTask: (pid, taskId) =>
      on(pid, (p, emit) => {
        const t = p.tasks.find((x) => x.id === taskId);
        if (!t) return;
        const succNames = successorsOf(p, taskId).map((x) => x.assignee);
        const depCount = p.deps.filter((d) => d.predecessor === taskId || d.successor === taskId).length;
        p.tasks = p.tasks.filter((x) => x.id !== taskId);
        p.deps = p.deps.filter((d) => d.predecessor !== taskId && d.successor !== taskId);
        p.milestones.forEach((m) => (m.taskIds = m.taskIds.filter((x) => x !== taskId)));
        emit("TASK_DELETED", `تسک «${t.title}» حذف شد${depCount ? ` و ${fa(depCount)} وابستگی آن برداشته شد` : ""}.`, { entity: { type: "task", id: taskId }, ctx: { assignee: t.assignee, successorNames: succNames }, meta: { removed_dependencies: depCount } });
      }),

    addChecklistItem: (pid, taskId, text) =>
      on(pid, (p, emit, s) => {
        const t = p.tasks.find((x) => x.id === taskId);
        if (!t) return;
        t.checklist.push({ id: nid(s, "c"), text, done: false });
        emit("TASK_CHECKLIST_UPDATED", `مورد «${text}» به چک‌لیست تسک «${t.title}» اضافه شد.`, { entity: { type: "task", id: taskId } });
      }),
    toggleChecklistItem: (pid, taskId, itemId) =>
      on(pid, (p, emit) => {
        const t = p.tasks.find((x) => x.id === taskId);
        const c = t?.checklist.find((x) => x.id === itemId);
        if (!t || !c) return;
        c.done = !c.done;
        const doneCount = t.checklist.filter((x) => x.done).length;
        emit("TASK_CHECKLIST_UPDATED", `مورد «${c.text}» در چک‌لیست تسک «${t.title}» ${c.done ? "تیک خورد" : "باز شد"} (${fa(doneCount)}/${fa(t.checklist.length)}).`, { entity: { type: "task", id: taskId }, meta: { completed: doneCount, total: t.checklist.length } });
      }),
    removeChecklistItem: (pid, taskId, itemId) =>
      on(pid, (p, emit) => {
        const t = p.tasks.find((x) => x.id === taskId);
        const c = t?.checklist.find((x) => x.id === itemId);
        if (!t || !c) return;
        t.checklist = t.checklist.filter((x) => x.id !== itemId);
        emit("TASK_CHECKLIST_UPDATED", `مورد «${c.text}» از چک‌لیست تسک «${t.title}» حذف شد.`, { entity: { type: "task", id: taskId } });
      }),
    addComment: (pid, taskId, text) =>
      on(pid, (p, emit, s) => {
        const t = p.tasks.find((x) => x.id === taskId);
        if (!t) return;
        t.comments.push({ id: nid(s, "cm"), author: actor, text, at: `${s.refDate} ${nowClock()}` });
        emit("TASK_COMMENT_ADDED", `«${actor}» روی تسک «${t.title}» نظر گذاشت: «${text.length > 60 ? `${text.slice(0, 60)}…` : text}»`, { entity: { type: "task", id: taskId }, ctx: { taskId } });
        const mentioned = parseMentions(p, text);
        if (mentioned.length) emit("USER_MENTIONED", `«${actor}» ${mentioned.map((m) => `«${m}»`).join("، ")} را در تسک «${t.title}» منشن کرد.`, { entity: { type: "task", id: taskId }, ctx: { mentioned }, meta: { mentioned: mentioned.join(",") } });
      }),

    // ============================================================ وابستگی
    addDependency: (pid, pred, succ) =>
      on(pid, (p, emit, s) => {
        const a = p.tasks.find((x) => x.id === pred);
        const b = p.tasks.find((x) => x.id === succ);
        if (!a || !b || p.deps.some((d) => d.predecessor === pred && d.successor === succ)) return;
        const dep = { id: nid(s, "dp"), predecessor: pred, successor: succ, createdAt: s.refDate };
        p.deps.push(dep);
        emit("TASK_DEPENDENCY_ADDED", `تسک «${b.title}» به تسک «${a.title}» وابسته شد (پایان به شروع).`, { entity: { type: "dependency", id: dep.id }, ctx: { taskId: succ, assignee: b.assignee, predecessorNames: [a.assignee] }, meta: { predecessor: pred, successor: succ, type: "finish_to_start" } });
        conflictCheck(p, emit, b);
      }),
    removeDependency: (pid, depId) =>
      on(pid, (p, emit) => {
        const d = p.deps.find((x) => x.id === depId);
        if (!d) return;
        const a = p.tasks.find((x) => x.id === d.predecessor);
        const b = p.tasks.find((x) => x.id === d.successor);
        const wasWaiting = b ? openPredecessors(p, b.id).length > 0 : false;
        p.deps = p.deps.filter((x) => x.id !== depId);
        emit("TASK_DEPENDENCY_REMOVED", `وابستگی «${b?.title}» ← «${a?.title}» حذف شد.`, { entity: { type: "dependency", id: depId }, ctx: { taskId: b?.id, assignee: b?.assignee }, meta: { predecessor: d.predecessor, successor: d.successor } });
        if (b && wasWaiting && !isDone(p, b) && openPredecessors(p, b.id).length === 0 && ruleOn(p, "a4")) {
          bumpRule(p, "a4");
          emit("TASK_UNBLOCKED", `با حذف وابستگی، تسک «${b.title}» دیگر منتظر پیش‌نیازی نیست.`, { entity: { type: "task", id: b.id }, ctx: { taskId: b.id, assignee: b.assignee }, actor: SYSTEM_ACTOR });
        }
      }),

    // ============================================================ مایل‌ستون
    saveMilestone: (pid, input) =>
      on(pid, (p, emit, s) => {
        if (!input.id) {
          const m: PMMilestone = { ...input, id: nid(s, "m") };
          p.milestones.push(m);
          emit("MILESTONE_ADDED", `مایل‌ستون «${m.title}» با سررسید ${m.due} ایجاد شد.`, { entity: { type: "milestone", id: m.id }, ctx: { milestoneOwner: m.owner }, meta: { due_date: m.due } });
          if (m.status === "انجام‌شده") emit("MILESTONE_ACHIEVED", `مایل‌ستون «${m.title}» به وضعیت «انجام‌شده» رسید.`, { entity: { type: "milestone", id: m.id }, ctx: { milestoneOwner: m.owner } });
          return;
        }
        const m = p.milestones.find((x) => x.id === input.id);
        if (!m) return;
        const e = { entity: { type: "milestone", id: m.id }, ctx: { milestoneOwner: input.owner } };
        if (input.title !== m.title) emit("MILESTONE_TITLE_UPDATED", `عنوان مایل‌ستون از «${m.title}» به «${input.title}» تغییر کرد.`, { ...e, meta: { old_title: m.title, new_title: input.title } });
        if (input.due !== m.due) emit("MILESTONE_DUE_DATE_CHANGED", `سررسید مایل‌ستون «${input.title}» از ${m.due} به ${input.due} تغییر کرد.`, { ...e, meta: { old_due_date: m.due, new_due_date: input.due } });
        if (input.status !== m.status) {
          if (input.status === "انجام‌شده") emit("MILESTONE_ACHIEVED", `مایل‌ستون «${input.title}» به وضعیت «انجام‌شده» رسید.`, { ...e, meta: { old_status: m.status, new_status: input.status } });
          else emit("MILESTONE_STATUS_CHANGED", `وضعیت مایل‌ستون «${input.title}» از «${m.status}» به «${input.status}» تغییر کرد.`, { ...e, meta: { old_status: m.status, new_status: input.status } });
        }
        Object.assign(m, input);
      }),
    deleteMilestone: (pid, id) =>
      on(pid, (p, emit) => {
        const m = p.milestones.find((x) => x.id === id);
        if (!m) return;
        p.milestones = p.milestones.filter((x) => x.id !== id);
        p.tasks.forEach((t) => {
          if (t.milestoneId === id) t.milestoneId = undefined;
        });
        emit("MILESTONE_DELETED", `مایل‌ستون «${m.title}» حذف شد.`, { entity: { type: "milestone", id } });
      }),

    // ============================================================ ریسک
    saveRisk: (pid, input) =>
      on(pid, (p, emit, s) => {
        const sevRank = { کم: 1, متوسط: 2, بحرانی: 3 } as const;
        const autoYellow = () => {
          if (ruleOn(p, "a7") && p.meta.health === "سبز") {
            bumpRule(p, "a7");
            emit("PROJECT_STATUS_CHANGED", "با ثبت ریسک بحرانی، وضعیت پروژه از «سبز» به «زرد» تغییر کرد (قاعده‌ی خودکار).", { entity: { type: "project", id: pid }, meta: { old_status: "سبز", new_status: "زرد", rule: "a7" }, actor: SYSTEM_ACTOR });
            p.meta.health = "زرد";
          }
        };
        if (!input.id) {
          const r: PMRisk = { ...input, id: nid(s, "r") };
          p.risks.unshift(r);
          emit("RISK_ADDED", `ریسک «${r.title}» با شدت «${r.severity}» و احتمال «${r.probability}» ثبت شد.`, { entity: { type: "risk", id: r.id }, ctx: { riskOwner: r.owner }, meta: { severity: r.severity, probability: r.probability } });
          if (r.severity === "بحرانی") autoYellow();
          return;
        }
        const r = p.risks.find((x) => x.id === input.id);
        if (!r) return;
        const e = { entity: { type: "risk", id: r.id }, ctx: { riskOwner: input.owner } };
        if (input.title !== r.title) emit("RISK_TITLE_UPDATED", `عنوان ریسک از «${r.title}» به «${input.title}» تغییر کرد.`, { ...e, meta: { old_title: r.title, new_title: input.title } });
        if (input.status !== r.status) emit("RISK_STATUS_CHANGED", `ریسک «${input.title}» ${input.status === "بسته" ? "بسته شد" : `به «${input.status}» تغییر کرد`}.`, { ...e, meta: { old_status: r.status, new_status: input.status } });
        if (input.severity !== r.severity) {
          const up = sevRank[input.severity] > sevRank[r.severity];
          emit(up ? "RISK_ESCALATED" : "RISK_DEESCALATED", `شدت ریسک «${input.title}» ${up ? "به" : "به"} «${input.severity}» ${up ? "افزایش" : "کاهش"} یافت.`, { ...e, meta: { old_severity: r.severity, new_severity: input.severity } });
          if (up && input.severity === "بحرانی") autoYellow();
        }
        if (input.owner !== r.owner) emit("RISK_OWNER_CHANGED", `مسئول ریسک «${input.title}» از «${r.owner}» به «${input.owner}» تغییر کرد.`, { ...e, meta: { old_owner: r.owner, new_owner: input.owner } });
        if (input.probability !== r.probability || input.impact !== r.impact || input.mitigation !== r.mitigation || input.taskId !== r.taskId)
          emit("RISK_UPDATED", `جزئیات ریسک «${input.title}» (احتمال/اثر/برنامه‌ی مقابله) به‌روزرسانی شد.`, { ...e, meta: { probability: input.probability, impact: input.impact } });
        Object.assign(r, input);
      }),
    deleteRisk: (pid, id) =>
      on(pid, (p, emit) => {
        const r = p.risks.find((x) => x.id === id);
        if (!r) return;
        p.risks = p.risks.filter((x) => x.id !== id);
        emit("RISK_DELETED", `ریسک «${r.title}» حذف شد.`, { entity: { type: "risk", id } });
      }),

    // ============================================================ مشکلات
    saveIssue: (pid, input) =>
      on(pid, (p, emit, s) => {
        if (!input.id) {
          const i: PMIssue = { ...input, id: nid(s, "is"), createdAt: s.refDate };
          p.issues.unshift(i);
          emit("ISSUE_REPORTED", `مشکل «${i.title}» با شدت «${i.severity}» گزارش شد.`, { entity: { type: "issue", id: i.id }, ctx: { issueAssignee: i.assignee, issueReporter: i.reporter }, meta: { severity: i.severity } });
          return;
        }
        const i = p.issues.find((x) => x.id === input.id);
        if (!i) return;
        const e = { entity: { type: "issue", id: i.id }, ctx: { issueAssignee: input.assignee, issueReporter: i.reporter } };
        if (input.status !== i.status) emit("ISSUE_STATUS_CHANGED", `وضعیت مشکل «${input.title}» از «${i.status}» به «${input.status}» تغییر کرد.`, { ...e, meta: { old_status: i.status, new_status: input.status } });
        const other = input.title !== i.title || input.assignee !== i.assignee || input.severity !== i.severity || input.description !== i.description;
        if (other) emit("ISSUE_UPDATED", `مشکل «${input.title}» ویرایش شد${input.assignee !== i.assignee ? ` (مسئول: «${input.assignee}»)` : ""}.`, e);
        Object.assign(i, input);
      }),
    deleteIssue: (pid, id) =>
      on(pid, (p, emit) => {
        const i = p.issues.find((x) => x.id === id);
        if (!i) return;
        p.issues = p.issues.filter((x) => x.id !== id);
        emit("ISSUE_UPDATED", `مشکل «${i.title}» حذف شد.`, { entity: { type: "issue", id }, ctx: { issueAssignee: i.assignee } });
      }),

    // ============================================================ مالی
    saveExpense: (pid, input) =>
      on(pid, (p, emit, s) => {
        if (!input.id) {
          const ex: PMExpense = { ...input, id: nid(s, "e"), createdBy: actor };
          p.expenses.unshift(ex);
          emit("EXPENSE_ADDED", `هزینه‌ی «${ex.title}» به مبلغ ${fmtRial(ex.amount)} (${ex.category}) ثبت شد.`, { entity: { type: "expense", id: ex.id }, ctx: { expenseCreator: actor }, meta: { amount: ex.amount, category: ex.category, status: ex.status } });
          return;
        }
        const ex = p.expenses.find((x) => x.id === input.id);
        if (!ex) return;
        const e = { entity: { type: "expense", id: ex.id }, ctx: { expenseCreator: ex.createdBy } };
        if (input.title !== ex.title) emit("EXPENSE_TITLE_UPDATED", `عنوان هزینه از «${ex.title}» به «${input.title}» تغییر کرد.`, { ...e, meta: { old_title: ex.title, new_title: input.title } });
        if (input.status !== ex.status) emit("EXPENSE_STATUS_CHANGED", `هزینه‌ی «${input.title}» به «${input.status}» تغییر کرد.`, { ...e, meta: { old_status: ex.status, new_status: input.status } });
        if (input.amount !== ex.amount) emit("EXPENSE_AMOUNT_UPDATED", `مبلغ هزینه‌ی «${input.title}» از ${fmtRial(ex.amount)} به ${fmtRial(input.amount)} تغییر کرد.`, { ...e, meta: { old_amount: ex.amount, new_amount: input.amount } });
        if (input.category !== ex.category || input.date !== ex.date || input.taskId !== ex.taskId || (input.description ?? "") !== (ex.description ?? "") || (input.receipt ?? "") !== (ex.receipt ?? ""))
          emit("EXPENSE_UPDATED", `اطلاعات هزینه‌ی «${input.title}» (دسته‌بندی/تاریخ/تسک مرتبط/رسید) به‌روزرسانی شد.`, e);
        Object.assign(ex, input);
      }),
    deleteExpense: (pid, id) =>
      on(pid, (p, emit) => {
        const ex = p.expenses.find((x) => x.id === id);
        if (!ex) return;
        p.expenses = p.expenses.filter((x) => x.id !== id);
        emit("EXPENSE_DELETED", `هزینه‌ی «${ex.title}» به مبلغ ${fmtRial(ex.amount)} حذف شد.`, { entity: { type: "expense", id }, meta: { amount: ex.amount } });
      }),
    updateBudget: (pid, patch) =>
      on(pid, (p, emit) => {
        const b = p.budget;
        if (patch.total !== undefined && patch.total !== b.total) emit("PROJECT_BUDGET_CHANGED", `بودجه‌ی پروژه از ${fmtRial(b.total)} به ${fmtRial(patch.total)} تغییر کرد.`, { entity: { type: "project", id: pid }, meta: { old_budget: b.total, new_budget: patch.total } });
        if (patch.lines && JSON.stringify(patch.lines) !== JSON.stringify(b.lines)) emit("BUDGET_ALLOCATION_UPDATED", `تقسیم بودجه بین سرفصل‌ها به‌روزرسانی شد (${patch.lines.map((l) => l.category).join("، ")}).`, { entity: { type: "project", id: pid } });
        if (patch.revenue !== undefined && patch.revenue !== b.revenue) emit("BUDGET_ALLOCATION_UPDATED", `درآمد پروژه از ${fmtRial(b.revenue)} به ${fmtRial(patch.revenue)} تغییر کرد.`, { entity: { type: "project", id: pid }, meta: { old_revenue: b.revenue, new_revenue: patch.revenue } });
        if (patch.thresholds && patch.thresholds.join(",") !== b.thresholds.join(",")) emit("BUDGET_ALLOCATION_UPDATED", `آستانه‌های هشدار بودجه به ${patch.thresholds.map((x) => `${fa(x)}٪`).join("، ")} تغییر کرد.`, { entity: { type: "project", id: pid } });
        Object.assign(b, patch);
      }),
    addTimeLog: (pid, l) =>
      on(pid, (p, emit, s) => {
        const log = { ...l, id: nid(s, "tl") };
        p.timeLogs.unshift(log);
        const t = p.tasks.find((x) => x.id === l.taskId);
        emit("TASK_TIME_LOGGED", `${fa(l.hours)} ساعت کار «${l.member}» روی تسک «${t?.title ?? "—"}» ثبت شد.`, { entity: { type: "task", id: l.taskId }, meta: { hours: l.hours, member: l.member, date: l.date } });
      }),
    removeTimeLog: (pid, id) =>
      on(pid, (p, emit) => {
        const l = p.timeLogs.find((x) => x.id === id);
        if (!l) return;
        p.timeLogs = p.timeLogs.filter((x) => x.id !== id);
        emit("TASK_TIME_LOGGED", `ثبت ${fa(l.hours)} ساعته‌ی «${l.member}» (${l.date}) حذف شد.`, { entity: { type: "task", id: l.taskId }, meta: { hours: -l.hours } });
      }),

    // ============================================================ جلسات
    saveMeeting: (pid, input) =>
      on(pid, (p, emit, s) => {
        if (!input.id) {
          const m: PMMeeting = { ...input, id: nid(s, "mt"), status: "برنامه‌ریزی‌شده" };
          p.meetings.unshift(m);
          emit("MEETING_SCHEDULED", `جلسه‌ی «${m.title}» (${m.mode}) برای ${m.date} ساعت ${m.time} با ${fa(m.participants.length)} شرکت‌کننده تنظیم شد.`, { entity: { type: "meeting", id: m.id }, ctx: { participants: m.participants }, meta: { meeting_date: m.date, time: m.time, mode: m.mode } });
          return;
        }
        const m = p.meetings.find((x) => x.id === input.id);
        if (!m) return;
        const everyone = [...new Set([...m.participants, ...input.participants])];
        const changes: string[] = [];
        if (input.date !== m.date || input.time !== m.time) changes.push(`زمان ${m.date} ${m.time} ← ${input.date} ${input.time}`);
        if (input.participants.join() !== m.participants.join()) changes.push("شرکت‌کنندگان");
        if (input.title !== m.title) changes.push("عنوان");
        if (input.description !== m.description || input.taskIds.join() !== m.taskIds.join() || input.mode !== m.mode || input.duration !== m.duration) changes.push("جزئیات");
        if (changes.length) emit("MEETING_UPDATED", `جلسه‌ی «${input.title}» تغییر کرد: ${changes.join("، ")}.`, { entity: { type: "meeting", id: m.id }, ctx: { participants: everyone } });
        Object.assign(m, input);
        p.firedReminders = p.firedReminders.filter((k) => !k.startsWith(`meeting-rem:${m.id}:`));
      }),
    setMeetingStatus: (pid, id, status) =>
      on(pid, (p, emit) => {
        const m = p.meetings.find((x) => x.id === id);
        if (!m || m.status === status) return;
        m.status = status;
        if (status === "لغوشده") emit("MEETING_CANCELLED", `جلسه‌ی «${m.title}» (${m.date} ساعت ${m.time}) لغو شد.`, { entity: { type: "meeting", id }, ctx: { participants: m.participants } });
        if (status === "برگزارشده") emit("MEETING_HELD", `جلسه‌ی «${m.title}» برگزار شد.`, { entity: { type: "meeting", id }, ctx: { participants: m.participants } });
      }),
    saveMinutes: (pid, input, publish) =>
      on(pid, (p, emit, s) => {
        const data = { ...input, attendees: input.participants?.length ?? input.attendees, decisions: input.decisionList?.length ?? input.decisions, followUps: input.actions?.length ?? input.followUps, published: publish || input.published };
        let mn: PMMinute;
        if (input.id) {
          mn = p.minutes.find((x) => x.id === input.id)!;
          if (!mn) return;
          const wasPublished = mn.published;
          Object.assign(mn, data);
          if (publish && !wasPublished) emit("MINUTES_PUBLISHED", `صورت‌جلسه‌ی «${mn.title}» با ${fa(mn.decisions)} مصوبه و ${fa(mn.followUps)} اقدام منتشر شد.`, { entity: { type: "minute", id: mn.id }, ctx: { participants: mn.participants } });
        } else {
          mn = { ...data, id: nid(s, "mn") } as PMMinute;
          p.minutes.unshift(mn);
          if (publish) emit("MINUTES_PUBLISHED", `صورت‌جلسه‌ی «${mn.title}» با ${fa(mn.decisions)} مصوبه و ${fa(mn.followUps)} اقدام منتشر شد.`, { entity: { type: "minute", id: mn.id }, ctx: { participants: mn.participants } });
        }
        if (mn.meetingId) {
          const m = p.meetings.find((x) => x.id === mn.meetingId);
          if (m && m.status === "برنامه‌ریزی‌شده") {
            m.status = "برگزارشده";
            emit("MEETING_HELD", `جلسه‌ی «${m.title}» برگزار شد.`, { entity: { type: "meeting", id: m.id } });
          }
        }
      }),
    convertAction: (pid, minuteId, action) =>
      on(pid, (p, emit, s) => {
        const mn = p.minutes.find((x) => x.id === minuteId);
        const a = mn?.actions?.find((x) => x.id === action.id);
        if (!mn || !a || a.taskId) return;
        const meeting = p.meetings.find((m) => m.id === mn.meetingId);
        const t = insertTask(p, emit, s, {
          title: a.text,
          description: `ایجادشده از مصوبه‌ی صورت‌جلسه‌ی «${mn.title}» (${mn.date}).`,
          assignee: a.owner,
          priority: "زیاد",
          start: s.refDate,
          due: a.due || addDays(s.refDate, 7),
          status: p.columns.find((c) => c.kind === "todo")?.id,
        });
        a.taskId = t.id;
        if (meeting && !meeting.taskIds.includes(t.id)) meeting.taskIds.push(t.id);
        emit("ACTION_ITEM_CONVERTED", `مصوبه‌ی «${a.text}» از صورت‌جلسه‌ی «${mn.title}» به تسک تبدیل شد (مسئول: «${a.owner}»، سررسید ${t.due}).`, { entity: { type: "task", id: t.id }, meta: { minute_id: minuteId, action_id: a.id } });
      }),

    // ============================================================ اسناد
    addDocument: (pid, d) =>
      on(pid, (p, emit, s) => {
        const doc: PMDocument = { ...d, id: nid(s, "dc"), uploadedBy: actor, date: s.refDate, version: 1 };
        p.documents.unshift(doc);
        const t = doc.taskId ? p.tasks.find((x) => x.id === doc.taskId) : undefined;
        emit("DOCUMENT_UPLOADED", `سند «${doc.name}» (${doc.type}) بارگذاری شد${t ? ` و به تسک «${t.title}» متصل شد` : ""}.`, { entity: { type: "document", id: doc.id }, meta: { type: doc.type, size: doc.size } });
      }),
    newDocumentVersion: (pid, id) =>
      on(pid, (p, emit, s) => {
        const d = p.documents.find((x) => x.id === id);
        if (!d) return;
        d.version += 1;
        d.date = s.refDate;
        d.uploadedBy = actor;
        emit("DOCUMENT_UPLOADED", `نسخه‌ی ${fa(d.version)} سند «${d.name}» بارگذاری شد.`, { entity: { type: "document", id }, meta: { version: d.version } });
      }),
    removeDocument: (pid, id) =>
      on(pid, (p, emit) => {
        const d = p.documents.find((x) => x.id === id);
        if (!d) return;
        p.documents = p.documents.filter((x) => x.id !== id);
        emit("DOCUMENT_DELETED", `سند «${d.name}» حذف شد.`, { entity: { type: "document", id } });
      }),

    // ============================================================ ارتباطات
    createChannel: (pid, c) =>
      on(pid, (p, emit, s) => {
        const ch: PMChannel = { ...c, id: nid(s, "ch"), messages: [] };
        p.channels.push(ch);
        emit("CHANNEL_CREATED", `کانال «${ch.name}» ${ch.members === "all" ? "برای همه‌ی اعضا" : `با ${fa(ch.members.length)} عضو`} ایجاد شد.`, { entity: { type: "channel", id: ch.id } });
      }),
    postMessage: (pid, channelId, text, opts = {}) =>
      on(pid, (p, emit, s) => {
        const ch = p.channels.find((x) => x.id === channelId);
        if (!ch) return;
        ch.messages.push({ id: nid(s, "ms"), author: actor, text, at: `${s.refDate} ${nowClock()}`, replyTo: opts.replyTo, fileName: opts.fileName });
        const mentioned = parseMentions(p, text);
        if (mentioned.length) emit("USER_MENTIONED", `«${actor}» ${mentioned.map((m) => `«${m}»`).join("، ")} را در کانال «${ch.name}» منشن کرد.`, { entity: { type: "channel", id: channelId }, ctx: { mentioned } });
        if (opts.fileName) {
          const doc: PMDocument = { id: nid(s, "dc"), name: opts.fileName, type: "سایر", size: "—", uploadedBy: actor, date: s.refDate, version: 1, channelId };
          p.documents.unshift(doc);
          emit("DOCUMENT_UPLOADED", `فایل «${opts.fileName}» در کانال «${ch.name}» ارسال شد و در اسناد پروژه قرار گرفت.`, { entity: { type: "document", id: doc.id } });
        }
      }),
    togglePin: (pid, channelId, msgId) =>
      setStore((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.meta.id !== pid ? p : { ...p, channels: p.channels.map((c) => (c.id !== channelId ? c : { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, pinned: !m.pinned } : m)) })) }
        ),
      })),
    react: (pid, channelId, msgId, reaction) =>
      setStore((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.meta.id !== pid
            ? p
            : {
                ...p,
                channels: p.channels.map((c) =>
                  c.id !== channelId
                    ? c
                    : {
                        ...c,
                        messages: c.messages.map((m) => {
                          if (m.id !== msgId) return m;
                          const rs = { ...(m.reactions ?? {}) };
                          const who = rs[reaction] ?? [];
                          rs[reaction] = who.includes(actor) ? who.filter((x) => x !== actor) : [...who, actor];
                          return { ...m, reactions: rs };
                        }),
                      }
                ),
              }
        ),
      })),
    postAnnouncement: (pid, a) =>
      on(pid, (p, emit, s) => {
        const an: Announcement = { ...a, id: nid(s, "an"), author: actor, at: `${s.refDate} ${nowClock()}` };
        p.announcements.unshift(an);
        const ch = p.channels.find((c) => c.name === "اطلاع‌رسانی");
        if (ch) ch.messages.push({ id: nid(s, "ms"), author: actor, text: `[اطلاعیه] ${a.title} — ${a.body}`, at: an.at, pinned: a.pinned });
        emit("ANNOUNCEMENT_POSTED", `اطلاعیه‌ی «${a.title}» منتشر شد.`, { entity: { type: "announcement", id: an.id } });
      }),
    removeAnnouncement: (pid, id) =>
      setStore((prev) => ({ ...prev, projects: prev.projects.map((p) => (p.meta.id !== pid ? p : { ...p, announcements: p.announcements.filter((a) => a.id !== id) })) })),

    // ============================================================ خودکارسازی و اعلان
    toggleAutomation: (pid, id) =>
      on(pid, (p, emit) => {
        const a = p.automation.find((x) => x.id === id);
        if (!a) return;
        a.enabled = !a.enabled;
        emit("PROJECT_SETTINGS_UPDATED", `قاعده‌ی خودکار «${a.name}» ${a.enabled ? "فعال" : "غیرفعال"} شد.`, { entity: { type: "automation", id } });
      }),
    setNotifRule: (pid, code, rule) =>
      on(pid, (p, emit) => {
        if (rule) p.notifRules[code] = rule;
        else delete p.notifRules[code];
        emit("PROJECT_SETTINGS_UPDATED", rule ? `قاعده‌ی اعلان «${eventByCode[code]?.label}» برای این پروژه سفارشی شد.` : `قاعده‌ی اعلان «${eventByCode[code]?.label}» به پیش‌فرض برگشت.`, { entity: { type: "notif-rule", id: code } });
      }),
    markRead: (id, read = true) => setStore((prev) => ({ ...prev, notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read } : n)) })),
    markAllRead: (recipient, projectId) =>
      setStore((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => ((!recipient || n.recipient === recipient) && (!projectId || n.projectId === projectId) ? { ...n, read: true } : n)),
      })),
    removeNotification: (id) => setStore((prev) => ({ ...prev, notifications: prev.notifications.filter((n) => n.id !== id) })),

    // ============================================================ Playbook
    saveTemplate: (t) =>
      setStore((prev) => {
        if (t.id) return { ...prev, templates: prev.templates.map((x) => (x.id === t.id ? { ...x, ...t, id: x.id } : x)) };
        return { ...prev, seq: prev.seq + 1, templates: [{ ...t, id: `pb${prev.seq + 1}`, usedCount: 0 }, ...prev.templates] };
      }),
    removeTemplate: (id) => setStore((prev) => ({ ...prev, templates: prev.templates.filter((x) => x.id !== id) })),
    startPlaybook: (templateId, pid) =>
      setStore((prev) => {
        const tpl = prev.templates.find((x) => x.id === templateId);
        if (!tpl) return prev;
        return apply(prev, pid, actor, (_p, emit, s) => {
          const ex: PlaybookExecution = {
            id: nid(s, "ex"),
            templateId,
            templateName: tpl.name,
            projectId: pid,
            startedBy: actor,
            status: "در حال اجرا",
            startedAt: s.refDate,
            steps: tpl.steps.map((st, i) => ({ id: st.id, title: st.title, order: i + 1, status: "در انتظار" })),
          };
          s.executions = [ex, ...s.executions];
          s.templates = s.templates.map((x) => (x.id === templateId ? { ...x, usedCount: x.usedCount + 1 } : x));
          emit("PLAYBOOK_STARTED", `اجرای قالب «${tpl.name}» با ${fa(tpl.steps.length)} مرحله آغاز شد.`, { entity: { type: "playbook_execution", id: ex.id }, ctx: { playbookStarter: actor }, meta: { template_id: templateId, steps: tpl.steps.length } });
        });
      }),
    setStepStatus: (execId, stepId, status, notes) =>
      setStore((prev) => {
        const ex = prev.executions.find((x) => x.id === execId);
        if (!ex) return prev;
        return apply(prev, ex.projectId, actor, (_p, emit, s) => {
          const e = structuredClone(ex);
          const st = e.steps.find((x) => x.id === stepId);
          if (!st || st.status === status) return;
          st.status = status;
          st.notes = notes ?? st.notes;
          st.completedBy = status === "در انتظار" ? undefined : actor;
          st.completedAt = status === "در انتظار" ? undefined : s.refDate;
          emit("PLAYBOOK_STEP_STATUS_CHANGED", `مرحله‌ی «${st.title}» از Playbook «${e.templateName}» ${status === "انجام‌شده" ? "انجام‌شده علامت خورد" : status === "ردشده" ? "رد شد" : "به حالت انتظار برگشت"}.`, {
            entity: { type: "playbook_execution", id: e.id },
            ctx: { playbookStarter: e.startedBy },
            meta: { step_id: stepId, status },
          });
          const allResolved = e.steps.every((x) => x.status !== "در انتظار");
          if (allResolved && e.status === "در حال اجرا") {
            e.status = "تکمیل‌شده";
            e.completedAt = s.refDate;
            emit("PLAYBOOK_STATUS_CHANGED", `وضعیت اجرای Playbook «${e.templateName}» به «تکمیل‌شده» تغییر کرد.`, { entity: { type: "playbook_execution", id: e.id }, ctx: { playbookStarter: e.startedBy }, meta: { old_status: "در حال اجرا", new_status: "تکمیل‌شده" } });
          } else if (!allResolved && e.status === "تکمیل‌شده") {
            e.status = "در حال اجرا";
            e.completedAt = undefined;
            emit("PLAYBOOK_STATUS_CHANGED", `اجرای Playbook «${e.templateName}» دوباره به «در حال اجرا» برگشت.`, { entity: { type: "playbook_execution", id: e.id }, ctx: { playbookStarter: e.startedBy } });
          }
          s.executions = s.executions.map((x) => (x.id === e.id ? e : x));
        });
      }),
    cancelExecution: (execId) =>
      setStore((prev) => {
        const ex = prev.executions.find((x) => x.id === execId);
        if (!ex || ex.status === "لغوشده") return prev;
        return apply(prev, ex.projectId, actor, (_p, emit, s) => {
          s.executions = s.executions.map((x) => (x.id === execId ? { ...x, status: "لغوشده", completedAt: s.refDate } : x));
          emit("PLAYBOOK_STATUS_CHANGED", `اجرای Playbook «${ex.templateName}» لغو شد.`, { entity: { type: "playbook_execution", id: execId }, ctx: { playbookStarter: ex.startedBy }, meta: { old_status: ex.status, new_status: "لغوشده" } });
        });
      }),

    // ============================================================ زمان دمو
    advanceDays: (n) => setStore((prev) => runScheduler({ ...prev, refDate: addDays(prev.refDate, n) })),
    resetDemo: () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* نادیده */
      }
      setStore(initialStore());
    },
  };

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjectsPM() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjectsPM must be used within ProjectsProvider");
  return ctx;
}
