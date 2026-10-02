// ---------------------------------------------------------------------------
// منابع داده‌ی گزارش‌ساز — هر منبع از استورهای واقعی برنامه خوانده می‌شود و
// فقط آنچه کاربرِ فعلی در کانتکستِ فعلی حق دیدنش را دارد تجمیع می‌کند:
//   پروژه‌ها ← filterScoped ، اسناد دانش ← filterScoped + canSee ،
//   محتوای اجتماعی ← canView ، پیام‌ها ← فقط گفتگوهایی که عضوشان است ،
//   اعضا/نقش‌ها ← واحدهای زیرمجموعه/بالادست + visibleUserIds.
//
// قاعده‌ی هوک‌ها: useSourceRows همه‌ی هوک‌های خانواده‌ها را بی‌قید و شرط صدا می‌زند
// و هر خانواده با switch روی شناسه‌ی منبع، فقط منبع خودش را محاسبه می‌کند.
// ---------------------------------------------------------------------------
import { useMemo, useSyncExternalStore } from "react";
import {
  KanbanSquare,
  ListChecks,
  Timer,
  Wallet,
  ShieldAlert,
  Flag,
  FileText,
  Lightbulb,
  Newspaper,
  Image,
  CalendarDays,
  UserCheck,
  MessagesSquare,
  MessageCircle,
  HeartHandshake,
  Users,
  KeyRound,
  Network,
  History,
  Rocket,
  FileSignature,
  FlaskConical,
  PiggyBank,
  Clock,
  LifeBuoy,
  HelpCircle,
} from "lucide-react";
import { useTenancy } from "../context/TenancyContext";
import { useProjectsPM } from "../context/ProjectsContext";
import { useKnowledge } from "../context/KnowledgeContext";
import { useSocial } from "../context/SocialContext";
import { users as allUsers, contracts, funds, researchOpportunities } from "../data/mock";
import { nfProjects, nfStages } from "../data/mockInnovationFund";
import { activeTasks, columnLabel, isDone, isOverdue, kindOf, paidTotal, committedTotal, budgetUsage, projectProgress, taskKey, taskLoggedHours } from "../pm/selectors";
import { dayNum, diffDays, parseRial, toEnDigits, weekDayNames, weekdayOf } from "../pm/jalali";
import { ancestorsOrSelf, descendantsOrSelf, bindingLive, isAdminRole, auditLabel, scopeTypeLabel, type IamState } from "../iam/model";
import { normDate } from "./engine";
import type { ColumnKind } from "../pm/types";
import type { DataSource, Field, ReportModule, Row } from "./types";

// ----------------------------------------------------------------- سازنده‌های فیلد

const dim = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, type: "dimension", kind: "string", ...extra });
const tags = (key: string, label: string): Field => ({ key, label, type: "dimension", kind: "string", multi: true });
const num = (key: string, label: string, format: Field["format"] = "number", extra: Partial<Field> = {}): Field => ({ key, label, type: "measure", kind: "number", format, ...extra });
const date = (key: string, label: string): Field => ({ key, label, type: "date", kind: "date" });
const flag = (key: string, label: string): Field => ({ key, label, type: "dimension", kind: "bool" });

const PRIORITY4 = ["بحرانی", "زیاد", "متوسط", "کم"];
const PRIORITY3 = ["زیاد", "متوسط", "کم"];
const KIND_SHORT: Record<ColumnKind, string> = { backlog: "بک‌لاگ", todo: "برای انجام", doing: "در حال انجام", review: "در بررسی", blocked: "متوقف", done: "انجام‌شده" };
const KIND_ORDER = Object.values(KIND_SHORT);
const WEEKDAYS = weekDayNames;

// ----------------------------------------------------------------- تعریف منابع

