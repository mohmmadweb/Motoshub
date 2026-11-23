// ---------------------------------------------------------------------------
// C4 — ردیف‌های میزکار از ماژول پروژه و وظیفه (برای کارت «فعالیت و وظایف من» در «میزکار من»).
// شکل مشترک ردیف: { id, kind, title, meta, due?, priority?, href, actions? }
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import { useTenancy } from "../context/TenancyContext";
import { useProjectsPM } from "../context/ProjectsContext";
import { dayNum } from "./jalali";
import { isDone } from "./selectors";
import { inboxBucket, inboxBucketLabel, inboxBucketOrder, isAssignedTo, type InboxBucket } from "./rules";
import type { PMTask, ProjectState } from "./types";

export type DeskAction = { id: string; label: string; run: () => void; tone?: "primary" | "danger" };
export type DeskRow = {
  id: string;
  kind: "task" | "approval" | "removal";
  title: string;
  meta: string;
  due?: string;
  priority?: "زیاد" | "متوسط" | "کم";
  href: string;
  bucket?: InboxBucket;
  actions?: DeskAction[];
};

export const taskHref = (pid: string, t: Pick<PMTask, "id" | "key">) => `/projects/${pid}?tab=board&focus=${t.key ?? t.id}`;
const rowPriority = (t: PMTask): DeskRow["priority"] => (t.priority === "بحرانی" ? "زیاد" : t.priority);

/** کارهای باز من در همه‌ی پروژه‌ها، مرتب بر اساس صندوق (تأخیر، امروز، جاری، بدون زمان، آینده) و سررسید */
export function deskTasks(projects: ProjectState[], me: string, ref: string) {
  return projects
    .filter((p) => !p.meta.archived)
    .flatMap((p) => p.tasks.filter((t) => !t.archived && isAssignedTo(t, me) && !isDone(p, t)).map((t) => ({ p, t, b: inboxBucket(t, ref) })))
    .sort((a, b) => inboxBucketOrder.indexOf(a.b) - inboxBucketOrder.indexOf(b.b) || (dayNum(a.t.due) ?? 9e9) - (dayNum(b.t.due) ?? 9e9));
}

/** هوک میزکار: کارهای باز من + کارهای منتظر تأیید من + درخواست‌های حذف منتظر تصمیم من (مدیر پروژه) */
export function usePmDesk(): { rows: DeskRow[]; counts: Record<InboxBucket, number> & { approvals: number } } {
  const { actingUser } = useTenancy();
  const pm = useProjectsPM();
  const me = actingUser.name;
  return useMemo(() => {
    const live = pm.projects.filter((p) => !p.meta.archived);
    const done = (p: ProjectState) => p.columns.find((c) => c.kind === "done")?.id;
    const tasks = deskTasks(pm.projects, me, pm.refDate);
    const counts = { overdue: 0, today: 0, current: 0, nodate: 0, future: 0, approvals: 0 } as Record<InboxBucket, number> & { approvals: number };
    tasks.forEach((x) => (counts[x.b] += 1));
    const rows: DeskRow[] = tasks.map(({ p, t, b }) => ({
      id: `task:${p.meta.id}:${t.id}`,
      kind: "task",
      title: t.title,
      meta: `${p.meta.name} · ${inboxBucketLabel[b]}`,
      due: t.due,
      priority: rowPriority(t),
      href: taskHref(p.meta.id, t),
      bucket: b,
      actions: done(p) ? [{ id: "done", label: "انجام شد", tone: "primary", run: () => pm.moveTask(p.meta.id, t.id, done(p)!) }] : [],
    }));
    live.forEach((p) =>
      p.tasks
        .filter((t) => t.approval?.status === "در انتظار" && t.approval.approver === me)
        .forEach((t) => {
          counts.approvals += 1;
          rows.push({
            id: `approval:${p.meta.id}:${t.id}`,
            kind: "approval",
            title: t.title,
            meta: `${p.meta.name} · منتظر تأیید شما (از «${t.approval!.requestedBy}»)`,
            due: t.due,
            priority: rowPriority(t),
            href: taskHref(p.meta.id, t),
            actions: [
              { id: "approve", label: "تأیید", tone: "primary", run: () => pm.decideApproval(p.meta.id, t.id, true) },
              { id: "reject", label: "رد", tone: "danger", run: () => pm.decideApproval(p.meta.id, t.id, false) },
            ],
          });
        }),
    );
    live
      .filter((p) => pm.isManager(p.meta.id))
      .forEach((p) =>
        p.tasks
          .filter((t) => t.removalRequest)
          .forEach((t) =>
            rows.push({
              id: `removal:${p.meta.id}:${t.id}`,
              kind: "removal",
              title: t.title,
              meta: `${p.meta.name} · درخواست ${t.removalRequest!.kind === "delete" ? "حذف" : "بایگانی"} از «${t.removalRequest!.by}»`,
              href: taskHref(p.meta.id, t),
              actions: [
                { id: "approve", label: "تأیید", tone: "primary", run: () => pm.decideRemoval(p.meta.id, t.id, true) },
                { id: "reject", label: "رد", run: () => pm.decideRemoval(p.meta.id, t.id, false) },
              ],
            }),
          ),
      );
    return { rows, counts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pm.projects, pm.refDate, me]);
}
