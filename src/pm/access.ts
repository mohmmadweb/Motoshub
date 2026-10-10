// ---------------------------------------------------------------------------
// دسترسی ریز اعضای پروژه — الگوی «توکن ریزدانه»‌ی GitLab:
// هر عضو یک نقشه‌ی صریح «بخش ← سطح» دارد (access). نقش پروژه دیگر دسترسی نمی‌دهد؛
// فیلد role فقط برای سازگاری با داده‌ی قدیمی و تشخیص «مالک» نگه داشته شده است.
// سطوح: مشاهده / مشاهده و ویرایش / مدیریت (فقط برای بخش‌هایی که معنا دارد). بخشِ انتخاب‌نشده = بدون دسترسی.
// «مالک» همیشه دسترسی کامل و ثابت دارد و قابل ویرایش نیست.
// بخش‌ها در سه «حوزه» (مثل Group and project / User / Global در GitLab) و چند دسته دسته‌بندی شده‌اند.
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

export type AccessScopeId = "project" | "data" | "admin";
export type AccessGroupId = "planning" | "finance" | "control" | "collab" | "time" | "history" | "team" | "settings" | "notifications";

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

export type AccessGroup = { id: AccessGroupId; label: string; scope: AccessScopeId; resources: ResourceDef[] };

export const LEVELS: AccessLevel[] = ["none", "read", "write", "manage"];
/** سطوحی که در انتخابگر قابل اعطا هستند («بدون دسترسی» = انتخاب‌نکردن بخش) */
export const GRANT_LEVELS: AccessLevel[] = ["read", "write", "manage"];
export const LEVEL_RANK: Record<AccessLevel, number> = { none: 0, read: 1, write: 2, manage: 3 };
export const levelLabel: Record<AccessLevel, string> = { none: "بدون دسترسی", read: "مشاهده", write: "مشاهده و ویرایش", manage: "مدیریت" };
export const levelShort: Record<AccessLevel, string> = { none: "بدون", read: "مشاهده", write: "ویرایش", manage: "مدیریت" };

export const ACCESS_SCOPES: { id: AccessScopeId; label: string; hint: string }[] = [
  { id: "project", label: "بخش‌های پروژه", hint: "برنامه‌ریزی، مالی، کنترل و همکاری" },
  { id: "data", label: "داده‌ها و گزارش‌ها", hint: "زمان، گزارش‌ها و تاریخچه" },
  { id: "admin", label: "مدیریت پروژه", hint: "تیم و دسترسی، تنظیمات، اعلان‌ها" },
];
export const scopeLabel = Object.fromEntries(ACCESS_SCOPES.map((s) => [s.id, s.label])) as Record<AccessScopeId, string>;

export const ACCESS_GROUPS: AccessGroup[] = [
  {
    id: "planning",
    label: "برنامه‌ریزی",
    scope: "project",
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
    scope: "project",
    resources: [{ id: "budget", label: "بودجه و هزینه‌ها", hint: "سرفصل‌های بودجه، ثبت و تأیید هزینه", group: "finance", max: "write", tab: "budget" }],
  },
  {
    id: "control",
    label: "کنترل",
    scope: "project",
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
    scope: "project",
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
    scope: "data",
    resources: [
      { id: "time", label: "ثبت زمان", hint: "ثبت و ویرایش ساعت کار", group: "time", max: "write", tab: "time" },
      { id: "workload", label: "بار کاری", hint: "ظرفیت و بار هفتگی اعضا", group: "time", max: "read", tab: "workload" },
      { id: "reports", label: "گزارش‌ها", hint: "گزارش‌ها و خروجی", group: "time", max: "write", tab: "reports" },
      { id: "flow", label: "تحلیل جریان", hint: "زمان چرخه و گلوگاه‌ها", group: "time", max: "read", tab: "flow" },
    ],
  },
  {
    id: "history",
    label: "تاریخچه",
    scope: "data",
    resources: [{ id: "history", label: "تاریخچه‌ی پروژه", hint: "رویدادهای ثبت‌شده‌ی پروژه", group: "history", max: "read", tab: "history" }],
  },
  {
    id: "team",
    label: "تیم و دسترسی",
    scope: "admin",
    resources: [{ id: "team", label: "تیم و دسترسی‌ها", hint: "ویرایش = افزودن و حذف عضو · مدیریت = تعیین دسترسی‌های اعضا", group: "team", max: "manage", tab: "team" }],
  },
  {
    id: "settings",
    label: "تنظیمات",
    scope: "admin",
    resources: [{ id: "settings", label: "تنظیمات پروژه", hint: "ویرایش = تنظیمات عمومی · مدیریت = بایگانی، حذف و اختتام", group: "settings", max: "manage", tab: "settings" }],
  },
  {
    id: "notifications",
    label: "اعلان‌ها و خودکارسازی",
    scope: "admin",
    resources: [{ id: "notifications", label: "اعلان‌ها و خودکارسازی", hint: "قواعد اعلان و خودکارسازی", group: "notifications", max: "write", tab: "notifications" }],
  },
];

