// ---------------------------------------------------------------------------
// فیلدهای مشترک «تکرار» و «یادآوری» برای یادآورهای تقویم و جلسات پروژه،
// و پنجره‌ی «فقط این / این و بعدی‌ها / همه» برای ویرایش/حذف یک وقوع از سری.
// ---------------------------------------------------------------------------
import { Bell, Plus, Repeat, X } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { fa, toEnDigits, weekDayNames, weekdayOf } from "../../pm/jalali";
import { editScopeLabel, freqLabel, reminderChannelLabel, reminderPresets, ruleLabel, type EditScope, type RecurFreq, type RecurRule, type Reminder, type ReminderChannel } from "../../pm/recurrence";

const minutesLabel = (m: number) => (m >= 1440 && m % 1440 === 0 ? `${fa(m / 1440)} روز` : m >= 60 && m % 60 === 0 ? `${fa(m / 60)} ساعت` : `${fa(m)} دقیقه`);

export function RecurrenceEditor({ value, onChange, startDate }: { value: RecurRule | undefined; onChange: (r: RecurRule | undefined) => void; startDate: string }) {
  const r = value;
  const endMode: "never" | "count" | "until" = r?.count ? "count" : r?.until ? "until" : "never";
  const set = (patch: Partial<RecurRule>) => r && onChange({ ...r, ...patch });
  const wd = startDate ? weekdayOf(startDate) : 0;
  return (
    <div className="rounded-lg border border-ink-100 p-2.5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Repeat size={13} className="text-ink-500 shrink-0" />
        <select
          className="input-field !py-1.5 text-xs flex-1 min-w-[150px]"
          value={r?.freq ?? "none"}
          aria-label="تکرار"
          onChange={(e) => {
            const v = e.target.value as RecurFreq | "none";
            if (v === "none") return onChange(undefined);
            onChange({ ...(r ?? {}), freq: v, days: v === "weekly" ? (r?.days?.length ? r.days : [wd]) : undefined });
          }}
        >
          <option value="none">بدون تکرار</option>
          {(Object.keys(freqLabel) as RecurFreq[]).map((f) => (
            <option key={f} value={f}>
              {freqLabel[f]}
            </option>
          ))}
        </select>
        {r && (r.freq === "daily" || r.freq === "weekly" || r.freq === "monthly") && (
          <label className="flex items-center gap-1 text-[11.5px] text-ink-600">
            هر
            <input
              className="input-field !py-1 !w-12 text-xs text-center"
              value={fa(r.interval ?? 1)}
              onChange={(e) => set({ interval: Math.max(1, Math.min(30, Number(toEnDigits(e.target.value).replace(/\D/g, "")) || 1)) })}
              aria-label="فاصله‌ی تکرار"
            />
            {r.freq === "daily" ? "روز" : r.freq === "weekly" ? "هفته" : "ماه"}
          </label>
        )}
      </div>
      {r?.freq === "weekly" && (
        <div className="flex flex-wrap gap-1">
          {weekDayNames.map((n, i) => {
            const on = (r.days ?? [wd]).includes(i);
            return (
              <button
                key={n}
                type="button"
                onClick={() => {
                  const cur = r.days ?? [wd];
                  const next = on ? cur.filter((x) => x !== i) : [...cur, i];
                  set({ days: next.length ? next.sort() : cur });
                }}
                className={`text-[11px] px-2 py-0.5 rounded-md border ${on ? "bg-brand-50 border-brand-300 text-brand-700" : "border-ink-200 text-ink-500"}`}
              >
                {n}
              </button>
            );
          })}
        </div>
      )}
      {r && (
        <div className="flex items-center gap-2 flex-wrap text-[11.5px] text-ink-600">
          پایان:
          <select
            className="input-field !py-1 !w-auto text-xs"
            value={endMode}
            onChange={(e) => {
              const m = e.target.value;
              onChange({ ...r, count: m === "count" ? r.count ?? 10 : undefined, until: m === "until" ? r.until ?? startDate : undefined });
            }}
            aria-label="پایان تکرار"
          >
            <option value="never">بدون پایان</option>
            <option value="count">پس از چند بار</option>
            <option value="until">در تاریخ</option>
          </select>
          {endMode === "count" && (
            <span className="flex items-center gap-1">
              <input className="input-field !py-1 !w-14 text-xs text-center" value={fa(r.count ?? 10)} onChange={(e) => set({ count: Math.max(1, Math.min(365, Number(toEnDigits(e.target.value).replace(/\D/g, "")) || 1)) })} aria-label="تعداد تکرار" />
              بار
            </span>
          )}
          {endMode === "until" && (
            <span className="min-w-[150px]">
              <JalaliDatePicker value={r.until ?? startDate} onChange={(v) => set({ until: v })} />
            </span>
          )}
        </div>
      )}
      {r && (
        <p className="text-[10.5px] text-ink-400 flex items-center gap-2 flex-wrap">
          {ruleLabel(r, startDate)}
          {(r.exceptions ?? []).length > 0 && (
            <button type="button" className="text-brand-700 hover:underline" onClick={() => set({ exceptions: undefined })} title={(r.exceptions ?? []).join("، ")}>
              بازگرداندن {fa((r.exceptions ?? []).length)} وقوع حذف‌شده
            </button>
          )}
        </p>
      )}
    </div>
  );
}

