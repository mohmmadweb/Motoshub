// ---------------------------------------------------------------------------
// داده‌ی نمونه‌ی ماژول مدیریت پروژه — از روی پروژه‌های موجود در mock.ts و
// mockDetails.ts ساخته می‌شود (هیچ داده‌ی قبلی حذف نشده؛ فقط غنی‌تر شده است).
// ---------------------------------------------------------------------------
import { projects as legacyProjects, playbookTemplates as legacyPlaybooks } from "../data/mock";
import { projectDetails } from "../data/mockDetails";
import { withDemoScopes } from "../data/tenancy";
import { parseRial } from "./jalali";
import type { EventCode } from "./events";
import type {
  ActivityLog,
  AutomationRule,
  BoardColumn,
  PMPlaybookTemplate,
  PMTask,
  PlaybookExecution,
  ProjectState,
  PMMinute,
  ColumnKind,
} from "./types";

/** «امروزِ» دمو — داده‌های نمونه حول این تاریخ چیده شده‌اند (در تنظیمات پروژه قابل جلو بردن است) */
export const DEMO_REF_DATE = "۱۴۰۵/۰۳/۰۸";
export const SYSTEM_ACTOR = "سامانه (خودکار)";

export const defaultColumns = (): BoardColumn[] => [
  { id: "backlog", label: "برنامه‌ریزی", kind: "backlog" },
  { id: "todo", label: "برای انجام", kind: "todo" },
  { id: "doing", label: "در حال انجام", kind: "doing", wip: 5 },
  { id: "review", label: "بازبینی", kind: "review" },
  { id: "blocked", label: "متوقف‌شده", kind: "blocked" },
  { id: "done", label: "انجام‌شده", kind: "done" },
];

/** نگاشت وضعیت‌های قدیمی بورد به ستون‌های جدید */
const legacyStatus: Record<string, string> = {
  "برنامه‌ریزی": "backlog",
  "در حال انجام": "doing",
  "بازبینی": "review",
  "انجام‌شده": "done",
};

export const defaultAutomation = (): AutomationRule[] => [
  { id: "a1", name: "انتقال به «انجام‌شده» ← پیشرفت ۱۰۰٪ و تکمیل چک‌لیست", trigger: "TASK_STATUS_CHANGED → done", action: "progress = 100 · همه‌ی موارد چک‌لیست تیک می‌خورند", enabled: true, runs: 0, builtin: true },
  { id: "a2", name: "سررسید فردا ← اعلان به مسئول تسک", trigger: "زمان‌بند روزانه", action: "TASK_DUE_SOON برای مسئول (درون‌برنامه + رایانامه + پوش)", enabled: true, runs: 0, builtin: true },
  { id: "a3", name: "مصرف بودجه ≥ آستانه (۸۰٪/۱۰۰٪) ← هشدار به مدیر پروژه و مالی", trigger: "ثبت/تغییر هزینه یا بودجه", action: "BUDGET_THRESHOLD_REACHED (فوری)", enabled: true, runs: 0, builtin: true },
  { id: "a4", name: "انجام همه‌ی پیش‌نیازها ← آزادسازی تسک و اعلان به مسئول آن", trigger: "انتقال پیش‌نیاز به «انجام‌شده»", action: "TASK_UNBLOCKED برای مسئول تسک بعدی", enabled: true, runs: 0, builtin: true },
  { id: "a5", name: "گذشتن از سررسید ← اعلان به مسئول و مدیر پروژه", trigger: "زمان‌بند روزانه", action: "TASK_OVERDUE", enabled: true, runs: 0, builtin: true },
  { id: "a6", name: "مایل‌ستون با تسک ناتمام در ۳ روز مانده به سررسید ← «در خطر»", trigger: "زمان‌بند روزانه", action: "status = در خطر · MILESTONE_AT_RISK", enabled: true, runs: 0, builtin: true },
  { id: "a7", name: "ریسک «بحرانی» ثبت یا تشدید شد ← سلامت پروژه حداقل «زرد»", trigger: "RISK_ADDED / RISK_ESCALATED", action: "PROJECT_STATUS_CHANGED در صورت «سبز» بودن", enabled: false, runs: 0, builtin: true },
  { id: "a8", name: "تغییر سررسید تسک ← بررسی تعارض با تسک‌های وابسته", trigger: "TASK_DUE_DATE_CHANGED", action: "DEPENDENCY_CONFLICT برای مسئول تسک وابسته و مدیر", enabled: true, runs: 0, builtin: true },
];

export const defaultLabels = ["طراحی", "توسعه", "خطا", "مستندات", "عمرانی", "آموزش", "تدارکات", "مالی", "حقوقی"];

type TaskSeed = Partial<PMTask> & Pick<PMTask, "id" | "title" | "assignee" | "start" | "due">;

function task(t: TaskSeed): PMTask {
  return {
    description: "",
    status: "backlog",
    priority: "متوسط",
    progress: 0,
    labels: [],
    checklist: [],
    estBudget: 0,
    estHours: 0,
    comments: [],
    createdAt: t.start,
    ...t,
  };
}

let logSeq = 1;
function L(event: EventCode, description: string, actor: string, date: string, time: string, entity?: { type: string; id: string }, metadata: ActivityLog["metadata"] = {}): ActivityLog {
  return { id: `lg-seed-${logSeq}`, event, description, actor, date, time, seq: logSeq++, entity, metadata };
}

const legacyTask = (projectId: string, taskId: string) => {
  const t = legacyProjects.find((p) => p.id === projectId)!.tasks.find((x) => x.id === taskId)!;
  return { id: t.id, title: t.title, assignee: t.assignee, priority: t.priority, due: t.due, progress: t.progress, status: legacyStatus[t.status] ?? "backlog" };
};

const expensesOf = (pid: string) => projectDetails[pid].expenses;
const findExp = (pid: string, id: string) => {
  const e = expensesOf(pid).find((x) => x.id === id)!;
  return { id: e.id, title: e.title, category: e.category, amount: parseRial(e.amount), date: e.date, status: e.status };
};

