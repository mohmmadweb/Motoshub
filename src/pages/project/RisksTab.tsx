import { Fragment, useState } from "react";
import { ShieldAlert, Plus, TrendingUp, Cpu, Info } from "lucide-react";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import RowActions from "../../components/ui/RowActions";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { analyzeRisks, riskLevelLabel, riskTypeLabel } from "../../pm/selectors";
import { fa } from "../../pm/jalali";
import type { PMRisk, RiskLevel3, RiskSeverity, RiskStatus } from "../../pm/types";
import { Field, MemberSelect, SectionTitle, TaskSelect, taskTitle, useProjectPage } from "./shared";

const riskSeverityTone: Record<RiskSeverity, BadgeTone> = { کم: "neutral", متوسط: "warning", بحرانی: "danger" };
const riskStatusTone: Record<RiskStatus, BadgeTone> = { باز: "danger", "در حال رفع": "warning", بسته: "success" };
const levels3: RiskLevel3[] = ["کم", "متوسط", "زیاد"];
const sevs: RiskSeverity[] = ["کم", "متوسط", "بحرانی"];
const stats: RiskStatus[] = ["باز", "در حال رفع", "بسته"];

type Draft = Omit<PMRisk, "id"> & { id?: string };

export default function RisksTab() {
  const { p, pid, canEdit, refDate, openTask, goTab, focusId } = useProjectPage();
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [edit, setEdit] = useState<Draft | null>(null);
  const [statusF, setStatusF] = useState<RiskStatus | "">("");
  const findings = analyzeRisks(p, refDate);
  const list = p.risks.filter((r) => !statusF || r.status === statusF);

  const save = () => {
    if (!edit) return;
    if (!edit.title.trim() || !edit.mitigation.trim()) return notify("عنوان و برنامه‌ی مقابله الزامی است.", "warning");
    pm.saveRisk(pid, { ...edit, taskId: edit.taskId || undefined });
    notify(edit.id ? "ریسک به‌روزرسانی شد." : "ریسک ثبت شد و برای مسئول آن اعلان رفت.");
    setEdit(null);
  };

  const escalate = (r: PMRisk) => {
    const next = sevs[Math.min(2, sevs.indexOf(r.severity) + 1)];
    pm.saveRisk(pid, { ...r, severity: next });
    notify(`شدت ریسک به «${next}» افزایش یافت${next === "بحرانی" ? " — اعلان فوری (پیامک) برای مدیر، مالک و کارفرما ارسال شد" : ""}.`, "warning");
  };

  // ماتریس احتمال × اثر
  const cell = (prob: RiskLevel3, imp: RiskLevel3) => p.risks.filter((r) => r.status !== "بسته" && r.probability === prob && r.impact === imp);
  const heat = (i: number, j: number) => ["bg-emerald-50", "bg-amber-50", "bg-rose-50", "bg-rose-100"][Math.min(3, Math.floor((i + j) / 1.4))];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div>
          <SectionTitle
            icon={<ShieldAlert size={15} className="text-rose-600" />}
            title="ریسک‌های ثبت‌شده"
            hint="ریسک = خطر احتمالی. توضیح، احتمال وقوع، میزان اثر، مسئول و برنامه‌ی مقابله."
            action={
              <div className="flex gap-2">
                <select value={statusF} onChange={(e) => setStatusF(e.target.value as RiskStatus)} className="input-field !py-1.5 !text-xs !w-auto">
                  <option value="">همه</option>
                  {stats.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                {canEdit && (
                  <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setEdit({ title: "", severity: "متوسط", probability: "متوسط", impact: "متوسط", status: "باز", owner: p.meta.manager, mitigation: "" })}>
                    ریسک جدید
                  </Button>
                )}
              </div>
            }
          />
          {list.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {list.map((r) => (
                <div key={r.id} className={`card p-4 ${focusId === r.id ? "ring-2 ring-brand-300" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5">
                      <ShieldAlert size={15} className="text-rose-600 shrink-0" /> {r.title}
                    </p>
                    <div className="flex items-center gap-1">
                      {canEdit ? (
                        <select value={r.status} onChange={(e) => pm.saveRisk(pid, { ...r, status: e.target.value as RiskStatus })} className="input-field !py-1 !text-xs !w-auto">
                          {stats.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge tone={riskStatusTone[r.status]}>{r.status}</Badge>
                      )}
                      <RowActions onEdit={canEdit ? () => setEdit({ ...r }) : undefined} onDelete={canEdit ? () => confirm({ title: `حذف ریسک «${r.title}»؟`, onConfirm: () => pm.deleteRisk(pid, r.id) }) : undefined} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge tone={riskSeverityTone[r.severity]}>شدت: {r.severity}</Badge>
                    <Badge tone="neutral">احتمال: {r.probability}</Badge>
                    <Badge tone="neutral">اثر: {r.impact}</Badge>
                    <span className="text-[11px] text-ink-400 mr-auto">مسئول: {r.owner}</span>
                  </div>
                  <p className="text-xs text-ink-500 mt-3 leading-6 border-t border-ink-100 pt-3">
                    <span className="font-medium text-ink-700">اقدام کاهشی: </span>
                    {r.mitigation}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    {r.taskId ? (
                      <button onClick={() => openTask(r.taskId!)} className="text-[11px] text-brand-700 hover:underline">
                        تسک مرتبط: {taskTitle(p, r.taskId)}
                      </button>
                    ) : (
                      <span />
                    )}
                    {canEdit && r.status !== "بسته" && r.severity !== "بحرانی" && (
                      <Button size="sm" variant="ghost" icon={<TrendingUp size={12} />} onClick={() => escalate(r)}>
                        تشدید شدت
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<ShieldAlert size={20} />} title="ریسکی ثبت نشده" description="ریسک‌ها و مسائل پروژه را برای پایش در کمیته راهبری ثبت کنید." />
          )}
        </div>

        <div className="card p-4 self-start">
          <p className="text-xs font-bold text-ink-900 mb-3">ماتریس احتمال × اثر (ریسک‌های باز)</p>
          <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1 text-[10.5px]">
            <span />
            {levels3.map((l) => (
              <span key={l} className="text-center text-ink-400">
                اثر {l}
              </span>
            ))}
            {[...levels3].reverse().map((prob, i) => (
              <Fragment key={prob}>
                <span className="text-ink-400 self-center whitespace-nowrap">
                  احتمال {prob}
                </span>
                {levels3.map((imp, j) => {
                  const items = cell(prob, imp);
                  return (
                    <div key={`${prob}-${imp}`} className={`${heat(2 - i, j)} rounded-md h-14 flex items-center justify-center text-sm font-bold text-ink-800`} title={items.map((x) => x.title).join("\n")}>
                      {items.length ? fa(items.length) : ""}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <SectionTitle
          icon={<Cpu size={15} className="text-brand-600" />}
          title="تحلیل خودکار ریسک"
          hint="سامانه از روی تأخیر تسک‌ها، وابستگی‌ها، هزینه‌ها و مایل‌ستون‌ها امتیاز ریسک (۰ تا ۱۰۰) می‌دهد."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[760px]">
            <thead>
              <tr className="text-ink-400 border-b border-ink-100 text-right">
                <th className="p-2 font-medium">امتیاز</th>
                <th className="p-2 font-medium">نوع</th>
                <th className="p-2 font-medium">موجودیت</th>
                <th className="p-2 font-medium">عوامل</th>
                <th className="p-2 font-medium">توضیح</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {findings.map((f) => (
                <tr key={f.id} className="border-b border-ink-100 align-top">
                  <td className="p-2">
                    <span className={`inline-block text-[11px] font-bold rounded px-1.5 py-0.5 ${f.level === "critical" ? "bg-rose-600 text-white" : f.level === "high" ? "bg-rose-50 text-rose-700" : f.level === "medium" ? "bg-amber-50 text-amber-700" : "bg-ink-100 text-ink-600"}`}>
                      {fa(f.score)} · {riskLevelLabel[f.level]}
                    </span>
                  </td>
                  <td className="p-2">
                    <p className="text-ink-800">{riskTypeLabel[f.riskType]}</p>
                    <p dir="ltr" className="font-mono text-[10px] text-ink-400 text-left">
                      {f.riskType}
                    </p>
                  </td>
                  <td className="p-2">
                    {f.entityType === "task" ? (
                      <button onClick={() => openTask(f.entityId)} className="text-brand-700 hover:underline text-right">
                        {f.entityTitle}
                      </button>
                    ) : f.entityType === "milestone" ? (
                      <button onClick={() => goTab("milestones", f.entityId)} className="text-brand-700 hover:underline text-right">
                        {f.entityTitle}
                      </button>
                    ) : (
                      <span className="text-ink-700">{f.entityTitle}</span>
                    )}
                  </td>
                  <td className="p-2 text-ink-500 leading-5">
                    {Object.entries(f.factors).map(([k, v]) => (
                      <span key={k} className="block">
                        {k}: {v}
                      </span>
                    ))}
                  </td>
                  <td className="p-2 text-ink-600 leading-5">{f.explanation}</td>
                  <td className="p-2">
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={() => setEdit({ title: `${riskTypeLabel[f.riskType]}: ${f.entityTitle}`, severity: f.level === "critical" ? "بحرانی" : f.level === "high" ? "متوسط" : "کم", probability: f.score > 70 ? "زیاد" : "متوسط", impact: f.level === "critical" || f.level === "high" ? "زیاد" : "متوسط", status: "باز", owner: p.meta.manager, mitigation: "", taskId: f.entityType === "task" ? f.entityId : undefined })}>
                        ثبت به‌عنوان ریسک
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {findings.length === 0 && <p className="text-center text-xs text-ink-400 py-6">موردی شناسایی نشد.</p>}
        </div>
        <p className="text-[11px] text-ink-400 mt-2 flex items-center gap-1">
          <Info size={12} /> تحلیل با «امروزِ» دمو ({refDate}) محاسبه می‌شود؛ با جلو بردن زمان از تنظیمات، نتایج تغییر می‌کند.
        </p>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "ویرایش ریسک" : "ثبت ریسک جدید"}>
        {edit && (
          <div className="space-y-3">
            <Field label="توضیح ریسک">
              <input className="input-field" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="مثلاً: تأخیر در تحویل طراحی" />
            </Field>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="احتمال وقوع">
                <select className="input-field" value={edit.probability} onChange={(e) => setEdit({ ...edit, probability: e.target.value as RiskLevel3 })}>
                  {levels3.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="میزان اثر">
                <select className="input-field" value={edit.impact} onChange={(e) => setEdit({ ...edit, impact: e.target.value as RiskLevel3 })}>
                  {levels3.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="شدت">
                <select className="input-field" value={edit.severity} onChange={(e) => setEdit({ ...edit, severity: e.target.value as RiskSeverity })}>
                  {sevs.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="وضعیت">
                <select className="input-field" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as RiskStatus })}>
                  {stats.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="مسئول">
                <MemberSelect p={p} value={edit.owner} onChange={(v) => setEdit({ ...edit, owner: v })} allowEmpty={false} />
              </Field>
              <Field label="تسک مرتبط">
                <TaskSelect p={p} value={edit.taskId ?? ""} onChange={(v) => setEdit({ ...edit, taskId: v })} placeholder="—" />
              </Field>
            </div>
            <Field label="برنامه‌ی مقابله (Mitigation Plan)">
              <textarea className="input-field min-h-[70px]" value={edit.mitigation} onChange={(e) => setEdit({ ...edit, mitigation: e.target.value })} />
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
