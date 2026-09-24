import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CheckSquare, Clock, History, Link2, MessageSquare, Plus, Save, Trash2, Wallet, X, Paperclip, Eye, EyeOff, Play, Square, ListTree, CornerDownLeft, ShieldCheck, Repeat } from "lucide-react";
import { useTenancy } from "../../context/TenancyContext";
import Modal from "../../components/ui/Modal";
import TaskCostItems from "./TaskCostItems";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { createsCycle, isDone, openPredecessors, predecessorsOf, successorsOf, taskActualCost, taskLoggedHours, columnLabel, kindOf } from "../../pm/selectors";
import { fa, fmtRial, fmtHours, diffDays } from "../../pm/jalali";
import { defaultLabels } from "../../pm/seed";
import type { PMTask, Recurrence } from "../../pm/types";
import { Field, MemberSelect, Progress, TaskFlags, TaskSelect, kindColor, kindTone, numIn, priorities, priorityTone, useProjectPage } from "./shared";

type Section = "details" | "subtasks" | "checklist" | "deps" | "cost" | "comments" | "history";

/** نمایش hh:mm:ss برای تایمر */
const clock = (ms: number) => {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const x = sec % 60;
  return [h, m, x].map((n) => String(n).padStart(2, "0")).join(":").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
};
/** فیلدهایی که با اکشن اختصاصی خودشان ذخیره می‌شوند، نه با «ذخیره‌ی تغییرات» */
const liveKeys = { checklist: [], comments: [], status: "", watchers: [], approval: null, timer: null } as const;

