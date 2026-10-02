// کارت/پنجره‌ی «مانده‌ی مرخصی»: سهمیه‌ی سالانه، اندوخته‌ی ماهانه، استفاده‌شده (روزانه + ساعتی
// تبدیل‌شده با ساعت کاری خود شخص) و مانده — سیاست در «تنظیمات ساعت کاری» قابل ویرایش است.
import Modal from "../../components/ui/Modal";
import { fa } from "../../pm/jalali";
import { daysToText, fmtHM, type LeaveBalance } from "../../timesheet/types";

const n = (x: number) => (Math.round(x * 10) / 10).toLocaleString("fa-IR", { maximumFractionDigits: 1 });

export default function LeaveBalanceModal({ open, onClose, b, name, onPolicy }: { open: boolean; onClose: () => void; b: LeaveBalance; name: string; onPolicy?: () => void }) {
  const pct = b.quota ? Math.min(100, Math.max(0, (b.used / b.quota) * 100)) : 0;
  const accPct = b.quota ? Math.min(100, (b.accrued / b.quota) * 100) : 0;
  const rows: [string, string, string?][] = [
    ["سهمیه‌ی سالانه", `${n(b.quota)} روز`],
    ["اندوخته‌ی ماهانه", `${n(b.monthly)} روز در ماه`, b.policy.accrual === "monthly" ? "هر ماه به مانده اضافه می‌شود" : "کل سهمیه از ابتدای سال در دسترس است"],
    ["اندوخته تا امروز", `${n(b.accrued)} روز`],
    ["استفاده پیش از سامانه", `${n(b.usedBefore)} روز`],
    ["مرخصی روزانه", `${fa(b.usedDaily)} روز`],
    ["مرخصی ساعتی", `${fmtHM(b.usedHourlyHours)} ساعت`, `= ${n(b.usedHourlyDays)} روز (هر روز ${fa(b.dayHours)} ساعت)`],
  ];
  return (
    <Modal open={open} onClose={onClose} title="مانده‌ی مرخصی" description={`${name} · سال جاری`} width="max-w-md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-ink-100 p-3">
            <p className="text-[11px] text-ink-500">قابل استفاده تا امروز</p>
            <p className={`text-lg font-bold ${b.available < 0 ? "text-rose-600" : "text-emerald-700"}`}>{n(b.available)} روز</p>
            <p className="text-[10.5px] text-ink-400">{daysToText(b.available, b.dayHours)}</p>
          </div>
          <div className="rounded-lg border border-ink-100 p-3">
            <p className="text-[11px] text-ink-500">مانده‌ی کل سال</p>
            <p className={`text-lg font-bold ${b.remainingYear < 0 ? "text-rose-600" : "text-ink-900"}`}>{n(b.remainingYear)} روز</p>
            <p className="text-[10.5px] text-ink-400">{daysToText(b.remainingYear, b.dayHours)}</p>
          </div>
        </div>
        <div>
          <div className="relative h-2.5 rounded-full bg-ink-100 overflow-hidden" aria-label="نسبت مصرف">
            <span className="absolute inset-y-0 right-0 bg-brand-200" style={{ width: `${accPct}%` }} />
            <span className="absolute inset-y-0 right-0 bg-brand-600" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10.5px] text-ink-400 mt-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-brand-600 align-middle" /> استفاده‌شده {n(b.used)} · <span className="inline-block w-2 h-2 rounded-sm bg-brand-200 align-middle" /> اندوخته {n(b.accrued)} · از {n(b.quota)} روز
          </p>
        </div>
        <dl className="divide-y divide-ink-100 rounded-lg border border-ink-100">
          {rows.map(([k, v, h]) => (
            <div key={k} className="flex items-start justify-between gap-3 px-3 py-2 text-xs">
              <dt className="text-ink-500">{k}</dt>
              <dd className="text-left">
                <span className="text-ink-800 font-medium">{v}</span>
                {h && <span className="block text-[10.5px] text-ink-400">{h}</span>}
              </dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
            <dt className="text-ink-500">جمع استفاده‌شده</dt>
            <dd className="text-ink-900 font-bold">{n(b.used)} روز</dd>
          </div>
        </dl>
        <p className="text-[11px] text-ink-400 leading-5">
          تا {fa(b.policy.carryOverDays)} روز مانده به سال بعد منتقل می‌شود.{" "}
          {onPolicy && (
            <button type="button" className="text-brand-700 hover:underline" onClick={onPolicy}>
              سیاست مرخصی
            </button>
          )}
        </p>
      </div>
    </Modal>
  );
}
