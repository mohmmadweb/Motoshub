// ---------------------------------------------------------------------------
// F14 «مدیریت زبان‌ها» (۱.۲۰.۷) — زبان‌های سامانه، کلیدهای ترجمه و انتخاب زبان کاربر.
// مدل API: language { code, name, dir, is_active, is_default, completion } · translation { lang, key, value }
// کلید ترجمه = متن مبدأ فارسی (سبک gettext)؛ نبودِ ترجمه = نمایش همان متن فارسی.
// انبار: motoshub.i18n.v1 (زبان‌ها + ترجمه‌های ویرایش‌شده‌ی راهبر) و motoshub.lang.v1 (انتخاب هر کاربر).
// ---------------------------------------------------------------------------
import { useEffect } from "react";
import { createLocalStore, useLocalStore } from "../iam/store";
import { useTenancy } from "../context/TenancyContext";
import { jalaliToGregorian, parseJalali } from "../pm/jalali";

export type Dir = "rtl" | "ltr";
export type Language = { code: string; name: string; native: string; dir: Dir; is_active: boolean; is_default: boolean; calendar: "persian" | "gregory" | "islamic-umalqura"; locale: string };

/** ترجمه‌های پایه (منو، نوار بالا و داشبورد) — راهبر می‌تواند هر کلید را بازنویسی کند */
const BASE: Record<string, { en: string; ar: string }> = {
  // بخش‌های منو
  "داشبورد": { en: "Dashboard", ar: "لوحة التحكم" },
  "همکاران": { en: "Colleagues", ar: "الزملاء" },
  "دانش و محتوا": { en: "Knowledge & Content", ar: "المعرفة والمحتوى" },
  "شبکه اجتماعی": { en: "Social Network", ar: "الشبكة الاجتماعية" },
  "پروژه‌ها و فعالیت‌ها": { en: "Projects & Activities", ar: "المشاريع والأنشطة" },
  "دبیرخانه و مشتریان": { en: "Secretariat & Customers", ar: "الأمانة والعملاء" },
  "مدیریت سیستم": { en: "System Management", ar: "إدارة النظام" },
  // آیتم‌های منو
  "میزکار من": { en: "My Workspace", ar: "مكتبي" },
  "تقویم کاری من": { en: "My Work Calendar", ar: "تقويم عملي" },
  "مدیریت فایل‌های من": { en: "My Files", ar: "ملفاتي" },
  "اعضای سازمان": { en: "Members", ar: "أعضاء المؤسسة" },
  "ارتباطات من": { en: "My Connections", ar: "علاقاتي" },
  "اخبار سازمان": { en: "News", ar: "أخبار المؤسسة" },
  "وبلاگ‌ها": { en: "Blogs", ar: "المدونات" },
  "مجلات": { en: "Magazines", ar: "المجلات" },
  "رسانه": { en: "Media", ar: "الوسائط" },
  "پرسش و پاسخ": { en: "Q&A", ar: "سؤال وجواب" },
  "سوالات متداول": { en: "FAQs", ar: "الأسئلة الشائعة" },
  "هشتگ‌ها": { en: "Hashtags", ar: "الوسوم" },
  "دسته‌بندی‌ها": { en: "Categories", ar: "التصنيفات" },
  "گفتگوها": { en: "Chats", ar: "المحادثات" },
  "گروه‌ها": { en: "Groups", ar: "المجموعات" },
  "کانال‌ها": { en: "Channels", ar: "القنوات" },
  "رویدادها و جلسات": { en: "Events & Meetings", ar: "الفعاليات والاجتماعات" },
  "پروژه‌ها": { en: "Projects", ar: "المشاريع" },
  "فعالیت و وظایف من": { en: "My Tasks", ar: "مهامي" },
  "گزارش فعالیت‌های من": { en: "My Activity Report", ar: "تقرير أنشطتي" },
  "تنظیمات پروژه": { en: "Project Settings", ar: "إعدادات المشاريع" },
  "مانیتورینگ": { en: "Monitoring", ar: "المراقبة" },
  "مدیریت دانش": { en: "Knowledge Management", ar: "إدارة المعرفة" },
  "دبیرخانه": { en: "Secretariat", ar: "الأمانة" },
  "پرونده مشتریان": { en: "Customer Files", ar: "ملفات العملاء" },
  "راهبری دسترسی": { en: "Access Administration", ar: "إدارة الصلاحيات" },
  "نمای کلی": { en: "Overview", ar: "نظرة عامة" },
  "واحدها": { en: "Units", ar: "الوحدات" },
  "افراد": { en: "People", ar: "الأشخاص" },
  "افزودن دسترسی": { en: "Grant Access", ar: "إضافة صلاحية" },
  "نقش‌ها": { en: "Roles", ar: "الأدوار" },
  "تاریخچه": { en: "History", ar: "السجل" },
  "راهبری سامانه": { en: "Platform Administration", ar: "إدارة المنصة" },
  "نقش و دسترسی من": { en: "My Roles & Access", ar: "أدواري وصلاحياتي" },
  "تنظیمات سامانه": { en: "System Settings", ar: "إعدادات النظام" },
  "تنظیمات عمومی": { en: "General Settings", ar: "الإعدادات العامة" },
  "تنظیمات پیامک": { en: "SMS Settings", ar: "إعدادات الرسائل القصيرة" },
  "تنظیمات سازمان": { en: "Organization Settings", ar: "إعدادات المؤسسة" },
  "مدیریت اعلان": { en: "Notification Management", ar: "إدارة الإشعارات" },
  "تیکت پشتیبانی": { en: "Support Tickets", ar: "تذاكر الدعم" },
  "پلن سازمانی": { en: "Enterprise plan", ar: "الخطة المؤسسية" },
  // سربرگ
  "جستجو در کاریز…": { en: "Search Kariz…", ar: "ابحث في كاريز…" },
  "روشن": { en: "Light", ar: "فاتح" },
  "تیره": { en: "Dark", ar: "داكن" },
  "حالت نمایش": { en: "Appearance", ar: "وضع العرض" },
  "ایجاد سریع": { en: "Quick create", ar: "إنشاء سريع" },
  "کار جدید": { en: "New task", ar: "مهمة جديدة" },
  "جلسه جدید": { en: "New meeting", ar: "اجتماع جديد" },
  "سند دانش": { en: "Knowledge document", ar: "مستند معرفي" },
  "پرسش جدید": { en: "New question", ar: "سؤال جديد" },
  "نمایه": { en: "Profile", ar: "الملف الشخصي" },
  "وضعیت من": { en: "My status", ar: "حالتي" },
  "مشاهده به‌عنوان": { en: "View as", ar: "العرض باسم" },
  "خروج": { en: "Sign out", ar: "تسجيل الخروج" },
  "راهنمای سامانه": { en: "System guide", ar: "دليل النظام" },
  "خانه": { en: "Home", ar: "الرئيسية" },
  "جستجو": { en: "Search", ar: "بحث" },
  "پیام‌ها": { en: "Messages", ar: "الرسائل" },
  "منو": { en: "Menu", ar: "القائمة" },
  "اعلان‌ها": { en: "Notifications", ar: "الإشعارات" },
  "وضعیت حضور": { en: "Presence", ar: "الحالة" },
  "آنلاین": { en: "Online", ar: "متصل" },
  "غایب": { en: "Away", ar: "بعيد" },
  "مزاحم نشوید": { en: "Busy", ar: "مشغول" },
  "نامرئی": { en: "Invisible", ar: "مخفي" },
  "زبان": { en: "Language", ar: "اللغة" },
  "سطح": { en: "Level", ar: "المستوى" },
  // داشبورد
  "خوش آمدید": { en: "Welcome", ar: "مرحبًا" },
  "صبح بخیر": { en: "Good morning", ar: "صباح الخير" },
  "ظهر بخیر": { en: "Good afternoon", ar: "طاب يومك" },
  "عصر بخیر": { en: "Good evening", ar: "مساء الخير" },
  "شب بخیر": { en: "Good night", ar: "تصبح على خير" },
  "اسلاید قبلی": { en: "Previous slide", ar: "الشريحة السابقة" },
  "اسلاید بعدی": { en: "Next slide", ar: "الشريحة التالية" },
  "بستن": { en: "Close", ar: "إغلاق" },
};
export const translationKeys = Object.keys(BASE);

