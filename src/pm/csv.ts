// ---------------------------------------------------------------------------
// درون‌ریزی CSV تسک‌ها — تجزیه‌ی CSV (کاما/نقطه‌ویرگول/تب، نقل‌قول)، نگاشت ستون‌ها
// با پیش‌تشخیص سرستون‌های فارسی و استاندارد Jira/Trello/Asana، و اعتبارسنجی ردیف‌ها.
// ---------------------------------------------------------------------------
import { formatJalali, gregorianToJalali, toEnDigits } from "./jalali";
import type { PMPriority, TaskType } from "./types";

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const firstLine = src.split("\n")[0] ?? "";
  const counts = [",", ";", "\t", "،"].map((d) => [d, firstLine.split(d).length - 1] as const);
  const delim = counts.sort((a, b) => b[1] - a[1])[0][1] > 0 ? counts[0][0] : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      row.push(cell.trim());
      cell = "";
    } else if (c === "\n") {
      row.push(cell.trim());
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

export type ImportField = "title" | "description" | "status" | "assignee" | "priority" | "start" | "due" | "estHours" | "labels" | "type" | "storyPoints";
export const importFields: { id: ImportField; label: string; required?: boolean; hints: string[] }[] = [
  { id: "title", label: "عنوان", required: true, hints: ["عنوان", "title", "summary", "card name", "name", "task name", "نام تسک"] },
  { id: "description", label: "توضیحات", hints: ["توضیحات", "شرح", "description", "card description", "notes"] },
  { id: "status", label: "وضعیت / ستون", hints: ["وضعیت", "ستون", "status", "list name", "section/column", "section"] },
  { id: "assignee", label: "مسئول", hints: ["مسئول", "assignee", "members", "assigned to", "owner"] },
  { id: "priority", label: "اولویت", hints: ["اولویت", "priority"] },
  { id: "start", label: "تاریخ شروع", hints: ["شروع", "start", "start date", "created"] },
  { id: "due", label: "سررسید", hints: ["سررسید", "پایان", "due", "due date", "deadline"] },
  { id: "estHours", label: "برآورد ساعت", hints: ["برآورد", "ساعت", "original estimate", "estimate", "hours", "time estimate"] },
  { id: "labels", label: "برچسب‌ها", hints: ["برچسب", "labels", "tags", "label"] },
  { id: "type", label: "نوع کار", hints: ["نوع", "issue type", "type"] },
  { id: "storyPoints", label: "امتیاز", hints: ["امتیاز", "story points", "story point estimate", "points"] },
];

/** پیش‌تشخیص نگاشت از روی سرستون‌ها */
export function autoMap(headers: string[]): Partial<Record<ImportField, number>> {
  const out: Partial<Record<ImportField, number>> = {};
  const norm = headers.map((h) => h.trim().toLowerCase());
  importFields.forEach((f) => {
    const exact = norm.findIndex((h) => f.hints.includes(h));
    const idx = exact >= 0 ? exact : norm.findIndex((h) => f.hints.some((x) => h.includes(x)));
    if (idx >= 0 && !Object.values(out).includes(idx)) out[f.id] = idx;
  });
  return out;
}

/** تاریخ شمسی یا میلادی (۲۰۲۶-۰۶-۰۱، 6/1/2026) → «۱۴۰۵/۰۳/۱۱» */
export function normalizeDate(v: string): string | null {
  const s = toEnDigits(v.trim());
  if (!s) return null;
  const m = s.match(/(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})/);
  if (!m) return null;
  let [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (a < 100 && c > 1000) [a, b, c] = [c, a, b]; // M/D/YYYY (خروجی Jira/Trello)
  if (a > 1700) {
    const [jy, jm, jd] = gregorianToJalali(a, b, c);
    return formatJalali(jy, jm, jd);
  }
  if (a >= 1300 && a < 1500 && b >= 1 && b <= 12 && c >= 1 && c <= 31) return formatJalali(a, b, c);
  return null;
}

const priorityMap: Record<string, PMPriority> = {
  کم: "کم", low: "کم", lowest: "کم", minor: "کم", trivial: "کم",
  متوسط: "متوسط", medium: "متوسط", normal: "متوسط",
  زیاد: "زیاد", high: "زیاد", major: "زیاد",
  بحرانی: "بحرانی", highest: "بحرانی", critical: "بحرانی", blocker: "بحرانی", urgent: "بحرانی", فوری: "بحرانی",
};
export const normalizePriority = (v: string): PMPriority | null => priorityMap[v.trim().toLowerCase()] ?? null;

const typeMap: Record<string, TaskType> = {
  تسک: "task", task: "task", وظیفه: "task",
  باگ: "bug", bug: "bug", خطا: "bug", defect: "bug",
  داستان: "story", story: "story", "user story": "story",
  اپیک: "epic", epic: "epic",
  زیرتسک: "subtask", "sub-task": "subtask", subtask: "subtask",
};
export const normalizeType = (v: string): TaskType | null => typeMap[v.trim().toLowerCase()] ?? null;
