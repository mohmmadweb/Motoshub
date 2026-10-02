// ---------------------------------------------------------------------------
// ابزارهای متنی مدیریت دانش: نرمال‌سازی فارسی برای جستجو، برش متن نتیجه (snippet)
// با محل تطبیق، و مقایسه‌ی سطربه‌سطر دو متن (diff) برای نسخه‌ها.
// همین قواعد باید در نمایه‌ساز بک‌اند هم اعمال شود (docs/KM_DATA_MODEL.md).
// ---------------------------------------------------------------------------

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** نرمال‌سازی یک نویسه؛ رشته‌ی خالی یعنی حذف */
function normChar(c: string): string {
  const code = c.charCodeAt(0);
  // اعراب، تنوین، سکون، تشدید، الف خنجری و کشیده
  if ((code >= 0x064b && code <= 0x065f) || code === 0x0670 || code === 0x0640) return "";
  // نیم‌فاصله و نویسه‌های جهت‌دهی نامرئی → فاصله
  if (code === 0x200c || code === 0x200d || code === 0x200e || code === 0x200f || code === 0x00a0) return " ";
  switch (c) {
    case "ي":
    case "ى":
    case "ئ":
      return "ی";
    case "ك":
      return "ک";
    case "ة":
      return "ه";
    case "ۀ":
      return "ه";
    case "أ":
    case "إ":
    case "ٱ":
      return "ا";
    case "ؤ":
      return "و";
  }
  const fi = FA_DIGITS.indexOf(c);
  if (fi >= 0) return String(fi);
  const ai = AR_DIGITS.indexOf(c);
  if (ai >= 0) return String(ai);
  return c.toLowerCase();
}

/** متن نرمال‌شده برای مقایسه (ی/ي، ک/ك، نیم‌فاصله، ارقام، اعراب، حروف کوچک) */
export function normalizeFa(s: string): string {
  let out = "";
  for (const c of s) out += normChar(c);
  return out.replace(/\s+/g, " ").trim();
}

/** نرمال‌سازی همراه با نگاشت هر نویسه‌ی خروجی به اندیس متن اصلی (برای برجسته‌سازی) */
export function normWithMap(s: string): { n: string; map: number[] } {
  let n = "";
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const r = normChar(s[i]);
    for (const ch of r) {
      // فاصله‌های پشت‌سرهم را یکی کن
      if (ch === " " && n.endsWith(" ")) continue;
      n += ch;
      map.push(i);
    }
  }
  return { n, map };
}

/** واژه‌های پرسش پس از نرمال‌سازی */
export function queryTerms(q: string): string[] {
  return normalizeFa(q)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** همه‌ی واژه‌ها در متن هستند؟ */
export function matchesAll(text: string, terms: string[]): boolean {
  if (!terms.length) return true;
  const n = normalizeFa(text);
  return terms.every((t) => n.includes(t));
}

/** بازه‌های تطبیق در متن اصلی */
export function matchRanges(text: string, terms: string[]): [number, number][] {
  if (!terms.length || !text) return [];
  const { n, map } = normWithMap(text);
  const ranges: [number, number][] = [];
  terms.forEach((t) => {
    let from = 0;
    for (;;) {
      const i = n.indexOf(t, from);
      if (i < 0) break;
      const start = map[i];
      const end = (map[i + t.length - 1] ?? map[map.length - 1]) + 1;
      ranges.push([start, end]);
      from = i + Math.max(1, t.length);
    }
  });
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  ranges.forEach((r) => {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  });
  return merged;
}

/** قطعه‌ای از متن پیرامون نخستین تطبیق */
export function snippetOf(text: string, terms: string[], radius = 70): string {
  const flat = text.replace(/\f/g, " ").replace(/[#*`>|]/g, "").replace(/\s+/g, " ").trim();
  const r = matchRanges(flat, terms)[0];
  if (!r) return flat.length > radius * 2 ? `${flat.slice(0, radius * 2)}…` : flat;
  const s = Math.max(0, r[0] - radius);
  const e = Math.min(flat.length, r[1] + radius);
  return `${s > 0 ? "…" : ""}${flat.slice(s, e)}${e < flat.length ? "…" : ""}`;
}

/** شماره‌ی صفحه‌ای (از ۱) که تطبیق در آن است؛ صفحه‌ها با \f جدا شده‌اند */
export function pageOfMatch(text: string, terms: string[]): number | undefined {
  const pages = text.split("\f");
  const i = pages.findIndex((p) => matchesAll(p, terms));
  return i >= 0 ? i + 1 : undefined;
}

/** Markdown → متن ساده (برای نمایه و پیش‌نمایش کوتاه) */
export function mdToPlain(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*/g, ""))
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\|/g, " ")
    .replace(/^\s*-{3,}\s*$/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// مقایسه‌ی سطربه‌سطر (LCS)
// ---------------------------------------------------------------------------
export type DiffLine = { type: "same" | "add" | "del"; text: string; a?: number; b?: number };

export function diffLines(a: string, b: string): DiffLine[] {
  const A = a.replace(/\f/g, "\n").split("\n");
  const B = b.replace(/\f/g, "\n").split("\n");
  const n = A.length;
  const m = B.length;
  // جدول LCS — اسناد نمونه کوتاه‌اند؛ برای متن‌های بلند بک‌اند از الگوریتم Myers استفاده کند
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      out.push({ type: "same", text: A[i], a: i + 1, b: j + 1 });
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) {
      out.push({ type: "del", text: A[i], a: i + 1 });
      i++;
    } else {
      out.push({ type: "add", text: B[j], b: j + 1 });
      j++;
    }
  }
  while (i < n) out.push({ type: "del", text: A[i], a: ++i });
  while (j < m) out.push({ type: "add", text: B[j], b: ++j });
  return out;
}

/** CSV با BOM برای اکسل فارسی */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob(["﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const el = document.createElement("a");
  el.href = url;
  el.download = filename;
  el.click();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

/** متن قابل مقایسه‌ی یک نسخه: متن مقاله، وگرنه متن استخراج‌شده‌ی فایل‌ها */
export function versionText(v: { body?: string; files: { name: string; text?: string }[] }): string {
  if (v.body !== undefined && v.body.trim()) return v.body;
  return v.files.map((f) => (f.text ? f.text : `[${f.name}]`)).join("\n\n");
}
