// ---------------------------------------------------------------------------
// قالب‌های آماده‌ی گزارش برای هر ماژول — نقطه‌ی شروع حرفه‌ای که کاربر می‌تواند
// تغییرشان دهد و به‌عنوان گزارش خودش ذخیره کند.
// ---------------------------------------------------------------------------
import { COUNT_FIELD, type ReportModule, type ReportPreset, type MeasureSpec } from "./types";

type Partial0 = Partial<Omit<ReportPreset, "presetId" | "module" | "name" | "sourceId">>;

const count = (id = "m1"): MeasureSpec => ({ id, field: COUNT_FIELD, agg: "count" });
const m = (field: string, agg: MeasureSpec["agg"], id: string, label?: string): MeasureSpec => ({ id, field, agg, ...(label ? { label } : {}) });

function P(presetId: string, module: ReportModule, name: string, description: string, sourceId: string, x: Partial0): ReportPreset {
  return {
    presetId,
    module,
    name,
    description,
    sourceId,
    dimensions: [],
    measures: [count()],
    filters: [],
    dateRange: { preset: "all" },
    bucket: "month",
    sort: { by: "m1", dir: "desc" },
    limit: 0,
    chart: "bar",
    ...x,
  };
}

const projects: ReportPreset[] = [
  P("pj-status", "projects", "وضعیت تسک‌ها به تفکیک پروژه", "سهم هر وضعیت (بک‌لاگ تا انجام‌شده) در هر پروژه", "projects.tasks", {
    dimensions: ["project", "statusKind"],
    chart: "stackedBar",
  }),
  P("pj-overdue", "projects", "تسک‌های عقب‌افتاده به تفکیک مسئول", "چه کسانی بیشترین کار عقب‌افتاده را دارند و چند روز تأخیر", "projects.tasks", {
    dimensions: ["assignee"],
    measures: [count(), m("daysLate", "avg", "m2")],
    filters: [{ id: "f1", field: "overdue", op: "eq", value: true }],
  }),
  P("pj-hours-week", "projects", "روند ساعات ثبت‌شده (هفتگی)", "جمع ساعت کار ثبت‌شده در هر هفته", "projects.timeLogs", {
    dimensions: ["date"],
    measures: [m("hours", "sum", "m1")],
    dateField: "date",
    bucket: "week",
    sort: { by: "label", dir: "asc" },
    chart: "line",
  }),
  P("pj-budget", "projects", "بودجه در برابر هزینه‌ی پرداخت‌شده", "مقایسه‌ی بودجه‌ی مصوب، هزینه‌ی پرداخت‌شده و تعهدشده‌ی هر پروژه", "projects.projects", {
    dimensions: ["name"],
    measures: [m("budget", "sum", "m1", "بودجه"), m("paid", "sum", "m2", "پرداخت‌شده"), m("committed", "sum", "m3", "تعهدشده")],
    filters: [{ id: "f1", field: "archived", op: "eq", value: false }],
  }),
  P("pj-workload", "projects", "بار کاری باز اعضا", "تعداد و ساعت برآوردیِ تسک‌های انجام‌نشده‌ی هر فرد", "projects.tasks", {
    dimensions: ["assignee"],
    measures: [m("estHours", "sum", "m1", "ساعت برآوردی باز"), count("m2")],
    filters: [{ id: "f1", field: "done", op: "eq", value: false }],
    limit: 12,
    others: true,
  }),
  P("pj-matrix", "projects", "ماتریس اولویت × وضعیت", "تمرکز کارهای بحرانی در کدام مرحله گیر کرده است", "projects.tasks", {
    dimensions: ["priority", "statusKind"],
    sort: { by: "label", dir: "asc" },
    chart: "pivot",
  }),
  P("pj-risks", "projects", "ریسک‌های باز بر اساس شدت", "توزیع ریسک‌های باز و در حال رفع", "projects.risks", {
    dimensions: ["severity"],
    filters: [{ id: "f1", field: "open", op: "eq", value: true }],
    sort: { by: "label", dir: "asc" },
    chart: "donut",
  }),
  P("pj-kpi", "projects", "شاخص‌های کلیدی پروژه‌ها", "تعداد پروژه، بودجه، میانگین پیشرفت و تسک‌های عقب‌افتاده", "projects.projects", {
    measures: [count(), m("budget", "sum", "m2"), m("progress", "avg", "m3"), m("overdueTasks", "sum", "m4", "تسک عقب‌افتاده")],
    filters: [{ id: "f1", field: "archived", op: "eq", value: false }],
    chart: "kpi",
  }),
];

