import { useEffect, useState } from "react";
import { Lightbulb, Plus, ThumbsUp, Send, CheckCircle2 } from "lucide-react";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import RowActions from "../../components/ui/RowActions";
import EmptyState from "../../components/ui/EmptyState";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { fa } from "../../pm/jalali";
import { experienceKinds, type Experience, type ExperienceKind } from "../../km/types";
import { Field, RelationsEditor, SectionHead } from "./shared";

export const expTone: Record<ExperienceKind, BadgeTone> = {
  "تجربه موفق": "success",
  "تجربه ناموفق": "danger",
  "درس‌آموخته": "warning",
  "Best Practice": "brand",
  "نکته تخصصی": "neutral",
  "راهکار حل مشکل": "navy",
  "پرسش و پاسخ": "neutral",
};

type Draft = Omit<Experience, "id" | "date" | "helpful" | "comments"> & { id?: string };

/** فرم ثبت دانش/تجربه/درس‌آموخته — در ماژول دانش و در صفحه‌ی پروژه استفاده می‌شود */
export function ExperienceForm({ value, onClose, lockProject }: { value: Draft | null; onClose: () => void; lockProject?: boolean }) {
  const km = useKnowledge();
  const pm = useProjectsPM();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const [d, setD] = useState<Draft | null>(value);
  useEffect(() => setD(value), [value]);
  if (!d) return null;
  const lesson = d.kind === "درس‌آموخته";
  const canPublish = hasPermission("knowledge.experiences");
  const save = (status: Draft["status"]) => {
    if (!d.title.trim()) return notify("عنوان الزامی است.", "warning");
    if (lesson && (!d.problem?.trim() || !d.future?.trim())) return notify("برای درس‌آموخته، «شرح مسئله» و «آنچه باید در آینده انجام شود» الزامی است.", "warning");
    if (!lesson && !d.body.trim()) return notify("متن الزامی است.", "warning");
    km.saveExperience({ ...d, title: d.title.trim(), body: lesson ? d.body || d.problem || "" : d.body, status });
    notify(status === "منتشرشده" ? "منتشر شد." : status === "در بررسی" ? "برای بررسی ارسال شد." : "پیش‌نویس ذخیره شد.");
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={d.id ? "ویرایش دانش و تجربه" : lesson ? "ثبت درس‌آموخته" : "ثبت دانش و تجربه"} width="max-w-2xl">
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="نوع">
            <select className="input-field" value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as ExperienceKind })}>
              {experienceKinds.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="واحد سازمانی">
            <select className="input-field" value={d.unit} onChange={(e) => setD({ ...d, unit: e.target.value })}>
              {km.settings.units.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="عنوان">
              <input className="input-field" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} autoFocus />
            </Field>
          </div>
          <Field label="پروژه‌ی مرتبط">
            <select className="input-field" value={d.projectId ?? ""} disabled={lockProject} onChange={(e) => setD({ ...d, projectId: e.target.value || undefined })}>
              <option value="">—</option>
              {pm.projects.map((p) => (
                <option key={p.meta.id} value={p.meta.id}>
                  {p.meta.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="فرآیند مرتبط">
            <select className="input-field" value={d.processId ?? ""} onChange={(e) => setD({ ...d, processId: e.target.value || undefined })}>
              <option value="">—</option>
              {km.processes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {lesson ? (
          <div className="space-y-3 border-r-4 border-amber-300 pr-3">
            {(
              [
                ["problem", "شرح مسئله یا اتفاق"],
                ["cause", "علت یا عوامل مؤثر"],
                ["action", "اقدام انجام‌شده"],
                ["result", "نتیجه"],
                ["future", "آنچه باید در آینده انجام شود"],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label}>
                <textarea className="input-field min-h-[52px]" value={d[k] ?? ""} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
              </Field>
            ))}
          </div>
        ) : (
          <Field label={d.kind === "پرسش و پاسخ" ? "پرسش و پاسخ" : "متن"}>
            <textarea className="input-field min-h-[110px]" value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} />
          </Field>
        )}
        <Field label="برچسب‌ها (با ، جدا کنید)">
          <input className="input-field" value={d.tags.join("، ")} onChange={(e) => setD({ ...d, tags: e.target.value.split(/[،,]/).map((x) => x.trim()).filter(Boolean) })} />
        </Field>
        <div className="flex gap-2 pt-2 flex-wrap">
          {canPublish ? (
            <Button variant="primary" icon={<CheckCircle2 size={14} />} onClick={() => save("منتشرشده")}>
              ثبت و انتشار
            </Button>
          ) : (
            <Button variant="primary" icon={<Send size={14} />} onClick={() => save("در بررسی")}>
              ارسال برای تأیید
            </Button>
          )}
          <Button variant="secondary" onClick={() => save("پیش‌نویس")}>
            ذخیره‌ی پیش‌نویس
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function blankExperience(kind: ExperienceKind, me: string, unit: string, projectId?: string): Draft {
  return { kind, title: "", body: "", author: me, unit, tags: [], status: "پیش‌نویس", relations: [], projectId };
}

/** کارت نمایش یک تجربه / درس‌آموخته */
export function ExperienceCard({ e, onEdit, onDelete, onOpenRelation, focus }: { e: Experience; onEdit?: () => void; onDelete?: () => void; onOpenRelation?: Parameters<typeof RelationsEditor>[0]["onOpen"]; focus?: boolean }) {
  const km = useKnowledge();
  const pm = useProjectsPM();
  const { hasPermission } = useTenancy();
  const project = e.projectId ? pm.getProject(e.projectId) : undefined;
  return (
    <div className={`card p-4 ${focus ? "ring-2 ring-brand-300" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge tone={expTone[e.kind]}>{e.kind}</Badge>
          {e.status !== "منتشرشده" && <Badge tone="warning">{e.status}</Badge>}
        </div>
        <span className="flex items-center gap-1">
          {e.status === "در بررسی" && hasPermission("knowledge.experiences") && (
            <Button size="sm" variant="ghost" icon={<CheckCircle2 size={12} />} onClick={() => km.saveExperience({ ...e, status: "منتشرشده" })}>
              تأیید و انتشار
            </Button>
          )}
          <RowActions size={12} onEdit={onEdit} onDelete={onDelete} />
        </span>
      </div>
      <p className="text-sm font-semibold text-ink-900 mt-2">{e.title}</p>
      {e.kind === "درس‌آموخته" ? (
        <dl className="text-xs mt-2 space-y-1.5">
          {(
            [
              ["مسئله", e.problem],
              ["علت", e.cause],
              ["اقدام", e.action],
              ["نتیجه", e.result],
              ["برای آینده", e.future],
            ] as const
          )
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className={`shrink-0 w-16 ${k === "برای آینده" ? "text-amber-700 font-bold" : "text-ink-400"}`}>{k}:</dt>
                <dd className="text-ink-700 leading-5">{v}</dd>
              </div>
            ))}
        </dl>
      ) : (
        <p className="text-xs text-ink-700 leading-6 mt-1.5 whitespace-pre-wrap">{e.body}</p>
      )}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-ink-100 flex-wrap text-[11px] text-ink-400">
        <span>
          {e.author} · {e.unit} · {e.date}
        </span>
        {project && <span className="text-brand-700">پروژه: {project.meta.name}</span>}
        {e.tags.map((t) => (
          <span key={t}>#{t}</span>
        ))}
        <button onClick={() => km.markHelpful(e.id)} className="mr-auto flex items-center gap-1 hover:text-brand-700" title="مفید بود">
          <ThumbsUp size={11} /> {fa(e.helpful)}
        </button>
      </div>
      {e.relations.length > 0 && onOpenRelation && (
        <div className="mt-2">
          <RelationsEditor kind="lesson" id={e.id} relations={e.relations} canEdit={false} onOpen={onOpenRelation} />
        </div>
      )}
    </div>
  );
}

/** بند ۵: دانش و تجربیات کارکنان */
export default function ExperienceSection({ focus, onOpenRelation }: { focus?: string; onOpenRelation: NonNullable<Parameters<typeof RelationsEditor>[0]["onOpen"]> }) {
  const km = useKnowledge();
  const { hasPermission } = useTenancy();
  const confirm = useConfirm();
  const [kind, setKind] = useState<ExperienceKind | "" | "review">("");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const list = km.experiences
    .filter((e) => (kind === "review" ? e.status === "در بررسی" : !kind || e.kind === kind))
    .filter((e) => kind === "review" || e.status === "منتشرشده" || e.author === km.me || hasPermission("knowledge.experiences"))
    .filter((e) => !q || [e.title, e.body, e.problem, e.future, e.tags.join(" ")].join(" ").includes(q))
    .sort((a, b) => b.helpful - a.helpful);
  const reviewCount = km.experiences.filter((e) => e.status === "در بررسی").length;
  return (
    <div>
      <SectionHead
        icon={<Lightbulb size={17} className="text-amber-500" />}
        title="دانش و تجربیات کارکنان"
        hint="تجربیات موفق و ناموفق، درس‌آموخته‌ها، Best Practiceها، نکات تخصصی، راهکار حل مشکلات و پرسش و پاسخ — با تأیید، ویرایش و انتشار."
        action={<Button variant="primary" icon={<Plus size={14} />} onClick={() => setDraft(blankExperience("تجربه موفق", km.me, km.settings.units[0]))}>ثبت دانش و تجربه</Button>}
      />
      <div className="flex gap-1.5 flex-wrap mb-3">
        {(["", ...experienceKinds] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`text-xs px-3 py-1.5 rounded-md border ${kind === k ? "bg-navy-900 text-white border-navy-900" : "bg-white border-ink-200 text-ink-600"}`}>
            {k || "همه"} ({fa(k ? km.experiences.filter((e) => e.kind === k).length : km.experiences.length)})
          </button>
        ))}
        {hasPermission("knowledge.experiences") && reviewCount > 0 && (
          <button onClick={() => setKind("review")} className={`text-xs px-3 py-1.5 rounded-md border ${kind === "review" ? "bg-amber-600 text-white border-amber-600" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
            در انتظار تأیید ({fa(reviewCount)})
          </button>
        )}
      </div>
      <input className="input-field max-w-md mb-4" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در تجربیات…" />
      {list.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {list.map((e) => (
            <ExperienceCard
              key={e.id}
              e={e}
              focus={focus === e.id}
              onOpenRelation={onOpenRelation}
              onEdit={e.author === km.me || hasPermission("knowledge.experiences") ? () => setDraft({ ...e }) : undefined}
              onDelete={e.author === km.me || hasPermission("knowledge.experiences") ? () => confirm({ title: `حذف «${e.title}»؟`, onConfirm: () => km.deleteExperience(e.id) }) : undefined}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Lightbulb size={20} />} title="موردی پیدا نشد" />
      )}
      {draft && <ExperienceForm value={draft} onClose={() => setDraft(null)} />}
    </div>
  );
}
