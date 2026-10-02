// ---------------------------------------------------------------------------
// انواع داده‌ی ماژول‌های «دانش و نوآوری» (فرصت پژوهشی، قرارداد، صندوق، جایزه، آموزش)
// + بانک مشترک شرکت‌ها و پژوهشگران، دفتر تصمیمات و نتایج واقعی.
//
// نکته: موتور اعتبارسنجی/امتیازدهی ساخته نمی‌شود. این مدل فقط «داده‌ی تمیز»
// (موجودیت با منشأ داده، تصمیم انسانی با دلیل، نتیجه‌ی واقعی) را نگه می‌دارد
// تا سکوی ارزیابی بعداً از آن تغذیه کند.
// ---------------------------------------------------------------------------
import type { Scoped } from "../data/tenancy";
import type { NfProject } from "../data/mockInnovationFund";
import type { FundRecord } from "../data/mock";

export type InnModule = "research" | "contracts" | "funds" | "award" | "training" | "ecosystem";

export const moduleTitle: Record<InnModule, string> = {
  research: "فرصت‌های پژوهشی",
  contracts: "قراردادهای فناورانه",
  funds: "صندوق نوآوری",
  award: "جایزه نوآوری",
  training: "آموزش",
  ecosystem: "بانک شرکت‌ها و پژوهشگران",
};

export type ILog = {
  id: string;
  seq: number;
  at: string;
  actor: string;
  module: InnModule;
  action: string;
  subject?: { id: string; title: string };
};

// ----------------------------------------------------------- بانک موجودیت‌ها
export type DataSourceKind = "فرم" | "اکسل/CSV" | "API" | "سامانه";
export type Provenance = { source: DataSourceKind; at: string; by: string };
export type FieldChange = { at: string; by: string; field: string; label: string; from: string; to: string; source: DataSourceKind };

export type EntityKind = "company" | "researcher";
export const entityKindLabel: Record<EntityKind, string> = { company: "شرکت دانش‌بنیان", researcher: "پژوهشگر / تیم پژوهشی" };

export const kbTypes = ["دانش‌بنیان نوپا", "دانش‌بنیان تولیدی نوع ۱", "دانش‌بنیان تولیدی نوع ۲", "دانش‌بنیان صنعتی", "شرکت فناور (غیر دانش‌بنیان)"] as const;
export type KbType = (typeof kbTypes)[number];

export type EcoEntity = {
  id: string;
  kind: EntityKind;
  name: string;
  field: string;
  city: string;
  // شرکت
  kbType?: KbType;
  trl?: number;
  capacity?: string;
  employees?: number;
  certificates?: string[];
  nationalId?: string;
  /** پیوند به ساختار سازمانی (هلدینگ/شرکت زیرمجموعه‌ی بنیاد) */
  holdingId?: string;
  companyId?: string;
  // پژوهشگر
  affiliation?: string;
  degree?: string;
  hIndex?: number;
  publications?: number;
  pastProjects?: string[];
  userId?: string;
  scholarUrl?: string;
  /** ارتباط مستقیم با موجودیت‌های دیگر (همکاری پژوهشگر ↔ شرکت) */
  collaborators: string[];
  /** فیلدهای پویای تعریف‌شده توسط مدیر */
  custom: Record<string, string>;
  /** منشأ هر فیلد کلیدی: از کجا، چه زمانی، توسط چه کسی */
  provenance: Record<string, Provenance>;
  history: FieldChange[];
  createdAt: string;
  createdBy: string;
};

export type EcoFieldDef = {
  id: string;
  kind: EntityKind;
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "url";
  options?: string[];
  required?: boolean;
};

/** فیلدهای کلیدی که منشأشان ثبت می‌شود و در «کامل‌بودن پروفایل» شمرده می‌شوند */
export const keyFields: Record<EntityKind, { key: keyof EcoEntity; label: string }[]> = {
  company: [
    { key: "name", label: "نام" },
    { key: "field", label: "حوزه" },
    { key: "city", label: "شهر" },
    { key: "kbType", label: "نوع دانش‌بنیان" },
    { key: "trl", label: "TRL" },
    { key: "capacity", label: "ظرفیت" },
    { key: "employees", label: "تعداد نیرو" },
    { key: "certificates", label: "گواهی‌ها" },
    { key: "holdingId", label: "هلدینگ" },
  ],
  researcher: [
    { key: "name", label: "نام" },
    { key: "field", label: "حوزه" },
    { key: "city", label: "شهر" },
    { key: "affiliation", label: "وابستگی سازمانی" },
    { key: "degree", label: "مرتبه علمی" },
    { key: "hIndex", label: "شاخص h" },
    { key: "publications", label: "تعداد مقاله" },
    { key: "pastProjects", label: "پروژه‌های پیشین" },
  ],
};

