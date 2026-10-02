// ---------------------------------------------------------------------------
// موتور گزارش — توابع خالص: فیلتر ← بازه‌ی زمانی ← دسته‌بندی زمانی ← گروه‌بندی ←
// تجمیع ← مرتب‌سازی ← N برتر، به‌علاوه‌ی جدول متقاطع (pivot) و خروجی CSV.
// ---------------------------------------------------------------------------
import { dayNum, fromDayNum, parseJalali, formatJalali, monthLength, monthNames, weekdayOf, fmtShort, toEnDigits } from "../pm/jalali";
import {
  COUNT_FIELD,
  aggLabel,
  presetLabel,
  type Agg,
  type DataSource,
  type DateBucket,
  type DateRange,
  type Field,
  type FilterSpec,
  type MeasureSpec,
  type ReportSpec,
  type Row,
  type RowValue,
  type ValueFormat,
} from "./types";

// ----------------------------------------------------------------- قالب‌بندی

export const faNum = (n: number, digits = 1) => (Number.isFinite(n) ? n.toLocaleString("fa-IR", { maximumFractionDigits: digits }) : "—");

export function formatValue(v: number, format: ValueFormat = "number", compact = false): string {
  if (!Number.isFinite(v)) return "—";
  switch (format) {
    case "rial":
      return compact ? fmtShort(v) : `${Math.round(v).toLocaleString("fa-IR")} ریال`;
    case "hours":
      return compact ? faNum(v) : `${faNum(v)} ساعت`;
    case "percent":
      return `${faNum(v)}٪`;
    default:
      if (compact && Math.abs(v) >= 1e6) return fmtShort(v);
      return faNum(v);
  }
}

// ----------------------------------------------------------------- فیلدها و شاخص‌ها

export const fieldOf = (source: DataSource | undefined, key?: string): Field | undefined => (key ? source?.fields.find((f) => f.key === key) : undefined);

export function aggsFor(field?: Field): Agg[] {
  if (!field) return ["count"];
  if (field.aggregations?.length) return field.aggregations;
  if (field.kind === "number") return ["sum", "avg", "min", "max"];
  if (field.kind === "bool") return ["count", "avg"];
  return ["distinct"];
}

export function measureLabel(m: MeasureSpec, source?: DataSource): string {
  if (m.label) return m.label;
  if (m.field === COUNT_FIELD) return `تعداد ${source?.rowNoun ?? "رکورد"}`;
  const f = fieldOf(source, m.field);
  const name = f?.label ?? m.field;
  if (f?.kind === "bool") return m.agg === "avg" ? `درصد «${name}»` : `تعداد «${name}»`;
  return `${aggLabel[m.agg]} ${name}`;
}

export function measureFormat(m: MeasureSpec, source?: DataSource): ValueFormat {
  if (m.field === COUNT_FIELD || m.agg === "count" || m.agg === "distinct") return "number";
  const f = fieldOf(source, m.field);
  if (f?.kind === "bool") return "percent";
  return f?.format ?? "number";
}

// ----------------------------------------------------------------- تاریخ و بازه

/** «۱۴۰۵/۰۳/۰۸ ۱۰:۲۰» یا «1405/3/8» → «۱۴۰۵/۰۳/۰۸» */
export function normDate(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const p = parseJalali(s);
  return p ? formatJalali(p[0], p[1], p[2]) : null;
}

const addMonth = (jy: number, jm: number, n: number): [number, number] => {
  const z = jy * 12 + (jm - 1) + n;
  return [Math.floor(z / 12), (z % 12) + 1];
};

export type ResolvedRange = { from?: number; to?: number; fromLabel?: string; toLabel?: string; label: string };

