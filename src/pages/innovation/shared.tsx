// اجزای مشترک صفحات نوآوری: لاگ فعالیت، ثبت تصمیم، ثبت نتیجه‌ی واقعی، انتخاب موجودیت
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Database, ExternalLink, Gavel, History, Info, Trophy } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Drawer from "../../components/ui/Drawer";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { useInnovation } from "../../context/InnovationContext";
import type { DecisionOption, EcoEntity, EntityKind, InnModule, Outcome, OutcomeBudget, OutcomeDelivery, OutcomeSchedule, Provenance } from "../../innovation/types";
import { moduleTitle } from "../../innovation/types";
import { faN } from "../../innovation/util";

export const Field = ({ label, children, hint, required }: { label: string; children: ReactNode; hint?: string; required?: boolean }) => (
  <div>
    <label className="text-xs font-medium text-ink-600 block mb-1.5">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-[10.5px] text-ink-400 mt-1 leading-5">{hint}</p>}
  </div>
);

export const Section = ({ title, icon, children, action }: { title: string; icon?: ReactNode; children: ReactNode; action?: ReactNode }) => (
  <div className="border-t border-ink-100 pt-4">
    <div className="flex items-center justify-between gap-2 mb-2">
      <h4 className="text-xs font-bold text-ink-900 flex items-center gap-1.5">{icon}{title}</h4>
      {action}
    </div>
    {children}
  </div>
);

export const Info2 = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="bg-ink-50 rounded-lg p-2.5 text-xs min-w-0">
    <p className="text-ink-400">{label}</p>
    <p className="font-medium text-ink-800 mt-1 break-words">{value}</p>
  </div>
);

