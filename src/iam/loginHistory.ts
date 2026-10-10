// ---------------------------------------------------------------------------
// تاریخچه‌ی ورودهای موفق و نشست‌ها (F07 · قلم ۱.۱۶.۱)
// login_event { id, user_id, at, ip, geo, user_agent, method, success, session_id } + وضعیت نشست.
// نشست‌های فعال پروفایل از همین رکوردها ساخته می‌شوند (نه فهرست ثابت). هر ورود دمو (صفحه‌ی ورود یا
// تغییر کاربر نمایشی) یک رکورد تازه و «نشست فعلی» می‌سازد. ذخیره: motoshub.loginHistory.v1
// ---------------------------------------------------------------------------
import { users } from "../data/mock";
import { createLocalStore, useLocalStore } from "./store";
import { emitSecurityAudit } from "./securityAudit";
import { DAY, HOUR, MIN, stampAt } from "./securityClock";

export type LoginMethod = "password" | "otp" | "mobile_app" | "sso";
export const loginMethodLabel: Record<LoginMethod, string> = { password: "گذرواژه", otp: "گذرواژه + رمز یک‌بارمصرف", mobile_app: "اپلیکیشن همراه", sso: "ورود یکپارچه" };

export type LoginEvent = {
  id: string;
  user_id: string;
  /** برچسب شمسی */
  at: string;
  at_ms: number;
  ip: string;
  /** مکان تقریبی «شهر، کشور» */
  geo: string;
  /** «Chrome · Windows» */
  user_agent: string;
  device: "desktop" | "mobile";
  method: LoginMethod;
  success: true;
  session_id: string;
  session_status: "active" | "ended";
  ended_at?: string;
  /** چرا بسته شد: خروج، پایان دستی، «این من نبودم»، مسدودسازی */
  ended_reason?: string;
};

type State = {
  seq: number;
  events: LoginEvent[];
  /** شناسه‌ی نشست فعلیِ هر کاربر در این مرورگر */
  current: Record<string, string>;
  /** مدت نگهداری تاریخچه (روز) — تنظیمات امنیت */
  retention_days: number;
};

export const LOGIN_LIST_LIMIT = 20;
/** IP شبیه‌سازی‌شده‌ی همین مرورگر */
export const THIS_DEVICE_IP = "37.32.10.21";

/** برچسب مرورگر و سیستم‌عامل از userAgent واقعی */
export function describeAgent(ua = typeof navigator !== "undefined" ? navigator.userAgent : ""): { label: string; device: "desktop" | "mobile" } {
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "مرورگر";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "نامشخص";
  return { label: `${browser} · ${os}`, device: /Android|iPhone|iPad|Mobile/.test(ua) ? "mobile" : "desktop" };
}

// ---------------------------------------------------------------- داده‌ی نمونه
const PLACES = [
  { ip: "37.32.10.21", geo: "تهران، ایران", ua: "Chrome · Windows", device: "desktop" as const },
  { ip: "5.210.44.18", geo: "تهران، ایران", ua: "اپلیکیشن سامانه · Android", device: "mobile" as const },
  { ip: "94.182.3.5", geo: "اصفهان، ایران", ua: "Safari · iOS", device: "mobile" as const },
  { ip: "185.112.32.40", geo: "تهران، ایران (VPN سازمانی)", ua: "Firefox · Windows", device: "desktop" as const },
];
const SUSPICIOUS = { ip: "185.86.151.7", geo: "استانبول، ترکیه", ua: "Chrome · Linux", device: "desktop" as const };

function seed(): State {
  const now = Date.now();
  const events: LoginEvent[] = [];
  const current: Record<string, string> = {};
  let seq = 0;
  users.forEach((u, ui) => {
    const n = 14 + (ui % 5);
    for (let k = n - 1; k >= 0; k--) {
      // فاصله‌ی ورودها: ۵ تا ۲۰ ساعت
      const ms = now - k * (5 + ((k * 7 + ui) % 15)) * HOUR - 3 * MIN;
      const pl = k === 0 ? PLACES[0] : PLACES[(k + ui) % PLACES.length];
      const sid = `ss-${u.id}-${k}`;
      events.push({
        id: `le${++seq}`,
        user_id: u.id,
        at: stampAt(ms),
        at_ms: ms,
        ip: pl.ip,
        geo: pl.geo,
        user_agent: pl.ua,
        device: pl.device,
        method: pl.device === "mobile" && pl.ua.startsWith("اپلیکیشن") ? "mobile_app" : k % 4 === 1 ? "otp" : "password",
        success: true,
        session_id: sid,
        // نشست فعلی + نشست همراه اخیر باز می‌مانند
        session_status: k === 0 || (k <= 3 && pl.device === "mobile") ? "active" : "ended",
        ...(k === 0 || (k <= 3 && pl.device === "mobile") ? {} : { ended_at: stampAt(ms + 2 * HOUR), ended_reason: "خروج" }),
      });
      if (k === 0) current[u.id] = sid;
    }
    // یک ورود مشکوک از کشور و دستگاه تازه برای چند کاربر (هنوز باز است)
    if (ui % 3 === 0) {
      const ms = now - (26 + ui) * HOUR;
      events.push({ id: `le${++seq}`, user_id: u.id, at: stampAt(ms), at_ms: ms, ip: SUSPICIOUS.ip, geo: SUSPICIOUS.geo, user_agent: SUSPICIOUS.ua, device: SUSPICIOUS.device, method: "password", success: true, session_id: `ss-${u.id}-x`, session_status: "active" });
    }
  });
  return { seq, events, current, retention_days: 90 };
}