export default function TaskDrawer({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const { p, pid, canEdit, can, refDate, openTask, goTab } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const confirm = useConfirm();
  const t = p.tasks.find((x) => x.id === taskId);
  const [section, setSection] = useState<Section>("details");
  const [draft, setDraft] = useState<PMTask | null>(null);
  const [checkText, setCheckText] = useState("");
  const [comment, setComment] = useState("");
  const [newPred, setNewPred] = useState("");
  const [newSucc, setNewSucc] = useState("");
  const [hours, setHours] = useState("");
  const [hoursWho, setHoursWho] = useState("");
  const [subTitle, setSubTitle] = useState("");
  const [subWho, setSubWho] = useState("");
  const [approver, setApprover] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const { actingUser } = useTenancy();
  const me = actingUser.name;
  const running = !!t?.timer;
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [running]);

  useEffect(() => {
    setDraft(t ? structuredClone(t) : null);
    setSection("details");
    // فقط با عوض شدن تسک بازنشانی می‌شود، نه با هر تغییر داده
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  if (!t || !draft) return null;

  const preds = predecessorsOf(p, t.id);
  const succs = successorsOf(p, t.id);
  const open = openPredecessors(p, t.id);
  const actual = taskActualCost(p, t.id);
  const logged = taskLoggedHours(p, t.id);
  const doneCount = t.checklist.filter((c) => c.done).length;
  const history = p.logs.filter((l) => l.entity?.id === t.id || (l.entity?.type === "dependency" && p.deps.some((d) => d.id === l.entity?.id && (d.predecessor === t.id || d.successor === t.id)))).sort((a, b) => b.seq - a.seq);
  const dirty = JSON.stringify({ ...draft, ...liveKeys }) !== JSON.stringify({ ...t, ...liveKeys });
  const subtasks = p.tasks.filter((x) => x.parentId === t.id && !x.archived);
  const subDone = subtasks.filter((x) => isDone(p, x)).length;
  const parent = t.parentId ? p.tasks.find((x) => x.id === t.parentId) : undefined;
  const watching = (t.watchers ?? []).includes(me);
  const sprints = (p.sprints ?? []).filter((x) => x.status !== "تکمیل‌شده" || x.id === t.sprintId);
  const fields = p.customFields ?? [];
  const doneCol = p.columns.find((c) => c.kind === "done")?.id;
  const todoCol = p.columns.find((c) => c.kind === "todo")?.id ?? p.columns[0]?.id;

  const save = () => {
    if (!draft.title.trim()) return notify("عنوان تسک الزامی است.", "warning");
    if (diffDays(draft.start, draft.due) < 0) return notify("سررسید نمی‌تواند قبل از تاریخ شروع باشد.", "warning");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { checklist: _c, comments: _m, status: _s, watchers: _w, approval: _a, timer: _t, ...patch } = draft;
    pm.updateTask(pid, t.id, patch);
    notify(`تغییرات تسک «${draft.title}» ذخیره و در تاریخچه ثبت شد.`);
  };

  const move = (status: string) => {
    const k = kindOf(p, status);
    const fromK = kindOf(p, t.status);
    const run = () => {
      pm.moveTask(pid, t.id, status);
      notify(`تسک به «${columnLabel(p, status)}» منتقل شد.`, "info");
    };
    if (open.length && ["doing", "review", "done"].includes(k) && ["backlog", "todo"].includes(fromK)) {
      confirm({
        title: "این تسک هنوز پیش‌نیاز انجام‌نشده دارد",
        message: `${open.map((x) => `«${x.title}»`).join("، ")} هنوز تمام نشده. در صورت ادامه، رویداد «شروع با پیش‌نیاز باز» ثبت و به مدیر پروژه اطلاع داده می‌شود.`,
        confirmLabel: "با این حال شروع کن",
        onConfirm: run,
      });
    } else run();
  };

  const addDep = (pred: string, succ: string) => {
    if (!pred || !succ) return;
    if (p.deps.some((d) => d.predecessor === pred && d.successor === succ)) return notify("این وابستگی از قبل وجود دارد.", "warning");
    if (createsCycle(p, pred, succ)) return notify("این وابستگی حلقه ایجاد می‌کند (A به B و B به A) و مجاز نیست.", "warning");
    pm.addDependency(pid, pred, succ);
    notify("وابستگی اضافه شد.");
    setNewPred("");
    setNewSucc("");
  };

  const sections: { id: Section; label: string; icon: typeof Clock; count?: number }[] = [
    { id: "details", label: "جزئیات", icon: CheckSquare },
    ...(parent ? [] : [{ id: "subtasks" as Section, label: "زیرتسک‌ها", icon: ListTree, count: subtasks.length }]),
    { id: "checklist", label: "چک‌لیست", icon: CheckSquare, count: t.checklist.length },
    { id: "deps", label: "وابستگی", icon: Link2, count: preds.length + succs.length },
    { id: "cost", label: "زمان و هزینه", icon: Wallet },
    { id: "comments", label: "نظرات", icon: MessageSquare, count: t.comments.length },
    { id: "history", label: "تاریخچه", icon: History, count: history.length },
  ];

  const docs = p.documents.filter((d) => d.taskId === t.id);

  const statusSelect = (
    <select
      value={t.status}
      disabled={!canEdit}
      onChange={(e) => move(e.target.value)}
      className="input-field !py-1.5 !text-xs !w-auto font-medium"
      aria-label="وضعیت تسک"
      style={{ borderInlineStartWidth: 4, borderInlineStartColor: kindColor[kindOf(p, t.status)] }}
    >
      {p.columns.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );

  return (
    <Modal open onClose={onClose} title={t.title} width="max-w-4xl">
      <div className="space-y-4">
        {parent && (
          <button onClick={() => openTask(parent.id)} className="-mt-2 text-[11.5px] text-ink-500 hover:text-brand-700 flex items-center gap-1">
            <CornerDownLeft size={12} /> زیرتسکِ «{parent.title}»
          </button>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => pm.toggleWatch(pid, t.id, me)}
            title={(t.watchers ?? []).length ? `دنبال‌کنندگان: ${(t.watchers ?? []).join("، ")}` : "هنوز کسی این تسک را دنبال نمی‌کند"}
            className={`text-[11.5px] px-2 py-1 rounded-md border flex items-center gap-1 ${watching ? "bg-brand-50 border-brand-300 text-brand-700" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}
          >
            {watching ? <EyeOff size={13} /> : <Eye size={13} />}
            {watching ? "دنبال نکن" : "دنبال کن"}
            {(t.watchers ?? []).length > 0 && <span className="text-[10px] bg-ink-100 text-ink-600 rounded-full px-1.5">{fa((t.watchers ?? []).length)}</span>}
          </button>
          {canEdit && (
            <button
              onClick={() => {
                if (!t.timer) return pm.startTimer(pid, t.id);
                const h = pm.stopTimer(pid, t.id);
                notify(`${fmtHours(h)} کار روی این تسک ثبت شد.`);
              }}
              title={t.timer ? `تایمر «${t.timer.by}» — برای توقف و ثبت زمان کلیک کنید` : "شروع تایمر؛ با توقف، زمان کار خودکار ثبت می‌شود"}
              className={`text-[11.5px] px-2 py-1 rounded-md border flex items-center gap-1 tabular-nums ${t.timer ? "bg-rose-50 border-rose-300 text-rose-700" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}
            >
              {t.timer ? <Square size={12} fill="currentColor" /> : <Play size={12} />}
              {t.timer ? clock(now - t.timer.startedAt) : "تایمر"}
            </button>
          )}
          {t.approval && (
            <Badge tone={t.approval.status === "تأییدشده" ? "success" : t.approval.status === "ردشده" ? "danger" : "warning"} icon={<ShieldCheck size={11} />}>
              {t.approval.status === "در انتظار" ? `منتظر تأیید ${t.approval.approver}` : t.approval.status}
            </Badge>
          )}
          {t.recurrence && (
            <Badge tone="navy" icon={<Repeat size={11} />}>
              تکرار {t.recurrence}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusSelect}
          <Badge tone={priorityTone[t.priority]}>اولویت {t.priority}</Badge>
          <span className="text-xs text-ink-500">
            {t.assignee} · {t.start} تا {t.due}
          </span>
          <TaskFlags p={p} t={t} refDate={refDate} />
          <div className="flex items-center gap-2 mr-auto min-w-[140px]">
            <Progress value={isDone(p, t) ? 100 : t.progress} className="flex-1" />
            <span className="text-xs text-ink-500">{fa(isDone(p, t) ? 100 : t.progress)}٪</span>
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-ink-200 overflow-x-auto">
          {sections.map((s) => (
            <button key={s.id} onClick={() => setSection(s.id)} className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px whitespace-nowrap ${section === s.id ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"}`}>
              {s.label}
              {s.count ? <span className="mr-1 text-[10px] bg-ink-100 rounded-full px-1.5">{fa(s.count)}</span> : null}
            </button>
          ))}
        </div>

        {section === "details" && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5">
            <div className="space-y-3 min-w-0">
              <Field label="عنوان">
                <input className="input-field" value={draft.title} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </Field>
              <Field label="توضیحات">
                <textarea className="input-field min-h-[120px]" value={draft.description} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="شرح کار، معیار پذیرش، …" />
              </Field>
              <Field label="برچسب‌ها">
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set([...defaultLabels, ...draft.labels])].map((l) => {
                    const on = draft.labels.includes(l);
                    return (
                      <button key={l} disabled={!canEdit} onClick={() => setDraft({ ...draft, labels: on ? draft.labels.filter((x) => x !== l) : [...draft.labels, l] })} className={`text-[11px] px-2 py-1 rounded-md border ${on ? "bg-brand-50 border-brand-300 text-brand-700" : "border-ink-200 text-ink-500 hover:bg-ink-50"}`}>
                        {l}
                      </button>
                    );
                  })}
                </div>
              </Field>
              {fields.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-ink-100 bg-ink-50/50 p-3">
                  {fields.map((f) => {
                    const v = draft.customFields?.[f.id] ?? "";
                    const set = (val: string) => setDraft({ ...draft, customFields: { ...(draft.customFields ?? {}), [f.id]: val } });
                    return (
                      <Field key={f.id} label={f.name}>
                        {f.type === "انتخابی" ? (
                          <select className="input-field" value={v} disabled={!canEdit} onChange={(e) => set(e.target.value)}>
                            <option value="">—</option>
                            {(f.options ?? []).map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        ) : f.type === "تاریخ" ? (
                          <JalaliDatePicker value={v} onChange={set} />
                        ) : (
                          <input className="input-field" value={v} disabled={!canEdit} inputMode={f.type === "عدد" ? "numeric" : undefined} onChange={(e) => set(e.target.value)} />
                        )}
                      </Field>
                    );
                  })}
                </div>
              )}
              <div className="rounded-lg border border-ink-100 p-3">
                <p className="text-xs font-medium text-ink-600 mb-2 flex items-center gap-1">
                  <ShieldCheck size={13} /> تأیید
                </p>
                {!t.approval || t.approval.status !== "در انتظار" ? (
                  <>
                    {t.approval && (
                      <p className={`text-xs mb-2 ${t.approval.status === "تأییدشده" ? "text-emerald-700" : "text-rose-700"}`}>
                        {t.approval.status} توسط «{t.approval.approver}» · {t.approval.at}
                        {t.approval.note ? ` — «${t.approval.note}»` : ""}
                      </p>
                    )}
                    {canEdit ? (
                      <div className="flex gap-2">
                        <MemberSelect p={p} value={approver} onChange={setApprover} />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (!approver) return notify("تأییدکننده را انتخاب کنید.", "warning");
                            pm.requestApproval(pid, t.id, approver);
                            setApprover("");
                            notify(`درخواست تأیید برای «${approver}» ارسال شد.`);
                          }}
                        >
                          درخواست تأیید
                        </Button>
                      </div>
                    ) : (
                      !t.approval && <p className="text-[11px] text-ink-400">درخواست تأییدی ثبت نشده است.</p>
                    )}
                  </>
                ) : t.approval.approver === me ? (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-700">«{t.approval.requestedBy}» تأیید این تسک را از شما خواسته است.</p>
                    <input className="input-field" value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} placeholder="یادداشت (اختیاری، برای رد توصیه می‌شود)" />
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={() => { pm.decideApproval(pid, t.id, true, decisionNote.trim()); setDecisionNote(""); notify("تسک تأیید شد."); }}>
                        تأیید
                      </Button>
                      <Button variant="secondary" size="sm" className="text-rose-600" onClick={() => { pm.decideApproval(pid, t.id, false, decisionNote.trim()); setDecisionNote(""); notify("تسک رد شد و به درخواست‌کننده اطلاع داده شد.", "info"); }}>
                        رد
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-amber-700">منتظر تأیید «{t.approval.approver}» — درخواست از «{t.approval.requestedBy}»</p>
                    {(t.approval.requestedBy === me || canEdit) && (
                      <button onClick={() => pm.cancelApproval(pid, t.id)} className="text-[11px] text-ink-500 hover:text-rose-600">
                        لغو درخواست
                      </button>
                    )}
                  </div>
                )}
              </div>
              {docs.length > 0 && (
                <Field label="فایل‌های پیوست">
                  <div className="space-y-1">
                    {docs.map((d) => (
                      <button key={d.id} onClick={() => goTab("documents", d.id)} className="flex items-center gap-1.5 text-xs text-brand-700 hover:underline">
                        <Paperclip size={12} /> {d.name} <span className="text-ink-400">(نسخه‌ی {fa(d.version)})</span>
                      </button>
                    ))}
                  </div>
                </Field>
              )}
            </div>

            <div className="space-y-3 md:border-r md:border-ink-100 md:pr-5">
              <Field label="مسئول">
                <MemberSelect p={p} value={draft.assignee} onChange={(v) => setDraft({ ...draft, assignee: v })} />
              </Field>
              <Field label="اولویت">
                <select className="input-field" value={draft.priority} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, priority: e.target.value as PMTask["priority"] })}>
                  {priorities.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="تاریخ شروع">
                <JalaliDatePicker value={draft.start} onChange={(v) => setDraft({ ...draft, start: v })} />
              </Field>
              <Field label="سررسید">
                <JalaliDatePicker value={draft.due} onChange={(v) => setDraft({ ...draft, due: v })} />
              </Field>
              <Field label={`پیشرفت: ${fa(draft.progress)}٪`}>
                <input type="range" min={0} max={100} step={5} value={draft.progress} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })} className="w-full accent-[var(--color-brand-600)]" dir="ltr" />
              </Field>
              <Field label="مایل‌ستون">
                <select className="input-field" value={draft.milestoneId ?? p.milestones.find((m) => m.taskIds.includes(t.id))?.id ?? ""} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, milestoneId: e.target.value })}>
                  <option value="">—</option>
                  {p.milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="بودجه (ریال)">
                  <input className="input-field" inputMode="numeric" value={draft.estBudget ? draft.estBudget.toLocaleString("fa-IR") : ""} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, estBudget: numIn(e.target.value) })} placeholder="۰" />
                </Field>
                <Field label="برآورد ساعت">
                  <input className="input-field" inputMode="numeric" value={draft.estHours ? fa(draft.estHours) : ""} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, estHours: numIn(e.target.value) })} placeholder="۰" />
                </Field>
                <Field label="امتیاز (Story Point)">
                  <select className="input-field" value={draft.storyPoints ?? 0} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, storyPoints: Number(e.target.value) || undefined })}>
                    <option value={0}>—</option>
                    {[1, 2, 3, 5, 8, 13, 21].map((n) => (
                      <option key={n} value={n}>
                        {fa(n)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="تکرار">
                  <select className="input-field" value={draft.recurrence ?? ""} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, recurrence: (e.target.value || undefined) as Recurrence | undefined })}>
                    <option value="">بدون تکرار</option>
                    {(["روزانه", "هفتگی", "ماهانه"] as Recurrence[]).map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
              </div>
              {sprints.length > 0 && (
                <Field label="اسپرینت">
                  <select className="input-field" value={draft.sprintId ?? ""} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, sprintId: e.target.value || undefined })}>
                    <option value="">بک‌لاگ (بدون اسپرینت)</option>
                    {sprints.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                        {x.status === "فعال" ? " (فعال)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            {canEdit && (
              <div className="md:col-span-2 flex items-center gap-2 pt-3 border-t border-ink-100 sticky bottom-0 bg-white">
                <Button variant="primary" icon={<Save size={14} />} disabled={!dirty} onClick={save}>
                  ذخیره‌ی تغییرات
                </Button>
                {dirty && (
                  <Button variant="ghost" onClick={() => setDraft(structuredClone(t))}>
                    بازگردانی
                  </Button>
                )}
                {can("projects.tasks.delete") && <Button
                  variant="ghost"
                  size="sm"
                  className="mr-auto text-rose-600"
                  icon={<Trash2 size={13} />}
                  onClick={() =>
                    confirm({
                      title: `حذف تسک «${t.title}»؟`,
                      message: `${succs.length ? `${fa(succs.length)} تسک به این تسک وابسته‌اند و وابستگی‌شان برداشته می‌شود. ` : ""}این رویداد در تاریخچه ثبت می‌شود.`,
                      onConfirm: () => {
                        pm.deleteTask(pid, t.id);
                        onClose();
                        notify("تسک حذف شد.", "info");
                      },
                    })
                  }
                >
                  حذف تسک
                </Button>}
              </div>
            )}
          </div>
        )}

        {section === "subtasks" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span>
                {fa(subDone)} از {fa(subtasks.length)} زیرتسک انجام شده
              </span>
              <span>{fa(subtasks.length ? Math.round((subDone / subtasks.length) * 100) : 0)}٪</span>
            </div>
            <Progress value={subtasks.length ? (subDone / subtasks.length) * 100 : 0} tone="bg-emerald-500" />
            <div className="divide-y divide-ink-100 border border-ink-100 rounded-lg">
              {subtasks.map((x) => {
                const dn = isDone(p, x);
                return (
                  <div key={x.id} className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={dn}
                      disabled={!canEdit}
                      aria-label={`انجام‌شده: ${x.title}`}
                      onChange={() => doneCol && todoCol && pm.moveTask(pid, x.id, dn ? todoCol : doneCol)}
                      className="accent-[var(--color-brand-600)] w-4 h-4"
                    />
                    <button onClick={() => openTask(x.id)} className={`flex-1 text-right text-sm ${dn ? "line-through text-ink-400" : "text-ink-800 hover:text-brand-700"}`}>
                      {x.title}
                    </button>
                    <Badge tone={kindTone[kindOf(p, x.status)]}>{columnLabel(p, x.status)}</Badge>
                    <span className="text-[11px] text-ink-500 w-24 truncate">{x.assignee}</span>
                    <span className="text-[11px] text-ink-400">{x.due}</span>
                  </div>
                );
              })}
              {subtasks.length === 0 && <p className="text-xs text-ink-400 p-3">زیرتسکی ندارد. برخلاف چک‌لیست، هر زیرتسک مسئول، سررسید و وضعیت جداگانه دارد و روی بورد هم دیده می‌شود.</p>}
            </div>
            {canEdit && (
              <form
                className="flex gap-2 flex-wrap"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!subTitle.trim()) return;
                  pm.createTask(pid, { title: subTitle.trim(), assignee: subWho || t.assignee, priority: t.priority, start: t.start, due: t.due, status: todoCol, parentId: t.id, sprintId: t.sprintId, labels: t.labels });
                  setSubTitle("");
                  notify("زیرتسک اضافه شد.");
                }}
              >
                <input className="input-field flex-1 min-w-[180px]" value={subTitle} onChange={(e) => setSubTitle(e.target.value)} placeholder="عنوان زیرتسک…" />
                <div className="w-44">
                  <MemberSelect p={p} value={subWho || t.assignee} onChange={setSubWho} />
                </div>
                <Button variant="secondary" icon={<Plus size={14} />} type="submit">
                  افزودن زیرتسک
                </Button>
              </form>
            )}
          </div>
        )}

        {section === "checklist" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span>
                {fa(doneCount)} از {fa(t.checklist.length)} مورد انجام شده
              </span>
              <span>{fa(t.checklist.length ? Math.round((doneCount / t.checklist.length) * 100) : 0)}٪</span>
            </div>
            <Progress value={t.checklist.length ? (doneCount / t.checklist.length) * 100 : 0} tone="bg-emerald-500" />
            <div className="space-y-1">
              {t.checklist.map((c) => (
                <div key={c.id} className="flex items-center gap-2 group py-1">
                  <input type="checkbox" checked={c.done} disabled={!canEdit} onChange={() => pm.toggleChecklistItem(pid, t.id, c.id)} className="accent-[var(--color-brand-600)] w-4 h-4" />
                  <span className={`text-sm flex-1 ${c.done ? "line-through text-ink-400" : "text-ink-800"}`}>{c.text}</span>
                  {canEdit && (
                    <button onClick={() => pm.removeChecklistItem(pid, t.id, c.id)} className="text-ink-300 hover:text-rose-600" aria-label="حذف مورد">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              {t.checklist.length === 0 && <p className="text-xs text-ink-400">هنوز موردی ندارد — تسک بزرگ را به کارهای کوچک‌تر بشکنید.</p>}
            </div>
            {canEdit && (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!checkText.trim()) return;
                  pm.addChecklistItem(pid, t.id, checkText.trim());
                  setCheckText("");
                }}
              >
                <input className="input-field flex-1" value={checkText} onChange={(e) => setCheckText(e.target.value)} placeholder="مثلاً: وایرفریم" />
                <Button variant="secondary" icon={<Plus size={14} />} type="submit">
                  افزودن
                </Button>
              </form>
            )}
          </div>
        )}

        {section === "deps" && (
          <div className="space-y-4">
            <div className={`rounded-lg p-3 text-xs leading-6 ${open.length ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
              {open.length ? `این تسک منتظر ${fa(open.length)} پیش‌نیاز است و تا پایان آن‌ها نباید شروع شود.` : preds.length ? "همه‌ی پیش‌نیازها انجام شده‌اند؛ تسک آزاد است." : "این تسک پیش‌نیازی ندارد."}
            </div>
            <div>
              <p className="text-xs font-bold text-ink-700 mb-2 flex items-center gap-1">
                <ArrowDownLeft size={13} /> پیش‌نیازها (این تسک بعد از این‌ها شروع می‌شود)
              </p>
              <div className="space-y-1.5">
                {preds.map((x) => {
                  const d = p.deps.find((dd) => dd.predecessor === x.id && dd.successor === t.id)!;
                  return (
                    <div key={x.id} className="flex items-center gap-2 text-xs bg-ink-50 rounded-md px-2 py-1.5">
                      <Badge tone={kindTone[kindOf(p, x.status)]}>{columnLabel(p, x.status)}</Badge>
                      <button className="flex-1 text-right text-ink-800 hover:text-brand-700" onClick={() => openTask(x.id)}>
                        {x.title}
                      </button>
                      <span className="text-ink-400">{x.due}</span>
                      {canEdit && (
                        <button onClick={() => pm.removeDependency(pid, d.id)} className="text-ink-300 hover:text-rose-600" aria-label="حذف وابستگی">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {preds.length === 0 && <p className="text-[11px] text-ink-400">—</p>}
              </div>
              {canEdit && (
                <div className="flex gap-2 mt-2">
                  <TaskSelect p={p} value={newPred} onChange={setNewPred} exclude={[t.id, ...preds.map((x) => x.id)]} placeholder="افزودن پیش‌نیاز…" />
                  <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => addDep(newPred, t.id)}>
                    افزودن
                  </Button>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-ink-700 mb-2 flex items-center gap-1">
                <ArrowUpRight size={13} /> تسک‌های وابسته (منتظر این تسک)
              </p>
              <div className="space-y-1.5">
                {succs.map((x) => {
                  const d = p.deps.find((dd) => dd.predecessor === t.id && dd.successor === x.id)!;
                  return (
                    <div key={x.id} className="flex items-center gap-2 text-xs bg-ink-50 rounded-md px-2 py-1.5">
                      <Badge tone={kindTone[kindOf(p, x.status)]}>{columnLabel(p, x.status)}</Badge>
                      <button className="flex-1 text-right text-ink-800 hover:text-brand-700" onClick={() => openTask(x.id)}>
                        {x.title}
                      </button>
                      <span className="text-ink-400">{x.assignee}</span>
                      {canEdit && (
                        <button onClick={() => pm.removeDependency(pid, d.id)} className="text-ink-300 hover:text-rose-600" aria-label="حذف وابستگی">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {succs.length === 0 && <p className="text-[11px] text-ink-400">—</p>}
              </div>
              {canEdit && (
                <div className="flex gap-2 mt-2">
                  <TaskSelect p={p} value={newSucc} onChange={setNewSucc} exclude={[t.id, ...succs.map((x) => x.id)]} placeholder="افزودن تسک وابسته…" />
                  <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => addDep(t.id, newSucc)}>
                    افزودن
                  </Button>
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" icon={<Link2 size={13} />} onClick={() => goTab("graph", t.id)}>
              نمایش در گراف وابستگی
            </Button>
          </div>
        )}

        {section === "cost" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="card p-3">
                <p className="text-[11px] text-ink-400">بودجه‌ی تخمینی</p>
                <p className="text-sm font-bold text-ink-900 mt-1">{t.estBudget ? fmtRial(t.estBudget) : "—"}</p>
              </div>
              <div className="card p-3">
                <p className="text-[11px] text-ink-400">هزینه‌ی واقعی</p>
                <p className={`text-sm font-bold mt-1 ${t.estBudget && actual > t.estBudget ? "text-rose-600" : "text-ink-900"}`}>{fmtRial(actual)}</p>
              </div>
              <div className="card p-3">
                <p className="text-[11px] text-ink-400">باقی‌مانده</p>
                <p className="text-sm font-bold text-ink-900 mt-1">{t.estBudget ? fmtRial(t.estBudget - actual) : "—"}</p>
              </div>
            </div>
            <div>
              <TaskCostItems t={t} />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <p className="font-bold text-ink-700 flex items-center gap-1">
                  <Clock size={13} /> زمان ثبت‌شده
                </p>
                <span className="text-ink-500">
                  {fa(logged)} از {t.estHours ? fa(t.estHours) : "—"} ساعت برآوردی
                </span>
              </div>
              {t.estHours > 0 && <Progress value={(logged / t.estHours) * 100} tone={logged > t.estHours ? "bg-rose-500" : "bg-brand-500"} />}
              <div className="mt-2 space-y-1">
                {p.timeLogs.filter((l) => l.taskId === t.id).map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-xs text-ink-600">
                    <span>
                      {l.member} · {l.date}
                    </span>
                    <span>{fa(l.hours)} ساعت</span>
                  </div>
                ))}
              </div>
              {canEdit && (
                <div className="flex gap-2 mt-3">
                  <MemberSelect p={p} value={hoursWho || t.assignee} onChange={setHoursWho} allowEmpty={false} />
                  <input className="input-field w-24" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="ساعت" />
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus size={13} />}
                    onClick={() => {
                      const h = numIn(hours);
                      if (!h) return notify("تعداد ساعت را وارد کنید.", "warning");
                      pm.addTimeLog(pid, { member: hoursWho || t.assignee, taskId: t.id, hours: h, date: refDate, note: "" });
                      setHours("");
                      notify("زمان کاری ثبت شد.");
                    }}
                  >
                    ثبت
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {section === "comments" && (
          <div className="space-y-3">
            {t.comments.map((c) => (
              <div key={c.id} className="bg-ink-50 rounded-lg p-3">
                <div className="flex items-center justify-between text-[11px] text-ink-400 mb-1">
                  <span className="font-medium text-ink-700">{c.author}</span>
                  <span>{c.at}</span>
                </div>
                <p className="text-sm text-ink-800 leading-6 whitespace-pre-wrap">
                  {c.text.split(/(@[^\s،.,!؟?]+)/g).map((part, i) =>
                    part.startsWith("@") ? (
                      <span key={i} className="text-brand-700 font-medium">
                        {part.replace(/_/g, " ")}
                      </span>
                    ) : (
                      part
                    )
                  )}
                </p>
              </div>
            ))}
            {t.comments.length === 0 && <p className="text-xs text-ink-400">نظری ثبت نشده است.</p>}
            {canEdit && (
              <div>
                <textarea className="input-field min-h-[70px]" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="نظر خود را بنویسید… برای منشن: @نام_عضو" />
                <div className="flex items-center gap-1 flex-wrap mt-2">
                  {p.members.slice(0, 6).map((m) => (
                    <button key={m.id} onClick={() => setComment((c) => `${c}${c && !c.endsWith(" ") ? " " : ""}@${m.name.replace(/ /g, "_")} `)} className="text-[11px] px-2 py-0.5 rounded bg-ink-100 text-ink-600 hover:bg-brand-50 hover:text-brand-700">
                      @{m.name}
                    </button>
                  ))}
                  <Button
                    variant="primary"
                    size="sm"
                    className="mr-auto"
                    onClick={() => {
                      if (!comment.trim()) return;
                      pm.addComment(pid, t.id, comment.trim());
                      setComment("");
                      notify("نظر ثبت شد؛ افراد منشن‌شده اعلان گرفتند.");
                    }}
                  >
                    ارسال نظر
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {section === "history" && (
          <div className="space-y-2">
            {history.map((l) => (
              <div key={l.id} className="border-r-2 border-brand-200 pr-3 py-1">
                <p className="text-xs text-ink-800 leading-6">{l.description}</p>
                <p className="text-[11px] text-ink-400 flex items-center gap-2 flex-wrap">
                  <span dir="ltr" className="font-mono text-[10px] bg-ink-100 rounded px-1">
                    {l.event}
                  </span>
                  {l.actor} · {l.date} {l.time}
                </p>
              </div>
            ))}
            {history.length === 0 && <p className="text-xs text-ink-400">رویدادی برای این تسک ثبت نشده است.</p>}
          </div>
        )}

      </div>
    </Modal>
  );
}
