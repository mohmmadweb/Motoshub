// ---------------------------------------------------------------------------
// «دبیرخانه و مشتریان» — مدل داده (DATA_ALIGNMENT §10).
// هیچ‌کدام از این ماژول‌ها در بک‌اند فعلی نیستند؛ همه‌ی منابع «پیشنهادی»اند و زیر
// `/api/v1/workspace/{secretariat,crm}/…` با پاکت workspace (`{data, links, meta}`) تعریف شده‌اند.
// الگو: `<Entity>Api` = شکل پیشنهادی سریالایزر · `<Entity>Proposed` = فیلدهای فقط-دمو.
// شناسه‌ها int64؛ ارجاع به افراد با principal_id (UUID) مثل بقیه‌ی workspace.
// تاریخ‌ها جلالی با ارقام لاتین («1405/03/08» و «1405/03/08 09:30»)؛ ارقام فارسی فقط هنگام نمایش.
// ---------------------------------------------------------------------------

/** principal_id (UUID) کاربر در identity */
export type PrincipalId = string;

/** پیوست (فقط فراداده؛ فایل واقعی در file-manager) */
export type AttachmentApi = { id: number; name: string; size: number; mime: string };

/** پیوند عمومی به یک پرونده (MATRIX §30: نامه ↔ یک یا چند پرونده‌ی مشتری) */
export type CaseLinkApi = { type: "customer_file" | "project"; id: number };

// ============================================================== دبیرخانه

export type LetterPartyRole = "to" | "cc";
export const partyRoleLabel: Record<LetterPartyRole, string> = { to: "گیرنده", cc: "رونوشت" };

export type LetterPartyApi = {
  principal_id: PrincipalId;
  role: LetterPartyRole;
  /** زمان مشاهده (رسید خواندن هر گیرنده)؛ null = خوانده‌نشده */
  seen_at: string | null;
};
/** «پیشنهادی» — گیرنده‌ای که با ارجاع اضافه شده */
export type LetterPartyProposed = { via_referral?: number | null };
export type LetterParty = LetterPartyApi & LetterPartyProposed;

/** نوع نامه: داخلی، وارده (از بیرون سازمان)، صادره (به بیرون سازمان) */
export type LetterKind = "internal" | "incoming" | "outgoing";
export const letterKindLabel: Record<LetterKind, string> = { internal: "داخلی", incoming: "وارده", outgoing: "صادره" };

/** `secretariat/letters/` */
export type LetterApi = {
  id: number;
  subject: string;
  body: string;
  sender_id: PrincipalId;
  parties: LetterParty[];
  labels: string[];
  attachments: AttachmentApi[];
  /** کار مرتبط (Task.id در workspace) */
  related_task: number | null;
  case_links: CaseLinkApi[];
  /** بایگانی سراسری (به‌جای حذف نامه‌ی شماره‌خورده) */
  archived: boolean;
  created_at: string;
};
/** «پیشنهادی» */
export type LetterProposed = {
  kind: LetterKind;
  /** بایگانیِ شخصی هر کاربر (صندوق «بایگانی») */
  archived_by: PrincipalId[];
  /** عنوان کار مرتبط وقتی شناسه هنوز معلوم نیست */
  related_task_title?: string;
};
export type Letter = LetterApi & LetterProposed;

/** `secretariat/letters/{id}/paraphs/` — پاراف (هامش) و پاسخ به پاراف */
export type ParaphApi = {
  id: number;
  letter: number;
  author_id: PrincipalId;
  /** پاسخ به پاراف دیگر؛ null = پاسخ به خود نامه */
  parent: number | null;
  text: string;
  attachments: AttachmentApi[];
  created_at: string;
};
export type Paraph = ParaphApi;

/** `secretariat/letters/{id}/referrals/` — ارجاع به افراد دیگر با یادداشت */
export type ReferralApi = {
  id: number;
  letter: number;
  from_id: PrincipalId;
  to_ids: PrincipalId[];
  note: string;
  created_at: string;
};
export type Referral = ReferralApi;

export type RegistrationDirection = "incoming" | "outgoing";
export const directionLabel: Record<RegistrationDirection, string> = { incoming: "وارده", outgoing: "صادره" };

