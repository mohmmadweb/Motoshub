// ---------------------------------------------------------------------------
// بند ۹: ویرایشگر قالب‌های گردش کار (به تفکیک نوع سند)، جانشینی و نمای مرحله‌ای
// گردش کار هر سند با مهلت (SLA) و نشان «معوق».
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, GitBranch, UserCheck, Clock, AlertTriangle, Check, CornerUpLeft, Bell, X } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge, type FlowInfo } from "../../context/KnowledgeContext";
import { users } from "../../data/mock";
import { addDays, fa } from "../../pm/jalali";
import { approverLabel } from "../../km/access";
import { wfStepKindLabel, type KDoc, type KWfStep, type KWfTemplate, type WfApprover, type WfStepKind } from "../../km/types";

export function OverdueBadge({ f }: { f: FlowInfo }) {
  if (f.overdueDays > 0)
    return (
      <Badge tone="danger" icon={<AlertTriangle size={11} />}>
        {fa(f.overdueDays)} روز معوق
      </Badge>
    );
  const left = -f.overdueDays;
  return <Badge tone={left <= 1 ? "warning" : "neutral"} icon={<Clock size={11} />}>{left === 0 ? "مهلت امروز" : `${fa(left)} روز مانده`}</Badge>;
}

/** نمای مرحله‌ای گردش کار یک سند */
export function FlowStepper({ doc }: { doc: KDoc }) {
  const km = useKnowledge();
  const { iam } = useTenancy();
  const f = km.flowInfo(doc);
  const t = f?.template ?? km.templates.find((x) => x.id === doc.flow?.templateId);
  if (!t || !doc.flow) return null;
  const done = doc.status === "منتشرشده" || doc.status === "آرشیو";
  const idx = done ? t.steps.length : doc.flow.stepIdx;
  const returned = doc.status === "ارجاع برای اصلاح";
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {t.steps.map((s, i) => {
          const state = i < idx && !returned ? "done" : i === idx && !done && !returned ? "current" : "todo";
          return (
            <div key={s.id} className="flex items-center gap-1 shrink-0">
              <div className={`rounded-lg border px-2.5 py-1.5 min-w-[118px] ${state === "current" ? (f && f.overdueDays > 0 ? "border-rose-300 bg-rose-50" : "border-brand-300 bg-brand-50") : state === "done" ? "border-emerald-200 bg-emerald-50" : "border-ink-200 bg-white"}`}>
                <p className="text-[11px] font-bold text-ink-800 flex items-center gap-1">
                  {state === "done" ? <Check size={11} className="text-emerald-600" /> : <span className="text-ink-400">{fa(i + 1)}.</span>}
                  {s.name}
                </p>
                <p className="text-[10px] text-ink-500 mt-0.5 truncate max-w-[150px]">
                  {wfStepKindLabel[s.kind]} · {approverLabel(s.approver, iam)}
                </p>
                <p className="text-[10px] text-ink-400">مهلت {fa(s.slaDays)} روز</p>
              </div>
              {i < t.steps.length - 1 && <span className="text-ink-300 text-xs">←</span>}
            </div>
          );
        })}
      </div>
      {f && (
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-ink-600">
          <UserCheck size={13} className="text-brand-600" />
          <span>
            اکنون: <b>{f.step.name}</b> — {f.actors.join("، ") || "تأییدکننده تعیین نشده"}
            {f.deputies.length > 0 && <span className="text-ink-400"> (جانشین: {f.deputies.map((x) => x.name).join("، ")})</span>}
          </span>
          <span className="text-ink-400">موعد {f.due}</span>
          <OverdueBadge f={f} />
        </div>
      )}
      {returned && <p className="text-[11px] text-rose-600">سند برای اصلاح برگشته است؛ با ارسال دوباره، گردش کار از مرحله‌ی اول شروع می‌شود.</p>}
    </div>
  );
}

const decisionMeta: Record<string, { label: string; icon: typeof Check; tone: string }> = {
  submit: { label: "ارسال", icon: GitBranch, tone: "text-brand-600" },
  approve: { label: "تأیید", icon: Check, tone: "text-emerald-600" },
  publish: { label: "انتشار", icon: Check, tone: "text-emerald-600" },
  return: { label: "ارجاع برای اصلاح", icon: CornerUpLeft, tone: "text-rose-600" },
  remind: { label: "یادآوری خودکار", icon: Bell, tone: "text-amber-600" },
  escalate: { label: "تشدید", icon: AlertTriangle, tone: "text-rose-600" },
};

