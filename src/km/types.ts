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

export type KFile = { id: string; name: string; size: string; ext: string };
export type KVersion = { version: number; date: string; by: string; note: string; files: KFile[] };
export type KWorkflowStep = { id: string; action: string; from: DocStatus; to: DocStatus; by: string; at: string; note?: string };
export type KComment = { id: string; author: string; text: string; at: string; kind: "نظر" | "پیشنهاد اصلاح" | "پرسش" | "پاسخ"; replyTo?: string };
export type KFeedback = { by: string; helpful: boolean; reason?: string };
export type RelationType = "doc" | "process" | "registry" | "expert" | "project" | "lesson" | "glossary";
export type KRelation = { type: RelationType; id: string };

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
} & Scoped;

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

export type KLog = { id: string; at: string; seq: number; actor: string; action: string; entity: { type: string; id: string; title: string } };

export type KSettings = {
  units: string[];
  tags: string[];
  /** مراحل فعال گردش کار */
  workflowSteps: { review: boolean; approve: boolean; publish: boolean };
  defaultApprovers: string[];
  reviewPeriodDays: number;
  /** حوزه‌های مورد علاقه‌ی هر کاربر (برای اعلان دانش جدید) */
  interests: Record<string, string[]>;
};
