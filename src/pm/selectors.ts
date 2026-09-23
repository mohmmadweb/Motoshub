// ---------------------------------------------------------------------------
// محاسبات مشتق از وضعیت پروژه — همان چیزهایی که API به‌صورت فیلد محاسبه‌شده
// برمی‌گرداند (progress_percentage، budget_usage_percentage، risk-analysis، gantt، …)
// ---------------------------------------------------------------------------
import type { Project, Task } from "../data/mock";
import { dayNum, diffDays, fmtShort, fa } from "./jalali";
import type { ColumnKind, PMTask, ProjectState } from "./types";

export const kindOf = (p: ProjectState, status: string): ColumnKind => p.columns.find((c) => c.id === status)?.kind ?? "backlog";
export const columnLabel = (p: ProjectState, status: string) => p.columns.find((c) => c.id === status)?.label ?? status;
export const isDone = (p: ProjectState, t: PMTask) => kindOf(p, t.status) === "done";
export const activeTasks = (p: ProjectState) => p.tasks.filter((t) => !t.archived);

export const predecessorsOf = (p: ProjectState, taskId: string) =>
  p.deps.filter((d) => d.successor === taskId).map((d) => p.tasks.find((t) => t.id === d.predecessor)).filter(Boolean) as PMTask[];
export const successorsOf = (p: ProjectState, taskId: string) =>
  p.deps.filter((d) => d.predecessor === taskId).map((d) => p.tasks.find((t) => t.id === d.successor)).filter(Boolean) as PMTask[];
export const openPredecessors = (p: ProjectState, taskId: string) => predecessorsOf(p, taskId).filter((t) => !isDone(p, t));

/** تسک «منتظر» است اگر پیش‌نیاز انجام‌نشده داشته باشد */
export const isWaiting = (p: ProjectState, t: PMTask) => !isDone(p, t) && openPredecessors(p, t.id).length > 0;

export function isOverdue(p: ProjectState, t: PMTask, ref: string) {
  const d = dayNum(t.due);
  const r = dayNum(ref);
  return !isDone(p, t) && d !== null && r !== null && d < r;
}

export function projectProgress(p: ProjectState): number {
  const ts = activeTasks(p);
  if (!ts.length) return 0;
  return Math.round(ts.reduce((s, t) => s + (isDone(p, t) ? 100 : t.progress), 0) / ts.length);
}

export const paidTotal = (p: ProjectState) => p.expenses.filter((e) => e.status === "پرداخت‌شده").reduce((s, e) => s + e.amount, 0);
export const committedTotal = (p: ProjectState) => p.expenses.filter((e) => e.status === "تأییدشده" || e.status === "در انتظار تأیید").reduce((s, e) => s + e.amount, 0);
export const budgetUsage = (p: ProjectState) => (p.budget.total > 0 ? Math.round((paidTotal(p) / p.budget.total) * 1000) / 10 : 0);

/** هزینه‌ی واقعی تسک = هزینه‌های پرداخت‌شده/تأییدشده‌ی متصل به آن */
export const taskActualCost = (p: ProjectState, taskId: string) =>
  p.expenses.filter((e) => e.taskId === taskId && (e.status === "پرداخت‌شده" || e.status === "تأییدشده")).reduce((s, e) => s + e.amount, 0);
export const taskLoggedHours = (p: ProjectState, taskId: string) => p.timeLogs.filter((l) => l.taskId === taskId).reduce((s, l) => s + l.hours, 0);

export const taskDuration = (t: PMTask) => Math.max(1, diffDays(t.start, t.due) + 1);

/** تبدیل به مدل قدیمی Project برای صفحه‌هایی که هنوز با آن کار می‌کنند */
export function toLegacyProject(p: ProjectState): Project {
  const statusOf = (t: PMTask): Task["status"] => {
    const k = kindOf(p, t.status);
    return k === "done" ? "انجام‌شده" : k === "review" ? "بازبینی" : k === "doing" ? "در حال انجام" : "برنامه‌ریزی";
  };
  return {
    id: p.meta.id,
    name: p.meta.name,
    client: p.meta.client,
    health: p.meta.health,
    progress: projectProgress(p),
    budgetUsed: Math.round(budgetUsage(p)),
    deadline: p.meta.deadline,
    tasks: activeTasks(p).map((t) => ({ id: t.id, title: t.title, status: statusOf(t), assignee: t.assignee, priority: t.priority === "بحرانی" ? "زیاد" : t.priority, due: t.due, progress: t.progress })),
    scope: p.meta.scope,
    holdingId: p.meta.holdingId,
    companyId: p.meta.companyId,
    authorId: p.meta.authorId,
  };
}

