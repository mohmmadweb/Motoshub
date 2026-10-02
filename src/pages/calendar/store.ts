// ---------------------------------------------------------------------------
// انبار محلی تقویم یکپارچه — localStorage «motoshub.calendar.v1» (نسخه‌ی داده ۲)
// یادآورها/بلوک‌های شخصی همه‌ی کاربران دمو + ترجیحات نمایش (لایه‌ها، نما، همکاران).
// انبار در سطح ماژول است تا همه‌ی صفحه‌ها (تقویم، بررسی هم‌پوشانی جلسه و رویداد) یک داده ببینند.
// مهاجرت تحمل‌پذیر: داده‌ی نسخه‌ی ۱ (تکرار «none/daily/weekly») بدون تغییر بار می‌شود.
// ---------------------------------------------------------------------------
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { addDays } from "../../pm/jalali";
import { DEMO_REF_DATE } from "../../pm/seed";
import { layerOrder, type Layer, type PersonalItem } from "./model";

export const CAL_KEY = "motoshub.calendar.v1";
const CAL_VERSION = 2;
export type CalView = "day" | "week" | "month" | "list";

type Prefs = { layers: Record<Layer, boolean>; view: CalView; team: string[]; teamOn: boolean };
type CalStore = { version: number; items: PersonalItem[]; prefs: Record<string, Prefs> };

const defaultLayers = () => Object.fromEntries(layerOrder.map((l) => [l, true])) as Record<Layer, boolean>;
const defaultPrefs = (): Prefs => ({ layers: defaultLayers(), view: "week", team: [], teamOn: false });

/** چند بلوک نمونه تا نمای تیم و «یافتن زمان مشترک» در دمو معنا داشته باشد (امروزِ دمو جمعه است؛ نمونه‌ها از شنبه) */
function seed(): CalStore {
  const t = DEMO_REF_DATE;
  const mk = (id: string, ownerId: string, title: string, date: string, start: string, end: string, extra: Partial<PersonalItem> = {}): PersonalItem => ({
    id,
    ownerId,
    title,
    date,
    start,
    end,
    repeat: "none",
    color: "#059669",
    private: false,
    busy: true,
    ...extra,
  });
  return {
    version: CAL_VERSION,
    items: [
      mk("pi-1", "u1", "مرور هفتگی کارها", addDays(t, -6), "۰۸:۰۰", "۰۸:۴۵", { repeat: "weekly", rrule: { freq: "weekly", days: [0] }, color: "#1f4f99", reminders: [{ minutes: 10, channel: "inapp" }] }),
      mk("pi-2", "u1", "زمان تمرکز — بدون جلسه", addDays(t, 1), "۱۳:۰۰", "۱۴:۳۰", { repeat: "daily", rrule: { freq: "weekdays" }, color: "#7c3aed", private: true }),
      mk("pi-3", "u1", "پیگیری گزارش هفتگی ستاد", addDays(t, 2), "۱۱:۰۰", "۱۱:۳۰", { color: "#d97706", busy: false, reminders: [{ minutes: 30, channel: "sms" }] }),
      mk("pi-10", "u1", "بستن کارکرد ماه", "۱۴۰۵/۰۳/۲۴", "۱۴:۰۰", "۱۴:۳۰", { color: "#0891b2", busy: false, rrule: { freq: "monthly", count: 6 }, reminders: [{ minutes: 1440, channel: "email" }] }),
      mk("pi-4", "u3", "جلسه‌ی هیئت‌مدیره", addDays(t, 1), "۰۹:۰۰", "۱۱:۰۰"),
      mk("pi-5", "u3", "بازدید میدانی", addDays(t, 2), "۰۸:۰۰", "۱۲:۰۰", { private: true }),
      mk("pi-6", "u4", "کارگاه آموزشی", addDays(t, 1), "۱۰:۰۰", "۱۲:۰۰"),
      mk("pi-7", "u4", "وقت شخصی", addDays(t, 3), "۰۸:۰۰", "۱۰:۰۰", { private: true }),
      mk("pi-8", "u5", "جلسه با پیمانکار", addDays(t, 1), "۰۸:۳۰", "۰۹:۳۰"),
      mk("pi-9", "u5", "سفر کاری", addDays(t, 4), "۰۸:۰۰", "۱۶:۰۰"),
    ],
    prefs: {},
  };
}

function load(): CalStore {
  try {
    const raw = localStorage.getItem(CAL_KEY);
    if (raw) {
      const s = JSON.parse(raw) as CalStore;
      // نسخه‌ی ۱ و ۲ هر دو قابل بارگذاری‌اند؛ فیلدهای تازه (rrule، reminders) اختیاری‌اند
      if (s && (s.version === 1 || s.version === CAL_VERSION) && Array.isArray(s.items)) return { version: CAL_VERSION, items: s.items, prefs: s.prefs ?? {} };
    }
  } catch {
    /* ذخیره‌ساز در دسترس نیست */
  }
  return seed();
}

// ---------------------------------------------------------------- انبار مشترک ماژول
let state: CalStore | null = null;
const listeners = new Set<() => void>();
const get = () => (state ??= load());
function update(fn: (s: CalStore) => CalStore) {
  state = fn(get());
  try {
    localStorage.setItem(CAL_KEY, JSON.stringify(state));
  } catch {
    /* دمو بدون ماندگاری ادامه می‌دهد */
  }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** فقط اقلام شخصی همه‌ی کاربران (برای محاسبه‌ی آزاد/مشغول در فرم‌های جلسه و رویداد) */
export function usePersonalItems(): PersonalItem[] {
  return useSyncExternalStore(subscribe, () => get().items);
}

export const newPersonalId = () => `pi-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

export function useCalendarStore(userId: string) {
  const store = useSyncExternalStore(subscribe, get);

  const mine = store.prefs[userId];
  const prefs: Prefs = useMemo(() => ({ ...defaultPrefs(), ...(mine ?? {}), layers: { ...defaultLayers(), ...(mine?.layers ?? {}) } }), [mine]);

  const setPrefs = useCallback(
    (patch: Partial<Prefs>) => update((s) => ({ ...s, prefs: { ...s.prefs, [userId]: { ...defaultPrefs(), ...(s.prefs[userId] ?? {}), ...patch } } })),
    [userId],
  );

  const saveItem = useCallback((item: Omit<PersonalItem, "id"> & { id?: string }) => {
    const id = item.id ?? newPersonalId();
    update((s) => {
      const exists = s.items.some((x) => x.id === id);
      const next: PersonalItem = { ...item, id };
      return { ...s, items: exists ? s.items.map((x) => (x.id === id ? next : x)) : [...s.items, next] };
    });
    return id;
  }, []);

  const removeItem = useCallback((id: string) => update((s) => ({ ...s, items: s.items.filter((x) => x.id !== id) })), []);

  return { items: store.items, prefs, setPrefs, saveItem, removeItem };
}
