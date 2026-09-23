import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CheckSquare, Clock, History, Link2, MessageSquare, Plus, Save, Trash2, Wallet, X, Paperclip } from "lucide-react";
import Drawer from "../../components/ui/Drawer";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { createsCycle, isDone, openPredecessors, predecessorsOf, successorsOf, taskActualCost, taskLoggedHours, columnLabel, kindOf } from "../../pm/selectors";
import { fa, fmtRial, diffDays } from "../../pm/jalali";
import { defaultLabels } from "../../pm/seed";
import type { PMTask } from "../../pm/types";
import { Field, MemberSelect, Progress, TaskFlags, TaskSelect, kindTone, numIn, priorities, priorityTone, useProjectPage } from "./shared";

type Section = "details" | "checklist" | "deps" | "cost" | "comments" | "history";

export default function TaskDrawer({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const { p, pid, canEdit, refDate, openTask, goTab } = useProjectPage();
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

  useEffect(() => {
    setDraft(t ? structuredClone(t) : null);
    setSection("details");
    // فقط با عوض شدن تسک بازنشانی می‌شود، نه با هر تغییر داده
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  if (!t || !draft) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>;

  const preds = predecessorsOf(p, t.id);
  const succs = successorsOf(p, t.id);
  const open = openPredecessors(p, t.id);
  const actual = taskActualCost(p, t.id);
  const logged = taskLoggedHours(p, t.id);
  const doneCount = t.checklist.filter((c) => c.done).length;
  const history = p.logs.filter((l) => l.entity?.id === t.id || (l.entity?.type === "dependency" && p.deps.some((d) => d.id === l.entity?.id && (d.predecessor === t.id || d.successor === t.id)))).sort((a, b) => b.seq - a.seq);
  const dirty = JSON.stringify({ ...draft, checklist: [], comments: [], status: "" }) !== JSON.stringify({ ...t, checklist: [], comments: [], status: "" });

  const save = () => {
    if (!draft.title.trim()) return notify("عنوان تسک الزامی است.", "warning");
    if (diffDays(draft.start, draft.due) < 0) return notify("سررسید نمی‌تواند قبل از تاریخ شروع باشد.", "warning");
    const { checklist: _c, comments: _m, status: _s, ...patch } = draft;
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
    { id: "checklist", label: "چک‌لیست", icon: CheckSquare, count: t.checklist.length },
    { id: "deps", label: "وابستگی", icon: Link2, count: preds.length + succs.length },
    { id: "cost", label: "زمان و هزینه", icon: Wallet },
    { id: "comments", label: "نظرات", icon: MessageSquare, count: t.comments.length },
    { id: "history", label: "تاریخچه", icon: History, count: history.length },
  ];

  const docs = p.documents.filter((d) => d.taskId === t.id);

  return (
    <Drawer open onClose={onClose} title="جزئیات تسک" width="max-w-2xl">
      <div className="space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-ink-900 leading-6">{t.title}</p>
            <TaskFlags p={p} t={t} refDate={refDate} />
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge tone={kindTone[kindOf(p, t.status)]}>{columnLabel(p, t.status)}</Badge>
            <Badge tone={priorityTone[t.priority]}>اولویت: {t.priority}</Badge>
            <Badge tone="neutral">
              {t.start} ← {t.due}
            </Badge>
            {t.labels.map((l) => (
              <Badge key={l} tone="brand">
                {l}
              </Badge>
            ))}
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
              <span>پیشرفت</span>
              <span>{fa(isDone(p, t) ? 100 : t.progress)}٪</span>
            </div>
            <Progress value={isDone(p, t) ? 100 : t.progress} />
          </div>
          {canEdit && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.columns
                .filter((c) => c.id !== t.status)
                .map((c) => (
                  <Button key={c.id} size="sm" variant="secondary" onClick={() => move(c.id)}>
                    ← {c.label}
                  </Button>
                ))}
            </div>
          )}
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
          <div className="space-y-3">
            <Field label="عنوان">
              <input className="input-field" value={draft.title} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>
            <Field label="توضیحات">
              <textarea className="input-field min-h-[80px]" value={draft.description} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="شرح کار، معیار پذیرش، …" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
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
              <Field label="سررسید (Deadline)">
                <JalaliDatePicker value={draft.due} onChange={(v) => setDraft({ ...draft, due: v })} />
              </Field>
              <Field label={`پیشرفت: ${fa(draft.progress)}٪`}>
                <input type="range" min={0} max={100} step={5} value={draft.progress} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })} className="w-full accent-[var(--color-brand-600)]" />
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
              <Field label="بودجه‌ی تخمینی (ریال)">
                <input className="input-field" inputMode="numeric" value={draft.estBudget ? draft.estBudget.toLocaleString("fa-IR") : ""} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, estBudget: numIn(e.target.value) })} placeholder="۰" />
              </Field>
              <Field label="برآورد ساعت کار">
                <input className="input-field" inputMode="numeric" value={draft.estHours ? fa(draft.estHours) : ""} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, estHours: numIn(e.target.value) })} placeholder="۰" />
              </Field>
            </div>
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
            {canEdit && (
              <div className="flex items-center gap-2 pt-1">
                <Button variant="primary" icon={<Save size={14} />} disabled={!dirty} onClick={save}>
                  ذخیره‌ی تغییرات
                </Button>
                {dirty && (
                  <Button variant="ghost" onClick={() => setDraft(structuredClone(t))}>
                    بازگردانی
                  </Button>
                )}
                <p className="text-[11px] text-ink-400 mr-auto">هر تغییر با کد رویداد در تاریخچه ثبت و به افراد مرتبط اعلان می‌شود.</p>
              </div>
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
              <p className="text-xs font-bold text-ink-700 mb-2">هزینه‌های متصل</p>
              {p.expenses.filter((e) => e.taskId === t.id).map((e) => (
                <div key={e.id} className="flex items-center justify-between text-xs py-1.5 border-b border-ink-100">
                  <span className="text-ink-800">{e.title}</span>
                  <span className="flex items-center gap-2">
                    <Badge tone={e.status === "پرداخت‌شده" ? "success" : e.status === "تأییدشده" ? "brand" : "warning"}>{e.status}</Badge>
                    <span className="text-ink-600">{fmtRial(e.amount)}</span>
                  </span>
                </div>
              ))}
              {!p.expenses.some((e) => e.taskId === t.id) && <p className="text-[11px] text-ink-400">هزینه‌ای به این تسک متصل نیست (از تب مالی می‌توانید متصل کنید).</p>}
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

        {canEdit && (
          <div className="pt-3 border-t border-ink-100">
            <Button
              variant="ghost"
              size="sm"
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
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
