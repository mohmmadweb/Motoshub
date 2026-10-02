import { useMemo, useState } from "react";
import { Gavel, Plus, Search, ScrollText, ShieldCheck, PenLine, Link2, Download } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import RowActions from "../../components/ui/RowActions";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { dayNum, fa } from "../../pm/jalali";
import type { DecisionLink, DecisionRecord } from "../../pm/types";
import { contracts, funds, researchOpportunities } from "../../data/mock";
import { Field, MemberSelect, downloadText, toCsv, useProjectPage, type TabId } from "./shared";
import { gateTone } from "./StageGateCard";

type Source = "minute" | "manual" | "gate";
type Row = {
  key: string;
  source: Source;
  title: string;
  reason: string;
  owner: string;
  date: string;
  alternatives?: string;
  link?: DecisionLink;
  /** منبع: صورت‌جلسه */
  minuteId?: string;
  minuteIndex?: number;
  minuteTitle?: string;
  record?: DecisionRecord;
  gateDecision?: "ادامه" | "اصلاح" | "توقف";
};

const sourceLabel: Record<Source, string> = { minute: "مصوبه‌ی جلسه", manual: "تصمیم ثبت‌شده", gate: "بازبینی دوره‌ای" };
const linkTypeLabel: Record<DecisionLink["type"], string> = { task: "تسک", risk: "ریسک", milestone: "مایل‌ستون", meeting: "جلسه", issue: "مشکل", fund: "صندوق", contract: "قرارداد", opportunity: "فرصت پژوهشی" };
const linkTab: Partial<Record<DecisionLink["type"], TabId>> = { task: "board", risk: "risks", milestone: "milestones", meeting: "minutes", issue: "issues" };

type Draft = Omit<DecisionRecord, "id" | "createdBy"> & { id?: string };

/**
 * دفتر تصمیمات (Decision log): همه‌ی مصوبات صورت‌جلسه‌ها + تصمیم‌های ثبت‌شده‌ی دستی + تصمیم‌های بازبینی دوره‌ای،
 * قابل جستجو با دلیل، مسئول، تاریخ، گزینه‌های ردشده و پیوند به موجودیت.
 */
