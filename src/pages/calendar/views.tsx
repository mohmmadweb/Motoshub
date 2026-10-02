// ---------------------------------------------------------------------------
// نماهای تقویم یکپارچه: شبکه‌ی زمانی (روز/هفته/کنار هم)، ماه، فهرست، ماه کوچک،
// ماتریس آزاد/مشغول و پاپ‌اوور جزئیات.
// ---------------------------------------------------------------------------
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ExternalLink, Lock, Pencil, Trash2, X, CalendarDays } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { dayNum, fromDayNum, parseJalali, formatJalali, monthNames, weekDayNames, monthLength, weekdayOf, fa } from "../../pm/jalali";
import { GRID_END, GRID_START, HOUR_PX, fmtMin, fmtRange, holidayOn, isOffDay, layerMeta, layoutBlocks, workHours, type CalItem } from "./model";

export const tint = (c: string, pct = 16) => ({ background: `color-mix(in srgb, ${c} ${pct}%, transparent)`, borderInlineStart: `3px solid ${c}` });

/** ساعت واقعی (برای خط «اکنون») هر دقیقه به‌روز می‌شود */
export function useNowMin() {
  const get = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };
  const [now, setNow] = useState(get);
  useEffect(() => {
    const t = setInterval(() => setNow(get()), 60000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ---------------------------------------------------------------- شبکه‌ی زمانی
export type Block = { key: string; start: number; end: number; title: string; sub?: string; color: string; tentative?: boolean; dim?: boolean; locked?: boolean; onClick?: (e: MouseEvent) => void };
export type AllDayChip = { key: string; title: string; color: string; dim?: boolean; onClick?: (e: MouseEvent) => void };
export type Column = { key: string; day: number; head: ReactNode; allDay: AllDayChip[]; blocks: Block[]; today: boolean; slot?: boolean };

const HOURS = Array.from({ length: (GRID_END - GRID_START) / 60 }, (_, i) => GRID_START + i * 60);
const GRID_H = ((GRID_END - GRID_START) / 60) * HOUR_PX;

export function TimeGrid({ columns, onSlot, nowMin, minColWidth = 92 }: { columns: Column[]; onSlot?: (col: Column, min: number) => void; nowMin: number; minColWidth?: number }) {
  const hasAllDay = columns.some((c) => c.allDay.length > 0);
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div style={{ minWidth: columns.length > 1 ? 44 + columns.length * minColWidth : undefined }}>
        {/* سرستون‌ها */}
        <div className="flex border-b border-ink-100">
          <div className="w-11 shrink-0" />
          {columns.map((c) => (
            <div key={c.key} className={`flex-1 min-w-0 px-1 py-1.5 text-center ${isOffDay(c.day) ? "bg-ink-50" : ""}`}>
              {c.head}
            </div>
          ))}
        </div>
        {/* تمام‌روز */}
        {hasAllDay && (
          <div className="flex border-b border-ink-100">
            <div className="w-11 shrink-0 text-[9.5px] text-ink-400 pt-1.5 text-center leading-3">تمام روز</div>
            {columns.map((c) => (
              <div key={c.key} className={`flex-1 min-w-0 p-0.5 space-y-0.5 border-r border-ink-100 ${isOffDay(c.day) ? "bg-ink-50" : ""}`}>
                {c.allDay.slice(0, 3).map((a) => (
                  <button
                    key={a.key}
                    onClick={a.onClick}
                    title={a.title}
                    className={`block w-full text-right rounded px-1 py-0.5 text-[10.5px] leading-4 text-ink-800 truncate hover:opacity-80 ${a.dim ? "opacity-50 line-through" : ""}`}
                    style={tint(a.color)}
                  >
                    {a.title}
                  </button>
                ))}
                {c.allDay.length > 3 && <span className="block text-[10px] text-ink-400 px-1">+{fa(c.allDay.length - 3)}</span>}
              </div>
            ))}
          </div>
        )}
        {/* بدنه */}
        <div className="flex relative">
          <div className="w-11 shrink-0 relative" style={{ height: GRID_H }}>
            {HOURS.map((h, i) => (
              <span key={h} className="absolute right-0 left-1 text-[10px] text-ink-400 tabular-nums text-left -translate-y-1/2" style={{ top: i * HOUR_PX }}>
                {i > 0 ? fmtMin(h) : ""}
              </span>
            ))}
          </div>
          {columns.map((c) => (
            <DayColumn key={c.key} col={c} onSlot={onSlot} nowMin={nowMin} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({ col, onSlot, nowMin }: { col: Column; onSlot?: (col: Column, min: number) => void; nowMin: number }) {
  const lay = layoutBlocks(col.blocks);
  const off = isOffDay(col.day);
  const [ws, we] = workHours(col.day);
  const click = (e: MouseEvent<HTMLDivElement>) => {
    if (!onSlot || col.slot === false) return;
    const r = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - r.top;
    const min = GRID_START + Math.floor((y / HOUR_PX) * 2) * 30;
    onSlot(col, Math.min(GRID_END - 30, Math.max(GRID_START, min)));
  };
  const showNow = col.today && nowMin >= GRID_START && nowMin <= GRID_END;
  return (
    <div
      onClick={click}
      className={`flex-1 min-w-0 relative border-r border-ink-100 ${off ? "bg-ink-50" : ""} ${onSlot && col.slot !== false ? "cursor-pointer" : ""}`}
      style={{ height: GRID_H }}
      title={onSlot && col.slot !== false ? "کلیک روی جای خالی: افزودن" : undefined}
    >
      {/* ساعات کاری کم‌رنگ */}
      {!off && <div className="absolute inset-x-0 bg-brand-50/40 pointer-events-none" style={{ top: ((ws - GRID_START) / 60) * HOUR_PX, height: ((we - ws) / 60) * HOUR_PX }} />}
      {HOURS.map((h, i) => (
        <div key={h} className="absolute inset-x-0 border-t border-ink-100 pointer-events-none" style={{ top: i * HOUR_PX }} />
      ))}
      {col.blocks.map((b) => {
        const l = lay.get(b.key) ?? { col: 0, cols: 1 };
        const s = Math.min(Math.max(b.start, GRID_START), GRID_END - 15);
        const e = Math.min(Math.max(b.end, s + 15), GRID_END);
        const top = ((s - GRID_START) / 60) * HOUR_PX;
        const height = Math.max(18, ((e - s) / 60) * HOUR_PX - 2);
        return (
          <button
            key={b.key}
            onClick={(ev) => {
              ev.stopPropagation();
              b.onClick?.(ev);
            }}
            title={`${b.title} — ${fmtRange(b.start, b.end)}`}
            className={`absolute rounded-md px-1 py-0.5 text-right overflow-hidden hover:z-10 hover:shadow-md transition-shadow ${b.tentative ? "border border-dashed" : ""} ${b.dim ? "opacity-50" : ""}`}
            style={{
              top,
              height,
              right: `calc(${(l.col / l.cols) * 100}% + 1px)`,
              width: `calc(${100 / l.cols}% - 2px)`,
              ...tint(b.color, b.tentative ? 8 : 18),
              borderColor: b.tentative ? b.color : undefined,
              background: `color-mix(in srgb, ${b.color} ${b.tentative ? 8 : 18}%, var(--color-ink-50))`,
            }}
          >
            <span className={`block text-[10.5px] font-medium leading-4 text-ink-900 ${height < 30 ? "truncate" : "line-clamp-2"} ${b.dim ? "line-through" : ""}`}>
              {b.locked && <Lock size={9} className="inline ml-0.5 text-ink-500" />}
              {b.title}
            </span>
            {height >= 34 && <span className="block text-[9.5px] text-ink-500 tabular-nums leading-4 truncate">{fmtRange(b.start, b.end)}</span>}
            {height >= 52 && b.sub && <span className="block text-[9.5px] text-ink-500 leading-4 truncate">{b.sub}</span>}
          </button>
        );
      })}
      {showNow && (
        <div className="absolute inset-x-0 z-20 pointer-events-none flex items-center" style={{ top: ((nowMin - GRID_START) / 60) * HOUR_PX }}>
          <span className="w-2 h-2 rounded-full bg-rose-500 -mr-1" />
          <span className="flex-1 h-0.5 bg-rose-500" />
        </div>
      )}
    </div>
  );
}

export function DayHead({ day, today, compact = false }: { day: number; today: boolean; compact?: boolean }) {
  const h = holidayOn(day);
  const w = weekDayNames[weekdayOf(fromDayNum(day))];
  const [, , d] = parseJalali(fromDayNum(day)) ?? [0, 0, 0];
  return (
    <div className="min-w-0">
      <span className={`block text-[10.5px] ${h || isOffDay(day) ? "text-rose-600" : "text-ink-500"}`}>{compact ? w.slice(0, 1) : w}</span>
      <span className={`inline-flex items-center justify-center text-[13px] font-bold tabular-nums w-7 h-7 rounded-full ${today ? "bg-brand-600 text-white" : h ? "text-rose-600" : "text-ink-800"}`}>{fa(d)}</span>
      {h && !compact && <span className="block text-[9.5px] text-rose-600 truncate" title={h.title}>{h.title}</span>}
    </div>
  );
}

// ---------------------------------------------------------------- ماه
export function MonthView({ jy, jm, todayN, items, onPick, onItem }: { jy: number; jm: number; todayN: number; items: CalItem[]; onPick?: (day: number) => void; onItem: (it: CalItem, e: MouseEvent) => void }) {
  const monthStart = dayNum(formatJalali(jy, jm, 1)) ?? 0;
  const offset = weekdayOf(fromDayNum(monthStart));
  const len = monthLength(jy, jm);
  const cells = Array.from({ length: Math.ceil((offset + len) / 7) * 7 }, (_, i) => (i - offset >= 0 && i - offset < len ? monthStart + i - offset : null));
  const byDay = new Map<number, CalItem[]>();
  items.forEach((it) => {
    if (it.layer === "holidays") return;
    byDay.set(it.day, [...(byDay.get(it.day) ?? []), it]);
  });
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDayNames.map((w, i) => (
          <div key={w} className={`text-center text-[10.5px] sm:text-[11px] py-1 ${i === 6 ? "text-rose-600" : "text-ink-400"}`}>
            <span className="sm:hidden">{w.slice(0, 1)}</span>
            <span className="hidden sm:inline">{w}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="min-h-[58px] sm:min-h-[100px] rounded-lg bg-ink-50/50" />;
          const list = byDay.get(d) ?? [];
          const h = holidayOn(d);
          const off = isOffDay(d);
          const isToday = d === todayN;
          return (
            <div
              key={i}
              onClick={() => onPick?.(d)}
              className={`min-h-[58px] sm:min-h-[100px] rounded-lg border p-1 min-w-0 ${isToday ? "border-brand-400" : "border-ink-100"} ${off ? "bg-ink-50" : ""} ${onPick ? "cursor-pointer hover:border-brand-200" : ""}`}
            >
              <div className="flex items-center justify-between gap-1 mb-0.5 min-w-0">
                <span className={`text-[11px] tabular-nums shrink-0 ${isToday ? "bg-brand-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold" : off ? "text-rose-600 font-medium" : "text-ink-600"}`}>{fa(d - monthStart + 1)}</span>
                {h && <span className="hidden sm:block text-[9px] text-rose-600 truncate" title={h.title}>{h.title}</span>}
              </div>
              <div className="flex flex-wrap gap-0.5 sm:hidden">
                {list.slice(0, 5).map((it) => (
                  <button
                    key={it.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      onItem(it, e);
                    }}
                    className="w-2 h-2 rounded-full"
                    style={{ background: it.color }}
                    aria-label={it.title}
                  />
                ))}
              </div>
              <div className="hidden sm:block space-y-0.5">
                {list.slice(0, 3).map((it) => (
                  <button
                    key={it.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      onItem(it, e);
                    }}
                    title={it.title}
                    className={`block w-full text-right rounded px-1 py-0.5 text-[10.5px] leading-4 text-ink-800 truncate hover:opacity-80 ${it.tentative ? "border border-dashed" : ""} ${it.dim ? "opacity-50 line-through" : ""}`}
                    style={{ ...tint(it.color), borderColor: it.tentative ? it.color : undefined }}
                  >
                    {it.start !== null && <span className="text-ink-500 ml-1 tabular-nums">{fmtMin(it.start)}</span>}
                    {it.title}
                  </button>
                ))}
                {list.length > 3 && <span className="block text-[10px] text-ink-400 px-1">+{fa(list.length - 3)} مورد دیگر</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- فهرست (دستور کار)
export function AgendaView({ from, to, todayN, items, onItem }: { from: number; to: number; todayN: number; items: CalItem[]; onItem: (it: CalItem, e: MouseEvent) => void }) {
  const groups: { day: number; list: CalItem[] }[] = [];
  for (let d = from; d <= to; d++) {
    const list = items.filter((it) => it.day === d);
    if (list.length) groups.push({ day: d, list });
  }
  if (!groups.length) return <EmptyState icon={<CalendarDays size={22} />} title="در این بازه چیزی در تقویم شما نیست" description="لایه‌های خاموش را روشن کنید یا روی «افزودن» بزنید." />;
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.day}>
          <p className={`text-xs font-bold mb-1.5 flex items-center gap-2 ${isOffDay(g.day) ? "text-rose-600" : "text-ink-700"}`}>
            {weekDayNames[weekdayOf(fromDayNum(g.day))]} {fromDayNum(g.day)}
            {g.day === todayN && <Badge tone="brand">امروز</Badge>}
          </p>
          <div className="space-y-1.5">
            {g.list.map((it) => (
              <button key={it.key} onClick={(e) => onItem(it, e)} className={`w-full text-right flex items-center gap-3 rounded-lg border border-ink-100 p-2.5 hover:bg-ink-50 ${it.dim ? "opacity-60" : ""}`}>
                <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: it.color }} />
                <span className="text-[11.5px] text-ink-500 tabular-nums shrink-0 w-[76px]">{fmtRange(it.start, it.end)}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] font-medium text-ink-800 truncate ${it.dim ? "line-through" : ""}`}>{it.title}</span>
                  {it.sub && <span className="block text-[11px] text-ink-400 truncate">{it.sub}</span>}
                </span>
                <span className="hidden sm:inline text-[10.5px] text-ink-500 shrink-0">{layerMeta[it.layer].label}</span>
                {it.tentative && <Badge tone="warning">بی‌پاسخ</Badge>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- ماه کوچک
export function MiniMonth({ cursor, todayN, range, onPick, hasItems }: { cursor: number; todayN: number; range: [number, number]; onPick: (d: number) => void; hasItems: (d: number) => boolean }) {
  const [ym, setYm] = useState<[number, number]>(() => {
    const p = parseJalali(fromDayNum(cursor)) ?? [1405, 1, 1];
    return [p[0], p[1]];
  });
  useEffect(() => {
    const p = parseJalali(fromDayNum(cursor));
    if (p) setYm([p[0], p[1]]);
  }, [cursor]);
  const [jy, jm] = ym;
  const start = dayNum(formatJalali(jy, jm, 1)) ?? 0;
  const offset = weekdayOf(fromDayNum(start));
  const len = monthLength(jy, jm);
  const cells = Array.from({ length: Math.ceil((offset + len) / 7) * 7 }, (_, i) => (i - offset >= 0 && i - offset < len ? start + i - offset : null));
  const step = (dir: 1 | -1) => setYm(([y, m]) => (m + dir > 12 ? [y + 1, 1] : m + dir < 1 ? [y - 1, 12] : [y, m + dir]));
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => step(-1)} className="p-1 rounded text-ink-500 hover:bg-ink-50" aria-label="ماه قبل">
          <ChevronRight size={14} />
        </button>
        <span className="text-[12.5px] font-bold text-ink-800">
          {monthNames[jm - 1]} {fa(jy)}
        </span>
        <button onClick={() => step(1)} className="p-1 rounded text-ink-500 hover:bg-ink-50" aria-label="ماه بعد">
          <ChevronLeft size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {weekDayNames.map((w, i) => (
          <span key={w} className={`text-[10px] py-0.5 ${i === 6 ? "text-rose-500" : "text-ink-400"}`}>
            {w.slice(0, 1)}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />;
          const inRange = d >= range[0] && d <= range[1];
          const off = isOffDay(d);
          return (
            <button
              key={i}
              onClick={() => onPick(d)}
              className={`relative h-7 text-[11px] tabular-nums rounded-md ${inRange ? "bg-brand-50" : "hover:bg-ink-50"} ${d === todayN ? "font-bold text-brand-700" : off ? "text-rose-600" : "text-ink-700"}`}
              title={holidayOn(d)?.title}
            >
              {fa(d - start + 1)}
              {hasItems(d) && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- ماتریس آزاد/مشغول (هفته)
export type FbRow = { id: string; name: string; color: string; busy: (day: number) => { key: string; start: number; end: number; title: string }[] };

export function FreeBusyMatrix({ days, rows, todayN, onDay, highlight }: { days: number[]; rows: FbRow[]; todayN: number; onDay: (d: number) => void; highlight?: { day: number; start: number; end: number } | null }) {
  const span = GRID_END - GRID_START;
  const pos = (m: number) => `${((Math.min(Math.max(m, GRID_START), GRID_END) - GRID_START) / span) * 100}%`;
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[620px] border-separate" style={{ borderSpacing: "0 4px" }}>
        <thead>
          <tr>
            <th className="w-28" />
            {days.map((d) => (
              <th key={d} className="font-normal px-0.5">
                <button onClick={() => onDay(d)} className={`text-[10.5px] ${d === todayN ? "text-brand-700 font-bold" : isOffDay(d) ? "text-rose-600" : "text-ink-500"} hover:underline`}>
                  {weekDayNames[weekdayOf(fromDayNum(d))]} {fa((parseJalali(fromDayNum(d)) ?? [0, 0, 0])[2])}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="text-[11.5px] text-ink-700 truncate max-w-[112px] pl-2">
                <span className="inline-block w-2 h-2 rounded-full ml-1.5" style={{ background: r.color }} />
                {r.name}
              </td>
              {days.map((d) => (
                <td key={d} className="px-0.5">
                  <div className={`relative h-5 rounded ${isOffDay(d) ? "bg-ink-100" : "bg-emerald-50"}`} title={isOffDay(d) ? "تعطیل" : undefined}>
                    {!isOffDay(d) &&
                      r.busy(d).map((b) => (
                        <span key={b.key} className="absolute top-0 bottom-0 rounded-sm bg-rose-400/70" style={{ right: pos(b.start), width: `calc(${pos(b.end)} - ${pos(b.start)})` }} title={`${b.title} — ${fmtRange(b.start, b.end)}`} />
                      ))}
                    {highlight && highlight.day === d && <span className="absolute -top-0.5 -bottom-0.5 rounded-sm ring-2 ring-brand-500 bg-brand-500/30" style={{ right: pos(highlight.start), width: `calc(${pos(highlight.end)} - ${pos(highlight.start)})` }} />}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10.5px] text-ink-400 mt-1">
        هر نوار از {fmtMin(GRID_START)} (راست) تا {fmtMin(GRID_END)} (چپ) است · <span className="inline-block w-2.5 h-2 rounded-sm bg-rose-400/70 align-middle" /> مشغول · <span className="inline-block w-2.5 h-2 rounded-sm bg-emerald-50 border border-emerald-200 align-middle" /> آزاد
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- پاپ‌اوور جزئیات
export type PopState = { item: CalItem; x: number; y: number } | null;

export function ItemPopover({ pop, onClose, onEdit, onDelete }: { pop: PopState; onClose: () => void; onEdit?: (id: string) => void; onDelete?: (id: string) => void }) {
  useEffect(() => {
    if (!pop) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [pop, onClose]);
  if (!pop) return null;
  const it = pop.item;
  const W = 320;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const mobile = vw < 640;
  const style = mobile ? { left: 8, right: 8, bottom: 8 } : { left: Math.min(Math.max(8, pop.x - W / 2), vw - W - 8), top: Math.min(pop.y + 10, vh - 300), width: W };
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div role="dialog" aria-label={it.title} className="fixed z-50 card p-4 shadow-xl max-h-[70vh] overflow-y-auto" style={style}>
        <div className="flex items-start gap-2 mb-2">
          <span className="w-3 h-3 rounded-sm mt-1 shrink-0" style={{ background: it.color }} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold text-ink-900 break-words ${it.dim ? "line-through" : ""}`}>{it.title}</p>
            <p className="text-[11.5px] text-ink-500 mt-0.5">
              {weekDayNames[weekdayOf(fromDayNum(it.day))]} {fromDayNum(it.day)} · {fmtRange(it.start, it.end)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-ink-400 hover:bg-ink-50" aria-label="بستن">
            <X size={14} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          <Badge tone="neutral">{it.kindLabel ?? layerMeta[it.layer].label}</Badge>
          {it.tentative && <Badge tone="warning">دعوت بی‌پاسخ</Badge>}
        </div>
        {it.details && (
          <dl className="space-y-1 text-[12px]">
            {it.details.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-ink-400 w-24 shrink-0">{k}</dt>
                <dd className="text-ink-700 min-w-0 break-words">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {it.link && (
            <Link to={it.link} onClick={onClose}>
              <Button size="sm" variant="primary" icon={<ExternalLink size={13} />}>
                {it.layer === "events" ? "صفحه‌ی رویداد" : it.layer === "meetings" ? "صورت‌جلسه و جزئیات" : it.layer === "tasks" ? "باز کردن وظیفه" : "باز کردن در پروژه"}
              </Button>
            </Link>
          )}
          {it.personalId && onEdit && (
            <Button size="sm" icon={<Pencil size={13} />} onClick={() => onEdit(it.personalId!)}>
              ویرایش
            </Button>
          )}
          {it.personalId && onDelete && (
            <Button size="sm" variant="danger" icon={<Trash2 size={13} />} onClick={() => onDelete(it.personalId!)}>
              حذف
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
