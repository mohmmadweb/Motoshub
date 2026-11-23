// ---------------------------------------------------------------------------
// «فعالیت و وظایف من» (/activities) — v6.8 کار و پروژه: فهرست با صندوق‌های میزیتو
// (تأخیر/امروز/جاری/بدون زمان/آینده)، کانبان وضعیت‌ها، منتظر تأیید من، دنبال می‌کنم.
// ‎?new=task‎ (قرارداد C3) فرم کار جدید را باز می‌کند.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ListChecks, Plus, ShieldCheck, Timer } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Tabs from "../components/ui/Tabs";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Note from "../components/ui/Note";
import ListRow, { List } from "../components/ui/ListRow";
import EmptyState from "../components/ui/EmptyState";
import { useTenancy } from "../context/TenancyContext";
import { useProjectsPM } from "../context/ProjectsContext";
import { useToast } from "../components/ui/ToastProvider";
import { myWork, type WorkItem } from "../pm/myWork";
import { isDone, kindOf } from "../pm/selectors";
import { fa } from "../pm/jalali";
import { STATUS_OF_KIND, taskStatusLabel } from "../pm/api";
import { controlOf, isProjectManager } from "../pm/rules";
import type { ColumnKind } from "../pm/types";
import TaskInbox from "./project/TaskInbox";
import TaskCreateModal from "./project/TaskCreateModal";
import TaskSheetHost from "./project/TaskSheetHost";
import { REOPEN_BLOCKED } from "./project/useRules";

type Tab = "list" | "board" | "approvals" | "watching";
const boardKinds: ColumnKind[] = ["todo", "doing", "review", "done"];

