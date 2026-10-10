// ---------------------------------------------------------------------------
// محدودسازی تعداد درخواست‌ها (F10 · اقلام ۱.۱۹.۱ و ۱.۱۹.۲)
// rate_limit_policy { scope_id, api_per_minute_user, api_per_minute_ip, burst, limits[{kind,max,window_seconds}], exempt_roles, role_overrides, whitelist_ips }
// rate_limit_event { user_id, kind, at, ip }
// سقف عمومی «درخواست/دقیقه برای هر کاربر» همان rateLimitPerMinute پارامترهای زیرساخت است (منبع واحد،
// SettingsContext). شمارنده‌ها سمت مرورگر واقعاً اعمال می‌شوند (ارسال پاسخ/پرسش، پیام، بارگذاری).
// ذخیره: motoshub.rateLimit.v1
// ---------------------------------------------------------------------------
import { getWorkflowSettings } from "../context/SettingsContext";
import { users } from "../data/mock";
import { createLocalStore, useLocalStore } from "./store";
import { emitSecurityAudit } from "./securityAudit";
import { MIN, ipMatches, stampAt } from "./securityClock";
import { THIS_DEVICE_IP } from "./loginHistory";
import { evaluateRule } from "./blocks";

export type RateKind = "api" | "message" | "post" | "upload";
export const rateKindLabel: Record<RateKind, string> = { api: "درخواست API (همه)", message: "ارسال پیام", post: "پست، نظر و پاسخ", upload: "بارگذاری فایل" };
/** گروه endpointهای هر نوع — برای نمایش به تیم بک‌اند */
export const rateKindEndpoints: Record<RateKind, string> = {
  api: "/api/v1/*",
  message: "/messaging/*/messages/",
  post: "/core/comments/* · /forums/forums/posts/ · /contents/*",
  upload: "/core/file-manager/*/files/",
};

export type RateLimit = { kind: Exclude<RateKind, "api">; max: number; window_seconds: number };
export type RateLimitPolicy = {
  enabled: boolean;
  api_per_minute_ip: number;
  /** ظرفیت انفجاری مجاز بالای سقف (درصد) برای API */
  burst: number;
  limits: RateLimit[];
  /** نقش‌های معاف (راهبر، بات‌ها) */
  exempt_roles: string[];
  /** سقف API ویژه‌ی نقش (درخواست/دقیقه) */
  role_overrides: { role_id: string; api_per_minute: number }[];
  whitelist_ips: string[];
  updatedAt?: string;
  updatedBy?: string;
};
export type RateLimitEvent = { id: string; user_id: string; kind: RateKind; at: string; at_ms: number; ip: string; count: number; max: number };

export const WINDOW_OPTIONS = [
  { s: 60, label: "دقیقه" },
  { s: 600, label: "۱۰ دقیقه" },
  { s: 3600, label: "ساعت" },
  { s: 86400, label: "روز" },
];
export const windowLabel = (s: number) => WINDOW_OPTIONS.find((w) => w.s === s)?.label ?? `${s.toLocaleString("fa-IR")} ثانیه`;

export const defaultRatePolicy = (): RateLimitPolicy => ({
  enabled: true,
  api_per_minute_ip: 300,
  burst: 20,
  limits: [
    { kind: "message", max: 20, window_seconds: 60 },
    { kind: "post", max: 10, window_seconds: 3600 },
    { kind: "upload", max: 50, window_seconds: 86400 },
  ],
  exempt_roles: [],
  role_overrides: [],
  whitelist_ips: ["10.20.0.0/16"],
});

type State = { policy: RateLimitPolicy; hits: Record<string, number[]>; events: RateLimitEvent[]; seq: number };

function seed(): State {
  const now = Date.now();
  const ev = (i: number, user_id: string, kind: RateKind, ago: number, max: number): RateLimitEvent => ({ id: `rl${i}`, user_id, kind, at: stampAt(now - ago), at_ms: now - ago, ip: ["5.210.44.18", "94.182.3.5", "185.86.151.7"][i % 3], count: max + 1, max });
  return {
    policy: defaultRatePolicy(),
    hits: {},
    seq: 6,
    events: [ev(1, "u10", "message", 52 * MIN, 20), ev(2, "u10", "message", 47 * MIN, 20), ev(3, "u10", "message", 41 * MIN, 20), ev(4, "u9", "post", 5 * 60 * MIN, 10), ev(5, "u11", "api", 22 * 60 * MIN, 60), ev(6, "u8", "upload", 30 * 60 * MIN, 50)],
  };
}

export const rateStore = createLocalStore<State>("motoshub.rateLimit.v1", seed, (raw) => {
  const r = raw as Partial<State> | null;
  if (!r || !r.policy) return null;
  return { policy: { ...defaultRatePolicy(), ...r.policy }, hits: r.hits ?? {}, events: Array.isArray(r.events) ? r.events : [], seq: r.seq ?? 0 };
});
export const useRateLimit = () => useLocalStore(rateStore);

