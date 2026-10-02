// اجزای مشترک فرصت‌های پژوهشی: فرم داوری، ثبت درخواست، ویرایشگر معیارها، پیوند پروژه‌ها
import { useState } from "react";
import { Link2, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import { useToast } from "../../components/ui/ToastProvider";
import { useInnovation } from "../../context/InnovationContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import type { Application, EntityKind, Review, RubricItem } from "../../innovation/types";
import { faN, reviewSummary, uid, weighted } from "../../innovation/util";
import { EntityLink, EntityPicker, Field } from "./shared";

export function ReviewModal({ title, rubric, onClose, onSave }: { title: string; rubric: RubricItem[]; onClose: () => void; onSave: (r: Review) => void }) {
  const { me, stamp } = useInnovation();
  const [noConflict, setNoConflict] = useState(false);
  const [scores, setScores] = useState<number[]>(rubric.map(() => 7));
  const [comment, setComment] = useState("");
  const { notify } = useToast();
  const total = weighted(scores, rubric);
  return (
    <Modal open onClose={onClose} title="فرم داوری" description={title}>
      <div className="space-y-3">
        <label className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs cursor-pointer ${noConflict ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
          <input type="checkbox" checked={noConflict} onChange={(e) => setNoConflict(e.target.checked)} className="mt-0.5" />
          <span className="leading-5 text-ink-700">تعارض منافع با متقاضی ندارم و رازداری اطلاعات پرونده را می‌پذیرم.</span>
        </label>
        <fieldset disabled={!noConflict} className={`space-y-2.5 ${noConflict ? "" : "opacity-50"}`}>
          {rubric.map((r, i) => (
            <div key={r.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-ink-700">{r.criterion} <span className="text-ink-400">(وزن {faN(r.weight)})</span></span>
                <span className="font-bold text-ink-900">{faN(scores[i])} / ۱۰</span>
              </div>
              <input type="range" min={0} max={10} step={0.5} value={scores[i]} onChange={(e) => setScores((s) => s.map((x, j) => (j === i ? Number(e.target.value) : x)))} className="w-full accent-brand-600" />
            </div>
          ))}
          <Field label="نظر داور"><textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="input-field" /></Field>
        </fieldset>
        <div className="flex items-center justify-between text-xs bg-ink-50 rounded-lg p-2.5">
          <span className="text-ink-500">امتیاز وزنی این داوری</span>
          <span className="font-bold text-ink-900">{faN(total, 1)} از ۱۰۰</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1 justify-center"
            icon={<ShieldCheck size={14} />}
            disabled={!noConflict}
            onClick={() => {
              onSave({ id: uid("rv"), reviewer: me, scores, comment: comment.trim(), noConflict: true, at: stamp() });
              notify("داوری ثبت شد.", "success");
              onClose();
            }}
          >
            ثبت داوری
          </Button>
          <Button variant="secondary" onClick={onClose}>انصراف</Button>
        </div>
      </div>
    </Modal>
  );
}

export function ApplicationModal({ title, kind, onClose, onSave }: { title: string; kind?: EntityKind; onClose: () => void; onSave: (a: Application) => void }) {
  const { today } = useInnovation();
  const [name, setName] = useState("");
  const [entityId, setEntityId] = useState<string | undefined>();
  const [affiliation, setAffiliation] = useState("");
  const [proposal, setProposal] = useState("");
  const [err, setErr] = useState(false);
  const { entityById } = useInnovation();
  return (
    <Modal open onClose={onClose} title="ثبت درخواست" description={title}>
      <div className="space-y-3">
        <Field label="متقاضی" required>
          <EntityPicker
            kind={kind}
            name={name}
            invalid={err && !name.trim()}
            onChange={(n, id) => {
              setName(n);
              setEntityId(id);
              setErr(false);
              const e = entityById(id);
              if (e) setAffiliation(e.affiliation ?? e.city);
            }}
          />
        </Field>
        <Field label="وابستگی سازمانی"><input value={affiliation} onChange={(e) => setAffiliation(e.target.value)} className="input-field" /></Field>
        <Field label="خلاصه‌ی پیشنهاده"><textarea value={proposal} onChange={(e) => setProposal(e.target.value)} rows={3} className="input-field" placeholder="رویکرد، برنامه‌ی زمانی و بودجه‌ی پیشنهادی" /></Field>
        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1 justify-center"
            onClick={() => {
              if (!name.trim()) return setErr(true);
              onSave({ id: uid("ap"), name: name.trim(), entityId, affiliation: affiliation.trim() || "—", proposal: proposal.trim(), status: "ارسال‌شده", submittedAt: today, reviews: [] });
              onClose();
            }}
          >
            ثبت درخواست
          </Button>
          <Button variant="secondary" onClick={onClose}>انصراف</Button>
        </div>
      </div>
    </Modal>
  );
}

export function RubricEditor({ value, onChange }: { value: RubricItem[]; onChange: (r: RubricItem[]) => void }) {
  const total = value.reduce((s, r) => s + r.weight, 0);
  return (
    <div className="space-y-1.5">
      {value.map((r, i) => (
        <div key={r.id} className="flex items-center gap-2">
          <input value={r.criterion} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, criterion: e.target.value } : x)))} className="input-field flex-1" />
          <input value={faN(r.weight)} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, weight: Number(e.target.value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\D/g, "")) || 0 } : x)))} className="input-field w-16 text-center" />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-400 shrink-0"><Trash2 size={13} /></button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onChange([...value, { id: uid("rb"), criterion: "معیار جدید", weight: 10 }])} className="text-[11px] text-brand-700 flex items-center gap-1"><Plus size={12} /> افزودن معیار</button>
        <span className={`text-[11px] ${total === 100 ? "text-emerald-600" : "text-amber-600"}`}>جمع وزن‌ها: {faN(total)}{total !== 100 ? " (پیشنهاد: ۱۰۰)" : ""}</span>
      </div>
    </div>
  );
}

