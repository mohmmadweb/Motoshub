import { useRef, useState } from "react";
import { FileText, Upload, Download, Eye, History, Paperclip, Search } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import RowActions from "../../components/ui/RowActions";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { fa } from "../../pm/jalali";
import type { DocType, PMDocument } from "../../pm/types";
import { Field, SectionTitle, TaskSelect, taskTitle, useProjectPage } from "./shared";

const types: DocType[] = ["قرارداد", "پروپوزال", "گزارش", "فایل طراحی", "مستندات فنی", "فایل مالی", "صورت‌جلسه", "ارائه", "سایر"];
const sizeOf = (b: number) => (b > 1024 * 1024 ? `${fa(Math.round((b / 1024 / 1024) * 10) / 10)} مگابایت` : `${fa(Math.max(1, Math.round(b / 1024)))} کیلوبایت`);

export default function DocumentsTab() {
  const { p, pid, can, openTask, goTab, focusId } = useProjectPage();
  const canEdit = can("projects.documents");
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [type, setType] = useState<DocType | "">("");
  const [q, setQ] = useState("");
  const [up, setUp] = useState<{ name: string; size: string; type: DocType; taskId: string; meetingId: string } | null>(null);
  const [preview, setPreview] = useState<PMDocument | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = p.documents.filter((d) => (!type || d.type === type) && (!q || d.name.includes(q)));
  const where = (d: PMDocument) => {
    if (d.taskId) return <button onClick={() => openTask(d.taskId!)} className="text-brand-700 hover:underline text-right">تسک: {taskTitle(p, d.taskId)}</button>;
    if (d.meetingId) return <button onClick={() => goTab("minutes", d.meetingId)} className="text-brand-700 hover:underline text-right">جلسه: {p.meetings.find((m) => m.id === d.meetingId)?.title ?? "—"}</button>;
    if (d.channelId) return <button onClick={() => goTab("communication")} className="text-brand-700 hover:underline text-right">کانال: #{p.channels.find((c) => c.id === d.channelId)?.name ?? "—"}</button>;
    return <span className="text-ink-400">اسناد عمومی پروژه</span>;
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        icon={<FileText size={15} className="text-brand-600" />}
        title="اسناد پروژه"
        hint="قرارداد، پروپوزال، گزارش، فایل طراحی، مستندات فنی، فایل مالی، صورت‌جلسه و ارائه — قابل اتصال به تسک، جلسه یا کانال"
        action={
          canEdit && (
            <>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setUp({ name: f.name, size: sizeOf(f.size), type: "سایر", taskId: "", meetingId: "" });
                  e.target.value = "";
                }}
              />
              <Button size="sm" variant="primary" icon={<Upload size={13} />} onClick={() => fileRef.current?.click()}>
                بارگذاری فایل
              </Button>
            </>
          )
        }
      />
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی نام فایل…" className="input-field !py-1.5 !pr-8 !text-xs w-48" />
        </div>
        <button onClick={() => setType("")} className={`text-xs px-2.5 py-1 rounded-md border ${!type ? "bg-navy-900 text-white border-navy-900" : "bg-white border-ink-200 text-ink-600"}`}>
          همه ({fa(p.documents.length)})
        </button>
        {types.filter((t) => p.documents.some((d) => d.type === t)).map((t) => (
          <button key={t} onClick={() => setType(t)} className={`text-xs px-2.5 py-1 rounded-md border ${type === t ? "bg-navy-900 text-white border-navy-900" : "bg-white border-ink-200 text-ink-600"}`}>
            {t} ({fa(p.documents.filter((d) => d.type === t).length)})
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="card divide-y divide-ink-100">
          {list.map((d) => (
            <div key={d.id} className={`p-3 flex items-center gap-3 flex-wrap ${focusId === d.id ? "bg-brand-50/40" : ""}`}>
              <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-600 flex items-center justify-center shrink-0">
                <Paperclip size={15} />
              </span>
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-medium text-ink-900">{d.name}</p>
                <p className="text-[11px] text-ink-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <Badge tone="neutral">{d.type}</Badge> {d.size} · نسخه‌ی {fa(d.version)} · {d.uploadedBy} · {d.date} · {where(d)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPreview(d)} className="p-1.5 text-ink-400 hover:text-brand-600" title="مشاهده" aria-label="مشاهده">
                  <Eye size={15} />
                </button>
                <button onClick={() => notify(`دانلود «${d.name}» (در نسخه‌ی واقعی از فضای ذخیره‌سازی سند)`, "info")} className="p-1.5 text-ink-400 hover:text-brand-600" title="دانلود" aria-label="دانلود">
                  <Download size={15} />
                </button>
                {canEdit && (
                  <button onClick={() => { pm.newDocumentVersion(pid, d.id); notify("نسخه‌ی جدید ثبت شد."); }} className="p-1.5 text-ink-400 hover:text-brand-600" title="بارگذاری نسخه‌ی جدید" aria-label="نسخه‌ی جدید">
                    <History size={15} />
                  </button>
                )}
                <RowActions onDelete={canEdit ? () => confirm({ title: `حذف سند «${d.name}»؟`, onConfirm: () => pm.removeDocument(pid, d.id) }) : undefined} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<FileText size={20} />} title="سندی نیست" description="فایل‌های پروژه را بارگذاری و به تسک یا جلسه متصل کنید." />
      )}

      <Modal open={!!up} onClose={() => setUp(null)} title="بارگذاری سند" description={up ? `${up.name} · ${up.size}` : undefined}>
        {up && (
          <div className="space-y-3">
            <Field label="نوع سند">
              <select className="input-field" value={up.type} onChange={(e) => setUp({ ...up, type: e.target.value as DocType })}>
                {types.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="اتصال به تسک (اختیاری)">
              <TaskSelect p={p} value={up.taskId} onChange={(v) => setUp({ ...up, taskId: v })} placeholder="—" />
            </Field>
            <Field label="اتصال به جلسه (اختیاری)">
              <select className="input-field" value={up.meetingId} onChange={(e) => setUp({ ...up, meetingId: e.target.value })}>
                <option value="">—</option>
                {p.meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </Field>
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => {
                pm.addDocument(pid, { name: up.name, type: up.type, size: up.size, taskId: up.taskId || undefined, meetingId: up.meetingId || undefined });
                notify("سند بارگذاری شد.");
                setUp(null);
              }}
            >
              بارگذاری
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name ?? ""} width="max-w-2xl">
        {preview && (
          <div className="aspect-[4/3] rounded-lg bg-ink-100 flex flex-col items-center justify-center text-ink-500 gap-2">
            <FileText size={40} />
            <p className="text-sm">پیش‌نمایش {preview.type}</p>
            <p className="text-xs text-ink-400">
              نسخه‌ی {fa(preview.version)} · {preview.size}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
