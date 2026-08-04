import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Lock, Smartphone, ShieldCheck, ChevronDown, Network } from "lucide-react";
import { tenants, users as allUsers } from "../data/mock";
import { holdings } from "../data/mockDaneshmand";
import { systemIdentity } from "../data/tenancy";
import { useTenancy } from "../context/TenancyContext";
import Button from "../components/ui/Button";

// فضای کاری = سازمان مشتری (tenant) یا یکی از شرکت‌های زیرمجموعه‌ی آن —
// هماهنگ با «پنل راهبری ← سازمان‌های مشتری» و «هلدینگ‌ها و شرکت‌ها»
type Workspace = { id: string; name: string; domain: string; color: string; parent?: string };

const workspaces: Workspace[] = [
  { id: tenants[0].id, name: systemIdentity.name, domain: systemIdentity.domain, color: systemIdentity.color },
  ...holdings.flatMap((h) =>
    h.companies.map((c) => ({
      id: c.id,
      name: c.name,
      domain: `${c.id.replace("c-", "")}.${systemIdentity.domain}`,
      color: h.color,
      parent: h.name,
    }))
  ),
];

// در بیلد محصول (VITE_DEMO=false) ابزارهای نمایشی نمایش داده نمی‌شوند
const IS_DEMO = import.meta.env.VITE_DEMO !== "false";

export default function Login() {
  const navigate = useNavigate();
  const { setActingUser } = useTenancy();
  const [tenantId, setTenantId] = useState(workspaces[0].id);
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [demoUserId, setDemoUserId] = useState(allUsers[0].id);
  const [errors, setErrors] = useState<{ u?: string; p?: string; ph?: string }>({});
  const tenant = workspaces.find((t) => t.id === tenantId)!;

  const submit = () => {
    // اعتبارسنجی — ورودِ خالی پذیرفته نمی‌شود
    if (mode === "password") {
      const errs = {
        u: username.trim() ? undefined : "نام کاربری الزامی است.",
        p: password.trim() ? undefined : "گذرواژه الزامی است.",
      };
      setErrors(errs);
      if (errs.u || errs.p) return;
    } else {
      const ok = /^09\d{9}$/.test(phone.trim());
      setErrors({ ph: ok ? undefined : "شماره موبایل معتبر وارد کنید (مثلاً 09121234567)." });
      if (!ok) return;
    }
    // نشستِ کاربر از همین‌جا ساخته می‌شود — دامنه‌ی دید از عضویتِ او محاسبه خواهد شد
    setActingUser(demoUserId);
    navigate("/dashboard");
  };

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
              submit();
            }}
          >
            {mode === "password" ? (
              <>
                <div>
                  <input
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setErrors((p) => ({ ...p, u: undefined })); }}
                    className={`input-field ${errors.u ? "input-error" : ""}`}
                    placeholder="نام کاربری یا ایمیل سازمانی"
                    autoComplete="username"
                  />
                  {errors.u && <p className="field-error">{errors.u}</p>}
                </div>
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, p: undefined })); }}
                    className={`input-field ${errors.p ? "input-error" : ""}`}
                    placeholder="گذرواژه"
                    autoComplete="current-password"
                  />
                  {errors.p && <p className="field-error">{errors.p}</p>}
                </div>
              </>
            ) : (
              <div>
                <input
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, ph: undefined })); }}
                  className={`input-field ${errors.ph ? "input-error" : ""}`}
                  placeholder="شماره موبایل (مثلاً 0912xxxxxxx)"
                  inputMode="tel"
                  dir="ltr"
                />
                {errors.ph && <p className="field-error">{errors.ph}</p>}
              </div>
            )}

            {/* حساب نمایشی — نشستِ واقعی از روی همین کاربر ساخته می‌شود */}
            {IS_DEMO && (
            <div className="rounded-lg border border-dashed border-ink-200 bg-ink-50/60 p-2.5">
              <label className="text-[10.5px] font-bold text-ink-400 block mb-1">
                حساب نمایشی (دموی سناریوها)
              </label>
              <select
                value={demoUserId}
                onChange={(e) => setDemoUserId(e.target.value)}
                aria-label="انتخاب حساب نمایشی"
                className="w-full text-xs border border-ink-200 rounded-md px-2 py-1.5 bg-white outline-none focus:border-brand-400"
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {(u.companyIds?.length ?? 0) === 0 ? "سطح سیستم" : `عضو ${u.companyIds!.length.toLocaleString("fa-IR")} شرکت`}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-ink-400 mt-1 leading-4">
                دامنه‌ی دید و دسترسی‌ها پس از ورود، از عضویت همین حساب محاسبه می‌شود.
              </p>
            </div>
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
