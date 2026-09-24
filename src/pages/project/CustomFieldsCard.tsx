import { useState } from "react";
import { SlidersHorizontal, Plus } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import RowActions from "../../components/ui/RowActions";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import type { CustomFieldDef, CustomFieldType } from "../../pm/types";
import { Field, SectionTitle, useProjectPage } from "./shared";

const types: CustomFieldType[] = ["متن", "عدد", "انتخابی", "تاریخ"];

/** فیلدهای سفارشی تسک (مثل Jira / Monday / ClickUp) — در جزئیات تسک و ستون‌های نمای فهرست دیده می‌شوند */
export default function CustomFieldsCard() {
  const { p, pid, canEdit } = useProjectPage();
  const pm = useProjectsPM();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [edit, setEdit] = useState<(Omit<CustomFieldDef, "id"> & { id?: string; optText: string }) | null>(null);
  const fields = p.customFields ?? [];

  return (
    <div className="card p-4">
      <SectionTitle
        icon={<SlidersHorizontal size={15} className="text-brand-600" />}
        title="فیلدهای سفارشی تسک"
        hint="اطلاعات خاص این پروژه (مثل روستا، کد قرارداد یا تعداد ذی‌نفع) را به همه‌ی تسک‌ها اضافه کنید. این فیلدها در جزئیات تسک و ستون‌های نمای فهرست بورد نمایش داده می‌شوند."
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
          <div key={f.id} className="flex items-center gap-2 py-2 text-sm">
            <span className="flex-1 text-ink-800">{f.name}</span>
            <Badge tone="neutral">{f.type}</Badge>
            {f.options?.length ? <span className="text-[11px] text-ink-400 truncate max-w-[40%]">{f.options.join("، ")}</span> : null}
            <span className="text-[11px] text-ink-400">{p.tasks.filter((t) => t.customFields?.[f.id]).length.toLocaleString("fa-IR")} تسک</span>
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
        <div className="mt-3 border-t border-ink-100 pt-3 grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
          <Field label="نام فیلد">
            <input className="input-field" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="مثلاً: کد قرارداد" autoFocus />
          </Field>
          <Field label="نوع">
            <select className="input-field" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as CustomFieldType })}>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          {edit.type === "انتخابی" && (
            <div className="sm:col-span-2">
              <Field label="گزینه‌ها (با ، جدا کنید)">
                <input className="input-field" value={edit.optText} onChange={(e) => setEdit({ ...edit, optText: e.target.value })} placeholder="دهستان رمشک، دهستان چاه‌دادخدا" />
              </Field>
            </div>
          )}
          <div className="sm:col-span-2 flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!edit.name.trim()) return notify("نام فیلد الزامی است.", "warning");
                const options = edit.type === "انتخابی" ? edit.optText.split(/[،,]/).map((x) => x.trim()).filter(Boolean) : undefined;
                if (edit.type === "انتخابی" && !options?.length) return notify("برای فیلد انتخابی حداقل یک گزینه وارد کنید.", "warning");
                pm.saveCustomField(pid, { id: edit.id, name: edit.name.trim(), type: edit.type, options });
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
