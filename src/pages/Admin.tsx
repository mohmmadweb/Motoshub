import { useState } from "react";
import {
  Settings,
  Building2,
  Plug,
  Palette,
  KeyRound,
  LayoutTemplate,
  Users,
  ShieldCheck,
  Network,
  Plus,
  Upload,
  Download,
  Globe2,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Ban,
} from "lucide-react";
import { tenants, moduleCatalog, adminPages, adminMenus, roles, allowedFileExtensions, type ModuleDef } from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Toggle from "../components/ui/Toggle";
import StatCard from "../components/ui/StatCard";

type SectionId = "tenants" | "modules" | "branding" | "roles" | "pages" | "users" | "security" | "network";

const sections: { id: SectionId; label: string; icon: typeof Settings }[] = [
  { id: "tenants", label: "سازمان‌های مشتری", icon: Building2 },
  { id: "modules", label: "بازارچه‌ی ماژول‌ها", icon: Plug },
  { id: "branding", label: "برندسازی سازمان", icon: Palette },
  { id: "roles", label: "نقش‌ها و دسترسی", icon: KeyRound },
  { id: "pages", label: "صفحات و منوها", icon: LayoutTemplate },
  { id: "users", label: "کاربران و واردسازی", icon: Users },
  { id: "security", label: "امنیت و انطباق", icon: ShieldCheck },
  { id: "network", label: "تعامل بین‌سازمانی", icon: Network },
];

