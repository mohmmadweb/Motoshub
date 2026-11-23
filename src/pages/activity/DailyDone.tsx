// ---------------------------------------------------------------------------
// «انجام‌شده روزانه» (میزیتو): کارهایی که هر روز انجام شده‌اند، در همه‌ی پروژه‌ها — مشتق از
// تاریخچه‌ی وضعیت کار (TaskStatusHistory / ProjectActivityLog)، با چاپ بدون پوسته.
// ---------------------------------------------------------------------------
import { useMemo, useRef, useState } from "react";
import { Printer } from "lucide-react";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useTenancy } from "../../context/TenancyContext";
import { transitionsByTask } from "../../pm/flow";
import { fa, fromDayNum, dayNum, weekDayNames, weekdayOf } from "../../pm/jalali";
import { assigneesOf } from "../../pm/rules";
import { printNode } from "../../pm/print";
import { taskHref } from "../../pm/desk";
import { Link } from "react-router-dom";

export default function DailyDone() {
  const pm = useProjectsPM();
  const { actingUser } = useTenancy();
  const me = actingUser.name;
  const [days, setDays] = useState(7);
  const ref = useRef<HTMLDivElement>(null);
  const today = dayNum(pm.refDate)!;
  const byDay = useMemo(() => {
    const out = new Map<number, { pid: string; project: string; t: (typeof pm.projects)[number]["tasks"][number] }[]>();
    pm.projects.forEach((p) => {
      const trs = transitionsByTask(p);
      p.tasks.forEach((t) => {
        if (!assigneesOf(t).includes(me)) return;
        (trs.get(t.id) ?? []).filter((x) => x.to === "done").forEach((x) => {
          if (x.day < today - days + 1 || x.day > today) return;
          out.set(x.day, [...(out.get(x.day) ?? []), { pid: p.meta.id, project: p.meta.name, t }]);
        });
      });
    });
    return [...out.entries()].sort((a, b) => b[0] - a[0]);
  }, [pm, me, today, days]);
  const total = byDay.reduce((s, [, xs]) => s + xs.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <select className="input-field !w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="بازه">
          {[1, 7, 14, 30].map((n) => (
            <option key={n} value={n}>
              {n === 1 ? "امروز" : `${fa(n)} روز گذشته`}
            </option>
          ))}
        </select>
        <span className="text-[13px] text-ink-500">{fa(total)} کار انجام‌شده</span>
        <Button size="sm" className="mr-auto" icon={<Printer size={14} />} onClick={() => printNode(ref.current, `انجام‌شده روزانه — ${me}`)}>
          چاپ
        </Button>
      </div>
      <div ref={ref} className="card">
        <p className="print-only hidden px-4 pt-3 font-bold">انجام‌شده روزانه — {me}</p>
        {byDay.map(([d, xs]) => (
          <section key={d} className="border-b border-[var(--color-border)] last:border-b-0">
            <h3 className="px-4 py-2 bg-ink-50 text-[13px] font-bold text-ink-800">
              {weekDayNames[weekdayOf(fromDayNum(d))]} {fromDayNum(d)} · {fa(xs.length)} کار
            </h3>
            <ul>
              {xs.map((x) => (
                <li key={`${x.pid}-${x.t.id}`} className="px-4 py-2 border-t border-[var(--color-border)] text-sm flex items-center gap-2">
                  <Link to={taskHref(x.pid, x.t)} className="flex-1 text-ink-900 hover:text-teal-700">
                    {x.t.title}
                  </Link>
                  <span className="text-[12.5px] text-ink-500">{x.project}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {byDay.length === 0 && <EmptyState compact title="در این بازه کاری انجام نشده است" description="کارهایی که به «انجام‌شده» می‌روند این‌جا روز به روز فهرست می‌شوند." />}
      </div>
    </div>
  );
}
