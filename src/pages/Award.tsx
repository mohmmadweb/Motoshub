import ModuleReportsButton from "../reports/ModuleReportsButton";
import { useMemo, useState } from "react";
import { Trophy, Plus, CalendarRange, Gavel, Settings2, Award as AwardIcon, ShieldAlert, ShieldCheck, EyeOff, Printer, Pencil, ChevronLeft, Users, Wand2, ClipboardCheck, FileText } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Drawer from "../components/ui/Drawer";
import Tabs from "../components/ui/Tabs";
import Toggle from "../components/ui/Toggle";
import RowActions from "../components/ui/RowActions";
import EmptyState from "../components/ui/EmptyState";
import StatCard from "../components/ui/StatCard";
import { useToast } from "../components/ui/ToastProvider";
import { useConfirm } from "../components/ui/ConfirmProvider";
import { useTenancy } from "../context/TenancyContext";
import { useInnovation } from "../context/InnovationContext";
import { useSettings } from "../context/SettingsContext";
import { useTabParam } from "../lib/useTabParam";
import { users } from "../data/mock";
import type { AwardCycle, AwardEntryStatus, AwardEntryX, AwardPhase, JudgeAssignment } from "../innovation/types";
import { awardPhases } from "../innovation/types";
import { faN, mean, printHtml, stdev, uid, weighted } from "../innovation/util";
import { ActivityLogButton, DecisionModal, DecisionsOf, EntityLink, EntityPicker, Field, Info2, OutcomeModal, OutcomeSummary, Section, Stepper } from "./innovation/shared";
import { RubricEditor } from "./innovation/researchParts";
import { EligibilityResult, emptySubmission, FormAnswersView, FormDesignButton, FormFill, FormStatusBadge, useOwnerForm, type FormValue } from "./innovation/FormBuilder";
import { evaluateForm, type FormCheck } from "../innovation/forms";

// ---------------------------------------------------------------------------
// جایزه نوآوری و فناوری بنیاد — چرخه‌ی کامل: دوره و مراحل، ثبت‌نام و ارسال اثر با
// سقف ویرایش قابل تنظیم، تخصیص داور با اعلام تعارض منافع، معیارهای وزن‌دار،
// داوری کور، داوری اولیه/نهایی، اعلام نتایج با ثبت تصمیم و گواهی قابل چاپ.
// مجوزها: award.list / award.submit / award.judge / award.manage
// ---------------------------------------------------------------------------
const statusTone: Record<AwardEntryStatus, BadgeTone> = {
  "ثبت‌نام‌شده": "neutral",
  "ارسال‌شده": "brand",
  "راه‌یافته به نهایی": "navy",
  "حذف در داوری اولیه": "neutral",
  برگزیده: "success",
  تقدیرشده: "warning",
  "شرکت‌کننده": "neutral",
};

type TabId = "cycle" | "entries" | "judge" | "manage" | "results";
const roundOf = (phase: AwardPhase): "اولیه" | "نهایی" | null => (phase === "داوری اولیه" ? "اولیه" : phase === "داوری نهایی" ? "نهایی" : null);

function entryScore(assignments: JudgeAssignment[], entryId: string, cycle: AwardCycle, round?: "اولیه" | "نهایی") {
  const list = assignments.filter((a) => a.entryId === entryId && a.scores && a.coi === "ندارد" && (!round || a.round === round));
  const totals = list.map((a) => weighted(a.scores!, cycle.rubric));
  return { avg: mean(totals), sd: stdev(totals), count: list.length };
}
/** امتیاز مبنای رتبه: داوری نهایی اگر هست، وگرنه اولیه */
const bestScore = (as: JudgeAssignment[], e: AwardEntryX, c: AwardCycle) => {
  const f = entryScore(as, e.id, c, "نهایی");
  return e.override?.score ?? (f.count ? f : entryScore(as, e.id, c, "اولیه")).avg;
};

export default function Award() {
  const inn = useInnovation();
  const { hasPermission } = useTenancy();
  const visibleTabs = useMemo(() => {
    const t: { id: TabId; label: string }[] = [
      { id: "cycle", label: "دوره و زمان‌بندی" },
      { id: "entries", label: "آثار" },
    ];
    if (hasPermission("award.judge")) t.push({ id: "judge", label: "داوری من" });
    if (hasPermission("award.manage")) t.push({ id: "manage", label: "مدیریت داوری و تنظیمات" });
    t.push({ id: "results", label: "نتایج و گواهی" });
    return t;
  }, [hasPermission]);
  const [tab, setTab] = useTabParam<TabId>("cycle", visibleTabs.map((t) => t.id));
  const [cycleId, setCycleId] = useState(() => inn.awardCycles.find((c) => !c.closed)?.id ?? inn.awardCycles[0]?.id ?? "");
  const [newCycle, setNewCycle] = useState(false);
  const cycle = inn.awardCycles.find((c) => c.id === cycleId) ?? inn.awardCycles[0];

  return (
    <div>
      <PageHeader
        title="جایزه نوآوری و فناوری بنیاد"
        description="دوره‌های جایزه: ثبت‌نام، ارسال اثر، داوری اولیه و نهایی با معیارهای وزن‌دار، اعلام نتایج و گواهی"
        icon={<Trophy size={18} />}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ModuleReportsButton module="innovation" />
            <select value={cycle?.id ?? ""} onChange={(e) => setCycleId(e.target.value)} className="input-field w-auto max-w-[240px]">
              {inn.awardCycles.map((c) => <option key={c.id} value={c.id}>{c.title}{c.closed ? " (پایان‌یافته)" : ""}</option>)}
            </select>
            {hasPermission("award.manage") && <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setNewCycle(true)}>دوره جدید</Button>}
            <ActivityLogButton module="award" />
          </div>
        }
      />
      <Tabs tabs={visibleTabs} active={tab} onChange={setTab} />
      {!cycle ? (
        <div className="card"><EmptyState title="هنوز دوره‌ای تعریف نشده" /></div>
      ) : (
        <>
          {tab === "cycle" && <CycleTab cycle={cycle} />}
          {tab === "entries" && <EntriesTab cycle={cycle} />}
          {tab === "judge" && <JudgeTab cycle={cycle} />}
          {tab === "manage" && <ManageTab cycle={cycle} />}
          {tab === "results" && <ResultsTab cycle={cycle} />}
        </>
      )}
      {newCycle && <NewCycleModal onClose={() => setNewCycle(false)} onCreated={setCycleId} />}
    </div>
  );
}

