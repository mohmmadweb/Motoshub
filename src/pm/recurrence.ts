// ---------------------------------------------------------------------------
// تکرار و یادآوری مشترک تقویم (یادآورهای شخصی) و جلسات پروژه — زیرمجموعه‌ای از RRULE:
// روزانه، روزهای کاری، هفتگی در روزهای مشخص، ماهانه بر اساس تاریخ، سالانه؛ پایان با تعداد یا تاریخ؛
// استثناها (تاریخ‌هایی که حذف یا جداگانه ویرایش شده‌اند).
// همه‌ی توابع خالص‌اند و با «شماره‌ی روز» (dayNum) کار می‌کنند.
// ---------------------------------------------------------------------------
import { addDays, dayNum, fa, fromDayNum, monthLength, monthNames, parseJalali, weekDayNames, weekdayOf } from "./jalali";

export type RecurFreq = "daily" | "weekdays" | "weekly" | "monthly" | "yearly";
export type RecurRule = {
  freq: RecurFreq;
  /** هر چند روز/هفته/ماه/سال یک بار (پیش‌فرض ۱) */
  interval?: number;
  /** فقط هفتگی: روزهای هفته — ۰ = شنبه … ۶ = جمعه (پیش‌فرض: روز تاریخ شروع) */
  days?: number[];
  /** پایان پس از N بار */
  count?: number;
  /** پایان در این تاریخ (شامل) */
  until?: string;
  /** تاریخ‌هایی که از سری حذف شده‌اند (حذف تکی یا ویرایش «فقط این») */
  exceptions?: string[];
};

export type ReminderChannel = "inapp" | "sms" | "email";
export type Reminder = { minutes: number; channel: ReminderChannel };
export const reminderChannelLabel: Record<ReminderChannel, string> = { inapp: "درون‌برنامه", sms: "پیامک", email: "رایانامه" };
export const reminderPresets = [5, 10, 15, 30, 60, 120, 1440];

/** دامنه‌ی ویرایش/حذف یک وقوع از سری */
export type EditScope = "one" | "following" | "all";
export const editScopeLabel: Record<EditScope, string> = { one: "فقط این", following: "این و بعدی‌ها", all: "همه" };

export const freqLabel: Record<RecurFreq, string> = {
  daily: "روزانه",
  weekdays: "روزهای کاری (شنبه تا چهارشنبه)",
  weekly: "هفتگی",
  monthly: "ماهانه (همان تاریخ)",
  yearly: "سالانه",
};

const MAX_SCAN = 3700;

function dayOfMonthMatches(startDate: string, day: number, yearly: boolean, interval: number): boolean {
  const s = parseJalali(startDate);
  const d = parseJalali(fromDayNum(day));
  if (!s || !d) return false;
  const months = (d[0] - s[0]) * 12 + (d[1] - s[1]);
  if (yearly) {
    if (d[1] !== s[1]) return false;
    if ((d[0] - s[0]) % interval !== 0) return false;
  } else if (months % interval !== 0) return false;
  // اگر ماه کوتاه‌تر است، آخرین روز ماه
  const want = Math.min(s[2], monthLength(d[0], d[1]));
  return d[2] === want;
}

/** آیا الگوی تکرار (بدون درنظرگرفتن پایان/استثنا) شامل این روز است؟ */
export function matchesPattern(rule: RecurRule, startDate: string, day: number): boolean {
  const start = dayNum(startDate);
  if (start === null || day < start) return false;
  const iv = Math.max(1, rule.interval ?? 1);
  const wd = weekdayOf(fromDayNum(day));
  switch (rule.freq) {
    case "daily":
      return (day - start) % iv === 0;
    case "weekdays":
      return wd <= 4;
    case "weekly": {
      const days = rule.days?.length ? rule.days : [weekdayOf(startDate)];
      if (!days.includes(wd)) return false;
      const ws = start - weekdayOf(startDate);
      return Math.floor((day - ws) / 7) % iv === 0;
    }
    case "monthly":
      return dayOfMonthMatches(startDate, day, false, iv);
    case "yearly":
      return dayOfMonthMatches(startDate, day, true, iv);
  }
}

