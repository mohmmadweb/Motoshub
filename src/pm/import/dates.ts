// ---------------------------------------------------------------------------
// تبدیل تاریخ و مدت در درون‌ریزی کارها — هر قالبی که ابزارهای دیگر خروجی می‌دهند به قالب
// ذخیره‌ی کاریز («۱۴۰۵/۰۳/۱۲») و ساعت تبدیل می‌شود.
//   شمسی: ۱۴۰۵/۰۳/۱۲، 1405/3/12، 1405-03-12، با یا بدون ساعت، «۱۲ خرداد ۱۴۰۵»؛ ارقام فارسی/عربی
//   میلادی: 2026-06-01، 2026-06-01T09:00:00.000Z (ترلو/Linear)، 6/1/2026 (Asana/Trello CSV)،
//           12/Jun/26 10:30 AM (Jira)، «Monday, June 1st 2026» (ClickUp)، مُهر زمانی میلی‌ثانیه (ClickUp)،
//           شماره‌ی سریال تاریخ اکسل (۴۶۱۷۴ = ۲۰۲۶/۰۶/۰۱)
// ---------------------------------------------------------------------------
import { formatJalali, gregorianToJalali, monthNames, toEnDigits } from "../jalali";

const enMonths = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/** نام ماه‌های شمسی با املاهای رایج (اردیبهشت/اُردیبهشت، مرداد/امرداد) */
const faMonthIdx = (w: string): number => {
  const s = w.replace(/[ً-ْ‌]/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک");
  const i = monthNames.findIndex((m) => m.replace(/‌/g, "") === s);
  if (i >= 0) return i + 1;
  if (s === "امرداد") return 5;
  return 0;
};

const jalaliOk = (y: number, m: number, d: number) => y >= 1300 && y < 1500 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
const gregOk = (y: number, m: number, d: number) => y > 1700 && y < 2300 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
const fromGreg = (y: number, m: number, d: number) => {
  const [jy, jm, jd] = gregorianToJalali(y, m, d);
  return formatJalali(jy, jm, jd);
};
const fromEpochMs = (ms: number) => {
  const d = new Date(ms);
  return fromGreg(d.getFullYear(), d.getMonth() + 1, d.getDate());
};

/** هر قالب تاریخ ← «۱۴۰۵/۰۳/۱۲»؛ نامعتبر ← null */
export function parseAnyDate(v: string | undefined | null): string | null {
  if (!v) return null;
  const s = toEnDigits(String(v).trim()).replace(/[٫]/g, ".");
  if (!s) return null;

  // فقط عدد: مُهر زمانی (ثانیه/میلی‌ثانیه) یا سریال اکسل
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n > 1e11) return fromEpochMs(n); // میلی‌ثانیه (ClickUp)
    if (n > 1e9) return fromEpochMs(n * 1000); // ثانیه
    if (n > 20000 && n < 80000) return fromEpochMs(Math.round((n - 25569) * 86400000) + 12 * 3600000); // سریال اکسل
    return null;
  }

  // ISO میلادی با زمان (ترلو، Linear): بر اساس منطقه‌ی زمانی مرورگر
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return fromEpochMs(t);
  }

  // ۱۲/Jun/26 یا 12-Jun-2026 (Jira)
  let m = s.match(/(\d{1,2})[/\-. ]([A-Za-z]{3,})[/\-. ,]+(\d{2,4})/);
  if (m) {
    const mo = enMonths.indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    if (mo && gregOk(y, mo, Number(m[1]))) return fromGreg(y, mo, Number(m[1]));
  }
  // June 1st 2026 / Monday, June 1st, 2026 (ClickUp «… Text»)
  m = s.match(/([A-Za-z]{3,})\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})/);
  if (m) {
    const mo = enMonths.indexOf(m[1].slice(0, 3).toLowerCase()) + 1;
    if (mo && gregOk(Number(m[3]), mo, Number(m[2]))) return fromGreg(Number(m[3]), mo, Number(m[2]));
  }
  // ۱۲ خرداد ۱۴۰۵
  m = s.match(/(\d{1,2})\s+([؀-ۿ‌]+)\s+(\d{4})/);
  if (m) {
    const mo = faMonthIdx(m[2]);
    if (mo && jalaliOk(Number(m[3]), mo, Number(m[1]))) return formatJalali(Number(m[3]), mo, Number(m[1]));
  }

  // عددی با جداکننده: YYYY/MM/DD (شمسی یا میلادی) یا M/D/YYYY یا D/M/YYYY
  m = s.match(/(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})/);
  if (!m) return null;
  let [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (a < 100 && c >= 1000) {
    // M/D/YYYY (پیش‌فرض خروجی‌های آمریکایی)؛ اگر عدد اول بزرگ‌تر از ۱۲ بود D/M/YYYY
    const [mo, d] = a > 12 ? [b, a] : [a, b];
    [a, b, c] = [c, mo, d];
  }
  if (jalaliOk(a, b, c)) return formatJalali(a, b, c);
  if (gregOk(a, b, c)) return fromGreg(a, b, c);
  return null;
}

/**
 * مدت ← ساعت. واحد عددِ بی‌واحد از ابزار مبدأ می‌آید (Jira: ثانیه، ClickUp: میلی‌ثانیه، بقیه: ساعت).
 * متن دارای واحد هم خوانده می‌شود: «2h 30m»، «1d»، «۳ ساعت»، «۹۰ دقیقه» (۱ روز = ۸ ساعت کاری).
 */
export function parseDurationHours(v: string | undefined | null, unit: "hours" | "seconds" | "ms" = "hours"): number {
  if (!v) return 0;
  const s = toEnDigits(String(v).trim()).replace(/[٫]/g, ".").toLowerCase();
  if (!s) return 0;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    return unit === "seconds" ? n / 3600 : unit === "ms" ? n / 3600000 : n;
  }
  let h = 0;
  let hit = false;
  const re = /(\d+(?:\.\d+)?)\s*(weeks|week|w|هفته|days|day|d|روز|hours|hour|hrs|hr|h|ساعت|minutes|minute|mins|min|m|دقیقه)/g;
  for (const x of s.matchAll(re)) {
    const n = Number(x[1]);
    const u = x[2];
    hit = true;
    if (/^(w|week|weeks|هفته)$/.test(u)) h += n * 40;
    else if (/^(d|day|days|روز)$/.test(u)) h += n * 8;
    else if (/^(h|hr|hrs|hour|hours|ساعت)$/.test(u)) h += n;
    else h += n / 60;
  }
  if (hit) return Math.round(h * 100) / 100;
  const n = Number(s.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