const knowledge: ReportPreset[] = [
  P("km-cat-status", "knowledge", "اسناد بر اساس دسته و وضعیت", "پوشش هر حوزه‌ی دانشی و مرحله‌ی گردش کار اسنادش", "knowledge.docs", { dimensions: ["rootCategory", "status"], chart: "stackedBar" }),
  P("km-top-viewed", "knowledge", "پربازدیدترین اسناد", "۱۰ سند پربازدید به همراه دانلود", "knowledge.docs", {
    dimensions: ["title"],
    measures: [m("views", "sum", "m1", "بازدید"), m("downloads", "sum", "m2", "دانلود")],
    limit: 10,
  }),
  P("km-access", "knowledge", "توزیع سطح دسترسی اسناد", "سهم اسناد عمومی، داخلی و محرمانه", "knowledge.docs", { dimensions: ["access"], sort: { by: "label", dir: "asc" }, chart: "donut" }),
  P("km-trend", "knowledge", "روند تولید سند (ماهانه)", "تعداد سند ایجادشده در هر ماه", "knowledge.docs", {
    dimensions: ["createdAt"],
    dateField: "createdAt",
    bucket: "month",
    sort: { by: "label", dir: "asc" },
    chart: "line",
  }),
  P("km-rating", "knowledge", "کیفیت اسناد به تفکیک نوع", "میانگین امتیاز و درصد مفید بودن هر نوع سند", "knowledge.docs", {
    dimensions: ["type"],
    measures: [m("rating", "avg", "m1"), m("helpful", "avg", "m2", "مفید بودن (٪)")],
  }),
  P("km-review", "knowledge", "اسناد نیازمند بازبینی", "اسناد منتشرشده‌ای که موعد بازبینی‌شان گذشته — به تفکیک مالک", "knowledge.docs", {
    dimensions: ["owner"],
    filters: [{ id: "f1", field: "reviewDue", op: "eq", value: true }],
  }),
  P("km-lessons", "knowledge", "تجربیات و درس‌آموخته‌ها بر اساس نوع", "سهم هر نوع تجربه‌ی ثبت‌شده", "knowledge.experiences", { dimensions: ["kind"], chart: "pie" }),
  P("km-kpi", "knowledge", "شاخص‌های کلیدی دانش", "تعداد سند، بازدید، دانلود و میانگین امتیاز", "knowledge.docs", {
    measures: [count(), m("views", "sum", "m2"), m("downloads", "sum", "m3"), m("rating", "avg", "m4")],
    chart: "kpi",
  }),
];

const content: ReportPreset[] = [
  P("ct-kind-status", "content", "محتوا به تفکیک نوع و وضعیت", "وبلاگ، خبر و مجله — منتشرشده، پیش‌نویس و منتشرنشده", "social.content", { dimensions: ["kind", "status"], chart: "stackedBar" }),
  P("ct-trend", "content", "روند انتشار ماهانه به تفکیک نوع", "حجم تولید محتوا در طول زمان", "social.content", {
    dimensions: ["createdAt", "kind"],
    dateField: "createdAt",
    bucket: "month",
    sort: { by: "label", dir: "asc" },
    chart: "line",
  }),
  P("ct-top", "content", "پربازدیدترین محتوا", "۱۰ محتوای پربازدید با میزان تعامل", "social.content", {
    dimensions: ["title"],
    measures: [m("views", "sum", "m1", "بازدید"), m("engagement", "sum", "m2", "تعامل")],
    limit: 10,
  }),
  P("ct-cats", "content", "محتوا به تفکیک دسته", "کدام دسته‌ها بیشترین محتوا را دارند", "social.content", { dimensions: ["categories"], limit: 10, others: true }),
  P("ct-media", "content", "رسانه بر اساس نوع", "سهم تصویر، ویدیو و آلبوم", "social.media", { dimensions: ["postType"], chart: "donut" }),
  P("ct-authors", "content", "فعال‌ترین نویسندگان", "تعداد محتوا و بازدید هر نویسنده", "social.content", {
    dimensions: ["author"],
    measures: [count(), m("views", "sum", "m2")],
    limit: 10,
  }),
  P("ct-kpi", "content", "شاخص‌های کلیدی محتوا", "تعداد محتوا، بازدید، نظر و واکنش", "social.content", {
    measures: [count(), m("views", "sum", "m2"), m("comments", "sum", "m3"), m("reactions", "sum", "m4")],
    chart: "kpi",
  }),
];

