import ModuleReportsButton from "../reports/ModuleReportsButton";
import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { FlaskConical, Plus, Users, GraduationCap, Wallet, Clock3, FileCheck2, Megaphone, Trophy, BookMarked, Lock, Unlock, Gavel, Send, ChevronLeft, ClipboardCheck, Link2, FileSignature, Building2 } from "lucide-react";
import Tabs from "../components/ui/Tabs";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import DataTable, { type Column } from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import Drawer from "../components/ui/Drawer";
import RowActions from "../components/ui/RowActions";
import EmptyState from "../components/ui/EmptyState";
import JalaliDatePicker from "../components/ui/JalaliDatePicker";
import { useConfirm } from "../components/ui/ConfirmProvider";
import { useToast } from "../components/ui/ToastProvider";
import { useTenancy } from "../context/TenancyContext";
import { useInnovation } from "../context/InnovationContext";
import { ScopeBadge } from "../components/ui/ScopeControl";
import type { Scoped } from "../data/tenancy";
import { useTabParam } from "../lib/useTabParam";
import type { Application, CallStage, ResearchCall, Rfp, RfpBid, RfpStage, RubricItem, SabbaticalX, SabbStage } from "../innovation/types";
import { callStages, rfpStages, sabbStages } from "../innovation/types";
import { defaultRubric } from "../innovation/seed";
import { faN, num, reviewSummary, rialShort, uid } from "../innovation/util";
import EcosystemBank from "./innovation/EcosystemBank";
import EcosystemGraph from "./innovation/EcosystemGraph";
import { ActivityLogButton, Bar, DecisionModal, DecisionsOf, EntityLink, EntityPicker, Field, FilterChips, Info2, OutcomeModal, OutcomeSummary, Section, Stepper } from "./innovation/shared";
import { ApplicationModal, ApplicationsList, ProjectLinks, ReviewModal, RubricEditor } from "./innovation/researchParts";

type TabId = "opps" | "rfp" | "sabbatical" | "bank" | "graph";

const stageTone: Record<CallStage, BadgeTone> = {
  "پیش‌نویس": "neutral",
  "فراخوان باز": "success",
  "بررسی درخواست‌ها": "warning",
  داوری: "brand",
  "در حال اجرا": "navy",
  "پایان‌یافته": "neutral",
};

