// ---------------------------------------------------------------------------
// ساخت سریع از تقویم: یادآور/بلوک شخصی (انبار محلی) یا رویداد اجتماعی با دعوت همکاران.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Plus, Video, Lock, CircleSlash, FileText } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Toggle from "../../components/ui/Toggle";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { parseJalali, fa } from "../../pm/jalali";
import { Field, UserPicker } from "../social/kit";
import { fmtMin, personalColors, repeatLabel, timeOptions, toMin, type PersonalItem, type Repeat } from "./model";

export type QuickInit = {
  date: string;
  start: number;
  end: number;
  mode: "personal" | "event";
  invite?: string[];
  edit?: PersonalItem;
};

export type QuickEventInput = { title: string; date: string; start: string; end: string; is_online: boolean; place: string; description: string; invite: string[] };

export default function QuickCreate({
  init,
  onClose,
  canEvent,
  meId,
  onSavePersonal,
  onSaveEvent,
  onOpenFull,
}: {
  init: QuickInit | null;
  onClose: () => void;
  canEvent: boolean;
  meId: string;
  onSavePersonal: (item: Omit<PersonalItem, "id"> & { id?: string }) => void;
  onSaveEvent: (input: QuickEventInput) => void;
  onOpenFull: (date: string) => void;
}) {
  return (
    <Modal open={init !== null} onClose={onClose} title={init?.edit ? "ویرایش یادآور / بلوک" : "افزودن به تقویم"} width="max-w-lg">
      {init && <Body key={`${init.date}-${init.start}-${init.mode}-${init.edit?.id ?? ""}`} init={init} onClose={onClose} canEvent={canEvent && !init.edit} meId={meId} onSavePersonal={onSavePersonal} onSaveEvent={onSaveEvent} onOpenFull={onOpenFull} />}
    </Modal>
  );
}

