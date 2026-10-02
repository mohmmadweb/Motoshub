import { useState } from "react";
import { Plus, Wand2, X, Clock } from "lucide-react";
import Button from "../../components/ui/Button";
import Toggle from "../../components/ui/Toggle";
import RowActions from "../../components/ui/RowActions";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { defaultLabels } from "../../pm/seed";
import { fa, toEnDigits } from "../../pm/jalali";
import { typeLabel } from "../../pm/selectors";
import { actionText, conditionFields, conditionText, isScheduled, ruleActions, triggerText } from "../../pm/automation";
import type { CustomRule, CustomRuleAction, CustomRuleTrigger, PMPriority, ProjectState, RuleCondition } from "../../pm/types";
import { SectionTitle, priorities, useProjectPage } from "./shared";

// متن‌های نمایشی (برای سازگاری با واردکننده‌های قبلی)
export { triggerText };
export const actionTextOf = (a: CustomRuleAction) => actionText(null, a);

type TrigType = CustomRuleTrigger["type"];
type Draft = { id?: string; name: string; trigger: TrigType; column: string; tLabel: string; time: string; days: number; conditions: RuleCondition[]; actions: CustomRuleAction[] };

const actionTypes: { id: CustomRuleAction["type"]; label: string }[] = [
  { id: "move", label: "انتقال به ستون" },
  { id: "assign", label: "واگذاری به عضو" },
  { id: "priority", label: "تغییر اولویت" },
  { id: "setField", label: "تنظیم فیلد سفارشی" },
  { id: "subtask", label: "ساخت زیرتسک" },
  { id: "notify", label: "ارسال اعلان" },
  { id: "label", label: "افزودن برچسب" },
  { id: "watch", label: "افزودن دنبال‌کننده" },
  { id: "checklist", label: "افزودن مورد چک‌لیست" },
];

function blankAction(p: ProjectState, type: CustomRuleAction["type"], labels: string[]): CustomRuleAction {
  switch (type) {
    case "assign":
      return { type, member: "" };
    case "watch":
      return { type, member: "" };
    case "priority":
      return { type, priority: "زیاد" };
    case "label":
      return { type, label: labels[0] ?? "" };
    case "checklist":
      return { type, text: "" };
    case "move":
      return { type, columnId: p.columns.find((c) => c.kind === "doing")?.id ?? p.columns[0]?.id ?? "" };
    case "setField":
      return { type, fieldId: (p.customFields ?? []).find((f) => f.type !== "فرمول")?.id ?? "", value: "" };
    case "subtask":
      return { type, title: "" };
    case "notify":
      return { type, to: "assignee", text: "" };
  }
}

const actionValid = (a: CustomRuleAction) => {
  switch (a.type) {
    case "assign":
    case "watch":
      return !!a.member;
    case "label":
      return !!a.label;
    case "checklist":
      return !!a.text.trim();
    case "move":
      return !!a.columnId;
    case "setField":
      return !!a.fieldId && !!a.value.trim();
    case "subtask":
      return !!a.title.trim();
    case "notify":
      return !!a.to;
    default:
      return true;
  }
};

