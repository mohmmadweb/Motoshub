// ---------------------------------------------------------------------------
// مدل داده‌ی ماژول مدیریت پروژه — هم‌راستا با API (api2.shub.ir/api/v1/projects/*)
// و «سند جامع سیستم مدیریت پروژه». فیلدهایی که در API هنوز وجود ندارند با
// «فقط پروتوتایپ» علامت خورده‌اند تا تیم بک‌اند بداند چه چیزی باید اضافه شود.
// ---------------------------------------------------------------------------
import type { Scoped } from "../data/tenancy";
import type { EventCode } from "./events";

/** نوع معنایی ستون بورد — منطق وابستگی و خودکارسازی به این نوع نگاه می‌کند نه به نام ستون */
export type ColumnKind = "backlog" | "todo" | "doing" | "review" | "blocked" | "done";
export type BoardColumn = { id: string; label: string; kind: ColumnKind; wip?: number };

export type PMPriority = "کم" | "متوسط" | "زیاد" | "بحرانی";

export type ChecklistItem = { id: string; text: string; done: boolean };
export type TaskComment = { id: string; author: string; text: string; at: string };

export type PMTask = {
  id: string;
  title: string;
  description: string;
  /** شناسه‌ی ستون بورد */
  status: string;
  assignee: string;
  priority: PMPriority;
  start: string;
  due: string;
  progress: number;
  labels: string[];
  checklist: ChecklistItem[];
  /** بودجه‌ی تخمینی تسک (ریال) — فقط پروتوتایپ */
  estBudget: number;
  /** برآورد ساعت کار — برای مقایسه با زمان ثبت‌شده */
  estHours: number;
  comments: TaskComment[];
  milestoneId?: string;
  archived?: boolean;
  createdAt: string;
  // ---- قابلیت‌های هم‌تراز Jira / Asana / ClickUp / میزیتو (فقط پروتوتایپ) ----
  /** زیرتسک: شناسه‌ی تسک والد */
  parentId?: string;
  /** دنبال‌کنندگان — بدون مسئول بودن، از تغییرات تسک اعلان می‌گیرند */
  watchers?: string[];
  /** تکرار: با انجام‌شدن تسک، نمونه‌ی بعدی خودکار ساخته می‌شود */
  recurrence?: Recurrence;
  /** امتیاز داستانی (Story Point) برای برنامه‌ریزی اسپرینت */
  storyPoints?: number;
  sprintId?: string;
  /** مقادیر فیلدهای سفارشی پروژه — کلید = شناسه‌ی فیلد */
  customFields?: Record<string, string>;
  /** درخواست تأیید (Approval) */
  approval?: TaskApproval;
  /** تایمر در حال اجرا (زمان شروع به میلی‌ثانیه) */
  timer?: { by: string; startedAt: number };
};

export type Recurrence = "روزانه" | "هفتگی" | "ماهانه";
export type ApprovalStatus = "در انتظار" | "تأییدشده" | "ردشده";
export type TaskApproval = { approver: string; requestedBy: string; status: ApprovalStatus; note?: string; at: string };

export type SprintStatus = "برنامه‌ریزی" | "فعال" | "تکمیل‌شده";
export type Sprint = {
  id: string;
  name: string;
  goal: string;
  start: string;
  end: string;
  status: SprintStatus;
  /** امتیاز تعهدشده هنگام شروع و امتیاز تحویل‌شده هنگام پایان — برای نمودار سرعت تیم */
  committedPoints?: number;
  completedPoints?: number;
};

export type CustomFieldType = "متن" | "عدد" | "انتخابی" | "تاریخ";
export type CustomFieldDef = { id: string; name: string; type: CustomFieldType; options?: string[] };

/** خط مبنا (Baseline) — عکس لحظه‌ای از زمان‌بندی برای مقایسه با برنامه‌ی فعلی */
export type Baseline = { savedAt: string; savedBy: string; tasks: Record<string, { start: string; due: string }> };

/** قاعده‌ی خودکارسازی سفارشی «وقتی … آنگاه …» (مشابه Jira Automation / Trello Butler) */
export type CustomRuleTrigger = { type: "moved"; columnId: string } | { type: "created" } | { type: "labelAdded"; label: string };
export type CustomRuleAction =
  | { type: "assign"; member: string }
  | { type: "priority"; priority: PMPriority }
  | { type: "label"; label: string }
  | { type: "watch"; member: string }
  | { type: "checklist"; text: string };