/** تعداد وقوع‌های الگو پیش از این روز (برای قید «پایان پس از N بار») */
export function countBefore(rule: RecurRule, startDate: string, day: number): number {
  const s = dayNum(startDate);
  if (s === null) return 0;
  let n = 0;
  for (let d = s; d < day && d - s < MAX_SCAN; d++) if (matchesPattern(rule, startDate, d)) n++;
  return n;
}

/** آیا آیتمی با تاریخ شروع و قاعده‌ی تکرار در این روز رخ می‌دهد؟ (بدون قاعده = فقط همان روز) */
export function recursOn(rule: RecurRule | undefined, startDate: string, day: number): boolean {
  const s = dayNum(startDate);
  if (s === null) return false;
  if (!rule) return day === s;
  if (day < s) return false;
  if (rule.until && day > (dayNum(rule.until) ?? Infinity)) return false;
  if (!matchesPattern(rule, startDate, day)) return false;
  if (rule.count && countBefore(rule, startDate, day) >= rule.count) return false;
  if (rule.exceptions?.some((x) => dayNum(x) === day)) return false;
  return true;
}

/** همه‌ی روزهای وقوع در بازه‌ی [from, to] */
export function expandDays(rule: RecurRule | undefined, startDate: string, from: number, to: number): number[] {
  const s = dayNum(startDate);
  if (s === null) return [];
  if (!rule) return s >= from && s <= to ? [s] : [];
  const out: number[] = [];
  const lo = Math.max(from, s);
  for (let d = lo; d <= to; d++) if (recursOn(rule, startDate, d)) out.push(d);
  return out;
}

/** تاریخ‌های وقوع در بازه‌ی [from, to] (شماره‌ی روز) — بدون قاعده فقط خود تاریخ */
export function occurrenceDates(rule: RecurRule | undefined, startDate: string, from: number, to: number): string[] {
  return expandDays(rule, startDate, from, to).map(fromDayNum);
}

/** نخستین وقوع از این روز به بعد */
export function nextOccurrence(rule: RecurRule | undefined, startDate: string, fromDay: number): number | null {
  const s = dayNum(startDate);
  if (s === null) return null;
  if (!rule) return s >= fromDay ? s : null;
  for (let d = Math.max(s, fromDay); d - fromDay < 800; d++) if (recursOn(rule, startDate, d)) return d;
  return null;
}

/** خلاصه‌ی فارسی قاعده: «هر هفته: شنبه، دوشنبه · ۱۰ بار» */
export function ruleLabel(rule: RecurRule | undefined, startDate?: string): string {
  if (!rule) return "بدون تکرار";
  const iv = Math.max(1, rule.interval ?? 1);
  let base = "";
  const s = startDate ? parseJalali(startDate) : null;
  switch (rule.freq) {
    case "daily":
      base = iv === 1 ? "هر روز" : `هر ${fa(iv)} روز`;
      break;
    case "weekdays":
      base = "روزهای کاری (شنبه تا چهارشنبه)";
      break;
    case "weekly": {
      const days = (rule.days?.length ? rule.days : startDate ? [weekdayOf(startDate)] : []).slice().sort();
      base = `${iv === 1 ? "هر هفته" : `هر ${fa(iv)} هفته`}${days.length ? `: ${days.map((d) => weekDayNames[d]).join("، ")}` : ""}`;
      break;
    }
    case "monthly":
      base = `${iv === 1 ? "هر ماه" : `هر ${fa(iv)} ماه`}${s ? ` روز ${fa(s[2])}` : ""}`;
      break;
    case "yearly":
      base = `هر سال${s ? ` ${fa(s[2])} ${monthNames[s[1] - 1]}` : ""}`;
      break;
  }
  const tail: string[] = [];
  if (rule.count) tail.push(`${fa(rule.count)} بار`);
  if (rule.until) tail.push(`تا ${rule.until}`);
  if (rule.exceptions?.length) tail.push(`${fa(rule.exceptions.length)} استثنا`);
  return tail.length ? `${base} · ${tail.join(" · ")}` : base;
}

export const reminderLabel = (r: Reminder) =>
  `${r.minutes >= 1440 && r.minutes % 1440 === 0 ? `${fa(r.minutes / 1440)} روز` : r.minutes >= 60 && r.minutes % 60 === 0 ? `${fa(r.minutes / 60)} ساعت` : `${fa(r.minutes)} دقیقه`} قبل · ${reminderChannelLabel[r.channel]}`;

