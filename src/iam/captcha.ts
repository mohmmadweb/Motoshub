// ---------------------------------------------------------------------------
// سیاست کپچا (F11 · قلم ۱.۱۹.۴)
// captcha_policy { login, login_after, register, register_after, password_reset, password_reset_after, type, difficulty }
// حالت‌ها: همیشه / پس از N تلاش ناموفق / IP مشکوک (خارج از بازه‌های مورد اعتماد سیاست ورود) / هرگز.
// تولید کپچا شبیه‌سازی‌شده است (در سرور: GET /identity/auth/captcha/ → تصویر + token).
// ذخیره: motoshub.captchaPolicy.v1 — شمار تلاش‌های ناموفق هر فرم در sessionStorage همین مرورگر.
// ---------------------------------------------------------------------------
import { createLocalStore, useLocalStore } from "./store";
import { loginPolicyStore } from "./loginPolicy";
import { THIS_DEVICE_IP } from "./loginHistory";
import { ipMatches, toLatinDigits } from "./securityClock";

export type CaptchaMode = "always" | "after_failures" | "suspicious_ip" | "never";
export const captchaModeLabel: Record<CaptchaMode, string> = { always: "همیشه", after_failures: "پس از N تلاش ناموفق", suspicious_ip: "فقط برای IP مشکوک", never: "هرگز" };
export type CaptchaForm = "login" | "register" | "password_reset";
export const captchaFormLabel: Record<CaptchaForm, string> = { login: "ورود", register: "ثبت‌نام", password_reset: "بازیابی گذرواژه" };
export type CaptchaType = "image_text" | "arithmetic";
export const captchaTypeLabel: Record<CaptchaType, string> = { image_text: "تصویر عددی", arithmetic: "عملیات ریاضی ساده" };
export type CaptchaDifficulty = "easy" | "medium" | "hard";
export const difficultyLabel: Record<CaptchaDifficulty, string> = { easy: "ساده", medium: "متوسط", hard: "دشوار" };

export type CaptchaPolicy = {
  login: CaptchaMode;
  login_after: number;
  register: CaptchaMode;
  register_after: number;
  password_reset: CaptchaMode;
  password_reset_after: number;
  type: CaptchaType;
  difficulty: CaptchaDifficulty;
  /** دکمه‌ی پخش صوتی برای دسترس‌پذیری */
  audio: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

export const defaultCaptchaPolicy = (): CaptchaPolicy => ({
  login: "after_failures",
  login_after: 3,
  register: "always",
  register_after: 0,
  password_reset: "always",
  password_reset_after: 0,
  type: "image_text",
  difficulty: "medium",
  audio: true,
});

export const captchaStore = createLocalStore<CaptchaPolicy>("motoshub.captchaPolicy.v1", defaultCaptchaPolicy, (raw) => (raw && typeof raw === "object" ? { ...defaultCaptchaPolicy(), ...(raw as Partial<CaptchaPolicy>) } : null));
export const useCaptchaPolicy = () => useLocalStore(captchaStore);

// ---------------------------------------------------------------- شمار تلاش ناموفق هر فرم (همین مرورگر)
const FKEY = "motoshub.captchaFailures.v1";
export function formFailures(form: CaptchaForm): number {
  try {
    return (JSON.parse(sessionStorage.getItem(FKEY) || "{}") as Record<string, number>)[form] ?? 0;
  } catch {
    return 0;
  }
}
export function setFormFailures(form: CaptchaForm, n: number) {
  try {
    const all = JSON.parse(sessionStorage.getItem(FKEY) || "{}") as Record<string, number>;
    sessionStorage.setItem(FKEY, JSON.stringify({ ...all, [form]: n }));
  } catch {
    /* نادیده */
  }
}

/** IP خارج از بازه‌های مورد اعتماد «سیاست ورود» */
export const isSuspiciousIp = (ip = THIS_DEVICE_IP) => !loginPolicyStore.get().trustedRanges.some((r) => ipMatches(ip, r.cidr));

/** آیا فرم با این تعداد تلاش ناموفق کپچا می‌خواهد؟ («پس از ۳» → از تلاش چهارم) */
export function captchaRequired(p: CaptchaPolicy, form: CaptchaForm, failures: number, ip = THIS_DEVICE_IP): boolean {
  const mode = p[form];
  if (mode === "always") return true;
  if (mode === "never") return false;
  if (mode === "suspicious_ip") return isSuspiciousIp(ip) || failures >= p[`${form}_after`];
  return failures >= p[`${form}_after`];
}

// ---------------------------------------------------------------- تولید (شبیه‌سازی)
export type Challenge = { token: string; text: string; answer: string; spoken: string };
const FA = "۰۱۲۳۴۵۶۷۸۹";
const faDigits = (s: string | number) => String(s).replace(/\d/g, (d) => FA[Number(d)]);
const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

export function newChallenge(type: CaptchaType, difficulty: CaptchaDifficulty): Challenge {
  const token = Math.random().toString(36).slice(2, 10);
  if (type === "arithmetic") {
    const hard = difficulty === "hard";
    const a = rnd(difficulty === "easy" ? 1 : 3, hard ? 19 : 9);
    const b = rnd(1, hard ? 12 : 9);
    const op = difficulty === "easy" ? "+" : Math.random() < 0.5 ? "+" : a >= b ? "−" : "+";
    const ans = op === "+" ? a + b : a - b;
    return { token, text: `${faDigits(a)} ${op} ${faDigits(b)} = ؟`, answer: String(ans), spoken: `${a} ${op === "+" ? "به‌علاوه" : "منهای"} ${b}` };
  }
  const len = difficulty === "easy" ? 4 : difficulty === "medium" ? 5 : 6;
  const digits = Array.from({ length: len }, () => rnd(0, 9)).join("");
  return { token, text: faDigits(digits), answer: digits, spoken: digits.split("").join(" ") };
}

/** پاسخ با ارقام فارسی، عربی یا لاتین پذیرفته می‌شود */
export const checkAnswer = (c: Challenge, input: string) => toLatinDigits(input).replace(/\s+/g, "") === c.answer;
