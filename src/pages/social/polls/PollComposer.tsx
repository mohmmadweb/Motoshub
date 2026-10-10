// ---------------------------------------------------------------------------
// «پیشنهادی» — F01 فرم ساخت نظرسنجی (POST /core/polls/) — از دکمه‌ی «نظرسنجی» کنار پیوست
// در نگارشگر گروه/کانال و از «نظرسنجی‌های من» در داشبورد.
// پرسش (الزامی، با هشتگ و منشن — ۱.۹.۶) · ۲ تا ۱۰ گزینه (افزودن/حذف/جابجایی، تصویر اختیاری)
// · تصویر/ویدیوی پرسش (۱.۳.۱) · تک‌/چندگزینه‌ای با سقف · ناشناس · پایان (تقویم شمسی) · تغییر رأی · نمایش نتیجه.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { ArrowDown, ArrowUp, BarChart3, ImagePlus, Plus, Trash2 } from "lucide-react";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Toggle from "../../../components/ui/Toggle";
import JalaliDatePicker from "../../../components/ui/JalaliDatePicker";
import { useToast } from "../../../components/ui/ToastProvider";
import { useSocial, type PollInput } from "../../../context/SocialContext";
import { AttachmentPicker, Field, fa, posterPalette } from "../kit";
import MentionTextarea from "../composer/MentionTextarea";
import type { Attachment } from "../../../social/types";
import { chatTitle } from "../messenger/shared";
import { useComposerGuard } from "../composer/WriteGate";

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="flex rounded-lg border border-ink-200 p-0.5 bg-ink-50 w-fit max-w-full">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} className={`text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap ${value === o.id ? "bg-white text-brand-700 font-medium shadow-sm" : "text-ink-500 hover:text-ink-800"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const toFa = (x: string) => x.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]).replace(/^۰?([۰-۹])(:)/, (_m, h, c) => `۰${h}${c}`);

type Opt = { key: string; text: string; image: string | null };
const newOpt = (): Opt => ({ key: Math.random().toString(36).slice(2, 8), text: "", image: null });

/** chatId ثابت (از نگارشگر گفتگو) یا انتخاب مقصد (از داشبورد) */
export default function PollComposer({ open, onClose, chatId, onCreated }: { open: boolean; onClose: () => void; chatId?: string; onCreated?: (pollId: string, chatId: string) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="نظرسنجی جدید" description="POST /core/polls/ («پیشنهادی»)" width="max-w-xl">
      {open && <PollForm chatId={chatId} onDone={onClose} onCreated={onCreated} />}
    </Modal>
  );
}

function PollForm({ chatId, onDone, onCreated }: { chatId?: string; onDone: () => void; onCreated?: (pollId: string, chatId: string) => void }) {
  const s = useSocial();
  const { notify } = useToast();
  const targets = s.pollTargets();
  const [target, setTarget] = useState(chatId ?? targets[0]?.id ?? "");
  const [question, setQuestion] = useState("");
  const [media, setMedia] = useState<Attachment[]>([]);
  const [opts, setOpts] = useState<Opt[]>([newOpt(), newOpt()]);
  const [multiple, setMultiple] = useState(false);
  const [maxChoices, setMaxChoices] = useState(2);
  const [anonymous, setAnonymous] = useState(false);
  const [allowChange, setAllowChange] = useState(true);
  const [showResults, setShowResults] = useState<"always" | "after_close">("always");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("۱۸:۰۰");
  const [showMedia, setShowMedia] = useState(false);
  const maxOpts = Number(s.setting("core.polls.max_options") ?? 10) || 10;
  const allowAnon = s.setting("core.polls.allow_anonymous") !== false;
  const chat = s.chats.find((c) => c.id === target);
  const guard = useComposerGuard();

  const setOpt = (i: number, p: Partial<Opt>) => setOpts((o) => o.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const move = (i: number, d: number) =>
    setOpts((o) => {
      const j = i + d;
      if (j < 0 || j >= o.length) return o;
      const n = [...o];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const cycleImage = (i: number) => {
    const cur = opts[i].image;
    const k = cur ? posterPalette.indexOf(cur) : -1;
    setOpt(i, { image: k + 1 >= posterPalette.length ? null : posterPalette[k + 1] });
  };

  const submit = () => {
    if (!target) return notify("گروه یا کانال مقصد را انتخاب کنید.", "warning");
    const tm = /^([۰-۹0-9]{1,2}):([۰-۹0-9]{2})$/.exec(endTime.trim());
    const time = tm ? toFa(`${tm[1].padStart(2, "0")}:${tm[2]}`) : "۱۸:۰۰";
    const input: PollInput = {
      question,
      media,
      options: opts.map((o) => ({ text: o.text, image: o.image })),
      multiple,
      max_choices: multiple ? maxChoices : 1,
      anonymous: allowAnon && anonymous,
      allow_change: allowChange,
      show_results: showResults,
      closes_at: endDate ? `${endDate} ${time}:۰۰` : null,
    };
    if (!guard.gate("post")) return;
    const r = s.createPoll(target, input);
    if (!r.ok) return notify(r.error, "warning");
    notify(`نظرسنجی در «${chat ? chatTitle(chat, s.me) : ""}» منتشر شد.`, "success");
    onCreated?.(r.id ?? "", target);
    onDone();
  };

  return (
    <div className="space-y-4">
      {!chatId && (
        <Field label="محل انتشار">
          {targets.length ? (
            <select className="input-field" value={target} onChange={(e) => setTarget(e.target.value)}>
              {targets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.chat_type === "channel" ? "کانال" : "گروه"} · {c.parent ? `${s.chats.find((x) => x.id === c.parent)?.title ?? ""} › ` : ""}
                  {c.title}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-ink-400">عضو گروه یا مدیر کانالی نیستید.</p>
          )}
        </Field>
      )}
      <Field label="پرسش *" hint="هشتگ (#) و منشن (@) هم پشتیبانی می‌شود.">
        <MentionTextarea className="input-field min-h-[64px]" value={question} onChange={(e) => setQuestion(e.target.value)} priorityIds={chat?.members.map((m) => m.user_id)} placeholder="مثلاً: کدام زمان برای جلسه‌ی هفتگی مناسب‌تر است؟" autoFocus />
      </Field>
      {showMedia || media.length ? (
        <AttachmentPicker value={media} onChange={setMedia} accept="image/*,video/*" source="chat" label="تصویر یا ویدیوی پرسش (اختیاری)" />
      ) : (
        <button type="button" onClick={() => setShowMedia(true)} className="text-xs text-brand-700 flex items-center gap-1">
          <ImagePlus size={13} /> افزودن تصویر یا ویدیو به پرسش
        </button>
      )}

      <Field label={`گزینه‌ها (${fa(opts.length)} از حداکثر ${fa(maxOpts)})`}>
        <div className="space-y-1.5">
          {opts.map((o, i) => (
            <div key={o.key} className="flex items-center gap-1.5">
              <button type="button" onClick={() => cycleImage(i)} title="تصویر گزینه (اختیاری) — برای تغییر کلیک کنید" aria-label="تصویر گزینه" className="w-8 h-8 shrink-0 rounded-lg border border-dashed border-ink-300 flex items-center justify-center text-ink-400" style={o.image ? { background: o.image, borderStyle: "solid", borderColor: "transparent" } : undefined}>
                {!o.image && <ImagePlus size={13} />}
              </button>
              <input className="input-field !py-1.5 flex-1 min-w-0" value={o.text} onChange={(e) => setOpt(i, { text: e.target.value })} placeholder={`گزینه‌ی ${fa(i + 1)}`} maxLength={100} />
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-ink-400 hover:text-ink-700 disabled:opacity-30" aria-label="بالا">
                <ArrowUp size={13} />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === opts.length - 1} className="p-1 text-ink-400 hover:text-ink-700 disabled:opacity-30" aria-label="پایین">
                <ArrowDown size={13} />
              </button>
              <button type="button" onClick={() => setOpts((x) => x.filter((_, k) => k !== i))} disabled={opts.length <= 2} className="p-1 text-ink-400 hover:text-rose-600 disabled:opacity-30" aria-label="حذف گزینه">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {opts.length < maxOpts && (
            <button type="button" onClick={() => setOpts((x) => [...x, newOpt()])} className="text-xs text-brand-700 flex items-center gap-1 pt-1">
              <Plus size={13} /> افزودن گزینه
            </button>
          )}
        </div>
      </Field>

      <div className="rounded-lg bg-ink-50 border border-ink-100 p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Seg value={multiple ? "m" : "s"} onChange={(v) => setMultiple(v === "m")} options={[{ id: "s", label: "تک‌گزینه‌ای" }, { id: "m", label: "چندگزینه‌ای" }]} />
          {multiple && (
            <label className="text-xs text-ink-600 flex items-center gap-1.5">
              حداکثر انتخاب
              <input type="number" min={1} max={opts.length} value={maxChoices} onChange={(e) => setMaxChoices(Math.max(1, Math.min(opts.length, Number(e.target.value) || 1)))} className="input-field !w-16 !py-1" dir="ltr" />
            </label>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {allowAnon && (
            <label className="flex items-center justify-between gap-2 text-xs text-ink-700">
              ناشناس (نام رأی‌دهندگان دیده نشود)
              <Toggle on={anonymous} onChange={() => setAnonymous((v) => !v)} />
            </label>
          )}
          <label className="flex items-center justify-between gap-2 text-xs text-ink-700">
            امکان تغییر رأی
            <Toggle on={allowChange} onChange={() => setAllowChange((v) => !v)} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
          نمایش نتیجه
          <Seg value={showResults} onChange={setShowResults} options={[{ id: "always", label: "بلافاصله پس از رأی" }, { id: "after_close", label: "پس از پایان" }]} />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <Field label="تاریخ پایان (اختیاری)">
            <JalaliDatePicker value={endDate} onChange={setEndDate} placeholder="بدون تاریخ پایان" />
          </Field>
          <Field label="ساعت">
            <input className="input-field !w-20" value={endTime} onChange={(e) => setEndTime(e.target.value)} dir="ltr" placeholder="۱۸:۰۰" />
          </Field>
        </div>
        {endDate && (
          <button type="button" onClick={() => setEndDate("")} className="text-[11px] text-ink-500 hover:text-rose-600">
            حذف تاریخ پایان
          </button>
        )}
      </div>

      {guard.notice()}
      <div className="flex items-center gap-2 pt-2 border-t border-ink-100">
        <Button variant="primary" icon={<BarChart3 size={14} />} onClick={submit} disabled={(!targets.length && !chatId) || guard.blocked}>
          انتشار نظرسنجی
        </Button>
        <Button variant="ghost" onClick={onDone}>
          انصراف
        </Button>
      </div>
    </div>
  );
}
