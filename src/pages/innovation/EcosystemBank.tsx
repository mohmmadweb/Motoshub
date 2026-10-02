// ---------------------------------------------------------------------------
// بانک شرکت‌ها و پژوهشگران — موجودیت مشترک همه‌ی ماژول‌های نوآوری
// پروفایل پویا (فیلدهای تعریف‌شده توسط مدیر)، منشأ داده روی فیلدهای کلیدی،
// سوابق در بنیاد از همه‌ی ماژول‌ها، تاریخچه‌ی تغییرات و ورود CSV با نگاشت ستون.
// قابل پیوند: /dashboard/research?tab=bank&entity=<id>
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Building2, Download, FileUp, GraduationCap, ListPlus, Plus, Search, Settings2, Trash2, UserRound, AlertTriangle, CheckCircle2, Gavel, ClipboardCheck } from "lucide-react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Drawer from "../../components/ui/Drawer";
import Tabs from "../../components/ui/Tabs";
import EmptyState from "../../components/ui/EmptyState";
import RowActions from "../../components/ui/RowActions";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useInnovation, type EntityDraft } from "../../context/InnovationContext";
import type { EcoEntity, EcoFieldDef, EntityKind, KbType } from "../../innovation/types";
import { entityKindLabel, kbTypes, keyFields, moduleTitle } from "../../innovation/types";
import { entityEvaluations, entityRecords } from "../../innovation/records";
import { completeness, displayValue, downloadText, faN, num, parseCsv, rialShort, toCsv } from "../../innovation/util";
import { Bar, Field, FilterChips, ProvenanceTag, entityHref } from "./shared";

