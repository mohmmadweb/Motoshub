// ---------------------------------------------------------------------------
// درون‌ریزی CSV تسک‌ها — تجزیه‌ی CSV (کاما/نقطه‌ویرگول/تب، نقل‌قول)، نگاشت ستون‌ها
// با پیش‌تشخیص سرستون‌های فارسی و استاندارد Jira/Trello/Asana، و اعتبارسنجی ردیف‌ها.
// ---------------------------------------------------------------------------
import { parseAnyDate } from "./import/dates";
import { toEnDigits } from "./jalali";
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

export type ImportField =
  | "title" | "description" | "status" | "assignee" | "priority" | "start" | "due" | "estHours" | "labels" | "type" | "storyPoints"
  | "reminder" | "checklist" | "key" | "parent" | "reporter" | "completed" | "archived";
export const importFields: { id: ImportField; label: string; required?: boolean; hints: string[] }[] = [
  { id: "title", label: "عنوان", required: true, hints: ["عنوان", "عنوان کار", "موضوع", "title", "summary", "card name", "task name", "name", "نام تسک"] },
  { id: "description", label: "توضیحات", hints: ["توضیحات", "شرح", "description", "card description", "task content", "notes"] },
  { id: "status", label: "وضعیت / ستون", hints: ["وضعیت", "ستون", "status", "state", "state name", "list name", "section/column", "section"] },
  { id: "assignee", label: "مسئول", hints: ["مسئول", "مسئولین", "مسئولان", "انجام‌دهنده", "انجام دهنده", "assignee", "assignees", "members", "assigned to", "owner"] },
  { id: "priority", label: "اولویت", hints: ["اولویت", "priority"] },
  { id: "start", label: "تاریخ شروع", hints: ["تاریخ شروع", "شروع", "start date", "start", "created"] },
  { id: "due", label: "سررسید", hints: ["مهلت", "سررسید", "تاریخ پایان", "پایان", "due date", "due", "target date", "deadline"] },
  { id: "reminder", label: "تاریخ یادآوری", hints: ["تاریخ یادآوری", "یادآوری", "reminder"] },
  { id: "estHours", label: "برآورد ساعت", hints: ["برآورد ساعت", "برآورد", "ساعت", "original estimate", "time estimated", "time estimate", "estimate", "hours"] },
  { id: "storyPoints", label: "امتیاز", hints: ["امتیاز", "story points", "story point estimate", "points"] },
  { id: "labels", label: "برچسب‌ها", hints: ["برچسب", "برچسب‌ها", "labels", "label", "tags"] },
  { id: "type", label: "نوع کار", hints: ["نوع", "نوع کار", "issue type", "type"] },
  { id: "checklist", label: "چک‌لیست", hints: ["چک‌لیست", "چک لیست", "checklists", "checklist"] },
  { id: "key", label: "شناسه در ابزار مبدأ", hints: ["شناسه", "issue key", "task id", "card id", "identifier", "id"] },
  { id: "parent", label: "والد (برای زیرکار)", hints: ["والد", "کار والد", "parent", "parent id", "parent task", "parent issue"] },
  { id: "reporter", label: "ایجادکننده (دنبال‌کننده)", hints: ["ایجادکننده", "ایجاد کننده", "reporter", "creator", "created by"] },
  { id: "completed", label: "تاریخ انجام (= انجام‌شده)", hints: ["تاریخ انجام", "completed at", "completed", "resolved"] },
  { id: "archived", label: "بایگانی‌شده", hints: ["بایگانی", "archived", "closed"] },
];

