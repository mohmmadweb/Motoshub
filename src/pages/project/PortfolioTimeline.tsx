import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, AlertTriangle, Flag } from "lucide-react";
import { useProjectsPM } from "../../context/ProjectsContext";
import { activeTasks, budgetUsage, isDone, isOverdue, paidTotal, projectProgress } from "../../pm/selectors";
import { dayNum, fa, fmtShort, fromDayNum, monthNames, parseJalali } from "../../pm/jalali";
import type { ProjectState } from "../../pm/types";
import { ProjectIcon } from "./projectIcons";

const scales = { ماه: 9, فصل: 4, سال: 1.6 } as const;
type Scale = keyof typeof scales;
const healthColor: Record<string, string> = { سبز: "#10b981", زرد: "#f59e0b", قرمز: "#e11d48" };
const LABEL_W = 220;
const ROW = 44;

/** خلاصه‌ی پورتفولیو برای یک گروه پروژه */
function summary(ps: ProjectState[], ref: string) {
  const budget = ps.reduce((s, p) => s + p.budget.total, 0);
  const spent = ps.reduce((s, p) => s + paidTotal(p), 0);
  const overdue = ps.reduce((s, p) => s + activeTasks(p).filter((t) => isOverdue(p, t, ref)).length, 0);
  const health = { سبز: 0, زرد: 0, قرمز: 0 } as Record<string, number>;
  ps.forEach((p) => (health[p.meta.health] += 1));
  const progress = ps.length ? Math.round(ps.reduce((s, p) => s + projectProgress(p), 0) / ps.length) : 0;
  const lateProjects = ps.filter((p) => (dayNum(p.meta.deadline) ?? 9e9) < (dayNum(ref) ?? 0) && !["تکمیل", "اختتام"].includes(p.meta.phase)).length;
  return { budget, spent, pct: budget ? Math.round((spent / budget) * 100) : 0, overdue, health, progress, lateProjects };
}

/**
 * تایم‌لاین پورتفولیو (Roadmap چندپروژه‌ای) — هم‌تراز Asana Portfolios / Jira Plans:
 * هر ردیف یک پروژه از شروع تا مهلت، مایل‌ستون‌ها لوزی، خط امروز، حاشیه به رنگ سلامت؛ گروه‌بندی با خلاصه‌ی بودجه/سلامت/عقب‌افتادگی.
 */