export default function Research() {
  const [tab, setTab] = useTabParam<TabId>("opps", ["opps", "rfp", "sabbatical", "bank", "graph"]);
  const inn = useInnovation();
  const { filterScoped } = useTenancy();
  return (
    <div>
      <PageHeader
        title="مدیریت فرصت‌های پژوهشی"
        description="فراخوان‌های پژوهشی، RFP و انتخاب فناور برتر، فرصت مطالعاتی اساتید و بانک شرکت‌ها و پژوهشگران"
        icon={<FlaskConical size={18} />}
        actions={
          <>
            <ModuleReportsButton module="innovation" />
            <ActivityLogButton module="research" />
          </>
        }
      />
      <Tabs
        tabs={[
          { id: "opps", label: "فرصت‌های پژوهشی", count: filterScoped(inn.calls).length },
          { id: "rfp", label: "فراخوان فناور برتر (RFP)", count: filterScoped(inn.rfps).length },
          { id: "sabbatical", label: "فرصت مطالعاتی اساتید", count: filterScoped(inn.sabbaticals).length },
          { id: "bank", label: "بانک شرکت‌ها و پژوهشگران", count: inn.entities.length },
          { id: "graph", label: "گراف ارتباطات" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "opps" && <OpportunitiesTab />}
      {tab === "rfp" && <RfpTab />}
      {tab === "sabbatical" && <SabbaticalTab />}
      {tab === "bank" && <EcosystemBank />}
      {tab === "graph" && <EcosystemGraph />}
    </div>
  );
}

const nextOf = <T extends string>(list: readonly T[], s: T): T | undefined => list[list.indexOf(s) + 1];

// ===========================================================================
// فراخوان‌های پژوهشی
// ===========================================================================
type CallForm = { title: string; field: string; deadline: string; budget: string; duration: string; supervisor: string; description: string; outputs: string; rubric: RubricItem[] };
const emptyCall = (): CallForm => ({ title: "", field: "", deadline: "", budget: "", duration: "", supervisor: "", description: "", outputs: "", rubric: defaultRubric() });

function OpportunitiesTab() {
  const inn = useInnovation();
  const { filterScoped, defaultScopeForNew, hasPermission, canManageItem, actingUser } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [stageFilter, setStageFilter] = useState<CallStage | "همه">("همه");
  const [form, setForm] = useState<CallForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemScope, setItemScope] = useState<Scoped>({ scope: "سراسری" });
  const [errors, setErrors] = useState(false);

  const openId = params.get("open");
  const selected = openId ? inn.calls.find((c) => c.id === openId) ?? null : null;
  const setOpen = (id: string | null) => {
    const n = new URLSearchParams(params);
    if (id) n.set("open", id);
    else n.delete("open");
    setParams(n, { replace: true });
  };

  const scoped = filterScoped(inn.calls);
  const filtered = stageFilter === "همه" ? scoped : scoped.filter((c) => c.stage === stageFilter);
  const counts = Object.fromEntries([["همه", scoped.length], ...callStages.map((s) => [s, scoped.filter((c) => c.stage === s).length])]);

  const startEdit = (c: ResearchCall) => {
    setEditingId(c.id);
    setItemScope({ scope: c.scope, holdingId: c.holdingId, companyId: c.companyId });
    setForm({ title: c.title, field: c.field, deadline: c.deadline, budget: c.budget ? faN(c.budget) : "", duration: c.duration, supervisor: c.supervisor, description: c.description, outputs: c.outputs.join("، "), rubric: c.rubric });
  };

  const save = (publish: boolean) => {
    if (!form) return;
    if (!form.title.trim() || !form.field.trim()) return setErrors(true);
    const patch = {
      title: form.title.trim(), field: form.field.trim(), deadline: form.deadline || "نامشخص", budget: num(form.budget), duration: form.duration.trim() || "—",
      supervisor: form.supervisor.trim() || "—", description: form.description.trim(), outputs: form.outputs.split(/[،,]/).map((s) => s.trim()).filter(Boolean), rubric: form.rubric,
    };
    if (editingId) {
      inn.commit("research", "فراخوان را ویرایش کرد", { id: editingId, title: patch.title }, (s) => ({ ...s, calls: s.calls.map((c) => (c.id === editingId ? { ...c, ...patch, ...itemScope } : c)) }));
      notify(`فراخوان «${patch.title}» ویرایش شد.`);
    } else {
      const id = uid("rs");
      const call: ResearchCall = { id, ...patch, stage: publish ? "فراخوان باز" : "پیش‌نویس", paid: 0, applications: [], createdAt: inn.today, ...itemScope, authorId: actingUser.id };
      inn.commit("research", publish ? "فراخوان پژوهشی منتشر کرد" : "پیش‌نویس فراخوان ساخت", { id, title: call.title }, (s) => ({ ...s, calls: [call, ...s.calls] }), publish ? { to: "*", text: `فراخوان پژوهشی «${call.title}» منتشر شد.`, link: `/dashboard/research?open=${id}` } : undefined);
      notify(publish ? `فراخوان «${call.title}» منتشر شد.` : "پیش‌نویس فراخوان ذخیره شد.");
    }
    setForm(null);
    setEditingId(null);
    setErrors(false);
  };

  const remove = (c: ResearchCall) =>
    confirm({
      title: `حذف فراخوان «${c.title}»؟`,
      message: `${faN(c.applications.length)} درخواستِ ثبت‌شده روی این فراخوان نیز حذف می‌شود.`,
      onConfirm: () => {
        inn.commit("research", "فراخوان را حذف کرد", { id: c.id, title: c.title }, (s) => ({ ...s, calls: s.calls.filter((x) => x.id !== c.id), projectLinks: s.projectLinks.filter((l) => l.opportunityId !== c.id) }));
        if (openId === c.id) setOpen(null);
        notify(`فراخوان «${c.title}» حذف شد.`, "info");
      },
    });

  const columns: Column<ResearchCall>[] = [
    { key: "title", label: "عنوان فرصت پژوهشی", render: (r) => <span className="font-medium text-ink-900">{r.title}</span> },
    { key: "field", label: "حوزه" },
    { key: "stage", label: "وضعیت", render: (r) => <Badge tone={stageTone[r.stage]}>{r.stage}</Badge> },
    { key: "applicants", label: "متقاضیان", render: (r) => <span className="flex items-center gap-1"><Users size={12} /> {faN(r.applications.length)}</span> },
    { key: "budget", label: "بودجه", render: (r) => <span className="text-ink-600">{r.budget ? rialShort(r.budget) : "—"}</span> },
    { key: "deadline", label: "مهلت ثبت‌نام" },
    { key: "owner", label: "دامنه", render: (r) => <ScopeBadge item={r} /> },
    { key: "actions", label: "", render: (r) => <RowActions onEdit={canManageItem(r, "research.edit") ? () => startEdit(r) : undefined} onDelete={canManageItem(r, "research.close") ? () => remove(r) : undefined} /> },
  ];

  const running = scoped.filter((o) => o.stage === "در حال اجرا");
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="فراخوان‌های باز" value={faN(scoped.filter((o) => o.stage === "فراخوان باز").length)} tone="success" icon={<FlaskConical size={16} />} />
        <StatCard label="کل درخواست‌ها" value={faN(scoped.reduce((s, o) => s + o.applications.length, 0))} tone="brand" icon={<Users size={16} />} />
        <StatCard label="پژوهش‌های در حال اجرا" value={faN(running.length)} icon={<GraduationCap size={16} />} />
        <StatCard label="بودجه پژوهشی فعال" value={rialShort(running.reduce((s, o) => s + o.budget, 0))} tone="warning" icon={<Wallet size={16} />} />
      </div>

      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <FilterChips items={callStages} value={stageFilter} onChange={setStageFilter} counts={counts} />
        {hasPermission("research.create") && (
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { setItemScope(defaultScopeForNew()); setEditingId(null); setForm(emptyCall()); }}>فراخوان جدید</Button>
        )}
      </div>

      <DataTable columns={columns} rows={filtered} searchKeys={["title", "field"]} searchPlaceholder="جستجو در عنوان یا حوزه‌ی پژوهش…" onRowClick={(r) => setOpen(r.id)} />

      {form && (
        <Modal open onClose={() => setForm(null)} title={editingId ? "ویرایش فراخوان پژوهشی" : "فراخوان پژوهشی جدید"} description="فرم درخواست، معیارهای داوری (وزن‌دار) و بودجه را تعیین کنید." width="max-w-2xl">
          <div className="space-y-3">
            <Field label="عنوان فرصت پژوهشی" required>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`input-field ${errors && !form.title.trim() ? "input-error" : ""}`} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="حوزه‌ی پژوهش" required><input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} className={`input-field ${errors && !form.field.trim() ? "input-error" : ""}`} /></Field>
              <Field label="مهلت ثبت‌نام"><JalaliDatePicker value={form.deadline} onChange={(v) => setForm({ ...form, deadline: v })} /></Field>
              <Field label="بودجه (ریال)"><input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="input-field" placeholder="۹۰۰٬۰۰۰٬۰۰۰" /></Field>
              <Field label="مدت اجرا"><input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="input-field" placeholder="۶ ماه" /></Field>
            </div>
            <Field label="واحد متولی / ناظر علمی"><input value={form.supervisor} onChange={(e) => setForm({ ...form, supervisor: e.target.value })} className="input-field" /></Field>
            <Field label="شرح فراخوان"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="input-field" /></Field>
            <Field label="خروجی‌های مورد انتظار" hint="با «،» جدا کنید"><input value={form.outputs} onChange={(e) => setForm({ ...form, outputs: e.target.value })} className="input-field" /></Field>
            <Field label="معیارهای داوری و وزن"><RubricEditor value={form.rubric} onChange={(r) => setForm({ ...form, rubric: r })} /></Field>
            <div className="flex gap-2 pt-1">
              {editingId ? (
                <Button variant="primary" className="flex-1 justify-center" onClick={() => save(false)}>ذخیره تغییرات</Button>
              ) : (
                <>
                  <Button variant="primary" className="flex-1 justify-center" icon={<Send size={14} />} onClick={() => save(true)}>انتشار فراخوان</Button>
                  <Button variant="secondary" onClick={() => save(false)}>ذخیره پیش‌نویس</Button>
                </>
              )}
              <Button variant="ghost" onClick={() => setForm(null)}>انصراف</Button>
            </div>
          </div>
        </Modal>
      )}

      <Drawer open={!!selected} onClose={() => setOpen(null)} title="پرونده فرصت پژوهشی" width="max-w-xl">
        {selected && <CallFile c={selected} />}
      </Drawer>
    </div>
  );
}

