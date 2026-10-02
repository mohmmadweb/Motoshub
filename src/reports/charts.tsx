// ---------------------------------------------------------------------------
// نمودارهای SVG خالص و واکنش‌گرا برای گزارش‌ساز — راست‌به‌چپ، ارقام فارسی،
// راهنمای شناور با <title>، سازگار با حالت تیره (متن‌ها با currentColor).
// ---------------------------------------------------------------------------
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { BarChart3 } from "lucide-react";
import { PALETTE, type ChartType, type Row, type ValueFormat } from "./types";
import { formatValue, pivotOf, faNum, type Pivot, type ReportResult } from "./engine";

// ----------------------------------------------------------------- ابزار

/** عرض واقعی ظرف — نمودار با پیکسل واقعی رسم می‌شود تا متن‌ها کش نیایند */
export function useWidth<T extends HTMLElement>(fallback = 560): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth || fallback);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((es) => {
      const cw = Math.round(es[0].contentRect.width);
      if (cw > 0) setW(cw);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, w];
}

function useIsDark() {
  const get = () => typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";
  const [dark, setDark] = useState(get);
  useEffect(() => {
    const mo = new MutationObserver(() => setDark(get()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return dark;
}

/** رنگ i‌ام پالت — رنگ تیره‌ی آخر در حالت تیره روشن می‌شود */
export const colorAt = (i: number, dark = false) => {
  const c = PALETTE[i % PALETTE.length];
  return dark && c === "#0f172a" ? "#94a3b8" : c;
};

const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, Math.max(1, n - 1)) + "…" : s);
const CHAR_W = 6.3;

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) max = min + 1;
  const span = max - min;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

export type ChartCat = { label: string; short?: string };
export type ChartSeries = { label: string; color: string; values: number[]; format: ValueFormat };

function Legend({ items }: { items: { label: string; color: string }[] }) {
  if (items.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-ink-600">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: it.color }} />
          <span className="truncate max-w-[160px]">{it.label}</span>
        </span>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------- میله‌ای

export function BarChart({
  cats,
  series,
  stacked = false,
  orientation = "auto",
  height,
  mini = false,
  onPick,
}: {
  cats: ChartCat[];
  series: ChartSeries[];
  stacked?: boolean;
  orientation?: "auto" | "horizontal" | "vertical";
  height?: number;
  mini?: boolean;
  /** کلیک روی میله ← (اندیس دسته، اندیس سری) */
  onPick?: (ci: number, si: number) => void;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const maxLabel = Math.max(0, ...cats.map((c) => c.label.length));
  const horizontal = orientation === "horizontal" || (orientation === "auto" && (cats.length > 7 || maxLabel > 9 || W < 420));
  const fmt = series[0]?.format ?? "number";

  // دامنه
  const sums = cats.map((_, i) => series.reduce((s, x) => s + Math.max(0, x.values[i] || 0), 0));
  const negs = cats.map((_, i) => series.reduce((s, x) => s + Math.min(0, x.values[i] || 0), 0));
  const flat = series.flatMap((s) => s.values);
  const vMax = stacked ? Math.max(0, ...sums) : Math.max(0, ...flat);
  const vMin = stacked ? Math.min(0, ...negs) : Math.min(0, ...flat);
  const ticks = niceTicks(vMin, vMax, horizontal ? (W < 420 ? 3 : 4) : 4);
  const t0 = ticks[0];
  const t1 = ticks[ticks.length - 1];

  if (horizontal) {
    const k = stacked ? 1 : series.length;
    const rowH = Math.max(mini ? 20 : 24, k * (mini ? 9 : 11) + 10);
    const labelW = Math.min(Math.max(70, maxLabel * CHAR_W + 10), Math.round(W * (W < 420 ? 0.36 : 0.3)), 200);
    const padL = 8;
    const valueRoom = stacked || k === 1 ? 54 : 8;
    const plotR = W - labelW - 8;
    const plotL = padL + valueRoom;
    const plotW = Math.max(40, plotR - plotL);
    const H = cats.length * rowH + 26;
    // RTL: صفر سمت راست، مقادیر مثبت به چپ
    const x = (v: number) => plotR - ((v - t0) / (t1 - t0 || 1)) * plotW;
    const x0 = x(0);
    const maxChars = Math.floor((labelW - 6) / CHAR_W);
    return (
      <div ref={ref} className="w-full">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} direction="rtl" className="block text-ink-500" role="img" aria-label="نمودار میله‌ای">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={0} y2={H - 22} stroke="currentColor" strokeOpacity={t === 0 ? 0.35 : 0.12} />
              <text x={x(t)} y={H - 8} fontSize={10} fill="currentColor" textAnchor="middle">
                {formatValue(t, fmt, true)}
              </text>
            </g>
          ))}
          {cats.map((c, i) => {
            const y = i * rowH;
            let accPos = 0;
            let accNeg = 0;
            const total = sums[i] + negs[i];
            return (
              <g key={i}>
                <text x={W - 4} y={y + rowH / 2 + 4} fontSize={11} fill="currentColor" className={`text-ink-700 ${onPick ? "cursor-pointer" : ""}`} textAnchor="start" onClick={onPick ? () => onPick(i, -1) : undefined}>
                  <title>{c.label}</title>
                  {trunc(c.label, maxChars)}
                </text>
                {series.map((s, si) => {
                  const v = s.values[i] || 0;
                  let a: number;
                  let b: number;
                  let by: number;
                  let bh: number;
                  if (stacked) {
                    if (v >= 0) {
                      a = x(accPos);
                      b = x(accPos + v);
                      accPos += v;
                    } else {
                      a = x(accNeg);
                      b = x(accNeg + v);
                      accNeg += v;
                    }
                    by = y + 5;
                    bh = rowH - 10;
                  } else {
                    a = x0;
                    b = x(v);
                    bh = (rowH - 10) / k;
                    by = y + 5 + si * bh;
                  }
                  const left = Math.min(a, b);
                  const wd = Math.max(v === 0 ? 0 : 1.5, Math.abs(a - b));
                  return (
                    <rect key={si} x={left} y={by} width={wd} height={Math.max(2, bh - (stacked ? 0 : 1))} rx={2} fill={s.color} onClick={onPick ? () => onPick(i, si) : undefined} className={onPick ? "cursor-pointer hover:opacity-80" : undefined}>
                      <title>{`${c.label}${series.length > 1 ? ` · ${s.label}` : ""}: ${formatValue(v, s.format)}`}</title>
                    </rect>
                  );
                })}
                {(stacked || k === 1) && (
                  <text x={x(stacked ? sums[i] : series[0].values[i] || 0) - 4} y={y + rowH / 2 + 4} fontSize={10.5} fill="currentColor" className="text-ink-700" textAnchor="start">
                    {formatValue(stacked ? total : series[0].values[i] || 0, fmt, true)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {!mini && <Legend items={series} />}
      </div>
    );
  }

  // عمودی (ترتیب دسته‌ها راست‌به‌چپ)
  const H = height ?? (mini ? 170 : 280);
  const axisW = Math.max(34, Math.max(...ticks.map((t) => formatValue(t, fmt, true).length)) * 6.5 + 8);
  const padT = 14;
  const padB = 30;
  const plotW = W - axisW - 6;
  const band = plotW / Math.max(1, cats.length);
  const plotH = H - padT - padB;
  const y = (v: number) => padT + plotH - ((v - t0) / (t1 - t0 || 1)) * plotH;
  const y0 = y(0);
  const k = stacked ? 1 : series.length;
  const barW = Math.min(46, band * 0.7);
  const cx = (i: number) => W - axisW - (i + 0.5) * band;
  const every = Math.max(1, Math.ceil(cats.length / Math.max(1, Math.floor(plotW / 58))));
  return (
    <div ref={ref} className="w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} direction="rtl" className="block text-ink-500" role="img" aria-label="نمودار ستونی">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={6} x2={W - axisW} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={t === 0 ? 0.35 : 0.12} />
            <text x={W - 2} y={y(t) + 3.5} fontSize={10} fill="currentColor" textAnchor="start">
              {formatValue(t, fmt, true)}
            </text>
          </g>
        ))}
        {cats.map((c, i) => {
          let accPos = 0;
          let accNeg = 0;
          const total = sums[i] + negs[i];
          return (
            <g key={i}>
              {series.map((s, si) => {
                const v = s.values[i] || 0;
                let top: number;
                let bot: number;
                let bx: number;
                let bw: number;
                if (stacked) {
                  if (v >= 0) {
                    bot = y(accPos);
                    top = y(accPos + v);
                    accPos += v;
                  } else {
                    top = y(accNeg);
                    bot = y(accNeg + v);
                    accNeg += v;
                  }
                  bw = barW;
                  bx = cx(i) - barW / 2;
                } else {
                  top = Math.min(y(v), y0);
                  bot = Math.max(y(v), y0);
                  bw = barW / k;
                  bx = cx(i) + barW / 2 - (si + 1) * bw;
                }
                return (
                  <rect key={si} x={bx + 0.5} y={top} width={Math.max(1, bw - 1)} height={Math.max(v === 0 ? 0 : 1.5, bot - top)} rx={2} fill={s.color} onClick={onPick ? () => onPick(i, si) : undefined} className={onPick ? "cursor-pointer hover:opacity-80" : undefined}>
                    <title>{`${c.label}${series.length > 1 ? ` · ${s.label}` : ""}: ${formatValue(v, s.format)}`}</title>
                  </rect>
                );
              })}
              {!mini && (stacked || k === 1) && cats.length <= 16 && (
                <text x={cx(i)} y={y(stacked ? sums[i] : Math.max(0, series[0].values[i] || 0)) - 4} fontSize={10} fill="currentColor" className="text-ink-700" textAnchor="middle">
                  {formatValue(stacked ? total : series[0].values[i] || 0, fmt, true)}
                </text>
              )}
              {i % every === 0 && (
                <text x={cx(i)} y={H - padB + 15} fontSize={10.5} fill="currentColor" textAnchor="middle">
                  <title>{c.label}</title>
                  {trunc(c.short ?? c.label, Math.max(4, Math.floor((band * every) / CHAR_W)))}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {!mini && <Legend items={series} />}
    </div>
  );
}

// ----------------------------------------------------------------- خطی

export function LineChart({ cats, series, height, mini = false, onPick }: { cats: ChartCat[]; series: ChartSeries[]; height?: number; mini?: boolean; onPick?: (ci: number, si: number) => void }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const fmt = series[0]?.format ?? "number";
  const flat = series.flatMap((s) => s.values);
  const ticks = niceTicks(Math.min(0, ...flat), Math.max(0, ...flat), 4);
  const t0 = ticks[0];
  const t1 = ticks[ticks.length - 1];
  const H = height ?? (mini ? 170 : 280);
  const axisW = Math.max(34, Math.max(...ticks.map((t) => formatValue(t, fmt, true).length)) * 6.5 + 8);
  const padT = 14;
  const padB = 30;
  const plotW = W - axisW - 16;
  const plotH = H - padT - padB;
  const n = cats.length;
  const cx = (i: number) => (n <= 1 ? W - axisW - plotW / 2 : W - axisW - 8 - (i / (n - 1)) * plotW);
  const y = (v: number) => padT + plotH - ((v - t0) / (t1 - t0 || 1)) * plotH;
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 58))));
  const single = series.length === 1;
  return (
    <div ref={ref} className="w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} direction="rtl" className="block text-ink-500" role="img" aria-label="نمودار روند">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={6} x2={W - axisW} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={t === 0 ? 0.35 : 0.12} />
            <text x={W - 2} y={y(t) + 3.5} fontSize={10} fill="currentColor" textAnchor="start">
              {formatValue(t, fmt, true)}
            </text>
          </g>
        ))}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => `${cx(i).toFixed(1)},${y(v || 0).toFixed(1)}`);
          return (
            <g key={si}>
              {single && n > 1 && <polygon points={`${cx(0)},${y(0)} ${pts.join(" ")} ${cx(n - 1)},${y(0)}`} fill={s.color} fillOpacity={0.1} />}
              <polyline points={pts.join(" ")} fill="none" stroke={s.color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
              {(n <= 40 || mini === false) &&
                s.values.map((v, i) => (
                  <circle key={i} cx={cx(i)} cy={y(v || 0)} r={n > 24 ? 2.2 : 3.4} fill="var(--color-ink-50, #fff)" stroke={s.color} strokeWidth={2} onClick={onPick ? () => onPick(i, si) : undefined} className={onPick ? "cursor-pointer" : undefined}>
                    <title>{`${cats[i].label}${series.length > 1 ? ` · ${s.label}` : ""}: ${formatValue(v || 0, s.format)}`}</title>
                  </circle>
                ))}
            </g>
          );
        })}
        {cats.map((c, i) =>
          i % every === 0 ? (
            <text key={i} x={cx(i)} y={H - padB + 16} fontSize={10.5} fill="currentColor" textAnchor="middle">
              <title>{c.label}</title>
              {trunc(c.short ?? c.label, Math.max(4, Math.floor(((plotW / Math.max(1, n - 1)) * every) / CHAR_W)))}
            </text>
          ) : null
        )}
      </svg>
      {!mini && <Legend items={series} />}
    </div>
  );
}