const social: ReportPreset[] = [
  P("so-weekly", "social", "پست‌ها در هفته به تفکیک نوع", "ریتم انتشار هفتگی وبلاگ، خبر و مجله", "social.content", {
    dimensions: ["createdAt", "kind"],
    dateField: "createdAt",
    bucket: "week",
    sort: { by: "label", dir: "asc" },
    chart: "stackedBar",
  }),
  P("so-engagement", "social", "تعامل محتوا به تفکیک نوع", "نظر و واکنش دریافتی هر نوع محتوا", "social.content", {
    dimensions: ["kind"],
    measures: [m("comments", "sum", "m1", "نظر"), m("reactions", "sum", "m2", "واکنش")],
  }),
  P("so-top-engaged", "social", "پرتعامل‌ترین محتوا", "۱۰ محتوای برتر بر اساس مجموع نظر و واکنش", "social.content", {
    dimensions: ["title"],
    measures: [m("engagement", "sum", "m1")],
    limit: 10,
  }),
  P("so-chat-types", "social", "پیام‌ها بر اساس نوع گفتگو", "سهم گفتگوی خصوصی، گروه و کانال از پیام‌های شما", "social.messages", { dimensions: ["chatType"], chart: "donut" }),
  P("so-senders", "social", "فعال‌ترین فرستندگان پیام", "در گفتگوهایی که عضوشان هستید", "social.messages", { dimensions: ["sender"], limit: 10, others: true }),
  P("so-unanswered", "social", "پرسش‌های بی‌پاسخ", "پرسش‌هایی که هنوز پاسخی نگرفته‌اند", "social.topics", {
    dimensions: ["title"],
    measures: [m("views", "sum", "m1", "بازدید")],
    filters: [{ id: "f1", field: "answered", op: "eq", value: false }],
    chart: "table",
  }),
  P("so-friends", "social", "وضعیت ارتباطات", "درخواست‌های پذیرفته، در انتظار و ردشده", "social.friendships", { dimensions: ["status"], sort: { by: "label", dir: "asc" }, chart: "pie" }),
  P("so-kpi", "social", "شاخص‌های کلیدی شبکه", "محتوا، بازدید و تعامل", "social.content", {
    measures: [count(), m("views", "sum", "m2"), m("engagement", "sum", "m3"), m("engagement", "avg", "m4", "میانگین تعامل هر محتوا")],
    chart: "kpi",
  }),
];

const events: ReportPreset[] = [
  P("ev-monthly", "events", "رویدادها در هر ماه", "تعداد رویداد و جلسه به تفکیک حضوری/مجازی", "social.events", {
    dimensions: ["startDate", "mode"],
    dateField: "startDate",
    bucket: "month",
    sort: { by: "label", dir: "asc" },
    chart: "stackedBar",
  }),
  P("ev-fill", "events", "نرخ پرشدن ظرفیت رویدادها", "درصد ظرفیت پرشده‌ی هر رویداد", "social.events", {
    dimensions: ["title"],
    measures: [m("fillRate", "avg", "m1")],
    filters: [{ id: "f1", field: "capacity", op: "gt", value: 0 }],
    limit: 12,
  }),
  P("ev-mode", "events", "حضوری در برابر مجازی", "سهم هر شیوه‌ی برگزاری", "social.events", { dimensions: ["mode"], chart: "donut" }),
  P("ev-rsvp", "events", "وضعیت پاسخ به دعوت‌ها", "پذیرفته، حاضر، دعوت‌شده و رد", "social.eventMembers", { dimensions: ["status"], sort: { by: "label", dir: "asc" }, chart: "pie" }),
  P("ev-top-people", "events", "فعال‌ترین شرکت‌کنندگان", "بیشترین حضور در رویدادها", "social.eventMembers", {
    dimensions: ["user"],
    filters: [{ id: "f1", field: "attending", op: "eq", value: true }],
    limit: 10,
  }),
  P("ev-upcoming", "events", "رویدادهای پیش‌رو", "فهرست رویدادهای آینده با ظرفیت و ثبت‌نام", "social.events", {
    dimensions: ["title"],
    measures: [m("participants", "sum", "m1", "شرکت‌کننده"), m("capacity", "sum", "m2", "ظرفیت")],
    filters: [{ id: "f1", field: "timing", op: "eq", value: "پیش‌رو" }],
    chart: "table",
  }),
  P("ev-kpi", "events", "شاخص‌های کلیدی رویدادها", "تعداد رویداد، شرکت‌کننده و میانگین پرشدن ظرفیت", "social.events", {
    measures: [count(), m("participants", "sum", "m2"), m("fillRate", "avg", "m3"), m("declined", "sum", "m4", "رد دعوت")],
    chart: "kpi",
  }),
];