const LANGS: Language[] = [
  { code: "fa", name: "فارسی", native: "فارسی", dir: "rtl", is_active: true, is_default: true, calendar: "persian", locale: "fa-IR" },
  { code: "en", name: "انگلیسی", native: "English", dir: "ltr", is_active: true, is_default: false, calendar: "gregory", locale: "en-US" },
  { code: "ar", name: "عربی", native: "العربية", dir: "rtl", is_active: true, is_default: false, calendar: "islamic-umalqura", locale: "ar-SA" },
];

type I18nState = { languages: Language[]; /** ترجمه‌های ویرایش‌شده: lang → key → value */ overrides: Record<string, Record<string, string>>; updatedAt?: string };
export const i18nStore = createLocalStore<I18nState>("motoshub.i18n.v1", () => ({ languages: LANGS, overrides: {} }), (raw) => {
  const r = raw as I18nState;
  return r && Array.isArray(r.languages) && r.languages.some((l) => l.code === "fa") ? { ...r, overrides: r.overrides ?? {} } : null;
});
/** انتخاب زبان هر کاربر: userId → code */
export const langPrefStore = createLocalStore<Record<string, string>>("motoshub.lang.v1", () => ({}));

/** مقدار مؤثر یک کلید در یک زبان (ویرایش راهبر ← پایه ← خالی) */
export function valueOf(s: I18nState, lang: string, key: string): string {
  if (lang === "fa") return key;
  const o = s.overrides[lang]?.[key];
  if (o !== undefined) return o;
  return (BASE[key] as Record<string, string> | undefined)?.[lang] ?? "";
}
/** درصد تکمیل ترجمه‌ی یک زبان */
export function completionOf(s: I18nState, lang: string): number {
  if (lang === "fa") return 100;
  const done = translationKeys.filter((k) => valueOf(s, lang, k).trim()).length;
  return Math.round((done / translationKeys.length) * 100);
}