// ----------------------------------------------------------------- دایره‌ای / حلقه‌ای

export function PieChart({ slices, donut = false, format = "number", mini = false, onPick }: { slices: { label: string; value: number; color: string; key?: string }[]; donut?: boolean; format?: ValueFormat; mini?: boolean; onPick?: (key: string) => void }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const data = slices.filter((s) => s.value > 0);
  const total = data.reduce((s, x) => s + x.value, 0);
  const column = !mini && W < 480;
  const size = mini ? Math.min(112, W * 0.42) : Math.min(220, column ? W - 8 : W * 0.45);
  const r = size / 2 - 4;
  const c = size / 2;
  const inner = donut ? r * 0.6 : 0;
  let a0 = -Math.PI / 2;
  const arc = (from: number, to: number) => {
    const large = to - from > Math.PI ? 1 : 0;
    const p = (ang: number, rad: number) => `${(c + rad * Math.cos(ang)).toFixed(2)} ${(c + rad * Math.sin(ang)).toFixed(2)}`;
    if (!donut) return `M ${c} ${c} L ${p(from, r)} A ${r} ${r} 0 ${large} 1 ${p(to, r)} Z`;
    return `M ${p(from, r)} A ${r} ${r} 0 ${large} 1 ${p(to, r)} L ${p(to, inner)} A ${inner} ${inner} 0 ${large} 0 ${p(from, inner)} Z`;
  };
  return (
    <div ref={ref} className={`w-full flex ${column ? "flex-col items-center" : "items-center"} ${mini ? "gap-3" : "gap-4"}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 text-ink-900" role="img" aria-label={donut ? "نمودار حلقه‌ای" : "نمودار دایره‌ای"}>
        {data.length === 1 ? (
          <g>
            <circle cx={c} cy={c} r={r} fill={data[0].color} onClick={onPick && data[0].key ? () => onPick(data[0].key!) : undefined} className={onPick ? "cursor-pointer" : undefined} />
            {donut && <circle cx={c} cy={c} r={inner} fill="var(--color-ink-50, #fff)" />}
            <title>{`${data[0].label}: ${formatValue(data[0].value, format)} (۱۰۰٪)`}</title>
          </g>
        ) : (
          data.map((s, i) => {
            const a1 = a0 + (s.value / total) * Math.PI * 2;
            const d = arc(a0, a1);
            a0 = a1;
            return (
              <path key={i} d={d} fill={s.color} stroke="var(--color-ink-50, #fff)" strokeWidth={1.5} onClick={onPick && s.key ? () => onPick(s.key!) : undefined} className={onPick ? "cursor-pointer hover:opacity-80" : undefined}>
                <title>{`${s.label}: ${formatValue(s.value, format)} (${faNum((s.value / total) * 100)}٪)`}</title>
              </path>
            );
          })
        )}
        {donut && (
          <>
            <text x={c} y={c - 2} textAnchor="middle" fontSize={mini ? 14 : 17} fontWeight={700} fill="currentColor">
              {formatValue(total, format, true)}
            </text>
            <text x={c} y={c + 15} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
              جمع
            </text>
          </>
        )}
      </svg>
      <ul className={`flex-1 min-w-0 w-full space-y-1.5 ${mini ? "text-[11px]" : "text-xs"}`}>
        {data.slice(0, mini ? 5 : 12).map((s, i) => (
          <li key={i} className={`flex items-center gap-2 min-w-0 ${onPick && s.key ? "cursor-pointer hover:bg-ink-50 rounded" : ""}`} onClick={onPick && s.key ? () => onPick(s.key!) : undefined}>
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="truncate text-ink-700 flex-1" title={s.label}>
              {s.label}
            </span>
            <span className="text-ink-900 font-medium shrink-0">{formatValue(s.value, format, true)}</span>
            <span className="text-ink-400 shrink-0 w-10 text-left">{faNum((s.value / total) * 100)}٪</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ----------------------------------------------------------------- کارت شاخص

export function KpiTiles({ items, mini = false, onPick }: { items: { label: string; value: number; format: ValueFormat; color?: string }[]; mini?: boolean; onPick?: () => void }) {
  return (
    <div className={`grid gap-3 ${items.length === 1 ? "grid-cols-1" : mini ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
      {items.map((k, i) => (
        <div key={i} onClick={onPick} className={`rounded-xl border border-ink-200 ${mini ? "p-2.5" : "p-3.5"} min-w-0 relative overflow-hidden ${onPick ? "cursor-pointer hover:border-brand-300" : ""}`}>
          <span className="absolute inset-y-0 right-0 w-1" style={{ background: k.color }} />
          <p className="text-[11px] text-ink-500 truncate" title={k.label}>
            {k.label}
          </p>
          <p className={`${mini ? "text-base" : "text-2xl"} font-bold text-ink-900 mt-1 truncate`} title={formatValue(k.value, k.format)}>
            {formatValue(k.value, k.format, k.format === "rial")}
          </p>
          {k.format === "rial" && !mini && <p className="text-[10px] text-ink-400 mt-0.5">ریال</p>}
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------- جدول متقاطع (نقشه‌ی حرارتی)

export function PivotTable({ pivot, rowLabel, colLabel, mini = false, onCell }: { pivot: Pivot; rowLabel: string; colLabel: string; mini?: boolean; onCell?: (ri: number, ci: number) => void }) {
  const heat = (v: number) => (pivot.max > 0 ? v / pivot.max : 0);
  const rows = mini ? pivot.rowCats.slice(0, 6) : pivot.rowCats;
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className={`w-full border-separate border-spacing-0.5 ${mini ? "text-[10.5px]" : "text-xs"}`}>
        <thead>
          <tr>
            <th className="sticky right-0 bg-white text-right font-medium text-ink-500 px-2 py-1.5 min-w-[96px]">
              {rowLabel} <span className="text-ink-300">\</span> {colLabel}
            </th>
            {pivot.colCats.map((c) => (
              <th key={c.key} className="font-medium text-ink-600 px-2 py-1.5 text-center whitespace-nowrap" title={c.label}>
                {trunc(c.short ?? c.label, 14)}
              </th>
            ))}
            <th className="font-bold text-ink-700 px-2 py-1.5 text-center">جمع</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r.key}>
              <th className="sticky right-0 bg-white text-right font-medium text-ink-700 px-2 py-1.5 max-w-[180px] truncate" title={r.label}>
                {r.label}
              </th>
              {pivot.cells[ri].map((v, ci) => {
                const h = heat(v);
                return (
                  <td
                    key={ci}
                    onClick={onCell && v ? () => onCell(ri, ci) : undefined}
                    className={`text-center px-2 py-1.5 rounded ${h > 0.55 ? "text-white font-medium" : "text-ink-800"} ${onCell && v ? "cursor-pointer hover:ring-2 hover:ring-brand-300" : ""}`}
                    style={{ background: v ? `rgba(31,79,153,${(0.08 + h * 0.77).toFixed(2)})` : undefined }}
                    title={`${r.label} · ${pivot.colCats[ci].label}: ${formatValue(v, pivot.format)}`}
                  >
                    {v ? formatValue(v, pivot.format, true) : <span className="text-ink-300">·</span>}
                  </td>
                );
              })}
              <td onClick={onCell ? () => onCell(ri, -1) : undefined} className={`text-center px-2 py-1.5 font-bold text-ink-900 bg-ink-50 rounded ${onCell ? "cursor-pointer hover:ring-2 hover:ring-brand-300" : ""}`}>{formatValue(pivot.rowTotals[ri], pivot.format, true)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th className="sticky right-0 bg-white text-right font-bold text-ink-700 px-2 py-1.5">جمع</th>
            {pivot.colTotals.map((v, i) => (
              <td key={i} onClick={onCell ? () => onCell(-1, i) : undefined} className={`text-center px-2 py-1.5 font-bold text-ink-900 bg-ink-50 rounded ${onCell ? "cursor-pointer hover:ring-2 hover:ring-brand-300" : ""}`}>
                {formatValue(v, pivot.format, true)}
              </td>
            ))}
            <td className="text-center px-2 py-1.5 font-bold text-white bg-navy-800 rounded">{formatValue(pivot.grand, pivot.format, true)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ----------------------------------------------------------------- جدول نتیجه

export function ResultTable({ result, maxRows, onGroup }: { result: ReportResult; maxRows?: number; onGroup?: (gi: number, ci?: number) => void }) {
  const { dims, measures, groups } = result;
  const two = dims.length === 2;
  const rows = maxRows ? groups.slice(0, maxRows) : groups;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-ink-200 text-ink-500">
            {dims.map((d) => (
              <th key={d.key} className="text-right font-medium px-2.5 py-2 whitespace-nowrap">
                {d.label}
              </th>
            ))}
            {measures.map((m) => (
              <th key={m.id} className="text-left font-medium px-2.5 py-2 whitespace-nowrap">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {!dims.length && (
            <tr>
              {result.totals.map((v, i) => (
                <td key={i} className="text-left px-2.5 py-2 font-medium text-ink-900">
                  {formatValue(v, measures[i].format)}
                </td>
              ))}
            </tr>
          )}
          {dims.length > 0 &&
            rows.map((g) =>
              two ? (
                g.children
                  .filter((c) => c.rows.length)
                  .map((c, ci, arr) => (
                    <tr key={`${g.key}-${c.key}`} className={`hover:bg-ink-50 ${onGroup ? "cursor-pointer" : ""}`} onClick={onGroup ? () => onGroup(groups.indexOf(g), g.children.indexOf(c)) : undefined}>
                      {ci === 0 && (
                        <td
                          rowSpan={arr.length}
                          className="px-2.5 py-2 align-top font-medium text-ink-800 max-w-[220px]"
                          onClick={
                            onGroup
                              ? (e) => {
                                  e.stopPropagation();
                                  onGroup(groups.indexOf(g));
                                }
                              : undefined
                          }
                        >
                          {g.label}
                        </td>
                      )}
                      <td className="px-2.5 py-2 text-ink-700">{c.label}</td>
                      {c.values.map((v, i) => (
                        <td key={i} className="text-left px-2.5 py-2 text-ink-900 whitespace-nowrap">
                          {formatValue(v, measures[i].format)}
                        </td>
                      ))}
                    </tr>
                  ))
              ) : (
                <tr key={g.key} className={`hover:bg-ink-50 ${onGroup ? "cursor-pointer" : ""}`} onClick={onGroup ? () => onGroup(groups.indexOf(g)) : undefined}>
                  <td className="px-2.5 py-2 text-ink-800 max-w-[260px]">{g.label}</td>
                  {g.values.map((v, i) => (
                    <td key={i} className="text-left px-2.5 py-2 text-ink-900 whitespace-nowrap">
                      {formatValue(v, measures[i].format)}
                    </td>
                  ))}
                </tr>
              )
            )}
        </tbody>
        {dims.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-ink-200 font-bold text-ink-900">
              <td className="px-2.5 py-2" colSpan={dims.length}>
                جمع کل
              </td>
              {result.totals.map((v, i) => (
                <td key={i} className="text-left px-2.5 py-2 whitespace-nowrap">
                  {formatValue(v, measures[i].format)}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
      {maxRows && groups.length > maxRows && <p className="text-[11px] text-ink-400 px-2.5 pt-2">و {faNum(groups.length - maxRows)} ردیف دیگر…</p>}
    </div>
  );
}

// ----------------------------------------------------------------- توزیع‌گر

function Note({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-10 text-ink-400">
      <BarChart3 size={26} className="opacity-60" />
      <p className="text-xs max-w-xs">{children}</p>
    </div>
  );
}

/** نمودارِ مناسبِ یک نتیجه بر اساس نوع نمایش */
export type ChartPick = { title: string; rows: Row[] };

export function ReportChart({ result, chart, mini = false, height, onPick }: { result: ReportResult; chart: ChartType; mini?: boolean; height?: number; onPick?: (p: ChartPick) => void }) {
  const dark = useIsDark();
  if (result.rowCount === 0) return <Note>هیچ داده‌ای با این فیلترها و بازه‌ی زمانی پیدا نشد.</Note>;
  const { dims, measures, groups } = result;
  const two = dims.length === 2;
  const pickGroup = (gi: number, ci?: number) => {
    const g = result.groups[gi];
    if (!g || !onPick) return;
    const c = ci !== undefined && ci >= 0 ? g.children[ci] : undefined;
    onPick({ title: c ? `${g.label} · ${c.label}` : g.label, rows: c ? c.rows : g.rows });
  };
  const pickAll = onPick ? () => onPick({ title: "همه‌ی ردیف‌های گزارش", rows: result.filtered }) : undefined;

  if (chart === "kpi") {
    return <KpiTiles mini={mini} onPick={pickAll} items={measures.map((m, i) => ({ label: m.label, value: result.totals[i], format: m.format, color: colorAt(i, dark) }))} />;
  }
  if (chart === "table") return <ResultTable result={result} maxRows={mini ? 6 : undefined} onGroup={onPick && dims.length ? pickGroup : undefined} />;
  if (chart === "pivot") {
    const pv = pivotOf(result);
    if (!pv) return <Note>جدول متقاطع به دو بُعد نیاز دارد — «تفکیک بر اساس» را هم انتخاب کنید.</Note>;
    const onCell = onPick
      ? (ri: number, ci: number) => {
          if (ri >= 0) return pickGroup(ri, ci >= 0 ? ci : undefined);
          const s = result.series[ci];
          if (s) onPick({ title: `${dims[1].label}: ${s.label}`, rows: [...new Set(result.groups.flatMap((g) => g.children[ci]?.rows ?? []))] });
        }
      : undefined;
    return <PivotTable pivot={pv} rowLabel={dims[0].label} colLabel={dims[1].label} mini={mini} onCell={onCell} />;
  }

  // ---- دسته‌ها و سری‌ها
  const timeAxis = dims[0]?.kind === "date";
  const gs = !mini ? groups : timeAxis || chart === "line" ? groups.slice(-40) : groups.slice(0, 5);
  let cats: ChartCat[];
  let series: ChartSeries[];
  if (!dims.length) {
    cats = measures.map((m) => ({ label: m.label }));
    series = [{ label: "مقدار", color: colorAt(0, dark), values: result.totals, format: measures[0].format }];
  } else if (two) {
    cats = gs.map((g) => ({ label: g.label, short: g.short }));
    series = result.series.map((s, si) => ({ label: s.label, color: colorAt(si, dark), values: gs.map((g) => g.children[si]?.values[0] ?? 0), format: measures[0].format }));
  } else {
    cats = gs.map((g) => ({ label: g.label, short: g.short }));
    series = measures.map((m, mi) => ({ label: m.label, color: colorAt(mi, dark), values: gs.map((g) => g.values[mi]), format: m.format }));
  }

  if (chart === "pie" || chart === "donut") {
    let slices: { label: string; value: number; color: string; key?: string }[];
    if (!dims.length) slices = measures.map((m, i) => ({ label: m.label, value: result.totals[i], color: colorAt(i, dark), key: `__all${i}` }));
    else {
      const sorted = [...groups].sort((a, b) => b.values[0] - a.values[0]);
      const top = sorted.slice(0, 7);
      const rest = sorted.slice(7);
      slices = top.map((g, i) => ({ label: g.label, value: g.values[0], color: colorAt(i, dark), key: g.key }));
      if (rest.length) slices.push({ label: `سایر (${faNum(rest.length)})`, value: rest.reduce((s, g) => s + g.values[0], 0), color: "#94a3b8", key: "__pie_rest" });
      const pieRest = rest;
      const onSlice = onPick
        ? (key: string) => {
            if (key === "__pie_rest") onPick({ title: "سایر", rows: [...new Set(pieRest.flatMap((g) => g.rows))] });
            else pickGroup(result.groups.findIndex((g) => g.key === key));
          }
        : undefined;
      return <PieChart slices={slices} donut={chart === "donut"} format={measures[0].format} mini={mini} onPick={onSlice} />;
    }
    return <PieChart slices={slices} donut={chart === "donut"} format={measures[0].format} mini={mini} onPick={pickAll ? () => pickAll() : undefined} />;
  }
  // اندیس دسته در نمودار ← اندیس گروه در نتیجه (در حالت کوچک ممکن است بخشی از گروه‌ها نمایش داده شود)
  const onBar = onPick && dims.length ? (ci: number, si: number) => pickGroup(result.groups.indexOf(gs[ci]), two && si >= 0 ? si : undefined) : pickAll ? () => pickAll() : undefined;
  if (chart === "line") {
    if (cats.length < 2) return <BarChart cats={cats} series={series} mini={mini} height={height} onPick={onBar} />;
    return <LineChart cats={cats} series={series} mini={mini} height={height} onPick={onBar} />;
  }
  return <BarChart cats={cats} series={series} stacked={chart === "stackedBar"} orientation={timeAxis ? "vertical" : "auto"} mini={mini} height={height} onPick={onBar} />;
}