/** نوار پیشرفت مرحله‌ای (پرونده‌ها) */
export function Stepper<T extends string>({ steps, current, onPick }: { steps: readonly T[]; current: T; onPick?: (s: T) => void }) {
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <button
          key={s}
          type="button"
          disabled={!onPick}
          onClick={() => onPick?.(s)}
          className={`flex-1 min-w-[78px] rounded-md px-2 py-1.5 text-[10.5px] leading-4 text-center border transition-colors ${
            i < idx ? "bg-emerald-50 border-emerald-200 text-emerald-700" : i === idx ? "bg-brand-600 border-brand-600 text-white font-bold" : "bg-ink-50 border-ink-100 text-ink-400"
          } ${onPick ? "hover:border-brand-400" : "cursor-default"}`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export function Bar({ value, max = 100, tone = "brand" }: { value: number; max?: number; tone?: "brand" | "emerald" | "amber" | "rose" }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const color = { brand: "bg-brand-500", emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500" }[tone];
  return (
    <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------- لاگ فعالیت
export function ActivityLogButton({ module }: { module: InnModule }) {
  const [open, setOpen] = useState(false);
  const { logsOf } = useInnovation();
  const logs = logsOf(module);
  return (
    <>
      <Button variant="secondary" size="sm" icon={<History size={14} />} onClick={() => setOpen(true)}>
        لاگ فعالیت
      </Button>
      <Drawer open={open} onClose={() => setOpen(false)} title={`لاگ فعالیت — ${moduleTitle[module]}`}>
        {logs.length === 0 ? (
          <EmptyState title="هنوز فعالیتی ثبت نشده" />
        ) : (
          <div className="space-y-0">
            {logs.map((l, i) => (
              <div key={l.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                  {i < logs.length - 1 && <span className="w-px flex-1 bg-ink-200" />}
                </div>
                <div className="pb-3.5 min-w-0">
                  <p className="text-xs text-ink-800 leading-5">
                    <span className="font-bold">{l.actor}</span> {l.action}
                    {l.subject && <span className="text-ink-500"> — «{l.subject.title}»</span>}
                  </p>
                  <p className="text-[10.5px] text-ink-400 mt-0.5">{l.at}{l.module !== module ? ` · ${moduleTitle[l.module]}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}

// ---------------------------------------------------------------- ثبت تصمیم
/**
 * پیش از «پذیرش / انتخاب فناور برتر / تصویب / اعلام برگزیده» باز می‌شود.
 * گزینه‌ها با نتیجه‌ی ارزیابی موجود فقط نمایش داده می‌شوند (محاسبه‌ی اعتباری ندارد).
 * اگر گزینه‌ی انتخابی رتبه‌ی اول نباشد، نوشتن دلیل الزامی است.
 */
export function DecisionModal({
  open,
  onClose,
  module,
  subjectId,
  subjectTitle,
  question,
  options,
  committee: committeeDefault = "",
  confirmLabel = "ثبت تصمیم",
  initialChoice,
  onDecided,
}: {
  open: boolean;
  onClose: () => void;
  module: InnModule;
  subjectId: string;
  subjectTitle: string;
  question: string;
  options: DecisionOption[];
  committee?: string;
  confirmLabel?: string;
  initialChoice?: string;
  onDecided: (chosen: DecisionOption) => void;
}) {
  const { recordDecision } = useInnovation();
  const { notify } = useToast();
  const sorted = useMemo(() => [...options].sort((a, b) => a.rank - b.rank), [options]);
  const [chosen, setChosen] = useState<string>("");
  const [reason, setReason] = useState("");
  const [committee, setCommittee] = useState(committeeDefault);
  const [err, setErr] = useState(false);
  const pick = chosen || initialChoice || sorted[0]?.id || "";
  const opt = sorted.find((o) => o.id === pick);
  const deviates = !!opt && opt.rank !== 1;

  const close = () => {
    setChosen("");
    setReason("");
    setErr(false);
    onClose();
  };
  const submit = () => {
    if (!opt) return;
    if (deviates && reason.trim().length < 10) {
      setErr(true);
      return;
    }
    recordDecision({ module, subjectId, subjectTitle, question, options: sorted, chosenId: opt.id, chosenLabel: opt.label, deviates, reason: reason.trim() || "مطابق رتبه‌ی اول ارزیابی", committee: committee.trim() || undefined });
    notify(deviates ? "تصمیم با دلیلِ انحراف از رتبه‌ی اول در دفتر تصمیمات ثبت شد." : "تصمیم در دفتر تصمیمات ثبت شد.", "success");
    onDecided(opt);
    close();
  };

  return (
    <Modal open={open} onClose={close} title={`ثبت تصمیم — ${question}`} description={subjectTitle} width="max-w-xl">
      <div className="space-y-3">
        <p className="text-[11px] text-ink-500 leading-5 flex items-start gap-1.5">
          <Info size={13} className="shrink-0 mt-0.5 text-ink-400" />
          رتبه‌ها فقط از نتایج ارزیابی ثبت‌شده نمایش داده می‌شوند. تصمیم نهایی انسانی است و همراه با دلیل در «دفتر تصمیمات» ثبت می‌شود.
        </p>
        <div className="space-y-1.5 max-h-[38vh] overflow-y-auto">
          {sorted.length === 0 && <p className="text-xs text-ink-400">گزینه‌ای برای تصمیم وجود ندارد.</p>}
          {sorted.map((o) => (
            <label key={o.id} className={`flex items-center gap-2.5 rounded-lg border p-2.5 cursor-pointer text-xs ${pick === o.id ? "border-brand-500 bg-brand-50" : "border-ink-100 hover:bg-ink-50"}`}>
              <input type="radio" name="decision-opt" checked={pick === o.id} onChange={() => { setChosen(o.id); setErr(false); }} />
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${o.rank === 1 ? "bg-amber-100 text-amber-700" : "bg-ink-100 text-ink-500"}`}>{faN(o.rank)}</span>
              <span className="flex-1 min-w-0 font-medium text-ink-800 truncate">{o.label}</span>
              {o.score !== undefined && <Badge tone="neutral">ارزیابی {faN(o.score, 1)}</Badge>}
            </label>
          ))}
        </div>
        {deviates && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[11.5px] text-amber-800 flex items-start gap-1.5">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            گزینه‌ی انتخابی رتبه‌ی اول ارزیابی نیست؛ نوشتن دلیل (حداقل ۱۰ نویسه) الزامی است.
          </div>
        )}
        <Field label={deviates ? "دلیل تصمیم" : "توضیح (اختیاری)"} required={deviates}>
          <textarea value={reason} onChange={(e) => { setReason(e.target.value); setErr(false); }} rows={3} className={`input-field ${err ? "input-error" : ""}`} placeholder="مثلاً: ملاحظات ظرفیت اجرایی، صورت‌جلسه‌ی کمیته …" />
          {err && <p className="field-error">برای تصمیم خلاف رتبه‌ی اول، دلیل را کامل بنویسید.</p>}
        </Field>
        <Field label="مرجع تصمیم (کمیته / شورا)">
          <input value={committee} onChange={(e) => setCommittee(e.target.value)} className="input-field" placeholder="مثلاً: شورای صندوق" />
        </Field>
        <div className="flex items-center gap-2 pt-1">
          <Button variant="primary" className="flex-1 justify-center" icon={<Gavel size={14} />} onClick={submit} disabled={!opt}>{confirmLabel}</Button>
          <Button variant="secondary" onClick={close}>انصراف</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- نتیجه‌ی واقعی
export function OutcomeModal({
  open,
  onClose,
  module,
  subjectId,
  subjectTitle,
  entityIds,
  trlBefore,
  withTrl,
  title = "ثبت نتیجه‌ی واقعی (اختتام)",
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  module: InnModule;
  subjectId: string;
  subjectTitle: string;
  entityIds: string[];
  trlBefore?: number;
  withTrl?: boolean;
  title?: string;
  onSaved?: (o: Pick<Outcome, "successPct" | "delivered" | "trlAfter">) => void;
}) {
  const { recordOutcome, outcomes } = useInnovation();
  const prev = outcomes.find((o) => o.module === module && o.subjectId === subjectId);
  const [successPct, setSuccess] = useState(prev?.successPct ?? 75);
  const [delivered, setDelivered] = useState<OutcomeDelivery>(prev?.delivered ?? "کامل");
  const [schedule, setSchedule] = useState<OutcomeSchedule>(prev?.schedule ?? "به‌موقع");
  const [budget, setBudget] = useState<OutcomeBudget>(prev?.budget ?? "مطابق بودجه");
  const [quality, setQuality] = useState(prev?.quality ?? 4);
  const [tb, setTb] = useState(String(prev?.trlBefore ?? trlBefore ?? ""));
  const [ta, setTa] = useState(String(prev?.trlAfter ?? ""));
  const [outputs, setOutputs] = useState(prev?.outputs.join("، ") ?? "");
  const [notes, setNotes] = useState(prev?.notes ?? "");
  const { notify } = useToast();

  const save = () => {
    const trlA = ta ? Number(ta) : undefined;
    recordOutcome({
      module, subjectId, subjectTitle, entityIds, successPct, delivered, schedule, budget, quality,
      trlBefore: tb ? Number(tb) : undefined, trlAfter: trlA,
      outputs: outputs.split(/[،,]/).map((s) => s.trim()).filter(Boolean), notes: notes.trim(),
    });
    notify("نتیجه‌ی واقعی ثبت شد و در پروفایل طرف‌های مرتبط نمایش داده می‌شود.", "success");
    onSaved?.({ successPct, delivered, trlAfter: trlA });
    onClose();
  };

  const opts = <T extends string>(xs: T[], v: T, set: (x: T) => void) => (
    <div className="flex flex-wrap gap-1.5">
      {xs.map((x) => (
        <button key={x} type="button" onClick={() => set(x)} className={`text-[11px] px-2.5 py-1 rounded-md border ${v === x ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"}`}>{x}</button>
      ))}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={title} description={subjectTitle} width="max-w-xl">
      <div className="space-y-3.5">
        <p className="text-[11px] text-ink-500 leading-5 flex items-start gap-1.5">
          <Database size={13} className="shrink-0 mt-0.5 text-ink-400" />
          این داده‌ی عملکرد واقعی است که در سوابق شرکت/پژوهشگر ذخیره می‌شود. هیچ امتیاز یا رتبه‌ی اعتباری از آن ساخته نمی‌شود.
        </p>
        <Field label={`میزان تحقق اهداف: ${faN(successPct)}٪`}>
          <input type="range" min={0} max={100} step={5} value={successPct} onChange={(e) => setSuccess(Number(e.target.value))} className="w-full accent-brand-600" />
        </Field>
        <Field label="وضعیت تحویل">{opts<OutcomeDelivery>(["کامل", "بخشی", "تحویل نشد"], delivered, setDelivered)}</Field>
        <Field label="زمان‌بندی">{opts<OutcomeSchedule>(["زودتر", "به‌موقع", "تأخیر کم", "تأخیر زیاد"], schedule, setSchedule)}</Field>
        <Field label="بودجه">{opts<OutcomeBudget>(["زیر بودجه", "مطابق بودجه", "فراتر از بودجه"], budget, setBudget)}</Field>
        <Field label={`کیفیت خروجی: ${faN(quality)} از ۵`}>
          <input type="range" min={1} max={5} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-brand-600" />
        </Field>
        {withTrl && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="TRL قبل"><input value={tb} onChange={(e) => setTb(e.target.value.replace(/[^\d]/g, ""))} className="input-field" placeholder="۳" /></Field>
            <Field label="TRL بعد"><input value={ta} onChange={(e) => setTa(e.target.value.replace(/[^\d]/g, ""))} className="input-field" placeholder="۵" /></Field>
          </div>
        )}
        <Field label="خروجی‌های تحویل‌شده" hint="با «،» جدا کنید">
          <input value={outputs} onChange={(e) => setOutputs(e.target.value)} className="input-field" placeholder="گزارش نهایی، نمونه‌ی اولیه، …" />
        </Field>
        <Field label="یادداشت">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input-field" />
        </Field>
        <div className="flex items-center gap-2">
          <Button variant="primary" className="flex-1 justify-center" icon={<ClipboardCheck size={14} />} onClick={save}>ثبت نتیجه</Button>
          <Button variant="secondary" onClick={onClose}>انصراف</Button>
        </div>
      </div>
    </Modal>
  );
}

export function OutcomeSummary({ module, subjectId }: { module: InnModule; subjectId: string }) {
  const { outcomes } = useInnovation();
  const o = outcomes.find((x) => x.module === module && x.subjectId === subjectId);
  if (!o) return null;
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 text-[11.5px] text-emerald-900 space-y-1">
      <p className="font-bold flex items-center gap-1"><CheckCircle2 size={13} /> نتیجه‌ی واقعی ثبت‌شده — {faN(o.successPct)}٪ تحقق اهداف</p>
      <p>تحویل: {o.delivered} · زمان‌بندی: {o.schedule} · بودجه: {o.budget} · کیفیت {faN(o.quality)} از ۵{o.trlAfter !== undefined ? ` · TRL ${faN(o.trlBefore)} ← ${faN(o.trlAfter)}` : ""}</p>
      {o.notes && <p className="text-emerald-800/80">{o.notes}</p>}
      <p className="text-[10.5px] text-emerald-700/70">{o.recordedBy} · {o.at}</p>
    </div>
  );
}

export function DecisionsOf({ subjectId }: { subjectId: string }) {
  const { decisions } = useInnovation();
  const list = decisions.filter((d) => d.subjectId === subjectId || d.subjectId.startsWith(`${subjectId}:`));
  if (!list.length) return null;
  return (
    <div className="space-y-1.5">
      {list.map((d) => (
        <div key={d.id} className="rounded-lg bg-ink-50 p-2.5 text-[11.5px]">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-ink-800 flex items-center gap-1"><Gavel size={12} /> {d.question}: {d.chosenLabel}</p>
            {d.deviates ? <Badge tone="warning">خلاف رتبه‌ی اول</Badge> : <Badge tone="success">مطابق رتبه‌ی اول</Badge>}
          </div>
          <p className="text-ink-500 mt-1 leading-5">{d.reason}</p>
          <p className="text-[10.5px] text-ink-400 mt-0.5">{d.committee ? `${d.committee} · ` : ""}{d.decidedBy} · {d.at}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- موجودیت‌ها
export const entityHref = (id: string) => `/dashboard/research?tab=bank&entity=${id}`;

export function EntityLink({ id, name, className = "" }: { id?: string; name: string; className?: string }) {
  const { resolveEntity } = useInnovation();
  const e = resolveEntity(id, name);
  if (!e) return <span className={className}>{name}</span>;
  return (
    <Link to={entityHref(e.id)} onClick={(ev) => ev.stopPropagation()} className={`inline-flex items-center gap-0.5 text-brand-700 hover:underline ${className}`} title="مشاهده‌ی پروفایل در بانک شرکت‌ها و پژوهشگران">
      {name}
      <ExternalLink size={10} className="shrink-0" />
    </Link>
  );
}

/** انتخاب طرف از بانک موجودیت‌ها (با امکان متن آزاد که برچسب «ثبت‌نشده در بانک» می‌گیرد) */
export function EntityPicker({ kind, name, onChange, placeholder, invalid }: { kind?: EntityKind; name: string; onChange: (name: string, entityId?: string) => void; placeholder?: string; invalid?: boolean }) {
  const { entities } = useInnovation();
  const list = entities.filter((e) => !kind || e.kind === kind);
  const listId = `ent-list-${kind ?? "all"}`;
  const match = list.find((e) => e.name === name.trim());
  return (
    <div>
      <input
        list={listId}
        value={name}
        onChange={(e) => {
          const v = e.target.value;
          const m = list.find((x) => x.name === v.trim());
          onChange(v, m?.id);
        }}
        placeholder={placeholder ?? "جستجو در بانک شرکت‌ها و پژوهشگران…"}
        className={`input-field ${invalid ? "input-error" : ""}`}
      />
      <datalist id={listId}>
        {list.map((e) => (
          <option key={e.id} value={e.name}>{`${e.kind === "company" ? "شرکت" : "پژوهشگر"} · ${e.field}`}</option>
        ))}
      </datalist>
      {name.trim() && (
        <p className="text-[10.5px] mt-1">
          {match ? <span className="text-emerald-700">✓ ثبت‌شده در بانک ({match.field})</span> : <span className="text-amber-700">ثبت‌نشده در بانک — بعداً می‌توانید در «بانک شرکت‌ها و پژوهشگران» ثبتش کنید</span>}
        </p>
      )}
    </div>
  );
}

export function ProvenanceTag({ p }: { p?: Provenance }) {
  if (!p) return <span className="text-[10px] text-ink-300" title="منشأ ثبت نشده">منشأ نامعلوم</span>;
  return (
    <span className="text-[10px] text-ink-400 whitespace-nowrap" title={`منبع: ${p.source} · ${p.at} · ${p.by}`}>
      {p.source} · {p.at.split(" ")[0]} · {p.by}
    </span>
  );
}

export function EntityChip({ e }: { e: EcoEntity }) {
  return (
    <Link to={entityHref(e.id)} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100">
      {e.kind === "company" ? <Trophy size={10} /> : null}
      {e.name}
    </Link>
  );
}

/** دکمه‌های فیلتر یک‌ردیفه (مثل نوار مرحله) */
export function FilterChips<T extends string>({ items, value, onChange, counts, labels }: { items: readonly T[]; value: T | "همه"; onChange: (v: T | "همه") => void; counts?: Partial<Record<T | "همه", number>>; labels?: Partial<Record<T, string>> }) {
  const all: (T | "همه")[] = ["همه", ...items];
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {all.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`text-xs font-medium px-3 py-1.5 rounded-md border whitespace-nowrap ${value === s ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"}`}
        >
          {s === "همه" ? s : labels?.[s as T] ?? s}
          {counts?.[s] !== undefined && ` (${faN(counts[s])})`}
        </button>
      ))}
    </div>
  );
}