// ------------------------------- پروژه‌ی ۱ --------------------------------
function seedPr1(): Omit<ProjectState, "meta"> & { meta: Omit<ProjectState["meta"], "scope" | "holdingId" | "companyId"> } {
  const d = projectDetails.pr1;
  const tasks: PMTask[] = [
    task({ id: "t9", title: "مطالعات میدانی و نیازسنجی روستاهای هدف", assignee: "وحید خاوئی", start: "۱۴۰۴/۱۲/۱۵", due: "۱۴۰۵/۰۱/۲۰", status: "done", progress: 100, priority: "زیاد", labels: ["مستندات"], estBudget: 250_000_000, estHours: 120, description: "بازدید میدانی از ۱۲ روستای هدف، تکمیل پرسش‌نامه‌ی خانوار و احصای نیازهای زیرساختی و اشتغال." }),
    task({ id: "t10", title: "تأمین لوله و اتصالات آب‌رسانی", assignee: "تیم تدارکات", start: "۱۴۰۵/۰۱/۰۵", due: "۱۴۰۵/۰۱/۲۸", status: "done", progress: 100, priority: "زیاد", labels: ["تدارکات"], estBudget: 2_600_000_000, estHours: 60 }),
    task({ ...legacyTask("pr1", "t1"), start: "۱۴۰۵/۰۱/۲۱", labels: ["عمرانی"], estBudget: 1_800_000_000, estHours: 400, description: "اجرای شبکه‌ی آب‌رسانی فاز اول در ۱۲ روستا بر اساس نقشه‌ی مصوب.", checklist: [
      { id: "c1", text: "حفاری و لوله‌گذاری", done: true },
      { id: "c2", text: "نصب انشعابات خانگی", done: true },
      { id: "c3", text: "آزمایش فشار شبکه", done: true },
    ] }),
    task({ ...legacyTask("pr1", "t2"), start: "۱۴۰۵/۰۲/۰۱", labels: ["آموزش"], estBudget: 900_000_000, estHours: 200, description: "راه‌اندازی ۸ کارگاه اشتغال خرد (خیاطی، صنایع‌دستی، فرآوری خرما).", checklist: [
      { id: "c1", text: "انتخاب محل کارگاه‌ها", done: true },
      { id: "c2", text: "اخذ مجوز از دهیاری", done: true },
      { id: "c3", text: "استقرار تجهیزات", done: false },
      { id: "c4", text: "آغاز به کار آزمایشی", done: false },
    ], comments: [
      { id: "cm1", author: "محسن مردعلی", text: "@وحید_خاوئی لطفاً وضعیت برق کارگاه ۳ را تا فردا گزارش کنید.", at: "۱۴۰۵/۰۳/۰۴ ۱۱:۲۰" },
      { id: "cm2", author: "وحید خاوئی", text: "با اداره‌ی برق هماهنگ شد، انشعاب هفته‌ی آینده نصب می‌شود.", at: "۱۴۰۵/۰۳/۰۵ ۰۹:۰۵" },
    ] }),
    task({ ...legacyTask("pr1", "t3"), start: "۱۴۰۵/۰۲/۱۰", labels: ["عمرانی"], estBudget: 2_200_000_000, estHours: 350 }),
    task({ id: "t11", title: "تجهیز کارگاه‌های اشتغال (چرخ خیاطی، ابزار)", assignee: "تیم تدارکات", start: "۱۴۰۵/۰۲/۲۰", due: "۱۴۰۵/۰۳/۰۹", status: "review", progress: 90, priority: "زیاد", labels: ["تدارکات"], estBudget: 1_000_000_000, estHours: 40 }),
    task({ ...legacyTask("pr1", "t4"), start: "۱۴۰۵/۰۳/۱۰", labels: ["آموزش"], estBudget: 400_000_000, estHours: 24, description: "دوره‌ی ۲۴ نفر-ساعته‌ی تربیت تسهیل‌گر محلی برای هدایت کارگاه‌ها." }),
    task({ id: "t12", title: "انتخاب و جذب بهره‌برداران کارگاه‌ها", assignee: "وحید خاوئی", start: "۱۴۰۵/۰۳/۲۱", due: "۱۴۰۵/۰۳/۲۶", status: "todo", priority: "متوسط", labels: ["آموزش"], estHours: 30 }),
    task({ id: "t13", title: "بازدید نظارتی و تحویل موقت مدارس", assignee: "محسن مردعلی", start: "۱۴۰۵/۰۳/۰۶", due: "۱۴۰۵/۰۳/۱۵", status: "todo", priority: "زیاد", labels: ["عمرانی"], estHours: 16 }),
    task({ id: "t14", title: "مراسم افتتاح و تحویل به بهره‌بردار", assignee: "محسن مردعلی", start: "۱۴۰۵/۰۳/۲۷", due: "۱۴۰۵/۰۳/۳۰", status: "backlog", priority: "زیاد", estBudget: 300_000_000, estHours: 20 }),
    task({ id: "t15", title: "گزارش نهایی و تسویه‌ی مالی فاز دوم", assignee: "واحد مالی", start: "۱۴۰۵/۰۳/۳۰", due: "۱۴۰۵/۰۴/۰۱", status: "backlog", priority: "متوسط", labels: ["مالی", "مستندات"], estHours: 24 }),
  ];
  const deps: [string, string][] = [
    ["t9", "t1"], ["t10", "t1"], ["t9", "t3"], ["t9", "t2"], ["t2", "t4"], ["t11", "t12"], ["t4", "t12"],
    ["t3", "t13"], ["t12", "t14"], ["t13", "t14"], ["t1", "t14"], ["t14", "t15"],
  ];
  const minutes: PMMinute[] = d.minutes.map((m) => ({ ...m }));
  minutes[1] = {
    ...minutes[1],
    meetingId: "mt2",
    participants: ["محسن مردعلی", "وحید خاوئی", "تیم عمرانی", "واحد مالی", "پایگاه اطلاع‌رسانی بنیاد", "تیم تدارکات"],
    topics: ["گزارش پیشرفت فاز اول آب‌رسانی", "وضعیت تأمین تجهیزات کارگاه‌ها", "برنامه‌ی تحویل مدارس"],
    decisionList: ["فاز اول آب‌رسانی تحویل موقت شد", "خرید تجهیزات کارگاه‌ها از تأمین‌کننده‌ی دوم", "بازدید نظارتی مدارس پیش از ۱۵ خرداد"],
    actions: [
      { id: "ac1", text: "بازدید نظارتی و تحویل موقت مدارس", owner: "محسن مردعلی", due: "۱۴۰۵/۰۳/۱۵", taskId: "t13" },
      { id: "ac2", text: "تهیه‌ی گزارش تصویری پیشرفت برای کارفرما", owner: "وحید خاوئی", due: "۱۴۰۵/۰۳/۱۲" },
    ],
    published: true,
  };
  return {
    meta: {
      id: "pr1",
      name: "طرح آبادانی و پیشرفت قلعه‌گنج — فاز دوم",
      description: "توسعه‌ی زیرساخت آب‌رسانی، بازسازی مدارس و راه‌اندازی کارگاه‌های اشتغال خرد در روستاهای شهرستان قلعه‌گنج با مشارکت دهیاری‌ها.",
      client: "بنیاد علوی",
      sponsor: d.sponsor,
      manager: d.manager,
      health: "سبز",
      priority: "زیاد",
      phase: "اجرا",
      start: "۱۴۰۴/۱۲/۱۰",
      deadline: "۱۴۰۵/۰۴/۰۱",
      category: "محرومیت‌زدایی",
      tags: ["قلعه‌گنج", "آب‌رسانی", "اشتغال"],
      icon: "Sprout",
      color: "#059669",
      visibility: "عمومی سازمان",
      workspace: "بنیاد علوی",
      starred: true,
      archived: false,
      financeOfficer: "واحد مالی",
      groupId: "pg1",
      createdAt: "۱۴۰۴/۱۲/۱۰",
    },
    columns: defaultColumns(),
    tasks,
    deps: deps.map(([a, b], i) => ({ id: `dp${i + 1}`, predecessor: a, successor: b, createdAt: "۱۴۰۴/۱۲/۱۲" })),
    members: [
      { id: "tm0", name: "پایگاه اطلاع‌رسانی بنیاد", title: "راهبر سامانه", role: "مالک", allocation: 10, userId: "u1" },
      ...d.team.map((m) => ({ id: m.id, name: m.name, title: m.role, role: (m.role === "مدیر پروژه" ? "مدیر پروژه" : "عضو") as "مدیر پروژه" | "عضو", allocation: m.allocation, userId: m.name === "محسن مردعلی" ? "u5" : m.name === "وحید خاوئی" ? "u4" : undefined })),
      { id: "tm5", name: "تیم تدارکات", title: "خرید و تأمین", role: "عضو", allocation: 50 },
      { id: "tm6", name: "واحد مالی", title: "مسئول مالی پروژه", role: "عضو", allocation: 20 },
      { id: "tm7", name: "بنیاد علوی", title: "کارفرما (ناظر)", role: "مشاهده‌گر", allocation: 0 },
    ],
    milestones: [
      { ...d.milestones[0], owner: "وحید خاوئی", taskIds: ["t9"] },
      { ...d.milestones[1], owner: "محسن مردعلی", taskIds: ["t10", "t1"] },
      { ...d.milestones[2], owner: "وحید خاوئی", taskIds: ["t2", "t11"] },
      { ...d.milestones[3], owner: "محسن مردعلی", taskIds: ["t12", "t13", "t14"] },
    ],
    risks: d.risks.map((x) => ({ ...x, impact: x.severity === "بحرانی" ? "زیاد" : x.severity === "متوسط" ? "متوسط" : "کم", taskId: x.id === "r1" ? "t10" : x.id === "r2" ? "t4" : undefined })),
    issues: [
      { id: "is1", title: "قطعی برق در کارگاه شماره‌ی ۳", description: "انشعاب برق کارگاه هنوز نصب نشده و استقرار چرخ‌های خیاطی متوقف است.", status: "در حال بررسی", severity: "زیاد", reporter: "وحید خاوئی", assignee: "تیم عمرانی", taskId: "t2", createdAt: "۱۴۰۵/۰۳/۰۴" },
      { id: "is2", title: "تأخیر در ترخیص اقلام تجهیزات از گمرک", description: "دو محموله‌ی ابزار صنایع‌دستی در گمرک بندرعباس مانده است.", status: "باز", severity: "متوسط", reporter: "تیم تدارکات", assignee: "تیم تدارکات", taskId: "t11", createdAt: "۱۴۰۵/۰۳/۰۶" },
    ],
    expenses: [
      { ...findExp("pr1", "e1"), taskId: "t10", createdBy: "تیم تدارکات" },
      { ...findExp("pr1", "e2"), taskId: "t1", createdBy: "محسن مردعلی" },
      { id: "e5", title: "خرید مصالح بازسازی مدارس", category: "پیمانکاری", amount: 1_900_000_000, date: "۱۴۰۵/۰۲/۲۵", status: "پرداخت‌شده", taskId: "t3", createdBy: "تیم عمرانی" },
      { ...findExp("pr1", "e3"), taskId: "t11", createdBy: "تیم تدارکات" },
      { ...findExp("pr1", "e4"), taskId: "t4", createdBy: "تیم آموزش" },
    ],
    budget: {
      total: parseRial(d.budgetTotal),
      lines: [
        { category: "زیرساخت", allocated: 5_000_000_000 },
        { category: "پیمانکاری", allocated: 3_500_000_000 },
        { category: "تجهیزات", allocated: 1_500_000_000 },
        { category: "آموزش", allocated: 500_000_000 },
        { category: "سایر / ذخیره", allocated: 1_500_000_000 },
      ],
      revenue: 1_500_000_000,
      thresholds: [80, 100],
      firedThresholds: [],
    },
    timeLogs: [
      { id: "tl1", member: "وحید خاوئی", taskId: "t9", hours: 64, date: "۱۴۰۵/۰۱/۱۸", note: "بازدید میدانی ۱۲ روستا" },
      { id: "tl2", member: "تیم عمرانی", taskId: "t1", hours: 380, date: "۱۴۰۵/۰۲/۱۴", note: "اجرای شبکه" },
      { id: "tl3", member: "وحید خاوئی", taskId: "t2", hours: 96, date: "۱۴۰۵/۰۳/۰۵", note: "" },
      { id: "tl4", member: "تیم عمرانی", taskId: "t3", hours: 190, date: "۱۴۰۵/۰۳/۰۴", note: "" },
      { id: "tl5", member: "تیم تدارکات", taskId: "t11", hours: 34, date: "۱۴۰۵/۰۳/۰۷", note: "پیگیری ترخیص" },
      { id: "tl6", member: "محسن مردعلی", taskId: "t1", hours: 22, date: "۱۴۰۵/۰۲/۱۵", note: "نظارت و تحویل" },
    ],
    meetings: [
      { id: "mt1", title: "جلسه هماهنگی با فرمانداری قلعه‌گنج", date: "۱۴۰۵/۰۲/۰۸", time: "۰۹:۰۰", duration: 90, mode: "حضوری", participants: ["محسن مردعلی", "وحید خاوئی", "تیم عمرانی"], description: "", taskIds: ["t1", "t3"], status: "برگزارشده" },
      { id: "mt2", title: "کمیته راهبری — پایش پیشرفت فاز دوم", date: "۱۴۰۵/۰۲/۲۲", time: "۱۰:۰۰", duration: 60, mode: "ویدیویی", participants: ["محسن مردعلی", "وحید خاوئی", "تیم عمرانی", "واحد مالی", "پایگاه اطلاع‌رسانی بنیاد", "تیم تدارکات"], description: "", taskIds: ["t2", "t11"], status: "برگزارشده" },
      { id: "mt3", title: "هماهنگی تحویل تجهیزات کارگاه‌ها", date: "۱۴۰۵/۰۳/۰۹", time: "۰۹:۳۰", duration: 45, mode: "حضوری", participants: ["وحید خاوئی", "تیم تدارکات", "محسن مردعلی"], description: "بررسی اقلام رسیده و برنامه‌ی نصب در کارگاه‌ها.", taskIds: ["t11"], status: "برنامه‌ریزی‌شده" },
      { id: "mt4", title: "بازبینی آمادگی مراسم افتتاح", date: "۱۴۰۵/۰۳/۱۲", time: "۱۰:۰۰", duration: 60, mode: "ویدیویی", participants: ["محسن مردعلی", "وحید خاوئی", "پایگاه اطلاع‌رسانی بنیاد", "بنیاد علوی"], description: "", taskIds: ["t14", "t13"], status: "برنامه‌ریزی‌شده" },
    ],
    minutes,
    documents: [
      { id: "dc1", name: "قرارداد پیمانکار عمرانی.pdf", type: "قرارداد", size: "۲.۴ مگابایت", uploadedBy: "محسن مردعلی", date: "۱۴۰۵/۰۱/۱۵", version: 2 },
      { id: "dc2", name: "گزارش نیازسنجی روستاها.docx", type: "گزارش", size: "۸۶۰ کیلوبایت", uploadedBy: "وحید خاوئی", date: "۱۴۰۵/۰۱/۲۰", version: 1, taskId: "t9" },
      { id: "dc3", name: "نقشه‌ی شبکه‌ی آب‌رسانی.dwg", type: "فایل طراحی", size: "۱۴ مگابایت", uploadedBy: "تیم عمرانی", date: "۱۴۰۵/۰۱/۲۵", version: 3, taskId: "t1" },
      { id: "dc4", name: "صورت‌جلسه‌ی کمیته‌ی راهبری.pdf", type: "صورت‌جلسه", size: "۳۲۰ کیلوبایت", uploadedBy: "محسن مردعلی", date: "۱۴۰۵/۰۲/۲۲", version: 1, meetingId: "mt2" },
      { id: "dc5", name: "برآورد هزینه‌ی فاز دوم.xlsx", type: "فایل مالی", size: "۱۹۰ کیلوبایت", uploadedBy: "واحد مالی", date: "۱۴۰۴/۱۲/۱۲", version: 4 },
    ],
    channels: [
      { id: "ch1", name: "عمومی", description: "گفتگوی عمومی تیم پروژه", members: "all", messages: [
        { id: "ms1", author: "محسن مردعلی", text: "سلام به همه؛ گزارش هفتگی را تا پنجشنبه در کانال بگذارید.", at: "۱۴۰۵/۰۳/۰۱ ۰۸:۴۵", pinned: true },
        { id: "ms2", author: "وحید خاوئی", text: "کارگاه‌های ۱ و ۲ آماده‌ی بهره‌برداری آزمایشی هستند.", at: "۱۴۰۵/۰۳/۰۵ ۱۰:۱۲", reactions: { like: ["محسن مردعلی"] } },
        { id: "ms3", author: "تیم تدارکات", text: "@محسن_مردعلی محموله‌ی دوم چرخ‌ها فردا می‌رسد.", at: "۱۴۰۵/۰۳/۰۷ ۱۶:۳۰" },
      ] },
      { id: "ch2", name: "اطلاع‌رسانی", description: "فقط اطلاعیه‌های مهم", members: "all", messages: [] },
      { id: "ch3", name: "عمرانی", description: "هماهنگی پیمانکار و نظارت", members: ["محسن مردعلی", "تیم عمرانی", "تیم تدارکات"], messages: [
        { id: "ms4", author: "تیم عمرانی", text: "آزمایش فشار شبکه‌ی روستای ۷ با موفقیت انجام شد.", at: "۱۴۰۵/۰۲/۱۴ ۱۲:۰۰", fileName: "گزارش-آزمایش-فشار.pdf" },
      ] },
      { id: "ch4", name: "مالی", description: "هماهنگی پرداخت‌ها و صورت‌وضعیت‌ها", members: ["محسن مردعلی", "واحد مالی", "پایگاه اطلاع‌رسانی بنیاد"], messages: [] },
    ],
    announcements: [
      { id: "an1", title: "جلسه‌ی کمیته‌ی راهبری", body: "جلسه‌ی کمیته‌ی راهبری ۲۲ اردیبهشت ساعت ۱۰ به‌صورت ویدیویی برگزار می‌شود.", author: "محسن مردعلی", at: "۱۴۰۵/۰۲/۲۰ ۰۹:۰۰", pinned: false },
      { id: "an2", title: "تحویل موقت فاز اول آب‌رسانی", body: "فاز اول شبکه‌ی آب‌رسانی ۱۲ روستا تحویل موقت شد. از همه‌ی همکاران سپاسگزاریم.", author: "محسن مردعلی", at: "۱۴۰۵/۰۲/۱۶ ۱۱:۰۰", pinned: true },
    ],
    automation: defaultAutomation(),
    notifRules: {},
    logs: [
      L("PROJECT_CREATED", "پروژه «طرح آبادانی و پیشرفت قلعه‌گنج — فاز دوم» ایجاد شد.", "پایگاه اطلاع‌رسانی بنیاد", "۱۴۰۴/۱۲/۱۰", "۰۹:۱۵", { type: "project", id: "pr1" }),
      L("PROJECT_MEMBER_ADDED", "«محسن مردعلی» با نقش «مدیر پروژه» به تیم پروژه اضافه شد.", "پایگاه اطلاع‌رسانی بنیاد", "۱۴۰۴/۱۲/۱۰", "۰۹:۱۸", { type: "member", id: "tm1" }),
      L("PROJECT_MEMBER_ADDED", "«وحید خاوئی» به تیم پروژه اضافه شد.", "محسن مردعلی", "۱۴۰۴/۱۲/۱۰", "۱۰:۰۲", { type: "member", id: "tm2" }),
      L("PROJECT_BUDGET_CHANGED", "بودجه‌ی پروژه ۱۲٬۰۰۰٬۰۰۰٬۰۰۰ ریال تعیین شد.", "پایگاه اطلاع‌رسانی بنیاد", "۱۴۰۴/۱۲/۱۱", "۱۱:۴۰", { type: "project", id: "pr1" }, { old_budget: 0, new_budget: 12000000000 }),
      L("TASK_CREATED", "تسک «مطالعات میدانی و نیازسنجی روستاهای هدف» ایجاد شد.", "محسن مردعلی", "۱۴۰۴/۱۲/۱۲", "۰۸:۳۰", { type: "task", id: "t9" }),
      L("TASK_ASSIGNED", "تسک «مطالعات میدانی و نیازسنجی روستاهای هدف» به «وحید خاوئی» واگذار شد.", "محسن مردعلی", "۱۴۰۴/۱۲/۱۲", "۰۸:۳۰", { type: "task", id: "t9" }, { assigned_to: "وحید خاوئی" }),
      L("MILESTONE_ADDED", "مایل‌ستون «اتمام مطالعات میدانی و نیازسنجی روستاها» ایجاد شد.", "محسن مردعلی", "۱۴۰۴/۱۲/۱۲", "۰۸:۵۰", { type: "milestone", id: "m1" }),
      L("TASK_DEPENDENCY_ADDED", "تسک «تکمیل زیرساخت آب‌رسانی روستاهای هدف» به «مطالعات میدانی و نیازسنجی» وابسته شد.", "محسن مردعلی", "۱۴۰۴/۱۲/۱۲", "۰۹:۱۰", { type: "dependency", id: "dp1" }),
      L("RISK_ADDED", "ریسک «تأخیر در تأمین لوله و اتصالات آب‌رسانی» ثبت شد.", "محسن مردعلی", "۱۴۰۵/۰۱/۰۳", "۱۴:۲۰", { type: "risk", id: "r1" }, { severity: "بحرانی" }),
      L("TASK_STATUS_CHANGED", "تسک «مطالعات میدانی و نیازسنجی روستاهای هدف» از «در حال انجام» به «انجام‌شده» منتقل شد.", "وحید خاوئی", "۱۴۰۵/۰۱/۲۰", "۱۷:۰۵", { type: "task", id: "t9" }, { old_status: "در حال انجام", new_status: "انجام‌شده" }),
      L("MILESTONE_ACHIEVED", "مایل‌ستون «اتمام مطالعات میدانی و نیازسنجی روستاها» به وضعیت «انجام‌شده» رسید.", "محسن مردعلی", "۱۴۰۵/۰۱/۲۰", "۱۷:۳۰", { type: "milestone", id: "m1" }),
      L("EXPENSE_ADDED", "هزینه‌ی «خرید لوله و اتصالات فاز اول» به مبلغ ۲٬۸۰۰٬۰۰۰٬۰۰۰ ریال ثبت شد.", "تیم تدارکات", "۱۴۰۵/۰۱/۲۸", "۱۰:۰۰", { type: "expense", id: "e1" }, { amount: 2800000000 }),
      L("EXPENSE_STATUS_CHANGED", "هزینه‌ی «خرید لوله و اتصالات فاز اول» به «پرداخت‌شده» تغییر کرد.", "واحد مالی", "۱۴۰۵/۰۱/۳۰", "۱۲:۱۵", { type: "expense", id: "e1" }, { old_status: "در انتظار تأیید", new_status: "پرداخت‌شده" }),
      L("RISK_STATUS_CHANGED", "ریسک «تأخیر در تأمین لوله و اتصالات آب‌رسانی» به «در حال رفع» تغییر کرد.", "تیم تدارکات", "۱۴۰۵/۰۲/۰۲", "۰۹:۴۰", { type: "risk", id: "r1" }),
      L("MEETING_SCHEDULED", "جلسه‌ی «جلسه هماهنگی با فرمانداری قلعه‌گنج» برای ۱۴۰۵/۰۲/۰۸ ساعت ۰۹:۰۰ تنظیم شد.", "محسن مردعلی", "۱۴۰۵/۰۲/۰۳", "۱۳:۰۰", { type: "meeting", id: "mt1" }),
      L("TASK_STATUS_CHANGED", "تسک «تکمیل زیرساخت آب‌رسانی روستاهای هدف» از «بازبینی» به «انجام‌شده» منتقل شد.", "محسن مردعلی", "۱۴۰۵/۰۲/۱۵", "۱۶:۲۰", { type: "task", id: "t1" }, { old_status: "بازبینی", new_status: "انجام‌شده" }),
      L("MILESTONE_ACHIEVED", "مایل‌ستون «تحویل فاز اول زیرساخت آب‌رسانی (۱۲ روستا)» به وضعیت «انجام‌شده» رسید.", "محسن مردعلی", "۱۴۰۵/۰۲/۱۵", "۱۶:۴۰", { type: "milestone", id: "m2" }),
      L("ANNOUNCEMENT_POSTED", "اطلاعیه‌ی «تحویل موقت فاز اول آب‌رسانی» منتشر شد.", "محسن مردعلی", "۱۴۰۵/۰۲/۱۶", "۱۱:۰۰", { type: "announcement", id: "an2" }),
      L("MINUTES_PUBLISHED", "صورت‌جلسه‌ی «کمیته راهبری — پایش پیشرفت فاز دوم» با ۳ مصوبه منتشر شد.", "محسن مردعلی", "۱۴۰۵/۰۲/۲۲", "۱۲:۳۰", { type: "minute", id: "mn2" }),
      L("ACTION_ITEM_CONVERTED", "مصوبه‌ی «بازدید نظارتی و تحویل موقت مدارس» به تسک تبدیل شد.", "محسن مردعلی", "۱۴۰۵/۰۲/۲۲", "۱۲:۳۵", { type: "task", id: "t13" }),
      L("TASK_STATUS_CHANGED", "تسک «تجهیز کارگاه‌های اشتغال (چرخ خیاطی، ابزار)» از «در حال انجام» به «بازبینی» منتقل شد.", "تیم تدارکات", "۱۴۰۵/۰۳/۰۷", "۱۵:۵۰", { type: "task", id: "t11" }, { old_status: "در حال انجام", new_status: "بازبینی" }),
      L("ISSUE_REPORTED", "مشکل «تأخیر در ترخیص اقلام تجهیزات از گمرک» گزارش شد.", "تیم تدارکات", "۱۴۰۵/۰۳/۰۶", "۱۰:۱۰", { type: "issue", id: "is2" }),
    ],
    firedReminders: [],
  };
}