function CallFile({ c }: { c: ResearchCall }) {
  const inn = useInnovation();
  const { hasPermission, canManageItem } = useTenancy();
  const { notify } = useToast();
  const [applyOpen, setApplyOpen] = useState(false);
  const [reviewing, setReviewing] = useState<Application | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [closing, setClosing] = useState(false);
  const canEdit = canManageItem(c, "research.edit") || hasPermission("research.edit");
  const next = nextOf(callStages, c.stage);
  const upd = (action: string, fn: (x: ResearchCall) => ResearchCall) => inn.commit("research", action, { id: c.id, title: c.title }, (s) => ({ ...s, calls: s.calls.map((x) => (x.id === c.id ? fn(x) : x)) }));
  const setApp = (a: Application, patch: Partial<Application>, action: string) => upd(action, (x) => ({ ...x, applications: x.applications.map((y) => (y.id === a.id ? { ...y, ...patch } : y)) }));
  const candidates = c.applications.filter((a) => a.status !== "رد شده");
  const ranked = [...candidates].sort((a, b) => (reviewSummary(b.reviews, c.rubric).avg ?? -1) - (reviewSummary(a.reviews, c.rubric).avg ?? -1));
  const accepted = c.applications.find((a) => a.status === "پذیرفته");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-ink-900 leading-6">{c.title}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge tone={stageTone[c.stage]}>{c.stage}</Badge>
          <Badge tone="neutral">{c.field}</Badge>
          <ScopeBadge item={c} />
        </div>
      </div>
      <Stepper steps={callStages} current={c.stage} />
      {canEdit && next && next !== "پایان‌یافته" && (
        <Button size="sm" variant="secondary" icon={<ChevronLeft size={13} />} onClick={() => { upd(`فراخوان را به مرحله‌ی «${next}» برد`, (x) => ({ ...x, stage: next })); notify(`مرحله به «${next}» تغییر کرد.`); }}>
          انتقال به «{next}»
        </Button>
      )}
      {c.description && <p className="text-xs text-ink-600 leading-6">{c.description}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Info2 label="بودجه" value={c.budget ? rialShort(c.budget) : "—"} />
        <Info2 label="مدت اجرا" value={<span className="flex items-center gap-1"><Clock3 size={12} /> {c.duration}</span>} />
        <Info2 label="مهلت ثبت‌نام" value={c.deadline} />
        <Info2 label="واحد متولی" value={c.supervisor} />
      </div>
      {c.outputs.length > 0 && (
        <Section title="خروجی‌های مورد انتظار" icon={<FileCheck2 size={13} />}>
          <div className="flex flex-wrap gap-1.5">{c.outputs.map((o) => <Badge key={o} tone="brand">{o}</Badge>)}</div>
        </Section>
      )}
      <Section title="معیارهای داوری">
        <div className="flex flex-wrap gap-1.5">{c.rubric.map((r) => <Badge key={r.id} tone="neutral">{r.criterion} · {faN(r.weight)}٪</Badge>)}</div>
      </Section>

      <Section
        title={`درخواست‌ها (${faN(c.applications.length)})`}
        icon={<Users size={13} />}
        action={
          <div className="flex gap-1.5">
            {(c.stage === "فراخوان باز" || c.stage === "بررسی درخواست‌ها") && hasPermission("research.list") && <Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={() => setApplyOpen(true)}>ثبت درخواست</Button>}
            {canEdit && !accepted && ranked.length > 0 && c.stage !== "پیش‌نویس" && <Button size="sm" variant="primary" icon={<Gavel size={12} />} onClick={() => setDeciding(true)}>تصمیم پذیرش</Button>}
          </div>
        }
      >
        <ApplicationsList
          apps={c.applications}
          rubric={c.rubric}
          canReview={canEdit}
          onReview={setReviewing}
          onStatus={(a, s) => {
            setApp(a, { status: s, note: s === "نقص مدارک" ? "مدارک تکمیلی مورد نیاز است" : s === "رد شده" ? "رد در بررسی اولیه" : undefined }, `وضعیت درخواست «${a.name}» را «${s}» کرد`);
            if (s === "نقص مدارک") inn.commit("research", "نقص مدارک را به متقاضی اعلام کرد", { id: c.id, title: c.title }, (x) => x, { to: [a.name], text: `درخواست شما در فراخوان «${c.title}» نقص مدارک دارد.`, link: `/dashboard/research?open=${c.id}` });
          }}
        />
      </Section>

      {(c.stage === "در حال اجرا" || c.stage === "پایان‌یافته") && (
        <Section title="اجرا و پرداخت" icon={<Wallet size={13} />}>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between"><span className="text-ink-500">پیشرفت اجرا</span><span className="font-bold">{faN(c.progress ?? 0)}٪</span></div>
            <Bar value={c.progress ?? 0} />
            <div className="flex items-center justify-between"><span className="text-ink-500">پرداخت‌شده از بودجه</span><span className="font-bold">{rialShort(c.paid)} از {rialShort(c.budget)}</span></div>
            <Bar value={c.paid} max={c.budget || 1} tone="emerald" />
            {canEdit && c.stage === "در حال اجرا" && (
              <div className="flex gap-2 flex-wrap pt-1">
                <Button size="sm" variant="secondary" onClick={() => upd("پیشرفت پژوهش را ثبت کرد", (x) => ({ ...x, progress: Math.min(100, (x.progress ?? 0) + 10) }))}>+۱۰٪ پیشرفت تأییدشده</Button>
                <Button size="sm" variant="secondary" onClick={() => upd("قسط پژوهش را پرداخت کرد", (x) => ({ ...x, paid: Math.min(x.budget, x.paid + Math.round(x.budget * 0.25)) }))}>پرداخت قسط ۲۵٪</Button>
                <Button size="sm" variant="primary" icon={<ClipboardCheck size={12} />} onClick={() => setClosing(true)}>اختتام و ثبت نتیجه</Button>
              </div>
            )}
          </div>
        </Section>
      )}

      <Section title="پروژه‌های مرتبط" icon={<Link2 size={13} />}>
        <ProjectLinks opportunityId={c.id} title={c.title} canEdit={canEdit} />
      </Section>
      <DecisionsOf subjectId={c.id} />
      <OutcomeSummary module="research" subjectId={c.id} />

      {applyOpen && (
        <ApplicationModal title={c.title} onClose={() => setApplyOpen(false)} onSave={(a) => { upd(`درخواست «${a.name}» را ثبت کرد`, (x) => ({ ...x, applications: [...x.applications, a] })); notify("درخواست ثبت شد."); }} />
      )}
      {reviewing && (
        <ReviewModal title={`${reviewing.name} — ${c.title}`} rubric={c.rubric} onClose={() => setReviewing(null)} onSave={(r) => setApp(reviewing, { reviews: [...reviewing.reviews.filter((x) => x.reviewer !== r.reviewer), r], status: "در داوری" }, `درخواست «${reviewing.name}» را داوری کرد`)} />
      )}
      <DecisionModal
        open={deciding}
        onClose={() => setDeciding(false)}
        module="research"
        subjectId={c.id}
        subjectTitle={c.title}
        question="انتخاب مجری فراخوان"
        committee="کمیته‌ی پژوهش"
        options={ranked.map((a, i) => ({ id: a.id, label: a.name, score: reviewSummary(a.reviews, c.rubric).avg, rank: i + 1, entityId: a.entityId ?? inn.resolveEntity(undefined, a.name)?.id }))}
        confirmLabel="ثبت تصمیم و پذیرش مجری"
        onDecided={(o) =>
          upd(`«${o.label}» را به‌عنوان مجری پذیرفت`, (x) => ({
            ...x,
            stage: "در حال اجرا",
            progress: x.progress ?? 0,
            applications: x.applications.map((a) => (a.id === o.id ? { ...a, status: "پذیرفته" } : a.status === "رد شده" ? a : { ...a, status: "رد شده", note: "در تصمیم نهایی انتخاب نشد" })),
          }))
        }
      />
      {closing && (
        <OutcomeModal
          open
          onClose={() => setClosing(false)}
          module="research"
          subjectId={c.id}
          subjectTitle={c.title}
          entityIds={accepted ? [accepted.entityId ?? inn.resolveEntity(undefined, accepted.name)?.id ?? ""].filter(Boolean) : []}
          title="اختتام پژوهش و ثبت نتیجه‌ی واقعی"
          onSaved={() => upd("پژوهش را مختومه کرد", (x) => ({ ...x, stage: "پایان‌یافته", progress: 100 }))}
        />
      )}
    </div>
  );
}

