// ---------------------------------------------------------------------------
// مدل «تیکت پشتیبانی» — گزارش خطا و درخواست از هر کاربرِ سامانه به تیم سازنده‌ی موتوشاب.
// هر تغییر یک رویداد تغییرناپذیر در تاریخچه‌ی تیکت است (وضعیت، پیام، یادداشت داخلی،
// ارجاع، اولویت، پیوست و …). زمان‌ها «دقیقه‌ی دمو» هستند: روزِ مرجع دمو + ساعت واقعی.
// ---------------------------------------------------------------------------
import { DEMO_REF_DATE } from "../../pm/seed";
import { dayNum, fa, fromDayNum } from "../../pm/jalali";
import type { BadgeTone } from "../../components/ui/Badge";

export const APP_VERSION = "۳.۸.۲";

export type TicketType = "خطا" | "درخواست قابلیت" | "سؤال" | "مشکل دسترسی" | "کندی و کارایی" | "پیشنهاد";
export const ticketTypes: TicketType[] = ["خطا", "درخواست قابلیت", "سؤال", "مشکل دسترسی", "کندی و کارایی", "پیشنهاد"];

export type TicketPriority = "کم" | "متوسط" | "زیاد" | "بحرانی";
export const priorities: TicketPriority[] = ["کم", "متوسط", "زیاد", "بحرانی"];

export type TicketSeverity = "جزئی" | "متوسط" | "شدید" | "مسدودکننده";
export const severities: TicketSeverity[] = ["جزئی", "متوسط", "شدید", "مسدودکننده"];
export const severityHint: Record<TicketSeverity, string> = {
  جزئی: "ظاهری یا کم‌اثر؛ کار ادامه دارد",
  متوسط: "بخشی از کار مختل است اما راه جایگزین هست",
  شدید: "قابلیت اصلی کار نمی‌کند",
  مسدودکننده: "کار کاربران متوقف شده است",
};

export type TicketStatus = "new" | "triage" | "need-info" | "in-progress" | "resolved" | "closed" | "rejected";
export const statusOrder: TicketStatus[] = ["new", "triage", "need-info", "in-progress", "resolved", "closed", "rejected"];
export const statusLabel: Record<TicketStatus, string> = {
  new: "جدید",
  triage: "در حال بررسی",
  "need-info": "نیاز به اطلاعات بیشتر",
  "in-progress": "در حال رفع",
  resolved: "رفع‌شده (در انتظار تأیید کاربر)",
  closed: "بسته‌شده",
  rejected: "ردشده",
};
export const statusShort: Record<TicketStatus, string> = { ...statusLabel, "need-info": "نیاز به اطلاعات", resolved: "رفع‌شده" };
export const statusTone: Record<TicketStatus, BadgeTone> = {
  new: "brand",
  triage: "navy",
  "need-info": "warning",
  "in-progress": "brand",
  resolved: "success",
  closed: "neutral",
  rejected: "danger",
};
/** گذارهای مجاز برای تیم سازنده */
export const vendorTransitions: Record<TicketStatus, TicketStatus[]> = {
  new: ["triage", "need-info", "in-progress", "rejected"],
  triage: ["need-info", "in-progress", "resolved", "rejected"],
  "need-info": ["triage", "in-progress", "rejected"],
  "in-progress": ["need-info", "resolved", "triage"],
  resolved: ["in-progress", "closed"],
  closed: ["triage"],
  rejected: ["triage"],
};
export const isFinal = (s: TicketStatus) => s === "closed" || s === "rejected";
export const isOpen = (s: TicketStatus) => !isFinal(s);

export const priorityTone: Record<TicketPriority, BadgeTone> = { کم: "neutral", متوسط: "brand", زیاد: "warning", بحرانی: "danger" };
export const severityTone: Record<TicketSeverity, BadgeTone> = { جزئی: "neutral", متوسط: "brand", شدید: "warning", مسدودکننده: "danger" };