export default function PortfolioTimeline({ projects }: { projects: ProjectState[] }) {
  const pm = useProjectsPM();
  const navigate = useNavigate();
  const [scale, setScale] = useState<Scale>("فصل");
  const dw = scales[scale];
  const ref = dayNum(pm.refDate)!;

  const groups = useMemo(() => {
    const gs = pm.store.groups.map((g) => ({ id: g.id, name: g.name, color: g.color, items: projects.filter((p) => p.meta.groupId === g.id) }));
    const none = projects.filter((p) => !p.meta.groupId || !pm.store.groups.some((g) => g.id === p.meta.groupId));
    return [...gs, { id: "none", name: "بدون گروه", color: "var(--color-ink-400)", items: none }].filter((g) => g.items.length);
  }, [projects, pm.store.groups]);

  const dated = projects.filter((p) => dayNum(p.meta.start) !== null);
  const all = [...dated.flatMap((p) => [dayNum(p.meta.start)!, dayNum(p.meta.deadline) ?? dayNum(p.meta.start)!, ...p.milestones.map((m) => dayNum(m.due) ?? ref)]), ref];
  const min = Math.min(...all) - 10;
  const max = Math.max(...all) + 10;
  const width = (max - min + 1) * dw;
  const xr = (d: number) => (d - min) * dw;

  const months: { label: string; from: number; to: number }[] = [];
  for (let d = min; d <= max; d++) {
    const j = parseJalali(fromDayNum(d))!;
    const label = scale === "سال" ? `${monthNames[j[1] - 1].slice(0, 3)} ${fa(j[0] % 100)}` : `${monthNames[j[1] - 1]} ${fa(j[0])}`;
    const last = months[months.length - 1];
    if (last && last.label === label) last.to = d;
    else months.push({ label, from: d, to: d });
  }

  const total = summary(projects, pm.refDate);

  return (
    <div className="space-y-3 mb-8">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-ink-200 overflow-hidden">
          {(Object.keys(scales) as Scale[]).map((s) => (
            <button key={s} onClick={() => setScale(s)} className={`px-3 py-1.5 text-xs ${scale === s ? "bg-navy-900 text-white" : "bg-white text-ink-600"}`}>
              {s}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-ink-500 flex items-center gap-3 flex-wrap mr-auto">
          <span className="flex items-center gap-1">
            <Wallet size={12} /> بودجه‌ی کل {fmtShort(total.budget)} · هزینه‌شده {fmtShort(total.spent)} ({fa(total.pct)}٪)
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle size={12} className="text-rose-500" /> {fa(total.overdue)} تسک عقب
          </span>
          <span className="flex items-center gap-1">
            <span className="w-0.5 h-3 bg-rose-500" /> امروز ({pm.refDate})
          </span>
        </span>
      </div>

      {/* خلاصه‌ی پورتفولیو به تفکیک گروه */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {groups.map((g) => {
          const sm = summary(g.items, pm.refDate);
          return (
            <div key={g.id} className="card p-3">
              <p className="text-xs font-bold text-ink-800 flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} /> {g.name}
                <span className="text-[10px] font-normal text-ink-400">({fa(g.items.length)} پروژه)</span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-ink-500 mt-2">
                <span className="flex items-center gap-1">
                  <Wallet size={12} /> {fmtShort(sm.spent)} از {fmtShort(sm.budget)}
                </span>
                <span className={sm.pct > 100 ? "text-rose-600 font-bold" : ""}>{fa(sm.pct)}٪</span>
              </div>
              <span className="block h-1.5 rounded-full bg-ink-100 overflow-hidden mt-1">
                <span className={`block h-full ${sm.pct > 100 ? "bg-rose-500" : sm.pct > 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, sm.pct)}%` }} />
              </span>
              <div className="flex items-center gap-3 text-[11px] text-ink-600 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  {(["سبز", "زرد", "قرمز"] as const).map((h) =>
                    sm.health[h] ? (
                      <span key={h} className="flex items-center gap-0.5" title={`${fa(sm.health[h])} پروژه ${h}`}>
                        <span className="w-2 h-2 rounded-full" style={{ background: healthColor[h] }} />
                        {fa(sm.health[h])}
                      </span>
                    ) : null
                  )}
                </span>
                <span>پیشرفت {fa(sm.progress)}٪</span>
                {sm.overdue > 0 && <span className="text-rose-600">{fa(sm.overdue)} تسک عقب</span>}
                {sm.lateProjects > 0 && <span className="text-rose-600">{fa(sm.lateProjects)} پروژه دیرکرد</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card overflow-x-auto">
        <div style={{ minWidth: LABEL_W + width }}>
          {/* سربرگ ماه‌ها */}
          <div className="flex border-b border-ink-100 sticky top-0">
            <div className="shrink-0 sticky right-0 z-20 bg-white border-l border-ink-100 px-3 flex items-end pb-1.5 text-[11px] font-medium text-ink-400" style={{ width: LABEL_W, height: 32 }}>
              پروژه
            </div>
            <div className="relative" style={{ width, height: 32 }}>
              {months.map((m) => (
                <div key={`${m.label}-${m.from}`} className="absolute top-0 h-full border-r border-ink-100 text-[10.5px] text-ink-500 px-1.5 flex items-center overflow-hidden whitespace-nowrap" style={{ right: xr(m.from), width: (m.to - m.from + 1) * dw }}>
                  {(m.to - m.from + 1) * dw > 34 ? m.label : ""}
                </div>
              ))}
            </div>
          </div>

          {groups.map((g) => {
            return (
              <div key={g.id}>
                {/* سطر عنوان گروه */}
                <div className="flex border-b border-ink-100 bg-ink-50/70">
                  <div className="shrink-0 sticky right-0 z-10 bg-ink-50 border-l border-ink-100 px-3 py-1.5" style={{ width: LABEL_W }}>
                    <p className="text-xs font-bold text-ink-800 flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} /> {g.name}
                      <span className="text-[10px] font-normal text-ink-400">({fa(g.items.length)})</span>
                    </p>
                  </div>
                  <div style={{ width }} />
                </div>
                {g.items.map((p) => {
                  const s = dayNum(p.meta.start);
                  const e = dayNum(p.meta.deadline) ?? s;
                  const prog = projectProgress(p);
                  const late = activeTasks(p).filter((t) => isOverdue(p, t, pm.refDate)).length;
                  const doneN = activeTasks(p).filter((t) => isDone(p, t)).length;
                  return (
                    <div key={p.meta.id} className="flex border-b border-ink-100 hover:bg-ink-50/50 group">
                      <button onClick={() => navigate(`/dashboard/projects/${p.meta.id}`)} className="shrink-0 sticky right-0 z-10 bg-white group-hover:bg-ink-50 border-l border-ink-100 px-3 text-right flex items-center gap-2 min-w-0" style={{ width: LABEL_W, height: ROW }}>
                        <span style={{ color: p.meta.color }} className="shrink-0">
                          <ProjectIcon name={p.meta.icon} size={14} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-ink-900 truncate">{p.meta.name}</span>
                          <span className="block text-[10.5px] text-ink-400 truncate">
                            {p.meta.archived ? "بایگانی" : p.meta.phase} · {fa(prog)}٪{late ? ` · ${fa(late)} عقب` : ""}
                          </span>
                        </span>
                      </button>
                      <div className="relative" style={{ width, height: ROW }}>
                        {s !== null && e !== null && (
                          <button
                            onClick={() => navigate(`/dashboard/projects/${p.meta.id}?tab=gantt`)}
                            title={`${p.meta.name}\n${p.meta.start} ← ${p.meta.deadline}\nپیشرفت ${fa(prog)}٪ · ${fa(doneN)} تسک انجام‌شده · مصرف بودجه ${fa(budgetUsage(p))}٪\nسلامت: ${p.meta.health}`}
                            className="absolute rounded-md overflow-hidden"
                            style={{ right: xr(s), width: Math.max(dw * 3, (e - s + 1) * dw), top: 10, height: ROW - 20, background: `color-mix(in srgb, ${p.meta.color} 22%, transparent)`, border: `2px solid ${healthColor[p.meta.health]}` }}
                          >
                            <span className="absolute top-0 right-0 bottom-0" style={{ width: `${prog}%`, background: `color-mix(in srgb, ${p.meta.color} 70%, transparent)` }} />
                          </button>
                        )}
                        {p.milestones.map((m) => {
                          const d = dayNum(m.due);
                          if (d === null) return null;
                          const c = m.status === "انجام‌شده" ? "#059669" : m.status === "در خطر" ? "#e11d48" : "var(--color-navy-700)";
                          return (
                            <span key={m.id} title={`${m.title} — ${m.due} (${m.status})`} className="absolute z-[2]" style={{ right: xr(d) + dw / 2 - 5, top: ROW / 2 - 5 }}>
                              <span className="block w-2.5 h-2.5 rotate-45 border border-white shadow-sm" style={{ background: c }} />
                            </span>
                          );
                        })}
                        {p.closure && (
                          <span title={`بسته‌شده در ${p.closure.closedAt}`} className="absolute z-[2] text-emerald-600" style={{ right: Math.max(0, xr(dayNum(p.closure.closedAt) ?? e!) - 4), top: 2 }}>
                            <Flag size={11} />
                          </span>
                        )}
                        <span className="absolute top-0 bottom-0 w-0.5 bg-rose-500/80 z-[3]" style={{ right: xr(ref) + dw / 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {groups.length === 0 && <p className="text-xs text-ink-400 text-center py-8">پروژه‌ای با این فیلترها پیدا نشد.</p>}
        </div>
      </div>
      <p className="text-[11px] text-ink-400 flex items-center gap-3 flex-wrap">
        <span>حاشیه‌ی نوار = سلامت پروژه</span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rotate-45 inline-block" style={{ background: "var(--color-navy-700)" }} /> مایل‌ستون
        </span>
        <span>بخش پررنگ نوار = پیشرفت · کلیک = گانت پروژه</span>
      </p>
    </div>
  );
}
