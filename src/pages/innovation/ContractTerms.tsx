// ---------------------------------------------------------------------------
// متن و تضامین قرارداد:
//   • قالب‌های استاندارد با متغیر ({{طرف_دوم}}، {{مبلغ}} …) و نشان «انحراف از متن استاندارد»
//   • بند ساختاریافته‌ی مالکیت فکری (مالک، حق بهره‌برداری، سهم درآمد)
//   • ضمانت‌نامه‌های حسن انجام کار / پیش‌پرداخت با بانک، مبلغ، سررسید و هشدار ۶۰/۳۰/۷ روزه
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { BellRing, Copyright, FileText, GitCompare, Landmark, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useInnovation } from "../../context/InnovationContext";
import type { Contract, ContractGuarantee, ContractIp, ContractTemplate, ContractType, GuaranteeKind, GuaranteeStatus } from "../../innovation/types";
import { autoVars, deviatesFromTemplate, fillTemplate, guaranteeAlerts, guaranteeLevel, lineDiff, parseNum, templateVars } from "../../innovation/extras";
import { faN, rialShort, uid } from "../../innovation/util";
import { Field, Section } from "./shared";

type Upd = (action: string, fn: (x: Contract) => Contract) => void;

export function DeviationBadge({ c }: { c: Contract }) {
  const { contractTemplates } = useInnovation();
  if (!deviatesFromTemplate(c, contractTemplates)) return null;
  return <Badge tone="warning" icon={<GitCompare size={10} />}>انحراف از متن استاندارد</Badge>;
}

// ----------------------------------------------------------------- متن قرارداد

