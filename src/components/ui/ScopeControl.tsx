import { Building2, Globe2, Network } from "lucide-react";
import Badge from "./Badge";
import { useTenancy } from "../../context/TenancyContext";
import type { ContentScope, Scoped } from "../../data/tenancy";

const scopeIcon: Record<ContentScope, typeof Globe2> = { سراسری: Globe2, هلدینگ: Network, شرکت: Building2 };
const scopeTone = { سراسری: "brand", هلدینگ: "navy", شرکت: "warning" } as const;

/** برچسب فشرده‌ی مالکِ یک آیتم — برای ردیف‌ها و کارت‌های فهرست */
export function ScopeBadge({ item }: { item: Scoped }) {
  const { ownerLabel } = useTenancy();
  const scope = item.scope ?? "سراسری";
  const Icon = scopeIcon[scope];
  return (
    <Badge tone={scopeTone[scope]} icon={<Icon size={10} />}>
      {ownerLabel(item)}
    </Badge>
  );
}

/**
 * انتخاب دامنه‌ی انتشار در فرم ساخت/ویرایش.
 * مقدار را به‌صورت یک شیء Scoped می‌گیرد و برمی‌گرداند.
 */
export function ScopePicker({ value, onChange }: { value: Scoped; onChange: (next: Scoped) => void }) {
  const { holdings, companies, companiesOf } = useTenancy();
  const scope = value.scope ?? "سراسری";

  const pickScope = (next: ContentScope) => {
    if (next === "سراسری") return onChange({ scope: "سراسری" });
    if (next === "هلدینگ") return onChange({ scope: "هلدینگ", holdingId: value.holdingId ?? holdings[0]?.id });
    const c = companies.find((x) => x.id === value.companyId) ?? companiesOf(value.holdingId ?? holdings[0]?.id)[0] ?? companies[0];
    return onChange({ scope: "شرکت", holdingId: c?.holdingId, companyId: c?.id });
  };

  return (
    <div>
      <label className="text-xs font-medium text-ink-600 block mb-1.5">دامنه‌ی انتشار</label>
      <div className="grid grid-cols-3 gap-2">
        {(["سراسری", "هلدینگ", "شرکت"] as ContentScope[]).map((s) => {
          const Icon = scopeIcon[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => pickScope(s)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors ${
                scope === s ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600 hover:bg-ink-50"
              }`}
            >
              <Icon size={13} /> {s}
            </button>
          );
        })}
      </div>

      {scope === "هلدینگ" && (
        <select
          value={value.holdingId ?? ""}
          onChange={(e) => onChange({ scope: "هلدینگ", holdingId: e.target.value })}
          className="input-field mt-2"
          aria-label="انتخاب هلدینگ"
        >
          {holdings.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      )}

      {scope === "شرکت" && (
        <select
          value={value.companyId ?? ""}
          onChange={(e) => {
            const c = companies.find((x) => x.id === e.target.value);
            onChange({ scope: "شرکت", holdingId: c?.holdingId, companyId: c?.id });
          }}
          className="input-field mt-2"
          aria-label="انتخاب شرکت"
        >
          {holdings.map((h) => (
            <optgroup key={h.id} label={h.name}>
              {companiesOf(h.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      )}

      <p className="text-[10.5px] text-ink-400 mt-1.5 leading-4">
        {scope === "سراسری"
          ? "برای همه‌ی هلدینگ‌ها و شرکت‌ها قابل مشاهده است."
          : scope === "هلدینگ"
            ? "فقط اعضای شرکت‌های همین هلدینگ می‌بینند."
            : "فقط اعضای همین شرکت می‌بینند."}
      </p>
    </div>
  );
}
