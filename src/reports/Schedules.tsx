// ---------------------------------------------------------------------------
// زمان‌بندی ارسال گزارش ذخیره‌شده: روزانه / هفتگی / ماهانه / پایان دوره‌ی کارکرد (۲۵ام)،
// گیرندگان (کاربران) و کانال (ایمیل یا اعلان درون‌برنامه) + اجراکننده‌ی شبیه‌سازی‌شده.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, Mail, Bell, Trash2, Search, X, Send } from "lucide-react";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Toggle from "../components/ui/Toggle";
import { useToast } from "../components/ui/ToastProvider";
import { useTenancy } from "../context/TenancyContext";
import { useInbox } from "../context/InboxContext";
import { users } from "../data/mock";
import { faNum } from "./engine";
import { newScheduleId, periodOf, reportStore, scheduleStore, useSchedules } from "./store";
import { channelLabel, freqLabel, type ReportSchedule, type ReportSpec, type ScheduleChannel, type ScheduleFreq } from "./types";

const userName = (id: string) => users.find((u) => u.id === id)?.name ?? id;

// ----------------------------------------------------------------- اجراکننده

/**
 * اجراکننده‌ی شبیه‌سازی‌شده: هنگام بارگذاری برنامه (و هر بار که زمان‌بندی‌ها یا کاربر عوض شوند)
 * برای هر زمان‌بندیِ فعالِ سررسیده در دوره‌ی جاری یک بار اعلان می‌فرستد.
 */
