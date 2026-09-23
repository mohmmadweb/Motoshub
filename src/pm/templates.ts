// ---------------------------------------------------------------------------
// قالب‌های پروژه (بند ۴۲ سند) — بورد، برچسب‌ها، تسک‌ها با وابستگی، مایل‌ستون‌ها و نقش‌ها.
// با ساخت پروژه از روی قالب، گانت و گراف وابستگی از همان لحظه‌ی اول پر است.
// ---------------------------------------------------------------------------
import { defaultColumns, defaultLabels } from "./seed";
import type { BoardColumn, PMPriority } from "./types";

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  columns: BoardColumn[];
  labels: string[];
  roles: string[];
  budgetLines: string[];
  /** offset و duration بر حسب روز از تاریخ شروع پروژه */
  tasks: { key: string; title: string; offset: number; duration: number; priority: PMPriority; labels: string[]; hours: number; role?: string }[];
  deps: [string, string][];
  milestones: { title: string; offset: number; tasks: string[] }[];
};

export const projectTemplates: ProjectTemplate[] = [
  {
    id: "ptpl-web",
    name: "بازطراحی وب‌سایت (سناریوی سند)",
    description: "همان سناریوی بند ۴۸ سند: طراحی صفحات، توسعه‌ی فرانت و بک، تست و انتشار.",
    columns: defaultColumns(),
    labels: ["طراحی", "توسعه", "خطا", "مستندات"],
    roles: ["مدیر پروژه", "طراح", "برنامه‌نویس", "تستر"],
    budgetLines: ["طراحی", "توسعه", "بازاریابی", "تست", "سایر"],
    tasks: [
      { key: "home", title: "طراحی صفحه‌ی اصلی (Homepage)", offset: 0, duration: 7, priority: "زیاد", labels: ["طراحی"], hours: 40, role: "طراح" },
      { key: "login", title: "طراحی صفحه‌ی ورود (Login)", offset: 3, duration: 4, priority: "متوسط", labels: ["طراحی"], hours: 16, role: "طراح" },
      { key: "dash", title: "طراحی داشبورد (Dashboard)", offset: 5, duration: 6, priority: "زیاد", labels: ["طراحی"], hours: 32, role: "طراح" },
      { key: "fe", title: "توسعه‌ی فرانت‌اند", offset: 22, duration: 12, priority: "زیاد", labels: ["توسعه"], hours: 120, role: "برنامه‌نویس" },
      { key: "be", title: "توسعه‌ی بک‌اند", offset: 4, duration: 18, priority: "بحرانی", labels: ["توسعه"], hours: 140, role: "برنامه‌نویس" },
      { key: "qa", title: "تست یکپارچه و رفع خطا", offset: 34, duration: 7, priority: "زیاد", labels: ["توسعه", "خطا"], hours: 50, role: "تستر" },
      { key: "docs", title: "مستندسازی و راهنمای کاربر", offset: 34, duration: 5, priority: "کم", labels: ["مستندات"], hours: 20 },
      { key: "launch", title: "انتشار نسخه‌ی اول", offset: 41, duration: 2, priority: "بحرانی", labels: ["توسعه"], hours: 12 },
    ],
    deps: [["home", "fe"], ["login", "fe"], ["dash", "fe"], ["be", "fe"], ["fe", "qa"], ["be", "qa"], ["fe", "docs"], ["qa", "launch"], ["docs", "launch"]],
    milestones: [
      { title: "پایان طراحی", offset: 10, tasks: ["home", "login", "dash"] },
      { title: "انتشار نسخه‌ی اول", offset: 42, tasks: ["qa", "launch"] },
    ],
  },
  {
    id: "ptpl-civil",
    name: "طرح عمرانی و محرومیت‌زدایی",
    description: "نیازسنجی، تأمین، اجرا، نظارت و تحویل به بهره‌بردار.",
    columns: defaultColumns(),
    labels: ["عمرانی", "تدارکات", "مالی", "مستندات"],
    roles: ["مدیر پروژه", "پیمانکار", "تدارکات", "ناظر", "مسئول مالی"],
    budgetLines: ["زیرساخت", "پیمانکاری", "تجهیزات", "نظارت", "سایر / ذخیره"],
    tasks: [
      { key: "need", title: "نیازسنجی میدانی", offset: 0, duration: 10, priority: "زیاد", labels: ["مستندات"], hours: 60 },
      { key: "design", title: "تهیه‌ی نقشه و برآورد", offset: 10, duration: 10, priority: "زیاد", labels: ["عمرانی"], hours: 50 },
      { key: "tender", title: "برگزاری استعلام/مناقصه‌ی پیمانکار", offset: 20, duration: 12, priority: "متوسط", labels: ["مالی"], hours: 30 },
      { key: "supply", title: "تأمین مصالح و تجهیزات", offset: 25, duration: 15, priority: "زیاد", labels: ["تدارکات"], hours: 40, role: "تدارکات" },
      { key: "build", title: "اجرای عملیات عمرانی", offset: 40, duration: 40, priority: "بحرانی", labels: ["عمرانی"], hours: 600, role: "پیمانکار" },
      { key: "inspect", title: "بازدید نظارتی و رفع نقص", offset: 80, duration: 7, priority: "زیاد", labels: ["عمرانی"], hours: 30, role: "ناظر" },
      { key: "handover", title: "تحویل به بهره‌بردار و افتتاح", offset: 87, duration: 3, priority: "زیاد", labels: [], hours: 16 },
      { key: "settle", title: "تسویه‌ی مالی و گزارش نهایی", offset: 90, duration: 5, priority: "متوسط", labels: ["مالی", "مستندات"], hours: 24, role: "مسئول مالی" },
    ],
    deps: [["need", "design"], ["design", "tender"], ["design", "supply"], ["tender", "build"], ["supply", "build"], ["build", "inspect"], ["inspect", "handover"], ["handover", "settle"]],
    milestones: [
      { title: "انتخاب پیمانکار", offset: 32, tasks: ["tender"] },
      { title: "پایان عملیات اجرایی", offset: 80, tasks: ["build"] },
      { title: "تحویل و افتتاح", offset: 90, tasks: ["inspect", "handover"] },
    ],
  },
  {
    id: "ptpl-event",
    name: "برگزاری رویداد / کارگاه آموزشی",
    description: "از تعیین سرفصل تا ارزیابی و گواهی شرکت‌کنندگان.",
    columns: defaultColumns(),
    labels: defaultLabels.filter((l) => ["آموزش", "مستندات", "مالی"].includes(l)),
    roles: ["مدیر پروژه", "مدرس", "اجرایی"],
    budgetLines: ["مدرس", "محل برگزاری", "پذیرایی", "تبلیغات"],
    tasks: [
      { key: "topics", title: "تعیین سرفصل‌ها و مدرس", offset: 0, duration: 5, priority: "زیاد", labels: ["آموزش"], hours: 12, role: "مدرس" },
      { key: "venue", title: "رزرو محل و تجهیزات", offset: 3, duration: 5, priority: "متوسط", labels: [], hours: 8, role: "اجرایی" },
      { key: "promo", title: "اطلاع‌رسانی و ثبت‌نام", offset: 5, duration: 10, priority: "زیاد", labels: [], hours: 20, role: "اجرایی" },
      { key: "content", title: "آماده‌سازی محتوای آموزشی", offset: 5, duration: 10, priority: "زیاد", labels: ["آموزش", "مستندات"], hours: 30, role: "مدرس" },
      { key: "run", title: "برگزاری کارگاه", offset: 16, duration: 2, priority: "بحرانی", labels: ["آموزش"], hours: 16 },
      { key: "eval", title: "ارزیابی و صدور گواهی", offset: 18, duration: 4, priority: "متوسط", labels: ["مستندات"], hours: 10 },
    ],
    deps: [["topics", "content"], ["topics", "promo"], ["venue", "run"], ["promo", "run"], ["content", "run"], ["run", "eval"]],
    milestones: [{ title: "روز برگزاری", offset: 17, tasks: ["run"] }],
  },
];
