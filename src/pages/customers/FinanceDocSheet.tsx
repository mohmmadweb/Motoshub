// برگه‌ی سند مالی پرونده‌ی مشتری: دریافت/پرداخت، نقدی/چک/احتمالی، مبلغ، تاریخ و سررسید، نقد شده،
// مشخصات چک، شرح، برچسب مالی، پیوست؛ ابطال (سند باطل‌شده می‌ماند و دیده می‌شود)؛ معوقه خودکار.
import { useState } from "react";
import { Ban } from "lucide-react";
import Sheet from "../../components/ui/Sheet";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Note from "../../components/ui/Note";
import Pill from "../../components/ui/Pill";
import { useToast } from "../../components/ui/ToastProvider";
import { useOffice, type FinanceDocInput } from "../../context/OfficeContext";
import { bucketOf } from "../../office/ledger";
import {
  bucketLabel,
  cancelTypeLabel,
  financeDirectionLabel,
  financeFormLabel,
  type CancelType,
  type FinanceBucket,
  type FinanceDirection,
  type FinanceForm,
  type FinancialDocument,
} from "../../office/types";
import { AttachmentInput, AttachmentList, DateInput, Field, LabelChips, LabelPicker, MoneyInput, ToggleRow } from "../../office/ui";
import { OFFICE_TODAY, rial, toFa } from "../../office/util";
import type { BadgeTone } from "../../components/ui/Badge";

export const bucketTone: Record<FinanceBucket, BadgeTone> = {
  definite_in: "success",
  definite_out: "info",
  probable_in: "brand",
  probable_out: "neutral",
  overdue: "danger",
  cancelled: "neutral",
};

const fromDoc = (d: FinancialDocument): FinanceDocInput => {
  const { id: _i, created_at: _c, created_by: _b, status: _s, cancel_type: _t, cancel_note: _n, cancelled_at: _a, ...rest } = d;
  return rest;
};

