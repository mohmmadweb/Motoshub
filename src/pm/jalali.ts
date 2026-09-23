// ---------------------------------------------------------------------------
// ابزار تاریخ شمسی برای ماژول مدیریت پروژه — تبدیل «۱۴۰۵/۰۲/۱۵» به شماره‌ی روز
// تا گانت، گراف وابستگی، تقویم و زمان‌بندِ اعلان‌ها بتوانند فاصله‌ی روزها را حساب کنند.
// ---------------------------------------------------------------------------

function div(a: number, b: number) {
  return Math.floor(a / b);
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy += 1595;
  let days = -355668 + 365 * jy + div(jy, 33) * 8 + div((jy % 33) + 3, 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const monthDays = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13 && gd > monthDays[gm]; gm++) gd -= monthDays[gm];
  return [gy, gm, gd];
}

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) + gd + gdm[gm - 1];
  let jy = -1595 + 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

export const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
export const weekDayNames = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

const faDigits = "۰۱۲۳۴۵۶۷۸۹";
const arDigits = "٠١٢٣٤٥٦٧٨٩";

/** ارقام فارسی/عربی را به لاتین برمی‌گرداند */
export function toEnDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (c) => String(faDigits.indexOf(c))).replace(/[٠-٩]/g, (c) => String(arDigits.indexOf(c)));
}

export const fa = (n: number, grouping = false) => n.toLocaleString("fa-IR", { useGrouping: grouping, maximumFractionDigits: 1 });

export function parseJalali(s: string | undefined): [number, number, number] | null {
  if (!s) return null;
  const m = toEnDigits(s).match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** شماره‌ی روز (روزهای گذشته از ۱۹۷۰) — برای مقایسه و فاصله‌ی تاریخ‌ها */
export function dayNum(s: string | undefined): number | null {
  const p = parseJalali(s);
  if (!p) return null;
  const [gy, gm, gd] = jalaliToGregorian(p[0], p[1], p[2]);
  return Math.round(Date.UTC(gy, gm - 1, gd) / 86400000);
}

export function fromDayNum(n: number): string {
  const d = new Date(n * 86400000);
  const [jy, jm, jd] = gregorianToJalali(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  return formatJalali(jy, jm, jd);
}

export function formatJalali(jy: number, jm: number, jd: number): string {
  return `${fa(jy)}/${fa(jm).padStart(2, "۰")}/${fa(jd).padStart(2, "۰")}`;
}

export function addDays(s: string, n: number): string {
  const d = dayNum(s);
  return d === null ? s : fromDayNum(d + n);
}

/** b − a به روز */
export function diffDays(a: string, b: string): number {
  const x = dayNum(a);
  const y = dayNum(b);
  return x === null || y === null ? 0 : y - x;
}

export function monthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const next = dayNum(formatJalali(jy + 1, 1, 1))!;
  const start = dayNum(formatJalali(jy, 12, 1))!;
  return next - start;
}

/** روز هفته با شنبه = ۰ */
export function weekdayOf(s: string): number {
  const d = dayNum(s);
  if (d === null) return 0;
  // ۱۹۷۰/۰۱/۰۱ پنجشنبه بود → شنبه‌مبنا = ۵
  return (((d + 5) % 7) + 7) % 7;
}

export function nowClock(): string {
  const d = new Date();
  return `${fa(d.getHours()).padStart(2, "۰")}:${fa(d.getMinutes()).padStart(2, "۰")}`;
}

/** مبلغ ریالی با جداکننده‌ی هزارگان فارسی */
export function fmtRial(n: number): string {
  return `${Math.round(n).toLocaleString("fa-IR")} ریال`;
}

/** مبلغ کوتاه: «۶٫۶ میلیارد» */
export function fmtShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${fa(Math.round((n / 1e9) * 10) / 10)} میلیارد`;
  if (abs >= 1e6) return `${fa(Math.round(n / 1e6))} میلیون`;
  return Math.round(n).toLocaleString("fa-IR");
}

/** «۲٬۸۰۰٬۰۰۰٬۰۰۰ ریال» → 2800000000 */
export function parseRial(s: string): number {
  return Number(toEnDigits(s).replace(/[^\d]/g, "")) || 0;
}
