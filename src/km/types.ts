// ---------------------------------------------------------------------------
// مدل داده‌ی ماژول مدیریت دانش — بر اساس «شرح جامع نیازمندی‌های ماژول مدیریت دانش سازمان»
// ---------------------------------------------------------------------------
import type { Scoped } from "../data/tenancy";

/** بند ۸: سطوح دسترسی */
export type AccessLevel = "عمومی" | "داخلی" | "محرمانه" | "خیلی محرمانه";
export const accessLevels: AccessLevel[] = ["عمومی", "داخلی", "محرمانه", "خیلی محرمانه"];

/** بند ۹: گردش کار سند */
export type DocStatus = "پیش‌نویس" | "در بررسی" | "ارجاع برای اصلاح" | "تأییدشده" | "منتشرشده" | "آرشیو";
export const docStatuses: DocStatus[] = ["پیش‌نویس", "در بررسی", "ارجاع برای اصلاح", "تأییدشده", "منتشرشده", "آرشیو"];

export type KFile = {
  id: string;
  name: string;
  size: string;
  ext: string;
  /** متن استخراج‌شده از فایل (نمایه‌ی تمام‌متن). صفحه‌ها با \f از هم جدا می‌شوند. */
  text?: string;
  /** تعداد صفحه/بخش برای پیش‌نمایش */
  pages?: number;
};
/** body = متن مقاله (Markdown) در همان نسخه؛ برای مقایسه‌ی متنی نسخه‌ها */
export type KVersion = { version: number; date: string; by: string; note: string; files: KFile[]; body?: string };
export type KWorkflowStep = { id: string; action: string; from: DocStatus; to: DocStatus; by: string; at: string; note?: string };
export type KComment = { id: string; author: string; text: string; at: string; kind: "نظر" | "پیشنهاد اصلاح" | "پرسش" | "پاسخ"; replyTo?: string };
export type KFeedback = { by: string; helpful: boolean; reason?: string };
export type RelationType = "doc" | "process" | "registry" | "expert" | "project" | "lesson" | "glossary";
export type KRelation = { type: RelationType; id: string };

// ------------------------------------------------------------- بند ۸: فهرست کنترل دسترسی (ACL)
/** user = شناسه‌ی کاربر · scope = هلدینگ/شرکت/واحد IAM (با زیرمجموعه) · role = نقش IAM · title = سمت (عنوان عضویت) */
export type AclKind = "user" | "scope" | "role" | "title";
export type KAclEntry = { kind: AclKind; id: string; /** اجازه‌ی دانلود علاوه بر مشاهده */ download: boolean };
export type KAcl = {
  /** خالی = فقط قاعده‌ی سطح دسترسی؛ پر = سطح دسترسی «و» یکی از این ردیف‌ها */
  entries: KAclEntry[];
  /** «فقط مشاهده»: دانلود برای همه به‌جز مالک بسته است */
  viewOnly: boolean;
};
export const aclKindLabel: Record<AclKind, string> = { user: "کاربر", scope: "واحد سازمانی", role: "نقش", title: "سمت" };

// ------------------------------------------------------------- بند ۹: گردش کار چندمرحله‌ای
export type WfStepKind = "review" | "approve" | "publish";
export const wfStepKindLabel: Record<WfStepKind, string> = { review: "بررسی", approve: "تأیید", publish: "انتشار" };
/** user = نام کاربر · role = شناسه‌ی نقش IAM · scopeManager = مدیرِ واحد/شرکت/هلدینگِ سند · owner = مالک سند */
export type WfApprover = { kind: "user" | "role" | "scopeManager" | "owner"; id?: string };
export type KWfStep = { id: string; name: string; kind: WfStepKind; approver: WfApprover; slaDays: number; /** جانشین ثابت این مرحله (نام کاربر) */ substitute?: string };
export type KWfTemplate = { id: string; name: string; /** نام نوع‌های سند؛ خالی = قالب پیش‌فرض */ docTypes: string[]; steps: KWfStep[] };
export type KFlowEvent = { stepId: string; stepName: string; by: string; decision: "submit" | "approve" | "return" | "publish" | "remind" | "escalate"; at: string; note?: string; onBehalfOf?: string };
/** وضعیت سند در گردش کار قالب‌دار */
export type KDocFlow = { templateId: string; stepIdx: number; /** تاریخ شروع مرحله‌ی جاری (برای SLA) */ stepStartedAt: string; history: KFlowEvent[] };
export type KDelegation = { id: string; from: string; to: string; until: string; note?: string };

