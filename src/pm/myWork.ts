// ---------------------------------------------------------------------------
// «کارهای من» — هم‌تراز Asana My Tasks / Jira Assigned to me / میزیتو «کارهای من»:
// همه‌ی تسک‌های کاربر در همه‌ی پروژه‌ها، دسته‌بندی‌شده بر اساس زمان.
// ---------------------------------------------------------------------------
import { dayNum } from "./jalali";
import { isDone, kindOf } from "./selectors";
import type { PMTask, ProjectState } from "./types";

export type WorkItem = { p: ProjectState; t: PMTask };
export type Bucket = "overdue" | "today" | "week" | "later" | "nodate";
export const bucketLabel: Record<Bucket, string> = {
  overdue: "عقب‌افتاده",
  today: "امروز",
  week: "۷ روز آینده",
  later: "بعداً",
  nodate: "بدون سررسید",
};

export function bucketOf(t: PMTask, ref: string): Bucket {
  const d = dayNum(t.due);
  const r = dayNum(ref)!;
  if (d === null) return "nodate";
  if (d < r) return "overdue";
  if (d === r) return "today";
  if (d - r <= 7) return "week";
  return "later";
}

const byDue = (a: WorkItem, b: WorkItem) => (dayNum(a.t.due) ?? 9e9) - (dayNum(b.t.due) ?? 9e9);

export function myWork(projects: ProjectState[], me: string) {
  const live = projects.filter((p) => !p.meta.archived);
  const all: WorkItem[] = live.flatMap((p) => p.tasks.filter((t) => !t.archived).map((t) => ({ p, t })));
  const assigned = all.filter((x) => x.t.assignee === me).sort(byDue);
  return {
    assigned,
    open: assigned.filter((x) => !isDone(x.p, x.t)),
    done: assigned.filter((x) => isDone(x.p, x.t)),
    watching: all.filter((x) => (x.t.watchers ?? []).includes(me) && x.t.assignee !== me && !isDone(x.p, x.t)).sort(byDue),
    approvals: all.filter((x) => x.t.approval?.status === "در انتظار" && x.t.approval.approver === me),
    requested: all.filter((x) => x.t.approval && x.t.approval.requestedBy === me),
    timers: all.filter((x) => x.t.timer?.by === me),
    blocked: assigned.filter((x) => !isDone(x.p, x.t) && kindOf(x.p, x.t.status) === "blocked"),
    mentions: live.flatMap((p) =>
      p.tasks.flatMap((t) =>
        t.comments.filter((c) => c.text.includes(`@${me.replace(/ /g, "_")}`)).map((c) => ({ p, t, c }))
      )
    ),
  };
}
