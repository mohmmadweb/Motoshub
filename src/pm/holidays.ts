// ---------------------------------------------------------------------------
// تقویم کاری سازمان — منبع واحد برای ظرفیت (بار کاری)، تقویم و «زمان مشترک» جلسات.
// منبع حقیقت: تنظیمات کارکرد (تایم‌شیت، تنظیمات سامانه ← «کارکرد و مرخصی»):
//   ساعت موظف روزانه، ساعت پنجشنبه (۰ = تعطیل) و فهرست تعطیلات سازمانی/رسمی.
// TimesheetProvider با هر تغییر setWorkCalendar را صدا می‌زند؛ پیش از آن، مقدار از همان
// انبار localStorage (motoshub.timesheet.v1) خوانده می‌شود. جمعه همیشه تعطیل است.
// بازه‌ی ساعت شروع/پایان روز (برای جلسه و دسترس‌پذیری) جداست: پیش‌فرض‌های پروژه (workHours).
// HOLIDAYS_1405 فقط فهرست اولیه‌ی تعطیلات رسمی است (بذر تنظیمات کارکرد)؛ قمری‌ها با رؤیت هلال ممکن است جابه‌جا شوند.
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

export type WorkCalendar = {
  /** ساعت موظف روزهای شنبه تا چهارشنبه */
  dailyHours: number;
  /** ساعت موظف پنجشنبه؛ ۰ یعنی پنجشنبه تعطیل است */
  thursdayHours: number;
  holidays: Holiday[];
};

/** تعطیلات رسمی را به فهرست اضافه می‌کند (بدون تکرار تاریخ یا مناسبت) — برای مهاجرت یک‌باره‌ی تنظیمات کارکرد */
export function withOfficialHolidays(list: { date: string; title: string }[]): Holiday[] {
  const days = new Set(list.map((h) => dayNum(h.date)));
  const titles = new Set(list.map((h) => h.title));
  const extra = HOLIDAYS_1405.filter((h) => !days.has(dayNum(h.date)) && !titles.has(h.title));
  return [...list, ...extra].sort((a, b) => (dayNum(a.date) ?? 0) - (dayNum(b.date) ?? 0));
}

const FALLBACK: WorkCalendar = { dailyHours: 8, thursdayHours: 0, holidays: HOLIDAYS_1405 };

/** خواندن مستقیم تنظیمات کارکرد از localStorage (قبل از بالا آمدن TimesheetProvider) */
function readStored(): WorkCalendar {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("motoshub.timesheet.v1") : null;
    const st = raw ? (JSON.parse(raw) as { settings?: { dailyHours?: number; thursdayHours?: number; holidays?: Holiday[]; officialHolidaysMerged?: boolean } }).settings : undefined;
    if (st && typeof st.dailyHours === "number") {
      const hol = Array.isArray(st.holidays) ? st.holidays : [];
      return { dailyHours: st.dailyHours, thursdayHours: st.thursdayHours ?? 0, holidays: st.officialHolidaysMerged ? hol : withOfficialHolidays(hol) };
    }
  } catch {
    /* داده‌ی خراب — پیش‌فرض */
  }
  return FALLBACK;
}

let calendar: WorkCalendar = FALLBACK;
let holidayMap = new Map<number, Holiday>();

/** ساعت کاری روزانه (زنده؛ از تنظیمات کارکرد) — با let صادر می‌شود تا وارد‌کننده‌ها مقدار تازه را ببینند */
export let DAILY_HOURS = FALLBACK.dailyHours;

/** به‌روزرسانی تقویم کاری (TimesheetProvider با هر تغییر تنظیمات صدا می‌زند) */
export function setWorkCalendar(next: { dailyHours: number; thursdayHours: number; holidays: { date: string; title: string; lunar?: boolean }[] }) {
  calendar = { dailyHours: next.dailyHours > 0 ? next.dailyHours : 8, thursdayHours: Math.max(0, next.thursdayHours || 0), holidays: next.holidays };
  DAILY_HOURS = calendar.dailyHours;
  holidayMap = new Map();
  calendar.holidays.forEach((h) => {
    const d = dayNum(h.date);
    if (d === null) return;
    const prev = holidayMap.get(d);
    holidayMap.set(d, prev ? { ...prev, title: `${prev.title} · ${h.title}` } : h);
  });
}
setWorkCalendar(readStored());

/** تقویم کاری فعلی (ساعت روزانه، ساعت پنجشنبه، تعطیلات) */
export const getWorkCalendar = (): WorkCalendar => calendar;
/** ساعت موظف یک روز (جمعه و تعطیل ۰، پنجشنبه از تنظیمات کارکرد) */
export function hoursOn(d: number): number {
  const w = weekdayOf(fromDayNum(d));
  if (w === 6 || holidayMap.has(d)) return 0;
  return w === 5 ? calendar.thursdayHours : calendar.dailyHours;
}

export const holidayOn = (d: number) => holidayMap.get(d);
/** جمعه، و پنجشنبه اگر در تنظیمات کارکرد ساعت موظف نداشته باشد (شنبه‌مبنا: ۵ = پنجشنبه، ۶ = جمعه) */
export const isWeekend = (d: number) => {
  const w = weekdayOf(fromDayNum(d));
  return w === 6 || (w === 5 && calendar.thursdayHours <= 0);
};
export const isWorkday = (d: number) => !isWeekend(d) && !holidayMap.has(d);

/** روزهای کاری در بازه‌ی [from, to] (شماره‌ی روز) */
export function workdaysBetween(from: number, to: number): number {
  let n = 0;
  for (let d = from; d <= to; d++) if (isWorkday(d)) n++;
  return n;
}

/** تعطیلات (غیر آخر هفته) در یک بازه */
export function holidaysBetween(from: number, to: number): Holiday[] {
  const out: Holiday[] = [];
  for (let d = from; d <= to; d++) {
    const h = holidayMap.get(d);
    if (h && !isWeekend(d)) out.push(h);
  }
  return out;
}

/** ظرفیت ساعتی یک عضو در بازه با درصد تخصیص (پنجشنبه با ساعت موظف خودش) */
export function capacityHours(allocationPct: number, from: number, to: number) {
  let h = 0;
  for (let d = from; d <= to; d++) h += hoursOn(d);
  return (h * allocationPct) / 100;
}
