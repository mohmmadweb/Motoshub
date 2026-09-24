import { useState } from "react";
import { Workflow, Plus, X, BookA, Search, ArrowLeft } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import RowActions from "../../components/ui/RowActions";
import EmptyState from "../../components/ui/EmptyState";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { fa } from "../../pm/jalali";
import type { GlossaryTerm, KProcess, ProcessKind } from "../../km/types";
import { Field, RelationsEditor, SectionHead } from "./shared";
import { useKPage } from "./ctx";

const kinds: ProcessKind[] = ["اصلی", "پشتیبان", "مدیریتی"];
const kindTone = { اصلی: "brand", پشتیبان: "neutral", مدیریتی: "navy" } as const;

function ListInput({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [v, setV] = useState("");
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1 mb-1.5">
        {items.map((t, i) => (
          <span key={`${t}-${i}`} className="inline-flex items-center gap-1 text-[11px] bg-ink-100 rounded px-1.5 py-0.5">
            {t}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="حذف">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <input className="input-field !py-1.5 !text-xs" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { onChange([...items, v.trim()]); setV(""); } }} placeholder={placeholder} />
    </Field>
  );
}

/** بند ۴: فرآیندها */
export function ProcessesSection() {
  const km = useKnowledge();
  const page = useKPage();
  const { hasPermission } = useTenancy();
  const canEdit = hasPermission("knowledge.processes");
  const confirm = useConfirm();
  const { notify } = useToast();
  const [kind, setKind] = useState<ProcessKind | "">("");
  const [draft, setDraft] = useState<(Omit<KProcess, "id"> & { id?: string }) | null>(null);
  const [viewId, setViewId] = useState<string | null>(page.focus && km.processes.some((p) => p.id === page.focus) ? page.focus : null);
  const list = km.processes.filter((p) => !kind || p.kind === kind);
  const view = viewId ? km.processes.find((p) => p.id === viewId) : undefined;
  const lessons = (id: string) => km.experiences.filter((e) => e.processId === id || e.relations.some((r) => r.type === "process" && r.id === id));

  const save = () => {
    if (!draft?.name.trim()) return notify("نام فرآیند الزامی است.", "warning");
    km.saveProcess({ ...draft, name: draft.name.trim() });
    notify(draft.id ? "فرآیند ویرایش شد." : "فرآیند ثبت شد.");
    setDraft(null);
  };

  return (
    <div>
      <SectionHead
        icon={<Workflow size={17} className="text-brand-600" />}
        title="فرآیندها"
        hint="فهرست فرآیندهای اصلی، پشتیبان و مدیریتی با فلوچارت، ورودی/خروجی، مالک، اسناد و فرم‌های مرتبط و درس‌آموخته‌ها."
        action={canEdit && <Button variant="primary" icon={<Plus size={14} />} onClick={() => setDraft({ name: "", code: "", kind: "اصلی", owner: km.me, unit: km.settings.units[0], description: "", inputs: [], outputs: [], steps: [], relations: [] })}>فرآیند جدید</Button>}
      />
      <div className="flex gap-1.5 mb-4">
        {(["", ...kinds] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`text-xs px-3 py-1.5 rounded-md border ${kind === k ? "bg-navy-900 text-white border-navy-900" : "bg-white border-ink-200 text-ink-600"}`}>
            {k || "همه"} ({fa(k ? km.processes.filter((p) => p.kind === k).length : km.processes.length)})
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map((p) => (
            <div key={p.id} className="card p-4 cursor-pointer hover:border-brand-300" onClick={() => setViewId(p.id)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{p.name}</p>
                  <p className="text-[11px] text-ink-400 mt-0.5" dir="rtl">
                    {p.code} · مالک: {p.owner}
                  </p>
                </div>
                <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Badge tone={kindTone[p.kind]}>{p.kind}</Badge>
                  {canEdit && <RowActions size={12} onEdit={() => setDraft({ ...p })} onDelete={() => confirm({ title: `حذف فرآیند «${p.name}»؟`, onConfirm: () => km.deleteProcess(p.id) })} />}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-3 overflow-hidden">
                {p.steps.slice(0, 4).map((s, i) => (
                  <span key={i} className="flex items-center gap-1 text-[10.5px] text-ink-600 whitespace-nowrap">
                    <span className="bg-ink-100 rounded px-1.5 py-0.5 truncate max-w-[110px]">{s}</span>
                    {i < Math.min(3, p.steps.length - 1) && <ArrowLeft size={10} className="text-ink-300" />}
                  </span>
                ))}
                {p.steps.length > 4 && <span className="text-[10.5px] text-ink-400">+{fa(p.steps.length - 4)}</span>}
              </div>
              <p className="text-[11px] text-ink-400 mt-2">
                {fa(p.relations.filter((r) => r.type === "doc").length)} سند · {fa(lessons(p.id).length)} درس‌آموخته
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Workflow size={20} />} title="فرآیندی ثبت نشده" />
      )}

      <Modal open={!!view} onClose={() => setViewId(null)} title={view?.name ?? ""} description={view ? `${view.code} · فرآیند ${view.kind} · مالک: ${view.owner} · ${view.unit}` : undefined} width="max-w-3xl">
        {view && (
          <div className="space-y-4">
            {view.description && <p className="text-sm text-ink-700 leading-7">{view.description}</p>}
            <div>
              <p className="text-xs font-bold text-ink-700 mb-2">نمودار فرآیند</p>
              <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                <div className="shrink-0 w-32 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-2 text-[11px] text-emerald-800">
                  <p className="font-bold mb-1">ورودی‌ها</p>
                  {view.inputs.map((x) => (
                    <p key={x}>• {x}</p>
                  ))}
                </div>
                {view.steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 shrink-0">
                    <ArrowLeft size={14} className="text-ink-300" />
                    <div className="w-32 rounded-xl border border-brand-200 bg-brand-50 p-2 text-center">
                      <span className="text-[10px] text-brand-600">گام {fa(i + 1)}</span>
                      <p className="text-[11.5px] text-ink-800 font-medium leading-5">{s}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 shrink-0">
                  <ArrowLeft size={14} className="text-ink-300" />
                  <div className="w-32 rounded-xl border-2 border-dashed border-navy-300 bg-navy-50 p-2 text-[11px] text-navy-700">
                    <p className="font-bold mb-1">خروجی‌ها</p>
                    {view.outputs.map((x) => (
                      <p key={x}>• {x}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-ink-700 mb-1.5">اسناد، فرم‌ها، شناسنامه و خبرگان مرتبط</p>
              <RelationsEditor kind="process" id={view.id} relations={view.relations} canEdit={canEdit} onOpen={page.openRelation} />
            </div>
            <div>
              <p className="text-xs font-bold text-ink-700 mb-1.5">دانش و درس‌آموخته‌های مرتبط</p>
              {lessons(view.id).map((e) => (
                <button key={e.id} onClick={() => page.go("experience", e.id)} className="block text-right text-xs text-brand-700 hover:underline py-0.5">
                  {e.kind}: {e.title}
                </button>
              ))}
              {lessons(view.id).length === 0 && <p className="text-[11px] text-ink-400">—</p>}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "ویرایش فرآیند" : "فرآیند جدید"} width="max-w-2xl">
        {draft && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="نام فرآیند">
                <input className="input-field" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
              </Field>
              <Field label="کد">
                <input className="input-field" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="PR-OPS-08" />
              </Field>
              <Field label="نوع">
                <select className="input-field" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as ProcessKind })}>
                  {kinds.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </Field>
              <Field label="مالک / مسئول">
                <input className="input-field" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} />
              </Field>
            </div>
            <Field label="شرح">
              <textarea className="input-field min-h-[60px]" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </Field>
            <ListInput label="گام‌های فرآیند (به ترتیب)" items={draft.steps} onChange={(steps) => setDraft({ ...draft, steps })} placeholder="گام را بنویسید و Enter بزنید" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ListInput label="ورودی‌ها" items={draft.inputs} onChange={(inputs) => setDraft({ ...draft, inputs })} placeholder="+ ورودی" />
              <ListInput label="خروجی‌ها" items={draft.outputs} onChange={(outputs) => setDraft({ ...draft, outputs })} placeholder="+ خروجی" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" className="flex-1 justify-center" onClick={save}>
                ذخیره
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

/** بند ۲۲: واژه‌نامه‌ی سازمانی */
export function GlossarySection() {
  const km = useKnowledge();
  const page = useKPage();
  const { hasPermission } = useTenancy();
  const canEdit = hasPermission("knowledge.glossary");
  const confirm = useConfirm();
  const { notify } = useToast();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<(Omit<GlossaryTerm, "id"> & { id?: string }) | null>(null);
  const list = km.glossary.filter((g) => !q || [g.term, g.abbr, g.english, g.definition].join(" ").toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.term.localeCompare(b.term, "fa"));
  const save = () => {
    if (!draft?.term.trim() || !draft.definition.trim()) return notify("اصطلاح و تعریف الزامی است.", "warning");
    km.saveTerm({ ...draft, term: draft.term.trim() });
    notify("واژه ذخیره شد.");
    setDraft(null);
  };
  return (
    <div>
      <SectionHead
        icon={<BookA size={17} className="text-brand-600" />}
        title="واژه‌نامه‌ی سازمانی"
        hint="اصطلاحات تخصصی، مخفف‌ها و تعاریف رسمی سازمان با واحد مسئول و اسناد مرتبط."
        action={canEdit && <Button variant="primary" icon={<Plus size={14} />} onClick={() => setDraft({ term: "", abbr: "", english: "", definition: "", unit: km.settings.units[0], relations: [] })}>واژه‌ی جدید</Button>}
      />
      <div className="relative max-w-md mb-4">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input className="input-field !pr-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در اصطلاح، مخفف یا تعریف…" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((g) => (
          <div key={g.id} className={`card p-4 ${page.focus === g.id ? "ring-2 ring-brand-300" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-ink-900">
                {g.term}
                {g.abbr && <span className="font-mono text-brand-700 mr-1.5">({g.abbr})</span>}
              </p>
              {canEdit && <RowActions size={12} onEdit={() => setDraft({ ...g })} onDelete={() => confirm({ title: `حذف «${g.term}»؟`, onConfirm: () => km.deleteTerm(g.id) })} />}
            </div>
            {g.english && (
              <p className="text-[11px] text-ink-400" dir="ltr">
                {g.english}
              </p>
            )}
            <p className="text-xs text-ink-700 leading-6 mt-2">{g.definition}</p>
            <p className="text-[11px] text-ink-400 mt-2">واحد مسئول: {g.unit}</p>
            {g.relations.length > 0 && (
              <div className="mt-2">
                <RelationsEditor kind="glossary" id={g.id} relations={g.relations} canEdit={false} onOpen={page.openRelation} />
              </div>
            )}
          </div>
        ))}
      </div>
      {list.length === 0 && <EmptyState icon={<BookA size={20} />} title="واژه‌ای پیدا نشد" />}

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "ویرایش واژه" : "واژه‌ی جدید"}>
        {draft && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="اصطلاح">
                <input className="input-field" value={draft.term} onChange={(e) => setDraft({ ...draft, term: e.target.value })} autoFocus />
              </Field>
              <Field label="مخفف">
                <input className="input-field" value={draft.abbr ?? ""} onChange={(e) => setDraft({ ...draft, abbr: e.target.value })} />
              </Field>
            </div>
            <Field label="معادل انگلیسی">
              <input className="input-field" dir="ltr" value={draft.english ?? ""} onChange={(e) => setDraft({ ...draft, english: e.target.value })} />
            </Field>
            <Field label="تعریف رسمی">
              <textarea className="input-field min-h-[80px]" value={draft.definition} onChange={(e) => setDraft({ ...draft, definition: e.target.value })} />
            </Field>
            <Field label="واحد مسئول">
              <select className="input-field" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })}>
                {km.settings.units.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </Field>
            {draft.id && (
              <Field label="اسناد و موارد مرتبط">
                <RelationsEditor kind="glossary" id={draft.id} relations={km.glossary.find((x) => x.id === draft.id)?.relations ?? []} canEdit onOpen={page.openRelation} />
              </Field>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="primary" className="flex-1 justify-center" onClick={save}>
                ذخیره
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