function Body({
  init,
  onClose,
  canEvent,
  meId,
  onSavePersonal,
  onSaveEvent,
  onOpenFull,
}: {
  init: QuickInit;
  onClose: () => void;
  canEvent: boolean;
  meId: string;
  onSavePersonal: (item: Omit<PersonalItem, "id"> & { id?: string }) => void;
  onSaveEvent: (input: QuickEventInput) => void;
  onOpenFull: (date: string) => void;
}) {
  const { notify } = useToast();
  const e = init.edit;
  const [mode, setMode] = useState<"personal" | "event">(canEvent ? init.mode : "personal");
  const [title, setTitle] = useState(e?.title ?? "");
  const [date, setDate] = useState(e?.date ?? init.date);
  const [start, setStart] = useState(e ? (toMin(e.start) ?? init.start) : init.start);
  const [end, setEnd] = useState(e ? (toMin(e.end) ?? init.end) : init.end);
  const [repeat, setRepeat] = useState<Repeat>(e?.repeat ?? "none");
  const [color, setColor] = useState(e?.color ?? personalColors[0]);
  const [priv, setPriv] = useState(e?.private ?? false);
  const [busy, setBusy] = useState(e?.busy ?? true);
  const [note, setNote] = useState(e?.note ?? "");
  const [online, setOnline] = useState(false);
  const [place, setPlace] = useState("");
  const [invite, setInvite] = useState<string[]>(init.invite ?? []);
  const [showInvite, setShowInvite] = useState((init.invite ?? []).length > 0);

  const save = () => {
    if (!title.trim()) return notify("عنوان را وارد کنید.", "warning");
    if (!parseJalali(date)) return notify("تاریخ را انتخاب کنید.", "warning");
    if (end <= start) return notify("ساعت پایان باید بعد از ساعت شروع باشد.", "warning");
    if (mode === "personal") {
      onSavePersonal({ id: e?.id, ownerId: e?.ownerId ?? meId, title: title.trim(), date, start: fmtMin(start), end: fmtMin(end), repeat, color, private: priv, busy, note: note.trim() || undefined });
      notify(e ? "یادآور به‌روزرسانی شد." : "به تقویم شما اضافه شد.", "success");
    } else {
      if (online && !place.trim()) return notify("برای رویداد آنلاین لینک جلسه لازم است.", "warning");
      onSaveEvent({ title: title.trim(), date, start: fmtMin(start), end: fmtMin(end), is_online: online, place: place.trim(), description: note.trim(), invite });
    }
    onClose();
  };

  const timeSelect = (v: number, set: (n: number) => void, label: string) => (
    <select className="input-field" value={v} onChange={(ev) => set(Number(ev.target.value))} aria-label={label} dir="ltr">
      {timeOptions.map((m) => (
        <option key={m} value={m}>
          {fmtMin(m)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-4">
      {canEvent && (
        <div className="flex rounded-lg border border-ink-200 p-0.5 bg-ink-50">
          {(
            [
              ["personal", "یادآور / بلوک شخصی"],
              ["event", "رویداد با دعوت"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setMode(id)} className={`flex-1 text-xs px-2.5 py-1.5 rounded-md ${mode === id ? "bg-white shadow-sm text-brand-700 font-medium" : "text-ink-500 hover:text-ink-800"}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      <Field label="عنوان">
        <input className="input-field" value={title} onChange={(ev) => setTitle(ev.target.value)} placeholder={mode === "personal" ? "مثلاً زمان تمرکز، پیگیری نامه…" : "مثلاً جلسه‌ی هماهنگی"} autoFocus />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="تاریخ">
          <JalaliDatePicker value={date} onChange={setDate} />
        </Field>
        <Field label="از ساعت">{timeSelect(start, (n) => {
          setStart(n);
          if (end <= n) setEnd(n + 30);
        }, "ساعت شروع")}</Field>
        <Field label="تا ساعت">{timeSelect(end, setEnd, "ساعت پایان")}</Field>
      </div>

      {mode === "personal" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="تکرار">
              <select className="input-field" value={repeat} onChange={(ev) => setRepeat(ev.target.value as Repeat)}>
                {(Object.keys(repeatLabel) as Repeat[]).map((r) => (
                  <option key={r} value={r}>
                    {repeatLabel[r]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="رنگ">
              <div className="flex flex-wrap gap-1.5 pt-1">
                {personalColors.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)} className={`w-6 h-6 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-brand-500" : ""}`} style={{ background: c }} aria-label={`رنگ ${c}`} />
                ))}
              </div>
            </Field>
          </div>
          <div className="rounded-lg border border-ink-100 divide-y divide-ink-100">
            <label className="flex items-center justify-between gap-2 p-2.5">
              <span className="text-xs text-ink-700 flex items-center gap-1.5">
                <Lock size={13} /> خصوصی — همکاران فقط «مشغول» می‌بینند
              </span>
              <Toggle on={priv} onChange={() => setPriv((v) => !v)} label="خصوصی" />
            </label>
            <label className="flex items-center justify-between gap-2 p-2.5">
              <span className="text-xs text-ink-700 flex items-center gap-1.5">
                <CircleSlash size={13} /> در این زمان مشغولم (در تقویم تیم دیده شود)
              </span>
              <Toggle on={busy} onChange={() => setBusy((v) => !v)} label="مشغول" />
            </label>
          </div>
          <Field label="یادداشت (اختیاری)">
            <input className="input-field" value={note} onChange={(ev) => setNote(ev.target.value)} />
          </Field>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-ink-100 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-ink-700 flex items-center gap-1.5">
                <Video size={13} /> برگزاری آنلاین
              </span>
              <Toggle on={online} onChange={() => setOnline((v) => !v)} label="برگزاری آنلاین" />
            </div>
            <input className="input-field" dir={online ? "ltr" : undefined} value={place} onChange={(ev) => setPlace(ev.target.value)} placeholder={online ? "https://meet.example.com/…" : "مکان — مثلاً سالن جلسات طبقه‌ی سوم"} aria-label={online ? "لینک جلسه" : "مکان"} />
          </div>
          <Field label="توضیح کوتاه (اختیاری)">
            <input className="input-field" value={note} onChange={(ev) => setNote(ev.target.value)} />
          </Field>
          <div className="rounded-lg border border-ink-100 p-3">
            <button type="button" onClick={() => setShowInvite((v) => !v)} className="text-xs text-brand-700 flex items-center gap-1">
              <Plus size={13} /> دعوت از همکاران {invite.length > 0 && `— ${fa(invite.length)} نفر`}
            </button>
            {showInvite && (
              <div className="mt-2">
                <UserPicker value={invite} onChange={setInvite} exclude={[meId]} />
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {mode === "event" ? (
          <button
            type="button"
            className="text-xs text-ink-500 hover:text-brand-700 flex items-center gap-1"
            onClick={() => {
              onClose();
              onOpenFull(date);
            }}
          >
            <FileText size={13} /> فرم کامل رویداد
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button variant="primary" onClick={save}>
            {e ? "ذخیره" : mode === "event" ? "ایجاد رویداد" : "افزودن"}
          </Button>
        </div>
      </div>
    </div>
  );
}