/** اهداف SLA بر اساس اولویت (ساعت تقویمی) */
export const slaTargets: Record<TicketPriority, { first: number; resolve: number }> = {
  بحرانی: { first: 1, resolve: 8 },
  زیاد: { first: 4, resolve: 24 },
  متوسط: { first: 8, resolve: 72 },
  کم: { first: 24, resolve: 120 },
};

export const modules = [
  "داشبورد",
  "دستیار هوشمند",
  "اعضای سازمان و ارتباطات",
  "وبلاگ و مجلات",
  "اخبار سازمان",
  "رسانه",
  "پرسش و پاسخ",
  "هشتگ‌ها و موضوعات",
  "اسناد و فایل‌ها",
  "تقویم",
  "گفتگو، گروه‌ها و کانال‌ها",
  "رویداد و جلسات",
  "مدیریت پروژه",
  "فعالیت و وظایف",
  "گزارش فعالیت و زمان کاری",
  "مدیریت دانش",
  "فرصت‌های پژوهشی",
  "قراردادهای فناورانه",
  "صندوق نوآوری",
  "جایزه",
  "آموزش",
  "گزارش‌گیری",
  "جستجو",
  "اعلان‌ها",
  "تنظیمات سامانه",
  "نقش و دسترسی",
  "ورود و حساب کاربری",
  "سایر",
] as const;
export type TicketModule = (typeof modules)[number];

const routeModules: [string, TicketModule][] = [
  ["/dashboard/projects", "مدیریت پروژه"],
  ["/dashboard/project-teams", "مدیریت پروژه"],
  ["/dashboard/my-work", "فعالیت و وظایف"],
  ["/dashboard/activity", "گزارش فعالیت و زمان کاری"],
  ["/dashboard/knowledge", "مدیریت دانش"],
  ["/dashboard/blog", "وبلاگ و مجلات"],
  ["/dashboard/magazines", "وبلاگ و مجلات"],
  ["/dashboard/news", "اخبار سازمان"],
  ["/dashboard/media", "رسانه"],
  ["/dashboard/forum", "پرسش و پاسخ"],
  ["/dashboard/topics", "هشتگ‌ها و موضوعات"],
  ["/dashboard/files", "اسناد و فایل‌ها"],
  ["/dashboard/calendar", "تقویم"],
  ["/dashboard/chat", "گفتگو، گروه‌ها و کانال‌ها"],
  ["/dashboard/groups", "گفتگو، گروه‌ها و کانال‌ها"],
  ["/dashboard/channels", "گفتگو، گروه‌ها و کانال‌ها"],
  ["/dashboard/events", "رویداد و جلسات"],
  ["/dashboard/members", "اعضای سازمان و ارتباطات"],
  ["/dashboard/connections", "اعضای سازمان و ارتباطات"],
  ["/dashboard/friends", "اعضای سازمان و ارتباطات"],
  ["/dashboard/research", "فرصت‌های پژوهشی"],
  ["/dashboard/contracts", "قراردادهای فناورانه"],
  ["/dashboard/funds", "صندوق نوآوری"],
  ["/dashboard/award", "جایزه"],
  ["/dashboard/training", "آموزش"],
  ["/dashboard/reports", "گزارش‌گیری"],
  ["/dashboard/search", "جستجو"],
  ["/dashboard/notifications", "اعلان‌ها"],
  ["/dashboard/assistant", "دستیار هوشمند"],
  ["/dashboard/settings", "تنظیمات سامانه"],
  ["/dashboard/admin", "تنظیمات سامانه"],
  ["/dashboard/appearance", "تنظیمات سامانه"],
  ["/dashboard/access", "نقش و دسترسی"],
  ["/dashboard/profile", "ورود و حساب کاربری"],
  ["/login", "ورود و حساب کاربری"],
];
export function moduleFromPath(path: string): TicketModule {
  const p = path.split("?")[0];
  if (p === "/dashboard" || p === "/dashboard/") return "داشبورد";
  return routeModules.find(([pre]) => p.startsWith(pre))?.[1] ?? "سایر";
}