export default function DecisionsTab() {
  const { p, pid, canEdit, refDate, openTask, goTab, focusId } = useProjectPage();
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [q, setQ] = useState("");
  const [src, setSrc] = useState<"" | Source>("");
  const [owner, setOwner] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  const rows: Row[] = useMemo(() => {
    const recs = p.decisions ?? [];
    const enriched = (mid: string, i: number) => recs.find((r) => r.minuteId === mid && r.minuteIndex === i);
    const fromMinutes: Row[] = p.minutes.flatMap((m) =>
      (m.decisionList ?? []).map((d, i) => {
        const r = enriched(m.id, i);
        return {
          key: `mn:${m.id}:${i}`,
          source: "minute" as const,
          title: r?.title ?? d,
          reason: r?.reason ?? "",
          owner: r?.owner ?? p.meta.manager,
          date: m.date,
          alternatives: r?.alternatives,
          link: r?.link ?? (m.meetingId ? { type: "meeting" as const, id: m.meetingId, label: m.title } : undefined),
          minuteId: m.id,
          minuteIndex: i,
          minuteTitle: m.title,
          record: r,
        };
      })
    );
    const manual: Row[] = recs.filter((r) => !r.minuteId).map((r) => ({ key: `dc:${r.id}`, source: "manual" as const, title: r.title, reason: r.reason, owner: r.owner, date: r.date, alternatives: r.alternatives, link: r.link, record: r }));
    const gates: Row[] = (p.stageGates ?? []).map((g) => ({ key: `sg:${g.id}`, source: "gate" as const, title: `بازبینی دوره‌ای: «${g.decision}»`, reason: `${g.reason}${g.actions ? ` — اقدام اصلاحی: ${g.actions}` : ""}`, owner: g.by, date: g.date, gateDecision: g.decision }));
    return [...fromMinutes, ...manual, ...gates].sort((a, b) => (dayNum(b.date) ?? 0) - (dayNum(a.date) ?? 0));
  }, [p]);

  const owners = [...new Set(rows.map((r) => r.owner))];
  const list = rows.filter((r) => (!src || r.source === src) && (!owner || r.owner === owner) && (!q || [r.title, r.reason, r.owner, r.alternatives, r.link?.label, r.minuteTitle].some((x) => x?.includes(q))));

  const linkOptions: DecisionLink[] = [
    ...p.tasks.filter((t) => !t.archived).map((t) => ({ type: "task" as const, id: t.id, label: `${t.key ? `${t.key} ` : ""}${t.title}` })),
    ...p.milestones.map((m) => ({ type: "milestone" as const, id: m.id, label: m.title })),
    ...p.risks.map((r) => ({ type: "risk" as const, id: r.id, label: r.title })),
    ...p.issues.map((i) => ({ type: "issue" as const, id: i.id, label: i.title })),
    ...p.meetings.map((m) => ({ type: "meeting" as const, id: m.id, label: m.title })),
    ...funds.map((f) => ({ type: "fund" as const, id: f.id, label: f.title })),
    ...contracts.map((c) => ({ type: "contract" as const, id: c.id, label: c.title })),
    ...researchOpportunities.map((r) => ({ type: "opportunity" as const, id: r.id, label: r.title })),
  ];

  const openLink = (l: DecisionLink) => {
    if (l.type === "task") return openTask(l.id);
    const tab = linkTab[l.type];
    if (tab) return goTab(tab, l.id);
    const base = l.type === "fund" ? "funds" : l.type === "contract" ? "contracts" : "research";
    window.location.hash = `#/dashboard/${base}?focus=${l.id}`;
  };

  const save = () => {
    if (!draft) return;
    if (!draft.title.trim()) return notify("عنوان تصمیم الزامی است.", "warning");
    if (!draft.reason.trim()) return notify("دلیل تصمیم را بنویسید — شفافیت تصمیم یعنی «چرا».", "warning");
    pm.saveDecision(pid, { ...draft, title: draft.title.trim(), reason: draft.reason.trim() });
    notify(draft.id ? "تصمیم به‌روزرسانی شد." : "تصمیم در دفتر تصمیمات ثبت شد و به تیم اطلاع داده شد.");
    setDraft(null);
  };

  const exportCsv = () => {
    downloadText(`decisions-${p.meta.key ?? pid}.csv`, toCsv([["تاریخ", "تصمیم", "دلیل", "مسئول", "گزینه‌های ردشده", "منبع", "پیوند"], ...list.map((r) => [r.date, r.title, r.reason, r.owner, r.alternatives ?? "", sourceLabel[r.source], r.link ? `${linkTypeLabel[r.link.type]}: ${r.link.label}` : ""])]));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی تصمیم، دلیل، مسئول…" className="input-field !py-1.5 !pr-8 !text-xs w-56" />
        </div>
        <select value={src} onChange={(e) => setSrc(e.target.value as "" | Source)} className="input-field !py-1.5 !text-xs !w-auto" aria-label="منبع">
          <option value="">همه‌ی منابع</option>
          {(Object.keys(sourceLabel) as Source[]).map((s) => (
            <option key={s} value={s}>
              {sourceLabel[s]}
            </option>
          ))}
        </select>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className="input-field !py-1.5 !text-xs !w-auto" aria-label="مسئول">
          <option value="">همه‌ی مسئولان</option>
          {owners.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <span className="text-xs text-ink-400">{fa(list.length)} تصمیم</span>
        <div className="mr-auto flex gap-2">
          <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={exportCsv}>
            CSV
          </Button>
          {canEdit && (
            <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setDraft({ title: "", reason: "", owner: p.meta.manager, date: refDate })}>
              ثبت تصمیم
            </Button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Gavel size={20} />} title="تصمیمی پیدا نشد" description="مصوبات صورت‌جلسه‌ها، تصمیم‌های بازبینی دوره‌ای و تصمیم‌های ثبت‌شده اینجا جمع می‌شوند." />
      ) : (
        <div className="card divide-y divide-ink-100">
          {list.map((r) => (
            <div key={r.key} className={`p-4 flex gap-3 ${focusId && (r.record?.id === focusId || r.minuteId === focusId) ? "bg-brand-50/40" : ""}`}>
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${r.source === "minute" ? "bg-brand-50 text-brand-700" : r.source === "gate" ? "bg-ink-100 text-navy-500" : "bg-amber-50 text-amber-700"}`}>
                {r.source === "minute" ? <ScrollText size={15} /> : r.source === "gate" ? <ShieldCheck size={15} /> : <Gavel size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-ink-900 leading-6">{r.title}</p>
                  {canEdit && r.source !== "gate" && (
                    <span className="shrink-0">
                      {r.source === "minute" ? (
                        <button
                          onClick={() => setDraft(r.record ? { ...r.record } : { title: r.title, reason: "", owner: r.owner, date: r.date, minuteId: r.minuteId, minuteIndex: r.minuteIndex, link: r.link })}
                          className="text-[11px] text-brand-700 hover:underline flex items-center gap-0.5"
                        >
                          <PenLine size={12} /> {r.record ? "ویرایش جزئیات" : "تکمیل دلیل و مسئول"}
                        </button>
                      ) : (
                        <RowActions onEdit={() => setDraft({ ...r.record! })} onDelete={() => confirm({ title: `حذف تصمیم «${r.title}»؟`, onConfirm: () => pm.removeDecision(pid, r.record!.id) })} size={12} />
                      )}
                    </span>
                  )}
                </div>
                {r.reason ? <p className="text-xs text-ink-600 leading-6 mt-0.5">{r.reason}</p> : <p className="text-[11px] text-ink-400 mt-0.5">دلیل ثبت نشده است.</p>}
                {r.alternatives && <p className="text-[11px] text-ink-500 mt-0.5">گزینه‌های ردشده: {r.alternatives}</p>}
                <div className="flex items-center gap-2 flex-wrap mt-1.5 text-[11px] text-ink-400">
                  {r.gateDecision ? <Badge tone={gateTone[r.gateDecision]}>{r.gateDecision}</Badge> : <Badge tone={r.source === "minute" ? "brand" : "warning"}>{sourceLabel[r.source]}</Badge>}
                  <span>مسئول: {r.owner}</span>
                  <span>· {r.date}</span>
                  {r.minuteTitle && (
                    <button onClick={() => goTab("minutes", r.minuteId)} className="hover:text-brand-700 hover:underline">
                      · صورت‌جلسه‌ی «{r.minuteTitle}»
                    </button>
                  )}
                  {r.link && r.link.type !== "meeting" && (
                    <button onClick={() => openLink(r.link!)} className="flex items-center gap-0.5 text-brand-700 hover:underline">
                      <Link2 size={11} /> {linkTypeLabel[r.link.type]}: {r.link.label}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "ویرایش تصمیم" : draft?.minuteId ? "تکمیل جزئیات مصوبه" : "ثبت تصمیم"} description="تصمیم انسانی را همراه دلیل و گزینه‌های ردشده ثبت کنید تا بعداً قابل پیگیری و یادگیری باشد." width="max-w-xl">
        {draft && (
          <div className="space-y-3">
            <Field label="تصمیم">
              <input className="input-field" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="مثلاً: خرید از تأمین‌کننده‌ی دوم" />
            </Field>
            <Field label="دلیل">
              <textarea className="input-field min-h-[70px]" value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="شواهد و منطق تصمیم" />
            </Field>
            <Field label="گزینه‌های بررسی‌شده و ردشده (اختیاری)">
              <input className="input-field" value={draft.alternatives ?? ""} onChange={(e) => setDraft({ ...draft, alternatives: e.target.value || undefined })} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="مسئول تصمیم">
                <MemberSelect p={p} value={draft.owner} onChange={(v) => setDraft({ ...draft, owner: v })} allowEmpty={false} />
              </Field>
              <Field label="تاریخ">
                <JalaliDatePicker value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
              </Field>
            </div>
            <Field label="پیوند به">
              <select
                className="input-field"
                value={draft.link ? `${draft.link.type}:${draft.link.id}` : ""}
                onChange={(e) => {
                  const [type, id] = e.target.value.split(":");
                  setDraft({ ...draft, link: linkOptions.find((o) => o.type === type && o.id === id) });
                }}
              >
                <option value="">— بدون پیوند —</option>
                {(Object.keys(linkTypeLabel) as DecisionLink["type"][]).map((ty) => {
                  const opts = linkOptions.filter((o) => o.type === ty);
                  if (!opts.length) return null;
                  return (
                    <optgroup key={ty} label={linkTypeLabel[ty]}>
                      {opts.map((o) => (
                        <option key={`${o.type}:${o.id}`} value={`${o.type}:${o.id}`}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </Field>
            <div className="flex gap-2 pt-1">
              <Button variant="primary" className="flex-1 justify-center" onClick={save}>
                {draft.id ? "ذخیره" : "ثبت در دفتر تصمیمات"}
              </Button>
              <Button variant="secondary" onClick={() => setDraft(null)}>
                انصراف
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
