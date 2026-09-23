import { useMemo, useState } from "react";
import { Diamond } from "lucide-react";
import { dependencyConflicts, isDone, isOverdue, kindOf, taskLoggedHours } from "../../pm/selectors";
import { dayNum, fa, fromDayNum, monthNames, parseJalali } from "../../pm/jalali";
import { kindColor, useProjectPage } from "./shared";

const ROW = 38;
const LABEL_W = 230;
const scales = { روز: 30, هفته: 12, ماه: 5 } as const;
type Scale = keyof typeof scales;

export default function GanttTab() {
  const { p, refDate, openTask } = useProjectPage();
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
                <span className="text-xs font-medium text-ink-800 truncate">{t.title}</span>
                <span className="text-[10.5px] text-ink-400 truncate">{t.assignee}</span>
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
            <div className="relative" style={{ height: bodyH }}>
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
                    // مختصات SVG از چپ: left = width − right
                    const sx = width - (xr(dayNum(a.due)!) + dw);
                    const sy = (ra + msTop) * ROW + ROW / 2;
                    const ex = width - xr(dayNum(b.start)!);
                    const ey = (rb + msTop) * ROW + ROW / 2;
                    const bad = conflicts.has(d.id);
                    // پیکان باید از سمت راست وارد ابتدای نوار تسک وابسته شود (جهت زمان راست‌به‌چپ است)
                    const turnX = Math.max(ex + 10, sx - 8);
                    const path = `M ${sx} ${sy} H ${turnX} V ${ey} H ${ex + 2}`;
                    return <path key={d.id} d={path} fill="none" stroke={bad ? "#e11d48" : "var(--color-ink-400)"} strokeWidth={bad ? 1.8 : 1.2} markerEnd={`url(#${bad ? "g-arr-bad" : "g-arr"})`} opacity={0.85} />;
                  })}
                </svg>
              )}

              {/* نوار تسک‌ها */}
              {tasks.map((t, i) => {
                const s = dayNum(t.start)!;
                const e = dayNum(t.due)!;
                const k = kindOf(p, t.status);
                const prog = isDone(p, t) ? 100 : t.progress;
                const logged = taskLoggedHours(p, t.id);
                const late = isOverdue(p, t, refDate);
                return (
                  <button
                    key={t.id}
                    onClick={() => openTask(t.id)}
                    title={`${t.title}\n${t.start} ← ${t.due}\nپیشرفت ${fa(prog)}٪${t.estHours ? ` · زمان صرف‌شده ${fa(logged)}/${fa(t.estHours)} ساعت (${fa(Math.round((logged / t.estHours) * 100))}٪)` : ""}`}
                    className={`absolute rounded-md overflow-hidden z-[4] shadow-sm ${late ? "ring-2 ring-rose-400" : ""}`}
                    style={{ right: xr(s), width: Math.max(dw, (e - s + 1) * dw), top: (i + msTop) * ROW + 8, height: ROW - 16, background: `color-mix(in srgb, ${kindColor[k]} 30%, transparent)` }}
                  >
                    <span className="absolute top-0 right-0 bottom-0" style={{ width: `${prog}%`, background: kindColor[k] }} />
                    <span className="relative text-[10px] font-medium px-1.5 text-white mix-blend-normal whitespace-nowrap" style={{ textShadow: "0 0 3px rgba(0,0,0,.45)" }}>
                      {fa(prog)}٪
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-ink-400">
        منبع داده در API: <span dir="ltr" className="font-mono">GET /projects/{"{id}"}/gantt/</span> — planned_start/planned_end، status_history و time_spent_ratio. نسبت زمان صرف‌شده با قرار دادن نشانگر روی هر نوار دیده می‌شود.
      </p>
    </div>
  );
}
