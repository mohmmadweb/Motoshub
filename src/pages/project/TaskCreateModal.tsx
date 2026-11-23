import { useContext, useEffect, useMemo, useState } from "react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { addDays, diffDays } from "../../pm/jalali";
import { defaultLabels } from "../../pm/seed";
import type { PMPriority, ProjectState, Recurrence, TaskTemplate, TaskType } from "../../pm/types";
import { typeLabel } from "../../pm/selectors";
import { phasesOf } from "../../pm/rules";
import { taskTypes } from "./taskTypes";
import { Field, MemberSelect, ProjectPageContext, numIn, priorities } from "./shared";
import { useProjectRules } from "./useRules";

/**
 * ایجاد کار. داخل صفحه‌ی پروژه پروژه از زمینه می‌آید؛ بیرون از آن (مثل «فعالیت و وظایف من» با ‎?new=task‎)
 * انتخاب پروژه در خود فرم است (`projects` = پروژه‌هایی که کاربر می‌تواند در آن‌ها کار بسازد).
 * فیلدهای میزیتو («پیشنهادی»): الگوی وظیفه، مسئولان هم‌زمان + تأییدکننده‌ی نهایی، فاز، وزن، یادآوری جدا از سررسید.
 */
export default function TaskCreateModal({ open, onClose, defaultStatus, projects, defaultProjectId }: { open: boolean; onClose: () => void; defaultStatus?: string; projects?: ProjectState[]; defaultProjectId?: string }) {
  const ctx = useContext(ProjectPageContext);
  const pm = useProjectsPM();
  const { notify } = useToast();
  const refDate = pm.refDate;
  const choices = projects ?? (ctx ? [ctx.p] : []);
  const [pidSel, setPidSel] = useState(ctx?.pid ?? defaultProjectId ?? choices[0]?.meta.id ?? "");
  const p = (ctx && !projects ? ctx.p : pm.getProject(pidSel)) ?? choices[0];
  const pid = p?.meta.id ?? "";
  const rules = useProjectRules(p);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [co, setCo] = useState<string[]>([]);
  const [approver, setApprover] = useState("");
  const [priority, setPriority] = useState<PMPriority>(p?.defaultTaskPriority ?? "متوسط");
  const [start, setStart] = useState(refDate);
  const [due, setDue] = useState(addDays(refDate, 7));
  const [reminder, setReminder] = useState("");
  const [status, setStatus] = useState(defaultStatus ?? p?.columns[0]?.id ?? "");
  const [labels, setLabels] = useState<string[]>([]);
  const [preds, setPreds] = useState<string[]>([]);
  const [estBudget, setEstBudget] = useState("");
  const [estHours, setEstHours] = useState("");
  const [weight, setWeight] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [points, setPoints] = useState(0);
  const [recurrence, setRecurrence] = useState<Recurrence | "">("");
  const [type, setType] = useState<TaskType>(p?.defaultTaskType && p.defaultTaskType !== "subtask" ? p.defaultTaskType : "task");
  const [epicId, setEpicId] = useState("");
  const [checklist, setChecklist] = useState<string[]>([]);
  const [tplId, setTplId] = useState("");
  const [more, setMore] = useState(false);

  // الگوهای وظیفه‌ی فعال: الگوهای همین پروژه + الگوهای پروژه‌های دیگرِ قابل‌مشاهده (میزیتو)
  const templates = useMemo(() => {
    const own = (p?.taskTemplates ?? []).filter((t) => t.active).map((t) => ({ t, from: p!.meta.name }));
    const others = pm.projects.filter((x) => x.meta.id !== pid && !x.meta.archived).flatMap((x) => (x.taskTemplates ?? []).filter((t) => t.active).map((t) => ({ t, from: x.meta.name })));
    return [...own, ...others];
  }, [p, pm.projects, pid]);

  useEffect(() => {
    if (!open) return;
    setStart(refDate);
    setDue(addDays(refDate, 7));
    setStatus(defaultStatus ?? p?.columns[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    // با عوض شدن پروژه، فیلدهای وابسته به پروژه پاک می‌شوند
    setAssignee("");
    setCo([]);
    setApprover("");
    setStatus(defaultStatus ?? p?.columns[0]?.id ?? "");
    setPreds([]);
    setMilestoneId("");
    setPhaseId("");
    setSprintId("");
    setEpicId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  if (!p) return null;
  const epics = p.tasks.filter((t) => t.type === "epic" && !t.archived);
  const sprints = (p.sprints ?? []).filter((x) => x.status !== "تکمیل‌شده");
  const phases = phasesOf(p);
  const memberNames = p.members.map((m) => m.name);

  const applyTemplate = (id: string) => {
    setTplId(id);
    const t: TaskTemplate | undefined = templates.find((x) => x.t.id === id)?.t;
    if (!t) return;
    setTitle(t.title);
    setDescription(t.description);
    setPriority(t.priority);
    if (t.type && t.type !== "subtask") setType(t.type);
    setLabels(t.labels);
    setChecklist(t.checklist);
    setEstHours(t.estHours ? String(t.estHours) : "");
    setWeight(t.weight ? String(t.weight) : "");
    setDue(addDays(start, Math.max(0, t.durationDays - 1)));
  };

  const reset = () => {
    setTitle("");
    setDescription("");
    setAssignee("");
    setCo([]);
    setApprover("");
    setReminder("");
    setPriority(p.defaultTaskPriority ?? "متوسط");
    setLabels([]);
    setPreds([]);
    setEstBudget("");
    setEstHours("");
    setWeight("");
    setMilestoneId("");
    setPhaseId("");
    setSprintId("");
    setPoints(0);
    setRecurrence("");
    setType(p.defaultTaskType && p.defaultTaskType !== "subtask" ? p.defaultTaskType : "task");
    setEpicId("");
    setChecklist([]);
    setTplId("");
  };

  const submit = () => {
    if (!title.trim()) return notify("این فیلد لازم است: عنوان کار.", "warning");
    if (!start || !due) return notify("تاریخ شروع و سررسید هر دو لازم‌اند.", "warning");
    if (diffDays(start, due) < 0) return notify("سررسید نمی‌تواند قبل از شروع باشد.", "warning");
    if (!rules.canCreateTasks) return notify("در این پروژه فقط مدیر پروژه کار تازه می‌سازد.", "warning");
    pm.createTask(pid, {
      title: title.trim(),
      description,
      assignee,
      priority,
      start,
      due,
      status,
      labels,
      predecessors: preds,
      estBudget: numIn(estBudget),
      estHours: numIn(estHours),
      milestoneId: milestoneId || undefined,
      sprintId: sprintId || undefined,
      storyPoints: points || undefined,
      recurrence: recurrence || undefined,
      type,
      epicId: type === "epic" ? undefined : epicId || undefined,
      coAssignees: co.filter((x) => x !== assignee),
      finalApprover: approver || undefined,
      phaseId: phaseId || undefined,
      weight: numIn(weight) || undefined,
      reminder: reminder || undefined,
      checklist,
    });
    const people = [assignee, ...co].filter(Boolean);
    notify(`کار «${title.trim()}» در «${p.meta.name}» ایجاد شد${people.length ? ` و به ${people.map((x) => `«${x}»`).join("، ")} اعلان رفت` : ""}.`);
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="کار جدید" description="عنوان، پروژه، مسئول، شروع و سررسید کافی است؛ بقیه اختیاری‌اند." width="max-w-2xl">
      <div className="space-y-3">
        {(projects && projects.length > 0) || templates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projects && projects.length > 0 && (
              <Field label="پروژه">
                <select value={pidSel} onChange={(e) => setPidSel(e.target.value)} className="input-field">
                  {projects.map((x) => (
                    <option key={x.meta.id} value={x.meta.id}>
                      {x.meta.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {templates.length > 0 && (
              <Field label="از الگوی وظیفه" hint="عنوان، شرح، چک‌لیست، برچسب و مدت از الگو پر می‌شود.">
                <select value={tplId} onChange={(e) => applyTemplate(e.target.value)} className="input-field">
                  <option value="">بدون الگو</option>
                  {templates.map(({ t, from }) => (
                    <option key={`${from}-${t.id}`} value={t.id}>
                      {t.name}
                      {from !== p.meta.name ? ` — ${from}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        ) : null}
        <Field label="عنوان کار">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: برگزاری جلسه هماهنگی با پیمانکار" className="input-field" autoFocus />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="مسئول">
            <MemberSelect p={p} value={assignee} onChange={setAssignee} />
          </Field>
          <Field label="تاریخ شروع">
            <JalaliDatePicker value={start} onChange={setStart} />
          </Field>
          <Field label="سررسید (مهلت)">
            <JalaliDatePicker value={due} onChange={setDue} />
          </Field>
          <Field label="اولویت">
            <select value={priority} onChange={(e) => setPriority(e.target.value as PMPriority)} className="input-field">
              {priorities.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="یادآوری" hint="روزی که کار در «امروز» صندوق شما بیاید؛ تأخیر فقط از سررسید حساب می‌شود.">
            <div className="flex items-center gap-1">
              <div className="flex-1 min-w-0">
                <JalaliDatePicker value={reminder} onChange={setReminder} placeholder="بدون یادآوری" />
              </div>
              {reminder && (
                <button type="button" onClick={() => setReminder("")} className="btn btn-ghost btn-icon btn-sm" aria-label="حذف یادآوری">
                  ×
                </button>
              )}
            </div>
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
        </div>
        <Field label="مسئولان هم‌زمان" hint="با «انجام شد» هر یک از مسئولان، کار برای همه بسته می‌شود.">
          <div className="flex flex-wrap gap-1.5">
            {memberNames
              .filter((n) => n !== assignee)
              .map((n) => (
                <button key={n} type="button" onClick={() => setCo((x) => (x.includes(n) ? x.filter((y) => y !== n) : [...x, n]))} className={`text-[12px] px-2 py-1 rounded-full border ${co.includes(n) ? "bg-teal-50 border-teal-500 text-teal-700 font-bold" : "border-ink-200 text-ink-600"}`} aria-pressed={co.includes(n)}>
                  {n}
                </button>
              ))}
          </div>
        </Field>
        {(co.length > 0 || approver) && (
          <Field label="تأییدکننده‌ی نهایی" hint="با «انجام شد» کار به بازبینی می‌رود تا تأییدکننده تأیید یا رد کند.">
            <MemberSelect p={p} value={approver} onChange={setApprover} />
          </Field>
        )}
        <button type="button" onClick={() => setMore((v) => !v)} className="text-[13px] text-teal-700 hover:underline">
          {more ? "پنهان کردن جزئیات بیشتر" : "جزئیات بیشتر (شرح، فاز، وزن، برآورد، پیش‌نیاز، …)"}
        </button>
        {more && (
          <>
            <Field label="توضیحات">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[60px]" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="نوع کار">
                <select value={type} onChange={(e) => setType(e.target.value as TaskType)} className="input-field">
                  {taskTypes
                    .filter((x) => x !== "subtask" && (!p.taskTypes?.length || p.taskTypes.includes(x) || x === type))
                    .map((x) => (
                      <option key={x} value={x}>
                        {typeLabel[x]}
                      </option>
                    ))}
                </select>
              </Field>
              {epics.length > 0 && type !== "epic" && (
                <Field label="اپیک">
                  <select value={epicId} onChange={(e) => setEpicId(e.target.value)} className="input-field">
                    <option value="">—</option>
                    {epics.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.title}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {phases.length > 0 && (
                <Field label="فاز (WBS)">
                  <select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} className="input-field">
                    <option value="">بدون فاز</option>
                    {phases.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.title}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="وزن (چگالی)">
                <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="numeric" className="input-field" placeholder="—" />
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
                {[...new Set([...defaultLabels, ...labels])].map((l) => (
                  <button key={l} type="button" onClick={() => setLabels((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]))} className={`text-[12px] px-2 py-1 rounded-md border ${labels.includes(l) ? "bg-teal-50 border-teal-500 text-teal-700" : "border-ink-200 text-ink-500"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            {checklist.length > 0 && (
              <Field label="چک‌لیست (از الگو)">
                <ul className="text-[13px] text-ink-700 list-disc pr-5 space-y-0.5">
                  {checklist.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </Field>
            )}
            <Field label="پیش‌نیازها (این کار بعد از پایان این‌ها شروع می‌شود)" hint="وابستگی «پایان به شروع» — در گراف وابستگی و گانت نمایش داده می‌شود.">
              <div className="max-h-36 overflow-y-auto border border-ink-200 rounded-lg p-2 space-y-1">
                {p.tasks
                  .filter((t) => !t.archived)
                  .map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-xs text-ink-700">
                      <input type="checkbox" checked={preds.includes(t.id)} onChange={() => setPreds((x) => (x.includes(t.id) ? x.filter((y) => y !== t.id) : [...x, t.id]))} className="accent-[var(--color-brand-600)]" />
                      <span className="flex-1">{t.title}</span>
                      <span className="text-ink-400">{t.due}</span>
                    </label>
                  ))}
                {p.tasks.length === 0 && <p className="text-[11px] text-ink-400">هنوز کاری وجود ندارد.</p>}
              </div>
            </Field>
          </>
        )}
        <div className="flex items-center gap-2 pt-2">
          <Button variant="primary" onClick={submit} disabled={!rules.canCreateTasks}>
            ایجاد کار
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          {!rules.canCreateTasks && <span className="text-[12.5px] text-amber-700">در این پروژه فقط مدیر پروژه کار تازه می‌سازد.</span>}
        </div>
      </div>
    </Modal>
  );
}
