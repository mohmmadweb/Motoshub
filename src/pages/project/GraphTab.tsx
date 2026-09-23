import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, Link2, Flame, Lock, CheckCircle2, AlertTriangle, X, Play, Route, Unlink, MousePointerClick, Info } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import StatCard from "../../components/ui/StatCard";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { chainOf, columnLabel, createsCycle, criticalPath, dependencyConflicts, isDone, isOverdue, isWaiting, kindOf, layerTasks, openPredecessors, predecessorsOf, successorsOf } from "../../pm/selectors";
import { fa } from "../../pm/jalali";
import type { PMTask } from "../../pm/types";
import { Field, SectionTitle, TaskSelect, kindColor, kindTone, useProjectPage } from "./shared";

const W = 208;
const H = 92;
const COL_GAP = 80;
const ROW_GAP = 22;
const PAD = 28;

export default function GraphTab() {
  const { p, pid, canEdit, refDate, openTask, focusId } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const [zoom, setZoom] = useState(1);
  const [autoFit, setAutoFit] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);
  const [showCritical, setShowCritical] = useState(true);
  const [hideDone, setHideDone] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(focusId && p.tasks.some((t) => t.id === focusId) ? focusId : null);
  const [selEdge, setSelEdge] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [addPred, setAddPred] = useState("");
  const [addSucc, setAddSucc] = useState("");

  useEffect(() => {
    if (focusId && p.tasks.some((t) => t.id === focusId)) setSelected(focusId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const visible = useMemo(() => p.tasks.filter((t) => !t.archived && (!hideDone || !isDone(p, t))), [p, hideDone]);
  const { layers, deps } = useMemo(() => layerTasks(p, visible), [p, visible]);
  const cp = useMemo(() => criticalPath(p, p.tasks.filter((t) => !t.archived)), [p]);
  const conflicts = useMemo(() => dependencyConflicts(p), [p]);
  const conflictSet = new Set(conflicts.map((c) => c.dep.id));

  const maxRows = Math.max(1, ...layers.map((l) => l.length));
  const width = PAD * 2 + layers.length * W + Math.max(0, layers.length - 1) * COL_GAP;
  const height = PAD * 2 + maxRows * H + (maxRows - 1) * ROW_GAP;

  // «اندازه‌ی مناسب»: کل گراف در عرض کادر جا شود (بزرگ‌نمایی بیش از ۱۰۰٪ نمی‌شود)
  const fit = () => {
    const w = boxRef.current?.clientWidth ?? width;
    return Math.max(0.4, Math.min(1, +((w - 8) / width).toFixed(2)));
  };
  useLayoutEffect(() => {
    if (!autoFit) return;
    setZoom(fit());
    const onResize = () => setZoom(fit());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFit, width]);

  const pos = new Map<string, { x: number; y: number }>();
  layers.forEach((layer, lv) => {
    const x = width - PAD - (lv + 1) * W - lv * COL_GAP; // راست‌به‌چپ: پیش‌نیازها سمت راست
    const offset = ((maxRows - layer.length) * (H + ROW_GAP)) / 2;
    layer.forEach((t, i) => pos.set(t.id, { x, y: PAD + offset + i * (H + ROW_GAP) }));
  });

  const focus = selected ?? hover;
  const up = focus ? chainOf(p, focus, "up") : new Set<string>();
  const down = focus ? chainOf(p, focus, "down") : new Set<string>();
  const inFocus = (id: string) => !focus || id === focus || up.has(id) || down.has(id);

  const tryLink = (from: string, to: string) => {
    if (from === to) return;
    const a = p.tasks.find((t) => t.id === from)!;
    const b = p.tasks.find((t) => t.id === to)!;
    if (p.deps.some((d) => d.predecessor === from && d.successor === to)) return notify("این وابستگی از قبل وجود دارد.", "warning");
    if (createsCycle(p, from, to)) return notify(`حلقه ممنوع است: «${b.title}» خودش (مستقیم یا غیرمستقیم) پیش‌نیاز «${a.title}» است.`, "warning");
    pm.addDependency(pid, from, to);
    notify(`«${b.title}» حالا به «${a.title}» وابسته است.`);
  };

  const clickNode = (id: string) => {
    setSelEdge(null);
    if (linkMode && canEdit) {
      if (!linkFrom) {
        setLinkFrom(id);
        return;
      }
      tryLink(linkFrom, id);
      setLinkFrom(null);
      return;
    }
    setSelected((s) => (s === id ? null : id));
  };

  const readyToStart = p.tasks.filter((t) => !t.archived && ["backlog", "todo"].includes(kindOf(p, t.status)) && openPredecessors(p, t.id).length === 0);
  const waiting = p.tasks.filter((t) => !t.archived && isWaiting(p, t));
  const isolated = p.tasks.filter((t) => !t.archived && !p.deps.some((d) => d.predecessor === t.id || d.successor === t.id));
  const sel = selected ? p.tasks.find((t) => t.id === selected) : undefined;
  const edge = selEdge ? p.deps.find((d) => d.id === selEdge) : undefined;

  const NodeIcon = ({ t }: { t: PMTask }) => {
    if (isDone(p, t)) return <CheckCircle2 size={13} className="text-emerald-600" />;
    if (isWaiting(p, t)) return <Lock size={13} className="text-amber-600" />;
    if (["backlog", "todo"].includes(kindOf(p, t.status))) return <Play size={13} className="text-brand-600" />;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="وابستگی‌ها" value={fa(p.deps.length)} icon={<Link2 size={16} />} tone="brand" />
        <StatCard label="طول مسیر بحرانی" value={`${fa(cp.days)} روز`} hint={`${fa(cp.path.length)} تسک پشت‌سرهم`} icon={<Flame size={16} />} tone="danger" />
        <StatCard label="آماده‌ی شروع" value={fa(readyToStart.length)} hint="همه‌ی پیش‌نیازها تمام شده" icon={<Play size={16} />} tone="success" />
        <StatCard label="منتظر پیش‌نیاز" value={fa(waiting.length)} icon={<Lock size={16} />} tone="warning" />
        <StatCard label="تعارض زمان‌بندی" value={fa(conflicts.length)} hint="شروع قبل از پایان پیش‌نیاز" icon={<AlertTriangle size={16} />} tone={conflicts.length ? "danger" : "neutral"} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center rounded-lg border border-ink-200 overflow-hidden bg-white">
          <button onClick={() => { setAutoFit(false); setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2))); }} className="p-2 hover:bg-ink-50" aria-label="کوچک‌نمایی">
            <ZoomOut size={14} />
          </button>
          <span className="text-xs w-12 text-center text-ink-600">{fa(Math.round(zoom * 100))}٪</span>
          <button onClick={() => { setAutoFit(false); setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2))); }} className="p-2 hover:bg-ink-50" aria-label="بزرگ‌نمایی">
            <ZoomIn size={14} />
          </button>
          <button onClick={() => { setAutoFit(true); setZoom(fit()); }} className={`p-2 hover:bg-ink-50 border-r border-ink-200 ${autoFit ? "text-brand-600" : ""}`} aria-label="جا شدن در صفحه" title="جا شدن در صفحه">
            <Maximize2 size={14} />
          </button>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-ink-600 bg-white border border-ink-200 rounded-lg px-2.5 py-1.5">
          <input type="checkbox" checked={showCritical} onChange={(e) => setShowCritical(e.target.checked)} className="accent-[var(--color-brand-600)]" />
          <Flame size={12} className="text-rose-500" /> مسیر بحرانی
        </label>
        <label className="flex items-center gap-1.5 text-xs text-ink-600 bg-white border border-ink-200 rounded-lg px-2.5 py-1.5">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="accent-[var(--color-brand-600)]" /> پنهان‌کردن انجام‌شده‌ها
        </label>
        {canEdit && (
          <Button
            size="sm"
            variant={linkMode ? "primary" : "secondary"}
            icon={<MousePointerClick size={13} />}
            onClick={() => {
              setLinkMode((v) => !v);
              setLinkFrom(null);
            }}
          >
            {linkMode ? (linkFrom ? "حالا تسک وابسته را انتخاب کنید…" : "روی پیش‌نیاز کلیک کنید…") : "حالت اتصال (رسم وابستگی)"}
          </Button>
        )}
        {(selected || selEdge) && (
          <Button size="sm" variant="ghost" icon={<X size={13} />} onClick={() => { setSelected(null); setSelEdge(null); }}>
            لغو انتخاب
          </Button>
        )}
        <div className="flex items-center gap-3 text-[11px] text-ink-500 mr-auto flex-wrap">
          <span className="flex items-center gap-1"><span className="w-5 h-0.5 bg-emerald-500 inline-block" /> پیش‌نیاز انجام شده</span>
          <span className="flex items-center gap-1"><span className="w-5 border-t-2 border-dashed border-ink-400 inline-block" /> در انتظار</span>
          <span className="flex items-center gap-1"><span className="w-5 h-0.5 bg-rose-500 inline-block" /> مسیر بحرانی</span>
          <span className="flex items-center gap-1"><span className="w-5 h-0.5 bg-amber-500 inline-block" /> تعارض زمانی</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
        <div ref={boxRef} className="card overflow-auto relative" style={{ maxHeight: 640 }}>
          {visible.length === 0 ? (
            <p className="text-center text-xs text-ink-400 py-16">تسکی برای نمایش وجود ندارد.</p>
          ) : (
            <div style={{ width: width * zoom, height: height * zoom }} className="relative">
              <div style={{ width, height, transform: `scale(${zoom})`, transformOrigin: "top left" }} className="absolute top-0 left-0">
                <svg width={width} height={height} className="absolute inset-0" role="img" aria-label="گراف وابستگی تسک‌ها">
                  <defs>
                    {["ok", "wait", "crit", "warn", "focus"].map((k) => (
                      <marker key={k} id={`arr-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M0,0 L10,5 L0,10 z" fill={k === "ok" ? "#10b981" : k === "crit" ? "#f43f5e" : k === "warn" ? "#f59e0b" : k === "focus" ? "var(--color-brand-500)" : "var(--color-ink-400)"} />
                      </marker>
                    ))}
                  </defs>
                  {deps.map((d) => {
                    const a = pos.get(d.predecessor);
                    const b = pos.get(d.successor);
                    if (!a || !b) return null;
                    const pred = p.tasks.find((t) => t.id === d.predecessor)!;
                    const sx = a.x;
                    const sy = a.y + H / 2;
                    const ex = b.x + W + 2;
                    const ey = b.y + H / 2;
                    const dx = Math.max(40, (sx - ex) / 2);
                    const path = `M ${sx} ${sy} C ${sx - dx} ${sy}, ${ex + dx} ${ey}, ${ex} ${ey}`;
                    const crit = showCritical && cp.edges.has(`${d.predecessor}>${d.successor}`);
                    const warn = conflictSet.has(d.id);
                    const done = isDone(p, pred);
                    const inUp = (id: string) => id === focus || up.has(id);
                    const inDown = (id: string) => id === focus || down.has(id);
                    const focused = !focus || (inUp(d.predecessor) && inUp(d.successor)) || (inDown(d.predecessor) && inDown(d.successor));
                    const kind = selEdge === d.id ? "focus" : warn ? "warn" : crit ? "crit" : done ? "ok" : "wait";
                    const color = kind === "focus" ? "var(--color-brand-500)" : kind === "warn" ? "#f59e0b" : kind === "crit" ? "#f43f5e" : kind === "ok" ? "#10b981" : "var(--color-ink-400)";
                    return (
                      <g key={d.id} opacity={focused ? 1 : 0.12}>
                        <path d={path} fill="none" stroke={color} strokeWidth={selEdge === d.id ? 3.5 : crit ? 2.6 : 1.8} strokeDasharray={kind === "wait" ? "6 5" : undefined} markerEnd={`url(#arr-${kind})`} />
                        <path
                          d={path}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={14}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setSelEdge(d.id);
                            setSelected(null);
                          }}
                        >
                          <title>{`${pred.title} ← ${p.tasks.find((t) => t.id === d.successor)?.title}`}</title>
                        </path>
                      </g>
                    );
                  })}
                </svg>
                {visible.map((t) => {
                  const ps = pos.get(t.id);
                  if (!ps) return null;
                  const k = kindOf(p, t.status);
                  const crit = showCritical && cp.path.includes(t.id);
                  const isSel = selected === t.id;
                  const isFrom = linkFrom === t.id;
                  const late = isOverdue(p, t, refDate);
                  return (
                    <button
                      key={t.id}
                      onClick={() => clickNode(t.id)}
                      onDoubleClick={() => openTask(t.id)}
                      onMouseEnter={() => !selected && setHover(t.id)}
                      onMouseLeave={() => setHover(null)}
                      style={{ left: ps.x, top: ps.y, width: W, height: H, opacity: inFocus(t.id) ? 1 : 0.25 }}
                      className={`absolute text-right rounded-xl bg-white border shadow-sm overflow-hidden transition-all ${isSel ? "ring-2 ring-brand-500 border-brand-400" : isFrom ? "ring-2 ring-amber-400 border-amber-400" : crit ? "border-rose-300" : "border-ink-200"} ${linkMode ? "cursor-crosshair" : ""}`}
                      title="کلیک: انتخاب زنجیره · دوبار کلیک: جزئیات تسک"
                    >
                      <span className="absolute top-0 right-0 bottom-0 w-1" style={{ background: kindColor[k] }} />
                      <div className="p-2.5 pr-3.5 h-full flex flex-col">
                        <div className="flex items-start gap-1.5">
                          <NodeIcon t={t} />
                          <p className="text-[11.5px] font-semibold text-ink-900 leading-5 line-clamp-2 flex-1">{t.title}</p>
                          {crit && <Flame size={12} className="text-rose-500 shrink-0" />}
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-1 text-[10.5px] text-ink-500">
                          <span className="truncate">{t.assignee}</span>
                          <span className={late ? "text-rose-600 font-medium" : ""}>{t.due}</span>
                        </div>
                        <div className="h-1 rounded-full bg-ink-100 mt-1 overflow-hidden">
                          <div className="h-full" style={{ width: `${isDone(p, t) ? 100 : t.progress}%`, background: kindColor[k] }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
          {(edge || sel) && (
          <div className="absolute top-3 left-3 w-72 max-w-[calc(100%-24px)] z-10 shadow-xl rounded-xl max-h-[600px] overflow-y-auto">
          {edge ? (
            <div className="card p-4 space-y-3">
              <p className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
                <Link2 size={14} className="text-brand-600" /> وابستگی انتخاب‌شده
              </p>
              <div className="text-xs leading-6 text-ink-700">
                <p>
                  <span className="text-ink-400">پیش‌نیاز: </span>
                  {p.tasks.find((t) => t.id === edge.predecessor)?.title}
                </p>
                <p>
                  <span className="text-ink-400">وابسته: </span>
                  {p.tasks.find((t) => t.id === edge.successor)?.title}
                </p>
                <p>
                  <span className="text-ink-400">نوع: </span>پایان به شروع (FS) · ثبت {edge.createdAt}
                </p>
                {conflictSet.has(edge.id) && <p className="text-amber-700 mt-1">تعارض: تسک وابسته قبل از پایان پیش‌نیاز شروع می‌شود.</p>}
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Unlink size={13} />}
                  onClick={() => {
                    pm.removeDependency(pid, edge.id);
                    setSelEdge(null);
                    notify("وابستگی حذف شد.", "info");
                  }}
                >
                  حذف این وابستگی
                </Button>
              )}
            </div>
          ) : sel ? (
            <div className="card p-4 space-y-3">
              <div>
                <p className="text-sm font-bold text-ink-900 leading-6">{sel.title}</p>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  <Badge tone={kindTone[kindOf(p, sel.status)]}>{columnLabel(p, sel.status)}</Badge>
                  {cp.path.includes(sel.id) && <Badge tone="danger" icon={<Flame size={10} />}>روی مسیر بحرانی</Badge>}
                  {isWaiting(p, sel) && <Badge tone="warning" icon={<Lock size={10} />}>منتظر پیش‌نیاز</Badge>}
                </div>
                <p className="text-[11px] text-ink-500 mt-2">
                  {sel.assignee} · {sel.start} ← {sel.due}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-ink-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-ink-900">{fa(up.size)}</p>
                  <p className="text-[10.5px] text-ink-500">تسک بالادست</p>
                </div>
                <div className="bg-ink-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-ink-900">{fa(down.size)}</p>
                  <p className="text-[10.5px] text-ink-500">تسک پایین‌دست (متأثر)</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold text-ink-600 mb-1">پیش‌نیازهای مستقیم</p>
                {predecessorsOf(p, sel.id).map((x) => (
                  <button key={x.id} onClick={() => setSelected(x.id)} className="block w-full text-right text-xs py-1 text-ink-700 hover:text-brand-700">
                    {isDone(p, x) ? "✓ " : "○ "}
                    {x.title}
                  </button>
                ))}
                {predecessorsOf(p, sel.id).length === 0 && <p className="text-[11px] text-ink-400">—</p>}
              </div>
              <div>
                <p className="text-[11px] font-bold text-ink-600 mb-1">وابسته‌های مستقیم</p>
                {successorsOf(p, sel.id).map((x) => (
                  <button key={x.id} onClick={() => setSelected(x.id)} className="block w-full text-right text-xs py-1 text-ink-700 hover:text-brand-700">
                    ← {x.title}
                  </button>
                ))}
                {successorsOf(p, sel.id).length === 0 && <p className="text-[11px] text-ink-400">—</p>}
              </div>
              {down.size > 0 && !isDone(p, sel) && (
                <p className="text-[11px] leading-5 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  هر روز تأخیر در این تسک، {fa(down.size)} تسک دیگر را هم عقب می‌اندازد.
                </p>
              )}
              <Button size="sm" variant="primary" className="w-full justify-center" onClick={() => openTask(sel.id)}>
                باز کردن جزئیات تسک
              </Button>
            </div>
          ) : null}
          </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="card p-4 space-y-3">
              <p className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
                <Route size={14} className="text-rose-500" /> مسیر بحرانی ({fa(cp.days)} روز)
              </p>
              <ol className="space-y-1">
                {cp.path.map((id, i) => {
                  const t = p.tasks.find((x) => x.id === id)!;
                  return (
                    <li key={id}>
                      <button onClick={() => setSelected(id)} className="text-xs text-right text-ink-700 hover:text-brand-700 flex gap-1.5">
                        <span className="text-ink-400 w-4 shrink-0">{fa(i + 1)}.</span>
                        <span className={isDone(p, t) ? "line-through text-ink-400" : ""}>{t.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <p className="text-[11px] text-ink-400 leading-5 flex gap-1">
                <Info size={12} className="shrink-0 mt-0.5" />
                مسیر بحرانی طولانی‌ترین زنجیره‌ی وابستگی است؛ تأخیر در هر تسک آن، کل پروژه را عقب می‌اندازد.
              </p>
            </div>

          {conflicts.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1">
                <AlertTriangle size={13} /> تعارض‌های زمان‌بندی
              </p>
              {conflicts.map((c) => (
                <button key={c.dep.id} onClick={() => setSelEdge(c.dep.id)} className="block text-right text-[11.5px] text-ink-700 py-1 hover:text-brand-700 leading-5">
                  «{c.succ.title}» {fa(c.overlap)} روز قبل از پایان «{c.pred.title}» شروع می‌شود.
                </button>
              ))}
            </div>
          )}

          <div className="card p-4">
            <p className="text-xs font-bold text-ink-900 mb-2">آماده‌ی شروع</p>
            {readyToStart.map((t) => (
              <button key={t.id} onClick={() => setSelected(t.id)} className="block text-right text-xs py-1 text-emerald-700 hover:underline">
                {t.title}
              </button>
            ))}
            {readyToStart.length === 0 && <p className="text-[11px] text-ink-400">—</p>}
            {isolated.length > 0 && <p className="text-[11px] text-ink-400 mt-2">{fa(isolated.length)} تسک بدون هیچ وابستگی</p>}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <SectionTitle icon={<Link2 size={15} className="text-brand-600" />} title="فهرست وابستگی‌ها" hint="همان داده‌ی GET /projects/{id}/task-dependencies — ایجاد با POST (predecessor, successor)" />
        {canEdit && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end mb-4">
            <Field label="پیش‌نیاز (predecessor)">
              <TaskSelect p={p} value={addPred} onChange={setAddPred} exclude={addSucc ? [addSucc] : []} />
            </Field>
            <Field label="تسک وابسته (successor)">
              <TaskSelect p={p} value={addSucc} onChange={setAddSucc} exclude={addPred ? [addPred] : []} />
            </Field>
            <Button
              variant="primary"
              icon={<Link2 size={14} />}
              onClick={() => {
                if (!addPred || !addSucc) return notify("هر دو تسک را انتخاب کنید.", "warning");
                tryLink(addPred, addSucc);
                setAddPred("");
                setAddSucc("");
              }}
            >
              افزودن وابستگی
            </Button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="text-ink-400 border-b border-ink-100 text-right">
                <th className="p-2 font-medium">پیش‌نیاز</th>
                <th className="p-2 font-medium">وضعیت</th>
                <th className="p-2 font-medium" />
                <th className="p-2 font-medium">تسک وابسته</th>
                <th className="p-2 font-medium">وضعیت</th>
                <th className="p-2 font-medium">هشدار</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {p.deps.map((d) => {
                const a = p.tasks.find((t) => t.id === d.predecessor);
                const b = p.tasks.find((t) => t.id === d.successor);
                if (!a || !b) return null;
                return (
                  <tr key={d.id} className="border-b border-ink-100 hover:bg-ink-50">
                    <td className="p-2 text-ink-800">{a.title}</td>
                    <td className="p-2">
                      <Badge tone={kindTone[kindOf(p, a.status)]}>{columnLabel(p, a.status)}</Badge>
                    </td>
                    <td className="p-2 text-ink-400">←</td>
                    <td className="p-2 text-ink-800">{b.title}</td>
                    <td className="p-2">
                      <Badge tone={kindTone[kindOf(p, b.status)]}>{columnLabel(p, b.status)}</Badge>
                    </td>
                    <td className="p-2">{conflictSet.has(d.id) ? <Badge tone="warning">تعارض زمانی</Badge> : cp.edges.has(`${d.predecessor}>${d.successor}`) ? <Badge tone="danger">بحرانی</Badge> : "—"}</td>
                    <td className="p-2">
                      {canEdit && (
                        <button onClick={() => pm.removeDependency(pid, d.id)} className="text-ink-300 hover:text-rose-600" aria-label="حذف">
                          <X size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {p.deps.length === 0 && <p className="text-center text-xs text-ink-400 py-6">هنوز وابستگی‌ای تعریف نشده است.</p>}
        </div>
      </div>
    </div>
  );
}