const STATIC_SOURCES: DataSource[] = [
  // ============================ پروژه‌ها
  {
    id: "projects.tasks",
    label: "وظایف (تسک‌ها)",
    module: "projects",
    icon: ListChecks,
    rowNoun: "تسک",
    description: "همه‌ی تسک‌های فعال پروژه‌هایی که می‌بینید، با وضعیت، مسئول، اسپرینت و ساعت‌ها",
    defaultDateField: "due",
    fields: [
      dim("project", "پروژه"),
      dim("projectGroup", "گروه پروژه"),
      dim("assignee", "مسئول"),
      dim("status", "ستون بورد"),
      dim("statusKind", "وضعیت", { order: KIND_ORDER }),
      dim("priority", "اولویت", { order: PRIORITY4 }),
      tags("labels", "برچسب"),
      dim("sprint", "اسپرینت"),
      dim("milestone", "نقطه‌ی عطف"),
      dim("approval", "وضعیت تأیید"),
      dim("recurrence", "تکرار"),
      dim("health", "سلامت پروژه", { order: ["سبز", "زرد", "قرمز"] }),
      flag("overdue", "عقب‌افتاده"),
      flag("done", "انجام‌شده"),
      flag("subtask", "زیرتسک"),
      num("storyPoints", "امتیاز داستانی"),
      num("estHours", "ساعت برآوردی", "hours"),
      num("loggedHours", "ساعت ثبت‌شده", "hours"),
      num("hoursVariance", "انحراف ساعت (ثبت − برآورد)", "hours"),
      num("estBudget", "بودجه‌ی برآوردی", "rial"),
      num("progress", "پیشرفت", "percent"),
      num("daysLate", "روز تأخیر"),
      date("due", "سررسید"),
      date("start", "تاریخ شروع"),
      date("createdAt", "تاریخ ایجاد"),
    ],
  },
  {
    id: "projects.projects",
    label: "پروژه‌ها",
    module: "projects",
    icon: KanbanSquare,
    rowNoun: "پروژه",
    description: "شناسنامه، سلامت، بودجه و پیشرفت هر پروژه",
    defaultDateField: "deadline",
    fields: [
      dim("name", "پروژه"),
      dim("manager", "مدیر پروژه"),
      dim("health", "سلامت", { order: ["سبز", "زرد", "قرمز"] }),
      dim("priority", "اولویت", { order: PRIORITY3 }),
      dim("phase", "فاز", { order: ["برنامه‌ریزی", "اجرا", "نظارت", "بررسی", "تکمیل", "اختتام"] }),
      dim("category", "دسته"),
      dim("group", "گروه (پورتفولیو)"),
      dim("owner", "واحد مالک"),
      dim("client", "کارفرما"),
      flag("archived", "بایگانی‌شده"),
      flag("late", "عبور از مهلت"),
      num("progress", "پیشرفت", "percent"),
      num("budget", "بودجه‌ی کل", "rial"),
      num("paid", "هزینه‌ی پرداخت‌شده", "rial"),
      num("committed", "هزینه‌ی تعهدشده", "rial"),
      num("remaining", "مانده‌ی بودجه", "rial"),
      num("usage", "درصد مصرف بودجه", "percent"),
      num("tasks", "تعداد تسک"),
      num("openTasks", "تسک باز"),
      num("overdueTasks", "تسک عقب‌افتاده"),
      num("members", "تعداد اعضا"),
      num("estHours", "ساعت برآوردی", "hours"),
      num("loggedHours", "ساعت ثبت‌شده", "hours"),
      num("openRisks", "ریسک باز"),
      date("deadline", "مهلت پایان"),
      date("start", "تاریخ شروع"),
      date("createdAt", "تاریخ ایجاد"),
    ],
  },
  {
    id: "projects.timeLogs",
    label: "ساعات ثبت‌شده (تایم‌شیت پروژه)",
    module: "projects",
    alsoIn: ["timesheet"],
    icon: Timer,
    rowNoun: "ثبت زمان",
    description: "هر ردیف یک ثبت زمان روی یک تسک",
    defaultDateField: "date",
    fields: [
      dim("member", "فرد"),
      dim("project", "پروژه"),
      dim("projectGroup", "گروه پروژه"),
      dim("task", "تسک"),
      tags("labels", "برچسب تسک"),
      dim("weekday", "روز هفته", { order: WEEKDAYS }),
      num("hours", "ساعت", "hours"),
      date("date", "تاریخ"),
    ],
  },
  {
    id: "projects.expenses",
    label: "هزینه‌ها",
    module: "projects",
    icon: Wallet,
    rowNoun: "هزینه",
    defaultDateField: "date",
    fields: [
      dim("project", "پروژه"),
      dim("category", "سرفصل"),
      dim("status", "وضعیت", { order: ["برنامه‌ریزی‌شده", "در انتظار تأیید", "تأییدشده", "پرداخت‌شده"] }),
      dim("createdBy", "ثبت‌کننده"),
      dim("task", "تسک مرتبط"),
      num("amount", "مبلغ", "rial"),
      date("date", "تاریخ"),
    ],
  },
  {
    id: "projects.risks",
    label: "ریسک‌ها",
    module: "projects",
    icon: ShieldAlert,
    rowNoun: "ریسک",
    fields: [
      dim("project", "پروژه"),
      dim("severity", "شدت", { order: ["بحرانی", "متوسط", "کم"] }),
      dim("probability", "احتمال", { order: PRIORITY3 }),
      dim("impact", "اثر", { order: PRIORITY3 }),
      dim("status", "وضعیت", { order: ["باز", "در حال رفع", "بسته"] }),
      dim("owner", "مالک ریسک"),
      flag("open", "باز"),
      num("score", "امتیاز ریسک (احتمال × اثر)"),
    ],
  },
  {
    id: "projects.milestones",
    label: "نقاط عطف",
    module: "projects",
    icon: Flag,
    rowNoun: "نقطه‌ی عطف",
    defaultDateField: "due",
    fields: [
      dim("title", "نقطه‌ی عطف"),
      dim("project", "پروژه"),
      dim("status", "وضعیت", { order: ["انجام‌شده", "در حال انجام", "پیش‌رو", "در خطر"] }),
      dim("owner", "مسئول"),
      flag("late", "عقب‌افتاده"),
      num("tasks", "تعداد تسک"),
      num("doneTasks", "تسک انجام‌شده"),
      num("completion", "درصد تکمیل", "percent"),
      date("due", "سررسید"),
    ],
  },

  // ============================ دانش
  {
    id: "knowledge.docs",
    label: "اسناد دانشی",
    module: "knowledge",
    icon: FileText,
    rowNoun: "سند",
    description: "اسنادی که با سطح دسترسی شما قابل مشاهده‌اند",
    defaultDateField: "createdAt",
    fields: [
      dim("title", "سند"),
      dim("type", "نوع سند"),
      dim("category", "دسته"),
      dim("rootCategory", "حوزه‌ی اصلی"),
      dim("status", "وضعیت", { order: ["پیش‌نویس", "در بررسی", "ارجاع برای اصلاح", "تأییدشده", "منتشرشده", "آرشیو"] }),
      dim("access", "سطح دسترسی", { order: ["عمومی", "داخلی", "محرمانه", "خیلی محرمانه"] }),
      dim("importance", "اهمیت", { order: ["حیاتی", "مهم", "عادی"] }),
      dim("owner", "مالک"),
      dim("author", "نویسنده"),
      dim("unit", "واحد"),
      tags("tags", "برچسب"),
      flag("reviewDue", "نیازمند بازبینی"),
      num("views", "بازدید"),
      num("downloads", "دانلود"),
      num("rating", "امتیاز (میانگین)"),
      num("ratingCount", "تعداد امتیاز"),
      num("helpful", "مفید بودن", "percent"),
      num("comments", "نظر"),
      num("followers", "دنبال‌کننده"),
      num("version", "نسخه"),
      date("createdAt", "تاریخ ایجاد"),
      date("updatedAt", "آخرین ویرایش"),
      date("reviewDate", "موعد بازبینی"),
    ],
  },
  {
    id: "knowledge.experiences",
    label: "تجربیات و درس‌آموخته‌ها",
    module: "knowledge",
    icon: Lightbulb,
    rowNoun: "تجربه",
    defaultDateField: "date",
    fields: [
      dim("kind", "نوع"),
      dim("status", "وضعیت", { order: ["پیش‌نویس", "در بررسی", "منتشرشده"] }),
      dim("author", "نویسنده"),
      dim("unit", "واحد"),
      tags("tags", "برچسب"),
      num("helpful", "مفید بود"),
      num("comments", "نظر"),
      date("date", "تاریخ"),
    ],
  },

  // ============================ محتوا و شبکه‌ی اجتماعی
  {
    id: "social.content",
    label: "محتوا (وبلاگ، اخبار، مجله)",
    module: "content",
    alsoIn: ["social"],
    icon: Newspaper,
    rowNoun: "محتوا",
    defaultDateField: "createdAt",
    fields: [
      dim("kind", "نوع محتوا", { order: ["وبلاگ", "خبر", "مجله"] }),
      dim("title", "عنوان"),
      dim("author", "نویسنده"),
      dim("status", "وضعیت", { order: ["منتشرشده", "منتشرنشده", "پیش‌نویس"] }),
      dim("privacy", "حریم انتشار"),
      tags("categories", "دسته"),
      tags("tags", "برچسب"),
      flag("published", "منتشرشده"),
      num("views", "بازدید"),
      num("comments", "نظر"),
      num("reactions", "واکنش"),
      num("engagement", "تعامل (نظر + واکنش)"),
      num("attachments", "پیوست"),
      date("createdAt", "تاریخ ایجاد"),
      date("publishedAt", "تاریخ انتشار"),
    ],
  },
  {
    id: "social.media",
    label: "رسانه (تصویر و ویدیو)",
    module: "content",
    alsoIn: ["social"],
    icon: Image,
    rowNoun: "پست رسانه",
    defaultDateField: "createdAt",
    fields: [
      dim("postType", "نوع", { order: ["تصویر", "ویدیو", "آلبوم"] }),
      dim("author", "منتشرکننده"),
      dim("status", "وضعیت"),
      tags("categories", "دسته"),
      tags("tags", "برچسب"),
      num("comments", "نظر"),
      num("reactions", "واکنش"),
      num("engagement", "تعامل (نظر + واکنش)"),
      date("createdAt", "تاریخ ایجاد"),
    ],
  },
  {
    id: "social.topics",
    label: "پرسش و پاسخ",
    module: "social",
    alsoIn: ["content"],
    icon: HelpCircle,
    rowNoun: "پرسش",
    defaultDateField: "createdAt",
    fields: [
      dim("title", "پرسش"),
      dim("author", "پرسشگر"),
      tags("categories", "دسته"),
      tags("tags", "برچسب"),
      flag("answered", "پاسخ‌داده‌شده"),
      flag("pinned", "سنجاق‌شده"),
      flag("locked", "قفل‌شده"),
      num("views", "بازدید"),
      num("answers", "پاسخ"),
      num("reactions", "واکنش"),
      date("createdAt", "تاریخ طرح"),
    ],
  },
  {
    id: "social.answers",
    label: "پاسخ‌های پرسش و پاسخ",
    module: "social",
    icon: MessageCircle,
    rowNoun: "پاسخ",
    defaultDateField: "createdAt",
    fields: [dim("topic", "پرسش"), dim("author", "پاسخ‌دهنده"), flag("reply", "پاسخ به پاسخ"), num("attachments", "پیوست"), date("createdAt", "تاریخ")],
  },
  {
    id: "social.messages",
    label: "پیام‌ها",
    module: "social",
    icon: MessagesSquare,
    rowNoun: "پیام",
    description: "فقط پیام‌های گفتگوهایی که عضوشان هستید",
    defaultDateField: "date",
    fields: [
      dim("chatType", "نوع گفتگو", { order: ["گفتگوی خصوصی", "گروه", "کانال", "ربات", "پیام‌های ذخیره‌شده"] }),
      dim("chat", "گفتگو"),
      dim("sender", "فرستنده"),
      dim("type", "نوع پیام"),
      dim("weekday", "روز هفته", { order: WEEKDAYS }),
      dim("hour", "ساعت روز"),
      flag("hasFile", "دارای پیوست"),
      flag("forwarded", "بازارسال‌شده"),
      flag("edited", "ویرایش‌شده"),
      date("date", "تاریخ"),
    ],
  },
  {
    id: "social.friendships",
    label: "ارتباطات (دوستی‌ها)",
    module: "social",
    icon: HeartHandshake,
    rowNoun: "ارتباط",
    defaultDateField: "date",
    fields: [dim("status", "وضعیت", { order: ["پذیرفته", "در انتظار", "ردشده", "مسدود"] }), dim("sender", "درخواست‌دهنده"), dim("receiver", "گیرنده"), date("date", "تاریخ")],
  },

  // ============================ رویدادها
  {
    id: "social.events",
    label: "رویدادها و جلسات",
    module: "events",
    alsoIn: ["social"],
    icon: CalendarDays,
    rowNoun: "رویداد",
    defaultDateField: "startDate",
    fields: [
      dim("title", "رویداد"),
      dim("organizer", "برگزارکننده"),
      dim("mode", "نحوه‌ی برگزاری", { order: ["حضوری", "مجازی"] }),
      dim("location", "مکان"),
      dim("timing", "زمان", { order: ["پیش‌رو", "برگزارشده"] }),
      dim("weekday", "روز هفته", { order: WEEKDAYS }),
      tags("categories", "دسته"),
      flag("repeat", "تکرارشونده"),
      flag("published", "منتشرشده"),
      num("capacity", "ظرفیت"),
      num("participants", "شرکت‌کننده"),
      num("invited", "دعوت‌شده‌ی بی‌پاسخ"),
      num("declined", "رد دعوت"),
      num("fillRate", "درصد پرشدن ظرفیت", "percent"),
      num("engagement", "تعامل (نظر + واکنش)"),
      date("startDate", "تاریخ برگزاری"),
    ],
  },
  {
    id: "social.eventMembers",
    label: "شرکت‌کنندگان رویدادها",
    module: "events",
    icon: UserCheck,
    rowNoun: "حضور",
    defaultDateField: "eventDate",
    fields: [
      dim("event", "رویداد"),
      dim("user", "فرد"),
      dim("status", "وضعیت پاسخ", { order: ["حاضرشده", "پذیرفته", "دعوت‌شده", "رد کرده"] }),
      dim("role", "نقش", { order: ["مالک", "برگزارکننده", "عضو"] }),
      dim("mode", "نحوه‌ی برگزاری"),
      flag("attending", "شرکت می‌کند"),
      date("eventDate", "تاریخ رویداد"),
      date("date", "تاریخ دعوت/ثبت"),
    ],
  },

  // ============================ اعضا و دسترسی
  {
    id: "members.memberships",
    label: "عضویت‌ها",
    module: "members",
    icon: Users,
    rowNoun: "عضویت",
    description: "عضویت اعضا در واحدهای قابل مشاهده‌ی شما",
    defaultDateField: "createdAt",
    fields: [
      dim("user", "عضو"),
      dim("userTitle", "سمت"),
      dim("scope", "واحد"),
      dim("scopeType", "نوع واحد", { order: ["سیستم", "هلدینگ", "شرکت", "واحد"] }),
      dim("holding", "هلدینگ"),
      dim("company", "شرکت"),
      dim("status", "وضعیت", { order: ["فعال", "معلق"] }),
      flag("primary", "عضویت اصلی"),
      date("createdAt", "تاریخ عضویت"),
    ],
  },
  {
    id: "members.bindings",
    label: "تخصیص نقش‌ها",
    module: "members",
    icon: KeyRound,
    rowNoun: "تخصیص",
    defaultDateField: "createdAt",
    fields: [
      dim("user", "کاربر"),
      dim("role", "نقش"),
      dim("scope", "واحد"),
      dim("scopeType", "نوع واحد", { order: ["سیستم", "هلدینگ", "شرکت", "واحد"] }),
      dim("holding", "هلدینگ"),
      dim("status", "وضعیت", { order: ["معتبر", "آینده", "منقضی", "لغوشده"] }),
      dim("createdBy", "تخصیص‌دهنده"),
      flag("adminRole", "نقش مدیریتی"),
      flag("builtIn", "نقش پایه"),
      flag("expiringSoon", "انقضا تا ۳۰ روز"),
      num("permissions", "تعداد مجوز نقش"),
      date("createdAt", "تاریخ تخصیص"),
      date("validUntil", "پایان اعتبار"),
    ],
  },
  {
    id: "members.scopes",
    label: "واحدهای سازمانی",
    module: "members",
    icon: Network,
    rowNoun: "واحد",
    defaultDateField: "createdAt",
    fields: [
      dim("name", "واحد"),
      dim("type", "نوع", { order: ["سیستم", "هلدینگ", "شرکت", "واحد"] }),
      dim("parent", "واحد بالادست"),
      dim("holding", "هلدینگ"),
      flag("active", "فعال"),
      num("members", "عضو مستقیم"),
      num("membersTotal", "عضو با زیرمجموعه"),
      num("bindings", "تخصیص نقش معتبر"),
      date("createdAt", "تاریخ ایجاد"),
    ],
  },
  {
    id: "members.audits",
    label: "تاریخچه‌ی ممیزی دسترسی",
    module: "members",
    icon: History,
    rowNoun: "رویداد ممیزی",
    defaultDateField: "date",
    fields: [dim("event", "رویداد"), dim("actor", "انجام‌دهنده"), dim("scope", "واحد"), dim("targetType", "نوع موضوع"), dim("affected", "کاربر متأثر"), date("date", "تاریخ")],
  },

  // ============================ نوآوری
  {
    id: "innovation.nf",
    label: "طرح‌های صندوق نوآور",
    module: "innovation",
    icon: Rocket,
    rowNoun: "طرح",
    fields: [
      dim("title", "طرح"),
      dim("macroField", "کلان‌محور"),
      dim("field", "زمینه"),
      dim("motherProject", "رویداد/فراخوان مادر"),
      dim("teamType", "نوع مجری"),
      dim("city", "شهر"),
      dim("stage", "مرحله", { order: [...nfStages] }),
      flag("greenPath", "مسیر سبز"),
      num("progress", "پیشرفت", "percent"),
      num("budget", "مبلغ قرارداد", "rial"),
      num("paid", "پرداخت‌شده", "rial"),
      num("pending", "در انتظار پرداخت", "rial"),
      num("remaining", "باقی‌مانده", "rial"),
      num("share", "سهم بنیاد", "percent"),
      num("duration", "مدت (ماه)"),
      num("reports", "گزارش‌ها"),
      num("pendingReports", "گزارش تأییدنشده"),
      num("lateReports", "گزارش با تأخیر بررسی"),
    ],
  },
  {
    id: "innovation.contracts",
    label: "قراردادهای فناورانه",
    module: "innovation",
    icon: FileSignature,
    rowNoun: "قرارداد",
    defaultDateField: "deadline",
    fields: [
      dim("title", "قرارداد"),
      dim("vendor", "طرف قرارداد"),
      dim("stage", "مرحله", { order: ["مذاکره", "فراخوان", "داوری", "در حال اجرا", "تسویه‌شده"] }),
      dim("owner", "مسئول"),
      num("value", "ارزش", "rial"),
      date("deadline", "مهلت"),
    ],
  },
  {
    id: "innovation.research",
    label: "فرصت‌های پژوهشی",
    module: "innovation",
    icon: FlaskConical,
    rowNoun: "فراخوان",
    defaultDateField: "deadline",
    fields: [
      dim("title", "فراخوان"),
      dim("field", "حوزه"),
      dim("stage", "مرحله", { order: ["فراخوان باز", "بررسی درخواست‌ها", "داوری", "در حال اجرا", "پایان‌یافته"] }),
      num("applicants", "متقاضی"),
      date("deadline", "مهلت"),
    ],
  },
  {
    id: "innovation.funds",
    label: "طرح‌های صندوق اشتغال",
    module: "innovation",
    icon: PiggyBank,
    rowNoun: "طرح",
    fields: [
      dim("title", "طرح"),
      dim("applicant", "متقاضی"),
      dim("stage", "مرحله", { order: ["ثبت‌شده", "انتخاب اولیه", "داوری", "تخصیص‌یافته", "در حال پایش"] }),
      num("amount", "مبلغ", "rial"),
      num("roi", "بازده", "percent"),
    ],
  },

  // ============================ منابعِ در حال ساخت (استورشان بعداً وصل می‌شود)
  {
    id: "timesheet.entries",
    label: "کارکرد روزانه (حضور و غیاب)",
    module: "timesheet",
    icon: Clock,
    rowNoun: "روز کاری",
    placeholder: true,
    defaultDateField: "date",
    fields: [
      dim("user", "فرد"),
      dim("project", "پروژه/فعالیت"),
      dim("activity", "نوع کارکرد"),
      dim("status", "وضعیت تأیید"),
      num("hours", "ساعت کارکرد", "hours"),
      num("overtime", "اضافه‌کار", "hours"),
      date("date", "تاریخ"),
    ],
  },
  {
    id: "tickets.tickets",
    label: "تیکت‌های پشتیبانی",
    module: "tickets",
    icon: LifeBuoy,
    rowNoun: "تیکت",
    placeholder: true,
    defaultDateField: "createdAt",
    fields: [
      dim("subject", "موضوع"),
      dim("status", "وضعیت"),
      dim("priority", "اولویت", { order: PRIORITY4 }),
      dim("category", "دسته"),
      dim("assignee", "کارشناس"),
      dim("requester", "درخواست‌کننده"),
      flag("slaBreached", "نقض SLA"),
      num("resolutionHours", "زمان حل", "hours"),
      num("satisfaction", "رضایت (از ۵)"),
      date("createdAt", "تاریخ ثبت"),
      date("closedAt", "تاریخ بستن"),
    ],
  },
];

