// ---------------------------------------------------------------------------
// داده‌ی نمونه‌ی کارکرد — بازسازی گوگل‌شیت ساعت کاری تیم برای دو دوره‌ی حقوق:
// دوره‌ی قبل (اردیبهشت: ۱۴۰۵/۰۱/۲۶ … ۱۴۰۵/۰۲/۲۵) و دوره‌ی جاری (خرداد: ۱۴۰۵/۰۲/۲۶ …
// ۱۴۰۵/۰۳/۲۵) تا «امروزِ» دمو. اعداد با یک مولد شبه‌تصادفی ثابت ساخته می‌شوند تا هر بار
// همان داده تولید شود.
// ---------------------------------------------------------------------------
import { users } from "../data/mock";
import { DEMO_REF_DATE } from "../pm/seed";
import { addDays, dayNum, weekdayOf } from "../pm/jalali";
import {
  daysBetween,
  defaultRule,
  expectedOn,
  periodOf,
  shiftPeriod,
  type EntrySource,
  type EntryType,
  type Integration,
  type PeriodRecord,
  type Person,
  type TeamId,
  type TimeEntry,
  type TsSettings,
  type TsState,
} from "./types";

export const TS_VERSION = 1;
export const TS_TODAY = DEMO_REF_DATE;

export const defaultSettings = (): TsSettings => ({
  dailyHours: 8,
  thursdayHours: 4,
  annualLeaveDays: 26,
  holidays: [
    { date: "۱۴۰۵/۰۱/۰۱", title: "عید نوروز" },
    { date: "۱۴۰۵/۰۱/۰۲", title: "عید نوروز" },
    { date: "۱۴۰۵/۰۱/۰۳", title: "عید نوروز" },
    { date: "۱۴۰۵/۰۱/۰۴", title: "عید نوروز" },
    { date: "۱۴۰۵/۰۱/۱۲", title: "روز جمهوری اسلامی" },
    { date: "۱۴۰۵/۰۱/۱۳", title: "روز طبیعت" },
    { date: "۱۴۰۵/۰۱/۲۴", title: "شهادت امام جعفر صادق (ع)" },
    { date: "۱۴۰۵/۰۳/۰۶", title: "عید سعید قربان" },
    { date: "۱۴۰۵/۰۳/۱۴", title: "رحلت امام خمینی (ره) و عید غدیر" },
    { date: "۱۴۰۵/۰۳/۱۵", title: "قیام ۱۵ خرداد" },
    { date: "۱۴۰۵/۰۴/۰۳", title: "تاسوعای حسینی" },
    { date: "۱۴۰۵/۰۴/۰۴", title: "عاشورای حسینی" },
  ],
});

// ---------------------------------------------------------------- کارکنان
const color = (id: string) => users.find((u) => u.id === id)?.avatarColor ?? "#1f4f99";
const U = (id: string, team: TeamId, title: string, extra: Partial<Person> = {}): Person => ({
  id,
  userId: id,
  name: users.find((u) => u.id === id)?.name ?? id,
  title,
  team,
  avatarColor: color(id),
  leaveUsedBefore: 2,
  ...extra,
});
/** اعضای تیم فنی که حساب کاربری سامانه ندارند (واحد فناوری اطلاعات بانک سینا) */
const T = (id: string, name: string, team: TeamId, title: string, avatarColor: string, extra: Partial<Person> = {}): Person => ({
  id,
  name,
  title,
  team,
  avatarColor,
  scopeId: "u-bank-it",
  leaveUsedBefore: 1.5,
  ...extra,
});

