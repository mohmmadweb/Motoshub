// فرم پرونده‌ی مشتری (حقیقی/حقوقی): هویت و اطلاعات حقوقی، تلفن‌ها با برچسب، نشانی، برچسب‌ها،
// مسئول و «قابل مشاهده برای…» (مهم‌ترین فیلد هنگام ساخت) + هشدار پرونده‌ی تکراری.
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Note from "../../components/ui/Note";
import Tabs from "../../components/ui/Tabs";
import { useToast } from "../../components/ui/ToastProvider";
import { useOffice, type CustomerInput } from "../../context/OfficeContext";
import { phoneLabels, type CustomerFile, type PartyType } from "../../office/types";
import { Field, LabelPicker, PeoplePicker, PersonSelect } from "../../office/ui";
import { toEnDigits } from "../../pm/jalali";

const fromFile = (c: CustomerFile): CustomerInput => {
  const { id: _id, created_at: _c, created_by: _b, ...rest } = c;
  return rest;
};

export default function CustomerForm({ open, onClose, customer, onSaved }: { open: boolean; onClose: () => void; customer?: CustomerFile; onSaved?: (id: number) => void }) {
  const o = useOffice();
  const { notify } = useToast();
  const blank = (): CustomerInput => ({ party_type: "company", name: "", trade_name: "", national_id: "", economic_code: "", phones: [{ label: "موبایل", number: "" }], email: "", website: "", address: "", postal_code: "", labels: [], access: [], owner_id: o.me, description: "" });
  const [f, setF] = useState<CustomerInput>(() => (customer ? fromFile(customer) : blank()));
  const [tried, setTried] = useState(false);
  const set = (p: Partial<CustomerInput>) => setF((x) => ({ ...x, ...p }));
  const phones = f.phones.filter((p) => p.number.trim()).map((p) => ({ ...p, number: toEnDigits(p.number).replace(/[^\d+]/g, "") }));
  const dup = f.name.trim() || phones.length || f.national_id ? o.duplicateOf({ name: f.name, national_id: toEnDigits(f.national_id), economic_code: toEnDigits(f.economic_code), phones }, customer?.id) : null;
  const company = f.party_type === "company";

  const save = () => {
    setTried(true);
    const r = o.saveCustomer({ ...f, phones, national_id: toEnDigits(f.national_id).trim(), economic_code: toEnDigits(f.economic_code).trim(), postal_code: toEnDigits(f.postal_code).trim() }, customer?.id);
    if (!r.ok) return notify(r.reason, "warning");
    notify(customer ? "پرونده به‌روزرسانی شد." : "پرونده‌ی مشتری ساخته شد.");
    onSaved?.(r.value);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? "ویرایش پرونده‌ی مشتری" : "پرونده‌ی مشتری جدید"}
      wide
      footer={
        <>
          <Button variant="primary" onClick={save}>
            {customer ? "ذخیره" : "ایجاد پرونده"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Tabs
          tabs={[
            { id: "company", label: "حقوقی (شرکت/سازمان)" },
            { id: "person", label: "حقیقی (شخص)" },
          ]}
          active={f.party_type}
          onChange={(party_type: PartyType) => set({ party_type })}
          variant="pill"
          className="mb-0"
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={company ? "نام ثبتی" : "نام و نام خانوادگی"} required error={tried && !f.name.trim() ? "این فیلد لازم است." : undefined}>
            <input className="input-field" value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
          </Field>
          {company && (
            <Field label="نام تجاری">
              <input className="input-field" value={f.trade_name} onChange={(e) => set({ trade_name: e.target.value })} />
            </Field>
          )}
          <Field label={company ? "شناسه‌ی ملی" : "کد ملی"} hint={company ? "۱۱ رقم" : "۱۰ رقم"}>
            <input className="input-field" value={f.national_id} onChange={(e) => set({ national_id: e.target.value })} dir="ltr" inputMode="numeric" />
          </Field>
          {company && (
            <Field label="کد اقتصادی">
              <input className="input-field" value={f.economic_code} onChange={(e) => set({ economic_code: e.target.value })} dir="ltr" inputMode="numeric" />
            </Field>
          )}
        </div>
        {dup && <Note tone="warning" title="احتمال پرونده‌ی تکراری">{dup}</Note>}

        <Field label="تلفن‌ها">
          <div className="flex flex-col gap-2">
            {f.phones.map((p, i) => (
              <div key={i} className="flex gap-2">
                <select className="input-field !w-40" value={p.label} onChange={(e) => set({ phones: f.phones.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} aria-label="برچسب تلفن">
                  {[...new Set([...phoneLabels, p.label])].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                <input className="input-field flex-1" value={p.number} onChange={(e) => set({ phones: f.phones.map((x, j) => (j === i ? { ...x, number: e.target.value } : x)) })} dir="ltr" inputMode="tel" aria-label="شماره" />
                <Button variant="ghost" iconOnly aria-label="حذف شماره" onClick={() => set({ phones: f.phones.filter((_, j) => j !== i) })}>
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
            <div>
              <Button size="sm" icon={<Plus size={16} />} onClick={() => set({ phones: [...f.phones, { label: "تلفن ثابت", number: "" }] })}>
                افزودن شماره
              </Button>
            </div>
          </div>
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="ایمیل">
            <input className="input-field" value={f.email} onChange={(e) => set({ email: e.target.value })} dir="ltr" />
          </Field>
          <Field label="وب‌سایت">
            <input className="input-field" value={f.website} onChange={(e) => set({ website: e.target.value })} dir="ltr" />
          </Field>
          <Field label="نشانی" className="sm:col-span-2">
            <input className="input-field" value={f.address} onChange={(e) => set({ address: e.target.value })} />
          </Field>
          <Field label="کد پستی">
            <input className="input-field" value={f.postal_code} onChange={(e) => set({ postal_code: e.target.value })} dir="ltr" inputMode="numeric" />
          </Field>
        </div>
        <Field label="برچسب‌ها">
          <LabelPicker ns="crm" value={f.labels} onChange={(labels) => set({ labels })} />
        </Field>
        <Field label="توضیحات">
          <textarea className="input-field min-h-20" value={f.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <div className="rounded-[10px] border border-teal-500/50 bg-teal-50/40 p-4 flex flex-col gap-3">
          <Field label="مسئول پرونده">
            <PersonSelect value={f.owner_id} onChange={(owner_id) => set({ owner_id })} />
          </Field>
          <Field label="قابل مشاهده برای…" hint="فقط مسئول، این افراد و مدیران پرونده‌ی مشتریان پرونده را می‌بینند.">
            <PeoplePicker value={f.access.filter((p) => p !== f.owner_id)} onChange={(access) => set({ access })} exclude={[f.owner_id]} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
