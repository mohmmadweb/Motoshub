import { useState } from "react";
import { tenants } from "../data/mock";
import Badge from "../components/Badge";

const allModules = [
  "شبکه اجتماعی",
  "انجمن",
  "مدیریت دانش",
  "مدیریت پروژه",
  "مدیریت قراردادهای فناورانه",
  "صندوق نوآوری و شتاب‌دهی",
  "گزارش‌گیری پیشرفته",
];

const planTone: Record<string, "ink" | "yellow" | "brand"> = {
  پایه: "ink",
  "حرفه‌ای": "yellow",
  سازمانی: "brand",
};

export default function Admin() {
  const [activeTenant, setActiveTenant] = useState(tenants[0].id);
  const tenant = tenants.find((t) => t.id === activeTenant)!;
  const [modules, setModules] = useState<string[]>(tenant.modules);

  const toggleModule = (m: string) => {
    setModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">پنل راهبری چندسازمانی</h1>
      <p className="text-sm text-ink-400 mb-5">مدیریت تننت‌ها، فعال/غیرفعال‌سازی ماژول‌ها و سطح دسترسی به ازای هر سازمان</p>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <div className="card p-3">
          <h3 className="text-xs font-bold text-ink-500 px-2 mb-2">سازمان‌های مشتری</h3>
          {tenants.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTenant(t.id);
                setModules(t.modules);
              }}
              className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl text-right ${
                activeTenant === t.id ? "bg-brand-50" : "hover:bg-ink-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg" style={{ backgroundColor: t.logoColor }} />
                <div>
                  <p className="text-xs font-medium">{t.name}</p>
                  <p className="text-[11px] text-ink-400">{t.domain}</p>
                </div>
              </div>
              <Badge tone={planTone[t.plan]}>{t.plan}</Badge>
            </button>
          ))}
          <button className="w-full mt-2 text-xs font-medium text-brand-600 p-2.5 rounded-xl hover:bg-brand-50">
            + افزودن سازمان جدید
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-xs text-ink-400">کاربران فعال</p>
              <p className="text-lg font-bold mt-1">{tenant.users.toLocaleString("fa-IR")}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-400">پلن</p>
              <p className="text-lg font-bold mt-1">{tenant.plan}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-400">ماژول‌های فعال</p>
              <p className="text-lg font-bold mt-1">{modules.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-400">دامنه اختصاصی</p>
              <p className="text-sm font-bold mt-1 truncate">{tenant.domain}</p>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-bold mb-3">ماژول‌های قابل فعال‌سازی</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allModules.map((m) => {
                const on = modules.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => toggleModule(m)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                      on ? "border-brand-200 bg-brand-50" : "border-ink-100 bg-white"
                    }`}
                  >
                    <span>{m}</span>
                    <span
                      className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                        on ? "bg-brand-600 justify-end" : "bg-ink-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white block" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-bold mb-3">برندسازی سفارشی (White-label)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <label className="text-xs text-ink-500">رنگ اصلی برند</label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg border border-ink-200" style={{ backgroundColor: tenant.logoColor }} />
                  <span className="text-xs text-ink-400">{tenant.logoColor}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-500">دامنه اختصاصی</label>
                <input defaultValue={tenant.domain} className="mt-1 w-full bg-ink-50 rounded-lg px-2.5 py-1.5 text-xs outline-none" />
              </div>
              <div>
                <label className="text-xs text-ink-500">نام نمایشی پلتفرم</label>
                <input defaultValue="موتوشاب" className="mt-1 w-full bg-ink-50 rounded-lg px-2.5 py-1.5 text-xs outline-none" />
              </div>
            </div>
            <p className="text-[11px] text-ink-400 mt-3">
              کاربران نهایی این سازمان فقط برند، دامنه و ماژول‌های فعال خودشان را می‌بینند — معماری چندبخشی پلتفرم (Oxwall + سرویس‌های جدید) کاملاً پنهان است.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