// ===========================================================================
// RFP — فراخوان نیاز فناورانه و انتخاب فناور برتر
// ===========================================================================
const rfpTone: Record<RfpStage, BadgeTone> = {
  "پیش‌نویس": "neutral",
  "انتشار فراخوان": "success",
  "دریافت مستندات": "warning",
  "ارزیابی کسب‌وکاری": "warning",
  "ارزیابی فنی": "brand",
  "بازگشایی پاکات": "brand",
  "فناور برتر انتخاب شد": "navy",
};
const composite = (b: RfpBid) => (b.techScore !== undefined && b.bizScore !== undefined ? Math.round((b.techScore * 0.6 + b.bizScore * 0.4) * 10) / 10 : undefined);
const CHANNELS = ["سامانه بنیاد", "سامانه ساخت داخل", "سامانه نان", "سامانه جان"];

function RfpTab() {
  const inn = useInnovation();
  const { filterScoped, hasPermission, companies, holdings } = useTenancy();
  const { notify } = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<{ title: string; companyId: string; need: string; trl: string; budget: string; deadline: string; channels: string[] } | null>(null);
  const [err, setErr] = useState(false);
  const list = filterScoped(inn.rfps);
  const selected = open ? inn.rfps.find((r) => r.id === open) : undefined;

  const create = (publish: boolean) => {
    if (!form) return;
    if (!form.title.trim() || !form.companyId) return setErr(true);
    const co = companies.find((c) => c.id === form.companyId)!;
    const id = uid("rfp");
    const r: Rfp = {
      id, title: form.title.trim().startsWith("RFP") ? form.title.trim() : `RFP ${form.title.trim()}`, companyName: co.name, need: form.need.trim(), trlTarget: Number(form.trl) || 6,
      deadline: form.deadline || "نامشخص", budget: num(form.budget), channels: form.channels, stage: publish ? "انتشار فراخوان" : "پیش‌نویس", bids: [], priceOpened: false, createdAt: inn.today,
      scope: "شرکت", holdingId: co.holdingId, companyId: co.id,
    };
    inn.commit("research", publish ? "RFP را تدوین و منتشر کرد" : "پیش‌نویس RFP ساخت", { id, title: r.title }, (s) => ({ ...s, rfps: [r, ...s.rfps] }), publish ? { to: "*", text: `فراخوان نیاز فناورانه «${r.title}» منتشر شد.`, link: "/dashboard/research?tab=rfp" } : undefined);
    notify(publish ? `RFP منتشر شد (${r.channels.join("، ") || "سامانه بنیاد"}).` : "پیش‌نویس RFP ذخیره شد.");
    setForm(null);
    setErr(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-ink-500 leading-6 max-w-2xl">
          تدوین RFP ← انتشار ← دریافت مستندات فناوران ← ارزیابی کسب‌وکاری ← ارزیابی فنی ← بازگشایی پاکات قیمت در کمیسیون ← انتخاب فناور برتر (با ثبت تصمیم) ← پیش‌نویس قرارداد.
        </p>
        {hasPermission("research.create") && (
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setForm({ title: "", companyId: "", need: "", trl: "6", budget: "", deadline: "", channels: ["سامانه بنیاد"] })}>RFP جدید</Button>
        )}
      </div>
      {list.length === 0 && <div className="card"><EmptyState title="RFP در دامنه‌ی شما ثبت نشده" /></div>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {list.map((r) => {
          const winner = r.bids.find((b) => b.id === r.winnerBidId);
          return (
            <button key={r.id} onClick={() => setOpen(r.id)} className="card p-4 text-right hover:border-brand-300">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5 min-w-0"><Megaphone size={14} className="text-brand-600 shrink-0" /><span className="truncate">{r.title}</span></p>
                <Badge tone={rfpTone[r.stage]}>{r.stage}</Badge>
              </div>
              <p className="text-[11px] text-ink-400 mt-1">{r.companyName} · {holdings.find((h) => h.id === r.holdingId)?.name ?? "—"} · مهلت {r.deadline}</p>
              <div className="flex items-center gap-2 mt-3 text-[11px] text-ink-500 flex-wrap">
                <Badge tone="neutral">{faN(r.bids.length)} پیشنهاد</Badge>
                <Badge tone="neutral">TRL هدف {faN(r.trlTarget)}</Badge>
                {r.priceOpened ? <Badge tone="success" icon={<Unlock size={10} />}>پاکات باز</Badge> : <Badge tone="neutral" icon={<Lock size={10} />}>پاکات بسته</Badge>}
                {winner && <Badge tone="success" icon={<Trophy size={10} />}>{winner.name}</Badge>}
              </div>
            </button>
          );
        })}
      </div>

      {form && (
        <Modal open onClose={() => setForm(null)} title="تدوین RFP جدید" width="max-w-xl">
          <div className="space-y-3">
            <Field label="عنوان نیاز فناورانه" required><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`input-field ${err && !form.title.trim() ? "input-error" : ""}`} placeholder="مثلاً: سامانه پایش ارتعاش پمپ‌ها" /></Field>
            <Field label="شرکت متقاضی (کارفرما)" required>
              <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className={`input-field ${err && !form.companyId ? "input-error" : ""}`}>
                <option value="">انتخاب شرکت…</option>
                {holdings.map((h) => (
                  <optgroup key={h.id} label={h.name}>{companies.filter((c) => c.holdingId === h.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                ))}
              </select>
            </Field>
            <Field label="شرح نیاز"><textarea value={form.need} onChange={(e) => setForm({ ...form, need: e.target.value })} rows={2} className="input-field" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="TRL هدف"><select value={form.trl} onChange={(e) => setForm({ ...form, trl: e.target.value })} className="input-field">{Array.from({ length: 9 }, (_, i) => <option key={i} value={i + 1}>{faN(i + 1)}</option>)}</select></Field>
              <Field label="بودجه (ریال)"><input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="input-field" /></Field>
              <Field label="مهلت"><JalaliDatePicker value={form.deadline} onChange={(v) => setForm({ ...form, deadline: v })} /></Field>
            </div>
            <Field label="سامانه‌های انتشار">
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((ch) => (
                  <label key={ch} className="flex items-center gap-1.5 text-xs text-ink-600"><input type="checkbox" checked={form.channels.includes(ch)} onChange={(e) => setForm({ ...form, channels: e.target.checked ? [...form.channels, ch] : form.channels.filter((x) => x !== ch) })} /> {ch}</label>
                ))}
              </div>
            </Field>
            <div className="flex gap-2">
              <Button variant="primary" className="flex-1 justify-center" icon={<Send size={14} />} onClick={() => create(true)}>انتشار RFP</Button>
              <Button variant="secondary" onClick={() => create(false)}>ذخیره پیش‌نویس</Button>
            </div>
          </div>
        </Modal>
      )}

      <Drawer open={!!selected} onClose={() => setOpen(null)} title="پرونده RFP" width="max-w-xl">
        {selected && <RfpFile r={selected} />}
      </Drawer>
    </div>
  );
}

function RfpFile({ r }: { r: Rfp }) {
  const inn = useInnovation();
  const { hasPermission, actingUser } = useTenancy();
  const { notify } = useToast();
  const [bidOpen, setBidOpen] = useState(false);
  const [bid, setBid] = useState<{ name: string; entityId?: string; price: string }>({ name: "", price: "" });
  const [scoring, setScoring] = useState<"biz" | "tech" | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [deciding, setDeciding] = useState(false);
  const canEdit = hasPermission("research.edit");
  const upd = (action: string, fn: (x: Rfp) => Rfp, notifySpec?: Parameters<typeof inn.commit>[4]) => inn.commit("research", action, { id: r.id, title: r.title }, (s) => ({ ...s, rfps: s.rfps.map((x) => (x.id === r.id ? fn(x) : x)) }), notifySpec);
  const allTech = r.bids.length > 0 && r.bids.every((b) => b.techScore !== undefined);
  const ranked = [...r.bids].sort((a, b) => (composite(b) ?? -1) - (composite(a) ?? -1));
  const winner = r.bids.find((b) => b.id === r.winnerBidId);
  const contract = r.contractId ? inn.contracts.find((c) => c.id === r.contractId) : undefined;

  const saveScores = () => {
    const key = scoring === "biz" ? "bizScore" : "techScore";
    const nextStage: RfpStage = scoring === "biz" ? "ارزیابی فنی" : "ارزیابی فنی";
    upd(scoring === "biz" ? "نمرات ارزیابی کسب‌وکاری را ثبت کرد" : "نمرات ارزیابی فنی را ثبت کرد", (x) => ({
      ...x,
      stage: scoring === "biz" ? nextStage : x.stage,
      bids: x.bids.map((b) => (scores[b.id] !== undefined && scores[b.id] !== "" ? { ...b, [key]: Math.min(100, num(scores[b.id])) } : b)),
    }));
    setScoring(null);
    setScores({});
    notify("نمرات ثبت شد.");
  };

  const createContract = () => {
    if (!winner) return;
    const id = uid("ct");
    inn.commit("contracts", "پیش‌نویس قرارداد را از برنده‌ی RFP ساخت", { id, title: r.title }, (s) => ({
      ...s,
      contracts: [
        {
          id, title: `قرارداد ${r.title.replace(/^RFP\s*/, "")}`, vendor: winner.name, vendorEntityId: winner.entityId, type: "فناورانه", method: "RFP", stage: "پیش‌نویس",
          value: winner.price ?? r.budget, startDate: inn.today, endDate: "نامشخص", owner: actingUser.name, guarantee: "—", opportunityId: r.id, milestones: [], payments: [],
          history: [{ id: uid("h"), at: inn.stamp(), by: actingUser.name, text: `پیش‌نویس از برنده‌ی ${r.title} ساخته شد`, to: "پیش‌نویس" }], renewals: [], createdAt: inn.today,
          scope: r.scope, holdingId: r.holdingId, companyId: r.companyId, authorId: actingUser.id,
        },
        ...s.contracts,
      ],
      rfps: s.rfps.map((x) => (x.id === r.id ? { ...x, contractId: id } : x)),
    }));
    notify("پیش‌نویس قرارداد با طرفین و مبلغ از پیش پرشده ساخته شد.", "success");
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-ink-900 leading-6">{r.title}</p>
        <p className="text-[11px] text-ink-400 mt-1">{r.companyName} · مهلت {r.deadline} · انتشار در: {r.channels.join("، ") || "—"}</p>
      </div>
      <Stepper steps={rfpStages} current={r.stage} />
      {r.need && <p className="text-xs text-ink-600 leading-6">{r.need}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Info2 label="TRL هدف" value={faN(r.trlTarget)} />
        <Info2 label="بودجه" value={r.budget ? rialShort(r.budget) : "—"} />
      </div>

      {canEdit && (
        <div className="flex gap-1.5 flex-wrap">
          {r.stage === "پیش‌نویس" && <Button size="sm" variant="primary" icon={<Send size={12} />} onClick={() => upd("RFP را منتشر کرد", (x) => ({ ...x, stage: "انتشار فراخوان" }), { to: "*", text: `RFP «${r.title}» منتشر شد.`, link: "/dashboard/research?tab=rfp" })}>انتشار</Button>}
          {(r.stage === "انتشار فراخوان" || r.stage === "دریافت مستندات") && (
            <>
              <Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={() => setBidOpen(true)}>ثبت پیشنهاد فناور</Button>
              {r.stage === "انتشار فراخوان" && <Button size="sm" variant="ghost" onClick={() => upd("مرحله‌ی دریافت مستندات را آغاز کرد", (x) => ({ ...x, stage: "دریافت مستندات" }))}>شروع دریافت مستندات</Button>}
              {r.bids.length > 0 && <Button size="sm" variant="primary" onClick={() => upd("دریافت مستندات را بست و ارزیابی کسب‌وکاری را آغاز کرد", (x) => ({ ...x, stage: "ارزیابی کسب‌وکاری" }))}>پایان دریافت ← ارزیابی کسب‌وکاری</Button>}
            </>
          )}
          {r.stage === "ارزیابی کسب‌وکاری" && <Button size="sm" variant="primary" onClick={() => setScoring("biz")}>ثبت نمرات کسب‌وکاری</Button>}
          {r.stage === "ارزیابی فنی" && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setScoring("tech")}>ثبت نمرات فنی</Button>
              <Button size="sm" variant="primary" disabled={!allTech} title={allTech ? "" : "همه‌ی پیشنهادها باید نمره‌ی فنی داشته باشند"} onClick={() => upd("ارزیابی فنی را تکمیل کرد", (x) => ({ ...x, stage: "بازگشایی پاکات" }))}>تکمیل ارزیابی فنی</Button>
            </>
          )}
          {r.stage === "بازگشایی پاکات" && !r.priceOpened && <Button size="sm" variant="primary" icon={<Unlock size={12} />} onClick={() => setMinutesOpen(true)}>بازگشایی پاکات در کمیسیون</Button>}
          {r.stage === "بازگشایی پاکات" && r.priceOpened && <Button size="sm" variant="primary" icon={<Gavel size={12} />} onClick={() => setDeciding(true)}>انتخاب فناور برتر</Button>}
          {r.stage === "فناور برتر انتخاب شد" && winner && !r.contractId && hasPermission("contracts.create") && <Button size="sm" variant="primary" icon={<FileSignature size={12} />} onClick={createContract}>ایجاد پیش‌نویس قرارداد</Button>}
        </div>
      )}

      <Section title={`پیشنهادهای فناوران (${faN(r.bids.length)})`} icon={<Building2 size={13} />}>
        {r.bids.length === 0 ? <p className="text-xs text-ink-400">هنوز پیشنهادی ثبت نشده است.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px] min-w-[420px]">
              <thead><tr className="text-ink-400 text-right"><th className="font-medium pb-1.5">فناور</th><th className="font-medium pb-1.5 text-center">کسب‌وکاری</th><th className="font-medium pb-1.5 text-center">فنی</th><th className="font-medium pb-1.5 text-center">ترکیبی</th><th className="font-medium pb-1.5 text-center">قیمت</th></tr></thead>
              <tbody className="text-ink-700">
                {ranked.map((b) => (
                  <tr key={b.id} className="border-t border-ink-100">
                    <td className="py-2 font-medium text-ink-900"><EntityLink id={b.entityId} name={b.name} />{b.id === r.winnerBidId && <Trophy size={11} className="inline mr-1 text-amber-500" />}</td>
                    <td className="py-2 text-center">{b.bizScore !== undefined ? faN(b.bizScore) : "—"}</td>
                    <td className="py-2 text-center">{b.techScore !== undefined ? faN(b.techScore) : "—"}</td>
                    <td className="py-2 text-center font-bold">{composite(b) !== undefined ? faN(composite(b), 1) : "—"}</td>
                    <td className="py-2 text-center">{r.priceOpened ? (b.price ? rialShort(b.price) : "—") : <span className="text-ink-400 inline-flex items-center gap-1"><Lock size={10} /> بسته</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10.5px] text-ink-400 mt-1.5">امتیاز ترکیبی = ۶۰٪ فنی + ۴۰٪ کسب‌وکاری (فقط برای رتبه‌بندی نمایشی در ثبت تصمیم). پاکت قیمت تا تکمیل ارزیابی فنی قفل است.</p>
          </div>
        )}
      </Section>
      {r.minutes && <Section title="صورت‌جلسه‌ی کمیسیون"><p className="text-xs text-ink-600 leading-6">{r.minutes}</p></Section>}
      {contract && (
        <Section title="قرارداد حاصل" icon={<FileSignature size={13} />}>
          <Link to={`/dashboard/contracts?open=${contract.id}`} className="block rounded-lg bg-ink-50 p-2.5 text-xs hover:bg-ink-100">
            <span className="font-medium text-ink-800">{contract.title}</span> <Badge tone="brand">{contract.stage}</Badge>
          </Link>
        </Section>
      )}
      <Section title="پروژه‌های مرتبط" icon={<Link2 size={13} />}><ProjectLinks opportunityId={r.id} title={r.title} canEdit={canEdit} /></Section>
      <DecisionsOf subjectId={r.id} />

      {bidOpen && (
        <Modal open onClose={() => setBidOpen(false)} title="ثبت پیشنهاد فناور" description="قیمت در پاکت دربسته نگه‌داری و پس از ارزیابی فنی بازگشایی می‌شود.">
          <div className="space-y-3">
            <Field label="فناور" required><EntityPicker kind="company" name={bid.name} onChange={(n, id) => setBid({ ...bid, name: n, entityId: id })} /></Field>
            <Field label="پیشنهاد قیمت (ریال) — پاکت ج"><input value={bid.price} onChange={(e) => setBid({ ...bid, price: e.target.value })} className="input-field" /></Field>
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => {
                if (!bid.name.trim()) return;
                upd(`پیشنهاد «${bid.name}» را ثبت کرد`, (x) => ({ ...x, stage: x.stage === "انتشار فراخوان" ? "دریافت مستندات" : x.stage, bids: [...x.bids, { id: uid("b"), name: bid.name.trim(), entityId: bid.entityId, price: num(bid.price) || undefined, submittedAt: inn.today }] }));
                setBid({ name: "", price: "" });
                setBidOpen(false);
              }}
            >
              ثبت پیشنهاد
            </Button>
          </div>
        </Modal>
      )}
      {scoring && (
        <Modal open onClose={() => setScoring(null)} title={scoring === "biz" ? "جلسه‌ی ارزیابی توانمندی کسب‌وکاری" : "جلسه‌ی ارزیابی فنی"} description="نمره از ۱۰۰">
          <div className="space-y-2">
            {r.bids.map((b) => (
              <div key={b.id} className="flex items-center gap-2 text-xs">
                <span className="flex-1 text-ink-800">{b.name}</span>
                <input defaultValue={(scoring === "biz" ? b.bizScore : b.techScore) !== undefined ? faN(scoring === "biz" ? b.bizScore : b.techScore) : ""} onChange={(e) => setScores((s) => ({ ...s, [b.id]: e.target.value }))} className="input-field w-24 text-center" placeholder="۰–۱۰۰" />
              </div>
            ))}
            <Button variant="primary" className="w-full justify-center mt-2" onClick={saveScores}>ثبت نمرات</Button>
          </div>
        </Modal>
      )}
      {minutesOpen && (
        <Modal open onClose={() => setMinutesOpen(false)} title="بازگشایی پاکات قیمت در کمیسیون معاملات">
          <div className="space-y-3">
            <Field label="صورت‌جلسه"><textarea value={minutes} onChange={(e) => setMinutes(e.target.value)} rows={3} className="input-field" placeholder="حاضران، پاکات بازگشایی‌شده، ملاحظات…" /></Field>
            <Button variant="primary" className="w-full justify-center" icon={<Unlock size={14} />} onClick={() => { upd("پاکات قیمت را در کمیسیون بازگشایی کرد", (x) => ({ ...x, priceOpened: true, minutes: minutes.trim() || `پاکات قیمت در جلسه‌ی ${inn.today} بازگشایی شد.` })); setMinutesOpen(false); }}>بازگشایی و ثبت صورت‌جلسه</Button>
          </div>
        </Modal>
      )}
      <DecisionModal
        open={deciding}
        onClose={() => setDeciding(false)}
        module="research"
        subjectId={r.id}
        subjectTitle={r.title}
        question="انتخاب فناور برتر"
        committee="کمیسیون معاملات"
        options={ranked.map((b, i) => ({ id: b.id, label: `${b.name}${b.price ? ` — ${rialShort(b.price)}` : ""}`, score: composite(b), rank: i + 1, entityId: b.entityId }))}
        onDecided={(o) => upd(`فناور برتر را «${r.bids.find((b) => b.id === o.id)?.name}» اعلام کرد`, (x) => ({ ...x, stage: "فناور برتر انتخاب شد", winnerBidId: o.id }))}
      />
    </div>
  );
}

