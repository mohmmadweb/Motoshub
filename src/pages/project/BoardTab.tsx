import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LayoutGrid, List, Plus, Search, Settings2, MessageSquare, CheckSquare, Link2, ArrowUp, ArrowDown, Trash2, ListFilter, ListTree, Repeat, Eye, ShieldCheck, CornerDownLeft, X, Archive, ArchiveRestore, MoreHorizontal, Upload, Download, Columns3, Bookmark, BookmarkPlus, Users, Lock, Pencil, Zap } from "lucide-react";
import { useTenancy } from "../../context/TenancyContext";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import RowActions from "../../components/ui/RowActions";
import Toggle from "../../components/ui/Toggle";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { columnLabel, epicProgress, isDone, isOverdue, isWaiting, kindOf, openPredecessors, predecessorsOf, typeLabel } from "../../pm/selectors";
import { dayNum, fa } from "../../pm/jalali";
import { defaultLabels, kindLabel } from "../../pm/seed";
import type { ColumnKind, PMTask, SavedView, TaskType, ViewFilters } from "../../pm/types";
import { Field, Progress, TaskFlags, downloadText, kindColor, kindTone, priorities, priorityTone, toCsv, useProjectPage } from "./shared";
import { TaskKey, TypeIcon, taskTypes } from "./taskTypes";
import CsvImportModal from "./CsvImportModal";

type SortId = "manual" | "priority" | "due" | "title" | "key";
type LaneId = "none" | "assignee" | "priority" | "sprint" | "epic";
type Layout = "kanban" | "list";
const prRank = { بحرانی: 0, زیاد: 1, متوسط: 2, کم: 3 } as const;

/** وضعیت کامل یک نما — همان چیزی که در «نمای ذخیره‌شده» نگه داشته می‌شود */
type ViewState = { layout: Layout; filters: ViewFilters; sort: SortId; lane: LaneId; columns?: string[] };
const emptyState: ViewState = { layout: "kanban", filters: {}, sort: "manual", lane: "none" };
const clean = (f: ViewFilters): ViewFilters => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== "" && v !== false)) as ViewFilters;
const sameState = (a: ViewState, b: ViewState) =>
  a.layout === b.layout && a.sort === b.sort && a.lane === b.lane && JSON.stringify(clean(a.filters)) === JSON.stringify(clean(b.filters)) && JSON.stringify(a.columns ?? null) === JSON.stringify(b.columns ?? null);

const lsGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ذخیره‌سازی مرورگر در دسترس نیست */
  }
};

