// ---------------------------------------------------------------------------
// دسترسی ریز اعضای پروژه — الگوی «توکن ریزدانه»‌ی GitLab:
// هر بخش پروژه (resource) یک سطح دسترسی دارد: بدون دسترسی / مشاهده / مشاهده و ویرایش / مدیریت.
// نقش پروژه (مدیر پروژه، مدیر سیستم، عضو، مشاهده‌گر) فقط «پیش‌فرض» است و مدیر پروژه
// می‌تواند برای هر عضو بخش‌به‌بخش بازنویسی کند: دسترسی مؤثر = پیش‌فرض نقش + بازنویسی‌های عضو.
// «مالک» همیشه دسترسی کامل دارد و قابل ویرایش نیست.
// این فایل خالص است (بدون React) تا هم UI و هم بک‌اند آینده از آن استفاده کنند.
// ---------------------------------------------------------------------------
import type { AccessLevel, PMMember, ProjectRole } from "./types";

export type { AccessLevel };

export type ResourceId =
  | "tasks"
  | "sprints"
  | "gantt"
  | "graph"
  | "milestones"
  | "budget"
  | "risks"
  | "issues"
  | "intake"
  | "decisions"
  | "gates"
  | "meetings"
  | "communication"
  | "documents"
  | "calendar"
  | "time"
  | "workload"
  | "reports"
  | "flow"
  | "history"
  | "team"
  | "settings"
  | "notifications";

export type AccessGroupId = "planning" | "finance" | "control" | "collab" | "time" | "admin";

export type ResourceDef = {
  id: ResourceId;
  label: string;
  hint: string;
  group: AccessGroupId;
  /** بالاترین سطح معنادار برای این بخش */
  max: AccessLevel;
  /** تب صفحه‌ی پروژه که این بخش را نشان می‌دهد (بازبینی مرحله‌ای کارتی در نمای کلی است) */
  tab?: string;
};

export const LEVELS: AccessLevel[] = ["none", "read", "write", "manage"];
export const LEVEL_RANK: Record<AccessLevel, number> = { none: 0, read: 1, write: 2, manage: 3 };
export const levelLabel: Record<AccessLevel, string> = { none: "بدون دسترسی", read: "مشاهده", write: "مشاهده و ویرایش", manage: "مدیریت" };
export const levelShort: Record<AccessLevel, string> = { none: "بدون", read: "مشاهده", write: "ویرایش", manage: "مدیریت" };

