// ---------------------------------------------------------------------------
// صندوق کار (کارتابل) یک نفر در همه‌ی پروژه‌ها — v6.8 «فهرست کارها» + صندوق‌های میزیتو:
// تأخیر · امروز · جاری · بدون زمان · آینده (+ انجام‌شده). فیلتر جستجو/پروژه/اولویت، «انجام شد» با
// تأیید چک‌لیست ناقص و بازگردانی، برگه‌ی کناری کار، و چاپ همان فهرست فیلترشده بدون پوسته.
// readOnly = کارتابل همکار برای مدیر (مانیتورینگ).
// ---------------------------------------------------------------------------
import { useMemo, useRef, useState } from "react";
import { Check, Printer, Users } from "lucide-react";
import FilterBar from "../../components/ui/FilterBar";
import ListRow, { List } from "../../components/ui/ListRow";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { dayNum, fa } from "../../pm/jalali";
import { columnLabel, isDone, kindOf } from "../../pm/selectors";
import { assigneesOf, delayDays, inboxBucket, inboxBucketLabel, inboxBucketOrder, isAssignedTo, isProjectManager, type InboxBucket } from "../../pm/rules";
import { printNode } from "../../pm/print";
import type { PMTask, ProjectState } from "../../pm/types";
import TaskSheetHost from "./TaskSheetHost";
import { kindTone } from "./shared";

export type InboxItem = { p: ProjectState; t: PMTask };
type Pill = "all" | InboxBucket | "done";

const bucketDot: Record<InboxBucket, "danger" | "warning" | "brand" | "neutral" | "info"> = { overdue: "danger", today: "warning", current: "brand", nodate: "neutral", future: "info" };

/** کارهای یک نفر (مسئول یا مسئول هم‌زمان) */
export function personTasks(projects: ProjectState[], person: string): InboxItem[] {
  return projects.filter((p) => !p.meta.archived).flatMap((p) => p.tasks.filter((t) => !t.archived && isAssignedTo(t, person)).map((t) => ({ p, t })));
}

