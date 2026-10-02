// ---------------------------------------------------------------------------
// «طبقه‌بندی اطلاعات» — روشن/خاموش نوار طبقه‌بندی بالای صفحه، سطح پیش‌فرض و بازنویسی سطح
// برای مسیرهای مشخص. سند دانشِ «محرمانه» به‌طور خودکار نوار را بالا می‌برد.
// ذخیره: motoshub.classification.v1 (انبار در src/components/ClassificationBanner.tsx)
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Plus, ShieldAlert, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { classLevels, classStyle, routeLevel, useClassification, type ClassLevel } from "../../components/ClassificationBanner";
import { Callout, Field, SectionHead } from "./iam/shared";

const ROUTE_HINTS = [
  { route: "/dashboard/knowledge", label: "مدیریت دانش" },
  { route: "/dashboard/projects", label: "پروژه‌ها" },
  { route: "/dashboard/contracts", label: "قراردادها" },
  { route: "/dashboard/funds", label: "صندوق نوآوری" },
  { route: "/dashboard/research", label: "فرصت‌های پژوهشی" },
  { route: "/dashboard/settings", label: "تنظیمات سامانه" },
  { route: "/dashboard/files", label: "اسناد و فایل‌ها" },
  { route: "/dashboard/chat", label: "گفتگوها" },
];

export default function ClassificationSection() {
  const { config, setConfig } = useClassification();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const canEdit = hasPermission("settings.security");
  const [route, setRoute] = useState("");
  const [level, setLevel] = useState<ClassLevel>("محرمانه");

  const add = () => {
    const r = route.trim();
    if (!r.startsWith("/")) return notify("مسیر باید با «/» شروع شود؛ مثلاً /dashboard/funds", "warning");
    if (config.overrides.some((o) => o.route === r)) return notify("برای این مسیر قبلاً سطح تعیین شده است.", "warning");
    setConfig({ overrides: [...config.overrides, { id: `r${Date.now()}`, route: r, level }] });
    setRoute("");
    notify("بازنویسی مسیر اضافه شد.", "success");
  };

  return (
    <div className="space-y-4">
      <SectionHead icon={<ShieldAlert size={18} />} title="طبقه‌بندی اطلاعات" description="نوار باریک بالای صفحه بالاترین سطح طبقه‌بندی داده‌ی همان صفحه را نشان می‌دهد." />

      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-ink-800">نمایش نوار طبقه‌بندی</p>
            <p className="text-[12px] text-ink-500">برای همه‌ی کاربران و در همه‌ی صفحات داخلی.</p>
          </div>
          <Toggle on={config.enabled} disabled={!canEdit} onChange={() => setConfig({ enabled: !config.enabled })} label="نمایش نوار طبقه‌بندی" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="سطح پیش‌فرض صفحات">
            <select className="input-field" value={config.defaultLevel} disabled={!canEdit} onChange={(e) => setConfig({ defaultLevel: e.target.value as ClassLevel })}>
              {classLevels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-center justify-between gap-3 border border-ink-100 rounded-lg px-3">
            <span className="text-[12.5px] text-ink-700 py-2">بالا بردن خودکار با سطح سند دانشِ باز</span>
            <Toggle on={config.autoKnowledge} disabled={!canEdit} onChange={() => setConfig({ autoKnowledge: !config.autoKnowledge })} label="بالا بردن خودکار" />
          </div>
        </div>
        <div>
          <p className="text-[12px] font-semibold text-ink-700 mb-1.5">پیش‌نمایش سطوح</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {classLevels.map((l) => (
              <div key={l} className={`h-7 rounded-md flex items-center justify-center text-[11.5px] font-bold ${classStyle[l]}`}>
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-bold text-ink-900 mb-1">بازنویسی سطح برای مسیرها</h3>
        <p className="text-[12px] text-ink-500 mb-3">طولانی‌ترین مسیرِ منطبق اعمال می‌شود؛ صفحه یا سند می‌تواند سطح را بالاتر ببرد اما پایین‌تر نمی‌آورد.</p>
        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <input className="input-field flex-1 min-w-0" dir="ltr" list="class-routes" value={route} onChange={(e) => setRoute(e.target.value)} placeholder="/dashboard/funds" aria-label="مسیر" />
            <datalist id="class-routes">
              {ROUTE_HINTS.map((h) => (
                <option key={h.route} value={h.route}>
                  {h.label}
                </option>
              ))}
            </datalist>
            <select className="input-field sm:w-40" value={level} onChange={(e) => setLevel(e.target.value as ClassLevel)} aria-label="سطح">
              {classLevels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <Button variant="primary" icon={<Plus size={14} />} onClick={add} className="justify-center">
              افزودن
            </Button>
          </div>
        )}
        {config.overrides.length === 0 ? (
          <p className="text-[12px] text-ink-400">بازنویسی‌ای تعریف نشده؛ همه‌ی صفحات سطح پیش‌فرض را دارند.</p>
        ) : (
          <ul className="divide-y divide-ink-100 border border-ink-100 rounded-lg">
            {config.overrides.map((o) => (
              <li key={o.id} className="flex items-center gap-2 px-3 py-2">
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-mono text-ink-800 truncate" dir="ltr">
                    {o.route}
                  </span>
                  <span className="block text-[11px] text-ink-400">{ROUTE_HINTS.find((h) => o.route.startsWith(h.route))?.label ?? "مسیر سفارشی"}</span>
                </span>
                <select
                  className="input-field !w-36"
                  value={o.level}
                  disabled={!canEdit}
                  onChange={(e) => setConfig({ overrides: config.overrides.map((x) => (x.id === o.id ? { ...x, level: e.target.value as ClassLevel } : x)) })}
                  aria-label={`سطح ${o.route}`}
                >
                  {classLevels.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                {canEdit && (
                  <button onClick={() => setConfig({ overrides: config.overrides.filter((x) => x.id !== o.id) })} className="p-1.5 rounded-md text-ink-400 hover:text-rose-600 hover:bg-rose-50" aria-label="حذف">
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11.5px] text-ink-400 mt-3">
          نمونه: «/dashboard/settings» ← {routeLevel(config, "/dashboard/settings")} · «/dashboard/blog» ← {routeLevel(config, "/dashboard/blog")}
        </p>
      </div>

      <Callout icon={<ShieldAlert size={13} />} tone="neutral">
        نوار فقط نشانه‌گذاری است و جایگزین کنترل دسترسی نیست؛ دیدن اسناد محرمانه همچنان با مجوز «knowledge.confidential» و فهرست دسترسی سند کنترل می‌شود.
      </Callout>
    </div>
  );
}
