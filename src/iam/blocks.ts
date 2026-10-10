// ---------------------------------------------------------------------------
// مسدودسازی کاربران ناهنجار (F12 · قلم ۱.۱۹.۵)
// user_block { user_id, kind: read_only|login|permanent, reason, source: manual|rule, rule_id, by, from, until }
// block_rule { trigger, threshold, window_minutes, kind, duration_minutes, needs_review }
// قاعده‌ی «تلاش ناموفق ورود» همان متغیرهای login_attempts و lock_minutes «نشست و قفل حساب» است
// (منبع واحد: motoshub.systemVars.v1). ذخیره‌ی بقیه: motoshub.userBlocks.v1
// ---------------------------------------------------------------------------
import { users } from "../data/mock";
import { saveSystemVars, systemVarsStore } from "../pages/settings/systemVars";
import { createLocalStore, useLocalStore } from "./store";
import { emitSecurityAudit } from "./securityAudit";
import { HOUR, MIN, durationLabel, minutesLabel, stampAt } from "./securityClock";
import { endAllSessions } from "./loginHistory";

export type BlockKind = "read_only" | "login" | "permanent";
export const blockKindLabel: Record<BlockKind, string> = { read_only: "فقط‌خواندنی (ممنوعیت ارسال)", login: "تعلیق ورود", permanent: "مسدود دائم" };
export const blockKindShort: Record<BlockKind, string> = { read_only: "فقط‌خواندنی", login: "تعلیق ورود", permanent: "دائم" };

export type UserBlock = {
  id: string;
  user_id: string;
  kind: BlockKind;
  reason: string;
  source: "manual" | "rule";
  rule_id: string | null;
  /** شناسه‌ی اقدام‌کننده یا «system» */
  by: string;
  from: string;
  from_ms: number;
  until: string | null;
  until_ms: number | null;
  /** قاعده‌ی خودکار با «نیاز به بازبینی راهبر» */
  needs_review?: boolean;
  reviewed_by?: string;
  lifted_at?: string;
  lifted_by?: string;
  lift_reason?: string;
};

export type BlockTrigger = "failed_logins" | "rate_limit" | "abuse_reports" | "spam";
export const triggerLabel: Record<BlockTrigger, string> = {
  failed_logins: "تلاش ناموفق ورود",
  rate_limit: "عبور مکرر از سقف درخواست",
  abuse_reports: "گزارش تخلفِ تأییدشده",
  spam: "پیام هرزنامه‌ی تأییدشده",
};
export const triggerUnit: Record<BlockTrigger, string> = { failed_logins: "تلاش ناموفق", rate_limit: "بار عبور از سقف", abuse_reports: "گزارش تأییدشده", spam: "هرزنامه‌ی تأییدشده" };

export type BlockRule = {
  id: string;
  trigger: BlockTrigger;
  enabled: boolean;
  threshold: number;
  /** بازه‌ی شمارش (دقیقه) */
  window_minutes: number;
  kind: BlockKind;
  /** null = دائم */
  duration_minutes: number | null;
  needs_review: boolean;
};

type State = {
  seq: number;
  blocks: UserBlock[];
  rules: BlockRule[];
  /** کاربرانی که هیچ قاعده‌ی خودکاری رویشان اعمال نمی‌شود */
  whitelist: string[];
  /** تلاش‌های ناموفق ورود به تفکیک کاربر (میلی‌ثانیه) */
  failures: Record<string, number[]>;
  updatedAt?: string;
  updatedBy?: string;
};

export const DURATION_OPTIONS: (number | null)[] = [60, 180, 360, 720, 1440, 4320, 10080, 43200, null];

const defaultRules = (): BlockRule[] => [
  { id: "br-login", trigger: "failed_logins", enabled: true, threshold: 5, window_minutes: 15, kind: "login", duration_minutes: 15, needs_review: false },
  { id: "br-rate", trigger: "rate_limit", enabled: true, threshold: 3, window_minutes: 60, kind: "read_only", duration_minutes: 360, needs_review: false },
  { id: "br-abuse", trigger: "abuse_reports", enabled: true, threshold: 3, window_minutes: 43200, kind: "read_only", duration_minutes: 4320, needs_review: true },
  { id: "br-spam", trigger: "spam", enabled: false, threshold: 2, window_minutes: 1440, kind: "read_only", duration_minutes: 1440, needs_review: false },
];

