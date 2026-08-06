import { KeyRound, Check, X, ShieldCheck, Building2, Layers, Network } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import { permissionCatalog } from "../data/mock";
import { useTenancy } from "../context/TenancyContext";

/**
 * «نقش و دسترسی من» — نمای شفافِ اینکه کاربرِ واردشده دقیقاً چه کاری می‌تواند بکند.
 * منبعِ واحدِ حقیقت: permissionCatalog (همان چیزی که پنل راهبری برای ساختِ نقش‌ها
 * استفاده می‌کند) × مجوزهای نقشِ فعلی. با تعویضِ کاربر، این صفحه کاملاً تغییر می‌کند.
 */
export default function MyAccess() {
  const { actingUser, role, session, hasPermission, canAccessAdmin, companies, activeScopeLabel } = useTenancy();

  const memberCompanies = companies.filter((c) => session.memberCompanyIds.includes(c.id));
  const granted = permissionCatalog.flatMap((g) => g.actions).filter((a) => hasPermission(a.id)).length;
  const total = permissionCatalog.flatMap((g) => g.actions).length;

  const levelHint: Record<string, string> = {
    سیستم: "بالاترین سطح — دسترسی کامل به همه‌ی هلدینگ‌ها، شرکت‌ها و تنظیمات زیرساخت.",
    هلدینگ: "مدیریت کاملِ یک هلدینگ و همه‌ی شرکت‌های زیرمجموعه‌ی آن.",
    شرکت: "دسترسی در محدوده‌ی شرکت(های) عضو — بدون دخالت در سایر شرکت‌ها.",
    گروه: "اختیارِ مدیریتی محدود به یک گروهِ مشخص؛ در بقیه‌ی سامانه کاربر عادی.",
  };

  return (
    <div>
      <PageHeader
        title="نقش و دسترسی من"
        description="نقش، سطح دسترسی و فهرست کاملِ کارهایی که این حساب می‌تواند انجام دهد"
        icon={<KeyRound size={18} />}
      />

      {/* کارتِ هویت و نقش */}
      <div className="card p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-base font-bold text-ink-900">{actingUser.name}</p>
            <p className="text-[13px] text-ink-500 mt-0.5">{actingUser.role}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge tone="brand" icon={<ShieldCheck size={11} />}>{role.title}</Badge>
              <Badge tone="navy" icon={<Layers size={11} />}>سطح {session.level}</Badge>
              {canAccessAdmin ? (
                <Badge tone="success">دارای پنل راهبری</Badge>
              ) : (
                <Badge tone="neutral">بدون پنل راهبری</Badge>
              )}
            </div>
          </div>
          <div className="text-left shrink-0">
            <p className="text-2xl font-black text-brand-700">
              {granted.toLocaleString("fa-IR")}<span className="text-sm text-ink-400"> / {total.toLocaleString("fa-IR")}</span>
            </p>
            <p className="text-[11px] text-ink-400">مجوزِ فعال</p>
          </div>
        </div>

        <p className="text-[12.5px] text-ink-500 leading-6 mt-3 bg-ink-50 rounded-lg px-3 py-2 border border-ink-100">
          {levelHint[session.level] ?? ""} {role.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="rounded-lg border border-ink-100 p-3">
            <p className="text-[11px] text-ink-400 flex items-center gap-1.5 mb-1"><Network size={12} /> دامنه‌ی دیدِ فعلی</p>
            <p className="text-sm font-bold text-ink-900">{activeScopeLabel}</p>
          </div>
          <div className="rounded-lg border border-ink-100 p-3">
            <p className="text-[11px] text-ink-400 flex items-center gap-1.5 mb-1"><Building2 size={12} /> عضویت‌ها</p>
            <p className="text-sm font-bold text-ink-900">
              {memberCompanies.length > 0 ? memberCompanies.map((c) => c.name).join("، ") : "همه‌ی سازمان (سطح سیستم)"}
            </p>
          </div>
          <div className="rounded-lg border border-ink-100 p-3">
            <p className="text-[11px] text-ink-400 flex items-center gap-1.5 mb-1"><Layers size={12} /> انتشار محتوا در</p>
            <p className="text-sm font-bold text-ink-900">
              {session.level === "سیستم" ? "سراسری، هلدینگ، شرکت" : session.level === "هلدینگ" ? "هلدینگ و شرکت‌های خودش" : "فقط شرکت خودش"}
            </p>
          </div>
        </div>
      </div>

      <p className="text-[12.5px] text-ink-500 mb-3 leading-6">
        این فهرست بر اساس نقشِ «{role.title}» ساخته شده و دقیقاً همان چیزی است که دکمه‌ها و منوهای سامانه را
        برای شما فعال یا پنهان می‌کند. با ورود به‌عنوانِ حسابی دیگر، این جدول تغییر می‌کند.
      </p>

      {/* ماتریسِ دسترسی — گروه‌بندی‌شده مثل پنل راهبری */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {permissionCatalog.map((group) => {
          const active = group.actions.filter((a) => hasPermission(a.id)).length;
          return (
            <div key={group.id} className="card p-4">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-sm font-bold text-ink-900">{group.label}</h3>
                <span className={`text-[10.5px] font-bold rounded-full px-2 py-px ${active > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-ink-100 text-ink-400"}`}>
                  {active.toLocaleString("fa-IR")} از {group.actions.length.toLocaleString("fa-IR")}
                </span>
              </div>
              <ul className="space-y-1.5">
                {group.actions.map((a) => {
                  const ok = hasPermission(a.id);
                  return (
                    <li key={a.id} className="flex items-center gap-2 text-[12.5px]">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-emerald-100 text-emerald-700" : "bg-ink-100 text-ink-300"}`}>
                        {ok ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                      </span>
                      <span className={ok ? "text-ink-700" : "text-ink-400 line-through decoration-ink-200"}>{a.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
