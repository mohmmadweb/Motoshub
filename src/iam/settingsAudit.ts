// گذرگاه رویدادِ «تغییر تنظیمات» — انبارهای تنظیمات (SettingsContext، کانال‌ها، طبقه‌بندی،
// سیاست ورود، تنظیمات لایه‌ای) تغییر را اینجا اعلام می‌کنند و TenancyProvider آن را با رویداد
// `settings.changed` (قبل/بعد) در تاریخچه‌ی تغییرناپذیر IAM ثبت می‌کند.
// (SettingsProvider بیرون از TenancyProvider است؛ برای همین از گذرگاه استفاده می‌شود نه از هوک.)

export type SettingsChange = {
  /** حوزه‌ی تنظیمات، مثلاً «پارامترهای گردش کار» */
  area: string;
  /** شرح کوتاه */
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  /** واحدی که تنظیم به آن تعلق دارد (پیش‌فرض: کانتکست فعلی) */
  scopeId?: string;
};

const listeners = new Set<(c: SettingsChange) => void>();

export function emitSettingsChange(c: SettingsChange) {
  listeners.forEach((l) => l(c));
}

export function onSettingsChange(fn: (c: SettingsChange) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** فقط کلیدهایی که واقعاً تغییر کرده‌اند (برای قبل/بعدِ تمیز در لاگ) */
export function diffKeys<T extends object>(before: T, after: T): { before: Record<string, unknown>; after: Record<string, unknown> } | null {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  keys.forEach((k) => {
    const x = (before as Record<string, unknown>)[k];
    const y = (after as Record<string, unknown>)[k];
    if (JSON.stringify(x) !== JSON.stringify(y)) {
      b[k] = x;
      a[k] = y;
    }
  });
  return Object.keys(a).length ? { before: b, after: a } : null;
}
