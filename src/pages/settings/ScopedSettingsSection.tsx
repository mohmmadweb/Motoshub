// ---------------------------------------------------------------------------
// «برند و تنظیمات لایه‌ای» — هر هلدینگ/شرکت می‌تواند برند (نام، رنگ، لوگو) و چند تنظیم را
// بازنویسی کند. وضعیت هر مورد: ارث‌رسیده / بازنویسی‌شده / قفل‌شده (والد اجازه‌ی بازنویسی نداده).
// واحدِ موردِ تنظیم = کانتکست فعلی (انتخابگر بالای «تنظیمات سامانه»).
// ---------------------------------------------------------------------------
import { useRef, useState, type ReactNode } from "react";
import { Lock, LockOpen, Palette, RotateCcw, Upload } from "lucide-react";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useEffectiveBranding, useScopedSettings } from "../../iam/hooks";
import { scopedMeta, statusLabel, type ScopedMeta, type ScopedStatus, type ScopedValue } from "../../iam/scopedSettings";
import { Callout, SectionHead, fmtN } from "./iam/shared";
import { BrandMark } from "../../iam/BrandMark";

const tone: Record<ScopedStatus, BadgeTone> = { root: "navy", inherited: "neutral", overridden: "brand", locked: "warning" };
const SWATCHES = ["#1f4f99", "#0d9488", "#b45309", "#7c3aed", "#be123c", "#0f172a", "#1d4ed8", "#15803d"];