export const vendorTeam = [
  { id: "v1", name: "مهندس آرش نوروزی", title: "سرپرست پشتیبانی", color: "#1f4f99" },
  { id: "v2", name: "مهندس سارا کاظمی", title: "توسعه‌دهنده‌ی رابط کاربری", color: "#db2777" },
  { id: "v3", name: "مهندس رضا تهرانی", title: "توسعه‌دهنده‌ی بک‌اند و زیرساخت", color: "#0d9488" },
  { id: "v4", name: "مهندس نیلوفر احمدی", title: "کارشناس تضمین کیفیت", color: "#b45309" },
];
export const vendorById = (id?: string) => vendorTeam.find((v) => v.id === id);

export const releases = [
  {
    version: "۳.۹.۰",
    date: "۱۴۰۵/۰۳/۲۰",
    upcoming: true,
    title: "ورود یکپارچه و خروجی گزارش‌ها",
    items: ["ورود یکپارچه (SSO) با حساب سازمانی", "خروجی Excel از گزارش کارکرد ماهانه", "بهبود سرعت بُرد پروژه‌های بزرگ (بارگذاری تدریجی)"],
  },
  {
    version: "۳.۸.۲",
    date: "۱۴۰۵/۰۳/۰۵",
    title: "تیکت پشتیبانی و نقش‌های چندگانه",
    items: [
      "تیکت پشتیبانی جدید: گزارش مشکل از هر صفحه با ثبت خودکار مسیر صفحه، مرورگر و نقش",
      "تاریخچه‌ی کامل و تغییرناپذیر هر تیکت + SLA بر اساس اولویت",
      "اصلاح خوانایی تقویم جلسات در حالت تاریک",
      "راهنمای سامانه به «مدیریت دانش ← راهنما» منتقل شد",
    ],
  },
  {
    version: "۳.۸.۱",
    date: "۱۴۰۵/۰۲/۲۸",
    title: "اصلاحات زمان کاری و جستجو",
    items: ["ثبت ساعت کاری در روزهای تعطیل رسمی اصلاح شد", "جستجوی فارسی با «ی» و «ک» عربی نتیجه می‌دهد", "نمایش «چرا این دسترسی را دارم؟» در نقش و دسترسی من"],
  },
  {
    version: "۳.۸.۰",
    date: "۱۴۰۵/۰۲/۱۵",
    title: "ساختار پیازی سازمان",
    items: ["درخت سیستم ← هلدینگ ← شرکت ← واحد با نقش‌های سفارشی هر لایه", "تخصیص چند نقش هم‌زمان و دسترسی زمان‌دار", "تاریخچه‌ی تغییرناپذیر تغییرات دسترسی"],
  },
];
export const releaseVersions = releases.map((r) => r.version);

export const cannedReplies = [
  { id: "c1", title: "دریافت شد", text: "سلام، تیکت شما دریافت شد و در صف بررسی تیم سازنده قرار گرفت. نتیجه از همین‌جا اطلاع‌رسانی می‌شود." },
  { id: "c2", title: "درخواست اطلاعات", text: "برای بررسی دقیق‌تر لطفاً تصویر صفحه، زمان دقیق رخداد و واحدی که در آن ایستاده بودید را ارسال کنید." },
  { id: "c3", title: "بازتولید شد", text: "مشکل در محیط آزمایشی بازتولید شد و برای رفع به توسعه‌دهنده ارجاع گردید." },
  { id: "c4", title: "رفع شد", text: "مشکل رفع شد و در نسخه‌ی جدید منتشر می‌شود. لطفاً بررسی و در صورت رضایت تیکت را تأیید کنید." },
  { id: "c5", title: "در نقشه‌ی راه", text: "از پیشنهاد شما سپاسگزاریم؛ این مورد در نقشه‌ی راه نسخه‌های آینده قرار گرفت." },
  { id: "c6", title: "راهنما", text: "پاسخ این پرسش در «مدیریت دانش ← راهنما» آمده است. اگر همچنان ابهام دارید همین‌جا بپرسید." },
];