export const seedRoster = (): Person[] => [
  U("u5", "pm", "مدیر محصول", { fixedHours: 8, leaveUsedBefore: 0 }),
  U("u13", "backend", "توسعه‌دهنده ارشد بک‌اند", { leaveUsedBefore: 3 }),
  U("u6", "backend", "مهندس یادگیری ماشین"),
  T("tp1", "امیرحسین طاهری", "backend", "توسعه‌دهنده بک‌اند", "#0f766e"),
  T("tp2", "سارا موسوی", "backend", "کارآموز بک‌اند", "#9333ea", { intern: true, dailyHours: 5, leaveUsedBefore: 0 }),
  T("tp3", "نازنین رحیمی", "frontend", "توسعه‌دهنده ارشد فرانت‌اند", "#db2777", { leaveUsedBefore: 4 }),
  T("tp4", "رضا قاسمی", "frontend", "توسعه‌دهنده فرانت‌اند", "#2563eb"),
  T("tp5", "الهام توکلی", "frontend", "طراح رابط کاربری", "#ea580c", { leaveUsedBefore: 2.5 }),
  T("tp6", "هستی افشار", "frontend", "کارآموز فرانت‌اند", "#16a34a", { intern: true, dailyHours: 5, leaveUsedBefore: 0 }),
  T("tp7", "مریم جلالی", "qa", "کارشناس تضمین کیفیت", "#b45309"),
  T("tp8", "پویا نادری", "qa", "کارآموز تست", "#4f46e5", { intern: true, dailyHours: 5, leaveUsedBefore: 0 }),
  T("tp9", "ترانه صفوی", "qa", "کارآموز تست خودکار", "#0891b2", { intern: true, dailyHours: 5, leaveUsedBefore: 0.5 }),
  U("u8", "devops", "مهندس دِواُپس"),
  T("tp10", "علی صادقی", "devops", "مدیر نسخه و استقرار", "#475569", { leaveUsedBefore: 1 }),
  T("tp11", "آرمان شریفی", "devops", "کارآموز دِواُپس", "#7c2d12", { intern: true, dailyHours: 5, leaveUsedBefore: 0 }),
  U("u1", "staff", "راهبر سامانه", { leaveUsedBefore: 1 }),
  U("u4", "staff", "مدیرعامل هلدینگ"),
  U("u12", "staff", "کارشناس مالی و ارزیابی"),
  U("u7", "staff", "سرپرست آزمایشگاه"),
  U("u9", "staff", "مشاور انرژی"),
  U("u10", "staff", "کارشناس کشاورزی دقیق"),
  U("u11", "staff", "پژوهشگر مواد"),
];

// ---------------------------------------------------------------- الگوی کار هر نفر
type Work = { p?: string; t?: string; d: string[]; src?: EntrySource; ref?: string };
const KM = "pr2";
const QG = "pr1";
const ASSET = "pr3";

const plans: Record<string, Work[]> = {
  backend: [
    { p: KM, t: "t17", d: ["پیاده‌سازی API نمایه‌سازی اسناد", "بهینه‌سازی کوئری جستجوی تمام‌متن", "رفع خطای صفحه‌بندی نتایج", "نوشتن تست واحد سرویس جستجو"], src: "gitlab", ref: "bonyad/km-portal" },
    { p: KM, t: "t21", d: ["اسکریپت مهاجرت داده‌های بایگانی", "اعتبارسنجی داده‌های منتقل‌شده", "نگاشت فیلدهای سامانه‌ی قدیمی"], src: "gitlab", ref: "bonyad/km-portal" },
    { d: ["جلسه‌ی روزانه و بازبینی کد", "بازبینی درخواست ادغام همکاران"] },
  ],
  frontend: [
    { p: KM, t: "t18", d: ["پیاده‌سازی صفحه‌ی نتایج جستجو", "طراحی فیلترهای پیشرفته", "واکنش‌گرایی صفحه‌ی سند در موبایل", "رفع اشکالات راست‌به‌چپ"], src: "github", ref: "bonyad-org/km-web" },
    { p: KM, t: "t6", d: ["اتصال رابط به API جستجو", "پیش‌نمایش سند و برجسته‌سازی واژه‌ها"], src: "github", ref: "bonyad-org/km-web" },
    { d: ["جلسه‌ی روزانه", "هماهنگی با تیم طراحی"] },
  ],
  qa: [
    { p: KM, t: "t19", d: ["نوشتن سناریوهای تست پذیرش", "اجرای تست رگرسیون", "ثبت و پیگیری باگ‌ها", "تست بار سرویس جستجو"], src: "jira", ref: "KMS" },
    { p: KM, t: "t18", d: ["تست رابط کاربری جستجو", "تست سازگاری مرورگرها"], src: "jira", ref: "KMS" },
    { d: ["جلسه‌ی روزانه", "به‌روزرسانی مستندات تست"] },
  ],
  devops: [
    { p: KM, t: "t21", d: ["آماده‌سازی محیط مهاجرت داده", "پشتیبان‌گیری پیش از مهاجرت"], src: "gitlab", ref: "bonyad/infra" },
    { p: KM, t: "t17", d: ["پیکربندی خط لوله‌ی CI/CD", "استقرار نسخه روی محیط آزمایشی", "پایش و هشداردهی سرویس جستجو", "ارتقای نسخه‌ی Elasticsearch"], src: "gitlab", ref: "bonyad/infra" },
    { d: ["مدیریت نسخه و یادداشت انتشار", "جلسه‌ی روزانه"] },
  ],
  u1: [
    { p: QG, t: "t18", d: ["تهیه‌ی گزارش هفتگی پیشرفت برای کارفرما", "جمع‌بندی شاخص‌های پیشرفت"] },
    { p: QG, t: "t20", d: ["بازبینی قرارداد پیمانکار نقاشی مدارس"] },
    { p: KM, d: ["راهبری سامانه و پاسخ به درخواست‌های کاربران", "تنظیم دسترسی واحدها"] },
    { d: ["جلسه‌ی هماهنگی معاونت", "بازبینی محتوای پایگاه اطلاع‌رسانی"], src: "calendar" },
  ],
  u4: [
    { p: QG, t: "t2", d: ["پیگیری راه‌اندازی کارگاه‌های اشتغال", "هماهنگی با دهیاری‌ها"] },
    { p: QG, t: "t12", d: ["مصاحبه با متقاضیان بهره‌برداری کارگاه"] },
    { p: KM, d: ["بازبینی پروپوزال سامانه‌ی دانش"] },
    { d: ["جلسه‌ی هیئت‌مدیره هلدینگ", "بررسی گزارش‌های مالی شرکت‌ها"] },
  ],
  u12: [
    { p: KM, d: ["ارزیابی مالی فاز اجرای سامانه", "کنترل صورت‌وضعیت پیمانکار"] },
    { p: ASSET, t: "t22", d: ["ارزش‌گذاری اولیه‌ی اموال مازاد"] },
    { d: ["تطبیق کارکرد ماهانه برای حقوق", "تهیه‌ی گزارش بودجه"] },
  ],
  staff: [
    { p: QG, d: ["هماهنگی و پیگیری امور پروژه"] },
    { d: ["امور جاری واحد", "تهیه‌ی گزارش", "جلسه‌ی داخلی", "مطالعه و پژوهش"] },
  ],
};
const planOf = (p: Person) => plans[p.id] ?? plans[p.team] ?? plans.staff;