// ----------------------------------------------------------------- منابع بیرونی (اتصال بعدی)
// ماژول‌هایی که هم‌زمان ساخته می‌شوند (کارکرد، تیکت) بدون import متقابل وصل می‌شوند:
//   registerSource({...})               — تعریف/جایگزینی منبع
//   publishSourceRows("tickets.tickets", rows) — انتشار ردیف‌ها (مثلاً در useEffect استورشان)

const extDefs = new Map<string, DataSource>();
const extRows = new Map<string, Row[]>();
let extVersion = 0;
const listeners = new Set<() => void>();
const bump = () => {
  extVersion++;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function registerSource(def: DataSource) {
  extDefs.set(def.id, { ...def, placeholder: false });
  bump();
}
export function publishSourceRows(sourceId: string, rows: Row[]) {
  extRows.set(sourceId, rows);
  bump();
}

function useExtVersion() {
  return useSyncExternalStore(subscribe, () => extVersion, () => extVersion);
}

export function allSources(): DataSource[] {
  const merged = STATIC_SOURCES.map((s) => extDefs.get(s.id) ?? s);
  extDefs.forEach((d) => !STATIC_SOURCES.some((s) => s.id === d.id) && merged.push(d));
  return merged;
}
export const getSource = (id: string) => allSources().find((s) => s.id === id);
export const sourcesFor = (module: ReportModule) => allSources().filter((s) => s.module === module || s.alsoIn?.includes(module));

/** فهرست منابع با واکنش به ثبت منابع بیرونی */
export function useSources(module?: ReportModule): DataSource[] {
  const v = useExtVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (module ? sourcesFor(module) : allSources()), [module, v]);
}

