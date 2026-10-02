// ---------------------------------------------------------------------------
// فرم‌ساز مشترک فراخوان‌های پژوهشی، فرصت مطالعاتی و جایزه.
// سازنده‌ی فراخوان/مدیر جایزه فیلدها و «شرایط احراز» را تعریف می‌کند؛ متقاضی همان
// فرم را در جریان ثبت درخواست پر می‌کند و شرایط هنگام ارسال با دلیل روشن سنجیده می‌شوند.
// (این فقط احراز شرایط پایه است — موتور امتیاز اعتباری ساخته نمی‌شود.)
// ---------------------------------------------------------------------------
import { dayNum, toEnDigits } from "../pm/jalali";
import type { EcoEntity, EntityKind } from "./types";
import { kbTypes } from "./types";

export type FormFieldType = "text" | "longText" | "number" | "file" | "select" | "multi" | "date" | "entity";

export const fieldTypeLabel: Record<FormFieldType, string> = {
  text: "متن کوتاه",
  longText: "متن بلند",
  number: "عدد",
  file: "پیوست فایل",
  select: "انتخاب از فهرست",
  multi: "چندانتخابی",
  date: "تاریخ",
  entity: "شرکت / پژوهشگر (از بانک)",
};

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  help?: string;
  /** گزینه‌ها برای انتخابی/چندانتخابی */
  options?: string[];
  /** نوع موجودیت برای فیلد «entity» (خالی = هر دو) */
  entityKind?: EntityKind;
};

/** ویژگی‌های موجودیت بانک که در شرط قابل استفاده‌اند */
export type EntityAttr = "trl" | "kbType" | "employees" | "hIndex" | "publications" | "city" | "field" | "kind" | "registered";
export const entityAttrLabel: Record<EntityAttr, string> = {
  trl: "TRL",
  kbType: "نوع شرکت",
  employees: "تعداد نیرو",
  hIndex: "شاخص h",
  publications: "تعداد مقاله",
  city: "شهر",
  field: "حوزه",
  kind: "نوع موجودیت",
  registered: "ثبت در بانک",
};
const numericAttrs: EntityAttr[] = ["trl", "employees", "hIndex", "publications"];

export type RuleOp = "gte" | "lte" | "eq" | "neq" | "in" | "contains" | "notEmpty";
export const ruleOpLabel: Record<RuleOp, string> = { gte: "≥", lte: "≤", eq: "برابر", neq: "مخالف", in: "یکی از", contains: "شامل", notEmpty: "پر باشد" };

export type EligibilityRule = {
  id: string;
  /** فیلد فرم */
  fieldId: string;
  /** اگر فیلد از نوع «entity» باشد: کدام ویژگی موجودیت سنجیده شود */
  attr?: EntityAttr;
  op: RuleOp;
  /** برای «یکی از» با «|» جدا می‌شود */
  value: string;
  /** پیام دلخواه هنگام عدم احراز */
  message?: string;
};

export type FormOwnerKind = "call" | "sabbatical" | "award";
export const formOwnerLabel: Record<FormOwnerKind, string> = { call: "فراخوان پژوهشی", sabbatical: "فرصت مطالعاتی", award: "دوره‌ی جایزه" };

export type FormDef = {
  id: string;
  ownerKind: FormOwnerKind;
  ownerId: string;
  title: string;
  intro?: string;
  fields: FormField[];
  rules: EligibilityRule[];
  updatedAt: string;
  updatedBy: string;
};

export type FormAnswer = string | string[];
export type FormSubmission = {
  formId: string;
  answers: Record<string, FormAnswer>;
  /** فیلد entity ← شناسه‌ی موجودیت انتخاب‌شده از بانک */
  refs: Record<string, string>;
  eligible: boolean;
  reasons: string[];
  at: string;
};

export const KB_ONLY = kbTypes.filter((k) => !k.includes("غیر"));

// ----------------------------------------------------------------- کمکی‌ها