function seed(): State {
  const now = Date.now();
  const b = (id: string, user_id: string, kind: BlockKind, reason: string, source: UserBlock["source"], rule_id: string | null, by: string, fromAgo: number, dur: number | null, extra: Partial<UserBlock> = {}): UserBlock => ({
    id,
    user_id,
    kind,
    reason,
    source,
    rule_id,
    by,
    from: stampAt(now - fromAgo),
    from_ms: now - fromAgo,
    until: dur === null ? null : stampAt(now - fromAgo + dur),
    until_ms: dur === null ? null : now - fromAgo + dur,
    ...extra,
  });
  return {
    seq: 4,
    rules: defaultRules(),
    whitelist: ["u1"],
    failures: {},
    blocks: [
      b("ub1", "u10", "read_only", "۳ بار عبور از سقف ارسال پیام در یک ساعت", "rule", "br-rate", "system", 40 * MIN, 6 * HOUR),
      b("ub2", "u11", "login", "ارسال مکرر پیام تبلیغاتی در گروه‌ها (گزارش‌های تأییدشده)", "manual", null, "u1", 20 * HOUR, 72 * HOUR),
      b("ub3", "u8", "read_only", "۳ گزارش تخلف تأییدشده در ۳۰ روز", "rule", "br-abuse", "system", 3 * HOUR, 72 * HOUR, { needs_review: true }),
      b("ub4", "u6", "read_only", "انتشار مطلب تکراری در چند کانال", "manual", null, "u2", 9 * 24 * HOUR, 24 * HOUR, { lifted_at: stampAt(now - 8 * 24 * HOUR), lifted_by: "u2", lift_reason: "پس از توضیح کاربر" }),
    ],
  };
}

export const blocksStore = createLocalStore<State>("motoshub.userBlocks.v1", seed, (raw) => {
  const r = raw as Partial<State> | null;
  if (!r || !Array.isArray(r.blocks)) return null;
  const d = seed();
  return { seq: r.seq ?? r.blocks.length, blocks: r.blocks, rules: Array.isArray(r.rules) ? r.rules : d.rules, whitelist: r.whitelist ?? d.whitelist, failures: r.failures ?? {}, updatedAt: r.updatedAt, updatedBy: r.updatedBy };
});

/** قواعد با مقدار زنده‌ی login_attempts / lock_minutes (منبع واحد) */
export function rulesWithVars(st: State): BlockRule[] {
  const v = systemVarsStore.get().values;
  return st.rules.map((r) => (r.trigger === "failed_logins" ? { ...r, threshold: Number(v.login_attempts) || r.threshold, duration_minutes: Number(v.lock_minutes) || r.duration_minutes } : r));
}

export function useBlocks() {
  const st = useLocalStore(blocksStore);
  useLocalStore(systemVarsStore);
  return { ...st, rules: rulesWithVars(st) };
}

const uname = (id: string) => (id === "system" ? "سامانه" : users.find((u) => u.id === id)?.name ?? id);

// ---------------------------------------------------------------- خواندن
export const isLive = (b: UserBlock, now = Date.now()) => !b.lifted_at && (b.until_ms === null || b.until_ms > now);
const severity: Record<BlockKind, number> = { read_only: 1, login: 2, permanent: 3 };

/** شدیدترین مسدودی فعالِ کاربر */
export function activeBlockOf(userId: string, st: State = blocksStore.get()): UserBlock | null {
  const now = Date.now();
  return st.blocks.filter((b) => b.user_id === userId && isLive(b, now)).sort((a, b) => severity[b.kind] - severity[a.kind] || (b.until_ms ?? Infinity) - (a.until_ms ?? Infinity))[0] ?? null;
}

/** پیام کاربرپسند: نوع، دلیل و زمان پایان */
export function blockMessage(b: UserBlock): string {
  const left = b.until_ms === null ? "به‌صورت دائم" : `تا ${b.until} (${durationLabel(b.until_ms - Date.now())} دیگر)`;
  const what = b.kind === "read_only" ? "حساب شما فقط‌خواندنی است و امکان ارسال ندارید" : b.kind === "login" ? "ورود به این حساب معلق شده است" : "این حساب مسدود است";
  return `${what} ${left}. دلیل: ${b.reason}`;
}

// ---------------------------------------------------------------- نوشتن
export type BlockInput = { userId: string; kind: BlockKind; reason: string; durationMinutes: number | null; by: string; source?: UserBlock["source"]; ruleId?: string | null; needsReview?: boolean };

export function blockUser(i: BlockInput): UserBlock {
  const now = Date.now();
  let made!: UserBlock;
  blocksStore.set((st) => {
    const seq = st.seq + 1;
    made = {
      id: `ub${seq}`,
      user_id: i.userId,
      kind: i.kind,
      reason: i.reason.trim() || "—",
      source: i.source ?? "manual",
      rule_id: i.ruleId ?? null,
      by: i.by,
      from: stampAt(now),
      from_ms: now,
      until: i.durationMinutes === null ? null : stampAt(now + i.durationMinutes * MIN),
      until_ms: i.durationMinutes === null ? null : now + i.durationMinutes * MIN,
      ...(i.needsReview ? { needs_review: true } : {}),
    };
    return { ...st, seq, blocks: [made, ...st.blocks] };
  });
  if (made.kind !== "read_only") endAllSessions(made.user_id, "مسدودسازی حساب");
  emitSecurityAudit({
    event: made.source === "rule" && made.kind === "login" && made.rule_id === "br-login" ? "security.locked" : "security.blocked",
    affectedUserId: made.user_id,
    actorId: made.by,
    summary: `«${uname(made.user_id)}» ${blockKindShort[made.kind]} شد (${minutesLabel(i.durationMinutes)}) — ${made.source === "rule" ? "قاعده‌ی خودکار" : "دستی"}؛ دلیل: ${made.reason}`,
    after: { kind: made.kind, until: made.until ?? "دائم", reason: made.reason },
  });
  return made;
}

