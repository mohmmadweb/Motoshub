import ModuleReportsButton from "../reports/ModuleReportsButton";
import RelatedProjects from "./innovation/RelatedProjects";
import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { FileSignature, Plus, CircleDollarSign, Hourglass, ShieldCheck, CheckCircle2, Circle, History, Landmark, PenLine, ArrowLeftRight, Clock3, BellRing, ChevronLeft, ChevronRight, CalendarClock, Gavel, Send, Megaphone, KeyRound, XCircle } from "lucide-react";
import { useTenancy } from "../context/TenancyContext";
import { useInnovation } from "../context/InnovationContext";
import { ScopeBadge } from "../components/ui/ScopeControl";
import type { Scoped } from "../data/tenancy";
import { techTransferContracts, pendingReviewItems, type TechTransferContract } from "../data/mockDaneshmand";
import Tabs from "../components/ui/Tabs";
import RowActions from "../components/ui/RowActions";
import { useConfirm } from "../components/ui/ConfirmProvider";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import DataTable, { type Column } from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import Drawer from "../components/ui/Drawer";
import EmptyState from "../components/ui/EmptyState";
import JalaliDatePicker from "../components/ui/JalaliDatePicker";
import { useToast } from "../components/ui/ToastProvider";
import { useTabParam } from "../lib/useTabParam";
import { diffDays, dayNum } from "../pm/jalali";
import type { Contract, ContractMethod, ContractStage, ContractType, ESignDoc, Tender, TenderStage } from "../innovation/types";
import { contractStages, tenderStages } from "../innovation/types";
import { faN, num, rialShort, uid } from "../innovation/util";
import { autoVars, deviatesFromTemplate, fillTemplate } from "../innovation/extras";
import { ContractTextSection, DeviationBadge, GuaranteeAlertsCard, GuaranteesSection, IpSection, TemplatesButton } from "./innovation/ContractTerms";
import { ActivityLogButton, Bar, DecisionModal, DecisionsOf, EntityLink, EntityPicker, Field, FilterChips, Info2, OutcomeModal, OutcomeSummary, Section, Stepper } from "./innovation/shared";

const stageTone: Record<ContractStage, BadgeTone> = {
  "پیش‌نویس": "neutral",
  مذاکره: "warning",
  "امضاشده": "brand",
  "در حال اجرا": "success",
  "تحویل‌شده": "navy",
  مختومه: "neutral",
};
const paymentTone: Record<string, BadgeTone> = { "پرداخت‌شده": "success", "در انتظار تأیید": "warning", آینده: "neutral" };

/** روزهای مانده تا پایان قرارداد (منفی = گذشته) */
function daysLeft(today: string, end: string): number | null {
  if (dayNum(end) === null) return null;
  return diffDays(today, end);
}

