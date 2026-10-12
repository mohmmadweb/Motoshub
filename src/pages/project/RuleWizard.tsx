import { useState } from "react";
import { Plus, X, Mail, Smartphone, MessageSquareText, MonitorSmartphone, RotateCcw, Check } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { defaultLabels } from "../../pm/seed";
import { fa, toEnDigits } from "../../pm/jalali";
import { typeLabel } from "../../pm/selectors";
import { EVENT_CATALOG, categoryLabel, channelLabel, eventByCode, recipientLabel, type EventCategory, type EventCode } from "../../pm/events";
import { actionText, conditionFields, isScheduled, ruleActions, triggerText } from "../../pm/automation";
import type { CustomRule, CustomRuleAction, CustomRuleTrigger, NotifChannel, NotifPriority, NotifRule, PMPriority, ProjectState, RecipientRole, RuleCondition } from "../../pm/types";
import { priorities, useProjectPage } from "./shared";

type TrigType = CustomRuleTrigger["type"];
type Draft = { id?: string; name: string; trigger: TrigType; column: string; tLabel: string; time: string; days: number; conditions: RuleCondition[]; actions: CustomRuleAction[] };
/** نقطه‌ی شروع جادوگر: قاعده‌ی تازه، اعلان یک رویداد، یا قاعده‌ی سفارشی موجود */
export type WizardInit = { kind: "new" } | { kind: "event"; code: string } | { kind: "custom"; rule: CustomRule };

const channelIcon: Record<NotifChannel, typeof Mail> = { inapp: MonitorSmartphone, email: Mail, sms: MessageSquareText, push: Smartphone };
const allChannels: NotifChannel[] = ["inapp", "email", "sms", "push"];
const allPriorities: NotifPriority[] = ["کم", "عادی", "مهم", "فوری"];
const steps = ["رویداد", "شرط", "اقدام / گیرندگان", "کانال"];
const triggerLabel: Record<TrigType, string> = {
  moved: "تسک به ستونی منتقل شد",
  created: "تسک جدیدی ایجاد شد",
  labelAdded: "برچسبی به تسک اضافه شد",
  daily: "هر روز در ساعت…",
  beforeDue: "چند روز پیش از سررسید تسک",
};

const actionTypes: { id: CustomRuleAction["type"]; label: string }[] = [
  { id: "notify", label: "ارسال اعلان" },
  { id: "assign", label: "واگذاری به عضو" },
  { id: "move", label: "انتقال به ستون" },
  { id: "priority", label: "تغییر اولویت" },
  { id: "label", label: "افزودن برچسب" },
  { id: "watch", label: "افزودن دنبال‌کننده" },
  { id: "checklist", label: "افزودن مورد چک‌لیست" },
  { id: "subtask", label: "ساخت زیرتسک" },
  { id: "setField", label: "تنظیم فیلد سفارشی" },
];

