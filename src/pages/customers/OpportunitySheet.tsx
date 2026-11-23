// برگه‌ی فرصت فروش: عنوان، ارزش ریالی، توضیحات، مسئول پیگیری، احتمال ۰ تا ۱۰۰، برچسب، پیوست،
// وضعیت باز/موفق/ناموفق و تاریخ مورد انتظار بستن؛ ارزش وزنی = ارزش × احتمال.
import { useState } from "react";
import { Link } from "react-router-dom";
import Sheet from "../../components/ui/Sheet";
import Button from "../../components/ui/Button";
import Progress from "../../components/ui/Progress";
import Pill from "../../components/ui/Pill";
import { useToast } from "../../components/ui/ToastProvider";
import { useOffice, type OpportunityInput } from "../../context/OfficeContext";
import { weightedOf } from "../../office/ledger";
import { opportunityStatusLabel, type Opportunity, type OpportunityStatus } from "../../office/types";
import { AttachmentInput, DateInput, Field, LabelPicker, MoneyInput, PersonSelect } from "../../office/ui";
import { addDaysEn, OFFICE_TODAY, rial, toFa } from "../../office/util";

const fromOpp = (x: Opportunity): OpportunityInput => {
  const { id: _i, created_at: _c, created_by: _b, closed_at: _d, ...rest } = x;
  return rest;
};

export default function OpportunitySheet({ opportunity, customerId, onClose }: { opportunity?: Opportunity; customerId?: number; onClose: () => void }) {
  const o = useOffice();
  const { notify } = useToast();
  const [f, setF] = useState<OpportunityInput>(() =>
    opportunity
      ? fromOpp(opportunity)
      : { customer: customerId ?? o.visibleCustomers[0]?.id ?? 0, title: "", value_rial: 0, probability: 50, owner_id: o.me, labels: [], attachments: [], status: "open", expected_close_date: addDaysEn(OFFICE_TODAY, 30), description: "" },
  );
  const set = (p: Partial<OpportunityInput>) => setF((x) => ({ ...x, ...p }));
  const customer = o.state.customers.find((c) => c.id === f.customer);
  const prob = f.status === "won" ? 100 : f.status === "lost" ? 0 : f.probability;

  const save = () => {
    const r = o.saveOpportunity(f, opportunity?.id);
    if (!r.ok) return notify(r.reason, "warning");
    notify(opportunity ? "فرصت فروش به‌روزرسانی شد." : "فرصت فروش ثبت شد.");
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      eyebrow={`فرصت فروش · ${customer?.name ?? "—"}`}
      title={opportunity ? opportunity.title : "فرصت فروش جدید"}
      footer={
        <>
          <Button variant="primary" onClick={save}>
            {opportunity ? "ذخیره" : "ثبت فرصت"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          {customer && !customerId && (
            <Link to={`/customers/${customer.id}?tab=opportunities`} className="btn btn-link ms-auto">
              پرونده‌ی مشتری
            </Link>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!customerId && !opportunity && (
          <Field label="پرونده‌ی مشتری" required>
            <select className="input-field" value={f.customer} onChange={(e) => set({ customer: Number(e.target.value) })}>
              {o.visibleCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="عنوان" required>
          <input className="input-field" value={f.title} onChange={(e) => set({ title: e.target.value })} autoFocus={!opportunity} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="ارزش ریالی">
            <MoneyInput value={f.value_rial} onChange={(value_rial) => set({ value_rial })} />
          </Field>
          <Field label="مسئول پیگیری">
            <PersonSelect value={f.owner_id} onChange={(owner_id) => set({ owner_id })} />
          </Field>
        </div>
        <Field label="وضعیت">
          <div className="flex gap-2">
            {(Object.keys(opportunityStatusLabel) as OpportunityStatus[]).map((s) => (
              <Pill key={s} pressed={f.status === s} dot={s === "won" ? "success" : s === "lost" ? "danger" : "brand"} onClick={() => set({ status: s })}>
                {opportunityStatusLabel[s]}
              </Pill>
            ))}
          </div>
        </Field>
        <Field label={`احتمال موفقیت: ${toFa(prob)}٪`} hint={f.status !== "open" ? "برای فرصت بسته‌شده احتمال ثابت است." : undefined}>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={100} step={5} value={prob} disabled={f.status !== "open"} onChange={(e) => set({ probability: Number(e.target.value) })} className="flex-1 accent-[var(--color-teal-500)]" aria-label="احتمال موفقیت" />
            <input type="number" min={0} max={100} value={prob} disabled={f.status !== "open"} onChange={(e) => set({ probability: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} className="input-field !w-20" dir="ltr" aria-label="درصد" />
          </div>
          <Progress value={prob} size="sm" className="mt-1" />
        </Field>
        <p className="text-sm text-ink-600">
          ارزش وزنی (ارزش × احتمال): <b className="text-ink-900">{rial(weightedOf({ value_rial: f.value_rial, probability: prob }))}</b>
        </p>
        <Field label="تاریخ مورد انتظار بستن">
          <DateInput value={f.expected_close_date} onChange={(expected_close_date) => set({ expected_close_date })} />
        </Field>
        <Field label="توضیحات">
          <textarea className="input-field min-h-24" value={f.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <Field label="برچسب‌ها">
          <LabelPicker ns="sales" value={f.labels} onChange={(labels) => set({ labels })} />
        </Field>
        <Field label="پیوست‌ها">
          <AttachmentInput value={f.attachments} onChange={(attachments) => set({ attachments })} />
        </Field>
        {opportunity && (
          <p className="cap">
            ثبت: {toFa(opportunity.created_at)} · {o.nameOf(opportunity.created_by)}
            {opportunity.closed_at && ` · بسته‌شده ${toFa(opportunity.closed_at)}`}
          </p>
        )}
      </div>
    </Sheet>
  );
}