export const ACCESS_GROUPS: { id: AccessGroupId; label: string; resources: ResourceDef[] }[] = [
  {
    id: "planning",
    label: "برنامه‌ریزی",
    resources: [
      { id: "tasks", label: "وظایف و بورد", hint: "ایجاد، ویرایش، جابه‌جایی و حذف تسک‌ها", group: "planning", max: "write", tab: "board" },
      { id: "sprints", label: "اسپرینت‌ها", hint: "برنامه‌ریزی، شروع و پایان اسپرینت", group: "planning", max: "write", tab: "sprints" },
      { id: "gantt", label: "گانت چارت", hint: "جابه‌جایی نوارها و تغییر مدت در گانت", group: "planning", max: "write", tab: "gantt" },
      { id: "graph", label: "گراف وابستگی", hint: "ساخت و حذف وابستگی بین تسک‌ها", group: "planning", max: "write", tab: "graph" },
      { id: "milestones", label: "مایل‌ستون‌ها", hint: "تعریف و ویرایش نقاط عطف", group: "planning", max: "write", tab: "milestones" },
    ],
  },
  {
    id: "finance",
    label: "مالی",
    resources: [{ id: "budget", label: "بودجه و هزینه‌ها", hint: "سرفصل‌های بودجه، ثبت و تأیید هزینه", group: "finance", max: "write", tab: "budget" }],
  },
  {
    id: "control",
    label: "کنترل",
    resources: [
      { id: "risks", label: "ریسک‌ها", hint: "ثبت و پیگیری ریسک", group: "control", max: "write", tab: "risks" },
      { id: "issues", label: "مشکلات", hint: "گزارش و رفع مشکل", group: "control", max: "write", tab: "issues" },
      { id: "intake", label: "درخواست‌ها", hint: "ثبت و بررسی درخواست‌های ورودی", group: "control", max: "write", tab: "intake" },
      { id: "decisions", label: "دفتر تصمیمات", hint: "ثبت تصمیم با دلیل و مسئول", group: "control", max: "write", tab: "decisions" },
      { id: "gates", label: "بازبینی مرحله‌ای", hint: "تصمیم ادامه / اصلاح / توقف (کارت نمای کلی)", group: "control", max: "write", tab: "overview" },
    ],
  },
  {
    id: "collab",
    label: "همکاری",
    resources: [
      { id: "meetings", label: "جلسات و صورت‌جلسه", hint: "ایجاد جلسه، ثبت صورت‌جلسه و تبدیل اقدام به تسک", group: "collab", max: "write", tab: "minutes" },
      { id: "communication", label: "کانال‌ها و گفتگو", hint: "کانال‌ها، پیام‌ها و اطلاعیه‌ها", group: "collab", max: "write", tab: "communication" },
      { id: "documents", label: "اسناد", hint: "بارگذاری و نسخه‌ی اسناد", group: "collab", max: "write", tab: "documents" },
      { id: "calendar", label: "تقویم", hint: "تقویم سررسیدها و جلسات پروژه", group: "collab", max: "write", tab: "calendar" },
    ],
  },
  {
    id: "time",
    label: "زمان و گزارش",
    resources: [
      { id: "time", label: "ثبت زمان", hint: "ثبت و ویرایش ساعت کار", group: "time", max: "write", tab: "time" },
      { id: "workload", label: "بار کاری", hint: "ظرفیت و بار هفتگی اعضا", group: "time", max: "read", tab: "workload" },
      { id: "reports", label: "گزارش‌ها", hint: "گزارش‌ها و خروجی", group: "time", max: "write", tab: "reports" },
      { id: "flow", label: "تحلیل جریان", hint: "زمان چرخه و گلوگاه‌ها", group: "time", max: "read", tab: "flow" },
      { id: "history", label: "تاریخچه", hint: "تاریخچه‌ی رویدادهای پروژه", group: "time", max: "read", tab: "history" },
    ],
  },
  {
    id: "admin",
    label: "مدیریت",
    resources: [
      { id: "team", label: "تیم و دسترسی‌ها", hint: "ویرایش = افزودن/حذف عضو و تغییر نقش · مدیریت = تعیین دسترسی‌های ریز اعضا", group: "admin", max: "manage", tab: "team" },
      { id: "settings", label: "تنظیمات", hint: "ویرایش = تنظیمات عمومی · مدیریت = بایگانی، حذف و اختتام", group: "admin", max: "manage", tab: "settings" },
      { id: "notifications", label: "اعلان‌ها و خودکارسازی", hint: "قواعد اعلان و خودکارسازی", group: "admin", max: "write", tab: "notifications" },
    ],
  },
];

export const RESOURCES: ResourceDef[] = ACCESS_GROUPS.flatMap((g) => g.resources);
export const resourceById = Object.fromEntries(RESOURCES.map((r) => [r.id, r])) as Record<ResourceId, ResourceDef>;
export const groupLabel = Object.fromEntries(ACCESS_GROUPS.map((g) => [g.id, g.label])) as Record<AccessGroupId, string>;