export function ReportScheduleRunner() {
  const { today, actingUser } = useTenancy();
  const inbox = useInbox();
  const { schedules } = useSchedules();
  useEffect(() => {
    const reports = reportStore.all();
    schedules
      .filter((s) => s.active && s.recipients.length)
      .forEach((s) => {
        const r = reports.find((x) => x.id === s.reportId);
        if (!r) return;
        const per = periodOf(s.freq, today);
        if (s.lastPeriod === per.key) return;
        const names = s.recipients.map(userName);
        const text = `گزارش زمان‌بندی‌شده‌ی «${r.name}» برای ${per.label} آماده است${s.channels.includes("email") ? " (نسخه‌ی ایمیلی هم ارسال شد)" : ""}.`;
        if (s.channels.includes("inapp")) inbox.send(names, "report", text, `/dashboard?report=${encodeURIComponent(r.id)}`, { system: true });
        scheduleStore.recordDelivery({ id: newScheduleId(), scheduleId: s.id, reportId: r.id, reportName: r.name, period: per.key, periodLabel: per.label, at: today, recipients: s.recipients, channels: s.channels });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedules, today, actingUser.id]);
  return null;
}

// ----------------------------------------------------------------- پنجره‌ی زمان‌بندی

export function ScheduleModal({ spec, onClose }: { spec: ReportSpec; onClose: () => void }) {
  const { actingUser, visibleUserIds, today } = useTenancy();
  const { notify } = useToast();
  const { schedules, deliveries } = useSchedules(spec.id);
  const [freq, setFreq] = useState<ScheduleFreq>("weekly");
  const [channels, setChannels] = useState<ScheduleChannel[]>(["inapp"]);
  const [recipients, setRecipients] = useState<string[]>([actingUser.id]);
  const [q, setQ] = useState("");
  const pool = useMemo(() => {
    const vis = new Set([...visibleUserIds(), actingUser.id]);
    return users.filter((u) => vis.has(u.id) && (!q.trim() || u.name.includes(q.trim()) || u.role.includes(q.trim())));
  }, [visibleUserIds, actingUser.id, q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const add = () => {
    if (!recipients.length) return notify("حداقل یک گیرنده انتخاب کنید.", "warning");
    if (!channels.length) return notify("حداقل یک کانال ارسال انتخاب کنید.", "warning");
    const s: ReportSchedule = { id: newScheduleId(), reportId: spec.id, freq, recipients, channels, active: true, createdBy: actingUser.id, createdAt: today };
    scheduleStore.upsert(s);
    notify(`ارسال ${freqLabel[freq]} برای ${faNum(recipients.length)} گیرنده تنظیم شد؛ اولین ارسال برای ${periodOf(freq, today).label} انجام می‌شود.`, "success");
  };
  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" dir="rtl" role="dialog" aria-modal="true" aria-label="زمان‌بندی ارسال گزارش">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-ink-200 max-h-[88vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-ink-100">
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-ink-900 flex items-center gap-1.5"><CalendarClock size={15} className="text-brand-600" /> زمان‌بندی ارسال</h2>
            <p className="text-xs text-ink-400 mt-0.5 truncate">{spec.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="بستن" className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center shrink-0"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {schedules.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-ink-800">زمان‌بندی‌های فعلی</p>
              {schedules.map((s) => (
                <div key={s.id} className="rounded-lg border border-ink-200 px-2.5 py-2 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-ink-900 truncate">{freqLabel[s.freq]} · {s.channels.map((c) => channelLabel[c]).join(" + ")}</p>
                    <p className="text-[10.5px] text-ink-500 truncate">{s.recipients.map(userName).join("، ")}</p>
                    <p className="text-[10.5px] text-ink-400">{s.lastSentAt ? `آخرین ارسال: ${s.lastSentAt}` : "هنوز ارسال نشده"}</p>
                  </div>
                  <Toggle on={s.active} onChange={() => scheduleStore.upsert({ ...s, active: !s.active })} label={s.active ? "توقف ارسال" : "فعال‌سازی"} />
                  {(s.createdBy === actingUser.id || spec.createdBy === actingUser.id) && (
                    <button type="button" onClick={() => scheduleStore.remove(s.id)} aria-label="حذف زمان‌بندی" className="w-7 h-7 rounded-md hover:bg-rose-50 text-ink-400 hover:text-rose-600 flex items-center justify-center shrink-0"><Trash2 size={13} /></button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-bold text-ink-800">زمان‌بندی جدید</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(freqLabel) as ScheduleFreq[]).map((f) => (
                <button key={f} type="button" onClick={() => setFreq(f)} className={`text-[11.5px] rounded-lg border px-2 py-1.5 text-right ${freq === f ? "border-brand-400 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}>
                  {freqLabel[f]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(channelLabel) as ScheduleChannel[]).map((c) => (
                <label key={c} className="flex items-center gap-1.5 text-xs text-ink-700 cursor-pointer">
                  <input type="checkbox" checked={channels.includes(c)} onChange={() => setChannels(toggleIn(channels, c))} />
                  {c === "email" ? <Mail size={13} className="text-ink-400" /> : <Bell size={13} className="text-ink-400" />}
                  {channelLabel[c]}
                </label>
              ))}
            </div>
            <div>
              <p className="text-[11.5px] text-ink-600 mb-1.5">گیرندگان ({faNum(recipients.length)})</p>
              <label className="flex items-center gap-2 input-field !py-1.5 mb-1.5">
                <Search size={13} className="text-ink-400 shrink-0" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی همکار…" className="flex-1 min-w-0 bg-transparent outline-none text-xs" />
              </label>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-ink-100 divide-y divide-ink-100">
                {pool.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer hover:bg-ink-50">
                    <input type="checkbox" checked={recipients.includes(u.id)} onChange={() => setRecipients(toggleIn(recipients, u.id))} />
                    <span className="truncate text-ink-800">{u.name}</span>
                    <span className="truncate text-[10.5px] text-ink-400 mr-auto">{u.role}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button variant="primary" className="w-full justify-center" icon={<Send size={14} />} onClick={add}>افزودن زمان‌بندی</Button>
            <p className="text-[10.5px] text-ink-400 leading-5">ارسال در این نسخه‌ی نمایشی شبیه‌سازی می‌شود: با هر بار ورود به سامانه، زمان‌بندی‌های سررسیده یک بار در هر دوره اعلان درون‌برنامه می‌فرستند؛ ایمیل فقط در گزارش ارسال‌ها ثبت می‌شود.</p>
          </div>

          {deliveries.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-ink-800">سابقه‌ی ارسال</p>
              {deliveries.slice(0, 6).map((d) => (
                <p key={d.id} className="text-[11px] text-ink-500 flex items-center gap-1.5 flex-wrap">
                  <Badge tone="neutral">{d.at}</Badge> {d.periodLabel} · {faNum(d.recipients.length)} گیرنده · {d.channels.map((c) => channelLabel[c]).join(" + ")}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