/** `secretariat/letters/{id}/register/` → LetterRegistration؛ پس از ثبت تغییر/حذف نمی‌شود */
export type LetterRegistrationApi = {
  letter: number;
  direction: RegistrationDirection;
  series: number;
  /** شماره‌ی دبیرخانه: پیشوند/سال جلالی/شمارنده (مثل «ص/1405/0001») — یکتا در هر سری */
  number: string;
  registered_at: string;
  /** شماره و تاریخ نامه‌ی طرف بیرونی (وارده) */
  external_number: string;
  external_date: string;
  /** سازمان فرستنده (وارده) یا گیرنده (صادره) */
  external_org: string;
};
/** «پیشنهادی» */
export type LetterRegistrationProposed = { registered_by: PrincipalId; counter: number; reference_year: number };
export type LetterRegistration = LetterRegistrationApi & LetterRegistrationProposed;

/** `secretariat/number-series/` — الگوی FundReferenceSequence(prefix, reference_year, last_value) */
export type NumberSeriesApi = {
  id: number;
  scope_id: string;
  title: string;
  prefix: string;
  use_jalali_year: boolean;
  /** آخرین شمارنده‌ی صادرشده (last_value) */
  counter: number;
  suffix: string;
  reset_yearly: boolean;
};
/** «پیشنهادی» */
export type NumberSeriesProposed = {
  direction: RegistrationDirection;
  /** شماره‌ی شروع (مثلاً عمومی از ۲۰۰۰، محرمانه از ۱۵۰۰) */
  start_number: number;
  /** سالی که counter به آن تعلق دارد (reference_year) */
  reference_year: number;
  /** طول صفرپرکردن شمارنده */
  pad: number;
  active: boolean;
};
export type NumberSeries = NumberSeriesApi & NumberSeriesProposed;

// ============================================================== پرونده مشتریان

export type PartyType = "person" | "company";
export const partyTypeLabel: Record<PartyType, string> = { person: "حقیقی", company: "حقوقی" };

export type PhoneApi = { label: string; number: string };
export const phoneLabels = ["موبایل", "تلفن ثابت", "دفتر مرکزی", "فکس", "شماره‌ی پشتیبان"] as const;

/** `crm/customers/` */
export type CustomerFileApi = {
  id: number;
  party_type: PartyType;
  /** حقیقی: نام و نام خانوادگی · حقوقی: نام ثبتی */
  name: string;
  trade_name: string;
  /** حقیقی: کد ملی · حقوقی: شناسه‌ی ملی */
  national_id: string;
  economic_code: string;
  phones: PhoneApi[];
  email: string;
  website: string;
  address: string;
  postal_code: string;
  labels: string[];
  /** «قابل مشاهده برای…» */
  access: PrincipalId[];
  owner_id: PrincipalId;
  created_at: string;
};
/** «پیشنهادی» */
export type CustomerFileProposed = { description: string; created_by: PrincipalId };
export type CustomerFile = CustomerFileApi & CustomerFileProposed;

/** `crm/customers/{id}/contacts/` — نمایندگان */
export type CustomerContactApi = { id: number; customer: number; name: string; position: string; email: string; mobile: string; phone: string };
export type CustomerContact = CustomerContactApi;

/** نوع رویداد فعالیت پرونده */
export type ActivityKind = "note" | "call_in" | "call_out" | "task" | "minutes" | "file";
export const activityKindLabel: Record<ActivityKind, string> = {
  note: "یادداشت",
  call_in: "تماس ورودی",
  call_out: "تماس خروجی",
  task: "وظیفه",
  minutes: "صورتجلسه",
  file: "فایل",
};

/** `crm/customers/{id}/activities/` */
export type CustomerActivityApi = {
  id: number;
  customer: number;
  kind: ActivityKind;
  text: string;
  author_id: PrincipalId;
  attachments: AttachmentApi[];
  created_at: string;
};
/** «پیشنهادی» — ارجاع به شیء ماژول دیگر (کار/صورتجلسه) برای نمایش در خط زمان */
export type CustomerActivityProposed = { ref?: { type: "task" | "meeting"; id: number | null; title: string; status?: string } };
export type CustomerActivity = CustomerActivityApi & CustomerActivityProposed;