// ---------------------------------------------------------------- دوره
function CycleTab({ cycle }: { cycle: AwardCycle }) {
  const inn = useInnovation();
  const { hasPermission } = useTenancy();
  const confirm = useConfirm();
  const [trackForm, setTrackForm] = useState<{ id?: string; title: string; categories: string } | null>(null);
  const tracks = inn.awardTracks.filter((t) => t.cycleId === cycle.id);
  const entries = inn.awardEntries.filter((e) => e.cycleId === cycle.id);
  const judged = entries.filter((e) => entryScore(inn.assignments, e.id, cycle).count > 0).length;
  const manage = hasPermission("award.manage");
  const saveTrack = () => {
    if (!trackForm?.title.trim()) return;
    const cats = trackForm.categories.split(/[،,]/).map((s) => s.trim()).filter(Boolean);
    const id = trackForm.id ?? uid("awt");
    inn.commit("award", trackForm.id ? "محور را ویرایش کرد" : "محور جدید تعریف کرد", { id, title: trackForm.title }, (s) => ({
      ...s,
      awardTracks: trackForm.id ? s.awardTracks.map((t) => (t.id === id ? { ...t, title: trackForm.title.trim(), categories: cats } : t)) : [...s.awardTracks, { id, cycleId: cycle.id, title: trackForm.title.trim(), categories: cats }],
    }));
    setTrackForm(null);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="آثار ثبت‌شده" value={faN(entries.length)} tone="brand" icon={<Trophy size={16} />} />
        <StatCard label="داوری‌شده" value={faN(judged)} tone="success" icon={<Gavel size={16} />} />
        <StatCard label="محورها" value={faN(tracks.length)} />
        <StatCard label="داوران" value={faN(cycle.judges.length)} tone="warning" icon={<Users size={16} />} hint={cycle.blind ? "داوری کور" : undefined} />
      </div>
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5"><CalendarRange size={15} className="text-brand-600" /> مراحل دوره</h3>
          <div className="flex items-center gap-1.5">
            {cycle.blind && <Badge tone="navy" icon={<EyeOff size={10} />}>داوری کور</Badge>}
            <Badge tone="neutral">سقف ویرایش هر اثر: {faN(cycle.editLimit)} بار</Badge>
          </div>
        </div>
        <Stepper steps={awardPhases} current={cycle.phase} />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {cycle.schedule.map((s) => (
            <div key={s.phase} className={`rounded-lg p-2 text-[11px] ${s.phase === cycle.phase ? "bg-brand-50 border border-brand-200" : "bg-ink-50"}`}>
              <p className="font-medium text-ink-800">{s.phase}</p>
              <p className="text-ink-400 mt-0.5">{s.start}{s.end !== s.start ? ` تا ${s.end}` : ""}</p>
            </div>
          ))}
        </div>
        {manage && !cycle.closed && <AdvancePhase cycle={cycle} />}
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-ink-900">محورهای دوره</h3>
          {manage && <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setTrackForm({ title: "", categories: "" })}>محور جدید</Button>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {tracks.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5"><Trophy size={14} className="text-amber-500" /> {t.title}</p>
                {manage && <RowActions size={13} onEdit={() => setTrackForm({ id: t.id, title: t.title, categories: t.categories.join("، ") })} onDelete={() => confirm({ title: `حذف محور «${t.title}»؟`, message: "آثار این محور حذف نمی‌شوند ولی بی‌محور می‌مانند.", onConfirm: () => inn.commit("award", "محور را حذف کرد", { id: t.id, title: t.title }, (s) => ({ ...s, awardTracks: s.awardTracks.filter((x) => x.id !== t.id) })) })} />}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mb-3">{t.categories.map((c) => <Badge key={c} tone="neutral">{c}</Badge>)}</div>
              <p className="text-xs text-ink-500 pt-2 border-t border-ink-100">{faN(entries.filter((e) => e.trackId === t.id).length)} اثر</p>
            </div>
          ))}
        </div>
      </div>
      {trackForm && (
        <Modal open onClose={() => setTrackForm(null)} title={trackForm.id ? "ویرایش محور" : "محور جدید"}>
          <div className="space-y-3">
            <Field label="عنوان محور" required><input value={trackForm.title} onChange={(e) => setTrackForm({ ...trackForm, title: e.target.value })} className="input-field" /></Field>
            <Field label="دسته‌ها" hint="با «،» جدا کنید"><input value={trackForm.categories} onChange={(e) => setTrackForm({ ...trackForm, categories: e.target.value })} className="input-field" /></Field>
            <Button variant="primary" className="w-full justify-center" onClick={saveTrack}>ذخیره</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AdvancePhase({ cycle }: { cycle: AwardCycle }) {
  const inn = useInnovation();
  const { notify } = useToast();
  const confirm = useConfirm();
  const next = awardPhases[awardPhases.indexOf(cycle.phase) + 1];
  if (!next) return null;
  const go = () =>
    confirm({
      title: `انتقال دوره به مرحله‌ی «${next}»؟`,
      message: next === "داوری نهایی" ? `در هر محور ${faN(cycle.finalistsPerTrack)} اثر برتر داوری اولیه به مرحله‌ی نهایی می‌روند و برای داوران همان آثار، داوری نهایی تخصیص می‌یابد.` : next === "داوری اولیه" ? "ثبت و ویرایش آثار بسته می‌شود. آثار ثبت‌نام‌شده‌ای که ارسال نشده‌اند از داوری کنار می‌مانند." : undefined,
      confirmLabel: "انتقال",
      onConfirm: () => {
        inn.commit("award", `دوره را به مرحله‌ی «${next}» برد`, { id: cycle.id, title: cycle.title }, (s) => {
          let entries = s.awardEntries;
          let assignments = s.assignments;
          if (next === "داوری نهایی") {
            const finalists = new Set<string>();
            s.awardTracks.filter((t) => t.cycleId === cycle.id).forEach((t) => {
              entries.filter((e) => e.cycleId === cycle.id && e.trackId === t.id && e.status === "ارسال‌شده")
                .map((e) => ({ e, sc: entryScore(s.assignments, e.id, cycle, "اولیه").avg ?? -1 }))
                .sort((a, b) => b.sc - a.sc)
                .slice(0, cycle.finalistsPerTrack)
                .forEach(({ e }) => finalists.add(e.id));
            });
            entries = entries.map((e) => (e.cycleId !== cycle.id || e.status !== "ارسال‌شده" ? e : { ...e, status: finalists.has(e.id) ? "راه‌یافته به نهایی" : "حذف در داوری اولیه" }));
            const finalAssign: JudgeAssignment[] = [];
            finalists.forEach((eid) => {
              const prev = s.assignments.filter((a) => a.entryId === eid && a.round === "اولیه" && a.coi !== "دارد");
              (prev.length ? prev.map((a) => a.judge) : cycle.judges.slice(0, 3)).forEach((j) => finalAssign.push({ id: uid("ja"), entryId: eid, judge: j, round: "نهایی", coi: "ندارد" }));
            });
            assignments = [...assignments, ...finalAssign];
          }
          return { ...s, awardEntries: entries, assignments, awardCycles: s.awardCycles.map((c) => (c.id === cycle.id ? { ...c, phase: next } : c)) };
        }, { to: cycle.judges, text: `دوره‌ی «${cycle.title}» وارد مرحله‌ی «${next}» شد.`, link: "/dashboard/award" });
        notify(`دوره به مرحله‌ی «${next}» رفت.`);
      },
    });
  return <Button size="sm" variant="primary" icon={<ChevronLeft size={13} />} onClick={go}>انتقال به «{next}»</Button>;
}

function NewCycleModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const inn = useInnovation();
  const { settings } = useSettings();
  const [title, setTitle] = useState("");
  const [copyTracks, setCopyTracks] = useState(true);
  const create = () => {
    if (!title.trim()) return;
    const id = uid("ac");
    const base = inn.awardCycles.find((c) => !c.closed) ?? inn.awardCycles[0];
    const cyc: AwardCycle = {
      id, title: title.trim(), phase: "ثبت‌نام", schedule: awardPhases.map((p) => ({ phase: p, start: "تعیین نشده", end: "تعیین نشده" })), blind: true,
      editLimit: settings.editWindowCount, finalistsPerTrack: 2, rubric: base?.rubric ?? [], judges: base?.judges ?? [], closed: false, createdAt: inn.today,
    };
    const tracks = copyTracks && base ? inn.awardTracks.filter((t) => t.cycleId === base.id).map((t) => ({ ...t, id: uid("awt"), cycleId: id })) : [];
    inn.commit("award", "دوره‌ی جدید جایزه تعریف کرد", { id, title: cyc.title }, (s) => ({ ...s, awardCycles: [cyc, ...s.awardCycles], awardTracks: [...s.awardTracks, ...tracks] }));
    onCreated(id);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="دوره‌ی جدید جایزه">
      <div className="space-y-3">
        <Field label="عنوان دوره" required><input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="جایزه نوآوری و فناوری ۱۴۰۶" /></Field>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={copyTracks} onChange={(e) => setCopyTracks(e.target.checked)} /> محورها، معیارها و داوران دوره‌ی جاری کپی شود</label>
        <p className="text-[11px] text-ink-400">سقف ویرایش از تنظیمات سامانه ({faN(settings.editWindowCount)} بار) برداشته می‌شود و در «مدیریت داوری و تنظیمات» قابل تغییر است.</p>
        <Button variant="primary" className="w-full justify-center" onClick={create}>ایجاد دوره</Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- آثار
type EntryForm = { id?: string; title: string; trackId: string; category: string; companyName: string; entityId?: string; techPartner: string; summary: string; benefits: string; attachments: string };

function EntriesTab({ cycle }: { cycle: AwardCycle }) {
  const inn = useInnovation();
  const { hasPermission, actingUser, holdings, companies } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState<EntryForm | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [trackFilter, setTrackFilter] = useState("همه");
  const cycleForm = useOwnerForm("award", cycle.id);
  const [fv, setFv] = useState<FormValue>(() => emptySubmission(cycleForm));
  const [fcheck, setFcheck] = useState<FormCheck | null>(null);
  const tracks = inn.awardTracks.filter((t) => t.cycleId === cycle.id);
  const entries = inn.awardEntries.filter((e) => e.cycleId === cycle.id && (trackFilter === "همه" || e.trackId === trackFilter));
  const open = openId ? inn.awardEntries.find((e) => e.id === openId) : undefined;
  const canSubmitPhase = !cycle.closed && (cycle.phase === "ثبت‌نام" || cycle.phase === "ارسال اثر");
  const manage = hasPermission("award.manage");
  const canEditEntry = (e: AwardEntryX) => canSubmitPhase && (manage || e.submitter === actingUser.name || hasPermission("award.submit"));

  const startEdit = (e: AwardEntryX) => {
    if (e.status !== "ثبت‌نام‌شده" && e.editsUsed >= cycle.editLimit) {
      notify(`سقف ویرایش این اثر (${faN(cycle.editLimit)} بار) مصرف شده است.`, "warning");
      return;
    }
    const partner = e.entityId ? inn.entityById(e.entityId)?.name ?? "" : "";
    setForm({ id: e.id, title: e.title, trackId: e.trackId, category: e.category, companyName: e.companyName, entityId: e.entityId, techPartner: partner, summary: e.summary, benefits: e.benefits, attachments: e.attachments.join("، ") });
    setFv(e.form ? { answers: e.form.answers, refs: e.form.refs } : emptySubmission(cycleForm));
    setFcheck(null);
  };

  const save = (send: boolean) => {
    if (!form || !form.title.trim() || !form.companyName.trim() || !form.trackId) return notify("عنوان، محور و شرکت الزامی است.", "warning");
    if (send && (!form.summary.trim() || !form.benefits.trim())) return notify("برای ارسال اثر، شرح و نتایج کمّی الزامی است.", "warning");
    // فرم سفارشی دوره: فیلدهای الزامی و شرایط احراز هنگام ثبت سنجیده می‌شوند
    let formSub: AwardEntryX["form"];
    let formEntity: string | undefined;
    if (cycleForm) {
      const c = evaluateForm(cycleForm, fv, inn.entities);
      setFcheck(c);
      if (c.missing.length || !c.eligible) return notify(c.missing.length ? "فیلدهای الزامی فرم دوره تکمیل نشده است." : "شرایط شرکت در این دوره احراز نشد — دلایل در پایین فرم آمده است.", "warning");
      formSub = { formId: cycleForm.id, answers: fv.answers, refs: fv.refs, eligible: true, reasons: [], at: inn.stamp() };
      formEntity = Object.values(fv.refs)[0];
    }
    const holdingId = companies.find((c) => c.name === form.companyName.trim())?.holdingId;
    const patch = { form: formSub, title: form.title.trim(), trackId: form.trackId, category: form.category, companyName: form.companyName.trim(), entityId: form.entityId ?? formEntity, holdingId, summary: form.summary.trim(), benefits: form.benefits.trim(), attachments: form.attachments.split(/[،,]/).map((s) => s.trim()).filter(Boolean) };
    if (form.id) {
      const prev = inn.awardEntries.find((e) => e.id === form.id)!;
      const counts = prev.status !== "ثبت‌نام‌شده";
      inn.commit("award", counts ? `اثر را ویرایش کرد (سهمیه ${faN(prev.editsUsed + 1)} از ${faN(cycle.editLimit)})` : send ? "اثر را ارسال کرد" : "اثر را ویرایش کرد", { id: form.id, title: patch.title }, (s) => ({
        ...s, awardEntries: s.awardEntries.map((e) => (e.id === form.id ? { ...e, ...patch, status: send ? "ارسال‌شده" : e.status, editsUsed: counts ? e.editsUsed + 1 : e.editsUsed } : e)),
      }));
      notify(counts ? `اثر ویرایش شد — ${faN(cycle.editLimit - prev.editsUsed - 1)} ویرایش باقی مانده است.` : send ? "اثر ارسال شد." : "تغییرات ذخیره شد.");
    } else {
      const id = uid("ae");
      const e: AwardEntryX = { id, cycleId: cycle.id, ...patch, submitter: actingUser.name, status: send ? "ارسال‌شده" : "ثبت‌نام‌شده", editsUsed: 0, createdAt: inn.today };
      inn.commit("award", send ? "اثر جدید ارسال کرد" : "در جایزه ثبت‌نام کرد", { id, title: e.title }, (s) => ({ ...s, awardEntries: [e, ...s.awardEntries] }));
      notify(send ? "اثر ثبت و ارسال شد." : "ثبت‌نام انجام شد؛ در مرحله‌ی «ارسال اثر» مستندات را تکمیل کنید.");
    }
    setForm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <select value={trackFilter} onChange={(e) => setTrackFilter(e.target.value)} className="input-field w-auto">
          <option value="همه">همه‌ی محورها</option>
          {tracks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        {hasPermission("award.submit") && (
          <Button variant="primary" size="sm" icon={<Plus size={14} />} disabled={!canSubmitPhase} title={canSubmitPhase ? "" : "ثبت اثر فقط در مراحل ثبت‌نام و ارسال اثر ممکن است"} onClick={() => { setFv(emptySubmission(cycleForm)); setFcheck(null); setForm({ title: "", trackId: tracks[0]?.id ?? "", category: tracks[0]?.categories[0] ?? "", companyName: "", techPartner: "", summary: "", benefits: "", attachments: "" }); }}>
            {cycle.phase === "ثبت‌نام" ? "ثبت‌نام اثر" : "ثبت اثر"}
          </Button>
        )}
      </div>
      {!canSubmitPhase && <p className="text-[11px] text-ink-400">دوره در مرحله‌ی «{cycle.phase}» است؛ ثبت و ویرایش آثار بسته است.</p>}
      <div className="card divide-y divide-ink-100">
        {entries.length === 0 && <EmptyState title="هنوز اثری ثبت نشده" />}
        {entries.map((e) => {
          const sc = entryScore(inn.assignments, e.id, cycle);
          return (
            <div key={e.id} className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
              <button onClick={() => setOpenId(e.id)} className="min-w-0 text-right">
                <p className="text-sm font-medium text-ink-900 hover:text-brand-700">{e.title}</p>
                <p className="text-xs text-ink-400 mt-0.5">{tracks.find((t) => t.id === e.trackId)?.title} · {e.companyName}{e.holdingId ? ` (${holdings.find((h) => h.id === e.holdingId)?.name})` : ""}</p>
              </button>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {manage && sc.avg !== undefined && <Badge tone="navy">میانگین {faN(sc.avg, 1)}</Badge>}
                <FormStatusBadge sub={e.form} />
                {e.status !== "ثبت‌نام‌شده" && <Badge tone={e.editsUsed >= cycle.editLimit ? "neutral" : "brand"}>ویرایش {faN(e.editsUsed)}/{faN(cycle.editLimit)}</Badge>}
                <Badge tone={statusTone[e.status]}>{e.status}</Badge>
                {canEditEntry(e) && <RowActions onEdit={() => startEdit(e)} onDelete={manage || e.submitter === actingUser.name ? () => confirm({ title: `انصراف و حذف اثر «${e.title}»؟`, onConfirm: () => inn.commit("award", "اثر را حذف کرد", { id: e.id, title: e.title }, (s) => ({ ...s, awardEntries: s.awardEntries.filter((x) => x.id !== e.id), assignments: s.assignments.filter((a) => a.entryId !== e.id) })) }) : undefined} />}
              </div>
            </div>
          );
        })}
      </div>

      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "ویرایش اثر" : cycle.phase === "ثبت‌نام" ? "ثبت‌نام اثر" : "ثبت و ارسال اثر"} description={form.id ? `سقف ویرایش پس از ارسال: ${faN(cycle.editLimit)} بار (تنظیم‌پذیر)` : undefined} width="max-w-xl">
          <div className="space-y-3">
            <Field label="عنوان اثر" required><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="محور" required><select value={form.trackId} onChange={(e) => setForm({ ...form, trackId: e.target.value, category: tracks.find((t) => t.id === e.target.value)?.categories[0] ?? "" })} className="input-field">{tracks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></Field>
              <Field label="دسته"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">{(tracks.find((t) => t.id === form.trackId)?.categories ?? []).map((c) => <option key={c}>{c}</option>)}</select></Field>
            </div>
            <Field label="شرکت معرفی‌کننده (زیرمجموعه)" required>
              <select value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="input-field">
                <option value="">انتخاب…</option>
                {companies.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="شرکت فناور / همکار (از بانک)"><EntityPicker name={form.techPartner} onChange={(n, id) => setForm({ ...form, techPartner: n, entityId: id })} placeholder="اختیاری" /></Field>
            <Field label="شرح مسئله و راه‌حل" required={cycle.phase === "ارسال اثر"}><textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} className="input-field" /></Field>
            <Field label="نتایج کمّی (صرفه‌جویی ریالی، کاهش زمان…)" required={cycle.phase === "ارسال اثر"}><input value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} className="input-field" /></Field>
            <Field label="پیوست‌ها" hint="نام فایل‌ها با «،» — مستندات، تأییدیه‌ی مدیرعامل، ویدئو"><input value={form.attachments} onChange={(e) => setForm({ ...form, attachments: e.target.value })} className="input-field" /></Field>
            {cycleForm && (
              <div className="border-t border-ink-100 pt-3 space-y-3">
                <p className="text-xs font-bold text-ink-900">{cycleForm.title}</p>
                <FormFill def={cycleForm} value={fv} onChange={(v) => { setFv(v); setFcheck(null); }} missing={fcheck?.missing} />
                {fcheck && <EligibilityResult def={cycleForm} check={fcheck} />}
              </div>
            )}
            <div className="flex gap-2">
              {cycle.phase === "ارسال اثر" && <Button variant="primary" className="flex-1 justify-center" onClick={() => save(true)}>ارسال اثر</Button>}
              <Button variant={cycle.phase === "ارسال اثر" ? "secondary" : "primary"} className={cycle.phase === "ارسال اثر" ? "" : "flex-1 justify-center"} onClick={() => save(false)}>{form.id ? "ذخیره" : "ثبت‌نام"}</Button>
            </div>
          </div>
        </Modal>
      )}
      <Drawer open={!!open} onClose={() => setOpenId(null)} title="پرونده اثر" width="max-w-xl">
        {open && <EntryFile e={open} cycle={cycle} />}
      </Drawer>
    </div>
  );
}

function EntryFile({ e, cycle }: { e: AwardEntryX; cycle: AwardCycle }) {
  const inn = useInnovation();
  const { hasPermission } = useTenancy();
  const manage = hasPermission("award.manage");
  const track = inn.awardTracks.find((t) => t.id === e.trackId);
  const reviews = inn.assignments.filter((a) => a.entryId === e.id);
  const showFeedback = manage || cycle.phase === "اعلام نتایج";
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold text-ink-900 leading-6">{e.title}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap"><Badge tone={statusTone[e.status]}>{e.status}</Badge><Badge tone="neutral">{track?.title}</Badge>{e.category && <Badge tone="neutral">{e.category}</Badge>}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Info2 label="شرکت معرفی‌کننده" value={e.companyName} />
        <Info2 label="فناور همکار" value={e.entityId ? <EntityLink id={e.entityId} name={inn.entityById(e.entityId)?.name ?? "—"} /> : "—"} />
        <Info2 label="ثبت‌کننده" value={e.submitter} />
        <Info2 label="ویرایش مصرف‌شده" value={`${faN(e.editsUsed)} از ${faN(cycle.editLimit)}`} />
      </div>
      {e.summary && <Section title="شرح"><p className="text-xs text-ink-600 leading-6">{e.summary}</p></Section>}
      {e.benefits && <Section title="نتایج کمّی"><p className="text-xs text-ink-600">{e.benefits}</p></Section>}
      {e.form && <Section title="فرم تکمیلی دوره" icon={<FileText size={13} />}><EntryFormAnswers e={e} /></Section>}
      {e.attachments.length > 0 && <Section title="پیوست‌ها" icon={<FileText size={13} />}><div className="flex flex-wrap gap-1.5">{e.attachments.map((a) => <Badge key={a} tone="neutral">{a}</Badge>)}</div></Section>}
      {showFeedback && reviews.some((r) => r.scores) && (
        <Section title={manage ? "داوری‌ها" : "بازخورد داوران (بدون نام)"} icon={<Gavel size={13} />}>
          <div className="space-y-1.5">
            {reviews.filter((r) => r.scores).map((r, i) => (
              <div key={r.id} className="text-[11.5px] bg-ink-50 rounded-lg p-2">
                <p className="text-ink-700">{manage ? r.judge : `داور ${faN(i + 1)}`} · داوری {r.round}: <span className="font-bold">{faN(weighted(r.scores!, cycle.rubric), 1)}</span></p>
                {r.comment && <p className="text-ink-500 mt-0.5">{r.comment}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}
      {e.certificateNo && <p className="text-xs text-emerald-700">گواهی صادرشده: {e.certificateNo}</p>}
      <OutcomeSummary module="award" subjectId={e.id} />
    </div>
  );
}

// ---------------------------------------------------------------- داوری من
function JudgeTab({ cycle }: { cycle: AwardCycle }) {
  const inn = useInnovation();
  const { actingUser } = useTenancy();
  const { notify } = useToast();
  const round = roundOf(cycle.phase);
  const mine = inn.assignments.filter((a) => a.judge === actingUser.name && inn.awardEntries.some((e) => e.id === a.entryId && e.cycleId === cycle.id));
  const [coiFor, setCoiFor] = useState<JudgeAssignment | null>(null);
  const [coiReason, setCoiReason] = useState("");
  const [scoring, setScoring] = useState<JudgeAssignment | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [comment, setComment] = useState("");
  const updA = (id: string, action: string, patch: Partial<JudgeAssignment>, title: string) => inn.commit("award", action, { id, title }, (s) => ({ ...s, assignments: s.assignments.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  const entryOf = (a: JudgeAssignment) => inn.awardEntries.find((e) => e.id === a.entryId)!;

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-500 leading-6">
        {round ? `مرحله‌ی داوری ${round}. پیش از دیدن پرونده، اعلام کنید با شرکت صاحب اثر تعارض منافع ندارید.` : `دوره در مرحله‌ی «${cycle.phase}» است؛ امتیازدهی فقط در مراحل داوری فعال است.`}
        {cycle.blind && " این دوره «داوری کور» است و نام شرکت‌ها نمایش داده نمی‌شود."}
      </p>
      <div className="card divide-y divide-ink-100">
        {mine.length === 0 && <EmptyState title="اثری به شما تخصیص داده نشده" description="مدیر جایزه از تب «مدیریت داوری» آثار را تخصیص می‌دهد." />}
        {mine.map((a) => {
          const e = entryOf(a);
          const active = round === a.round;
          return (
            <div key={a.id} className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">{a.coi === "ندارد" ? e.title : "اثر محرمانه (پیش از اعلام تعارض منافع)"}</p>
                <p className="text-xs text-ink-400 mt-0.5">داوری {a.round} · {inn.awardTracks.find((t) => t.id === e.trackId)?.title} · {cycle.blind ? "شرکت: محرمانه" : e.companyName}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {a.coi === "دارد" && <Badge tone="danger" icon={<ShieldAlert size={10} />}>تعارض منافع</Badge>}
                {a.scores && <Badge tone="success">امتیاز {faN(weighted(a.scores, cycle.rubric), 1)}</Badge>}
                {active && a.coi === "اعلام‌نشده" && (
                  <>
                    <Button size="sm" variant="primary" icon={<ShieldCheck size={12} />} onClick={() => { updA(a.id, "عدم تعارض منافع و رازداری را تأیید کرد", { coi: "ندارد" }, e.title); }}>تعارض ندارم</Button>
                    <Button size="sm" variant="ghost" icon={<ShieldAlert size={12} />} onClick={() => { setCoiFor(a); setCoiReason(""); }}>تعارض دارم</Button>
                  </>
                )}
                {active && a.coi === "ندارد" && <Button size="sm" variant={a.scores ? "secondary" : "primary"} icon={<Gavel size={12} />} onClick={() => { setScoring(a); setScores(a.scores ?? cycle.rubric.map(() => 7)); setComment(a.comment ?? ""); }}>{a.scores ? "ویرایش امتیاز" : "امتیازدهی"}</Button>}
              </div>
            </div>
          );
        })}
      </div>
      {coiFor && (
        <Modal open onClose={() => setCoiFor(null)} title="اعلام تعارض منافع">
          <div className="space-y-3">
            <Field label="نوع ارتباط" required><textarea value={coiReason} onChange={(e) => setCoiReason(e.target.value)} rows={2} className="input-field" placeholder="مثلاً: عضو هیئت مدیره‌ی شرکت معرفی‌کننده" /></Field>
            <Button variant="danger" className="w-full justify-center" onClick={() => { if (!coiReason.trim()) return; updA(coiFor.id, "تعارض منافع اعلام کرد", { coi: "دارد", coiReason: coiReason.trim() }, entryOf(coiFor).title); inn.commit("award", "اعلام تعارض به مدیر جایزه ارسال شد", undefined, (s) => s, { to: ["پایگاه اطلاع‌رسانی بنیاد"], text: `داور «${actingUser.name}» برای یک اثر تعارض منافع اعلام کرد؛ داور جایگزین تخصیص دهید.`, link: "/dashboard/award?tab=manage" }); setCoiFor(null); notify("اعلام شد؛ این اثر از کارتابل داوری شما خارج و به مدیر اطلاع داده شد.", "info"); }}>ثبت تعارض منافع</Button>
          </div>
        </Modal>
      )}
      {scoring && (
        <Modal open onClose={() => setScoring(null)} title="فرم امتیازدهی" description={entryOf(scoring).title}>
          <div className="space-y-3">
            {cycle.rubric.map((r, i) => (
              <div key={r.id}>
                <div className="flex items-center justify-between text-xs mb-1"><span className="text-ink-700">{r.criterion} <span className="text-ink-400">(وزن {faN(r.weight)})</span></span><span className="font-bold">{faN(scores[i])} / ۱۰</span></div>
                <input type="range" min={0} max={10} step={0.5} value={scores[i] ?? 0} onChange={(e) => setScores((s) => s.map((x, j) => (j === i ? Number(e.target.value) : x)))} className="w-full accent-brand-600" />
              </div>
            ))}
            <Field label="نظر برای شرکت‌کننده"><textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="input-field" /></Field>
            <div className="flex items-center justify-between text-xs bg-ink-50 rounded-lg p-2.5"><span className="text-ink-500">امتیاز وزنی</span><span className="font-bold">{faN(weighted(scores, cycle.rubric), 1)} از ۱۰۰</span></div>
            <Button variant="primary" className="w-full justify-center" onClick={() => { updA(scoring.id, "امتیاز اثر را ثبت کرد", { scores, comment: comment.trim(), at: inn.stamp() }, entryOf(scoring).title); setScoring(null); notify("امتیاز ثبت شد."); }}>ثبت امتیاز</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- مدیریت
function ManageTab({ cycle }: { cycle: AwardCycle }) {
  const inn = useInnovation();
  const { settings } = useSettings();
  const { notify } = useToast();
  const [rubric, setRubric] = useState(cycle.rubric);
  const [addJudge, setAddJudge] = useState("");
  const round = roundOf(cycle.phase) ?? "اولیه";
  const entries = inn.awardEntries.filter((e) => e.cycleId === cycle.id && (round === "نهایی" ? e.status === "راه‌یافته به نهایی" : e.status === "ارسال‌شده"));
  const setCycle = (action: string, patch: Partial<AwardCycle>) => inn.commit("award", action, { id: cycle.id, title: cycle.title }, (s) => ({ ...s, awardCycles: s.awardCycles.map((c) => (c.id === cycle.id ? { ...c, ...patch } : c)) }));
  const cell = (entryId: string, judge: string) => inn.assignments.find((a) => a.entryId === entryId && a.judge === judge && a.round === round);
  const toggle = (entryId: string, judge: string) => {
    const a = cell(entryId, judge);
    const title = inn.awardEntries.find((e) => e.id === entryId)?.title ?? "";
    if (a?.coi === "دارد") return notify("این داور برای این اثر تعارض منافع اعلام کرده است.", "warning");
    if (a?.scores) return notify("داوری انجام شده و قابل حذف نیست.", "warning");
    if (a) inn.commit("award", `تخصیص «${judge}» را لغو کرد`, { id: entryId, title }, (s) => ({ ...s, assignments: s.assignments.filter((x) => x.id !== a.id) }));
    else inn.commit("award", `اثر را به «${judge}» تخصیص داد`, { id: entryId, title }, (s) => ({ ...s, assignments: [...s.assignments, { id: uid("ja"), entryId, judge, round, coi: "اعلام‌نشده" }] }), { to: [judge], text: `یک اثر از «${cycle.title}» برای داوری ${round} به شما تخصیص یافت.`, link: "/dashboard/award?tab=judge" });
  };
  const autoAssign = () => {
    const load = new Map(cycle.judges.map((j) => [j, inn.assignments.filter((a) => a.judge === j && a.round === round).length]));
    const fresh: JudgeAssignment[] = [];
    entries.forEach((e) => {
      const have = inn.assignments.filter((a) => a.entryId === e.id && a.round === round);
      const ok = have.filter((a) => a.coi !== "دارد").length;
      const cands = cycle.judges.filter((j) => !have.some((a) => a.judge === j)).sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0));
      cands.slice(0, Math.max(0, 3 - ok)).forEach((j) => {
        fresh.push({ id: uid("ja"), entryId: e.id, judge: j, round, coi: "اعلام‌نشده" });
        load.set(j, (load.get(j) ?? 0) + 1);
      });
    });
    if (!fresh.length) return notify("همه‌ی آثار حداقل ۳ داور بدون تعارض دارند.", "info");
    inn.commit("award", `${faN(fresh.length)} تخصیص داوری خودکار (حداقل ۳ داور، توازن بار) انجام داد`, { id: cycle.id, title: cycle.title }, (s) => ({ ...s, assignments: [...s.assignments, ...fresh] }), { to: [...new Set(fresh.map((f) => f.judge))], text: `آثار جدید برای داوری ${round} به شما تخصیص یافت.`, link: "/dashboard/award?tab=judge" });
    notify(`${faN(fresh.length)} تخصیص انجام شد.`);
  };

  return (
    <div className="space-y-5">
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5"><Settings2 size={15} className="text-brand-600" /> تنظیمات دوره</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center gap-2 text-xs text-ink-700"><Toggle on={cycle.blind} onChange={() => setCycle(cycle.blind ? "داوری کور را غیرفعال کرد" : "داوری کور را فعال کرد", { blind: !cycle.blind })} label="داوری کور" /> داوری کور (نام شرکت برای داور پنهان)</label>
          <Field label="سقف ویرایش هر اثر پس از ارسال" hint={`پیش‌فرض تنظیمات سامانه: ${faN(settings.editWindowCount)} بار`}>
            <select value={cycle.editLimit} onChange={(e) => setCycle(`سقف ویرایش را ${faN(Number(e.target.value))} بار کرد`, { editLimit: Number(e.target.value) })} className="input-field">{[0, 1, 2, 3, 5].map((n) => <option key={n} value={n}>{faN(n)} بار</option>)}</select>
          </Field>
          <Field label="راه‌یافتگان نهایی در هر محور">
            <select value={cycle.finalistsPerTrack} onChange={(e) => setCycle("تعداد راه‌یافتگان را تغییر داد", { finalistsPerTrack: Number(e.target.value) })} className="input-field">{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{faN(n)}</option>)}</select>
          </Field>
        </div>
        <Field label="معیارهای امتیازدهی (معیار × وزن)">
          <RubricEditor value={rubric} onChange={setRubric} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setCycle("معیارهای داوری را به‌روز کرد", { rubric }); notify("معیارها ذخیره شد."); }}>ذخیره‌ی معیارها</Button>
          <FormDesignButton kind="award" ownerId={cycle.id} ownerTitle={cycle.title} />
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5"><Users size={15} className="text-brand-600" /> داوران و تخصیص — داوری {round}</h3>
          <Button size="sm" variant="primary" icon={<Wand2 size={13} />} onClick={autoAssign}>تخصیص خودکار (۳ داور برای هر اثر)</Button>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          {cycle.judges.map((j) => (
            <span key={j} className="text-[11px] px-2 py-0.5 rounded-full bg-ink-100 text-ink-700 flex items-center gap-1">{j}<button onClick={() => setCycle(`«${j}» را از داوران حذف کرد`, { judges: cycle.judges.filter((x) => x !== j) })} className="text-ink-400 hover:text-rose-600">×</button></span>
          ))}
          <select value={addJudge} onChange={(e) => setAddJudge(e.target.value)} className="input-field w-auto text-xs"><option value="">افزودن داور…</option>{users.filter((u) => !cycle.judges.includes(u.name)).map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}</select>
          <Button size="sm" variant="ghost" onClick={() => { if (addJudge) { setCycle(`«${addJudge}» را به داوران افزود`, { judges: [...cycle.judges, addJudge] }); setAddJudge(""); } }}>افزودن</Button>
        </div>
        {entries.length === 0 ? <p className="text-xs text-ink-400">اثری برای داوری {round} وجود ندارد.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] min-w-[560px]">
              <thead><tr className="text-ink-400 text-right"><th className="font-medium pb-2">اثر</th>{cycle.judges.map((j) => <th key={j} className="font-medium pb-2 text-center">{j.split(" ").slice(-1)[0]}</th>)}<th className="font-medium pb-2 text-center">میانگین</th></tr></thead>
              <tbody>
                {entries.map((e) => {
                  const sc = entryScore(inn.assignments, e.id, cycle, round);
                  return (
                    <tr key={e.id} className="border-t border-ink-100">
                      <td className="py-1.5 text-ink-800 max-w-[200px] truncate">{e.title}</td>
                      {cycle.judges.map((j) => {
                        const a = cell(e.id, j);
                        const label = !a ? "—" : a.coi === "دارد" ? "تعارض" : a.scores ? faN(weighted(a.scores, cycle.rubric), 0) : a.coi === "ندارد" ? "در انتظار" : "تخصیص";
                        return (
                          <td key={j} className="py-1.5 text-center">
                            <button onClick={() => toggle(e.id, j)} title={a?.coiReason} className={`px-2 py-0.5 rounded-md text-[10.5px] ${!a ? "text-ink-300 hover:bg-ink-100" : a.coi === "دارد" ? "bg-ink-100 text-ink-400 line-through cursor-not-allowed" : a.scores ? "bg-emerald-50 text-emerald-700" : "bg-brand-50 text-brand-700"}`}>{label}</button>
                          </td>
                        );
                      })}
                      <td className="py-1.5 text-center font-bold">{sc.avg !== undefined ? faN(sc.avg, 1) : "—"}{sc.sd > 12 && <span className="text-amber-600" title="اختلاف زیاد داوران"> ⚠</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-[10.5px] text-ink-400 mt-2">روی هر خانه بزنید تا تخصیص داده یا لغو شود. داور دارای تعارض منافع قابل تخصیص نیست. ⚠ = انحراف معیار بیش از ۱۲ بین داوران.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- نتایج
function ResultsTab({ cycle }: { cycle: AwardCycle }) {
  const inn = useInnovation();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const manage = hasPermission("award.manage");
  const [deciding, setDeciding] = useState<string | null>(null);
  const [outcomeFor, setOutcomeFor] = useState<AwardEntryX | null>(null);
  const tracks = inn.awardTracks.filter((t) => t.cycleId === cycle.id);
  const announced = cycle.phase === "اعلام نتایج";
  const rankedOf = (trackId: string) =>
    inn.awardEntries
      .filter((e) => e.cycleId === cycle.id && e.trackId === trackId && e.status !== "ثبت‌نام‌شده")
      .map((e) => ({ e, score: bestScore(inn.assignments, e, cycle), sd: entryScore(inn.assignments, e.id, cycle).sd }))
      .sort((a, b) => (a.e.rank ?? 99) - (b.e.rank ?? 99) || (b.score ?? -1) - (a.score ?? -1));

  const announce = (trackId: string, winnerId: string) => {
    const ranked = rankedOf(trackId).filter((x) => x.e.status === "راه‌یافته به نهایی" || x.e.status === "ارسال‌شده" || x.e.status === "برگزیده" || x.e.status === "تقدیرشده").sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    const order = [ranked.find((x) => x.e.id === winnerId)!, ...ranked.filter((x) => x.e.id !== winnerId)];
    const yr = cycle.title.match(/[۰-۹]{4}/)?.[0] ?? "";
    let n = inn.awardEntries.filter((e) => e.certificateNo).length;
    inn.commit("award", "برگزیدگان محور را اعلام و گواهی صادر کرد", { id: `${cycle.id}:${trackId}`, title: tracks.find((t) => t.id === trackId)?.title ?? "" }, (s) => ({
      ...s,
      awardEntries: s.awardEntries.map((e) => {
        const i = order.findIndex((x) => x.e.id === e.id);
        if (i < 0) return e.cycleId === cycle.id && e.trackId === trackId && e.status === "حذف در داوری اولیه" ? { ...e, status: "شرکت‌کننده" } : e;
        const status: AwardEntryStatus = i === 0 ? "برگزیده" : i <= 2 ? "تقدیرشده" : "شرکت‌کننده";
        return { ...e, status, rank: i + 1, certificateNo: status === "شرکت‌کننده" ? undefined : e.certificateNo ?? `AW-${yr}-${String(++n).padStart(4, "0")}` };
      }),
    }), { to: "*", text: `نتایج «${cycle.title}» در محور «${tracks.find((t) => t.id === trackId)?.title}» اعلام شد.`, link: "/dashboard/award?tab=results" });
    notify("نتایج اعلام شد و گواهی‌ها صادر شد.", "success");
  };

  const printCert = (e: AwardEntryX) => {
    const t = tracks.find((x) => x.id === e.trackId);
    const ok = printHtml(`گواهی ${e.certificateNo}`, `<div class="cert"><h1>${cycle.title}</h1><p>بدین‌وسیله گواهی می‌شود اثر</p><div class="name">«${e.title}»</div><p>از شرکت ${e.companyName} در محور «${t?.title ?? ""}» به‌عنوان <b>${e.status}</b>${e.rank ? ` (رتبه‌ی ${e.rank.toLocaleString("fa-IR")})` : ""} شناخته شد.</p><div class="meta"><span>شماره گواهی: ${e.certificateNo}</span><span class="sign">دبیرخانه‌ی جایزه نوآوری و فناوری</span><span>تاریخ: ${inn.today}</span></div></div>`);
    if (!ok) notify("پنجره‌ی چاپ مسدود شد؛ اجازه‌ی پاپ‌آپ را بدهید.", "warning");
  };

  return (
    <div className="space-y-4">
      {!announced && <p className="text-xs text-ink-500">رتبه‌بندی موقت بر اساس میانگین وزنی داوری‌ها؛ اعلام نهایی در مرحله‌ی «اعلام نتایج» با ثبت تصمیم انجام می‌شود.</p>}
      {tracks.map((t) => {
        const list = rankedOf(t.id);
        const done = list.some((x) => x.e.status === "برگزیده");
        return (
          <div key={t.id} className="card p-4">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5"><Trophy size={14} className="text-amber-500" /> {t.title}</h3>
              {manage && announced && !done && list.length > 0 && <Button size="sm" variant="primary" icon={<Gavel size={12} />} onClick={() => setDeciding(t.id)}>اعلام برگزیده</Button>}
            </div>
            {list.length === 0 ? <p className="text-xs text-ink-400">اثری در این محور نیست.</p> : (
              <div className="space-y-1.5">
                {list.map(({ e, score, sd }, i) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 text-xs bg-ink-50 rounded-lg p-2.5 flex-wrap">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${e.rank === 1 ? "bg-amber-100 text-amber-700" : "bg-ink-100 text-ink-500"}`}>{faN(e.rank ?? i + 1)}</span>
                      <span className="truncate text-ink-800">{e.title} <span className="text-ink-400">· {e.companyName}</span></span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {score !== undefined && <Badge tone="navy">{faN(score, 1)}</Badge>}
                      {sd > 12 && <Badge tone="warning">اختلاف داوران</Badge>}
                      <Badge tone={statusTone[e.status]}>{e.status}</Badge>
                      {e.certificateNo && <Button size="sm" variant="ghost" icon={<Printer size={12} />} onClick={() => printCert(e)}>گواهی</Button>}
                      {manage && e.certificateNo && <Button size="sm" variant="ghost" icon={<ClipboardCheck size={12} />} onClick={() => setOutcomeFor(e)}>پیگیری</Button>}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2"><DecisionsOf subjectId={`${cycle.id}:${t.id}`} /></div>
          </div>
        );
      })}
      {inn.awardEntries.some((e) => e.cycleId === cycle.id && inn.outcomes.some((o) => o.subjectId === e.id)) && (
        <Section title="پیگیری پس از جایزه (نتیجه‌ی واقعی)" icon={<AwardIcon size={13} />}>
          <div className="space-y-2">{inn.awardEntries.filter((e) => e.cycleId === cycle.id).map((e) => <OutcomeSummary key={e.id} module="award" subjectId={e.id} />)}</div>
        </Section>
      )}
      {deciding && (
        <DecisionModal
          open
          onClose={() => setDeciding(null)}
          module="award"
          subjectId={`${cycle.id}:${deciding}`}
          subjectTitle={`${cycle.title} — ${tracks.find((t) => t.id === deciding)?.title}`}
          question="اعلام برگزیده‌ی محور"
          committee="شورای سیاست‌گذاری جایزه"
          options={rankedOf(deciding).filter((x) => x.e.status !== "حذف در داوری اولیه").sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).map((x, i) => ({ id: x.e.id, label: x.e.title, score: x.score, rank: i + 1, entityId: x.e.entityId }))}
          confirmLabel="اعلام نتایج و صدور گواهی"
          onDecided={(o) => announce(deciding, o.id)}
        />
      )}
      {outcomeFor && (
        <OutcomeModal open onClose={() => setOutcomeFor(null)} module="award" subjectId={outcomeFor.id} subjectTitle={outcomeFor.title} entityIds={outcomeFor.entityId ? [outcomeFor.entityId] : []} title="پیگیری پس از جایزه — نتیجه‌ی واقعی (اجرا/تعمیم)" />
      )}
      <p className="text-[10.5px] text-ink-400 flex items-center gap-1"><Pencil size={11} /> گواهی‌ها قابل چاپ‌اند؛ بازخورد داوران پس از اعلام نتایج بدون نام داور به شرکت‌کننده نمایش داده می‌شود.</p>
    </div>
  );
}

function EntryFormAnswers({ e }: { e: AwardEntryX }) {
  const inn = useInnovation();
  if (!e.form) return null;
  const def = inn.forms?.find((f) => f.id === e.form!.formId);
  return def ? <FormAnswersView def={def} sub={e.form} /> : <p className="text-[11px] text-ink-400">تعریف فرم حذف شده است.</p>;
}
