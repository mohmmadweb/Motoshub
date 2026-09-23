// ---------------------------------------------------------------------------
// کاتالوگ رویدادهای پروژه — منبع واحد برای «تاریخچه‌ی پروژه» و «قواعد اعلان».
// هر رویداد: کد (همان event_category در API)، متن فارسی نمونه، وضعیت در API
// و قاعده‌ی پیش‌فرض اعلان (چه کسی، از چه کانالی، با چه اولویتی).
// notify = null یعنی «فقط در تاریخچه ثبت می‌شود و اعلان نمی‌دهد».
// ---------------------------------------------------------------------------
import type { NotifRule, RecipientRole, NotifChannel, NotifPriority } from "./types";

export type EventCategory =
  | "project"
  | "member"
  | "task"
  | "dependency"
  | "board"
  | "expense"
  | "budget"
  | "risk"
  | "issue"
  | "milestone"
  | "meeting"
  | "document"
  | "communication"
  | "time"
  | "playbook"
  | "automation";

/** implemented = در API پیاده شده · requested = در فهرست پیشنهادی شما · proposed = پیشنهاد تکمیلی این نسخه */
export type ApiState = "implemented" | "requested" | "proposed";

export type EventDef = {
  code: string;
  category: EventCategory;
  label: string;
  sample: string;
  en?: string;
  api: ApiState;
  /** user = با اقدام کاربر · system = زمان‌بند/قاعده‌ی خودکار */
  trigger: "user" | "system";
  notify: NotifRule | null;
  why?: string;
};

const r = (recipients: RecipientRole[], channels: NotifChannel[], priority: NotifPriority = "عادی"): NotifRule => ({
  enabled: true,
  recipients,
  channels,
  priority,
});

