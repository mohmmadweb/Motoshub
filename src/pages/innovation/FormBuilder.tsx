// ---------------------------------------------------------------------------
// فرم‌ساز مشترک فراخوان پژوهشی / فرصت مطالعاتی / جایزه
//   • FormDesignerModal — سازنده‌ی فراخوان یا مدیر جایزه فیلدها و شرایط احراز را طراحی می‌کند
//   • FormFill          — متقاضی فرم را در جریان ثبت درخواست پر می‌کند
//   • EligibilityResult — نتیجه‌ی سنجش هنگام ارسال با دلیل روشن
//   • FormAnswersView / FormStatusBadge — نمایش پاسخ‌ها در پرونده
// ---------------------------------------------------------------------------
import { useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, ClipboardList, Eye, FileUp, ListChecks, Plus, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useInnovation } from "../../context/InnovationContext";
import {
  KB_ONLY,
  answerDisplay,
  entityAttrLabel,
  evaluateForm,
  fieldTypeLabel,
  formOf,
  formOwnerLabel,
  newFieldId,
  newRuleId,
  ruleLabel,
  ruleOpLabel,
  starterForm,
  type EligibilityRule,
  type EntityAttr,
  type FormCheck,
  type FormDef,
  type FormField,
  type FormFieldType,
  type FormOwnerKind,
  type FormSubmission,
  type RuleOp,
} from "../../innovation/forms";
import { kbTypes } from "../../innovation/types";
import { faN } from "../../innovation/util";
import { EntityPicker, Field } from "./shared";

const moduleOf = (k: FormOwnerKind) => (k === "award" ? "award" : "research") as "award" | "research";

/** فرم تعریف‌شده برای یک فراخوان/دوره (اگر باشد) */
export function useOwnerForm(kind: FormOwnerKind, ownerId: string): FormDef | undefined {
  const { forms } = useInnovation();
  return formOf(forms, kind, ownerId);
}

// =========================================================================== طراحی فرم

export function FormDesignButton({ kind, ownerId, ownerTitle, size = "sm" }: { kind: FormOwnerKind; ownerId: string; ownerTitle: string; size?: "sm" | "md" }) {
  const def = useOwnerForm(kind, ownerId);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} variant="secondary" icon={<ClipboardList size={13} />} onClick={() => setOpen(true)}>
        {def ? `فرم درخواست (${faN(def.fields.length)} فیلد)` : "طراحی فرم درخواست"}
      </Button>
      {open && <FormDesignerModal kind={kind} ownerId={ownerId} ownerTitle={ownerTitle} onClose={() => setOpen(false)} />}
    </>
  );
}

const FIELD_TYPES: FormFieldType[] = ["text", "longText", "number", "date", "select", "multi", "file", "entity"];
const ATTRS: EntityAttr[] = ["trl", "kbType", "employees", "hIndex", "publications", "city", "field", "kind", "registered"];
const OPS: RuleOp[] = ["gte", "lte", "eq", "neq", "in", "contains", "notEmpty"];