const members: ReportPreset[] = [
  P("mb-scope-type", "members", "اعضا به تفکیک نوع واحد", "پراکندگی عضویت‌های فعال در هلدینگ، شرکت و واحد", "members.memberships", {
    dimensions: ["scopeType"],
    measures: [m("user", "distinct", "m1", "تعداد عضو")],
    filters: [{ id: "f1", field: "status", op: "eq", value: "فعال" }],
    sort: { by: "label", dir: "asc" },
    chart: "donut",
  }),
  P("mb-holding", "members", "اعضا به تفکیک هلدینگ و وضعیت", "عضویت‌های فعال و معلق هر هلدینگ", "members.memberships", { dimensions: ["holding", "status"], chart: "stackedBar" }),
  P("mb-roles", "members", "نقش‌ها و تعداد دارندگان", "هر نقش به چند نفر تخصیص یافته است", "members.bindings", {
    dimensions: ["role"],
    measures: [m("user", "distinct", "m1", "تعداد دارنده")],
    filters: [{ id: "f1", field: "status", op: "eq", value: "معتبر" }],
  }),
  P("mb-expiring", "members", "تخصیص‌های رو به انقضا", "نقش‌هایی که تا ۳۰ روز آینده منقضی می‌شوند", "members.bindings", {
    dimensions: ["user", "role"],
    filters: [{ id: "f1", field: "expiringSoon", op: "eq", value: true }],
    chart: "table",
  }),
  P("mb-admin-matrix", "members", "پراکندگی نقش‌های مدیریتی", "تخصیص‌های مدیریتی و عادی در هر سطح سازمان", "members.bindings", {
    dimensions: ["scopeType", "adminRole"],
    filters: [{ id: "f1", field: "status", op: "eq", value: "معتبر" }],
    sort: { by: "label", dir: "asc" },
    chart: "pivot",
  }),
  P("mb-audits", "members", "روند تغییرات دسترسی", "رویدادهای ممیزی در هر هفته به تفکیک نوع", "members.audits", {
    dimensions: ["date", "event"],
    dateField: "date",
    bucket: "week",
    sort: { by: "label", dir: "asc" },
    chart: "stackedBar",
  }),
  P("mb-kpi", "members", "شاخص‌های کلیدی اعضا", "عضو یکتا، واحد و تخصیص نقش", "members.memberships", {
    measures: [m("user", "distinct", "m1", "عضو یکتا"), m("scope", "distinct", "m2", "واحد دارای عضو"), m("primary", "count", "m3", "عضویت اصلی")],
    filters: [{ id: "f1", field: "status", op: "eq", value: "فعال" }],
    chart: "kpi",
  }),
];

const innovation: ReportPreset[] = [
  P("in-stage", "innovation", "طرح‌های صندوق نوآور بر اساس مرحله", "قیف طرح‌ها از دریافت پروپوزال تا خروج", "innovation.nf", { dimensions: ["stage"], sort: { by: "label", dir: "asc" } }),
  P("in-budget", "innovation", "مبلغ قراردادها به تفکیک کلان‌محور", "سهم هر کلان‌محور از منابع صندوق", "innovation.nf", { dimensions: ["macroField"], measures: [m("budget", "sum", "m1")], chart: "donut" }),
  P("in-progress", "innovation", "پیشرفت و پرداخت طرح‌ها", "پیشرفت تأییدشده در برابر پرداخت انجام‌شده", "innovation.nf", {
    dimensions: ["title"],
    measures: [m("paid", "sum", "m1", "پرداخت‌شده"), m("remaining", "sum", "m2", "باقی‌مانده")],
    chart: "stackedBar",
  }),
  P("in-contracts", "innovation", "قراردادهای فناورانه بر اساس مرحله", "تعداد و ارزش قراردادها در هر مرحله", "innovation.contracts", {
    dimensions: ["stage"],
    measures: [count(), m("value", "sum", "m2")],
    sort: { by: "label", dir: "asc" },
  }),
  P("in-research", "innovation", "متقاضیان فرصت‌های پژوهشی به تفکیک حوزه", "استقبال از فراخوان‌ها", "innovation.research", { dimensions: ["field"], measures: [m("applicants", "sum", "m1")] }),
  P("in-kpi", "innovation", "شاخص‌های کلیدی صندوق نوآور", "تعداد طرح، مبلغ قرارداد، پرداخت و میانگین پیشرفت", "innovation.nf", {
    measures: [count(), m("budget", "sum", "m2"), m("paid", "sum", "m3"), m("progress", "avg", "m4")],
    chart: "kpi",
  }),
];

