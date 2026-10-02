// ---------------------------------------------------------------------------
// تنظیمات لایه‌ای (ارث‌بری سیستم ← هلدینگ ← شرکت ← واحد) + برند هر هلدینگ/شرکت.
// هر واحد می‌تواند مقدار را «بازنویسی» کند، مگر اینکه یکی از والدها آن را «قفل» کرده باشد.
// ذخیره: motoshub.scopedSettings.v1
// ---------------------------------------------------------------------------
import { systemIdentity } from "../data/tenancy";
import { ancestorsOrSelf, type IamState } from "./model";
import { createLocalStore } from "./store";
import { loginPolicyStore } from "./loginPolicy";

export type ScopedKey = "brand.name" | "brand.tagline" | "brand.color" | "brand.logo" | "security.sessionTimeoutMin" | "workflow.reportReminderDays" | "content.requireApproval";
export type ScopedValue = string | number | boolean;

export type ScopedMeta = { key: ScopedKey; label: string; group: "brand" | "behavior"; type: "text" | "color" | "logo" | "number" | "bool"; perm: string; unit?: string; hint?: string };
export const scopedMeta: ScopedMeta[] = [
  { key: "brand.name", label: "نام نمایشی", group: "brand", type: "text", perm: "settings.branding", hint: "در سربرگ منو و عنوان صفحه‌ها" },
  { key: "brand.tagline", label: "زیرعنوان", group: "brand", type: "text", perm: "settings.branding" },
  { key: "brand.color", label: "رنگ برند", group: "brand", type: "color", perm: "settings.branding" },
  { key: "brand.logo", label: "لوگو", group: "brand", type: "logo", perm: "settings.branding", hint: "PNG/SVG تا ۲۰۰ کیلوبایت؛ خالی = حروف اول نام" },
  { key: "security.sessionTimeoutMin", label: "مهلت نشست", group: "behavior", type: "number", unit: "دقیقه", perm: "settings.security" },
  { key: "workflow.reportReminderDays", label: "یادآوری سررسید گزارش", group: "behavior", type: "number", unit: "روز قبل", perm: "settings.system" },
  { key: "content.requireApproval", label: "تأیید محتوا پیش از انتشار", group: "behavior", type: "bool", perm: "settings.branding" },
];
export const scopedMetaOf = (k: ScopedKey) => scopedMeta.find((m) => m.key === k)!;

export const scopedDefaults: Record<ScopedKey, ScopedValue> = {
  "brand.name": systemIdentity.name,
  "brand.tagline": "فضای کاری سازمانی",
  "brand.color": systemIdentity.color,
  "brand.logo": "/bonyad-logo.png",
  "security.sessionTimeoutMin": 60,
  "workflow.reportReminderDays": 7,
  "content.requireApproval": false,
};

export type ScopeEntry = { values: Partial<Record<ScopedKey, ScopedValue>>; locks: ScopedKey[] };
export type ScopedState = { version: 1; byScope: Record<string, ScopeEntry> };

const seed = (): ScopedState => ({
  version: 1,
  byScope: {
    sys: { values: {}, locks: ["security.sessionTimeoutMin"] },
    "h-sina-food": { values: { "brand.name": "هلدینگ صنایع غذایی سینا", "brand.tagline": "فضای کاری هلدینگ", "brand.color": "#b45309", "brand.logo": "" }, locks: [] },
    "h-ferdows": { values: { "brand.name": "هلدینگ کشاورزی فردوس پارس", "brand.color": "#0d9488", "brand.logo": "" }, locks: ["brand.color"] },
    "c-bank-sina": { values: { "brand.name": "بانک سینا", "brand.color": "#1d4ed8", "brand.logo": "", "content.requireApproval": true }, locks: [] },
  },
});

export const scopedStore = createLocalStore<ScopedState>("motoshub.scopedSettings.v1", seed, (raw) => {
  const r = raw as Partial<ScopedState> | null;
  return r && r.version === 1 && r.byScope && typeof r.byScope === "object" ? (r as ScopedState) : null;
});

export type ScopedStatus = "root" | "inherited" | "overridden" | "locked";
export type Resolved = { value: ScopedValue; source: string | null; status: ScopedStatus; lockedBy?: string; lockedHere: boolean };

/** مقدار مؤثر یک کلید در یک واحد + وضعیت (ارث‌رسیده / بازنویسی‌شده / قفل‌شده) */
export function resolveScoped(state: ScopedState, iam: IamState, scopeId: string, key: ScopedKey): Resolved {
  const chain = ancestorsOrSelf(iam, scopeId).reverse(); // ریشه ← خود
  // مهلت نشستِ سطح سامانه از «سیاست ورود» می‌آید
  let value: ScopedValue = key === "security.sessionTimeoutMin" ? loginPolicyStore.get().sessionTimeoutMin : scopedDefaults[key];
  let source: string | null = null;
  let lockedBy: string | undefined;
  for (const n of chain) {
    const e = state.byScope[n.id];
    if (e && e.values[key] !== undefined) {
      value = e.values[key] as ScopedValue;
      source = n.id;
    }
    if (e?.locks.includes(key) && n.id !== scopeId) {
      lockedBy = n.id;
      break;
    }
  }
  const self = chain[chain.length - 1];
  const lockedHere = !!state.byScope[scopeId]?.locks.includes(key);
  const status: ScopedStatus = lockedBy ? "locked" : !self?.parentId ? "root" : source === scopeId ? "overridden" : "inherited";
  return { value, source, status, lockedBy, lockedHere };
}

export const statusLabel: Record<ScopedStatus, string> = { root: "مقدار سامانه", inherited: "ارث‌رسیده", overridden: "بازنویسی‌شده", locked: "قفل‌شده" };

/** حروف اول برای لوگوی جایگزین */
export function initialsOf(name: string) {
  const words = name
    .replace(/^(هلدینگ|شرکت|موسسه|گروه)\s+/, "")
    .split(/\s+/)
    .filter(Boolean);
  return (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
}