export type KDoc = {
  id: string;
  title: string;
  code: string;
  type: string;
  categoryId: string;
  tags: string[];
  unit: string;
  owner: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  status: DocStatus;
  access: AccessLevel;
  description: string;
  files: KFile[];
  reviewDate: string;
  versions: KVersion[];
  workflow: KWorkflowStep[];
  approvers: string[];
  relations: KRelation[];
  views: number;
  downloads: number;
  ratings: { by: string; score: number }[];
  feedback: KFeedback[];
  comments: KComment[];
  followers: string[];
  archiveReason?: string;
  /** اهمیت (بند ۱۴) */
  importance: "عادی" | "مهم" | "حیاتی";
  reported?: { by: string; reason: string; at: string }[];
  /** «file» = سند فایل‌محور (پیش‌فرض) · «article» = مقاله‌ی نوشته‌شده در سامانه */
  format?: "file" | "article";
  /** متن مقاله (Markdown) */
  body?: string;
  /** بند ۸: فهرست کنترل دسترسی */
  acl?: KAcl;
  /** بند ۹: گردش کار قالب‌دار */
  flow?: KDocFlow;
  /** بخشنامه/دستورالعمل/آیین‌نامه: مخاطبان، مهلت و «خواندم و پذیرفتم» */
  circular?: KCircular | null;
  /** نگهداشت قانونی: مانع حذف و امحا */
  legalHold?: KLegalHold | null;
} & Scoped;

/** مخاطب ابلاغ: واحد سازمانی (با زیرمجموعه) یا نقش IAM */
export type KAudienceEntry = { kind: "scope" | "role"; id: string };
export type KCircular = {
  /** خالی = همه‌ی کسانی که سند را می‌بینند */
  audience: KAudienceEntry[];
  /** مهلت تأیید خواندن (شمسی) */
  deadline: string | null;
  /** نام کاربر ← زمان «خواندم و پذیرفتم» */
  acks: Record<string, string>;
  lastReminderAt?: string | null;
};
export type KLegalHold = { by: string; at: string; reason: string };
/** گواهی امحا (سند حذف‌شده طبق جدول نگهداشت) */
export type KDisposal = { id: string; docId: string; code: string; title: string; type: string; at: string; by: string; note: string; retentionYears: number; basis: string };

/** فرآیند تصمیم‌دار: گام (با مسیر بله/خیر برای تصمیم) در یک «خط شنا» (نقش) */
export type ProcStepKind = "start" | "task" | "decision" | "end";
export type ProcStep = { id: string; label: string; kind: ProcStepKind; lane: string; next?: string | null; yes?: string | null; no?: string | null };
export type RaciCode = "R" | "A" | "C" | "I";

export type KCategory = { id: string; name: string; parentId?: string };
export type KDocType = { id: string; name: string; color: string };

/** بند ۳: شناسنامه‌ها — انواع قابل تعریف با فیلد اختصاصی */
export type FieldKind = "text" | "number" | "date" | "select" | "textarea";
export type RegistryField = { key: string; label: string; kind: FieldKind; options?: string[] };
export type RegistryType = { id: string; name: string; description: string; fields: RegistryField[]; builtin?: boolean };
export type RegistryItem = {
  id: string;
  typeId: string;
  title: string;
  owner: string;
  unit: string;
  updatedAt: string;
  values: Record<string, string>;
  description: string;
  files: KFile[];
  relations: KRelation[];
};

/** سندهای فرصت‌های تحقیق و توسعه */
export type RndDoc = {
  id: string;
  company: string;
  holding: string;
  progress: number;
  statusLabel: string;
  obstacles?: string;
  lead: string;
  startDate: string;
  topics: string[];
  files: KFile[];
  notes: string;
  history: { at: string; by: string; text: string }[];
};

/** بند ۴: فرآیندها */
export type ProcessKind = "اصلی" | "پشتیبان" | "مدیریتی";
export type KProcess = {
  id: string;
  name: string;
  code: string;
  kind: ProcessKind;
  owner: string;
  unit: string;
  description: string;
  inputs: string[];
  outputs: string[];
  steps: string[];
  relations: KRelation[];
  /** نمودار تصمیم‌دار با خطوط شنا (نقش‌ها) — اگر نباشد از «گام‌ها» ساخته می‌شود */
  flow?: ProcStep[];
  lanes?: string[];
  /** ماتریس RACI: شناسه‌ی گام ← نقش ← R/A/C/I */
  raci?: Record<string, Record<string, RaciCode>>;
};