export default function Admin() {
  const [section, setSection] = useState<SectionId>("tenants");
  const [activeTenant, setActiveTenant] = useState(tenants[0].id);
  const tenant = tenants.find((t) => t.id === activeTenant)!;
  const [enabledModules, setEnabledModules] = useState<string[]>(["social", "knowledge", "projects", "reports"]);
  const [crossTenant, setCrossTenant] = useState(false);

  const toggleModule = (id: string) => {
    setEnabledModules((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div>
      <PageHeader
        title="پنل راهبری"
        description={`مدیریت سازمان «${tenant.name}» — هر تغییر فقط روی این سازمان اعمال می‌شود`}
        icon={<Settings size={18} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
        <div className="card p-2 h-fit">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] font-medium text-right ${
                section === s.id ? "bg-navy-900 text-white" : "text-ink-600 hover:bg-ink-50"
              }`}
            >
              <s.icon size={15} />
              {s.label}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          {section === "tenants" && (
            <TenantsSection tenants={tenants} activeTenant={activeTenant} setActiveTenant={setActiveTenant} />
          )}

          {section === "modules" && (
            <ModulesSection enabledModules={enabledModules} toggleModule={toggleModule} />
          )}

          {section === "branding" && <BrandingSection tenant={tenant} />}

          {section === "roles" && <RolesSection />}

          {section === "pages" && <PagesSection />}

          {section === "users" && <UsersSection tenant={tenant} />}

          {section === "security" && <SecuritySection />}

          {section === "network" && (
            <NetworkSection crossTenant={crossTenant} setCrossTenant={setCrossTenant} />
          )}
        </div>
      </div>
    </div>
  );
}

function TenantsSection({
  tenants,
  activeTenant,
  setActiveTenant,
}: {
  tenants: typeof import("../data/mock").tenants;
  activeTenant: string;
  setActiveTenant: (id: string) => void;
}) {
  const planTone = { پایه: "neutral", "حرفه‌ای": "warning", سازمانی: "brand" } as const;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-ink-900">سازمان‌های مستقل روی این پلتفرم</h3>
        <Button variant="primary" size="sm" icon={<Plus size={14} />}>
          افزودن سازمان جدید
        </Button>
      </div>
      <div className="card divide-y divide-ink-100">
        {tenants.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTenant(t.id)}
            className={`w-full flex items-center justify-between gap-3 p-3.5 text-right ${activeTenant === t.id ? "bg-brand-50" : "hover:bg-ink-50"}`}
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg" style={{ backgroundColor: t.logoColor }} />
              <div>
                <p className="text-sm font-medium text-ink-900">{t.name}</p>
                <p className="text-xs text-ink-400">{t.domain}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-ink-400">{t.users.toLocaleString("fa-IR")} کاربر</span>
              <Badge tone={planTone[t.plan]}>{t.plan}</Badge>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ModulesSection({ enabledModules, toggleModule }: { enabledModules: string[]; toggleModule: (id: string) => void }) {
  const categories = Array.from(new Set(moduleCatalog.map((m) => m.category)));
  return (
    <div>
      <div className="card p-4 mb-4 bg-brand-50 border-brand-200 flex items-start gap-3">
        <CheckCircle2 size={18} className="text-brand-700 shrink-0 mt-0.5" />
        <p className="text-xs text-brand-800 leading-6">
          هر ماژول کاملاً مستقل و قابل افزودن/حذف است. غیرفعال‌کردن یک ماژول، داده‌های آن را حذف نمی‌کند و روی
          عملکرد سایر ماژول‌ها تأثیری ندارد — معماری موتوشاب برای این نوع جداسازی طراحی شده است.
        </p>
      </div>

      {categories.map((cat) => (
        <div key={cat} className="mb-5">
          <h3 className="text-xs font-bold text-ink-500 mb-2">{cat}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {moduleCatalog
              .filter((m) => m.category === cat)
              .map((m: ModuleDef) => {
                const on = enabledModules.includes(m.id) || Boolean(m.core);
                return (
                  <div key={m.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${on ? "border-brand-200 bg-brand-50/50" : "border-ink-200 bg-white"}`}>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink-900 flex items-center gap-1.5">
                        {m.name}
                        {m.core && <Badge tone="navy">هسته</Badge>}
                      </p>
                      <p className="text-[11px] text-ink-400 mt-0.5">{m.description}</p>
                    </div>
                    <Toggle on={on} disabled={m.core} onChange={() => toggleModule(m.id)} />
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

function BrandingSection({ tenant }: { tenant: (typeof import("../data/mock").tenants)[number] }) {
  const [color, setColor] = useState(tenant.logoColor);
  const colorOptions = ["#1f4f99", "#2a66bd", "#0d9488", "#7c3aed", "#b45309", "#0f172a"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      <div className="card p-5 space-y-5">
        <div>
          <label className="text-xs font-medium text-ink-600 block mb-2">رنگ اصلی برند</label>
          <div className="flex items-center gap-2">
            {colorOptions.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg border-2 ${color === c ? "border-ink-900" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-600 block mb-2">لوگوی سازمان</label>
          <button className="flex items-center gap-2 border border-dashed border-ink-300 rounded-lg px-4 py-3 text-xs text-ink-500 hover:border-brand-400">
            <Upload size={14} /> بارگذاری فایل PNG/SVG
          </button>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-600 block mb-2">دامنه‌ی اختصاصی</label>
          <input defaultValue={tenant.domain} className="input-field" />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-600 block mb-2">نام نمایشی پلتفرم برای این سازمان</label>
          <input defaultValue="موتوشاب" className="input-field" />
        </div>
        <Button variant="primary">ذخیره‌ی برندسازی</Button>
      </div>

      <div className="card p-0 overflow-hidden h-fit">
        <p className="text-[11px] text-ink-400 px-3 pt-3">پیش‌نمایش زنده</p>
        <div className="p-3">
          <div className="rounded-lg overflow-hidden border border-ink-200">
            <div className="h-9 flex items-center gap-2 px-3" style={{ backgroundColor: color }}>
              <span className="w-4 h-4 rounded bg-white/30" />
              <span className="text-white text-[11px] font-medium">{tenant.name}</span>
            </div>
            <div className="p-3 bg-ink-50 space-y-2">
              <div className="h-2 w-3/4 rounded bg-ink-200" />
              <div className="h-2 w-1/2 rounded bg-ink-200" />
              <button className="text-[10px] text-white rounded px-2 py-1 mt-1" style={{ backgroundColor: color }}>
                دکمه‌ی نمونه
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RolesSection() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-ink-900">نقش‌ها و سطوح دسترسی</h3>
        <Button variant="primary" size="sm" icon={<Plus size={14} />}>
          نقش جدید
        </Button>
      </div>
      <div className="card divide-y divide-ink-100">
        {roles.map((r) => (
          <div key={r.id} className="p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-900 flex items-center gap-2">
                {r.title} <Badge tone={r.scope === "پلتفرم" ? "navy" : r.scope === "سازمان" ? "brand" : "neutral"}>{r.scope}</Badge>
              </p>
              <p className="text-xs text-ink-400 mt-0.5">{r.description}</p>
            </div>
            <span className="text-xs text-ink-400 shrink-0">{r.members.toLocaleString("fa-IR")} نفر</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PagesSection() {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-ink-900">صفحات سفارشی</h3>
          <Button variant="secondary" size="sm" icon={<Plus size={13} />}>صفحه جدید</Button>
        </div>
        <div className="card divide-y divide-ink-100">
          {adminPages.map((p) => (
            <div key={p.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-900">{p.title}</p>
                <p className="text-xs text-ink-400">{p.slug}</p>
              </div>
              {p.visible ? <Eye size={15} className="text-emerald-600" /> : <EyeOff size={15} className="text-ink-300" />}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink-900 mb-2">منوهای ناوبری</h3>
        <div className="card divide-y divide-ink-100">
          {adminMenus.map((m) => (
            <div key={m.id} className="p-3 flex items-center justify-between">
              <span className="text-sm text-ink-800">{m.order}. {m.title}</span>
              {m.visible ? <Eye size={15} className="text-emerald-600" /> : <EyeOff size={15} className="text-ink-300" />}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink-900 mb-2">پسوندهای مجاز فایل</h3>
        <div className="card p-3 flex items-center gap-2 flex-wrap">
          {allowedFileExtensions.map((ext) => (
            <Badge key={ext} tone="neutral">.{ext}</Badge>
          ))}
          <button className="text-xs text-brand-600 font-medium px-2">+ افزودن پسوند</button>
        </div>
      </div>
    </div>
  );
}

function UsersSection({ tenant }: { tenant: (typeof import("../data/mock").tenants)[number] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="کل کاربران" value={tenant.users.toLocaleString("fa-IR")} icon={<Users size={16} />} tone="brand" />
        <StatCard label="کاربران فعال این هفته" value="۸۶۴" tone="success" />
        <StatCard label="در انتظار تایید" value="۱۲" tone="warning" />
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold text-ink-900 mb-1">واردسازی دسته‌ای کاربران</h3>
        <p className="text-xs text-ink-400 mb-3">فایل اکسل حاوی نام، شماره موبایل و سمت سازمانی کاربران را بارگذاری کنید.</p>
        <div className="flex items-center gap-2">
          <Button variant="primary" icon={<Upload size={14} />}>بارگذاری فایل اکسل</Button>
          <Button variant="secondary" icon={<Download size={14} />}>دانلود نمونه فایل</Button>
        </div>
      </div>
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink-900">نمایش کپچا در فرم ورود</p>
            <p className="text-xs text-ink-400 mt-0.5">جلوگیری از ورود ربات‌ها به فرم احراز هویت</p>
          </div>
          <Toggle on={true} />
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink-900">اسکن ضدویروس پیوست‌ها (ClamAV)</p>
            <p className="text-xs text-ink-400 mt-0.5">عدم ذخیره‌ی فایل‌های آلوده و اطلاع‌رسانی به کاربر</p>
          </div>
          <Toggle on={true} />
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink-900">محدودسازی نرخ درخواست</p>
            <p className="text-xs text-ink-400 mt-0.5">حداکثر ۶۰ درخواست در دقیقه به ازای هر کاربر</p>
          </div>
          <Toggle on={true} />
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink-900">ثبت کامل رخدادها (Audit Log)</p>
            <p className="text-xs text-ink-400 mt-0.5">آماده برای ارائه به نهادهای نظارتی مانند افتا</p>
          </div>
          <Toggle on={true} />
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-1.5">
          <Ban size={15} className="text-rose-600" /> کاربران مسدودشده
        </h3>
        <p className="text-xs text-ink-400">در حال حاضر کاربر مسدودشده‌ای وجود ندارد.</p>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-bold text-ink-900 mb-3">آخرین رخدادهای امنیتی</h3>
        <ul className="space-y-2 text-xs text-ink-500">
          <li className="flex items-center gap-2"><AlertTriangle size={13} className="text-amber-500" /> ۳ تلاش ناموفق ورود از IP ناشناس — ۲ ساعت پیش</li>
          <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-500" /> اسکن دوره‌ای فایل‌های میزبان با موفقیت انجام شد — امروز ۰۳:۰۰</li>
        </ul>
      </div>
    </div>
  );
}

function NetworkSection({ crossTenant, setCrossTenant }: { crossTenant: boolean; setCrossTenant: (v: boolean) => void }) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg bg-navy-900 text-white flex items-center justify-center shrink-0">
          <Globe2 size={18} />
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-900">تعامل بین اعضای سازمان‌های مختلف موتوشاب</h3>
            <Toggle on={crossTenant} onChange={() => setCrossTenant(!crossTenant)} />
          </div>
          <p className="text-xs text-ink-500 mt-2 leading-6">
            با فعال‌سازی این گزینه، اعضای این سازمان می‌توانند با اعضای سایر سازمان‌هایی که از موتوشاب استفاده
            می‌کنند، در فضاهای مشترک (مثلاً گروه‌های بین‌سازمانی عمومی) تعامل داشته باشند — بدون اینکه به داده‌های
            داخلی و خصوصی هیچ سازمانی دسترسی پیدا کنند. این قابلیت به‌صورت پیش‌فرض غیرفعال است.
          </p>
          {crossTenant && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              فعال‌سازی این قابلیت نیازمند تأیید مدیر پلتفرم و تعریف فضای اشتراکی بین‌سازمانی است.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
