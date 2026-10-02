// ---------------------------------------------------------------------------
// جابه‌جایی زمان‌بندی در گانت: وقتی یک تسک (پیش‌نیاز) جابه‌جا می‌شود، جانشین‌ها با رعایت
// نوع وابستگی (FS/SS/FF/SF) و تأخیر (lag) جابه‌جا می‌شوند — مدت هر تسک ثابت می‌ماند.
// ---------------------------------------------------------------------------
import { dayNum, fromDayNum } from "./jalali";
import { depType } from "./selectors";
import type { Dependency, ProjectState } from "./types";

export type DatePatch = { start: string; due: string };

/** کمترین شروع/پایان لازم برای جانشین بر اساس یک وابستگی */
function required(d: Dependency, a: { s: number; e: number }): { minStart?: number; minEnd?: number } {
  const lag = d.lag ?? 0;
  switch (depType(d)) {
    case "FS":
      return { minStart: a.e + lag };
    case "SS":
      return { minStart: a.s + lag };
    case "FF":
      return { minEnd: a.e + lag };
    case "SF":
      return { minEnd: a.s + lag };
  }
}

/**
 * برنامه‌ی تازه‌ی جانشین‌ها پس از جابه‌جایی تسک movedId به [start, due].
 * delta: جابه‌جایی پیش‌نیاز (روز). اگر پیش‌نیاز عقب رفته، جانشین‌ها فقط تا حدی که قید لازم دارد هل داده می‌شوند؛
 * اگر جلو آمده، جانشین‌ها به همان اندازه جلو می‌آیند ولی هرگز قید پیش‌نیازهای دیگرشان را نقض نمی‌کنند.
 */
export function shiftSuccessors(p: ProjectState, movedId: string, start: string, due: string, delta: number): Record<string, DatePatch> {
  const sched = new Map<string, { s: number; e: number }>();
  p.tasks.forEach((t) => {
    const s = dayNum(t.start);
    const e = dayNum(t.due);
    if (s !== null && e !== null) sched.set(t.id, { s, e });
  });
  const ms = dayNum(start);
  const me = dayNum(due);
  if (ms === null || me === null) return {};
  sched.set(movedId, { s: ms, e: me });
  const changed = new Set<string>();
  const queue = [movedId];
  const seen = new Map<string, number>();
  while (queue.length) {
    const id = queue.shift()!;
    seen.set(id, (seen.get(id) ?? 0) + 1);
    if ((seen.get(id) ?? 0) > 20) continue; // محافظ حلقه
    p.deps
      .filter((d) => d.predecessor === id)
      .forEach((d) => {
        const succ = p.tasks.find((t) => t.id === d.successor);
        const cur = sched.get(d.successor);
        if (!succ || succ.archived || !cur) return;
        const dur = cur.e - cur.s;
        // کمترین مقدار لازم از همه‌ی پیش‌نیازهای این جانشین
        let minStart = -Infinity;
        p.deps
          .filter((x) => x.successor === d.successor)
          .forEach((x) => {
            const a = sched.get(x.predecessor);
            if (!a) return;
            const r = required(x, a);
            if (r.minStart !== undefined) minStart = Math.max(minStart, r.minStart);
            if (r.minEnd !== undefined) minStart = Math.max(minStart, r.minEnd - dur);
          });
        let ns = cur.s;
        if (delta > 0) ns = Math.max(cur.s, minStart);
        else if (delta < 0) ns = Math.max(cur.s + delta, minStart);
        if (ns === cur.s) return;
        sched.set(d.successor, { s: ns, e: ns + dur });
        changed.add(d.successor);
        queue.push(d.successor);
      });
  }
  const out: Record<string, DatePatch> = {};
  changed.forEach((id) => {
    const x = sched.get(id)!;
    out[id] = { start: fromDayNum(x.s), due: fromDayNum(x.e) };
  });
  return out;
}
