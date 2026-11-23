// ---------------------------------------------------------------------------
// دفتر مالی پرونده‌ی مشتری و تجمیع‌های مانیتورینگ مالی/فروش (توابع خالص).
// قواعد (WORK_PACKAGES WP8 پذیرش ۳):
//  - مانده‌ی مشتری = Σ دریافت قطعی − Σ پرداخت قطعی
//  - قطعی = سند فعال و «نقد شده»
//  - معوقه = سررسید (یا تاریخ) گذشته و نقد نشده — خودکار، بدون تغییر دستی وضعیت
//  - احتمالی = نقد نشده و هنوز سررسید نشده (چک آینده یا سند «احتمالی»)
//  - سند ابطال‌شده می‌ماند و دیده می‌شود ولی در جمع‌ها نیست
// ---------------------------------------------------------------------------
import type { FinanceBucket, FinancialDocument, Opportunity } from "./types";
import { before, dateOnly, monthOf, OFFICE_TODAY, yearOf } from "./util";

export const dueOf = (d: FinancialDocument) => d.due_date || d.date;

export function bucketOf(d: FinancialDocument, today = OFFICE_TODAY): FinanceBucket {
  if (d.status === "cancelled") return "cancelled";
  if (d.is_cashed && d.form !== "probable") return d.direction === "receipt" ? "definite_in" : "definite_out";
  if (before(dueOf(d), today)) return "overdue";
  return d.direction === "receipt" ? "probable_in" : "probable_out";
}

export type FinanceTotals = {
  definite_in: number;
  definite_out: number;
  probable_in: number;
  probable_out: number;
  /** دریافت‌های معوقه (درآمد معوقه) */
  overdue_in: number;
  /** پرداخت‌های معوقه */
  overdue_out: number;
  cancelled: number;
  /** مانده = دریافت قطعی − پرداخت قطعی */
  balance: number;
  count: number;
};

export function totalsOf(docs: readonly FinancialDocument[], today = OFFICE_TODAY): FinanceTotals {
  const t: FinanceTotals = { definite_in: 0, definite_out: 0, probable_in: 0, probable_out: 0, overdue_in: 0, overdue_out: 0, cancelled: 0, balance: 0, count: 0 };
  for (const d of docs) {
    t.count++;
    const b = bucketOf(d, today);
    if (b === "overdue") {
      if (d.direction === "receipt") t.overdue_in += d.amount_rial;
      else t.overdue_out += d.amount_rial;
    } else if (b === "cancelled") t.cancelled += d.amount_rial;
    else t[b] += d.amount_rial;
  }
  t.balance = t.definite_in - t.definite_out;
  return t;
}

export type LedgerRow = { doc: FinancialDocument; bucket: FinanceBucket; debit: number; credit: number; running: number };

/** دفتر قطعی مشتری به ترتیب تاریخ با مانده‌ی جاری (دریافت = بستانکار، پرداخت = بدهکار) */
export function ledgerOf(docs: readonly FinancialDocument[], today = OFFICE_TODAY): LedgerRow[] {
  const sorted = [...docs].sort((a, b) => (dateOnly(a.date) < dateOnly(b.date) ? -1 : dateOnly(a.date) > dateOnly(b.date) ? 1 : a.id - b.id));
  let running = 0;
  return sorted.map((doc) => {
    const bucket = bucketOf(doc, today);
    const definite = bucket === "definite_in" || bucket === "definite_out";
    const credit = definite && doc.direction === "receipt" ? doc.amount_rial : 0;
    const debit = definite && doc.direction === "payment" ? doc.amount_rial : 0;
    running += credit - debit;
    return { doc, bucket, debit, credit, running };
  });
}

/** سال‌هایی که سند دارند (نزولی) */
export const yearsOf = (docs: readonly FinancialDocument[]) => [...new Set(docs.map((d) => yearOf(d.date)).filter(Boolean))].sort((a, b) => b - a);

export type PeriodRow = FinanceTotals & { key: number; docs: FinancialDocument[] };

/** جدول ماهانه‌ی یک سال (۱۲ ردیف، ماه از تاریخ سند) */
export function monthTable(docs: readonly FinancialDocument[], year: number, today = OFFICE_TODAY): PeriodRow[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const list = docs.filter((d) => yearOf(d.date) === year && monthOf(d.date) === m);
    return { key: m, docs: list, ...totalsOf(list, today) };
  });
}

/** جدول سالانه */
export function yearTable(docs: readonly FinancialDocument[], today = OFFICE_TODAY): PeriodRow[] {
  return yearsOf(docs).map((y) => {
    const list = docs.filter((d) => yearOf(d.date) === y);
    return { key: y, docs: list, ...totalsOf(list, today) };
  });
}

// ------------------------------------------------------------------ فروش

export const weightedOf = (o: Pick<Opportunity, "value_rial" | "probability">) => Math.round((o.value_rial * Math.max(0, Math.min(100, o.probability))) / 100);

export type SalesTotals = {
  won_value: number;
  won_count: number;
  open_value: number;
  /** فروش احتمالی = Σ ارزش × احتمال فرصت‌های باز */
  open_weighted: number;
  open_count: number;
  lost_value: number;
  lost_count: number;
};

export function salesTotalsOf(opps: readonly Opportunity[]): SalesTotals {
  const t: SalesTotals = { won_value: 0, won_count: 0, open_value: 0, open_weighted: 0, open_count: 0, lost_value: 0, lost_count: 0 };
  for (const o of opps) {
    if (o.status === "won") {
      t.won_value += o.value_rial;
      t.won_count++;
    } else if (o.status === "lost") {
      t.lost_value += o.value_rial;
      t.lost_count++;
    } else {
      t.open_value += o.value_rial;
      t.open_weighted += weightedOf(o);
      t.open_count++;
    }
  }
  return t;
}

export type ProbabilityGroup = { probability: number; items: Opportunity[]; value: number; weighted: number };

/** همه‌ی فرصت‌ها به ازای هر احتمال (نزولی) */
export function byProbability(opps: readonly Opportunity[]): ProbabilityGroup[] {
  const map = new Map<number, Opportunity[]>();
  opps.forEach((o) => map.set(o.probability, [...(map.get(o.probability) ?? []), o]));
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([probability, items]) => ({
      probability,
      items: [...items].sort((a, b) => b.value_rial - a.value_rial),
      value: items.reduce((s, o) => s + o.value_rial, 0),
      weighted: items.reduce((s, o) => s + weightedOf(o), 0),
    }));
}
