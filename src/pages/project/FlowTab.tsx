import { useMemo, useState } from "react";
import { Activity, Timer, Gauge, Layers, Hourglass, Info } from "lucide-react";
import StatCard from "../../components/ui/StatCard";
import Badge from "../../components/ui/Badge";
import { average, cumulativeFlow, percentile, taskFlows, weeklyThroughput } from "../../pm/flow";
import { dayNum, fa, fromDayNum } from "../../pm/jalali";
import { columnLabel, kindOf } from "../../pm/selectors";
import type { ColumnKind } from "../../pm/types";
import { SectionTitle, kindColor, kindTone, useProjectPage } from "./shared";
import { TaskKey, TypeIcon } from "./taskTypes";

const kindName: Record<ColumnKind, string> = { backlog: "برنامه‌ریزی", todo: "برای انجام", doing: "در حال انجام", review: "بازبینی", blocked: "متوقف", done: "انجام‌شده" };
/** ترتیب لایه‌ها در نمودار جریان تجمعی: انجام‌شده پایین، برنامه‌ریزی بالا */
const stackOrder: ColumnKind[] = ["done", "review", "blocked", "doing", "todo", "backlog"];
const ranges = { "۳۰ روز": 30, "۶۰ روز": 60, "۹۰ روز": 90 } as const;