/** فهرست متقاضیان با میانگین وزنی داوری، انحراف داوران و اقدام‌ها */
export function ApplicationsList({
  apps,
  rubric,
  canReview,
  onReview,
  onStatus,
}: {
  apps: Application[];
  rubric: RubricItem[];
  canReview: boolean;
  onReview: (a: Application) => void;
  onStatus: (a: Application, s: Application["status"]) => void;
}) {
  const tone = { "ارسال‌شده": "neutral", "نقص مدارک": "warning", "در داوری": "brand", "پذیرفته": "success", "رد شده": "danger" } as const;
  if (!apps.length) return <p className="text-xs text-ink-400">هنوز درخواستی ثبت نشده است.</p>;
  const ranked = [...apps].sort((a, b) => (reviewSummary(b.reviews, rubric).avg ?? -1) - (reviewSummary(a.reviews, rubric).avg ?? -1));
  return (
    <div className="space-y-2">
      {ranked.map((a) => {
        const s = reviewSummary(a.reviews, rubric);
        const open = a.status !== "پذیرفته" && a.status !== "رد شده";
        return (
          <div key={a.id} className="bg-ink-50 rounded-lg p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-ink-800 truncate"><EntityLink id={a.entityId} name={a.name} /></p>
                <p className="text-ink-400 mt-0.5">{a.affiliation} · {a.submittedAt}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {s.avg !== undefined && <Badge tone="navy">{faN(s.avg, 1)} ({faN(s.count)} داور)</Badge>}
                {s.sd > 12 && <Badge tone="warning">اختلاف داوران</Badge>}
                <Badge tone={tone[a.status]}>{a.status}</Badge>
              </div>
            </div>
            {a.proposal && <p className="text-ink-500 mt-1.5 leading-5">{a.proposal}</p>}
            {a.note && <p className="text-amber-700 mt-1">یادداشت: {a.note}</p>}
            {a.reviews.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {a.reviews.map((r) => <p key={r.id} className="text-[10.5px] text-ink-400">{r.reviewer}: {faN(weighted(r.scores, rubric), 1)}{r.comment ? ` — ${r.comment}` : ""}</p>)}
              </div>
            )}
            {canReview && open && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-ink-100 flex-wrap">
                <Button size="sm" variant="secondary" onClick={() => onReview(a)}>داوری</Button>
                {a.status !== "نقص مدارک" && <Button size="sm" variant="ghost" onClick={() => onStatus(a, "نقص مدارک")}>اعلام نقص مدارک</Button>}
                {a.status === "نقص مدارک" && <Button size="sm" variant="ghost" onClick={() => onStatus(a, "ارسال‌شده")}>مدارک تکمیل شد</Button>}
                <Button size="sm" variant="ghost" icon={<X size={12} />} onClick={() => onStatus(a, "رد شده")}>رد</Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ProjectLinks({ opportunityId, title, canEdit }: { opportunityId: string; title: string; canEdit: boolean }) {
  const inn = useInnovation();
  const { projects } = useProjectsPM();
  const [pick, setPick] = useState("");
  const links = inn.projectLinks.filter((l) => l.opportunityId === opportunityId);
  const label = (l: { targetKind: "pm" | "nf"; targetId: string }) =>
    l.targetKind === "pm" ? projects.find((p) => p.meta.id === l.targetId)?.meta.name ?? l.targetId : `${l.targetId} — ${inn.nfProjects.find((p) => p.id === l.targetId)?.titleFa ?? ""}`;
  const add = () => {
    if (!pick) return;
    const [kind, id] = pick.split("|") as ["pm" | "nf", string];
    if (links.some((l) => l.targetKind === kind && l.targetId === id)) return;
    inn.commit("research", "فرصت را به پروژه پیوند داد", { id: opportunityId, title }, (s) => ({ ...s, projectLinks: [...s.projectLinks, { id: uid("pl"), opportunityId, targetKind: kind, targetId: id, at: inn.today }] }));
    setPick("");
  };
  return (
    <div className="space-y-2">
      {links.length === 0 && <p className="text-xs text-ink-400">به پروژه‌ای پیوند داده نشده است.</p>}
      {links.map((l) => (
        <div key={l.id} className="flex items-center justify-between gap-2 text-xs bg-ink-50 rounded-lg p-2">
          <span className="flex items-center gap-1.5 min-w-0"><Link2 size={12} className="text-ink-400 shrink-0" /><span className="truncate">{label(l)}</span></span>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge tone={l.targetKind === "pm" ? "brand" : "navy"}>{l.targetKind === "pm" ? "پروژه" : "صندوق نوآور"}</Badge>
            {canEdit && <button onClick={() => inn.commit("research", "پیوند پروژه را حذف کرد", { id: opportunityId, title }, (s) => ({ ...s, projectLinks: s.projectLinks.filter((x) => x.id !== l.id) }))} className="text-ink-400 hover:text-rose-600"><X size={13} /></button>}
          </div>
        </div>
      ))}
      {canEdit && (
        <div className="flex gap-2">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className="input-field">
            <option value="">پیوند به پروژه…</option>
            <optgroup label="پروژه‌های سازمان">
              {projects.map((p) => <option key={p.meta.id} value={`pm|${p.meta.id}`}>{p.meta.name}</option>)}
            </optgroup>
            <optgroup label="طرح‌های صندوق نوآور">
              {inn.nfProjects.map((p) => <option key={p.id} value={`nf|${p.id}`}>{p.id} — {p.titleFa}</option>)}
            </optgroup>
          </select>
          <Button size="sm" variant="secondary" onClick={add}>پیوند</Button>
        </div>
      )}
    </div>
  );
}
