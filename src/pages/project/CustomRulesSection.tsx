import { useState } from "react";
import { Plus, Wand2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Toggle from "../../components/ui/Toggle";
import RowActions from "../../components/ui/RowActions";
import Badge from "../../components/ui/Badge";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { defaultLabels } from "../../pm/seed";
import { fa } from "../../pm/jalali";
import type { CustomRule, CustomRuleAction, CustomRuleTrigger, PMPriority, ProjectState } from "../../pm/types";
import { SectionTitle, priorities, useProjectPage } from "./shared";

export function triggerText(p: ProjectState, t: CustomRuleTrigger) {
  if (t.type === "moved") return `تسک به ستون «${p.columns.find((c) => c.id === t.columnId)?.label ?? "؟"}» منتقل شد`;
  if (t.type === "labelAdded") return `برچسب «${t.label}» به تسک اضافه شد`;
  return "تسک جدید ایجاد شد";
}
export function actionText(a: CustomRuleAction) {
  switch (a.type) {
    case "assign":
      return `واگذاری به «${a.member}»`;
    case "priority":
      return `اولویت ← «${a.priority}»`;
    case "label":
      return `افزودن برچسب «${a.label}»`;
    case "watch":
      return `«${a.member}» دنبال‌کننده شود`;
    case "checklist":
      return `افزودن «${a.text}» به چک‌لیست`;
  }
}

type Draft = { id?: string; name: string; trigger: CustomRuleTrigger["type"]; column: string; tLabel: string; action: CustomRuleAction["type"]; value: string };

/** سازنده‌ی قاعده‌ی «وقتی … آنگاه …» — مشابه Jira Automation و Trello Butler، بدون نیاز به کدنویسی */
export default function CustomRulesSection({ canEdit }: { canEdit: boolean }) {
  const { p, pid } = useProjectPage();
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [d, setD] = useState<Draft | null>(null);
  const rules = p.customRules ?? [];
  const labels = [...new Set([...defaultLabels, ...p.tasks.flatMap((t) => t.labels)])];

  const fromRule = (r: CustomRule): Draft => ({
    id: r.id,
    name: r.name,
    trigger: r.trigger.type,
    column: r.trigger.type === "moved" ? r.trigger.columnId : p.columns[0]?.id ?? "",
    tLabel: r.trigger.type === "labelAdded" ? r.trigger.label : labels[0],
    action: r.action.type,
    value: r.action.type === "priority" ? r.action.priority : r.action.type === "label" ? r.action.label : r.action.type === "checklist" ? r.action.text : r.action.member,
  });

  const submit = () => {
    if (!d) return;
    if (!d.value.trim()) return notify("مقدار عمل را مشخص کنید.", "warning");
    const trigger: CustomRuleTrigger = d.trigger === "moved" ? { type: "moved", columnId: d.column } : d.trigger === "labelAdded" ? { type: "labelAdded", label: d.tLabel } : { type: "created" };
    const v = d.value.trim();
    const action: CustomRuleAction =
      d.action === "assign" ? { type: "assign", member: v } : d.action === "watch" ? { type: "watch", member: v } : d.action === "priority" ? { type: "priority", priority: v as PMPriority } : d.action === "label" ? { type: "label", label: v } : { type: "checklist", text: v };
    const name = d.name.trim() || `${triggerText(p, trigger)} ← ${actionText(action)}`;
    const prev = rules.find((r) => r.id === d.id);
    pm.saveCustomRule(pid, { id: d.id, name, trigger, action, enabled: prev?.enabled ?? true });
    notify(d.id ? "قاعده ویرایش شد." : "قاعده ساخته شد و از همین حالا اجرا می‌شود.");
    setD(null);
  };

  const valueInput = (dr: Draft) => {
    if (dr.action === "assign" || dr.action === "watch")
      return (
        <select className="input-field" value={dr.value} onChange={(e) => setD({ ...dr, value: e.target.value })}>
          <option value="">انتخاب عضو…</option>
          {p.members.map((m) => (
            <option key={m.id}>{m.name}</option>
          ))}
        </select>
      );
    if (dr.action === "priority")
      return (
        <select className="input-field" value={dr.value} onChange={(e) => setD({ ...dr, value: e.target.value })}>
          <option value="">انتخاب اولویت…</option>
          {priorities.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      );
    if (dr.action === "label")
      return (
        <select className="input-field" value={dr.value} onChange={(e) => setD({ ...dr, value: e.target.value })}>
          <option value="">انتخاب برچسب…</option>
          {labels.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      );
    return <input className="input-field" value={dr.value} onChange={(e) => setD({ ...dr, value: e.target.value })} placeholder="متن مورد چک‌لیست" />;
  };

  return (
    <div className="space-y-3 mt-6">
      <SectionTitle
        icon={<Wand2 size={15} className="text-brand-600" />}
        title="قاعده‌های سفارشی «وقتی … آنگاه …»"
        hint="بدون کدنویسی، کارهای تکراری تیم را خودکار کنید — مثل Jira Automation و Trello Butler. هر اجرا در تاریخچه‌ی تسک ثبت می‌شود."
        action={
          canEdit && (
            <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setD({ name: "", trigger: "moved", column: p.columns.find((c) => c.kind === "review")?.id ?? p.columns[0]?.id ?? "", tLabel: labels[0], action: "assign", value: "" })}>
              قاعده‌ی جدید
            </Button>
          )
        }
      />
      {d && (
        <div className="card p-4 space-y-3 border-brand-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-xs font-bold text-ink-700">وقتی…</p>
              <select className="input-field" value={d.trigger} onChange={(e) => setD({ ...d, trigger: e.target.value as Draft["trigger"] })}>
                <option value="moved">تسک به ستونی منتقل شد</option>
                <option value="created">تسک جدیدی ایجاد شد</option>
                <option value="labelAdded">برچسبی به تسک اضافه شد</option>
              </select>
              {d.trigger === "moved" && (
                <select className="input-field" value={d.column} onChange={(e) => setD({ ...d, column: e.target.value })}>
                  {p.columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              )}
              {d.trigger === "labelAdded" && (
                <select className="input-field" value={d.tLabel} onChange={(e) => setD({ ...d, tLabel: e.target.value })}>
                  {labels.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-ink-700">آنگاه…</p>
              <select className="input-field" value={d.action} onChange={(e) => setD({ ...d, action: e.target.value as Draft["action"], value: "" })}>
                <option value="assign">واگذاری به عضو</option>
                <option value="watch">افزودن دنبال‌کننده</option>
                <option value="priority">تغییر اولویت</option>
                <option value="label">افزودن برچسب</option>
                <option value="checklist">افزودن مورد چک‌لیست</option>
              </select>
              {valueInput(d)}
            </div>
          </div>
          <input className="input-field" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="نام قاعده (اختیاری — خودکار ساخته می‌شود)" />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={submit}>
              {d.id ? "ذخیره" : "ساخت قاعده"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setD(null)}>
              انصراف
            </Button>
          </div>
        </div>
      )}
      {rules.map((r) => (
        <div key={r.id} className="card p-4 flex items-start gap-3">
          {canEdit ? (
            <Toggle on={r.enabled} label={r.name} onChange={() => pm.saveCustomRule(pid, { ...r, enabled: !r.enabled })} />
          ) : (
            <Badge tone={r.enabled ? "success" : "neutral"}>{r.enabled ? "فعال" : "غیرفعال"}</Badge>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink-900">{r.name}</p>
            <p className="text-[11px] text-ink-500 mt-1 leading-5">
              <span className="text-ink-400">وقتی:</span> {triggerText(p, r.trigger)} <span className="text-ink-400 mx-1">←</span> <span className="text-ink-400">آنگاه:</span> {actionText(r.action)}
            </p>
          </div>
          <span className="text-[11px] text-ink-400 whitespace-nowrap">{fa(r.runs)} بار اجرا</span>
          {canEdit && <RowActions onEdit={() => setD(fromRule(r))} onDelete={() => confirm({ title: `حذف قاعده‌ی «${r.name}»؟`, onConfirm: () => pm.removeCustomRule(pid, r.id) })} />}
        </div>
      ))}
      {rules.length === 0 && !d && <p className="text-xs text-ink-400">هنوز قاعده‌ی سفارشی ندارید.</p>}
    </div>
  );
}
