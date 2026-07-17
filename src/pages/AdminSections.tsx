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

type Notify = (message: string, tone?: "success" | "info" | "warning") => void;

const defaultSystemSettings = [
  {
    group: "آپلود و فایل",
    items: [
      { key: "upload_max_mb", label: "حداکثر حجم آپلود (مگابایت)", value: "100", hint: "برای هر فایل؛ فایل‌های بزرگ‌تر به صورت چندتکه (chunk) ارسال می‌شوند" },
      { key: "chunk_size_mb", label: "اندازه هر تکه آپلود (مگابایت)", value: "10", hint: "کوچک‌تر = پایدارتر روی اینترنت ضعیف، بزرگ‌تر = سریع‌تر" },
      { key: "user_quota_gb", label: "سهمیه دیسک هر کاربر (گیگابایت)", value: "5", hint: "پس از پر شدن، آپلود جدید مسدود می‌شود" },
      { key: "image_max_px", label: "حداکثر ابعاد تصویر (پیکسل)", value: "1920", hint: "تصاویر بزرگ‌تر به این ابعاد کوچک می‌شوند" },
    ],
  },
  {
    group: "نشست و امنیت",
    items: [
      { key: "session_hours", label: "طول عمر نشست (ساعت)", value: "24", hint: "پس از این مدت کاربر باید دوباره وارد شود" },
      { key: "login_attempts", label: "حداکثر تلاش ناموفق ورود", value: "5", hint: "پس از آن حساب موقتاً قفل می‌شود" },
      { key: "lock_minutes", label: "مدت قفل حساب (دقیقه)", value: "15", hint: "" },
    ],
  },
  {
    group: "محتوا و اعلان",
    items: [
      { key: "feed_page_size", label: "تعداد آیتم هر صفحه فید", value: "20", hint: "" },
      { key: "notif_batch", label: "حداکثر اعلان ارسالی در هر دقیقه", value: "500", hint: "برای کنترل فشار روی صف اعلان‌ها" },
      { key: "digest_hour", label: "ساعت ارسال خلاصه روزانه", value: "8", hint: "به وقت سرور" },
    ],
  },
];

export function SystemSection({ notify }: { notify: Notify }) {
  const [settings, setSettings] = useState(defaultSystemSettings);
  const [maintenance, setMaintenance] = useState(false);
  const [dirty, setDirty] = useState(false);

  const updateValue = (groupIdx: number, itemIdx: number, value: string) => {
    setSettings((prev) =>
      prev.map((g, gi) =>
        gi === groupIdx ? { ...g, items: g.items.map((it, ii) => (ii === itemIdx ? { ...it, value } : it)) } : g
      )
    );
    setDirty(true);
  };

  const save = () => {
    setDirty(false);
    notify("تنظیمات سیستم ذخیره شد و بدون نیاز به دیپلوی مجدد روی همه سرویس‌ها اعمال می‌شود.");
  };

  return (
    <div className="space-y-5">
      <div className="card p-4 flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg bg-navy-900 text-white flex items-center justify-center shrink-0">
          <SlidersHorizontal size={18} />
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-ink-900">متغیرهای سیستم</h3>
              <p className="text-xs text-ink-500 mt-1">
                همه‌ی مقادیر ثابت سیستم از اینجا مدیریت می‌شوند — بدون تغییر کد و بدون دیپلوی مجدد.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={save} disabled={!dirty}>
              ذخیره تغییرات
            </Button>
          </div>
        </div>
      </div>

      {settings.map((group, gi) => (
        <div key={group.group} className="card p-5">
          <h4 className="text-sm font-bold text-ink-900 mb-4">{group.group}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {group.items.map((item, ii) => (
              <div key={item.key}>
                <label className="text-xs font-medium text-ink-600 block mb-1.5">{item.label}</label>
                <input
                  value={item.value}
                  onChange={(e) => updateValue(gi, ii, e.target.value)}
                  className="input-field"
                  dir="ltr"
                />
                {item.hint && <p className="text-[11px] text-ink-400 mt-1">{item.hint}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="card p-4 flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <AlertTriangle size={18} />
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-900">حالت تعمیر و نگهداری</h3>
            <Toggle
              on={maintenance}
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
