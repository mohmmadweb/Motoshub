// ---------------------------------------------------------------------------
// شماره‌گذاری دبیرخانه — پیش‌فرض تصمیم‌گرفته‌شده: پیشوند + سال جلالی + شمارنده در هر سری
// (الگوی FundReferenceSequence(organization_id, prefix, reference_year, last_value) در funds).
//  - شمارنده فقط هنگام ثبت موفق جلو می‌رود → بدون شماره‌ی جاافتاده
//  - یکتایی در هر سری؛ ثبت انجام‌شده حذف یا ویرایش نمی‌شود (فقط بایگانی نامه)
//  - با reset_yearly شمارنده در سال جدید از start_number شروع می‌شود
// ---------------------------------------------------------------------------
import type { LetterRegistration, NumberSeries } from "./types";
import { yearOf } from "./util";

/** شمارنده‌ای که در سال `year` باید صادر شود */
export function nextCounter(s: NumberSeries, year: number): number {
  const fresh = s.reset_yearly && s.use_jalali_year && s.reference_year !== year;
  const last = fresh ? s.start_number - 1 : Math.max(s.counter, s.start_number - 1);
  return last + 1;
}

/** «ص/1405/0001» (ارقام لاتین؛ نمایش با toFa) */
export function formatNumber(s: Pick<NumberSeries, "prefix" | "use_jalali_year" | "suffix" | "pad">, year: number, counter: number): string {
  const parts = [s.prefix.trim(), s.use_jalali_year ? String(year) : "", String(counter).padStart(Math.max(1, s.pad), "0"), s.suffix.trim()];
  return parts.filter(Boolean).join("/");
}

/** پیش‌نمایش شماره‌ی بعدی برای تاریخ ثبت */
export function previewNumber(s: NumberSeries, registeredAt: string): string {
  const y = yearOf(registeredAt);
  return formatNumber(s, y, nextCounter(s, y));
}

export type IssueResult =
  | { ok: true; number: string; counter: number; reference_year: number; series: NumberSeries }
  | { ok: false; reason: string };

/**
 * صدور شماره (تابع خالص؛ انبار آن را در یک تراکنش set صدا می‌زند).
 * سری غیرفعال یا شماره‌ی تکراری رد می‌شود.
 */
export function issueNumber(s: NumberSeries, registeredAt: string, existing: readonly LetterRegistration[]): IssueResult {
  if (!s.active) return { ok: false, reason: "این سری شماره غیرفعال است." };
  const year = yearOf(registeredAt);
  if (!year) return { ok: false, reason: "تاریخ ثبت نامعتبر است." };
  const counter = nextCounter(s, year);
  const number = formatNumber(s, year, counter);
  if (existing.some((r) => r.series === s.id && r.number === number)) return { ok: false, reason: `شماره‌ی «${number}» پیش‌تر ثبت شده است.` };
  return { ok: true, number, counter, reference_year: year, series: { ...s, counter, reference_year: year } };
}

/** بررسی پیوستگی شماره‌های یک سری در یک سال (برای «دفتر ثبت»): شمارنده‌های جاافتاده */
export function gapsOf(regs: readonly LetterRegistration[], seriesId: number, year: number, start: number): number[] {
  const got = regs.filter((r) => r.series === seriesId && r.reference_year === year).map((r) => r.counter).sort((a, b) => a - b);
  if (!got.length) return [];
  const out: number[] = [];
  for (let c = Math.min(start, got[0]); c <= got[got.length - 1]; c++) if (!got.includes(c)) out.push(c);
  return out;
}
