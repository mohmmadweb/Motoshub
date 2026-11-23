// ---------------------------------------------------------------------------
// مدل میانی درون‌ریزی: هر منبع (جدول CSV/اکسل یا JSON ترلو) اول به RawTask تبدیل می‌شود؛
// سپس با نگاشت وضعیت‌ها و افراد به NewTaskInput کاریز (buildImport) — با شمارش و دلیل ردشدن.
// ---------------------------------------------------------------------------
import type { NewTaskInput } from "../../context/ProjectsContext";
import { normalizePriority, normalizeType, type ImportField } from "../csv";
import { addDays, diffDays } from "../jalali";
import { parseAnyDate, parseDurationHours } from "./dates";
import type { BoardColumn, ColumnKind, PMMember } from "../types";
import type { ImportSource } from "./presets";

export type RawComment = { author: string; at: string; text: string };

export type RawTask = {
  /** شماره‌ی ردیف فایل یا ترتیب کارت */
  line: number;
  /** شناسه‌های این کار در ابزار مبدأ (کلید، id) برای پیداکردن والد */
  refs: string[];
  parentRef?: string;
  title: string;
  description: string;
  /** کلید وضعیت خام (ترلو: id لیست؛ جدول: متن وضعیت) */
  status: string;
  /** نام نمایشی وضعیت (ترلو: نام لیست) */
  statusLabel?: string;
  done?: boolean;
  people: string[];
  watchers: string[];
  priority: string;
  type: string;
  start: string;
  due: string;
  reminder: string;
  labels: string[];
  checklist: string[];
  /** موارد چک‌لیستی که در ابزار مبدأ تیک خورده‌اند */
  checklistDone?: string[];
  estHours: number;
  storyPoints?: number;
  comments: RawComment[];
  /** دلیل کنار گذاشتن پیش‌فرض (مثلاً بایگانی‌شده در مبدأ) — با کلید «شامل بایگانی‌ها» برمی‌گردد */
  archived?: boolean;
};

/** گزینه‌های وضعیت خام برای گام نگاشت وضعیت */
export type StatusOption = { key: string; label: string; count: number; archived?: boolean };

// ------------------------------------------------------------------ جدول ← RawTask
const truthy = (v: string) => !!v && !/^(false|no|0|خیر|نه|-)$/i.test(v.trim());

