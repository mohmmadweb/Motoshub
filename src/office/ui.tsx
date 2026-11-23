// اجزای مشترک صفحه‌های «دبیرخانه و مشتریان» (فقط روی اجزای پایه‌ی WP1)
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Code2, Paperclip, Plus, Search, X, FileText } from "lucide-react";
import Avatar from "../components/Avatar";
import Badge from "../components/ui/Badge";
import JalaliDatePicker from "../components/ui/JalaliDatePicker";
import Toggle from "../components/ui/Toggle";
import { users } from "../data/mock";
import { useTenancy } from "../context/TenancyContext";
import { useOffice } from "../context/OfficeContext";
import type { Ep } from "../api/envelopes";
import { OFFICE_API_BASE, fmtEp } from "./endpoints";
import type { AttachmentApi, LabelNamespace, PrincipalId } from "./types";
import { enDate, faNum, fileSize, parseAmount, principalOf, toFa, userOfPrincipal } from "./util";

export function Field({ label, hint, required, error, children, className = "" }: { label: string; hint?: string; required?: boolean; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`field ${className}`}>
      <span className="field-label">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-help">{hint}</span> : null}
    </div>
  );
}

// ------------------------------------------------------------------ افراد

/** افرادی که کاربر می‌تواند ببیند (اجتماع زیردرخت عضویت‌ها) */
export function usePeople() {
  const t = useTenancy();
  return useMemo(() => {
    const ids = new Set(t.visibleUserIds());
    return users.filter((u) => ids.has(u.id)).map((u) => ({ pid: principalOf(u.id), name: u.name, role: u.role, color: u.avatarColor }));
  }, [t]);
}

export function Person({ pid, sub, size = 28 }: { pid: PrincipalId; sub?: ReactNode; size?: number }) {
  const u = userOfPrincipal(pid);
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <Avatar name={u?.name ?? "؟"} color={u?.avatarColor} size={size} />
      <span className="min-w-0">
        <span className="block text-sm text-ink-800 truncate">{u?.name ?? "کاربر"}</span>
        {sub !== undefined && <span className="block text-xs text-ink-500 truncate">{sub}</span>}
      </span>
    </span>
  );
}