export function ContractTextSection({ c, canEdit, upd }: { c: Contract; canEdit: boolean; upd: Upd }) {
  const inn = useInnovation();
  const tpl = inn.contractTemplates?.find((t) => t.id === c.templateId);
  const [open, setOpen] = useState(false);
  const [diff, setDiff] = useState(false);
  const deviates = deviatesFromTemplate(c, inn.contractTemplates);
  const standard = tpl ? fillTemplate(tpl.body, c.templateVars ?? {}) : "";
  const d = useMemo(() => (deviates && c.body !== undefined ? lineDiff(standard, c.body) : null), [deviates, standard, c.body]);
  const missingVars = tpl ? templateVars(tpl.body).filter((v) => !c.templateVars?.[v]?.trim()) : [];
  return (
    <Section title="متن قرارداد" icon={<FileText size={13} />} action={canEdit && <Button size="sm" variant="ghost" icon={<Pencil size={12} />} onClick={() => setOpen(true)}>{tpl ? "ویرایش متن" : "ساخت از قالب"}</Button>}>
      {!tpl ? (
        <p className="text-xs text-ink-400">متن قرارداد از قالب استاندارد ساخته نشده است.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge tone="neutral">{tpl.title}</Badge>
            {deviates ? <Badge tone="warning" icon={<GitCompare size={10} />}>انحراف از متن استاندارد</Badge> : <Badge tone="success" icon={<ShieldCheck size={10} />}>مطابق متن استاندارد</Badge>}
            {missingVars.length > 0 && <Badge tone="danger">{faN(missingVars.length)} متغیر خالی</Badge>}
          </div>
          <details className="rounded-lg bg-ink-50 px-2.5 py-2">
            <summary className="cursor-pointer text-[11.5px] text-brand-700">نمایش متن</summary>
            <p className="text-[11.5px] text-ink-700 leading-6 whitespace-pre-wrap mt-1.5">{c.body ?? standard}</p>
          </details>
          {d && (
            <>
              <button type="button" onClick={() => setDiff((v) => !v)} className="text-[11px] text-amber-700 font-medium">
                {diff ? "پنهان کردن تفاوت‌ها" : `نمایش تفاوت با متن استاندارد (${faN(d.added.length + d.removed.length)} سطر)`}
              </button>
              {diff && (
                <div className="space-y-1 text-[11px] leading-5">
                  {d.removed.map((l) => <p key={`r-${l}`} className="rounded bg-rose-50 text-rose-800 px-2 py-1 line-through decoration-rose-400">− {l}</p>)}
                  {d.added.map((l) => <p key={`a-${l}`} className="rounded bg-emerald-50 text-emerald-800 px-2 py-1">+ {l}</p>)}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {open && <ContractTextModal c={c} onClose={() => setOpen(false)} upd={upd} />}
    </Section>
  );
}

function ContractTextModal({ c, onClose, upd }: { c: Contract; onClose: () => void; upd: Upd }) {
  const inn = useInnovation();
  const templates = inn.contractTemplates ?? [];
  const [tplId, setTplId] = useState(c.templateId ?? templates.find((t) => t.type === c.type)?.id ?? templates[0]?.id ?? "");
  const tpl = templates.find((t) => t.id === tplId);
  const [vars, setVars] = useState<Record<string, string>>(() => ({ ...autoVars(c), ...(c.templateVars ?? {}) }));
  const [body, setBody] = useState<string | null>(c.templateId === tplId ? c.body ?? null : null);
  const standard = tpl ? fillTemplate(tpl.body, vars) : "";
  const text = body ?? standard;
  const names = tpl ? templateVars(tpl.body) : [];
  const deviates = body !== null && body.trim() !== standard.trim();
  return (
    <Modal open onClose={onClose} title="متن قرارداد" description={c.title} width="max-w-2xl">
      <div className="space-y-3">
        <Field label="قالب استاندارد">
          <select value={tplId} onChange={(e) => { setTplId(e.target.value); setBody(null); }} className="input-field">
            {templates.map((t) => <option key={t.id} value={t.id}>{t.title} ({t.type})</option>)}
          </select>
        </Field>
        {names.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {names.map((n) => (
              <Field key={n} label={`{{${n}}}`}>
                <input value={vars[n] ?? ""} onChange={(e) => setVars({ ...vars, [n]: e.target.value })} className="input-field" />
              </Field>
            ))}
          </div>
        )}
        <Field label="متن نهایی" hint={deviates ? "متن با نسخه‌ی استاندارد فرق دارد — در پرونده «انحراف از متن استاندارد» نمایش داده می‌شود" : "تا وقتی متن را دستی تغییر ندهید، مطابق قالب می‌ماند"}>
          <textarea value={text} onChange={(e) => setBody(e.target.value)} rows={9} className="input-field leading-6" />
        </Field>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="primary"
            className="flex-1 justify-center"
            disabled={!tpl}
            onClick={() => {
              upd(deviates ? "متن قرارداد را با انحراف از قالب استاندارد ثبت کرد" : "متن قرارداد را از قالب استاندارد ساخت", (x) => ({ ...x, templateId: tplId, templateVars: vars, body: text }));
              onClose();
            }}
          >
            ذخیره‌ی متن
          </Button>
          {body !== null && <Button variant="ghost" onClick={() => setBody(null)}>بازگشت به متن استاندارد</Button>}
          <Button variant="secondary" onClick={onClose}>انصراف</Button>
        </div>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------- مدیریت قالب‌ها

export function TemplatesButton() {
  const inn = useInnovation();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ContractTemplate | null>(null);
  const templates = inn.contractTemplates ?? [];
  const usage = (id: string) => inn.contracts.filter((c) => c.templateId === id).length;
  const save = (t: ContractTemplate) => {
    const exists = templates.some((x) => x.id === t.id);
    const next = { ...t, updatedAt: inn.today, updatedBy: inn.me };
    inn.commit("contracts", exists ? `قالب «${t.title}» را ویرایش کرد` : `قالب قرارداد «${t.title}» را ساخت`, { id: t.id, title: t.title }, (s) => ({ ...s, contractTemplates: exists ? (s.contractTemplates ?? []).map((x) => (x.id === t.id ? next : x)) : [...(s.contractTemplates ?? []), next] }));
    notify("قالب ذخیره شد.", "success");
    setEdit(null);
  };
  return (
    <>
      <Button size="sm" variant="secondary" icon={<FileText size={14} />} onClick={() => setOpen(true)}>قالب‌ها</Button>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="قالب‌های استاندارد قرارداد" description="متغیرها را با {{نام_متغیر}} مشخص کنید؛ هنگام ساخت قرارداد پر می‌شوند." width="max-w-xl">
          {!edit ? (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="rounded-lg border border-ink-200 p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink-900 truncate">{t.title}</p>
                    <p className="text-[10.5px] text-ink-400 truncate">{t.type} · {faN(templateVars(t.body).length)} متغیر · در {faN(usage(t.id))} قرارداد · {t.updatedAt}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => setEdit(t)} aria-label="ویرایش قالب" className="w-7 h-7 rounded-md hover:bg-ink-100 text-ink-500 flex items-center justify-center"><Pencil size={13} /></button>
                    <button
                      type="button"
                      disabled={usage(t.id) > 0}
                      title={usage(t.id) ? "در قرارداد استفاده شده و قابل حذف نیست" : "حذف"}
                      onClick={() => confirm({ title: `حذف قالب «${t.title}»؟`, onConfirm: () => inn.commit("contracts", `قالب «${t.title}» را حذف کرد`, { id: t.id, title: t.title }, (s) => ({ ...s, contractTemplates: (s.contractTemplates ?? []).filter((x) => x.id !== t.id) })) })}
                      aria-label="حذف قالب"
                      className="w-7 h-7 rounded-md hover:bg-rose-50 text-ink-400 hover:text-rose-600 flex items-center justify-center disabled:opacity-30"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => setEdit({ id: uid("tpl"), title: "قالب جدید", type: "فناورانه", body: "ماده ۱ — طرفین: بنیاد و {{طرف_دوم}}.\nماده ۲ — مبلغ: {{مبلغ}}.", updatedAt: inn.today, updatedBy: inn.me })}>قالب جدید</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="عنوان"><input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className="input-field" /></Field>
                <Field label="نوع قرارداد">
                  <select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as ContractType })} className="input-field">
                    {(["فناورانه", "پژوهشی", "عمرانی", "خدماتی"] as const).map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="متن قالب" hint={`متغیرها: ${templateVars(edit.body).map((v) => `{{${v}}}`).join("، ") || "—"}`}>
                <textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} rows={9} className="input-field leading-6" />
              </Field>
              <div className="flex gap-2">
                <Button variant="primary" className="flex-1 justify-center" onClick={() => edit.title.trim() && save(edit)}>ذخیره‌ی قالب</Button>
                <Button variant="secondary" onClick={() => setEdit(null)}>بازگشت</Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

// ----------------------------------------------------------------- مالکیت فکری

const ownerLabel: Record<ContractIp["owner"], string> = { بنیاد: "بنیاد", "طرف دوم": "طرف دوم قرارداد", مشترک: "مشترک" };

export function IpSection({ c, canEdit, upd }: { c: Contract; canEdit: boolean; upd: Upd }) {
  const inn = useInnovation();
  const [form, setForm] = useState<{ owner: ContractIp["owner"]; ownerShare: string; usageRight: string; revenueShare: string; notes: string } | null>(null);
  const ip = c.ip;
  return (
    <Section
      title="مالکیت فکری"
      icon={<Copyright size={13} />}
      action={canEdit && <Button size="sm" variant="ghost" icon={<Pencil size={12} />} onClick={() => setForm({ owner: ip?.owner ?? "بنیاد", ownerShare: ip?.ownerShare !== undefined ? faN(ip.ownerShare) : "", usageRight: ip?.usageRight ?? "", revenueShare: ip ? faN(ip.revenueShare) : "", notes: ip?.notes ?? "" })}>{ip ? "ویرایش" : "تعیین"}</Button>}
    >
      {!ip ? (
        <p className="text-xs text-ink-400">بند مالکیت فکری تعیین نشده است.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-lg bg-ink-50 px-2.5 py-2"><p className="text-[10.5px] text-ink-400">مالک فکری</p><p className="text-xs font-medium text-ink-800">{ownerLabel[ip.owner]}{ip.owner === "مشترک" && ip.ownerShare !== undefined ? ` (سهم بنیاد ${faN(ip.ownerShare)}٪)` : ""}</p></div>
          <div className="rounded-lg bg-ink-50 px-2.5 py-2"><p className="text-[10.5px] text-ink-400">حق بهره‌برداری</p><p className="text-xs font-medium text-ink-800">{ip.usageRight || "—"}</p></div>
          <div className="rounded-lg bg-ink-50 px-2.5 py-2"><p className="text-[10.5px] text-ink-400">سهم درآمد بنیاد</p><p className="text-xs font-medium text-ink-800">{faN(ip.revenueShare)}٪</p></div>
          {ip.notes && <p className="sm:col-span-3 text-[11px] text-ink-500">{ip.notes}</p>}
        </div>
      )}
      {form && (
        <Modal open onClose={() => setForm(null)} title="بند مالکیت فکری" description={c.title}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="مالک فکری">
                <select value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value as ContractIp["owner"] })} className="input-field">
                  {(Object.keys(ownerLabel) as ContractIp["owner"][]).map((o) => <option key={o} value={o}>{ownerLabel[o]}</option>)}
                </select>
              </Field>
              {form.owner === "مشترک" && <Field label="سهم مالکیت بنیاد (٪)"><input value={form.ownerShare} onChange={(e) => setForm({ ...form, ownerShare: e.target.value })} inputMode="numeric" className="input-field" /></Field>}
            </div>
            <Field label="حق بهره‌برداری"><input value={form.usageRight} onChange={(e) => setForm({ ...form, usageRight: e.target.value })} placeholder="مثلاً انحصاری برای هلدینگ‌های بنیاد تا ۵ سال" className="input-field" /></Field>
            <Field label="سهم بنیاد از درآمد تجاری‌سازی (٪)"><input value={form.revenueShare} onChange={(e) => setForm({ ...form, revenueShare: e.target.value })} inputMode="numeric" className="input-field" /></Field>
            <Field label="توضیح"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" /></Field>
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => {
                const next: ContractIp = { owner: form.owner, ownerShare: form.owner === "مشترک" ? Math.min(100, parseNum(form.ownerShare)) : undefined, usageRight: form.usageRight.trim(), revenueShare: Math.min(100, parseNum(form.revenueShare)), notes: form.notes.trim() || undefined };
                upd("بند مالکیت فکری را ثبت کرد", (x) => ({ ...x, ip: next, history: [...x.history, { id: uid("h"), at: inn.stamp(), by: inn.me, text: `مالکیت فکری: ${ownerLabel[next.owner]} · سهم درآمد ${faN(next.revenueShare)}٪` }] }));
                setForm(null);
              }}
            >
              ثبت
            </Button>
          </div>
        </Modal>
      )}
    </Section>
  );
}

// ----------------------------------------------------------------- ضمانت‌نامه‌ها

const statusTone: Record<GuaranteeStatus, BadgeTone> = { معتبر: "success", آزادشده: "navy", "ضبط‌شده": "danger" };
const KINDS: GuaranteeKind[] = ["حسن انجام کار", "پیش‌پرداخت", "شرکت در مناقصه", "تعهد پرداخت"];

export function expiryBadge(today: string, g: ContractGuarantee) {
  const lv = guaranteeLevel(today, g);
  if (!lv) return null;
  if (lv.level === 0) return <Badge tone="danger" icon={<BellRing size={10} />}>منقضی ({faN(-lv.days)} روز)</Badge>;
  return <Badge tone={lv.level === 60 ? "warning" : "danger"} icon={<BellRing size={10} />}>{faN(lv.days)} روز تا انقضا</Badge>;
}

export function GuaranteesSection({ c, canEdit, upd, today }: { c: Contract; canEdit: boolean; upd: Upd; today: string }) {
  type GForm = { id?: string; kind: GuaranteeKind; bank: string; amount: string; number: string; issuedAt: string; expiry: string; status: GuaranteeStatus };
  const [form, setForm] = useState<GForm | null>(null);
  const list = c.guarantees ?? [];
  const save = () => {
    if (!form || !form.bank.trim() || !form.expiry) return;
    const g: ContractGuarantee = { id: form.id ?? uid("g"), kind: form.kind, bank: form.bank.trim(), amount: parseNum(form.amount), number: form.number.trim() || undefined, issuedAt: form.issuedAt || undefined, expiry: form.expiry, status: form.status };
    upd(form.id ? `ضمانت‌نامه‌ی «${g.kind}» را ویرایش کرد` : `ضمانت‌نامه‌ی «${g.kind}» (${g.bank}) را ثبت کرد`, (x) => ({ ...x, guarantees: form.id ? (x.guarantees ?? []).map((y) => (y.id === g.id ? g : y)) : [...(x.guarantees ?? []), g] }));
    setForm(null);
  };
  return (
    <Section title={`ضمانت‌نامه‌ها (${faN(list.length)})`} icon={<Landmark size={13} />} action={canEdit && <Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setForm({ kind: "حسن انجام کار", bank: "", amount: "", number: "", issuedAt: today, expiry: "", status: "معتبر" })}>افزودن</Button>}>
      {c.guarantee && c.guarantee !== "—" && <p className="text-[11px] text-ink-500 mb-1.5">شرط ضمانت در قرارداد: {c.guarantee}</p>}
      {list.length === 0 && <p className="text-xs text-ink-400">ضمانت‌نامه‌ای ثبت نشده است.</p>}
      <div className="space-y-1.5">
        {list.map((g) => (
          <div key={g.id} className="text-xs bg-ink-50 rounded-lg p-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-medium text-ink-800">{g.kind} — {g.bank}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {expiryBadge(today, g)}
                <Badge tone={statusTone[g.status]}>{g.status}</Badge>
                {canEdit && <button type="button" onClick={() => setForm({ id: g.id, kind: g.kind, bank: g.bank, amount: g.amount ? faN(g.amount) : "", number: g.number ?? "", issuedAt: g.issuedAt ?? "", expiry: g.expiry, status: g.status })} aria-label="ویرایش ضمانت‌نامه" className="text-ink-400 hover:text-brand-600"><Pencil size={12} /></button>}
              </div>
            </div>
            <p className="text-ink-400 mt-1">{rialShort(g.amount)}{g.number ? ` · ${g.number}` : ""}{g.issuedAt ? ` · صدور ${g.issuedAt}` : ""} · سررسید {g.expiry}</p>
          </div>
        ))}
      </div>
      {list.some((g) => guaranteeLevel(today, g)) && <p className="text-[10.5px] text-ink-400 mt-1.5">هشدار انقضا در ۶۰، ۳۰ و ۷ روز مانده به سررسید فعال می‌شود؛ برای تمدید با بانک صادرکننده هماهنگ کنید.</p>}
      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "ویرایش ضمانت‌نامه" : "ضمانت‌نامه‌ی جدید"} description={c.title}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="نوع"><select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as GuaranteeKind })} className="input-field">{KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
              <Field label="بانک صادرکننده" required><input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} className="input-field" placeholder="بانک ملت" /></Field>
              <Field label="مبلغ (ریال)"><input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} inputMode="numeric" className="input-field" /></Field>
              <Field label="شماره ضمانت‌نامه"><input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className="input-field" /></Field>
              <Field label="تاریخ صدور"><JalaliDatePicker value={form.issuedAt} onChange={(v) => setForm({ ...form, issuedAt: v })} /></Field>
              <Field label="سررسید" required><JalaliDatePicker value={form.expiry} onChange={(v) => setForm({ ...form, expiry: v })} /></Field>
            </div>
            <Field label="وضعیت"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as GuaranteeStatus })} className="input-field">{(["معتبر", "آزادشده", "ضبط‌شده"] as const).map((s) => <option key={s}>{s}</option>)}</select></Field>
            <div className="flex gap-2">
              <Button variant="primary" className="flex-1 justify-center" disabled={!form.bank.trim() || !form.expiry} onClick={save}>ثبت</Button>
              {form.id && <Button variant="ghost" onClick={() => { upd("ضمانت‌نامه را حذف کرد", (x) => ({ ...x, guarantees: (x.guarantees ?? []).filter((y) => y.id !== form.id) })); setForm(null); }}>حذف</Button>}
              <Button variant="secondary" onClick={() => setForm(null)}>انصراف</Button>
            </div>
          </div>
        </Modal>
      )}
    </Section>
  );
}

/** هشدار انقضای ضمانت‌نامه‌ها در فهرست قراردادها */
export function GuaranteeAlertsCard({ contracts, today, onOpen }: { contracts: Contract[]; today: string; onOpen: (id: string) => void }) {
  const alerts = guaranteeAlerts(contracts, today);
  if (!alerts.length) return null;
  return (
    <div className="card p-3.5 mb-4 border-rose-200 bg-rose-50/50">
      <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5 mb-2"><Landmark size={14} /> انقضای ضمانت‌نامه (۶۰، ۳۰ و ۷ روز)</p>
      <div className="space-y-1">
        {alerts.map(({ c, g, days, level }) => (
          <button key={g.id} type="button" onClick={() => onOpen(c.id)} className="w-full flex items-center justify-between gap-2 text-xs text-right hover:bg-rose-100/60 rounded-md px-2 py-1">
            <span className="min-w-0">
              <span className="block truncate text-ink-800">{c.title}</span>
              <span className="block truncate text-[10.5px] text-ink-500">{g.kind} · {g.bank} · {rialShort(g.amount)}</span>
            </span>
            <Badge tone={level === 60 ? "warning" : "danger"}>{level === 0 ? `${faN(-days)} روز گذشته` : `${faN(days)} روز مانده`}</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