// ------------------------------- پروژه‌ی ۲ --------------------------------
function seedPr2(): ReturnType<typeof seedPr1> {
  const d = projectDetails.pr2;
  const tasks: PMTask[] = [
    task({ id: "t16", title: "طراحی معماری اطلاعات و طبقه‌بندی اسناد", assignee: "دبیرخانه", start: "۱۴۰۵/۰۲/۰۱", due: "۱۴۰۵/۰۲/۱۵", status: "done", progress: 100, priority: "زیاد", labels: ["طراحی", "مستندات"], estHours: 60 }),
    task({ ...legacyTask("pr2", "t5"), start: "۱۴۰۵/۰۲/۱۶", labels: ["مستندات"], estBudget: 900_000_000, estHours: 300 }),
    task({ id: "t17", title: "پیاده‌سازی بک‌اند و نمایه‌سازی جستجو", assignee: "مهندس بردیا کوشا", start: "۱۴۰۵/۰۲/۱۶", due: "۱۴۰۵/۰۳/۱۲", status: "doing", progress: 55, priority: "بحرانی", labels: ["توسعه"], estBudget: 1_200_000_000, estHours: 240, checklist: [
      { id: "c1", text: "راه‌اندازی موتور جستجو", done: true },
      { id: "c2", text: "نمایه‌سازی متن کامل PDF", done: true },
      { id: "c3", text: "پشتیبانی از جستجوی فارسی (نیم‌فاصله، ی/ي)", done: false },
      { id: "c4", text: "کنترل دسترسی در نتایج", done: false },
    ] }),
    task({ id: "t18", title: "طراحی رابط کاربری جستجو", assignee: "تیم سامانه", start: "۱۴۰۵/۰۲/۱۶", due: "۱۴۰۵/۰۳/۰۵", status: "review", progress: 90, priority: "زیاد", labels: ["طراحی"], estHours: 80, checklist: [
      { id: "c1", text: "وایرفریم", done: true },
      { id: "c2", text: "طراحی UI", done: true },
      { id: "c3", text: "نسخه‌ی موبایل", done: true },
      { id: "c4", text: "بازبینی", done: false },
      { id: "c5", text: "تأیید", done: false },
    ] }),
    task({ id: "t21", title: "مهاجرت داده‌های سامانه‌ی قدیمی بایگانی", assignee: "مهندس بردیا کوشا", start: "۱۴۰۵/۰۳/۰۲", due: "۱۴۰۵/۰۳/۱۶", status: "blocked", progress: 20, priority: "زیاد", labels: ["توسعه", "خطا"], estHours: 60, description: "به‌دلیل ناسازگاری کدگذاری فایل‌های قدیمی متوقف شده است." }),
    task({ ...legacyTask("pr2", "t6"), start: "۱۴۰۵/۰۳/۱۳", due: "۱۴۰۵/۰۳/۲۵", labels: ["توسعه"], estHours: 80, status: "todo", progress: 0 }),
    task({ ...legacyTask("pr2", "t7"), start: "۱۴۰۵/۰۳/۱۰", due: "۱۴۰۵/۰۳/۲۵", labels: ["حقوقی"], estHours: 40 }),
    task({ id: "t19", title: "تست یکپارچگی و پذیرش کاربر", assignee: "تیم سامانه", start: "۱۴۰۵/۰۳/۲۶", due: "۱۴۰۵/۰۴/۰۵", status: "backlog", priority: "زیاد", labels: ["توسعه"], estHours: 60 }),
    task({ id: "t20", title: "آموزش کاربران کلیدی واحدها", assignee: "دبیرخانه", start: "۱۴۰۵/۰۴/۰۶", due: "۱۴۰۵/۰۴/۱۵", status: "backlog", priority: "متوسط", labels: ["آموزش"], estBudget: 300_000_000, estHours: 40 }),
  ];
  const deps: [string, string][] = [["t16", "t5"], ["t16", "t17"], ["t16", "t18"], ["t5", "t21"], ["t17", "t6"], ["t18", "t6"], ["t21", "t6"], ["t6", "t19"], ["t7", "t19"], ["t19", "t20"]];
  return {
    meta: {
      id: "pr2",
      name: "استقرار سامانه جامع مدیریت دانش بنیاد",
      description: "یکپارچه‌سازی آرشیو اسناد، مصوبات و قراردادها با جستجوی پیشرفته و سطوح دسترسی هلدینگ/شرکت.",
      client: "بنیاد مستضعفان انقلاب اسلامی",
      sponsor: d.sponsor,
      manager: d.manager,
      health: "زرد",
      priority: "زیاد",
      phase: "اجرا",
      start: "۱۴۰۵/۰۱/۳۰",
      deadline: "۱۴۰۵/۰۵/۰۱",
      category: "تحول دیجیتال",
      tags: ["مدیریت دانش", "جستجو"],
      icon: "Library",
      color: "#1f4f99",
      visibility: "فقط اعضا",
      workspace: "معاونت برنامه‌ریزی",
      starred: false,
      archived: false,
      financeOfficer: "دکتر یاسمن روشن",
      groupId: "pg2",
      createdAt: "۱۴۰۵/۰۱/۳۰",
    },
    columns: defaultColumns(),
    tasks,
    deps: deps.map(([a, b], i) => ({ id: `dp${i + 1}`, predecessor: a, successor: b, createdAt: "۱۴۰۵/۰۲/۰۱" })),
    members: [
      { id: "tm0", name: "پایگاه اطلاع‌رسانی بنیاد", title: "راهبر سامانه", role: "مالک", allocation: 10, userId: "u1" },
      ...d.team.map((m) => ({ id: m.id, name: m.name, title: m.role, role: (m.role === "مدیر پروژه" ? "مدیر پروژه" : "عضو") as "مدیر پروژه" | "عضو", allocation: m.allocation, userId: m.name === "وحید خاوئی" ? "u4" : undefined })),
      { id: "tm4", name: "مهندس بردیا کوشا", title: "توسعه‌دهنده ارشد", role: "عضو", allocation: 100, userId: "u13" },
      { id: "tm5", name: "دکتر یاسمن روشن", title: "مسئول مالی و ارزیابی", role: "عضو", allocation: 15, userId: "u12" },
    ],
    milestones: [
      { ...d.milestones[0], owner: "دبیرخانه", taskIds: ["t16", "t5"] },
      { ...d.milestones[1], owner: "مهندس بردیا کوشا", taskIds: ["t17", "t18", "t6"] },
      { ...d.milestones[2], owner: "دبیرخانه", taskIds: ["t20"] },
    ],
    risks: d.risks.map((x) => ({ ...x, impact: x.severity === "بحرانی" ? "زیاد" : "متوسط", taskId: x.id === "r1" ? "t17" : undefined })),
    issues: [
      { id: "is1", title: "ناسازگاری کدگذاری فایل‌های سامانه‌ی قدیمی", description: "حدود ۱۸٪ فایل‌ها با کدگذاری Windows-1256 ذخیره شده‌اند و متن فارسی خراب می‌شود.", status: "باز", severity: "زیاد", reporter: "مهندس بردیا کوشا", assignee: "مهندس بردیا کوشا", taskId: "t21", createdAt: "۱۴۰۵/۰۳/۰۵" },
    ],
    expenses: [
      { ...findExp("pr2", "e1"), taskId: "t17", createdBy: "تیم سامانه" },
      { ...findExp("pr2", "e2"), taskId: "t5", createdBy: "دبیرخانه" },
      { id: "e3", title: "سرور نمایه‌سازی (اجاره‌ی ۶ ماهه)", category: "زیرساخت", amount: 450_000_000, date: "۱۴۰۵/۰۳/۰۶", status: "در انتظار تأیید", taskId: "t17", createdBy: "مهندس بردیا کوشا" },
    ],
    budget: {
      total: parseRial(d.budgetTotal),
      lines: [
        { category: "نرم‌افزار", allocated: 1_500_000_000 },
        { category: "نیروی انسانی", allocated: 2_300_000_000 },
        { category: "زیرساخت", allocated: 600_000_000 },
        { category: "آموزش", allocated: 400_000_000 },
        { category: "سایر / ذخیره", allocated: 200_000_000 },
      ],
      revenue: 0,
      thresholds: [80, 100],
      firedThresholds: [],
    },
    timeLogs: [
      { id: "tl1", member: "مهندس بردیا کوشا", taskId: "t17", hours: 132, date: "۱۴۰۵/۰۳/۰۷", note: "" },
      { id: "tl2", member: "تیم سامانه", taskId: "t18", hours: 74, date: "۱۴۰۵/۰۳/۰۵", note: "" },
      { id: "tl3", member: "دبیرخانه", taskId: "t5", hours: 280, date: "۱۴۰۵/۰۳/۰۱", note: "" },
      { id: "tl4", member: "مهندس بردیا کوشا", taskId: "t21", hours: 14, date: "۱۴۰۵/۰۳/۰۵", note: "بررسی کدگذاری" },
    ],
    meetings: [
      { id: "mt1", title: "جلسه کیک‌آف با معاونت برنامه‌ریزی", date: "۱۴۰۵/۰۱/۳۰", time: "۱۰:۰۰", duration: 90, mode: "حضوری", participants: ["وحید خاوئی", "دبیرخانه", "تیم سامانه"], description: "", taskIds: [], status: "برگزارشده" },
      { id: "mt2", title: "دمو و بازبینی رابط جستجو", date: "۱۴۰۵/۰۳/۱۰", time: "۱۴:۰۰", duration: 60, mode: "ویدیویی", participants: ["وحید خاوئی", "تیم سامانه", "مهندس بردیا کوشا", "دبیرخانه"], description: "نمایش نسخه‌ی اولیه و جمع‌آوری بازخورد.", taskIds: ["t18", "t17"], status: "برنامه‌ریزی‌شده" },
    ],
    minutes: d.minutes.map((m) => ({ ...m, meetingId: "mt1" })),
    documents: [
      { id: "dc1", name: "سند معماری اطلاعات.pdf", type: "مستندات فنی", size: "۱.۱ مگابایت", uploadedBy: "دبیرخانه", date: "۱۴۰۵/۰۲/۱۵", version: 2, taskId: "t16" },
      { id: "dc2", name: "پروپوزال استقرار سامانه.docx", type: "پروپوزال", size: "۶۴۰ کیلوبایت", uploadedBy: "وحید خاوئی", date: "۱۴۰۵/۰۱/۲۵", version: 1 },
      { id: "dc3", name: "طرح رابط جستجو.fig", type: "فایل طراحی", size: "۹ مگابایت", uploadedBy: "تیم سامانه", date: "۱۴۰۵/۰۳/۰۴", version: 5, taskId: "t18" },
    ],
    channels: [
      { id: "ch1", name: "عمومی", description: "گفتگوی عمومی تیم پروژه", members: "all", messages: [
        { id: "ms1", author: "وحید خاوئی", text: "@مهندس_بردیا_کوشا مهاجرت داده چه زمانی از حالت توقف خارج می‌شود؟", at: "۱۴۰۵/۰۳/۰۶ ۰۹:۲۰" },
        { id: "ms2", author: "مهندس بردیا کوشا", text: "اسکریپت تبدیل کدگذاری آماده است؛ تا دوشنبه تست می‌کنم.", at: "۱۴۰۵/۰۳/۰۶ ۱۰:۴۰" },
      ] },
      { id: "ch2", name: "اطلاع‌رسانی", description: "فقط اطلاعیه‌های مهم", members: "all", messages: [] },
      { id: "ch3", name: "توسعه", description: "هماهنگی فنی", members: ["تیم سامانه", "مهندس بردیا کوشا", "وحید خاوئی"], messages: [] },
      { id: "ch4", name: "طراحی", description: "بازخورد رابط کاربری", members: ["تیم سامانه", "دبیرخانه", "وحید خاوئی"], messages: [] },
    ],
    announcements: [],
    automation: defaultAutomation(),
    notifRules: {},
    logs: [
      L("PROJECT_CREATED", "پروژه «استقرار سامانه جامع مدیریت دانش بنیاد» ایجاد شد.", "پایگاه اطلاع‌رسانی بنیاد", "۱۴۰۵/۰۱/۳۰", "۰۸:۰۰", { type: "project", id: "pr2" }),
      L("PROJECT_BUDGET_CHANGED", "بودجه‌ی پروژه ۵٬۰۰۰٬۰۰۰٬۰۰۰ ریال تعیین شد.", "پایگاه اطلاع‌رسانی بنیاد", "۱۴۰۵/۰۱/۳۰", "۰۸:۰۵", { type: "project", id: "pr2" }, { old_budget: 0, new_budget: 5000000000 }),
      L("PROJECT_MEMBER_ADDED", "«مهندس بردیا کوشا» به تیم پروژه اضافه شد.", "وحید خاوئی", "۱۴۰۵/۰۲/۰۱", "۰۹:۰۰", { type: "member", id: "tm4" }),
      L("TASK_ASSIGNED", "تسک «پیاده‌سازی بک‌اند و نمایه‌سازی جستجو» به «مهندس بردیا کوشا» واگذار شد.", "وحید خاوئی", "۱۴۰۵/۰۲/۰۱", "۰۹:۱۰", { type: "task", id: "t17" }),
      L("TASK_STATUS_CHANGED", "تسک «طراحی معماری اطلاعات و طبقه‌بندی اسناد» از «بازبینی» به «انجام‌شده» منتقل شد.", "دبیرخانه", "۱۴۰۵/۰۲/۱۵", "۱۵:۰۰", { type: "task", id: "t16" }),
      L("TASK_UNBLOCKED", "همه‌ی پیش‌نیازهای تسک «پیاده‌سازی بک‌اند و نمایه‌سازی جستجو» انجام شد؛ امکان شروع دارد.", SYSTEM_ACTOR, "۱۴۰۵/۰۲/۱۵", "۱۵:۰۰", { type: "task", id: "t17" }),
      L("RISK_ESCALATED", "شدت ریسک «تأخیر تیم سامانه در ماژول جستجو» به «بحرانی» افزایش یافت.", "وحید خاوئی", "۱۴۰۵/۰۳/۰۲", "۱۱:۲۰", { type: "risk", id: "r1" }, { old_severity: "متوسط", new_severity: "بحرانی" }),
      L("PROJECT_STATUS_CHANGED", "وضعیت پروژه از «سبز» به «زرد» تغییر کرد.", "وحید خاوئی", "۱۴۰۵/۰۳/۰۲", "۱۱:۲۵", { type: "project", id: "pr2" }, { old_status: "سبز", new_status: "زرد" }),
      L("TASK_BLOCKED", "تسک «مهاجرت داده‌های سامانه‌ی قدیمی بایگانی» متوقف شد.", "مهندس بردیا کوشا", "۱۴۰۵/۰۳/۰۵", "۱۶:۴۵", { type: "task", id: "t21" }),
      L("ISSUE_REPORTED", "مشکل «ناسازگاری کدگذاری فایل‌های سامانه‌ی قدیمی» گزارش شد.", "مهندس بردیا کوشا", "۱۴۰۵/۰۳/۰۵", "۱۶:۵۰", { type: "issue", id: "is1" }),
    ],
    firedReminders: [],
  };
}

