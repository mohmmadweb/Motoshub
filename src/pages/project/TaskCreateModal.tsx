import { useEffect, useState } from "react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { addDays, diffDays } from "../../pm/jalali";
import { defaultLabels } from "../../pm/seed";
import type { PMPriority, Recurrence } from "../../pm/types";
import { Field, MemberSelect, numIn, priorities, useProjectPage } from "./shared";

export default function TaskCreateModal({ open, onClose, defaultStatus }: { open: boolean; onClose: () => void; defaultStatus?: string }) {
  const { p, pid, refDate } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState<PMPriority>("متوسط");
  const [start, setStart] = useState(refDate);
  const [due, setDue] = useState(addDays(refDate, 7));
  const [status, setStatus] = useState(defaultStatus ?? p.columns[0]?.id ?? "");
  const [labels, setLabels] = useState<string[]>([]);
  const [preds, setPreds] = useState<string[]>([]);
  const [estBudget, setEstBudget] = useState("");
  const [estHours, setEstHours] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [points, setPoints] = useState(0);
  const [recurrence, setRecurrence] = useState<Recurrence | "">("");
  const sprints = (p.sprints ?? []).filter((x) => x.status !== "تکمیل‌شده");

  useEffect(() => {
    if (open) {
      setStart(refDate);
      setDue(addDays(refDate, 7));
      setStatus(defaultStatus ?? p.columns[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setAssignee("");
    setPriority("متوسط");
    setLabels([]);
    setPreds([]);
    setEstBudget("");
    setEstHours("");
    setMilestoneId("");
    setSprintId("");
    setPoints(0);
    setRecurrence("");
  };

  const submit = () => {
    if (!title.trim()) return notify("عنوان تسک الزامی است.", "warning");
    if (diffDays(start, due) < 0) return notify("سررسید نمی‌تواند قبل از شروع باشد.", "warning");
    pm.createTask(pid, { title: title.trim(), description, assignee, priority, start, due, status, labels, predecessors: preds, estBudget: numIn(estBudget), estHours: numIn(estHours), milestoneId: milestoneId || undefined, sprintId: sprintId || undefined, storyPoints: points || undefined, recurrence: recurrence || undefined });
    notify(`تسک «${title.trim()}» ایجاد شد${assignee ? ` و به «${assignee}» اعلان رفت` : ""}.`);
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="ایجاد تسک جدید" description="مسئول، سررسید، بودجه و پیش‌نیازها را همین‌جا تعیین کنید." width="max-w-2xl">
      <div className="space-y-3">
        <Field label="عنوان تسک">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: برگزاری جلسه هماهنگی با پیمانکار" className="input-field" autoFocus />
        </Field>
        <Field label="توضیحات">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[60px]" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="مسئول">
            <MemberSelect p={p} value={assignee} onChange={setAssignee} />
          </Field>
          <Field label="اولویت">
            <select value={priority} onChange={(e) => setPriority(e.target.value as PMPriority)} className="input-field">
              {priorities.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="ستون / وضعیت">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
              {p.columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="تاریخ شروع">
            <JalaliDatePicker value={start} onChange={setStart} />
          </Field>
          <Field label="سررسید">
            <JalaliDatePicker value={due} onChange={setDue} />
          </Field>
          <Field label="مایل‌ستون">
            <select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} className="input-field">
              <option value="">—</option>
              {p.milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="بودجه‌ی تخمینی (ریال)">
            <input value={estBudget} onChange={(e) => setEstBudget(e.target.value)} inputMode="numeric" className="input-field" placeholder="۰" />
          </Field>
          <Field label="برآورد ساعت">
            <input value={estHours} onChange={(e) => setEstHours(e.target.value)} inputMode="numeric" className="input-field" placeholder="۰" />
          </Field>
          {sprints.length > 0 && (
            <Field label="اسپرینت">
              <select value={sprintId} onChange={(e) => setSprintId(e.target.value)} className="input-field">
                <option value="">بک‌لاگ</option>
                {sprints.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="امتیاز (Story Point)">
            <select value={points} onChange={(e) => setPoints(Number(e.target.value))} className="input-field">
              <option value={0}>—</option>
              {[1, 2, 3, 5, 8, 13, 21].map((n) => (
                <option key={n} value={n}>
                  {n.toLocaleString("fa-IR")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="تکرار">
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence | "")} className="input-field">
              <option value="">بدون تکرار</option>
              {(["روزانه", "هفتگی", "ماهانه"] as Recurrence[]).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="برچسب‌ها">
          <div className="flex flex-wrap gap-1.5">
            {defaultLabels.map((l) => (
              <button key={l} type="button" onClick={() => setLabels((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]))} className={`text-[11px] px-2 py-1 rounded-md border ${labels.includes(l) ? "bg-brand-50 border-brand-300 text-brand-700" : "border-ink-200 text-ink-500"}`}>
                {l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="پیش‌نیازها (این تسک بعد از پایان این‌ها شروع می‌شود)" hint="وابستگی «پایان به شروع» — در گراف وابستگی و گانت نمایش داده می‌شود.">
          <div className="max-h-36 overflow-y-auto border border-ink-200 rounded-lg p-2 space-y-1">
            {p.tasks.filter((t) => !t.archived).map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-xs text-ink-700">
                <input type="checkbox" checked={preds.includes(t.id)} onChange={() => setPreds((x) => (x.includes(t.id) ? x.filter((y) => y !== t.id) : [...x, t.id]))} className="accent-[var(--color-brand-600)]" />
                <span className="flex-1">{t.title}</span>
                <span className="text-ink-400">{t.due}</span>
              </label>
            ))}
            {p.tasks.length === 0 && <p className="text-[11px] text-ink-400">هنوز تسکی وجود ندارد.</p>}
          </div>
        </Field>
        <div className="flex items-center gap-2 pt-2">
          <Button variant="primary" className="flex-1 justify-center" onClick={submit}>
            ایجاد تسک
          </Button>
          <Button variant="secondary" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </Modal>
  );
}
