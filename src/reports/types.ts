// ---------------------------------------------------------------------------
// موتور گزارش‌ساز پویا — انواع مشترک
//
// هر «منبع داده» (DataSource) فهرستی از فیلدها دارد و ردیف‌هایش را از یکی از
// استورهای برنامه می‌خواند (با رعایت دامنه‌ی دیدِ کاربر). هر «گزارش» (ReportSpec)
// یک پیکربندیِ قابل ذخیره است: فیلتر ← بازه‌ی زمانی ← گروه‌بندی ← تجمیع ← مرتب‌سازی.
// ---------------------------------------------------------------------------
import type { LucideIcon } from "lucide-react";

export type ReportModule = "projects" | "knowledge" | "social" | "content" | "events" | "members" | "innovation" | "timesheet" | "tickets";

export const moduleLabel: Record<ReportModule, string> = {
  projects: "پروژه‌ها",
  knowledge: "مدیریت دانش",
  social: "شبکه‌ی اجتماعی",
  content: "محتوا",
  events: "رویدادها و جلسات",
  members: "اعضا و دسترسی",
  innovation: "دانش و نوآوری",
  timesheet: "کارکرد و ساعات",
  tickets: "تیکت پشتیبانی",
};

/** نوع مقدار فیلد */
export type FieldKind = "string" | "number" | "date" | "bool";
/** نقش فیلد در گزارش: بُعد (گروه‌بندی)، شاخص (تجمیع عددی) یا تاریخ (بازه و دسته‌بندی زمانی) */
export type FieldType = "dimension" | "measure" | "date";
export type Agg = "count" | "sum" | "avg" | "min" | "max" | "distinct";
export type ValueFormat = "number" | "rial" | "hours" | "percent";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  kind: FieldKind;
  /** تجمیع‌های مجاز (پیش‌فرض: عددی ← sum/avg/min/max، بقیه ← distinct) */
  aggregations?: Agg[];
  /** مقدار آرایه‌ای (مثل برچسب‌ها) — در گروه‌بندی هر عضو جدا شمرده می‌شود */
  multi?: boolean;
  format?: ValueFormat;
  /** ترتیب ثابت مقادیر (مثلاً اولویت‌ها) برای مرتب‌سازی طبیعی */
  order?: string[];
};

export type RowValue = string | number | boolean | string[] | null | undefined;
export type Row = Record<string, RowValue>;

export type DataSource = {
  id: string;
  label: string;
  /** ماژول اصلی */
  module: ReportModule;
  /** ماژول‌های دیگری که این منبع در گزارش‌سازشان هم در دسترس است */
  alsoIn?: ReportModule[];
  icon?: LucideIcon;
  description?: string;
  /** نام هر ردیف برای برچسب «تعداد …» */
  rowNoun: string;
  fields: Field[];
  defaultDateField?: string;
  /**
   * ردیف‌های ایستا (فقط برای منابع بدون استور). منابع زنده از طریق هوک
   * `useSourceRows(sourceId)` خوانده می‌شوند تا ترتیب هوک‌ها ثابت بماند.
   */
  rows?: () => Row[];
  /** منبعی که استورش هنوز ساخته نشده — «به‌زودی» */
  placeholder?: boolean;
  /** پیوند هر ردیف به رکورد اصلی (برای drill-down)؛ اگر نباشد از پیوندهای پیش‌فرض منبع استفاده می‌شود */
  link?: (row: Row) => string | undefined;
};

export type MeasureSpec = { id: string; field: string; agg: Agg; label?: string };

export type FilterOp = "eq" | "neq" | "in" | "contains" | "gt" | "lt" | "between" | "isEmpty" | "notEmpty";
export type FilterValue = string | number | boolean | string[] | [string, string] | null;
export type FilterSpec = { id: string; field: string; op: FilterOp; value: FilterValue };

export type DatePreset = "all" | "thisWeek" | "thisMonth" | "payroll" | "last30" | "last90" | "quarter" | "year" | "custom";
export type DateRange = { preset: DatePreset; from?: string; to?: string };
export type DateBucket = "day" | "week" | "month";

export type ChartType = "table" | "bar" | "stackedBar" | "line" | "pie" | "donut" | "kpi" | "pivot";

/** "label" = بر اساس برچسب/ترتیب طبیعی، یا شناسه‌ی یک شاخص */
export type SortSpec = { by: string; dir: "asc" | "desc" };

