// ثبت دبیرخانه: نامه‌ی وارده (شماره/تاریخ/سازمان فرستنده + شماره‌ی داخلی) یا شماره‌ی صادره برای نامه‌ی موجود.
// شماره = پیشوند/سال جلالی/شمارنده‌ی سری؛ پس از ثبت تغییر یا حذف نمی‌شود.
import { useMemo, useState } from "react";
import { Stamp } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Note from "../../components/ui/Note";
import Tabs from "../../components/ui/Tabs";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useOffice, type LetterInput } from "../../context/OfficeContext";
import { previewNumber } from "../../office/numbering";
import type { RegistrationDirection } from "../../office/types";
import { AttachmentInput, CustomerPicker, DateInput, Field, PeoplePicker } from "../../office/ui";
import { dateOnly, nowStamp, OFFICE_TODAY, toFa } from "../../office/util";

export default function RegisterDialog({
  open,
  onClose,
  direction: initial = "incoming",
  letterId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  direction?: RegistrationDirection;
  /** ثبت شماره برای نامه‌ی موجود */
  letterId?: number;
  onDone?: (letterId: number) => void;
}) {
  const o = useOffice();
  const { notify } = useToast();
  const confirm = useConfirm();
  const fixed = letterId !== undefined;
  const [direction, setDirection] = useState<RegistrationDirection>(fixed ? "outgoing" : initial);
  const seriesList = o.state.series.filter((s) => s.active && s.direction === direction);
  const [seriesId, setSeriesId] = useState<number>(0);
  const series = seriesList.find((s) => s.id === seriesId) ?? seriesList[0];
  const [date, setDate] = useState(OFFICE_TODAY);
  const [ext, setExt] = useState({ number: "", date: "", org: "" });
  const [pick, setPick] = useState<number>(letterId ?? 0);
  const [letter, setLetter] = useState<LetterInput>({ subject: "", body: "", to: [], cc: [], labels: [], attachments: [], customer_ids: [] });
  const [tried, setTried] = useState(false);

  const candidates = useMemo(() => o.visibleLetters.filter((l) => !o.registrationOf(l.id) && !l.archived), [o]);
  const target = fixed ? o.state.letters.find((l) => l.id === letterId) : candidates.find((l) => l.id === pick);
  const registeredAt = date === OFFICE_TODAY ? nowStamp() : `${date} 09:00`;

  const close = () => {
    setTried(false);
    setExt({ number: "", date: "", org: "" });
    setLetter({ subject: "", body: "", to: [], cc: [], labels: [], attachments: [], customer_ids: [] });
    onClose();
  };

  const submit = () => {
    setTried(true);
    if (!series) return notify("سری شماره‌ی فعالی برای این نوع ثبت نیست.", "warning");
    if (direction === "incoming" && !fixed) {
      if (!letter.subject.trim() || !letter.to.length || !ext.org.trim()) return notify("موضوع، گیرنده و سازمان فرستنده لازم است.", "warning");
    } else if (!target) return notify("نامه را انتخاب کنید.", "warning");
    else if (!ext.org.trim()) return notify(direction === "outgoing" ? "سازمان گیرنده لازم است." : "سازمان فرستنده لازم است.", "warning");
    const reg = { direction, series: series.id, registered_at: registeredAt, external_number: ext.number, external_date: ext.date, external_org: ext.org };
    confirm({
      title: `ثبت با شماره‌ی ${toFa(previewNumber(series, registeredAt))}؟`,
      message: "پس از ثبت، شماره تغییر نمی‌کند و نامه حذف‌شدنی نیست (فقط بایگانی).",
      tone: "primary",
      confirmLabel: "ثبت",
      onConfirm: () => {
        if (direction === "incoming" && !fixed) {
          const r = o.registerIncoming(letter, reg);
          if (!r.ok) return notify(r.reason, "warning");
          notify(`نامه‌ی وارده با شماره‌ی ${toFa(r.value.number)} ثبت شد.`);
          onDone?.(r.value.id);
        } else {
          const r = o.register(target!.id, reg);
          if (!r.ok) return notify(r.reason, "warning");
          notify(`شماره‌ی ${toFa(r.value)} ثبت شد.`);
          onDone?.(target!.id);
        }
        close();
      },
    });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={fixed ? "ثبت شماره‌ی دبیرخانه" : "ثبت در دبیرخانه"}
      wide
      footer={
        <>
          <Button variant="primary" icon={<Stamp size={18} />} onClick={submit}>
            ثبت
          </Button>
          <Button variant="ghost" onClick={close}>
            انصراف
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Tabs
          tabs={[
            { id: "incoming", label: "نامه‌ی وارده" },
            { id: "outgoing", label: "نامه‌ی صادره" },
          ]}
          active={direction}
          onChange={(d) => {
            setDirection(d);
            setSeriesId(0);
          }}
          variant="pill"
          className="mb-0"
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="سری شماره" required>
            <select className="input-field" value={series?.id ?? ""} onChange={(e) => setSeriesId(Number(e.target.value))}>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="تاریخ ثبت" required>
            <DateInput value={date} onChange={setDate} />
          </Field>
        </div>
        {series && (
          <Note tone="info">
            شماره‌ی این ثبت: <b dir="ltr">{toFa(previewNumber(series, registeredAt))}</b>
          </Note>
        )}

        {direction === "incoming" && !fixed ? (
          <>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="سازمان فرستنده" required error={tried && !ext.org.trim() ? "این فیلد لازم است." : undefined}>
                <input className="input-field" value={ext.org} onChange={(e) => setExt({ ...ext, org: e.target.value })} />
              </Field>
              <Field label="شماره‌ی نامه‌ی فرستنده">
                <input className="input-field" value={ext.number} onChange={(e) => setExt({ ...ext, number: e.target.value })} dir="auto" />
              </Field>
              <Field label="تاریخ نامه‌ی فرستنده">
                <DateInput value={ext.date} onChange={(v) => setExt({ ...ext, date: v })} />
              </Field>
            </div>
            <Field label="موضوع" required error={tried && !letter.subject.trim() ? "این فیلد لازم است." : undefined}>
              <input className="input-field" value={letter.subject} onChange={(e) => setLetter({ ...letter, subject: e.target.value })} />
            </Field>
            <Field label="ارسال به (گیرندگان داخلی)" required error={tried && !letter.to.length ? "دست‌کم یک گیرنده لازم است." : undefined}>
              <PeoplePicker value={letter.to} onChange={(to) => setLetter({ ...letter, to })} exclude={letter.cc} />
            </Field>
            <Field label="رونوشت">
              <PeoplePicker value={letter.cc} onChange={(cc) => setLetter({ ...letter, cc })} exclude={letter.to} />
            </Field>
            <Field label="خلاصه / متن">
              <textarea className="input-field min-h-24" value={letter.body} onChange={(e) => setLetter({ ...letter, body: e.target.value })} />
            </Field>
            <Field label="تصویر نامه و پیوست‌ها">
              <AttachmentInput value={letter.attachments} onChange={(attachments) => setLetter({ ...letter, attachments })} />
            </Field>
            <Field label="پرونده‌های مشتری">
              <CustomerPicker value={letter.customer_ids} onChange={(customer_ids) => setLetter({ ...letter, customer_ids })} />
            </Field>
          </>
        ) : (
          <>
            {fixed ? (
              <Field label="نامه">
                <p className="text-sm text-ink-800 font-medium">{target?.subject}</p>
              </Field>
            ) : (
              <Field label="نامه" required hint="نامه‌های ثبت‌نشده‌ای که می‌بینید.">
                <select className="input-field" value={pick} onChange={(e) => setPick(Number(e.target.value))}>
                  <option value={0}>— انتخاب نامه —</option>
                  {candidates.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.subject} · {toFa(dateOnly(l.created_at))}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label={direction === "outgoing" ? "سازمان گیرنده" : "سازمان فرستنده"} required error={tried && !ext.org.trim() ? "این فیلد لازم است." : undefined}>
                <input className="input-field" value={ext.org} onChange={(e) => setExt({ ...ext, org: e.target.value })} />
              </Field>
              {direction === "incoming" && (
                <>
                  <Field label="شماره‌ی نامه‌ی فرستنده">
                    <input className="input-field" value={ext.number} onChange={(e) => setExt({ ...ext, number: e.target.value })} dir="auto" />
                  </Field>
                  <Field label="تاریخ نامه‌ی فرستنده">
                    <DateInput value={ext.date} onChange={(v) => setExt({ ...ext, date: v })} />
                  </Field>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