export default function Contracts() {
  const [tab, setTab] = useTabParam<"tech" | "transfer" | "esign" | "tender">("tech", ["tech", "transfer", "esign", "tender"]);
  const { filterScoped } = useTenancy();
  const inn = useInnovation();
  return (
    <div>
      <PageHeader
        title="مدیریت قراردادهای فناورانه"
        description="چرخه‌ی عمر قرارداد، تعهدات و پرداخت‌ها، هشدار تمدید، تبادل فناوری، امضای الکترونیک و مناقصه"
        icon={<FileSignature size={18} />}
        actions={
          <>
            <ModuleReportsButton module="innovation" />
            <ActivityLogButton module="contracts" />
          </>
        }
      />
      <Tabs
        tabs={[
          { id: "tech", label: "قراردادهای فناورانه", count: filterScoped(inn.contracts).length },
          { id: "transfer", label: "پورتفولیوی تبادل فناوری", count: techTransferContracts.length },
          { id: "esign", label: "گردش امضای الکترونیک", count: inn.esign.length },
          { id: "tender", label: "مناقصه و کمیسیون معاملات", count: inn.tenders.length },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "tech" && <TechContractsTab />}
      {tab === "transfer" && <TechTransferTab />}
      {tab === "esign" && <ESignTab />}
      {tab === "tender" && <TenderTab />}
    </div>
  );
}

// ===========================================================================
// قراردادها — چرخه‌ی عمر
// ===========================================================================
type CForm = { title: string; vendor: string; vendorEntityId?: string; type: ContractType; method: ContractMethod; value: string; startDate: string; endDate: string; guarantee: string; templateId?: string };
const emptyForm = (): CForm => ({ title: "", vendor: "", type: "فناورانه", method: "فراخوان عمومی", value: "", startDate: "", endDate: "", guarantee: "", templateId: "" });

function TechContractsTab() {
  const inn = useInnovation();
  const { filterScoped, defaultScopeForNew, hasPermission, canManageItem, actingUser, today } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [stageFilter, setStageFilter] = useState<ContractStage | "همه">("همه");
  const [form, setForm] = useState<CForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemScope, setItemScope] = useState<Scoped>({ scope: "سراسری" });
  const [err, setErr] = useState(false);
  // ?focus=<id> از پیوند پروژه همان پرونده را باز می‌کند
  const openId = params.get("open") ?? params.get("focus");
  const selected = openId ? inn.contracts.find((c) => c.id === openId) : undefined;
  const setOpen = (id: string | null) => {
    const n = new URLSearchParams(params);
    if (id) n.set("open", id);
    else n.delete("open");
    n.delete("focus");
    setParams(n, { replace: true });
  };

  const scoped = filterScoped(inn.contracts);
  const filtered = stageFilter === "همه" ? scoped : scoped.filter((c) => c.stage === stageFilter);
  const counts = Object.fromEntries([["همه", scoped.length], ...contractStages.map((s) => [s, scoped.filter((c) => c.stage === s).length])]);
  const alerts = scoped
    .filter((c) => c.stage !== "مختومه" && c.stage !== "پیش‌نویس")
    .map((c) => ({ c, d: daysLeft(today, c.endDate) }))
    .filter((x): x is { c: Contract; d: number } => x.d !== null && x.d <= 90)
    .sort((a, b) => a.d - b.d);
  const paidTotal = scoped.reduce((s, c) => s + c.payments.filter((p) => p.status === "پرداخت‌شده").reduce((a, p) => a + p.amount, 0), 0);

  const save = () => {
    if (!form) return;
    if (!form.title.trim() || !form.vendor.trim()) return setErr(true);
    const patch = { title: form.title.trim(), vendor: form.vendor.trim(), vendorEntityId: form.vendorEntityId, type: form.type, method: form.method, value: num(form.value), startDate: form.startDate || today, endDate: form.endDate || "نامشخص", guarantee: form.guarantee.trim() || "—" };
    if (editingId) {
      inn.commit("contracts", "مشخصات قرارداد را ویرایش کرد", { id: editingId, title: patch.title }, (s) => ({ ...s, contracts: s.contracts.map((c) => (c.id === editingId ? { ...c, ...patch, ...itemScope } : c)) }));
      notify(`قرارداد «${patch.title}» ویرایش شد.`);
    } else {
      const id = uid("ct");
      const tpl = form.templateId ? inn.contractTemplates?.find((t) => t.id === form.templateId) : undefined;
      const vars = tpl ? autoVars({ ...patch, owner: actingUser.name }) : undefined;
      const textPart = tpl && vars ? { templateId: tpl.id, templateVars: vars, body: fillTemplate(tpl.body, vars) } : {};
      const c: Contract = { id, ...patch, ...textPart, guarantees: [], stage: "پیش‌نویس", owner: actingUser.name, milestones: [], payments: [], history: [{ id: uid("h"), at: inn.stamp(), by: actingUser.name, text: "قرارداد به‌صورت پیش‌نویس ثبت شد", to: "پیش‌نویس" }], renewals: [], createdAt: today, ...itemScope, authorId: actingUser.id };
      inn.commit("contracts", "قرارداد جدید ثبت کرد", { id, title: c.title }, (s) => ({ ...s, contracts: [c, ...s.contracts] }));
      notify(`قرارداد «${c.title}» در مرحله‌ی «پیش‌نویس» ثبت شد.`);
      setOpen(id);
    }
    setForm(null);
    setEditingId(null);
    setErr(false);
  };

  const columns: Column<Contract>[] = [
    { key: "title", label: "عنوان قرارداد", render: (c) => <span className="font-medium text-ink-900">{c.title}{deviatesFromTemplate(c, inn.contractTemplates) && <span className="inline-flex align-middle mr-1.5"><DeviationBadge c={c} /></span>}</span> },
    { key: "vendor", label: "طرف قرارداد", render: (c) => <EntityLink id={c.vendorEntityId} name={c.vendor} /> },
    { key: "stage", label: "مرحله", render: (c) => <Badge tone={stageTone[c.stage]}>{c.stage}</Badge> },
    { key: "value", label: "ارزش", render: (c) => (c.value ? rialShort(c.value) : "—") },
    {
      key: "endDate",
      label: "پایان",
      render: (c) => {
        const d = c.stage === "مختومه" ? null : daysLeft(today, c.endDate);
        return <span className={d !== null && d <= 30 ? "text-rose-600 font-medium" : d !== null && d <= 90 ? "text-amber-600" : ""}>{c.endDate}</span>;
      },
    },
    { key: "pay", label: "پرداخت", render: (c) => { const paid = c.payments.filter((p) => p.status === "پرداخت‌شده").reduce((a, p) => a + p.amount, 0); return <div className="min-w-[70px]"><Bar value={paid} max={c.value || 1} tone="emerald" /><span className="text-[10px] text-ink-400">{faN(c.value ? Math.round((paid / c.value) * 100) : 0)}٪</span></div>; } },
    { key: "scopeOwner", label: "دامنه", render: (c) => <ScopeBadge item={c} /> },
    {
      key: "actions",
      label: "",
      render: (c) => (
        <RowActions
          onEdit={canManageItem(c, "contracts.edit") ? () => { setEditingId(c.id); setItemScope({ scope: c.scope, holdingId: c.holdingId, companyId: c.companyId }); setForm({ title: c.title, vendor: c.vendor, vendorEntityId: c.vendorEntityId, type: c.type, method: c.method, value: c.value ? faN(c.value) : "", startDate: c.startDate, endDate: c.endDate === "نامشخص" ? "" : c.endDate, guarantee: c.guarantee === "—" ? "" : c.guarantee }); } : undefined}
          onDelete={canManageItem(c, "contracts.delete") ? () => confirm({ title: `حذف قرارداد «${c.title}»؟`, message: "پرونده و تاریخچه‌ی قرارداد حذف می‌شود.", onConfirm: () => { inn.commit("contracts", "قرارداد را حذف کرد", { id: c.id, title: c.title }, (s) => ({ ...s, contracts: s.contracts.filter((x) => x.id !== c.id) })); notify("قرارداد حذف شد.", "info"); } }) : undefined}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="کل قراردادها" value={faN(scoped.length)} tone="brand" icon={<FileSignature size={16} />} />
        <StatCard label="در حال اجرا" value={faN(scoped.filter((c) => c.stage === "در حال اجرا").length)} tone="success" icon={<CircleDollarSign size={16} />} />
        <StatCard label="پیش‌نویس / مذاکره" value={faN(scoped.filter((c) => c.stage === "پیش‌نویس" || c.stage === "مذاکره").length)} tone="warning" icon={<Hourglass size={16} />} />
        <StatCard label="پرداخت‌شده" value={rialShort(paidTotal)} icon={<ShieldCheck size={16} />} />
      </div>

      <GuaranteeAlertsCard contracts={scoped} today={today} onOpen={setOpen} />

      {alerts.length > 0 && (
        <div className="card p-3.5 mb-4 border-amber-200 bg-amber-50/60">
          <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-2"><BellRing size={14} /> هشدار تمدید و انقضا (۹۰، ۶۰ و ۳۰ روز تا پایان)</p>
          <div className="space-y-1.5">
            {alerts.map(({ c, d }) => (
              <button key={c.id} onClick={() => setOpen(c.id)} className="w-full flex items-center justify-between gap-2 text-xs text-right hover:bg-amber-100/60 rounded-md px-2 py-1">
                <span className="truncate text-ink-800">{c.title}</span>
                <Badge tone={d < 0 ? "danger" : d <= 30 ? "danger" : d <= 60 ? "warning" : "neutral"}>{d < 0 ? `${faN(-d)} روز گذشته` : `${faN(d)} روز مانده`}</Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <FilterChips items={contractStages} value={stageFilter} onChange={setStageFilter} counts={counts} />
        <div className="flex items-center gap-2 flex-wrap">
          {(hasPermission("contracts.create") || hasPermission("contracts.edit")) && <TemplatesButton />}
          {hasPermission("contracts.create") && <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { setItemScope(defaultScopeForNew()); setEditingId(null); setForm(emptyForm()); }}>ثبت قرارداد جدید</Button>}
        </div>
      </div>

      <DataTable columns={columns} rows={filtered} searchKeys={["title", "vendor"]} searchPlaceholder="جستجو در عنوان یا طرف قرارداد…" onRowClick={(c) => setOpen(c.id)} />

      {form && (
        <Modal open onClose={() => setForm(null)} title={editingId ? "ویرایش قرارداد" : "ثبت قرارداد جدید"} description={editingId ? undefined : "قرارداد در مرحله‌ی «پیش‌نویس» ثبت می‌شود و سپس مرحله‌به‌مرحله پیش می‌رود."} width="max-w-xl">
          <div className="space-y-3">
            <Field label="عنوان قرارداد" required><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`input-field ${err && !form.title.trim() ? "input-error" : ""}`} /></Field>
            <Field label="طرف قرارداد / فناور" required><EntityPicker kind="company" name={form.vendor} invalid={err && !form.vendor.trim()} onChange={(n, id) => setForm({ ...form, vendor: n, vendorEntityId: id })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="نوع"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContractType })} className="input-field">{(["فناورانه", "پژوهشی", "عمرانی", "خدماتی"] as const).map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label="روش انتخاب"><select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as ContractMethod })} className="input-field">{(["فراخوان عمومی", "استعلام محدود", "ترک تشریفات", "RFP", "مناقصه"] as const).map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label="ارزش (ریال)"><input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="input-field" /></Field>
              <Field label="ضمانت‌نامه"><input value={form.guarantee} onChange={(e) => setForm({ ...form, guarantee: e.target.value })} className="input-field" placeholder="ضمانت‌نامه بانکی ۱۰٪" /></Field>
              <Field label="شروع"><JalaliDatePicker value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} /></Field>
              <Field label="پایان"><JalaliDatePicker value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} /></Field>
            </div>
            {!editingId && (inn.contractTemplates ?? []).length > 0 && (
              <Field label="متن از قالب استاندارد" hint="متغیرها ({{طرف_دوم}}، {{مبلغ}} …) از همین فرم پر می‌شوند؛ بعداً در پرونده قابل ویرایش است">
                <select value={form.templateId ?? ""} onChange={(e) => setForm({ ...form, templateId: e.target.value })} className="input-field">
                  <option value="">بدون قالب</option>
                  {(inn.contractTemplates ?? []).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </Field>
            )}
            <div className="flex gap-2"><Button variant="primary" className="flex-1 justify-center" onClick={save}>{editingId ? "ذخیره تغییرات" : "ثبت قرارداد"}</Button><Button variant="secondary" onClick={() => setForm(null)}>انصراف</Button></div>
          </div>
        </Modal>
      )}

      <Drawer open={!!selected} onClose={() => setOpen(null)} title="پرونده قرارداد" width="max-w-xl">
        {selected && (
          <>
            <ContractFile c={selected} />
            <RelatedProjects field="contractId" id={selected.id} />
          </>
        )}
      </Drawer>
    </div>
  );
}

function ContractFile({ c }: { c: Contract }) {
  const inn = useInnovation();
  const { hasPermission, canManageItem, actingUser, today } = useTenancy();
  const { notify } = useToast();
  const [move, setMove] = useState<ContractStage | null>(null);
  const [note, setNote] = useState("");
  const [closing, setClosing] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renew, setRenew] = useState({ to: "", reason: "" });
  const [msForm, setMsForm] = useState<{ title: string; due: string } | null>(null);
  const [payForm, setPayForm] = useState<{ title: string; amount: string; due: string; milestoneId: string } | null>(null);
  const canStage = hasPermission("contracts.stage");
  const canEdit = canManageItem(c, "contracts.edit") || hasPermission("contracts.edit");
  const idx = contractStages.indexOf(c.stage);
  const next = contractStages[idx + 1];
  const prev = contractStages[idx - 1];
  const paid = c.payments.filter((p) => p.status === "پرداخت‌شده").reduce((a, p) => a + p.amount, 0);
  const d = c.stage === "مختومه" ? null : daysLeft(today, c.endDate);
  const opp = c.opportunityId ? inn.rfps.find((r) => r.id === c.opportunityId) ?? inn.calls.find((x) => x.id === c.opportunityId) : undefined;
  const upd = (action: string, fn: (x: Contract) => Contract) => inn.commit("contracts", action, { id: c.id, title: c.title }, (s) => ({ ...s, contracts: s.contracts.map((x) => (x.id === c.id ? fn(x) : x)) }));
  const ev = (text: string, from?: ContractStage, to?: ContractStage) => ({ id: uid("h"), at: inn.stamp(), by: actingUser.name, text, from, to });

  const doMove = () => {
    if (!move) return;
    if (move === "مختومه") {
      setMove(null);
      setClosing(true);
      return;
    }
    upd(`قرارداد را از «${c.stage}» به «${move}» برد`, (x) => ({ ...x, stage: move, history: [...x.history, ev(note.trim() || `انتقال به مرحله‌ی «${move}»`, x.stage, move)] }));
    notify(`قرارداد به مرحله‌ی «${move}» رفت.`);
    setMove(null);
    setNote("");
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-ink-900 leading-6">{c.title}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge tone={stageTone[c.stage]}>{c.stage}</Badge>
          <Badge tone="navy">{c.type}</Badge>
          <Badge tone="neutral">{c.method}</Badge>
          {d !== null && d <= 90 && <Badge tone={d <= 30 ? "danger" : "warning"} icon={<CalendarClock size={10} />}>{d < 0 ? "منقضی" : `${faN(d)} روز تا پایان`}</Badge>}
          <DeviationBadge c={c} />
        </div>
      </div>
      <Stepper steps={contractStages} current={c.stage} />
      {canStage && (
        <div className="flex gap-1.5 flex-wrap">
          {next && <Button size="sm" variant="primary" icon={<ChevronLeft size={13} />} onClick={() => setMove(next)}>انتقال به «{next}»</Button>}
          {prev && c.stage !== "مختومه" && <Button size="sm" variant="ghost" icon={<ChevronRight size={13} />} onClick={() => setMove(prev)}>بازگشت به «{prev}»</Button>}
          {d !== null && d <= 90 && canEdit && <Button size="sm" variant="secondary" icon={<CalendarClock size={13} />} onClick={() => { setRenew({ to: "", reason: "" }); setRenewOpen(true); }}>تمدید</Button>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Info2 label="طرف قرارداد" value={<EntityLink id={c.vendorEntityId} name={c.vendor} />} />
        <Info2 label="ارزش" value={c.value ? rialShort(c.value) : "—"} />
        <Info2 label="شروع / پایان" value={`${c.startDate} ← ${c.endDate}`} />
        <Info2 label="مسئول پیگیری" value={c.owner} />
        {!(c.guarantees ?? []).length && <div className="col-span-2"><Info2 label="ضمانت" value={<span className="flex items-center gap-1"><Landmark size={12} /> {c.guarantee}</span>} /></div>}
        {opp && <div className="col-span-2"><Info2 label="فرصت مبدأ" value={<Link className="text-brand-700 hover:underline" to={"stage" in opp && "bids" in opp ? "/dashboard/research?tab=rfp" : `/dashboard/research?open=${opp.id}`}>{opp.title}</Link>} /></div>}
      </div>

      <Section title={`تعهدات و اقلام تحویل (${faN(c.milestones.filter((m) => m.done).length)}/${faN(c.milestones.length)})`} action={canEdit && <Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setMsForm({ title: "", due: "" })}>افزودن</Button>}>
        {c.milestones.length === 0 && <p className="text-xs text-ink-400">تعهدی تعریف نشده است.</p>}
        <div className="space-y-1">
          {c.milestones.map((m) => {
            const late = !m.done && dayNum(m.due) !== null && diffDays(today, m.due) < 0;
            return (
              <button key={m.id} disabled={!canEdit} onClick={() => upd(m.done ? `تعهد «${m.title}» را باز کرد` : `تعهد «${m.title}» را انجام‌شده ثبت کرد`, (x) => ({ ...x, milestones: x.milestones.map((y) => (y.id === m.id ? { ...y, done: !y.done, doneAt: !y.done ? today : undefined } : y)), history: [...x.history, ev(`${m.done ? "بازگشایی" : "تحویل"} تعهد «${m.title}»`)] }))} className="w-full flex items-center gap-2 text-right text-xs p-2 rounded-lg hover:bg-ink-50">
                {m.done ? <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> : <Circle size={15} className="text-ink-300 shrink-0" />}
                <span className={`flex-1 ${m.done ? "line-through text-ink-400" : "text-ink-800"}`}>{m.title}</span>
                <span className={`shrink-0 ${late ? "text-rose-600" : "text-ink-400"}`}>{m.due}{late ? " · معوق" : ""}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="پرداخت‌ها" icon={<CircleDollarSign size={13} />} action={canEdit && <Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setPayForm({ title: "", amount: "", due: "", milestoneId: "" })}>افزودن</Button>}>
        <div className="flex items-center gap-2 text-[11px] text-ink-500 mb-2"><span>{rialShort(paid)} از {rialShort(c.value)}</span><div className="flex-1"><Bar value={paid} max={c.value || 1} tone="emerald" /></div></div>
        {c.payments.length === 0 && <p className="text-xs text-ink-400">پرداختی تعریف نشده است.</p>}
        <div className="space-y-1.5">
          {c.payments.map((p) => {
            const ms = c.milestones.find((m) => m.id === p.milestoneId);
            const nextStatus = p.status === "آینده" ? "در انتظار تأیید" : p.status === "در انتظار تأیید" ? "پرداخت‌شده" : null;
            const blocked = nextStatus === "پرداخت‌شده" && ms && !ms.done;
            return (
              <div key={p.id} className="flex items-center justify-between gap-2 text-xs bg-ink-50 rounded-lg p-2.5">
                <div className="min-w-0">
                  <p className="font-medium text-ink-800 truncate">{p.title}</p>
                  <p className="text-ink-400 mt-0.5">{rialShort(p.amount)} · سررسید {p.due}{ms ? ` · مشروط به «${ms.title}»` : ""}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge tone={paymentTone[p.status]}>{p.status}</Badge>
                  {canEdit && nextStatus && (
                    <Button size="sm" variant="ghost" disabled={!!blocked} title={blocked ? "تعهد مرتبط هنوز تحویل نشده" : ""} onClick={() => upd(`پرداخت «${p.title}» را «${nextStatus}» کرد`, (x) => ({ ...x, payments: x.payments.map((y) => (y.id === p.id ? { ...y, status: nextStatus } : y)), history: [...x.history, ev(`پرداخت «${p.title}»: ${nextStatus}`)] }))}>
                      {nextStatus === "پرداخت‌شده" ? "پرداخت" : "درخواست"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <GuaranteesSection c={c} canEdit={canEdit} upd={upd} today={today} />
      <ContractTextSection c={c} canEdit={canEdit} upd={upd} />
      <IpSection c={c} canEdit={canEdit} upd={upd} />

      {c.renewals.length > 0 && (
        <Section title="تمدیدها">
          {c.renewals.map((r, i) => <p key={i} className="text-xs text-ink-600">{r.from} ← {r.to} · {r.reason} <span className="text-ink-400">({r.by}، {r.at})</span></p>)}
        </Section>
      )}
      <DecisionsOf subjectId={c.id} />
      <OutcomeSummary module="contracts" subjectId={c.id} />

      <Section title="تاریخچه‌ی قرارداد" icon={<History size={13} />}>
        <div>
          {[...c.history].reverse().map((h, i, arr) => (
            <div key={h.id} className="flex gap-3">
              <div className="flex flex-col items-center"><span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />{i < arr.length - 1 && <span className="w-px flex-1 bg-ink-200" />}</div>
              <div className="pb-3">
                <p className="text-xs text-ink-800">{h.text}{h.from && h.to ? <span className="text-ink-400"> ({h.from} ← {h.to})</span> : null}</p>
                <p className="text-[10.5px] text-ink-400 mt-0.5">{h.by} · {h.at}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {move && (
        <Modal open onClose={() => setMove(null)} title={`انتقال به مرحله‌ی «${move}»`} description={c.title}>
          <div className="space-y-3">
            {move === "در حال اجرا" && c.stage !== "امضاشده" && <p className="text-xs text-amber-700">اجرا فقط پس از امضا ممکن است.</p>}
            {move === "مختومه" && <p className="text-xs text-ink-500">برای اختتام، فرم نتیجه‌ی واقعی (تحقق اهداف، تحویل، زمان، بودجه) باید ثبت شود.</p>}
            <Field label="توضیح (در تاریخچه ثبت می‌شود)"><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="input-field" /></Field>
            <div className="flex gap-2"><Button variant="primary" className="flex-1 justify-center" disabled={move === "در حال اجرا" && c.stage !== "امضاشده"} onClick={doMove}>تأیید انتقال</Button><Button variant="secondary" onClick={() => setMove(null)}>انصراف</Button></div>
          </div>
        </Modal>
      )}
      {closing && (
        <OutcomeModal
          open
          onClose={() => setClosing(false)}
          module="contracts"
          subjectId={c.id}
          subjectTitle={c.title}
          entityIds={[c.vendorEntityId ?? inn.resolveEntity(undefined, c.vendor)?.id ?? ""].filter(Boolean)}
          title="اختتام قرارداد و ثبت نتیجه‌ی واقعی"
          onSaved={() => upd("قرارداد را مختومه کرد", (x) => ({ ...x, stage: "مختومه", history: [...x.history, ev("اختتام و ثبت نتیجه‌ی واقعی", x.stage, "مختومه")] }))}
        />
      )}
      {renewOpen && (
        <Modal open onClose={() => setRenewOpen(false)} title="تمدید قرارداد" description={`پایان فعلی: ${c.endDate}`}>
          <div className="space-y-3">
            <Field label="تاریخ پایان جدید" required><JalaliDatePicker value={renew.to} onChange={(v) => setRenew({ ...renew, to: v })} /></Field>
            <Field label="دلیل / شماره متمم" required><input value={renew.reason} onChange={(e) => setRenew({ ...renew, reason: e.target.value })} className="input-field" /></Field>
            <Button variant="primary" className="w-full justify-center" onClick={() => {
              if (!renew.to || !renew.reason.trim()) return;
              upd(`قرارداد را تا ${renew.to} تمدید کرد`, (x) => ({ ...x, endDate: renew.to, renewals: [...x.renewals, { at: today, by: actingUser.name, from: x.endDate, to: renew.to, reason: renew.reason.trim() }], history: [...x.history, ev(`تمدید از ${x.endDate} تا ${renew.to} — ${renew.reason.trim()}`)] }));
              setRenewOpen(false);
              notify("تمدید ثبت شد.");
            }}>ثبت تمدید</Button>
          </div>
        </Modal>
      )}
      {msForm && (
        <Modal open onClose={() => setMsForm(null)} title="تعهد / قلم تحویل جدید">
          <div className="space-y-3">
            <Field label="عنوان" required><input value={msForm.title} onChange={(e) => setMsForm({ ...msForm, title: e.target.value })} className="input-field" /></Field>
            <Field label="سررسید"><JalaliDatePicker value={msForm.due} onChange={(v) => setMsForm({ ...msForm, due: v })} /></Field>
            <Button variant="primary" className="w-full justify-center" onClick={() => { if (!msForm.title.trim()) return; upd(`تعهد «${msForm.title}» را افزود`, (x) => ({ ...x, milestones: [...x.milestones, { id: uid("m"), title: msForm.title.trim(), due: msForm.due || "نامشخص", done: false }] })); setMsForm(null); }}>افزودن</Button>
          </div>
        </Modal>
      )}
      {payForm && (
        <Modal open onClose={() => setPayForm(null)} title="پرداخت جدید">
          <div className="space-y-3">
            <Field label="عنوان" required><input value={payForm.title} onChange={(e) => setPayForm({ ...payForm, title: e.target.value })} className="input-field" placeholder="صورت‌وضعیت ۲" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="مبلغ (ریال)"><input value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="input-field" /></Field>
              <Field label="سررسید"><JalaliDatePicker value={payForm.due} onChange={(v) => setPayForm({ ...payForm, due: v })} /></Field>
            </div>
            <Field label="مشروط به تحویل تعهد"><select value={payForm.milestoneId} onChange={(e) => setPayForm({ ...payForm, milestoneId: e.target.value })} className="input-field"><option value="">—</option>{c.milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></Field>
            <Button variant="primary" className="w-full justify-center" onClick={() => { if (!payForm.title.trim()) return; upd(`پرداخت «${payForm.title}» را تعریف کرد`, (x) => ({ ...x, payments: [...x.payments, { id: uid("p"), title: payForm.title.trim(), amount: num(payForm.amount), due: payForm.due || "نامشخص", status: "آینده", milestoneId: payForm.milestoneId || undefined }] })); setPayForm(null); }}>افزودن</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===========================================================================
// مناقصه، مزایده، ترک تشریفات و کمیسیون معاملات
// ===========================================================================
const tenderTone: Record<TenderStage, BadgeTone> = { "انتشار آگهی": "neutral", "دریافت پاکات": "warning", "کمیسیون معاملات": "brand", "ابلاغ برنده": "success", "عقد قرارداد": "navy" };

function TenderTab() {
  const inn = useInnovation();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<{ title: string; method: Tender["method"]; estimate: string; board: string } | null>(null);
  const selected = open ? inn.tenders.find((t) => t.id === open) : undefined;
  const create = () => {
    if (!form || !form.title.trim()) return;
    if (form.method === "ترک تشریفات" && !form.board.trim()) return notify("ترک تشریفات فقط با مصوبه‌ی هیئت مدیره ممکن است.", "warning");
    const id = uid("tn");
    const t: Tender = { id, title: form.title.trim(), method: form.method, stage: "انتشار آگهی", estimate: num(form.estimate), bids: [], boardApproval: form.board.trim() || undefined, createdAt: inn.today };
    inn.commit("contracts", "آگهی مناقصه/مزایده منتشر کرد", { id, title: t.title }, (s) => ({ ...s, tenders: [t, ...s.tenders] }));
    notify("آگهی ثبت و منتشر شد.");
    setForm(null);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-ink-500 leading-6 max-w-2xl">انتشار آگهی ← دریافت پاکات (الف: تضمین، ب: فنی، ج: قیمت) ← بازگشایی در کمیسیون با صورت‌جلسه ← ابلاغ برنده (با ثبت تصمیم) ← عقد قرارداد. ترک تشریفات فقط با مصوبه‌ی هیئت مدیره.</p>
        {hasPermission("contracts.create") && <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setForm({ title: "", method: "مناقصه عمومی", estimate: "", board: "" })}>آگهی جدید</Button>}
      </div>
      <div className="card divide-y divide-ink-100">
        {inn.tenders.length === 0 && <EmptyState title="آگهی ثبت نشده" />}
        {inn.tenders.map((t) => (
          <button key={t.id} onClick={() => setOpen(t.id)} className="w-full text-right p-3.5 flex items-center justify-between gap-3 flex-wrap hover:bg-ink-50/60">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5"><Megaphone size={13} className="text-brand-600" />{t.title}</p>
              <p className="text-[11px] text-ink-400 mt-0.5">{t.method} · {faN(t.bids.length)} پاکت{t.sessionDate ? ` · کمیسیون ${t.sessionDate}` : ""}{t.winnerBidId ? ` · برنده: ${t.bids.find((b) => b.id === t.winnerBidId)?.name}` : ""}</p>
            </div>
            <Badge tone={tenderTone[t.stage]}>{t.stage}</Badge>
          </button>
        ))}
      </div>
      {form && (
        <Modal open onClose={() => setForm(null)} title="آگهی جدید">
          <div className="space-y-3">
            <Field label="موضوع" required><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="روش"><select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as Tender["method"] })} className="input-field">{(["مناقصه عمومی", "مناقصه محدود", "مزایده", "ترک تشریفات"] as const).map((m) => <option key={m}>{m}</option>)}</select></Field>
              <Field label="برآورد (ریال)"><input value={form.estimate} onChange={(e) => setForm({ ...form, estimate: e.target.value })} className="input-field" /></Field>
            </div>
            {form.method === "ترک تشریفات" && <Field label="شماره/تاریخ مصوبه هیئت مدیره" required><input value={form.board} onChange={(e) => setForm({ ...form, board: e.target.value })} className="input-field" /></Field>}
            <Button variant="primary" className="w-full justify-center" icon={<Send size={14} />} onClick={create}>انتشار آگهی</Button>
          </div>
        </Modal>
      )}
      <Drawer open={!!selected} onClose={() => setOpen(null)} title="پرونده مناقصه" width="max-w-xl">
        {selected && <TenderFile t={selected} />}
      </Drawer>
    </div>
  );
}

function TenderFile({ t }: { t: Tender }) {
  const inn = useInnovation();
  const { hasPermission, actingUser } = useTenancy();
  const { notify } = useToast();
  const [bid, setBid] = useState<{ name: string; entityId?: string; price: string; guaranteeOk: boolean } | null>(null);
  const [session, setSession] = useState<{ date: string; minutes: string; scores: Record<string, string> } | null>(null);
  const [deciding, setDeciding] = useState(false);
  const canEdit = hasPermission("contracts.edit") || hasPermission("contracts.create");
  const upd = (action: string, fn: (x: Tender) => Tender) => inn.commit("contracts", action, { id: t.id, title: t.title }, (s) => ({ ...s, tenders: s.tenders.map((x) => (x.id === t.id ? fn(x) : x)) }));
  const eligible = t.bids.filter((b) => b.guaranteeOk && (b.techScore ?? 0) >= 60 && b.price);
  const ranked = [...eligible].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  const winner = t.bids.find((b) => b.id === t.winnerBidId);
  const contract = t.contractId ? inn.contracts.find((c) => c.id === t.contractId) : undefined;

  const makeContract = () => {
    if (!winner) return;
    const id = uid("ct");
    inn.commit("contracts", "قرارداد را از برنده‌ی مناقصه ساخت", { id, title: t.title }, (s) => ({
      ...s,
      contracts: [{ id, title: t.title, vendor: winner.name, vendorEntityId: winner.entityId, type: "خدماتی", method: "مناقصه", stage: "پیش‌نویس", value: winner.price ?? t.estimate, startDate: inn.today, endDate: "نامشخص", owner: actingUser.name, guarantee: "ضمانت‌نامه شرکت در مناقصه", milestones: [], payments: [], history: [{ id: uid("h"), at: inn.stamp(), by: actingUser.name, text: "پیش‌نویس از برنده‌ی مناقصه ساخته شد", to: "پیش‌نویس" }], renewals: [], createdAt: inn.today, scope: "سراسری", authorId: actingUser.id }, ...s.contracts],
      tenders: s.tenders.map((x) => (x.id === t.id ? { ...x, stage: "عقد قرارداد", contractId: id } : x)),
    }));
    notify("پیش‌نویس قرارداد ساخته شد.", "success");
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-ink-900 leading-6">{t.title}</p>
        <p className="text-[11px] text-ink-400 mt-1">{t.method}{t.estimate ? ` · برآورد ${rialShort(t.estimate)}` : ""}{t.boardApproval ? ` · ${t.boardApproval}` : ""}</p>
      </div>
      <Stepper steps={tenderStages} current={t.stage} />
      {canEdit && (
        <div className="flex gap-1.5 flex-wrap">
          {t.stage === "انتشار آگهی" && <Button size="sm" variant="primary" onClick={() => upd("دریافت پاکات را آغاز کرد", (x) => ({ ...x, stage: "دریافت پاکات" }))}>شروع دریافت پاکات</Button>}
          {t.stage === "دریافت پاکات" && (
            <>
              <Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={() => setBid({ name: "", price: "", guaranteeOk: true })}>ثبت پاکت</Button>
              {t.bids.length > 0 && <Button size="sm" variant="primary" onClick={() => setSession({ date: inn.today, minutes: "", scores: {} })}>جلسه‌ی کمیسیون و بازگشایی</Button>}
            </>
          )}
          {t.stage === "کمیسیون معاملات" && <Button size="sm" variant="primary" icon={<Gavel size={12} />} onClick={() => setDeciding(true)}>ابلاغ برنده</Button>}
          {t.stage === "ابلاغ برنده" && !t.contractId && hasPermission("contracts.create") && <Button size="sm" variant="primary" icon={<FileSignature size={12} />} onClick={makeContract}>عقد قرارداد</Button>}
        </div>
      )}
      <Section title={`پاکات (${faN(t.bids.length)})`}>
        {t.bids.length === 0 ? <p className="text-xs text-ink-400">پاکتی دریافت نشده است.</p> : (
          <div className="space-y-1.5">
            {t.bids.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 text-xs bg-ink-50 rounded-lg p-2.5">
                <span className="font-medium text-ink-800 min-w-0 truncate"><EntityLink id={b.entityId} name={b.name} /></span>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <Badge tone={b.guaranteeOk ? "success" : "danger"}>الف: {b.guaranteeOk ? "معتبر" : "نامعتبر"}</Badge>
                  <Badge tone="neutral">ب: {b.techScore !== undefined ? faN(b.techScore) : "—"}</Badge>
                  <Badge tone={t.stage === "دریافت پاکات" ? "neutral" : "brand"}>ج: {t.stage === "دریافت پاکات" || t.stage === "انتشار آگهی" ? "بسته" : b.price ? rialShort(b.price) : "—"}</Badge>
                  {b.id === t.winnerBidId && <Badge tone="success">برنده</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
      {t.minutes && <Section title="صورت‌جلسه"><p className="text-xs text-ink-600 leading-6">{t.minutes}</p></Section>}
      {contract && <Section title="قرارداد"><Link to={`/dashboard/contracts?open=${contract.id}`} className="text-xs text-brand-700 hover:underline">{contract.title} — {contract.stage}</Link></Section>}
      <DecisionsOf subjectId={t.id} />

      {bid && (
        <Modal open onClose={() => setBid(null)} title="ثبت پاکت">
          <div className="space-y-3">
            <Field label="شرکت‌کننده" required><EntityPicker kind="company" name={bid.name} onChange={(n, id) => setBid({ ...bid, name: n, entityId: id })} /></Field>
            <Field label="پیشنهاد قیمت (پاکت ج)"><input value={bid.price} onChange={(e) => setBid({ ...bid, price: e.target.value })} className="input-field" /></Field>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={bid.guaranteeOk} onChange={(e) => setBid({ ...bid, guaranteeOk: e.target.checked })} /> ضمانت‌نامه‌ی شرکت در مناقصه (پاکت الف) معتبر است</label>
            <Button variant="primary" className="w-full justify-center" onClick={() => { if (!bid.name.trim()) return; upd(`پاکت «${bid.name}» را ثبت کرد`, (x) => ({ ...x, bids: [...x.bids, { id: uid("b"), name: bid.name.trim(), entityId: bid.entityId, price: num(bid.price) || undefined, guaranteeOk: bid.guaranteeOk }] })); setBid(null); }}>ثبت</Button>
          </div>
        </Modal>
      )}
      {session && (
        <Modal open onClose={() => setSession(null)} title="جلسه‌ی کمیسیون معاملات" description="بازگشایی ترتیبی پاکات و ثبت امتیاز فنی (پاکت ب)">
          <div className="space-y-3">
            <Field label="تاریخ جلسه"><JalaliDatePicker value={session.date} onChange={(v) => setSession({ ...session, date: v })} /></Field>
            {t.bids.map((b) => (
              <div key={b.id} className="flex items-center gap-2 text-xs"><span className="flex-1">{b.name}</span><input defaultValue={b.techScore !== undefined ? faN(b.techScore) : ""} onChange={(e) => setSession({ ...session, scores: { ...session.scores, [b.id]: e.target.value } })} className="input-field w-24 text-center" placeholder="امتیاز فنی" /></div>
            ))}
            <Field label="صورت‌جلسه"><textarea value={session.minutes} onChange={(e) => setSession({ ...session, minutes: e.target.value })} rows={2} className="input-field" /></Field>
            <Button variant="primary" className="w-full justify-center" onClick={() => {
              upd("پاکات را در کمیسیون بازگشایی کرد", (x) => ({ ...x, stage: "کمیسیون معاملات", sessionDate: session.date, minutes: session.minutes.trim() || `بازگشایی پاکات الف، ب و ج در جلسه‌ی ${session.date}`, bids: x.bids.map((b) => (session.scores[b.id] ? { ...b, techScore: Math.min(100, num(session.scores[b.id])) } : b)) }));
              setSession(null);
            }}>ثبت صورت‌جلسه</Button>
          </div>
        </Modal>
      )}
      <DecisionModal
        open={deciding}
        onClose={() => setDeciding(false)}
        module="contracts"
        subjectId={t.id}
        subjectTitle={t.title}
        question="ابلاغ برنده‌ی مناقصه"
        committee="کمیسیون معاملات"
        options={ranked.map((b, i) => ({ id: b.id, label: `${b.name} — ${rialShort(b.price ?? 0)}`, score: b.techScore, rank: i + 1, entityId: b.entityId }))}
        onDecided={(o) => upd(`برنده را «${t.bids.find((b) => b.id === o.id)?.name}» ابلاغ کرد`, (x) => ({ ...x, stage: "ابلاغ برنده", winnerBidId: o.id }))}
      />
      {t.stage === "کمیسیون معاملات" && ranked.length === 0 && <p className="text-[11px] text-amber-700">هیچ پاکتی شرایط (ضمانت معتبر + امتیاز فنی ≥ ۶۰ + قیمت) را ندارد.</p>}
      <p className="text-[10.5px] text-ink-400">رتبه‌بندی ثبت تصمیم: کمترین قیمت میان پاکات واجد شرایط (ضمانت معتبر و امتیاز فنی حداقل ۶۰).</p>
    </div>
  );
}

// ===========================================================================
// پورتفولیوی تبادل فناوری (سه درصد پیشرفت فیزیکی / زمانی / مالی) — فقط‌خواندنی
// ===========================================================================
function ProgressCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[70px]">
      <div className="flex items-center justify-between text-[10px] text-ink-400 mb-0.5"><span>{label}</span><span>{faN(value)}٪</span></div>
      <div className="h-1 rounded-full bg-ink-100 overflow-hidden"><div className={`h-full rounded-full ${value >= 100 ? "bg-emerald-500" : value >= 50 ? "bg-brand-500" : "bg-amber-500"}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>
    </div>
  );
}

function TechTransferTab() {
  const [selected, setSelected] = useState<TechTransferContract | null>(null);
  const columns: Column<TechTransferContract>[] = [
    { key: "title", label: "موضوع قرارداد", render: (c) => <span className="font-medium text-ink-900">{c.title}</span> },
    { key: "holding", label: "هلدینگ متقاضی" },
    { key: "company", label: "شرکت متقاضی" },
    { key: "mojri", label: "مجری", render: (c) => <EntityLink name={c.mojri.replace(/^(شرکت دانش‌بنیان|شرکت فناور|شرکت|تیم فناور)\s+/, "")} /> },
    { key: "daneshmandRole", label: "نقش بنیاد", render: (c) => <Badge tone="navy">{c.daneshmandRole}</Badge> },
    { key: "amount", label: "مبلغ" },
    { key: "progress", label: "پیشرفت (فیزیکی / زمانی / مالی)", render: (c) => <div className="flex items-center gap-3"><ProgressCell value={c.physicalProgress} label="فیزیکی" /><ProgressCell value={c.timeProgress} label="زمانی" /><ProgressCell value={c.financialProgress} label="مالی" /></div> },
  ];
  return (
    <div>
      <div className="card p-4 mb-4 bg-brand-50 border-brand-200 flex items-start gap-3">
        <ArrowLeftRight size={18} className="text-brand-700 shrink-0 mt-0.5" />
        <p className="text-xs text-brand-800 leading-6">قراردادهای سه‌جانبه‌ی تبادل فناوری: شرکت بنیادی (کارفرما/بهره‌بردار) + فناور (مجری) + بنیاد (ناظر/هماهنگ‌کننده). اختلاف بیش از ۱۰ واحد بین پیشرفت فیزیکی و زمانی سیگنال هشدار است.</p>
      </div>
      <div className="mb-4">
        <h3 className="text-xs font-bold text-ink-900 mb-2">طرح‌های در دست بررسی (پیش از انعقاد قرارداد)</h3>
        <div className="card divide-y divide-ink-100">
          {pendingReviewItems.map((pv) => (
            <div key={pv.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink-900">{pv.topic}</p>
                <p className="text-[11px] text-ink-400 mt-0.5">{pv.holding} · {pv.company}{pv.mojri ? ` · مجری: ${pv.mojri}` : ""}{pv.note ? ` · ${pv.note}` : ""}</p>
              </div>
              {pv.obstacles ? <Badge tone="warning">{pv.obstacles}</Badge> : <Badge tone="neutral">در بررسی</Badge>}
            </div>
          ))}
        </div>
      </div>
      <DataTable columns={columns} rows={techTransferContracts} searchKeys={["title", "holding", "company", "mojri"]} searchPlaceholder="جستجو در موضوع، هلدینگ، شرکت یا مجری…" onRowClick={(c) => setSelected(c)} />
      <Drawer open={selected !== null} onClose={() => setSelected(null)} title="پرونده قرارداد تبادل فناوری">
        {selected && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-ink-900 leading-6">{selected.title}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap"><Badge tone="neutral">{selected.type}</Badge><Badge tone="navy">نقش بنیاد: {selected.daneshmandRole}</Badge></div>
            </div>
            <div className="text-xs text-ink-600 space-y-1.5">
              <p><span className="text-ink-400">هلدینگ متقاضی:</span> {selected.holding} · <span className="text-ink-400">شرکت:</span> {selected.company} ({selected.companyRole})</p>
              <p><span className="text-ink-400">مجری پروژه:</span> {selected.mojri}</p>
              <p><span className="text-ink-400">ناظر فنی:</span> {selected.nazer} · <span className="text-ink-400">محل اجرا:</span> {selected.city}</p>
              <p><span className="text-ink-400">مبلغ قرارداد:</span> {selected.amount} · <span className="text-ink-400">تعهد بنیاد:</span> {selected.commitment}</p>
              <p><span className="text-ink-400">نوع ضمانت:</span> {selected.guarantee}</p>
            </div>
            <div className="border-t border-ink-100 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-ink-900">سه شاخص پیشرفت</h4>
              {([["پیشرفت فیزیکی", selected.physicalProgress], ["پیشرفت زمانی", selected.timeProgress], ["پیشرفت مالی", selected.financialProgress]] as const).map(([label, value]) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-xs mb-1"><span className="text-ink-700">{label}</span><span className="text-ink-500">{faN(value)}٪</span></div>
                  <Bar value={value} />
                </div>
              ))}
              {selected.physicalProgress + 10 < selected.timeProgress && <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">هشدار: پیشرفت فیزیکی بیش از ۱۰ واحد از پیشرفت زمانی عقب است — نیازمند بررسی ناظر فنی.</p>}
            </div>
            {selected.note && <div className="border-t border-ink-100 pt-3"><h4 className="text-xs font-bold text-ink-900 mb-1">موانع و توضیحات</h4><p className="text-xs text-ink-500 leading-6">{selected.note}</p></div>}
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ===========================================================================
// گردش امضای الکترونیک — امضای کنش‌پذیر با تأیید دومرحله‌ای نمایشی
// ===========================================================================
function ESignTab() {
  const inn = useInnovation();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const [signing, setSigning] = useState<{ doc: ESignDoc; idx: number; reject: boolean } | null>(null);
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");
  const canSign = hasPermission("contracts.edit") || hasPermission("contracts.stage");

  const act = () => {
    if (!signing) return;
    const { doc, idx, reject } = signing;
    if (reject) {
      if (!reason.trim()) return;
      inn.commit("contracts", `امضای «${doc.steps[idx].role}» را رد کرد: ${reason.trim()}`, { id: doc.id, title: doc.title }, (s) => ({ ...s, esign: s.esign.map((d) => (d.id === doc.id ? { ...d, steps: d.steps.map((st, i) => (i === idx ? { ...st, status: "در نوبت" } : i === 0 ? { ...st, status: "در انتظار امضا", date: undefined } : i > 0 && i < idx ? { ...st, status: "در نوبت", date: undefined } : st)) } : d)) }));
      notify("امضا رد شد و سند برای اصلاح به مرحله‌ی اول برگشت.", "warning");
    } else {
      if (code.replace(/\D/g, "").length < 5 && code.replace(/[^۰-۹]/g, "").length < 5) return notify("کد تأیید پنج‌رقمی را وارد کنید.", "warning");
      const last = idx === doc.steps.length - 1;
      const letterNo = last ? `د/${inn.today.slice(0, 4)}/${faN(Math.floor(1000 + Math.random() * 8999))}` : undefined;
      inn.commit("contracts", last ? `آخرین امضا را ثبت کرد؛ شماره نامه ${letterNo} تخصیص یافت` : `امضای «${doc.steps[idx].role}» را ثبت کرد`, { id: doc.id, title: doc.title }, (s) => ({
        ...s,
        esign: s.esign.map((d) => (d.id === doc.id ? { ...d, letterNo: letterNo ?? d.letterNo, steps: d.steps.map((st, i) => (i === idx ? { ...st, status: "امضا شد", date: inn.today } : i === idx + 1 ? { ...st, status: "در انتظار امضا" } : st)) } : d)),
      }), !last ? { to: [doc.steps[idx + 1].name], text: `سند «${doc.title}» منتظر امضای شماست.`, link: "/dashboard/contracts?tab=esign" } : undefined);
      notify(last ? `سند کامل شد — شماره نامه ${letterNo}` : "امضا ثبت شد و امضاکننده‌ی بعدی مطلع شد.", "success");
    }
    setSigning(null);
    setCode("");
    setReason("");
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 bg-brand-50 border-brand-200 flex items-start gap-3">
        <PenLine size={18} className="text-brand-700 shrink-0 mt-0.5" />
        <p className="text-xs text-brand-800 leading-6">امضای ترتیبی غیرحضوری با تأیید دومرحله‌ای (کد پیامکی نمایشی). پس از آخرین امضا، شماره نامه خودکار تخصیص می‌یابد؛ رد امضا سند را به ابتدای زنجیره برمی‌گرداند.</p>
      </div>
      {inn.esign.map((doc) => {
        const done = doc.steps.filter((s) => s.status === "امضا شد").length;
        return (
          <div key={doc.id} className="card p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
              <p className="text-sm font-bold text-ink-900">{doc.title}</p>
              <div className="flex items-center gap-2"><Badge tone="neutral">{doc.kind}</Badge>{doc.letterNo ? <Badge tone="success">تکمیل — شماره نامه {doc.letterNo}</Badge> : <Badge tone="warning">{faN(done)} از {faN(doc.steps.length)} امضا</Badge>}</div>
            </div>
            <p className="text-[11px] text-ink-400 mb-3">مرتبط با: {doc.relatedTo} · {doc.method}</p>
            <div className="flex items-stretch gap-1.5 overflow-x-auto">
              {doc.steps.map((s, i) => (
                <div key={i} className={`flex-1 min-w-[130px] rounded-lg border p-2.5 ${s.status === "امضا شد" ? "border-emerald-200 bg-emerald-50/60" : s.status === "در انتظار امضا" ? "border-amber-300 bg-amber-50/60" : "border-ink-100 bg-ink-50/40"}`}>
                  <p className="text-[10.5px] text-ink-400 mb-0.5">مرحله {faN(i + 1)} — {s.role}</p>
                  <p className="text-[12px] font-medium text-ink-900">{s.name}</p>
                  <p className={`text-[11px] mt-1 flex items-center gap-1 ${s.status === "امضا شد" ? "text-emerald-700" : s.status === "در انتظار امضا" ? "text-amber-700" : "text-ink-400"}`}>{s.status === "امضا شد" ? <CheckCircle2 size={11} /> : <Clock3 size={11} />}{s.status}{s.date ? ` · ${s.date}` : ""}</p>
                  {s.status === "در انتظار امضا" && canSign && (
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant="primary" icon={<KeyRound size={11} />} onClick={() => setSigning({ doc, idx: i, reject: false })}>امضا</Button>
                      <Button size="sm" variant="ghost" icon={<XCircle size={11} />} onClick={() => setSigning({ doc, idx: i, reject: true })}>رد</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {signing && (
        <Modal open onClose={() => setSigning(null)} title={signing.reject ? "رد امضا" : "تأیید امضای الکترونیک"} description={`${signing.doc.title} — ${signing.doc.steps[signing.idx].role}`}>
          <div className="space-y-3">
            {signing.reject ? (
              <Field label="دلیل رد" required><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="input-field" /></Field>
            ) : (
              <Field label="کد تأیید پیامکی" hint="در دمو هر کد پنج‌رقمی پذیرفته می‌شود."><input value={code} onChange={(e) => setCode(e.target.value)} className="input-field text-center tracking-widest" dir="ltr" maxLength={5} placeholder="•••••" /></Field>
            )}
            <Button variant={signing.reject ? "danger" : "primary"} className="w-full justify-center" onClick={act}>{signing.reject ? "ثبت رد امضا" : "امضا"}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

