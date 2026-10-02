// اجزای مشترک تیکت پشتیبانی: نشان وضعیت، شاخص SLA، ستاره‌ی رضایت، انتخاب فایل و برچسب‌ها.
import { useRef, useState, type ReactNode } from "react";
import { Star, Paperclip, X, Timer, AlertTriangle, CheckCircle2, PauseCircle } from "lucide-react";
import Badge from "../../components/ui/Badge";
import { fa } from "../../pm/jalali";
import { fmtDur, slaFirst, slaResolve, statusLabel, statusShort, statusTone, type SlaInfo, type Ticket } from "./model";

export function StatusBadge({ status, long }: { status: Ticket["status"]; long?: boolean }) {
  return <Badge tone={statusTone[status]}>{long ? statusLabel[status] : statusShort[status]}</Badge>;
}

const slaStyle: Record<SlaInfo["state"], string> = {
  ok: "bg-ink-100 text-ink-600 border-ink-200",
  risk: "bg-amber-50 text-amber-700 border-amber-200",
  breached: "bg-rose-50 text-rose-700 border-rose-200",
  met: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paused: "bg-ink-100 text-ink-500 border-ink-200",
  na: "bg-ink-100 text-ink-400 border-ink-200",
};

function slaText(s: SlaInfo) {
  const what = s.kind === "first" ? "پاسخ" : "رفع";
  switch (s.state) {
    case "breached":
      return `نقض SLA ${what} · ${fmtDur(-s.remaining)} تأخیر`;
    case "met":
      return `${what} در ${fmtDur(s.elapsed)}`;
    case "paused":
      return `${what}: متوقف (منتظر کاربر)`;
    case "na":
      return `${what}: —`;
    default:
      return `${what}: ${fmtDur(s.remaining)} مانده`;
  }
}
const slaIcon = (s: SlaInfo) => (s.state === "breached" ? AlertTriangle : s.state === "met" ? CheckCircle2 : s.state === "paused" ? PauseCircle : Timer);

/** شاخص فشرده برای فهرست: مهم‌ترین ساعتِ در جریان */
export function SlaPill({ t, now }: { t: Ticket; now: number }) {
  if (t.status === "closed" || t.status === "rejected" || t.status === "resolved") return null;
  const f = slaFirst(t, now);
  const s = f.state === "met" || f.state === "na" ? slaResolve(t, now) : f;
  const Icon = slaIcon(s);
  const short = (m: number) => (m < 60 ? `${fa(Math.max(0, Math.round(m)))} دقیقه` : m < 48 * 60 ? `${fa(Math.round(m / 60))} ساعت` : `${fa(Math.round(m / 1440))} روز`);
  const label = s.state === "breached" ? "نقض SLA" : s.state === "paused" ? "SLA متوقف" : `${short(s.remaining)} مانده`;
  return (
    <span className={`inline-flex items-center gap-1 text-[10.5px] border rounded-full px-2 py-0.5 whitespace-nowrap ${slaStyle[s.state]}`} title={slaText(s)}>
      <Icon size={11} />
      {label}
    </span>
  );
}

/** دو ساعت SLA با نوار پیشرفت — در جزئیات تیکت */
export function SlaPanel({ t, now }: { t: Ticket; now: number }) {
  const rows = [slaFirst(t, now), slaResolve(t, now)];
  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map((s) => {
        const Icon = slaIcon(s);
        const pct = Math.min(100, Math.round((s.elapsed / Math.max(1, s.target)) * 100));
        const bar = s.state === "breached" ? "bg-rose-500" : s.state === "risk" ? "bg-amber-500" : s.state === "met" ? "bg-emerald-500" : "bg-brand-500";
        return (
          <div key={s.kind} className={`rounded-lg border px-3 py-2 ${slaStyle[s.state]}`}>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-medium">{s.kind === "first" ? "اولین پاسخ" : "زمان رفع"}</span>
              <span className="opacity-80">هدف {fmtDur(s.target)}</span>
            </div>
            <p className="text-[12px] font-bold mt-1 flex items-center gap-1">
              <Icon size={12} className="shrink-0" />
              <span className="truncate">{slaText(s)}</span>
            </p>
            <div className="h-1 rounded-full bg-ink-200/70 mt-1.5 overflow-hidden">
              <div className={`h-full ${bar}`} style={{ width: `${s.state === "na" ? 0 : pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Stars({ value, onChange, size = 18 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onMouseEnter={() => onChange && setHover(n)}
          onClick={() => onChange?.(n)}
          aria-label={`${fa(n)} از ۵`}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star size={size} className={n <= shown ? "fill-amber-400 text-amber-400" : "text-ink-300"} />
        </button>
      ))}
    </span>
  );
}

export const ratingLabel = ["", "خیلی ناراضی", "ناراضی", "معمولی", "راضی", "خیلی راضی"];

export type PickedFile = { name: string; size: number };

/** انتخاب فایل — فقط نام و حجم نگه داشته می‌شود (نمونه‌ی اولیه بدون سرور) */
export function FilePicker({ files, onChange, label = "پیوست فایل" }: { files: PickedFile[]; onChange: (f: PickedFile[]) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <input
        ref={ref}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: f.size }));
          onChange([...files, ...list.filter((x) => !files.some((y) => y.name === x.name))]);
          e.target.value = "";
        }}
      />
      <button type="button" onClick={() => ref.current?.click()} className="inline-flex items-center gap-1 text-[12px] text-ink-600 hover:text-brand-700 border border-dashed border-ink-300 rounded-lg px-2.5 py-1.5">
        <Paperclip size={13} /> {label}
      </button>
      {files.map((f) => (
        <span key={f.name} className="inline-flex items-center gap-1 text-[11px] bg-ink-100 text-ink-700 rounded-md px-2 py-1 max-w-[180px]">
          <span className="truncate" dir="ltr">
            {f.name}
          </span>
          <button type="button" onClick={() => onChange(files.filter((x) => x.name !== f.name))} aria-label="حذف پیوست" className="shrink-0 text-ink-400 hover:text-rose-600">
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  );
}

/** ورود برچسب‌ها: با Enter یا ویرگول اضافه می‌شود */
export function LabelsInput({ value, onChange, suggestions = [] }: { value: string[]; onChange: (v: string[]) => void; suggestions?: string[] }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const v = raw.replace(/[،,]/g, "").trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };
  const rest = suggestions.filter((s) => !value.includes(s)).slice(0, 6);
  return (
    <div>
      <div className="input-field flex items-center gap-1 flex-wrap min-h-[38px] py-1">
        {value.map((l) => (
          <span key={l} className="inline-flex items-center gap-1 text-[11px] bg-brand-50 text-brand-700 rounded-md px-1.5 py-0.5">
            {l}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== l))} aria-label={`حذف ${l}`}>
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => (/[،,]$/.test(e.target.value) ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? "" : "برچسب + Enter"}
          className="flex-1 min-w-[90px] bg-transparent outline-none text-[13px]"
        />
      </div>
      {rest.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mt-1.5">
          {rest.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="text-[10.5px] text-ink-500 hover:text-brand-700 bg-ink-100 rounded px-1.5 py-0.5">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-ink-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[10.5px] text-ink-400 mt-1">{hint}</span>}
    </label>
  );
}