/** «[a, b]» (ClickUp) و «x (green)» (برچسب‌های ترلو CSV) را پاک می‌کند و چندمقداری را جدا می‌کند */
export function splitMulti(v: string, re: RegExp): string[] {
  const s = v.trim().replace(/^\[(.*)\]$/s, "$1");
  if (!s) return [];
  return s
    .split(re)
    .map((x) => x.replace(/^["']|["']$/g, "").replace(/\s*\((green|yellow|orange|red|purple|blue|sky|lime|pink|black|[a-z_]+)\)$/i, "").trim())
    .filter(Boolean);
}

/** چک‌لیست: JSON (ClickUp) یا فهرست چندخطی/جداشده با ؛ | (میزیتو) */
export function splitChecklist(v: string): string[] {
  const s = v.trim();
  if (!s) return [];
  if (/^[[{]/.test(s)) {
    try {
      const names: string[] = [];
      const walk = (x: unknown) => {
        if (Array.isArray(x)) x.forEach(walk);
        else if (x && typeof x === "object") {
          const o = x as Record<string, unknown>;
          if (typeof o.name === "string" && !Array.isArray(o.items) && !Array.isArray(o.checkItems)) names.push(o.name);
          Object.values(o).forEach((y) => typeof y === "object" && walk(y));
        } else if (typeof x === "string") names.push(x);
      };
      walk(JSON.parse(s));
      if (names.length) return names.map((n) => n.trim()).filter(Boolean);
    } catch {
      /* متن ساده */
    }
  }
  return s
    .split(/\r?\n|[؛;|]/)
    .map((x) => x.replace(/^\s*([-*•▫☐☑✓✔]|\[[ xX]\]|\d+[.)-])\s*/, "").trim())
    .filter(Boolean);
}

const ID_HEADERS = ["issue id", "issue key", "task id", "card id", "id", "identifier", "شناسه", "key"];

export function tableToRaw(rows: string[][], map: Partial<Record<ImportField, number>>, src: ImportSource): RawTask[] {
  const headers = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const body = rows.slice(1);
  /** ستون‌های هم‌نام (Jira برای هر برچسب/اسپرینت یک ستون «Labels» جدا می‌دهد) */
  const sameCols = (f: ImportField) => {
    const i = map[f];
    if (i === undefined) return [];
    return headers.map((h, j) => (h === headers[i] ? j : -1)).filter((j) => j >= 0);
  };
  const labelCols = sameCols("labels");
  const peopleCols = sameCols("assignee");
  const idCols = headers.map((h, j) => (ID_HEADERS.includes(h) || j === map.key ? j : -1)).filter((j) => j >= 0);
  const get = (r: string[], f: ImportField) => (map[f] !== undefined ? (r[map[f]!] ?? "").trim() : "");
  return body.map((r, i) => {
    const people = peopleCols.flatMap((j) => splitMulti(r[j] ?? "", src.split));
    const labels = [...new Set(labelCols.flatMap((j) => splitMulti(r[j] ?? "", /\s*[;،,|]\s*/)))];
    const pts = Number(get(r, "storyPoints").replace(/[^\d.۰-۹]/g, "").replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))));
    return {
      line: i + 2,
      refs: [...new Set(idCols.map((j) => (r[j] ?? "").trim()).filter(Boolean))],
      parentRef: get(r, "parent") || undefined,
      title: get(r, "title"),
      description: get(r, "description"),
      status: get(r, "status"),
      done: truthy(get(r, "completed")),
      people,
      watchers: splitMulti(get(r, "reporter"), src.split),
      priority: get(r, "priority"),
      type: get(r, "type"),
      start: get(r, "start"),
      due: get(r, "due"),
      reminder: get(r, "reminder"),
      labels,
      checklist: splitChecklist(get(r, "checklist")),
      estHours: parseDurationHours(get(r, "estHours"), src.estUnit),
      storyPoints: pts > 0 ? pts : undefined,
      comments: [],
      archived: truthy(get(r, "archived")),
    };
  });
}

export function statusOptionsOf(raw: RawTask[], names?: Map<string, { label: string; archived?: boolean }>): StatusOption[] {
  const count = new Map<string, number>();
  raw.forEach((t) => t.status && count.set(t.status, (count.get(t.status) ?? 0) + 1));
  const keys = names ? [...names.keys()] : [...count.keys()];
  return keys.map((k) => ({ key: k, label: names?.get(k)?.label ?? k, archived: names?.get(k)?.archived, count: count.get(k) ?? 0 }));
}

// ------------------------------------------------------------------ حدس نگاشت
/** حدس ستون بورد از روی نام وضعیت/لیست (To Do/Doing/Done، «انجام شد» …) */
export function guessKind(label: string): ColumnKind | "" {
  const s = label.trim().toLowerCase().replace(/‌/g, " ");
  if (!s) return "";
  if (/review|qa\b|test|verify|approval|بازبینی|بررسی|تست|تأیید|تایید|کنترل/.test(s)) return "review";
  if (/block|hold|stuck|wait|impediment|متوقف|معلق|مسدود|منتظر|انتظار|گیر/.test(s)) return "blocked";
  if (/progress|doing|working|in dev|develop|started|wip|در حال|در دست|جاری|درحال|اجرا/.test(s)) return "doing";
  if (/not (done|started)|انجام نشده|شروع نشده/.test(s)) return "todo";
  if (/done|closed|resolved|complete|finished|shipped|released|cancel|انجام شد|انجام شده|انجام‌شده|تمام|بسته|خاتمه|پایان یافته|لغو/.test(s)) return "done";
  if (/to ?do|open|ready|selected|new|next|this week|برای انجام|جدید|باز|آماده|انجام/.test(s)) return "todo";
  if (/backlog|idea|later|someday|triage|icebox|برنامه|ایده|بعدا|بعداً|بک لاگ|صف/.test(s)) return "backlog";
  return "";
}

export function guessColumn(label: string, columns: BoardColumn[]): string {
  const t = label.trim();
  const byLabel = columns.find((c) => c.label.trim() === t);
  if (byLabel) return byLabel.id;
  const kind = guessKind(t);
  return (kind && columns.find((c) => c.kind === kind)?.id) || "";
}

const normName = (s: string) => s.trim().toLowerCase().replace(/[‌\s._-]+/g, " ").replace(/ي/g, "ی").replace(/ك/g, "ک");

/** حدس عضو پروژه برای نام/ایمیل/نام‌کاربری فایل؛ پیدانشد ← همان نام */
export function guessMember(raw: string, members: PMMember[]): string {
  const n = normName(raw.replace(/@.*$/, ""));
  if (!n) return raw;
  const exact = members.find((m) => normName(m.name) === n);
  if (exact) return exact.name;
  const part = members.filter((m) => normName(m.name).includes(n) || n.includes(normName(m.name)));
  return part.length === 1 ? part[0].name : raw;
}

// ------------------------------------------------------------------ RawTask ← NewTaskInput
export type ImportItem = {
  line: number;
  input: NewTaskInput;
  errors: string[];
  warns: string[];
  /** ردشده (بایگانی یا خطا) */
  skip?: string;
  isSub: boolean;
  comments: RawComment[];
};

export type ImportPlan = {
  items: ImportItem[];
  ready: ImportItem[];
  stats: { tasks: number; subtasks: number; checklist: number; labels: number; comments: number; unmappedPeople: string[]; skipped: { reason: string; count: number }[] };
};

export function buildImport(
  raw: RawTask[],
  o: {
    columns: BoardColumn[];
    members: PMMember[];
    refDate: string;
    statusMap: Record<string, string>;
    peopleMap: Record<string, string>;
    includeArchived: boolean;
    idPrefix: string;
  }
): ImportPlan {
  const memberNames = new Set(o.members.map((m) => m.name));
  const doneCol = o.columns.find((c) => c.kind === "done")?.id;
  const person = (x: string) => (o.peopleMap[x] !== undefined ? o.peopleMap[x] : x);

  const items: ImportItem[] = raw.map((r, i) => {
    const errors: string[] = [];
    const warns: string[] = [];
    if (!r.title) errors.push("عنوان خالی است");
    const startP = r.start ? parseAnyDate(r.start) : null;
    const dueP = r.due ? parseAnyDate(r.due) : null;
    if (r.start && !startP) warns.push(`تاریخ شروع «${r.start}» خوانده نشد`);
    if (r.due && !dueP) warns.push(`سررسید «${r.due}» خوانده نشد ← یک هفته بعد از شروع`);
    let start = startP ?? (dueP && diffDays(o.refDate, dueP) < 0 ? dueP : o.refDate);
    const due = dueP ?? addDays(start, 7);
    if (diffDays(start, due) < 0) {
      warns.push("سررسید قبل از شروع بود ← شروع = سررسید");
      start = due;
    }
    const reminder = r.reminder ? parseAnyDate(r.reminder) : null;
    if (r.reminder && !reminder) warns.push(`یادآوری «${r.reminder}» خوانده نشد`);

    let status = r.status ? o.statusMap[r.status] || undefined : undefined;
    if (r.status && !status) warns.push(`وضعیت «${r.statusLabel ?? r.status}» نگاشت نشد ← ستون اول`);
    if (r.done && doneCol && (!status || o.columns.find((c) => c.id === status)?.kind !== "done")) status = doneCol;

    const ppl = [...new Set(r.people.map(person).filter(Boolean))];
    const [assignee = "", ...co] = ppl;
    ppl.filter((x) => !memberNames.has(x)).forEach((x) => warns.push(`«${x}» عضو پروژه نیست`));
    const watchers = [...new Set(r.watchers.map(person).filter((x) => x && memberNames.has(x) && !ppl.includes(x)))];

    const priority = r.priority ? normalizePriority(r.priority) : "متوسط";
    if (r.priority && !priority) warns.push(`اولویت «${r.priority}» ← متوسط`);
    const type = r.type ? normalizeType(r.type) : null;
    if (r.type && !type) warns.push(`نوع «${r.type}» ← تسک`);

    const input: NewTaskInput = {
      id: `${o.idPrefix}${i}`,
      title: r.title,
      description: r.description,
      assignee,
      priority: priority ?? "متوسط",
      start,
      due,
      status,
      labels: r.labels,
      estHours: Math.round(r.estHours * 100) / 100,
      storyPoints: r.storyPoints,
      type: type ?? undefined,
      ...(co.length ? { coAssignees: co } : {}),
      ...(watchers.length ? { watchers } : {}),
      ...(reminder ? { reminder } : {}),
      ...(r.checklist.length ? { checklist: r.checklist } : {}),
      ...(r.checklistDone?.length ? { checklistDone: r.checklistDone } : {}),
    };
    const skip = errors.length ? errors[0] : r.archived && !o.includeArchived ? "بایگانی‌شده یا لغوشده در ابزار مبدأ" : undefined;
    return { line: r.line, input, errors, warns, skip, isSub: false, comments: r.comments };
  });

  // ---- والد/زیرکار: والد اپیک ← epicId؛ والد عادی ← parentId (فقط یک سطح: فاز ← کار ← زیرکار)
  const byRef = new Map<string, number>();
  raw.forEach((r, i) => r.refs.forEach((k) => byRef.set(k.toLowerCase(), i)));
  const byTitle = new Map<string, number>();
  raw.forEach((r, i) => r.title && !byTitle.has(r.title.toLowerCase()) && byTitle.set(r.title.toLowerCase(), i));
  const parentIdx = raw.map((r, i) => {
    if (!r.parentRef) return -1;
    const k = r.parentRef.toLowerCase();
    const j = byRef.get(k) ?? byTitle.get(k) ?? -1;
    return j === i ? -1 : j;
  });
  items.forEach((it, i) => {
    const r = raw[i];
    if (!r.parentRef || it.skip) return;
    let j = parentIdx[i];
    if (j < 0) {
      it.warns.push(`والد «${r.parentRef}» در فایل نیست ← کار مستقل`);
      return;
    }
    if (items[j].skip) {
      it.warns.push("والد این کار وارد نمی‌شود ← کار مستقل");
      return;
    }
    if (items[j].input.type === "epic") {
      it.input.epicId = items[j].input.id;
      return;
    }
    // زیرِ زیرکار ← به کار اصلی (بالاترین والد غیراپیک) وصل می‌شود
    const seen = new Set([i]);
    while (parentIdx[j] >= 0 && !seen.has(parentIdx[j]) && !items[parentIdx[j]].skip && items[parentIdx[j]].input.type !== "epic") {
      seen.add(j);
      j = parentIdx[j];
    }
    if (j !== parentIdx[i]) it.warns.push("زیرکارِ زیرکار بود ← زیر کار اصلی قرار گرفت");
    if (items[j].input.type === "epic") {
      it.input.epicId = items[j].input.id;
      return;
    }
    it.input.parentId = items[j].input.id;
    if (it.input.type && it.input.type !== "subtask") it.input.type = "subtask";
    it.isSub = true;
  });
  const ready = items.filter((x) => !x.skip);
  // والدها پیش از فرزندان درج می‌شوند
  ready.sort((a, b) => Number(a.isSub) - Number(b.isSub));

  const skippedMap = new Map<string, number>();
  items.filter((x) => x.skip).forEach((x) => skippedMap.set(x.skip!, (skippedMap.get(x.skip!) ?? 0) + 1));
  const unmapped = new Set<string>();
  ready.forEach((x) => [x.input.assignee, ...(x.input.coAssignees ?? [])].forEach((n) => n && !memberNames.has(n) && unmapped.add(n)));
  return {
    items,
    ready,
    stats: {
      tasks: ready.filter((x) => !x.isSub).length,
      subtasks: ready.filter((x) => x.isSub).length,
      checklist: ready.reduce((a, x) => a + (x.input.checklist?.length ?? 0), 0),
      labels: new Set(ready.flatMap((x) => x.input.labels ?? [])).size,
      comments: ready.reduce((a, x) => a + x.comments.length, 0),
      unmappedPeople: [...unmapped],
      skipped: [...skippedMap].map(([reason, count]) => ({ reason, count })),
    },
  };
}