// ----------------------------------------------------------------- پیوند ردیف به رکورد (drill-down)

const str = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : undefined);
const q = (v: unknown) => encodeURIComponent(String(v));
const CONTENT_PATH: Record<string, string> = { وبلاگ: "blog", خبر: "news", مجله: "magazines" };
const INNOV_LINK: Record<string, (id: string, r: Row) => string> = {
  research: (id) => `/dashboard/research?open=${q(id)}`,
  contracts: (id) => `/dashboard/contracts?open=${q(id)}`,
  funds: (id) => `/dashboard/funds?focus=${q(id)}`,
  nf: (id) => `/dashboard/funds?focus=${q(id)}`,
  employment: (id) => `/dashboard/funds?tab=employment&focus=${q(id)}`,
  award: () => `/dashboard/award`,
  training: () => `/dashboard/training`,
  ecosystem: (id) => `/dashboard/research?tab=bank&entity=${q(id)}`,
};

/** پیوندهای پیش‌فرض منابع اصلی — وقتی خود منبع `link` ندارد (مثلاً منابعی که بیرونی ثبت می‌شوند) */
const DEFAULT_LINKS: Record<string, (r: Row) => string | undefined> = {
  "projects.tasks": (r) => (str(r.pid) ? `/dashboard/projects/${q(r.pid)}?tab=board&focus=${q(str(r.key) ?? str(r.id) ?? "")}` : undefined),
  "projects.projects": (r) => (str(r.pid ?? r.id) ? `/dashboard/projects/${q(r.pid ?? r.id)}` : undefined),
  "projects.timeLogs": (r) => (str(r.pid) ? `/dashboard/projects/${q(r.pid)}?tab=time` : undefined),
  "projects.expenses": (r) => (str(r.pid) ? `/dashboard/projects/${q(r.pid)}?tab=budget` : undefined),
  "projects.risks": (r) => (str(r.pid) ? `/dashboard/projects/${q(r.pid)}?tab=risks&focus=${q(r.id)}` : undefined),
  "projects.milestones": (r) => (str(r.pid) ? `/dashboard/projects/${q(r.pid)}?tab=milestones&focus=${q(r.id)}` : undefined),
  "knowledge.docs": (r) => (str(r.id) ? `/dashboard/knowledge?doc=${q(r.id)}` : undefined),
  "knowledge.experiences": () => `/dashboard/knowledge?tab=experiences`,
  "social.content": (r) => (str(r.id) && CONTENT_PATH[String(r.kind)] ? `/dashboard/${CONTENT_PATH[String(r.kind)]}/${q(r.id)}` : undefined),
  "social.media": (r) => (str(r.id) ? `/dashboard/media/${q(r.id)}` : undefined),
  "social.topics": (r) => (str(r.id) ? `/dashboard/forum/${q(r.id)}` : undefined),
  "social.events": (r) => (str(r.id) ? `/dashboard/events/${q(r.id)}` : undefined),
  "social.messages": () => `/dashboard/chat`,
  "members.memberships": (r) => (str(r.uid) ? `/dashboard/profile/${q(r.uid)}` : undefined),
  "members.bindings": (r) => (str(r.uid) ? `/dashboard/profile/${q(r.uid)}` : undefined),
  "members.scopes": () => `/dashboard/settings?section=structure`,
  "members.audits": () => `/dashboard/settings?section=audit`,
  "innovation.nf": (r) => (str(r.id) ? INNOV_LINK.nf(String(r.id), r) : undefined),
  "innovation.contracts": (r) => (str(r.id) ? INNOV_LINK.contracts(String(r.id), r) : undefined),
  "innovation.research": (r) => (str(r.id) ? INNOV_LINK.research(String(r.id), r) : undefined),
  "innovation.funds": (r) => (str(r.id) ? INNOV_LINK.employment(String(r.id), r) : undefined),
  "innovation.entities": (r) => (str(r.id) ? INNOV_LINK.ecosystem(String(r.id), r) : undefined),
  "innovation.decisions": (r) => (str(r.subjectId) && INNOV_LINK[String(r.mod)] ? INNOV_LINK[String(r.mod)](String(r.subjectId), r) : undefined),
  "innovation.outcomes": (r) => (str(r.subjectId) && INNOV_LINK[String(r.mod)] ? INNOV_LINK[String(r.mod)](String(r.subjectId), r) : undefined),
  "innovation.allocations": (r) => (str(r.id) && INNOV_LINK[String(r.mod)] ? INNOV_LINK[String(r.mod)](String(r.id), r) : undefined),
  "tickets.tickets": (r) => (str(r.id) ? `/dashboard/tickets?id=${q(r.id)}` : undefined),
  "timesheet.entries": () => `/dashboard/activity`,
};

