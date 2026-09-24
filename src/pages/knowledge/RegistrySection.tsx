import { useEffect, useState } from "react";
import { IdCard, Plus, Settings2, X, Paperclip } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import RowActions from "../../components/ui/RowActions";
import EmptyState from "../../components/ui/EmptyState";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { fa } from "../../pm/jalali";
import type { FieldKind, RegistryField, RegistryItem, RegistryType } from "../../km/types";
import { Field, FilePicker, RelationsEditor, SectionHead } from "./shared";
import { useKPage } from "./ctx";

type Draft = Omit<RegistryItem, "id" | "updatedAt"> & { id?: string };
const kindLabel: Record<FieldKind, string> = { text: "متن", number: "عدد", date: "تاریخ", select: "انتخابی", textarea: "متن بلند" };

/** بند ۳: شناسنامه‌ها — انواع پیش‌فرض + انواع جدید با فیلد اختصاصی */
export default function RegistrySection() {
  const km = useKnowledge();
  const page = useKPage();
  const { hasPermission } = useTenancy();
  const canEdit = hasPermission("knowledge.registry");
  const confirm = useConfirm();
  const { notify } = useToast();
  const [typeId, setTypeId] = useState("");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [viewId, setViewId] = useState<string | null>(page.focus && km.registry.some((r) => r.id === page.focus) ? page.focus : null);
  const [typeEdit, setTypeEdit] = useState<(Omit<RegistryType, "id"> & { id?: string }) | null>(null);

  const items = km.registry.filter((r) => (!typeId || r.typeId === typeId) && (!q || r.title.includes(q) || Object.values(r.values).some((v) => v.includes(q))));
  const typeOf = (id: string) => km.registryTypes.find((t) => t.id === id);
  const view = viewId ? km.registry.find((r) => r.id === viewId) : undefined;

  const newItem = () => {
    const t = km.registryTypes.find((x) => x.id === typeId) ?? km.registryTypes[0];
    setDraft({ typeId: t.id, title: "", owner: km.me, unit: km.settings.units[0], values: {}, description: "", files: [], relations: [] });
  };
  const save = () => {
    if (!draft?.title.trim()) return notify("عنوان شناسنامه الزامی است.", "warning");
    km.saveRegistryItem({ ...draft, title: draft.title.trim() });
    notify(draft.id ? "شناسنامه ویرایش شد." : "شناسنامه ثبت شد.");
    setDraft(null);
  };
  const saveType = () => {
    if (!typeEdit?.name.trim()) return notify("نام نوع شناسنامه الزامی است.", "warning");
    if (typeEdit.fields.some((f) => !f.label.trim())) return notify("عنوان همه‌ی فیلدها را وارد کنید.", "warning");
    km.saveRegistryType({ ...typeEdit, name: typeEdit.name.trim(), fields: typeEdit.fields.map((f, i) => ({ ...f, key: f.key || `f${i}-${Date.now().toString(36)}` })) });
    notify(typeEdit.id ? "نوع شناسنامه ویرایش شد." : "نوع شناسنامه‌ی جدید ساخته شد.");
    setTypeEdit(null);
  };

  const input = (f: RegistryField, value: string, onChange: (v: string) => void) =>
    f.kind === "select" ? (
      <select className="input-field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {(f.options ?? []).map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    ) : f.kind === "textarea" ? (
      <textarea className="input-field min-h-[60px]" value={value} onChange={(e) => onChange(e.target.value)} />
    ) : f.kind === "date" ? (
      <JalaliDatePicker value={value} onChange={onChange} />
    ) : (
      <input className="input-field" inputMode={f.kind === "number" ? "numeric" : undefined} value={value} onChange={(e) => onChange(e.target.value)} />
    );

  return (
    <div>
      <SectionHead
        icon={<IdCard size={17} className="text-brand-600" />}
        title="شناسنامه‌ها"
        hint="شناسنامه‌ی فرآیند، خدمت، شغل، واحد سازمانی، محصول، سیستم و مستندات — و هر نوع جدیدی با فیلدهای اختصاصی."
        action={
          canEdit && (
            <div className="flex gap-2">
              <Button variant="secondary" icon={<Settings2 size={14} />} onClick={() => setTypeEdit({ name: "", description: "", fields: [{ key: "", label: "", kind: "text" }] })}>
                نوع شناسنامه‌ی جدید
              </Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={newItem}>
                شناسنامه‌ی جدید
              </Button>
            </div>
          )
        }
      />
      <div className="flex gap-1.5 flex-wrap mb-3">
        <button onClick={() => setTypeId("")} className={`text-xs px-3 py-1.5 rounded-md border ${!typeId ? "bg-navy-900 text-white border-navy-900" : "bg-white border-ink-200 text-ink-600"}`}>
          همه ({fa(km.registry.length)})
        </button>
        {km.registryTypes.map((t) => (
          <span key={t.id} className={`group inline-flex items-center rounded-md border text-xs ${typeId === t.id ? "bg-navy-900 text-white border-navy-900" : "bg-white border-ink-200 text-ink-600"}`}>
            <button onClick={() => setTypeId(t.id)} className="px-3 py-1.5">
              {t.name} ({fa(km.registry.filter((r) => r.typeId === t.id).length)})
            </button>
            {canEdit && typeId === t.id && (
              <span className="pl-1 flex items-center">
                <RowActions size={11} onEdit={() => setTypeEdit({ ...t, fields: t.fields.map((f) => ({ ...f })) })} onDelete={t.builtin ? undefined : () => confirm({ title: `حذف نوع «${t.name}»؟`, message: "همه‌ی شناسنامه‌های این نوع هم حذف می‌شوند.", onConfirm: () => { km.deleteRegistryType(t.id); setTypeId(""); } })} />
              </span>
            )}
          </span>
        ))}
      </div>
      <input className="input-field mb-3 max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در شناسنامه‌ها…" />

      {items.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((r) => {
            const t = typeOf(r.typeId);
            return (
              <div key={r.id} className="card p-4 hover:border-brand-300 cursor-pointer flex flex-col gap-2" onClick={() => setViewId(r.id)}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-900">{r.title}</p>
                  {canEdit && (
                    <span onClick={(e) => e.stopPropagation()}>
                      <RowActions size={12} onEdit={() => setDraft({ ...r })} onDelete={() => confirm({ title: `حذف شناسنامه‌ی «${r.title}»؟`, onConfirm: () => km.deleteRegistryItem(r.id) })} />
                    </span>
                  )}
                </div>
                <Badge tone="neutral">{t?.name ?? "—"}</Badge>
                <dl className="text-[11.5px] space-y-0.5">
                  {(t?.fields ?? []).slice(0, 3).map((f) => (
                    <div key={f.key} className="flex gap-1">
                      <dt className="text-ink-400">{f.label}:</dt>
                      <dd className="text-ink-700 truncate">{r.values[f.key] || "—"}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-[11px] text-ink-400 mt-auto pt-2 border-t border-ink-100">
                  {r.unit} · بروزرسانی {r.updatedAt}
                  {r.relations.length ? ` · ${fa(r.relations.length)} ارتباط` : ""}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<IdCard size={20} />} title="شناسنامه‌ای نیست" />
      )}

      {/* مشاهده‌ی شناسنامه */}
      <Modal open={!!view} onClose={() => setViewId(null)} title={view?.title ?? ""} description={view ? `${typeOf(view.typeId)?.name} · ${view.unit} · مسئول: ${view.owner} · بروزرسانی ${view.updatedAt}` : undefined} width="max-w-2xl">
        {view && (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(typeOf(view.typeId)?.fields ?? []).map((f) => (
                <div key={f.key} className={`bg-ink-50 rounded-lg p-3 ${f.kind === "textarea" ? "sm:col-span-2" : ""}`}>
                  <dt className="text-[11px] text-ink-400">{f.label}</dt>
                  <dd className="text-sm text-ink-900 mt-1 whitespace-pre-wrap">{view.values[f.key] || "—"}</dd>
                </div>
              ))}
            </dl>
            {view.description && <p className="text-sm text-ink-700 leading-7">{view.description}</p>}
            {view.files.length > 0 && (
              <div>
                <p className="text-xs font-bold text-ink-700 mb-1.5">پیوست‌ها</p>
                {view.files.map((f) => (
                  <p key={f.id} className="text-xs flex items-center gap-1.5 py-0.5">
                    <Paperclip size={12} className="text-ink-400" /> {f.name} <span className="text-ink-400">{f.size}</span>
                  </p>
                ))}
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-ink-700 mb-1.5">ارتباط با اسناد، فرآیندها، خبرگان و پروژه‌ها</p>
              <RelationsEditor kind="registry" id={view.id} relations={view.relations} canEdit={canEdit} onOpen={page.openRelation} />
            </div>
            {canEdit && (
              <Button size="sm" variant="secondary" onClick={() => { setDraft({ ...view }); setViewId(null); }}>
                ویرایش شناسنامه
              </Button>
            )}
          </div>
        )}
      </Modal>

      {/* ثبت/ویرایش شناسنامه */}
      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "ویرایش شناسنامه" : "شناسنامه‌ی جدید"} width="max-w-2xl">
        {draft && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="نوع شناسنامه">
                <select className="input-field" value={draft.typeId} disabled={!!draft.id} onChange={(e) => setDraft({ ...draft, typeId: e.target.value, values: {} })}>
                  {km.registryTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="عنوان">
                <input className="input-field" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus />
              </Field>
              <Field label="واحد سازمانی">
                <select className="input-field" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })}>
                  {km.settings.units.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </Field>
              <Field label="مسئول">
                <input className="input-field" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} />
              </Field>
              {(typeOf(draft.typeId)?.fields ?? []).map((f) => (
                <div key={f.key} className={f.kind === "textarea" ? "sm:col-span-2" : ""}>
                  <Field label={f.label}>{input(f, draft.values[f.key] ?? "", (v) => setDraft({ ...draft, values: { ...draft.values, [f.key]: v } }))}</Field>
                </div>
              ))}
            </div>
            <Field label="توضیحات">
              <textarea className="input-field min-h-[60px]" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </Field>
            <Field label="پیوست‌ها">
              <FilePicker files={draft.files} onChange={(files) => setDraft({ ...draft, files })} />
            </Field>
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

      {/* تعریف نوع شناسنامه با فیلد اختصاصی */}
      <Modal open={!!typeEdit} onClose={() => setTypeEdit(null)} title={typeEdit?.id ? "ویرایش نوع شناسنامه" : "نوع شناسنامه‌ی جدید"} description="فیلدهای اختصاصی این نوع را تعریف کنید؛ فرم ثبت شناسنامه از روی همین فیلدها ساخته می‌شود." width="max-w-2xl">
        {typeEdit && <TypeEditor value={typeEdit} onChange={setTypeEdit} onSave={saveType} onCancel={() => setTypeEdit(null)} />}
      </Modal>
    </div>
  );
}

function TypeEditor({ value, onChange, onSave, onCancel }: { value: Omit<RegistryType, "id"> & { id?: string }; onChange: (v: Omit<RegistryType, "id"> & { id?: string }) => void; onSave: () => void; onCancel: () => void }) {
  const [optDraft, setOptDraft] = useState<Record<number, string>>({});
  useEffect(() => setOptDraft({}), [value.id]);
  const setField = (i: number, patch: Partial<RegistryField>) => onChange({ ...value, fields: value.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="نام نوع">
          <input className="input-field" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="مثلاً: شناسنامه تجهیزات" />
        </Field>
        <Field label="توضیح">
          <input className="input-field" value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} />
        </Field>
      </div>
      <p className="text-xs font-bold text-ink-700">فیلدها</p>
      <div className="space-y-2">
        {value.fields.map((f, i) => (
          <div key={i} className="border border-ink-200 rounded-lg p-2 space-y-2">
            <div className="flex gap-2">
              <input className="input-field !py-1.5 !text-xs flex-1" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} placeholder="عنوان فیلد" />
              <select className="input-field !py-1.5 !text-xs !w-auto" value={f.kind} onChange={(e) => setField(i, { kind: e.target.value as FieldKind })}>
                {(Object.keys(kindLabel) as FieldKind[]).map((k) => (
                  <option key={k} value={k}>
                    {kindLabel[k]}
                  </option>
                ))}
              </select>
              <button onClick={() => onChange({ ...value, fields: value.fields.filter((_, j) => j !== i) })} className="text-ink-400 hover:text-rose-600 px-1" aria-label="حذف فیلد">
                <X size={14} />
              </button>
            </div>
            {f.kind === "select" && (
              <div className="flex flex-wrap gap-1 items-center">
                {(f.options ?? []).map((o) => (
                  <span key={o} className="inline-flex items-center gap-1 text-[11px] bg-ink-100 rounded px-1.5 py-0.5">
                    {o}
                    <button onClick={() => setField(i, { options: (f.options ?? []).filter((x) => x !== o) })} aria-label="حذف گزینه">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  className="text-[11px] border border-dashed border-ink-300 rounded px-1.5 py-0.5 w-28 bg-transparent"
                  value={optDraft[i] ?? ""}
                  onChange={(e) => setOptDraft({ ...optDraft, [i]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (optDraft[i] ?? "").trim()) {
                      setField(i, { options: [...(f.options ?? []), optDraft[i].trim()] });
                      setOptDraft({ ...optDraft, [i]: "" });
                    }
                  }}
                  placeholder="+ گزینه (Enter)"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => onChange({ ...value, fields: [...value.fields, { key: "", label: "", kind: "text" }] })}>
        افزودن فیلد
      </Button>
      <div className="flex gap-2 pt-2 border-t border-ink-100">
        <Button variant="primary" className="flex-1 justify-center" onClick={onSave}>
          ذخیره‌ی نوع
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </div>
  );
}
