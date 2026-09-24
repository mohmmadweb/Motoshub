import { useState } from "react";
import { Lightbulb, Plus, Paperclip, X, Download } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import RowActions from "../../components/ui/RowActions";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { rndDocStates } from "../../data/mockDaneshmand";
import { holdings } from "../../data/tenancy";
import { fa } from "../../pm/jalali";
import type { RndDoc } from "../../km/types";
import { Field, FilePicker, SectionHead } from "./shared";
import { useKPage } from "./ctx";

type Draft = Omit<RndDoc, "id" | "history"> & { id?: string };

/** سندهای فرصت‌های تحقیق و توسعه — با افزودن، ویرایش، حذف و صفحه‌ی مشاهده‌ی سند */
export default function RndSection() {
  const km = useKnowledge();
  const page = useKPage();
  const { hasPermission } = useTenancy();
  const canEdit = hasPermission("knowledge.rnd");
  const confirm = useConfirm();
  const { notify } = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [viewId, setViewId] = useState<string | null>(page.focus && km.rnd.some((r) => r.id === page.focus) ? page.focus : null);
  const [topic, setTopic] = useState("");
  const [holdingF, setHoldingF] = useState("");
  const delivered = km.rnd.filter((d) => d.progress === 100).length;
  const list = km.rnd.filter((d) => !holdingF || d.holding === holdingF);
  const view = viewId ? km.rnd.find((r) => r.id === viewId) : undefined;
  const stageOf = (p: number) => rndDocStates.filter((s) => s.threshold <= p).pop()?.label ?? rndDocStates[0].label;

  const save = () => {
    if (!draft?.company.trim() || !draft.holding.trim()) return notify("نام شرکت و هلدینگ الزامی است.", "warning");
    km.saveRnd({ ...draft, company: draft.company.trim(), statusLabel: stageOf(draft.progress) });
    notify(draft.id ? "سند فرصت ویرایش شد." : "سند فرصت ثبت شد.");
    setDraft(null);
  };

  const downloadFile = (name: string) => {
    const blob = new Blob([`${name}\n(نمونه‌ی نمایشی)`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  };

  return (
    <div>
      <SectionHead
        icon={<Lightbulb size={17} className="text-brand-600" />}
        title="سندهای فرصت‌های تحقیق و توسعه"
        hint={`برای هر شرکت بنیادی، «سند فرصت‌های تحقیق و توسعه» تدوین می‌شود: بازدید و احصاء عناوین ← تدوین ← اصلاحات تیم راهبر ← پیش‌نویس نهایی ← تأیید و تحویل (${fa(delivered)} سند از ${fa(km.rnd.length)} تحویل شده).`}
        action={
          canEdit && (
            <Button variant="primary" icon={<Plus size={14} />} onClick={() => setDraft({ company: "", holding: holdings[0]?.name ?? "", progress: 10, statusLabel: rndDocStates[0].label, lead: km.me, startDate: km.today, topics: [], files: [], notes: "" })}>
              سند فرصت جدید
            </Button>
          )
        }
      />
      <div className="flex items-center gap-2 mb-4 flex-wrap text-[11px] text-ink-500">
        {rndDocStates.map((s) => (
          <span key={s.threshold} className="flex items-center gap-1 bg-ink-50 border border-ink-100 rounded-md px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" /> {fa(s.threshold)}٪ = {s.label}
          </span>
        ))}
        <select className="input-field !py-1 !text-xs !w-auto mr-auto" value={holdingF} onChange={(e) => setHoldingF(e.target.value)}>
          <option value="">همه‌ی هلدینگ‌ها</option>
          {[...new Set(km.rnd.map((d) => d.holding))].map((h) => (
            <option key={h}>{h}</option>
          ))}
        </select>
      </div>

      <div className="card divide-y divide-ink-100">
        <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_1fr_180px_auto_auto] gap-4 px-4 py-2 bg-ink-50 text-[11px] font-semibold text-ink-400">
          <span>شرکت بنیادی</span>
          <span className="hidden sm:block">هلدینگ</span>
          <span>پیشرفت تدوین</span>
          <span className="text-center">وضعیت</span>
          <span />
        </div>
        {list.map((d) => (
          <div key={d.id} className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_1fr_180px_auto_auto] gap-4 items-center px-4 py-3 hover:bg-ink-50 cursor-pointer" onClick={() => setViewId(d.id)}>
            <div className="min-w-0">
              <p className="font-medium text-sm text-ink-900 truncate">{d.company}</p>
              <p className="text-[11px] text-ink-400 mt-0.5">
                {fa(d.topics.length)} عنوان فرصت · {d.lead}
                {d.files.length ? ` · ${fa(d.files.length)} فایل` : ""}
              </p>
              {d.obstacles && <p className="text-[11px] text-amber-700 mt-0.5">مانع: {d.obstacles}</p>}
            </div>
            <span className="text-xs text-ink-400 hidden sm:block">{d.holding}</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden min-w-[70px]">
                <div className={`h-full rounded-full ${d.progress === 100 ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${d.progress}%` }} />
              </div>
              <span className="text-[11px] text-ink-500 shrink-0">{fa(d.progress)}٪</span>
            </div>
            <Badge tone={d.progress === 100 ? "success" : d.progress >= 65 ? "brand" : "neutral"}>{d.statusLabel}</Badge>
            <span onClick={(e) => e.stopPropagation()}>
              {canEdit && <RowActions size={12} onEdit={() => setDraft({ ...d })} onDelete={() => confirm({ title: `حذف سند فرصت «${d.company}»؟`, onConfirm: () => km.deleteRnd(d.id) })} />}
            </span>
          </div>
        ))}
      </div>

      <Modal open={!!view} onClose={() => setViewId(null)} title={view ? `سند فرصت‌های تحقیق و توسعه — ${view.company}` : ""} description={view ? `${view.holding} · مسئول تدوین: ${view.lead} · آغاز ${view.startDate}` : undefined} width="max-w-3xl">
        {view && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {rndDocStates.map((s, i) => {
                  const done = view.progress >= s.threshold;
                  return (
                    <div key={s.threshold} className="flex items-center gap-1">
                      <span className={`text-[10.5px] px-2 py-1 rounded-full whitespace-nowrap ${done ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-ink-50 text-ink-400 border border-ink-100"}`}>{s.label}</span>
                      {i < rndDocStates.length - 1 && <span className="text-ink-300 text-xs">←</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            {view.obstacles && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">مانع فعلی: {view.obstacles}</p>}
            <div>
              <p className="text-xs font-bold text-ink-700 mb-1.5">عناوین فرصت‌های تحقیق و توسعه</p>
              <ol className="list-decimal pr-5 text-sm text-ink-800 space-y-1">
                {view.topics.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
              {view.topics.length === 0 && <p className="text-[11px] text-ink-400">هنوز عنوانی احصاء نشده است.</p>}
            </div>
            <div>
              <p className="text-xs font-bold text-ink-700 mb-1.5">فایل‌های سند</p>
              {view.files.map((f) => (
                <div key={f.id} className="flex items-center gap-2 text-xs bg-ink-50 rounded-md px-2.5 py-1.5 mb-1">
                  <Paperclip size={12} className="text-ink-400" />
                  <span className="flex-1">{f.name}</span>
                  <span className="text-ink-400">{f.size}</span>
                  <button onClick={() => downloadFile(f.name)} className="text-brand-700 flex items-center gap-1 hover:underline">
                    <Download size={12} /> دانلود
                  </button>
                </div>
              ))}
              {view.files.length === 0 && <p className="text-[11px] text-ink-400">فایلی بارگذاری نشده است.</p>}
            </div>
            {view.notes && <p className="text-sm text-ink-700 leading-7">{view.notes}</p>}
            <div>
              <p className="text-xs font-bold text-ink-700 mb-1.5">تاریخچه</p>
              {view.history.map((h, i) => (
                <p key={i} className="text-[11.5px] text-ink-600 py-0.5">
                  {h.at} · {h.by}: {h.text}
                </p>
              ))}
            </div>
            {canEdit && (
              <Button size="sm" variant="secondary" onClick={() => { setDraft({ ...view }); setViewId(null); }}>
                ویرایش سند
              </Button>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "ویرایش سند فرصت" : "سند فرصت جدید"} width="max-w-2xl">
        {draft && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="شرکت بنیادی">
                <input className="input-field" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} autoFocus />
              </Field>
              <Field label="هلدینگ">
                <input className="input-field" list="rnd-holdings" value={draft.holding} onChange={(e) => setDraft({ ...draft, holding: e.target.value })} />
                <datalist id="rnd-holdings">
                  {[...new Set([...holdings.map((h) => h.name), ...km.rnd.map((r) => r.holding)])].map((h) => (
                    <option key={h} value={h} />
                  ))}
                </datalist>
              </Field>
              <Field label="مرحله‌ی تدوین">
                <select className="input-field" value={draft.progress} onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })}>
                  {rndDocStates.map((s) => (
                    <option key={s.threshold} value={s.threshold}>
                      {fa(s.threshold)}٪ — {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="مسئول تدوین">
                <input className="input-field" value={draft.lead} onChange={(e) => setDraft({ ...draft, lead: e.target.value })} />
              </Field>
              <Field label="تاریخ آغاز">
                <JalaliDatePicker value={draft.startDate} onChange={(v) => setDraft({ ...draft, startDate: v })} />
              </Field>
              <Field label="مانع (اختیاری)">
                <input className="input-field" value={draft.obstacles ?? ""} onChange={(e) => setDraft({ ...draft, obstacles: e.target.value || undefined })} />
              </Field>
            </div>
            <Field label="عناوین فرصت">
              <div className="flex flex-wrap gap-1 mb-1.5">
                {draft.topics.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-[11px] bg-brand-50 text-brand-700 rounded px-1.5 py-0.5">
                    {t}
                    <button onClick={() => setDraft({ ...draft, topics: draft.topics.filter((x) => x !== t) })} aria-label="حذف">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="input-field flex-1" value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && topic.trim()) { setDraft({ ...draft, topics: [...draft.topics, topic.trim()] }); setTopic(""); } }} placeholder="عنوان فرصت را بنویسید و Enter بزنید" />
              </div>
            </Field>
            <Field label="فایل‌های سند">
              <FilePicker files={draft.files} onChange={(files) => setDraft({ ...draft, files })} />
            </Field>
            <Field label="یادداشت">
              <textarea className="input-field min-h-[60px]" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
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
    </div>
  );
}
