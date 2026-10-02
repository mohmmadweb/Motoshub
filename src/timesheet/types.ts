// ---------------------------------------------------------------------------
// «گزارش فعالیت‌های من» — مدل داده‌ی کارکرد (تایم‌شیت) و قواعد دوره‌ی حقوق.
// جایگزین گوگل‌شیت ساعت کاری تیم: هر ماه شمسی یک «دوره‌ی حقوق» است از ۲۶ ماه قبل
// تا ۲۵ همان ماه (استثنا: دوره‌ی شهریور از ۳۱ مرداد شروع می‌شود). جمعه‌ها و تعطیلات
// رسمی کاری نیستند؛ ساعت موظف روزانه و پنجشنبه از تنظیمات می‌آید.
// ---------------------------------------------------------------------------
import { addDays, dayNum, formatJalali, fromDayNum, monthLength, monthNames, parseJalali, toEnDigits, weekdayOf, fa } from "../pm/jalali";

// ======================================================== انواع
export type EntryType = "work" | "leave_hourly" | "leave_daily" | "mission" | "remote";
export const entryTypeLabel: Record<EntryType, string> = {
  work: "کار",
  leave_hourly: "مرخصی ساعتی",
  leave_daily: "مرخصی روزانه",
  mission: "مأموریت",
  remote: "دورکاری",
};
export const entryTypes: EntryType[] = ["work", "remote", "mission", "leave_hourly", "leave_daily"];
export const isLeave = (t: EntryType) => t === "leave_hourly" || t === "leave_daily";

export type EntrySource = "manual" | "gitlab" | "github" | "jira" | "clockify" | "toggl" | "calendar" | "timer";
export const sourceLabel: Record<EntrySource, string> = {
  manual: "ثبت دستی",
  gitlab: "GitLab",
  github: "GitHub",
  jira: "Jira",
  clockify: "Clockify",
  toggl: "Toggl",
  calendar: "تقویم گوگل",
  timer: "تایمر پروژه",
};

/** وضعیت بازبینیِ ورودی‌های واردشده از ابزار بیرونی */
export type ReviewState = "accepted" | "pending" | "rejected";

export type TimeEntry = {
  id: string;
  /** شناسه‌ی شخص در فهرست کارکنان (برای کاربران سامانه همان userId است) */
  personId: string;
  date: string;
  hours: number;
  type: EntryType;
  projectId?: string;
  taskId?: string;
  description: string;
  source: EntrySource;
  review: ReviewState;
  /** شناسه‌ی بیرونی (مثلاً motoshub/backend#142 یا PR #88) برای جلوگیری از ورود دوباره */
  externalRef?: string;
  /** نام پروژه در ابزار بیرونی (برای ورودی‌هایی که نگاشت نشده‌اند) */
  externalProject?: string;
  /** شناسه‌ی ورودیِ احتمالاً تکراری (همان روز + تسک + منبع) */
  duplicateOf?: string;
  createdAt: string;
  /** فقط‌خواندنی — مثل ثبت‌های تایمر پروژه یا ساعت ثابت مدیر محصول */
  readOnly?: boolean;
  /** ثبت تجمیعی پروژه (بیش از ۱۲ ساعت در یک رکورد) — در جمع روزانه حساب نمی‌شود */
  aggregate?: boolean;
};

export type TeamId = "pm" | "backend" | "frontend" | "qa" | "devops" | "staff";
export const teamLabel: Record<TeamId, string> = {
  pm: "مدیریت محصول",
  backend: "تیم بک‌اند",
  frontend: "تیم فرانت‌اند",
  qa: "تیم تضمین کیفیت",
  devops: "تیم دِواُپس و مدیریت نسخه",
  staff: "ستاد و مدیریت",
};
export const teamOrder: TeamId[] = ["pm", "backend", "frontend", "qa", "devops", "staff"];