// ------------------------------ گراف وابستگی ------------------------------
/** آیا افزودن pred→succ حلقه می‌سازد؟ (یعنی از succ به pred مسیری هست) */
export function createsCycle(p: ProjectState, pred: string, succ: string): boolean {
  if (pred === succ) return true;
  const stack = [succ];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === pred) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    p.deps.filter((d) => d.predecessor === cur).forEach((d) => stack.push(d.successor));
  }
  return false;
}

/** لایه‌بندی: سطح هر تسک = ۱ + بیشترین سطح پیش‌نیازهایش (مرتب‌سازی توپولوژیک) */
export function layerTasks(p: ProjectState, tasks: PMTask[]) {
  const ids = new Set(tasks.map((t) => t.id));
  const deps = p.deps.filter((d) => ids.has(d.predecessor) && ids.has(d.successor));
  const level = new Map<string, number>();
  const visit = (id: string, trail: Set<string>): number => {
    if (level.has(id)) return level.get(id)!;
    if (trail.has(id)) return 0;
    trail.add(id);
    const preds = deps.filter((d) => d.successor === id).map((d) => d.predecessor);
    const lv = preds.length ? Math.max(...preds.map((x) => visit(x, trail))) + 1 : 0;
    trail.delete(id);
    level.set(id, lv);
    return lv;
  };
  tasks.forEach((t) => visit(t.id, new Set()));
  const layers: PMTask[][] = [];
  tasks.forEach((t) => {
    const lv = level.get(t.id)!;
    (layers[lv] ??= []).push(t);
  });
  // کاهش تقاطع یال‌ها: مرتب‌سازی هر لایه بر اساس میانگین جایگاه پیش‌نیازها
  for (let i = 1; i < layers.length; i++) {
    const prevIndex = new Map(layers[i - 1].map((t, idx) => [t.id, idx]));
    const bary = (t: PMTask) => {
      const ps = deps.filter((d) => d.successor === t.id).map((d) => prevIndex.get(d.predecessor)).filter((x) => x !== undefined) as number[];
      return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 999;
    };
    layers[i].sort((a, b) => bary(a) - bary(b));
  }
  return { layers: layers.filter(Boolean), level, deps };
}

/** مسیر بحرانی: طولانی‌ترین زنجیره بر حسب مدت تسک‌ها (روز) */
export function criticalPath(p: ProjectState, tasks: PMTask[]) {
  const { layers, deps } = layerTasks(p, tasks);
  const dist = new Map<string, number>();
  const prev = new Map<string, string | undefined>();
  layers.flat().forEach((t) => {
    const preds = deps.filter((d) => d.successor === t.id);
    let best = 0;
    let bestPred: string | undefined;
    preds.forEach((d) => {
      const v = dist.get(d.predecessor) ?? 0;
      if (v > best) {
        best = v;
        bestPred = d.predecessor;
      }
    });
    dist.set(t.id, best + taskDuration(t));
    prev.set(t.id, bestPred);
  });
  let end: string | undefined;
  let max = -1;
  dist.forEach((v, k) => {
    if (v > max) {
      max = v;
      end = k;
    }
  });
  const path: string[] = [];
  while (end) {
    path.unshift(end);
    end = prev.get(end);
  }
  const edges = new Set<string>();
  for (let i = 0; i < path.length - 1; i++) edges.add(`${path[i]}>${path[i + 1]}`);
  return { path, edges, days: Math.max(0, max) };
}

/** زنجیره‌ی بالادست یا پایین‌دست یک تسک */
export function chainOf(p: ProjectState, taskId: string, dir: "up" | "down") {
  const out = new Set<string>();
  const stack = [taskId];
  while (stack.length) {
    const cur = stack.pop()!;
    p.deps
      .filter((d) => (dir === "up" ? d.successor === cur : d.predecessor === cur))
      .forEach((d) => {
        const next = dir === "up" ? d.predecessor : d.successor;
        if (!out.has(next)) {
          out.add(next);
          stack.push(next);
        }
      });
  }
  return out;
}