export default function TaskInbox({ person, items: given, readOnly = false, printTitle, initial = "all", showOwner = false }: { person: string; items?: InboxItem[]; readOnly?: boolean; printTitle?: string; initial?: Pill; showOwner?: boolean }) {
  const pm = useProjectsPM();
  const { notify } = useToast();
  const confirm = useConfirm();
  const ref = pm.refDate;
  const items = useMemo(() => given ?? personTasks(pm.projects, person), [given, pm.projects, person]);
  const [pill, setPill] = useState<Pill>(initial);
  const [q, setQ] = useState("");
  const [proj, setProj] = useState("");
  const [prio, setPrio] = useState("");
  const [open, setOpen] = useState<{ pid: string; id: string } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const open_ = items.filter((x) => !isDone(x.p, x.t));
  const counts = Object.fromEntries(inboxBucketOrder.map((b) => [b, open_.filter((x) => inboxBucket(x.t, ref) === b).length])) as Record<InboxBucket, number>;
  const doneCount = items.length - open_.length;
  const filtered = items
    .filter((x) => (pill === "done" ? isDone(x.p, x.t) : !isDone(x.p, x.t) && (pill === "all" || inboxBucket(x.t, ref) === pill)))
    .filter((x) => !q || x.t.title.includes(q) || (x.t.key ?? "").toLowerCase().includes(q.toLowerCase()))
    .filter((x) => !proj || x.p.meta.id === proj)
    .filter((x) => !prio || x.t.priority === prio || (prio === "زیاد" && x.t.priority === "بحرانی"))
    .sort((a, b) => (dayNum(a.t.due) ?? 9e9) - (dayNum(b.t.due) ?? 9e9));
  const groups: { id: string; label: string; rows: InboxItem[] }[] =
    pill === "done"
      ? [{ id: "done", label: "انجام‌شده", rows: filtered }]
      : inboxBucketOrder.map((b) => ({ id: b, label: inboxBucketLabel[b], rows: filtered.filter((x) => inboxBucket(x.t, ref) === b) })).filter((g) => g.rows.length);
  const projects = [...new Map(items.map((x) => [x.p.meta.id, x.p.meta.name])).entries()];

  const complete = (x: InboxItem) => {
    const doneCol = x.p.columns.find((c) => c.kind === "done")?.id;
    if (!doneCol) return;
    const prev = x.t.status;
    const run = () => {
      pm.moveTask(x.p.meta.id, x.t.id, doneCol);
      const pending = x.t.finalApprover && x.t.finalApprover !== pm.actor;
      notify(pending ? `«${x.t.title}» به بازبینی رفت و منتظر تأیید نهایی «${x.t.finalApprover}» است.` : `«${x.t.title}» انجام شد.`, {
        tone: "success",
        undo: isProjectManager(x.p, pm.actor) || pm.isManager(x.p.meta.id) ? () => pm.moveTask(x.p.meta.id, x.t.id, prev) : undefined,
      });
    };
    const left = x.t.checklist.filter((c) => !c.done).length;
    if (left)
      confirm({
        title: "چک‌لیست کامل نیست",
        message: `${fa(left)} مورد از چک‌لیست «${x.t.title}» هنوز انجام نشده است. با این حال انجام شد؟`,
        confirmLabel: "بله، انجام شد",
        onConfirm: run,
      });
    else run();
  };

  const row = (x: InboxItem) => {
    const done = isDone(x.p, x.t);
    const late = delayDays(x.t, ref);
    const checks = x.t.checklist.length;
    const checked = x.t.checklist.filter((c) => c.done).length;
    return (
      <ListRow
        key={`${x.p.meta.id}-${x.t.id}`}
        priority={x.t.priority === "بحرانی" ? "زیاد" : x.t.priority}
        title={<span className={done ? "line-through text-ink-500" : ""}>{x.t.title}</span>}
        badges={
          <>
            <Badge tone="brand">{x.p.meta.name}</Badge>
            <Badge tone={kindTone[kindOf(x.p, x.t.status)]} dot>
              {columnLabel(x.p, x.t.status)}
            </Badge>
            {x.t.approval?.status === "در انتظار" && <Badge tone="warning">منتظر تأیید {x.t.approval.approver}</Badge>}
            {!done && late > 0 && <Badge tone="danger">{fa(late)} روز تأخیر</Badge>}
            {assigneesOf(x.t).length > 1 && (
              <Badge tone="neutral" icon={<Users size={11} />}>
                {fa(assigneesOf(x.t).length)} مسئول
              </Badge>
            )}
          </>
        }
        due={`${x.t.reminder && !done ? `یادآوری ${x.t.reminder} · ` : ""}سررسید ${x.t.due}`}
        subtitle={showOwner ? `مسئول: ${assigneesOf(x.t).join("، ")}` : undefined}
        onClick={() => setOpen({ pid: x.p.meta.id, id: x.t.id })}
        actions={
          <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {checks > 0 && (
              <span className="text-[12px] text-ink-500 tabular-nums">
                {fa(checked)}/{fa(checks)}
              </span>
            )}
            {!readOnly && !done && (
              <Button size="sm" variant="outline" icon={<Check size={14} />} onClick={() => complete(x)}>
                انجام شد
              </Button>
            )}
          </span>
        }
      />
    );
  };

  const pills = [
    { id: "all" as Pill, label: "همه", count: open_.length },
    ...inboxBucketOrder.map((b) => ({ id: b as Pill, label: inboxBucketLabel[b], count: counts[b], dot: bucketDot[b] })),
    { id: "done" as Pill, label: "انجام‌شده", count: doneCount, dot: "success" as const },
  ];

  return (
    <div className="card">
      <FilterBar
        pills={pills}
        active={pill}
        onPill={setPill}
        search={q}
        onSearch={setQ}
        searchPlaceholder="جستجو در کارها…"
        activeCount={(proj ? 1 : 0) + (prio ? 1 : 0)}
        onClear={q || proj || prio ? () => (setQ(""), setProj(""), setPrio("")) : undefined}
      >
        <select className="input-field !w-auto" value={proj} onChange={(e) => setProj(e.target.value)} aria-label="پروژه">
          <option value="">همه‌ی پروژه‌ها</option>
          {projects.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select className="input-field !w-auto" value={prio} onChange={(e) => setPrio(e.target.value)} aria-label="اولویت">
          <option value="">همه‌ی اولویت‌ها</option>
          {["زیاد", "متوسط", "کم"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <Button size="sm" variant="ghost" icon={<Printer size={14} />} onClick={() => printNode(printRef.current, printTitle ?? `کارهای ${person}`, { landscape: true })}>
          چاپ فهرست
        </Button>
      </FilterBar>
      {groups.map((g) => (
        <section key={g.id}>
          <h3 className={`px-4 py-2 text-[13px] font-bold border-b border-[var(--color-border)] bg-ink-50 ${g.id === "overdue" ? "text-rose-700" : "text-ink-700"}`}>
            {g.label} · {fa(g.rows.length)}
          </h3>
          <List>{g.rows.map(row)}</List>
        </section>
      ))}
      {groups.length === 0 && (
        <div className="p-5">
          <EmptyState compact title="کاری با این فیلتر نیست" description="فیلترها را عوض کنید یا «همه» را بزنید." />
        </div>
      )}
      {/* نسخه‌ی چاپی فهرست فیلترشده (جدول قابل کپی در اکسل/ورد) */}
      <div className="hidden">
        <div ref={printRef}>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>
            {printTitle ?? `کارهای ${person}`} — {pill === "all" ? "همه‌ی کارهای باز" : pill === "done" ? "انجام‌شده" : inboxBucketLabel[pill]} · {ref}
          </h1>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                {["عنوان", "پروژه", "مسئول", "وضعیت", "اولویت", "یادآوری", "سررسید", "تأخیر (روز)", "پیشرفت"].map((h) => (
                  <th key={h} style={{ border: "1px solid var(--color-ink-300)", padding: 4, textAlign: "right" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((x) => (
                <tr key={`${x.p.meta.id}-${x.t.id}`}>
                  {[x.t.title, x.p.meta.name, assigneesOf(x.t).join("، "), columnLabel(x.p, x.t.status), x.t.priority, x.t.reminder ?? "—", x.t.due, isDone(x.p, x.t) ? "—" : fa(delayDays(x.t, ref)), `${fa(isDone(x.p, x.t) ? 100 : x.t.progress)}٪`].map((c, i) => (
                    <td key={i} style={{ border: "1px solid var(--color-ink-300)", padding: 4 }}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <TaskSheetHost pid={open?.pid ?? null} taskId={open?.id ?? null} onClose={() => setOpen(null)} readOnly={readOnly} onOpenTask={(id) => open && setOpen({ pid: open.pid, id })} />
    </div>
  );
}