// ------------------------------------------------------- تصمیم و نتیجه‌ی واقعی
export type DecisionOption = { id: string; label: string; score?: number; rank: number; entityId?: string };
export type Decision = {
  id: string;
  module: InnModule;
  subjectId: string;
  subjectTitle: string;
  question: string;
  options: DecisionOption[];
  chosenId: string;
  chosenLabel: string;
  /** گزینه‌ی انتخاب‌شده رتبه‌ی اول ارزیابی نبود */
  deviates: boolean;
  reason: string;
  committee?: string;
  decidedBy: string;
  at: string;
};

export type OutcomeDelivery = "کامل" | "بخشی" | "تحویل نشد";
export type OutcomeSchedule = "زودتر" | "به‌موقع" | "تأخیر کم" | "تأخیر زیاد";
export type OutcomeBudget = "زیر بودجه" | "مطابق بودجه" | "فراتر از بودجه";
export type Outcome = {
  id: string;
  module: InnModule;
  subjectId: string;
  subjectTitle: string;
  entityIds: string[];
  successPct: number;
  delivered: OutcomeDelivery;
  schedule: OutcomeSchedule;
  budget: OutcomeBudget;
  quality: number; // ۱ تا ۵
  trlBefore?: number;
  trlAfter?: number;
  outputs: string[];
  notes: string;
  recordedBy: string;
  at: string;
};

// ---------------------------------------------------------------- فرصت پژوهشی
export type RubricItem = { id: string; criterion: string; weight: number };
export type Review = { id: string; reviewer: string; scores: number[]; comment: string; noConflict: boolean; at: string };
export type ApplicationStatus = "ارسال‌شده" | "نقص مدارک" | "در داوری" | "پذیرفته" | "رد شده";
export type Application = {
  id: string;
  name: string;
  affiliation: string;
  entityId?: string;
  proposal: string;
  status: ApplicationStatus;
  submittedAt: string;
  reviews: Review[];
  note?: string;
};

export type CallStage = "پیش‌نویس" | "فراخوان باز" | "بررسی درخواست‌ها" | "داوری" | "در حال اجرا" | "پایان‌یافته";
export const callStages: CallStage[] = ["پیش‌نویس", "فراخوان باز", "بررسی درخواست‌ها", "داوری", "در حال اجرا", "پایان‌یافته"];

export type ResearchCall = {
  id: string;
  title: string;
  field: string;
  stage: CallStage;
  deadline: string;
  budget: number;
  paid: number;
  duration: string;
  supervisor: string;
  description: string;
  outputs: string[];
  rubric: RubricItem[];
  applications: Application[];
  progress?: number;
  createdAt: string;
} & Scoped;

export type RfpStage = "پیش‌نویس" | "انتشار فراخوان" | "دریافت مستندات" | "ارزیابی کسب‌وکاری" | "ارزیابی فنی" | "بازگشایی پاکات" | "فناور برتر انتخاب شد";
export const rfpStages: RfpStage[] = ["پیش‌نویس", "انتشار فراخوان", "دریافت مستندات", "ارزیابی کسب‌وکاری", "ارزیابی فنی", "بازگشایی پاکات", "فناور برتر انتخاب شد"];
export type RfpBid = { id: string; name: string; entityId?: string; bizScore?: number; techScore?: number; price?: number; submittedAt: string };
export type Rfp = {
  id: string;
  title: string;
  companyName: string;
  need: string;
  trlTarget: number;
  deadline: string;
  budget: number;
  channels: string[];
  stage: RfpStage;
  bids: RfpBid[];
  priceOpened: boolean;
  minutes?: string;
  winnerBidId?: string;
  contractId?: string;
  createdAt: string;
} & Scoped;