/** تعارض زمان‌بندی: تسک وابسته قبل از پایان پیش‌نیازش شروع می‌شود */
export function dependencyConflicts(p: ProjectState) {
  return p.deps
    .map((d) => {
      const a = p.tasks.find((t) => t.id === d.predecessor);
      const b = p.tasks.find((t) => t.id === d.successor);
      if (!a || !b || isDone(p, a)) return null;
      const da = dayNum(a.due);
      const db = dayNum(b.start);
      if (da === null || db === null || db >= da) return null;
      return { dep: d, pred: a, succ: b, overlap: da - db };
    })
    .filter(Boolean) as { dep: ProjectState["deps"][number]; pred: PMTask; succ: PMTask; overlap: number }[];
}

// ------------------------------ تحلیل خودکار ریسک ------------------------------
/** هم‌شکل با RiskAnalysis در API: risk_type, score (0..100), level, entity_type, entity_id, factors, explanation */
export type RiskFinding = {
  id: string;
  riskType: "schedule_delay" | "cost_overrun" | "dependency_chain" | "milestone_slip" | "resource_overload" | "blocked_work" | "open_critical_risk";
  score: number;
  level: "low" | "medium" | "high" | "critical";
  entityType: "project" | "task" | "milestone" | "resource";
  entityId: string;
  entityTitle: string;
  factors: Record<string, string | number>;
  explanation: string;
};

const levelOf = (s: number): RiskFinding["level"] => (s >= 80 ? "critical" : s >= 60 ? "high" : s >= 35 ? "medium" : "low");