/** بند ۵ و ۲۱: دانش، تجربیات و درس‌آموخته‌ها */
export type ExperienceKind = "تجربه موفق" | "تجربه ناموفق" | "درس‌آموخته" | "Best Practice" | "نکته تخصصی" | "راهکار حل مشکل" | "پرسش و پاسخ";
export const experienceKinds: ExperienceKind[] = ["تجربه موفق", "تجربه ناموفق", "درس‌آموخته", "Best Practice", "نکته تخصصی", "راهکار حل مشکل", "پرسش و پاسخ"];
export type Experience = {
  id: string;
  kind: ExperienceKind;
  title: string;
  body: string;
  author: string;
  unit: string;
  tags: string[];
  status: "پیش‌نویس" | "در بررسی" | "منتشرشده";
  date: string;
  /** بند ۲۱ — فقط برای درس‌آموخته */
  problem?: string;
  cause?: string;
  action?: string;
  result?: string;
  future?: string;
  projectId?: string;
  processId?: string;
  relations: KRelation[];
  helpful: number;
  comments: KComment[];
};

/** بند ۶: خبرگان */
export type Expert = {
  id: string;
  name: string;
  unit: string;
  title: string;
  areas: string[];
  experience: string;
  topics: string[];
  relations: KRelation[];
  userId?: string;
};

/** بند ۲۲: واژه‌نامه */
export type GlossaryTerm = { id: string; term: string; abbr?: string; english?: string; definition: string; unit: string; relations: KRelation[] };

/** کد اقدام برای فیلتر لاگ ممیزی (بند ۸ و ۱۱) */
export type KLogCode = "view" | "preview" | "download" | "create" | "edit" | "delete" | "version" | "workflow" | "archive" | "restore" | "access" | "feedback" | "comment" | "settings" | "retention" | "other";
export const logCodeLabel: Record<KLogCode, string> = {
  view: "مشاهده",
  preview: "پیش‌نمایش فایل",
  download: "دانلود",
  create: "ایجاد",
  edit: "ویرایش",
  delete: "حذف",
  version: "نسخه‌ی جدید",
  workflow: "گردش کار",
  archive: "آرشیو",
  restore: "بازیابی",
  access: "تغییر دسترسی",
  feedback: "بازخورد",
  comment: "نظر",
  settings: "تنظیمات",
  retention: "نگهداشت و امحا",
  other: "سایر",
};
export type KLog = { id: string; at: string; seq: number; actor: string; action: string; entity: { type: string; id: string; title: string }; code?: KLogCode; detail?: string; access?: AccessLevel };

/** بند ۷: جستجوی ذخیره‌شده */
export type KSearchFilters = { kinds: string[]; types: string[]; units: string[]; statuses: string[]; access: string[]; tags: string[]; inContent: boolean };
export type KSavedSearch = { id: string; owner: string; name: string; query: string; filters: KSearchFilters; notify: boolean; createdAt: string };

/** ماتریس سطح دسترسی: دانلود مجاز است؟ واترمارک روی پیش‌نمایش؟ */
export type AccessPolicy = { download: boolean; watermark: boolean };

export type KSettings = {
  units: string[];
  tags: string[];
  /** مراحل فعال گردش کار */
  workflowSteps: { review: boolean; approve: boolean; publish: boolean };
  defaultApprovers: string[];
  reviewPeriodDays: number;
  /** حوزه‌های مورد علاقه‌ی هر کاربر (برای اعلان دانش جدید) */
  interests: Record<string, string[]>;
  /** بند ۹: قالب‌های گردش کار به تفکیک نوع سند */
  workflows?: KWfTemplate[];
  /** جانشینی تأییدکنندگان */
  delegations?: KDelegation[];
  /** بند ۸: سیاست مشاهده/دانلود هر سطح */
  accessPolicy?: Record<AccessLevel, AccessPolicy>;
  /** دوره‌ی نگهداشت هر نوع سند (سال، از تاریخ آرشیو) — ۰ = نگهداری دائم */
  retention?: Record<string, number>;
  /** قالب مقاله‌ی هر نوع سند (Markdown) — جایگزین قالب پیش‌فرض */
  docTemplates?: Record<string, string>;
};