export type SabbReportStatus = "در انتظار" | "ارسال به صنعت و داور" | "نیازمند اصلاح" | "تایید و پرداخت شد";
export type SabbStage = "فراخوان" | "انتخاب استاد" | "قرارداد" | "در حال اجرا" | "کتابچه و ارائه نهایی" | "خاتمه";
export const sabbStages: SabbStage[] = ["فراخوان", "انتخاب استاد", "قرارداد", "در حال اجرا", "کتابچه و ارائه نهایی", "خاتمه"];
export type SabbaticalX = {
  id: string;
  topic: string;
  industry: string;
  professor?: string;
  university?: string;
  entityId?: string;
  trlBefore: number;
  trlAfter?: number;
  contract?: string;
  budget: number;
  stage: SabbStage;
  applicants: Application[];
  reports: { no: 1 | 2 | 3; title: string; status: SabbReportStatus; amount: number; paid: boolean }[];
  createdAt: string;
} & Scoped;

export type ProjectLink = { id: string; opportunityId: string; targetKind: "pm" | "nf"; targetId: string; at: string };

// ------------------------------------------------------------------- قرارداد
export type ContractStage = "پیش‌نویس" | "مذاکره" | "امضاشده" | "در حال اجرا" | "تحویل‌شده" | "مختومه";
export const contractStages: ContractStage[] = ["پیش‌نویس", "مذاکره", "امضاشده", "در حال اجرا", "تحویل‌شده", "مختومه"];
export type ContractType = "فناورانه" | "پژوهشی" | "عمرانی" | "خدماتی";
export type ContractMethod = "فراخوان عمومی" | "استعلام محدود" | "ترک تشریفات" | "RFP" | "مناقصه";
export type ContractPaymentX = { id: string; title: string; amount: number; due: string; status: "پرداخت‌شده" | "در انتظار تأیید" | "آینده"; milestoneId?: string };
export type ContractMilestone = { id: string; title: string; due: string; done: boolean; doneAt?: string };
export type ContractEventX = { id: string; at: string; by: string; text: string; from?: ContractStage; to?: ContractStage };
export type Contract = {
  id: string;
  title: string;
  vendor: string;
  vendorEntityId?: string;
  type: ContractType;
  method: ContractMethod;
  stage: ContractStage;
  value: number;
  startDate: string;
  endDate: string;
  owner: string;
  guarantee: string;
  opportunityId?: string;
  milestones: ContractMilestone[];
  payments: ContractPaymentX[];
  history: ContractEventX[];
  renewals: { at: string; by: string; from: string; to: string; reason: string }[];
  createdAt: string;
} & Scoped;

export type TenderStage = "انتشار آگهی" | "دریافت پاکات" | "کمیسیون معاملات" | "ابلاغ برنده" | "عقد قرارداد";
export const tenderStages: TenderStage[] = ["انتشار آگهی", "دریافت پاکات", "کمیسیون معاملات", "ابلاغ برنده", "عقد قرارداد"];
export type TenderBid = { id: string; name: string; entityId?: string; techScore?: number; price?: number; guaranteeOk: boolean };
export type Tender = {
  id: string;
  title: string;
  method: "مناقصه عمومی" | "مناقصه محدود" | "مزایده" | "ترک تشریفات";
  stage: TenderStage;
  estimate: number;
  bids: TenderBid[];
  sessionDate?: string;
  minutes?: string;
  winnerBidId?: string;
  contractId?: string;
  boardApproval?: string;
  createdAt: string;
};

export type ESignStep = { role: string; name: string; status: "امضا شد" | "در انتظار امضا" | "در نوبت"; date?: string };
export type ESignDoc = { id: string; title: string; kind: string; relatedTo: string; method: string; steps: ESignStep[]; letterNo?: string };

// ------------------------------------------------------------------- صندوق
export type EmploymentFund = FundRecord & {
  entityId?: string;
  requested: number;
  approved: number;
  score?: number;
  committee: string;
  region: string;
  field: string;
  tranches: { id: string; title: string; amount: number; condition: string; status: "پرداخت‌شده" | "در انتظار" | "مشروط" }[];
  kpis: { label: string; value: string; target: string; onTrack: boolean }[];
  notes: string;
};

export type InnovationNf = NfProject;