export const RESOURCES: ResourceDef[] = ACCESS_GROUPS.flatMap((g) => g.resources);
export const resourceById = Object.fromEntries(RESOURCES.map((r) => [r.id, r])) as Record<ResourceId, ResourceDef>;
export const groupById = Object.fromEntries(ACCESS_GROUPS.map((g) => [g.id, g])) as Record<AccessGroupId, AccessGroup>;
export const groupLabel = Object.fromEntries(ACCESS_GROUPS.map((g) => [g.id, g.label])) as Record<AccessGroupId, string>;
export const scopeOf = (res: ResourceId): AccessScopeId => groupById[resourceById[res].group].scope;

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

/** ماتریس کامل (همه‌ی بخش‌ها، «بدون دسترسی» صریح) */
export type AccessMatrix = Record<ResourceId, AccessLevel>;
/** نقشه‌ی ذخیره‌شده روی عضو: فقط بخش‌های انتخاب‌شده (نبودِ کلید = بدون دسترسی) */
export type AccessMap = Partial<Record<ResourceId, AccessLevel>>;

/** سطح را به بالاترین سطح معنادار آن بخش محدود می‌کند */
export function clamp(res: ResourceId, level: AccessLevel): AccessLevel {
  const max = resourceById[res]?.max ?? "write";
  return LEVEL_RANK[level] > LEVEL_RANK[max] ? max : level;
}

const fill = (level: AccessLevel, over: AccessMap = {}): AccessMatrix => {
  const m = {} as AccessMatrix;
  RESOURCES.forEach((r) => (m[r.id] = clamp(r.id, over[r.id] ?? level)));
  return m;
};

export const fullMatrix = (): AccessMatrix => fill("manage");
export const emptyMatrix = (): AccessMatrix => fill("none");

/** نقشه‌ی ذخیره‌شده ← ماتریس کامل */
export function toMatrix(map: Partial<Record<string, AccessLevel>> | undefined): AccessMatrix {
  const out = emptyMatrix();
  Object.entries(map ?? {}).forEach(([k, v]) => {
    if (v && k in out) out[k as ResourceId] = clamp(k as ResourceId, v);
  });
  return out;
}

/** ماتریس کامل ← نقشه‌ی فشرده برای ذخیره (فقط بخش‌های دارای دسترسی) */
export function compactMap(mx: AccessMatrix): AccessMap {
  const out: AccessMap = {};
  RESOURCES.forEach((r) => {
    const v = clamp(r.id, mx[r.id] ?? "none");
    if (v !== "none") out[r.id] = v;
  });
  return out;
}

// ---------------------------------------------------------------------------
// قالب‌های آماده — فقط انتخاب را پر می‌کنند؛ نقش نیستند و به عضو چسبیده نمی‌مانند
// ---------------------------------------------------------------------------
export type AccessTemplateId = "full" | "executive" | "finance" | "viewer";
export const ACCESS_TEMPLATES: { id: AccessTemplateId; label: string; hint: string; matrix: AccessMatrix }[] = [
  { id: "full", label: "مدیریت کامل", hint: "مدیریت همه‌ی بخش‌ها، از جمله دسترسی اعضا و تنظیمات.", matrix: fill("manage") },
  {
    id: "executive",
    label: "اجرایی (عضو تیم)",
    hint: "ویرایش تسک‌ها، مشکلات، درخواست‌ها، جلسات، اسناد، گفتگو، ثبت زمان و هزینه؛ بقیه مشاهده.",
    matrix: fill("read", { tasks: "write", issues: "write", intake: "write", meetings: "write", communication: "write", documents: "write", time: "write", budget: "write", settings: "none" }),
  },
  {
    id: "finance",
    label: "مالی",
    hint: "ویرایش بودجه، هزینه‌ها و گزارش‌ها؛ مشاهده‌ی برنامه، زمان و تاریخچه.",
    matrix: fill("none", { budget: "write", reports: "write", time: "read", workload: "read", tasks: "read", milestones: "read", gantt: "read", meetings: "read", documents: "read", decisions: "read", history: "read" }),
  },
  { id: "viewer", label: "فقط مشاهده", hint: "مشاهده‌ی بخش‌های اصلی (مثلاً کارفرما یا ناظر بیرونی)؛ تنظیمات و اعلان‌ها پنهان.", matrix: fill("read", { settings: "none", notifications: "none" }) },
];
export const templateById = Object.fromEntries(ACCESS_TEMPLATES.map((t) => [t.id, t])) as Record<AccessTemplateId, (typeof ACCESS_TEMPLATES)[number]>;

