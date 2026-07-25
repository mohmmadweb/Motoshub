import { useMemo, useRef, useState, useEffect } from "react";
import { CalendarDays, ChevronRight, ChevronLeft } from "lucide-react";

// انتخاب‌گر تاریخ شمسی — بدون وابستگی خارجی (الگوریتم استاندارد تبدیل جلالی)
function div(a: number, b: number) {
  return Math.floor(a / b);
}

function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy += 1595;
  let days = -355668 + 365 * jy + div(jy, 33) * 8 + div((jy % 33) + 3, 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return [gy, gm, gd];
}

function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const weekDays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

function jalaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // اسفند: کبیسه؟
  const [gy, gm, gd] = jalaliToGregorian(jy + 1, 1, 1);
  const first = Date.UTC(gy, gm - 1, gd);
  const [gy2, gm2, gd2] = jalaliToGregorian(jy, 12, 1);
  const start = Date.UTC(gy2, gm2 - 1, gd2);
  return Math.round((first - start) / 86400000);
}

const faNum = (n: number) => n.toLocaleString("fa-IR", { useGrouping: false });

export default function JalaliDatePicker({
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
  error,
}: {
  value: string; // «۱۴۰۵/۰۵/۱۰»
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => {
    const d = new Date();
    return gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }, []);
  const [view, setView] = useState<[number, number]>([today[0], today[1]]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const [vy, vm] = view;
  const len = jalaliMonthLength(vy, vm);
  const [gy, gm, gd] = jalaliToGregorian(vy, vm, 1);
  // شنبه = ۰
  const firstWeekday = (new Date(gy, gm - 1, gd).getDay() + 1) % 7;

  const pick = (day: number) => {
    onChange(`${faNum(vy)}/${faNum(vm).padStart(2, "۰")}/${faNum(day).padStart(2, "۰")}`);
    setOpen(false);
  };

  const prevMonth = () => setView(vm === 1 ? [vy - 1, 12] : [vy, vm - 1]);
  const nextMonth = () => setView(vm === 12 ? [vy + 1, 1] : [vy, vm + 1]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`input-field flex items-center justify-between gap-2 text-right ${error ? "input-error" : ""} ${value ? "text-ink-900" : "text-ink-400"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{value || placeholder}</span>
        <CalendarDays size={15} className="text-ink-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-64 bg-white border border-ink-200 rounded-xl shadow-xl p-3" role="dialog" aria-label="انتخاب تاریخ شمسی">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} aria-label="ماه قبل" className="w-7 h-7 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-500">
              <ChevronRight size={15} />
            </button>
            <span className="text-[13px] font-bold text-ink-900">
              {monthNames[vm - 1]} {faNum(vy)}
            </span>
            <button type="button" onClick={nextMonth} aria-label="ماه بعد" className="w-7 h-7 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-500">
              <ChevronLeft size={15} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
            {weekDays.map((w) => (
              <span key={w} className="text-[10.5px] text-ink-400 py-1">{w}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <span key={`e${i}`} />
            ))}
            {Array.from({ length: len }, (_, i) => i + 1).map((d) => {
              const isToday = vy === today[0] && vm === today[1] && d === today[2];
              const label = `${faNum(vy)}/${faNum(vm).padStart(2, "۰")}/${faNum(d).padStart(2, "۰")}`;
              const isSelected = value === label;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => pick(d)}
                  className={`h-8 rounded-lg text-[12px] transition-colors ${
                    isSelected
                      ? "bg-brand-600 text-white font-bold"
                      : isToday
                        ? "bg-brand-50 text-brand-700 font-bold border border-brand-300"
                        : "text-ink-700 hover:bg-ink-100"
                  }`}
                >
                  {faNum(d)}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setView([today[0], today[1]]);
              pick(today[2]);
            }}
            className="w-full mt-2 text-[11.5px] text-brand-600 font-medium hover:text-brand-700 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
          >
            امروز — {monthNames[today[1] - 1].slice(0, 8)} {faNum(today[2])}
          </button>
        </div>
      )}
    </div>
  );
}