export function FormDesignerModal({ kind, ownerId, ownerTitle, onClose }: { kind: FormOwnerKind; ownerId: string; ownerTitle: string; onClose: () => void }) {
  const inn = useInnovation();
  const { notify } = useToast();
  const existing = formOf(inn.forms, kind, ownerId);
  const [def, setDef] = useState<FormDef>(() => existing ?? starterForm(kind, ownerId, ownerTitle, inn.me, inn.today));
  const [view, setView] = useState<"fields" | "rules" | "preview">("fields");
  const setField = (id: string, patch: Partial<FormField>) => setDef((d) => ({ ...d, fields: d.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
  const move = (i: number, dir: -1 | 1) =>
    setDef((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.fields.length) return d;
      const fields = [...d.fields];
      [fields[i], fields[j]] = [fields[j], fields[i]];
      return { ...d, fields };
    });
  const setRule = (id: string, patch: Partial<EligibilityRule>) => setDef((d) => ({ ...d, rules: d.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));

  const save = () => {
    const clean: FormDef = { ...def, fields: def.fields.map((f) => ({ ...f, label: f.label.trim() || "بدون عنوان", options: f.options?.map((o) => o.trim()).filter(Boolean) })), rules: def.rules.filter((r) => def.fields.some((f) => f.id === r.fieldId)), updatedAt: inn.today, updatedBy: inn.me };
    inn.commit(moduleOf(kind), existing ? "فرم درخواست را ویرایش کرد" : "فرم درخواست سفارشی طراحی کرد", { id: ownerId, title: ownerTitle }, (s) => ({ ...s, forms: [...(s.forms ?? []).filter((f) => !(f.ownerKind === kind && f.ownerId === ownerId)), clean] }));
    notify("فرم ذخیره شد؛ متقاضیان از این پس همین فرم را پر می‌کنند.", "success");
    onClose();
  };
  const remove = () => {
    inn.commit(moduleOf(kind), "فرم درخواست سفارشی را حذف کرد", { id: ownerId, title: ownerTitle }, (s) => ({ ...s, forms: (s.forms ?? []).filter((f) => !(f.ownerKind === kind && f.ownerId === ownerId)) }));
    notify("فرم سفارشی حذف شد؛ فرم پایه‌ی ثبت درخواست استفاده می‌شود.", "info");
    onClose();
  };

  const tabs = [
    { id: "fields" as const, label: `فیلدها (${faN(def.fields.length)})`, icon: ListChecks },
    { id: "rules" as const, label: `شرایط احراز (${faN(def.rules.length)})`, icon: ShieldCheck },
    { id: "preview" as const, label: "پیش‌نمایش", icon: Eye },
  ];

  return (
    <Modal open onClose={onClose} title={`فرم ${formOwnerLabel[kind]}`} description={ownerTitle} width="max-w-2xl">
      <div className="space-y-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-ink-100 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setView(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${view === t.id ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800"}`}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {view === "fields" && (
          <div className="space-y-2">
            <Field label="عنوان فرم"><input value={def.title} onChange={(e) => setDef({ ...def, title: e.target.value })} className="input-field" /></Field>
            <Field label="توضیح برای متقاضی" hint="اختیاری — بالای فرم نمایش داده می‌شود"><input value={def.intro ?? ""} onChange={(e) => setDef({ ...def, intro: e.target.value })} className="input-field" /></Field>
            {def.fields.map((f, i) => (
              <div key={f.id} className="rounded-lg border border-ink-200 p-2.5 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] text-ink-400 w-5 text-center shrink-0">{faN(i + 1)}</span>
                  <input value={f.label} onChange={(e) => setField(f.id, { label: e.target.value })} placeholder="عنوان فیلد" aria-label="عنوان فیلد" className="input-field flex-1 min-w-0" />
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="بالا" className="w-7 h-7 rounded-md hover:bg-ink-100 text-ink-500 flex items-center justify-center disabled:opacity-30 shrink-0"><ArrowUp size={13} /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === def.fields.length - 1} aria-label="پایین" className="w-7 h-7 rounded-md hover:bg-ink-100 text-ink-500 flex items-center justify-center disabled:opacity-30 shrink-0"><ArrowDown size={13} /></button>
                  <button type="button" onClick={() => setDef((d) => ({ ...d, fields: d.fields.filter((x) => x.id !== f.id), rules: d.rules.filter((r) => r.fieldId !== f.id) }))} aria-label="حذف فیلد" className="w-7 h-7 rounded-md hover:bg-rose-50 text-ink-400 hover:text-rose-600 flex items-center justify-center shrink-0"><Trash2 size={13} /></button>
                </div>
                <div className="flex flex-wrap items-center gap-2 pr-6">
                  <select value={f.type} onChange={(e) => setField(f.id, { type: e.target.value as FormFieldType, options: ["select", "multi"].includes(e.target.value) ? f.options ?? ["گزینه ۱", "گزینه ۲"] : undefined })} className="input-field !w-auto !py-1.5 !text-xs" aria-label="نوع فیلد">
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{fieldTypeLabel[t]}</option>)}
                  </select>
                  {f.type === "entity" && (
                    <select value={f.entityKind ?? ""} onChange={(e) => setField(f.id, { entityKind: (e.target.value || undefined) as FormField["entityKind"] })} className="input-field !w-auto !py-1.5 !text-xs" aria-label="نوع موجودیت">
                      <option value="">شرکت یا پژوهشگر</option>
                      <option value="company">فقط شرکت</option>
                      <option value="researcher">فقط پژوهشگر</option>
                    </select>
                  )}
                  <label className="flex items-center gap-1.5 text-[11.5px] text-ink-600 cursor-pointer">
                    <input type="checkbox" checked={!!f.required} onChange={(e) => setField(f.id, { required: e.target.checked })} /> الزامی
                  </label>
                </div>
                {(f.type === "select" || f.type === "multi") && (
                  <div className="pr-6">
                    <input value={(f.options ?? []).join("، ")} onChange={(e) => setField(f.id, { options: e.target.value.split(/[،,]/) })} placeholder="گزینه‌ها با «،» جدا شوند" aria-label="گزینه‌ها" className="input-field !text-xs" />
                  </div>
                )}
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => setDef((d) => ({ ...d, fields: [...d.fields, { id: newFieldId(), label: "", type: "text" }] }))}>افزودن فیلد</Button>
          </div>
        )}

        {view === "rules" && (
          <div className="space-y-2">
            <p className="text-[11.5px] text-ink-500 leading-6">شرایط هنگام ارسال درخواست سنجیده می‌شوند؛ اگر احراز نشوند، متقاضی دلیل دقیق را می‌بیند. برای فیلدهای «شرکت / پژوهشگر» می‌توانید ویژگی ثبت‌شده در بانک (مثل TRL یا نوع شرکت) را بسنجید.</p>
            {def.rules.length === 0 && <p className="text-xs text-ink-400">شرطی تعریف نشده — همه‌ی متقاضیانِ دارای فیلدهای الزامی کامل پذیرفته می‌شوند.</p>}
            {def.rules.map((r) => {
              const f = def.fields.find((x) => x.id === r.fieldId);
              const kbIn = r.attr === "kbType" && r.op === "in";
              return (
                <div key={r.id} className="rounded-lg border border-ink-200 p-2.5 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <select value={r.fieldId} onChange={(e) => setRule(r.id, { fieldId: e.target.value, attr: def.fields.find((x) => x.id === e.target.value)?.type === "entity" ? r.attr ?? "trl" : undefined })} className="input-field !w-auto !py-1.5 !text-xs max-w-[180px]" aria-label="فیلد">
                      {def.fields.map((x) => <option key={x.id} value={x.id}>{x.label || "بدون عنوان"}</option>)}
                    </select>
                    {f?.type === "entity" && (
                      <select value={r.attr ?? "trl"} onChange={(e) => setRule(r.id, { attr: e.target.value as EntityAttr })} className="input-field !w-auto !py-1.5 !text-xs" aria-label="ویژگی">
                        {ATTRS.map((a) => <option key={a} value={a}>{entityAttrLabel[a]}</option>)}
                      </select>
                    )}
                    <select value={r.op} onChange={(e) => setRule(r.id, { op: e.target.value as RuleOp })} className="input-field !w-auto !py-1.5 !text-xs" aria-label="شرط">
                      {OPS.map((o) => <option key={o} value={o}>{ruleOpLabel[o]}</option>)}
                    </select>
                    {r.op !== "notEmpty" && !kbIn && <input value={r.value} onChange={(e) => setRule(r.id, { value: e.target.value })} placeholder={r.op === "in" ? "مقدارها با «|»" : "مقدار"} aria-label="مقدار" className="input-field !w-28 !py-1.5 !text-xs" />}
                    <button type="button" onClick={() => setDef((d) => ({ ...d, rules: d.rules.filter((x) => x.id !== r.id) }))} aria-label="حذف شرط" className="w-7 h-7 rounded-md hover:bg-rose-50 text-ink-400 hover:text-rose-600 flex items-center justify-center mr-auto"><Trash2 size={13} /></button>
                  </div>
                  {kbIn && (
                    <div className="flex flex-wrap gap-1.5">
                      {kbTypes.map((k) => {
                        const on = r.value.split("|").includes(k);
                        return (
                          <button key={k} type="button" onClick={() => setRule(r.id, { value: (on ? r.value.split("|").filter((x) => x && x !== k) : [...r.value.split("|").filter(Boolean), k]).join("|") })} className={`text-[11px] px-2 py-0.5 rounded-full border ${on ? "bg-brand-50 border-brand-300 text-brand-700" : "border-ink-200 text-ink-500"}`}>
                            {k}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <input value={r.message ?? ""} onChange={(e) => setRule(r.id, { message: e.target.value || undefined })} placeholder="پیام عدم احراز (اختیاری)" aria-label="پیام عدم احراز" className="input-field !text-xs" />
                  <p className="text-[10.5px] text-ink-400">{ruleLabel(r, def.fields)}</p>
                </div>
              );
            })}
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="ghost" icon={<Plus size={13} />} disabled={!def.fields.length} onClick={() => setDef((d) => ({ ...d, rules: [...d.rules, { id: newRuleId(), fieldId: d.fields[0].id, attr: d.fields[0].type === "entity" ? "trl" : undefined, op: "gte", value: "" }] }))}>افزودن شرط</Button>
              {def.fields.some((f) => f.type === "entity") && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => { const ef = def.fields.find((f) => f.type === "entity")!; setDef((d) => ({ ...d, rules: [...d.rules, { id: newRuleId(), fieldId: ef.id, attr: "trl", op: "gte", value: "4" }] })); }}>+ TRL ≥ ۴</Button>
                  <Button size="sm" variant="ghost" onClick={() => { const ef = def.fields.find((f) => f.type === "entity")!; setDef((d) => ({ ...d, rules: [...d.rules, { id: newRuleId(), fieldId: ef.id, attr: "kbType", op: "in", value: KB_ONLY.join("|") }] })); }}>+ فقط دانش‌بنیان</Button>
                </>
              )}
            </div>
          </div>
        )}

        {view === "preview" && <FormPreview def={def} />}

        <div className="flex gap-2 pt-1 border-t border-ink-100">
          <Button variant="primary" className="flex-1 justify-center" onClick={save}>ذخیره‌ی فرم</Button>
          {existing && <Button variant="ghost" onClick={remove}>حذف فرم</Button>}
          <Button variant="secondary" onClick={onClose}>انصراف</Button>
        </div>
      </div>
    </Modal>
  );
}

function FormPreview({ def }: { def: FormDef }) {
  const { entities } = useInnovation();
  const [sub, setSub] = useState(emptySubmission(def));
  const [check, setCheck] = useState<FormCheck | null>(null);
  return (
    <div className="space-y-3">
      <FormFill def={def} value={sub} onChange={(v) => { setSub(v); setCheck(null); }} missing={check?.missing} />
      <Button size="sm" variant="secondary" icon={<ShieldCheck size={13} />} onClick={() => setCheck(evaluateForm(def, sub, entities))}>آزمایش ارسال</Button>
      {check && <EligibilityResult def={def} check={check} />}
    </div>
  );
}

// =========================================================================== پر کردن فرم

export type FormValue = Pick<FormSubmission, "answers" | "refs">;
export const emptySubmission = (def?: FormDef): FormValue => ({ answers: Object.fromEntries((def?.fields ?? []).filter((f) => f.type === "multi").map((f) => [f.id, [] as string[]])), refs: {} });

export function FormFill({ def, value, onChange, missing, hideIntro }: { def: FormDef; value: FormValue; onChange: (v: FormValue) => void; missing?: string[]; hideIntro?: boolean }) {
  const setA = (id: string, v: string | string[]) => onChange({ ...value, answers: { ...value.answers, [id]: v } });
  return (
    <div className="space-y-3">
      {!hideIntro && def.intro && <p className="text-[11.5px] text-brand-800 bg-brand-50 border border-brand-200 rounded-lg px-2.5 py-2 leading-6">{def.intro}</p>}
      {def.fields.map((f) => {
        const bad = missing?.includes(f.id);
        const v = value.answers[f.id];
        const cls = `input-field ${bad ? "input-error" : ""}`;
        return (
          <Field key={f.id} label={f.label} required={f.required} hint={f.help}>
            {f.type === "text" && <input value={(v as string) ?? ""} onChange={(e) => setA(f.id, e.target.value)} className={cls} />}
            {f.type === "longText" && <textarea value={(v as string) ?? ""} onChange={(e) => setA(f.id, e.target.value)} rows={3} className={cls} />}
            {f.type === "number" && <input value={(v as string) ?? ""} onChange={(e) => setA(f.id, e.target.value)} inputMode="decimal" className={cls} />}
            {f.type === "date" && <JalaliDatePicker value={(v as string) ?? ""} onChange={(x) => setA(f.id, x)} />}
            {f.type === "select" && (
              <select value={(v as string) ?? ""} onChange={(e) => setA(f.id, e.target.value)} className={cls}>
                <option value="">انتخاب…</option>
                {(f.options ?? []).map((o) => <option key={o}>{o}</option>)}
              </select>
            )}
            {f.type === "multi" && (
              <div className={`flex flex-wrap gap-1.5 ${bad ? "rounded-lg ring-1 ring-rose-300 p-1" : ""}`}>
                {(f.options ?? []).map((o) => {
                  const arr = Array.isArray(v) ? v : [];
                  const on = arr.includes(o);
                  return (
                    <button key={o} type="button" onClick={() => setA(f.id, on ? arr.filter((x) => x !== o) : [...arr, o])} className={`text-[11.5px] px-2.5 py-1 rounded-full border ${on ? "bg-brand-50 border-brand-300 text-brand-700" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}>
                      {on && <CheckCircle2 size={11} className="inline ml-1" />}
                      {o}
                    </button>
                  );
                })}
              </div>
            )}
            {f.type === "file" && (
              <label className={`flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 cursor-pointer text-xs ${bad ? "border-rose-300" : "border-ink-300 hover:border-brand-400"}`}>
                <FileUp size={14} className="text-ink-400 shrink-0" />
                <span className="truncate text-ink-600">{(v as string) || "انتخاب فایل…"}</span>
                <input type="file" className="hidden" onChange={(e) => setA(f.id, e.target.files?.[0]?.name ?? "")} />
              </label>
            )}
            {f.type === "entity" && (
              <EntityPicker
                kind={f.entityKind}
                name={(v as string) ?? ""}
                invalid={bad}
                onChange={(n, id) => {
                  const refs = { ...value.refs };
                  if (id) refs[f.id] = id;
                  else delete refs[f.id];
                  onChange({ answers: { ...value.answers, [f.id]: n }, refs });
                }}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}

/** نتیجه‌ی سنجش فرم: فیلدهای الزامیِ خالی و شرایط احرازنشده با دلیل */
export function EligibilityResult({ def, check }: { def: FormDef; check: FormCheck }) {
  if (!check.missing.length && check.eligible)
    return (
      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-2 flex items-center gap-1.5">
        <ShieldCheck size={14} /> همه‌ی فیلدهای الزامی کامل است و {def.rules.length ? `${faN(def.rules.length)} شرط احراز شد` : "شرطی برای احراز تعریف نشده"}.
      </p>
    );
  return (
    <div className="text-xs bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-2 space-y-1">
      {check.missing.length > 0 && (
        <p className="text-rose-700 font-medium">
          فیلدهای الزامی تکمیل نشده: {check.missing.map((id) => `«${def.fields.find((f) => f.id === id)?.label ?? ""}»`).join("، ")}
        </p>
      )}
      {check.reasons.length > 0 && (
        <>
          <p className="text-rose-700 font-medium flex items-center gap-1"><ShieldAlert size={13} /> شرایط فراخوان احراز نشد:</p>
          <ul className="list-disc pr-5 space-y-0.5 text-rose-800 leading-5">
            {check.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}

export function FormStatusBadge({ sub }: { sub?: FormSubmission }) {
  if (!sub) return null;
  return sub.eligible ? <Badge tone="success" icon={<ShieldCheck size={10} />}>احراز شرایط</Badge> : <Badge tone="danger" icon={<ShieldAlert size={10} />}>فاقد شرایط</Badge>;
}

export function FormAnswersView({ def, sub }: { def?: FormDef; sub: FormSubmission }) {
  const { entities } = useInnovation();
  if (!def) return null;
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {def.fields.map((f) => (
          <div key={f.id} className="rounded-lg bg-ink-50 px-2.5 py-1.5 min-w-0">
            <p className="text-[10.5px] text-ink-400 truncate">{f.label}</p>
            <p className="text-[11.5px] text-ink-800 break-words">{answerDisplay(f, sub, entities)}</p>
          </div>
        ))}
      </div>
      {!sub.eligible && sub.reasons.length > 0 && (
        <ul className="text-[11px] text-rose-700 list-disc pr-5 space-y-0.5">
          {sub.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
      )}
    </div>
  );
}

/** متقاضی ← نام و شناسه‌ی موجودیت از نخستین فیلد entity فرم */
export function applicantFromForm(def: FormDef, v: FormValue): { name?: string; entityId?: string } {
  const f = def.fields.find((x) => x.type === "entity");
  if (!f) return {};
  const name = v.answers[f.id];
  return { name: typeof name === "string" ? name.trim() : undefined, entityId: v.refs[f.id] };
}