export const EVENT_CATALOG = [
  // ------------------------------ پروژه ------------------------------
  { code: "PROJECT_CREATED", category: "project", label: "ایجاد پروژه", sample: "پروژه «آلفا» ایجاد شد.", en: "Project 'Alpha' was created.", api: "requested", trigger: "user", notify: r(["manager", "team"], ["inapp", "email"]), why: "مدیر پروژه و اعضای اولیه باید بدانند فضای کاری جدیدی برایشان ساخته شده است." },
  { code: "PROJECT_NAME_UPDATED", category: "project", label: "تغییر نام پروژه", sample: "نام پروژه از «آلفا» به «بتا» تغییر کرد.", en: "Project name was changed from 'Alpha' to 'Beta'.", api: "requested", trigger: "user", notify: r(["team"], ["inapp"], "کم"), why: "صرفاً برای اینکه اعضا پروژه را با نام جدید پیدا کنند." },
  { code: "PROJECT_DESCRIPTION_UPDATED", category: "project", label: "ویرایش توضیحات پروژه", sample: "توضیحات پروژه به‌روزرسانی شد.", en: "Project description was updated.", api: "requested", trigger: "user", notify: null, why: "تغییر کم‌اهمیت؛ فقط در تاریخچه می‌ماند." },
  { code: "PROJECT_STATUS_CHANGED", category: "project", label: "تغییر وضعیت سلامت پروژه", sample: "وضعیت پروژه از «سبز» به «زرد» تغییر کرد.", en: "Project status changed from GREEN to YELLOW.", api: "requested", trigger: "user", notify: r(["owner", "manager", "sponsor"], ["inapp", "email"], "مهم"), why: "زرد/قرمز شدن پروژه یعنی کارفرما و مالک باید وارد عمل شوند." },
  { code: "PROJECT_MEMBER_ADDED", category: "member", label: "افزودن عضو", sample: "«علی رضایی» به تیم پروژه اضافه شد.", en: "User X was added to the project team.", api: "requested", trigger: "user", notify: r(["subjectMember", "manager"], ["inapp", "email"]), why: "خودِ عضو جدید باید بداند به پروژه دسترسی گرفته است." },
  { code: "PROJECT_MEMBER_REMOVED", category: "member", label: "حذف عضو", sample: "«علی رضایی» از تیم پروژه حذف شد.", en: "User Y was removed from the project team.", api: "requested", trigger: "user", notify: r(["subjectMember", "manager"], ["inapp", "email"]), why: "عضو حذف‌شده باید بداند دسترسی‌اش قطع شده و تسک‌هایش باید واگذار شوند." },
  { code: "PROJECT_TIMELINE_CHANGED", category: "project", label: "تغییر زمان‌بندی پروژه", sample: "تاریخ پایان پروژه تمدید شد.", en: "Project end date was extended.", api: "requested", trigger: "user", notify: r(["team", "sponsor"], ["inapp", "email"], "مهم"), why: "همه‌ی برنامه‌ریزی‌های تیم و تعهد به کارفرما به این تاریخ وابسته است." },
  { code: "PROJECT_BUDGET_CHANGED", category: "budget", label: "تغییر بودجه پروژه", sample: "بودجه‌ی پروژه از ۱۰ میلیارد به ۱۲ میلیارد ریال تغییر کرد.", api: "implemented", trigger: "user", notify: r(["owner", "manager", "finance", "sponsor"], ["inapp", "email"], "مهم"), why: "تغییر بودجه تصمیم مالی است و باید به ذی‌نفعان مالی برسد." },
  { code: "PROJECT_PRIORITY_CHANGED", category: "project", label: "تغییر اولویت پروژه", sample: "اولویت پروژه به «زیاد» تغییر کرد.", api: "proposed", trigger: "user", notify: r(["manager", "team"], ["inapp"]), why: "اولویت پروژه روی تخصیص نیرو اثر دارد." },
  { code: "PROJECT_PHASE_CHANGED", category: "project", label: "تغییر مرحله‌ی چرخه‌ی عمر", sample: "پروژه از مرحله‌ی «اجرا» وارد مرحله‌ی «نظارت» شد.", api: "proposed", trigger: "user", notify: r(["team", "sponsor"], ["inapp", "email"]), why: "ورود به مرحله‌ی جدید (مثلاً اختتام) وظایف متفاوتی از تیم می‌خواهد." },
  { code: "PROJECT_MEMBER_ROLE_CHANGED", category: "member", label: "تغییر نقش عضو", sample: "نقش «سارا محمدی» از «عضو» به «مدیر پروژه» تغییر کرد.", api: "proposed", trigger: "user", notify: r(["subjectMember"], ["inapp", "email"]), why: "سطح دسترسی آن فرد تغییر کرده است." },
  { code: "PROJECT_ARCHIVED", category: "project", label: "بایگانی پروژه", sample: "پروژه بایگانی شد.", api: "proposed", trigger: "user", notify: r(["team"], ["inapp"]), why: "پروژه از فهرست فعال‌ها خارج می‌شود." },
  { code: "PROJECT_SETTINGS_UPDATED", category: "project", label: "تغییر تنظیمات پروژه", sample: "رنگ و آیکون پروژه تغییر کرد.", api: "proposed", trigger: "user", notify: null },
  { code: "PROJECT_RESTORED", category: "project", label: "بازیابی پروژه از بایگانی", sample: "پروژه از بایگانی بازیابی شد.", api: "proposed", trigger: "user", notify: r(["team"], ["inapp"]) },

  // ------------------------------ تسک ------------------------------
  { code: "TASK_CREATED", category: "task", label: "ایجاد تسک", sample: "تسک «راه‌اندازی پایگاه داده» ایجاد شد.", en: "Task 'Setup Database' was created.", api: "requested", trigger: "user", notify: null, why: "خودِ ایجاد اعلان ندارد؛ اگر مسئول داشته باشد رویداد TASK_ASSIGNED اعلان می‌دهد." },
  { code: "TASK_TITLE_UPDATED", category: "task", label: "تغییر عنوان تسک", sample: "عنوان تسک تغییر کرد.", en: "Task title was changed.", api: "requested", trigger: "user", notify: r(["assignee"], ["inapp"], "کم") },
  { code: "TASK_ASSIGNED", category: "task", label: "تخصیص تسک", sample: "تسک «راه‌اندازی پایگاه داده» به «علی رضایی» واگذار شد.", en: "Task 'Setup Database' was assigned to User X.", api: "requested", trigger: "user", notify: r(["assignee"], ["inapp", "email", "push"], "مهم"), why: "مهم‌ترین اعلان سیستم: «Task جدید به شما اختصاص داده شد» (بند ۳۷ سند)." },
  { code: "TASK_REASSIGNED", category: "task", label: "واگذاری مجدد تسک", sample: "تسک «راه‌اندازی پایگاه داده» از «علی» به «سارا» واگذار شد.", en: "Task 'Setup Database' was reassigned from User X to User Y.", api: "requested", trigger: "user", notify: r(["assignee", "previousAssignee"], ["inapp", "email"], "مهم"), why: "مسئول جدید باید کار را بردارد و مسئول قبلی بداند دیگر پاسخگو نیست." },
  { code: "TASK_STATUS_CHANGED", category: "task", label: "تغییر وضعیت تسک", sample: "تسک «راه‌اندازی پایگاه داده» به «در حال بررسی» منتقل شد.", api: "implemented", trigger: "user", notify: r(["assignee", "manager"], ["inapp"]), why: "به‌ویژه ورود به «بازبینی» که مدیر باید بررسی کند." },
  { code: "TASK_DUE_DATE_CHANGED", category: "task", label: "تغییر سررسید تسک", sample: "سررسید تسک «راه‌اندازی پایگاه داده» عقب افتاد.", en: "Task 'Setup Database' due date was pushed back.", api: "requested", trigger: "user", notify: r(["assignee", "successorAssignees"], ["inapp", "email"], "مهم"), why: "عقب‌افتادن یک تسک، تسک‌های وابسته را هم عقب می‌اندازد." },
  { code: "TASK_PRIORITY_CHANGED", category: "task", label: "تغییر اولویت تسک", sample: "اولویت تسک به «بحرانی» تغییر کرد.", api: "proposed", trigger: "user", notify: r(["assignee"], ["inapp"]) },
  { code: "TASK_DESCRIPTION_UPDATED", category: "task", label: "ویرایش شرح تسک", sample: "شرح تسک به‌روزرسانی شد.", api: "proposed", trigger: "user", notify: null },
  { code: "TASK_DELETED", category: "task", label: "حذف تسک", sample: "تسک «راه‌اندازی پایگاه داده» حذف شد.", api: "proposed", trigger: "user", notify: r(["assignee", "successorAssignees"], ["inapp"]) },
  { code: "TASK_START_DATE_CHANGED", category: "task", label: "تغییر تاریخ شروع تسک", sample: "تاریخ شروع تسک دو روز جلو افتاد.", api: "proposed", trigger: "user", notify: r(["assignee"], ["inapp"], "کم") },
  { code: "TASK_ESTIMATE_UPDATED", category: "task", label: "تغییر برآورد بودجه/ساعت تسک", sample: "بودجه‌ی تخمینی تسک به ۵۰ میلیون ریال تغییر کرد.", api: "proposed", trigger: "user", notify: null },
  { code: "TASK_PROGRESS_UPDATED", category: "task", label: "به‌روزرسانی پیشرفت", sample: "پیشرفت تسک به ۶۰٪ رسید.", api: "proposed", trigger: "user", notify: null },
  { code: "TASK_CHECKLIST_UPDATED", category: "task", label: "تغییر چک‌لیست", sample: "مورد «وایرفریم» در چک‌لیست تیک خورد.", api: "proposed", trigger: "user", notify: null },
  { code: "TASK_LABELS_UPDATED", category: "task", label: "تغییر برچسب‌ها", sample: "برچسب‌های تسک تغییر کرد.", api: "proposed", trigger: "user", notify: null },
  { code: "TASK_COMMENT_ADDED", category: "task", label: "ثبت نظر روی تسک", sample: "«سارا» روی تسک نظر گذاشت.", api: "proposed", trigger: "user", notify: r(["assignee"], ["inapp"]) },
  { code: "USER_MENTIONED", category: "communication", label: "منشن شدن", sample: "«سارا» شما را در تسک «طراحی صفحه اصلی» منشن کرد.", api: "proposed", trigger: "user", notify: r(["mentioned"], ["inapp", "push"], "مهم"), why: "بند ۳۷ سند: «شخصی شما را Mention کرد»." },
  { code: "TASK_BLOCKED", category: "task", label: "متوقف‌شدن تسک", sample: "تسک «راه‌اندازی پایگاه داده» متوقف شد.", api: "proposed", trigger: "user", notify: r(["manager"], ["inapp", "push"], "مهم"), why: "مانع کاری باید سریع به مدیر پروژه برسد." },
  { code: "TASK_DUE_SOON", category: "task", label: "نزدیک‌شدن سررسید", sample: "سررسید تسک «راه‌اندازی پایگاه داده» فرداست.", api: "proposed", trigger: "system", notify: r(["assignee"], ["inapp", "email", "push"], "مهم"), why: "بند ۱۵ و ۳۹ سند: اگر Deadline فردا است برای مسئول اعلان ارسال شود." },
  { code: "TASK_OVERDUE", category: "task", label: "عقب‌افتادن تسک", sample: "تسک «راه‌اندازی پایگاه داده» از سررسید گذشت.", api: "proposed", trigger: "system", notify: r(["assignee", "manager"], ["inapp", "email"], "مهم") },
  { code: "TASK_TIME_LOGGED", category: "time", label: "ثبت زمان کاری", sample: "۴ ساعت روی تسک «طراحی صفحه اصلی» ثبت شد.", api: "proposed", trigger: "user", notify: null },
  { code: "TASK_BUDGET_EXCEEDED", category: "budget", label: "عبور هزینه‌ی تسک از بودجه‌ی آن", sample: "هزینه‌ی واقعی تسک از بودجه‌ی تخمینی ۲۰٪ بیشتر شد.", api: "proposed", trigger: "system", notify: r(["manager", "finance"], ["inapp", "email"], "مهم"), why: "بند ۳۰ سند: کنترل هزینه‌ی تخمینی در برابر واقعی." },

  // ------------------------------ وابستگی ------------------------------
  { code: "TASK_DEPENDENCY_ADDED", category: "dependency", label: "افزودن وابستگی", sample: "تسک «تست» به تسک «توسعه» وابسته شد.", api: "proposed", trigger: "user", notify: r(["assignee", "predecessorAssignees"], ["inapp"]), why: "مسئول تسک بعدی باید بداند منتظر چه کسی است و مسئول تسک قبلی بداند کسی منتظر اوست." },
  { code: "TASK_DEPENDENCY_REMOVED", category: "dependency", label: "حذف وابستگی", sample: "وابستگی «تست» ← «توسعه» حذف شد.", api: "proposed", trigger: "user", notify: r(["assignee"], ["inapp"], "کم") },
  { code: "TASK_UNBLOCKED", category: "dependency", label: "آزادشدن تسک وابسته", sample: "همه‌ی پیش‌نیازهای تسک «تست» انجام شد؛ می‌توانید شروع کنید.", api: "proposed", trigger: "system", notify: r(["assignee"], ["inapp", "push"], "مهم"), why: "ارزشمندترین اعلانِ وابستگی: مسئول دیگر لازم نیست مدام بورد را چک کند." },
  { code: "DEPENDENCY_CONFLICT", category: "dependency", label: "تعارض زمان‌بندی وابستگی", sample: "تسک «تست» قبل از پایان پیش‌نیاز «توسعه» شروع می‌شود.", api: "proposed", trigger: "system", notify: r(["assignee", "manager"], ["inapp", "email"], "مهم") },
  { code: "TASK_STARTED_WITH_OPEN_DEPENDENCY", category: "dependency", label: "شروع تسک با پیش‌نیاز باز", sample: "تسک «تست» با وجود پیش‌نیاز انجام‌نشده شروع شد.", api: "proposed", trigger: "user", notify: r(["manager", "predecessorAssignees"], ["inapp"], "مهم") },

  // ------------------------------ بورد ------------------------------
  { code: "BOARD_COLUMN_CREATED", category: "board", label: "ایجاد ستون بورد", sample: "ستون «در انتظار کارفرما» به بورد اضافه شد.", api: "proposed", trigger: "user", notify: null },
  { code: "BOARD_COLUMN_RENAMED", category: "board", label: "تغییر نام ستون", sample: "نام ستون «بازبینی» به «کنترل کیفیت» تغییر کرد.", api: "proposed", trigger: "user", notify: null },
  { code: "BOARD_COLUMN_DELETED", category: "board", label: "حذف ستون", sample: "ستون «در انتظار کارفرما» حذف شد.", api: "proposed", trigger: "user", notify: null },

  // ------------------------------ هزینه ------------------------------
  { code: "EXPENSE_ADDED", category: "expense", label: "ثبت هزینه", sample: "هزینه‌ی «هزینه‌ی سرور» به مبلغ ۲۰۰ میلیون ریال ثبت شد.", api: "implemented", trigger: "user", notify: r(["finance", "manager"], ["inapp"]), why: "هزینه‌ی جدید باید در صف تأیید مالی قرار بگیرد." },
  { code: "EXPENSE_TITLE_UPDATED", category: "expense", label: "تغییر عنوان هزینه", sample: "عنوان هزینه تغییر کرد.", en: "Expense title was changed.", api: "requested", trigger: "user", notify: null },
  { code: "EXPENSE_STATUS_CHANGED", category: "expense", label: "تغییر وضعیت هزینه", sample: "هزینه‌ی «هزینه‌ی سرور» تأیید شد.", en: "Expense 'Server Costs' was changed to APPROVED.", api: "requested", trigger: "user", notify: r(["expenseCreator", "finance"], ["inapp", "email"]), why: "ثبت‌کننده‌ی هزینه منتظر نتیجه‌ی تأیید/پرداخت است." },
  { code: "EXPENSE_AMOUNT_UPDATED", category: "expense", label: "تغییر مبلغ هزینه", sample: "مبلغ هزینه‌ی «هزینه‌ی سرور» از ۱۰۰ به ۲۰۰ میلیون ریال تغییر کرد.", en: "Expense 'Server Costs' amount was updated from $100 to $200.", api: "requested", trigger: "user", notify: r(["finance", "manager"], ["inapp"], "مهم") },
  { code: "EXPENSE_UPDATED", category: "expense", label: "ویرایش سایر اطلاعات هزینه", sample: "دسته‌بندی هزینه تغییر کرد.", api: "proposed", trigger: "user", notify: null },
  { code: "BUDGET_ALLOCATION_UPDATED", category: "budget", label: "تغییر تقسیم بودجه", sample: "تخصیص سرفصل «طراحی» به ۸۰۰ میلیون ریال تغییر کرد.", api: "proposed", trigger: "user", notify: r(["finance"], ["inapp"], "کم") },
  { code: "EXPENSE_DELETED", category: "expense", label: "حذف هزینه", sample: "هزینه‌ی «هزینه‌ی سرور» حذف شد.", api: "proposed", trigger: "user", notify: r(["finance"], ["inapp"]) },
  { code: "BUDGET_THRESHOLD_REACHED", category: "budget", label: "عبور مصرف بودجه از آستانه", sample: "مصرف بودجه‌ی پروژه از ۸۰٪ عبور کرد.", api: "proposed", trigger: "system", notify: r(["owner", "manager", "finance"], ["inapp", "email", "sms"], "فوری"), why: "بند ۳۷ و ۳۹ سند: اگر هزینه از ۸۰٪ بودجه عبور کرد به مدیر پروژه هشدار داده شود." },

  // ------------------------------ ریسک و مشکل ------------------------------
  { code: "RISK_ADDED", category: "risk", label: "ثبت ریسک", sample: "ریسک «از کار افتادن سرور» ثبت شد.", api: "implemented", trigger: "user", notify: r(["riskOwner", "manager"], ["inapp", "email"]) },
  { code: "RISK_TITLE_UPDATED", category: "risk", label: "تغییر عنوان ریسک", sample: "عنوان ریسک تغییر کرد.", en: "Risk title was changed.", api: "requested", trigger: "user", notify: null },
  { code: "RISK_STATUS_CHANGED", category: "risk", label: "تغییر وضعیت ریسک", sample: "ریسک «از کار افتادن سرور» بسته شد.", en: "Risk 'Server Crash' was marked as CLOSED.", api: "requested", trigger: "user", notify: r(["riskOwner", "manager"], ["inapp"]) },
  { code: "RISK_ESCALATED", category: "risk", label: "تشدید ریسک", sample: "شدت ریسک «از کار افتادن سرور» به «بحرانی» افزایش یافت.", en: "Risk 'Server Crash' severity was increased to CRITICAL.", api: "requested", trigger: "user", notify: r(["riskOwner", "manager", "owner", "sponsor"], ["inapp", "email", "sms"], "فوری"), why: "ریسک بحرانی باید پیش از تبدیل به بحران به سطح تصمیم‌گیر برسد." },
  { code: "RISK_DEESCALATED", category: "risk", label: "کاهش شدت ریسک", sample: "شدت ریسک به «متوسط» کاهش یافت.", api: "proposed", trigger: "user", notify: r(["riskOwner"], ["inapp"], "کم") },
  { code: "RISK_OWNER_CHANGED", category: "risk", label: "تغییر مسئول ریسک", sample: "مسئول ریسک به «واحد مالی» تغییر کرد.", api: "proposed", trigger: "user", notify: r(["riskOwner"], ["inapp", "email"]) },
  { code: "RISK_UPDATED", category: "risk", label: "ویرایش احتمال/اثر/برنامه‌ی مقابله", sample: "برنامه‌ی مقابله‌ی ریسک به‌روزرسانی شد.", api: "proposed", trigger: "user", notify: null },
  { code: "RISK_DELETED", category: "risk", label: "حذف ریسک", sample: "ریسک حذف شد.", api: "proposed", trigger: "user", notify: null },
  { code: "ISSUE_REPORTED", category: "issue", label: "گزارش مشکل", sample: "مشکل «سرور در دسترس نیست» گزارش شد.", api: "proposed", trigger: "user", notify: r(["issueAssignee", "manager"], ["inapp", "push"], "مهم"), why: "بند ۳۶ سند: مشکل واقعی (نه احتمالی) نیاز به اقدام فوری دارد." },
  { code: "ISSUE_STATUS_CHANGED", category: "issue", label: "تغییر وضعیت مشکل", sample: "مشکل «سرور در دسترس نیست» حل شد.", api: "proposed", trigger: "user", notify: r(["issueReporter"], ["inapp"]) },

  { code: "ISSUE_UPDATED", category: "issue", label: "ویرایش یا حذف مشکل", sample: "مسئول رفع مشکل تغییر کرد.", api: "proposed", trigger: "user", notify: r(["issueAssignee"], ["inapp"], "کم") },

  // ------------------------------ مایل‌ستون ------------------------------
  { code: "MILESTONE_ADDED", category: "milestone", label: "ایجاد مایل‌ستون", sample: "مایل‌ستون «انتشار نسخه‌ی بتا» ایجاد شد.", en: "Milestone 'Beta Launch' was created.", api: "requested", trigger: "user", notify: r(["milestoneOwner", "team"], ["inapp"]) },
  { code: "MILESTONE_TITLE_UPDATED", category: "milestone", label: "تغییر عنوان مایل‌ستون", sample: "عنوان مایل‌ستون تغییر کرد.", en: "Milestone title was changed.", api: "requested", trigger: "user", notify: null },
  { code: "MILESTONE_ACHIEVED", category: "milestone", label: "تحقق مایل‌ستون", sample: "مایل‌ستون «انتشار نسخه‌ی بتا» به وضعیت «انجام‌شده» رسید.", en: "Milestone 'Beta Launch' status was changed to COMPLETED.", api: "requested", trigger: "user", notify: r(["team", "owner", "sponsor"], ["inapp", "email"]), why: "نقطه‌ی عطف برای کارفرما و اسپانسر گزارش‌شدنی است (معمولاً با پرداخت مرحله‌ای گره خورده)." },
  { code: "MILESTONE_STATUS_CHANGED", category: "milestone", label: "تغییر وضعیت مایل‌ستون", sample: "مایل‌ستون «انتشار نسخه‌ی بتا» «در خطر» شد.", api: "proposed", trigger: "user", notify: r(["milestoneOwner", "manager"], ["inapp"]) },
  { code: "MILESTONE_DUE_DATE_CHANGED", category: "milestone", label: "تغییر سررسید مایل‌ستون", sample: "سررسید مایل‌ستون تمدید شد.", api: "proposed", trigger: "user", notify: r(["team", "sponsor"], ["inapp", "email"], "مهم") },
  { code: "MILESTONE_AT_RISK", category: "milestone", label: "در خطر افتادن مایل‌ستون", sample: "مایل‌ستون «انتشار نسخه‌ی بتا» ۳ روز دیگر سررسید دارد و تسک‌های آن تمام نشده است.", api: "proposed", trigger: "system", notify: r(["milestoneOwner", "manager", "owner"], ["inapp", "email"], "مهم") },
  { code: "MILESTONE_DELETED", category: "milestone", label: "حذف مایل‌ستون", sample: "مایل‌ستون حذف شد.", api: "proposed", trigger: "user", notify: null },

  // ------------------------------ جلسه و صورت‌جلسه ------------------------------
  { code: "MEETING_SCHEDULED", category: "meeting", label: "ایجاد جلسه", sample: "جلسه‌ی «بازبینی اسپرینت» برای ۱۴۰۵/۰۳/۱۰ ساعت ۱۰:۰۰ تنظیم شد.", api: "proposed", trigger: "user", notify: r(["participants"], ["inapp", "email"]), why: "بند ۳۷ سند: «جلسه جدید ایجاد شد» — همراه با دعوت‌نامه‌ی تقویم." },
  { code: "MEETING_UPDATED", category: "meeting", label: "تغییر زمان/شرکت‌کنندگان جلسه", sample: "زمان جلسه‌ی «بازبینی اسپرینت» تغییر کرد.", api: "proposed", trigger: "user", notify: r(["participants"], ["inapp", "email"], "مهم") },
  { code: "MEETING_CANCELLED", category: "meeting", label: "لغو جلسه", sample: "جلسه‌ی «بازبینی اسپرینت» لغو شد.", api: "proposed", trigger: "user", notify: r(["participants"], ["inapp", "email", "sms"], "مهم") },
  { code: "MEETING_REMINDER", category: "meeting", label: "یادآوری جلسه", sample: "جلسه‌ی «بازبینی اسپرینت» فردا ساعت ۱۰:۰۰ برگزار می‌شود.", api: "proposed", trigger: "system", notify: r(["participants"], ["inapp", "push"]) },
  { code: "MEETING_HELD", category: "meeting", label: "برگزاری جلسه", sample: "جلسه‌ی «بازبینی اسپرینت» برگزار شد.", api: "proposed", trigger: "user", notify: null },
  { code: "MINUTES_PUBLISHED", category: "meeting", label: "انتشار صورت‌جلسه", sample: "صورت‌جلسه‌ی «بازبینی اسپرینت» با ۳ مصوبه منتشر شد.", api: "proposed", trigger: "user", notify: r(["participants", "manager"], ["inapp", "email"]), why: "بند ۳۷ سند: «صورت جلسه منتشر شد»." },
  { code: "ACTION_ITEM_CONVERTED", category: "meeting", label: "تبدیل مصوبه به تسک", sample: "مصوبه‌ی «تکمیل صفحه‌ی ورود» به تسک تبدیل شد.", api: "proposed", trigger: "user", notify: null, why: "خودِ تبدیل فقط ثبت می‌شود؛ مسئول با TASK_ASSIGNED مطلع می‌شود." },

  // ------------------------------ سند و ارتباطات ------------------------------
  { code: "DOCUMENT_UPLOADED", category: "document", label: "بارگذاری سند", sample: "سند «قرارداد پیمانکار.pdf» بارگذاری شد.", api: "proposed", trigger: "user", notify: r(["team"], ["inapp"], "کم") },
  { code: "DOCUMENT_DELETED", category: "document", label: "حذف سند", sample: "سند «قرارداد پیمانکار.pdf» حذف شد.", api: "proposed", trigger: "user", notify: null },
  { code: "ANNOUNCEMENT_POSTED", category: "communication", label: "انتشار اطلاعیه", sample: "اطلاعیه‌ی «جلسه‌ی پروژه فردا ساعت ۱۰» منتشر شد.", api: "proposed", trigger: "user", notify: r(["team"], ["inapp", "email", "push"], "مهم") },
  { code: "CHANNEL_CREATED", category: "communication", label: "ایجاد کانال", sample: "کانال «طراحی» ایجاد شد.", api: "proposed", trigger: "user", notify: r(["team"], ["inapp"], "کم") },

  // ------------------------------ Playbook ------------------------------
  { code: "PLAYBOOK_STARTED", category: "playbook", label: "شروع اجرای Playbook", sample: "اجرای قالب «آنبوردینگ» آغاز شد.", en: "Execution of Playbook 'Onboarding' was started.", api: "requested", trigger: "user", notify: r(["manager", "team"], ["inapp"]) },
  { code: "PLAYBOOK_STATUS_CHANGED", category: "playbook", label: "تغییر وضعیت اجرای Playbook", sample: "وضعیت اجرای «آنبوردینگ» به «تکمیل‌شده» تغییر کرد.", en: "Playbook 'Onboarding' execution status changed to COMPLETED.", api: "requested", trigger: "user", notify: r(["playbookStarter", "manager"], ["inapp"]) },
  { code: "PLAYBOOK_STEP_STATUS_CHANGED", category: "playbook", label: "تغییر وضعیت مرحله‌ی Playbook", sample: "مرحله‌ی «ساخت حساب‌ها» انجام‌شده علامت خورد.", en: "Playbook step 'Setup Accounts' was marked as DONE.", api: "requested", trigger: "user", notify: r(["playbookStarter"], ["inapp"], "کم") },

  // ------------------------------ خودکارسازی ------------------------------
  { code: "AUTOMATION_TRIGGERED", category: "automation", label: "اجرای قاعده‌ی خودکار", sample: "قاعده‌ی «Done ← تکمیل» روی تسک «تست» اجرا شد.", api: "proposed", trigger: "system", notify: null },
] as const satisfies readonly EventDef[];