// مولد شبه‌تصادفی ثابت (mulberry32)
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedEntries(roster: Person[], s: TsSettings): TimeEntry[] {
  const out: TimeEntry[] = [];
  let id = 0;
  const cur = periodOf(TS_TODAY);
  const prev = shiftPeriod(cur, -1);
  const days = daysBetween(prev.start, addDays(TS_TODAY, -1));
  const today = dayNum(TS_TODAY)!;
  const issueNo: Record<string, number> = {};

  roster.forEach((p, pi) => {
    if (p.fixedHours) return; // مدیر محصول: ساعت ثابت خودکار
    const r = rng(1405 + pi * 97);
    const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
    const plan = planOf(p);
    // روزهای مرخصی/مأموریت/دورکاری این نفر
    const leaveDays = new Set<number>();
    const nLeave = 1 + Math.floor(r() * 2);
    for (let i = 0; i < nLeave; i++) leaveDays.add(dayNum(pick(days))!);
    const missionDays = new Set<number>();
    if (p.id === "u4" || p.id === "u12" || p.team === "devops") for (let i = 0; i < 2; i++) missionDays.add(dayNum(pick(days))!);
    // چند روز اخیر را فراموش کرده‌اند ثبت کنند (برای نمایش کسری)
    const forgetful = ["tp4", "u10", "tp8"].includes(p.id);

    days.forEach((date) => {
      const n = dayNum(date)!;
      const exp = expectedOn(s, date, p);
      const wd = weekdayOf(date);
      if (forgetful && n >= today - 4) return;
      const push = (hours: number, type: EntryType, w: Work | undefined, desc: string, src: EntrySource = "manual", ref?: string) => {
        out.push({
          id: `te${++id}`,
          personId: p.id,
          date,
          hours,
          type,
          projectId: w?.p,
          taskId: w?.t,
          description: desc,
          source: src,
          review: "accepted",
          externalRef: ref,
          createdAt: `${date} ۱۸:${String(10 + (id % 40)).replace(/\d/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[+c])}`,
        });
      };
      if (exp === 0) {
        // گاهی کار در پنجشنبه‌ی تعطیل/جمعه (اضافه‌کار) برای تیم فنی
        if (!p.intern && p.team !== "staff" && wd === 5 && r() < 0.15) push(3, "work", plan[0], pick(plan[0].d));
        return;
      }
      if (leaveDays.has(n)) {
        push(exp, "leave_daily", undefined, pick(["مرخصی استحقاقی", "مرخصی — امور شخصی", "مرخصی استعلاجی"]));
        return;
      }
      if (missionDays.has(n)) {
        push(exp === 4 ? 6 : 10, "mission", plan[0], p.team === "devops" ? "مأموریت به مرکز داده‌ی بانک سینا" : "مأموریت و بازدید میدانی قلعه‌گنج");
        return;
      }
      if (wd === 5 && r() < 0.35) return; // پنجشنبه‌های بدون کار
      let total: number;
      if (p.intern) total = wd === 5 ? 0 : pick([4, 4.5, 5, 5, 6]);
      else if (wd === 5) total = pick([4, 4, 4.5, 5]);
      else total = pick([7, 7.5, 8, 8, 8, 8.5, 8.5, 9, 9.5, 10]);
      if (!total) return;
      const remote = !p.intern && p.team !== "staff" && wd === 4 && r() < 0.4;
      const type: EntryType = remote ? "remote" : "work";
      // مرخصی ساعتی گاه‌به‌گاه
      if (!p.intern && r() < 0.05) {
        push(2, "leave_hourly", undefined, "مرخصی ساعتی — مراجعه به بانک");
        total = Math.max(2, exp - 2);
      }
      const main = plan[Math.floor(r() * (plan.length - 1))];
      const side = plan[plan.length - 1];
      const split = total >= 6 && r() < 0.55;
      const sideH = split ? pick([0.5, 1, 1, 1.5]) : 0;
      const mainH = Math.round((total - sideH) * 2) / 2;
      const ext = main.src && main.src !== "calendar" && r() < 0.35;
      let ref: string | undefined;
      if (ext && main.ref) {
        issueNo[main.ref] = (issueNo[main.ref] ?? 100) + 1 + Math.floor(r() * 3);
        ref = main.src === "jira" ? `${main.ref}-${issueNo[main.ref]}` : `${main.ref}#${issueNo[main.ref]}`;
      }
      push(mainH, type, main, pick(main.d), ext ? main.src : "manual", ref);
      if (sideH) push(sideH, type, side, pick(side.d), side.src === "calendar" ? "calendar" : "manual");
    });
  });

  // ورودی‌های واردشده و منتظر بررسی (برای نمایش جریان پذیرش/رد)
  const pending = (personId: string, date: string, hours: number, source: EntrySource, desc: string, projectId?: string, taskId?: string, externalRef?: string, externalProject?: string): TimeEntry => ({
    id: `te${++id}`,
    personId,
    date,
    hours,
    type: "work",
    projectId,
    taskId,
    description: desc,
    source,
    review: "pending",
    externalRef,
    externalProject,
    createdAt: `${addDays(TS_TODAY, -1)} ۱۸:۲۰`,
  });
  out.push(pending("u1", addDays(TS_TODAY, -1), 1.5, "gitlab", "/spend 1h30m — بازبینی تنظیمات دسترسی جستجو", KM, "t17", "bonyad/km-portal#218", "bonyad/km-portal"));
  out.push(pending("u1", addDays(TS_TODAY, -2), 1, "calendar", "جلسه: کمیته‌ی راهبری پروژه‌ی قلعه‌گنج", QG, undefined, "gcal:evt-7741"));
  out.push(pending("u1", addDays(TS_TODAY, -3), 0.75, "gitlab", "درخواست ادغام !64 — به‌روزرسانی متن راهنما", undefined, undefined, "bonyad/help-center!64", "bonyad/help-center"));
  out.push(pending("u13", addDays(TS_TODAY, -1), 2, "gitlab", "/spend 2h — رفع کندی نمایه‌سازی پیوست‌های PDF", KM, "t17", "bonyad/km-portal#221", "bonyad/km-portal"));
  out.push(pending("u13", addDays(TS_TODAY, -1), 1.5, "jira", "Worklog KMS-142: بازطراحی صف نمایه‌سازی", KM, "t21", "KMS-142#wl1", "KMS"));
  return out;
}

