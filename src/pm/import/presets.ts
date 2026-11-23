// ---------------------------------------------------------------------------
// منابع درون‌ریزی کارها: هر ابزار = هم‌نام‌های سرستون (مقدم بر هم‌نام‌های عمومی csv.ts) + قواعد مقدار
// (جداکننده‌ی چندمقداری، واحد برآورد) + راهنمای گرفتن خروجی + فایل نمونه در public/samples.
// سرستون‌ها از راهنماهای عمومی خروجی هر ابزار؛ برای میزیتو نام دقیق ستون‌ها منتشر نشده و
// هم‌نام‌های فارسی رایج در نظر گرفته شده است.
// ---------------------------------------------------------------------------
import type { ImportField } from "../csv";

export type ImportSourceId = "trello" | "mizito" | "jira" | "clickup" | "asana" | "linear" | "generic";

export type ImportSource = {
  id: ImportSourceId;
  /** نام ابزار (فقط متن؛ بدون نشان تجاری) */
  name: string;
  /** زیرعنوان کاشی */
  formats: string;
  /** راه گرفتن خروجی در خود ابزار */
  howTo: string;
  accept: string;
  /** نام عبارت مبدأ در تاریخچه («واردشده از …») */
  historyName: string;
  sample: { file: string; label: string };
  synonyms: Partial<Record<ImportField, string[]>>;
  /** جداکننده‌ی چند مسئول/برچسب */
  split: RegExp;
  /** واحد عددِ بی‌واحد ستون برآورد */
  estUnit: "hours" | "seconds" | "ms";
};

const commonSplit = /\s*[;،,|]\s*/;