// ------------------------------- پروژه‌ی ۳ --------------------------------
function seedPr3(): ReturnType<typeof seedPr1> {
  const d = projectDetails.pr3;
  const tasks: PMTask[] = [
    task({ id: "t22", title: "احصای فهرست اموال مازاد قابل واگذاری", assignee: "واحد حقوقی", start: "۱۴۰۵/۰۳/۰۱", due: "۱۴۰۵/۰۴/۱۰", status: "doing", progress: 35, priority: "زیاد", labels: ["حقوقی"], estHours: 120 }),
    task({ id: "t23", title: "استعلام وضعیت ثبتی و حقوقی املاک", assignee: "واحد حقوقی", start: "۱۴۰۵/۰۴/۱۱", due: "۱۴۰۵/۰۴/۱۵", status: "todo", priority: "متوسط", labels: ["حقوقی"], estHours: 60 }),
    task({ ...legacyTask("pr3", "t8"), start: "۱۴۰۵/۰۴/۱۱", labels: ["مالی"], estBudget: 240_000_000, estHours: 80 }),
    task({ id: "t24", title: "تهیه‌ی آگهی و اسناد مزایده‌ی عمومی", assignee: "واحد مالی", start: "۱۴۰۵/۰۴/۲۱", due: "۱۴۰۵/۰۵/۱۰", status: "backlog", priority: "متوسط", labels: ["مستندات"], estHours: 40 }),
  ];
  const deps: [string, string][] = [["t22", "t23"], ["t22", "t8"], ["t23", "t24"], ["t8", "t24"]];
  return {
    meta: {
      id: "pr3",
      name: "برنامه واگذاری هتل‌ها و اموال مازاد",
      description: "شناسایی، ارزش‌گذاری و واگذاری اموال مازاد بنیاد از طریق مزایده‌ی عمومی.",
      client: "بنیاد مستضعفان انقلاب اسلامی",
      sponsor: d.sponsor,
      manager: d.manager,
      health: "قرمز",
      priority: "متوسط",
      phase: "برنامه‌ریزی",
      start: "۱۴۰۵/۰۳/۰۱",
      deadline: "۱۴۰۵/۰۶/۰۱",
      category: "مدیریت دارایی",
      tags: ["واگذاری", "مزایده"],
      icon: "Building2",
      color: "#dc2626",
      visibility: "خصوصی",
      workspace: "معاونت اقتصادی",
      starred: false,
      archived: false,
      financeOfficer: "واحد مالی",
      groupId: "pg3",
      createdAt: "۱۴۰۵/۰۳/۰۱",
    },
    columns: defaultColumns(),
    tasks,
    deps: deps.map(([a, b], i) => ({ id: `dp${i + 1}`, predecessor: a, successor: b, createdAt: "۱۴۰۵/۰۳/۰۱" })),
    members: [
      { id: "tm0", name: "پایگاه اطلاع‌رسانی بنیاد", title: "راهبر سامانه", role: "مالک", allocation: 5, userId: "u1" },
      ...d.team.map((m, i) => ({ id: m.id, name: m.name, title: m.role, role: (i === 0 ? "مدیر پروژه" : "عضو") as "مدیر پروژه" | "عضو", allocation: m.allocation })),
    ],
    milestones: [
      { ...d.milestones[0], owner: "واحد حقوقی", taskIds: ["t22"] },
      { ...d.milestones[1], owner: "واحد مالی", taskIds: ["t8"] },
      { ...d.milestones[2], owner: "واحد مالی", taskIds: ["t24"] },
    ],
    risks: d.risks.map((x) => ({ ...x, impact: "زیاد", taskId: "t8" })),
    issues: [],
    expenses: [{ ...findExp("pr3", "e1"), taskId: "t8", createdBy: "واحد حقوقی" }],
    budget: {
      total: parseRial(d.budgetTotal),
      lines: [
        { category: "خدمات مشاوره", allocated: 1_200_000_000 },
        { category: "تبلیغات و آگهی", allocated: 600_000_000 },
        { category: "حقوقی و ثبتی", allocated: 800_000_000 },
        { category: "سایر / ذخیره", allocated: 400_000_000 },
      ],
      revenue: 0,
      thresholds: [80, 100],
      firedThresholds: [],
    },
    timeLogs: [{ id: "tl1", member: "واحد حقوقی", taskId: "t22", hours: 40, date: "۱۴۰۵/۰۳/۰۷", note: "" }],
    meetings: [],
    minutes: [],
    documents: [],
    channels: [
      { id: "ch1", name: "عمومی", description: "گفتگوی عمومی تیم پروژه", members: "all", messages: [] },
      { id: "ch2", name: "اطلاع‌رسانی", description: "فقط اطلاعیه‌های مهم", members: "all", messages: [] },
    ],
    announcements: [],
    automation: defaultAutomation(),
    notifRules: {},
    logs: [
      L("PROJECT_CREATED", "پروژه «برنامه واگذاری هتل‌ها و اموال مازاد» ایجاد شد.", "پایگاه اطلاع‌رسانی بنیاد", "۱۴۰۵/۰۳/۰۱", "۰۹:۰۰", { type: "project", id: "pr3" }),
      L("RISK_ADDED", "ریسک «طولانی‌شدن فرآیند ارزش‌گذاری کارشناسی» ثبت شد.", "واحد حقوقی", "۱۴۰۵/۰۳/۰۲", "۱۰:۰۰", { type: "risk", id: "r1" }, { severity: "بحرانی" }),
      L("PROJECT_STATUS_CHANGED", "وضعیت پروژه از «زرد» به «قرمز» تغییر کرد.", "پایگاه اطلاع‌رسانی بنیاد", "۱۴۰۵/۰۳/۰۴", "۱۴:۰۰", { type: "project", id: "pr3" }, { old_status: "زرد", new_status: "قرمز" }),
      L("EXPENSE_ADDED", "هزینه‌ی «حق‌الزحمه هیئت کارشناسی رسمی» به مبلغ ۲۴۰٬۰۰۰٬۰۰۰ ریال ثبت شد.", "واحد حقوقی", "۱۴۰۵/۰۳/۰۵", "۱۱:۰۰", { type: "expense", id: "e1" }),
    ],
    firedReminders: [],
  };
}

