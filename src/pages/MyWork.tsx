import { useState } from "react";
import { Link } from "react-router-dom";
import { ListTodo, AlertTriangle, CalendarClock, ShieldCheck, Eye, Timer, CheckCircle2, Repeat, ListTree } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import { useTenancy } from "../context/TenancyContext";
import { useProjectsPM } from "../context/ProjectsContext";
import { useToast } from "../components/ui/ToastProvider";
import { myWork, bucketOf, bucketLabel, type Bucket, type WorkItem } from "../pm/myWork";
import { columnLabel, isDone, kindOf } from "../pm/selectors";
import { fa } from "../pm/jalali";
import { kindTone, priorityTone } from "./project/shared";
import { ProjectIcon } from "./project/projectIcons";

type Tab = "mine" | "approvals" | "watching" | "done";
const bucketOrder: Bucket[] = ["overdue", "today", "week", "later", "nodate"];

export default function MyWork() {
  const { actingUser, hasPermission } = useTenancy();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const me = actingUser.name;
  const w = myWork(pm.projects, me);
  const [tab, setTab] = useState<Tab>("mine");
  const canWork = hasPermission("projects.tasks");

  const complete = (x: WorkItem) => {
    const done = x.p.columns.find((c) => c.kind === "done")?.id;
    const todo = x.p.columns.find((c) => c.kind === "todo")?.id ?? x.p.columns[0]?.id;
    if (!done || !todo) return;
    const was = isDone(x.p, x.t);
    pm.moveTask(x.p.meta.id, x.t.id, was ? todo : done);
    notify(was ? `«${x.t.title}» دوباره باز شد.` : `«${x.t.title}» انجام شد${x.t.recurrence ? " و نمونه‌ی بعدی آن ساخته شد" : ""}.`);
  };

  const Row = ({ x, showCheck = true }: { x: WorkItem; showCheck?: boolean }) => {
    const dn = isDone(x.p, x.t);
    const subs = x.p.tasks.filter((s) => s.parentId === x.t.id);
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-ink-50">
        {showCheck && (
          <input
            type="checkbox"
            checked={dn}
            disabled={!canWork}
            onChange={() => complete(x)}
            aria-label={`انجام‌شده: ${x.t.title}`}
            className="accent-[var(--color-brand-600)] w-4 h-4 shrink-0"
          />
        )}
        <Link to={`/dashboard/projects/${x.p.meta.id}?tab=board&focus=${x.t.id}`} className="flex-1 min-w-0">
          <p className={`text-sm truncate ${dn ? "line-through text-ink-400" : "text-ink-900 hover:text-brand-700"}`}>{x.t.title}</p>
          <p className="text-[11px] text-ink-400 flex items-center gap-1.5 mt-0.5 truncate">
            <span style={{ color: x.p.meta.color }} className="shrink-0">
              <ProjectIcon name={x.p.meta.icon} size={11} />
            </span>
            <span className="truncate">{x.p.meta.name}</span>
            {x.t.recurrence && <Repeat size={11} className="shrink-0" />}
            {subs.length > 0 && (
              <span className="flex items-center gap-0.5 shrink-0">
                <ListTree size={11} /> {fa(subs.filter((s) => isDone(x.p, s)).length)}/{fa(subs.length)}
              </span>
            )}
            {x.t.timer && <Timer size={11} className="text-rose-600 shrink-0" />}
          </p>
        </Link>
        <Badge tone={priorityTone[x.t.priority]}>{x.t.priority}</Badge>
        <Badge tone={kindTone[kindOf(x.p, x.t.status)]}>{columnLabel(x.p, x.t.status)}</Badge>
        <span className={`text-[11px] w-20 text-left shrink-0 ${bucketOf(x.t, pm.refDate) === "overdue" && !dn ? "text-rose-600 font-medium" : "text-ink-500"}`}>{x.t.due}</span>
      </div>
    );
  };

  const groups = bucketOrder.map((b) => ({ b, items: w.open.filter((x) => bucketOf(x.t, pm.refDate) === b) })).filter((g) => g.items.length);
  const overdue = w.open.filter((x) => bucketOf(x.t, pm.refDate) === "overdue").length;
  const week = w.open.filter((x) => ["today", "week"].includes(bucketOf(x.t, pm.refDate))).length;

  const tabs: { id: Tab; label: string; count: number; icon: typeof Eye }[] = [
    { id: "mine", label: "مسئول من", count: w.open.length, icon: ListTodo },
    { id: "approvals", label: "منتظر تأیید من", count: w.approvals.length, icon: ShieldCheck },
    { id: "watching", label: "دنبال می‌کنم", count: w.watching.length, icon: Eye },
    { id: "done", label: "انجام‌شده", count: w.done.length, icon: CheckCircle2 },
  ];

  return (
    <div>
      <PageHeader title="فعالیت‌ها و وظایف" description={`همه‌ی تسک‌های «${me}» در همه‌ی پروژه‌ها — بر اساس سررسید مرتب شده‌اند`} icon={<ListTodo size={18} />} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="تسک‌های باز من" value={fa(w.open.length)} tone="brand" icon={<ListTodo size={16} />} />
        <StatCard label="عقب‌افتاده" value={fa(overdue)} tone={overdue ? "danger" : "success"} icon={<AlertTriangle size={16} />} />
        <StatCard label="سررسید تا ۷ روز" value={fa(week)} tone="warning" icon={<CalendarClock size={16} />} />
        <StatCard label="منتظر تأیید من" value={fa(w.approvals.length)} tone={w.approvals.length ? "warning" : "success"} icon={<ShieldCheck size={16} />} />
      </div>

      {w.timers.length > 0 && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs p-3 flex items-center gap-2 flex-wrap">
          <Timer size={14} /> تایمر روشن:
          {w.timers.map((x) => (
            <Link key={x.t.id} to={`/dashboard/projects/${x.p.meta.id}?tab=board&focus=${x.t.id}`} className="underline">
              {x.t.title}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-ink-200 mb-4 overflow-x-auto" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap ${tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"}`}
          >
            <t.icon size={14} /> {t.label}
            <span className="text-[10px] rounded-full px-1.5 bg-ink-100 text-ink-500">{fa(t.count)}</span>
          </button>
        ))}
      </div>

      {tab === "mine" && (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.b} className="card">
              <p className={`px-3 py-2 text-xs font-bold border-b border-ink-100 ${g.b === "overdue" ? "text-rose-700" : "text-ink-700"}`}>
                {bucketLabel[g.b]} <span className="font-normal text-ink-400">({fa(g.items.length)})</span>
              </p>
              <div className="divide-y divide-ink-100">
                {g.items.map((x) => (
                  <Row key={x.t.id} x={x} />
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="text-sm text-ink-400 text-center py-10">کار بازی ندارید.</p>}
        </div>
      )}

      {tab === "approvals" && (
        <div className="card divide-y divide-ink-100">
          {w.approvals.map((x) => (
            <div key={x.t.id}>
              <Row x={x} showCheck={false} />
              <p className="px-3 pb-2 -mt-1 text-[11px] text-amber-700">درخواست از «{x.t.approval!.requestedBy}» · {x.t.approval!.at} — برای تأیید یا رد، تسک را باز کنید.</p>
            </div>
          ))}
          {w.approvals.length === 0 && <p className="text-sm text-ink-400 text-center py-10">درخواست تأییدی منتظر شما نیست.</p>}
        </div>
      )}

      {tab === "watching" && (
        <div className="card divide-y divide-ink-100">
          {w.watching.map((x) => (
            <Row key={x.t.id} x={x} showCheck={false} />
          ))}
          {w.watching.length === 0 && <p className="text-sm text-ink-400 text-center py-10">تسکی را دنبال نمی‌کنید. در جزئیات هر تسک «دنبال کن» را بزنید.</p>}
        </div>
      )}

      {tab === "done" && (
        <div className="card divide-y divide-ink-100">
          {w.done.map((x) => (
            <Row key={x.t.id} x={x} />
          ))}
          {w.done.length === 0 && <p className="text-sm text-ink-400 text-center py-10">هنوز تسکی انجام نداده‌اید.</p>}
        </div>
      )}
    </div>
  );
}
