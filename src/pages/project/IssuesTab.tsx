import { useState } from "react";
import { Bug, Plus } from "lucide-react";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import RowActions from "../../components/ui/RowActions";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { fa } from "../../pm/jalali";
import type { IssueStatus, PMIssue, PMPriority } from "../../pm/types";
import { Field, MemberSelect, SectionTitle, TaskSelect, priorities, priorityTone, taskTitle, useProjectPage } from "./shared";

const statusTone: Record<IssueStatus, BadgeTone> = { باز: "danger", "در حال بررسی": "warning", "حل‌شده": "success", "بسته‌شده": "neutral" };
const statuses: IssueStatus[] = ["باز", "در حال بررسی", "حل‌شده", "بسته‌شده"];
type Draft = Omit<PMIssue, "id" | "createdAt"> & { id?: string };

export default function IssuesTab() {
  const { p, pid, can, openTask, focusId } = useProjectPage();
  const canEdit = can("projects.risks");
  const pm = useProjectsPM();
  const actor = pm.actor;
  const confirm = useConfirm();
  const { notify } = useToast();
  const [edit, setEdit] = useState<Draft | null>(null);

  const save = () => {
    if (!edit) return;
    if (!edit.title.trim()) return notify("عنوان مشکل الزامی است.", "warning");
    pm.saveIssue(pid, { ...edit, taskId: edit.taskId || undefined });
    notify(edit.id ? "مشکل به‌روزرسانی شد." : "مشکل گزارش شد و برای مسئول رفع و مدیر پروژه اعلان فوری رفت.");
    setEdit(null);
  };

  return (
    <div>
      <SectionTitle
        icon={<Bug size={15} className="text-rose-600" />}
        title="مشکلات پروژه (Issues)"
        hint="برخلاف ریسک که احتمالی است، مشکل واقعاً رخ داده؛ مثل «سرور در دسترس نیست». چرخه: باز ← در حال بررسی ← حل‌شده ← بسته‌شده"
        action={
          canEdit && (
            <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setEdit({ title: "", description: "", status: "باز", severity: "زیاد", reporter: actor, assignee: p.meta.manager })}>
              گزارش مشکل
            </Button>
          )
        }
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {statuses.map((s) => (
          <div key={s} className="card p-3 flex items-center justify-between">
            <Badge tone={statusTone[s]}>{s}</Badge>
            <span className="text-lg font-bold text-ink-900">{fa(p.issues.filter((i) => i.status === s).length)}</span>
          </div>
        ))}
      </div>
      {p.issues.length > 0 ? (
        <div className="card divide-y divide-ink-100">
          {p.issues.map((i) => (
            <div key={i.id} className={`p-4 flex items-start gap-3 flex-wrap ${focusId === i.id ? "bg-brand-50/40" : ""}`}>
              <div className="flex-1 min-w-[220px]">
                <p className="text-sm font-medium text-ink-900">{i.title}</p>
                {i.description && <p className="text-xs text-ink-500 mt-1 leading-6">{i.description}</p>}
                <p className="text-[11px] text-ink-400 mt-1.5">
                  گزارش: {i.reporter} · {i.createdAt} · مسئول رفع: <span className="text-ink-700">{i.assignee}</span>
                  {i.taskId && (
                    <>
                      {" · "}
                      <button onClick={() => openTask(i.taskId!)} className="text-brand-700 hover:underline">
                        {taskTitle(p, i.taskId)}
                      </button>
                    </>
                  )}
                </p>
              </div>
              <Badge tone={priorityTone[i.severity]}>{i.severity}</Badge>
              {canEdit ? (
                <select value={i.status} onChange={(e) => pm.saveIssue(pid, { ...i, status: e.target.value as IssueStatus })} className="input-field !py-1 !text-xs !w-auto">
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <Badge tone={statusTone[i.status]}>{i.status}</Badge>
              )}
              <RowActions onEdit={canEdit ? () => setEdit({ ...i }) : undefined} onDelete={canEdit ? () => confirm({ title: `حذف مشکل «${i.title}»؟`, onConfirm: () => pm.deleteIssue(pid, i.id) }) : undefined} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Bug size={20} />} title="مشکلی گزارش نشده" description="مشکلات واقعی اجرای پروژه را ثبت کنید تا مسئول رفع و مدیر پروژه فوراً مطلع شوند." />
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "ویرایش مشکل" : "گزارش مشکل"}>
        {edit && (
          <div className="space-y-3">
            <Field label="عنوان">
              <input className="input-field" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="مثلاً: سرور در دسترس نیست" />
            </Field>
            <Field label="شرح">
              <textarea className="input-field min-h-[70px]" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="شدت">
                <select className="input-field" value={edit.severity} onChange={(e) => setEdit({ ...edit, severity: e.target.value as PMPriority })}>
                  {priorities.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="وضعیت">
                <select className="input-field" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as IssueStatus })}>
                  {statuses.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="مسئول رفع">
                <MemberSelect p={p} value={edit.assignee} onChange={(v) => setEdit({ ...edit, assignee: v })} allowEmpty={false} />
              </Field>
              <Field label="تسک مرتبط">
                <TaskSelect p={p} value={edit.taskId ?? ""} onChange={(v) => setEdit({ ...edit, taskId: v })} placeholder="—" />
              </Field>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" className="flex-1 justify-center" onClick={save}>
                ذخیره
              </Button>
              <Button variant="secondary" onClick={() => setEdit(null)}>
                انصراف
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