export type ReportSpec = {
  id: string;
  name: string;
  description?: string;
  module: ReportModule;
  sourceId: string;
  /** ۰ تا ۲ بُعد: «گروه‌بندی بر اساس» و «تفکیک بر اساس» */
  dimensions: string[];
  measures: MeasureSpec[];
  filters: FilterSpec[];
  dateField?: string;
  dateRange: DateRange;
  bucket: DateBucket;
  sort: SortSpec;
  /** فقط N گروه برتر (۰ = همه) */
  limit: number;
  /** جمع بقیه در ردیف «سایر» */
  others?: boolean;
  chart: ChartType;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
  /** واحد سازمانی (کانتکست) هنگام ساخت */
  scope: string;
  /** private = فقط سازنده، scope = همه‌ی اعضای واحد و زیرمجموعه‌ها */
  shared: "private" | "scope";
  /** نمایش در داشبورد */
  pinned: boolean;
};

/** قالب آماده — پیکربندی بدون مالک */
export type ReportPreset = Omit<ReportSpec, "id" | "createdBy" | "createdByName" | "createdAt" | "updatedAt" | "scope" | "shared" | "pinned"> & { presetId: string };

export const chartLabel: Record<ChartType, string> = {
  table: "جدول",
  bar: "میله‌ای",
  stackedBar: "میله‌ای انباشته",
  line: "روند (خطی)",
  pie: "دایره‌ای",
  donut: "حلقه‌ای",
  kpi: "کارت شاخص",
  pivot: "جدول متقاطع",
};

export const aggLabel: Record<Agg, string> = {
  count: "تعداد",
  sum: "جمع",
  avg: "میانگین",
  min: "کمینه",
  max: "بیشینه",
  distinct: "تعداد یکتای",
};

export const opLabel: Record<FilterOp, string> = {
  eq: "برابر با",
  neq: "مخالف",
  in: "یکی از",
  contains: "شامل",
  gt: "بیشتر از",
  lt: "کمتر از",
  between: "بین",
  isEmpty: "خالی باشد",
  notEmpty: "خالی نباشد",
};

export const presetLabel: Record<DatePreset, string> = {
  all: "همه‌ی زمان‌ها",
  thisWeek: "این هفته",
  thisMonth: "این ماه",
  payroll: "دوره‌ی کارکرد",
  last30: "۳۰ روز اخیر",
  last90: "۹۰ روز اخیر",
  quarter: "این فصل",
  year: "امسال",
  custom: "بازه‌ی دلخواه",
};

export const bucketLabel: Record<DateBucket, string> = { day: "روزانه", week: "هفتگی", month: "ماهانه" };

export const COUNT_FIELD = "__count";

export const PALETTE = ["#1f4f99", "#059669", "#dc2626", "#d97706", "#7c3aed", "#0d9488", "#db2777", "#0f172a"];

// ----------------------------------------------------------------- زمان‌بندی ارسال

export type ScheduleFreq = "daily" | "weekly" | "monthly" | "payroll";
export const freqLabel: Record<ScheduleFreq, string> = { daily: "روزانه", weekly: "هفتگی (شنبه‌ها)", monthly: "ماهانه (اول ماه)", payroll: "پایان دوره‌ی کارکرد (۲۵ هر ماه)" };
export type ScheduleChannel = "inapp" | "email";
export const channelLabel: Record<ScheduleChannel, string> = { inapp: "اعلان درون‌برنامه", email: "ایمیل (شبیه‌سازی)" };

export type ReportSchedule = {
  id: string;
  reportId: string;
  freq: ScheduleFreq;
  /** شناسه‌ی کاربران گیرنده */
  recipients: string[];
  channels: ScheduleChannel[];
  active: boolean;
  createdBy: string;
  createdAt: string;
  /** کلید آخرین دوره‌ای که ارسال شد (جلوگیری از ارسال تکراری) */
  lastPeriod?: string;
  lastSentAt?: string;
};

export type ScheduleDelivery = { id: string; scheduleId: string; reportId: string; reportName: string; period: string; periodLabel: string; at: string; recipients: string[]; channels: ScheduleChannel[] };

/** فیلتر سراسری داشبورد که روی گزارش‌های سنجاق‌شده اعمال می‌شود */
export type GlobalFilter = { range: DateRange; project?: string; person?: string };