/** سقف هر نوع؛ برای api از پارامتر rateLimitPerMinute (یا سقف ویژه‌ی نقش) */
export function limitOf(p: RateLimitPolicy, kind: RateKind, roleIds: string[] = []): { max: number; window_seconds: number } {
  if (kind === "api") {
    const o = p.role_overrides.filter((x) => roleIds.includes(x.role_id)).map((x) => x.api_per_minute);
    const base = o.length ? Math.max(...o) : getWorkflowSettings().rateLimitPerMinute;
    return { max: Math.round(base * (1 + p.burst / 100)), window_seconds: 60 };
  }
  const l = p.limits.find((x) => x.kind === kind);
  return l ? { max: l.max, window_seconds: l.window_seconds } : { max: Infinity, window_seconds: 60 };
}

const key = (u: string, k: RateKind) => `${u}:${k}`;
/** مصرف فعلی در پنجره */
export function usage(st: State, userId: string, kind: RateKind, roleIds: string[] = []) {
  const l = limitOf(st.policy, kind, roleIds);
  const since = Date.now() - l.window_seconds * 1000;
  const list = (st.hits[key(userId, kind)] ?? []).filter((t) => t > since);
  const resetIn = list.length ? Math.max(0, list[0] + l.window_seconds * 1000 - Date.now()) : 0;
  return { used: list.length, ...l, resetIn };
}

export type RateResult = { ok: true } | { ok: false; error: string; retryAfter: number };
export const throttleMessage = (sec: number) => `تعداد درخواست‌های شما از حد مجاز بیشتر است؛ ${Math.max(1, sec).toLocaleString("fa-IR")} ثانیه دیگر تلاش کنید.`;

/**
 * ثبت n درخواست از نوع kind. اگر از سقف بگذرد رد می‌شود، رخداد ثبت و (یک بار در هر پنجره) در لاگ ممیزی
 * می‌آید و قاعده‌ی «عبور مکرر از سقف» مسدودسازی خودکار بررسی می‌شود.
 */
export function hit(userId: string, kind: RateKind, opts: { roleIds?: string[]; n?: number; ip?: string } = {}): RateResult {
  const st = rateStore.get();
  const p = st.policy;
  const n = opts.n ?? 1;
  const ip = opts.ip ?? THIS_DEVICE_IP;
  if (!p.enabled || (opts.roleIds ?? []).some((r) => p.exempt_roles.includes(r)) || p.whitelist_ips.some((w) => ipMatches(ip, w))) return { ok: true };
  const u = usage(st, userId, kind, opts.roleIds);
  if (u.used + n <= u.max) {
    const now = Date.now();
    const since = now - u.window_seconds * 1000;
    rateStore.set((s) => ({ ...s, hits: { ...s.hits, [key(userId, kind)]: [...(s.hits[key(userId, kind)] ?? []).filter((t) => t > since), ...Array.from({ length: n }, () => now)] } }));
    return { ok: true };
  }
  const retryAfter = Math.ceil((u.resetIn || u.window_seconds * 1000) / 1000);
  const now = Date.now();
  // یک رخداد برای هر «پنجره»ی مسدود (نه هر کلیک)
  const last = st.events.find((e) => e.user_id === userId && e.kind === kind);
  const fresh = !last || now - last.at_ms > Math.min(u.window_seconds * 1000, 60_000);
  if (fresh) {
    const ev: RateLimitEvent = { id: `rl${st.seq + 1}`, user_id: userId, kind, at: stampAt(now), at_ms: now, ip, count: u.used + n, max: u.max };
    rateStore.set((s) => ({ ...s, seq: s.seq + 1, events: [ev, ...s.events].slice(0, 300) }));
    emitSecurityAudit({ event: "security.rate_limited", affectedUserId: userId, actorId: "system", summary: `«${users.find((x) => x.id === userId)?.name ?? userId}» از سقف «${rateKindLabel[kind]}» (${u.max.toLocaleString("fa-IR")} در ${windowLabel(u.window_seconds)}) گذشت؛ پاسخ ۴۲۹ با Retry-After: ${retryAfter.toLocaleString("fa-IR")}` });
    evaluateRule(
      "rate_limit",
      userId,
      rateStore.get().events.filter((e) => e.user_id === userId).map((e) => e.at_ms),
    );
  }
  return { ok: false, error: throttleMessage(retryAfter), retryAfter };
}

/** رفع محدودیت: پاک کردن شمارنده‌های کاربر */
export function resetUserLimits(userId: string) {
  rateStore.set((s) => ({ ...s, hits: Object.fromEntries(Object.entries(s.hits).filter(([k]) => !k.startsWith(`${userId}:`))) }));
}

export function saveRatePolicy(policy: RateLimitPolicy, by: string) {
  rateStore.set((s) => ({ ...s, policy: { ...policy, updatedAt: stampAt(Date.now()), updatedBy: by } }));
}
