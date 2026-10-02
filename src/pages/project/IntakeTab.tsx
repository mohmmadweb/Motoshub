import { useState } from "react";
import { Inbox, Send, CheckCircle2, XCircle, Link2, ClipboardList } from "lucide-react";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Toggle from "../../components/ui/Toggle";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { addDays, fa } from "../../pm/jalali";
import { typeLabel } from "../../pm/selectors";
import type { IntakeRequest, IntakeStatus, PMPriority, TaskType } from "../../pm/types";
import { Field, MemberSelect, SectionTitle, priorities, priorityTone, useProjectPage } from "./shared";
import { TaskKey, TypeIcon, taskTypes } from "./taskTypes";

const statusTone: Record<IntakeStatus, BadgeTone> = { جدید: "brand", پذیرفته: "success", ردشده: "danger" };

/**
 * فرم درخواست پروژه/تسک (Intake) — هم‌تراز Asana Forms / Jira Service Management:
 * هر عضو سازمان می‌تواند درخواست ثبت کند؛ مدیر پروژه در صف «درخواست‌ها» آن را می‌پذیرد (تسک ساخته می‌شود) یا با دلیل رد می‌کند.
 */
export default function IntakeTab() {
  const { p, pid, canEdit, canManage, refDate, openTask } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const { actingUser } = useTenancy();
  const reqs = p.intake ?? [];
  const isOpen = p.intakeOpen !== false;
  const [tab, setTab] = useState<IntakeStatus | "all">("جدید");
  const [form, setForm] = useState<{ title: string; type: TaskType; priority: PMPriority; description: string; requester: string; wantedBy?: string }>({ title: "", type: "task", priority: "متوسط", description: "", requester: actingUser.name });
  const [accepting, setAccepting] = useState<IntakeRequest | null>(null);
  const [acc, setAcc] = useState({ assignee: "", status: "", due: "" });
  const [rejecting, setRejecting] = useState<IntakeRequest | null>(null);
  const [reason, setReason] = useState("");
  const canTriage = canEdit && canManage;
  const list = reqs.filter((r) => tab === "all" || r.status === tab);

  const submit = () => {
    if (!form.title.trim()) return notify("عنوان درخواست الزامی است.", "warning");
    if (!form.requester.trim()) return notify("نام درخواست‌کننده را وارد کنید.", "warning");
    pm.submitIntake(pid, { ...form, title: form.title.trim(), description: form.description.trim(), wantedBy: form.wantedBy || undefined });
    notify("درخواست ثبت شد و برای بررسی به مدیر پروژه ارسال شد.");
    setForm({ title: "", type: "task", priority: "متوسط", description: "", requester: actingUser.name });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
      <div className="space-y-3 min-w-0">
        <SectionTitle
          icon={<Inbox size={15} className="text-brand-600" />}
          title="صف بررسی درخواست‌ها"
          hint="درخواست‌های رسیده از فرم پروژه — با پذیرش، تسک با برچسب «درخواست» ساخته و درخواست‌کننده دنبال‌کننده‌ی آن می‌شود."
        />
        <div className="flex items-center gap-1 border-b border-ink-200 overflow-x-auto">
          {(["جدید", "پذیرفته", "ردشده", "all"] as const).map((s) => (
            <button key={s} onClick={() => setTab(s)} className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px whitespace-nowrap ${tab === s ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"}`}>
              {s === "all" ? "همه" : s}
              <span className="mr-1 text-[10px] bg-ink-100 rounded-full px-1.5">{fa(s === "all" ? reqs.length : reqs.filter((r) => r.status === s).length)}</span>
            </button>
          ))}
        </div>
        {list.length === 0 && <p className="text-xs text-ink-400 py-8 text-center">{tab === "جدید" ? "درخواست تازه‌ای منتظر بررسی نیست." : "موردی نیست."}</p>}
        {list.map((r) => {
          const t = r.taskId ? p.tasks.find((x) => x.id === r.taskId) : undefined;
          return (
            <div key={r.id} className="card p-4">
              <div className="flex items-start gap-2.5">
                <TypeIcon type={r.type} size={15} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium text-ink-900">{r.title}</p>
                    <span className="flex items-center gap-1.5">
                      <Badge tone={priorityTone[r.priority]}>{r.priority}</Badge>
                      <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                    </span>
                  </div>
                  {r.description && <p className="text-xs text-ink-600 leading-6 mt-1">{r.description}</p>}
                  <p className="text-[11px] text-ink-400 mt-1">
                    {typeLabel[r.type]} · درخواست‌کننده: {r.requester} · {r.date}
                    {r.wantedBy ? ` · موعد درخواستی ${r.wantedBy}` : ""}
                  </p>
                  {r.status === "پذیرفته" && (
                    <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 flex-wrap">
                      <CheckCircle2 size={12} /> پذیرفته توسط {r.decidedBy} ({r.decidedAt}) ←
                      {t ? (
                        <button onClick={() => openTask(t.id)} className="flex items-center gap-1 hover:underline">
                          <Link2 size={11} /> <TaskKey t={t} /> {t.title}
                        </button>
                      ) : (
                        "تسک حذف شده"
                      )}
                    </p>
                  )}
                  {r.status === "ردشده" && (
                    <p className="text-[11px] text-rose-700 mt-1 flex items-center gap-1">
                      <XCircle size={12} /> رد توسط {r.decidedBy} ({r.decidedAt}): {r.rejectReason}
                    </p>
                  )}
                  {r.status === "جدید" && canTriage && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="primary" icon={<CheckCircle2 size={13} />} onClick={() => { setAccepting(r); setAcc({ assignee: "", status: p.columns.find((c) => c.kind === "todo")?.id ?? p.columns[0]?.id ?? "", due: r.wantedBy ?? addDays(refDate, 7) }); }}>
                        پذیرش و ساخت تسک
                      </Button>
                      <Button size="sm" variant="secondary" className="text-rose-600" icon={<XCircle size={13} />} onClick={() => { setRejecting(r); setReason(""); }}>
                        رد
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-4 lg:sticky lg:top-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
              <ClipboardList size={15} className="text-brand-600" /> فرم درخواست پروژه
            </p>
            <p className="text-[11px] text-ink-400 mt-0.5">برای همه‌ی اعضای سازمان که پروژه را می‌بینند.</p>
          </div>
          {canTriage && (
            <span className="flex items-center gap-1.5 text-[11px] text-ink-500">
              {isOpen ? "باز" : "بسته"}
              <Toggle on={isOpen} onChange={() => { pm.setIntakeOpen(pid, !isOpen); notify(isOpen ? "فرم درخواست بسته شد." : "فرم درخواست برای اعضا باز شد."); }} label="باز/بسته بودن فرم" />
            </span>
          )}
        </div>
        {!isOpen ? (
          <p className="text-xs text-ink-500 bg-ink-50 rounded-lg p-3">این پروژه فعلاً درخواست جدید نمی‌پذیرد.</p>
        ) : (
          <div className="space-y-3">
            <Field label="عنوان درخواست">
              <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="چه چیزی لازم است؟" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="نوع">
                <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TaskType })}>
                  {taskTypes.filter((x) => x !== "subtask" && x !== "epic").map((x) => (
                    <option key={x} value={x}>
                      {typeLabel[x]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="اولویت">
                <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as PMPriority })}>
                  {priorities.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="شرح">
              <textarea className="input-field min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="زمینه، نتیجه‌ی موردانتظار، پیوست‌ها…" />
            </Field>
            <Field label="درخواست‌کننده">
              <input className="input-field" value={form.requester} onChange={(e) => setForm({ ...form, requester: e.target.value })} />
            </Field>
            <Field label="موعد درخواستی (اختیاری)">
              <JalaliDatePicker value={form.wantedBy ?? ""} onChange={(v) => setForm({ ...form, wantedBy: v })} />
            </Field>
            <Button variant="primary" className="w-full justify-center" icon={<Send size={14} />} onClick={submit}>
              ارسال درخواست
            </Button>
          </div>
        )}
      </div>

      <Modal open={!!accepting} onClose={() => setAccepting(null)} title={`پذیرش «${accepting?.title ?? ""}»`} description="تسک با همین عنوان، نوع و اولویت ساخته می‌شود و درخواست‌کننده اعلان می‌گیرد.">
        {accepting && (
          <div className="space-y-3">
            <Field label="مسئول">
              <MemberSelect p={p} value={acc.assignee} onChange={(v) => setAcc({ ...acc, assignee: v })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="ستون">
                <select className="input-field" value={acc.status} onChange={(e) => setAcc({ ...acc, status: e.target.value })}>
                  {p.columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="سررسید">
                <JalaliDatePicker value={acc.due} onChange={(v) => setAcc({ ...acc, due: v })} />
              </Field>
            </div>
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => {
                pm.decideIntake(pid, accepting.id, true, { assignee: acc.assignee, status: acc.status, due: acc.due });
                notify(`درخواست پذیرفته شد و به تسک تبدیل شد${acc.assignee ? ` (مسئول: ${acc.assignee})` : ""}.`);
                setAccepting(null);
              }}
            >
              پذیرش و ساخت تسک
            </Button>
          </div>
        )}
      </Modal>
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title={`رد «${rejecting?.title ?? ""}»`} description="دلیل رد برای درخواست‌کننده ارسال و در سابقه‌ی درخواست ثبت می‌شود.">
        {rejecting && (
          <div className="space-y-3">
            <Field label="دلیل رد">
              <textarea className="input-field min-h-[70px]" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً: خارج از دامنه‌ی پروژه؛ در فاز بعد بررسی می‌شود." />
            </Field>
            <Button
              variant="danger"
              className="w-full justify-center"
              onClick={() => {
                if (!reason.trim()) return notify("دلیل رد را بنویسید.", "warning");
                pm.decideIntake(pid, rejecting.id, false, { reason: reason.trim() });
                notify("درخواست رد شد و به درخواست‌کننده اطلاع داده شد.", "info");
                setRejecting(null);
              }}
            >
              رد درخواست
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
