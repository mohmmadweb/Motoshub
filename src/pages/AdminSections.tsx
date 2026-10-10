import { useState } from "react";
import {
  SlidersHorizontal,
  HardDrive,
  Database,
  Trash2,
  RefreshCw,
  Archive,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Toggle from "../components/ui/Toggle";
import StatCard from "../components/ui/StatCard";
import { saveSystemVars, setMaintenance, systemVarAreaLabel, systemVarMeta, useSystemVars, type SystemVarArea } from "./settings/systemVars";

export type Notify = (message: string, tone?: "success" | "info" | "warning") => void;

/**
 * کارت متغیرهای سیستم برای یک یا چند حوزه — منبع واحد در systemVars.ts؛ همین کارت در
 * «تنظیمات کلی»، «ورود و احراز هویت ← نشست» و «اعلان‌ها و کانال‌ها» با حوزه‌ی خودش می‌آید.
 */
export function SystemVarsCard({ areas, notify, title, auditArea = "تنظیمات کلی", disabled = false }: { areas: SystemVarArea[]; notify: Notify; title?: string; auditArea?: string; disabled?: boolean }) {
  const saved = useSystemVars();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const dirty = Object.keys(draft).some((k) => draft[k] !== saved.values[k]);
  const save = () => {
    saveSystemVars(draft, auditArea);
    setDraft({});
    notify("متغیرها ذخیره شد و بدون نیاز به دیپلوی مجدد روی همه سرویس‌ها اعمال می‌شود.");
  };
  return (
    <div className="space-y-4">
      {areas.map((area, i) => {
        const items = systemVarMeta.filter((m) => m.area === area);
        return (
          <div key={area} className="card p-5">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
              <h4 className="text-sm font-bold text-ink-900">{i === 0 && title ? title : systemVarAreaLabel[area]}</h4>
              {i === 0 && (
                <div className="flex items-center gap-2">
                  {dirty && (
                    <Button variant="ghost" size="sm" onClick={() => setDraft({})}>
                      بازگردانی
                    </Button>
                  )}
                  <Button variant="primary" size="sm" onClick={save} disabled={!dirty || disabled}>
                    ذخیره تغییرات
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map((item) => (
                <div key={item.key}>
                  <label className="text-xs font-medium text-ink-600 block mb-1.5">{item.label}</label>
                  <input value={draft[item.key] ?? saved.values[item.key] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [item.key]: e.target.value }))} className="input-field" dir="ltr" aria-label={item.label} disabled={disabled} />
                  {item.hint && <p className="text-[11px] text-ink-400 mt-1">{item.hint}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SystemSection({ notify, areas = ["upload", "content"] }: { notify: Notify; areas?: SystemVarArea[] }) {
  const { maintenance } = useSystemVars();

  return (
    <div className="space-y-5">
      <div className="card p-4 flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg bg-navy-900 text-white flex items-center justify-center shrink-0">
          <SlidersHorizontal size={18} />
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-ink-900">متغیرهای سیستم</h3>
          <p className="text-xs text-ink-500 mt-1 leading-6">
            مقادیر ثابت سیستم از اینجا مدیریت می‌شوند — بدون تغییر کد و بدون دیپلوی مجدد. متغیرهای نشست و قفل حساب در «ورود و احراز هویت» و صف اعلان‌ها در «اعلان‌ها و کانال‌ها» است.
          </p>
        </div>
      </div>

      <SystemVarsCard areas={areas} notify={notify} />

      <div className="card p-4 flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <AlertTriangle size={18} />
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-900">حالت تعمیر و نگهداری</h3>
            <Toggle
              on={maintenance}
              label="حالت تعمیر و نگهداری"
              onChange={() => {
                setMaintenance(!maintenance);
                notify(!maintenance ? "حالت تعمیر فعال شد — فقط راهبران به سامانه دسترسی دارند." : "حالت تعمیر غیرفعال شد.", "info");
              }}
            />
          </div>
          <p className="text-xs text-ink-500 mt-2 leading-6">
            با فعال‌سازی، کاربران عادی صفحه‌ی «در حال به‌روزرسانی» می‌بینند و فقط راهبران وارد می‌شوند.
          </p>
        </div>
      </div>
    </div>
  );
}

const storageCategories = [
  { label: "پیوست‌ها و اسناد", sizeGb: 48.2, files: 12840, color: "bg-brand-600" },
  { label: "تصاویر و آواتارها", sizeGb: 21.6, files: 30125, color: "bg-emerald-500" },
  { label: "ویدئو و رسانه", sizeGb: 64.9, files: 1890, color: "bg-navy-700" },
  { label: "فایل‌های موقت", sizeGb: 3.1, files: 4210, color: "bg-amber-500" },
  { label: "نسخه‌های پشتیبان", sizeGb: 38.4, files: 42, color: "bg-rose-500" },
];

const topConsumers = [
  { id: "s1", name: "گروه ستاد محرومیت‌زدایی", type: "گروه", sizeGb: 18.4 },
  { id: "s2", name: "آرشیو رسانه روابط عمومی", type: "رسانه", sizeGb: 14.2 },
  { id: "s3", name: "بنیاد علوی", type: "سازمان", sizeGb: 11.7 },
  { id: "s4", name: "مستندات قراردادها", type: "اسناد", sizeGb: 8.9 },
];

export function StorageSection({ notify }: { notify: Notify }) {
  const totalGb = 250;
  const usedGb = storageCategories.reduce((s, c) => s + c.sizeGb, 0);
  const usedPct = Math.round((usedGb / totalGb) * 100);
  const [cleaning, setCleaning] = useState(false);

  const cleanTemp = () => {
    setCleaning(true);
    setTimeout(() => {
      setCleaning(false);
      notify("فایل‌های موقت پاک‌سازی شد — ۳٫۱ گیگابایت آزاد شد.", "success");
    }, 900);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="فضای کل دیسک" value={`${totalGb} GB`} icon={<HardDrive size={16} />} tone="brand" />
        <StatCard label="فضای مصرف‌شده" value={`${usedGb.toFixed(1)} GB`} hint={`${usedPct}٪ از کل`} tone={usedPct > 80 ? "danger" : "success"} icon={<Database size={16} />} />
        <StatCard label="تعداد کل فایل‌ها" value={storageCategories.reduce((s, c) => s + c.files, 0).toLocaleString("fa-IR")} icon={<FolderOpen size={16} />} />
        <StatCard label="آخرین پشتیبان‌گیری" value="امروز ۰۳:۰۰" hint="روزانه — خودکار" tone="success" icon={<Archive size={16} />} />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between text-xs mb-2">
          <h4 className="text-sm font-bold text-ink-900">مصرف کل دیسک</h4>
          <span className="text-ink-500">{usedGb.toFixed(1)} از {totalGb} گیگابایت</span>
        </div>
        <div className="h-3 rounded-full bg-ink-100 overflow-hidden flex">
          {storageCategories.map((c) => (
            <div key={c.label} className={`h-full ${c.color}`} style={{ width: `${(c.sizeGb / totalGb) * 100}%` }} title={c.label} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          {storageCategories.map((c) => (
            <span key={c.label} className="flex items-center gap-1.5 text-[11px] text-ink-500">
              <span className={`w-2.5 h-2.5 rounded-sm ${c.color}`} />
              {c.label} ({c.sizeGb} GB)
            </span>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h4 className="text-sm font-bold text-ink-900 mb-4">تفکیک بر اساس نوع محتوا</h4>
        <div className="space-y-3">
          {storageCategories.map((c) => (
            <div key={c.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-ink-600">{c.label}</span>
                <span className="text-ink-400">{c.sizeGb} GB · {c.files.toLocaleString("fa-IR")} فایل</span>
              </div>
              <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                <div className={`h-full rounded-full ${c.color}`} style={{ width: `${(c.sizeGb / Math.max(...storageCategories.map((x) => x.sizeGb))) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h4 className="text-sm font-bold text-ink-900 mb-3">پرمصرف‌ترین‌ها</h4>
          <div className="space-y-2">
            {topConsumers.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs bg-ink-50 rounded-lg p-2.5">
                <div>
                  <p className="font-medium text-ink-800">{t.name}</p>
                  <p className="text-ink-400 mt-0.5">{t.type}</p>
                </div>
                <Badge tone="brand">{t.sizeGb} GB</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h4 className="text-sm font-bold text-ink-900 mb-3">نگه‌داری و پاک‌سازی</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div>
                <p className="font-medium text-ink-800">پاک‌سازی فایل‌های موقت</p>
                <p className="text-ink-400 mt-0.5">فایل‌های tmp و chunkهای ناتمام قدیمی‌تر از ۲۴ ساعت</p>
              </div>
              <Button variant="secondary" size="sm" icon={<Trash2 size={13} />} onClick={cleanTemp} disabled={cleaning}>
                {cleaning ? "در حال پاک‌سازی…" : "پاک‌سازی"}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs pt-3 border-t border-ink-100">
              <div>
                <p className="font-medium text-ink-800">بازسازی بندانگشتی‌ها</p>
                <p className="text-ink-400 mt-0.5">تولید مجدد پیش‌نمایش تصاویر پس از تغییر ابعاد</p>
              </div>
              <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={() => notify("بازسازی بندانگشتی‌ها در صف پردازش قرار گرفت.", "info")}>
                شروع
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs pt-3 border-t border-ink-100">
              <div>
                <p className="font-medium text-ink-800">پشتیبان‌گیری دستی</p>
                <p className="text-ink-400 mt-0.5">علاوه بر پشتیبان‌گیری خودکار روزانه</p>
              </div>
              <Button variant="secondary" size="sm" icon={<Archive size={13} />} onClick={() => notify("پشتیبان‌گیری کامل آغاز شد — پس از اتمام اعلان دریافت می‌کنید.", "info")}>
                شروع
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