/** سازنده‌ی قاعده‌ی «وقتی … اگر … آنگاه …» — مشابه Jira Automation و Trello Butler، بدون نیاز به کدنویسی */
export default function CustomRulesSection({ canEdit }: { canEdit: boolean }) {
  const { p, pid } = useProjectPage();
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [d, setD] = useState<Draft | null>(null);
  const rules = p.customRules ?? [];
  const labels = [...new Set([...defaultLabels, ...p.tasks.flatMap((t) => t.labels)])];
  const cFields = conditionFields(p);
  const editableFields = (p.customFields ?? []).filter((f) => f.type !== "فرمول");

  const fromRule = (r: CustomRule): Draft => ({
    id: r.id,
    name: r.name,
    trigger: r.trigger.type,
    column: r.trigger.type === "moved" ? r.trigger.columnId : p.columns[0]?.id ?? "",
    tLabel: r.trigger.type === "labelAdded" ? r.trigger.label : labels[0],
    time: r.trigger.type === "daily" ? r.trigger.time : "۰۹:۰۰",
    days: r.trigger.type === "beforeDue" ? r.trigger.days : 2,
    conditions: r.conditions ?? [],
    actions: ruleActions(r),
  });

  const blank = (): Draft => ({ name: "", trigger: "moved", column: p.columns.find((c) => c.kind === "review")?.id ?? p.columns[0]?.id ?? "", tLabel: labels[0], time: "۰۹:۰۰", days: 2, conditions: [], actions: [blankAction(p, "assign", labels)] });

  const submit = () => {
    if (!d) return;
    if (!d.actions.length) return notify("دست‌کم یک عمل تعریف کنید.", "warning");
    if (!d.actions.every(actionValid)) return notify("مقدار همه‌ی عمل‌ها را مشخص کنید.", "warning");
    if (d.conditions.some((c) => !c.value.trim())) return notify("مقدار شرط‌ها را کامل کنید.", "warning");
    if (d.trigger === "daily" && !/^\d{1,2}:\d{2}$/.test(toEnDigits(d.time).trim())) return notify("ساعت را به شکل ۰۹:۰۰ وارد کنید.", "warning");
    const trigger: CustomRuleTrigger =
      d.trigger === "moved"
        ? { type: "moved", columnId: d.column }
        : d.trigger === "labelAdded"
          ? { type: "labelAdded", label: d.tLabel }
          : d.trigger === "daily"
            ? { type: "daily", time: d.time.trim() }
            : d.trigger === "beforeDue"
              ? { type: "beforeDue", days: Math.max(0, d.days) }
              : { type: "created" };
    const name = d.name.trim() || `${triggerText(p, trigger)} ← ${actionText(p, d.actions[0])}`;
    const prev = rules.find((r) => r.id === d.id);
    pm.saveCustomRule(pid, { id: d.id, name, trigger, action: d.actions[0], actions: d.actions, conditions: d.conditions.length ? d.conditions : undefined, enabled: prev?.enabled ?? true });
    notify(d.id ? "قاعده ویرایش شد." : isScheduled(trigger) ? "قاعده‌ی زمان‌بندی‌شده ساخته شد؛ روزانه یک بار برای هر تسک اجرا می‌شود." : "قاعده ساخته شد و از همین حالا اجرا می‌شود.");
    setD(null);
  };

  const memberSelect = (value: string, onChange: (v: string) => void, extra?: [string, string][]) => (
    <select className="input-field" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">انتخاب…</option>
      {(extra ?? []).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
      {p.members.map((m) => (
        <option key={m.id} value={m.name}>
          {m.name}
        </option>
      ))}
    </select>
  );

  const actionEditor = (a: CustomRuleAction, set: (a: CustomRuleAction) => void) => {
    switch (a.type) {
      case "assign":
      case "watch":
        return memberSelect(a.member, (v) => set({ ...a, member: v }));
      case "priority":
        return (
          <select className="input-field" value={a.priority} onChange={(e) => set({ ...a, priority: e.target.value as PMPriority })}>
            {priorities.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        );
      case "label":
        return (
          <select className="input-field" value={a.label} onChange={(e) => set({ ...a, label: e.target.value })}>
            {labels.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        );
      case "checklist":
        return <input className="input-field" value={a.text} onChange={(e) => set({ ...a, text: e.target.value })} placeholder="متن مورد چک‌لیست" />;
      case "move":
        return (
          <select className="input-field" value={a.columnId} onChange={(e) => set({ ...a, columnId: e.target.value })}>
            {p.columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        );
      case "setField": {
        const f = editableFields.find((x) => x.id === a.fieldId);
        return (
          <div className="grid grid-cols-2 gap-1.5">
            <select className="input-field" value={a.fieldId} onChange={(e) => set({ ...a, fieldId: e.target.value, value: "" })}>
              {!editableFields.length && <option value="">فیلدی تعریف نشده</option>}
              {editableFields.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            {f?.type === "انتخابی" ? (
              <select className="input-field" value={a.value} onChange={(e) => set({ ...a, value: e.target.value })}>
                <option value="">مقدار…</option>
                {(f.options ?? []).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : f?.type === "شخص" ? (
              memberSelect(a.value, (v) => set({ ...a, value: v }))
            ) : (
              <input className="input-field" value={a.value} onChange={(e) => set({ ...a, value: e.target.value })} placeholder="مقدار" />
            )}
          </div>
        );
      }
      case "subtask":
        return (
          <div className="grid grid-cols-2 gap-1.5">
            <input className="input-field" value={a.title} onChange={(e) => set({ ...a, title: e.target.value })} placeholder="عنوان زیرتسک" />
            {memberSelect(a.assignee ?? "", (v) => set({ ...a, assignee: v || undefined }), [["", "همان مسئول تسک"]])}
          </div>
        );
      case "notify":
        return (
          <div className="grid grid-cols-2 gap-1.5">
            {memberSelect(a.to, (v) => set({ ...a, to: v }), [
              ["assignee", "مسئول تسک"],
              ["manager", "مدیر پروژه"],
              ["watchers", "دنبال‌کنندگان"],
            ])}
            <input className="input-field" value={a.text ?? ""} onChange={(e) => set({ ...a, text: e.target.value })} placeholder="متن (اختیاری)" />
          </div>
        );
    }
  };

  const condValue = (c: RuleCondition, set: (c: RuleCondition) => void) => {
    const f = cFields.find((x) => x.id === c.field);
    if (f?.options && c.op !== "contains")
      return (
        <select className="input-field" value={c.value} onChange={(e) => set({ ...c, value: e.target.value })}>
          <option value="">مقدار…</option>
          {f.options.map((o) => (
            <option key={o} value={o}>
              {c.field === "type" ? typeLabel[o as keyof typeof typeLabel] : c.field === "status" ? p.columns.find((x) => x.id === o)?.label ?? o : o}
            </option>
          ))}
        </select>
      );
    if (c.field === "label" && c.op !== "contains")
      return (
        <select className="input-field" value={c.value} onChange={(e) => set({ ...c, value: e.target.value })}>
          <option value="">برچسب…</option>
          {labels.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      );
    return <input className="input-field" value={c.value} onChange={(e) => set({ ...c, value: e.target.value })} placeholder="مقدار" />;
  };

  return (
    <div className="space-y-3 mt-6">
      <SectionTitle
        icon={<Wand2 size={15} className="text-brand-600" />}
        title="قاعده‌های سفارشی «وقتی … اگر … آنگاه …»"
        hint="بدون کدنویسی کارهای تکراری را خودکار کنید — رویدادی یا زمان‌بندی‌شده (هر روز ساعت X / N روز پیش از سررسید)، با شرط و چند عمل. هر اجرا در تاریخچه‌ی تسک ثبت می‌شود."
        action={
          canEdit && (
            <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setD(blank())}>
              قاعده‌ی جدید
            </Button>
          )
        }
      />
      {rules.map((r) => (
        <div key={r.id} className="card p-4 flex items-start gap-3">
          {canEdit ? <Toggle on={r.enabled} label={r.name} onChange={() => pm.saveCustomRule(pid, { ...r, enabled: !r.enabled })} /> : <Badge tone={r.enabled ? "success" : "neutral"}>{r.enabled ? "فعال" : "غیرفعال"}</Badge>}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5">
              {isScheduled(r.trigger) && <Clock size={13} className="text-brand-600 shrink-0" />}
              <span className="truncate">{r.name}</span>
            </p>
            <p className="text-[11px] text-ink-500 mt-1 leading-5">
              <span className="text-ink-400">وقتی:</span> {triggerText(p, r.trigger)}
              {r.conditions?.length ? (
                <>
                  <span className="text-ink-400 mx-1">·</span>
                  <span className="text-ink-400">اگر:</span> {r.conditions.map((c) => conditionText(p, c)).join(" و ")}
                </>
              ) : null}
              <span className="text-ink-400 mx-1">←</span> <span className="text-ink-400">آنگاه:</span> {ruleActions(r).map((a) => actionText(p, a)).join("، ")}
            </p>
          </div>
          <span className="text-[11px] text-ink-400 whitespace-nowrap">{fa(r.runs)} بار اجرا</span>
          {canEdit && <RowActions onEdit={() => setD(fromRule(r))} onDelete={() => confirm({ title: `حذف قاعده‌ی «${r.name}»؟`, onConfirm: () => pm.removeCustomRule(pid, r.id) })} />}
        </div>
      ))}
      {rules.length === 0 && <p className="text-xs text-ink-400">هنوز قاعده‌ی سفارشی ندارید.</p>}

      <Modal open={!!d} onClose={() => setD(null)} title={d?.id ? "ویرایش قاعده" : "قاعده‌ی جدید"} width="max-w-2xl">
        {d && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-bold text-ink-700">وقتی…</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select className="input-field" value={d.trigger} onChange={(e) => setD({ ...d, trigger: e.target.value as TrigType })}>
                  <option value="moved">تسک به ستونی منتقل شد</option>
                  <option value="created">تسک جدیدی ایجاد شد</option>
                  <option value="labelAdded">برچسبی به تسک اضافه شد</option>
                  <option value="daily">زمان‌بندی: هر روز در ساعت…</option>
                  <option value="beforeDue">زمان‌بندی: N روز پیش از سررسید</option>
                </select>
                {d.trigger === "moved" && (
                  <select className="input-field" value={d.column} onChange={(e) => setD({ ...d, column: e.target.value })}>
                    {p.columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                )}
                {d.trigger === "labelAdded" && (
                  <select className="input-field" value={d.tLabel} onChange={(e) => setD({ ...d, tLabel: e.target.value })}>
                    {labels.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                )}
                {d.trigger === "daily" && <input className="input-field" dir="ltr" value={d.time} onChange={(e) => setD({ ...d, time: e.target.value })} placeholder="۰۹:۰۰" aria-label="ساعت اجرا" />}
                {d.trigger === "beforeDue" && (
                  <label className="flex items-center gap-2 text-xs text-ink-600">
                    <input className="input-field !w-20 text-center" value={fa(d.days)} onChange={(e) => setD({ ...d, days: Math.min(60, Number(toEnDigits(e.target.value).replace(/\D/g, "")) || 0) })} aria-label="روز پیش از سررسید" />
                    روز پیش از سررسید
                  </label>
                )}
              </div>
              {(d.trigger === "daily" || d.trigger === "beforeDue") && <p className="text-[11px] text-ink-400">روی تسک‌های باز اجرا می‌شود؛ برای هر تسک روزی یک بار.</p>}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-ink-700">اگر… <span className="font-normal text-ink-400">(اختیاری — همه‌ی شرط‌ها باید برقرار باشد)</span></p>
              {d.conditions.map((c, i) => {
                const set = (nc: RuleCondition) => setD({ ...d, conditions: d.conditions.map((x, j) => (j === i ? nc : x)) });
                return (
                  <div key={i} className="flex flex-wrap gap-1.5 items-center">
                    <div className="flex-1 min-w-[130px]">
                      <select className="input-field" value={c.field} onChange={(e) => set({ ...c, field: e.target.value, value: "" })} aria-label="فیلد شرط">
                        {cFields.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-[100px]">
                      <select className="input-field" value={c.op} onChange={(e) => set({ ...c, op: e.target.value as RuleCondition["op"] })} aria-label="عملگر">
                        <option value="eq">برابر</option>
                        <option value="neq">نابرابر</option>
                        <option value="contains">شامل</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-[130px]">{condValue(c, set)}</div>
                    <button type="button" onClick={() => setD({ ...d, conditions: d.conditions.filter((_, j) => j !== i) })} className="p-1 text-ink-400 hover:text-rose-600" aria-label="حذف شرط">
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
              <Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setD({ ...d, conditions: [...d.conditions, { field: "priority", op: "eq", value: "" }] })}>
                افزودن شرط
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-ink-700">آنگاه…</p>
              {d.actions.map((a, i) => {
                const set = (na: CustomRuleAction) => setD({ ...d, actions: d.actions.map((x, j) => (j === i ? na : x)) });
                return (
                  <div key={i} className="flex flex-wrap gap-1.5 items-start">
                    <div className="w-full sm:w-[170px]">
                      <select className="input-field" value={a.type} onChange={(e) => set(blankAction(p, e.target.value as CustomRuleAction["type"], labels))} aria-label="نوع عمل">
                        {actionTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">{actionEditor(a, set)}</div>
                    <button type="button" disabled={d.actions.length < 2} onClick={() => setD({ ...d, actions: d.actions.filter((_, j) => j !== i) })} className="p-1 mt-1.5 text-ink-400 hover:text-rose-600 disabled:opacity-30" aria-label="حذف عمل">
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
              {d.actions.length < 5 && (
                <Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setD({ ...d, actions: [...d.actions, blankAction(p, "notify", labels)] })}>
                  افزودن عمل
                </Button>
              )}
            </div>

            <input className="input-field" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="نام قاعده (اختیاری — خودکار ساخته می‌شود)" />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setD(null)}>
                انصراف
              </Button>
              <Button variant="primary" onClick={submit}>
                {d.id ? "ذخیره" : "ساخت قاعده"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