export default function ScopedSettingsSection() {
  const t = useTenancy();
  const ss = useScopedSettings();
  const brand = useEffectiveBranding();
  const hasChildren = t.iam.scopes.some((s) => s.parentId === t.contextId);

  const group = (g: ScopedMeta["group"], title: string) => (
    <div className="card overflow-hidden">
      <p className="px-4 py-2.5 border-b border-ink-100 text-[12.5px] font-bold text-ink-800 bg-ink-50">{title}</p>
      <ul className="divide-y divide-ink-100">
        {scopedMeta
          .filter((m) => m.group === g)
          .map((m) => (
            <Row key={m.key} meta={m} hasChildren={hasChildren} />
          ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-4">
      <SectionHead icon={<Palette size={18} />} title="برند و تنظیمات لایه‌ای" description={`تنظیمات «${t.contextNode.name}». مقدارها از لایه‌ی بالاتر به ارث می‌رسند مگر اینکه اینجا بازنویسی شوند؛ قفل در هر لایه بازنویسی زیرمجموعه‌ها را می‌بندد.`} />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          {group("brand", "برند")}
          {group("behavior", "رفتار سامانه")}
        </div>
        <div className="card p-3 lg:sticky lg:top-20">
          <p className="text-[11px] text-ink-400 mb-2">پیش‌نمایش سربرگ در این واحد</p>
          <div className="rounded-lg overflow-hidden border border-ink-200">
            <div className="flex items-center gap-2 px-3 h-14 bg-navy-900" style={{ boxShadow: `inset 0 -3px 0 ${brand.color}` }}>
              <BrandMark logo={brand.logo} initials={brand.initials} color={brand.color} />
              <div className="min-w-0">
                <p className="text-[11.5px] font-bold text-white truncate">{brand.name}</p>
                <p className="text-[10px] text-navy-300 truncate">{brand.tagline}</p>
              </div>
            </div>
            <div className="p-3 bg-ink-50 space-y-2">
              <div className="h-2 w-3/4 rounded bg-ink-200" />
              <div className="h-2 w-1/2 rounded bg-ink-200" />
              <span className="inline-block text-[10px] text-white rounded px-2 py-1" style={{ background: brand.color }}>
                دکمه‌ی نمونه
              </span>
            </div>
          </div>
          <p className="text-[10.5px] text-ink-400 mt-2 leading-5">نام برند از «{brand.sourceScopeId ? t.scopeLabel(brand.sourceScopeId) : "پیش‌فرض سامانه"}» آمده است.</p>
        </div>
      </div>
      {ss.state && Object.keys(ss.state.byScope).length > 0 && (
        <Callout tone="neutral">
          {fmtN(Object.keys(ss.state.byScope).length)} واحد تنظیم اختصاصی دارند. برای تنظیم هلدینگ یا شرکت دیگر، از انتخابگر «واحد تحت مدیریت» بالای همین صفحه واحد را عوض کنید.
        </Callout>
      )}
    </div>
  );
}

function Row({ meta, hasChildren }: { meta: ScopedMeta; hasChildren: boolean }) {
  const t = useTenancy();
  const ss = useScopedSettings();
  const { notify } = useToast();
  const r = ss.resolve(meta.key);
  const c = ss.canEdit(meta.key);
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null);
  const apply = (v: ScopedValue) => {
    const res = ss.setValue(meta.key, v);
    if (!res.ok) notify(res.reason, "warning");
  };
  const commitText = () => {
    if (text === null) return;
    const v = meta.type === "number" ? Math.max(0, Number(text) || 0) : text.trim();
    setText(null);
    if (v !== r.value) apply(v);
  };
  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 200 * 1024) return notify("حجم لوگو باید کمتر از ۲۰۰ کیلوبایت باشد.", "warning");
    const rd = new FileReader();
    rd.onload = () => apply(String(rd.result));
    rd.readAsDataURL(f);
  };

  let editor: ReactNode;
  if (meta.type === "bool") editor = <Toggle on={!!r.value} disabled={!c.ok} onChange={() => apply(!r.value)} label={meta.label} />;
  else if (meta.type === "color")
    editor = (
      <div className="flex items-center gap-1.5 flex-wrap">
        {SWATCHES.map((sw) => (
          <button key={sw} type="button" disabled={!c.ok} onClick={() => apply(sw)} aria-label={`رنگ ${sw}`} className={`w-6 h-6 rounded-md border-2 disabled:cursor-not-allowed ${r.value === sw ? "border-ink-900" : "border-transparent"}`} style={{ background: sw }} />
        ))}
        <input type="color" disabled={!c.ok} value={String(r.value)} onChange={(e) => apply(e.target.value)} className="w-7 h-7 rounded border border-ink-200 disabled:opacity-50" aria-label="رنگ دلخواه" />
      </div>
    );
  else if (meta.type === "logo")
    editor = (
      <div className="flex items-center gap-2 flex-wrap">
        <BrandMark logo={String(r.value)} initials="—" color="#94a3b8" size={32} />
        <input ref={fileRef} type="file" accept="image/png,image/svg+xml" className="hidden" onChange={onLogo} />
        <button type="button" disabled={!c.ok} onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 border border-dashed border-ink-300 rounded-lg px-2.5 py-1.5 text-[11.5px] text-ink-500 hover:border-brand-400 disabled:opacity-50 disabled:cursor-not-allowed">
          <Upload size={12} /> بارگذاری
        </button>
        {r.value !== "" && (
          <button type="button" disabled={!c.ok} onClick={() => apply("")} className="text-[11.5px] text-ink-500 hover:text-ink-800 disabled:opacity-50">
            حروف اول نام
          </button>
        )}
      </div>
    );
  else
    editor = (
      <div className="flex items-center gap-1.5">
        <input
          className="input-field"
          type={meta.type === "number" ? "number" : "text"}
          disabled={!c.ok}
          value={text ?? String(r.value)}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => e.key === "Enter" && commitText()}
          aria-label={meta.label}
        />
        {meta.unit && <span className="text-[11px] text-ink-400 shrink-0">{meta.unit}</span>}
      </div>
    );

  const canLock = hasChildren && c.ok;
  return (
    <li className="px-4 py-3 grid grid-cols-1 sm:grid-cols-[150px_minmax(0,1fr)_auto] gap-x-3 gap-y-2 items-center">
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-ink-800">{meta.label}</p>
        <span className="flex items-center gap-1 mt-0.5 flex-wrap">
          <Badge tone={tone[r.status]}>{statusLabel[r.status]}</Badge>
          {r.status === "inherited" && <span className="text-[10.5px] text-ink-400 truncate">از {r.source ? t.scopeLabel(r.source) : "پیش‌فرض"}</span>}
          {r.status === "locked" && <span className="text-[10.5px] text-amber-700 truncate">توسط {t.scopeLabel(r.lockedBy)}</span>}
        </span>
      </div>
      <div className="min-w-0" title={c.ok ? meta.hint : c.reason}>
        {editor}
        {meta.hint && <p className="text-[10.5px] text-ink-400 mt-1">{meta.hint}</p>}
      </div>
      <div className="flex items-center gap-1 justify-end">
        {r.status === "overridden" && (
          <button type="button" disabled={!c.ok} onClick={() => ss.clearValue(meta.key)} title="برگشت به مقدار ارث‌رسیده" className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-500 hover:bg-ink-100 disabled:opacity-35">
            <RotateCcw size={14} />
          </button>
        )}
        {hasChildren && (
          <button
            type="button"
            disabled={!canLock}
            onClick={() => {
              const below = ss.overriddenBelow(meta.key);
              const res = ss.setLock(meta.key, !r.lockedHere);
              if (!res.ok) return notify(res.reason, "warning");
              notify(r.lockedHere ? "قفل برداشته شد؛ زیرمجموعه‌ها می‌توانند بازنویسی کنند." : `قفل شد${below.length ? `؛ بازنویسی ${fmtN(below.length)} زیرمجموعه دیگر اثر ندارد` : ""}.`, "success");
            }}
            title={r.lockedHere ? "برداشتن قفل برای زیرمجموعه‌ها" : "قفل برای زیرمجموعه‌ها (اجازه‌ی بازنویسی ندهند)"}
            className={`w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-35 ${r.lockedHere ? "bg-amber-50 text-amber-700" : "text-ink-500 hover:bg-ink-100"}`}
          >
            {r.lockedHere ? <Lock size={14} /> : <LockOpen size={14} />}
          </button>
        )}
      </div>
    </li>
  );
}
