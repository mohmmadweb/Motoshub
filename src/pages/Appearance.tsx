import { Palette, Sun, Moon, MonitorSmartphone, Type, Check, Sparkles, Building2 } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Tabs from "../components/ui/Tabs";
import BrandingPanel from "../components/BrandingPanel";
import { useTheme, accentPresets, type ThemeMode, type FontScale } from "../context/ThemeContext";
import { useToast } from "../components/ui/ToastProvider";
import { useTabParam } from "../lib/useTabParam";

const modeOptions: { id: ThemeMode; label: string; desc: string; icon: typeof Sun }[] = [
  { id: "light", label: "روشن", desc: "پس‌زمینه روشن — مناسب محیط‌های پرنور", icon: Sun },
  { id: "dark", label: "تیره", desc: "چشم‌نواز در شب و محیط کم‌نور", icon: Moon },
  { id: "system", label: "هماهنگ با سیستم", desc: "پیروی خودکار از تنظیم دستگاه شما", icon: MonitorSmartphone },
];

const fontOptions: { id: FontScale; label: string; desc: string }[] = [
  { id: "normal", label: "استاندارد", desc: "چگالی پیش‌فرض سامانه" },
  { id: "large", label: "بزرگ", desc: "متن‌های درشت‌تر برای خوانایی بیشتر" },
];

export default function Appearance() {
  const [tab, setTab] = useTabParam<"me" | "org">("me", ["me", "org"]);
  return (
    <div>
      <PageHeader
        title="ظاهر و برندسازی"
        description="تنظیمات ظاهری شخصی شما، و برندسازی سطح سازمان (ویژه راهبر) — همه در یک‌جا"
        icon={<Palette size={18} />}
      />
      <Tabs
        tabs={[
          { id: "me", label: "ظاهر من (شخصی)" },
          { id: "org", label: "برندسازی سازمان (راهبر)" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "me" ? <MyAppearanceTab /> : (
        <div className="space-y-3">
          <div className="card p-3.5 bg-brand-50 border-brand-200 flex items-center gap-2.5 text-xs text-brand-800">
            <Building2 size={15} className="shrink-0" />
            این تنظیمات برای کل سازمان اعمال می‌شود و فقط راهبران به آن دسترسی دارند. (همین بخش در «پنل راهبری ← برندسازی سازمان» نیز در دسترس است.)
          </div>
          <BrandingPanel />
        </div>
      )}
    </div>
  );
}

function MyAppearanceTab() {
  const { mode, setMode, accent, setAccent, fontScale, setFontScale, resolved } = useTheme();
  const { notify } = useToast();

  return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        <div className="space-y-5">
          {/* حالت نمایش */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink-900 mb-1 flex items-center gap-1.5">
              {resolved === "dark" ? <Moon size={15} className="text-brand-600" /> : <Sun size={15} className="text-brand-600" />}
              حالت نمایش
            </h3>
            <p className="text-xs text-ink-400 mb-4">تغییر بلافاصله روی کل سامانه اعمال و برای شما ذخیره می‌شود.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {modeOptions.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id);
                    notify(`حالت نمایش «${m.label}» فعال شد.`, "info");
                  }}
                  aria-pressed={mode === m.id}
                  className={`rounded-xl border-2 p-4 text-right transition-colors ${
                    mode === m.id ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:border-ink-300"
                  }`}
                >
                  <span className="flex items-center justify-between mb-2">
                    <m.icon size={18} className={mode === m.id ? "text-brand-600" : "text-ink-400"} />
                    {mode === m.id && <Check size={15} className="text-brand-600" />}
                  </span>
                  <span className="block text-[13px] font-bold text-ink-900">{m.label}</span>
                  <span className="block text-[11.5px] text-ink-400 mt-0.5 leading-5">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* رنگ برند */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink-900 mb-1 flex items-center gap-1.5">
              <Sparkles size={15} className="text-brand-600" /> رنگ برند
            </h3>
            <p className="text-xs text-ink-400 mb-4">
              رنگ اصلی دکمه‌ها، لینک‌ها و حالت‌های فعال. راهبر سازمان می‌تواند رنگ پیش‌فرض سازمان را از «پنل راهبری ← برندسازی» تعیین کند.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {accentPresets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setAccent(p.id);
                    notify(`رنگ برند به «${p.label}» تغییر کرد.`, "info");
                  }}
                  title={p.label}
                  aria-pressed={accent === p.id}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border-2 transition-colors ${
                    accent === p.id ? "border-brand-500 bg-brand-50" : "border-transparent hover:bg-ink-50"
                  }`}
                >
                  <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: p.swatch }}>
                    {accent === p.id && <Check size={16} className="text-white" />}
                  </span>
                  <span className="text-[11px] font-medium text-ink-700">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* اندازه متن */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink-900 mb-1 flex items-center gap-1.5">
              <Type size={15} className="text-brand-600" /> اندازه متن
            </h3>
            <p className="text-xs text-ink-400 mb-4">برای خوانایی بهتر، متن‌های ریز سامانه را درشت‌تر کنید.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fontOptions.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFontScale(f.id);
                    notify(`اندازه متن «${f.label}» اعمال شد.`, "info");
                  }}
                  aria-pressed={fontScale === f.id}
                  className={`rounded-xl border-2 p-4 text-right transition-colors ${
                    fontScale === f.id ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:border-ink-300"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-ink-900">{f.label}</span>
                    {fontScale === f.id && <Check size={15} className="text-brand-600" />}
                  </span>
                  <span className="block text-[11.5px] text-ink-400 mt-0.5">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* پیش‌نمایش زنده */}
        <div className="card p-4 h-fit sticky top-20">
          <p className="text-xs font-bold text-ink-900 mb-3">پیش‌نمایش زنده</p>
          <div className="rounded-xl border border-ink-200 overflow-hidden">
            <div className="h-9 bg-brand-600 flex items-center gap-2 px-3">
              <span className="w-4 h-4 rounded bg-white/30" />
              <span className="text-white text-[11px] font-medium">سامانه سازمانی</span>
            </div>
            <div className="p-3 bg-ink-50 space-y-2.5">
              <p className="text-[12.5px] font-bold text-ink-900">نمونه تیتر محتوا</p>
              <p className="text-[11.5px] text-ink-500 leading-5">این یک متن نمونه برای مشاهده‌ی خوانایی رنگ و اندازه است.</p>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] text-white bg-brand-600 rounded-md px-2.5 py-1.5 font-medium">دکمه اصلی</span>
                <span className="text-[10.5px] text-brand-700 bg-brand-50 border border-brand-200 rounded-md px-2.5 py-1.5 font-medium">دکمه دوم</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge tone="success">موفق</Badge>
                <Badge tone="warning">هشدار</Badge>
                <Badge tone="brand">برند</Badge>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-ink-400 mt-3 leading-5">
            تنظیمات فقط برای حساب شما ذخیره می‌شود و روی سایر کاربران اثری ندارد.
          </p>
        </div>
      </div>
  );
}