const timesheet: ReportPreset[] = [
  P("ts-project", "timesheet", "ساعات به تفکیک پروژه", "جمع ساعت ثبت‌شده روی هر پروژه", "projects.timeLogs", { dimensions: ["project"], measures: [m("hours", "sum", "m1")] }),
  P("ts-person", "timesheet", "ساعات به تفکیک فرد", "جمع ساعت ثبت‌شده‌ی هر نفر", "projects.timeLogs", { dimensions: ["member"], measures: [m("hours", "sum", "m1")], limit: 12, others: true }),
  P("ts-payroll", "timesheet", "کارکرد دوره‌ی جاری (۲۶ تا ۲۵)", "ساعت ثبت‌شده‌ی هر فرد در دوره‌ی کارکرد", "projects.timeLogs", {
    dimensions: ["member"],
    measures: [m("hours", "sum", "m1")],
    dateField: "date",
    dateRange: { preset: "payroll" },
    chart: "table",
  }),
  P("ts-trend", "timesheet", "روند ساعات (هفتگی)", "جمع ساعت هر هفته به تفکیک پروژه", "projects.timeLogs", {
    dimensions: ["date", "project"],
    measures: [m("hours", "sum", "m1")],
    dateField: "date",
    bucket: "week",
    sort: { by: "label", dir: "asc" },
    chart: "stackedBar",
  }),
  P("ts-matrix", "timesheet", "ماتریس فرد × پروژه", "توزیع ساعت هر نفر بین پروژه‌ها", "projects.timeLogs", {
    dimensions: ["member", "project"],
    measures: [m("hours", "sum", "m1")],
    chart: "pivot",
  }),
  P("ts-weekday", "timesheet", "الگوی ثبت ساعت در روزهای هفته", "کدام روزها بیشترین کار ثبت می‌شود", "projects.timeLogs", {
    dimensions: ["weekday"],
    measures: [m("hours", "sum", "m1")],
    sort: { by: "label", dir: "asc" },
  }),
  P("ts-kpi", "timesheet", "شاخص‌های کلیدی کارکرد", "جمع ساعت، تعداد ثبت و افراد", "projects.timeLogs", {
    measures: [m("hours", "sum", "m1"), count("m2"), m("member", "distinct", "m3", "تعداد افراد"), m("hours", "avg", "m4", "میانگین هر ثبت")],
    chart: "kpi",
  }),
];

const tickets: ReportPreset[] = [
  P("tk-status", "tickets", "تیکت‌ها بر اساس وضعیت", "باز، در حال بررسی، بسته", "tickets.tickets", { dimensions: ["status"], chart: "donut" }),
  P("tk-priority", "tickets", "تیکت‌ها به تفکیک اولویت و وضعیت", "تمرکز تیکت‌های فوری", "tickets.tickets", { dimensions: ["priority", "status"], sort: { by: "label", dir: "asc" }, chart: "stackedBar" }),
  P("tk-agent", "tickets", "عملکرد کارشناسان", "تعداد تیکت و میانگین زمان حل هر کارشناس", "tickets.tickets", {
    dimensions: ["assignee"],
    measures: [count(), m("resolutionHours", "avg", "m2")],
  }),
  P("tk-trend", "tickets", "روند ثبت تیکت (هفتگی)", "حجم درخواست‌ها در طول زمان", "tickets.tickets", {
    dimensions: ["createdAt"],
    dateField: "createdAt",
    bucket: "week",
    sort: { by: "label", dir: "asc" },
    chart: "line",
  }),
  P("tk-kpi", "tickets", "شاخص‌های کلیدی پشتیبانی", "تعداد تیکت، زمان حل، نقض SLA و رضایت", "tickets.tickets", {
    measures: [count(), m("resolutionHours", "avg", "m2"), m("slaBreached", "avg", "m3"), m("satisfaction", "avg", "m4")],
    chart: "kpi",
  }),
];

export const PRESETS: Record<ReportModule, ReportPreset[]> = { projects, knowledge, social, content, events, members, innovation, timesheet, tickets };
