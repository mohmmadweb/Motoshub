import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Lock, Smartphone, ShieldCheck, ChevronDown, Network } from "lucide-react";
import { tenants } from "../data/mock";
import { holdings } from "../data/mockDaneshmand";
import Button from "../components/ui/Button";

// فضای کاری = سازمان مشتری (tenant) یا یکی از شرکت‌های زیرمجموعه‌ی آن —
// هماهنگ با «پنل راهبری ← سازمان‌های مشتری» و «هلدینگ‌ها و شرکت‌ها»
type Workspace = { id: string; name: string; domain: string; color: string; parent?: string };

const workspaces: Workspace[] = [
  ...tenants.map((t) => ({ id: t.id, name: t.name, domain: t.domain, color: t.logoColor })),
  ...holdings.flatMap((h) =>
    h.companies.map((c) => ({
      id: c.id,
      name: c.name,
      domain: `${c.id.replace("c-", "")}.${tenants[0].domain}`,
      color: h.color,
      parent: h.name,
    }))
  ),
];

export default function Login() {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState(workspaces[0].id);
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);
  const [mode, setMode] = useState<"password" | "otp">("password");
  const tenant = workspaces.find((t) => t.id === tenantId)!;

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
      <div className="w-full max-w-sm">
        <div className="card p-7">
          <div className="flex flex-col items-center text-center mb-6">
            <span
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-3"
              style={{ backgroundColor: tenant.color }}
            >
              <Building2 size={22} />
            </span>
            {tenant.parent && (
              <p className="text-[11px] text-ink-400 mb-0.5 flex items-center gap-1">
                <Network size={11} /> زیرمجموعه‌ی {tenant.parent}
              </p>
            )}
            <h1 className="font-bold text-base text-ink-900">ورود به فضای کاری {tenant.name}</h1>
            <p className="text-xs text-ink-500 mt-1">{tenant.domain}</p>
          </div>

          {/* Tenant switcher — demonstrates per-organization isolated login */}
          <div className="relative mb-4">
            <button
              onClick={() => setOrgPickerOpen((v) => !v)}
              className="w-full flex items-center justify-between border border-ink-200 rounded-lg px-3 py-2 text-xs text-ink-500 hover:border-ink-300"
            >
              <span>سازمان دیگری دارید؟ تغییر فضای کاری</span>
              <ChevronDown size={14} />
            </button>
            {orgPickerOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-ink-200 rounded-lg shadow-lg py-1 max-h-72 overflow-y-auto">
                <p className="px-3 py-1 text-[10.5px] font-bold text-ink-400">سازمان‌های مشتری</p>
                {tenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTenantId(t.id);
                      setOrgPickerOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-ink-50 text-right ${tenantId === t.id ? "bg-brand-50 font-bold" : ""}`}
                  >
                    <span className="w-5 h-5 rounded shrink-0" style={{ backgroundColor: t.logoColor }} />
                    {t.name}
                  </button>
                ))}
                <p className="px-3 pt-2 pb-1 text-[10.5px] font-bold text-ink-400 border-t border-ink-100 mt-1">
                  هلدینگ‌ها و شرکت‌های زیرمجموعه‌ی {tenants[0].name}
                </p>
                {holdings.map((h) => (
                  <div key={h.id}>
                    <p className="px-3 py-1 text-[10.5px] text-ink-400 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: h.color }} /> {h.name}
                    </p>
                    {h.companies.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setTenantId(c.id);
                          setOrgPickerOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 pr-8 pl-3 py-1.5 text-xs hover:bg-ink-50 text-right ${tenantId === c.id ? "bg-brand-50 font-bold" : "text-ink-600"}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 bg-ink-100 rounded-lg p-1 mb-4">
            <button
              onClick={() => setMode("password")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium ${
                mode === "password" ? "bg-white shadow text-brand-700" : "text-ink-500"
              }`}
            >
              <Lock size={13} /> نام‌کاربری/گذرواژه
            </button>
            <button
              onClick={() => setMode("otp")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium ${
                mode === "otp" ? "bg-white shadow text-brand-700" : "text-ink-500"
              }`}
            >
              <Smartphone size={13} /> رمز یک‌بارمصرف
            </button>
          </div>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              navigate("/dashboard");
            }}
          >
            {mode === "password" ? (
              <>
                <input className="input-field" placeholder="نام کاربری یا ایمیل سازمانی" />
                <input type="password" className="input-field" placeholder="گذرواژه" />
              </>
            ) : (
              <input className="input-field" placeholder="شماره موبایل (مثلاً 0912xxxxxxx)" />
            )}
            <Button type="submit" variant="primary" className="w-full justify-center">
              ورود به سامانه بنیاد
            </Button>
          </form>

          <button className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-500 hover:text-ink-700 py-2">
            <ShieldCheck size={14} /> ورود از طریق SSO سازمانی
          </button>
        </div>

        <p className="text-[11px] text-navy-300 text-center mt-4">
          هر سازمان، فضای کاری، اعضا و ورود کاملاً مستقل خودش را دارد و از سایر مجموعه‌های بنیاد جدا است.
        </p>
      </div>
    </div>
  );
}