// ============================================================== فرصت فروش

export type OpportunityStatus = "open" | "won" | "lost";
export const opportunityStatusLabel: Record<OpportunityStatus, string> = { open: "باز", won: "موفق", lost: "ناموفق" };

/** `crm/opportunities/` */
export type OpportunityApi = {
  id: number;
  customer: number;
  title: string;
  value_rial: number;
  /** ۰ تا ۱۰۰ */
  probability: number;
  /** مسئول پیگیری */
  owner_id: PrincipalId;
  labels: string[];
  attachments: AttachmentApi[];
  status: OpportunityStatus;
  expected_close_date: string;
  description: string;
};
/** «پیشنهادی» */
export type OpportunityProposed = { created_at: string; created_by: PrincipalId; closed_at: string | null };
export type Opportunity = OpportunityApi & OpportunityProposed;

// ============================================================== اسناد مالی

export type FinanceDirection = "receipt" | "payment";
export const financeDirectionLabel: Record<FinanceDirection, string> = { receipt: "دریافت", payment: "پرداخت" };
export type FinanceForm = "cash" | "cheque" | "probable";
export const financeFormLabel: Record<FinanceForm, string> = { cash: "نقدی", cheque: "چک", probable: "احتمالی" };
export type FinanceStatus = "active" | "cancelled";
/** نوع ابطال (MZ: «ابطال پرداخت») */
export type CancelType = "payment_void" | "cheque_returned" | "other";
export const cancelTypeLabel: Record<CancelType, string> = { payment_void: "ابطال پرداخت", cheque_returned: "برگشت چک", other: "سایر" };

/** `crm/finance-documents/` */
export type FinancialDocumentApi = {
  id: number;
  customer: number;
  direction: FinanceDirection;
  form: FinanceForm;
  amount_rial: number;
  date: string;
  /** سررسید چک / تاریخ مورد انتظار سند احتمالی */
  due_date: string | null;
  is_cashed: boolean;
  status: FinanceStatus;
  cancel_type: CancelType | null;
  description: string;
  labels: string[];
  attachments: AttachmentApi[];
  cheque?: { number: string; bank: string; sayad_id: string };
  created_by: PrincipalId;
};
/** «پیشنهادی» */
export type FinancialDocumentProposed = { created_at: string; cancel_note?: string; cancelled_at?: string | null };
export type FinancialDocument = FinancialDocumentApi & FinancialDocumentProposed;

/** دسته‌ی مشتق برای مانیتورینگ (DATA_ALIGNMENT §10) */
export type FinanceBucket = "definite_in" | "definite_out" | "probable_in" | "probable_out" | "overdue" | "cancelled";
export const bucketLabel: Record<FinanceBucket, string> = {
  definite_in: "دریافت قطعی",
  definite_out: "پرداخت قطعی",
  probable_in: "دریافت احتمالی",
  probable_out: "پرداخت احتمالی",
  overdue: "معوقه",
  cancelled: "ابطال‌شده",
};

// ============================================================== برچسب‌ها

/** فضای نام برچسب‌ها — برچسب مالی جدا از بقیه (الگوی میزیتو) */
export type LabelNamespace = "crm" | "sales" | "finance" | "letter";
export const labelNamespaceLabel: Record<LabelNamespace, string> = { crm: "پرونده‌ی مشتری", sales: "فرصت فروش", finance: "اسناد مالی", letter: "نامه" };
export type LabelTone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";
/** «پیشنهادی» `crm/labels/` و `secretariat/labels/` */
export type OfficeLabel = { id: number; namespace: LabelNamespace; title: string; tone: LabelTone };

// ============================================================== انبار

export type OfficeState = {
  version: number;
  seq: number;
  series: NumberSeries[];
  letters: Letter[];
  paraphs: Paraph[];
  referrals: Referral[];
  registrations: LetterRegistration[];
  customers: CustomerFile[];
  contacts: CustomerContact[];
  activities: CustomerActivity[];
  opportunities: Opportunity[];
  financeDocs: FinancialDocument[];
  labels: OfficeLabel[];
};
