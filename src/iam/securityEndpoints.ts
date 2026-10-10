// endpointهای «پیشنهادی» امنیت حساب — در API فعلی نیستند؛ رابط کاربری آن‌ها را شبیه‌سازی می‌کند
// و در دکمه‌ی API (ApiChip) با برچسب «پیشنهادی» نمایش داده می‌شوند.
import type { Ep } from "../social/endpoints";

const p = (method: Ep["method"], path: string): Ep => ({ method, path, proposed: true });

export const securityEndpoints = {
  // F07 — آخرین ورودهای موفق
  myLogins: () => p("GET", "/identity/me/logins/?limit=20"),
  userLogins: (id: string) => p("GET", `/identity/users/${id}/logins/`),
  sessionEnd: (id: string) => p("DELETE", `/identity/me/sessions/${id}/`),
  notMe: () => p("POST", "/identity/me/logins/not-me/"),
  // F10 — محدودسازی درخواست‌ها
  rateLimits: () => p("GET", "/core/setting/rate-limits/"),
  rateLimitsSave: () => p("PATCH", "/core/setting/rate-limits/"),
  rateLimitEvents: () => p("GET", "/core/rate-limit-events/"),
  rateLimitReset: (id: string) => p("DELETE", `/core/rate-limit-events/users/${id}/`),
  // F11 — کپچا
  captcha: () => p("GET", "/identity/auth/captcha/"),
  captchaPolicy: () => p("GET", "/core/setting/captcha-policy/"),
  captchaPolicySave: () => p("PATCH", "/core/setting/captcha-policy/"),
  // F12 — مسدودسازی
  userBlocks: (id: string) => p("GET", `/identity/users/${id}/blocks/`),
  userBlockCreate: (id: string) => p("POST", `/identity/users/${id}/blocks/`),
  userBlockDelete: (id: string, b: string) => p("DELETE", `/identity/users/${id}/blocks/${b}/`),
  blockRules: () => p("GET", "/core/setting/block-rules/"),
  blockRulesSave: () => p("PATCH", "/core/setting/block-rules/"),
};