export function resolveRange(range: DateRange, today: string): ResolvedRange {
  const t = dayNum(today);
  const p = parseJalali(today);
  if (range.preset === "all" || t === null || !p) return { label: presetLabel.all };
  const [jy, jm, jd] = p;
  let from: number | null = null;
  let to: number | null = null;
  const d = (y: number, m: number, day: number) => dayNum(formatJalali(y, m, day));
  switch (range.preset) {
    case "thisWeek":
      from = t - weekdayOf(today);
      to = from + 6;
      break;
    case "thisMonth":
      from = d(jy, jm, 1);
      to = d(jy, jm, monthLength(jy, jm));
      break;
    case "payroll": {
      // دوره‌ی کارکرد: ۲۶ ماه قبل تا ۲۵ ماه جاری
      const [sy, sm] = jd >= 26 ? [jy, jm] : addMonth(jy, jm, -1);
      const [ey, em] = addMonth(sy, sm, 1);
      from = d(sy, sm, 26);
      to = d(ey, em, 25);
      break;
    }
    case "last30":
      from = t - 29;
      to = t;
      break;
    case "last90":
      from = t - 89;
      to = t;
      break;
    case "quarter": {
      const q = Math.floor((jm - 1) / 3);
      from = d(jy, q * 3 + 1, 1);
      to = d(jy, q * 3 + 3, monthLength(jy, q * 3 + 3));
      break;
    }
    case "year":
      from = d(jy, 1, 1);
      to = d(jy, 12, monthLength(jy, 12));
      break;
    case "custom":
      from = dayNum(range.from);
      to = dayNum(range.to);
      break;
  }
  const r: ResolvedRange = { label: presetLabel[range.preset] };
  if (from !== null) {
    r.from = from;
    r.fromLabel = fromDayNum(from);
  }
  if (to !== null) {
    r.to = to;
    r.toLabel = fromDayNum(to);
  }
  if (range.preset === "custom") r.label = `${r.fromLabel ?? "…"} تا ${r.toLabel ?? "…"}`;
  return r;
}

export const rangeText = (r: ResolvedRange) => (r.fromLabel || r.toLabel ? `${r.fromLabel ?? "…"} تا ${r.toLabel ?? "…"}` : r.label);

// ----------------------------------------------------------------- فیلتر