/** تب صفحه‌ی پروژه ← بخش دسترسی (نمای کلی برای همه‌ی اعضا باز است) */
export const TAB_RESOURCE: Record<string, ResourceId | null> = {
  overview: null,
  board: "tasks",
  sprints: "sprints",
  gantt: "gantt",
  graph: "graph",
  milestones: "milestones",
  budget: "budget",
  risks: "risks",
  issues: "issues",
  intake: "intake",
  decisions: "decisions",
  minutes: "meetings",
  communication: "communication",
  documents: "documents",
  calendar: "calendar",
  time: "time",
  workload: "workload",
  reports: "reports",
  flow: "flow",
  history: "history",
  team: "team",
  settings: "settings",
  notifications: "notifications",
};

export type AccessMatrix = Record<ResourceId, AccessLevel>;

const fill = (level: AccessLevel, over: Partial<AccessMatrix> = {}): AccessMatrix => {
  const m = {} as AccessMatrix;
  RESOURCES.forEach((r) => (m[r.id] = clamp(r.id, over[r.id] ?? level)));
  return m;
};

/** سطح را به بالاترین سطح معنادار آن بخش محدود می‌کند */
export function clamp(res: ResourceId, level: AccessLevel): AccessLevel {
  const max = resourceById[res]?.max ?? "write";
  return LEVEL_RANK[level] > LEVEL_RANK[max] ? max : level;
}

/** ماتریس پیش‌فرض هر نقش (preset) */
export const ROLE_PRESETS: Record<ProjectRole, AccessMatrix> = {
  مالک: fill("manage"),
  "مدیر پروژه": fill("manage"),
  "مدیر سیستم": fill("write", { budget: "read", workload: "read", flow: "read", history: "read", team: "write", settings: "manage" }),
  عضو: fill("read", { tasks: "write", issues: "write", intake: "write", meetings: "write", communication: "write", documents: "write", time: "write", budget: "write", settings: "none" }),
  مشاهده‌گر: fill("read", { time: "read", settings: "none", notifications: "none", team: "read" }),
};

export const presetHint: Record<ProjectRole, string> = {
  مالک: "دسترسی کامل و ثابت؛ قابل ویرایش نیست.",
  "مدیر پروژه": "مدیریت کامل همه‌ی بخش‌ها، از جمله دسترسی اعضا.",
  "مدیر سیستم": "ویرایش بیشتر بخش‌ها و مدیریت تنظیمات؛ مالی فقط مشاهده.",
  عضو: "ویرایش تسک‌ها، جلسات، اسناد، گفتگو، ثبت زمان و هزینه؛ بقیه مشاهده.",
  مشاهده‌گر: "فقط مشاهده (مثلاً کارفرما یا ناظر بیرونی)؛ تنظیمات و اعلان‌ها پنهان.",
};

export const presetLevel = (role: ProjectRole, res: ResourceId): AccessLevel => ROLE_PRESETS[role]?.[res] ?? "none";

/** دسترسی مؤثر یک عضو = پیش‌فرض نقش + بازنویسی‌ها (مالک همیشه کامل) */
export function effectiveMatrix(m: Pick<PMMember, "role" | "access">): AccessMatrix {
  const base = ROLE_PRESETS[m.role] ?? ROLE_PRESETS["عضو"];
  if (m.role === "مالک") return { ...base };
  const out = { ...base };
  Object.entries(m.access ?? {}).forEach(([k, v]) => {
    if (k in out && v) out[k as ResourceId] = clamp(k as ResourceId, v);
  });
  return out;
}

export const effectiveLevel = (m: Pick<PMMember, "role" | "access">, res: ResourceId) => effectiveMatrix(m)[res];

export const atLeast = (have: AccessLevel, need: AccessLevel) => LEVEL_RANK[have] >= LEVEL_RANK[need];

/** بازنویسی‌هایی که واقعاً با پیش‌فرض نقش فرق دارند */
export function overridesOf(m: Pick<PMMember, "role" | "access">): Partial<AccessMatrix> {
  if (m.role === "مالک") return {};
  const out: Partial<AccessMatrix> = {};
  Object.entries(m.access ?? {}).forEach(([k, v]) => {
    const r = k as ResourceId;
    if (resourceById[r] && v && clamp(r, v) !== presetLevel(m.role, r)) out[r] = clamp(r, v);
  });
  return out;
}