export const seedProjectGroups = (): import("./types").ProjectGroup[] => [
  { id: "pg1", name: "محرومیت‌زدایی و عمران", description: "طرح‌های آبادانی، زیرساخت و اشتغال مناطق کم‌برخوردار", color: "#059669" },
  { id: "pg2", name: "تحول دیجیتال", description: "سامانه‌ها و زیرساخت‌های نرم‌افزاری بنیاد", color: "#1f4f99" },
  { id: "pg3", name: "دارایی و سرمایه‌گذاری", description: "واگذاری، ارزش‌گذاری و مدیریت دارایی‌ها", color: "#d97706" },
];

export function seedTemplates(): PMPlaybookTemplate[] {
  const stepsFor: Record<string, string[]> = {
    pb1: ["شناسایی منبع ترافیک", "فعال‌سازی محدودیت نرخ", "اطلاع به تیم امنیت", "تحلیل لاگ‌ها", "گزارش پس از رخداد"],
    pb2: ["بازدید فنی نهایی", "رفع نواقص", "تهیه‌ی صورت‌جلسه‌ی تحویل موقت", "هماهنگی مراسم افتتاح", "تحویل به بهره‌بردار", "بایگانی اسناد و تسویه"],
    pb3: ["تعیین سرفصل‌ها", "هماهنگی مدرس و مکان", "ثبت‌نام شرکت‌کنندگان", "برگزاری و ارزیابی"],
  };
  return legacyPlaybooks.map((pb) => {
    const titles = stepsFor[pb.id] ?? Array.from({ length: pb.steps }, (_, i) => `مرحله‌ی ${i + 1}`);
    return { id: pb.id, name: pb.name, category: pb.category, usedCount: pb.usedCount, steps: titles.map((t, i) => ({ id: `${pb.id}-s${i + 1}`, title: t, description: "" })) };
  });
}

