// ---------------------------------------------------------------------------
// قواعد میزیتو برای پروژه و وظیفه (همه «پیشنهادی» — در API فعلی نیستند):
// مدیر/مدیران پروژه، ماژول‌ها و تنظیمات کنترلی، فاز WBS، صندوق کار (تأخیر/امروز/جاری/بدون زمان/آینده)
// و چهار دسته‌ی پایش (انجام‌شده/دارای تأخیر/زمان‌دار/بدون زمان) — یک تابع مشترک برای همه‌ی صفحه‌ها.
// ---------------------------------------------------------------------------
import { dayNum } from "./jalali";
import { effectiveLevel, isOwner } from "./access";
import { isDone } from "./selectors";
import type { PMTask, ProjectControlSettings, ProjectModules, ProjectPhase, ProjectState } from "./types";

export const DEFAULT_MODULES: ProjectModules = { gantt: true, org_minutes: false };
export const DEFAULT_CONTROL: ProjectControlSettings = {
  members_create_tasks: true,
  members_edit_tasks: true,
  members_extend_due: true,
  board_removal_needs_manager: false,
};
export const modulesOf = (p: ProjectState): ProjectModules => ({ ...DEFAULT_MODULES, ...(p.meta.modules ?? {}) });
export const controlOf = (p: ProjectState): ProjectControlSettings => ({ ...DEFAULT_CONTROL, ...(p.meta.settings ?? {}) });

export const controlLabels: Record<keyof ProjectControlSettings, { label: string; hint: string }> = {
  members_create_tasks: { label: "اعضای عادی کار تازه بسازند", hint: "خاموش: فقط مدیر یا مدیران پروژه کار ایجاد می‌کنند." },
  members_edit_tasks: { label: "اعضای عادی کارها را ویرایش کنند", hint: "خاموش: اعضا فقط وضعیت، چک‌لیست و نظر کارهای خود را تغییر می‌دهند." },
  members_extend_due: { label: "اعضای عادی سررسید و یادآوری را تمدید کنند", hint: "خاموش: عقب‌بردن سررسید یا یادآوری فقط با مدیر پروژه است (جلو آوردن آزاد است)." },
  board_removal_needs_manager: { label: "حذف یا بایگانی کار از بورد با تأیید مدیر پروژه", hint: "روشن: حذف/بایگانی اعضای عادی به درخواست تبدیل می‌شود و مدیر پروژه تأیید یا رد می‌کند." },
};
export const moduleLabels: Record<keyof ProjectModules, { label: string; hint: string }> = {
  gantt: { label: "گانت چارت", hint: "نمای گانت با فازها، وابستگی‌ها و چاپ. خاموش: نمای گانت در این پروژه پنهان می‌شود." },
  org_minutes: { label: "صورتجلسه‌ی سازمانی", hint: "ثبت صورتجلسه با رئیس، دبیر، حضور و غیاب، امضا و پیامک برای جلسات این پروژه." },
};

/**
 * مدیر/مدیران پروژه: مدیر ثبت‌شده، مالک، یا هر عضوی که «تنظیمات پروژه» را در سطح «مدیریت» دارد
 * (چند مدیر از طریق نقشه‌ی دسترسی — بدون نمایش نقش در رابط کاربری).
 */
export function isProjectManager(p: ProjectState, name: string): boolean {
  if (p.meta.manager === name) return true;
  const m = p.members.find((x) => x.name === name);
  return !!m && (isOwner(m) || effectiveLevel(m, "settings") === "manage");
}
export const projectManagers = (p: ProjectState) => [...new Set([p.meta.manager, ...p.members.filter((m) => isProjectManager(p, m.name)).map((m) => m.name)])].filter(Boolean);

/** همه‌ی مسئولان کار (مسئول اول + هم‌زمان‌ها) */
export const assigneesOf = (t: PMTask) => [...new Set([t.assignee, ...(t.coAssignees ?? [])])].filter((n) => n && n !== "بدون مسئول");
export const isAssignedTo = (t: PMTask, name: string) => assigneesOf(t).includes(name);

// ---------------------------------------------------------------- فاز (WBS)
export const phasesOf = (p: ProjectState): ProjectPhase[] => [...(p.phases ?? [])].sort((a, b) => a.order - b.order);
/** بازه‌ی فاز = از زودترین شروع تا دیرترین سررسید کارهایش (میزیتو) */
export function phaseSpan(p: ProjectState, phaseId: string): [number, number] | null {
  const ds = p.tasks.filter((t) => !t.archived && t.phaseId === phaseId).flatMap((t) => [dayNum(t.start), dayNum(t.due)]).filter((x): x is number => x !== null);
  return ds.length ? [Math.min(...ds), Math.max(...ds)] : null;
}

// ---------------------------------------------------------------- صندوق کار (کارتابل میزیتو)
/** تأخیر = سررسید گذشته و انجام‌نشده · امروز = یادآوری (یا سررسید) امروز · جاری = یادآوری گذشته ولی هنوز در مهلت · آینده · بدون زمان */
export type InboxBucket = "overdue" | "today" | "current" | "future" | "nodate";
export const inboxBucketOrder: InboxBucket[] = ["overdue", "today", "current", "nodate", "future"];
export const inboxBucketLabel: Record<InboxBucket, string> = { overdue: "تأخیر", today: "امروز", current: "جاری", nodate: "بدون زمان", future: "آینده" };

export function inboxBucket(t: PMTask, ref: string): InboxBucket {
  const r = dayNum(ref)!;
  const due = dayNum(t.due);
  const look = dayNum(t.reminder) ?? due;
  if (due !== null && due < r) return "overdue";
  if (look === null) return "nodate";
  if (look === r) return "today";
  if (look < r) return "current";
  return "future";
}

/** چهار دسته‌ی پایش (کارت پروژه، ستون بورد، مانیتورینگ) */
export type MonitorBucket = "done" | "overdue" | "scheduled" | "unscheduled";
export const monitorBucketLabel: Record<MonitorBucket, string> = { done: "انجام‌شده", overdue: "دارای تأخیر", scheduled: "زمان‌دار", unscheduled: "بدون زمان" };
export function monitorBucket(p: ProjectState, t: PMTask, ref: string): MonitorBucket {
  if (isDone(p, t)) return "done";
  const due = dayNum(t.due);
  if (due === null) return "unscheduled";
  return due < dayNum(ref)! ? "overdue" : "scheduled";
}
export function monitorCounts(p: ProjectState, tasks: PMTask[], ref: string): Record<MonitorBucket, number> {
  const c: Record<MonitorBucket, number> = { done: 0, overdue: 0, scheduled: 0, unscheduled: 0 };
  tasks.forEach((t) => (c[monitorBucket(p, t, ref)] += 1));
  return c;
}
/** روزهای تأخیر نسبت به سررسید */
export function delayDays(t: PMTask, ref: string): number {
  const d = dayNum(t.due);
  const r = dayNum(ref)!;
  return d === null ? 0 : Math.max(0, r - d);
}