export function RemindersEditor({ value, onChange }: { value: Reminder[] | undefined; onChange: (r: Reminder[]) => void }) {
  const list = value ?? [];
  return (
    <div className="rounded-lg border border-ink-100 p-2.5 space-y-1.5">
      {list.map((r, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Bell size={13} className="text-ink-500 shrink-0" />
          <select className="input-field !py-1 text-xs flex-1" value={r.minutes} onChange={(e) => onChange(list.map((x, j) => (j === i ? { ...x, minutes: Number(e.target.value) } : x)))} aria-label="زمان یادآوری">
            {[...new Set([...reminderPresets, r.minutes])].sort((a, b) => a - b).map((m) => (
              <option key={m} value={m}>
                {minutesLabel(m)} قبل
              </option>
            ))}
          </select>
          <select className="input-field !py-1 text-xs !w-auto" value={r.channel} onChange={(e) => onChange(list.map((x, j) => (j === i ? { ...x, channel: e.target.value as ReminderChannel } : x)))} aria-label="کانال یادآوری">
            {(Object.keys(reminderChannelLabel) as ReminderChannel[]).map((c) => (
              <option key={c} value={c}>
                {reminderChannelLabel[c]}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="p-1 text-ink-400 hover:text-rose-600" aria-label="حذف یادآوری">
            <X size={13} />
          </button>
        </div>
      ))}
      {list.length < 4 && (
        <button type="button" onClick={() => onChange([...list, { minutes: list.length ? 60 : 15, channel: "inapp" }])} className="text-[11.5px] text-brand-700 flex items-center gap-1 hover:underline">
          <Plus size={12} /> {list.length ? "یادآوری دیگر" : "افزودن یادآوری"}
        </button>
      )}
    </div>
  );
}

/** پرسش «فقط این / این و بعدی‌ها / همه» برای ویرایش یا حذف یک وقوع از سری */
export function SeriesScopeDialog({ open, title, onPick, onClose, allowFollowing = true }: { open: boolean; title: string; onPick: (s: EditScope) => void; onClose: () => void; allowFollowing?: boolean }) {
  const scopes: EditScope[] = allowFollowing ? ["one", "following", "all"] : ["one", "all"];
  return (
    <Modal open={open} onClose={onClose} title={title} description="این مورد بخشی از یک سری تکرارشونده است." width="max-w-sm">
      <div className="space-y-2">
        {scopes.map((s) => (
          <Button key={s} variant={s === "one" ? "primary" : "secondary"} className="w-full justify-center" onClick={() => onPick(s)}>
            {editScopeLabel[s]}
          </Button>
        ))}
        <Button variant="ghost" className="w-full justify-center" onClick={onClose}>
          انصراف
        </Button>
      </div>
    </Modal>
  );
}
