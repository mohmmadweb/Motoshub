import { useState } from "react";
import { ClipboardList, PlayCircle, Check, SkipForward, RotateCcw, Ban } from "lucide-react";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { fa } from "../../pm/jalali";
import type { PlaybookExecStatus, PlaybookStepStatus } from "../../pm/types";
import { Progress, SectionTitle, useProjectPage } from "./shared";

export const execTone: Record<PlaybookExecStatus, BadgeTone> = { "در انتظار": "neutral", "در حال اجرا": "brand", "تکمیل‌شده": "success", "لغوشده": "danger" };
const stepTone: Record<PlaybookStepStatus, BadgeTone> = { "در انتظار": "neutral", "انجام‌شده": "success", ردشده: "warning" };

export default function PlaybooksTab() {
  const { pid, can, focusId } = useProjectPage();
  const canEdit = can("projects.playbooks");
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [tpl, setTpl] = useState(pm.store.templates[0]?.id ?? "");
  const execs = pm.store.executions.filter((e) => e.projectId === pid);

  return (
    <div className="space-y-4">
      <SectionTitle
        icon={<ClipboardList size={15} className="text-brand-600" />}
        title="اجرای قالب‌های فرآیند (Playbook) در این پروژه"
        hint="هر اجرا یک چک‌لیست مرحله‌ای است؛ تکمیل/رد هر مرحله و تغییر وضعیت اجرا با کدهای PLAYBOOK_* در تاریخچه ثبت می‌شود."
        action={
          canEdit && (
            <div className="flex gap-2">
              <select value={tpl} onChange={(e) => setTpl(e.target.value)} className="input-field !py-1.5 !text-xs !w-auto">
                {pm.store.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({fa(t.steps.length)} مرحله)
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="primary"
                icon={<PlayCircle size={13} />}
                onClick={() => {
                  if (!tpl) return;
                  pm.startPlaybook(tpl, pid);
                  notify("اجرای Playbook آغاز شد.");
                }}
              >
                شروع اجرا
              </Button>
            </div>
          )
        }
      />
      {execs.length === 0 && <EmptyState icon={<ClipboardList size={20} />} title="اجرایی ثبت نشده" description="یک قالب فرآیند (مثل تحویل طرح عمرانی) را برای این پروژه اجرا کنید." />}
      {execs.map((ex) => {
        const done = ex.steps.filter((s) => s.status !== "در انتظار").length;
        const active = ex.status === "در حال اجرا";
        return (
          <div key={ex.id} className={`card p-4 ${focusId === ex.id ? "ring-2 ring-brand-300" : ""}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-bold text-ink-900">{ex.templateName}</p>
                <p className="text-[11px] text-ink-400 mt-0.5">
                  آغاز: {ex.startedAt} توسط {ex.startedBy}
                  {ex.completedAt && ` · پایان: ${ex.completedAt}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={execTone[ex.status]}>{ex.status}</Badge>
                {canEdit && active && (
                  <Button size="sm" variant="ghost" icon={<Ban size={12} />} onClick={() => confirm({ title: `لغو اجرای «${ex.templateName}»؟`, confirmLabel: "لغو اجرا", onConfirm: () => pm.cancelExecution(ex.id) })}>
                    لغو اجرا
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Progress value={(done / ex.steps.length) * 100} tone="bg-emerald-500" className="flex-1" />
              <span className="text-[11px] text-ink-500">
                {fa(done)}/{fa(ex.steps.length)}
              </span>
            </div>
            <ol className="mt-3 space-y-1.5">
              {ex.steps.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-xs flex-wrap border-b border-ink-100 last:border-0 py-1.5">
                  <span className="w-5 h-5 rounded-full bg-ink-100 text-ink-600 flex items-center justify-center text-[10px] shrink-0">{fa(s.order)}</span>
                  <span className={`flex-1 ${s.status === "انجام‌شده" ? "text-ink-400 line-through" : s.status === "ردشده" ? "text-ink-400" : "text-ink-800"}`}>{s.title}</span>
                  {s.completedBy && (
                    <span className="text-[10.5px] text-ink-400">
                      {s.completedBy} · {s.completedAt}
                    </span>
                  )}
                  <Badge tone={stepTone[s.status]}>{s.status}</Badge>
                  {canEdit && ex.status !== "لغوشده" && (
                    <span className="flex items-center gap-0.5">
                      {s.status === "در انتظار" ? (
                        <>
                          <button onClick={() => pm.setStepStatus(ex.id, s.id, "انجام‌شده")} className="p-1 text-ink-400 hover:text-emerald-600" title="انجام شد" aria-label="انجام شد">
                            <Check size={14} />
                          </button>
                          <button onClick={() => pm.setStepStatus(ex.id, s.id, "ردشده")} className="p-1 text-ink-400 hover:text-amber-600" title="رد کردن مرحله" aria-label="رد کردن مرحله">
                            <SkipForward size={14} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => pm.setStepStatus(ex.id, s.id, "در انتظار")} className="p-1 text-ink-400 hover:text-brand-600" title="بازگرداندن" aria-label="بازگرداندن">
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