/** پیوند یک ردیف به رکورد اصلی‌اش (یا undefined) */
export function rowLink(source: DataSource | undefined, row: Row): string | undefined {
  if (!source) return undefined;
  try {
    return source.link?.(row) ?? DEFAULT_LINKS[source.id]?.(row);
  } catch {
    return undefined;
  }
}
export const hasRowLinks = (source?: DataSource) => !!source && (!!source.link || !!DEFAULT_LINKS[source.id]);

// ----------------------------------------------------------------- کمکی‌ها

const userName = (id?: string | null) => (id ? allUsers.find((u) => u.id === id)?.name ?? id : "");
const userTitle = (id: string) => allUsers.find((u) => u.id === id)?.role ?? "";
/** «۲٬۵۰۰ میلیون ریال» → 2500000000 */
const money = (s: string) => {
  const t = toEnDigits(s);
  const n = parseFloat(t.replace(/[^\d.]/g, "")) || 0;
  return t.includes("میلیارد") ? n * 1e9 : t.includes("میلیون") ? n * 1e6 : parseRial(s);
};
const pct = (s: string) => parseFloat(toEnDigits(s).replace(/[^\d.]/g, "")) || 0;
const weekdayName = (d: string | null) => (d ? WEEKDAYS[weekdayOf(d)] : "");
const clockHour = (s: string) => {
  const m = toEnDigits(s).match(/\s(\d{1,2}):/);
  return m ? `${Number(m[1]).toLocaleString("fa-IR")}:۰۰` : "";
};

// ----------------------------------------------------------------- خانواده: پروژه‌ها