export function seedPeriods(roster: Person[]): PeriodRecord[] {
  const cur = periodOf(TS_TODAY);
  const prev = shiftPeriod(cur, -1);
  const prevEnd = prev.end;
  const sub = addDays(prevEnd, 1);
  const out: PeriodRecord[] = [];
  roster.forEach((p) => {
    if (["u13", "u6", "tp1", "tp7"].includes(p.id)) {
      out.push({ personId: p.id, key: prev.key, status: "submitted", history: [{ at: `${sub} ۰۹:۱۵`, by: p.name, action: "submitted" }] });
    } else if (p.id === "tp4") {
      out.push({
        personId: p.id,
        key: prev.key,
        status: "returned",
        history: [
          { at: `${sub} ۰۹:۴۰`, by: p.name, action: "submitted" },
          { at: `${addDays(sub, 1)} ۱۱:۰۵`, by: "مهندس بردیا کوشا", action: "returned", comment: "ساعت‌های دو روز آخر دوره بدون تسک ثبت شده؛ لطفاً تسک مربوط را مشخص کنید." },
        ],
      });
    } else if (!["u10", "u11", "tp8"].includes(p.id)) {
      out.push({
        personId: p.id,
        key: prev.key,
        status: "approved",
        history: [
          { at: `${sub} ۰۸:۵۰`, by: p.name, action: "submitted" },
          { at: `${addDays(sub, 2)} ۱۰:۳۰`, by: p.team === "staff" ? "حسین دهقان" : "محسن مردعلی", action: "approved" },
        ],
      });
    }
  });
  return out;
}