export default function EcosystemBank() {
  const inn = useInnovation();
  const { holdings, companies, hasPermission, canAccessAdmin } = useTenancy();
  const [params, setParams] = useSearchParams();
  const [kind, setKind] = useState<EntityKind | "همه">("همه");
  const [field, setField] = useState("همه");
  const [holding, setHolding] = useState("همه");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<EcoEntity | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const canEdit = hasPermission("research.edit") || hasPermission("research.create") || canAccessAdmin;

  const openId = params.get("entity");
  const selected = openId ? inn.entities.find((e) => e.id === openId) ?? null : null;
  const setSelected = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("entity", id);
    else next.delete("entity");
    setParams(next, { replace: true });
  };

  const fields = useMemo(() => Array.from(new Set(inn.entities.map((e) => e.field))).sort(), [inn.entities]);
  const recordsCount = useMemo(() => {
    const m = new Map<string, number>();
    inn.entities.forEach((e) => m.set(e.id, entityRecords(inn, e).length));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inn.entities, inn.contracts, inn.calls, inn.rfps, inn.nfProjects, inn.sabbaticals, inn.awardEntries]);

  const list = inn.entities.filter(
    (e) =>
      (kind === "همه" || e.kind === kind) &&
      (field === "همه" || e.field === field) &&
      (holding === "همه" || e.holdingId === holding) &&
      (!q.trim() || `${e.name} ${e.field} ${e.city} ${e.affiliation ?? ""}`.includes(q.trim()))
  );
  const counts = { همه: inn.entities.length, company: inn.entities.filter((e) => e.kind === "company").length, researcher: inn.entities.filter((e) => e.kind === "researcher").length };
  const avgComplete = Math.round(inn.entities.reduce((s, e) => s + completeness(e), 0) / Math.max(1, inn.entities.length));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی نام، حوزه، شهر…" className="input-field pr-8" />
        </div>
        <select value={field} onChange={(e) => setField(e.target.value)} className="input-field w-auto">
          <option value="همه">همه‌ی حوزه‌ها</option>
          {fields.map((f) => <option key={f}>{f}</option>)}
        </select>
        <select value={holding} onChange={(e) => setHolding(e.target.value)} className="input-field w-auto">
          <option value="همه">همه‌ی هلدینگ‌ها</option>
          {holdings.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        {canEdit && (
          <>
            <Button variant="secondary" size="sm" icon={<Settings2 size={14} />} onClick={() => setFieldsOpen(true)}>فیلدهای پویا</Button>
            <Button variant="secondary" size="sm" icon={<FileUp size={14} />} onClick={() => setImportOpen(true)}>ورود CSV</Button>
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setEditing("new")}>ثبت موجودیت</Button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <FilterChips<EntityKind>
          items={["company", "researcher"]}
          value={kind}
          onChange={setKind}
          counts={counts}
          labels={{ company: "شرکت‌های دانش‌بنیان", researcher: "پژوهشگران" }}
        />
        <p className="text-[11px] text-ink-400">میانگین کامل‌بودن پروفایل‌ها: {faN(avgComplete)}٪</p>
      </div>

      {list.length === 0 ? (
        <div className="card"><EmptyState title="موجودیتی با این فیلتر پیدا نشد" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map((e) => {
            const c = completeness(e);
            return (
              <button key={e.id} onClick={() => setSelected(e.id)} className="card p-3.5 text-right hover:border-brand-300 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink-900 truncate flex items-center gap-1.5">
                      {e.kind === "company" ? <Building2 size={14} className="text-brand-600 shrink-0" /> : <UserRound size={14} className="text-emerald-600 shrink-0" />}
                      {e.name}
                    </p>
                    <p className="text-[11px] text-ink-400 mt-0.5 truncate">{e.field} · {e.city}{e.affiliation ? ` · ${e.affiliation}` : ""}</p>
                  </div>
                  {e.kind === "company" ? (e.trl ? <Badge tone="navy">TRL {faN(e.trl)}</Badge> : null) : e.hIndex !== undefined ? <Badge tone="neutral">h {faN(e.hIndex)}</Badge> : null}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {e.kbType && <Badge tone="brand">{e.kbType}</Badge>}
                  {e.degree && <Badge tone="neutral">{e.degree}</Badge>}
                  {e.holdingId && <Badge tone="neutral">{holdings.find((h) => h.id === e.holdingId)?.name}</Badge>}
                </div>
                <div className="mt-3 flex items-center gap-2 text-[10.5px] text-ink-400">
                  <span className="shrink-0">کامل‌بودن {faN(c)}٪</span>
                  <div className="flex-1"><Bar value={c} tone={c >= 80 ? "emerald" : c >= 50 ? "amber" : "rose"} /></div>
                  <span className="shrink-0">{faN(recordsCount.get(e.id) ?? 0)} سابقه</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected ? entityKindLabel[selected.kind] : ""} width="max-w-2xl">
        {selected && <EntityProfile e={selected} canEdit={canEdit} onEdit={() => setEditing(selected)} onDeleted={() => setSelected(null)} />}
      </Drawer>

      {editing && <EntityForm initial={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} holdings={holdings} companies={companies} />}
      {importOpen && <CsvImport onClose={() => setImportOpen(false)} />}
      {fieldsOpen && <FieldDefsModal onClose={() => setFieldsOpen(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------- پروفایل
function EntityProfile({ e, canEdit, onEdit, onDeleted }: { e: EcoEntity; canEdit: boolean; onEdit: () => void; onDeleted: () => void }) {
  const inn = useInnovation();
  const { holdings, companies } = useTenancy();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [tab, setTab] = useState<"base" | "records" | "evals" | "history">("base");
  const records = useMemo(() => entityRecords(inn, e), [inn, e]);
  const evals = useMemo(() => entityEvaluations(inn, e), [inn, e]);
  const defs = inn.fieldDefs.filter((f) => f.kind === e.kind);
  const c = completeness(e);
  const valueOf = (k: string): string => {
    const v = (e as Record<string, unknown>)[k];
    if (k === "holdingId") return holdings.find((h) => h.id === v)?.name ?? "—";
    return displayValue(v);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-ink-900">{e.name}</p>
          <p className="text-xs text-ink-500 mt-1">{e.field} · {e.city}{e.companyId ? ` · شرکت بنیادی: ${companies.find((x) => x.id === e.companyId)?.name}` : ""}</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" variant="secondary" onClick={onEdit}>ویرایش</Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 size={13} />}
              onClick={() =>
                confirm({
                  title: `حذف «${e.name}» از بانک؟`,
                  message: "پیوندهای ماژول‌ها به متن ساده برمی‌گردند؛ سوابق پرونده‌ها حذف نمی‌شوند.",
                  onConfirm: () => {
                    inn.deleteEntity(e.id);
                    notify("موجودیت حذف شد.", "info");
                    onDeleted();
                  },
                })
              }
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-ink-500">
        <span>کامل‌بودن پروفایل {faN(c)}٪</span>
        <div className="flex-1"><Bar value={c} tone={c >= 80 ? "emerald" : c >= 50 ? "amber" : "rose"} /></div>
        {c < 70 && <Badge tone="warning" icon={<AlertTriangle size={10} />}>داده ناقص</Badge>}
      </div>

      <Tabs
        tabs={[
          { id: "base", label: "اطلاعات پایه" },
          { id: "records", label: "سوابق در بنیاد", count: records.length },
          { id: "evals", label: "تصمیم‌ها و نتایج", count: evals.decisions.length + evals.outcomes.length },
          { id: "history", label: "تاریخچه‌ی تغییرات", count: e.history.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "base" && (
        <div className="space-y-4">
          <div className="card divide-y divide-ink-100">
            {keyFields[e.kind].map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-3 px-3 py-2 text-xs flex-wrap">
                <span className="text-ink-400 w-28 shrink-0">{f.label}</span>
                <span className="flex-1 font-medium text-ink-800 min-w-0 break-words">{valueOf(f.key)}</span>
                <ProvenanceTag p={e.provenance[f.key]} />
              </div>
            ))}
            {defs.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs flex-wrap">
                <span className="text-ink-400 w-28 shrink-0">{d.label}</span>
                <span className="flex-1 font-medium text-ink-800 min-w-0 break-words">
                  {d.type === "url" && e.custom[d.key] ? <a href={e.custom[d.key]} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline" dir="ltr">{e.custom[d.key]}</a> : e.custom[d.key] || "—"}
                </span>
                <ProvenanceTag p={e.provenance[`custom.${d.key}`]} />
              </div>
            ))}
            {e.scholarUrl && (
              <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                <span className="text-ink-400 w-28 shrink-0">پروفایل علمی</span>
                <a href={e.scholarUrl} target="_blank" rel="noreferrer" className="flex-1 text-brand-700 hover:underline truncate" dir="ltr">{e.scholarUrl}</a>
              </div>
            )}
          </div>
          {e.collaborators.length > 0 && (
            <div>
              <p className="text-xs font-bold text-ink-900 mb-2">همکاری‌ها</p>
              <div className="flex flex-wrap gap-1.5">
                {e.collaborators.map((id) => {
                  const o = inn.entityById(id);
                  return o ? <Link key={id} to={entityHref(id)} className="text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100">{o.name}</Link> : null;
                })}
              </div>
            </div>
          )}
          <p className="text-[10.5px] text-ink-400">ثبت اولیه: {e.createdBy} · {e.createdAt}</p>
        </div>
      )}

      {tab === "records" && (
        records.length === 0 ? <EmptyState title="هنوز سابقه‌ای در ماژول‌های بنیاد ندارد" /> : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["contracts", "funds", "research", "award"] as const).map((m) => (
                <div key={m} className="bg-ink-50 rounded-lg p-2 text-center">
                  <p className="text-[10.5px] text-ink-400">{moduleTitle[m]}</p>
                  <p className="text-sm font-bold text-ink-900">{faN(records.filter((r) => r.module === m).length)}</p>
                </div>
              ))}
            </div>
            {records.map((r) => (
              <Link key={r.key} to={r.link} className="block rounded-lg border border-ink-100 p-2.5 hover:bg-ink-50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-ink-800 truncate">{r.title}</p>
                  <Badge tone="neutral">{r.status}</Badge>
                </div>
                <p className="text-[10.5px] text-ink-400 mt-1">{r.kind} · نقش: {r.role}{r.amount ? ` · ${rialShort(r.amount)}` : ""}{r.date ? ` · ${r.date}` : ""}</p>
              </Link>
            ))}
          </div>
        )
      )}

      {tab === "evals" && (
        <div className="space-y-3">
          {evals.decisions.length + evals.outcomes.length === 0 && <EmptyState title="تصمیم یا نتیجه‌ای برای این موجودیت ثبت نشده" />}
          {evals.decisions.map((d) => {
            const o = d.options.find((x) => x.entityId === e.id);
            const won = d.chosenId === o?.id;
            return (
              <div key={d.id} className="rounded-lg bg-ink-50 p-2.5 text-[11.5px]">
                <p className="font-medium text-ink-800 flex items-center gap-1"><Gavel size={12} /> {d.question} — {d.subjectTitle}</p>
                <p className="text-ink-500 mt-1">رتبه در ارزیابی: {faN(o?.rank)}{o?.score !== undefined ? ` (${faN(o.score, 1)})` : ""} · {won ? "انتخاب شد" : "انتخاب نشد"}{d.deviates ? " · تصمیم خلاف رتبه‌ی اول" : ""}</p>
                <p className="text-[10.5px] text-ink-400 mt-0.5">{d.committee ?? d.decidedBy} · {d.at}</p>
              </div>
            );
          })}
          {evals.outcomes.map((o) => (
            <div key={o.id} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 text-[11.5px]">
              <p className="font-medium text-emerald-900 flex items-center gap-1"><ClipboardCheck size={12} /> نتیجه‌ی واقعی — {o.subjectTitle}</p>
              <p className="text-emerald-800 mt-1">{faN(o.successPct)}٪ تحقق اهداف · تحویل {o.delivered} · {o.schedule} · {o.budget}{o.trlAfter !== undefined ? ` · TRL ${faN(o.trlBefore)} ← ${faN(o.trlAfter)}` : ""}</p>
              <p className="text-[10.5px] text-emerald-700/70 mt-0.5">{moduleTitle[o.module]} · {o.recordedBy} · {o.at}</p>
            </div>
          ))}
          <p className="text-[10.5px] text-ink-400 leading-5">این بخش فقط سوابق ثبت‌شده را فهرست می‌کند؛ هیچ امتیاز یا رتبه‌ی اعتباری محاسبه نمی‌شود.</p>
        </div>
      )}

      {tab === "history" && (
        e.history.length === 0 ? <EmptyState title="تغییری پس از ثبت اولیه انجام نشده" /> : (
          <div className="space-y-1.5">
            {e.history.map((h, i) => (
              <div key={i} className="rounded-lg border border-ink-100 p-2.5 text-[11.5px]">
                <p className="text-ink-800"><span className="font-bold">{h.label}</span>: <span className="line-through text-ink-400">{h.from}</span> ← <span className="font-medium">{h.to}</span></p>
                <p className="text-[10.5px] text-ink-400 mt-0.5">{h.by} · {h.at} · منبع: {h.source}</p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------- فرم
function EntityForm({ initial, onClose, holdings, companies }: { initial?: EcoEntity; onClose: () => void; holdings: { id: string; name: string }[]; companies: { id: string; name: string; holdingId: string }[] }) {
  const inn = useInnovation();
  const { notify } = useToast();
  const [d, setD] = useState<EntityDraft>(() =>
    initial
      ? { ...initial }
      : { kind: "company", name: "", field: "", city: "", collaborators: [], custom: {}, certificates: [], pastProjects: [] }
  );
  const [err, setErr] = useState(false);
  const [collab, setCollab] = useState("");
  const set = <K extends keyof EntityDraft>(k: K, v: EntityDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const defs = inn.fieldDefs.filter((f) => f.kind === d.kind);
  const others = inn.entities.filter((e) => e.id !== initial?.id && !d.collaborators.includes(e.id));

  const save = () => {
    if (!d.name.trim() || !d.field.trim()) {
      setErr(true);
      return;
    }
    const missing = defs.filter((f) => f.required && !d.custom[f.key]?.trim());
    if (missing.length) {
      notify(`فیلد الزامی «${missing[0].label}» خالی است.`, "warning");
      return;
    }
    inn.saveEntity({ ...d, name: d.name.trim(), field: d.field.trim(), city: d.city.trim() }, "فرم");
    notify(initial ? "پروفایل به‌روز شد؛ منشأ و تاریخچه‌ی تغییر ثبت شد." : "موجودیت در بانک ثبت شد.", "success");
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={initial ? `ویرایش پروفایل — ${initial.name}` : "ثبت در بانک شرکت‌ها و پژوهشگران"} width="max-w-2xl">
      <div className="space-y-3">
        {!initial && (
          <div className="flex gap-1.5">
            {(["company", "researcher"] as EntityKind[]).map((k) => (
              <button key={k} type="button" onClick={() => set("kind", k)} className={`flex-1 text-xs py-2 rounded-lg border flex items-center justify-center gap-1.5 ${d.kind === k ? "border-brand-500 bg-brand-50 text-brand-700 font-bold" : "border-ink-200 text-ink-600"}`}>
                {k === "company" ? <Building2 size={14} /> : <GraduationCap size={14} />} {entityKindLabel[k]}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="نام" required>
            <input value={d.name} onChange={(e) => { set("name", e.target.value); setErr(false); }} className={`input-field ${err && !d.name.trim() ? "input-error" : ""}`} />
          </Field>
          <Field label="حوزه" required>
            <input value={d.field} onChange={(e) => { set("field", e.target.value); setErr(false); }} className={`input-field ${err && !d.field.trim() ? "input-error" : ""}`} placeholder="هوش مصنوعی / انرژی / …" />
          </Field>
          <Field label="شهر"><input value={d.city} onChange={(e) => set("city", e.target.value)} className="input-field" /></Field>
          {d.kind === "company" ? (
            <>
              <Field label="نوع دانش‌بنیان">
                <select value={d.kbType ?? ""} onChange={(e) => set("kbType", (e.target.value || undefined) as KbType | undefined)} className="input-field">
                  <option value="">—</option>
                  {kbTypes.map((k) => <option key={k}>{k}</option>)}
                </select>
              </Field>
              <Field label="سطح آمادگی فناوری (TRL)">
                <select value={d.trl ?? ""} onChange={(e) => set("trl", e.target.value ? Number(e.target.value) : undefined)} className="input-field">
                  <option value="">—</option>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{faN(n)}</option>)}
                </select>
              </Field>
              <Field label="تعداد نیرو"><input value={d.employees ?? ""} onChange={(e) => set("employees", e.target.value ? num(e.target.value) : undefined)} className="input-field" /></Field>
              <Field label="ظرفیت تولید / خدمت"><input value={d.capacity ?? ""} onChange={(e) => set("capacity", e.target.value)} className="input-field" placeholder="مثلاً ۲۰ هزار کیت در ماه" /></Field>
              <Field label="شناسه ملی"><input value={d.nationalId ?? ""} onChange={(e) => set("nationalId", e.target.value)} className="input-field" dir="ltr" /></Field>
              <Field label="هلدینگ مرتبط">
                <select value={d.holdingId ?? ""} onChange={(e) => setD((p) => ({ ...p, holdingId: e.target.value || undefined, companyId: undefined }))} className="input-field">
                  <option value="">— بدون پیوند —</option>
                  {holdings.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </Field>
              <Field label="شرکت بنیادی مرتبط">
                <select value={d.companyId ?? ""} onChange={(e) => set("companyId", e.target.value || undefined)} className="input-field" disabled={!d.holdingId}>
                  <option value="">—</option>
                  {companies.filter((c) => c.holdingId === d.holdingId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="گواهی‌ها و مجوزها" hint="با «،» جدا کنید">
                  <input value={(d.certificates ?? []).join("، ")} onChange={(e) => set("certificates", e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean))} className="input-field" />
                </Field>
              </div>
            </>
          ) : (
            <>
              <Field label="وابستگی سازمانی"><input value={d.affiliation ?? ""} onChange={(e) => set("affiliation", e.target.value)} className="input-field" placeholder="دانشگاه / پژوهشگاه" /></Field>
              <Field label="مرتبه علمی / نوع"><input value={d.degree ?? ""} onChange={(e) => set("degree", e.target.value)} className="input-field" placeholder="دانشیار / تیم پژوهشی" /></Field>
              <Field label="شاخص h"><input value={d.hIndex ?? ""} onChange={(e) => set("hIndex", e.target.value ? num(e.target.value) : undefined)} className="input-field" /></Field>
              <Field label="تعداد مقاله"><input value={d.publications ?? ""} onChange={(e) => set("publications", e.target.value ? num(e.target.value) : undefined)} className="input-field" /></Field>
              <Field label="لینک پروفایل علمی"><input value={d.scholarUrl ?? ""} onChange={(e) => set("scholarUrl", e.target.value)} className="input-field" dir="ltr" placeholder="https://" /></Field>
              <div className="sm:col-span-2">
                <Field label="پروژه‌های پیشین" hint="با «،» جدا کنید">
                  <input value={(d.pastProjects ?? []).join("، ")} onChange={(e) => set("pastProjects", e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean))} className="input-field" />
                </Field>
              </div>
            </>
          )}
        </div>

        {defs.length > 0 && (
          <div className="border-t border-ink-100 pt-3">
            <p className="text-xs font-bold text-ink-900 mb-2">فیلدهای اختصاصی (تعریف‌شده توسط مدیر)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {defs.map((f) => (
                <Field key={f.id} label={f.label} required={f.required}>
                  {f.type === "select" ? (
                    <select value={d.custom[f.key] ?? ""} onChange={(e) => set("custom", { ...d.custom, [f.key]: e.target.value })} className="input-field">
                      <option value="">—</option>
                      {(f.options ?? []).map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input value={d.custom[f.key] ?? ""} onChange={(e) => set("custom", { ...d.custom, [f.key]: e.target.value })} className="input-field" dir={f.type === "url" ? "ltr" : undefined} />
                  )}
                </Field>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-ink-100 pt-3">
          <p className="text-xs font-bold text-ink-900 mb-2">همکاری با موجودیت‌های دیگر</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {d.collaborators.map((id) => (
              <span key={id} className="text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 flex items-center gap-1">
                {inn.entityById(id)?.name ?? id}
                <button onClick={() => set("collaborators", d.collaborators.filter((x) => x !== id))} className="text-brand-500 hover:text-rose-600">×</button>
              </span>
            ))}
            {d.collaborators.length === 0 && <span className="text-[11px] text-ink-400">ندارد</span>}
          </div>
          <div className="flex gap-2">
            <select value={collab} onChange={(e) => setCollab(e.target.value)} className="input-field">
              <option value="">افزودن همکار…</option>
              {others.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.kind === "company" ? "شرکت" : "پژوهشگر"})</option>)}
            </select>
            <Button size="sm" variant="secondary" icon={<ListPlus size={13} />} onClick={() => { if (collab) { set("collaborators", [...d.collaborators, collab]); setCollab(""); } }}>افزودن</Button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button variant="primary" className="flex-1 justify-center" onClick={save}>{initial ? "ذخیره تغییرات" : "ثبت در بانک"}</Button>
          <Button variant="secondary" onClick={onClose}>انصراف</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- فیلدهای پویا
function FieldDefsModal({ onClose }: { onClose: () => void }) {
  const inn = useInnovation();
  const confirm = useConfirm();
  const [kind, setKind] = useState<EntityKind>("company");
  const [form, setForm] = useState<{ id?: string; label: string; type: EcoFieldDef["type"]; options: string; required: boolean }>({ label: "", type: "text", options: "", required: false });
  const list = inn.fieldDefs.filter((f) => f.kind === kind);
  const save = () => {
    if (!form.label.trim()) return;
    const existing = form.id ? inn.fieldDefs.find((f) => f.id === form.id) : undefined;
    inn.saveFieldDef({
      id: form.id,
      kind,
      key: existing?.key ?? `f${Date.now().toString(36)}`,
      label: form.label.trim(),
      type: form.type,
      options: form.type === "select" ? form.options.split(/[،,]/).map((s) => s.trim()).filter(Boolean) : undefined,
      required: form.required,
    });
    setForm({ label: "", type: "text", options: "", required: false });
  };
  return (
    <Modal open onClose={onClose} title="فیلدهای پویای پروفایل" description="مثل شناسنامه‌های مدیریت دانش: مدیر برای هر نوع موجودیت فیلد اختصاصی تعریف می‌کند." width="max-w-xl">
      <div className="space-y-3">
        <div className="flex gap-1.5">
          {(["company", "researcher"] as EntityKind[]).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`flex-1 text-xs py-1.5 rounded-lg border ${kind === k ? "border-brand-500 bg-brand-50 text-brand-700 font-bold" : "border-ink-200 text-ink-600"}`}>{entityKindLabel[k]}</button>
          ))}
        </div>
        <div className="card divide-y divide-ink-100">
          {list.length === 0 && <p className="text-xs text-ink-400 p-3">فیلد اختصاصی تعریف نشده است.</p>}
          {list.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 p-2.5 text-xs">
              <div>
                <p className="font-medium text-ink-800">{f.label} {f.required && <span className="text-rose-500">*</span>}</p>
                <p className="text-[10.5px] text-ink-400">{({ text: "متن", number: "عدد", select: "انتخابی", date: "تاریخ", url: "پیوند" } as const)[f.type]}{f.options ? ` · ${f.options.join("، ")}` : ""}</p>
              </div>
              <RowActions
                onEdit={() => setForm({ id: f.id, label: f.label, type: f.type, options: (f.options ?? []).join("، "), required: !!f.required })}
                onDelete={() => confirm({ title: `حذف فیلد «${f.label}»؟`, message: "مقادیر ثبت‌شده در پروفایل‌ها باقی می‌مانند ولی نمایش داده نمی‌شوند.", onConfirm: () => inn.deleteFieldDef(f.id) })}
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <Field label={form.id ? "ویرایش فیلد" : "فیلد جدید"}><input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="input-field" placeholder="مثلاً: سال تأسیس" /></Field>
          <Field label="نوع">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EcoFieldDef["type"] })} className="input-field">
              <option value="text">متن</option><option value="number">عدد</option><option value="select">انتخابی</option><option value="date">تاریخ</option><option value="url">پیوند</option>
            </select>
          </Field>
          <label className="flex items-center gap-1.5 text-xs text-ink-600 pb-2"><input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} /> الزامی</label>
        </div>
        {form.type === "select" && <Field label="گزینه‌ها" hint="با «،» جدا کنید"><input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} className="input-field" /></Field>}
        <div className="flex gap-2">
          <Button variant="primary" icon={<Plus size={14} />} onClick={save}>{form.id ? "ذخیره فیلد" : "افزودن فیلد"}</Button>
          {form.id && <Button variant="ghost" onClick={() => setForm({ label: "", type: "text", options: "", required: false })}>انصراف از ویرایش</Button>}
          <Button variant="secondary" className="mr-auto" onClick={onClose}>بستن</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- ورود CSV
type Target = { key: string; label: string; required?: boolean; aliases: string[] };
const targetsFor = (kind: EntityKind, defs: EcoFieldDef[]): Target[] => [
  { key: "name", label: "نام", required: true, aliases: ["نام", "name", "عنوان", "نام شرکت", "نام پژوهشگر"] },
  { key: "field", label: "حوزه", required: true, aliases: ["حوزه", "field", "زمینه", "حوزه فعالیت"] },
  { key: "city", label: "شهر", aliases: ["شهر", "city", "استان"] },
  ...(kind === "company"
    ? [
        { key: "kbType", label: "نوع دانش‌بنیان", aliases: ["نوع", "نوع دانش‌بنیان", "type"] },
        { key: "trl", label: "TRL", aliases: ["trl", "سطح آمادگی", "TRL"] },
        { key: "employees", label: "تعداد نیرو", aliases: ["تعداد نیرو", "کارکنان", "employees"] },
        { key: "capacity", label: "ظرفیت", aliases: ["ظرفیت", "capacity"] },
        { key: "certificates", label: "گواهی‌ها", aliases: ["گواهی", "گواهی‌ها", "certificates"] },
        { key: "nationalId", label: "شناسه ملی", aliases: ["شناسه ملی", "national id"] },
      ]
    : [
        { key: "affiliation", label: "وابستگی", aliases: ["دانشگاه", "وابستگی", "affiliation"] },
        { key: "degree", label: "مرتبه علمی", aliases: ["مرتبه", "مرتبه علمی", "degree"] },
        { key: "hIndex", label: "شاخص h", aliases: ["h-index", "شاخص h", "hindex", "اچ ایندکس"] },
        { key: "publications", label: "تعداد مقاله", aliases: ["مقالات", "تعداد مقاله", "publications"] },
        { key: "scholarUrl", label: "لینک پروفایل علمی", aliases: ["لینک", "scholar", "url"] },
      ]),
  ...defs.map((d) => ({ key: `custom.${d.key}`, label: d.label, required: d.required, aliases: [d.label] })),
];

const sampleCsv: Record<EntityKind, string> = {
  company: "نام,حوزه,شهر,نوع دانش‌بنیان,TRL,تعداد نیرو,ظرفیت,گواهی‌ها\nنانو پوشش آریا,مواد پیشرفته,کرج,دانش‌بنیان نوپا,5,12,۴۰۰ متر مربع در روز,گواهی دانش‌بنیان نوپا\nداده‌پردازان سپهر,هوش مصنوعی,تهران,دانش‌بنیان تولیدی نوع ۲,7,40,,\nبدون حوزه,,یزد,,12,,,\n",
  researcher: "نام,حوزه,شهر,دانشگاه,مرتبه علمی,h-index,مقالات\nدکتر سارا امینی,رباتیک,تهران,دانشگاه تهران,استادیار,8,19\nدکتر مهدی کاظمی,شیمی,شیراز,دانشگاه شیراز,دانشیار,abc,30\n",
};

function CsvImport({ onClose }: { onClose: () => void }) {
  const inn = useInnovation();
  const { notify } = useToast();
  const [kind, setKind] = useState<EntityKind>("company");
  const [fileName, setFileName] = useState("داده‌ی چسبانده‌شده");
  const [text, setText] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const rows = useMemo(() => (text.trim() ? parseCsv(text) : []), [text]);
  const header = rows[0] ?? [];
  const body = rows.slice(1);
  const targets = useMemo(() => targetsFor(kind, inn.fieldDefs.filter((f) => f.kind === kind)), [kind, inn.fieldDefs]);
  const [mapping, setMapping] = useState<Record<string, number>>({});

  useEffect(() => {
    const m: Record<string, number> = {};
    targets.forEach((t) => {
      const idx = header.findIndex((h) => t.aliases.some((a) => h.trim().toLowerCase() === a.toLowerCase()));
      if (idx >= 0) m[t.key] = idx;
    });
    setMapping(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header.join("|"), kind]);

  const validated = useMemo(() => {
    const ok: EntityDraft[] = [];
    const errors: { row: number; name: string; msg: string }[] = [];
    const existing = new Set(inn.entities.map((e) => e.name.trim()));
    body.forEach((r, i) => {
      const get = (k: string) => (mapping[k] !== undefined ? (r[mapping[k]] ?? "").trim() : "");
      const name = get("name");
      const msgs: string[] = [];
      targets.filter((t) => t.required).forEach((t) => !get(t.key) && msgs.push(`«${t.label}» خالی است`));
      if (name && existing.has(name)) msgs.push("نام تکراری در بانک");
      const d: EntityDraft = { kind, name, field: get("field"), city: get("city"), collaborators: [], custom: {} };
      if (kind === "company") {
        const trl = get("trl");
        if (trl) {
          const n = num(trl);
          if (!n || n < 1 || n > 9) msgs.push("TRL باید عددی بین ۱ تا ۹ باشد");
          else d.trl = n;
        }
        const kb = get("kbType");
        if (kb) {
          if ((kbTypes as readonly string[]).includes(kb)) d.kbType = kb as KbType;
          else msgs.push(`نوع دانش‌بنیان «${kb}» معتبر نیست`);
        }
        const emp = get("employees");
        if (emp) d.employees = num(emp);
        d.capacity = get("capacity") || undefined;
        d.nationalId = get("nationalId") || undefined;
        d.certificates = get("certificates").split(/[،;]/).map((s) => s.trim()).filter(Boolean);
      } else {
        d.affiliation = get("affiliation") || undefined;
        d.degree = get("degree") || undefined;
        const h = get("hIndex");
        if (h) {
          if (!/^[\d۰-۹]+$/.test(h)) msgs.push("شاخص h باید عدد باشد");
          else d.hIndex = num(h);
        }
        const p = get("publications");
        if (p) d.publications = num(p);
        d.scholarUrl = get("scholarUrl") || undefined;
      }
      targets.filter((t) => t.key.startsWith("custom.")).forEach((t) => {
        const v = get(t.key);
        if (v) d.custom[t.key.slice(7)] = v;
      });
      if (msgs.length) errors.push({ row: i + 2, name: name || "—", msg: msgs.join("؛ ") });
      else ok.push(d);
    });
    return { ok, errors };
  }, [body, mapping, targets, kind, inn.entities]);

  const loadFile = (f: File) => {
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(f, "utf-8");
  };

  const doImport = () => {
    if (!validated.ok.length) return;
    const n = inn.importEntities(validated.ok, fileName);
    notify(`${faN(n)} موجودیت با منشأ «اکسل/CSV» وارد شد${validated.errors.length ? `؛ ${faN(validated.errors.length)} ردیف خطادار کنار گذاشته شد` : ""}.`, "success");
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="ورود گروهی از CSV / اکسل" description="خروجی اکسل را با فرمت CSV ذخیره و اینجا بارگذاری یا متنش را بچسبانید." width="max-w-3xl">
      {step === 1 ? (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {(["company", "researcher"] as EntityKind[]).map((k) => (
              <button key={k} onClick={() => setKind(k)} className={`flex-1 text-xs py-1.5 rounded-lg border ${kind === k ? "border-brand-500 bg-brand-50 text-brand-700 font-bold" : "border-ink-200 text-ink-600"}`}>{entityKindLabel[k]}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-ink-200 cursor-pointer hover:bg-ink-50">
              <FileUp size={14} /> انتخاب فایل CSV
              <input type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
            </label>
            <Button size="sm" variant="ghost" onClick={() => { setText(sampleCsv[kind]); setFileName("نمونه.csv"); }}>بارگذاری نمونه</Button>
            <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => downloadText(`template-${kind}.csv`, toCsv([targets.map((t) => t.label)]))}>دریافت قالب</Button>
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} className="input-field font-mono text-[11px]" dir="ltr" placeholder="name,field,city,…" />
          <p className="text-[11px] text-ink-400">{rows.length ? `${faN(header.length)} ستون و ${faN(body.length)} ردیف داده شناسایی شد.` : "هنوز داده‌ای وارد نشده است."}</p>
          <div className="flex gap-2">
            <Button variant="primary" disabled={!body.length} onClick={() => setStep(2)}>ادامه: نگاشت ستون‌ها</Button>
            <Button variant="secondary" onClick={onClose}>انصراف</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-ink-900">نگاشت ستون‌ها</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {targets.map((t) => (
              <div key={t.key} className="flex items-center gap-2 text-xs">
                <span className="w-28 shrink-0 text-ink-600">{t.label} {t.required && <span className="text-rose-500">*</span>}</span>
                <select value={mapping[t.key] ?? ""} onChange={(e) => setMapping((m) => { const n = { ...m }; if (e.target.value === "") delete n[t.key]; else n[t.key] = Number(e.target.value); return n; })} className="input-field">
                  <option value="">— نادیده —</option>
                  {header.map((h, i) => <option key={i} value={i}>{h || `ستون ${faN(i + 1)}`}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-1.5"><CheckCircle2 size={14} /> {faN(validated.ok.length)} ردیف آماده‌ی ورود</div>
            <div className={`rounded-lg p-2.5 text-xs flex items-center gap-1.5 border ${validated.errors.length ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-ink-50 border-ink-100 text-ink-500"}`}><AlertTriangle size={14} /> {faN(validated.errors.length)} ردیف خطادار</div>
          </div>
          {validated.errors.length > 0 && (
            <div className="card max-h-44 overflow-y-auto divide-y divide-ink-100">
              {validated.errors.map((er) => (
                <div key={er.row} className="p-2 text-[11px] flex gap-2">
                  <span className="text-ink-400 shrink-0">ردیف {faN(er.row)}</span>
                  <span className="font-medium text-ink-800 shrink-0">{er.name}</span>
                  <span className="text-rose-600">{er.msg}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button variant="primary" disabled={!validated.ok.length} onClick={doImport}>ورود {faN(validated.ok.length)} ردیف</Button>
            {validated.errors.length > 0 && (
              <Button variant="secondary" icon={<Download size={13} />} onClick={() => downloadText("import-errors.csv", toCsv([["ردیف", "نام", "خطا"], ...validated.errors.map((e) => [e.row, e.name, e.msg])]))}>گزارش خطا (CSV)</Button>
            )}
            <Button variant="ghost" onClick={() => setStep(1)}>بازگشت</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