function useProjectRows(id: string): Row[] | null {
  const pm = useProjectsPM();
  const { filterScoped, ownerLabel } = useTenancy();
  return useMemo(() => {
    if (!id.startsWith("projects.")) return null;
    const ref = pm.refDate;
    const visible = filterScoped(pm.projects.map((p) => ({ ...p.meta, _p: p }))).map((x) => x._p);
    const groupName = (gid?: string) => pm.store.groups.find((g) => g.id === gid)?.name ?? "بدون گروه";
    switch (id) {
      case "projects.tasks":
        return visible.flatMap((p) =>
          activeTasks(p).map((t) => {
            const overdue = isOverdue(p, t, ref);
            const logged = taskLoggedHours(p, t.id);
            return {
              id: t.id,
              pid: p.meta.id,
              key: taskKey(t),
              title: t.title,
              project: p.meta.name,
              projectGroup: groupName(p.meta.groupId),
              assignee: t.assignee,
              status: columnLabel(p, t.status),
              statusKind: KIND_SHORT[kindOf(p, t.status)],
              priority: t.priority,
              labels: t.labels,
              sprint: p.sprints?.find((s) => s.id === t.sprintId)?.name ?? "",
              milestone: p.milestones.find((m) => m.id === t.milestoneId)?.title ?? "",
              approval: t.approval?.status ?? "",
              recurrence: t.recurrence ?? "",
              health: p.meta.health,
              overdue,
              done: isDone(p, t),
              subtask: !!t.parentId,
              storyPoints: t.storyPoints ?? null,
              estHours: t.estHours,
              loggedHours: logged,
              hoursVariance: logged - (t.estHours || 0),
              estBudget: t.estBudget,
              progress: t.progress,
              daysLate: overdue ? Math.max(0, diffDays(t.due, ref)) : 0,
              due: normDate(t.due),
              start: normDate(t.start),
              createdAt: normDate(t.createdAt),
            } satisfies Row;
          })
        );
      case "projects.projects":
        return visible.map((p) => {
          const ts = activeTasks(p);
          const paid = paidTotal(p);
          const dl = dayNum(p.meta.deadline);
          const r = dayNum(ref);
          return {
            id: p.meta.id,
            pid: p.meta.id,
            name: p.meta.name,
            manager: p.meta.manager,
            health: p.meta.health,
            priority: p.meta.priority,
            phase: p.meta.phase,
            category: p.meta.category,
            group: groupName(p.meta.groupId),
            owner: ownerLabel(p.meta),
            client: p.meta.client,
            archived: p.meta.archived,
            late: dl !== null && r !== null && dl < r && !["تکمیل", "اختتام"].includes(p.meta.phase),
            progress: projectProgress(p),
            budget: p.budget.total,
            paid,
            committed: committedTotal(p),
            remaining: p.budget.total - paid,
            usage: budgetUsage(p),
            tasks: ts.length,
            openTasks: ts.filter((t) => !isDone(p, t)).length,
            overdueTasks: ts.filter((t) => isOverdue(p, t, ref)).length,
            members: p.members.length,
            estHours: ts.reduce((s, t) => s + (t.estHours || 0), 0),
            loggedHours: p.timeLogs.reduce((s, l) => s + l.hours, 0),
            openRisks: p.risks.filter((x) => x.status !== "بسته").length,
            deadline: normDate(p.meta.deadline),
            start: normDate(p.meta.start),
            createdAt: normDate(p.meta.createdAt),
          } satisfies Row;
        });
      case "projects.timeLogs":
        return visible.flatMap((p) =>
          p.timeLogs.map((l) => {
            const t = p.tasks.find((x) => x.id === l.taskId);
            const d = normDate(l.date);
            return { id: l.id, pid: p.meta.id, member: l.member, project: p.meta.name, projectGroup: groupName(p.meta.groupId), task: t?.title ?? "—", labels: t?.labels ?? [], weekday: weekdayName(d), hours: l.hours, date: d } satisfies Row;
          })
        );
      case "projects.expenses":
        return visible.flatMap((p) =>
          p.expenses.map((e) => ({
            id: e.id,
            pid: p.meta.id,
            project: p.meta.name,
            category: e.category,
            status: e.status,
            createdBy: e.createdBy,
            task: p.tasks.find((t) => t.id === e.taskId)?.title ?? "",
            amount: e.amount,
            date: normDate(e.date),
          }))
        );
      case "projects.risks": {
        const lvl = (x: string) => (x === "زیاد" ? 3 : x === "متوسط" ? 2 : 1);
        return visible.flatMap((p) =>
          p.risks.map((r) => ({ id: r.id, pid: p.meta.id, project: p.meta.name, severity: r.severity, probability: r.probability, impact: r.impact, status: r.status, owner: r.owner, open: r.status !== "بسته", score: lvl(r.probability) * lvl(r.impact) }))
        );
      }
      case "projects.milestones": {
        const r = dayNum(ref) ?? 0;
        return visible.flatMap((p) =>
          p.milestones.map((m) => {
            const ts = p.tasks.filter((t) => m.taskIds.includes(t.id) || t.milestoneId === m.id);
            const done = ts.filter((t) => isDone(p, t)).length;
            const due = dayNum(m.due);
            return {
              id: m.id,
              pid: p.meta.id,
              title: m.title,
              project: p.meta.name,
              status: m.status,
              owner: m.owner,
              late: m.status !== "انجام‌شده" && due !== null && due < r,
              tasks: ts.length,
              doneTasks: done,
              completion: ts.length ? Math.round((done / ts.length) * 100) : m.status === "انجام‌شده" ? 100 : 0,
              due: normDate(m.due),
            } satisfies Row;
          })
        );
      }
    }
    return [];
  }, [id, pm.projects, pm.refDate, pm.store.groups, filterScoped, ownerLabel]);
}

// ----------------------------------------------------------------- خانواده: دانش

function useKnowledgeRows(id: string, today: string): Row[] | null {
  const km = useKnowledge();
  const { filterScoped } = useTenancy();
  return useMemo(() => {
    if (!id.startsWith("knowledge.")) return null;
    const t = dayNum(today) ?? 0;
    if (id === "knowledge.docs") {
      const root = (cid: string) => {
        let c = km.categories.find((x) => x.id === cid);
        for (let i = 0; c?.parentId && i < 10; i++) c = km.categories.find((x) => x.id === c!.parentId) ?? c;
        return c?.name ?? "—";
      };
      return filterScoped(km.docs)
        .filter(km.canSee)
        .map((d) => {
          const rd = dayNum(d.reviewDate);
          const fb = d.feedback.length;
          return {
            id: d.id,
            title: d.title,
            type: d.type,
            category: km.categoryName(d.categoryId),
            rootCategory: root(d.categoryId),
            status: d.status,
            access: d.access,
            importance: d.importance,
            owner: d.owner,
            author: d.author,
            unit: d.unit,
            tags: d.tags,
            reviewDue: d.status === "منتشرشده" && rd !== null && rd < t,
            views: d.views,
            downloads: d.downloads,
            rating: d.ratings.length ? Math.round((d.ratings.reduce((s, r) => s + r.score, 0) / d.ratings.length) * 10) / 10 : null,
            ratingCount: d.ratings.length,
            helpful: fb ? Math.round((d.feedback.filter((f) => f.helpful).length / fb) * 100) : null,
            comments: d.comments.length,
            followers: d.followers.length,
            version: d.version,
            createdAt: normDate(d.createdAt),
            updatedAt: normDate(d.updatedAt),
            reviewDate: normDate(d.reviewDate),
          } satisfies Row;
        });
    }
    if (id === "knowledge.experiences")
      return km.experiences
        .filter((e) => e.status === "منتشرشده" || e.author === km.me)
        .map((e) => ({ id: e.id, kind: e.kind, status: e.status, author: e.author, unit: e.unit, tags: e.tags, helpful: e.helpful, comments: e.comments.length, date: normDate(e.date) }));
    return [];
  }, [id, km, filterScoped, today]);
}

// ----------------------------------------------------------------- خانواده: شبکه‌ی اجتماعی

const CONTENT_KIND = { blogs: "وبلاگ", news: "خبر", magazines: "مجله" } as const;
const CONTENT_ENTITY = { blogs: "blog", news: "news", magazines: "magazine" } as const;
const PRIVACY = { ME: "فقط خودم", FRIENDS: "دوستان", EVERYONE: "همه" } as const;
const CHAT_TYPE = { saved_messages: "پیام‌های ذخیره‌شده", direct_message: "گفتگوی خصوصی", group: "گروه", channel: "کانال", bot: "ربات" } as const;
const EM_STATUS = { invited: "دعوت‌شده", accepted: "پذیرفته", declined: "رد کرده", joined: "حاضرشده" } as const;
const EM_ROLE = { owner: "مالک", organizer: "برگزارکننده", member: "عضو" } as const;
const FR_STATUS = { pending: "در انتظار", accepted: "پذیرفته", declined: "ردشده", blocked: "مسدود" } as const;
const MEDIA_TYPE = { image: "تصویر", video: "ویدیو", album: "آلبوم" } as const;

