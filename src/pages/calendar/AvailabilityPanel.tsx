// ---------------------------------------------------------------------------
// هشدار زنده‌ی هم‌پوشانی + «پیدا کردن زمان مشترک» — یک نوار جمع‌وجور برای فرم‌های جلسه/رویداد/تقویم.
// جزئیات (چه کسی، کجا) با یک کلیک باز می‌شود تا فرم شلوغ نشود.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import { fa } from "../../pm/jalali";
import { busyKindLabel, conflictText, hasConflict, slotLabel, useAvailability, type Attendee, type Slot, type WorkPolicy } from "./availability";
import { fmtRange } from "./model";

export default function AvailabilityPanel({
  attendees,
  date,
  start,
  duration,
  exclude,
  onPick,
  policy,
}: {
  attendees: Attendee[];
  date: string;
  /** دقیقه از نیمه‌شب؛ null = زمان هنوز مشخص نیست */
  start: number | null;
  duration: number;
  exclude?: string[];
  onPick: (date: string, start: number, end: number) => void;
  policy?: WorkPolicy;
}) {
  const av = useAvailability();
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const ex = exclude ?? [];
  const exKey = ex.join("|");
  const attKey = attendees.map((a) => a.id ?? a.name).join("|");
  const report = useMemo(
    () => (start === null || !date ? null : av.check(attendees, date, start, start + Math.max(15, duration), ex)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [av, attKey, date, start, duration, exKey],
  );

  if (!attendees.length) return null;
  const bad = report && hasConflict(report);

  const find = () => setSlots(av.suggest(attendees, Math.max(15, duration), { fromDate: date, exclude: ex, policy }));

  return (
    <div className={`rounded-lg border p-2.5 space-y-2 ${bad ? "border-amber-300 bg-amber-50/60" : "border-ink-100"}`}>
      <div className="flex items-start gap-2 flex-wrap">
        {report &&
          (bad ? (
            <button type="button" onClick={() => setOpen((v) => !v)} className="flex-1 min-w-[180px] text-right text-[12px] text-amber-800 flex items-start gap-1.5" aria-expanded={open}>
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span className="flex-1">{conflictText(report)}</span>
              <ChevronDown size={13} className={`shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          ) : (
            <span className="flex-1 min-w-[180px] text-[12px] text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> همه‌ی {fa(new Set(attendees.map((a) => a.id ?? a.name)).size)} نفر در این زمان آزادند
            </span>
          ))}
        <button type="button" onClick={find} className="text-[11.5px] text-brand-700 hover:underline flex items-center gap-1 shrink-0">
          <Sparkles size={13} /> پیدا کردن زمان مشترک
        </button>
      </div>
      {open && report && report.items.length > 0 && (
        <ul className="text-[11.5px] text-ink-700 space-y-0.5 border-t border-amber-200/70 pt-1.5">
          {report.items.map((b) => (
            <li key={`${b.person}-${b.key}`} className="flex gap-1.5 min-w-0">
              <span className="font-medium shrink-0">{b.person}</span>
              <span className="text-ink-400 shrink-0">{busyKindLabel[b.kind]}</span>
              <span className="truncate flex-1">{b.title}</span>
              <span className="tabular-nums text-ink-500 shrink-0">{b.kind === "leave" && b.start === 0 ? "تمام روز" : fmtRange(b.start, b.end)}</span>
            </li>
          ))}
        </ul>
      )}
      {slots && (
        <div className="space-y-1">
          {slots.length === 0 ? (
            <p className="text-[11.5px] text-rose-600">در ۲۰ روز کاری آینده زمان آزاد مشترکی با این مدت پیدا نشد.</p>
          ) : (
            <>
              <p className="text-[10.5px] text-ink-400">پیشنهادها (شنبه تا چهارشنبه، ۸ تا ۱۶) — برای انتخاب کلیک کنید:</p>
              <div className="flex flex-wrap gap-1.5">
                {slots.map((s) => (
                  <button
                    key={`${s.day}-${s.start}`}
                    type="button"
                    onClick={() => {
                      onPick(s.date, s.start, s.end);
                      setSlots(null);
                    }}
                    className="text-[11.5px] px-2 py-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 tabular-nums"
                  >
                    {slotLabel(s)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