// ---------------------------------------------------------------------------
// ساختار داده
// ---------------------------------------------------------------------------
export type ActorKind = "reporter" | "vendor" | "user" | "system";
export type EventKind =
  | "created"
  | "status"
  | "comment"
  | "note"
  | "assign"
  | "priority"
  | "severity"
  | "attachment"
  | "labels"
  | "link"
  | "release"
  | "rating";

export type TicketEvent = {
  id: string;
  at: number;
  kind: EventKind;
  actor: string;
  actorKind: ActorKind;
  text?: string;
  from?: string;
  to?: string;
  /** فقط برای تیم سازنده قابل مشاهده است */
  internal?: boolean;
  files?: string[];
};

export type Attachment = { name: string; size: number; at: number; by: string };
export type TicketLink = { id: string; kind: "duplicate-of" | "related" };

export type CapturedContext = {
  route: string;
  pageTitle: string;
  userAgent: string;
  screen: string;
  scope: string;
  roles: string;
  appVersion: string;
  at: number;
};

export type Ticket = {
  id: string;
  title: string;
  description: string;
  type: TicketType;
  module: TicketModule;
  priority: TicketPriority;
  severity: TicketSeverity;
  status: TicketStatus;
  reporterId: string;
  reporterName: string;
  reporterScopeId: string;
  assigneeId?: string;
  createdAt: number;
  updatedAt: number;
  firstResponseAt?: number;
  resolvedAt?: number;
  steps?: string;
  expected?: string;
  actual?: string;
  labels: string[];
  links: TicketLink[];
  fixedIn?: string;
  attachments: Attachment[];
  context: CapturedContext;
  rating?: { score: number; comment?: string; at: number };
  events: TicketEvent[];
};

export type NewTicketInput = {
  title: string;
  description: string;
  type: TicketType;
  module: TicketModule;
  priority: TicketPriority;
  severity: TicketSeverity;
  steps?: string;
  expected?: string;
  actual?: string;
  labels: string[];
  attachments: { name: string; size: number }[];
  context: CapturedContext;
  /** واحدی که گزارش‌دهنده هنگام ثبت در آن ایستاده بود */
  scopeId: string;
};

