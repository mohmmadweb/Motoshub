// ---------------------------------------------------------------------------
// فیلدهای سفارشی تسک: مقدار نمایشی، چندانتخابی و فرمول ساده (+ − × ÷ و پرانتز) روی فیلدهای عددی.
// در فرمول نام فیلد داخل [ ] می‌آید؛ فیلدهای داخلی هم در دسترس‌اند:
// [برآورد ساعت]، [بودجه]، [امتیاز]، [پیشرفت].
// ---------------------------------------------------------------------------
import { fa, fmtRial, toEnDigits } from "./jalali";
import type { CustomFieldDef, PMTask, ProjectState } from "./types";

export const MULTI_SEP = "، ";
export const splitMulti = (v: string | undefined) => (v ? v.split(/\s*[،,]\s*/).map((x) => x.trim()).filter(Boolean) : []);
export const joinMulti = (xs: string[]) => xs.join(MULTI_SEP);

export const builtinNumeric: { name: string; get: (t: PMTask) => number }[] = [
  { name: "برآورد ساعت", get: (t) => t.estHours || 0 },
  { name: "بودجه", get: (t) => t.estBudget || 0 },
  { name: "امتیاز", get: (t) => t.storyPoints || 0 },
  { name: "پیشرفت", get: (t) => t.progress || 0 },
];

const num = (v: string | undefined) => {
  const n = Number(toEnDigits(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** فیلدهایی که در فرمول قابل استفاده‌اند */
export const numericFields = (p: ProjectState) => (p.customFields ?? []).filter((f) => f.type === "عدد" || f.type === "مبلغ");

/** ارزیابی امن عبارت حسابی (بدون eval) — null اگر نامعتبر باشد */
export function evalArithmetic(expr: string): number | null {
  const src = toEnDigits(expr).replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/\s+/g, "");
  let i = 0;
  const peek = () => src[i];
  const parseExpr = (): number | null => {
    let v = parseTerm();
    while (v !== null && (peek() === "+" || peek() === "-")) {
      const op = src[i++];
      const r = parseTerm();
      if (r === null) return null;
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  const parseTerm = (): number | null => {
    let v = parseFactor();
    while (v !== null && (peek() === "*" || peek() === "/")) {
      const op = src[i++];
      const r = parseFactor();
      if (r === null) return null;
      v = op === "*" ? v * r : r === 0 ? null : v / r;
      if (v === null) return null;
    }
    return v;
  };
  const parseFactor = (): number | null => {
    if (peek() === "-") {
      i++;
      const v = parseFactor();
      return v === null ? null : -v;
    }
    if (peek() === "(") {
      i++;
      const v = parseExpr();
      if (peek() !== ")") return null;
      i++;
      return v;
    }
    const m = src.slice(i).match(/^\d+(\.\d+)?/);
    if (!m) return null;
    i += m[0].length;
    return Number(m[0]);
  };
  if (!src) return null;
  const v = parseExpr();
  return v !== null && i === src.length && Number.isFinite(v) ? v : null;
}

/** جایگذاری [نام فیلد] با مقدار عددی و محاسبه */
export function evalFormula(p: ProjectState, t: PMTask, formula: string | undefined, values?: Record<string, string>): number | null {
  if (!formula?.trim()) return null;
  const vals = values ?? t.customFields ?? {};
  let bad = false;
  const expr = formula.replace(/\[([^\]]+)\]/g, (_, raw: string) => {
    const name = raw.trim();
    const f = (p.customFields ?? []).find((x) => x.name === name && x.type !== "فرمول");
    if (f) return String(num(vals[f.id]));
    const b = builtinNumeric.find((x) => x.name === name);
    if (b) return String(b.get(t));
    bad = true;
    return "0";
  });
  if (bad) return null;
  return evalArithmetic(expr);
}

/** بررسی فرمول هنگام تعریف — پیام خطا یا null */
export function formulaError(p: ProjectState, formula: string): string | null {
  if (!formula.trim()) return "فرمول را وارد کنید.";
  const names = [...formula.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim());
  const unknown = names.filter((n) => !numericFields(p).some((f) => f.name === n) && !builtinNumeric.some((b) => b.name === n));
  if (unknown.length) return `فیلد عددی «${unknown[0]}» پیدا نشد.`;
  const test = formula.replace(/\[([^\]]+)\]/g, "1");
  return evalArithmetic(test) === null ? "عبارت حسابی نامعتبر است (فقط + − × ÷ و پرانتز)." : null;
}

/** مقدار نمایشی یک فیلد برای جدول/کارت */
export function cfDisplay(p: ProjectState, t: PMTask, f: CustomFieldDef, values?: Record<string, string>): string {
  const v = (values ?? t.customFields ?? {})[f.id] ?? "";
  if (f.type === "فرمول") {
    const r = evalFormula(p, t, f.formula, values);
    return r === null ? "—" : r.toLocaleString("fa-IR", { maximumFractionDigits: 2 });
  }
  if (!v) return "";
  if (f.type === "مبلغ") return fmtRial(num(v));
  if (f.type === "عدد") return fa(num(v), true);
  if (f.type === "چندانتخابی") return splitMulti(v).join("، ");
  return v;
}

/** مقدار خام برای شرط‌های خودکارسازی */
export function cfRaw(p: ProjectState, t: PMTask, fieldId: string): string {
  const f = (p.customFields ?? []).find((x) => x.id === fieldId);
  if (!f) return "";
  if (f.type === "فرمول") {
    const r = evalFormula(p, t, f.formula);
    return r === null ? "" : String(r);
  }
  return t.customFields?.[fieldId] ?? "";
}
