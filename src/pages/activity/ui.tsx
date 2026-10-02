// اجزای نمایشی کوچک: نشان منبع، ناوبری دوره، نمودار میله‌ای و دایره‌ای (SVG خالص)
import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, GitMerge, GitPullRequest, Hourglass, PenLine, SquareKanban, Timer } from "lucide-react";
import { fa } from "../../pm/jalali";
import { fh, sourceLabel, type EntrySource, type Period } from "../../timesheet/types";

const sourceStyle: Record<EntrySource, { icon: typeof Timer; cls: string }> = {
  manual: { icon: PenLine, cls: "bg-ink-100 text-ink-600" },
  gitlab: { icon: GitMerge, cls: "bg-amber-50 text-amber-700" },
  github: { icon: GitPullRequest, cls: "bg-ink-100 text-ink-800" },
  jira: { icon: SquareKanban, cls: "bg-brand-50 text-brand-700" },
  clockify: { icon: Clock3, cls: "bg-sky-50 text-sky-700" },
  toggl: { icon: Hourglass, cls: "bg-rose-50 text-rose-600" },
  calendar: { icon: CalendarDays, cls: "bg-emerald-50 text-emerald-700" },
  timer: { icon: Timer, cls: "bg-amber-50 text-amber-700" },
};

export function SourceIcon({ source, size = 22 }: { source: EntrySource; size?: number }) {
  const s = sourceStyle[source];
  return (
    <span title={sourceLabel[source]} aria-label={sourceLabel[source]} className={`inline-flex items-center justify-center rounded-md shrink-0 ${s.cls}`} style={{ width: size, height: size }}>
      <s.icon size={Math.round(size * 0.6)} />
    </span>
  );
}

export function PeriodNav({ period, onShift, canNext = true }: { period: Period; onShift: (n: number) => void; canNext?: boolean }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={() => onShift(-1)} className="w-8 h-8 rounded-lg border border-ink-200 hover:bg-ink-50 flex items-center justify-center" aria-label="دوره‌ی قبل">
        <ChevronRight size={15} />
      </button>
      <div className="text-center px-1 min-w-[112px]">
        <p className="text-[13px] font-bold text-ink-900 leading-tight">{period.label}</p>
        <p className="text-[10px] text-ink-400 leading-tight">
          {period.start} تا {period.end}
        </p>
      </div>
      <button onClick={() => onShift(1)} disabled={!canNext} className="w-8 h-8 rounded-lg border border-ink-200 hover:bg-ink-50 flex items-center justify-center disabled:opacity-40" aria-label="دوره‌ی بعد">
        <ChevronLeft size={15} />
      </button>
    </div>
  );
}

export const palette = ["#1f4f99", "#0d9488", "#d97706", "#db2777", "#7c3aed", "#16a34a", "#dc2626", "#0891b2", "#64748b", "#a16207"];

export type Datum = { label: string; value: number; color?: string };

/** نمودار میله‌ای افقی — برچسب‌های فارسی بلند در عرض کم هم خوانا می‌مانند */
export function HBarChart({ data, unit = "ساعت" }: { data: Datum[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.label + i}>
          <div className="flex items-center justify-between gap-2 text-xs mb-1">
            <span className="text-ink-700 truncate">{d.label}</span>
            <span className="text-ink-500 shrink-0 tabular-nums">
              {fh(d.value)} {unit}
            </span>
          </div>
          <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="w-full h-2.5 block" role="img" aria-label={`${d.label}: ${fh(d.value)} ${unit}`}>
            <rect x="0" y="0" width="100" height="6" rx="3" fill="var(--color-ink-100)" />
            <rect x={100 - (d.value / max) * 100} y="0" width={(d.value / max) * 100} height="6" rx="3" fill={d.color ?? palette[i % palette.length]} />
          </svg>
        </div>
      ))}
    </div>
  );
}

/** نمودار ستونی روزانه با خط ساعت موظف */
export function DayColumns({ data, expected }: { data: { label: string; value: number; off?: boolean }[]; expected: number[] }) {
  const max = Math.max(1, ...data.map((d) => d.value), ...expected);
  const w = 100 / Math.max(1, data.length);
  return (
    <div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-40 block" role="img" aria-label="ساعت کار روزانه">
        {data.map((d, i) => {
          const h = (d.value / max) * 38;
          const e = (expected[i] / max) * 38;
          const x = 100 - (i + 1) * w; // راست‌به‌چپ
          return (
            <g key={i}>
              {d.off && <rect x={x} y={0} width={w} height={40} fill="var(--color-ink-100)" opacity={0.6} />}
              <rect x={x + w * 0.18} y={40 - h} width={w * 0.64} height={h} rx={0.6} fill={d.value >= expected[i] ? "#0d9488" : "#d97706"}>
                <title>{`${d.label}: ${fh(d.value)} ساعت`}</title>
              </rect>
              {expected[i] > 0 && <line x1={x} x2={x + w} y1={40 - e} y2={40 - e} stroke="var(--color-ink-400)" strokeWidth={0.3} strokeDasharray="1 0.6" />}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-ink-400 mt-1">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/** نمودار حلقه‌ای */
export function Donut({ data, unit = "ساعت" }: { data: Datum[]; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const R = 15.9155; // محیط = ۱۰۰
  let acc = 0;
  const shown = hover !== null ? data[hover] : null;
  return (
    <div className="flex items-center gap-4 flex-wrap justify-center">
      <svg viewBox="0 0 42 42" className="w-40 h-40 shrink-0" role="img" aria-label="سهم هر بخش">
        <circle cx="21" cy="21" r={R} fill="none" stroke="var(--color-ink-100)" strokeWidth="6" />
        {data.map((d, i) => {
          const pct = (d.value / total) * 100;
          const off = 25 - acc;
          acc += pct;
          return (
            <circle
              key={i}
              cx="21"
              cy="21"
              r={R}
              fill="none"
              stroke={d.color ?? palette[i % palette.length]}
              strokeWidth={hover === i ? 7.5 : 6}
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeDashoffset={off}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{`${d.label}: ${fh(d.value)} ${unit}`}</title>
            </circle>
          );
        })}
        <text x="21" y="20" textAnchor="middle" fontSize="5" fontWeight="700" fill="var(--color-ink-900)">
          {fh(shown ? shown.value : total)}
        </text>
        <text x="21" y="26" textAnchor="middle" fontSize="2.6" fill="var(--color-ink-500)">
          {shown ? `${fa(Math.round((shown.value / total) * 100))}٪` : unit}
        </text>
      </svg>
      <ul className="space-y-1.5 text-xs min-w-0 flex-1">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2 min-w-0" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color ?? palette[i % palette.length] }} />
            <span className="truncate text-ink-700 flex-1">{d.label}</span>
            <span className="text-ink-500 shrink-0">{fa(Math.round((d.value / total) * 100))}٪</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