export type EventCode = (typeof EVENT_CATALOG)[number]["code"];

export const eventByCode: Record<string, EventDef> = Object.fromEntries(EVENT_CATALOG.map((e) => [e.code, e as EventDef]));

export const categoryLabel: Record<EventCategory, string> = {
  project: "پروژه",
  member: "اعضا",
  task: "وظایف",
  dependency: "وابستگی",
  board: "بورد",
  expense: "هزینه",
  budget: "بودجه",
  risk: "ریسک",
  issue: "مشکلات",
  milestone: "مایل‌ستون",
  meeting: "جلسات",
  document: "اسناد",
  communication: "ارتباطات",
  time: "زمان کاری",
  playbook: "Playbook",
  automation: "خودکارسازی",
};

export const recipientLabel: Record<RecipientRole, string> = {
  owner: "مالک پروژه",
  manager: "مدیر پروژه",
  assignee: "مسئول تسک",
  previousAssignee: "مسئول قبلی",
  successorAssignees: "مسئولان تسک‌های وابسته",
  predecessorAssignees: "مسئولان پیش‌نیازها",
  team: "همه‌ی اعضای تیم",
  riskOwner: "مسئول ریسک",
  milestoneOwner: "مسئول مایل‌ستون",
  sponsor: "کارفرما / حامی مالی",
  finance: "مسئول مالی پروژه",
  participants: "شرکت‌کنندگان جلسه",
  mentioned: "فرد منشن‌شده",
  subjectMember: "خودِ عضو",
  playbookStarter: "آغازکننده‌ی Playbook",
  issueAssignee: "مسئول رفع مشکل",
  issueReporter: "گزارش‌دهنده‌ی مشکل",
  expenseCreator: "ثبت‌کننده‌ی هزینه",
};

export const channelLabel: Record<NotifChannel, string> = {
  inapp: "درون‌برنامه",
  email: "رایانامه",
  sms: "پیامک",
  push: "پوش موبایل",
};

export const apiStateLabel: Record<ApiState, string> = {
  implemented: "پیاده‌شده در API",
  requested: "در فهرست شما",
  proposed: "پیشنهاد جدید",
};