export function liftBlock(id: string, by: string, reason = "") {
  const b = blocksStore.get().blocks.find((x) => x.id === id);
  if (!b || b.lifted_at) return;
  blocksStore.set((st) => ({ ...st, blocks: st.blocks.map((x) => (x.id === id ? { ...x, lifted_at: stampAt(Date.now()), lifted_by: by, lift_reason: reason || undefined, needs_review: false } : x)) }));
  emitSecurityAudit({ event: "security.unblocked", affectedUserId: b.user_id, actorId: by, summary: `مسدودی «${uname(b.user_id)}» (${blockKindShort[b.kind]}) برداشته شد${reason ? `؛ ${reason}` : ""}.` });
}

/** تأیید مسدودیِ خودکاری که بازبینی راهبر می‌خواست */
export function confirmReview(id: string, by: string) {
  blocksStore.set((st) => ({ ...st, blocks: st.blocks.map((x) => (x.id === id ? { ...x, needs_review: false, reviewed_by: by } : x)) }));
}

export function saveBlockPolicy(rules: BlockRule[], whitelist: string[], by: string) {
  const login = rules.find((r) => r.trigger === "failed_logins");
  // منبع واحد: تعداد تلاش و مدت قفل در متغیرهای «نشست و قفل حساب»
  if (login) saveSystemVars({ login_attempts: String(login.threshold), lock_minutes: String(login.duration_minutes ?? 15) }, "مسدودسازی خودکار");
  blocksStore.set((st) => ({ ...st, rules, whitelist, updatedAt: stampAt(Date.now()), updatedBy: by }));
}

// ---------------------------------------------------------------- قواعد خودکار
const ruleOf = (t: BlockTrigger) => rulesWithVars(blocksStore.get()).find((r) => r.trigger === t && r.enabled);
const exempt = (userId: string) => blocksStore.get().whitelist.includes(userId);

/** تلاش ناموفق ورود؛ اگر به سقف برسد حساب قفل می‌شود و مسدودی برگردانده می‌شود */
export function registerLoginFailure(userId: string): { locked: UserBlock | null; count: number; max: number } {
  const r = ruleOf("failed_logins");
  const now = Date.now();
  const win = (r?.window_minutes ?? 15) * MIN;
  const list = [...(blocksStore.get().failures[userId] ?? []).filter((t) => t > now - win), now];
  blocksStore.set((st) => ({ ...st, failures: { ...st.failures, [userId]: list } }));
  if (!r || exempt(userId)) return { locked: null, count: list.length, max: 0 };
  if (list.length < r.threshold || activeBlockOf(userId)) return { locked: null, count: list.length, max: r.threshold };
  blocksStore.set((st) => ({ ...st, failures: { ...st.failures, [userId]: [] } }));
  const locked = blockUser({ userId, kind: r.kind, durationMinutes: r.duration_minutes, reason: `${r.threshold.toLocaleString("fa-IR")} تلاش ناموفق ورود در ${minutesLabel(r.window_minutes)}`, by: "system", source: "rule", ruleId: r.id, needsReview: r.needs_review });
  return { locked, count: list.length, max: r.threshold };
}
export function clearLoginFailures(userId: string) {
  if (blocksStore.get().failures[userId]?.length) blocksStore.set((st) => ({ ...st, failures: { ...st.failures, [userId]: [] } }));
}

/** شمار رویدادهای اخیر (مثلاً عبور از سقف یا گزارش تأییدشده) → اعمال قاعده اگر به آستانه رسید */
export function evaluateRule(trigger: Exclude<BlockTrigger, "failed_logins">, userId: string, eventTimesMs: number[]): UserBlock | null {
  const r = ruleOf(trigger);
  if (!r || exempt(userId) || activeBlockOf(userId)) return null;
  // فقط رویدادهای پس از آخرین اعمال همین قاعده شمرده می‌شوند (تا پس از پایان مسدودی دوباره اعمال نشود)
  const since = Math.max(Date.now() - r.window_minutes * MIN, ...blocksStore.get().blocks.filter((b) => b.user_id === userId && b.rule_id === r.id).map((b) => b.from_ms));
  const n = eventTimesMs.filter((t) => t > since).length;
  if (n < r.threshold) return null;
  return blockUser({ userId, kind: r.kind, durationMinutes: r.duration_minutes, reason: `${n.toLocaleString("fa-IR")} ${triggerUnit[trigger]} در ${minutesLabel(r.window_minutes)}`, by: "system", source: "rule", ruleId: r.id, needsReview: r.needs_review });
}