export function useI18n() {
  const s = useLocalStore(i18nStore);
  const prefs = useLocalStore(langPrefStore);
  const { actingUser } = useTenancy();
  const def = s.languages.find((l) => l.is_default && l.is_active) ?? s.languages[0];
  const chosen = s.languages.find((l) => l.code === prefs[actingUser.id] && l.is_active);
  const lang = chosen ?? def;
  const t = (key: string) => (lang.code === "fa" ? key : valueOf(s, lang.code, key) || key);
  return {
    lang,
    dir: lang.dir,
    languages: s.languages,
    active: s.languages.filter((l) => l.is_active),
    t,
    setLang: (code: string) => langPrefStore.set((p) => ({ ...p, [actingUser.id]: code })),
    /** تاریخ امروزِ دمو (شمسی) در تقویم متناسب با زبان */
    formatDate: (jalali: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) => formatIn(lang, jalali, opts),
  };
}
/** فقط تابع ترجمه (برای کامپوننت‌های کوچک) */
export function useT() {
  return useI18n().t;
}

export function jalaliToDate(jalali: string): Date | null {
  const p = parseJalali(jalali);
  if (!p) return null;
  const [gy, gm, gd] = jalaliToGregorian(p[0], p[1], p[2]);
  return new Date(gy, gm - 1, gd, 12);
}
export function formatIn(lang: Language, jalali: string, opts: Intl.DateTimeFormatOptions) {
  const d = jalaliToDate(jalali);
  if (!d) return jalali;
  try {
    return new Intl.DateTimeFormat(`${lang.locale}-u-ca-${lang.calendar}`, opts).format(d);
  } catch {
    return jalali;
  }
}

/** همگام‌سازی جهت و زبان سند با انتخاب کاربر (در AppLayout سوار می‌شود) */
export function I18nSync() {
  const { lang } = useI18n();
  useEffect(() => {
    const root = document.documentElement;
    root.dir = lang.dir;
    root.lang = lang.code;
    return () => {
      root.dir = "rtl";
      root.lang = "fa";
    };
  }, [lang.dir, lang.code]);
  return null;
}
