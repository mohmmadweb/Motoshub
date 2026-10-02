// ---------------------------------------------------------------------------
// Drill-down: با کلیک روی میله/برش/خانه‌ی جدول متقاطع/گروه جدول، ردیف‌های زیربنایی
// همان دسته در کشوی کناری فهرست می‌شوند و هر ردیف به رکورد اصلی‌اش پیوند دارد.
// (کشو بالای پنجره‌ی گزارش‌ساز باز می‌شود؛ z-index بالاتر از Modal)
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ChevronLeft, ExternalLink, Search, X } from "lucide-react";
import { faNum, formatValue } from "./engine";
import { rowLink } from "./sources";
import type { DataSource, Field, Row, RowValue } from "./types";

export type DrillPick = { title: string; rows: Row[] };

/** رویداد سراسری: هنگام رفتن به یک رکورد، پنجره‌ی گزارش‌ساز هم بسته شود */
export const REPORT_NAVIGATE_EVENT = "motoshub:report-navigate";

const TITLE_KEYS = ["title", "name", "subject", "question", "event", "topic", "user", "member", "chat"];

function show(v: RowValue, f?: Field): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join("، ") : "—";
  if (typeof v === "boolean") return v ? "بله" : "خیر";
  if (typeof v === "number") return formatValue(v, f?.format ?? "number", f?.format === "rial");
  return String(v);
}

export function DrillDrawer({ pick, source, onClose }: { pick: DrillPick | null; source?: DataSource; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(60);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  const open = !!pick;
  useEffect(() => {
    setQ("");
    setLimit(60);
  }, [pick]);
  useEffect(() => {
    if (!open) return;
    // Esc فقط همین کشو را می‌بندد، نه پنجره‌ی گزارش‌ساز زیرش را
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  const fields = source?.fields ?? [];
  const titleKey = TITLE_KEYS.find((k) => fields.some((f) => f.key === k)) ?? fields.find((f) => f.type === "dimension" && f.kind === "string")?.key;
  const metaFields = fields.filter((f) => f.key !== titleKey && f.type !== "measure").slice(0, 3);
  const measureField = fields.find((f) => f.type === "measure");
  const rows = useMemo(() => {
    if (!pick) return [];
    const t = q.trim();
    if (!t) return pick.rows;
    return pick.rows.filter((r) => Object.values(r).some((v) => (Array.isArray(v) ? v.join(" ") : String(v ?? "")).includes(t)));
  }, [pick, q]);

  if (!pick) return null;
  const navigate = () => {
    window.dispatchEvent(new CustomEvent(REPORT_NAVIGATE_EVENT));
    onClose();
  };
  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end" dir="rtl" role="dialog" aria-modal="true" aria-label={`ردیف‌های «${pick.title}»`}>
      <div className="absolute inset-0 bg-ink-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in">
        <div className="flex items-start justify-between gap-2 px-4 py-3.5 border-b border-ink-100">
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-ink-900 truncate">{pick.title}</h2>
            <p className="text-[11px] text-ink-500 mt-0.5">
              {faNum(pick.rows.length)} {source?.rowNoun ?? "رکورد"} · {source?.label}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="بستن" className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center shrink-0">
            <X size={16} />
          </button>
        </div>
        {pick.rows.length > 8 && (
          <div className="px-4 pt-3">
            <label className="flex items-center gap-2 input-field !py-1.5">
              <Search size={13} className="text-ink-400 shrink-0" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در همین ردیف‌ها…" className="flex-1 min-w-0 bg-transparent outline-none text-xs" />
            </label>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {rows.length === 0 && <p className="text-xs text-ink-400 text-center py-8">ردیفی پیدا نشد.</p>}
          {rows.slice(0, limit).map((r, i) => {
            const to = rowLink(source, r);
            const body = (
              <>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] text-ink-900 truncate">{titleKey ? show(r[titleKey]) : `ردیف ${faNum(i + 1)}`}</span>
                  <span className="block text-[10.5px] text-ink-500 truncate">
                    {metaFields
                      .map((f) => show(r[f.key], f))
                      .filter((x) => x !== "—")
                      .join(" · ")}
                  </span>
                </span>
                {measureField && typeof r[measureField.key] === "number" && <span className="text-[11px] text-ink-600 shrink-0">{show(r[measureField.key], measureField)}</span>}
                {to && <ChevronLeft size={14} className="text-ink-400 shrink-0" />}
              </>
            );
            return to ? (
              <Link key={i} to={to} onClick={navigate} className="flex items-center gap-2 rounded-lg border border-ink-100 px-2.5 py-2 hover:border-brand-300 hover:bg-brand-50/40">
                {body}
              </Link>
            ) : (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-ink-100 px-2.5 py-2">
                {body}
              </div>
            );
          })}
          {rows.length > limit && (
            <button type="button" onClick={() => setLimit((l) => l + 100)} className="w-full text-[11.5px] text-brand-700 font-medium py-2">
              نمایش {faNum(Math.min(100, rows.length - limit))} ردیف دیگر
            </button>
          )}
        </div>
        {!fields.length || rows.some((r) => rowLink(source, r)) ? null : (
          <p className="text-[10.5px] text-ink-400 px-4 pb-3 flex items-center gap-1">
            <ExternalLink size={11} /> ردیف‌های این منبع صفحه‌ی جزئیات جداگانه ندارند.
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}