export function PeoplePicker({ value, onChange, exclude = [], placeholder = "جستجوی نام…", single }: { value: PrincipalId[]; onChange: (v: PrincipalId[]) => void; exclude?: PrincipalId[]; placeholder?: string; single?: boolean }) {
  const people = usePeople();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const options = people.filter((p) => !value.includes(p.pid) && !exclude.includes(p.pid) && (!q || p.name.includes(q.trim()))).slice(0, 8);
  return (
    <div className="relative">
      <div className="input-field !h-auto min-h-10 flex flex-wrap items-center gap-1.5 !py-1.5">
        {value.map((pid) => (
          <span key={pid} className="inline-flex items-center gap-1 h-7 ps-1 pe-2 rounded-full bg-teal-50 text-teal-700 text-[13px]">
            <Avatar name={userOfPrincipal(pid)?.name ?? "؟"} color={userOfPrincipal(pid)?.avatarColor} size={20} />
            {userOfPrincipal(pid)?.name ?? "کاربر"}
            <button type="button" aria-label="حذف" onClick={() => onChange(value.filter((x) => x !== pid))} className="text-teal-700/70 hover:text-teal-700">
              <X size={14} />
            </button>
          </span>
        ))}
        {(!single || !value.length) && (
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={value.length ? "" : placeholder}
            className="flex-1 min-w-[8rem] bg-transparent outline-none text-sm h-7"
          />
        )}
      </div>
      {open && options.length > 0 && (
        <div className="absolute z-30 top-full mt-1 inset-x-0 bg-[var(--color-card)] border border-[var(--color-border)] rounded-[10px] shadow-lg p-1 max-h-64 overflow-y-auto">
          {options.map((p) => (
            <button
              key={p.pid}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(single ? [p.pid] : [...value, p.pid]);
                setQ("");
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-ink-50 text-start"
            >
              <Avatar name={p.name} color={p.color} size={24} />
              <span className="min-w-0">
                <span className="block text-sm text-ink-800 truncate">{p.name}</span>
                <span className="block text-xs text-ink-500 truncate">{p.role}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ برچسب‌ها

export function LabelChips({ ns, labels }: { ns: LabelNamespace; labels: string[] }) {
  const o = useOffice();
  if (!labels.length) return null;
  const cat = o.labelsOf(ns);
  return (
    <span className="inline-flex flex-wrap gap-1">
      {labels.map((l) => (
        <Badge key={l} tone={cat.find((x) => x.title === l)?.tone ?? "neutral"} size="sm">
          {l}
        </Badge>
      ))}
    </span>
  );
}

/** انتخاب برچسب از فهرست همان فضای نام + افزودن برچسب تازه */
export function LabelPicker({ ns, value, onChange }: { ns: LabelNamespace; value: string[]; onChange: (v: string[]) => void }) {
  const o = useOffice();
  const [draft, setDraft] = useState("");
  const cat = o.labelsOf(ns);
  const all = [...new Set([...cat.map((c) => c.title), ...value])];
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (!cat.some((c) => c.title === v)) o.saveLabel({ namespace: ns, title: v, tone: "neutral" });
    onChange([...new Set([...value, v])]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {all.map((l) => {
        const on = value.includes(l);
        return (
          <button
            key={l}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== l) : [...value, l])}
            className={`h-7 px-3 rounded-full border text-[13px] ${on ? "bg-teal-50 border-teal-700 text-teal-700 font-bold" : "bg-[var(--color-card)] border-ink-200 text-ink-700 hover:bg-ink-50"}`}
          >
            {l}
          </button>
        );
      })}
      <span className="inline-flex items-center gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="برچسب تازه"
          className="input-field !h-7 !w-28 !text-[13px]"
        />
        <button type="button" onClick={add} aria-label="افزودن برچسب" className="btn btn-ghost btn-icon btn-sm">
          <Plus size={16} />
        </button>
      </span>
    </div>
  );
}

// ------------------------------------------------------------------ پیوست

let attSeq = Date.now() % 100000;
export function AttachmentInput({ value, onChange }: { value: AttachmentApi[]; onChange: (v: AttachmentApi[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <AttachmentList items={value} onRemove={(id) => onChange(value.filter((a) => a.id !== id))} />
      <div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => ref.current?.click()}>
          <Paperclip size={16} strokeWidth={1.5} /> افزودن پیوست
        </button>
        <input
          ref={ref}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            onChange([...value, ...files.map((f) => ({ id: ++attSeq, name: f.name, size: f.size, mime: f.type || "application/octet-stream" }))]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export function AttachmentList({ items, onRemove }: { items: AttachmentApi[]; onRemove?: (id: number) => void }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((a) => (
        <li key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-[10px] border border-[var(--color-border)] bg-ink-50">
          <FileText size={18} strokeWidth={1.5} className="text-teal-700 shrink-0" />
          <span className="flex-1 min-w-0 text-sm text-ink-800 truncate" dir="auto">
            {a.name}
          </span>
          <span className="text-xs text-ink-500 shrink-0">{fileSize(a.size)}</span>
          {onRemove && (
            <button type="button" aria-label="حذف پیوست" onClick={() => onRemove(a.id)} className="text-ink-400 hover:text-rose-600">
              <X size={16} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ مبلغ و تاریخ

export function MoneyInput({ value, onChange, placeholder = "مبلغ به ریال" }: { value: number; onChange: (n: number) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <input inputMode="numeric" value={value ? value.toLocaleString("fa-IR") : ""} onChange={(e) => onChange(parseAmount(e.target.value))} placeholder={placeholder} className="input-field !pl-14" dir="ltr" />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-500 pointer-events-none">ریال</span>
    </div>
  );
}

/** تاریخ جلالی؛ مقدار ذخیره‌شده با ارقام لاتین */
export function DateInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <JalaliDatePicker value={value ? toFa(value) : ""} onChange={(v) => onChange(enDate(v))} placeholder={placeholder} />;
}

// ------------------------------------------------------------------ API

export function ApiButton({ items }: { items: { label: string; ep: Ep }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} className="btn btn-outline btn-sm" aria-expanded={open} title="endpointهای پیشنهادی این بخش">
        <Code2 size={16} strokeWidth={1.5} /> API
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <span className="absolute z-40 top-full mt-1 left-0 w-[440px] max-w-[88vw] max-h-[70vh] overflow-y-auto bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-lg p-3 block animate-fadein">
            <span className="block text-xs text-ink-500 mb-1" dir="ltr">
              {OFFICE_API_BASE}
            </span>
            <span className="block text-xs text-amber-700 mb-2">همه‌ی این endpointها «پیشنهادی»اند (در API فعلی نیستند) و پاکت workspace دارند.</span>
            {items.map((i) => (
              <span key={i.label} className="flex items-center justify-between gap-3 py-1.5 border-b border-ink-100 last:border-0">
                <span className="text-[13px] text-ink-700 truncate">{i.label}</span>
                <code dir="ltr" className="text-xs rounded px-1.5 py-0.5 whitespace-nowrap text-amber-700 bg-amber-50">
                  {fmtEp(i.ep)}
                </code>
              </span>
            ))}
          </span>
        </>
      )}
    </span>
  );
}

// ------------------------------------------------------------------ چاپ

/**
 * نمای چاپی: در صفحه دیده نمی‌شود؛ هنگام باز شدن پنجره‌ی چاپ مرورگر را باز می‌کند و فقط همین
 * محتوا چاپ می‌شود (بقیه‌ی صفحه پنهان). پس از چاپ `onDone` صدا زده می‌شود.
 */
export function PrintPortal({ children, onDone }: { children: ReactNode; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const after = () => done.current();
    window.addEventListener("afterprint", after);
    const id = window.setTimeout(() => window.print(), 60);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  return createPortal(
    <div data-office-print dir="rtl">
      <style>{`@media screen { [data-office-print] { display: none; } } @media print { body > *:not([data-office-print]) { display: none !important; } [data-office-print] { display: block; padding: 0 8mm; } [data-office-print] table { width: 100%; border-collapse: collapse; } [data-office-print] th, [data-office-print] td { border: 1px solid currentColor; padding: 4px 6px; font-size: 10pt; text-align: start; } }`}</style>
      {children}
    </div>,
    document.body,
  );
}

// ------------------------------------------------------------------ پرونده‌ها

/** انتخاب یک یا چند پرونده‌ی مشتری (اتصال نامه) */
export function CustomerPicker({ value, onChange, single }: { value: number[]; onChange: (v: number[]) => void; single?: boolean }) {
  const o = useOffice();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const options = o.visibleCustomers.filter((c) => !value.includes(c.id) && (!q || c.name.includes(q.trim()) || c.trade_name.includes(q.trim()))).slice(0, 8);
  return (
    <div className="relative">
      <div className="input-field !h-auto min-h-10 flex flex-wrap items-center gap-1.5 !py-1.5">
        {value.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-teal-50 text-teal-700 text-[13px]">
            {o.state.customers.find((c) => c.id === id)?.name ?? `پرونده‌ی ${faNum(id)}`}
            <button type="button" aria-label="حذف" onClick={() => onChange(value.filter((x) => x !== id))}>
              <X size={14} />
            </button>
          </span>
        ))}
        {(!single || !value.length) && (
          <span className="flex-1 min-w-[8rem] inline-flex items-center gap-1">
            <Search size={14} className="text-ink-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder={value.length ? "" : "جستجوی پرونده‌ی مشتری…"}
              className="flex-1 bg-transparent outline-none text-sm h-7"
            />
          </span>
        )}
      </div>
      {open && options.length > 0 && (
        <div className="absolute z-30 top-full mt-1 inset-x-0 bg-[var(--color-card)] border border-[var(--color-border)] rounded-[10px] shadow-lg p-1 max-h-64 overflow-y-auto">
          {options.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(single ? [c.id] : [...value, c.id]);
                setQ("");
              }}
              className="w-full px-2 py-1.5 rounded-lg hover:bg-ink-50 text-start text-sm text-ink-800"
            >
              {c.name}
              {c.trade_name && <span className="text-xs text-ink-500"> · {c.trade_name}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** کلید روشن/خاموش با برچسب دیدنی */
export function ToggleRow({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-sm text-ink-800">{label}</span>
        {hint && <span className="block text-xs text-ink-500 leading-5">{hint}</span>}
      </span>
      <Toggle on={checked} onChange={() => onChange(!checked)} label={label} disabled={disabled} />
    </div>
  );
}

/** انتخاب یک نفر (مسئول) */
export function PersonSelect({ value, onChange, ariaLabel = "مسئول" }: { value: PrincipalId; onChange: (v: PrincipalId) => void; ariaLabel?: string }) {
  const people = usePeople();
  const list = people.some((p) => p.pid === value) ? people : [{ pid: value, name: userOfPrincipal(value)?.name ?? "کاربر", role: "", color: undefined as string | undefined }, ...people];
  return (
    <select className="input-field" value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel}>
      {list.map((p) => (
        <option key={p.pid} value={p.pid}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