export type CustomRule = { id: string; name: string; trigger: CustomRuleTrigger; action: CustomRuleAction; enabled: boolean; runs: number };

/** وابستگی «پایان به شروع»: successor تا پایان predecessor نمی‌تواند شروع شود */
export type Dependency = { id: string; predecessor: string; successor: string; createdAt: string };

export type ProjectRole = "مالک" | "مدیر پروژه" | "مدیر سیستم" | "عضو" | "مشاهده‌گر";
export type PMMember = { id: string; name: string; title: string; role: ProjectRole; allocation: number; userId?: string };

export type MilestoneStatus = "انجام‌شده" | "در حال انجام" | "پیش‌رو" | "در خطر";
export type PMMilestone = { id: string; title: string; due: string; status: MilestoneStatus; owner: string; taskIds: string[] };

export type RiskSeverity = "کم" | "متوسط" | "بحرانی";
export type RiskLevel3 = "کم" | "متوسط" | "زیاد";
export type RiskStatus = "باز" | "در حال رفع" | "بسته";
export type PMRisk = {
  id: string;
  title: string;
  severity: RiskSeverity;
  probability: RiskLevel3;
  impact: RiskLevel3;
  status: RiskStatus;
  owner: string;
  mitigation: string;
  taskId?: string;
};

export type IssueStatus = "باز" | "در حال بررسی" | "حل‌شده" | "بسته‌شده";
export type PMIssue = {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  severity: PMPriority;
  reporter: string;
  assignee: string;
  taskId?: string;
  createdAt: string;
};

export type ExpenseStatus = "برنامه‌ریزی‌شده" | "در انتظار تأیید" | "تأییدشده" | "پرداخت‌شده";
export type PMExpense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  status: ExpenseStatus;
  taskId?: string;
  description?: string;
  receipt?: string;
  createdBy: string;
};

export type BudgetLine = { category: string; allocated: number };
export type PMBudget = {
  total: number;
  lines: BudgetLine[];
  revenue: number;
  /** آستانه‌های هشدار مصرف بودجه (درصد) */
  thresholds: number[];
  /** آستانه‌هایی که قبلاً هشدارشان صادر شده — تا تکراری ارسال نشود */
  firedThresholds: number[];
};

export type TimeLog = { id: string; member: string; taskId: string; hours: number; date: string; note: string };

export type MeetingStatus = "برنامه‌ریزی‌شده" | "برگزارشده" | "لغوشده";
export type PMMeeting = {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  mode: "حضوری" | "ویدیویی";
  participants: string[];
  description: string;
  taskIds: string[];
  status: MeetingStatus;
};

export type ActionItem = { id: string; text: string; owner: string; due: string; taskId?: string };
export type PMMinute = {
  id: string;
  title: string;
  date: string;
  attendees: number;
  decisions: number;
  followUps: number;
  /** جزئیات صورت‌جلسه (نسخه‌ی کامل) — صورت‌جلسات قدیمی فقط خلاصه‌ی عددی دارند */
  meetingId?: string;
  participants?: string[];
  topics?: string[];
  decisionList?: string[];
  actions?: ActionItem[];
  published?: boolean;
};

export type DocType = "قرارداد" | "پروپوزال" | "گزارش" | "فایل طراحی" | "مستندات فنی" | "فایل مالی" | "صورت‌جلسه" | "ارائه" | "سایر";
export type PMDocument = {
  id: string;
  name: string;
  type: DocType;
  size: string;
  uploadedBy: string;
  date: string;
  version: number;
  taskId?: string;
  meetingId?: string;
  channelId?: string;
};

export type ChatMessage = {
  id: string;
  author: string;
  text: string;
  at: string;
  pinned?: boolean;
  replyTo?: string;
  reactions?: Record<string, string[]>;
  fileName?: string;
};
export type PMChannel = { id: string; name: string; description: string; members: string[] | "all"; messages: ChatMessage[] };
export type Announcement = { id: string; title: string; body: string; author: string; at: string; pinned: boolean };

export type AutomationRule = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  runs: number;
  builtin?: boolean;
};

export type LifecyclePhase = "برنامه‌ریزی" | "اجرا" | "نظارت" | "بررسی" | "تکمیل" | "اختتام";
export type ProjectPriority = "کم" | "متوسط" | "زیاد";
export type Visibility = "عمومی سازمان" | "فقط اعضا" | "خصوصی";