export type Person = {
  id: string;
  name: string;
  title: string;
  team: TeamId;
  intern?: boolean;
  /** ساعت ثابت در هر روز کاری (مثل مدیر محصول) — به‌صورت خودکار ثبت می‌شود */
  fixedHours?: number;
  avatarColor: string;
  /** اگر کاربر سامانه باشد */
  userId?: string;
  /** واحد سازمانی برای اعضای غیرکاربر — برای محدوده‌ی دید مدیران */
  scopeId?: string;
  /** ساعت موظف پاره‌وقت (مثل کارآموزان): شنبه تا چهارشنبه همین مقدار، پنجشنبه تعطیل */
  dailyHours?: number;
  /** مرخصی استفاده‌شده‌ی امسال پیش از بازه‌ی داده‌ها (روز) */
  leaveUsedBefore: number;
};

export type PeriodStatus = "draft" | "submitted" | "approved" | "returned";
export const periodStatusLabel: Record<PeriodStatus, string> = {
  draft: "پیش‌نویس",
  submitted: "ارسال‌شده",
  approved: "تأییدشده",
  returned: "برگشت‌خورده",
};
export const periodStatusTone: Record<PeriodStatus, "neutral" | "warning" | "success" | "danger"> = {
  draft: "neutral",
  submitted: "warning",
  approved: "success",
  returned: "danger",
};

export type PeriodHistory = { at: string; by: string; action: PeriodStatus; comment?: string };
export type PeriodRecord = { personId: string; key: string; status: PeriodStatus; history: PeriodHistory[] };

export type IntegrationKind = "gitlab" | "github" | "jira" | "clockify" | "toggl" | "calendar";
export const integrationKinds: IntegrationKind[] = ["gitlab", "github", "jira", "clockify", "toggl", "calendar"];

export type ProjectMapping = { external: string; projectId: string };
/** قاعده‌ی تبدیل فعالیت GitHub/GitLab به زمان تخمینی */
export type EstimateRule = { commitMinutes: number; prMinutes: number; reviewMinutes: number; maxPerDay: number };
export const defaultRule: EstimateRule = { commitMinutes: 20, prMinutes: 45, reviewMinutes: 30, maxPerDay: 6 };

export type Integration = {
  personId: string;
  kind: IntegrationKind;
  serverUrl: string;
  username: string;
  /** فقط چهار نویسه‌ی آخر توکن نگه داشته می‌شود */
  tokenHint: string;
  connectedAt: string;
  lastSync?: string;
  syncCount: number;
  mappings: ProjectMapping[];
  rule: EstimateRule;
};

export type TsSettings = {
  dailyHours: number;
  /** ساعت موظف پنجشنبه: ۰ (تعطیل)، ۴ (نیمه‌وقت) یا ۸ */
  thursdayHours: number;
  /** سقف مرخصی سالانه (روز) */
  annualLeaveDays: number;
  holidays: { date: string; title: string }[];
};

export type TsState = {
  version: number;
  seq: number;
  entries: TimeEntry[];
  roster: Person[];
  periods: PeriodRecord[];
  integrations: Integration[];
  settings: TsSettings;
};