const isEmptyVal = (v: RowValue) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
const asText = (v: RowValue): string => (v === true ? "بله" : v === false ? "خیر" : v === null || v === undefined ? "" : String(v));
const toNum = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(toEnDigits(v).replace(/[٬,]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

function cmpValue(v: RowValue, field: Field | undefined): number | null {
  if (field?.kind === "date") return typeof v === "string" ? dayNum(v) : null;
  return toNum(v);
}
function cmpTarget(x: unknown, field: Field | undefined): number | null {
  if (field?.kind === "date") return typeof x === "string" ? dayNum(x) : null;
  return toNum(x);
}

export function matchFilter(row: Row, f: FilterSpec, field: Field | undefined): boolean {
  const v = row[f.field];
  switch (f.op) {
    case "isEmpty":
      return isEmptyVal(v);
    case "notEmpty":
      return !isEmptyVal(v);
    case "eq":
    case "neq": {
      let hit: boolean;
      if (field?.kind === "bool") hit = Boolean(v) === (f.value === true || f.value === "true");
      else if (Array.isArray(v)) hit = v.includes(String(f.value));
      else if (field?.kind === "number" || field?.kind === "date") hit = cmpValue(v, field) === cmpTarget(f.value, field);
      else hit = asText(v) === String(f.value ?? "");
      return f.op === "eq" ? hit : !hit;
    }
    case "in": {
      const set = Array.isArray(f.value) ? (f.value as string[]) : [];
      if (!set.length) return true;
      if (Array.isArray(v)) return v.some((x) => set.includes(x));
      return set.includes(asText(v));
    }
    case "contains": {
      const q = String(f.value ?? "").trim();
      if (!q) return true;
      const vals = Array.isArray(v) ? v : [asText(v)];
      return vals.some((x) => x.includes(q));
    }
    case "gt":
    case "lt": {
      const a = cmpValue(v, field);
      const b = cmpTarget(f.value, field);
      if (b === null) return true;
      if (a === null) return false;
      return f.op === "gt" ? a > b : a < b;
    }
    case "between": {
      const [lo, hi] = Array.isArray(f.value) ? (f.value as string[]) : [];
      const a = cmpValue(v, field);
      const l = cmpTarget(lo, field);
      const h = cmpTarget(hi, field);
      if (l === null && h === null) return true;
      if (a === null) return false;
      return (l === null || a >= l) && (h === null || a <= h);
    }
  }
  return true;
}

/** آیا فیلتر مقدار کافی دارد که اعمال شود */
export function filterIsActive(f: FilterSpec): boolean {
  if (f.op === "isEmpty" || f.op === "notEmpty") return true;
  if (f.op === "in") return Array.isArray(f.value) && f.value.length > 0;
  if (f.op === "between") return Array.isArray(f.value) && f.value.some((x) => x !== "" && x !== null && x !== undefined);
  return f.value !== null && f.value !== undefined && f.value !== "";
}

export function applyFilters(rows: Row[], filters: FilterSpec[], source: DataSource): Row[] {
  const active = filters.filter(filterIsActive);
  if (!active.length) return rows;
  return rows.filter((r) => active.every((f) => matchFilter(r, f, fieldOf(source, f.field))));
}

export function applyDateRange(rows: Row[], dateField: string | undefined, rr: ResolvedRange): Row[] {
  if (!dateField || (rr.from === undefined && rr.to === undefined)) return rows;
  return rows.filter((r) => {
    const v = r[dateField];
    const d = typeof v === "string" ? dayNum(v) : null;
    if (d === null) return false;
    return (rr.from === undefined || d >= rr.from) && (rr.to === undefined || d <= rr.to);
  });
}

// ----------------------------------------------------------------- دسته‌ها

export type Cat = { key: string; label: string; short?: string; sort: number | string };

const EMPTY_LABEL = "نامشخص";

export function bucketOfDate(s: string, bucket: DateBucket): Cat | null {
  const d = dayNum(s);
  const p = parseJalali(s);
  if (d === null || !p) return null;
  if (bucket === "day") {
    const lbl = fromDayNum(d);
    return { key: `d${d}`, label: lbl, short: lbl.slice(5), sort: d };
  }
  if (bucket === "week") {
    const start = d - weekdayOf(s);
    const lbl = fromDayNum(start);
    return { key: `w${start}`, label: `هفته‌ی ${lbl}`, short: lbl.slice(5), sort: start };
  }
  const [jy, jm] = p;
  return { key: `m${jy}-${jm}`, label: `${monthNames[jm - 1]} ${faNum(jy, 0).replace(/٬/g, "")}`, short: monthNames[jm - 1], sort: jy * 12 + jm };
}

function catsOf(row: Row, field: Field, bucket: DateBucket): Cat[] {
  const v = row[field.key];
  if (field.kind === "date") {
    const c = typeof v === "string" ? bucketOfDate(v, bucket) : null;
    return [c ?? { key: "__empty", label: EMPTY_LABEL, sort: Number.MAX_SAFE_INTEGER }];
  }
  if (field.kind === "bool") return [v ? { key: "1", label: "بله", sort: 0 } : { key: "0", label: "خیر", sort: 1 }];
  const vals = Array.isArray(v) ? v : isEmptyVal(v) ? [] : [String(v)];
  if (!vals.length) return [{ key: "__empty", label: EMPTY_LABEL, sort: "￿" }];
  return [...new Set(vals)].map((x) => {
    const oi = field.order?.indexOf(x) ?? -1;
    if (field.kind === "number") {
      const n = toNum(x) ?? 0;
      return { key: x, label: faNum(n), sort: n };
    }
    return { key: x, label: x, sort: oi >= 0 ? oi : x };
  });
}

const cmpSort = (a: number | string, b: number | string) => {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "number") return -1;
  if (typeof b === "number") return 1;
  return a.localeCompare(b, "fa");
};

/** پرکردن فاصله‌های زمانی خالی تا نمودار روند پیوسته باشد */
function fillDateGaps(cats: Cat[], bucket: DateBucket): Cat[] {
  const nums = cats.filter((c) => typeof c.sort === "number" && c.key !== "__empty").map((c) => c.sort as number);
  if (nums.length < 2) return cats;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const have = new Set(cats.map((c) => c.key));
  const extra: Cat[] = [];
  if (bucket === "month") {
    for (let z = min; z <= max && extra.length < 400; z++) {
      const jy = Math.floor((z - 1) / 12);
      const jm = ((z - 1) % 12) + 1;
      const c = bucketOfDate(formatJalali(jy, jm, 1), "month");
      if (c && !have.has(c.key)) extra.push(c);
    }
  } else {
    const step = bucket === "week" ? 7 : 1;
    if ((max - min) / step > 400) return cats;
    for (let z = min; z <= max; z += step) {
      const c = bucketOfDate(fromDayNum(z), bucket);
      if (c && !have.has(c.key)) extra.push(c);
    }
  }
  return [...cats, ...extra];
}

// ----------------------------------------------------------------- تجمیع

export function aggregate(rows: Row[], m: MeasureSpec, field: Field | undefined): number {
  if (m.field === COUNT_FIELD) return rows.length;
  const key = m.field;
  if (m.agg === "distinct") {
    const s = new Set<string>();
    rows.forEach((r) => {
      const v = r[key];
      if (Array.isArray(v)) v.forEach((x) => s.add(x));
      else if (!isEmptyVal(v)) s.add(String(v));
    });
    return s.size;
  }
  if (field?.kind === "bool") {
    const t = rows.filter((r) => Boolean(r[key])).length;
    if (m.agg === "avg") return rows.length ? Math.round((t / rows.length) * 1000) / 10 : 0;
    return t;
  }
  if (m.agg === "count") return rows.filter((r) => !isEmptyVal(r[key])).length;
  const nums = rows.map((r) => toNum(r[key])).filter((x): x is number => x !== null);
  if (!nums.length) return 0;
  switch (m.agg) {
    case "sum":
      return nums.reduce((a, b) => a + b, 0);
    case "avg":
      return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
    case "min":
      return Math.min(...nums);
    case "max":
      return Math.max(...nums);
  }
  return 0;
}

// ----------------------------------------------------------------- اجرای گزارش

export type ResultChild = Cat & { values: number[]; rows: Row[] };
export type ResultGroup = Cat & { values: number[]; rows: Row[]; children: ResultChild[] };
export type MeasureCol = { id: string; label: string; format: ValueFormat };

export type ReportResult = {
  dims: Field[];
  measures: MeasureCol[];
  groups: ResultGroup[];
  /** دسته‌های بُعد دوم (تفکیک) */
  series: Cat[];
  /** جمع هر سری بر اساس همه‌ی ردیف‌ها — [سری][شاخص] */
  seriesTotals: number[][];
  totals: number[];
  /** ردیف‌های پس از فیلتر و بازه */
  rowCount: number;
  /** ردیف‌های در دسترس پیش از فیلتر */
  totalRows: number;
  range: ResolvedRange;
  /** پیام‌های راهنما (مثلاً تعداد زیاد سری‌ها) */
  notes: string[];
  filtered: Row[];
};

const MAX_SERIES = 8;
const OTHERS = "__others";

export function runReport(spec: ReportSpec, source: DataSource, rows: Row[], today: string): ReportResult {
  const notes: string[] = [];
  const range = resolveRange(spec.dateRange, today);
  const filtered = applyDateRange(applyFilters(rows, spec.filters, source), spec.dateField, range);
  const measures = spec.measures.length ? spec.measures : [{ id: "m0", field: COUNT_FIELD, agg: "count" as Agg }];
  const mFields = measures.map((m) => fieldOf(source, m.field));
  const measureCols: MeasureCol[] = measures.map((m) => ({ id: m.id, label: measureLabel(m, source), format: measureFormat(m, source) }));
  const agg = (rs: Row[]) => measures.map((m, i) => aggregate(rs, m, mFields[i]));

  const dimKeys = [...new Set(spec.dimensions.filter(Boolean))].slice(0, 2);
  const dims = dimKeys.map((k) => fieldOf(source, k)).filter((f): f is Field => !!f);
  const totals = agg(filtered);

  if (!dims.length) {
    return {
      dims,
      measures: measureCols,
      groups: [{ key: "__all", label: "کل", sort: 0, values: totals, rows: filtered, children: [] }],
      series: [],
      seriesTotals: [],
      totals,
      rowCount: filtered.length,
      totalRows: rows.length,
      range,
      notes,
      filtered,
    };
  }

  const [d1, d2] = dims;
  // ---- گروه‌بندی
  const gmap = new Map<string, { cat: Cat; rows: Row[]; kids: Map<string, { cat: Cat; rows: Row[] }> }>();
  const smap = new Map<string, { cat: Cat; rows: Row[] }>();
  for (const r of filtered) {
    const c1s = catsOf(r, d1, spec.bucket);
    const c2s = d2 ? catsOf(r, d2, spec.bucket) : [];
    for (const c1 of c1s) {
      let g = gmap.get(c1.key);
      if (!g) gmap.set(c1.key, (g = { cat: c1, rows: [], kids: new Map() }));
      g.rows.push(r);
      for (const c2 of c2s) {
        let k = g.kids.get(c2.key);
        if (!k) g.kids.set(c2.key, (k = { cat: c2, rows: [] }));
        k.rows.push(r);
      }
    }
    for (const c2 of c2s) {
      let s = smap.get(c2.key);
      if (!s) smap.set(c2.key, (s = { cat: c2, rows: [] }));
      s.rows.push(r);
    }
  }

  // ---- فاصله‌های زمانی خالی (فقط وقتی بر اساس برچسب مرتب می‌شود)
  let cats = [...gmap.values()].map((g) => g.cat);
  if (d1.kind === "date" && spec.sort.by === "label") {
    cats = fillDateGaps(cats, spec.bucket);
    cats.forEach((c) => !gmap.has(c.key) && gmap.set(c.key, { cat: c, rows: [], kids: new Map() }));
  }

  // ---- سری‌ها (بُعد دوم)
  let series: Cat[] = [...smap.values()].map((s) => s.cat).sort((a, b) => cmpSort(a.sort, b.sort));
  let foldKeys = new Set<string>();
  if (d2 && series.length > MAX_SERIES) {
    const ranked = [...smap.values()].map((s) => ({ key: s.cat.key, v: aggregate(s.rows, measures[0], mFields[0]) })).sort((a, b) => b.v - a.v);
    const keep = new Set(ranked.slice(0, MAX_SERIES - 1).map((x) => x.key));
    foldKeys = new Set(ranked.slice(MAX_SERIES - 1).map((x) => x.key));
    series = [...series.filter((s) => keep.has(s.key)), { key: OTHERS, label: "سایر", sort: "￿" }];
    notes.push(`«${d2.label}» بیش از ${faNum(MAX_SERIES)} مقدار داشت؛ کم‌تکرارها در «سایر» جمع شدند.`);
  }
  const seriesRows = (key: string) => (key === OTHERS ? [...foldKeys].flatMap((k) => smap.get(k)?.rows ?? []) : smap.get(key)?.rows ?? []);
  const seriesTotals = series.map((s) => agg(dedupe(seriesRows(s.key))));

  const buildChildren = (kids: Map<string, { cat: Cat; rows: Row[] }>): ResultChild[] =>
    series.map((s) => {
      const rs = s.key === OTHERS ? dedupe([...foldKeys].flatMap((k) => kids.get(k)?.rows ?? [])) : kids.get(s.key)?.rows ?? [];
      return { ...s, rows: rs, values: agg(rs) };
    });

  let groups: ResultGroup[] = cats.map((c) => {
    const g = gmap.get(c.key)!;
    return { ...c, rows: g.rows, values: agg(g.rows), children: d2 ? buildChildren(g.kids) : [] };
  });

  // ---- مرتب‌سازی
  const mi = measures.findIndex((m) => m.id === spec.sort.by);
  const dir = spec.sort.dir === "asc" ? 1 : -1;
  groups.sort((a, b) => {
    if (a.key === "__empty") return 1;
    if (b.key === "__empty") return -1;
    if (mi >= 0) return (a.values[mi] - b.values[mi]) * dir || cmpSort(a.sort, b.sort);
    return cmpSort(a.sort, b.sort) * dir;
  });

  // ---- N برتر
  if (spec.limit > 0 && groups.length > spec.limit) {
    const rest = groups.slice(spec.limit);
    groups = groups.slice(0, spec.limit);
    if (spec.others) {
      const rs = dedupe(rest.flatMap((g) => g.rows));
      // زیرگروه‌های «سایر» دوباره از ردیف‌های خام ساخته می‌شوند تا سری‌های تاشده هم درست جمع شوند
      const kids = new Map<string, { cat: Cat; rows: Row[] }>();
      if (d2)
        rs.forEach((r) =>
          catsOf(r, d2, spec.bucket).forEach((c2) => {
            let k = kids.get(c2.key);
            if (!k) kids.set(c2.key, (k = { cat: c2, rows: [] }));
            k.rows.push(r);
          })
        );
      groups.push({ key: OTHERS, label: `سایر (${faNum(rest.length)} مورد)`, short: "سایر", sort: "￿", rows: rs, values: agg(rs), children: d2 ? buildChildren(kids) : [] });
    }
  }

  return { dims, measures: measureCols, groups, series, seriesTotals, totals, rowCount: filtered.length, totalRows: rows.length, range, notes, filtered };
}

function dedupe(rows: Row[]): Row[] {
  return [...new Set(rows)];
}

// ----------------------------------------------------------------- جدول متقاطع

export type Pivot = {
  rowCats: Cat[];
  colCats: Cat[];
  cells: number[][];
  rowTotals: number[];
  colTotals: number[];
  grand: number;
  max: number;
  format: ValueFormat;
  measureLabel: string;
};

export function pivotOf(res: ReportResult, measureIdx = 0): Pivot | null {
  if (res.dims.length < 2) return null;
  const mi = Math.min(measureIdx, res.measures.length - 1);
  const cells = res.groups.map((g) => g.children.map((c) => c.values[mi]));
  return {
    rowCats: res.groups,
    colCats: res.series,
    cells,
    rowTotals: res.groups.map((g) => g.values[mi]),
    colTotals: res.seriesTotals.map((t) => t[mi]),
    grand: res.totals[mi],
    max: Math.max(0, ...cells.flat()),
    format: res.measures[mi].format,
    measureLabel: res.measures[mi].label,
  };
}

// ----------------------------------------------------------------- CSV

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const rawNum = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 100) / 100) : "");