/** فشرده‌سازی: فقط اختلاف با پیش‌فرض نقش ذخیره می‌شود (undefined = بدون بازنویسی) */
export function compactOverrides(role: ProjectRole, matrix: Partial<AccessMatrix>): Partial<AccessMatrix> | undefined {
  const out: Partial<AccessMatrix> = {};
  (Object.keys(matrix) as ResourceId[]).forEach((r) => {
    const v = matrix[r];
    if (v && resourceById[r] && clamp(r, v) !== presetLevel(role, r)) out[r] = clamp(r, v);
  });
  return Object.keys(out).length ? out : undefined;
}

export const countReadable = (mx: AccessMatrix) => RESOURCES.filter((r) => mx[r.id] !== "none").length;

/** تغییرات بین دو ماتریس — برای ثبت در تاریخچه */
export function diffMatrix(before: AccessMatrix, after: AccessMatrix): { res: ResourceId; from: AccessLevel; to: AccessLevel }[] {
  return RESOURCES.filter((r) => before[r.id] !== after[r.id]).map((r) => ({ res: r.id, from: before[r.id], to: after[r.id] }));
}

export type Editor = {
  /** نقش ویرایشگر در این پروژه (اگر عضو است) */
  role?: ProjectRole;
  /** ماتریس مؤثر ویرایشگر */
  matrix: AccessMatrix;
  /** مجوز سراسری مدیریت اعضا و نقش‌های پروژه (projects.members) */
  globalAdmin: boolean;
  name: string;
};

/** چه کسی می‌تواند دسترسی‌های اعضا را ویرایش کند */
export function canManageAccess(ed: Editor): boolean {
  return ed.globalAdmin || ed.role === "مالک" || ed.role === "مدیر پروژه" || ed.matrix.team === "manage";
}

/** آیا ویرایشگر می‌تواند دسترسی این عضو را تغییر دهد؟ */
export function checkEditMember(ed: Editor, target: PMMember): { ok: true } | { ok: false; reason: string } {
  if (!canManageAccess(ed)) return { ok: false, reason: "فقط مالک، مدیر پروژه یا دارنده‌ی مجوز «مدیریت اعضا و نقش‌های پروژه» می‌تواند دسترسی‌ها را تغییر دهد." };
  if (target.role === "مالک") return { ok: false, reason: "دسترسی مالک پروژه کامل و ثابت است." };
  if (target.name === ed.name && !ed.globalAdmin && ed.role !== "مالک") return { ok: false, reason: "دسترسی خودتان را نمی‌توانید تغییر دهید." };
  if (!ed.globalAdmin && ed.role !== "مالک" && target.role === "مدیر پروژه" && ed.role === "مدیر پروژه") return { ok: false, reason: "دسترسی مدیر پروژه‌ی هم‌سطح را فقط مالک یا مدیر سراسری تغییر می‌دهد." };
  return { ok: true };
}

/** بالاترین سطحی که ویرایشگر می‌تواند برای یک بخش اعطا کند (بدون ارتقای فراتر از سطح خودش) */
export function maxGrantable(ed: Editor, res: ResourceId): AccessLevel {
  if (ed.globalAdmin || ed.role === "مالک") return resourceById[res].max;
  return clamp(res, ed.matrix[res]);
}

/** متن خلاصه‌ی تغییرات برای تاریخچه و اعلان */
export function describeDiff(changes: { res: ResourceId; from: AccessLevel; to: AccessLevel }[]): string {
  if (!changes.length) return "";
  const parts = changes.slice(0, 4).map((c) => `«${resourceById[c.res].label}»: ${levelShort[c.from]} ← ${levelShort[c.to]}`);
  return parts.join("، ") + (changes.length > 4 ? ` و ${(changes.length - 4).toLocaleString("fa-IR")} بخش دیگر` : "");
}
