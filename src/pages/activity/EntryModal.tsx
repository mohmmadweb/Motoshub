// پنجره‌ی ثبت/ویرایش زمان — ساعت به شکل «۷:۳۰» یا «۷٫۵» پذیرفته می‌شود
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { entryTypeLabel, entryTypes, fmtHM, parseHours, sourceLabel, type EntryType, type TimeEntry } from "../../timesheet/types";
import type { ProjectOpt } from "./lib";
import { SourceIcon } from "./ui";

export type EntryDraft = { date: string; hours: string; type: EntryType; projectId: string; taskId: string; description: string };

export const draftOf = (e: TimeEntry): EntryDraft => ({
  date: e.date,
  hours: fmtHM(e.hours),
  type: e.type,
  projectId: e.projectId ?? "",
  taskId: e.taskId ?? "",
  description: e.description,
});

export default function EntryModal({
  open,
  onClose,
  entry,
  defaultDate,
  projects,
  readOnly,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  /** ویرایش ورودی موجود (یا null برای ثبت جدید) */
  entry: TimeEntry | null;
  defaultDate: string;
  projects: ProjectOpt[];
  readOnly?: boolean;
  onSave: (d: { date: string; hours: number; type: EntryType; projectId?: string; taskId?: string; description: string }) => void;
}) {
  const blank: EntryDraft = { date: defaultDate, hours: "", type: "work", projectId: "", taskId: "", description: "" };
  const [d, setD] = useState<EntryDraft>(blank);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (open) {
      setD(entry ? draftOf(entry) : { ...blank, date: defaultDate });
      setErr("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry, defaultDate]);

  const project = projects.find((p) => p.id === d.projectId);
  const projectMissing = !!d.projectId && !project;
  const save = () => {
    const h = parseHours(d.hours);
    if (d.type === "leave_daily" && !d.hours.trim()) {
      onSave({ date: d.date, hours: 8, type: d.type, description: d.description.trim() || "مرخصی روزانه" });
      return;
    }
    if (h === null) {
      setErr("ساعت را به شکل ۸ یا ۷:۳۰ یا ۷٫۵ وارد کنید (بیشتر از صفر و حداکثر ۲۴).");
      return;
    }
    if (!d.date) {
      setErr("تاریخ را انتخاب کنید.");
      return;
    }
    onSave({ date: d.date, hours: h, type: d.type, projectId: d.projectId || undefined, taskId: d.taskId || undefined, description: d.description.trim() });
  };
  const leave = d.type === "leave_daily" || d.type === "leave_hourly";

  return (
    <Modal open={open} onClose={onClose} title={entry ? "ویرایش زمان" : "ثبت زمان"} description={entry ? `منبع: ${sourceLabel[entry.source]}` : "ساعت را مثل گوگل‌شیت بنویسید: ۸ یا ۷:۳۰"}>
      {readOnly && (
        <p className="mb-3 rounded-lg bg-ink-100 text-ink-600 text-xs p-2.5 flex items-center gap-2">
          <Lock size={13} /> این ورودی فقط‌خواندنی است (ثبت تایمر پروژه، ساعت ثابت یا دوره‌ی ارسال‌شده).
        </p>
      )}
      <fieldset disabled={readOnly} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-ink-600">
            تاریخ
            <div className="mt-1">
              <JalaliDatePicker value={d.date} onChange={(v) => setD({ ...d, date: v })} />
            </div>
          </label>
          <label className="block text-xs text-ink-600">
            ساعت
            <input
              className="input-field mt-1 text-center"
              inputMode="decimal"
              placeholder={d.type === "leave_daily" ? "۸ (پیش‌فرض)" : "۷:۳۰"}
              value={d.hours}
              onChange={(e) => setD({ ...d, hours: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && save()}
              autoFocus
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="نوع">
          {entryTypes.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={d.type === t}
              onClick={() => setD({ ...d, type: t, ...(t === "leave_daily" || t === "leave_hourly" ? { projectId: "", taskId: "" } : {}) })}
              className={`px-2.5 py-1 rounded-full text-xs border ${d.type === t ? "bg-brand-600 border-brand-600 text-white" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}
            >
              {entryTypeLabel[t]}
            </button>
          ))}
        </div>
        {!leave && (
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-xs text-ink-600">
              پروژه
              <select className="input-field mt-1" value={d.projectId} onChange={(e) => setD({ ...d, projectId: e.target.value, taskId: "" })}>
                <option value="">بدون پروژه (کار عمومی)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                {projectMissing && <option value={d.projectId}>پروژه‌ی خارج از دسترس</option>}
              </select>
            </label>
            <label className="block text-xs text-ink-600">
              تسک (اختیاری)
              <select className="input-field mt-1" value={d.taskId} onChange={(e) => setD({ ...d, taskId: e.target.value })} disabled={!project}>
                <option value="">—</option>
                {project?.tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <label className="block text-xs text-ink-600">
          شرح
          <textarea className="input-field mt-1 min-h-[70px]" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} placeholder={leave ? "دلیل مرخصی (اختیاری)" : "چه کاری انجام دادید؟"} />
        </label>
        {entry?.externalRef && (
          <p className="text-[11px] text-ink-400 flex items-center gap-1.5">
            <SourceIcon source={entry.source} size={18} /> شناسه‌ی بیرونی: <span dir="ltr">{entry.externalRef}</span>
          </p>
        )}
        {err && <p className="text-xs text-rose-600">{err}</p>}
      </fieldset>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>
          {readOnly ? "بستن" : "انصراف"}
        </Button>
        {!readOnly && (
          <Button variant="primary" onClick={save}>
            {entry?.review === "pending" ? "ذخیره و پذیرش" : "ذخیره"}
          </Button>
        )}
      </div>
    </Modal>
  );
}