export default function FinanceDocSheet({ doc, customerId, onClose }: { doc?: FinancialDocument; customerId?: number; onClose: () => void }) {
  const o = useOffice();
  const { notify } = useToast();
  const [f, setF] = useState<FinanceDocInput>(() =>
    doc
      ? fromDoc(doc)
      : { customer: customerId ?? o.visibleCustomers[0]?.id ?? 0, direction: "receipt", form: "cash", amount_rial: 0, date: OFFICE_TODAY, due_date: null, is_cashed: true, description: "", labels: [], attachments: [] },
  );
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelType, setCancelType] = useState<CancelType>("payment_void");
  const [cancelNote, setCancelNote] = useState("");
  const set = (p: Partial<FinanceDocInput>) => setF((x) => ({ ...x, ...p }));
  const customer = o.state.customers.find((c) => c.id === f.customer);
  const cancelled = doc?.status === "cancelled";
  const canEdit = o.perms.financeManage && !cancelled;
  const bucket = doc ? bucketOf(doc) : null;

  const save = () => {
    const r = o.saveFinanceDoc(f, doc?.id);
    if (!r.ok) return notify(r.reason, "warning");
    notify(doc ? "سند به‌روزرسانی شد." : "سند مالی ثبت شد.");
    onClose();
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        eyebrow={`سند مالی · ${customer?.name ?? "—"}`}
        title={doc ? `${financeDirectionLabel[doc.direction]} ${financeFormLabel[doc.form]} · ${rial(doc.amount_rial)}` : "سند مالی جدید"}
        footer={
          canEdit ? (
            <>
              <Button variant="primary" onClick={save}>
                {doc ? "ذخیره" : "ثبت سند"}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                انصراف
              </Button>
              {doc && (
                <Button variant="danger-outline" icon={<Ban size={18} />} className="ms-auto" onClick={() => setCancelOpen(true)}>
                  ابطال سند
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {doc && bucket && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge tone={bucketTone[bucket]} dot>
              {bucketLabel[bucket]}
            </Badge>
            {bucket === "overdue" && <span className="text-xs text-rose-700">سررسید {toFa(doc.due_date ?? doc.date)} گذشته و نقد نشده — خودکار معوقه شد.</span>}
          </div>
        )}
        {cancelled && doc && (
          <Note tone="warning" title={`ابطال‌شده — ${cancelTypeLabel[doc.cancel_type ?? "other"]}`} className="mb-4">
            {doc.cancel_note && <p>{doc.cancel_note}</p>}
            {doc.cancelled_at && <p className="text-xs">{toFa(doc.cancelled_at)}</p>}
          </Note>
        )}

        {canEdit ? (
          <div className="flex flex-col gap-4">
            {!customerId && !doc && (
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
            <Field label="نوع">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(financeDirectionLabel) as FinanceDirection[]).map((d) => (
                  <Pill key={d} pressed={f.direction === d} dot={d === "receipt" ? "success" : "info"} onClick={() => set({ direction: d })}>
                    {financeDirectionLabel[d]}
                  </Pill>
                ))}
                <span className="w-px bg-ink-200 mx-1" aria-hidden />
                {(Object.keys(financeFormLabel) as FinanceForm[]).map((k) => (
                  <Pill key={k} pressed={f.form === k} onClick={() => set({ form: k, is_cashed: k === "cash" ? true : k === "probable" ? false : f.is_cashed, due_date: k === "cash" ? null : (f.due_date ?? f.date) })}>
                    {financeFormLabel[k]}
                  </Pill>
                ))}
              </div>
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="مبلغ" required>
                <MoneyInput value={f.amount_rial} onChange={(amount_rial) => set({ amount_rial })} />
              </Field>
              <Field label="تاریخ سند" required>
                <DateInput value={f.date} onChange={(date) => set({ date })} />
              </Field>
              {f.form !== "cash" && (
                <Field label={f.form === "cheque" ? "سررسید چک" : "تاریخ مورد انتظار"} required hint="پس از این تاریخ، اگر نقد نشده باشد، سند خودکار «معوقه» می‌شود.">
                  <DateInput value={f.due_date ?? ""} onChange={(due_date) => set({ due_date })} />
                </Field>
              )}
            </div>
            {f.form !== "probable" && <ToggleRow checked={f.is_cashed} onChange={(is_cashed) => set({ is_cashed })} label="نقد شده" hint="سند قطعی = نقد شده؛ در مانده‌ی مشتری حساب می‌شود." />}
            {f.form === "cheque" && (
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="شماره‌ی چک">
                  <input className="input-field" dir="ltr" value={f.cheque?.number ?? ""} onChange={(e) => set({ cheque: { number: e.target.value, bank: f.cheque?.bank ?? "", sayad_id: f.cheque?.sayad_id ?? "" } })} />
                </Field>
                <Field label="بانک">
                  <input className="input-field" value={f.cheque?.bank ?? ""} onChange={(e) => set({ cheque: { number: f.cheque?.number ?? "", bank: e.target.value, sayad_id: f.cheque?.sayad_id ?? "" } })} />
                </Field>
                <Field label="شناسه‌ی صیادی">
                  <input className="input-field" dir="ltr" value={f.cheque?.sayad_id ?? ""} onChange={(e) => set({ cheque: { number: f.cheque?.number ?? "", bank: f.cheque?.bank ?? "", sayad_id: e.target.value } })} />
                </Field>
              </div>
            )}
            <Field label="شرح">
              <textarea className="input-field min-h-20" value={f.description} onChange={(e) => set({ description: e.target.value })} />
            </Field>
            <Field label="برچسب‌های مالی">
              <LabelPicker ns="finance" value={f.labels} onChange={(labels) => set({ labels })} />
            </Field>
            <Field label="پیوست‌ها">
              <AttachmentInput value={f.attachments} onChange={(attachments) => set({ attachments })} />
            </Field>
          </div>
        ) : (
          doc && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-ink-500">مبلغ</dt>
              <dd className={`text-ink-900 font-bold ${cancelled ? "line-through" : ""}`}>{rial(doc.amount_rial)}</dd>
              <dt className="text-ink-500">تاریخ سند</dt>
              <dd>{toFa(doc.date)}</dd>
              {doc.due_date && (
                <>
                  <dt className="text-ink-500">سررسید</dt>
                  <dd>{toFa(doc.due_date)}</dd>
                </>
              )}
              <dt className="text-ink-500">نقد شده</dt>
              <dd>{doc.is_cashed ? "بله" : "خیر"}</dd>
              {doc.cheque && (
                <>
                  <dt className="text-ink-500">چک</dt>
                  <dd>
                    {toFa(doc.cheque.number)} · {doc.cheque.bank} · صیادی {toFa(doc.cheque.sayad_id)}
                  </dd>
                </>
              )}
              <dt className="text-ink-500">شرح</dt>
              <dd>{doc.description || "—"}</dd>
              <dt className="text-ink-500">برچسب‌ها</dt>
              <dd>
                <LabelChips ns="finance" labels={doc.labels} />
              </dd>
              <dt className="text-ink-500 col-span-2">پیوست‌ها</dt>
              <dd className="col-span-2">
                <AttachmentList items={doc.attachments} />
              </dd>
            </dl>
          )
        )}
        {doc && <p className="cap mt-5">ثبت: {toFa(doc.created_at)} · {o.nameOf(doc.created_by)}</p>}
      </Sheet>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="ابطال سند مالی"
        description="سند باطل‌شده حذف نمی‌شود و با برچسب «ابطال‌شده» در پرونده می‌ماند؛ در جمع‌ها حساب نمی‌شود."
        footer={
          <>
            <Button
              variant="danger"
              onClick={() => {
                if (!doc) return;
                const r = o.cancelFinanceDoc(doc.id, cancelType, cancelNote);
                if (!r.ok) return notify(r.reason, "warning");
                notify("سند ابطال شد.");
                setCancelOpen(false);
                onClose();
              }}
            >
              ابطال
            </Button>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              انصراف
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="نوع ابطال">
            <select className="input-field" value={cancelType} onChange={(e) => setCancelType(e.target.value as CancelType)}>
              {(Object.keys(cancelTypeLabel) as CancelType[]).map((k) => (
                <option key={k} value={k}>
                  {cancelTypeLabel[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="توضیح">
            <textarea className="input-field min-h-20" value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
