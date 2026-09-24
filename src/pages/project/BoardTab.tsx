import { useMemo, useState } from "react";
import { LayoutGrid, List, Plus, Search, Settings2, MessageSquare, CheckSquare, Link2, ArrowUp, ArrowDown, Trash2, ListFilter, ListTree, Repeat, Eye, ShieldCheck, CornerDownLeft, UserRound, X } from "lucide-react";
import { useTenancy } from "../../context/TenancyContext";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import RowActions from "../../components/ui/RowActions";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { columnLabel, isDone, isWaiting, kindOf, openPredecessors, predecessorsOf } from "../../pm/selectors";
import { dayNum, fa } from "../../pm/jalali";
import { defaultLabels, kindLabel } from "../../pm/seed";
import type { ColumnKind, PMTask } from "../../pm/types";
import { Field, Progress, TaskFlags, kindColor, kindTone, priorities, priorityTone, useProjectPage } from "./shared";

type SortId = "manual" | "priority" | "due" | "title";
type LaneId = "none" | "assignee" | "priority" | "sprint";
const prRank = { بحرانی: 0, زیاد: 1, متوسط: 2, کم: 3 } as const;

export default function BoardTab({ onNewTask }: { onNewTask: (status?: string) => void }) {
  const { p, pid, canEdit, can, refDate, openTask } = useProjectPage();
  const canDelete = can("projects.tasks.delete");
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [q, setQ] = useState("");
  const [member, setMember] = useState("");
  const [priority, setPriority] = useState("");
  const [label, setLabel] = useState("");
  const [onlyWaiting, setOnlyWaiting] = useState(false);
  const [sort, setSort] = useState<SortId>("manual");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [colsOpen, setColsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [lane, setLane] = useState<LaneId>("none");
  const [mine, setMine] = useState(false);
  const [sprint, setSprint] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const { actingUser } = useTenancy();
  const sprints = p.sprints ?? [];
  const fields = p.customFields ?? [];
  const activeSprint = sprints.find((x) => x.status === "فعال");

  const tasks = useMemo(() => {
    let ts = p.tasks.filter((t) => !t.archived);
    if (q) ts = ts.filter((t) => t.title.includes(q) || t.description.includes(q));
    if (member) ts = ts.filter((t) => t.assignee === member);
    if (priority) ts = ts.filter((t) => t.priority === priority);
    if (label) ts = ts.filter((t) => t.labels.includes(label));
    if (onlyWaiting) ts = ts.filter((t) => isWaiting(p, t));
    if (mine) ts = ts.filter((t) => t.assignee === actingUser.name || (t.watchers ?? []).includes(actingUser.name));
    if (sprint === "backlog") ts = ts.filter((t) => !t.sprintId);
    else if (sprint) ts = ts.filter((t) => t.sprintId === sprint);
    if (sort === "priority") ts = [...ts].sort((a, b) => prRank[a.priority] - prRank[b.priority]);
    if (sort === "due") ts = [...ts].sort((a, b) => (dayNum(a.due) ?? 0) - (dayNum(b.due) ?? 0));
    if (sort === "title") ts = [...ts].sort((a, b) => a.title.localeCompare(b.title, "fa"));
    return ts;
  }, [p, q, member, priority, label, onlyWaiting, sort, mine, sprint, actingUser.name]);

  const filtered = !!(q || member || priority || label || onlyWaiting || mine || sprint);
  const activeFilters = [member, priority, label, onlyWaiting, sprint].filter(Boolean).length;
  const visibleSel = selected.filter((id) => tasks.some((t) => t.id === id));
  const toggleSel = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const bulk = (patch: Parameters<typeof pm.bulkUpdate>[2]) => {
    pm.bulkUpdate(pid, visibleSel, patch);
    notify(`${fa(visibleSel.length)} تسک به‌روزرسانی شد.`);
  };

  // ردیف‌های افقی (Swimlane) مثل Jira — بر اساس مسئول، اولویت یا اسپرینت
  const lanes: { key: string; label: string; tasks: PMTask[] }[] = useMemo(() => {
    if (lane === "none") return [{ key: "all", label: "", tasks }];
    const keyOf = (t: PMTask) => (lane === "assignee" ? t.assignee : lane === "priority" ? t.priority : t.sprintId ?? "");
    const labelOf = (k: string) => (lane === "sprint" ? sprints.find((x) => x.id === k)?.name ?? "بک‌لاگ" : k || "—");
    const order = lane === "priority" ? priorities.slice().reverse() : [...new Set(tasks.map(keyOf))];
    return order.map((k) => ({ key: k, label: labelOf(k), tasks: tasks.filter((t) => keyOf(t) === k) })).filter((l) => l.tasks.length);
  }, [lane, tasks, sprints]);

  const drop = (status: string, beforeId?: string) => {
    if (!dragId) return;
    const t = p.tasks.find((x) => x.id === dragId);
    setDragId(null);
    setOverCol(null);
    if (!t) return;
    const toKind = kindOf(p, status);
    const run = () => pm.moveTask(pid, t.id, status, beforeId ?? "");
    const open = openPredecessors(p, t.id);
    if (t.status !== status && open.length && ["doing", "review", "done"].includes(toKind) && ["backlog", "todo"].includes(kindOf(p, t.status))) {
      confirm({
        title: "پیش‌نیاز انجام‌نشده",
        message: `«${t.title}» منتظر ${open.map((x) => `«${x.title}»`).join("، ")} است. ادامه؟ (به مدیر پروژه اطلاع داده می‌شود)`,
        confirmLabel: "با این حال منتقل کن",
        onConfirm: run,
      });
    } else run();
  };

  const removeTask = (t: PMTask) =>
    confirm({
      title: `حذف تسک «${t.title}»؟`,
      message: "تسک از بورد، گانت و گراف وابستگی حذف و رویداد TASK_DELETED ثبت می‌شود.",
      onConfirm: () => {
        pm.deleteTask(pid, t.id);
        notify(`تسک «${t.title}» حذف شد.`, "info");
      },
    });

  const Card = ({ t }: { t: PMTask }) => {
    const doneC = t.checklist.filter((c) => c.done).length;
    const pre = predecessorsOf(p, t.id).length;
    const subs = p.tasks.filter((x) => x.parentId === t.id);
    const subsDone = subs.filter((x) => isDone(p, x)).length;
    const parent = t.parentId ? p.tasks.find((x) => x.id === t.parentId) : undefined;
    return (
      <div
        draggable={canEdit}
        onDragStart={(e) => {
          setDragId(t.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => setDragId(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.stopPropagation();
          drop(t.status, sort === "manual" ? t.id : undefined);
        }}
        className={`card p-3 hover:border-brand-300 transition-colors ${dragId === t.id ? "opacity-40" : ""} ${canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        <button onClick={() => openTask(t.id)} className="w-full text-right">
          {t.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {t.labels.map((l) => (
                <span key={l} className="text-[10px] px-1.5 rounded bg-brand-50 text-brand-700">
                  {l}
                </span>
              ))}
            </div>
          )}
          {parent && (
            <p className="text-[10px] text-ink-400 flex items-center gap-0.5 mb-0.5 truncate">
              <CornerDownLeft size={10} className="shrink-0" /> <span className="truncate">{parent.title}</span>
            </p>
          )}
          <p className="text-xs font-medium leading-5 text-ink-900">{t.title}</p>
          <div className="flex items-center justify-between mt-2 gap-1 flex-wrap">
            <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
            <TaskFlags p={p} t={t} refDate={refDate} />
            <span className="text-[11px] text-ink-400">{t.due}</span>
          </div>
          {t.progress > 0 && kindOf(p, t.status) !== "done" && <Progress value={t.progress} className="mt-2" />}
          <div className="flex items-center gap-2.5 mt-2 text-[11px] text-ink-400">
            {t.checklist.length > 0 && (
              <span className={`flex items-center gap-0.5 ${doneC === t.checklist.length ? "text-emerald-600" : ""}`}>
                <CheckSquare size={11} /> {fa(doneC)}/{fa(t.checklist.length)}
              </span>
            )}
            {t.comments.length > 0 && (
              <span className="flex items-center gap-0.5">
                <MessageSquare size={11} /> {fa(t.comments.length)}
              </span>
            )}
            {pre > 0 && (
              <span className="flex items-center gap-0.5" title="تعداد پیش‌نیاز">
                <Link2 size={11} /> {fa(pre)}
              </span>
            )}
            {subs.length > 0 && (
              <span className={`flex items-center gap-0.5 ${subsDone === subs.length ? "text-emerald-600" : ""}`} title="زیرتسک‌ها">
                <ListTree size={11} /> {fa(subsDone)}/{fa(subs.length)}
              </span>
            )}
            {t.recurrence && (
              <span className="flex items-center" title={`تکرار ${t.recurrence}`}>
                <Repeat size={11} />
              </span>
            )}
            {(t.watchers ?? []).length > 0 && (
              <span className="flex items-center gap-0.5" title={`دنبال‌کنندگان: ${(t.watchers ?? []).join("، ")}`}>
                <Eye size={11} /> {fa((t.watchers ?? []).length)}
              </span>
            )}
            {t.approval?.status === "در انتظار" && (
              <span className="flex items-center text-amber-600" title={`منتظر تأیید ${t.approval.approver}`}>
                <ShieldCheck size={11} />
              </span>
            )}
            {t.storyPoints ? (
              <span className="mr-auto text-[10px] font-bold bg-ink-100 text-ink-600 rounded-full min-w-5 h-5 px-1 flex items-center justify-center" title="امتیاز (Story Point)">
                {fa(t.storyPoints)}
              </span>
            ) : null}
          </div>
        </button>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[11px] text-ink-500 truncate">مسئول: {t.assignee}</p>
          <RowActions onEdit={canEdit ? () => openTask(t.id) : undefined} onDelete={canDelete ? () => removeTask(t) : undefined} size={12} />
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex rounded-lg border border-ink-200 overflow-hidden">
          <button onClick={() => setView("kanban")} className={`px-2.5 py-1.5 text-xs flex items-center gap-1 ${view === "kanban" ? "bg-navy-900 text-white" : "bg-white text-ink-600"}`}>
            <LayoutGrid size={13} /> کانبان
          </button>
          <button onClick={() => setView("list")} className={`px-2.5 py-1.5 text-xs flex items-center gap-1 ${view === "list" ? "bg-navy-900 text-white" : "bg-white text-ink-600"}`}>
            <List size={13} /> فهرست
          </button>
        </div>
        <div className="relative">
          <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی تسک…" className="input-field !py-1.5 !pr-8 !text-xs w-44" />
        </div>
        <button onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1 ${filtered || filtersOpen ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-white border-ink-200 text-ink-600"}`}>
          <ListFilter size={13} /> فیلتر
          {activeFilters > 0 && <span className="text-[10px] bg-brand-600 text-white rounded-full px-1.5">{fa(activeFilters)}</span>}
        </button>
        <button onClick={() => setMine((v) => !v)} aria-pressed={mine} title="تسک‌هایی که مسئولشان هستید یا دنبالشان می‌کنید" className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1 ${mine ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-white border-ink-200 text-ink-600"}`}>
          <UserRound size={13} /> فقط کارهای من
        </button>
        {view === "kanban" && (
          <select value={lane} onChange={(e) => setLane(e.target.value as LaneId)} className="input-field !py-1.5 !text-xs !w-auto" aria-label="گروه‌بندی ردیف‌ها">
            <option value="none">بدون ردیف‌بندی</option>
            <option value="assignee">ردیف بر اساس مسئول</option>
            <option value="priority">ردیف بر اساس اولویت</option>
            {sprints.length > 0 && <option value="sprint">ردیف بر اساس اسپرینت</option>}
          </select>
        )}
        <select value={sort} onChange={(e) => setSort(e.target.value as SortId)} className="input-field !py-1.5 !text-xs !w-auto" aria-label="مرتب‌سازی">
          <option value="manual">ترتیب دستی</option>
          <option value="priority">بر اساس اولویت</option>
          <option value="due">بر اساس سررسید</option>
          <option value="title">بر اساس عنوان</option>
        </select>
        {filtered && (
          <button onClick={() => { setQ(""); setMember(""); setPriority(""); setLabel(""); setOnlyWaiting(false); setMine(false); setSprint(""); }} className="text-xs text-brand-700 hover:underline">
            پاک‌کردن ({fa(tasks.length)} نتیجه)
          </button>
        )}
        {canEdit && (
          <button onClick={() => setColsOpen(true)} className="mr-auto p-2 rounded-lg border border-ink-200 bg-white text-ink-500 hover:text-ink-800" title="مدیریت ستون‌های بورد" aria-label="مدیریت ستون‌های بورد">
            <Settings2 size={14} />
          </button>
        )}
      </div>
      {filtersOpen && (
        <div className="flex items-center gap-2 mb-4 flex-wrap bg-ink-50 border border-ink-100 rounded-lg p-2">
          <select value={member} onChange={(e) => setMember(e.target.value)} className="input-field !py-1.5 !text-xs !w-auto">
            <option value="">همه‌ی اعضا</option>
            {[...new Set(p.tasks.map((t) => t.assignee))].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input-field !py-1.5 !text-xs !w-auto">
            <option value="">همه‌ی اولویت‌ها</option>
            {priorities.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select value={label} onChange={(e) => setLabel(e.target.value)} className="input-field !py-1.5 !text-xs !w-auto">
            <option value="">همه‌ی برچسب‌ها</option>
            {[...new Set([...defaultLabels, ...p.tasks.flatMap((t) => t.labels)])].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          {sprints.length > 0 && (
            <select value={sprint} onChange={(e) => setSprint(e.target.value)} className="input-field !py-1.5 !text-xs !w-auto" aria-label="اسپرینت">
              <option value="">همه‌ی اسپرینت‌ها</option>
              {activeSprint && <option value={activeSprint.id}>اسپرینت فعال ({activeSprint.name})</option>}
              <option value="backlog">بک‌لاگ (بدون اسپرینت)</option>
              {sprints.filter((x) => x.id !== activeSprint?.id).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-1 text-xs text-ink-600">
            <input type="checkbox" checked={onlyWaiting} onChange={(e) => setOnlyWaiting(e.target.checked)} className="accent-[var(--color-brand-600)]" /> فقط منتظر پیش‌نیاز
          </label>
        </div>
      )}

      {view === "kanban" ? (
        <div className="space-y-4">
        {lanes.map((ln) => (
        <div key={ln.key}>
        {lane !== "none" && (
          <p className="text-xs font-bold text-ink-700 mb-2 flex items-center gap-2">
            {ln.label}
            <span className="text-[10px] font-normal bg-ink-100 text-ink-500 rounded-full px-1.5">{fa(ln.tasks.length)}</span>
          </p>
        )}
        <div className="grid grid-flow-col auto-cols-[minmax(178px,1fr)] gap-2.5 overflow-x-auto pb-2">
          {p.columns.map((col) => {
            const colTasks = ln.tasks.filter((t) => t.status === col.id);
            const over = col.wip !== undefined && colTasks.length > col.wip;
            return (
              <div
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverCol(col.id);
                }}
                onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
                onDrop={() => drop(col.id)}
                className={`rounded-lg p-3 transition-colors ${overCol === col.id && dragId ? "bg-brand-50 ring-2 ring-brand-300" : "bg-ink-100/70"}`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs font-bold text-ink-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: kindColor[col.kind] }} />
                    {col.label}
                  </h3>
                  <span className={`text-xs ${over ? "text-rose-600 font-bold" : "text-ink-400"}`} title={col.wip ? `سقف کار هم‌زمان (WIP): ${fa(col.wip)}` : undefined}>
                    {fa(colTasks.length)}
                    {col.wip ? `/${fa(col.wip)}` : ""}
                  </span>
                </div>
                <div className="space-y-2 min-h-[60px]">
                  {colTasks.map((t) => (
                    <div key={t.id} onDragOver={() => setOverCol(col.id)}>
                      <Card t={t} />
                    </div>
                  ))}
                  {colTasks.length === 0 && <p className="text-[11px] text-ink-400 text-center py-3">خالی</p>}
                </div>
                {canEdit && lane === "none" && (
                  <button onClick={() => onNewTask(col.id)} className="mt-2 w-full text-[11px] text-ink-500 hover:text-brand-700 hover:bg-white/60 rounded-md py-1.5 flex items-center justify-center gap-1">
                    <Plus size={12} /> افزودن تسک
                  </button>
                )}
              </div>
            );
          })}
        </div>
        </div>
        ))}
        {lanes.length === 0 && <p className="text-center text-xs text-ink-400 py-8">تسکی با این فیلترها پیدا نشد.</p>}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          {canEdit && visibleSel.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap p-2.5 bg-brand-50 border-b border-brand-200 sticky right-0">
              <span className="text-xs font-bold text-brand-800 ml-1">{fa(visibleSel.length)} تسک انتخاب شده</span>
              <select defaultValue="" onChange={(e) => { if (e.target.value) bulk({ status: e.target.value }); e.target.value = ""; }} className="input-field !py-1 !text-xs !w-auto" aria-label="تغییر وضعیت گروهی">
                <option value="">تغییر وضعیت…</option>
                {p.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select defaultValue="" onChange={(e) => { if (e.target.value) bulk({ assignee: e.target.value }); e.target.value = ""; }} className="input-field !py-1 !text-xs !w-auto" aria-label="واگذاری گروهی">
                <option value="">واگذاری به…</option>
                {p.members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select defaultValue="" onChange={(e) => { if (e.target.value) bulk({ priority: e.target.value as PMTask["priority"] }); e.target.value = ""; }} className="input-field !py-1 !text-xs !w-auto" aria-label="تغییر اولویت گروهی">
                <option value="">تغییر اولویت…</option>
                {priorities.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              {sprints.length > 0 && (
                <select defaultValue="-" onChange={(e) => { if (e.target.value !== "-") bulk({ sprintId: e.target.value }); e.target.value = "-"; }} className="input-field !py-1 !text-xs !w-auto" aria-label="انتقال گروهی به اسپرینت">
                  <option value="-">انتقال به اسپرینت…</option>
                  <option value="">بک‌لاگ</option>
                  {sprints.filter((x) => x.status !== "تکمیل‌شده").map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              )}
              <select defaultValue="" onChange={(e) => { if (e.target.value) bulk({ addLabel: e.target.value }); e.target.value = ""; }} className="input-field !py-1 !text-xs !w-auto" aria-label="افزودن برچسب گروهی">
                <option value="">افزودن برچسب…</option>
                {[...new Set([...defaultLabels, ...p.tasks.flatMap((t) => t.labels)])].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600"
                  icon={<Trash2 size={13} />}
                  onClick={() =>
                    confirm({
                      title: `حذف ${fa(visibleSel.length)} تسک؟`,
                      message: "زیرتسک‌ها و وابستگی‌های این تسک‌ها هم برداشته می‌شوند و رویداد در تاریخچه ثبت می‌شود.",
                      onConfirm: () => {
                        pm.bulkDelete(pid, visibleSel);
                        setSelected([]);
                        notify("تسک‌های انتخاب‌شده حذف شدند.", "info");
                      },
                    })
                  }
                >
                  حذف
                </Button>
              )}
              <button onClick={() => setSelected([])} className="mr-auto p-1 text-ink-500 hover:text-ink-800" aria-label="لغو انتخاب">
                <X size={14} />
              </button>
            </div>
          )}
          <table className="w-full text-xs min-w-[1180px]">
            <thead>
              <tr className="text-ink-400 border-b border-ink-100 text-right">
                {canEdit && (
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      aria-label="انتخاب همه"
                      checked={tasks.length > 0 && visibleSel.length === tasks.length}
                      onChange={(e) => setSelected(e.target.checked ? tasks.map((t) => t.id) : [])}
                      className="accent-[var(--color-brand-600)]"
                    />
                  </th>
                )}
                <th className="p-3 font-medium min-w-[240px]">عنوان</th>
                <th className="p-3 font-medium">وضعیت</th>
                <th className="p-3 font-medium">مسئول</th>
                <th className="p-3 font-medium">اولویت</th>
                <th className="p-3 font-medium">شروع</th>
                <th className="p-3 font-medium">سررسید</th>
                <th className="p-3 font-medium">پیشرفت</th>
                <th className="p-3 font-medium">پیش‌نیاز</th>
                {sprints.length > 0 && <th className="p-3 font-medium">اسپرینت</th>}
                <th className="p-3 font-medium">امتیاز</th>
                {fields.map((f) => (
                  <th key={f.id} className="p-3 font-medium">
                    {f.name}
                  </th>
                ))}
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className={`border-b border-ink-100 hover:bg-ink-50 cursor-pointer ${visibleSel.includes(t.id) ? "bg-brand-50/50" : ""}`} onClick={() => openTask(t.id)}>
                  {canEdit && (
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={visibleSel.includes(t.id)} onChange={() => toggleSel(t.id)} aria-label={`انتخاب ${t.title}`} className="accent-[var(--color-brand-600)]" />
                    </td>
                  )}
                  <td className="p-3 font-medium text-ink-900">
                    {t.parentId && <CornerDownLeft size={11} className="inline ml-1 text-ink-400" />}
                    {t.title} <TaskFlags p={p} t={t} refDate={refDate} />
                  </td>
                  <td className="p-3">
                    <Badge tone={kindTone[kindOf(p, t.status)]}>{columnLabel(p, t.status)}</Badge>
                  </td>
                  <td className="p-3 text-ink-600">{t.assignee}</td>
                  <td className="p-3">
                    <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
                  </td>
                  <td className="p-3 text-ink-500">{t.start}</td>
                  <td className="p-3 text-ink-500">{t.due}</td>
                  <td className="p-3 w-28">
                    <Progress value={kindOf(p, t.status) === "done" ? 100 : t.progress} />
                  </td>
                  <td className="p-3 text-ink-500">{fa(predecessorsOf(p, t.id).length)}</td>
                  {sprints.length > 0 && <td className="p-3 text-ink-500 whitespace-nowrap">{sprints.find((x) => x.id === t.sprintId)?.name ?? "—"}</td>}
                  <td className="p-3 text-ink-500">{t.storyPoints ? fa(t.storyPoints) : "—"}</td>
                  {fields.map((f) => (
                    <td key={f.id} className="p-3 text-ink-500 whitespace-nowrap">
                      {t.customFields?.[f.id] || "—"}
                    </td>
                  ))}
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <RowActions onEdit={canEdit ? () => openTask(t.id) : undefined} onDelete={canDelete ? () => removeTask(t) : undefined} size={12} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tasks.length === 0 && <p className="text-center text-xs text-ink-400 py-8">تسکی با این فیلترها پیدا نشد.</p>}
        </div>
      )}

      <ColumnsModal open={colsOpen} onClose={() => setColsOpen(false)} />
    </div>
  );
}

function ColumnsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { p, pid } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<ColumnKind>("todo");
  return (
    <Modal open={open} onClose={onClose} title="مدیریت ستون‌های بورد" description="ایجاد، تغییر نام، جابه‌جایی، سقف کار هم‌زمان (WIP) و حذف ستون — نوع هر ستون منطق وابستگی‌ها و خودکارسازی را تعیین می‌کند." width="max-w-2xl">
      <div className="space-y-2">
        {p.columns.map((c, i) => {
          const count = p.tasks.filter((t) => t.status === c.id).length;
          return (
            <div key={c.id} className="flex items-center gap-2 flex-wrap border border-ink-200 rounded-lg p-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: kindColor[c.kind] }} />
              <input
                className="input-field !py-1 !text-xs flex-1 min-w-[120px]"
                defaultValue={c.label}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== c.label) {
                    pm.updateColumn(pid, c.id, { label: v });
                    notify("نام ستون تغییر کرد.");
                  }
                }}
              />
              <select className="input-field !py-1 !text-xs !w-auto" value={c.kind} onChange={(e) => pm.updateColumn(pid, c.id, { kind: e.target.value as ColumnKind })}>
                {(Object.keys(kindLabel) as ColumnKind[]).map((k) => (
                  <option key={k} value={k}>
                    {kindLabel[k]}
                  </option>
                ))}
              </select>
              <input className="input-field !py-1 !text-xs !w-20" placeholder="WIP" defaultValue={c.wip ? String(c.wip) : ""} onBlur={(e) => pm.updateColumn(pid, c.id, { wip: Number(e.target.value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))) || undefined })} />
              <span className="text-[11px] text-ink-400 w-12">{fa(count)} تسک</span>
              <button disabled={i === 0} onClick={() => pm.moveColumn(pid, c.id, -1)} className="p-1 text-ink-400 hover:text-brand-600 disabled:opacity-30" aria-label="انتقال به قبل">
                <ArrowUp size={14} />
              </button>
              <button disabled={i === p.columns.length - 1} onClick={() => pm.moveColumn(pid, c.id, 1)} className="p-1 text-ink-400 hover:text-brand-600 disabled:opacity-30" aria-label="انتقال به بعد">
                <ArrowDown size={14} />
              </button>
              <button
                disabled={p.columns.length <= 1}
                onClick={() => {
                  const target = p.columns.find((x) => x.id !== c.id)!;
                  confirm({
                    title: `حذف ستون «${c.label}»؟`,
                    message: count ? `${fa(count)} تسک این ستون به «${target.label}» منتقل می‌شود.` : "ستون خالی است.",
                    onConfirm: () => pm.deleteColumn(pid, c.id, target.id),
                  });
                }}
                className="p-1 text-ink-400 hover:text-rose-600 disabled:opacity-30"
                aria-label="حذف ستون"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
        <div className="border-t border-ink-100 pt-3 mt-3">
          <Field label="ستون جدید">
            <div className="flex gap-2 flex-wrap">
              <input className="input-field flex-1 min-w-[140px]" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="مثلاً: در انتظار تأیید کارفرما" />
              <select className="input-field !w-auto" value={kind} onChange={(e) => setKind(e.target.value as ColumnKind)}>
                {(Object.keys(kindLabel) as ColumnKind[]).map((k) => (
                  <option key={k} value={k}>
                    {kindLabel[k]}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                icon={<Plus size={14} />}
                onClick={() => {
                  if (!label.trim()) return;
                  pm.addColumn(pid, label.trim(), kind);
                  setLabel("");
                  notify("ستون اضافه شد.");
                }}
              >
                افزودن
              </Button>
            </div>
          </Field>
        </div>
      </div>
    </Modal>
  );
}