function blankAction(p: ProjectState, type: CustomRuleAction["type"], labels: string[]): CustomRuleAction {
  switch (type) {
    case "assign":
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

/** «الف، ب و ج» */
export const joinFa = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join("، ")} و ${xs[xs.length - 1]}`);
/** بخش «آنگاه» یک قاعده‌ی اعلان به زبان ساده */
export const recipientsPhrase = (rule: NotifRule | null) => (!rule || !rule.recipients.length ? "فقط در تاریخچه ثبت شود" : `به ${joinFa(rule.recipients.map((r) => recipientLabel[r]))} اعلان بده`);

/**
 * ویرایش پیشرفته‌ی اعلان‌ها و خودکارسازی — جادوگر چهارمرحله‌ای:
 * ۱. رویداد (رویداد پروژه یا رویداد تسک)  ۲. شرط  ۳. اقدام / گیرندگان  ۴. کانال و اولویت
 */
export default function RuleWizard({ init, onClose }: { init: WizardInit; onClose: () => void }) {
  const { p, pid } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const labels = [...new Set([...defaultLabels, ...p.tasks.flatMap((t) => t.labels)])];
  const cFields = conditionFields(p);
  const editableFields = (p.customFields ?? []).filter((f) => f.type !== "فرمول");
  const ruleOf = (code: string): NotifRule | null => p.notifRules[code as EventCode] ?? eventByCode[code]?.notify ?? null;

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
  const blank = (): Draft => ({ name: "", trigger: "moved", column: p.columns.find((c) => c.kind === "review")?.id ?? p.columns[0]?.id ?? "", tLabel: labels[0], time: "۰۹:۰۰", days: 2, conditions: [], actions: [blankAction(p, "notify", labels)] });

  // انتخاب در گام ۱: «ev:CODE» برای رویداد پروژه یا «tr:TYPE» برای قاعده‌ی تسک
  const [sel, setSel] = useState<string>(init.kind === "event" ? `ev:${init.code}` : init.kind === "custom" ? `tr:${init.rule.trigger.type}` : "ev:TASK_OVERDUE");
  const [step, setStep] = useState(init.kind === "event" ? 2 : 0);
  const [d, setD] = useState<Draft>(init.kind === "custom" ? fromRule(init.rule) : blank());
  const evCode = sel.startsWith("ev:") ? sel.slice(3) : null;
  const [nr, setNr] = useState<NotifRule>(() => {
    const code = init.kind === "event" ? init.code : "TASK_OVERDUE";
    const r = ruleOf(code);
    return r ? { ...r, enabled: true } : { enabled: true, recipients: ["manager"], channels: ["inapp"], priority: "عادی" };
  });
  const pickSel = (v: string) => {
    setSel(v);
    if (v.startsWith("ev:")) {
      const r = ruleOf(v.slice(3));
      setNr(r ? { ...r, enabled: true } : { enabled: true, recipients: ["manager"], channels: ["inapp"], priority: "عادی" });
    } else setD({ ...d, trigger: v.slice(3) as TrigType });
  };

  const trigger = (): CustomRuleTrigger =>
    d.trigger === "moved" ? { type: "moved", columnId: d.column } : d.trigger === "labelAdded" ? { type: "labelAdded", label: d.tLabel } : d.trigger === "daily" ? { type: "daily", time: d.time.trim() } : d.trigger === "beforeDue" ? { type: "beforeDue", days: Math.max(0, d.days) } : { type: "created" };

  const validStep = (i: number): string | null => {
    if (evCode) {
      if (i === 2 && !nr.recipients.length) return "دست‌کم یک گیرنده انتخاب کنید.";
      if (i === 3 && !nr.channels.length) return "دست‌کم یک کانال انتخاب کنید.";
      return null;
    }
    if (i === 0 && d.trigger === "daily" && !/^\d{1,2}:\d{2}$/.test(toEnDigits(d.time).trim())) return "ساعت را به شکل ۰۹:۰۰ وارد کنید.";
    if (i === 1 && d.conditions.some((c) => !c.value.trim())) return "مقدار شرط‌ها را کامل کنید.";
    if (i === 2 && (!d.actions.length || !d.actions.every(actionValid))) return "مقدار همه‌ی اقدام‌ها را مشخص کنید.";
    return null;
  };
  const next = () => {
    const err = validStep(step);
    if (err) return notify(err, "warning");
    setStep(step + 1);
  };
  const save = () => {
    for (let i = 0; i < 4; i++) {
      const err = validStep(i);
      if (err) return notify(err, "warning");
    }
    if (evCode) {
      pm.setNotifRule(pid, evCode as EventCode, nr);
      notify(`اعلان «${eventByCode[evCode]?.label}» ذخیره شد.`);
    } else {
      const tr = trigger();
      const name = d.name.trim() || `${triggerText(p, tr)} ← ${actionText(p, d.actions[0])}`;
      const prev = (p.customRules ?? []).find((r) => r.id === d.id);
      pm.saveCustomRule(pid, { id: d.id, name, trigger: tr, action: d.actions[0], actions: d.actions, conditions: d.conditions.length ? d.conditions : undefined, enabled: prev?.enabled ?? true });
      notify(d.id ? "قاعده ویرایش شد." : isScheduled(tr) ? "قاعده‌ی زمان‌بندی‌شده ساخته شد." : "قاعده ساخته شد و از همین حالا اجرا می‌شود.");
    }
    onClose();
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

  // پیش‌نمایش جمله‌ی قاعده
  const preview = evCode ? `وقتی «${eventByCode[evCode]?.label ?? evCode}» رخ داد ← ${recipientsPhrase(nr)}` : `وقتی ${triggerText(p, trigger())} ← ${d.actions.map((a) => actionText(p, a)).join("، ")}`;
  const cats = Object.keys(categoryLabel) as EventCategory[];
  const custom = evCode ? !!p.notifRules[evCode as EventCode] : false;

  return (
    <Modal open onClose={onClose} title={init.kind === "custom" ? "ویرایش قاعده" : "ویرایش پیشرفته‌ی اعلان‌ها و خودکارسازی"} width="max-w-2xl">
      <div className="space-y-4">
        {/* نوار مراحل */}
        <ol className="flex items-center gap-1 overflow-x-auto">
          {steps.map((label, i) => (
            <li key={label} className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => i < step && setStep(i)} className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 ${i === step ? "bg-navy-900 text-white" : i < step ? "bg-emerald-50 text-emerald-700" : "bg-ink-100 text-ink-400"}`}>
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{i < step ? <Check size={10} /> : fa(i + 1)}</span>
                {label}
              </button>
              {i < steps.length - 1 && <span className="w-3 h-px bg-ink-200" />}
            </li>
          ))}
        </ol>
        <p className="text-[11.5px] text-ink-600 bg-ink-50 rounded-lg px-3 py-2 leading-6">{preview}</p>

        {step === 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-ink-700">چه زمانی؟</p>
            <select className="input-field" value={sel} onChange={(e) => pickSel(e.target.value)} disabled={init.kind === "custom"}>
              {cats.map((c) => {
                const evs = EVENT_CATALOG.filter((e) => e.category === c);
                return evs.length ? (
                  <optgroup key={c} label={`اعلان — ${categoryLabel[c]}`}>
                    {evs.map((e) => (
                      <option key={e.code} value={`ev:${e.code}`}>
                        {e.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
              <optgroup label="قاعده‌ی خودکار روی تسک‌ها">
                {(Object.keys(triggerLabel) as TrigType[]).map((t) => (
                  <option key={t} value={`tr:${t}`}>
                    {triggerLabel[t]}
                  </option>
                ))}
              </optgroup>
            </select>
            {!evCode && d.trigger === "moved" && (
              <select className="input-field" value={d.column} onChange={(e) => setD({ ...d, column: e.target.value })} aria-label="ستون مقصد">
                {p.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    ستون «{c.label}»
                  </option>
                ))}
              </select>
            )}
            {!evCode && d.trigger === "labelAdded" && (
              <select className="input-field" value={d.tLabel} onChange={(e) => setD({ ...d, tLabel: e.target.value })} aria-label="برچسب">
                {labels.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            )}
            {!evCode && d.trigger === "daily" && <input className="input-field" dir="ltr" value={d.time} onChange={(e) => setD({ ...d, time: e.target.value })} placeholder="۰۹:۰۰" aria-label="ساعت اجرا" />}
            {!evCode && d.trigger === "beforeDue" && (
              <label className="flex items-center gap-2 text-xs text-ink-600">
                <input className="input-field !w-20 text-center" value={fa(d.days)} onChange={(e) => setD({ ...d, days: Math.min(60, Number(toEnDigits(e.target.value).replace(/\D/g, "")) || 0) })} aria-label="روز پیش از سررسید" />
                روز پیش از سررسید
              </label>
            )}
            {evCode && eventByCode[evCode]?.why && <p className="text-[11px] text-ink-400 leading-5">{eventByCode[evCode]?.why}</p>}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-ink-700">
              با چه شرطی؟ <span className="font-normal text-ink-400">(اختیاری)</span>
            </p>
            {evCode ? (
              <p className="text-[11.5px] text-ink-500">این رویداد شرط جداگانه ندارد؛ هر بار رخ دهد اعلان ارسال می‌شود. گام بعد را بزنید.</p>
            ) : (
              <>
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
                {!d.conditions.length && <p className="text-[11.5px] text-ink-500">بدون شرط: برای همه‌ی تسک‌ها اجرا می‌شود.</p>}
                <Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setD({ ...d, conditions: [...d.conditions, { field: "priority", op: "eq", value: "" }] })}>
                  افزودن شرط
                </Button>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            {evCode ? (
              <>
                <p className="text-xs font-bold text-ink-700">به چه کسانی اعلان برود؟</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(recipientLabel) as RecipientRole[]).map((r) => {
                    const on = nr.recipients.includes(r);
                    return (
                      <button key={r} type="button" onClick={() => setNr({ ...nr, recipients: on ? nr.recipients.filter((x) => x !== r) : [...nr.recipients, r] })} className={`text-[11px] px-2 py-1 rounded-md border ${on ? "bg-brand-50 border-brand-300 text-brand-700" : "border-ink-200 text-ink-500 hover:text-ink-800"}`}>
                        {recipientLabel[r]}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-ink-400">انجام‌دهنده برای کار خودش اعلان نمی‌گیرد و گیرنده‌ی تکراری یک بار مطلع می‌شود.</p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-ink-700">چه کاری انجام شود؟</p>
                {d.actions.map((a, i) => {
                  const set = (na: CustomRuleAction) => setD({ ...d, actions: d.actions.map((x, j) => (j === i ? na : x)) });
                  return (
                    <div key={i} className="flex flex-wrap gap-1.5 items-start">
                      <div className="w-full sm:w-[170px]">
                        <select className="input-field" value={a.type} onChange={(e) => set(blankAction(p, e.target.value as CustomRuleAction["type"], labels))} aria-label="نوع اقدام">
                          {actionTypes.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[200px]">{actionEditor(a, set)}</div>
                      <button type="button" disabled={d.actions.length < 2} onClick={() => setD({ ...d, actions: d.actions.filter((_, j) => j !== i) })} className="p-1 mt-1.5 text-ink-400 hover:text-rose-600 disabled:opacity-30" aria-label="حذف اقدام">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
                {d.actions.length < 5 && (
                  <Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setD({ ...d, actions: [...d.actions, blankAction(p, "notify", labels)] })}>
                    افزودن اقدام
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            {evCode ? (
              <>
                <p className="text-xs font-bold text-ink-700">از چه کانالی و با چه اولویتی؟</p>
                <div className="flex flex-wrap gap-1.5">
                  {allChannels.map((c) => {
                    const Icon = channelIcon[c];
                    const on = nr.channels.includes(c);
                    return (
                      <button key={c} type="button" onClick={() => setNr({ ...nr, channels: on ? nr.channels.filter((x) => x !== c) : [...nr.channels, c] })} className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 ${on ? "bg-navy-900 border-navy-900 text-white" : "border-ink-200 text-ink-500"}`}>
                        <Icon size={13} /> {channelLabel[c]}
                      </button>
                    );
                  })}
                </div>
                <label className="flex items-center gap-2 text-xs text-ink-600">
                  اولویت
                  <select className="input-field !w-auto" value={nr.priority} onChange={(e) => setNr({ ...nr, priority: e.target.value as NotifPriority })}>
                    {allPriorities.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                {custom && (
                  <button
                    type="button"
                    onClick={() => {
                      pm.setNotifRule(pid, evCode as EventCode, null);
                      notify("به تنظیم پیش‌فرض برگشت.");
                      onClose();
                    }}
                    className="text-[11px] text-ink-500 hover:text-brand-700 flex items-center gap-1"
                  >
                    <RotateCcw size={12} /> بازگشت به تنظیم پیش‌فرض
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-[11.5px] text-ink-500">اعلان‌های این قاعده درون‌برنامه ارسال می‌شوند و هر اجرا در تاریخچه‌ی تسک ثبت می‌شود.</p>
                <input className="input-field" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="نام قاعده (اختیاری — خودکار ساخته می‌شود)" />
              </>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-between pt-1">
          <Button variant="ghost" onClick={() => (step ? setStep(step - 1) : onClose())}>
            {step ? "قبلی" : "انصراف"}
          </Button>
          {step < 3 ? (
            <Button variant="primary" onClick={next}>
              بعدی
            </Button>
          ) : (
            <Button variant="primary" onClick={save}>
              ذخیره
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