export default function BoardTab({ onNewTask }: { onNewTask: (status?: string) => void }) {
  const { p, pid, canEdit, can, refDate, openTask } = useProjectPage();
  const canDelete = can("projects.tasks.delete");
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const { actingUser } = useTenancy();
  const me = actingUser.name;
  const sprints = p.sprints ?? [];
  const fields = p.customFields ?? [];
  const activeSprint = sprints.find((x) => x.status === "فعال");
  const epics = p.tasks.filter((t) => t.type === "epic" && !t.archived);

  // ---------------------------------------------------------------- نماها
  const builtins: { id: string; name: string; state: ViewState }[] = [
    { id: "all", name: "همه", state: emptyState },
    { id: "mine", name: "کارهای من", state: { ...emptyState, filters: { mine: true } } },
    { id: "overdue", name: "عقب‌افتاده", state: { ...emptyState, layout: "list", filters: { overdue: true }, sort: "due" } },
    ...(activeSprint ? [{ id: "sprint", name: "این اسپرینت", state: { ...emptyState, filters: { sprint: activeSprint.id } } }] : []),
  ];
  const myViews = (p.savedViews ?? []).filter((v) => v.shared || v.owner === me);
  const stateOfSaved = (v: SavedView): ViewState => ({ layout: v.layout, filters: v.filters, sort: v.sort as SortId, lane: v.lane as LaneId, columns: v.columns });
  const lsKey = `motoshub.pm.view.${pid}.${actingUser.id}`;
  const [activeView, setActiveView] = useState<string>("all");
  const [st, setSt] = useState<ViewState>(emptyState);
  // بازگرداندن آخرین نمای این کاربر در این پروژه
  useEffect(() => {
    const raw = lsGet(lsKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { id: string; state: ViewState };
      setActiveView(saved.id);
      setSt({ ...emptyState, ...saved.state });
    } catch {
      /* نادیده */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);
  useEffect(() => lsSet(lsKey, JSON.stringify({ id: activeView, state: st })), [lsKey, activeView, st]);

  const activeDef = builtins.find((b) => b.id === activeView)?.state ?? (myViews.find((v) => v.id === activeView) ? stateOfSaved(myViews.find((v) => v.id === activeView)!) : undefined);
  const dirty = !activeDef || !sameState(activeDef, st);
  const savedActive = myViews.find((v) => v.id === activeView);
  const applyView = (id: string, state: ViewState) => {
    setActiveView(id);
    setSt(state);
    setSelected([]);
  };
  const f = st.filters;
  const setF = (patch: ViewFilters) => setSt((cur) => ({ ...cur, filters: { ...cur.filters, ...patch } }));
  const view = st.layout;

  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [colsOpen, setColsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [viewEdit, setViewEdit] = useState<{ id?: string; name: string; shared: boolean } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const tasks = useMemo(() => {
    let ts = f.archived ? p.tasks.filter((t) => t.archived) : p.tasks.filter((t) => !t.archived);
    const q = (f.q ?? "").trim();
    if (q) {
      const ql = q.toLowerCase();
      ts = ts.filter((t) => t.title.includes(q) || t.description.includes(q) || (t.key ?? "").toLowerCase().includes(ql));
    }
    if (f.member) ts = ts.filter((t) => t.assignee === f.member);
    if (f.priority) ts = ts.filter((t) => t.priority === f.priority);
    if (f.label) ts = ts.filter((t) => t.labels.includes(f.label!));
    if (f.type) ts = ts.filter((t) => (t.type ?? "task") === f.type);
    if (f.epic) ts = ts.filter((t) => t.epicId === f.epic || t.id === f.epic);
    if (f.onlyWaiting) ts = ts.filter((t) => isWaiting(p, t));
    if (f.overdue) ts = ts.filter((t) => isOverdue(p, t, refDate));
    if (f.mine) ts = ts.filter((t) => t.assignee === me || (t.watchers ?? []).includes(me));
    if (f.sprint === "backlog") ts = ts.filter((t) => !t.sprintId);
    else if (f.sprint) ts = ts.filter((t) => t.sprintId === f.sprint);
    if (st.sort === "priority") ts = [...ts].sort((a, b) => prRank[a.priority] - prRank[b.priority]);
    if (st.sort === "due") ts = [...ts].sort((a, b) => (dayNum(a.due) ?? 0) - (dayNum(b.due) ?? 0));
    if (st.sort === "title") ts = [...ts].sort((a, b) => a.title.localeCompare(b.title, "fa"));
    if (st.sort === "key") ts = [...ts].sort((a, b) => Number((a.key ?? "").split("-")[1] ?? 0) - Number((b.key ?? "").split("-")[1] ?? 0));
    return ts;
  }, [p, f, st.sort, me, refDate]);

  const activeFilters = [f.member, f.priority, f.label, f.onlyWaiting, f.sprint, f.epic, f.type, f.overdue, f.mine, f.archived].filter(Boolean).length;
  const filtered = !!(f.q || activeFilters);
  const archivedCount = p.tasks.filter((t) => t.archived).length;
  const visibleSel = selected.filter((id) => tasks.some((t) => t.id === id));
  const toggleSel = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const bulk = (patch: Parameters<typeof pm.bulkUpdate>[2]) => {
    pm.bulkUpdate(pid, visibleSel, patch);
    notify(`${fa(visibleSel.length)} تسک به‌روزرسانی شد.`);
  };

  // ردیف‌های افقی (Swimlane) مثل Jira — بر اساس مسئول، اولویت، اسپرینت یا اپیک
  const lanes: { key: string; label: string; tasks: PMTask[] }[] = useMemo(() => {
    const lane = st.lane;
    if (lane === "none") return [{ key: "all", label: "", tasks }];
    const keyOf = (t: PMTask) => (lane === "assignee" ? t.assignee : lane === "priority" ? t.priority : lane === "epic" ? (t.type === "epic" ? t.id : t.epicId ?? "") : t.sprintId ?? "");
    const labelOf = (k: string) => (lane === "sprint" ? sprints.find((x) => x.id === k)?.name ?? "بک‌لاگ" : lane === "epic" ? (k ? `اپیک: ${p.tasks.find((x) => x.id === k)?.title ?? "—"}` : "بدون اپیک") : k || "—");
    const order = lane === "priority" ? priorities.slice().reverse() : [...new Set(tasks.map(keyOf))];
    return order.map((k) => ({ key: k, label: labelOf(k), tasks: tasks.filter((t) => keyOf(t) === k) })).filter((l) => l.tasks.length);
  }, [st.lane, tasks, sprints, p.tasks]);

  // ---------------------------------------------------------------- ستون‌های نمای فهرست
  type Col = { id: string; label: string; cell: (t: PMTask) => ReactNode; csv: (t: PMTask) => string | number };
  const allCols: Col[] = [
    { id: "key", label: "کلید", cell: (t) => <TaskKey t={t} />, csv: (t) => t.key ?? "" },
    { id: "type", label: "نوع", cell: (t) => <span className="flex items-center gap-1 text-ink-600"><TypeIcon type={t.type} /> {typeLabel[t.type ?? "task"]}</span>, csv: (t) => typeLabel[t.type ?? "task"] },
    { id: "status", label: "وضعیت", cell: (t) => <Badge tone={kindTone[kindOf(p, t.status)]}>{columnLabel(p, t.status)}</Badge>, csv: (t) => columnLabel(p, t.status) },
    { id: "assignee", label: "مسئول", cell: (t) => <span className="text-ink-600">{t.assignee}</span>, csv: (t) => t.assignee },
    { id: "priority", label: "اولویت", cell: (t) => <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>, csv: (t) => t.priority },
    { id: "start", label: "شروع", cell: (t) => <span className="text-ink-500">{t.start}</span>, csv: (t) => t.start },
    { id: "due", label: "سررسید", cell: (t) => <span className="text-ink-500">{t.due}</span>, csv: (t) => t.due },
    { id: "progress", label: "پیشرفت", cell: (t) => <div className="w-24"><Progress value={isDone(p, t) ? 100 : t.type === "epic" ? epicProgress(p, t.id).pct : t.progress} /></div>, csv: (t) => (isDone(p, t) ? 100 : t.progress) },
    { id: "deps", label: "پیش‌نیاز", cell: (t) => <span className="text-ink-500">{fa(predecessorsOf(p, t.id).length)}</span>, csv: (t) => predecessorsOf(p, t.id).map((x) => x.key ?? x.title).join(" ") },
    { id: "epic", label: "اپیک", cell: (t) => <span className="text-ink-500 whitespace-nowrap">{p.tasks.find((x) => x.id === t.epicId)?.title ?? "—"}</span>, csv: (t) => p.tasks.find((x) => x.id === t.epicId)?.title ?? "" },
    ...(sprints.length ? [{ id: "sprint", label: "اسپرینت", cell: (t: PMTask) => <span className="text-ink-500 whitespace-nowrap">{sprints.find((x) => x.id === t.sprintId)?.name ?? "—"}</span>, csv: (t: PMTask) => sprints.find((x) => x.id === t.sprintId)?.name ?? "" }] : []),
    { id: "points", label: "امتیاز", cell: (t) => <span className="text-ink-500">{t.storyPoints ? fa(t.storyPoints) : "—"}</span>, csv: (t) => t.storyPoints ?? "" },
    { id: "labels", label: "برچسب‌ها", cell: (t) => <span className="text-ink-500 whitespace-nowrap">{t.labels.join("، ") || "—"}</span>, csv: (t) => t.labels.join("، ") },
    { id: "hours", label: "برآورد ساعت", cell: (t) => <span className="text-ink-500">{t.estHours ? fa(t.estHours) : "—"}</span>, csv: (t) => t.estHours },
    ...fields.map((cf) => ({ id: `cf:${cf.id}`, label: cf.name, cell: (t: PMTask) => <span className="text-ink-500 whitespace-nowrap">{t.customFields?.[cf.id] || "—"}</span>, csv: (t: PMTask) => t.customFields?.[cf.id] ?? "" })),
  ];
  const defaultCols = ["key", "type", "status", "assignee", "priority", "start", "due", "progress", "deps", ...(sprints.length ? ["sprint"] : []), "points", ...fields.map((x) => `cf:${x.id}`)];
  const visibleCols = (st.columns ?? defaultCols).map((id) => allCols.find((c) => c.id === id)).filter(Boolean) as Col[];
  const toggleCol = (id: string) => {
    const cur = st.columns ?? defaultCols;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : allCols.map((c) => c.id).filter((x) => x === id || cur.includes(x));
    setSt({ ...st, columns: next });
  };

  const exportCsv = () => {
    const rows = [["عنوان", ...visibleCols.map((c) => c.label)], ...tasks.map((t) => [t.title, ...visibleCols.map((c) => c.csv(t))])];
    downloadText(`tasks-${p.meta.key ?? pid}.csv`, toCsv(rows));
    notify(`${fa(tasks.length)} تسک با ${fa(visibleCols.length + 1)} ستون در فایل CSV ذخیره شد.`);
  };

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
      message: "تسک از بورد، گانت و گراف وابستگی حذف و رویداد TASK_DELETED ثبت می‌شود. (پیشنهاد: به‌جای حذف، بایگانی کنید.)",
      onConfirm: () => {
        pm.deleteTask(pid, t.id);
        notify(`تسک «${t.title}» حذف شد.`, "info");
      },
    });

  const Card = ({ t }: { t: PMTask }) => {
    const doneC = t.checklist.filter((c) => c.done).length;
    const pre = predecessorsOf(p, t.id).length;
    const subs = p.tasks.filter((x) => x.parentId === t.id && !x.archived);
    const subsDone = subs.filter((x) => isDone(p, x)).length;
    const parent = t.parentId ? p.tasks.find((x) => x.id === t.parentId) : undefined;
    const ep = t.type === "epic" ? epicProgress(p, t.id) : null;
    const drag = canEdit && !t.archived;
    return (
      <div
        draggable={drag}
        onDragStart={(e) => {
          setDragId(t.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => setDragId(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.stopPropagation();
          drop(t.status, st.sort === "manual" ? t.id : undefined);
        }}
        className={`card p-3 hover:border-brand-300 transition-colors ${dragId === t.id ? "opacity-40" : ""} ${drag ? "cursor-grab active:cursor-grabbing" : ""} ${t.archived ? "opacity-75 border-dashed" : ""}`}
        style={t.type === "epic" ? { borderInlineStartWidth: 3, borderInlineStartColor: "#7c3aed" } : undefined}
      >
        <button onClick={() => openTask(t.id)} className="w-full text-right">
          <div className="flex items-center gap-1.5 mb-1 min-w-0">
            <TypeIcon type={t.type} />
            <TaskKey t={t} />
            {t.labels.length > 0 && (
              <span className="flex flex-wrap gap-1 mr-auto justify-end min-w-0">
                {t.labels.slice(0, 2).map((l) => (
                  <span key={l} className="text-[10px] px-1.5 rounded bg-brand-50 text-brand-700 truncate">
                    {l}
                  </span>
                ))}
                {t.labels.length > 2 && <span className="text-[10px] text-ink-400">+{fa(t.labels.length - 2)}</span>}
              </span>
            )}
          </div>
          {parent && (
            <p className="text-[10px] text-ink-400 flex items-center gap-0.5 mb-0.5 truncate">
              <CornerDownLeft size={10} className="shrink-0" /> <span className="truncate">{parent.title}</span>
            </p>
          )}
          <p className="text-xs font-medium leading-5 text-ink-900">{t.title}</p>
          <div className="flex items-center justify-between mt-2 gap-1 flex-wrap">
            <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
            {t.archived ? <span className="text-[10px] text-ink-500 flex items-center gap-0.5"><Archive size={10} /> بایگانی {t.archivedAt}</span> : <TaskFlags p={p} t={t} refDate={refDate} />}
            <span className="text-[11px] text-ink-400">{t.due}</span>
          </div>
          {ep ? (
            <div className="mt-2">
              <Progress value={ep.pct} tone="bg-violet-500/100" />
              <p className="text-[10px] text-ink-400 mt-1">{fa(ep.done)} از {fa(ep.total)} کار اپیک انجام شده</p>
            </div>
          ) : (
            t.progress > 0 && kindOf(p, t.status) !== "done" && <Progress value={t.progress} className="mt-2" />
          )}
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
          {t.archived ? (
            canEdit && (
              <button onClick={() => { pm.archiveTasks(pid, [t.id], false); notify(`«${t.title}» از بایگانی بازیابی شد.`); }} className="text-[11px] text-brand-700 hover:underline flex items-center gap-0.5">
                <ArchiveRestore size={12} /> بازیابی
              </button>
            )
          ) : (
            <RowActions onEdit={canEdit ? () => openTask(t.id) : undefined} onDelete={canDelete ? () => removeTask(t) : undefined} size={12} />
          )}
        </div>
      </div>
    );
  };

  const pill = (id: string, label: ReactNode, state: ViewState, extra?: ReactNode) => (
    <span key={id} className={`flex items-center rounded-full border text-xs whitespace-nowrap ${activeView === id ? "bg-navy-900 border-navy-900 text-white" : "bg-white border-ink-200 text-ink-600 hover:bg-ink-50"}`}>
      <button onClick={() => applyView(id, state)} className="px-2.5 py-1 flex items-center gap-1">
        {label}
      </button>
      {extra}
    </span>
  );

  const saveCurrentView = () => {
    if (!viewEdit?.name.trim()) return notify("نام نما را وارد کنید.", "warning");
    const id = pm.saveView(pid, { id: viewEdit.id, name: viewEdit.name.trim(), shared: viewEdit.shared, layout: st.layout, filters: clean(st.filters), sort: st.sort, lane: st.lane, columns: st.columns });
    setActiveView(id);
    notify(viewEdit.id ? "نما به‌روزرسانی شد." : `نمای «${viewEdit.name.trim()}» ${viewEdit.shared ? "ساخته و با اعضای پروژه به اشتراک گذاشته شد" : "ساخته شد (شخصی)"}.`);
    setViewEdit(null);
  };

  return (
    <div>
      {/* نماهای ذخیره‌شده */}
      <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1" aria-label="نماهای بورد">
        <Bookmark size={13} className="text-ink-400 shrink-0" />
        {builtins.map((b) => pill(b.id, b.name, b.state))}
        {myViews.length > 0 && <span className="w-px h-5 bg-ink-200 mx-0.5 shrink-0" />}
        {myViews.map((v) =>
          pill(
            v.id,
            <>
              {v.shared ? <Users size={11} className="opacity-70" /> : <Lock size={11} className="opacity-70" />}
              {v.name}
            </>,
            stateOfSaved(v),
            activeView === v.id && (v.owner === me || canEdit) ? (
              <button onClick={() => setViewEdit({ id: v.id, name: v.name, shared: v.shared })} className="pl-2 pr-0.5 py-1 opacity-80 hover:opacity-100" aria-label="ویرایش نما" title="ویرایش نما">
                <Pencil size={11} />
              </button>
            ) : undefined
          )
        )}
        {dirty && (
          <button onClick={() => setViewEdit({ name: "", shared: false })} className="flex items-center gap-1 text-xs text-brand-700 hover:bg-brand-50 rounded-full px-2.5 py-1 whitespace-nowrap border border-dashed border-brand-300">
            <BookmarkPlus size={12} /> ذخیره‌ی نما
          </button>
        )}
        {dirty && savedActive && (savedActive.owner === me || canEdit) && (
          <button onClick={() => { pm.saveView(pid, { id: savedActive.id, name: savedActive.name, shared: savedActive.shared, layout: st.layout, filters: clean(st.filters), sort: st.sort, lane: st.lane, columns: st.columns }); notify(`نمای «${savedActive.name}» به‌روزرسانی شد.`); }} className="text-xs text-ink-500 hover:text-brand-700 whitespace-nowrap px-1">
            به‌روزرسانی «{savedActive.name}»
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex rounded-lg border border-ink-200 overflow-hidden">
          <button onClick={() => setSt({ ...st, layout: "kanban" })} className={`px-2.5 py-1.5 text-xs flex items-center gap-1 ${view === "kanban" ? "bg-navy-900 text-white" : "bg-white text-ink-600"}`}>
            <LayoutGrid size={13} /> کانبان
          </button>
          <button onClick={() => setSt({ ...st, layout: "list" })} className={`px-2.5 py-1.5 text-xs flex items-center gap-1 ${view === "list" ? "bg-navy-900 text-white" : "bg-white text-ink-600"}`}>
            <List size={13} /> فهرست
          </button>
        </div>
        <div className="relative">
          <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={f.q ?? ""} onChange={(e) => setF({ q: e.target.value })} placeholder="جستجو یا کلید (QGJ-3)…" className="input-field !py-1.5 !pr-8 !text-xs w-44" />
        </div>
        <button onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1 ${activeFilters || filtersOpen ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-white border-ink-200 text-ink-600"}`}>
          <ListFilter size={13} /> فیلتر
          {activeFilters > 0 && <span className="text-[10px] bg-brand-600 text-white rounded-full px-1.5">{fa(activeFilters)}</span>}
        </button>
        {view === "kanban" ? (
          <select value={st.lane} onChange={(e) => setSt({ ...st, lane: e.target.value as LaneId })} className="input-field !py-1.5 !text-xs !w-auto" aria-label="گروه‌بندی ردیف‌ها">
            <option value="none">بدون ردیف‌بندی</option>
            <option value="assignee">ردیف بر اساس مسئول</option>
            <option value="priority">ردیف بر اساس اولویت</option>
            {epics.length > 0 && <option value="epic">ردیف بر اساس اپیک</option>}
            {sprints.length > 0 && <option value="sprint">ردیف بر اساس اسپرینت</option>}
          </select>
        ) : (
          <div className="relative">
            <button onClick={() => setChooserOpen((v) => !v)} aria-expanded={chooserOpen} className="text-xs px-2.5 py-1.5 rounded-lg border bg-white border-ink-200 text-ink-600 flex items-center gap-1">
              <Columns3 size={13} /> ستون‌ها
            </button>
            {chooserOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setChooserOpen(false)} />
                <div className="absolute z-30 top-full mt-1 right-0 w-56 bg-white border border-ink-200 rounded-xl shadow-lg p-2 max-h-80 overflow-y-auto">
                  <p className="text-[11px] text-ink-400 px-1 pb-1">ستون‌های قابل نمایش (عنوان همیشه هست)</p>
                  {allCols.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-xs text-ink-700 px-1 py-1 rounded hover:bg-ink-50 cursor-pointer">
                      <input type="checkbox" checked={(st.columns ?? defaultCols).includes(c.id)} onChange={() => toggleCol(c.id)} className="accent-[var(--color-brand-600)]" />
                      {c.label}
                    </label>
                  ))}
                  <button onClick={() => setSt({ ...st, columns: undefined })} className="text-[11px] text-brand-700 hover:underline px-1 mt-1">
                    بازگشت به پیش‌فرض
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <select value={st.sort} onChange={(e) => setSt({ ...st, sort: e.target.value as SortId })} className="input-field !py-1.5 !text-xs !w-auto" aria-label="مرتب‌سازی">
          <option value="manual">ترتیب دستی</option>
          <option value="priority">بر اساس اولویت</option>
          <option value="due">بر اساس سررسید</option>
          <option value="title">بر اساس عنوان</option>
          <option value="key">بر اساس کلید</option>
        </select>
        {filtered && (
          <button onClick={() => setSt({ ...st, filters: {} })} className="text-xs text-brand-700 hover:underline">
            پاک‌کردن ({fa(tasks.length)} نتیجه)
          </button>
        )}
        <div className="relative mr-auto">
          <button onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} className="p-2 rounded-lg border border-ink-200 bg-white text-ink-500 hover:text-ink-800" title="ابزارهای بیشتر" aria-label="ابزارهای بیشتر">
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute z-30 top-full mt-1 left-0 w-56 bg-white border border-ink-200 rounded-xl shadow-lg py-1.5">
                {canEdit && (
                  <button onClick={() => { setMenuOpen(false); setImportOpen(true); }} className="w-full text-right px-3 py-2 text-[13px] text-ink-700 hover:bg-ink-50 flex items-center gap-2">
                    <Upload size={14} /> درون‌ریزی تسک‌ها از CSV
                  </button>
                )}
                <button onClick={() => { setMenuOpen(false); exportCsv(); }} className="w-full text-right px-3 py-2 text-[13px] text-ink-700 hover:bg-ink-50 flex items-center gap-2">
                  <Download size={14} /> خروجی CSV ({fa(tasks.length)} تسک)
                </button>
                {canEdit && (
                  <button onClick={() => { setMenuOpen(false); setColsOpen(true); }} className="w-full text-right px-3 py-2 text-[13px] text-ink-700 hover:bg-ink-50 flex items-center gap-2">
                    <Settings2 size={14} /> مدیریت ستون‌های بورد
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {filtersOpen && (
        <div className="mb-4 bg-ink-50 border border-ink-100 rounded-lg p-2 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <select value={f.member ?? ""} onChange={(e) => setF({ member: e.target.value })} className="input-field !py-1.5 !text-xs !w-auto">
              <option value="">همه‌ی اعضا</option>
              {[...new Set(p.tasks.map((t) => t.assignee))].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <select value={f.priority ?? ""} onChange={(e) => setF({ priority: e.target.value })} className="input-field !py-1.5 !text-xs !w-auto">
              <option value="">همه‌ی اولویت‌ها</option>
              {priorities.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <select value={f.type ?? ""} onChange={(e) => setF({ type: e.target.value })} className="input-field !py-1.5 !text-xs !w-auto" aria-label="نوع کار">
              <option value="">همه‌ی انواع کار</option>
              {taskTypes.map((x) => (
                <option key={x} value={x}>
                  {typeLabel[x]}
                </option>
              ))}
            </select>
            <select value={f.label ?? ""} onChange={(e) => setF({ label: e.target.value })} className="input-field !py-1.5 !text-xs !w-auto">
              <option value="">همه‌ی برچسب‌ها</option>
              {[...new Set([...defaultLabels, ...p.tasks.flatMap((t) => t.labels)])].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            {sprints.length > 0 && (
              <select value={f.sprint ?? ""} onChange={(e) => setF({ sprint: e.target.value })} className="input-field !py-1.5 !text-xs !w-auto" aria-label="اسپرینت">
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
              <input type="checkbox" checked={!!f.mine} onChange={(e) => setF({ mine: e.target.checked })} className="accent-[var(--color-brand-600)]" /> فقط کارهای من
            </label>
            <label className="flex items-center gap-1 text-xs text-ink-600">
              <input type="checkbox" checked={!!f.overdue} onChange={(e) => setF({ overdue: e.target.checked })} className="accent-[var(--color-brand-600)]" /> عقب‌افتاده
            </label>
            <label className="flex items-center gap-1 text-xs text-ink-600">
              <input type="checkbox" checked={!!f.onlyWaiting} onChange={(e) => setF({ onlyWaiting: e.target.checked })} className="accent-[var(--color-brand-600)]" /> فقط منتظر پیش‌نیاز
            </label>
            <label className="flex items-center gap-1 text-xs text-ink-600">
              <input type="checkbox" checked={!!f.archived} onChange={(e) => setF({ archived: e.target.checked })} className="accent-[var(--color-brand-600)]" />
              <Archive size={12} /> بایگانی‌شده‌ها ({fa(archivedCount)})
            </label>
          </div>
          {epics.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-ink-100">
              <span className="text-[11px] font-bold text-ink-500 flex items-center gap-1">
                <Zap size={12} className="text-violet-600" /> اپیک‌ها:
              </span>
              {epics.map((e) => {
                const ep = epicProgress(p, e.id);
                const on = f.epic === e.id;
                return (
                  <button key={e.id} onClick={() => setF({ epic: on ? "" : e.id })} className={`text-[11px] rounded-lg border px-2 py-1 flex items-center gap-2 ${on ? "bg-violet-500/10 border-violet-500/40 text-violet-600" : "bg-white border-ink-200 text-ink-600 hover:bg-ink-50"}`} title={`${fa(ep.done)} از ${fa(ep.total)} کار انجام شده`}>
                    <span className="max-w-[160px] truncate">{e.title}</span>
                    <span className="w-14 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                      <span className="block h-full bg-violet-500/100" style={{ width: `${ep.pct}%` }} />
                    </span>
                    <span className="tabular-nums">{fa(ep.pct)}٪</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {f.archived && (
        <p className="mb-3 text-xs text-ink-500 flex items-center gap-1.5">
          <Archive size={13} /> در حال نمایش تسک‌های بایگانی‌شده — این تسک‌ها در بورد، گانت و گزارش‌ها حساب نمی‌شوند و قابل بازیابی‌اند.
        </p>
      )}

      {view === "kanban" ? (
        <div className="space-y-4">
          {lanes.map((ln) => (
            <div key={ln.key}>
              {st.lane !== "none" && (
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
                      {canEdit && st.lane === "none" && !f.archived && (
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
              {!f.archived && (
                <>
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
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon={f.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                onClick={() => {
                  const n = visibleSel.length;
                  pm.archiveTasks(pid, visibleSel, !f.archived);
                  setSelected([]);
                  notify(f.archived ? `${fa(n)} تسک از بایگانی بازیابی شد.` : `${fa(n)} تسک بایگانی شد؛ از فیلتر «بایگانی‌شده‌ها» قابل بازیابی است.`, "info");
                }}
              >
                {f.archived ? "بازیابی" : "بایگانی"}
              </Button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600"
                  icon={<Trash2 size={13} />}
                  onClick={() =>
                    confirm({
                      title: `حذف ${fa(visibleSel.length)} تسک؟`,
                      message: "زیرتسک‌ها و وابستگی‌های این تسک‌ها هم برداشته می‌شوند و رویداد در تاریخچه ثبت می‌شود. (برای نگه‌داشتن سابقه، بایگانی کنید.)",
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
          <table className="w-full text-xs" style={{ minWidth: 300 + visibleCols.length * 95 }}>
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
                <th className="p-3 font-medium min-w-[220px]">عنوان</th>
                {visibleCols.map((c) => (
                  <th key={c.id} className="p-3 font-medium whitespace-nowrap">
                    {c.label}
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
                    {t.title} {t.archived ? <span className="text-[10px] text-ink-400">(بایگانی {t.archivedAt})</span> : <TaskFlags p={p} t={t} refDate={refDate} />}
                  </td>
                  {visibleCols.map((c) => (
                    <td key={c.id} className="p-3">
                      {c.cell(t)}
                    </td>
                  ))}
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    {!t.archived && <RowActions onEdit={canEdit ? () => openTask(t.id) : undefined} onDelete={canDelete ? () => removeTask(t) : undefined} size={12} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tasks.length === 0 && <p className="text-center text-xs text-ink-400 py-8">{f.archived ? "تسک بایگانی‌شده‌ای نیست." : "تسکی با این فیلترها پیدا نشد."}</p>}
        </div>
      )}

      <ColumnsModal open={colsOpen} onClose={() => setColsOpen(false)} />
      {importOpen && <CsvImportModal onClose={() => setImportOpen(false)} />}
      <Modal open={!!viewEdit} onClose={() => setViewEdit(null)} title={viewEdit?.id ? "ویرایش نمای ذخیره‌شده" : "ذخیره‌ی نمای فعلی"} description="فیلترها، مرتب‌سازی، ردیف‌بندی، نوع نمایش و ستون‌های فهرست با این نام ذخیره می‌شوند.">
        {viewEdit && (
          <div className="space-y-3">
            <Field label="نام نما">
              <input className="input-field" autoFocus value={viewEdit.name} onChange={(e) => setViewEdit({ ...viewEdit, name: e.target.value })} placeholder="مثلاً: باگ‌های بحرانی این اسپرینت" />
            </Field>
            <div className="flex items-center gap-2 text-xs text-ink-700">
              <Toggle on={viewEdit.shared} onChange={() => setViewEdit({ ...viewEdit, shared: !viewEdit.shared })} label="اشتراک با اعضای پروژه" />
              {viewEdit.shared ? "اشتراکی — همه‌ی اعضای پروژه این نما را می‌بینند" : "شخصی — فقط برای خودتان"}
            </div>
            <p className="text-[11px] text-ink-400 leading-5">
              {view === "kanban" ? "کانبان" : "فهرست"} · {fa(activeFilters)} فیلتر فعال{f.q ? ` · جستجوی «${f.q}»` : ""} · مرتب‌سازی و ردیف‌بندی فعلی
              {f.type ? ` · نوع «${typeLabel[f.type as TaskType]}»` : ""}
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="primary" className="flex-1 justify-center" onClick={saveCurrentView}>
                {viewEdit.id ? "ذخیره‌ی تغییرات" : "ذخیره‌ی نما"}
              </Button>
              {viewEdit.id && (
                <Button
                  variant="ghost"
                  className="text-rose-600"
                  icon={<Trash2 size={13} />}
                  onClick={() => {
                    pm.removeView(pid, viewEdit.id!);
                    applyView("all", emptyState);
                    setViewEdit(null);
                    notify("نما حذف شد.", "info");
                  }}
                >
                  حذف
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
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
