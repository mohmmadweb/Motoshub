// ---------------------------------------------------------------------------
// خودکارسازی سفارشی «وقتی … اگر … آنگاه …» — منطق خالص شرط‌ها، متن‌های نمایشی و
// تشخیص زمان اجرای قواعد زمان‌بندی‌شده. اجرای عمل‌ها در ProjectsContext است.
// ---------------------------------------------------------------------------
import { dayNum, fa, toEnDigits } from "./jalali";
import { cfRaw } from "./customFields";
import { typeLabel } from "./selectors";
import type { CustomRule, CustomRuleAction, CustomRuleTrigger, PMTask, ProjectState, RuleCondition } from "./types";

export const ruleActions = (r: CustomRule): CustomRuleAction[] => (r.actions?.length ? r.actions : [r.action]);

/** فیلدهای قابل استفاده در شرط «اگر» */
export function conditionFields(p: ProjectState): { id: string; label: string; options?: string[] }[] {
  return [
    { id: "priority", label: "اولویت", options: ["کم", "متوسط", "زیاد", "بحرانی"] },
    { id: "type", label: "نوع کار", options: Object.keys(typeLabel) },
    { id: "assignee", label: "مسئول", options: p.members.map((m) => m.name) },
    { id: "status", label: "وضعیت (ستون)", options: p.columns.map((c) => c.id) },
    { id: "label", label: "برچسب" },
    { id: "title", label: "عنوان" },
    ...(p.customFields ?? []).map((f) => ({ id: `cf:${f.id}`, label: `فیلد «${f.name}»`, options: f.type === "انتخابی" || f.type === "چندانتخابی" ? f.options : f.type === "شخص" ? p.members.map((m) => m.name) : undefined })),
  ];
}

function fieldValue(p: ProjectState, t: PMTask, field: string): string | string[] {
  switch (field) {
    case "priority":
      return t.priority;
    case "type":
      return t.type ?? "task";
    case "assignee":
      return t.assignee;
    case "status":
      return t.status;
    case "label":
      return t.labels;
    case "title":
      return t.title;
  }
  if (field.startsWith("cf:")) return cfRaw(p, t, field.slice(3));
  return "";
}

const norm = (s: string) => toEnDigits(s).trim().toLowerCase();

export function conditionHolds(p: ProjectState, t: PMTask, c: RuleCondition): boolean {
  const v = fieldValue(p, t, c.field);
  const want = norm(c.value);
  if (Array.isArray(v)) {
    const has = c.op === "contains" ? v.some((x) => norm(x).includes(want)) : v.some((x) => norm(x) === want);
    return c.op === "neq" ? !has : has;
  }
  const cur = norm(v);
  if (c.op === "contains") return cur.includes(want);
  return c.op === "eq" ? cur === want : cur !== want;
}

export const conditionsMatch = (p: ProjectState, t: PMTask, conds: RuleCondition[] | undefined) => (conds ?? []).every((c) => conditionHolds(p, t, c));

const opLabel: Record<RuleCondition["op"], string> = { eq: "برابر", neq: "نابرابر با", contains: "شامل" };

export function conditionText(p: ProjectState, c: RuleCondition): string {
  const f = conditionFields(p).find((x) => x.id === c.field);
  const value = c.field === "type" ? typeLabel[c.value as keyof typeof typeLabel] ?? c.value : c.field === "status" ? p.columns.find((x) => x.id === c.value)?.label ?? c.value : c.value;
  return `${f?.label ?? c.field} ${opLabel[c.op]} «${value}»`;
}

export function triggerText(p: ProjectState, t: CustomRuleTrigger): string {
  switch (t.type) {
    case "moved":
      return `تسک به ستون «${p.columns.find((c) => c.id === t.columnId)?.label ?? "؟"}» منتقل شد`;
    case "labelAdded":
      return `برچسب «${t.label}» به تسک اضافه شد`;
    case "created":
      return "تسک جدید ایجاد شد";
    case "daily":
      return `هر روز ساعت ${t.time}`;
    case "beforeDue":
      return `${fa(t.days)} روز پیش از سررسید`;
  }
}

export function actionText(p: ProjectState | null, a: CustomRuleAction): string {
  switch (a.type) {
    case "assign":
      return `واگذاری به «${a.member}»`;
    case "priority":
      return `اولویت ← «${a.priority}»`;
    case "label":
      return `افزودن برچسب «${a.label}»`;
    case "watch":
      return `«${a.member}» دنبال‌کننده شود`;
    case "checklist":
      return `افزودن «${a.text}» به چک‌لیست`;
    case "move":
      return `انتقال به «${p?.columns.find((c) => c.id === a.columnId)?.label ?? "؟"}»`;
    case "setField":
      return `فیلد «${p?.customFields?.find((f) => f.id === a.fieldId)?.name ?? "؟"}» ← «${a.value}»`;
    case "subtask":
      return `ساخت زیرتسک «${a.title}»${a.assignee ? ` برای «${a.assignee}»` : ""}`;
    case "notify":
      return `اعلان به ${a.to === "assignee" ? "مسئول تسک" : a.to === "manager" ? "مدیر پروژه" : a.to === "watchers" ? "دنبال‌کنندگان" : `«${a.to}»`}`;
  }
}

export const isScheduled = (t: CustomRuleTrigger) => t.type === "daily" || t.type === "beforeDue";

/** «۰۹:۳۰» → دقیقه */
const clockMin = (s: string) => {
  const m = toEnDigits(s).match(/(\d{1,2}):(\d{1,2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};

/**
 * تسک‌هایی که قاعده‌ی زمان‌بندی‌شده امروز روی آن‌ها اجرا می‌شود + کلید یک‌باره‌ی هر اجرا.
 * daily: اگر ساعت فعلی از ساعت قاعده گذشته باشد · beforeDue: سررسید دقیقاً N روز بعد.
 */
export function scheduledTargets(p: ProjectState, r: CustomRule, refDate: string, nowMin: number, isDone: (t: PMTask) => boolean): { t: PMTask; key: string }[] {
  const ref = dayNum(refDate) ?? 0;
  const trig = r.trigger;
  if (!r.enabled || !isScheduled(trig)) return [];
  if (trig.type === "daily" && nowMin < clockMin(trig.time)) return [];
  return p.tasks
    .filter((t) => !t.archived && !isDone(t) && conditionsMatch(p, t, r.conditions))
    .filter((t) => (trig.type === "beforeDue" ? (dayNum(t.due) ?? -1) - ref === trig.days : true))
    .map((t) => ({ t, key: `rule:${r.id}:${t.id}:${refDate}` }));
}