export default function MyWork() {
  const { actingUser, hasPermission } = useTenancy();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const me = actingUser.name;
  const w = myWork(pm.projects, me);
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("list");
  const [createOpen, setCreateOpen] = useState(false);
  const [open, setOpen] = useState<{ pid: string; id: string } | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);

  // پروژه‌هایی که کاربر می‌تواند در آن‌ها کار بسازد (عضو/مدیر و مجاز به ایجاد)
  const creatable = useMemo(
    () =>
      pm.projects.filter(
        (p) => !p.meta.archived && (p.meta.manager === me || p.members.some((m) => m.name === me || m.userId === actingUser.id)) && (isProjectManager(p, me) || controlOf(p).members_create_tasks),
      ),
    [pm.projects, me, actingUser.id],
  );
  const canCreate = hasPermission("projects.tasks") && creatable.length > 0;

  // C3: ‎/activities?new=task‎
  useEffect(() => {
    if (params.get("new") !== "task") return;
    if (canCreate) setCreateOpen(true);
    else notify("در هیچ پروژه‌ای اجازه‌ی ساخت کار ندارید؛ از مدیر پروژه بخواهید شما را عضو کند.", "warning");
    const next = new URLSearchParams(params);
    next.delete("new");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const moveToKind = (x: WorkItem, kind: ColumnKind) => {
    const col = x.p.columns.find((c) => c.kind === kind);
    if (!col || col.id === x.t.status) return;
    if (isDone(x.p, x.t) && kind !== "done" && !pm.isManager(x.p.meta.id)) return notify(REOPEN_BLOCKED, "warning");
    const prev = x.t.status;
    pm.moveTask(x.p.meta.id, x.t.id, col.id);
    notify(`«${x.t.title}» به «${col.label}» رفت.`, { tone: "success", undo: kind === "done" && !pm.isManager(x.p.meta.id) ? undefined : () => pm.moveTask(x.p.meta.id, x.t.id, prev) });
  };

  const boardItems = [...w.open, ...w.done];
  const onDrop = (e: DragEvent, kind: ColumnKind) => {
    e.preventDefault();
    const x = boardItems.find((i) => `${i.p.meta.id}:${i.t.id}` === dragKey);
    setDragKey(null);
    if (x) moveToKind(x, kind);
  };
  const kindIn = (x: WorkItem): ColumnKind => {
    const k = kindOf(x.p, x.t.status);
    return k === "backlog" ? "todo" : k === "blocked" ? "doing" : k;
  };

  const tabs = [
    { id: "list" as Tab, label: "فهرست", count: w.open.length },
    { id: "board" as Tab, label: "کانبان" },
    { id: "approvals" as Tab, label: "منتظر تأیید من", count: w.approvals.length || undefined },
    { id: "watching" as Tab, label: "دنبال می‌کنم", count: w.watching.length || undefined },
  ];

  const simpleRow = (x: WorkItem, sub?: string) => (
    <ListRow
      key={`${x.p.meta.id}-${x.t.id}`}
      priority={x.t.priority === "بحرانی" ? "زیاد" : x.t.priority}
      title={x.t.title}
      badges={<Badge tone="brand">{x.p.meta.name}</Badge>}
      due={`سررسید ${x.t.due}`}
      subtitle={sub}
      onClick={() => setOpen({ pid: x.p.meta.id, id: x.t.id })}
    />
  );

  return (
    <div>
      <PageHeader
        title="فعالیت و وظایف من"
        description="کارهای شما در همه‌ی پروژه‌ها، به ترتیب فوریت."
        icon={<ListChecks size={18} />}
        actions={
          canCreate ? (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              کار جدید
            </Button>
          ) : undefined
        }
        tabs={<Tabs tabs={tabs} active={tab} onChange={setTab} className="" />}
      />

      {w.timers.length > 0 && (
        <Note tone="warning" className="mb-4">
          <span className="flex items-center gap-2 flex-wrap">
            <Timer size={14} /> تایمر روشن:
            {w.timers.map((x) => (
              <button key={x.t.id} onClick={() => setOpen({ pid: x.p.meta.id, id: x.t.id })} className="underline">
                {x.t.title}
              </button>
            ))}
          </span>
        </Note>
      )}

      {tab === "list" && <TaskInbox person={me} printTitle={`فعالیت و وظایف من — ${me}`} />}

      {tab === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {boardKinds.map((k) => {
            const items = boardItems.filter((x) => kindIn(x) === k);
            return (
              <section key={k} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, k)} className={`rounded-[14px] bg-ink-100 p-2.5 min-h-[200px] ${dragKey ? "outline-dashed outline-2 outline-teal-500/40" : ""}`}>
                <h3 className="flex items-center justify-between px-1.5 pb-2 text-sm font-bold text-ink-800">
                  {taskStatusLabel[STATUS_OF_KIND[k]]}
                  <Badge tone="neutral">{fa(items.length)}</Badge>
                </h3>
                <div className="space-y-2">
                  {items.map((x) => (
                    <button
                      key={`${x.p.meta.id}-${x.t.id}`}
                      draggable
                      onDragStart={() => setDragKey(`${x.p.meta.id}:${x.t.id}`)}
                      onDragEnd={() => setDragKey(null)}
                      onClick={() => setOpen({ pid: x.p.meta.id, id: x.t.id })}
                      className={`relative w-full text-right rounded-[10px] bg-[var(--color-card)] border border-[var(--color-border)] ps-4 pe-3 py-3 hover:shadow-sm ${dragKey === `${x.p.meta.id}:${x.t.id}` ? "opacity-50" : ""}`}
                    >
                      <span className={`absolute inset-y-0 start-0 w-1 rounded-s-[10px] ${x.t.priority === "کم" ? "bg-emerald-600" : x.t.priority === "متوسط" ? "bg-amber-500" : "bg-rose-600"}`} />
                      <span className="block text-sm font-medium text-ink-900">{x.t.title}</span>
                      <span className="block text-[12px] text-ink-500 mt-1">
                        {x.p.meta.name} · {x.t.due}
                      </span>
                      <span className="block h-1 mt-2 rounded-full bg-ink-100 overflow-hidden">
                        <span className="block h-full bg-teal-500" style={{ width: `${isDone(x.p, x.t) ? 100 : x.t.progress}%` }} />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {tab === "approvals" && (
        <div className="card">
          <List>{w.approvals.map((x) => simpleRow(x, `درخواست از «${x.t.approval!.requestedBy}» · ${x.t.approval!.at}${x.t.finalApprover === me ? " · تأیید نهایی" : ""}`))}</List>
          {w.approvals.length === 0 && (
            <div className="p-5">
              <EmptyState compact icon={<ShieldCheck size={22} />} title="کاری منتظر تأیید شما نیست" />
            </div>
          )}
        </div>
      )}

      {tab === "watching" && (
        <div className="card">
          <List>{w.watching.map((x) => simpleRow(x, `مسئول: ${x.t.assignee}`))}</List>
          {w.watching.length === 0 && (
            <div className="p-5">
              <EmptyState compact title="کاری را دنبال نمی‌کنید" description="در جزئیات هر کار «دنبال کن» را بزنید." />
            </div>
          )}
        </div>
      )}

      {canCreate && <TaskCreateModal open={createOpen} onClose={() => setCreateOpen(false)} projects={creatable} />}
      <TaskSheetHost pid={open?.pid ?? null} taskId={open?.id ?? null} onClose={() => setOpen(null)} onOpenTask={(id) => open && setOpen({ pid: open.pid, id })} />
    </div>
  );
}