// ------------------------------------------------------------------- جایزه
export type AwardPhase = "ثبت‌نام" | "ارسال اثر" | "داوری اولیه" | "داوری نهایی" | "اعلام نتایج";
export const awardPhases: AwardPhase[] = ["ثبت‌نام", "ارسال اثر", "داوری اولیه", "داوری نهایی", "اعلام نتایج"];
export type AwardCycle = {
  id: string;
  title: string;
  phase: AwardPhase;
  schedule: { phase: AwardPhase; start: string; end: string }[];
  blind: boolean;
  editLimit: number;
  finalistsPerTrack: number;
  rubric: RubricItem[];
  judges: string[];
  closed: boolean;
  createdAt: string;
};
export type AwardTrackX = { id: string; cycleId: string; title: string; categories: string[] };
export type AwardEntryStatus = "ثبت‌نام‌شده" | "ارسال‌شده" | "راه‌یافته به نهایی" | "حذف در داوری اولیه" | "برگزیده" | "تقدیرشده" | "شرکت‌کننده";
export type AwardEntryX = {
  id: string;
  cycleId: string;
  trackId: string;
  category: string;
  title: string;
  companyName: string;
  entityId?: string;
  holdingId?: string;
  submitter: string;
  summary: string;
  benefits: string;
  attachments: string[];
  status: AwardEntryStatus;
  editsUsed: number;
  rank?: number;
  certificateNo?: string;
  override?: { score: number; reason: string; by: string };
  createdAt: string;
};
export type JudgeAssignment = {
  id: string;
  entryId: string;
  judge: string;
  round: "اولیه" | "نهایی";
  coi: "اعلام‌نشده" | "ندارد" | "دارد";
  coiReason?: string;
  scores?: number[];
  comment?: string;
  at?: string;
};

// ------------------------------------------------------------------- آموزش
export type CourseStatus = "ثبت‌نام باز" | "در حال برگزاری" | "برگزار شده";
export type ContentItem = { id: string; title: string; kind: "video" | "doc" | "quiz"; minutes: number; quizId?: string };
export type CourseSession = { id: string; date: string; start: string; end: string; place: string };
export type Course = {
  id: string;
  title: string;
  instructor: string;
  date: string;
  hours: number;
  capacity: number;
  status: CourseStatus;
  mode: "حضوری" | "آنلاین" | "ترکیبی";
  field: string;
  items: ContentItem[];
  sessions: CourseSession[];
  jobTitles: string[];
  createdAt: string;
} & Scoped;
export type AttendanceStatus = "حاضر" | "غایب" | "تأخیر" | "موجه";
export type Enrollment = {
  id: string;
  courseId: string;
  user: string;
  enrolledAt: string;
  progress: Record<string, number>; // itemId → ٪
  quiz: Record<string, { best: number; attempts: number }>;
  attendance: Record<string, AttendanceStatus>;
  evaluation?: { answers: number[]; comment: string; at: string };
  certificateNo?: string;
  certifiedAt?: string;
};
export type LearningPath = { id: string; title: string; audience: string; courseIds: string[] };
export type Question = { id: string; topic: string; text: string; options: string[]; correct: number };
export type Quiz = { id: string; title: string; questionIds: string[]; passScore: number };
export type JobAssignment = { id: string; user: string; jobTitle: string };
export const evaluationQuestions = ["محتوای دوره", "تسلط و شیوه‌ی ارائه‌ی مدرس", "کاربرد در کار", "سازمان‌دهی و زمان‌بندی", "رضایت کلی"];

// ------------------------------------------------------------------- انبار
export type InnStore = {
  version: number;
  seq: number;
  entities: EcoEntity[];
  fieldDefs: EcoFieldDef[];
  calls: ResearchCall[];
  rfps: Rfp[];
  sabbaticals: SabbaticalX[];
  projectLinks: ProjectLink[];
  contracts: Contract[];
  tenders: Tender[];
  esign: ESignDoc[];
  nfProjects: NfProject[];
  employment: EmploymentFund[];
  awardCycles: AwardCycle[];
  awardTracks: AwardTrackX[];
  awardEntries: AwardEntryX[];
  assignments: JudgeAssignment[];
  courses: Course[];
  enrollments: Enrollment[];
  paths: LearningPath[];
  questions: Question[];
  quizzes: Quiz[];
  jobAssignments: JobAssignment[];
  decisions: Decision[];
  outcomes: Outcome[];
  logs: ILog[];
};
