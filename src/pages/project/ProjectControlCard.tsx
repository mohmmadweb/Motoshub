import { useState } from "react";
import { Blocks, History, LayoutTemplate, Plus, ShieldCheck, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Toggle from "../../components/ui/Toggle";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { controlLabels, controlOf, moduleLabels, modulesOf, projectManagers } from "../../pm/rules";
import { fa } from "../../pm/jalali";
import { defaultLabels } from "../../pm/seed";
import type { PMPriority, ProjectControlSettings, ProjectModules, TaskTemplate } from "../../pm/types";
import { Field, SectionTitle, numIn, priorities, useProjectPage } from "./shared";

/**
 * تنظیمات میزیتو در «تنظیمات پروژه»: ماژول‌ها (گانت، صورتجلسه‌ی سازمانی)، کنترل اعضا
 * (ایجاد/ویرایش/تمدید/حذف با تأیید مدیر)، الگوهای وظیفه و سابقه‌ی تغییرات تنظیمات.
 * مدیر/مدیران پروژه از نقشه‌ی دسترسی می‌آیند (بدون نقش در رابط کاربری).
 */
export default function ProjectControlCard() {
  const { p, pid, canEdit } = useProjectPage();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const modules = modulesOf(p);
  const control = controlOf(p);
  const [tpl, setTpl] = useState<(Omit<TaskTemplate, "id" | "createdBy"> & { id?: string }) | null>(null);
  const history = p.logs.filter((l) => l.event === "PROJECT_SETTINGS_UPDATED" || l.event === "MEMBER_PERMISSIONS_CHANGED").sort((a, b) => b.seq - a.seq).slice(0, 12);
  const templates = p.taskTemplates ?? [];

  return (
    <>
      <div className="card p-4">
        <SectionTitle icon={<Blocks size={15} className="text-brand-600" />} title="ماژول‌های پروژه" hint="ماژول‌های سنگین را فقط برای پروژه‌هایی که لازم دارند روشن کنید." />
        <div className="divide-y divide-ink-100">
          {(Object.keys(moduleLabels) as (keyof ProjectModules)[]).map((k) => (
            <div key={k} className="flex items-start gap-3 py-2.5">
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-900">{moduleLabels[k].label}</p>
                <p className="text-[12.5px] text-ink-500 leading-5">{moduleLabels[k].hint}</p>
              </div>
              <Toggle on={modules[k]} disabled={!canEdit} onChange={() => pm.setProjectModules(pid, { [k]: !modules[k] })} label={moduleLabels[k].label} />
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <SectionTitle icon={<ShieldCheck size={15} className="text-brand-600" />} title="کنترل اعضای عادی" hint={`مدیران این پروژه: ${projectManagers(p).join("، ")} — برای افزودن مدیر، در «تیم» دسترسی «مدیریت» تنظیمات را بدهید.`} />
        <div className="divide-y divide-ink-100">
          {(Object.keys(controlLabels) as (keyof ProjectControlSettings)[]).map((k) => (
            <div key={k} className="flex items-start gap-3 py-2.5">
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-900">{controlLabels[k].label}</p>
                <p className="text-[12.5px] text-ink-500 leading-5">{controlLabels[k].hint}</p>
              </div>
              <Toggle on={control[k]} disabled={!canEdit} onChange={() => pm.setProjectControl(pid, { [k]: !control[k] })} label={controlLabels[k].label} />
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <SectionTitle
          icon={<LayoutTemplate size={15} className="text-brand-600" />}
          title="الگوهای وظیفه"
          hint="الگوهای فعال هنگام ساخت کار (در همین پروژه و پروژه‌های دیگر اعضا) قابل انتخاب‌اند."
          action={
            canEdit ? (
              <Button size="sm" variant="tonal" icon={<Plus size={14} />} onClick={() => setTpl({ name: "", active: true, title: "", description: "", priority: "متوسط", type: "task", labels: [], checklist: [], estHours: 0, durationDays: 3 })}>
                الگوی تازه
              </Button>
            ) : undefined
          }
        />
        <div className="divide-y divide-ink-100">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center gap-2 py-2">
              <button className="flex-1 text-right min-w-0" onClick={() => canEdit && setTpl(t)}>
                <p className="text-sm text-ink-900 truncate">{t.name}</p>
                <p className="text-[12px] text-ink-500 truncate">
                  {t.title} · {fa(t.checklist.length)} مورد چک‌لیست · {fa(t.durationDays)} روز · سازنده: {t.createdBy}
                </p>
              </button>
              <Badge tone={t.active ? "success" : "neutral"}>{t.active ? "فعال" : "غیرفعال"}</Badge>
              {canEdit && <Toggle on={t.active} onChange={() => pm.saveTaskTemplate(pid, { ...t, active: !t.active })} label={`فعال بودن ${t.name}`} />}
              {canEdit && (
                <button className="btn btn-ghost btn-icon btn-sm text-rose-600" onClick={() => pm.removeTaskTemplate(pid, t.id)} aria-label={`حذف الگوی ${t.name}`}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {templates.length === 0 && <p className="text-[13px] text-ink-500 py-2">الگویی ندارید؛ از جزئیات هر کار «ذخیره به‌عنوان الگو» را بزنید یا الگوی تازه بسازید.</p>}
        </div>
      </div>

      <div className="card p-4">
        <SectionTitle icon={<History size={15} className="text-brand-600" />} title="سابقه‌ی تغییرات تنظیمات" />
        <ul className="space-y-1.5">
          {history.map((l) => (
            <li key={l.id} className="text-[12.5px] text-ink-700 leading-5">
              <span className="text-ink-500">
                {l.date} {l.time} · {l.actor}:
              </span>{" "}
              {l.description}
            </li>
          ))}
          {history.length === 0 && <li className="text-[13px] text-ink-500">هنوز تغییری ثبت نشده است.</li>}
        </ul>
      </div>

      {tpl && (
        <Modal open onClose={() => setTpl(null)} title={tpl.id ? "ویرایش الگوی وظیفه" : "الگوی وظیفه‌ی تازه"} wide>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="نام الگو">
                <input className="input-field" value={tpl.name} onChange={(e) => setTpl({ ...tpl, name: e.target.value })} />
              </Field>
              <Field label="عنوان کار">
                <input className="input-field" value={tpl.title} onChange={(e) => setTpl({ ...tpl, title: e.target.value })} />
              </Field>
              <Field label="اولویت">
                <select className="input-field" value={tpl.priority} onChange={(e) => setTpl({ ...tpl, priority: e.target.value as PMPriority })}>
                  {priorities.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="مدت (روز)">
                <input className="input-field" inputMode="numeric" value={tpl.durationDays ? fa(tpl.durationDays) : ""} onChange={(e) => setTpl({ ...tpl, durationDays: Math.max(1, numIn(e.target.value)) })} />
              </Field>
              <Field label="برآورد ساعت">
                <input className="input-field" inputMode="numeric" value={tpl.estHours ? fa(tpl.estHours) : ""} onChange={(e) => setTpl({ ...tpl, estHours: numIn(e.target.value) })} />
              </Field>
              <Field label="وزن">
                <input className="input-field" inputMode="numeric" value={tpl.weight ? fa(tpl.weight) : ""} onChange={(e) => setTpl({ ...tpl, weight: numIn(e.target.value) || undefined })} />
              </Field>
            </div>
            <Field label="شرح">
              <textarea className="input-field min-h-[70px]" value={tpl.description} onChange={(e) => setTpl({ ...tpl, description: e.target.value })} />
            </Field>
            <Field label="چک‌لیست (هر خط یک مورد)">
              <textarea className="input-field min-h-[70px]" value={tpl.checklist.join("\n")} onChange={(e) => setTpl({ ...tpl, checklist: e.target.value.split("\n") })} />
            </Field>
            <Field label="برچسب‌ها">
              <div className="flex flex-wrap gap-1.5">
                {defaultLabels.map((l) => (
                  <button key={l} type="button" onClick={() => setTpl({ ...tpl, labels: tpl.labels.includes(l) ? tpl.labels.filter((x) => x !== l) : [...tpl.labels, l] })} className={`text-[12px] px-2 py-1 rounded-md border ${tpl.labels.includes(l) ? "bg-teal-50 border-teal-500 text-teal-700" : "border-ink-200 text-ink-500"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  if (!tpl.name.trim() || !tpl.title.trim()) return notify("نام الگو و عنوان کار لازم است.", "warning");
                  pm.saveTaskTemplate(pid, { ...tpl, checklist: tpl.checklist.map((x) => x.trim()).filter(Boolean) });
                  setTpl(null);
                  notify("الگوی وظیفه ذخیره شد.");
                }}
              >
                ذخیره
              </Button>
              <Button variant="ghost" onClick={() => setTpl(null)}>
                انصراف
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
