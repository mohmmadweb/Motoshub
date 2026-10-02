import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Diamond, Save, Trash2, MousePointer2 } from "lucide-react";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { createsCycle, criticalPath, dependencyConflicts, depIsDefault, depShort, depType, depTypeLabel, isDone, isOverdue, kindOf, successorsOf, taskLoggedHours } from "../../pm/selectors";
import { shiftSuccessors } from "../../pm/schedule";
import { dayNum, fa, fromDayNum, monthNames, parseJalali } from "../../pm/jalali";
import { kindColor, useProjectPage } from "./shared";
import { TypeIcon } from "./taskTypes";

const ROW = 38;
const LABEL_W = 230;
const scales = { روز: 30, هفته: 12, ماه: 5 } as const;
type Scale = keyof typeof scales;

type BarDrag = { id: string; mode: "move" | "start" | "end"; x0: number; dd: number; moved: boolean };
type LinkDrag = { from: string; sx: number; sy: number; x: number; y: number; over?: string };

export default function GanttTab() {
  const { p, pid, canEdit, can, refDate, openTask } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const confirm = useConfirm();
  // کشیدن نوارها و ساخت وابستگی — مجوز ایجاد و تخصیص وظایف
  const canMove = can("projects.tasks");
  const [drag, setDrag] = useState<BarDrag | null>(null);
  const [link, setLink] = useState<LinkDrag | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const suppress = useRef(false);
  const [showBase, setShowBase] = useState(true);
  const [showCrit, setShowCrit] = useState(false);
  const base = p.baseline;
  // مقیاس پیش‌فرض طوری انتخاب می‌شود که کل بازه‌ی پروژه بدون اسکرول دیده شود
  const [scale, setScale] = useState<Scale>(() => {
    const ds = p.tasks.flatMap((t) => [dayNum(t.start), dayNum(t.due)]).filter((x): x is number => x !== null);
    const span = ds.length ? Math.max(...ds) - Math.min(...ds) : 0;
    return span > 75 ? "ماه" : span > 30 ? "هفته" : "روز";
  });
  const [showDeps, setShowDeps] = useState(true);
  const [order, setOrder] = useState<"start" | "board">("start");
  const dw = scales[scale];

  const tasks = useMemo(() => {
    const ts = p.tasks.filter((t) => !t.archived && dayNum(t.start) !== null && dayNum(t.due) !== null);
    return order === "start" ? [...ts].sort((a, b) => dayNum(a.start)! - dayNum(b.start)!) : ts;
  }, [p, order]);

  const ref = dayNum(refDate)!;
  const all = [...tasks.flatMap((t) => [dayNum(t.start)!, dayNum(t.due)!]), ...p.milestones.map((m) => dayNum(m.due) ?? ref), dayNum(p.meta.start) ?? ref, dayNum(p.meta.deadline) ?? ref, ref];
  const min = Math.min(...all) - 3;
  const max = Math.max(...all) + 3;
  const days = max - min + 1;
  const width = days * dw;
  const xr = (d: number) => (d - min) * dw; // فاصله از راست
  const conflicts = new Set(dependencyConflicts(p).map((c) => c.dep.id));
  const crit = useMemo(() => (showCrit ? criticalPath(p, tasks) : null), [showCrit, p, tasks]);
  /** انحراف سررسید نسبت به خط مبنا (روز؛ مثبت = عقب‌افتادگی) */
  const slip = (id: string, due: string) => {
    const b = base?.tasks[id];
    return b ? (dayNum(due) ?? 0) - (dayNum(b.due) ?? 0) : null;
  };


  // ---------------------------------------------------------------- تعامل: کشیدن نوار، تغییر مدت، ساخت وابستگی
  const span = (t: { id: string; start: string; due: string }) => {
    let s = dayNum(t.start)!;
    let e = dayNum(t.due)!;
    if (drag && drag.id === t.id) {
      if (drag.mode === "move") {
        s += drag.dd;
        e += drag.dd;
      } else if (drag.mode === "start") s = Math.min(s + drag.dd, e);
      else e = Math.max(e + drag.dd, s);
    }
    return [s, e] as const;
  };

  const commit = (id: string, mode: BarDrag["mode"], dd: number) => {
    const t = p.tasks.find((x) => x.id === id);
    if (!t || !dd) return;
    const s0 = dayNum(t.start)!;
    const e0 = dayNum(t.due)!;
    const ns = mode === "end" ? s0 : mode === "start" ? Math.min(s0 + dd, e0) : s0 + dd;
    const ne = mode === "start" ? e0 : mode === "end" ? Math.max(e0 + dd, s0) : e0 + dd;
    if (ns === s0 && ne === e0) return;
    const start = fromDayNum(ns);
    const due = fromDayNum(ne);
    pm.updateTask(pid, id, { start, due });
    notify(mode === "move" ? `«${t.title}» ${fa(Math.abs(dd))} روز ${dd > 0 ? "عقب" : "جلو"} رفت (${start} تا ${due}).` : `مدت «${t.title}» به ${fa(ne - ns + 1)} روز تغییر کرد.`, "info");
    if (!successorsOf(p, id).length) return;
    const patches = shiftSuccessors(p, id, start, due, mode === "start" ? ns - s0 : ne - e0);
    const ids = Object.keys(patches);
    if (!ids.length) return;
    confirm({
      title: "جابه‌جایی جانشین‌ها",
      message: `${fa(ids.length)} تسک وابسته (${ids.map((x) => `«${p.tasks.find((t2) => t2.id === x)?.title}»`).slice(0, 3).join("، ")}${ids.length > 3 ? " و …" : ""}) با رعایت نوع وابستگی و تأخیر جابه‌جا شوند؟`,
      confirmLabel: "جابه‌جایی جانشین‌ها",
      onConfirm: () => {
        ids.forEach((x) => pm.updateTask(pid, x, patches[x]));
        notify(`${fa(ids.length)} تسک جانشین جابه‌جا شد.`);
      },
    });
  };

  const beginBar = (e: RPointerEvent, id: string, mode: BarDrag["mode"]) => {
    if (!canMove || e.button !== 0 || e.pointerType === "touch") return;
    e.stopPropagation();
    e.preventDefault();
    const x0 = e.clientX;
    let cur: BarDrag = { id, mode, x0, dd: 0, moved: false };
    setDrag(cur);
    const move = (ev: PointerEvent) => {
      const dx = x0 - ev.clientX; // راست‌به‌چپ: حرکت به چپ = تاریخ بعدتر
      const dd = Math.round(dx / dw);
      if (!cur.moved && Math.abs(dx) < 4) return;
      if (dd === cur.dd && cur.moved) return;
      cur = { ...cur, dd, moved: true };
      setDrag(cur);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      if (cur.moved) {
        suppress.current = true;
        setTimeout(() => (suppress.current = false), 0);
        commit(id, mode, cur.dd);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const beginLink = (e: RPointerEvent, id: string, sx: number, sy: number) => {
    if (!canMove || e.button !== 0 || e.pointerType === "touch") return;
    e.stopPropagation();
    e.preventDefault();
    const rect = () => bodyRef.current?.getBoundingClientRect();
    const r0 = rect();
    let cur: LinkDrag = { from: id, sx, sy, x: r0 ? e.clientX - r0.left : sx, y: r0 ? e.clientY - r0.top : sy };
    setLink(cur);
    const target = (ev: PointerEvent) => (document.elementsFromPoint(ev.clientX, ev.clientY).find((x) => (x as HTMLElement).dataset?.ganttTask) as HTMLElement | undefined)?.dataset.ganttTask;
    const move = (ev: PointerEvent) => {
      const r = rect();
      if (!r) return;
      const over = target(ev);
      cur = { ...cur, x: ev.clientX - r.left, y: ev.clientY - r.top, over: over && over !== id ? over : undefined };
      setLink(cur);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setLink(null);
      suppress.current = true;
      setTimeout(() => (suppress.current = false), 0);
      const to = target(ev);
      if (!to || to === id) return;
      const a = p.tasks.find((x) => x.id === id);
      const b = p.tasks.find((x) => x.id === to);
      if (!a || !b) return;
      if (p.deps.some((d) => (d.predecessor === id && d.successor === to) || (d.predecessor === to && d.successor === id))) return notify("بین این دو تسک از قبل وابستگی هست.", "warning");
      if (createsCycle(p, id, to)) return notify("این وابستگی حلقه ایجاد می‌کند و مجاز نیست.", "warning");
      pm.addDependency(pid, id, to, { type: "FS" });
      notify(`وابستگی «پایان به شروع» ساخته شد: «${b.title}» پس از «${a.title}». نوع و تأخیر را در جزئیات تسک تغییر دهید.`);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // سربرگ ماه‌ها
  const months: { label: string; from: number; to: number }[] = [];
  for (let d = min; d <= max; d++) {
    const j = parseJalali(fromDayNum(d))!;
    const label = `${monthNames[j[1] - 1]} ${fa(j[0])}`;
    const last = months[months.length - 1];
    if (last && last.label === label) last.to = d;
    else months.push({ label, from: d, to: d });
  }

  const rowOf = new Map(tasks.map((t, i) => [t.id, i]));
  const msTop = 1; // ردیف مایل‌ستون‌ها
  const bodyH = (tasks.length + msTop) * ROW;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-ink-200 overflow-hidden">
          {(Object.keys(scales) as Scale[]).map((s) => (
            <button key={s} onClick={() => setScale(s)} className={`px-3 py-1.5 text-xs ${scale === s ? "bg-navy-900 text-white" : "bg-white text-ink-600"}`}>
              {s}
            </button>
          ))}
        </div>
        <select value={order} onChange={(e) => setOrder(e.target.value as "start" | "board")} className="input-field !py-1.5 !text-xs !w-auto">
          <option value="start">مرتب بر اساس تاریخ شروع</option>
          <option value="board">ترتیب بورد</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-ink-600">
          <input type="checkbox" checked={showDeps} onChange={(e) => setShowDeps(e.target.checked)} className="accent-[var(--color-brand-600)]" /> نمایش پیکان وابستگی‌ها
        </label>
        <label className="flex items-center gap-1.5 text-xs text-ink-600" title="طولانی‌ترین زنجیره‌ی وابستگی؛ هر تأخیر در آن، پایان پروژه را عقب می‌اندازد">
          <input type="checkbox" checked={showCrit} onChange={(e) => setShowCrit(e.target.checked)} className="accent-[var(--color-brand-600)]" /> مسیر بحرانی
        </label>
        {base ? (
          <span className="flex items-center gap-1.5 text-xs text-ink-600">
            <label className="flex items-center gap-1.5" title={`ذخیره‌شده در ${base.savedAt} توسط ${base.savedBy}`}>
              <input type="checkbox" checked={showBase} onChange={(e) => setShowBase(e.target.checked)} className="accent-[var(--color-brand-600)]" /> خط مبنا ({base.savedAt})
            </label>
            {canEdit && (
              <>
                <button onClick={() => { pm.saveBaseline(pid); notify("خط مبنا با زمان‌بندی فعلی جایگزین شد."); }} className="p-1 text-ink-400 hover:text-brand-700" title="به‌روزرسانی خط مبنا با برنامه‌ی فعلی" aria-label="به‌روزرسانی خط مبنا">
                  <Save size={13} />
                </button>
                <button onClick={() => pm.clearBaseline(pid)} className="p-1 text-ink-400 hover:text-rose-600" title="حذف خط مبنا" aria-label="حذف خط مبنا">
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </span>
        ) : (
          canEdit && (
            <Button variant="secondary" size="sm" icon={<Save size={13} />} onClick={() => { pm.saveBaseline(pid); notify("خط مبنا ذخیره شد؛ از این پس انحراف هر تسک از برنامه‌ی اولیه نمایش داده می‌شود."); }}>
              ذخیره‌ی خط مبنا
            </Button>
          )
        )}
        <div className="flex items-center gap-3 text-[11px] text-ink-500 mr-auto flex-wrap">
          {(["backlog", "doing", "review", "blocked", "done"] as const).map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span className="w-3 h-2 rounded-sm" style={{ background: kindColor[k] }} />
              {{ backlog: "برنامه‌ریزی/برای انجام", doing: "در حال انجام", review: "بازبینی", blocked: "متوقف", done: "انجام‌شده" }[k]}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="w-0.5 h-3 bg-rose-500" /> امروز ({refDate})
          </span>
          <span className="font-mono text-[10px]" dir="ltr" title="پیکان بدون برچسب = پایان‌به‌شروع (FS) بدون تأخیر">
            FS · SS · FF · SF ±lag
          </span>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="flex" style={{ minWidth: LABEL_W + width }}>
          {/* ستون عنوان‌ها */}
          <div className="shrink-0 border-l border-ink-100 bg-white sticky right-0 z-10" style={{ width: LABEL_W }}>
            <div className="h-12 border-b border-ink-100 flex items-end px-3 pb-1.5 text-[11px] font-medium text-ink-400">عنوان تسک</div>
            <div style={{ height: ROW }} className="flex items-center px-3 text-[11px] text-ink-500 border-b border-ink-100 bg-ink-50/60">
              <Diamond size={11} className="ml-1 text-brand-600" /> مایل‌ستون‌ها
            </div>
            {tasks.map((t) => (
              <button key={t.id} onClick={() => openTask(t.id)} style={{ height: ROW }} className="w-full text-right px-3 border-b border-ink-100 hover:bg-ink-50 flex flex-col justify-center">
                <span className="text-xs font-medium text-ink-800 truncate flex items-center gap-1">
                  <TypeIcon type={t.type} size={11} />
                  {t.title}
                </span>
                <span className="text-[10.5px] text-ink-400 truncate">
                  {t.assignee}
                  {(() => {
                    const d = base && showBase ? slip(t.id, t.due) : null;
                    return d ? <span className={d > 0 ? "text-rose-600" : "text-emerald-600"}> · {d > 0 ? `${fa(d)} روز تأخیر` : `${fa(-d)} روز جلوتر`}</span> : null;
                  })()}
                </span>
              </button>
            ))}
          </div>

          {/* خط زمان */}
          <div className="relative" style={{ width }}>
            <div className="h-12 border-b border-ink-100 relative">
              {months.map((m) => (
                <div key={m.label} className="absolute top-0 h-6 border-l border-ink-100 text-[11px] text-ink-600 font-medium px-1.5 flex items-center overflow-hidden whitespace-nowrap" style={{ right: xr(m.from), width: (m.to - m.from + 1) * dw }}>
                  {m.label}
                </div>
              ))}
              {Array.from({ length: days }, (_, i) => min + i).map((d) => {
                const j = parseJalali(fromDayNum(d))!;
                const show = scale === "روز" || (scale === "هفته" && (j[2] === 1 || j[2] % 7 === 1)) || (scale === "ماه" && (j[2] === 1 || j[2] === 15));
                return show ? (
                  <span key={d} className="absolute top-7 text-[10px] text-ink-400" style={{ right: xr(d), width: dw, textAlign: "center" }}>
                    {fa(j[2])}
                  </span>
                ) : null;
              })}
            </div>
            <div className="relative" style={{ height: bodyH }} ref={bodyRef}>
              {/* خطوط شبکه */}
              {Array.from({ length: days }, (_, i) => min + i)
                .filter((d) => parseJalali(fromDayNum(d))![2] === 1)
                .map((d) => (
                  <span key={d} className="absolute top-0 bottom-0 border-r border-ink-100" style={{ right: xr(d) }} />
                ))}
              {Array.from({ length: tasks.length + msTop }, (_, i) => (
                <span key={i} className="absolute left-0 right-0 border-b border-ink-100" style={{ top: (i + 1) * ROW - 1 }} />
              ))}
              {/* امروز */}
              <span className="absolute top-0 bottom-0 w-0.5 bg-rose-500/80 z-[5]" style={{ right: xr(ref) + dw / 2 }} />
              {/* پایان پروژه */}
              {dayNum(p.meta.deadline) !== null && <span className="absolute top-0 bottom-0 border-r-2 border-dashed border-navy-400 z-[4]" title={`مهلت پروژه ${p.meta.deadline}`} style={{ right: xr(dayNum(p.meta.deadline)! + 1) }} />}

              {/* مایل‌ستون‌ها */}
              {p.milestones.map((m) => {
                const d = dayNum(m.due);
                if (d === null) return null;
                const color = m.status === "انجام‌شده" ? "#059669" : m.status === "در خطر" ? "#e11d48" : "var(--color-brand-600)";
                return (
                  <span key={m.id} title={`${m.title} — ${m.due} (${m.status})`} className="absolute z-[6]" style={{ right: xr(d) + dw / 2 - 7, top: ROW / 2 - 7 }}>
                    <span className="block w-3.5 h-3.5 rotate-45 border-2 border-white shadow" style={{ background: color }} />
                  </span>
                );
              })}

              {/* پیکان وابستگی‌ها */}
              {showDeps && (
                <svg className="absolute inset-0 pointer-events-none z-[3]" width={width} height={bodyH}>
                  <defs>
                    <marker id="g-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M0,0 L10,5 L0,10 z" fill="var(--color-ink-400)" />
                    </marker>
                    <marker id="g-arr-bad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M0,0 L10,5 L0,10 z" fill="#e11d48" />
                    </marker>
                  </defs>
                  {p.deps.map((d) => {
                    const ra = rowOf.get(d.predecessor);
                    const rb = rowOf.get(d.successor);
                    const a = p.tasks.find((t) => t.id === d.predecessor);
                    const b = p.tasks.find((t) => t.id === d.successor);
                    if (ra === undefined || rb === undefined || !a || !b) return null;
                    // مختصات SVG از چپ: left = width − right — نقطه‌ی اتصال بر اساس نوع وابستگی (FS/SS/FF/SF)
                    const ty = depType(d);
                    const fromStart = ty === "SS" || ty === "SF";
                    const toEnd = ty === "FF" || ty === "SF";
                    const [as_, ae_] = span(a);
                    const [bs_, be_] = span(b);
                    const sx = fromStart ? width - xr(as_) : width - (xr(ae_) + dw);
                    const sy = (ra + msTop) * ROW + ROW / 2;
                    const ex = toEnd ? width - (xr(be_) + dw) : width - xr(bs_);
                    const ey = (rb + msTop) * ROW + ROW / 2;
                    const bad = conflicts.has(d.id);
                    const onCrit = crit?.edges.has(`${d.predecessor}>${d.successor}`);
                    // پیکان به ابتدای نوار وابسته از راست وارد می‌شود (زمان راست‌به‌چپ) و به انتهای نوار از چپ
                    const turnX = toEnd ? Math.min(ex, sx) - 10 : Math.max(ex + 10, sx - 8);
                    const path = `M ${sx} ${sy} H ${turnX} V ${ey} H ${toEnd ? ex - 2 : ex + 2}`;
                    const label = !depIsDefault(d);
                    return (
                      <g key={d.id}>
                        <path d={path} fill="none" stroke={bad ? "#e11d48" : onCrit ? "var(--color-navy-700)" : "var(--color-ink-400)"} strokeWidth={bad || onCrit ? 2 : 1.2} markerEnd={`url(#${bad ? "g-arr-bad" : "g-arr"})`} opacity={0.85}>
                          <title>{`${depTypeLabel[ty]}${d.lag ? ` · تأخیر ${fa(d.lag)} روز` : ""}`}</title>
                        </path>
                        {label && (
                          <text x={turnX} y={(sy + ey) / 2} dy={3} textAnchor="middle" fontSize="9" fontFamily="monospace" fill={bad ? "#e11d48" : "var(--color-ink-600)"} stroke="var(--color-ink-50)" strokeWidth={3} paintOrder="stroke" direction="ltr">
                            {depShort(d)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* نوار تسک‌ها */}
              {tasks.map((t, i) => {
                const [s, e] = span(t);
                const k = kindOf(p, t.status);
                const prog = isDone(p, t) ? 100 : t.progress;
                const logged = taskLoggedHours(p, t.id);
                const late = isOverdue(p, t, refDate);
                const b = base && showBase ? base.tasks[t.id] : undefined;
                const bs = b ? dayNum(b.start) : null;
                const be = b ? dayNum(b.due) : null;
                const d = slip(t.id, t.due);
                const barW = Math.max(dw, (e - s + 1) * dw);
                const top = (i + msTop) * ROW + 7;
                const dragging = drag?.id === t.id && drag.moved;
                const isTarget = link?.over === t.id;
                return (
                  <span key={t.id}>
                  {bs !== null && be !== null && (
                    <span
                      className="absolute rounded-sm bg-ink-400/60 z-[3]"
                      title={`خط مبنا: ${b!.start} ← ${b!.due}`}
                      style={{ right: xr(bs), width: Math.max(dw, (be - bs + 1) * dw), top: (i + msTop) * ROW + ROW - 9, height: 4 }}
                    />
                  )}
                  <button
                    data-gantt-task={t.id}
                    onClick={() => !suppress.current && openTask(t.id)}
                    onPointerDown={canMove ? (ev) => beginBar(ev, t.id, "move") : undefined}
                    title={`${t.title}\n${t.start} ← ${t.due}\nپیشرفت ${fa(prog)}٪${t.estHours ? ` · زمان صرف‌شده ${fa(logged)}/${fa(t.estHours)} ساعت (${fa(Math.round((logged / t.estHours) * 100))}٪)` : ""}${d ? `\nانحراف از خط مبنا: ${d > 0 ? `${fa(d)} روز تأخیر` : `${fa(-d)} روز جلوتر`}` : ""}${crit?.path.includes(t.id) ? "\nروی مسیر بحرانی" : ""}${canMove ? "\nبکشید: جابه‌جایی · لبه‌ها: تغییر مدت · دایره: ساخت وابستگی" : ""}`}
                    className={`group absolute rounded-md z-[4] shadow-sm ${late ? "ring-2 ring-rose-400" : crit?.path.includes(t.id) ? "ring-2 ring-navy-700" : ""} ${isTarget ? "ring-2 ring-brand-500" : ""} ${canMove ? "cursor-grab active:cursor-grabbing select-none" : ""} ${dragging ? "opacity-80 shadow-lg" : ""}`}
                    style={{ right: xr(s), width: barW, top, height: ROW - 18, background: `color-mix(in srgb, ${kindColor[k]} 30%, transparent)` }}
                  >
                    <span className="absolute inset-0 rounded-md overflow-hidden pointer-events-none">
                      <span className="absolute top-0 right-0 bottom-0" style={{ width: `${prog}%`, background: kindColor[k] }} />
                    </span>
                    <span className="relative text-[10px] font-medium px-1.5 text-white mix-blend-normal whitespace-nowrap pointer-events-none" style={{ textShadow: "0 0 3px rgba(0,0,0,.45)" }}>
                      {dragging ? `${fromDayNum(s).slice(5)} ← ${fromDayNum(e).slice(5)}` : `${fa(prog)}٪`}
                    </span>
                    {canMove && (
                      <>
                        <span onPointerDown={(ev) => beginBar(ev, t.id, "start")} className="absolute top-0 bottom-0 right-0 w-1.5 cursor-ew-resize rounded-r-md hover:bg-ink-900/20" aria-hidden title="تغییر تاریخ شروع" />
                        <span onPointerDown={(ev) => beginBar(ev, t.id, "end")} className="absolute top-0 bottom-0 left-0 w-1.5 cursor-ew-resize rounded-l-md hover:bg-ink-900/20" aria-hidden title="تغییر سررسید" />
                        <span
                          onPointerDown={(ev) => beginLink(ev, t.id, width - (xr(e) + dw), (i + msTop) * ROW + ROW / 2)}
                          className="absolute top-1/2 -translate-y-1/2 -left-3 w-2.5 h-2.5 rounded-full border-2 border-brand-600 bg-white cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-hidden
                          title="بکشید روی تسک دیگر: ساخت وابستگی پایان‌به‌شروع"
                        />
                      </>
                    )}
                  </button>
                  </span>
                );
              })}
              {link && (
                <svg className="absolute inset-0 pointer-events-none z-[8]" width={width} height={bodyH}>
                  <line x1={link.sx} y1={link.sy} x2={link.x} y2={link.y} stroke="var(--color-brand-600)" strokeWidth={2} strokeDasharray="4 3" />
                  <circle cx={link.x} cy={link.y} r={4} fill="var(--color-brand-600)" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-ink-400 flex items-center gap-1.5 flex-wrap">
        {canMove && (
          <span className="inline-flex items-center gap-1">
            <MousePointer2 size={12} /> نوار را بکشید تا جابه‌جا شود، لبه‌ها را برای تغییر مدت، و از دایره‌ی انتهای نوار تا تسک دیگر برای ساخت وابستگی. ·
          </span>
        )}
        برای دیدن نسبت زمان صرف‌شده، نشانگر را روی نوار هر تسک نگه دارید.
      </p>
    </div>
  );
}
