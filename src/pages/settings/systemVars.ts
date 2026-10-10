// ---------------------------------------------------------------------------
// متغیرهای سیستم (آپلود، نشست و قفل حساب، فید، صف اعلان) — یک منبع واحد که هر گروهش در
// بخشِ ماژول خودش نمایش داده می‌شود: «تنظیمات کلی» (آپلود و محتوا)، «ورود و احراز هویت»
// (نشست و قفل حساب) و «اعلان‌ها و کانال‌ها» (صف و خلاصه‌ی روزانه).
// ذخیره: motoshub.systemVars.v1 — هر ذخیره در تاریخچه (settings.changed) ثبت می‌شود.
// ---------------------------------------------------------------------------
import { createLocalStore, useLocalStore } from "../../iam/store";
import { diffKeys, emitSettingsChange } from "../../iam/settingsAudit";

export type SystemVarArea = "upload" | "session" | "content" | "notify";
export const systemVarAreaLabel: Record<SystemVarArea, string> = {
  upload: "آپلود و فایل",
  session: "نشست و قفل حساب",
  content: "محتوا و فید",
  notify: "صف اعلان و خلاصه‌ی روزانه",
};

export type SystemVarMeta = { key: string; area: SystemVarArea; label: string; hint?: string; def: string };
export const systemVarMeta: SystemVarMeta[] = [
  { key: "upload_max_mb", area: "upload", label: "حداکثر حجم آپلود (مگابایت)", def: "100", hint: "برای هر فایل؛ فایل‌های بزرگ‌تر به صورت چندتکه (chunk) ارسال می‌شوند" },
  { key: "chunk_size_mb", area: "upload", label: "اندازه هر تکه آپلود (مگابایت)", def: "10", hint: "کوچک‌تر = پایدارتر روی اینترنت ضعیف، بزرگ‌تر = سریع‌تر" },
  { key: "user_quota_gb", area: "upload", label: "سهمیه دیسک هر کاربر (گیگابایت)", def: "5", hint: "پس از پر شدن، آپلود جدید مسدود می‌شود" },
  { key: "image_max_px", area: "upload", label: "حداکثر ابعاد تصویر (پیکسل)", def: "1920", hint: "تصاویر بزرگ‌تر به این ابعاد کوچک می‌شوند" },
  { key: "session_hours", area: "session", label: "طول عمر نشست (ساعت)", def: "24", hint: "پس از این مدت — حتی با فعالیت — کاربر باید دوباره وارد شود" },
  { key: "login_attempts", area: "session", label: "حداکثر تلاش ناموفق ورود", def: "5", hint: "پس از آن حساب موقتاً قفل می‌شود" },
  { key: "lock_minutes", area: "session", label: "مدت قفل حساب (دقیقه)", def: "15" },
  { key: "feed_page_size", area: "content", label: "تعداد آیتم هر صفحه فید", def: "20" },
  { key: "notif_batch", area: "notify", label: "حداکثر اعلان ارسالی در هر دقیقه", def: "500", hint: "برای کنترل فشار روی صف اعلان‌ها" },
  { key: "digest_hour", area: "notify", label: "ساعت ارسال خلاصه روزانه", def: "8", hint: "به وقت سرور؛ ترجیح هر کاربر در «اعلان‌ها ← تنظیمات اعلان من»" },
];

export type SystemVars = { values: Record<string, string>; maintenance: boolean };
const defaults = (): SystemVars => ({ values: Object.fromEntries(systemVarMeta.map((m) => [m.key, m.def])), maintenance: false });

export const systemVarsStore = createLocalStore<SystemVars>("motoshub.systemVars.v1", defaults, (raw) => {
  const r = raw as Partial<SystemVars> | null;
  if (!r || typeof r.values !== "object" || !r.values) return null;
  return { values: { ...defaults().values, ...r.values }, maintenance: !!r.maintenance };
});

export const useSystemVars = () => useLocalStore(systemVarsStore);

/** ذخیره‌ی چند متغیر + ثبت در تاریخچه */
export function saveSystemVars(patch: Record<string, string>, area: string) {
  const cur = systemVarsStore.get();
  const next = { ...cur.values, ...patch };
  const d = diffKeys(cur.values, next);
  if (!d) return false;
  systemVarsStore.set({ ...cur, values: next });
  const names = Object.keys(d.after).map((k) => systemVarMeta.find((m) => m.key === k)?.label ?? k);
  emitSettingsChange({ area, summary: `تغییر ${names.join("، ")}`, before: d.before, after: d.after });
  return true;
}

export function setMaintenance(on: boolean) {
  const cur = systemVarsStore.get();
  systemVarsStore.set({ ...cur, maintenance: on });
  emitSettingsChange({ area: "تنظیمات کلی", summary: on ? "حالت تعمیر و نگهداری روشن شد" : "حالت تعمیر و نگهداری خاموش شد", before: { maintenance: cur.maintenance }, after: { maintenance: on } });
}
