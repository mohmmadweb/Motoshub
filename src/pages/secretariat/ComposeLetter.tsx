// نگارش نامه: موضوع، متن، گیرندگان، رونوشت، برچسب، پیوست، کار مرتبط، اتصال به پرونده‌ی مشتری
import { useState } from "react";
import { Send } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/ToastProvider";
import { useOffice, type LetterInput } from "../../context/OfficeContext";
import { AttachmentInput, CustomerPicker, Field, LabelPicker, PeoplePicker } from "../../office/ui";

export default function ComposeLetter({ open, onClose, onSent, customerId }: { open: boolean; onClose: () => void; onSent?: (id: number) => void; customerId?: number }) {
  const o = useOffice();
  const { notify } = useToast();
  const empty = (): LetterInput => ({ subject: "", body: "", to: [], cc: [], labels: [], attachments: [], customer_ids: customerId ? [customerId] : [], related_task_title: "" });
  const [f, setF] = useState<LetterInput>(empty);
  const [tried, setTried] = useState(false);
  const set = (p: Partial<LetterInput>) => setF((x) => ({ ...x, ...p }));
  const close = () => {
    setF(empty());
    setTried(false);
    onClose();
  };
  const send = () => {
    setTried(true);
    const r = o.createLetter(f);
    if (!r.ok) return notify(r.reason, "warning");
    notify("نامه ارسال شد.");
    onSent?.(r.value);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="نامه‌ی جدید"
      wide
      footer={
        <>
          <Button variant="primary" icon={<Send size={18} />} onClick={send}>
            ارسال
          </Button>
          <Button variant="ghost" onClick={close}>
            انصراف
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="موضوع" required error={tried && !f.subject.trim() ? "این فیلد لازم است." : undefined}>
          <input className={`input-field ${tried && !f.subject.trim() ? "input-error" : ""}`} value={f.subject} onChange={(e) => set({ subject: e.target.value })} autoFocus />
        </Field>
        <Field label="گیرندگان" required error={tried && !f.to.length ? "دست‌کم یک گیرنده لازم است." : undefined}>
          <PeoplePicker value={f.to} onChange={(to) => set({ to })} exclude={[o.me, ...f.cc]} />
        </Field>
        <Field label="رونوشت" hint="برای اطلاع؛ اقدام با گیرندگان اصلی است.">
          <PeoplePicker value={f.cc} onChange={(cc) => set({ cc })} exclude={[o.me, ...f.to]} />
        </Field>
        <Field label="متن نامه">
          <textarea className="input-field min-h-40" value={f.body} onChange={(e) => set({ body: e.target.value })} />
        </Field>
        <Field label="برچسب‌ها">
          <LabelPicker ns="letter" value={f.labels} onChange={(labels) => set({ labels })} />
        </Field>
        <Field label="پیوست‌ها">
          <AttachmentInput value={f.attachments} onChange={(attachments) => set({ attachments })} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="پرونده‌های مشتری" hint="نامه در پرونده‌های انتخاب‌شده هم دیده می‌شود.">
            <CustomerPicker value={f.customer_ids} onChange={(customer_ids) => set({ customer_ids })} />
          </Field>
          <Field label="کار مرتبط">
            <input className="input-field" value={f.related_task_title ?? ""} onChange={(e) => set({ related_task_title: e.target.value })} placeholder="عنوان کار" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