const normHeader = (h: string) => h.replace(/^\uFEFF/, "").replace(/\u200c/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * پیش‌تشخیص نگاشت از روی سرستون‌ها. `extra` = هم‌نام‌های ویژه‌ی هر ابزار (از presets) که مقدم‌اند.
 * ترتیب: اول تطبیق دقیق به ترتیب اولویت هم‌نام‌ها، بعد «شامل‌بودن» (فقط برای هم‌نام‌های ۴+ حرفی).
 */
export function autoMap(headers: string[], extra: Partial<Record<ImportField, string[]>> = {}): Partial<Record<ImportField, number>> {
  const out: Partial<Record<ImportField, number>> = {};
  const norm = headers.map(normHeader);
  const used = new Set<number>();
  const hintsOf = (f: (typeof importFields)[number]) => [...(extra[f.id] ?? []), ...f.hints].map(normHeader);
  // دور صفر: تطبیق دقیق هم‌نام‌های ویژه‌ی ابزار (تا مثلاً «Estimate» در Linear امتیاز شود نه ساعت)
  importFields.forEach((f) => {
    for (const h of (extra[f.id] ?? []).map(normHeader)) {
      const idx = norm.findIndex((x, i) => x === h && !used.has(i));
      if (idx >= 0) {
        out[f.id] = idx;
        used.add(idx);
        return;
      }
    }
  });
  // دور اول: تطبیق دقیق
  importFields.forEach((f) => {
    if (out[f.id] !== undefined) return;
    for (const h of hintsOf(f)) {
      const idx = norm.findIndex((x, i) => x === h && !used.has(i));
      if (idx >= 0) {
        out[f.id] = idx;
        used.add(idx);
        return;
      }
    }
  });
  // دور دوم: شامل‌بودن
  importFields.forEach((f) => {
    if (out[f.id] !== undefined) return;
    for (const h of hintsOf(f)) {
      if (h.length < 4) continue;
      const idx = norm.findIndex((x, i) => x.includes(h) && !used.has(i) && !/\btext\b|\bemail\b|ایمیل/.test(x));
      if (idx >= 0) {
        out[f.id] = idx;
        used.add(idx);
        return;
      }
    }
  });
  return out;
}

/** تاریخ شمسی یا میلادی در هر قالب رایج → «۱۴۰۵/۰۳/۱۱» (جزئیات در pm/import/dates) */
export function normalizeDate(v: string): string | null {
  return parseAnyDate(v);
}

const priorityMap: Record<string, PMPriority> = {
  کم: "کم", پایین: "کم", "خیلی کم": "کم", low: "کم", lowest: "کم", minor: "کم", trivial: "کم", "4": "کم",
  متوسط: "متوسط", عادی: "متوسط", معمولی: "متوسط", medium: "متوسط", normal: "متوسط", "3": "متوسط",
  "بدون اولویت": "متوسط", none: "متوسط", "no priority": "متوسط", "0": "متوسط",
  زیاد: "زیاد", بالا: "زیاد", مهم: "زیاد", high: "زیاد", major: "زیاد", "2": "زیاد",
  بحرانی: "بحرانی", "خیلی زیاد": "بحرانی", "خیلی بالا": "بحرانی", "خیلی مهم": "بحرانی", highest: "بحرانی", critical: "بحرانی", blocker: "بحرانی", urgent: "بحرانی", فوری: "بحرانی", "1": "بحرانی",
};
/** اولویت هر ابزار (Jira/ClickUp/Linear/Plane/میزیتو؛ ClickUp و Linear: ۱=فوری … ۴=کم) ← اولویت‌های کاریز */
export const normalizePriority = (v: string): PMPriority | null => priorityMap[toEnDigits(v).replace(/^\d+\s*[-–]\s*/, "").trim().toLowerCase()] ?? priorityMap[toEnDigits(v).trim()] ?? null;

const typeMap: Record<string, TaskType> = {
  تسک: "task", task: "task", وظیفه: "task", کار: "task", improvement: "task", "new feature": "story", feature: "story",
  باگ: "bug", bug: "bug", خطا: "bug", defect: "bug", incident: "bug",
  داستان: "story", story: "story", "user story": "story",
  اپیک: "epic", epic: "epic",
  زیرتسک: "subtask", "زیر کار": "subtask", زیرکار: "subtask", "sub-task": "subtask", subtask: "subtask",
};
export const normalizeType = (v: string): TaskType | null => typeMap[v.trim().toLowerCase()] ?? null;