/** دسترسی اولیه‌ی عضو تازه (معادل نمای کلی): مشاهده‌ی وظایف، مایل‌ستون‌ها و جلسات */
export const DEFAULT_NEW_MEMBER_ACCESS: AccessMap = { tasks: "read", milestones: "read", meetings: "read" };

/**
 * دسترسی عضو تازه بر اساس «دسترسی عضو تازه» در پیش‌فرض‌های پروژه (تنظیمات سامانه):
 * «overview» یا مقدار ناشناخته ← نمای کلی؛ در غیر این صورت ماتریس قالب آماده.
 * (خالص؛ خواندن تنظیم با فراخواننده است: projectDefaultsStore.get().memberAccess)
 */
export function newMemberAccess(template?: AccessTemplateId | "overview"): AccessMap {
  if (!template || template === "overview" || !templateById[template]) return { ...DEFAULT_NEW_MEMBER_ACCESS };
  return compactMap(templateById[template].matrix);
}

// ---------------------------------------------------------------------------
// سازگاری با مدل قدیمی (نقش = پیش‌فرض + بازنویسی‌ها) — فقط برای مهاجرت یک‌باره
// ---------------------------------------------------------------------------
const LEGACY_ROLE_PRESETS: Record<ProjectRole, AccessMatrix> = {
  مالک: fill("manage"),
  "مدیر پروژه": fill("manage"),
  "مدیر سیستم": fill("write", { budget: "read", workload: "read", flow: "read", history: "read", team: "write", settings: "manage" }),
  عضو: templateById.executive.matrix,
  مشاهده‌گر: fill("read", { time: "read", settings: "none", notifications: "none", team: "read" }),
};

/** ماتریس به سبک قدیمی: پیش‌فرض نقش + بازنویسی‌های ذخیره‌شده */
function legacyMatrix(m: Pick<PMMember, "role" | "access">): AccessMatrix {
  const out = { ...(LEGACY_ROLE_PRESETS[m.role] ?? LEGACY_ROLE_PRESETS["عضو"]) };
  Object.entries(m.access ?? {}).forEach(([k, v]) => {
    if (k in out && v) out[k as ResourceId] = clamp(k as ResourceId, v);
  });
  return out;
}

export const isOwner = (m: Pick<PMMember, "role">) => m.role === "مالک";

/**
 * نقشه‌ی صریح یک عضو برای ذخیره (مهاجرت تحمل‌پذیر، بدون از دست رفتن داده):
 * مالک و مدیر پروژه (meta.manager) ← مدیریت کامل؛ عضو با نقشه‌ی صریح ← همان؛
 * عضو قدیمی ← پیش‌فرض نقش قبلی + بازنویسی‌هایش (رفتار فعلی حفظ می‌شود).
 */
export function materializeAccess(m: Pick<PMMember, "name" | "role" | "access" | "accessExplicit">, managerName?: string): AccessMap {
  if (isOwner(m) || (managerName && m.name === managerName && !m.accessExplicit)) return compactMap(fullMatrix());
  if (m.accessExplicit) return compactMap(toMatrix(m.access));
  return compactMap(legacyMatrix(m));
}

/** نقشه‌ی دسترسی برای عضوی که با «نقش» قدیمی ساخته می‌شود (ایجاد پروژه) */
export const accessForLegacyRole = (role: ProjectRole): AccessMap => compactMap(LEGACY_ROLE_PRESETS[role] ?? LEGACY_ROLE_PRESETS["عضو"]);

// ---------------------------------------------------------------------------
// دسترسی مؤثر
// ---------------------------------------------------------------------------
/** دسترسی مؤثر یک عضو = نقشه‌ی صریح او (مالک همیشه کامل؛ داده‌ی مهاجرت‌نشده به روش قدیم خوانده می‌شود) */
export function effectiveMatrix(m: Pick<PMMember, "role" | "access" | "accessExplicit">): AccessMatrix {
  if (isOwner(m)) return fullMatrix();
  if (m.accessExplicit) return toMatrix(m.access);
  return legacyMatrix(m);
}

export const effectiveLevel = (m: Pick<PMMember, "role" | "access" | "accessExplicit">, res: ResourceId) => effectiveMatrix(m)[res];

export const atLeast = (have: AccessLevel, need: AccessLevel) => LEVEL_RANK[have] >= LEVEL_RANK[need];

