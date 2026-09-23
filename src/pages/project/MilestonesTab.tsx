import { useState } from "react";
import { Milestone, Plus } from "lucide-react";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import RowActions from "../../components/ui/RowActions";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { isDone } from "../../pm/selectors";
import { dayNum, fa } from "../../pm/jalali";
import type { MilestoneStatus, PMMilestone } from "../../pm/types";
import { Field, MemberSelect, Progress, useProjectPage } from "./shared";

export const milestoneTone: Record<MilestoneStatus, BadgeTone> = { "انجام‌شده": "success", "در حال انجام": "brand", "پیش‌رو": "neutral", "در خطر": "danger" };
const statuses: MilestoneStatus[] = ["پیش‌رو", "در حال انجام", "در خطر", "انجام‌شده"];

export default function MilestonesTab() {
  const { p, pid, canEdit, refDate, openTask, focusId } = useProjectPage();
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [edit, setEdit] = useState<(Omit<PMMilestone, "id"> & { id?: string }) | null>(null);
  const ms = [...p.milestones].sort((a, b) => (dayNum(a.due) ?? 0) - (dayNum(b.due) ?? 0));
  const ref = dayNum(refDate)!;

  const save = () => {
    if (!edit) return;
    if (!edit.title.trim() || !edit.due) return notify("عنوان و سررسید الزامی است.", "warning");
    pm.saveMilestone(pid, edit);
    notify(edit.id ? "مایل‌ستون ویرایش شد." : "مایل‌ستون ایجاد شد.");
    setEdit(null);
  };

  return (
    <div>
      {canEdit && (
        <div className="flex justify-end mb-3">
          <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setEdit({ title: "", due: refDate, status: "پیش‌رو", owner: p.meta.manager, taskIds: [] })}>
            مایل‌ستون جدید
          </Button>
        </div>
      )}
      {ms.length > 0 ? (
        <div className="card p-5">
          {ms.map((m, i) => {
            const linked = m.taskIds.map((id) => p.tasks.find((t) => t.id === id)).filter(Boolean) as typeof p.tasks;
            const doneN = linked.filter((t) => isDone(p, t)).length;
            const left = (dayNum(m.due) ?? ref) - ref;
            return (
              <div key={m.id} className={`flex gap-3 ${focusId === m.id ? "bg-brand-50/50 -mx-2 px-2 rounded-lg" : ""}`}>
                <div className="flex flex-col items-center">
                  <span className={`w-3 h-3 rounded-full mt-1 shrink-0 ${m.status === "انجام‌شده" ? "bg-emerald-500" : m.status === "در حال انجام" ? "bg-brand-600" : m.status === "در خطر" ? "bg-rose-500" : "bg-ink-300"}`} />
                  {i < ms.length - 1 && <span className="w-px flex-1 bg-ink-200" />}
                </div>
                <div className="pb-6 flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5">
                      <Milestone size={14} className="text-brand-600" /> {m.title}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {canEdit ? (
                        <select value={m.status} onChange={(e) => pm.saveMilestone(pid, { ...m, status: e.target.value as MilestoneStatus })} className="input-field !py-1 !text-xs !w-auto">
                          {statuses.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge tone={milestoneTone[m.status]}>{m.status}</Badge>
                      )}
                      <RowActions
                        onEdit={canEdit ? () => setEdit({ ...m }) : undefined}
                        onDelete={canEdit ? () => confirm({ title: `حذف مایل‌ستون «${m.title}»؟`, onConfirm: () => pm.deleteMilestone(pid, m.id) }) : undefined}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-ink-400 mt-1">
                    سررسید: {m.due} · مسئول: {m.owner}
                    {m.status !== "انجام‌شده" && <span className={left < 0 ? "text-rose-600" : left <= 3 ? "text-amber-600" : ""}> · {left < 0 ? `${fa(-left)} روز گذشته` : left === 0 ? "امروز" : `${fa(left)} روز مانده`}</span>}
                  </p>
                  {linked.length > 0 && (
                    <div className="mt-2 max-w-lg">
                      <div className="flex items-center justify-between text-[11px] text-ink-500 mb-1">
                        <span>تسک‌های مرتبط</span>
                        <span>
                          {fa(doneN)}/{fa(linked.length)}
                        </span>
                      </div>
                      <Progress value={(doneN / linked.length) * 100} tone="bg-emerald-500" />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {linked.map((t) => (
                          <button key={t.id} onClick={() => openTask(t.id)} className={`text-[11px] px-2 py-0.5 rounded border ${isDone(p, t) ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-ink-200 text-ink-600 hover:border-brand-300"}`}>
                            {t.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Milestone size={20} />} title="مایل‌ستونی تعریف نشده" description="نقاط عطف کلیدی پروژه را برای پایش مدیریتی تعریف کنید." />
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "ویرایش مایل‌ستون" : "مایل‌ستون جدید"}>
        {edit && (
          <div className="space-y-3">
            <Field label="عنوان">
              <input className="input-field" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="مثلاً: پایان طراحی" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="سررسید">
                <JalaliDatePicker value={edit.due} onChange={(v) => setEdit({ ...edit, due: v })} />
              </Field>
              <Field label="وضعیت">
                <select className="input-field" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as MilestoneStatus })}>
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="مسئول">
              <MemberSelect p={p} value={edit.owner} onChange={(v) => setEdit({ ...edit, owner: v })} allowEmpty={false} />
            </Field>
            <Field label="تسک‌های مرتبط">
              <div className="max-h-40 overflow-y-auto border border-ink-200 rounded-lg p-2 space-y-1">
                {p.tasks.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-xs text-ink-700">
                    <input type="checkbox" className="accent-[var(--color-brand-600)]" checked={edit.taskIds.includes(t.id)} onChange={() => setEdit({ ...edit, taskIds: edit.taskIds.includes(t.id) ? edit.taskIds.filter((x) => x !== t.id) : [...edit.taskIds, t.id] })} />
                    {t.title}
                  </label>
                ))}
              </div>
            </Field>
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