/** تحلیل جریان کار (Cycle/Lead time، CFD، توان عملیاتی، سن کارهای در جریان) — هم‌تراز Jira/Linear */
export default function FlowTab() {
  const { p, refDate, openTask } = useProjectPage();
  const [range, setRange] = useState<keyof typeof ranges>("۶۰ روز");
  const ref = dayNum(refDate)!;
  const flows = useMemo(() => taskFlows(p, refDate), [p, refDate]);
  const done = flows.filter((f) => f.cycleTime !== undefined);
  const cycles = done.map((f) => f.cycleTime!);
  const leads = flows.filter((f) => f.leadTime !== undefined).map((f) => f.leadTime!);
  const wip = flows.filter((f) => f.age !== undefined).sort((a, b) => (b.age ?? 0) - (a.age ?? 0));
  const thr = weeklyThroughput(flows, ref, 8);
  const days = ranges[range];
  const cfd = useMemo(() => cumulativeFlow(flows, ref - days, ref, days > 60 ? 2 : 1), [flows, ref, days]);
  const p85 = percentile(cycles, 0.85);

  // ---- نمودار جریان تجمعی (SVG)
  const W = 720;
  const H = 220;
  const pad = { l: 28, r: 8, t: 8, b: 22 };
  const maxY = Math.max(1, ...cfd.map((d) => stackOrder.reduce((s, k) => s + d.counts[k], 0)));
  const x = (i: number) => pad.l + (i / Math.max(1, cfd.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - (v / maxY) * (H - pad.t - pad.b);
  const areas = stackOrder.map((k, li) => {
    const below = (d: (typeof cfd)[number]) => stackOrder.slice(0, li).reduce((s, kk) => s + d.counts[kk], 0);
    const top = cfd.map((d, i) => `${x(i)},${y(below(d) + d.counts[k])}`);
    const bottom = cfd.map((d, i) => `${x(i)},${y(below(d))}`).reverse();
    return { k, d: `M${top.join("L")}L${bottom.join("L")}Z` };
  });
  const ticks = cfd.filter((d) => {
    const j = fromDayNum(d.day);
    return j.endsWith("/۰۱") || j.endsWith("/۱۵");
  });
  const yTicks = [0, Math.round(maxY / 2), maxY];

  const maxThr = Math.max(1, ...thr.map((w) => w.count));
  const avgTime = (k: ColumnKind) => {
    const xs = flows.filter((f) => (f.timeIn[k] ?? 0) > 0).map((f) => f.timeIn[k]!);
    return xs.length ? average(xs) : 0;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 text-xs text-ink-500 leading-6">
        <Info size={14} className="mt-1 shrink-0" />
        <p>
          شاخص‌ها از تاریخچه‌ی جابه‌جایی تسک‌ها بین ستون‌ها (رویداد TASK_STATUS_CHANGED) محاسبه می‌شوند. <b>زمان چرخه</b> از اولین ورود به «در حال انجام» تا «انجام‌شده» و <b>زمان تحویل</b> از ایجاد تسک تا انجام است. اپیک‌ها و تسک‌های بایگانی‌شده حساب نمی‌شوند.
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="میانگین زمان چرخه" value={`${fa(Math.round(average(cycles) * 10) / 10)} روز`} hint={`صدک ۸۵: ${fa(p85)} روز · ${fa(cycles.length)} تسک`} icon={<Timer size={16} />} tone="brand" />
        <StatCard label="میانگین زمان تحویل" value={`${fa(Math.round(average(leads) * 10) / 10)} روز`} hint={`میانه ${fa(percentile(leads, 0.5))} روز`} icon={<Activity size={16} />} />
        <StatCard label="توان عملیاتی" value={`${fa(Math.round(average(thr.map((w) => w.count)) * 10) / 10)} در هفته`} hint={`${fa(thr.reduce((s, w) => s + w.count, 0))} تسک در ۸ هفته`} icon={<Gauge size={16} />} tone="success" />
        <StatCard label="کار در جریان (WIP)" value={fa(wip.length)} hint={wip.length ? `میانگین سن ${fa(Math.round(average(wip.map((f) => f.age ?? 0))))} روز` : "—"} icon={<Layers size={16} />} tone={wip.some((f) => (f.age ?? 0) > p85 && p85 > 0) ? "warning" : "neutral"} />
      </div>

      <div className="card p-4">
        <SectionTitle
          icon={<Layers size={15} className="text-brand-600" />}
          title="نمودار جریان تجمعی (CFD)"
          hint="پهن شدن نوار «در حال انجام/بازبینی» یعنی کار بیشتری شروع شده تا تمام شود — گلوگاه."
          action={
            <div className="flex rounded-lg border border-ink-200 overflow-hidden">
              {(Object.keys(ranges) as (keyof typeof ranges)[]).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={`px-2.5 py-1 text-[11px] ${range === r ? "bg-navy-900 text-white" : "bg-white text-ink-600"}`}>
                  {r}
                </button>
              ))}
            </div>
          }
        />
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px] h-auto" role="img" aria-label="نمودار جریان تجمعی">
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--color-ink-100)" />
                <text x={pad.l - 6} y={y(v) + 3} fontSize="9" textAnchor="end" fill="var(--color-ink-400)">
                  {fa(v)}
                </text>
              </g>
            ))}
            {areas.map((a) => (
              <path key={a.k} d={a.d} fill={kindColor[a.k]} fillOpacity={a.k === "done" ? 0.55 : 0.8} stroke="var(--color-ink-50)" strokeWidth={0.5}>
                <title>{kindName[a.k]}</title>
              </path>
            ))}
            {ticks.map((d) => {
              const i = cfd.indexOf(d);
              return (
                <text key={d.day} x={x(i)} y={H - 6} fontSize="9" textAnchor="middle" fill="var(--color-ink-400)">
                  {fromDayNum(d.day).slice(5)}
                </text>
              );
            })}
          </svg>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-[11px] text-ink-500 mt-2">
          {[...stackOrder].reverse().map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span className="w-3 h-2 rounded-sm" style={{ background: kindColor[k] }} /> {kindName[k]} ({fa(cfd[cfd.length - 1]?.counts[k] ?? 0)})
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <SectionTitle icon={<Gauge size={15} className="text-emerald-600" />} title="توان عملیاتی هفتگی" hint="تعداد کارهای تمام‌شده در هر هفته (۸ هفته‌ی اخیر)" />
          <div className="flex items-end gap-2 h-36 pt-2" dir="ltr">
            {thr.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full" title={`${fromDayNum(w.start)} تا ${fromDayNum(w.end)}: ${w.items.map((f) => f.t.title).join("، ") || "—"}`}>
                <span className="text-[10px] text-ink-600 tabular-nums">{w.count ? fa(w.count) : ""}</span>
                <div className={`w-full rounded-t-md ${i === thr.length - 1 ? "bg-brand-500" : "bg-emerald-500/70"}`} style={{ height: `${(w.count / maxThr) * 100}%`, minHeight: w.count ? 4 : 1 }} />
                <span className="text-[9.5px] text-ink-400 whitespace-nowrap">{fromDayNum(w.end).slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <SectionTitle icon={<Timer size={15} className="text-brand-600" />} title="میانگین زمان در هر وضعیت" hint="کجا کار بیشتر می‌ماند؟ (روز، روی همه‌ی تسک‌ها)" />
          <div className="space-y-2">
            {(["todo", "doing", "review", "blocked"] as ColumnKind[]).map((k) => {
              const v = avgTime(k);
              const max = Math.max(1, ...(["todo", "doing", "review", "blocked"] as ColumnKind[]).map(avgTime));
              return (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-24 text-ink-600 shrink-0">{kindName[k]}</span>
                  <span className="flex-1 h-2.5 rounded-full bg-ink-100 overflow-hidden">
                    <span className="block h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: kindColor[k] }} />
                  </span>
                  <span className="w-14 text-left tabular-nums text-ink-700">{fa(Math.round(v * 10) / 10)} روز</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <SectionTitle icon={<Hourglass size={15} className="text-amber-600" />} title="سن کارهای در جریان (WIP aging)" hint={p85 ? `کارهای قدیمی‌تر از صدک ۸۵ زمان چرخه (${fa(p85)} روز) احتمالاً گیر کرده‌اند.` : "روز از شروع کار"} />
          <div className="divide-y divide-ink-100">
            {wip.map((f) => {
              const old = p85 > 0 && (f.age ?? 0) > p85;
              return (
                <button key={f.t.id} onClick={() => openTask(f.t.id)} className="w-full flex items-center gap-2 py-2 text-xs text-right hover:bg-ink-50 px-1">
                  <TypeIcon type={f.t.type} />
                  <TaskKey t={f.t} />
                  <span className="flex-1 truncate text-ink-800">{f.t.title}</span>
                  <Badge tone={kindTone[kindOf(p, f.t.status)]}>{columnLabel(p, f.t.status)}</Badge>
                  <span className="w-20 flex items-center gap-1 shrink-0">
                    <span className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                      <span className={`block h-full ${old ? "bg-rose-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, ((f.age ?? 0) / Math.max(p85 || 1, ...wip.map((w) => w.age ?? 0))) * 100)}%` }} />
                    </span>
                  </span>
                  <span className={`w-12 text-left tabular-nums ${old ? "text-rose-600 font-bold" : "text-ink-600"}`}>{fa(f.age ?? 0)} روز</span>
                </button>
              );
            })}
            {wip.length === 0 && <p className="text-[11px] text-ink-400 py-2">کاری در جریان نیست.</p>}
          </div>
        </div>
        <div className="card p-4">
          <SectionTitle icon={<Activity size={15} className="text-brand-600" />} title="زمان چرخه و تحویل هر تسک" hint="تسک‌های انجام‌شده، جدیدترین بالا" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[380px]">
              <thead>
                <tr className="text-ink-400 border-b border-ink-100 text-right">
                  <th className="p-2 font-medium">تسک</th>
                  <th className="p-2 font-medium">پایان</th>
                  <th className="p-2 font-medium">چرخه</th>
                  <th className="p-2 font-medium">تحویل</th>
                </tr>
              </thead>
              <tbody>
                {[...done]
                  .sort((a, b) => (b.doneDay ?? 0) - (a.doneDay ?? 0))
                  .slice(0, 12)
                  .map((f) => (
                    <tr key={f.t.id} className="border-b border-ink-100 hover:bg-ink-50 cursor-pointer" onClick={() => openTask(f.t.id)}>
                      <td className="p-2 text-ink-800">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <TaskKey t={f.t} /> <span className="truncate">{f.t.title}</span>
                        </span>
                      </td>
                      <td className="p-2 text-ink-500 whitespace-nowrap">{fromDayNum(f.doneDay!)}</td>
                      <td className={`p-2 tabular-nums ${(f.cycleTime ?? 0) > p85 ? "text-rose-600" : "text-ink-700"}`}>{fa(f.cycleTime ?? 0)} روز</td>
                      <td className="p-2 tabular-nums text-ink-500">{fa(f.leadTime ?? 0)} روز</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {done.length === 0 && <p className="text-[11px] text-ink-400 py-3 text-center">هنوز کاری تمام نشده است.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
