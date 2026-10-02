// تنظیمات ساعت کاری: ساعت موظف روزانه، پنجشنبه (تعطیل/نیمه‌وقت/کامل)، سقف مرخصی و تعطیلات رسمی
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useTimesheet } from "../../context/TimesheetContext";
import { useTenancy } from "../../context/TenancyContext";
import { dayNum, fa } from "../../pm/jalali";
import Toggle from "../../components/ui/Toggle";
import { defaultLeavePolicy, defaultReminderPolicy } from "../../timesheet/types";

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ts = useTimesheet();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const s = ts.settings;
  // تنظیمات سازمانی است؛ فقط مدیر (تأیید/مالی) تغییرش می‌دهد
  const canEdit = hasPermission("timesheet.approve") || hasPermission("timesheet.finance");
  const lp = { ...defaultLeavePolicy, ...(s.leavePolicy ?? {}) };
  const rp = { ...defaultReminderPolicy, ...(s.reminders ?? {}) };
  const [hDate, setHDate] = useState("");
  const [hTitle, setHTitle] = useState("");

  const addHoliday = () => {
    if (!hDate || !hTitle.trim()) return;
    if (s.holidays.some((h) => dayNum(h.date) === dayNum(hDate))) {
      notify("این روز قبلاً تعطیل ثبت شده است.", "warning");
      return;
    }
    ts.updateSettings({ holidays: [...s.holidays, { date: hDate, title: hTitle.trim() }].sort((a, b) => (dayNum(a.date) ?? 0) - (dayNum(b.date) ?? 0)) });
    setHDate("");
    setHTitle("");
  };

  return (
    <Modal open={open} onClose={onClose} title="تنظیمات ساعت کاری" description="ساعت موظف، پنجشنبه‌ها و تعطیلات رسمی — مبنای محاسبه‌ی اضافه‌کار و کسری">
      {!canEdit && <p className="mb-3 rounded-lg bg-ink-100 text-ink-600 text-xs p-2.5">این تنظیمات سازمانی است و فقط مدیران و واحد مالی می‌توانند تغییرش دهند.</p>}
      <fieldset disabled={!canEdit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-ink-600">
            ساعت موظف شنبه تا چهارشنبه
            <input type="number" min={1} max={12} className="input-field mt-1" value={s.dailyHours} onChange={(e) => ts.updateSettings({ dailyHours: Math.max(1, Math.min(12, Number(e.target.value) || 8)) })} />
          </label>
          <label className="block text-xs text-ink-600">
            سقف مرخصی سالانه (روز)
            <input type="number" min={0} max={60} className="input-field mt-1" value={s.annualLeaveDays} onChange={(e) => ts.updateSettings({ annualLeaveDays: Math.max(0, Number(e.target.value) || 0) })} />
          </label>
        </div>
        <div>
          <p className="text-xs text-ink-600 mb-1.5">پنجشنبه</p>
          <div className="flex rounded-lg border border-ink-200 overflow-hidden text-xs w-fit">
            {[
              [0, "تعطیل"],
              [4, "نیمه‌وقت (۴ ساعت)"],
              [s.dailyHours, `کامل (${fa(s.dailyHours)} ساعت)`],
            ].map(([v, label]) => (
              <button key={String(label)} type="button" onClick={() => ts.updateSettings({ thursdayHours: Number(v) })} className={`px-3 py-1.5 ${s.thursdayHours === v ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-ink-50"}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink-400 mt-1">جمعه همیشه تعطیل است.</p>
        </div>
        <div className="rounded-lg border border-ink-100 p-3 space-y-2.5">
          <p className="text-xs font-bold text-ink-700">سیاست مرخصی</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="block text-xs text-ink-600">
              اندوخته
              <select className="input-field mt-1" value={lp.accrual} onChange={(e) => ts.updateSettings({ leavePolicy: { ...lp, accrual: e.target.value as "monthly" | "upfront" } })}>
                <option value="monthly">ماهانه ({fa(Math.round((s.annualLeaveDays / 12) * 10) / 10)} روز در ماه)</option>
                <option value="upfront">کل سهمیه از ابتدای سال</option>
              </select>
            </label>
            <label className="block text-xs text-ink-600">
              تبدیل مرخصی ساعتی به روز
              <select className="input-field mt-1" value={lp.hourlyBase} onChange={(e) => ts.updateSettings({ leavePolicy: { ...lp, hourlyBase: e.target.value as "person" | "org" } })}>
                <option value="person">با ساعت کاری خود شخص</option>
                <option value="org">با ساعت موظف سازمان ({fa(s.dailyHours)} ساعت)</option>
              </select>
            </label>
            <label className="block text-xs text-ink-600">
              سقف انتقال به سال بعد (روز)
              <input type="number" min={0} max={30} className="input-field mt-1" value={lp.carryOverDays} onChange={(e) => ts.updateSettings({ leavePolicy: { ...lp, carryOverDays: Math.max(0, Math.min(30, Number(e.target.value) || 0)) } })} />
            </label>
          </div>
        </div>
        <div className="rounded-lg border border-ink-100 p-3 space-y-2">
          <p className="text-xs font-bold text-ink-700">یادآوری‌ها (اعلان درون‌برنامه، روزی یک بار)</p>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-ink-600 flex items-center gap-1.5 flex-wrap">
              روز کاری بدون ثبت — از ساعت
              <input type="number" min={12} max={23} className="input-field !w-16 !py-1 text-center" value={rp.eveningHour} onChange={(e) => ts.updateSettings({ reminders: { ...rp, eveningHour: Math.max(12, Math.min(23, Number(e.target.value) || 17)) } })} aria-label="ساعت یادآوری عصر" />
            </span>
            <Toggle on={rp.eveningMissing} onChange={() => ts.updateSettings({ reminders: { ...rp, eveningMissing: !rp.eveningMissing } })} label="یادآوری روز بدون ثبت" />
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-ink-600 flex items-center gap-1.5 flex-wrap">
              پایان دوره (۲۵ هر ماه) —
              <input type="number" min={1} max={7} className="input-field !w-14 !py-1 text-center" value={rp.periodDaysBefore} onChange={(e) => ts.updateSettings({ reminders: { ...rp, periodDaysBefore: Math.max(1, Math.min(7, Number(e.target.value) || 2)) } })} aria-label="روز پیش از پایان دوره" />
              روز قبل
            </span>
            <Toggle on={rp.periodEnd} onChange={() => ts.updateSettings({ reminders: { ...rp, periodEnd: !rp.periodEnd } })} label="یادآوری پایان دوره" />
          </div>
        </div>
        <div>
          <p className="text-xs text-ink-600 mb-1.5">تعطیلات رسمی ({fa(s.holidays.length)})</p>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-ink-200 divide-y divide-ink-100">
            {s.holidays.map((h) => (
              <div key={h.date} className="flex items-center gap-2 px-2.5 py-1.5 text-xs">
                <span className="text-ink-500 w-20 shrink-0">{h.date}</span>
                <span className="flex-1 text-ink-800 truncate">{h.title}</span>
                <button type="button" onClick={() => ts.updateSettings({ holidays: s.holidays.filter((x) => x !== h) })} className="p-1 rounded text-ink-400 hover:text-rose-600" aria-label={`حذف ${h.title}`}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mt-2">
            <JalaliDatePicker value={hDate} onChange={setHDate} placeholder="تاریخ" />
            <input className="input-field" placeholder="مناسبت" value={hTitle} onChange={(e) => setHTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addHoliday()} />
            <Button type="button" icon={<Plus size={14} />} onClick={addHoliday} aria-label="افزودن تعطیل" />
          </div>
        </div>
      </fieldset>
      <div className="flex items-center justify-between gap-2 mt-5 flex-wrap">
        {canEdit ? (
          <button
            className="text-[11px] text-ink-400 hover:text-rose-600"
            onClick={() =>
              confirm({
                title: "بازنشانی داده‌های کارکرد؟",
                message: "همه‌ی ثبت‌ها، اتصال‌ها و وضعیت دوره‌ها به داده‌ی نمونه برمی‌گردد.",
                confirmLabel: "بازنشانی",
                onConfirm: () => {
                  ts.reset();
                  notify("داده‌های کارکرد بازنشانی شد.", "info");
                  onClose();
                },
              })
            }
          >
            بازنشانی داده‌ی نمونه
          </button>
        ) : (
          <span />
        )}
        <Button variant="primary" onClick={onClose}>
          تمام
        </Button>
      </div>
    </Modal>
  );
}
