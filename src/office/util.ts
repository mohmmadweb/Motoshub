// ابزار مشترک «دبیرخانه و مشتریان»: افراد (principal_id)، تاریخ و قالب‌بندی اعداد.
import { users, type UserProfile } from "../data/mock";
import { dayNum, fromDayNum, toEnDigits } from "../pm/jalali";

// ------------------------------------------------------------------ افراد

/**
 * principal_id (UUID) هر کاربر. اگر داده‌ی نمونه‌ی کاربران `principal_id` داشته باشد همان است؛
 * وگرنه از شماره‌ی کاربر یک UUID قطعی ساخته می‌شود (u7 → …-000000000007).
 */
export function principalOf(userId: string): string {
  const u = users.find((x) => x.id === userId) as (UserProfile & { principal_id?: string }) | undefined;
  if (u?.principal_id) return u.principal_id;
  const n = Number(userId.replace(/\D/g, "")) || [...userId].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 1e11, 7);
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

const byPrincipal = new Map<string, UserProfile>();
export function userOfPrincipal(pid: string): UserProfile | undefined {
  if (!byPrincipal.size) users.forEach((u) => byPrincipal.set(principalOf(u.id), u));
  return byPrincipal.get(pid);
}
export const nameOf = (pid: string | null | undefined) => (pid ? (userOfPrincipal(pid)?.name ?? "کاربر حذف‌شده") : "—");

// ------------------------------------------------------------------ تاریخ

/** تاریخ مرجع دمو (هم‌راستا با DEMO_REF_DATE بقیه‌ی ماژول‌ها) */
export const OFFICE_TODAY = "1405/03/08";

const two = (n: number) => String(n).padStart(2, "0");
export const nowStamp = () => {
  const d = new Date();
  return `${OFFICE_TODAY} ${two(d.getHours())}:${two(d.getMinutes())}`;
};
/** هر ورودی (ارقام فارسی یا لاتین) → «1405/03/08» */
export const enDate = (s: string) => toEnDigits(s).trim();
export const dateOnly = (s: string | null | undefined) => (s ? s.split(" ")[0] : "");
export const yearOf = (s: string) => Number(enDate(s).slice(0, 4)) || 0;
export const monthOf = (s: string) => Number(enDate(s).slice(5, 7)) || 0;
export const addDaysEn = (s: string, n: number) => {
  const d = dayNum(s);
  return d === null ? s : enDate(fromDayNum(d + n));
};
/** a < b (فقط بخش تاریخ) */
export const before = (a: string, b: string) => (dayNum(dateOnly(a)) ?? 0) < (dayNum(dateOnly(b)) ?? 0);
export const daysBetween = (a: string, b: string) => (dayNum(dateOnly(b)) ?? 0) - (dayNum(dateOnly(a)) ?? 0);

// ------------------------------------------------------------------ نمایش

const FA = "۰۱۲۳۴۵۶۷۸۹";
/** ارقام لاتین → فارسی (فقط هنگام نمایش) */
export const toFa = (s: string | number | null | undefined) => (s === null || s === undefined || s === "" ? "—" : String(s).replace(/\d/g, (d) => FA[Number(d)]));
export const faNum = (n: number) => n.toLocaleString("fa-IR");
export const rial = (n: number) => `${Math.round(n).toLocaleString("fa-IR")} ریال`;
/** مبلغ کوتاه: «۲٫۴ میلیارد ریال» */
export const rialShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(Math.round((n / 1e9) * 10) / 10).toLocaleString("fa-IR")} میلیارد ریال`;
  if (a >= 1e6) return `${Math.round(n / 1e6).toLocaleString("fa-IR")} میلیون ریال`;
  return rial(n);
};
/** «۲٬۵۰۰٬۰۰۰» یا «2500000» → 2500000 */
export const parseAmount = (s: string) => Number(toEnDigits(s).replace(/[^\d]/g, "")) || 0;
export const fileSize = (b: number) => (b >= 1048576 ? `${(Math.round((b / 1048576) * 10) / 10).toLocaleString("fa-IR")} مگابایت` : `${Math.max(1, Math.round(b / 1024)).toLocaleString("fa-IR")} کیلوبایت`);