// ===========================================================================
// فرصت مطالعاتی اساتید (صندوق فرصت)
// ===========================================================================
const sabbTone: Record<SabbStage, BadgeTone> = { فراخوان: "neutral", "انتخاب استاد": "warning", قرارداد: "brand", "در حال اجرا": "success", "کتابچه و ارائه نهایی": "navy", خاتمه: "neutral" };
const reportTone: Record<string, BadgeTone> = { "در انتظار": "neutral", "ارسال به صنعت و داور": "warning", "نیازمند اصلاح": "danger", "تایید و پرداخت شد": "success" };

function SabbaticalTab() {
  const inn = useInnovation();
  const { filterScoped, hasPermission, companies, holdings } = useTenancy();
  const { notify } = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<{ topic: string; companyId: string; trl: string; budget: string } | null>(null);
  const list = filterScoped(inn.sabbaticals);
  const selected = open ? inn.sabbaticals.find((s) => s.id === open) : undefined;

  const create = () => {
    if (!form || !form.topic.trim() || !form.companyId) return;
    const co = companies.find((c) => c.id === form.companyId)!;
    const id = uid("sb");
    const sb: SabbaticalX = {
      id, topic: form.topic.trim(), industry: `${holdings.find((h) => h.id === co.holdingId)?.name ?? ""} — ${co.name}`, trlBefore: Number(form.trl) || 2, budget: num(form.budget) || 830_000_000, stage: "فراخوان",
      applicants: [], reports: [
        { no: 1, title: "گزارش شناخت شرکت", status: "در انتظار", amount: 250_000_000, paid: false },
        { no: 2, title: "گزارش ارائه راهکار", status: "در انتظار", amount: 280_000_000, paid: false },
        { no: 3, title: "گزارش RFPهای پیشنهادی (حداقل ۶ عنوان: ۳ نوپا، ۲ R&D، ۱ کلان)", status: "در انتظار", amount: 300_000_000, paid: false },
      ], createdAt: inn.today, scope: "شرکت", holdingId: co.holdingId, companyId: co.id,
    };
    inn.commit("research", "فراخوان فرصت مطالعاتی منتشر کرد", { id, title: sb.topic }, (s) => ({ ...s, sabbaticals: [sb, ...s.sabbaticals] }), { to: "*", text: `فراخوان فرصت مطالعاتی «${sb.topic}» منتشر شد.`, link: "/dashboard/research?tab=sabbatical" });
    notify("فراخوان فرصت مطالعاتی منتشر شد.");
    setForm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-ink-500 leading-6 max-w-2xl">
          فراخوان ← انتخاب استاد (داوری + ثبت تصمیم) ← قرارداد ← سه گزارش مرحله‌ای با داوری صنعت و داور و دستور پرداخت ← کتابچه و ارائه‌ی نهایی ← خاتمه با ثبت TRL قبل/بعد.
        </p>
        {hasPermission("research.create") && <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setForm({ topic: "", companyId: "", trl: "2", budget: "" })}>فراخوان فرصت مطالعاتی</Button>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {list.map((sb) => {
          const paid = sb.reports.filter((r) => r.paid).reduce((s, r) => s + r.amount, 0);
          return (
            <button key={sb.id} onClick={() => setOpen(sb.id)} className="card p-4 text-right hover:border-brand-300">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5 min-w-0"><BookMarked size={14} className="text-brand-600 shrink-0" /><span className="truncate">{sb.topic}</span></p>
                <Badge tone={sabbTone[sb.stage]}>{sb.stage}</Badge>
              </div>
              <p className="text-[11px] text-ink-400 mt-1">{sb.professor ? `${sb.professor} — ${sb.university}` : `${faN(sb.applicants.length)} متقاضی`} · {sb.industry}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge tone="neutral">TRL {faN(sb.trlBefore)}{sb.trlAfter ? ` ← ${faN(sb.trlAfter)}` : ""}</Badge>
                <span className="text-[11px] text-ink-400">{faN(sb.reports.filter((r) => r.paid).length)} از ۳ گزارش پرداخت‌شده · {rialShort(paid)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {form && (
        <Modal open onClose={() => setForm(null)} title="فراخوان فرصت مطالعاتی">
          <div className="space-y-3">
            <Field label="موضوع" required><input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="input-field" /></Field>
            <Field label="صنعت میزبان" required>
              <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="input-field">
                <option value="">انتخاب شرکت…</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="TRL فعلی"><select value={form.trl} onChange={(e) => setForm({ ...form, trl: e.target.value })} className="input-field">{Array.from({ length: 9 }, (_, i) => <option key={i} value={i + 1}>{faN(i + 1)}</option>)}</select></Field>
              <Field label="اعتبار (ریال)"><input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="input-field" placeholder="۸۳۰٬۰۰۰٬۰۰۰" /></Field>
            </div>
            <Button variant="primary" className="w-full justify-center" icon={<Send size={14} />} onClick={create}>انتشار فراخوان</Button>
          </div>
        </Modal>
      )}
      <Drawer open={!!selected} onClose={() => setOpen(null)} title="پرونده فرصت مطالعاتی" width="max-w-xl">
        {selected && <SabbaticalFile sb={selected} />}
      </Drawer>
    </div>
  );
}

function SabbaticalFile({ sb }: { sb: SabbaticalX }) {
  const inn = useInnovation();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const [applyOpen, setApplyOpen] = useState(false);
  const [reviewing, setReviewing] = useState<Application | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [closing, setClosing] = useState(false);
  const canEdit = hasPermission("research.edit");
  const rubric = defaultRubric();
  const upd = (action: string, fn: (x: SabbaticalX) => SabbaticalX) => inn.commit("research", action, { id: sb.id, title: sb.topic }, (s) => ({ ...s, sabbaticals: s.sabbaticals.map((x) => (x.id === sb.id ? fn(x) : x)) }));
  const ranked = [...sb.applicants.filter((a) => a.status !== "رد شده")].sort((a, b) => (reviewSummary(b.reviews, rubric).avg ?? -1) - (reviewSummary(a.reviews, rubric).avg ?? -1));
  const setReport = (no: number, status: SabbaticalX["reports"][number]["status"]) =>
    upd(`گزارش ${faN(no)} را «${status}» کرد`, (x) => {
      const reports = x.reports.map((r) => (r.no === no ? { ...r, status, paid: status === "تایید و پرداخت شد" } : r));
      return { ...x, reports, stage: reports.every((r) => r.paid) && x.stage === "در حال اجرا" ? "کتابچه و ارائه نهایی" : x.stage };
    });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-ink-900 leading-6">{sb.topic}</p>
        <p className="text-[11px] text-ink-400 mt-1">صنعت میزبان: {sb.industry}{sb.contract ? ` · قرارداد ${sb.contract}` : ""}</p>
      </div>
      <Stepper steps={sabbStages} current={sb.stage} />
      <div className="grid grid-cols-2 gap-2">
        <Info2 label="استاد مجری" value={sb.professor ? <EntityLink id={sb.entityId} name={sb.professor} /> : "در حال انتخاب"} />
        <Info2 label="TRL" value={`${faN(sb.trlBefore)}${sb.trlAfter ? ` ← ${faN(sb.trlAfter)}` : ""}`} />
        <Info2 label="اعتبار" value={rialShort(sb.budget)} />
        <Info2 label="پرداخت‌شده" value={rialShort(sb.reports.filter((r) => r.paid).reduce((s, r) => s + r.amount, 0))} />
      </div>

      {(sb.stage === "فراخوان" || sb.stage === "انتخاب استاد") && (
        <Section
          title={`متقاضیان (${faN(sb.applicants.length)})`}
          icon={<Users size={13} />}
          action={
            <div className="flex gap-1.5">
              <Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={() => setApplyOpen(true)}>ثبت درخواست استاد</Button>
              {canEdit && ranked.length > 0 && <Button size="sm" variant="primary" icon={<Gavel size={12} />} onClick={() => setDeciding(true)}>انتخاب استاد</Button>}
            </div>
          }
        >
          <ApplicationsList apps={sb.applicants} rubric={rubric} canReview={canEdit} onReview={setReviewing} onStatus={(a, s) => upd(`وضعیت «${a.name}» را «${s}» کرد`, (x) => ({ ...x, applicants: x.applicants.map((y) => (y.id === a.id ? { ...y, status: s } : y)) }))} />
        </Section>
      )}

      {canEdit && sb.stage === "قرارداد" && <Button size="sm" variant="primary" onClick={() => upd("قرارداد فرصت مطالعاتی را امضا و اجرا را آغاز کرد", (x) => ({ ...x, stage: "در حال اجرا" }))}>امضای قرارداد و شروع اجرا</Button>}

      {sb.stage !== "فراخوان" && sb.stage !== "انتخاب استاد" && (
        <Section title="سه گزارش مرحله‌ای" icon={<FileCheck2 size={13} />}>
          <div className="space-y-2">
            {sb.reports.map((r) => (
              <div key={r.no} className="rounded-lg border border-ink-100 bg-ink-50/50 p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-ink-900">گزارش {faN(r.no)} — {r.title}</p>
                  <Badge tone={reportTone[r.status]}>{r.status}</Badge>
                </div>
                <p className="text-[10.5px] text-ink-400 mt-1">مبلغ مرحله: {rialShort(r.amount)}</p>
                {canEdit && sb.stage === "در حال اجرا" && !r.paid && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {(r.status === "در انتظار" || r.status === "نیازمند اصلاح") && <Button size="sm" variant="secondary" onClick={() => setReport(r.no, "ارسال به صنعت و داور")}>ارسال به صنعت و داور</Button>}
                    {r.status === "ارسال به صنعت و داور" && (
                      <>
                        <Button size="sm" variant="primary" onClick={() => setReport(r.no, "تایید و پرداخت شد")}>تأیید و دستور پرداخت</Button>
                        <Button size="sm" variant="ghost" onClick={() => setReport(r.no, "نیازمند اصلاح")}>نیازمند اصلاح</Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            <p className="text-[10.5px] text-ink-400">قاعده‌ی گزارش ۳: حداقل ۶ عنوان RFP پیشنهادی (۳ نوپا، ۲ R&D، ۱ کلان).</p>
          </div>
        </Section>
      )}

      {canEdit && sb.stage === "کتابچه و ارائه نهایی" && <Button size="sm" variant="primary" icon={<ClipboardCheck size={12} />} onClick={() => setClosing(true)}>ارائه‌ی نهایی و خاتمه (ثبت نتیجه)</Button>}
      <Section title="پروژه‌های مرتبط" icon={<Link2 size={13} />}><ProjectLinks opportunityId={sb.id} title={sb.topic} canEdit={canEdit} /></Section>
      <DecisionsOf subjectId={sb.id} />
      <OutcomeSummary module="research" subjectId={sb.id} />

      {applyOpen && <ApplicationModal title={sb.topic} kind="researcher" onClose={() => setApplyOpen(false)} onSave={(a) => { upd(`درخواست «${a.name}» را ثبت کرد`, (x) => ({ ...x, stage: x.stage === "فراخوان" ? "انتخاب استاد" : x.stage, applicants: [...x.applicants, a] })); notify("درخواست ثبت شد."); }} />}
      {reviewing && <ReviewModal title={`${reviewing.name} — ${sb.topic}`} rubric={rubric} onClose={() => setReviewing(null)} onSave={(r) => upd(`درخواست «${reviewing.name}» را داوری کرد`, (x) => ({ ...x, applicants: x.applicants.map((a) => (a.id === reviewing.id ? { ...a, status: "در داوری", reviews: [...a.reviews.filter((y) => y.reviewer !== r.reviewer), r] } : a)) }))} />}
      <DecisionModal
        open={deciding}
        onClose={() => setDeciding(false)}
        module="research"
        subjectId={sb.id}
        subjectTitle={sb.topic}
        question="انتخاب استاد فرصت مطالعاتی"
        committee="شورای صندوق فرصت"
        options={ranked.map((a, i) => ({ id: a.id, label: a.name, score: reviewSummary(a.reviews, rubric).avg, rank: i + 1, entityId: a.entityId }))}
        onDecided={(o) => {
          const a = sb.applicants.find((x) => x.id === o.id)!;
          upd(`«${a.name}» را به‌عنوان استاد مجری انتخاب کرد`, (x) => ({
            ...x, stage: "قرارداد", professor: a.name, university: a.affiliation, entityId: a.entityId, contract: `ف/${inn.today.slice(0, 4)}/${faN(Math.floor(Math.random() * 90) + 10)}`,
            applicants: x.applicants.map((y) => (y.id === a.id ? { ...y, status: "پذیرفته" } : y.status === "رد شده" ? y : { ...y, status: "رد شده" })),
          }));
        }}
      />
      {closing && (
        <OutcomeModal
          open
          onClose={() => setClosing(false)}
          module="research"
          subjectId={sb.id}
          subjectTitle={sb.topic}
          entityIds={sb.entityId ? [sb.entityId] : []}
          trlBefore={sb.trlBefore}
          withTrl
          title="خاتمه‌ی فرصت مطالعاتی و ثبت نتیجه"
          onSaved={(o) => upd("فرصت مطالعاتی را خاتمه داد", (x) => ({ ...x, stage: "خاتمه", trlAfter: o.trlAfter ?? x.trlAfter }))}
        />
      )}
    </div>
  );
}