export const importSources: ImportSource[] = [
  {
    id: "trello",
    name: "ترلو (Trello)",
    formats: "فایل JSON بورد یا CSV",
    howTo: "در بورد ترلو: منو ‹ Print, export and share ‹ Export as JSON. ستون‌های بورد به وضعیت کارها تبدیل می‌شوند. خروجی CSV (نسخه‌ی Premium) هم پذیرفته می‌شود.",
    accept: ".json,application/json,.csv,text/csv",
    historyName: "ترلو",
    sample: { file: "trello-board.json", label: "trello-board.json" },
    synonyms: {
      title: ["card name"],
      description: ["card description"],
      status: ["list name"],
      assignee: ["members"],
      labels: ["labels"],
      due: ["due date"],
      start: ["start date"],
      key: ["card id"],
      archived: ["archived"],
    },
    split: commonSplit,
    estUnit: "hours",
  },
  {
    id: "mizito",
    name: "میزیتو",
    formats: "خروجی اکسل (‎.xlsx‎) یا CSV",
    howTo: "در میزیتو فهرست کارها را با «خروجی اکسل» بگیرید و همان فایل ‎.xlsx‎ را اینجا بدهید. تاریخ‌های شمسی (با یا بدون ساعت) و چند مسئول جداشده با «،» یا «-» خوانده می‌شوند.",
    accept: ".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    historyName: "میزیتو",
    sample: { file: "mizito-tasks.csv", label: "mizito-tasks.csv" },
    synonyms: {
      title: ["عنوان کار", "عنوان", "موضوع", "عنوان وظیفه"],
      description: ["شرح", "توضیحات", "شرح کار"],
      assignee: ["مسئول", "مسئولین", "مسئولان", "انجام‌دهنده", "انجام دهنده", "انجام دهندگان"],
      reporter: ["ایجادکننده", "ایجاد کننده", "ثبت‌کننده"],
      start: ["تاریخ شروع", "شروع"],
      due: ["مهلت", "مهلت انجام", "تاریخ پایان", "سررسید", "تاریخ سررسید"],
      reminder: ["تاریخ یادآوری", "یادآوری"],
      status: ["وضعیت"],
      priority: ["اولویت"],
      labels: ["برچسب", "برچسب‌ها"],
      checklist: ["چک‌لیست", "چک لیست"],
    },
    split: /\s*[;،,|]\s*|\s+-\s+|(?<=[^\s\d])-(?=[^\s\d])/,
    estUnit: "hours",
  },
  {
    id: "jira",
    name: "Jira",
    formats: "خروجی CSV",
    howTo: "در Jira: Filters ‹ جست‌وجوی کارها ‹ Export ‹ Export CSV (all fields). «Parent» به زیرکار و «Original Estimate» (ثانیه) به ساعت تبدیل می‌شود.",
    accept: ".csv,text/csv",
    historyName: "Jira",
    sample: { file: "jira-issues.csv", label: "jira-issues.csv" },
    synonyms: {
      title: ["summary"],
      key: ["issue key"],
      type: ["issue type"],
      status: ["status"],
      priority: ["priority"],
      assignee: ["assignee"],
      reporter: ["reporter"],
      start: ["custom field (start date)", "start date", "created"],
      due: ["due date"],
      description: ["description"],
      labels: ["labels"],
      parent: ["parent id", "parent", "parent key"],
      estHours: ["original estimate"],
      storyPoints: ["custom field (story points)", "custom field (story point estimate)"],
      completed: ["resolved"],
    },
    split: /\s*[;,]\s*/,
    estUnit: "seconds",
  },
  {
    id: "clickup",
    name: "ClickUp",
    formats: "خروجی CSV",
    howTo: "در ClickUp: Settings ‹ Export (یا خروجی نمای List/Table) با قالب CSV. تاریخ‌ها (میلی‌ثانیه) و «Time Estimated» خودکار تبدیل می‌شوند.",
    accept: ".csv,text/csv",
    historyName: "ClickUp",
    sample: { file: "clickup-tasks.csv", label: "clickup-tasks.csv" },
    synonyms: {
      title: ["task name"],
      description: ["task content", "description"],
      status: ["status"],
      priority: ["priority"],
      assignee: ["assignees"],
      due: ["due date", "due date text"],
      start: ["start date", "start date text"],
      labels: ["tags"],
      key: ["task id"],
      parent: ["parent id"],
      checklist: ["checklists"],
      estHours: ["time estimated"],
      reporter: ["created by"],
    },
    split: commonSplit,
    estUnit: "ms",
  },
  {
    id: "asana",
    name: "Asana",
    formats: "خروجی CSV",
    howTo: "در پروژه‌ی Asana: منوی پروژه ‹ Export/Print ‹ CSV. «Section/Column» به وضعیت و «Completed At» به «انجام‌شده» تبدیل می‌شود.",
    accept: ".csv,text/csv",
    historyName: "Asana",
    sample: { file: "asana-tasks.csv", label: "asana-tasks.csv" },
    synonyms: {
      title: ["name"],
      description: ["notes"],
      assignee: ["assignee"],
      due: ["due date"],
      start: ["start date"],
      status: ["section/column", "section"],
      labels: ["tags"],
      parent: ["parent task"],
      key: ["task id"],
      completed: ["completed at"],
    },
    split: commonSplit,
    estUnit: "hours",
  },
  {
    id: "linear",
    name: "Linear / Plane",
    formats: "خروجی CSV",
    howTo: "در Linear: Settings ‹ Import/Export ‹ Export CSV. در Plane: Settings ‹ Exports ‹ CSV. شناسه‌ی کار و «Parent» برای ساخت زیرکار استفاده می‌شود.",
    accept: ".csv,text/csv",
    historyName: "Linear/Plane",
    sample: { file: "linear-plane-issues.csv", label: "linear-plane-issues.csv" },
    synonyms: {
      title: ["title", "name"],
      description: ["description"],
      status: ["status", "state", "state name"],
      priority: ["priority"],
      assignee: ["assignee", "assignees"],
      labels: ["labels"],
      start: ["start date", "started"],
      due: ["due date", "target date"],
      parent: ["parent issue", "parent"],
      key: ["id", "identifier", "sequence id"],
      storyPoints: ["estimate"],
      completed: ["completed", "completed at"],
      archived: ["archived", "canceled"],
      reporter: ["creator", "created by"],
    },
    split: /\s*[;,|]\s*/,
    estUnit: "hours",
  },
  {
    id: "generic",
    name: "فایل Excel یا CSV دیگر",
    formats: "‎.xlsx‎ یا CSV با سرستون",
    howTo: "هر فایل جدولی که ردیف اول آن سرستون است؛ ستون‌ها در گام بعد به فیلدهای کاریز نگاشت می‌شوند. متن CSV را هم می‌توانید مستقیم بچسبانید.",
    accept: ".xlsx,.csv,text/csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    historyName: "فایل",
    sample: { file: "tasks-generic.csv", label: "tasks-generic.csv" },
    synonyms: {},
    split: commonSplit,
    estUnit: "hours",
  },
];

export const sourceById = (id: ImportSourceId) => importSources.find((s) => s.id === id) ?? importSources[importSources.length - 1];

/** نشانی فایل نمونه با توجه به base بیلد */
export const sampleUrl = (s: ImportSource) => `${import.meta.env.BASE_URL}samples/${s.sample.file}`;