/** جابه‌جایی روزهای هفته‌ی قاعده‌ی هفتگی به اندازه‌ی delta روز */
export function shiftRule(rule: RecurRule, delta: number): RecurRule {
  if (rule.freq !== "weekly" || !rule.days?.length || delta % 7 === 0) return rule;
  return { ...rule, days: [...new Set(rule.days.map((d) => (((d + delta) % 7) + 7) % 7))].sort() };
}

/** افزودن یک تاریخ به استثناهای سری */
export function withException(rule: RecurRule, date: string): RecurRule {
  const n = dayNum(date);
  if ((rule.exceptions ?? []).some((x) => dayNum(x) === n)) return rule;
  return { ...rule, exceptions: [...(rule.exceptions ?? []), date] };
}

/** پایان سری پیش از این تاریخ (برای «این و بعدی‌ها») */
export function endBefore(rule: RecurRule, startDate: string, date: string): RecurRule {
  const day = dayNum(date) ?? 0;
  const before = countBefore(rule, startDate, day);
  const r: RecurRule = { ...rule, until: addDays(date, -1) };
  if (rule.count) r.count = Math.max(1, Math.min(rule.count, before));
  return r;
}

/** قاعده‌ی سری تازه که از این تاریخ ادامه می‌یابد (تعداد باقی‌مانده حفظ می‌شود) */
export function continueFrom(rule: RecurRule, oldStart: string, date: string): RecurRule {
  const day = dayNum(date) ?? 0;
  const r: RecurRule = { ...rule, exceptions: (rule.exceptions ?? []).filter((x) => (dayNum(x) ?? 0) > day) };
  if (rule.count) r.count = Math.max(1, rule.count - countBefore(rule, oldStart, day));
  if (!r.exceptions?.length) delete r.exceptions;
  return r;
}

/**
 * ویرایش یک وقوع از سری با دامنه‌ی «فقط این / این و بعدی‌ها / همه».
 * series: رکورد اصلی (تاریخ شروع سری در date)، occDate: تاریخ وقوعی که کاربر باز کرده،
 * next: مقادیر تازه (date = تاریخ تازه‌ی همین وقوع).
 * خروجی: رکورد اصلیِ به‌روزشده (یا null برای حذف) و رکوردهای تازه‌ای که باید ساخته شوند (بدون شناسه).
 */
export function splitEdit<T extends { date: string }>(
  series: T,
  occDate: string,
  scope: EditScope,
  next: T,
  get: (x: T) => RecurRule | undefined,
  set: (x: T, r: RecurRule | undefined) => T,
): { update: T | null; create: T[] } {
  const rule = get(series);
  if (!rule) return { update: next, create: [] };
  const delta = (dayNum(next.date) ?? 0) - (dayNum(occDate) ?? 0);
  // اگر قاعده دست نخورده و فقط زمان جابه‌جا شده، روزهای هفته هم همراه تاریخ جابه‌جا می‌شوند
  const same = JSON.stringify({ ...(get(next) ?? rule), exceptions: undefined }) === JSON.stringify({ ...rule, exceptions: undefined });
  const nr = same ? shiftRule(rule, delta) : get(next) ?? rule;
  if (scope === "all" || (scope === "following" && dayNum(occDate) === dayNum(series.date))) {
    return { update: set({ ...next, date: addDays(series.date, delta) }, { ...nr, exceptions: rule.exceptions?.map((x) => addDays(x, delta)) }), create: [] };
  }
  if (scope === "one") return { update: set(series, withException(rule, occDate)), create: [set(next, undefined)] };
  return { update: set(series, endBefore(rule, series.date, occDate)), create: [set(next, continueFrom(nr, series.date, occDate))] };
}

/** حذف یک وقوع با دامنه — null یعنی کل رکورد حذف شود */
export function splitDelete<T extends { date: string }>(series: T, occDate: string, scope: EditScope, get: (x: T) => RecurRule | undefined, set: (x: T, r: RecurRule | undefined) => T): T | null {
  const rule = get(series);
  if (!rule || scope === "all" || (scope === "following" && dayNum(occDate) === dayNum(series.date))) return null;
  if (scope === "one") return set(series, withException(rule, occDate));
  return set(series, endBefore(rule, series.date, occDate));
}
