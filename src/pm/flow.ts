// ---------------------------------------------------------------------------
// تحلیل جریان کار (Kanban flow metrics) — از روی رویدادهای TASK_STATUS_CHANGED تاریخچه:
// زمان چرخه (Cycle time)، زمان تحویل (Lead time)، زمان در هر وضعیت، نمودار جریان تجمعی (CFD)،
// توان عملیاتی هفتگی (Throughput) و سن کارهای در جریان (WIP aging).
// ---------------------------------------------------------------------------
import { dayNum } from "./jalali";
import { kindOf } from "./selectors";
import type { ColumnKind, PMTask, ProjectState } from "./types";

export type Transition = { day: number; from: ColumnKind; to: ColumnKind };
export type Interval = { kind: ColumnKind; from: number; to: number };

/** نوع ستون از روی برچسب ستون (لاگ‌های قدیمی فقط برچسب دارند) */
function kindFromLabel(p: ProjectState, label: unknown, fallback: ColumnKind): ColumnKind {
  if (typeof label !== "string") return fallback;
  const c = p.columns.find((x) => x.label === label);
  if (c) return c.kind;
  const map: Record<string, ColumnKind> = { "برنامه‌ریزی": "backlog", "برای انجام": "todo", "در حال انجام": "doing", "بازبینی": "review", "متوقف‌شده": "blocked", "انجام‌شده": "done" };
  return map[label] ?? fallback;
}

/** همه‌ی جابه‌جایی‌های وضعیت هر تسک (مرتب بر اساس زمان) */
export function transitionsByTask(p: ProjectState): Map<string, Transition[]> {
  const out = new Map<string, Transition[]>();
  const logs = p.logs.filter((l) => l.event === "TASK_STATUS_CHANGED" && l.entity?.type === "task").sort((a, b) => (dayNum(a.date) ?? 0) - (dayNum(b.date) ?? 0) || a.seq - b.seq);
  logs.forEach((l) => {
    const day = dayNum(l.date);
    if (day === null || !l.entity) return;
    const m = l.metadata;
    const to = (typeof m.new_kind === "string" ? (m.new_kind as ColumnKind) : kindFromLabel(p, m.new_status, "doing")) as ColumnKind;
    const from = (typeof m.old_kind === "string" ? (m.old_kind as ColumnKind) : kindFromLabel(p, m.old_status, "todo")) as ColumnKind;
    const arr = out.get(l.entity.id) ?? [];
    arr.push({ day, from, to });
    out.set(l.entity.id, arr);
  });
  return out;
}

/**
 * بازه‌های وضعیت یک تسک. اگر تسک هیچ رویداد جابه‌جایی ندارد اما در وضعیتی غیر از
 * «برنامه‌ریزی» است، فرض می‌شود از تاریخ شروعش در همان وضعیت بوده است.
 */
export function statusIntervals(p: ProjectState, t: PMTask, ref: number, trs?: Transition[]): Interval[] {
  const created = Math.min(dayNum(t.createdAt) ?? dayNum(t.start) ?? ref, ref);
  const list = trs ?? transitionsByTask(p).get(t.id) ?? [];
  const cur = kindOf(p, t.status);
  if (!list.length) {
    if (cur === "backlog" || cur === "todo") return [{ kind: cur, from: created, to: ref }];
    const s = Math.min(Math.max(created, dayNum(t.start) ?? created), ref);
    const out: Interval[] = [];
    if (s > created) out.push({ kind: "todo", from: created, to: s });
    out.push({ kind: cur, from: s, to: cur === "done" ? Math.min(dayNum(t.due) ?? s, ref) : ref });
    return out;
  }
  const out: Interval[] = [];
  let kind: ColumnKind = list[0].from;
  let from = Math.min(created, list[0].day);
  list.forEach((tr) => {
    out.push({ kind, from, to: tr.day });
    kind = tr.to;
    from = tr.day;
  });
  out.push({ kind, from, to: ref });
  return out.filter((x) => x.to >= x.from);
}

