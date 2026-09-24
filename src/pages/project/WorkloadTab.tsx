import { useMemo, useState } from "react";
import { Gauge, Info } from "lucide-react";
import Badge from "../../components/ui/Badge";
import { isDone, isOverdue } from "../../pm/selectors";
import { dayNum, fa, fromDayNum } from "../../pm/jalali";
import type { PMTask } from "../../pm/types";
import { priorityTone, useProjectPage } from "./shared";

const WEEKS = 8;
const FULL_WEEK = 40; // ساعت کاری یک هفته‌ی تمام‌وقت

/**
 * بار کاری تیم (Workload) — مشابه Asana / Monday / ClickUp:
 * ساعت برآوردی هر تسک باز به‌طور یکنواخت روی روزهای آن پخش می‌شود و
 * با ظرفیت هفتگی هر عضو (۴۰ ساعت × درصد تخصیص) مقایسه می‌شود.
 */
export default function WorkloadTab() {
  const { p, refDate, openTask } = useProjectPage();
  const [cell, setCell] = useState<{ member: string; week: number } | null>(null);
  const ref = dayNum(refDate)!;
  const weekStart = (w: number) => ref + w * 7;

  const open = useMemo(() => p.tasks.filter((t) => !t.archived && !isDone(p, t)), [p]);

  /** سهم ساعت یک تسک در یک هفته */
  const share = (t: PMTask, w: number) => {
    const s = dayNum(t.start);
    const e = dayNum(t.due);
    if (s === null || e === null || !t.estHours) return 0;
    const from = Math.max(s, weekStart(w));
    const to = Math.min(e, weekStart(w) + 6);
    if (to < from) return 0;
    return (t.estHours / Math.max(1, e - s + 1)) * (to - from + 1);
  };

  const people = p.members.filter((m) => m.role !== "مشاهده‌گر");
  const names = [...new Set([...people.map((m) => m.name), ...open.map((t) => t.assignee).filter((a) => a && a !== "بدون مسئول")])];
  const rows = names.map((name) => {
    const m = people.find((x) => x.name === name);
    const capacity = m && m.allocation > 0 ? (FULL_WEEK * m.allocation) / 100 : 0;
    const mine = open.filter((t) => t.assignee === name);
    const weeks = Array.from({ length: WEEKS }, (_, w) => {
      const ts = mine.filter((t) => share(t, w) > 0 || (!t.estHours && (dayNum(t.start) ?? 0) <= weekStart(w) + 6 && (dayNum(t.due) ?? 0) >= weekStart(w)));
      return { hours: ts.reduce((a, t) => a + share(t, w), 0), tasks: ts };
    });
    return { name, title: m?.title ?? "—", allocation: m?.allocation ?? 0, capacity, mine, weeks, late: mine.filter((t) => isOverdue(p, t, refDate)).length, noEstimate: mine.filter((t) => !t.estHours).length };
  });
  const unassigned = open.filter((t) => !t.assignee || t.assignee === "بدون مسئول");

  const tone = (h: number, cap: number) => {
    if (!h) return "bg-ink-50 text-ink-300";
    if (!cap) return "bg-ink-100 text-ink-600";
    const r = h / cap;
    return r > 1 ? "bg-rose-100 text-rose-800" : r > 0.75 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
  };
  const sel = cell ? rows.find((r) => r.name === cell.member) : undefined;
  const overloaded = rows.filter((r) => r.capacity && r.weeks.slice(0, 2).some((w) => w.hours > r.capacity));

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-xs text-ink-500 leading-6">
        <Info size={14} className="mt-1 shrink-0" />
        <p>
          ساعت برآوردی هر تسک باز روی روزهای آن پخش شده و با ظرفیت هفتگی عضو (۴۰ ساعت × درصد تخصیص در تب تیم) مقایسه می‌شود.
          <span className="text-emerald-700"> سبز</span> یعنی ظرفیت آزاد، <span className="text-amber-700">زرد</span> نزدیک سقف و <span className="text-rose-700">قرمز</span> بیش از ظرفیت. روی هر خانه بزنید تا تسک‌های آن هفته را ببینید.
        </p>
      </div>
      {overloaded.length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs p-3">
          در دو هفته‌ی پیش رو {overloaded.map((r) => `«${r.name}»`).join("، ")} بیش از ظرفیت کار دارد — بخشی از کار را جابه‌جا یا واگذار کنید.
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-xs min-w-[860px]">
          <thead>
            <tr className="text-ink-400 border-b border-ink-100 text-right">
              <th className="p-3 font-medium">عضو</th>
              <th className="p-3 font-medium">ظرفیت/هفته</th>
              {Array.from({ length: WEEKS }, (_, w) => (
                <th key={w} className="p-2 font-medium text-center whitespace-nowrap">
                  {w === 0 ? "این هفته" : `هفته‌ی ${fa(w + 1)}`}
                  <span className="block text-[10px] text-ink-300 font-normal">{fromDayNum(weekStart(w)).slice(5)}</span>
                </th>
              ))}
              <th className="p-3 font-medium">تسک باز</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-ink-100">
                <td className="p-3">
                  <p className="font-medium text-ink-900">{r.name}</p>
                  <p className="text-[10.5px] text-ink-400">{r.title}</p>
                </td>
                <td className="p-3 text-ink-500 whitespace-nowrap">{r.capacity ? `${fa(r.capacity)} ساعت (${fa(r.allocation)}٪)` : "—"}</td>
                {r.weeks.map((w, i) => (
                  <td key={i} className="p-1">
                    <button
                      onClick={() => setCell(cell?.member === r.name && cell.week === i ? null : { member: r.name, week: i })}
                      className={`w-full rounded-md py-2 text-center tabular-nums transition-shadow ${tone(w.hours, r.capacity)} ${cell?.member === r.name && cell.week === i ? "ring-2 ring-brand-500" : ""}`}
                      title={`${fa(Math.round(w.hours))} ساعت در ${fa(w.tasks.length)} تسک`}
                    >
                      {w.hours ? fa(Math.round(w.hours)) : w.tasks.length ? "·" : "–"}
                    </button>
                  </td>
                ))}
                <td className="p-3 text-ink-600 whitespace-nowrap">
                  {fa(r.mine.length)} باز
                  {r.late > 0 && <span className="text-rose-600">، {fa(r.late)} عقب</span>}
                  {r.noEstimate > 0 && <span className="text-ink-400" title="تسک بدون برآورد ساعت در محاسبه‌ی بار نیامده است">، {fa(r.noEstimate)} بی‌برآورد</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && cell && (
        <div className="card p-4">
          <p className="text-sm font-bold text-ink-900 mb-2 flex items-center gap-1.5">
            <Gauge size={15} className="text-brand-600" /> {sel.name} — {cell.week === 0 ? "این هفته" : `هفته‌ی ${fa(cell.week + 1)}`} ({fa(Math.round(sel.weeks[cell.week].hours))} ساعت{sel.capacity ? ` از ${fa(sel.capacity)}` : ""})
          </p>
          <div className="divide-y divide-ink-100">
            {sel.weeks[cell.week].tasks.map((t) => (
              <button key={t.id} onClick={() => openTask(t.id)} className="w-full flex items-center gap-2 py-2 text-xs text-right hover:bg-ink-50 px-1">
                <span className="flex-1 truncate text-ink-800">{t.title}</span>
                <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
                <span className="text-ink-400 whitespace-nowrap">
                  {t.start} تا {t.due}
                </span>
                <span className="text-ink-600 w-20 text-left">{t.estHours ? `${fa(Math.round(share(t, cell.week)))} ساعت` : "بی‌برآورد"}</span>
              </button>
            ))}
            {sel.weeks[cell.week].tasks.length === 0 && <p className="text-[11px] text-ink-400 py-2">در این هفته کاری ندارد.</p>}
          </div>
        </div>
      )}

      {unassigned.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-700 mb-2">تسک‌های بدون مسئول ({fa(unassigned.length)})</p>
          {unassigned.map((t) => (
            <button key={t.id} onClick={() => openTask(t.id)} className="block text-xs text-brand-700 hover:underline py-0.5">
              {t.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