export const countReadable = (mx: AccessMatrix) => RESOURCES.filter((r) => mx[r.id] !== "none").length;
export const countWritable = (mx: AccessMatrix) => RESOURCES.filter((r) => atLeast(mx[r.id], "write")).length;

/** «فقط مشاهده» = هیچ بخشی با سطح ویرایش یا بالاتر ندارد (جایگزین نقش قدیمی «مشاهده‌گر») */
export const isViewOnly = (mx: AccessMatrix) => countWritable(mx) === 0;
/** عضو در کار پروژه مشارکت دارد (ثبت زمان، بار کاری، اعلان‌های تیم…) */
export const isContributor = (m: Pick<PMMember, "role" | "access" | "accessExplicit">) => !isViewOnly(effectiveMatrix(m));

/** تغییرات بین دو ماتریس — برای ثبت در تاریخچه */
export function diffMatrix(before: AccessMatrix, after: AccessMatrix): { res: ResourceId; from: AccessLevel; to: AccessLevel }[] {
  return RESOURCES.filter((r) => before[r.id] !== after[r.id]).map((r) => ({ res: r.id, from: before[r.id], to: after[r.id] }));
}

/** متن خلاصه‌ی تغییرات برای تاریخچه و اعلان */
export function describeDiff(changes: { res: ResourceId; from: AccessLevel; to: AccessLevel }[]): string {
  if (!changes.length) return "";
  const word = (c: { from: AccessLevel; to: AccessLevel }) => (c.from === "none" ? `افزوده شد (${levelLabel[c.to]})` : c.to === "none" ? "حذف شد" : `${levelLabel[c.from]} ← ${levelLabel[c.to]}`);
  const parts = changes.slice(0, 4).map((c) => `«${resourceById[c.res].label}» ${word(c)}`);
  return parts.join("، ") + (changes.length > 4 ? ` و ${(changes.length - 4).toLocaleString("fa-IR")} تغییر دیگر` : "");
}

// ---------------------------------------------------------------------------
// چه کسی چه چیزی را می‌تواند تغییر دهد
// ---------------------------------------------------------------------------
export type Editor = {
  /** مالک پروژه است */
  isOwner: boolean;
  /** مدیر پروژه است (meta.manager) */
  isManager: boolean;
  /** ماتریس مؤثر ویرایشگر */
  matrix: AccessMatrix;
  /** مجوز سراسری مدیریت اعضای پروژه (projects.members) */
  globalAdmin: boolean;
  name: string;
};

/** چه کسی می‌تواند دسترسی‌های اعضا را ویرایش کند */
export function canManageAccess(ed: Editor): boolean {
  return ed.globalAdmin || ed.isOwner || ed.isManager || ed.matrix.team === "manage";
}

/** آیا ویرایشگر می‌تواند دسترسی این عضو را تغییر دهد؟ */
export function checkEditMember(ed: Editor, target: PMMember, managerName?: string): { ok: true } | { ok: false; reason: string } {
  if (isOwner(target)) return { ok: false, reason: "مالک دسترسی کامل و ثابت دارد." };
  if (!canManageAccess(ed)) return { ok: false, reason: "فقط مالک، مدیر پروژه یا دارنده‌ی «مدیریت» تیم و دسترسی می‌تواند دسترسی‌ها را تغییر دهد." };
  if (target.name === ed.name) return { ok: false, reason: "دسترسی خودتان را نمی‌توانید تغییر دهید." };
  if (managerName && target.name === managerName && !ed.isOwner && !ed.globalAdmin) return { ok: false, reason: "دسترسی مدیر پروژه را فقط مالک یا مدیر سراسری تغییر می‌دهد." };
  return { ok: true };
}

/** بالاترین سطحی که ویرایشگر می‌تواند برای یک بخش اعطا کند (بدون ارتقای فراتر از سطح خودش) */
export function maxGrantable(ed: Editor, res: ResourceId): AccessLevel {
  if (ed.globalAdmin || ed.isOwner) return resourceById[res].max;
  return clamp(res, ed.matrix[res] ?? "none");
}

/** دلیل غیرفعال‌بودن یک سطح برای یک بخش (یا null اگر مجاز است) */
export function levelBlockReason(ed: Editor, res: ResourceId, level: AccessLevel): string | null {
  if (LEVEL_RANK[level] > LEVEL_RANK[resourceById[res].max]) return `سطح «${levelLabel[level]}» برای این بخش تعریف نشده است`;
  if (LEVEL_RANK[level] > LEVEL_RANK[maxGrantable(ed, res)]) return "بالاتر از سطح دسترسی خود شما";
  return null;
}