export const loginHistoryStore = createLocalStore<State>("motoshub.loginHistory.v1", seed, (raw) => {
  const r = raw as Partial<State> | null;
  if (!r || !Array.isArray(r.events)) return null;
  return { seq: r.seq ?? r.events.length, events: r.events, current: r.current ?? {}, retention_days: r.retention_days ?? 90 };
});
export const useLoginHistory = () => useLocalStore(loginHistoryStore);

// ---------------------------------------------------------------- خواندن
const live = (st: State) => {
  const min = Date.now() - st.retention_days * DAY;
  return st.events.filter((e) => e.at_ms >= min);
};
export function loginsOf(st: State, userId: string, limit = LOGIN_LIST_LIMIT) {
  return live(st)
    .filter((e) => e.user_id === userId)
    .sort((a, b) => b.at_ms - a.at_ms)
    .slice(0, limit);
}
export function activeSessionsOf(st: State, userId: string) {
  return loginsOf(st, userId, 500).filter((e) => e.session_status === "active");
}
/** ورود از دستگاه یا کشور تازه: ترکیب «مرورگر» یا «کشور» در ورودهای قبلی همین کاربر نبوده */
export function noveltyOf(st: State, e: LoginEvent): { newDevice: boolean; newCountry: boolean } {
  const prior = st.events.filter((x) => x.user_id === e.user_id && x.at_ms < e.at_ms);
  if (prior.length < 3) return { newDevice: false, newCountry: false };
  const country = (g: string) => g.split("،").pop()?.replace(/\(.*\)/, "").trim() ?? g;
  return { newDevice: !prior.some((x) => x.user_agent === e.user_agent), newCountry: !prior.some((x) => country(x.geo) === country(e.geo)) };
}

// ---------------------------------------------------------------- نوشتن
const nextId = (st: State) => ({ seq: st.seq + 1, id: `le${st.seq + 1}` });

/** ثبت ورود موفق — از صفحه‌ی ورود و هنگام تغییر کاربر نمایشی (TenancyProvider) */
export function recordLogin(userId: string, method: LoginMethod = "password", opts: { silent?: boolean } = {}) {
  const ms = Date.now();
  const ag = describeAgent();
  loginHistoryStore.set((st) => {
    const { seq, id } = nextId(st);
    const session_id = `ss-${userId}-${ms.toString(36)}`;
    // نشست قبلیِ همین مرورگر برای این کاربر بسته می‌شود
    const prev = st.current[userId];
    const events = st.events.map((e) => (e.session_id === prev && e.session_status === "active" ? { ...e, session_status: "ended" as const, ended_at: stampAt(ms), ended_reason: "ورود دوباره از همین مرورگر" } : e));
    const ev: LoginEvent = { id, user_id: userId, at: stampAt(ms), at_ms: ms, ip: THIS_DEVICE_IP, geo: "تهران، ایران", user_agent: ag.label, device: ag.device, method, success: true, session_id, session_status: "active" };
    // سقف رکورد هر کاربر
    const mine = events.filter((e) => e.user_id === userId);
    const drop = new Set(mine.length >= 200 ? mine.sort((a, b) => a.at_ms - b.at_ms).slice(0, mine.length - 199).map((e) => e.id) : []);
    return { ...st, seq, events: [...events.filter((e) => !drop.has(e.id)), ev], current: { ...st.current, [userId]: session_id } };
  });
  if (!opts.silent) emitSecurityAudit({ event: "security.login", affectedUserId: userId, actorId: userId, summary: `ورود موفق «${users.find((u) => u.id === userId)?.name ?? userId}» با ${loginMethodLabel[method]} از ${THIS_DEVICE_IP} (${ag.label})` });
}

function closeWhere(pred: (e: LoginEvent) => boolean, reason: string) {
  const ms = Date.now();
  let n = 0;
  loginHistoryStore.set((st) => ({
    ...st,
    events: st.events.map((e) => {
      if (e.session_status !== "active" || !pred(e)) return e;
      n++;
      return { ...e, session_status: "ended" as const, ended_at: stampAt(ms), ended_reason: reason };
    }),
  }));
  return n;
}

/** پایان یک نشست */
export function endSession(sessionId: string, actorId: string) {
  const ev = loginHistoryStore.get().events.find((e) => e.session_id === sessionId);
  if (!ev || !closeWhere((e) => e.session_id === sessionId, "پایان دستی نشست")) return;
  emitSecurityAudit({ event: "security.session_ended", affectedUserId: ev.user_id, actorId, summary: `نشست ${ev.user_agent} از ${ev.ip} (${ev.geo}) بسته شد.` });
}

/** «این من نبودم»: همه‌ی نشست‌های دیگرِ کاربر بسته و رویداد ثبت می‌شود */
export function reportNotMe(userId: string, suspectId?: string) {
  const st = loginHistoryStore.get();
  const cur = st.current[userId];
  const suspect = suspectId ? st.events.find((e) => e.id === suspectId) : undefined;
  const n = closeWhere((e) => e.user_id === userId && e.session_id !== cur, "گزارش «این من نبودم»");
  emitSecurityAudit({
    event: "security.not_me",
    affectedUserId: userId,
    actorId: userId,
    summary: `کاربر ورود${suspect ? ` ${suspect.at} از ${suspect.ip} (${suspect.geo})` : ""} را «این من نبودم» گزارش کرد؛ ${n.toLocaleString("fa-IR")} نشست دیگر بسته شد.`,
  });
  return n;
}

/** بستن همه‌ی نشست‌های کاربر (هنگام مسدودسازی ورود) */
export function endAllSessions(userId: string, reason: string) {
  return closeWhere((e) => e.user_id === userId, reason);
}

export function setLoginRetention(days: number) {
  loginHistoryStore.set((st) => ({ ...st, retention_days: Math.max(7, Math.min(730, Math.round(days))) }));
}