/** وضعیت تسک در یک روز مشخص (یا undefined اگر هنوز ساخته نشده بود) */
export function kindAt(intervals: Interval[], day: number): ColumnKind | undefined {
  if (!intervals.length || day < intervals[0].from) return undefined;
  let k: ColumnKind | undefined;
  for (const iv of intervals) if (iv.from <= day) k = iv.kind;
  return k;
}

export type TaskFlow = {
  t: PMTask;
  intervals: Interval[];
  createdDay: number;
  startedDay?: number;
  doneDay?: number;
  /** روز؛ فقط برای تسک‌های تمام‌شده */
  leadTime?: number;
  cycleTime?: number;
  /** سن کار در جریان (روز از شروع) */
  age?: number;
  /** روز در وضعیت فعلی */
  inStatus: number;
  timeIn: Partial<Record<ColumnKind, number>>;
};

export function taskFlows(p: ProjectState, refDate: string): TaskFlow[] {
  const ref = dayNum(refDate)!;
  const trs = transitionsByTask(p);
  return p.tasks
    .filter((t) => !t.archived && t.type !== "epic")
    .map((t) => {
      const intervals = statusIntervals(p, t, ref, trs.get(t.id));
      const createdDay = intervals[0]?.from ?? ref;
      const started = intervals.find((iv) => ["doing", "review", "blocked", "done"].includes(iv.kind));
      const cur = kindOf(p, t.status);
      const last = intervals[intervals.length - 1];
      const doneDay = cur === "done" ? last?.from : undefined;
      const timeIn: Partial<Record<ColumnKind, number>> = {};
      intervals.forEach((iv) => {
        if (iv.kind === "done") return;
        timeIn[iv.kind] = (timeIn[iv.kind] ?? 0) + Math.max(0, iv.to - iv.from);
      });
      return {
        t,
        intervals,
        createdDay,
        startedDay: started?.from,
        doneDay,
        leadTime: doneDay !== undefined ? Math.max(0, doneDay - createdDay) : undefined,
        cycleTime: doneDay !== undefined && started ? Math.max(0, doneDay - started.from) : undefined,
        age: cur !== "done" && started ? ref - started.from : undefined,
        inStatus: last ? ref - last.from : 0,
        timeIn,
      };
    });
}

export const flowKinds: ColumnKind[] = ["backlog", "todo", "doing", "review", "blocked", "done"];

/** نمودار جریان تجمعی: تعداد تسک‌ها در هر وضعیت برای هر روز بازه */
export function cumulativeFlow(flows: TaskFlow[], fromDay: number, toDay: number, step = 1) {
  const days: number[] = [];
  for (let d = fromDay; d <= toDay; d += step) days.push(d);
  if (days[days.length - 1] !== toDay) days.push(toDay);
  return days.map((d) => {
    const counts: Record<ColumnKind, number> = { backlog: 0, todo: 0, doing: 0, review: 0, blocked: 0, done: 0 };
    flows.forEach((f) => {
      const k = kindAt(f.intervals, d);
      if (k) counts[k] += 1;
    });
    return { day: d, counts };
  });
}

/** توان عملیاتی: تعداد تسک‌های تمام‌شده در هر هفته (n هفته‌ی اخیر، آخرین هفته = هفته‌ی جاری) */
export function weeklyThroughput(flows: TaskFlow[], ref: number, weeks = 8) {
  return Array.from({ length: weeks }, (_, i) => {
    const end = ref - (weeks - 1 - i) * 7;
    const start = end - 6;
    const items = flows.filter((f) => f.doneDay !== undefined && f.doneDay >= start && f.doneDay <= end);
    return { start, end, count: items.length, items };
  });
}

export const percentile = (xs: number[], q: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1));
  return s[i];
};
export const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
