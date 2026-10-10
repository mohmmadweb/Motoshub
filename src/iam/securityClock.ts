// زمان در انبارهای امنیتی: هر رکورد هم میلی‌ثانیه‌ی واقعی (برای انقضا و پنجره‌های زمانی) و هم
// برچسب شمسی دارد. «امروز» دمو ثابت است (DEMO_REF_DATE)، پس برچسب نسبت به امروزِ دمو ساخته می‌شود.
import { DEMO_REF_DATE } from "../pm/seed";
import { addDays, diffDays } from "../pm/jalali";

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

const pad = (n: number) => n.toLocaleString("fa-IR", { minimumIntegerDigits: 2, useGrouping: false });
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** «۱۴۰۵/۰۳/۰۸ ۱۴:۳۵» برای یک لحظه (نسبت به امروزِ دمو) */
export function stampAt(ms: number): string {
  const days = Math.floor((ms - startOfToday()) / DAY);
  const d = new Date(ms);
  return `${days === 0 ? DEMO_REF_DATE : addDays(DEMO_REF_DATE, days)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** مدت باقی‌مانده به زبان ساده: «۲ ساعت و ۱۰ دقیقه»، «۴۵ ثانیه» */
export function durationLabel(ms: number): string {
  if (ms <= 0) return "چند لحظه";
  const f = (n: number) => n.toLocaleString("fa-IR");
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  const m = Math.floor((ms % HOUR) / MIN);
  if (d) return h ? `${f(d)} روز و ${f(h)} ساعت` : `${f(d)} روز`;
  if (h) return m ? `${f(h)} ساعت و ${f(m)} دقیقه` : `${f(h)} ساعت`;
  if (m) return `${f(m)} دقیقه`;
  return `${f(Math.ceil(ms / 1000))} ثانیه`;
}

/** برچسب مدت بر حسب دقیقه (برای فرم‌ها): ۶۰ → «۱ ساعت»، null → «دائم» */
export function minutesLabel(min: number | null): string {
  return min === null ? "دائم" : durationLabel(min * MIN);
}

/** ارقام فارسی/عربی → لاتین */
export const toLatinDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/** IP با یک نشانی یا بازه‌ی CIDR جور است؟ */
export function ipMatches(ip: string, rule: string): boolean {
  if (!rule.includes("/")) return ip === rule.trim();
  const [base, bits] = rule.trim().split("/");
  const toN = (x: string) => x.split(".").reduce((a, o) => (a << 8) + (Number(o) & 255), 0) >>> 0;
  const b = Number(bits);
  const mask = b === 0 ? 0 : (~0 << (32 - b)) >>> 0;
  return (toN(ip) & mask) === (toN(base) & mask);
}

/** «۱۴۰۵/۰۳/۰۸ ۱۰:۲۲(:۰۰)» → میلی‌ثانیه (نسبت به امروزِ دمو) — برای رکوردهای SocialContext */
export function msFromStamp(stamp: string | null | undefined): number | null {
  if (!stamp) return null;
  const [date, time = "00:00"] = stamp.split(" ");
  const [h, m] = toLatinDigits(time).split(":").map((x) => Number(x) || 0);
  return startOfToday() + diffDays(DEMO_REF_DATE, date) * DAY + h * HOUR + m * MIN;
}