export function seedIntegrations(): Integration[] {
  const last = `${addDays(TS_TODAY, -1)} ۱۸:۲۰`;
  return [
    {
      personId: "u1",
      kind: "gitlab",
      serverUrl: "https://git.bonyad.ir",
      username: "bonyad.portal",
      tokenHint: "x7Qe",
      connectedAt: "۱۴۰۵/۰۲/۰۲ ۱۰:۰۰",
      lastSync: last,
      syncCount: 14,
      mappings: [
        { external: "bonyad/km-portal", projectId: KM },
        { external: "bonyad/omran-reports", projectId: QG },
        { external: "bonyad/help-center", projectId: "" },
      ],
      rule: { ...defaultRule },
    },
    {
      personId: "u1",
      kind: "calendar",
      serverUrl: "https://calendar.google.com",
      username: "portal@bonyad.ir",
      tokenHint: "oA9z",
      connectedAt: "۱۴۰۵/۰۲/۰۲ ۱۰:۰۵",
      lastSync: last,
      syncCount: 20,
      mappings: [{ external: "کمیته‌ی راهبری قلعه‌گنج", projectId: QG }],
      rule: { ...defaultRule },
    },
    {
      personId: "u13",
      kind: "gitlab",
      serverUrl: "https://git.bonyad.ir",
      username: "b.kousha",
      tokenHint: "k2Lm",
      connectedAt: "۱۴۰۵/۰۱/۲۸ ۰۹:۰۰",
      lastSync: last,
      syncCount: 31,
      mappings: [
        { external: "bonyad/km-portal", projectId: KM },
        { external: "bonyad/infra", projectId: KM },
      ],
      rule: { ...defaultRule },
    },
    {
      personId: "u13",
      kind: "jira",
      serverUrl: "https://jira.bonyad.ir",
      username: "b.kousha",
      tokenHint: "J8rt",
      connectedAt: "۱۴۰۵/۰۲/۱۰ ۱۴:۰۰",
      lastSync: last,
      syncCount: 9,
      mappings: [{ external: "KMS", projectId: KM }],
      rule: { ...defaultRule },
    },
    {
      personId: "u6",
      kind: "github",
      serverUrl: "https://github.com",
      username: "arian-sadra",
      tokenHint: "gh4P",
      connectedAt: "۱۴۰۵/۰۲/۱۵ ۱۱:۳۰",
      lastSync: `${addDays(TS_TODAY, -3)} ۲۰:۰۰`,
      syncCount: 6,
      mappings: [{ external: "bonyad-org/km-ml", projectId: KM }],
      rule: { ...defaultRule, commitMinutes: 25 },
    },
  ];
}

export function seedTimesheet(): TsState {
  const settings = defaultSettings();
  const roster = seedRoster();
  const entries = seedEntries(roster, settings);
  return { version: TS_VERSION, seq: entries.length + 10, entries, roster, periods: seedPeriods(roster), integrations: seedIntegrations(), settings };
}