export type ProjectMeta = {
  id: string;
  name: string;
  description: string;
  client: string;
  sponsor: string;
  manager: string;
  /** وضعیت سلامت — معادل status در API (۱ سبز، ۲ زرد، ۳ قرمز) */
  health: "سبز" | "زرد" | "قرمز";
  priority: ProjectPriority;
  phase: LifecyclePhase;
  start: string;
  deadline: string;
  category: string;
  tags: string[];
  icon: string;
  color: string;
  visibility: Visibility;
  workspace: string;
  starred: boolean;
  archived: boolean;
  /** مسئول امور مالی پروژه — گیرنده‌ی هشدارهای بودجه */
  financeOfficer: string;
  /** گروه پروژه (پورتفولیو) — مثلاً «تحول دیجیتال» */
  groupId?: string;
  createdAt: string;
} & Scoped;

/** رکورد تاریخچه — شکل API: ProjectActivityLog {user_id, event_category, description, metadata, created_at} */
export type ActivityLog = {
  id: string;
  event: EventCode;
  description: string;
  actor: string;
  /** تاریخ شمسی */
  date: string;
  time: string;
  /** برای مرتب‌سازی */
  seq: number;
  entity?: { type: string; id: string };
  metadata: Record<string, string | number | boolean>;
};

export type NotifChannel = "inapp" | "email" | "sms" | "push";
export type NotifPriority = "کم" | "عادی" | "مهم" | "فوری";

export type PMNotification = {
  id: string;
  projectId: string;
  projectName: string;
  event: EventCode;
  text: string;
  recipient: string;
  /** چرا این شخص گیرنده است (مسئول تسک، مدیر پروژه، …) */
  reason: string;
  channels: NotifChannel[];
  priority: NotifPriority;
  actor: string;
  date: string;
  time: string;
  seq: number;
  read: boolean;
  /** تب و موجودیتی که با کلیک باز می‌شود */
  link: { tab: string; entityId?: string };
};

export type RecipientRole =
  | "owner"
  | "manager"
  | "assignee"
  | "previousAssignee"
  | "successorAssignees"
  | "predecessorAssignees"
  | "team"
  | "riskOwner"
  | "milestoneOwner"
  | "sponsor"
  | "finance"
  | "participants"
  | "mentioned"
  | "subjectMember"
  | "playbookStarter"
  | "issueAssignee"
  | "issueReporter"
  | "expenseCreator"
  | "approver"
  | "requester"
  | "watchers";

export type NotifRule = { enabled: boolean; recipients: RecipientRole[]; channels: NotifChannel[]; priority: NotifPriority };

export type PlaybookStepDef = { id: string; title: string; description: string };
export type PMPlaybookTemplate = { id: string; name: string; category: string; steps: PlaybookStepDef[]; usedCount: number };
export type PlaybookStepStatus = "در انتظار" | "انجام‌شده" | "ردشده";
export type PlaybookExecStatus = "در انتظار" | "در حال اجرا" | "تکمیل‌شده" | "لغوشده";
export type PlaybookExecution = {
  id: string;
  templateId: string;
  templateName: string;
  projectId: string;
  startedBy: string;
  status: PlaybookExecStatus;
  startedAt: string;
  completedAt?: string;
  steps: { id: string; title: string; order: number; status: PlaybookStepStatus; completedBy?: string; completedAt?: string; notes?: string }[];
};

/** گروه‌بندی پروژه‌ها (پورتفولیو) */
export type ProjectGroup = { id: string; name: string; description: string; color: string };

export type ProjectState = {
  meta: ProjectMeta;
  columns: BoardColumn[];
  tasks: PMTask[];
  deps: Dependency[];
  members: PMMember[];
  milestones: PMMilestone[];
  risks: PMRisk[];
  issues: PMIssue[];
  expenses: PMExpense[];
  budget: PMBudget;
  timeLogs: TimeLog[];
  meetings: PMMeeting[];
  minutes: PMMinute[];
  documents: PMDocument[];
  channels: PMChannel[];
  announcements: Announcement[];
  automation: AutomationRule[];
  /** بازنویسی قواعد اعلانِ پیش‌فرض برای همین پروژه */
  notifRules: Partial<Record<EventCode, NotifRule>>;
  logs: ActivityLog[];
  /** رویدادهای زمان‌بندی‌شده‌ای که یک بار صادر شده‌اند (مثلاً «سررسید فردا» برای تسک t2) */
  firedReminders: string[];
  sprints?: Sprint[];
  customFields?: CustomFieldDef[];
  baseline?: Baseline;
  customRules?: CustomRule[];
};
