// ---------------------------------------------------------------------------
// فیلتر سراسری داشبورد: بازه‌ی زمانی، پروژه، فرد — روی گزارش‌های سنجاق‌شده و کارت‌هایی
// که معنا دارد اعمال می‌شود. یک دکمه + پنل کشویی + برچسب‌های فعال (بی‌شلوغی).
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { Filter, X } from "lucide-react";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { presetLabel, type DatePreset, type GlobalFilter } from "../../reports/types";
import { EMPTY_FILTER } from "./layout";

const PRESETS: DatePreset[] = ["all", "thisWeek", "thisMonth", "payroll", "last30", "last90", "quarter", "year", "custom"];

export function filterCount(f: GlobalFilter) {
  return (f.range.preset !== "all" ? 1 : 0) + (f.project ? 1 : 0) + (f.person ? 1 : 0);
}

export function GlobalFilterBar({ value, onChange, projects, people }: { value: GlobalFilter; onChange: (f: GlobalFilter) => void; projects: string[]; people: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const n = filterCount(value);
  const rangeChip = value.range.preset === "custom" ? `${value.range.from ?? "…"} تا ${value.range.to ?? "…"}` : presetLabel[value.range.preset];
  const chip = (label: string, clear: () => void) => (
    <span className="inline-flex items-center gap-1 text-[11px] rounded-full bg-brand-50 border border-brand-200 text-brand-800 pl-1 pr-2 py-0.5 max-w-[180px]">
      <span className="truncate">{label}</span>
      <button type="button" onClick={clear} aria-label={`حذف فیلتر ${label}`} className="w-4 h-4 rounded-full hover:bg-brand-100 flex items-center justify-center shrink-0">
        <X size={10} />
      </button>
    </span>
  );
  return (
    <div ref={ref} className="relative flex items-center gap-1.5 flex-wrap min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-lg border px-2.5 py-1.5 ${n ? "border-brand-300 bg-brand-50 text-brand-800" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"}`}
      >
        <Filter size={13} /> فیلتر سراسری{n ? ` (${n.toLocaleString("fa-IR")})` : ""}
      </button>
      {value.range.preset !== "all" && chip(rangeChip, () => onChange({ ...value, range: { preset: "all" } }))}
      {value.project && chip(value.project, () => onChange({ ...value, project: undefined }))}
      {value.person && chip(value.person, () => onChange({ ...value, person: undefined }))}
      {n > 1 && (
        <button type="button" onClick={() => onChange(EMPTY_FILTER)} className="text-[11px] text-ink-500 hover:text-ink-800">
          پاک کردن همه
        </button>
      )}
      {open && (
        <div className="absolute top-full right-0 mt-1.5 z-30 w-[min(320px,calc(100vw-2rem))] card p-3 shadow-xl space-y-2.5">
          <label className="block">
            <span className="text-[11px] text-ink-500 block mb-1">بازه‌ی زمانی</span>
            <select value={value.range.preset} onChange={(e) => onChange({ ...value, range: { ...value.range, preset: e.target.value as DatePreset } })} className="input-field !py-1.5 !text-xs">
              {PRESETS.map((p) => <option key={p} value={p}>{presetLabel[p]}</option>)}
            </select>
          </label>
          {value.range.preset === "custom" && (
            <div className="grid grid-cols-1 gap-2">
              <div>
                <span className="text-[11px] text-ink-500 block mb-1">از</span>
                <JalaliDatePicker value={value.range.from ?? ""} onChange={(v) => onChange({ ...value, range: { ...value.range, from: v } })} />
              </div>
              <div>
                <span className="text-[11px] text-ink-500 block mb-1">تا</span>
                <JalaliDatePicker value={value.range.to ?? ""} onChange={(v) => onChange({ ...value, range: { ...value.range, to: v } })} />
              </div>
            </div>
          )}
          <label className="block">
            <span className="text-[11px] text-ink-500 block mb-1">پروژه</span>
            <select value={value.project ?? ""} onChange={(e) => onChange({ ...value, project: e.target.value || undefined })} className="input-field !py-1.5 !text-xs">
              <option value="">همه‌ی پروژه‌ها</option>
              {projects.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] text-ink-500 block mb-1">فرد</span>
            <select value={value.person ?? ""} onChange={(e) => onChange({ ...value, person: e.target.value || undefined })} className="input-field !py-1.5 !text-xs">
              <option value="">همه</option>
              {people.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <p className="text-[10.5px] text-ink-400 leading-5">روی گزارش‌های سنجاق‌شده و کارت‌های کارها، جلسات، پروژه‌ها و هشدارهای مدیریتی اعمال می‌شود.</p>
        </div>
      )}
    </div>
  );
}