/** تاریخچه‌ی مرحله‌به‌مرحله */
export function FlowHistory({ doc }: { doc: KDoc }) {
  if (!doc.flow?.history.length) return null;
  return (
    <ol className="space-y-2">
      {[...doc.flow.history].reverse().map((h, i) => {
        const m = decisionMeta[h.decision] ?? decisionMeta.approve;
        return (
          <li key={i} className="flex items-start gap-2 text-xs">
            <m.icon size={13} className={`${m.tone} shrink-0 mt-0.5`} />
            <div className="min-w-0">
              <p className="text-ink-800">
                <b>{m.label}</b> · {h.stepName} — {h.by}
                {h.onBehalfOf && <span className="text-ink-400"> (جانشین {h.onBehalfOf})</span>}
              </p>
              <p className="text-[10.5px] text-ink-400">{h.at}</p>
              {h.note && <p className="text-[11px] text-ink-600 bg-ink-50 rounded px-2 py-1 mt-1">{h.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ------------------------------------------------------------------ ویرایشگر قالب‌ها
const newStep = (i: number): KWfStep => ({ id: `st-${Date.now().toString(36)}-${i}`, name: "مرحله‌ی جدید", kind: "approve", approver: { kind: "scopeManager" }, slaDays: 3 });

function StepRow({ s, i, n, onChange, onMove, onRemove }: { s: KWfStep; i: number; n: number; onChange: (s: KWfStep) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void }) {
  const { iam } = useTenancy();
  const setApprover = (a: WfApprover) => onChange({ ...s, approver: a });
  return (
    <div className="rounded-lg border border-ink-200 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-[11px] font-bold flex items-center justify-center shrink-0">{fa(i + 1)}</span>
        <input className="input-field !py-1.5 !text-xs flex-1 min-w-0" value={s.name} onChange={(e) => onChange({ ...s, name: e.target.value })} aria-label="نام مرحله" />
        <button type="button" disabled={i === 0} onClick={() => onMove(-1)} className="p-1 text-ink-400 hover:text-ink-800 disabled:opacity-30" aria-label="بالا">
          <ArrowUp size={13} />
        </button>
        <button type="button" disabled={i === n - 1} onClick={() => onMove(1)} className="p-1 text-ink-400 hover:text-ink-800 disabled:opacity-30" aria-label="پایین">
          <ArrowDown size={13} />
        </button>
        <button type="button" disabled={n <= 1} onClick={onRemove} className="p-1 text-ink-400 hover:text-rose-600 disabled:opacity-30" aria-label="حذف مرحله">
          <Trash2 size={13} />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <select className="input-field !py-1.5 !text-xs" value={s.kind} onChange={(e) => onChange({ ...s, kind: e.target.value as WfStepKind })} aria-label="نوع مرحله">
          {(Object.keys(wfStepKindLabel) as WfStepKind[]).map((k) => (
            <option key={k} value={k}>
              {wfStepKindLabel[k]}
            </option>
          ))}
        </select>
        <select className="input-field !py-1.5 !text-xs" value={s.approver.kind} onChange={(e) => setApprover({ kind: e.target.value as WfApprover["kind"], id: e.target.value === "user" ? users[0].name : e.target.value === "role" ? iam.roles[0]?.id : undefined })} aria-label="نوع تأییدکننده">
          <option value="user">کاربر مشخص</option>
          <option value="role">نقش</option>
          <option value="scopeManager">مدیر واحد سند</option>
          <option value="owner">مالک سند</option>
        </select>
        {s.approver.kind === "user" && (
          <select className="input-field !py-1.5 !text-xs" value={s.approver.id} onChange={(e) => setApprover({ kind: "user", id: e.target.value })} aria-label="کاربر">
            {users.map((u) => (
              <option key={u.id}>{u.name}</option>
            ))}
          </select>
        )}
        {s.approver.kind === "role" && (
          <select className="input-field !py-1.5 !text-xs" value={s.approver.id} onChange={(e) => setApprover({ kind: "role", id: e.target.value })} aria-label="نقش">
            {iam.roles.filter((r) => r.active).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}
        {(s.approver.kind === "scopeManager" || s.approver.kind === "owner") && <span className="text-[11px] text-ink-400 self-center px-1">خودکار از سند</span>}
        <label className="flex items-center gap-1 text-[11px] text-ink-500">
          مهلت
          <input type="number" min={1} max={60} className="input-field !py-1.5 !text-xs !w-16" value={s.slaDays} onChange={(e) => onChange({ ...s, slaDays: Math.max(1, Number(e.target.value) || 1) })} aria-label="مهلت به روز" />
          روز
        </label>
      </div>
      <label className="flex items-center gap-1.5 text-[11px] text-ink-500">
        جانشین ثابت:
        <select className="input-field !py-1 !text-xs flex-1" value={s.substitute ?? ""} onChange={(e) => onChange({ ...s, substitute: e.target.value || undefined })}>
          <option value="">ندارد</option>
          {users.map((u) => (
            <option key={u.id}>{u.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function WorkflowSettings() {
  const km = useKnowledge();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [selId, setSelId] = useState(km.templates[0]?.id ?? "");
  const [draft, setDraft] = useState<KWfTemplate | null>(null);
  const sel = draft ?? km.templates.find((t) => t.id === selId) ?? km.templates[0];
  const edit = (patch: Partial<KWfTemplate>) => setDraft({ ...(sel as KWfTemplate), ...patch });
  const usedTypes = new Set(km.templates.filter((t) => t.id !== sel?.id).flatMap((t) => t.docTypes));
  const [del, setDel] = useState({ from: "", to: "", until: addDays(km.today, 7), note: "" });

  const setSteps = (steps: KWfStep[]) => edit({ steps });
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
      <div className="card p-4 space-y-3 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-ink-900 flex-1">قالب‌های گردش کار</p>
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus size={13} />}
            onClick={() => {
              const t: KWfTemplate = { id: `wf-${Date.now().toString(36)}`, name: "قالب جدید", docTypes: [], steps: [newStep(0)] };
              setDraft(t);
              setSelId(t.id);
            }}
          >
            قالب جدید
          </Button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[...km.templates, ...(draft && !km.templates.some((t) => t.id === draft.id) ? [draft] : [])].map((t) => (
            <button key={t.id} onClick={() => { setDraft(null); setSelId(t.id); }} className={`text-xs px-3 py-1.5 rounded-lg border ${sel?.id === t.id ? "bg-navy-900 text-white border-navy-900" : "bg-white border-ink-200 text-ink-600"}`}>
              {t.name} <span className="opacity-70">({fa(t.steps.length)})</span>
            </button>
          ))}
        </div>
        {sel && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input className="input-field !text-xs" value={sel.name} onChange={(e) => edit({ name: e.target.value })} aria-label="نام قالب" />
              <div className="text-[11px] text-ink-500 self-center">{sel.docTypes.length ? "فقط برای نوع‌های انتخاب‌شده" : "قالب پیش‌فرض (همه‌ی نوع‌های بدون قالب اختصاصی)"}</div>
            </div>
            <div className="flex flex-wrap gap-1">
              {km.docTypes.map((dt) => {
                const on = sel.docTypes.includes(dt.name);
                const taken = usedTypes.has(dt.name);
                return (
                  <button key={dt.id} type="button" disabled={taken && !on} title={taken && !on ? "این نوع قالب دیگری دارد" : undefined} onClick={() => edit({ docTypes: on ? sel.docTypes.filter((x) => x !== dt.name) : [...sel.docTypes, dt.name] })} className={`text-[11px] px-2 py-0.5 rounded-full border disabled:opacity-40 ${on ? "bg-brand-50 border-brand-300 text-brand-700" : "border-ink-200 text-ink-500"}`}>
                    {dt.name}
                  </button>
                );
              })}
            </div>
            <div className="space-y-2">
              {sel.steps.map((s, i) => (
                <StepRow
                  key={s.id}
                  s={s}
                  i={i}
                  n={sel.steps.length}
                  onChange={(x) => setSteps(sel.steps.map((y, j) => (j === i ? x : y)))}
                  onMove={(dir) => {
                    const a = [...sel.steps];
                    [a[i], a[i + dir]] = [a[i + dir], a[i]];
                    setSteps(a);
                  }}
                  onRemove={() => setSteps(sel.steps.filter((_, j) => j !== i))}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => setSteps([...sel.steps, newStep(sel.steps.length)])}>
                افزودن مرحله
              </Button>
              <span className="mr-auto flex gap-1.5">
                {km.templates.length > 1 && km.templates.some((t) => t.id === sel.id) && (
                  <Button size="sm" variant="ghost" className="text-rose-600" icon={<Trash2 size={13} />} onClick={() => confirm({ title: `حذف قالب «${sel.name}»؟`, message: "اسنادی که الان در این گردش کار هستند با قالب پیش‌فرض ادامه می‌دهند.", onConfirm: () => { km.deleteWorkflow(sel.id); setSelId(km.templates[0]?.id ?? ""); setDraft(null); notify("قالب حذف شد.", "info"); } })}>
                    حذف
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Save size={13} />}
                  disabled={!draft}
                  onClick={() => {
                    if (!draft) return;
                    if (!draft.name.trim() || draft.steps.some((s) => !s.name.trim())) return notify("نام قالب و نام همه‌ی مراحل الزامی است.", "warning");
                    km.saveWorkflow(draft);
                    setDraft(null);
                    notify("قالب گردش کار ذخیره شد؛ تأییدکنندگان جدید مطلع شدند.");
                  }}
                >
                  ذخیره‌ی قالب
                </Button>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="card p-4 space-y-3 self-start">
        <p className="text-sm font-bold text-ink-900">جانشینی تأییدکنندگان</p>
        <p className="text-[11px] text-ink-400 leading-5">در بازه‌ی جانشینی، کارتابل فرد اصلی برای جانشین هم نمایش داده می‌شود و تأیید او «به جانشینی» ثبت می‌شود.</p>
        <ul className="space-y-1.5">
          {(km.settings.delegations ?? []).map((x) => (
            <li key={x.id} className="text-xs bg-ink-50 rounded-md px-2.5 py-1.5 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-ink-800 truncate">
                  {x.to} ← به‌جای {x.from}
                </p>
                <p className="text-[10.5px] text-ink-400">
                  تا {x.until}
                  {x.until < km.today ? " (منقضی)" : ""}
                  {x.note ? ` · ${x.note}` : ""}
                </p>
              </div>
              <button onClick={() => km.removeDelegation(x.id)} className="text-ink-400 hover:text-rose-600" aria-label="لغو جانشینی">
                <X size={13} />
              </button>
            </li>
          ))}
          {!(km.settings.delegations ?? []).length && <li className="text-[11px] text-ink-400">جانشینی فعالی نیست.</li>}
        </ul>
        <div className="space-y-1.5 border-t border-ink-100 pt-3">
          <select className="input-field !py-1.5 !text-xs" value={del.from} onChange={(e) => setDel({ ...del, from: e.target.value })} aria-label="تأییدکننده‌ی اصلی">
            <option value="">تأییدکننده‌ی اصلی…</option>
            {users.map((u) => (
              <option key={u.id}>{u.name}</option>
            ))}
          </select>
          <select className="input-field !py-1.5 !text-xs" value={del.to} onChange={(e) => setDel({ ...del, to: e.target.value })} aria-label="جانشین">
            <option value="">جانشین…</option>
            {users.filter((u) => u.name !== del.from).map((u) => (
              <option key={u.id}>{u.name}</option>
            ))}
          </select>
          <JalaliDatePicker value={del.until} onChange={(v) => setDel({ ...del, until: v })} />
          <input className="input-field !py-1.5 !text-xs" value={del.note} onChange={(e) => setDel({ ...del, note: e.target.value })} placeholder="دلیل (مثلاً مرخصی)" />
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus size={13} />}
            onClick={() => {
              if (!del.from || !del.to) return notify("تأییدکننده و جانشین را انتخاب کنید.", "warning");
              km.saveDelegation({ from: del.from, to: del.to, until: del.until, note: del.note.trim() || undefined });
              setDel({ from: "", to: "", until: addDays(km.today, 7), note: "" });
              notify("جانشینی ثبت شد و به جانشین اعلان رفت.");
            }}
          >
            ثبت جانشینی
          </Button>
        </div>
      </div>
    </div>
  );
}
