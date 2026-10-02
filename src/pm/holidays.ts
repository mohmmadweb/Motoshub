// ---------------------------------------------------------------------------
// تقویم کاری ایران برای محاسبه‌ی ظرفیت (بار کاری تیم):
// جمعه‌ها و پنجشنبه‌ها کاری نیست (شنبه تا چهارشنبه ۸ ساعت)، به‌علاوه‌ی تعطیلات رسمی سال.
// تعطیلات قمری بر اساس تقویم رسمی پیش‌بینی شده و ممکن است با رؤیت هلال یک روز جابه‌جا شود.
// (ماژول timesheet در حال ساخت است؛ وقتی آماده شد، مرخصی‌های تأییدشده هم از آن کم می‌شود.)
// ---------------------------------------------------------------------------
import { dayNum, weekdayOf, fromDayNum } from "./jalali";

export type Holiday = { date: string; title: string; lunar?: boolean };

export const HOLIDAYS_1405: Holiday[] = [
  { date: "۱۴۰۵/۰۱/۰۱", title: "جشن نوروز / عید فطر" },
  { date: "۱۴۰۵/۰۱/۰۲", title: "عید نوروز" },
  { date: "۱۴۰۵/۰۱/۰۳", title: "عید نوروز" },
  { date: "۱۴۰۵/۰۱/۰۴", title: "عید نوروز" },
  { date: "۱۴۰۵/۰۱/۱۲", title: "روز جمهوری اسلامی" },
  { date: "۱۴۰۵/۰۱/۱۳", title: "روز طبیعت" },
  { date: "۱۴۰۵/۰۱/۲۵", title: "شهادت امام جعفر صادق (ع)", lunar: true },
  { date: "۱۴۰۵/۰۳/۰۶", title: "عید سعید قربان", lunar: true },
  { date: "۱۴۰۵/۰۳/۱۴", title: "رحلت امام خمینی (ره) / عید غدیر" },
  { date: "۱۴۰۵/۰۳/۱۵", title: "قیام ۱۵ خرداد" },
  { date: "۱۴۰۵/۰۴/۰۴", title: "تاسوعای حسینی", lunar: true },
  { date: "۱۴۰۵/۰۴/۰۵", title: "عاشورای حسینی", lunar: true },
  { date: "۱۴۰۵/۰۵/۱۳", title: "اربعین حسینی", lunar: true },
  { date: "۱۴۰۵/۰۵/۲۱", title: "رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)", lunar: true },
  { date: "۱۴۰۵/۰۵/۲۳", title: "شهادت امام رضا (ع)", lunar: true },
  { date: "۱۴۰۵/۰۵/۳۱", title: "شهادت امام حسن عسکری (ع)", lunar: true },
  { date: "۱۴۰۵/۰۶/۰۹", title: "میلاد رسول اکرم (ص) و امام جعفر صادق (ع)", lunar: true },
  { date: "۱۴۰۵/۰۸/۲۲", title: "شهادت حضرت فاطمه زهرا (س)", lunar: true },
  { date: "۱۴۰۵/۱۰/۰۲", title: "ولادت امام علی (ع)", lunar: true },
  { date: "۱۴۰۵/۱۰/۱۶", title: "مبعث رسول اکرم (ص)", lunar: true },
  { date: "۱۴۰۵/۱۱/۰۴", title: "ولادت حضرت قائم (عج)", lunar: true },
  { date: "۱۴۰۵/۱۱/۲۲", title: "پیروزی انقلاب اسلامی" },
  { date: "۱۴۰۵/۱۲/۰۹", title: "شهادت امام علی (ع)", lunar: true },
  { date: "۱۴۰۵/۱۲/۱۹", title: "عید سعید فطر", lunar: true },
  { date: "۱۴۰۵/۱۲/۲۰", title: "تعطیل عید فطر", lunar: true },
  { date: "۱۴۰۵/۱۲/۲۹", title: "ملی‌شدن صنعت نفت" },
];

const holidayMap = new Map(HOLIDAYS_1405.map((h) => [dayNum(h.date)!, h]));

/** ساعت کاری روزانه */
export const DAILY_HOURS = 8;

export const holidayOn = (d: number) => holidayMap.get(d);
/** پنجشنبه (۵) و جمعه (۶) با شنبه‌مبنا */
export const isWeekend = (d: number) => {
  const w = weekdayOf(fromDayNum(d));
  return w === 5 || w === 6;
};
export const isWorkday = (d: number) => !isWeekend(d) && !holidayMap.has(d);

/** روزهای کاری در بازه‌ی [from, to] (شماره‌ی روز) */
export function workdaysBetween(from: number, to: number): number {
  let n = 0;
  for (let d = from; d <= to; d++) if (isWorkday(d)) n++;
  return n;
}

/** تعطیلات رسمی (غیر آخر هفته) در یک بازه */
export function holidaysBetween(from: number, to: number): Holiday[] {
  const out: Holiday[] = [];
  for (let d = from; d <= to; d++) {
    const h = holidayMap.get(d);
    if (h && !isWeekend(d)) out.push(h);
  }
  return out;
}

/** ظرفیت ساعتی یک عضو در بازه با درصد تخصیص */
export const capacityHours = (allocationPct: number, from: number, to: number) => (workdaysBetween(from, to) * DAILY_HOURS * allocationPct) / 100;
