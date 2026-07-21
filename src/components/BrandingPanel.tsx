import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { currentTenant } from "../data/mock";
import { useTheme, accentPresets } from "../context/ThemeContext";
import Button from "./ui/Button";
import { useToast } from "./ui/ToastProvider";

// برندسازی سطح سازمان (ویژه راهبر): رنگ برند پیش‌فرض، لوگو، دامنه، نام نمایشی
// — به‌صورت مشترک در «پنل راهبری ← برندسازی» و «شخصی‌سازی ظاهر» استفاده می‌شود
export default function BrandingPanel() {
  const { accent, setAccent } = useTheme();
  const { notify } = useToast();
  const [domain, setDomain] = useState(currentTenant.domain);
  const [displayName, setDisplayName] = useState("بنیاد مستضعفان");
  const [logoName, setLogoName] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const activePreset = accentPresets.find((p) => p.id === accent) ?? accentPresets[0];
  const color = activePreset.swatch;

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoName(file.name);
    notify(`لوگوی «${file.name}» بارگذاری شد. پس از ذخیره در سراسر سازمان «${currentTenant.name}» اعمال می‌شود.`, "info");
    e.target.value = "";
  };

  const save = () => notify(`تغییرات برندسازی سازمان «${currentTenant.name}» ذخیره شد.`);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      <div className="card p-5 space-y-5">
        <div>
          <label className="text-xs font-medium text-ink-600 block mb-2">رنگ اصلی برند</label>
          <div className="flex items-center gap-2">
            {accentPresets.map((p) => (
              <button
                key={p.id}
                title={p.label}
                aria-label={`رنگ برند ${p.label}`}
                onClick={() => {
                  setAccent(p.id);
                  notify(`رنگ برند سازمان به «${p.label}» تغییر کرد و بلافاصله روی کل سامانه اعمال شد.`, "success");
                }}
                className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${accent === p.id ? "border-ink-900" : "border-transparent"}`}
                style={{ backgroundColor: p.swatch }}
              />
            ))}
          </div>
          <p className="text-[11px] text-ink-400 mt-2">تغییر رنگ به‌صورت زنده روی دکمه‌ها، لینک‌ها و حالت‌های فعال کل سامانه اعمال می‌شود.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-600 block mb-2">لوگوی سازمان</label>
          <input ref={logoInputRef} type="file" accept="image/png,image/svg+xml" className="hidden" onChange={handleLogo} />
          <button onClick={() => logoInputRef.current?.click()} className="flex items-center gap-2 border border-dashed border-ink-300 rounded-lg px-4 py-3 text-xs text-ink-500 hover:border-brand-400">
            <Upload size={14} /> {logoName ?? "بارگذاری فایل PNG/SVG"}
          </button>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-600 block mb-2">دامنه‌ی اختصاصی</label>
          <input value={domain} onChange={(e) => setDomain(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-600 block mb-2">نام نمایشی پلتفرم برای این سازمان</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-field" />
        </div>
        <Button variant="primary" onClick={save}>ذخیره‌ی برندسازی</Button>
      </div>

      <div className="card p-0 overflow-hidden h-fit">
        <p className="text-[11px] text-ink-400 px-3 pt-3">پیش‌نمایش زنده</p>
        <div className="p-3">
          <div className="rounded-lg overflow-hidden border border-ink-200">
            <div className="h-9 flex items-center gap-2 px-3" style={{ backgroundColor: color }}>
              <span className="w-4 h-4 rounded bg-white/30" />
              <span className="text-white text-[11px] font-medium">{displayName}</span>
            </div>
            <div className="p-3 bg-ink-50 space-y-2">
              <div className="h-2 w-3/4 rounded bg-ink-200" />
              <div className="h-2 w-1/2 rounded bg-ink-200" />
              <button className="text-[10px] text-white rounded px-2 py-1 mt-1" style={{ backgroundColor: color }}>
                دکمه‌ی نمونه
              </button>
            </div>
          </div>
          <p className="text-[11px] text-ink-400 mt-2 truncate">دامنه: {domain}</p>
        </div>
      </div>
    </div>
  );
}