function useSocialRows(id: string): Row[] | null {
  const so = useSocial();
  const { canAccessAdmin, visibleUserIds } = useTenancy();
  return useMemo(() => {
    if (!id.startsWith("social.")) return null;
    const pubOk = (x: { user_id: string; privacy: "ME" | "FRIENDS" | "EVERYONE"; is_draft: boolean; deleted_at: string | null }) =>
      !x.deleted_at && so.canView(x) && (!x.is_draft || x.user_id === so.me || canAccessAdmin);
    const status = (x: { is_draft: boolean; is_public: boolean }) => (x.is_draft ? "پیش‌نویس" : x.is_public ? "منتشرشده" : "منتشرنشده");
    const cats = (ids: string[]) => ids.map((c) => so.categoryTitle(c)).filter(Boolean);
    const comments = (e: Parameters<typeof so.commentsFor>[0], eid: string) => so.commentsFor(e, eid).length;
    const reacts = (e: Parameters<typeof so.commentsFor>[0], eid: string) => so.reactionSummary(e, eid).total;
    const today = dayNum(so.today) ?? 0;
    switch (id) {
      case "social.content":
        return so.content.filter(pubOk).map((c) => {
          const e = CONTENT_ENTITY[c.kind];
          const cm = comments(e, c.id);
          const rc = reacts(e, c.id);
          return {
            id: c.id,
            kind: CONTENT_KIND[c.kind],
            title: c.title,
            author: so.userName(c.user_id),
            status: status(c),
            privacy: PRIVACY[c.privacy],
            categories: cats(c.category_ids),
            tags: c.tags,
            published: c.is_public && !c.is_draft,
            views: c.views,
            comments: cm,
            reactions: rc,
            engagement: cm + rc,
            attachments: c.attachments.length,
            createdAt: normDate(c.created_at),
            publishedAt: normDate(c.published_at),
          } satisfies Row;
        });
      case "social.media":
        return so.media.filter(pubOk).map((m) => {
          const cm = comments("media", m.id);
          const rc = reacts("media", m.id);
          return { id: m.id, postType: MEDIA_TYPE[m.post_type], author: so.userName(m.user_id), status: status(m), categories: cats(m.category_ids), tags: m.tags, comments: cm, reactions: rc, engagement: cm + rc, createdAt: normDate(m.created_at) } satisfies Row;
        });
      case "social.topics":
        return so.topics.filter(pubOk).map((t) => {
          const answers = so.posts.filter((p) => p.topic_id === t.id && !p.deleted_at).length;
          return {
            id: t.id,
            title: t.title,
            author: so.userName(t.user_id),
            categories: cats(t.category_ids),
            tags: t.tags,
            answered: answers > 0,
            pinned: t.is_pinned,
            locked: t.is_locked,
            views: t.view_count,
            answers,
            reactions: reacts("topic", t.id),
            createdAt: normDate(t.created_at),
          } satisfies Row;
        });
      case "social.answers": {
        const visibleTopics = new Map(so.topics.filter(pubOk).map((t) => [t.id, t.title]));
        return so.posts
          .filter((p) => !p.deleted_at && visibleTopics.has(p.topic_id))
          .map((p) => ({ id: p.id, topic: visibleTopics.get(p.topic_id)!, author: so.userName(p.user_id), reply: !!p.parent_id, attachments: p.attachments.length, createdAt: normDate(p.created_at) }));
      }
      case "social.messages": {
        const mine = new Map(so.chats.filter((c) => !c.deleted_at && so.isMember(c)).map((c) => [c.id, c]));
        return so.messages
          .filter((m) => mine.has(m.chat_id))
          .map((m) => {
            const c = mine.get(m.chat_id)!;
            const d = normDate(m.created_at);
            const other = c.chat_type === "direct_message" ? (c.owner_id === so.me ? c.receiver : c.owner_id) : null;
            return {
              id: m.id,
              chatType: CHAT_TYPE[c.chat_type],
              chat: c.title || (other ? so.userName(other) : CHAT_TYPE[c.chat_type]),
              sender: so.userName(m.user_id),
              type: m.type === "sticker" ? "استیکر" : "متن",
              weekday: weekdayName(d),
              hour: clockHour(m.created_at),
              hasFile: m.attachments.length > 0,
              forwarded: !!m.forwarded_from,
              edited: m.edited,
              date: d,
            } satisfies Row;
          });
      }
      case "social.friendships": {
        const vis = new Set(visibleUserIds());
        return so.friendships
          .filter((f) => f.sender_id === so.me || f.receiver_id === so.me || (vis.has(f.sender_id) && vis.has(f.receiver_id)))
          .map((f) => ({ id: f.id, status: FR_STATUS[f.status], sender: so.userName(f.sender_id), receiver: so.userName(f.receiver_id), date: normDate(f.created_at) }));
      }
      case "social.events":
        return so.events.filter(pubOk).map((e) => {
          const ms = so.eventMembers.filter((m) => m.event_id === e.id);
          const participants = ms.filter((m) => m.status === "accepted" || m.status === "joined").length;
          const sd = normDate(e.start_date);
          const cm = comments("event", e.id);
          const rc = reacts("event", e.id);
          return {
            id: e.id,
            title: e.title,
            organizer: so.userName(e.user_id),
            mode: e.is_online ? "مجازی" : "حضوری",
            location: e.is_online ? "برخط" : e.location,
            timing: (dayNum(sd ?? "") ?? 0) >= today ? "پیش‌رو" : "برگزارشده",
            weekday: weekdayName(sd),
            categories: cats(e.category_ids),
            repeat: e.is_repeat,
            published: e.is_public && !e.is_draft,
            capacity: e.capacity || null,
            participants,
            invited: ms.filter((m) => m.status === "invited").length,
            declined: ms.filter((m) => m.status === "declined").length,
            fillRate: e.capacity ? Math.round((participants / e.capacity) * 1000) / 10 : null,
            engagement: cm + rc,
            startDate: sd,
          } satisfies Row;
        });
      case "social.eventMembers": {
        const evs = new Map(so.events.filter(pubOk).map((e) => [e.id, e]));
        return so.eventMembers
          .filter((m) => evs.has(m.event_id))
          .map((m) => {
            const e = evs.get(m.event_id)!;
            return {
              id: m.id,
              event: e.title,
              user: so.userName(m.user_id),
              status: EM_STATUS[m.status],
              role: EM_ROLE[m.member_type],
              mode: e.is_online ? "مجازی" : "حضوری",
              attending: m.status === "accepted" || m.status === "joined",
              eventDate: normDate(e.start_date),
              date: normDate(m.created_at),
            } satisfies Row;
          });
      }
    }
    return [];
  }, [id, so, canAccessAdmin, visibleUserIds]);
}

// ----------------------------------------------------------------- خانواده: اعضا و دسترسی