// ---------------------------------------------------------------------------
// زمان دمو
// ---------------------------------------------------------------------------
export const DAY_BASE = (dayNum(DEMO_REF_DATE) ?? 0) * 1440;
/** «اکنون» در تقویم دمو: روز مرجع + ساعت فعلی */
export function clockNow() {
  const d = new Date();
  return DAY_BASE + d.getHours() * 60 + d.getMinutes();
}
const two = (n: number) => fa(n).padStart(2, "۰");
export function fmtTs(ts: number) {
  const day = Math.floor(ts / 1440);
  const m = ((ts % 1440) + 1440) % 1440;
  return `${fromDayNum(day)} — ${two(Math.floor(m / 60))}:${two(m % 60)}`;
}
export function fmtDur(min: number) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${fa(m)} دقیقه`;
  const h = Math.floor(m / 60);
  if (h < 48) {
    const r = m % 60;
    return r && h < 10 ? `${fa(h)} ساعت و ${fa(r)} دقیقه` : `${fa(h)} ساعت`;
  }
  return `${fa(Math.round(h / 24))} روز`;
}
export function relTs(ts: number, now: number) {
  const d = now - ts;
  if (d < 2) return "همین حالا";
  if (d < 60) return `${fa(d)} دقیقه پیش`;
  if (d < 24 * 60) return `${fa(Math.floor(d / 60))} ساعت پیش`;
  const days = Math.floor(d / 1440);
  return days === 1 ? "دیروز" : `${fa(days)} روز پیش`;
}
export const fmtSize = (b: number) => (b < 1024 * 1024 ? `${fa(Math.max(1, Math.round(b / 1024)))} کیلوبایت` : `${fa(Math.round((b / 1024 / 1024) * 10) / 10)} مگابایت`);

// ---------------------------------------------------------------------------
// SLA
// ---------------------------------------------------------------------------
export type SlaInfo = {
  kind: "first" | "resolve";
  target: number;
  elapsed: number;
  remaining: number;
  state: "met" | "ok" | "risk" | "breached" | "paused" | "na";
};

export function slaFirst(t: Ticket, now: number): SlaInfo {
  const target = slaTargets[t.priority].first * 60;
  if (t.firstResponseAt !== undefined) {
    const elapsed = t.firstResponseAt - t.createdAt;
    return { kind: "first", target, elapsed, remaining: target - elapsed, state: elapsed <= target ? "met" : "breached" };
  }
  if (isFinal(t.status)) return { kind: "first", target, elapsed: 0, remaining: 0, state: "na" };
  const elapsed = now - t.createdAt;
  const remaining = target - elapsed;
  return { kind: "first", target, elapsed, remaining, state: remaining < 0 ? "breached" : remaining < target * 0.25 ? "risk" : "ok" };
}

const stoppedStates: TicketStatus[] = ["resolved", "closed", "rejected"];
/** زمان صرف‌شده برای رفع — در «نیاز به اطلاعات بیشتر» ساعت متوقف است */
export function slaResolve(t: Ticket, now: number): SlaInfo {
  const target = slaTargets[t.priority].resolve * 60;
  let cur: TicketStatus = "new";
  let since = t.createdAt;
  let elapsed = 0;
  const counts = (s: TicketStatus) => s !== "need-info" && !stoppedStates.includes(s);
  t.events
    .filter((e) => e.kind === "status" && e.to)
    .forEach((e) => {
      if (counts(cur)) elapsed += e.at - since;
      cur = e.to as TicketStatus;
      since = e.at;
    });
  if (counts(cur)) elapsed += now - since;
  const remaining = target - elapsed;
  let state: SlaInfo["state"];
  if (stoppedStates.includes(t.status)) state = t.status === "rejected" ? "na" : remaining >= 0 ? "met" : "breached";
  else if (t.status === "need-info") state = remaining < 0 ? "breached" : "paused";
  else state = remaining < 0 ? "breached" : remaining < target * 0.2 ? "risk" : "ok";
  return { kind: "resolve", target, elapsed, remaining, state };
}

export function isBreached(t: Ticket, now: number) {
  if (!isOpen(t.status) || t.status === "resolved") return false;
  return slaFirst(t, now).state === "breached" || slaResolve(t, now).state === "breached";
}

// ---------------------------------------------------------------------------
// ثبت خودکار زمینه
// ---------------------------------------------------------------------------
export function shortUserAgent(ua: string) {
  const b =
    ua.match(/Edg\/(\d+)/)?.[1] !== undefined
      ? `Edge ${ua.match(/Edg\/(\d+)/)![1]}`
      : ua.match(/Firefox\/(\d+)/)
        ? `Firefox ${ua.match(/Firefox\/(\d+)/)![1]}`
        : ua.match(/Chrome\/(\d+)/)
          ? `Chrome ${ua.match(/Chrome\/(\d+)/)![1]}`
          : ua.match(/Version\/(\d+).*Safari/)
            ? `Safari ${ua.match(/Version\/(\d+).*Safari/)![1]}`
            : "مرورگر نامشخص";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${b} · ${os}` : b;
}

export function captureContext(scope: string, roles: string, route?: string, pageTitle?: string): CapturedContext {
  const hasWin = typeof window !== "undefined";
  return {
    route: route ?? (hasWin ? window.location.hash.replace(/^#/, "") || "/" : "/"),
    pageTitle: pageTitle ?? (typeof document !== "undefined" ? document.title : ""),
    userAgent: hasWin ? shortUserAgent(navigator.userAgent) : "",
    screen: hasWin ? `${fa(window.innerWidth)}×${fa(window.innerHeight)} (صفحه‌نمایش ${fa(window.screen.width)}×${fa(window.screen.height)})` : "",
    scope,
    roles,
    appVersion: APP_VERSION,
    at: clockNow(),
  };
}

export const nextTicketId = (list: Ticket[]) => {
  const max = list.reduce((m, t) => Math.max(m, Number(t.id.replace(/\D/g, "")) || 0), 1023);
  return `MSH-${max + 1}`;
};