export function toCSV(res: ReportResult): string {
  const lines: (string | number)[][] = [];
  const dimHeads = res.dims.map((d) => d.label);
  lines.push([...dimHeads, ...res.measures.map((m) => m.label)]);
  if (!res.dims.length) {
    lines.push(res.totals.map(rawNum));
  } else if (res.dims.length === 1) {
    res.groups.forEach((g) => lines.push([g.label, ...g.values.map(rawNum)]));
    lines.push(["جمع کل", ...res.totals.map(rawNum)]);
  } else {
    res.groups.forEach((g) => g.children.forEach((c) => c.rows.length && lines.push([g.label, c.label, ...c.values.map(rawNum)])));
    lines.push(["جمع کل", "", ...res.totals.map(rawNum)]);
  }
  return "﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\r\n");
}

export function downloadFile(name: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const safeFileName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "-").trim() || "report";

/** مقادیر یکتای یک فیلد (برای فیلتر) — به ترتیب طبیعی */
export function distinctValues(rows: Row[], field: Field): string[] {
  const s = new Set<string>();
  rows.forEach((r) => {
    const v = r[field.key];
    if (Array.isArray(v)) v.forEach((x) => s.add(x));
    else if (!isEmptyVal(v)) s.add(String(v));
  });
  const arr = [...s];
  if (field.order) return arr.sort((a, b) => (field.order!.indexOf(a) + 1 || 999) - (field.order!.indexOf(b) + 1 || 999));
  return arr.sort((a, b) => a.localeCompare(b, "fa"));
}
