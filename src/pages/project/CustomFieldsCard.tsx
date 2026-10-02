import { useState } from "react";
import { SlidersHorizontal, Plus, Sigma } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import RowActions from "../../components/ui/RowActions";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { builtinNumeric, cfDisplay, formulaError, joinMulti, numericFields, splitMulti } from "../../pm/customFields";
import { fmtRial, parseRial } from "../../pm/jalali";
import type { CustomFieldDef, CustomFieldType, PMTask, ProjectState } from "../../pm/types";
import { Field, SectionTitle, useProjectPage } from "./shared";

const types: CustomFieldType[] = ["متن", "عدد", "مبلغ", "انتخابی", "چندانتخابی", "تاریخ", "شخص", "فرمول"];
const typeHint: Partial<Record<CustomFieldType, string>> = { مبلغ: "ریال", شخص: "عضو پروژه", فرمول: "محاسبه‌ای", چندانتخابی: "چند گزینه" };

/** فیلدهای سفارشی تسک (مثل Jira / Monday / ClickUp) — در جزئیات تسک و ستون‌های نمای فهرست دیده می‌شوند */
export default function CustomFieldsCard() {
  const { p, pid, canEdit } = useProjectPage();
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [edit, setEdit] = useState<(Omit<CustomFieldDef, "id"> & { id?: string; optText: string }) | null>(null);
  const fields = p.customFields ?? [];
  const hasOptions = (t: CustomFieldType) => t === "انتخابی" || t === "چندانتخابی";

  return (
    <div className="card p-4">
      <SectionTitle
        icon={<SlidersHorizontal size={15} className="text-brand-600" />}
        title="فیلدهای سفارشی تسک"
        hint="اطلاعات خاص این پروژه (مثل روستا، کد قرارداد، مبلغ یا ناظر) را به همه‌ی تسک‌ها اضافه کنید؛ فیلد «فرمول» از فیلدهای عددی محاسبه می‌شود. این فیلدها در جزئیات تسک و ستون‌های نمای فهرست نمایش داده می‌شوند."
        action={
          canEdit && (
            <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setEdit({ name: "", type: "متن", optText: "" })}>
              فیلد جدید
            </Button>
          )
        }
      />
      <div className="divide-y divide-ink-100">
        {fields.map((f) => (
          <div key={f.id} className="flex items-center gap-2 py-2 text-sm flex-wrap">
            <span className="flex-1 text-ink-800 min-w-[100px]">{f.name}</span>
            <Badge tone={f.type === "فرمول" ? "navy" : "neutral"}>{f.type}</Badge>
            {f.options?.length ? <span className="text-[11px] text-ink-400 truncate max-w-[40%]">{f.options.join("، ")}</span> : null}
            {f.formula ? (
              <span className="text-[11px] text-ink-500 truncate max-w-[40%] font-mono" dir="ltr">
                {f.formula}
              </span>
            ) : null}
            {f.type !== "فرمول" && <span className="text-[11px] text-ink-400">{p.tasks.filter((t) => t.customFields?.[f.id]).length.toLocaleString("fa-IR")} تسک</span>}
            {canEdit && (
              <RowActions
                onEdit={() => setEdit({ ...f, optText: (f.options ?? []).join("، ") })}
                onDelete={() => confirm({ title: `حذف فیلد «${f.name}»؟`, message: "مقدار این فیلد از همه‌ی تسک‌ها پاک می‌شود.", onConfirm: () => pm.removeCustomField(pid, f.id) })}
              />
            )}
          </div>
        ))}
        {fields.length === 0 && <p className="text-xs text-ink-400 py-2">هنوز فیلد سفارشی تعریف نشده است.</p>}
      </div>
      {edit && (
        <div className="mt-3 border-t border-ink-100 pt-3 grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3">
          <Field label="نام فیلد">
            <input className="input-field" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="مثلاً: کد قرارداد" autoFocus />
          </Field>
          <Field label="نوع">
            <select className="input-field" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as CustomFieldType })}>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                  {typeHint[t] ? ` (${typeHint[t]})` : ""}
                </option>
              ))}
            </select>
          </Field>
          {hasOptions(edit.type) && (
            <div className="sm:col-span-2">
              <Field label="گزینه‌ها (با ، جدا کنید)">
                <input className="input-field" value={edit.optText} onChange={(e) => setEdit({ ...edit, optText: e.target.value })} placeholder="دهستان رمشک، دهستان چاه‌دادخدا" />
              </Field>
            </div>
          )}
          {edit.type === "فرمول" && (
            <div className="sm:col-span-2">
              <Field label="فرمول" hint={`نام فیلد را داخل [ ] بنویسید؛ فقط + − × ÷ و پرانتز. فیلدهای قابل استفاده: ${[...numericFields(p).map((f) => f.name), ...builtinNumeric.map((b) => b.name)].map((n) => `[${n}]`).join("، ")}`}>
                <input className="input-field font-mono" value={edit.formula ?? ""} onChange={(e) => setEdit({ ...edit, formula: e.target.value })} placeholder="[برآورد ساعت] * [نرخ ساعتی]" />
              </Field>
            </div>
          )}
          <div className="sm:col-span-2 flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!edit.name.trim()) return notify("نام فیلد الزامی است.", "warning");
                const options = hasOptions(edit.type) ? edit.optText.split(/[،,]/).map((x) => x.trim()).filter(Boolean) : undefined;
                if (hasOptions(edit.type) && !options?.length) return notify("برای فیلد انتخابی حداقل یک گزینه وارد کنید.", "warning");
                if (edit.type === "فرمول") {
                  const err = formulaError(p, edit.formula ?? "");
                  if (err) return notify(err, "warning");
                }
                pm.saveCustomField(pid, { id: edit.id, name: edit.name.trim(), type: edit.type, options, formula: edit.type === "فرمول" ? edit.formula?.trim() : undefined });
                notify(edit.id ? "فیلد ویرایش شد." : "فیلد سفارشی اضافه شد.");
                setEdit(null);
              }}
            >
              {edit.id ? "ذخیره" : "افزودن فیلد"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEdit(null)}>
              انصراف
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** ورودی‌های فیلدهای سفارشی در جزئیات تسک (همه‌ی انواع، فرمول فقط‌خواندنی) */
export function CustomFieldInputs({ p, draft, onChange, disabled }: { p: ProjectState; draft: PMTask; onChange: (values: Record<string, string>) => void; disabled: boolean }) {
  const fields = p.customFields ?? [];
  if (!fields.length) return null;
  const values = draft.customFields ?? {};
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-ink-100 bg-ink-50/50 p-3">
      {fields.map((f) => {
        const v = values[f.id] ?? "";
        const set = (val: string) => onChange({ ...values, [f.id]: val });
        return (
          <Field key={f.id} label={f.name}>
            {f.type === "انتخابی" ? (
              <select className="input-field" value={v} disabled={disabled} onChange={(e) => set(e.target.value)}>
                <option value="">—</option>
                {(f.options ?? []).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : f.type === "چندانتخابی" ? (
              <div className="flex flex-wrap gap-1">
                {(f.options ?? []).map((o) => {
                  const cur = splitMulti(v);
                  const on = cur.includes(o);
                  return (
                    <button key={o} type="button" disabled={disabled} onClick={() => set(joinMulti(on ? cur.filter((x) => x !== o) : [...cur, o]))} className={`text-[11px] px-2 py-1 rounded-md border ${on ? "bg-brand-50 border-brand-300 text-brand-700" : "border-ink-200 text-ink-500 hover:bg-ink-50"}`}>
                      {o}
                    </button>
                  );
                })}
              </div>
            ) : f.type === "تاریخ" ? (
              <JalaliDatePicker value={v} onChange={set} />
            ) : f.type === "شخص" ? (
              <select className="input-field" value={v} disabled={disabled} onChange={(e) => set(e.target.value)}>
                <option value="">—</option>
                {[...p.members.map((m) => m.name), ...(v && !p.members.some((m) => m.name === v) ? [v] : [])].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            ) : f.type === "مبلغ" ? (
              <div>
                <input className="input-field" value={v ? Number(v).toLocaleString("fa-IR") : ""} disabled={disabled} inputMode="numeric" onChange={(e) => set(String(parseRial(e.target.value) || ""))} placeholder="ریال" />
                {v && <p className="text-[10.5px] text-ink-400 mt-0.5">{fmtRial(Number(v))}</p>}
              </div>
            ) : f.type === "فرمول" ? (
              <div className="input-field !bg-transparent flex items-center gap-1.5 text-ink-700" title={f.formula}>
                <Sigma size={13} className="text-ink-400 shrink-0" />
                <span className="tabular-nums">{cfDisplay(p, draft, f, values)}</span>
              </div>
            ) : (
              <input className="input-field" value={v} disabled={disabled} inputMode={f.type === "عدد" ? "numeric" : undefined} onChange={(e) => set(e.target.value)} />
            )}
          </Field>
        );
      })}
    </div>
  );
}