function useMemberRows(id: string): Row[] | null {
  const tn = useTenancy();
  const { iam, contextId, today, canAccessAdmin, actingUser } = tn;
  return useMemo(() => {
    if (!id.startsWith("members.")) return null;
    const subtree = new Set(descendantsOrSelf(iam, contextId).map((s) => s.id));
    const chain = new Set(ancestorsOrSelf(iam, contextId).map((s) => s.id));
    const inView = (sid: string) => subtree.has(sid) || chain.has(sid);
    const vis = new Set(tn.visibleUserIds());
    const scope = (sid: string) => iam.scopes.find((s) => s.id === sid);
    const upType = (s: IamState, sid: string, type: "holding" | "company") => ancestorsOrSelf(s, sid).find((x) => x.type === type)?.name ?? "—";
    const roleById = (rid: string) => iam.roles.find((r) => r.id === rid);
    const t = dayNum(today) ?? 0;
    switch (id) {
      case "members.memberships":
        return iam.memberships
          .filter((m) => inView(m.scopeId) && (vis.has(m.userId) || m.userId === actingUser.id))
          .map((m) => {
            const s = scope(m.scopeId);
            return {
              id: m.id,
              uid: m.userId,
              user: userName(m.userId),
              userTitle: m.title || userTitle(m.userId),
              scope: s?.name ?? m.scopeId,
              scopeType: s ? scopeTypeLabel[s.type] : "—",
              holding: upType(iam, m.scopeId, "holding"),
              company: upType(iam, m.scopeId, "company"),
              status: m.status === "active" ? "فعال" : "معلق",
              primary: m.primary,
              createdAt: normDate(m.createdAt),
            } satisfies Row;
          });
      case "members.bindings":
        return iam.bindings
          .filter((b) => inView(b.scopeId))
          .map((b) => {
            const s = scope(b.scopeId);
            const r = roleById(b.roleId);
            const live = bindingLive(b, today);
            const from = dayNum(b.validFrom);
            const until = dayNum(b.validUntil);
            const status = !b.active ? "لغوشده" : live ? "معتبر" : from !== null && from > t ? "آینده" : "منقضی";
            return {
              id: b.id,
              uid: b.userId,
              user: userName(b.userId),
              role: r?.name ?? b.roleId,
              scope: s?.name ?? b.scopeId,
              scopeType: s ? scopeTypeLabel[s.type] : "—",
              holding: upType(iam, b.scopeId, "holding"),
              status,
              createdBy: userName(b.createdBy),
              adminRole: isAdminRole(r),
              builtIn: !!r?.builtIn,
              expiringSoon: live && until !== null && until - t <= 30,
              permissions: r?.permissions.length ?? 0,
              createdAt: normDate(b.createdAt),
              validUntil: normDate(b.validUntil),
            } satisfies Row;
          });
      case "members.scopes":
        return iam.scopes
          .filter((s) => inView(s.id))
          .map((s) => {
            const desc = new Set(descendantsOrSelf(iam, s.id).map((x) => x.id));
            return {
              id: s.id,
              name: s.name,
              type: scopeTypeLabel[s.type],
              parent: s.parentId ? scope(s.parentId)?.name ?? "—" : "—",
              holding: upType(iam, s.id, "holding"),
              active: s.active,
              members: iam.memberships.filter((m) => m.scopeId === s.id && m.status === "active").length,
              membersTotal: new Set(iam.memberships.filter((m) => desc.has(m.scopeId) && m.status === "active").map((m) => m.userId)).size,
              bindings: iam.bindings.filter((b) => b.scopeId === s.id && bindingLive(b, today)).length,
              createdAt: normDate(s.createdAt),
            } satisfies Row;
          });
      case "members.audits": {
        const TT = { scope: "واحد", role: "نقش", binding: "تخصیص نقش", membership: "عضویت", review: "بازبینی" } as const;
        return iam.audits
          .filter((a) => subtree.has(a.scopeId) && (canAccessAdmin || a.actorId === actingUser.id || a.affectedUserId === actingUser.id))
          .map((a) => ({ id: a.id, event: auditLabel[a.event] ?? a.event, actor: userName(a.actorId), scope: scope(a.scopeId)?.name ?? a.scopeId, targetType: TT[a.targetType], affected: userName(a.affectedUserId), date: normDate(a.at) }));
      }
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, iam, contextId, today, canAccessAdmin, actingUser.id]);
}

// ----------------------------------------------------------------- خانواده: نوآوری (داده‌ی نمونه‌ی ایستا + دامنه)

function useInnovationRows(id: string): Row[] | null {
  const { filterScoped } = useTenancy();
  return useMemo(() => {
    if (!id.startsWith("innovation.")) return null;
    switch (id) {
      case "innovation.nf":
        return filterScoped(nfProjects).map((p) => ({
          id: p.id,
          title: p.titleFa,
          macroField: p.macroField,
          field: p.field,
          motherProject: p.motherProject,
          teamType: p.team.type,
          city: p.team.city,
          stage: p.stage,
          greenPath: !!p.greenPath,
          progress: p.progress,
          budget: money(p.budget),
          paid: money(p.finance.paid),
          pending: money(p.finance.pending),
          remaining: money(p.finance.remaining),
          share: p.shareDaneshmand,
          duration: p.durationMonths,
          reports: p.reports.length,
          pendingReports: p.reports.filter((r) => r.status !== "تایید نهایی").length,
          lateReports: p.reports.filter((r) => r.chain.some((c) => c.late)).length,
        }));
      case "innovation.contracts":
        return filterScoped(contracts).map((c) => ({ id: c.id, title: c.title, vendor: c.vendor, stage: c.stage, owner: c.owner, value: money(c.value), deadline: normDate(c.deadline) }));
      case "innovation.research":
        return filterScoped(researchOpportunities).map((r) => ({ id: r.id, title: r.title, field: r.field, stage: r.stage, applicants: r.applicants, deadline: normDate(r.deadline) }));
      case "innovation.funds":
        return filterScoped(funds).map((f) => ({ id: f.id, title: f.title, applicant: f.applicant, stage: f.stage, amount: money(f.amount), roi: pct(f.roi) }));
    }
    return [];
  }, [id, filterScoped]);
}

// ----------------------------------------------------------------- هوک اصلی

export type SourceRows = { rows: Row[]; available: boolean; today: string; source?: DataSource };

/**
 * ردیف‌های یک منبع برای کاربرِ فعلی. همه‌ی هوک‌های خانواده‌ها همیشه و به یک ترتیب
 * صدا زده می‌شوند؛ فقط خانواده‌ی صاحب منبع محاسبه را انجام می‌دهد.
 */
export function useSourceRows(sourceId: string): SourceRows {
  const v = useExtVersion();
  const tn = useTenancy();
  const pm = useProjectsPM();
  const so = useSocial();
  const pRows = useProjectRows(sourceId);
  const kRows = useKnowledgeRows(sourceId, tn.today);
  const sRows = useSocialRows(sourceId);
  const mRows = useMemberRows(sourceId);
  const iRows = useInnovationRows(sourceId);
  return useMemo(() => {
    const source = getSource(sourceId);
    const today = sourceId.startsWith("projects.") ? pm.refDate : sourceId.startsWith("social.") ? so.today : tn.today;
    const live = pRows ?? kRows ?? sRows ?? mRows ?? iRows;
    if (live) return { rows: live, available: true, today, source };
    const ext = extRows.get(sourceId);
    if (ext) return { rows: ext, available: true, today, source };
    if (source?.rows && !source.placeholder) return { rows: source.rows(), available: true, today, source };
    return { rows: [], available: false, today, source };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, pRows, kRows, sRows, mRows, iRows, v, pm.refDate, so.today, tn.today]);
}