export function seedExecutions(templates: PMPlaybookTemplate[]): PlaybookExecution[] {
  const pb2 = templates.find((t) => t.id === "pb2");
  if (!pb2) return [];
  return [
    {
      id: "ex1",
      templateId: pb2.id,
      templateName: pb2.name,
      projectId: "pr1",
      startedBy: "محسن مردعلی",
      status: "در حال اجرا",
      startedAt: "۱۴۰۵/۰۳/۰۳",
      steps: pb2.steps.map((s, i) => ({
        id: s.id,
        title: s.title,
        order: i + 1,
        status: i < 2 ? "انجام‌شده" : "در انتظار",
        completedBy: i < 2 ? "محسن مردعلی" : undefined,
        completedAt: i < 2 ? "۱۴۰۵/۰۳/۰۵" : undefined,
      })),
    },
  ];
}

/** ستون‌های قدیمی: برای نمایش kind هر ستون */
export const kindLabel: Record<ColumnKind, string> = {
  backlog: "برنامه‌ریزی‌شده (Backlog)",
  todo: "برای انجام (To Do)",
  doing: "در حال انجام (In Progress)",
  review: "در حال بررسی (Review)",
  blocked: "متوقف‌شده (Blocked)",
  done: "انجام‌شده (Done)",
};