// ======================================================== ساعت
/** «7:30» ، «۷:۳۰» ، «7.5» ، «۷٫۵» → 7.5 ؛ نامعتبر → null */
export function parseHours(raw: string): number | null {
  const s = toEnDigits(String(raw ?? "")).trim().replace(/[٫,]/g, ".");
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (m) {
    const h = Number(m[1]) + Number(m[2]) / 60;
    return h > 0 && h <= 24 ? Math.round(h * 100) / 100 : null;
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n <= 24 ? Math.round(n * 100) / 100 : null;
}

/** 7.5 → «۷:۳۰» (قالب گوگل‌شیت) */
export function fmtHM(h: number): string {
  const sign = h < 0 ? "−" : "";
  const a = Math.abs(h);
  let hh = Math.floor(a);
  let mm = Math.round((a - hh) * 60);
  if (mm === 60) {
    hh += 1;
    mm = 0;
  }
  return mm ? `${sign}${fa(hh)}:${fa(mm).padStart(2, "۰")}` : `${sign}${fa(hh)}`;
}

/** ساعت اعشاری با ارقام فارسی (برای جمع‌ها) */
export const fh = (h: number) => (Math.round(h * 10) / 10).toLocaleString("fa-IR", { maximumFractionDigits: 1 });

// ======================================================== دوره‌ی حقوق
export type Period = { key: string; jy: number; jm: number; start: string; end: string; label: string };

function startOf(jy: number, jm: number): string {
  // استثنای گوگل‌شیت: دوره‌ی شهریور از ۳۱ مرداد شروع می‌شود (پس دوره‌ی مرداد تا ۳۰ مرداد است)
  if (jm === 6) return formatJalali(jy, 5, 31);
  const py = jm === 1 ? jy - 1 : jy;
  const pm = jm === 1 ? 12 : jm - 1;
  return formatJalali(py, pm, Math.min(26, monthLength(py, pm)));
}

export function periodFor(jy: number, jm: number): Period {
  const ny = jm === 12 ? jy + 1 : jy;
  const nm = jm === 12 ? 1 : jm + 1;
  return {
    key: `${jy}-${String(jm).padStart(2, "0")}`,
    jy,
    jm,
    start: startOf(jy, jm),
    end: addDays(startOf(ny, nm), -1),
    label: `${monthNames[jm - 1]} ${fa(jy)}`,
  };
}

export function periodByKey(key: string): Period {
  const [y, m] = key.split("-").map(Number);
  return periodFor(y, m);
}

/** دوره‌ای که این تاریخ در آن می‌افتد */
export function periodOf(date: string): Period {
  const p = parseJalali(date)!;
  const [jy, jm] = p;
  const cur = periodFor(jy, jm);
  const d = dayNum(date)!;
  if (d < dayNum(cur.start)!) return jm === 1 ? periodFor(jy - 1, 12) : periodFor(jy, jm - 1);
  if (d > dayNum(cur.end)!) return jm === 12 ? periodFor(jy + 1, 1) : periodFor(jy, jm + 1);
  return cur;
}

export function shiftPeriod(p: Period, n: number): Period {
  let y = p.jy;
  let m = p.jm + n;
  while (m > 12) {
    m -= 12;
    y++;
  }
  while (m < 1) {
    m += 12;
    y--;
  }
  return periodFor(y, m);
}

/** همه‌ی روزهای بازه (شامل دو سر) */
export function daysBetween(start: string, end: string): string[] {
  const a = dayNum(start)!;
  const b = dayNum(end)!;
  const out: string[] = [];
  for (let d = a; d <= b; d++) out.push(fromDayNum(d));
  return out;
}

/** شنبه‌ی هفته‌ی این تاریخ */
export const weekStart = (date: string) => addDays(date, -weekdayOf(date));

export const inRange = (date: string, start: string, end: string) => {
  const d = dayNum(date) ?? 0;
  return d >= (dayNum(start) ?? 0) && d <= (dayNum(end) ?? 0);
};

export const shortDate = (date: string) => {
  const p = parseJalali(date);
  return p ? `${fa(p[2])} ${monthNames[p[1] - 1]}` : date;
};

// ======================================================== ساعت موظف
export function holidayOf(s: TsSettings, date: string) {
  const n = dayNum(date);
  return s.holidays.find((h) => dayNum(h.date) === n);
}

/** ساعت موظفِ یک روز: جمعه و تعطیل رسمی ۰، پنجشنبه از تنظیمات، بقیه ساعت روزانه (یا ساعت پاره‌وقت شخص) */
export function expectedOn(s: TsSettings, date: string, p?: Pick<Person, "dailyHours">): number {
  const wd = weekdayOf(date);
  if (wd === 6 || holidayOf(s, date)) return 0;
  if (p?.dailyHours) return wd === 5 ? 0 : p.dailyHours;
  if (wd === 5) return s.thursdayHours;
  return s.dailyHours;
}

export const isOffDay = (s: TsSettings, date: string) => expectedOn(s, date) === 0;

// ======================================================== جمع‌بندی
export type Summary = {
  work: number;
  remote: number;
  mission: number;
  leaveHours: number;
  leaveDays: number;
  missionDays: number;
  remoteDays: number;
  /** همه‌ی ساعت‌های کاری (کار + دورکاری + مأموریت) */
  worked: number;
  expected: number;
  /** کارکرد + مرخصی − موظف */
  balance: number;
  overtime: number;
  deficit: number;
  missingDays: number;
};

/** فقط ورودی‌هایی که در جمع حساب می‌شوند (پذیرفته‌شده و غیرتجمیعی) */
export const counts = (e: TimeEntry) => e.review === "accepted" && !e.aggregate;

export function summarize(entries: TimeEntry[], s: TsSettings, days: string[], p?: Pick<Person, "dailyHours">): Summary {
  const set = new Set(days.map((d) => dayNum(d)));
  const list = entries.filter((e) => counts(e) && set.has(dayNum(e.date)));
  const sum = (t: EntryType) => list.filter((e) => e.type === t).reduce((a, e) => a + e.hours, 0);
  const work = sum("work");
  const remote = sum("remote");
  const mission = sum("mission");
  let leaveHours = 0;
  let leaveDays = 0;
  const byDay = new Map<number, TimeEntry[]>();
  list.forEach((e) => {
    const k = dayNum(e.date)!;
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  });
  let missing = 0;
  let expected = 0;
  days.forEach((d) => {
    const exp = expectedOn(s, d, p);
    expected += exp;
    const es = byDay.get(dayNum(d)!) ?? [];
    const dayLeave = es.filter((e) => e.type === "leave_daily");
    if (dayLeave.length) {
      leaveDays += 1;
      leaveHours += exp || p?.dailyHours || s.dailyHours;
    }
    es.filter((e) => e.type === "leave_hourly").forEach((e) => {
      leaveHours += e.hours;
      leaveDays += e.hours / (p?.dailyHours || s.dailyHours);
    });
    if (exp > 0 && es.length === 0) missing++;
  });
  const missionDays = new Set(list.filter((e) => e.type === "mission").map((e) => e.date)).size;
  const remoteDays = new Set(list.filter((e) => e.type === "remote").map((e) => e.date)).size;
  const worked = work + remote + mission;
  const balance = worked + leaveHours - expected;
  return {
    work,
    remote,
    mission,
    leaveHours,
    leaveDays: Math.round(leaveDays * 10) / 10,
    missionDays,
    remoteDays,
    worked,
    expected,
    balance,
    overtime: Math.max(0, balance),
    deficit: Math.max(0, -balance),
    missingDays: missing,
  };
}

/** ساعت روزانه برای نمایش در جدول: کارکرد روز (بدون مرخصی) */
export function dayHours(entries: TimeEntry[], date: string): { worked: number; leave: "daily" | "hourly" | null; mission: boolean; remote: boolean; count: number } {
  const n = dayNum(date);
  const es = entries.filter((e) => counts(e) && dayNum(e.date) === n);
  return {
    worked: es.filter((e) => !isLeave(e.type)).reduce((a, e) => a + e.hours, 0),
    leave: es.some((e) => e.type === "leave_daily") ? "daily" : es.some((e) => e.type === "leave_hourly") ? "hourly" : null,
    mission: es.some((e) => e.type === "mission"),
    remote: es.some((e) => e.type === "remote"),
    count: es.length,
  };
}

/** ساعت ثابت (مدیر محصول) برای روزهای کاری تا امروز — ورودی مجازی فقط‌خواندنی */
export function fixedEntries(p: Person, s: TsSettings, days: string[], today: string, existing: TimeEntry[]): TimeEntry[] {
  if (!p.fixedHours) return [];
  const t = dayNum(today)!;
  const taken = new Set(existing.filter((e) => e.personId === p.id && e.review !== "rejected").map((e) => dayNum(e.date)));
  return days
    .filter((d) => dayNum(d)! <= t && expectedOn(s, d, p) > 0 && !taken.has(dayNum(d)))
    .map((d) => ({
      id: `fx-${p.id}-${dayNum(d)}`,
      personId: p.id,
      date: d,
      hours: p.fixedHours!,
      type: "work" as EntryType,
      description: "ساعت ثابت قراردادی",
      source: "manual" as EntrySource,
      review: "accepted" as ReviewState,
      createdAt: d,
      readOnly: true,
    }));
}
