import { Globe2, Lock } from "lucide-react";
import type { Visibility } from "../../data/mock";
import Badge from "./Badge";

export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  return visibility === "عمومی" ? (
    <Badge tone="success" icon={<Globe2 size={10} />}>
      عمومی
    </Badge>
  ) : (
    <Badge tone="neutral" icon={<Lock size={10} />}>
      خصوصی
    </Badge>
  );
}

export function VisibilityPicker({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  return (
    <div>
      <label className="field-label block mb-1.5">سطح دسترسی</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange("عمومی")}
          className={`flex-1 flex items-center justify-center gap-1.5 text-[13px] min-h-10 px-2 rounded-[10px] border transition-colors ${
            value === "عمومی" ? "border-teal-700 bg-teal-50 text-teal-700 font-bold" : "border-ink-200 text-ink-600 hover:bg-ink-50"
          }`}
        >
          <Globe2 size={16} strokeWidth={1.5} /> عمومی — همه‌ی اعضا ببینند
        </button>
        <button
          onClick={() => onChange("خصوصی")}
          className={`flex-1 flex items-center justify-center gap-1.5 text-[13px] min-h-10 px-2 rounded-[10px] border transition-colors ${
            value === "خصوصی" ? "border-teal-700 bg-teal-50 text-teal-700 font-bold" : "border-ink-200 text-ink-600 hover:bg-ink-50"
          }`}
        >
          <Lock size={16} strokeWidth={1.5} /> خصوصی — محدود
        </button>
      </div>
    </div>
  );
}

export function VisibilityToggle({
  visibility,
  onChange,
  size = "sm",
}: {
  visibility: Visibility;
  onChange: () => void;
  size?: "sm" | "xs";
}) {
  const isPublic = visibility === "عمومی";
  const pad = size === "xs" ? "h-6 px-2 text-[11.5px]" : "h-7 px-2.5 text-xs";
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      title={isPublic ? "تبدیل به خصوصی" : "تبدیل به عمومی (نمایش در تب محتوای عمومی داشبورد)"}
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${pad} ${
        isPublic ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-ink-200 bg-ink-50 text-ink-600 hover:bg-ink-100"
      }`}
    >
      {isPublic ? <Globe2 size={size === "xs" ? 10 : 12} /> : <Lock size={size === "xs" ? 10 : 12} />}
      {visibility}
    </button>
  );
}
