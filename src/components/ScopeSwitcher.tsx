import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Eye, Globe2, Network } from "lucide-react";
import { useTenancy } from "../context/TenancyContext";

/**
 * سوییچر دامنه — کل اپ را روی «کل سیستم»، یک هلدینگ، یا یک شرکت متمرکز می‌کند.
 * راهبر با همین کنترل «مشاهده به‌عنوان» را هم انجام می‌دهد.
 */
export default function ScopeSwitcher() {
  const { identity, holdings, companiesOf, activeHoldingId, activeCompanyId, setScope, activeScopeLabel, isViewingAs } = useTenancy();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (holdingId?: string, companyId?: string) => {
    setScope(holdingId, companyId);
    setOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="تغییر دامنه‌ی نمایش (هلدینگ / شرکت)"
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[12.5px] font-medium max-w-[210px] transition-colors ${
          isViewingAs
            ? "border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400"
            : "border-ink-200 bg-ink-50 text-ink-700 hover:border-ink-300"
        }`}
      >
        {isViewingAs ? <Eye size={14} className="shrink-0" /> : <Globe2 size={14} className="shrink-0" />}
        <span className="truncate">{activeScopeLabel}</span>
        <ChevronDown size={13} className="shrink-0 opacity-70" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="انتخاب دامنه"
          className="absolute top-full mt-1.5 left-0 w-72 max-h-[70vh] overflow-y-auto bg-white border border-ink-200 rounded-xl shadow-lg py-1.5 z-40"
        >
          <p className="px-3 py-1 text-[10px] font-semibold text-ink-400 uppercase tracking-wide">دامنه‌ی نمایش</p>

          <button
            onClick={() => pick(undefined, undefined)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] text-right hover:bg-ink-50 ${!activeHoldingId ? "text-brand-700 font-semibold" : "text-ink-700"}`}
          >
            <Globe2 size={14} className="shrink-0" />
            <span className="flex-1 truncate">کل {identity.shortName} (همه‌ی هلدینگ‌ها)</span>
            {!activeHoldingId && <Check size={14} className="shrink-0" />}
          </button>

          {holdings.filter((h) => h.active).map((h) => {
            const companies = companiesOf(h.id).filter((c) => c.active);
            const holdingActive = activeHoldingId === h.id && !activeCompanyId;
            return (
              <div key={h.id} className="mt-1 border-t border-ink-100 pt-1">
                <button
                  onClick={() => pick(h.id, undefined)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] text-right hover:bg-ink-50 ${holdingActive ? "text-brand-700 font-semibold" : "text-ink-700"}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
                  <Network size={13} className="shrink-0 opacity-70" />
                  <span className="flex-1 truncate">{h.name}</span>
                  {holdingActive && <Check size={14} className="shrink-0" />}
                </button>
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => pick(h.id, c.id)}
                    className={`w-full flex items-center gap-2 pr-9 pl-3 py-1.5 text-[12.5px] text-right hover:bg-ink-50 ${activeCompanyId === c.id ? "text-brand-700 font-semibold" : "text-ink-500"}`}
                  >
                    <Building2 size={12} className="shrink-0 opacity-70" />
                    <span className="flex-1 truncate">{c.name}</span>
                    {activeCompanyId === c.id && <Check size={13} className="shrink-0" />}
                  </button>
                ))}
              </div>
            );
          })}

          {isViewingAs && (
            <div className="mt-1 border-t border-ink-100 pt-1.5 px-3 pb-1">
              <p className="text-[10.5px] text-amber-700 leading-4">
                در حالت «مشاهده به‌عنوان» هستید — فهرست‌ها فقط محتوای این دامنه را نشان می‌دهند.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