/**
 * داده‌ی نمونه برای قابلیت‌های هم‌تراز Jira / Asana / ClickUp / میزیتو:
 * اسپرینت و امتیاز داستانی، زیرتسک، دنبال‌کننده، تسک تکرارشونده، درخواست تأیید،
 * فیلد سفارشی و قاعده‌ی خودکارسازی سفارشی — روی پروژه‌ی نمونه‌ی قلعه‌گنج.
 */
function enrichPr1<T extends { tasks: PMTask[] }>(s: T): T {
  const pts: Record<string, number> = { t9: 5, t10: 3, t1: 8, t2: 8, t3: 8, t11: 5, t4: 3, t12: 3, t13: 2, t14: 3, t15: 2 };
  const sprintOf: Record<string, string> = { t9: "sp1", t10: "sp1", t1: "sp1", t2: "sp2", t3: "sp2", t11: "sp2", t13: "sp2", t4: "sp3", t12: "sp3" };
  const cf: Record<string, Record<string, string>> = {
    t1: { cf1: "همه‌ی روستاها", cf2: "ق-۱۴۰۴-۱۲۳", cf3: "۴۲۰۰" },
    t2: { cf1: "دهستان رمشک", cf3: "۱۶۰" },
    t3: { cf1: "دهستان چاه‌دادخدا", cf2: "ق-۱۴۰۵-۰۱۸", cf3: "۱۱۰۰" },
    t11: { cf1: "دهستان رمشک", cf2: "ق-۱۴۰۵-۰۳۱" },
  };
  const tasks = s.tasks.map((t) => ({
    ...t,
    storyPoints: pts[t.id],
    sprintId: sprintOf[t.id],
    customFields: cf[t.id],
    ...(t.id === "t2" ? { watchers: ["پایگاه اطلاع‌رسانی بنیاد", "واحد مالی"] } : {}),
    ...(t.id === "t13" ? { watchers: ["پایگاه اطلاع‌رسانی بنیاد"] } : {}),
    ...(t.id === "t11"
      ? { approval: { approver: "پایگاه اطلاع‌رسانی بنیاد", requestedBy: "تیم تدارکات", status: "در انتظار" as const, at: "۱۴۰۵/۰۳/۰۷ ۱۰:۱۵" } }
      : {}),
  }));
  const extra: PMTask[] = [
    task({ id: "t16", parentId: "t11", title: "خرید ۸ دستگاه چرخ خیاطی صنعتی", assignee: "تیم تدارکات", start: "۱۴۰۵/۰۲/۲۰", due: "۱۴۰۵/۰۲/۳۰", status: "done", progress: 100, priority: "زیاد", labels: ["تدارکات"], storyPoints: 2, sprintId: "sp2" }),
    task({ id: "t17", parentId: "t11", title: "ترخیص ابزار صنایع‌دستی از گمرک", assignee: "تیم تدارکات", start: "۱۴۰۵/۰۳/۰۱", due: "۱۴۰۵/۰۳/۰۹", status: "doing", progress: 50, priority: "زیاد", labels: ["تدارکات"], storyPoints: 1, sprintId: "sp2" }),
    task({ id: "t19", parentId: "t3", title: "نقاشی و نصب پنجره‌های مدرسه‌ی رمشک", assignee: "تیم عمرانی", start: "۱۴۰۵/۰۳/۰۱", due: "۱۴۰۵/۰۳/۱۰", status: "doing", progress: 30, priority: "متوسط", labels: ["عمرانی"] }),
    task({ id: "t18", title: "گزارش هفتگی پیشرفت برای کارفرما", assignee: "پایگاه اطلاع‌رسانی بنیاد", start: "۱۴۰۵/۰۳/۰۸", due: "۱۴۰۵/۰۳/۰۹", status: "todo", priority: "متوسط", labels: ["مستندات"], recurrence: "هفتگی", storyPoints: 1, sprintId: "sp2", estHours: 2, watchers: ["محسن مردعلی"], description: "خلاصه‌ی پیشرفت، هزینه‌ها و مشکلات هفته برای بنیاد علوی — با انجام‌شدن، نمونه‌ی هفته‌ی بعد خودکار ساخته می‌شود." }),
    task({ id: "t20", title: "بازبینی قرارداد پیمانکار نقاشی مدارس", assignee: "پایگاه اطلاع‌رسانی بنیاد", start: "۱۴۰۵/۰۳/۰۵", due: "۱۴۰۵/۰۳/۰۷", status: "todo", priority: "زیاد", labels: ["حقوقی"], storyPoints: 1, sprintId: "sp2", estHours: 3 }),
  ];
  return {
    ...s,
    tasks: [...tasks, ...extra],
    sprints: [
      { id: "sp1", name: "اسپرینت ۱ — آب‌رسانی", goal: "تحویل موقت فاز اول آب‌رسانی", start: "۱۴۰۵/۰۲/۰۱", end: "۱۴۰۵/۰۲/۱۵", status: "تکمیل‌شده", committedPoints: 19, completedPoints: 16 },
      { id: "sp1b", name: "اسپرینت ۲ — تأمین", goal: "تأمین تجهیزات کارگاه‌ها", start: "۱۴۰۵/۰۲/۱۶", end: "۱۴۰۵/۰۲/۳۰", status: "تکمیل‌شده", committedPoints: 14, completedPoints: 12 },
      { id: "sp2", name: "اسپرینت ۳ — تجهیز و تحویل", goal: "استقرار کارگاه‌ها و تحویل موقت مدارس", start: "۱۴۰۵/۰۳/۰۱", end: "۱۴۰۵/۰۳/۱۴", status: "فعال", committedPoints: 29 },
      { id: "sp3", name: "اسپرینت ۴ — بهره‌برداری", goal: "آموزش تسهیل‌گران و جذب بهره‌برداران", start: "۱۴۰۵/۰۳/۱۵", end: "۱۴۰۵/۰۳/۲۸", status: "برنامه‌ریزی" },
    ],
    customFields: [
      { id: "cf1", name: "روستا / دهستان", type: "انتخابی", options: ["همه‌ی روستاها", "دهستان رمشک", "دهستان چاه‌دادخدا", "دهستان قلعه‌گنج"] },
      { id: "cf2", name: "کد قرارداد", type: "متن" },
      { id: "cf3", name: "تعداد ذی‌نفع", type: "عدد" },
    ],
    customRules: [
      { id: "cr1", name: "انتقال به «بازبینی» ← مدیر پروژه دنبال‌کننده شود", trigger: { type: "moved", columnId: "review" }, action: { type: "watch", member: "محسن مردعلی" }, enabled: true, runs: 3 },
      { id: "cr2", name: "برچسب «مالی» ← واگذاری به واحد مالی", trigger: { type: "labelAdded", label: "مالی" }, action: { type: "assign", member: "واحد مالی" }, enabled: true, runs: 1 },
      { id: "cr3", name: "ایجاد تسک ← افزودن «ثبت گزارش تصویری» به چک‌لیست", trigger: { type: "created" }, action: { type: "checklist", text: "ثبت گزارش تصویری" }, enabled: false, runs: 0 },
    ],
  };
}

export function seedProjects(): ProjectState[] {
  const scoped = withDemoScopes(legacyProjects, 18);
  const seeds = [enrichPr1(seedPr1()), seedPr2(), seedPr3()];
  return seeds.map((s) => {
    const sc = scoped.find((p) => p.id === s.meta.id)!;
    return { ...s, meta: { ...s.meta, scope: sc.scope, holdingId: sc.holdingId, companyId: sc.companyId, authorId: sc.authorId } } as ProjectState;
  });
}