export function analyzeRisks(p: ProjectState, ref: string): RiskFinding[] {
  const out: RiskFinding[] = [];
  const r = dayNum(ref)!;
  activeTasks(p).forEach((t) => {
    if (isDone(p, t)) return;
    const due = dayNum(t.due);
    const start = dayNum(t.start);
    if (due === null || start === null) return;
    const total = Math.max(1, due - start + 1);
    const elapsed = Math.min(1, Math.max(0, (r - start) / total));
    const gap = elapsed * 100 - t.progress;
    const late = r - due;
    if (late > 0 || gap > 30) {
      const succ = successorsOf(p, t.id).length;
      const score = Math.min(100, Math.round((late > 0 ? 50 + late * 3 : gap) + succ * 6 + (t.priority === "بحرانی" ? 10 : 0)));
      out.push({
        id: `sd-${t.id}`,
        riskType: "schedule_delay",
        score,
        level: levelOf(score),
        entityType: "task",
        entityId: t.id,
        entityTitle: t.title,
        factors: { "زمان سپری‌شده": `${fa(Math.round(elapsed * 100))}٪`, "پیشرفت": `${fa(t.progress)}٪`, "روز تأخیر": fa(Math.max(0, late)), "تسک‌های وابسته": fa(succ) },
        explanation: late > 0 ? `${fa(late)} روز از سررسید گذشته و ${fa(succ)} تسک به آن وابسته‌اند.` : `${fa(Math.round(elapsed * 100))}٪ زمان سپری شده اما پیشرفت ${fa(t.progress)}٪ است.`,
      });
    }
    if (t.estBudget > 0) {
      const actual = taskActualCost(p, t.id);
      if (actual > t.estBudget) {
        const over = Math.round(((actual - t.estBudget) / t.estBudget) * 100);
        const score = Math.min(100, 40 + over * 2);
        out.push({ id: `co-${t.id}`, riskType: "cost_overrun", score, level: levelOf(score), entityType: "task", entityId: t.id, entityTitle: t.title, factors: { "بودجه‌ی تخمینی": fmtShort(t.estBudget), "هزینه‌ی واقعی": fmtShort(actual), "اضافه‌هزینه": `${fa(over)}٪` }, explanation: `هزینه‌ی واقعی ${fa(over)}٪ بیشتر از بودجه‌ی تخمینی است.` });
      }
    }
    const waiting = openPredecessors(p, t.id);
    if (waiting.length && start <= r) {
      const score = Math.min(100, 45 + waiting.length * 12);
      out.push({ id: `dc-${t.id}`, riskType: "dependency_chain", score, level: levelOf(score), entityType: "task", entityId: t.id, entityTitle: t.title, factors: { "پیش‌نیاز باز": fa(waiting.length), "نمونه": waiting[0].title }, explanation: `زمان شروع رسیده اما ${fa(waiting.length)} پیش‌نیاز هنوز انجام نشده است.` });
    }
    if (kindOf(p, t.status) === "blocked") {
      out.push({ id: `bw-${t.id}`, riskType: "blocked_work", score: 70, level: "high", entityType: "task", entityId: t.id, entityTitle: t.title, factors: { "وضعیت": "متوقف‌شده", "مسئول": t.assignee }, explanation: "کار متوقف شده و تا رفع مانع، تسک‌های وابسته هم جلو نمی‌روند." });
    }
  });
  const paidPct = budgetUsage(p);
  const prog = projectProgress(p);
  if (paidPct > prog + 10) {
    const score = Math.min(100, Math.round(35 + (paidPct - prog) * 1.5));
    out.push({ id: "co-project", riskType: "cost_overrun", score, level: levelOf(score), entityType: "project", entityId: p.meta.id, entityTitle: p.meta.name, factors: { "مصرف بودجه": `${fa(paidPct)}٪`, "پیشرفت": `${fa(prog)}٪` }, explanation: "سرعت مصرف بودجه از سرعت پیشرفت کار جلوتر است." });
  }
  p.milestones.forEach((m) => {
    if (m.status === "انجام‌شده") return;
    const due = dayNum(m.due);
    if (due === null) return;
    const left = due - r;
    const open = m.taskIds.map((id) => p.tasks.find((t) => t.id === id)).filter((t) => t && !isDone(p, t)).length;
    if (open && left <= 7) {
      const score = Math.min(100, 50 + open * 8 + Math.max(0, 7 - left) * 4);
      out.push({ id: `ms-${m.id}`, riskType: "milestone_slip", score, level: levelOf(score), entityType: "milestone", entityId: m.id, entityTitle: m.title, factors: { "روز مانده": fa(left), "تسک ناتمام": fa(open) }, explanation: left < 0 ? `سررسید ${fa(-left)} روز گذشته و ${fa(open)} تسک آن باز است.` : `${fa(left)} روز به سررسید مانده و ${fa(open)} تسک آن تمام نشده است.` });
    }
  });
  const load = new Map<string, number>();
  activeTasks(p).filter((t) => !isDone(p, t) && ["doing", "review"].includes(kindOf(p, t.status))).forEach((t) => load.set(t.assignee, (load.get(t.assignee) ?? 0) + 1));
  load.forEach((n, who) => {
    if (n >= 3) out.push({ id: `ro-${who}`, riskType: "resource_overload", score: 40 + n * 8, level: levelOf(40 + n * 8), entityType: "resource", entityId: who, entityTitle: who, factors: { "کار هم‌زمان": fa(n) }, explanation: `${who} هم‌زمان ${fa(n)} تسک فعال دارد.` });
  });
  p.risks.filter((x) => x.status !== "بسته" && x.severity === "بحرانی").forEach((x) => {
    out.push({ id: `ocr-${x.id}`, riskType: "open_critical_risk", score: x.probability === "زیاد" ? 85 : 65, level: x.probability === "زیاد" ? "critical" : "high", entityType: "project", entityId: p.meta.id, entityTitle: x.title, factors: { "احتمال": x.probability, "مسئول": x.owner }, explanation: "ریسک ثبت‌شده‌ی بحرانی هنوز بسته نشده است." });
  });
  return out.sort((a, b) => b.score - a.score);
}

export const riskTypeLabel: Record<RiskFinding["riskType"], string> = {
  schedule_delay: "تأخیر زمان‌بندی",
  cost_overrun: "اضافه‌هزینه",
  dependency_chain: "زنجیره‌ی وابستگی",
  milestone_slip: "لغزش مایل‌ستون",
  resource_overload: "فشار کاری منابع",
  blocked_work: "کار متوقف‌شده",
  open_critical_risk: "ریسک بحرانی باز",
};
export const riskLevelLabel: Record<RiskFinding["level"], string> = { low: "کم", medium: "متوسط", high: "زیاد", critical: "بحرانی" };

/** آمار هر عضو — شکل ProjectMemberTaskStats در API */
export function memberStats(p: ProjectState, name: string) {
  const ts = activeTasks(p).filter((t) => t.assignee === name);
  const closed = ts.filter((t) => isDone(p, t)).length;
  const hours = p.timeLogs.filter((l) => l.member === name).reduce((s, l) => s + l.hours, 0);
  return { task_count: ts.length, closed_task_count: closed, open_task_count: ts.length - closed, progress_percentage: ts.length ? Math.round((closed / ts.length) * 100) : 0, hours };
}