const toNum = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string" || !v.trim()) return null;
  const n = Number(toEnDigits(v).replace(/[٬,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const faNum = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 2 });
const isEmpty = (v: FormAnswer | undefined) => v === undefined || (Array.isArray(v) ? v.length === 0 : !String(v).trim());
export const answerText = (v: FormAnswer | undefined) => (v === undefined ? "—" : Array.isArray(v) ? (v.length ? v.join("، ") : "—") : String(v).trim() || "—");

function entityAttrValue(e: EcoEntity | undefined, attr: EntityAttr): string | number | undefined {
  if (attr === "registered") return e ? "بله" : "خیر";
  if (!e) return undefined;
  if (attr === "kind") return e.kind === "company" ? "شرکت" : "پژوهشگر";
  const v = e[attr];
  return v === undefined || v === null ? undefined : (v as string | number);
}

export function ruleLabel(rule: EligibilityRule, fields: FormField[]): string {
  const f = fields.find((x) => x.id === rule.fieldId);
  const subject = f ? (rule.attr ? `${entityAttrLabel[rule.attr]} «${f.label}»` : `«${f.label}»`) : "فیلد حذف‌شده";
  if (rule.op === "notEmpty") return `${subject} پر باشد`;
  const val = rule.op === "in" ? rule.value.split("|").filter(Boolean).join(" / ") : rule.value;
  return `${subject} ${ruleOpLabel[rule.op]} ${val}`;
}

/** سنجش یک شرط — خروجی: null = احراز شد، رشته = دلیل عدم احراز */
export function checkRule(rule: EligibilityRule, def: FormDef, sub: Pick<FormSubmission, "answers" | "refs">, entities: EcoEntity[]): string | null {
  const f = def.fields.find((x) => x.id === rule.fieldId);
  if (!f) return null;
  let raw: string | number | string[] | undefined;
  let who = "";
  if (f.type === "entity" && rule.attr) {
    const e = entities.find((x) => x.id === sub.refs[f.id]);
    raw = entityAttrValue(e, rule.attr);
    who = e ? ` ${e.kind === "company" ? "شرکت" : "پژوهشگر"} «${e.name}»` : "";
    if (!e && rule.attr !== "registered") {
      return rule.message || `«${f.label}» در بانک شرکت‌ها و پژوهشگران ثبت نشده؛ ${entityAttrLabel[rule.attr]} قابل احراز نیست.`;
    }
  } else raw = sub.answers[f.id];
  const label = rule.attr ? `${entityAttrLabel[rule.attr]}${who}` : `«${f.label}»`;
  const shown = raw === undefined || raw === "" ? "ثبت‌نشده" : Array.isArray(raw) ? raw.join("، ") || "ثبت‌نشده" : typeof raw === "number" ? faNum(raw) : String(raw);
  const fail = (need: string) => rule.message || `${label} «${shown}» است؛ شرط لازم: ${need}.`;
  const isDate = f.type === "date" && !rule.attr;
  const cmp = (x: unknown) => (isDate ? dayNum(String(x ?? "")) : rule.attr && !numericAttrs.includes(rule.attr) ? null : toNum(x));
  switch (rule.op) {
    case "notEmpty":
      return raw === undefined || raw === "" || (Array.isArray(raw) && !raw.length) ? rule.message || `${label} تکمیل نشده است.` : null;
    case "gte":
    case "lte": {
      const a = cmp(raw);
      const b = cmp(rule.value);
      if (b === null) return null;
      if (a === null) return fail(`${ruleOpLabel[rule.op]} ${rule.value}`);
      return (rule.op === "gte" ? a >= b : a <= b) ? null : fail(`${rule.op === "gte" ? "حداقل" : "حداکثر"} ${rule.value}`);
    }
    case "eq":
    case "neq": {
      const vals = Array.isArray(raw) ? raw : [raw === undefined ? "" : String(raw)];
      const hit = vals.some((v) => (toNum(v) !== null && toNum(rule.value) !== null ? toNum(v) === toNum(rule.value) : v === rule.value));
      return (rule.op === "eq" ? hit : !hit) ? null : fail(`${rule.op === "eq" ? "برابر" : "مخالف"} «${rule.value}»`);
    }
    case "in": {
      const set = rule.value.split("|").map((x) => x.trim()).filter(Boolean);
      const vals = Array.isArray(raw) ? raw : raw === undefined ? [] : [String(raw)];
      return vals.some((v) => set.includes(v)) ? null : fail(`یکی از «${set.join(" / ")}»`);
    }
    case "contains": {
      const vals = Array.isArray(raw) ? raw : [raw === undefined ? "" : String(raw)];
      return vals.some((v) => v.includes(rule.value)) ? null : fail(`شامل «${rule.value}»`);
    }
  }
  return null;
}

export type FormCheck = { missing: string[]; reasons: string[]; eligible: boolean };

/** سنجش کامل فرم هنگام ارسال: فیلدهای الزامیِ خالی + شرایط احرازنشده */
export function evaluateForm(def: FormDef, sub: Pick<FormSubmission, "answers" | "refs">, entities: EcoEntity[]): FormCheck {
  const missing = def.fields.filter((f) => f.required && isEmpty(sub.answers[f.id])).map((f) => f.id);
  const reasons = def.rules.map((r) => checkRule(r, def, sub, entities)).filter((x): x is string => !!x);
  return { missing, reasons, eligible: reasons.length === 0 };
}

export const formOf = (forms: FormDef[] | undefined, kind: FormOwnerKind, ownerId: string) => forms?.find((f) => f.ownerKind === kind && f.ownerId === ownerId);

/** پاسخ فیلد entity → نام برای نمایش */
export function answerDisplay(f: FormField, sub: FormSubmission, entities: EcoEntity[]): string {
  if (f.type === "entity") {
    const e = entities.find((x) => x.id === sub.refs[f.id]);
    return e ? e.name : answerText(sub.answers[f.id]);
  }
  if (f.type === "number") {
    const n = toNum(sub.answers[f.id]);
    return n === null ? answerText(sub.answers[f.id]) : faNum(n);
  }
  return answerText(sub.answers[f.id]);
}

export const newFieldId = () => `ff-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export const newRuleId = () => `fr-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** فرم پیش‌فرض هنگام اولین طراحی */
export function starterForm(kind: FormOwnerKind, ownerId: string, title: string, by: string, at: string): FormDef {
  const applicant: FormField = { id: newFieldId(), label: kind === "award" ? "شرکت فناور / صاحب فناوری" : kind === "sabbatical" ? "استاد متقاضی" : "متقاضی (از بانک)", type: "entity", required: true, entityKind: kind === "sabbatical" ? "researcher" : kind === "award" ? "company" : undefined };
  return {
    id: `fm-${Date.now().toString(36)}`,
    ownerKind: kind,
    ownerId,
    title: `فرم ${formOwnerLabel[kind]} «${title}»`,
    fields: [applicant, { id: newFieldId(), label: "شرح پیشنهاده", type: "longText", required: true }, { id: newFieldId(), label: "پیوست مستندات", type: "file" }],
    rules: [],
    updatedAt: at,
    updatedBy: by,
  };
}
