// کمک‌تابع‌های مشترک ماژول‌های نوآوری (محاسبه‌ی میانگین وزنی داوری، تبدیل مبلغ، CSV)
import { toEnDigits } from "../pm/jalali";
import type { EcoEntity, EntityKind, Review, RubricItem } from "./types";
import { keyFields } from "./types";

export const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** «۲٬۵۰۰ میلیون ریال» / «۱۸ میلیارد ریال» / «۸۰۰٬۰۰۰٬۰۰۰ ریال» → عدد ریال */
export function toRial(s: string | number | undefined): number {
  if (typeof s === "number") return s;
  if (!s) return 0;
  const en = toEnDigits(s).replace(/[٬,]/g, "");
  const m = en.match(/[\d.]+/);
  if (!m) return 0;
  const n = parseFloat(m[0]);
  if (en.includes("میلیارد")) return n * 1e9;
  if (en.includes("میلیون")) return n * 1e6;
  return n;
}

export const num = (s: string) => Number(toEnDigits(s).replace(/[^\d.]/g, "")) || 0;
export const faN = (n: number | undefined, digits = 0) => (n ?? 0).toLocaleString("fa-IR", { maximumFractionDigits: digits });

/** مبلغ کوتاه: «۲٫۵ میلیارد ریال» */
export function rialShort(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(Math.round((n / 1e9) * 10) / 10).toLocaleString("fa-IR")} میلیارد ریال`;
  if (a >= 1e6) return `${Math.round(n / 1e6).toLocaleString("fa-IR")} میلیون ریال`;
  return `${Math.round(n).toLocaleString("fa-IR")} ریال`;
}

/** امتیاز وزنی یک داوری (نمره‌ی هر معیار ۰ تا ۱۰) → ۰ تا ۱۰۰ */
export function weighted(scores: number[], rubric: RubricItem[]): number {
  const tw = rubric.reduce((s, r) => s + r.weight, 0) || 1;
  const v = rubric.reduce((s, r, i) => s + (scores[i] ?? 0) * r.weight, 0);
  return Math.round((v / tw) * 10 * 10) / 10;
}

export function mean(xs: number[]): number | undefined {
  if (!xs.length) return undefined;
  return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.round(Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length) * 10) / 10;
}

export function reviewSummary(reviews: Review[], rubric: RubricItem[]) {
  const valid = reviews.filter((r) => r.noConflict);
  const totals = valid.map((r) => weighted(r.scores, rubric));
  return { avg: mean(totals), sd: stdev(totals), count: valid.length };
}

/** نام‌ها را برای تطبیق یکسان می‌کند (ی/ک عربی، فاصله‌ها، پیشوند «شرکت») */
export function normName(s: string): string {
  return s
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/‌/g, " ")
    .replace(/^(شرکت|تیم فناور|تیم)\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findEntityByName(entities: EcoEntity[], name: string | undefined): EcoEntity | undefined {
  if (!name) return undefined;
  const n = normName(name);
  return entities.find((e) => normName(e.name) === n) ?? entities.find((e) => n.length > 3 && (normName(e.name).includes(n) || n.includes(normName(e.name))));
}

export function completeness(e: EcoEntity): number {
  const fields = keyFields[e.kind];
  const filled = fields.filter((f) => {
    const v = e[f.key];
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && String(v).trim() !== "";
  }).length;
  return Math.round((filled / fields.length) * 100);
}

export function displayValue(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join("، ") : "—";
  if (typeof v === "number") return v.toLocaleString("fa-IR");
  return String(v);
}

// ------------------------------------------------------------------ CSV
/** تجزیه‌ی CSV با پشتیبانی از نقل‌قول، کاما/نقطه‌ویرگول/تب */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/)[0] ?? "";
  const delim = firstLine.includes("\t") ? "\t" : firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (q) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') q = true;
    else if (ch === delim) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => {
    const s = String(c ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
}

export function downloadText(name: string, text: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿" + text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/** چاپ یک سند HTML مستقل (گواهی و …) در پنجره‌ی جدید */
export function printHtml(title: string, body: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return false;
  w.document.write(`<!doctype html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>${title}</title>
<style>
@page{size:A4 landscape;margin:14mm}
body{font-family:"Sahel FD",Tahoma,sans-serif;margin:0;color:#0f172a;background:#fff}
.cert{border:6px double #1f4f99;border-radius:14px;padding:42px 56px;text-align:center;min-height:440px;display:flex;flex-direction:column;justify-content:center;gap:12px}
.cert h1{font-size:30px;margin:0;color:#1f4f99}.cert .name{font-size:26px;font-weight:bold;margin:8px 0}
.cert p{font-size:15px;line-height:2;margin:0}.meta{display:flex;justify-content:space-between;margin-top:36px;font-size:12px;color:#475569}
.sign{border-top:1px solid #94a3b8;padding-top:6px;width:200px}
</style></head><body>${body}<script>setTimeout(function(){window.print()},300)</script></body></html>`);
  w.document.close();
  return true;
}

export const kindOf = (k: EntityKind) => (k === "company" ? "شرکت" : "پژوهشگر");
