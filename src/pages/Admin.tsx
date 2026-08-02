import { useRef, useState } from "react";
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
  Webhook,
  Bot,
  Slash,
  UserCog,
  FileWarning,
  Tag,
  SlidersHorizontal,
  HardDrive,
  Pencil,
  Trash2,
  Gauge,
  RotateCcw,
  Activity,
} from "lucide-react";
import { SystemSection, StorageSection } from "./AdminSections";
import { useTenancy } from "../context/TenancyContext";
import type { SsoProvider } from "../data/tenancy";
import LiveUsagePanel from "../components/LiveUsagePanel";
import BrandingPanel from "../components/BrandingPanel";
import { useSettings, settingsMeta, defaultSettings, type WorkflowSettings } from "../context/SettingsContext";
import { useConfirm } from "../components/ui/ConfirmProvider";
import RowActions from "../components/ui/RowActions";
import {
  tenants as initialTenants,
  moduleCatalog,
  adminPages as initialPages,
  adminMenus,
  roles as initialRoles,
  allowedFileExtensions as initialExtensions,
  integrations as initialIntegrations,
  guestAccounts as initialGuests,
  currentUser,
  users as orgUsers,
  permissionCatalog,
  allPermissionIds,
  initialRoleAssignments,
  type RoleAssignment,
  type RoleGrant,
  type ModuleDef,
  type Tenant,
  type RoleDef,
  type AdminPageDef,
  type Integration,
  type GuestAccount,
} from "../data/mock";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Toggle from "../components/ui/Toggle";
import StatCard from "../components/ui/StatCard";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";

type SectionId = "system-identity" | "holdings" | "modules" | "branding" | "roles" | "pages" | "users" | "integrations" | "security" | "network" | "workflow" | "monitor" | "system" | "storage";

const sections: { id: SectionId; label: string; icon: typeof Settings }[] = [
  { id: "system-identity", label: "سیستم و ورود یکپارچه", icon: KeyRound },
  { id: "holdings", label: "هلدینگ‌ها و شرکت‌ها", icon: Network },
  { id: "branding", label: "برندسازی سازمان", icon: Palette },
  { id: "roles", label: "نقش‌ها و دسترسی", icon: KeyRound },
  { id: "users", label: "کاربران و واردسازی", icon: Users },
  { id: "modules", label: "بازارچه‌ی ماژول‌ها", icon: Plug },
  { id: "pages", label: "صفحات و منوها", icon: LayoutTemplate },
  { id: "integrations", label: "یکپارچه‌سازی و اتوماسیون", icon: Webhook },
  { id: "security", label: "امنیت و انطباق", icon: ShieldCheck },
  { id: "network", label: "تعامل بین‌سازمانی", icon: Network },
  { id: "workflow", label: "پارامترهای گردش کار", icon: Gauge },
  { id: "monitor", label: "پایش زنده سامانه", icon: Activity },
  { id: "system", label: "تنظیمات سیستم", icon: SlidersHorizontal },
  { id: "storage", label: "فضای ذخیره‌سازی", icon: HardDrive },
];

const tenantPalette = ["#1f4f99", "#2a66bd", "#0d9488", "#7c3aed", "#b45309", "#0f172a"];

export default function Admin() {
  const [section, setSection] = useState<SectionId>("system-identity");
  // یک نصب = یک مشتری؛ این رکورد فقط برای بخش‌هایی مثل «کاربران» نگه داشته می‌شود
  const tenant = initialTenants[0];
  const [enabledModules, setEnabledModules] = useState<string[]>(["social", "knowledge", "projects", "reports"]);
  const [crossTenant, setCrossTenant] = useState(false);
  const [roles, setRoles] = useState<RoleDef[]>(initialRoles);
  const [pages, setPages] = useState<AdminPageDef[]>(initialPages);
  const [extensions, setExtensions] = useState<string[]>(initialExtensions);
  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);
  const [guestAccounts, setGuestAccounts] = useState<GuestAccount[]>(initialGuests);
  const { notify } = useToast();

  const toggleModule = (id: string) => {
    setEnabledModules((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };


  return (
    <div>
      <PageHeader
        title="پنل راهبری"
        description={`مدیریت سامانه‌ی «${tenant.name}» — سیستم ← هلدینگ ← شرکت`}
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
          {section === "system-identity" && <SystemIdentitySection notify={notify} />}

          {section === "holdings" && <HoldingsSection notify={notify} />}

          {section === "modules" && (
            <ModulesSection enabledModules={enabledModules} toggleModule={toggleModule} />
          )}

          {section === "branding" && <BrandingPanel />}

          {section === "roles" && <RolesSection roles={roles} setRoles={setRoles} notify={notify} />}

          {section === "pages" && <PagesSection pages={pages} setPages={setPages} extensions={extensions} setExtensions={setExtensions} notify={notify} />}

          {section === "users" && <UsersSection tenant={tenant} roles={roles} notify={notify} />}

          {section === "integrations" && <IntegrationsSection integrations={integrations} setIntegrations={setIntegrations} notify={notify} />}

          {section === "security" && <SecuritySection guestAccounts={guestAccounts} setGuestAccounts={setGuestAccounts} notify={notify} />}

          {section === "network" && (
            <NetworkSection crossTenant={crossTenant} setCrossTenant={setCrossTenant} />
          )}

          {section === "workflow" && <WorkflowParamsSection notify={notify} />}

          {section === "monitor" && (
            <div className="space-y-4">
              <LiveUsagePanel />
              <p className="text-[11px] text-ink-400 leading-5">
                این متریک‌ها مربوط به کل سامانه است و فقط برای راهبران نمایش داده می‌شود. جزئیات دیسک در بخش
                «فضای ذخیره‌سازی» و محدودیت نرخ درخواست در «پارامترهای گردش کار» قابل مدیریت است.
              </p>
            </div>
          )}

          {section === "system" && <SystemSection notify={notify} />}

          {section === "storage" && <StorageSection notify={notify} />}
        </div>
      </div>
    </div>
  );
}

type Notify = (message: string, tone?: "success" | "info" | "warning") => void;

// ---------------------------------------------------------------------------
// پارامترهای گردش کار — اعداد ثابت روندها (یادآوری‌ها، مهلت‌ها، حدنصاب‌ها)
// همگی از اینجا قابل تغییرند و بلافاصله در کل سامانه اعمال می‌شوند.
// ---------------------------------------------------------------------------
function WorkflowParamsSection({ notify }: { notify: Notify }) {
  const { settings, update, reset } = useSettings();
  const [draft, setDraft] = useState<WorkflowSettings>(settings);

  const save = () => {
    update(draft);
    notify("پارامترهای گردش کار ذخیره شد و از این لحظه در همه‌ی روندها اعمال می‌شود.");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-ink-900">پارامترهای گردش کار</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={13} />}
            onClick={() => {
              reset();
              setDraft(defaultSettings);
              notify("پارامترها به مقادیر پیش‌فرض بازگشت.", "info");
            }}
          >
            بازگشت به پیش‌فرض
          </Button>
          <Button variant="primary" size="sm" onClick={save}>ذخیره‌ی پارامترها</Button>
        </div>
      </div>
      <div className="card p-4 mb-4 bg-brand-50 border-brand-200 flex items-start gap-3">
        <Gauge size={18} className="text-brand-700 shrink-0 mt-0.5" />
        <p className="text-xs text-brand-800 leading-6">
          تمام اعداد ثابت روندها (مثل «۷ روز قبل از سررسید» یا «مهلت ۱۵ روزه بررسی») اینجا تعریف می‌شوند.
          با تغییر هر عدد، متن قواعد، هشدارها و حدنصاب‌های ارزیابی در سراسر سامانه به‌روز می‌شود.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {settingsMeta.map((m) => (
          <div key={m.key} className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink-900">{m.label}</p>
                <p className="text-[11px] text-ink-400 mt-1 leading-5">{m.hint}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={0}
                  value={draft[m.key]}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [m.key]: Number(e.target.value) }))}
                  className="w-20 text-sm text-center border border-ink-200 rounded-md px-2 py-1.5 outline-none focus:border-brand-400"
                  dir="ltr"
                />
                <span className="text-[11px] text-ink-400 whitespace-nowrap">{m.unit}</span>
              </div>
            </div>
            {draft[m.key] !== settings[m.key] && (
              <p className="text-[10.5px] text-amber-700 mt-2">تغییر ذخیره‌نشده (مقدار فعلی: {settings[m.key].toLocaleString("fa-IR")})</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Button variant="primary" className="w-full justify-center" onClick={save}>ذخیره‌ی همه‌ی پارامترها</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ساختار هلدینگ‌ها و شرکت‌های زیرمجموعه — مبنای تفکیک محتوا و دسترسی شرکتی
// ---------------------------------------------------------------------------
function SystemIdentitySection({ notify }: { notify: Notify }) {
  const { identity, updateIdentity, holdings, companies } = useTenancy();
  const [draft, setDraft] = useState(identity);
  const dirty = JSON.stringify(draft) !== JSON.stringify(identity);

  const providers: SsoProvider[] = ["بدون SSO", "LDAP / Active Directory", "SAML 2.0", "OpenID Connect", "ورود با موبایل (OTP)"];

  const save = () => {
    if (!draft.name.trim() || !draft.domain.trim()) {
      notify("نام سیستم و دامنه الزامی است.", "warning");
      return;
    }
    updateIdentity({ ...draft, name: draft.name.trim(), domain: draft.domain.trim() });
    notify("هویت سیستم و پیکربندی ورود یکپارچه ذخیره شد.");
  };

  const testSso = () =>
    draft.ssoProvider === "بدون SSO"
      ? notify("ابتدا یک روش ورود یکپارچه انتخاب کنید.", "warning")
      : notify(`اتصال آزمایشی به «${draft.ssoProvider}» برقرار شد و ۳ کاربر نمونه بازیابی شد. (نمایشی)`, "success");

  return (
    <div>
      <div className="card p-4 mb-4 bg-brand-50 border-brand-200 flex items-start gap-3">
        <KeyRound size={18} className="text-brand-700 shrink-0 mt-0.5" />
        <p className="text-xs text-brand-800 leading-6">
          این نصب از محصول متعلق به <b>یک مشتری</b> است. هویت، دامنه و روش ورود در همین صفحه تعیین می‌شود؛
          تفکیک واقعی داده‌ها یک سطح پایین‌تر — در <b>هلدینگ‌ها و شرکت‌ها</b> — انجام می‌شود.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="هلدینگ‌ها" value={holdings.length.toLocaleString("fa-IR")} tone="brand" icon={<Network size={16} />} />
        <StatCard label="شرکت‌ها" value={companies.length.toLocaleString("fa-IR")} icon={<Building2 size={16} />} />
        <StatCard label="روش ورود" value={identity.ssoProvider} tone={identity.ssoProvider === "بدون SSO" ? "warning" : "success"} />
        <StatCard label="دامنه" value={identity.domain} />
      </div>

      <div className="card p-4 mb-4">
        <h3 className="text-sm font-bold text-ink-900 mb-3">هویت سیستم</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام سازمان مشتری <span className="text-rose-500">*</span></label>
            <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام کوتاه (در رابط کاربری)</label>
            <input value={draft.shortName} onChange={(e) => setDraft((d) => ({ ...d, shortName: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">دامنه <span className="text-rose-500">*</span></label>
            <input value={draft.domain} onChange={(e) => setDraft((d) => ({ ...d, domain: e.target.value }))} className="input-field" dir="ltr" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">رنگ برند</label>
            <input type="color" value={draft.color} onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))} className="input-field h-[38px] p-1" />
          </div>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <h3 className="text-sm font-bold text-ink-900 mb-1">ورود یکپارچه (SSO)</h3>
        <p className="text-[11.5px] text-ink-400 leading-5 mb-3">
          این بخش به ازای هر مشتری متفاوت است — منبع هویت سازمان (AD/LDAP یا IdP) این‌جا وصل می‌شود.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">روش ورود</label>
            <select value={draft.ssoProvider} onChange={(e) => setDraft((d) => ({ ...d, ssoProvider: e.target.value as SsoProvider }))} className="input-field">
              {providers.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نشانی سرویس هویت</label>
            <input value={draft.ssoEndpoint} onChange={(e) => setDraft((d) => ({ ...d, ssoEndpoint: e.target.value }))} className="input-field" dir="ltr" placeholder="ldaps://ad.example.local:636" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">دامنه‌ی سازمانی کاربران</label>
            <input value={draft.ssoDomainHint} onChange={(e) => setDraft((d) => ({ ...d, ssoDomainHint: e.target.value }))} className="input-field" dir="ltr" placeholder="example.local" />
          </div>
          <div className="flex items-end">
            <Button variant="secondary" size="sm" icon={<Plug size={14} />} onClick={testSso}>تست اتصال</Button>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink-800">ایجاد خودکار حساب کاربران</p>
              <p className="text-[11px] text-ink-400 leading-5">کاربرِ تاییدشده در منبع هویت، بدون دخالت راهبر ساخته می‌شود.</p>
            </div>
            <Toggle on={draft.autoProvision} onChange={() => setDraft((d) => ({ ...d, autoProvision: !d.autoProvision }))} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink-800">اجازه‌ی ورود محلی در کنار SSO</p>
              <p className="text-[11px] text-ink-400 leading-5">برای پیمانکاران و مهمان‌هایی که در AD سازمان نیستند.</p>
            </div>
            <Toggle on={draft.allowLocalLogin} onChange={() => setDraft((d) => ({ ...d, allowLocalLogin: !d.allowLocalLogin }))} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={save} disabled={!dirty}>ذخیره تغییرات</Button>
        {dirty && <Button variant="secondary" onClick={() => setDraft(identity)}>بازگردانی</Button>}
        {!dirty && <span className="text-[11.5px] text-ink-400">تغییری برای ذخیره وجود ندارد.</span>}
      </div>
    </div>
  );
}

function HoldingsSection({ notify }: { notify: Notify }) {
  const {
    identity, holdings, companiesOf, companies,
    addHolding, updateHolding, removeHolding,
    addCompany, updateCompany, removeCompany,
    session, canManageHoldings, managedHoldingIds,
  } = useTenancy();
  const confirm = useConfirm();

  // زنجیره‌ی واگذاری: هر سطح فقط زیرمجموعه‌ی خودش را می‌بیند و اداره می‌کند
  const visibleHoldings = holdings.filter((h) => managedHoldingIds.includes(h.id));
  const canManageCompaniesOf = (holdingId: string) => managedHoldingIds.includes(holdingId);

  const [hOpen, setHOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<string | null>(null);
  const [hForm, setHForm] = useState({ name: "", lead: "", color: "#1f4f99" });

  const [cOpen, setCOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [cForm, setCForm] = useState({ name: "", holdingId: "", field: "", users: "" });

  const openHolding = (id?: string) => {
    const h = holdings.find((x) => x.id === id);
    setEditingHolding(h?.id ?? null);
    setHForm(h ? { name: h.name, lead: h.lead ?? "", color: h.color } : { name: "", lead: "", color: tenantPalette[holdings.length % tenantPalette.length] });
    setHOpen(true);
  };

  const submitHolding = () => {
    if (!hForm.name.trim()) {
      notify("نام هلدینگ الزامی است.", "warning");
      return;
    }
    if (editingHolding) {
      updateHolding(editingHolding, { name: hForm.name.trim(), lead: hForm.lead.trim() || undefined, color: hForm.color });
      notify(`هلدینگ «${hForm.name.trim()}» ویرایش شد.`);
    } else {
      addHolding({ name: hForm.name.trim(), lead: hForm.lead.trim() || undefined, color: hForm.color, active: true });
      notify(`هلدینگ «${hForm.name.trim()}» ایجاد شد. حالا می‌توانید شرکت‌های زیرمجموعه‌اش را تعریف کنید.`);
    }
    setHOpen(false);
    setEditingHolding(null);
  };

  const deleteHolding = (id: string, name: string) => {
    const count = companiesOf(id).length;
    confirm({
      title: `حذف هلدینگ «${name}»؟`,
      message: count
        ? `${count.toLocaleString("fa-IR")} شرکت زیرمجموعه و همه‌ی محتوای اختصاصی آن‌ها نیز حذف می‌شود.`
        : "این هلدینگ شرکت زیرمجموعه‌ای ندارد.",
      onConfirm: () => {
        removeHolding(id);
        notify(`هلدینگ «${name}» حذف شد.`, "info");
      },
    });
  };

  const openCompany = (id?: string, holdingId?: string) => {
    const c = companies.find((x) => x.id === id);
    setEditingCompany(c?.id ?? null);
    setCForm(
      c
        ? { name: c.name, holdingId: c.holdingId, field: c.field ?? "", users: String(c.users) }
        : { name: "", holdingId: holdingId ?? visibleHoldings[0]?.id ?? "", field: "", users: "" }
    );
    setCOpen(true);
  };

  const submitCompany = () => {
    if (!cForm.name.trim() || !cForm.holdingId) {
      notify("نام شرکت و هلدینگ مادر الزامی است.", "warning");
      return;
    }
    const payload = {
      name: cForm.name.trim(),
      holdingId: cForm.holdingId,
      field: cForm.field.trim() || undefined,
      users: Number(cForm.users) || 0,
    };
    if (editingCompany) {
      updateCompany(editingCompany, payload);
      notify(`شرکت «${payload.name}» ویرایش شد.`);
    } else {
      addCompany({ ...payload, active: true });
      const holdingName = holdings.find((h) => h.id === cForm.holdingId)?.name ?? "";
      notify(`شرکت «${payload.name}» به «${holdingName}» افزوده شد. از این پس محتوای اختصاصی و کاربران این شرکت قابل تعریف است.`);
    }
    setCOpen(false);
    setEditingCompany(null);
  };

  const deleteCompany = (id: string, name: string) =>
    confirm({
      title: `حذف شرکت «${name}»؟`,
      message: "کاربران و محتوای اختصاصی این شرکت دیگر در دسترس نخواهد بود.",
      onConfirm: () => {
        removeCompany(id);
        notify(`شرکت «${name}» حذف شد.`, "info");
      },
    });

  const totalUsers = companies.filter((c) => managedHoldingIds.includes(c.holdingId)).reduce((s, c) => s + c.users, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-ink-900">ساختار هلدینگ‌ها و شرکت‌های زیرمجموعه</h3>
        <div className="flex items-center gap-2">
          {canManageHoldings && (
            <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => openHolding()}>
              هلدینگ جدید
            </Button>
          )}
          {visibleHoldings.length > 0 && (
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => openCompany()}>
              افزودن شرکت
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="هلدینگ‌ها" value={visibleHoldings.length.toLocaleString("fa-IR")} tone="brand" icon={<Network size={16} />} />
        <StatCard label="شرکت‌ها" value={companies.filter((c) => managedHoldingIds.includes(c.holdingId)).length.toLocaleString("fa-IR")} icon={<Building2 size={16} />} />
        <StatCard label="کاربران سازمانی" value={totalUsers.toLocaleString("fa-IR")} tone="success" icon={<Users size={16} />} />
        <StatCard label="سیستم" value={identity.shortName} />
      </div>

      <div className="card p-4 mb-4 bg-brand-50 border-brand-200 flex items-start gap-3">
        <Network size={18} className="text-brand-700 shrink-0 mt-0.5" />
        <p className="text-xs text-brand-800 leading-6">
          <b>زنجیره‌ی واگذاری اختیار:</b> مدیر سیستم هلدینگ‌ها را می‌سازد و مدیر هر هلدینگ را منصوب می‌کند؛
          مدیر هلدینگ شرکت‌های هلدینگ خودش را می‌سازد و مدیر شرکت را تعیین می‌کند؛ مدیر شرکت کاربران همان
          شرکت را اضافه می‌کند. هیچ سطحی نمی‌تواند بیرون از دامنه‌ی خودش چیزی بدهد.
          <br />
          کاربر عضویتش را انتخاب نمی‌کند — دامنه‌ی دیدش خودکار از روی عضویتش محاسبه می‌شود؛ فقط اگر عضو
          بیش از یک شرکت باشد، سوییچر بالای صفحه برایش ظاهر می‌شود.
          <br />
          <b>سطح دسترسی شما در این نشست:</b> {session.level}
          {session.level !== "سیستم" && " — فقط زیرمجموعه‌ی خودتان را می‌بینید."}
        </p>
      </div>

      <div className="space-y-3">
        {visibleHoldings.length === 0 && (
          <div className="card p-6 text-center text-sm text-ink-400">
            در دامنه‌ی شما هلدینگی برای مدیریت وجود ندارد.
          </div>
        )}
        {visibleHoldings.map((h) => {
          const hCompanies = companiesOf(h.id);
          return (
            <div key={h.id} className="card p-4">
              <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                <span className="w-7 h-7 rounded-lg shrink-0" style={{ backgroundColor: h.color }} />
                <p className="text-sm font-bold text-ink-900">{h.name}</p>
                {h.lead && <span className="text-xs text-ink-400">راهبر: {h.lead}</span>}
                <span className="text-xs text-ink-400">{hCompanies.length.toLocaleString("fa-IR")} شرکت</span>
                <span className="flex-1" />
                <Toggle
                  on={h.active}
                  onChange={() => {
                    updateHolding(h.id, { active: !h.active });
                    notify(`هلدینگ «${h.name}» ${h.active ? "غیرفعال" : "فعال"} شد.`, h.active ? "info" : "success");
                  }}
                />
                {canManageCompaniesOf(h.id) && (
                  <Button variant="ghost" size="sm" icon={<Plus size={12} />} onClick={() => openCompany(undefined, h.id)}>شرکت</Button>
                )}
                <RowActions
                  onEdit={() => openHolding(h.id)}
                  onDelete={canManageHoldings ? () => deleteHolding(h.id, h.name) : undefined}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {hCompanies.length === 0 && <span className="text-xs text-ink-400">شرکتی تعریف نشده است.</span>}
                {hCompanies.map((c) => (
                  <span key={c.id} className={`text-xs rounded-md px-2.5 py-1.5 flex items-center gap-1.5 border ${c.active ? "text-ink-700 bg-ink-50 border-ink-100" : "text-ink-400 bg-ink-50/50 border-dashed border-ink-200"}`}>
                    <Building2 size={12} className="text-ink-400" />
                    {c.name}
                    <span className="text-[10px] text-ink-400">({c.users.toLocaleString("fa-IR")} کاربر)</span>
                    <RowActions onEdit={() => openCompany(c.id)} onDelete={() => deleteCompany(c.id, c.name)} size={12} />
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={hOpen} onClose={() => setHOpen(false)} title={editingHolding ? "ویرایش هلدینگ" : "تعریف هلدینگ جدید"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام هلدینگ <span className="text-rose-500">*</span></label>
            <input value={hForm.name} onChange={(e) => setHForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثلاً: هلدینگ ساختمان و مسکن" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">راهبر / مدیرعامل</label>
              <input value={hForm.lead} onChange={(e) => setHForm((f) => ({ ...f, lead: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">رنگ شناسه</label>
              <input type="color" value={hForm.color} onChange={(e) => setHForm((f) => ({ ...f, color: e.target.value }))} className="input-field h-[38px] p-1" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitHolding}>{editingHolding ? "ذخیره تغییرات" : "ایجاد هلدینگ"}</Button>
            <Button variant="secondary" onClick={() => setHOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      <Modal open={cOpen} onClose={() => setCOpen(false)} title={editingCompany ? "ویرایش شرکت" : "افزودن شرکت زیرمجموعه"} description={editingCompany ? undefined : "شرکت جدید زیر هلدینگ انتخابی قرار می‌گیرد و محتوای اختصاصی خودش را خواهد داشت."}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام شرکت <span className="text-rose-500">*</span></label>
            <input value={cForm.name} onChange={(e) => setCForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثلاً: شرکت کشت و صنعت جدید" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">هلدینگ مادر <span className="text-rose-500">*</span></label>
            <select value={cForm.holdingId} onChange={(e) => setCForm((f) => ({ ...f, holdingId: e.target.value }))} className="input-field">
              {visibleHoldings.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">حوزه‌ی فعالیت</label>
              <input value={cForm.field} onChange={(e) => setCForm((f) => ({ ...f, field: e.target.value }))} className="input-field" placeholder="صنایع غذایی" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 block mb-1.5">تعداد کاربر</label>
              <input value={cForm.users} onChange={(e) => setCForm((f) => ({ ...f, users: e.target.value }))} className="input-field" placeholder="۰" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitCompany}>{editingCompany ? "ذخیره تغییرات" : "افزودن شرکت"}</Button>
            <Button variant="secondary" onClick={() => setCOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
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
          عملکرد سایر ماژول‌ها تأثیری ندارد — معماری سامانه برای این نوع جداسازی طراحی شده است.
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


function RolesSection({ roles, setRoles, notify }: { roles: RoleDef[]; setRoles: (fn: (prev: RoleDef[]) => RoleDef[]) => void; notify: Notify }) {
  const [editing, setEditing] = useState<RoleDef | "new" | null>(null);
  // هوک‌ها باید پیش از هر return شرطی صدا زده شوند (rules-of-hooks)
  const confirm = useConfirm();

  if (editing !== null) {
    return (
      <RoleEditor
        role={editing === "new" ? null : editing}
        onCancel={() => setEditing(null)}
        onSave={(saved) => {
          if (editing === "new") {
            setRoles((prev) => [...prev, saved]);
            notify(`نقش سفارشی «${saved.title}» با ${saved.permissions.length.toLocaleString("fa-IR")} دسترسی ایجاد شد. اکنون می‌توانید آن را از بخش «کاربران» به اعضا تخصیص دهید.`);
          } else {
            setRoles((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
            notify(`دسترسی‌های نقش «${saved.title}» به‌روزرسانی شد.`);
          }
          setEditing(null);
        }}
      />
    );
  }

  const removeRole = (role: RoleDef) =>
    confirm({
      title: `حذف نقش «${role.title}»؟`,
      message: `${role.members.toLocaleString("fa-IR")} کاربر این نقش به «عضو عادی» منتقل می‌شوند.`,
      onConfirm: () => {
        setRoles((prev) => prev.filter((r) => r.id !== role.id));
        notify(`نقش «${role.title}» حذف شد. کاربران آن به نقش «عضو عادی» منتقل می‌شوند.`, "info");
      },
    });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-ink-900">نقش‌ها و سطوح دسترسی</h3>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
          نقش جدید
        </Button>
      </div>
      <div className="card p-4 mb-4 bg-brand-50 border-brand-200 flex items-start gap-3">
        <KeyRound size={18} className="text-brand-700 shrink-0 mt-0.5" />
        <p className="text-xs text-brand-800 leading-6">
          علاوه بر نقش‌های پایه‌ی سامانه، می‌توانید نقش کاملاً سفارشی تعریف کنید و تک‌تک دسترسی‌های هر ماژول را
          برای آن تیک بزنید. سپس از بخش «کاربران و واردسازی» این نقش را به هر کاربر تخصیص دهید.
        </p>
      </div>
      <div className="card divide-y divide-ink-100">
        {roles.map((r) => (
          <div key={r.id} className="p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-900 flex items-center gap-2 flex-wrap">
                {r.title} <Badge tone={r.scope === "سیستم" ? "navy" : r.scope === "هلدینگ" ? "brand" : r.scope === "شرکت" ? "warning" : "neutral"}>{r.scope}</Badge>
                {!r.system && <Badge tone="warning">سفارشی</Badge>}
              </p>
              <p className="text-xs text-ink-400 mt-0.5">{r.description}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-ink-400 hidden sm:block">{r.permissions.length.toLocaleString("fa-IR")} دسترسی</span>
              <span className="text-xs text-ink-400 hidden sm:block">{r.members.toLocaleString("fa-IR")} نفر</span>
              <Button variant="secondary" size="sm" icon={<Pencil size={13} />} onClick={() => setEditing(r)}>
                ویرایش دسترسی‌ها
              </Button>
              {!r.system && (
                <button onClick={() => removeRole(r)} className="text-rose-500 hover:text-rose-700 p-1" title="حذف نقش">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleEditor({ role, onSave, onCancel }: { role: RoleDef | null; onSave: (r: RoleDef) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(role?.title ?? "");
  const [scope, setScope] = useState<RoleDef["scope"]>(role?.scope ?? "هلدینگ");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleGroup = (group: (typeof permissionCatalog)[number]) => {
    const ids = group.actions.map((a) => a.id);
    const allOn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const submit = () => {
    if (!title.trim()) {
      setError("عنوان نقش الزامی است.");
      return;
    }
    if (selected.size === 0) {
      setError("دست‌کم یک دسترسی برای این نقش انتخاب کنید.");
      return;
    }
    onSave({
      id: role?.id ?? `role-${Date.now()}`,
      title: title.trim(),
      scope,
      description: description.trim() || "بدون توضیحات",
      members: role?.members ?? 0,
      permissions: Array.from(selected),
      system: role?.system,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
          <KeyRound size={15} className="text-brand-600" />
          {role ? `ویرایش نقش «${role.title}»` : "تعریف نقش سفارشی جدید"}
        </h3>
        <Button variant="secondary" size="sm" onClick={onCancel}>بازگشت به فهرست نقش‌ها</Button>
      </div>

      <div className="card p-5">
        <h4 className="text-xs font-bold text-ink-900 mb-4">مشخصات نقش</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان نقش</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: ناظر مالی پروژه" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">دامنه‌ی اعمال</label>
            <select value={scope} onChange={(e) => setScope(e.target.value as RoleDef["scope"])} className="input-field">
              <option value="سیستم">سیستم (همه‌ی هلدینگ‌ها)</option>
              <option value="هلدینگ">هلدینگ</option>
              <option value="شرکت">شرکت</option>
              <option value="گروه">گروه</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-ink-600 block mb-1.5">توضیحات نقش</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="این نقش برای چه کسانی و با چه هدفی تعریف می‌شود؟" className="input-field min-h-16" />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h4 className="text-xs font-bold text-ink-900">دسترسی‌ها</h4>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-ink-400">
              {selected.size.toLocaleString("fa-IR")} از {allPermissionIds.length.toLocaleString("fa-IR")} دسترسی انتخاب شده
            </span>
            <button onClick={() => setSelected(new Set(allPermissionIds))} className="text-brand-600 font-medium hover:text-brand-700">
              انتخاب همه
            </button>
            <button onClick={() => setSelected(new Set())} className="text-ink-500 font-medium hover:text-ink-700">
              حذف همه
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {permissionCatalog.map((group) => {
            const groupIds = group.actions.map((a) => a.id);
            const onCount = groupIds.filter((id) => selected.has(id)).length;
            const allOn = onCount === groupIds.length;
            return (
              <div key={group.id} className={`rounded-lg border p-3 ${onCount > 0 ? "border-brand-200 bg-brand-50/40" : "border-ink-200 bg-white"}`}>
                <label className="flex items-center justify-between gap-2 cursor-pointer pb-2 mb-2 border-b border-ink-100">
                  <span className="text-[12.5px] font-bold text-ink-900">{group.label}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-ink-400">
                    {onCount.toLocaleString("fa-IR")}/{groupIds.length.toLocaleString("fa-IR")}
                    <input
                      type="checkbox"
                      checked={allOn}
                      ref={(el) => {
                        if (el) el.indeterminate = onCount > 0 && !allOn;
                      }}
                      onChange={() => toggleGroup(group)}
                      className="w-3.5 h-3.5 accent-brand-600"
                    />
                  </span>
                </label>
                <div className="space-y-1.5">
                  {group.actions.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 cursor-pointer text-[12px] text-ink-700 hover:text-ink-900">
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggle(a.id)}
                        className="w-3.5 h-3.5 accent-brand-600 shrink-0"
                      />
                      {a.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="primary" className="flex-1 justify-center" onClick={submit}>
          {role ? "ذخیره‌ی تغییرات نقش" : "افزودن نقش"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>انصراف</Button>
      </div>
    </div>
  );
}

function PagesSection({
  pages,
  setPages,
  extensions,
  setExtensions,
  notify,
}: {
  pages: AdminPageDef[];
  setPages: (fn: (prev: AdminPageDef[]) => AdminPageDef[]) => void;
  extensions: string[];
  setExtensions: (fn: (prev: string[]) => string[]) => void;
  notify: Notify;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [extInput, setExtInput] = useState("");

  const submitPage = () => {
    if (!title.trim() || !slug.trim()) {
      notify("عنوان و آدرس صفحه الزامی است.", "warning");
      return;
    }
    setPages((prev) => [...prev, { id: `page-${Date.now()}`, title: title.trim(), slug: slug.trim(), visible: true }]);
    notify(`صفحه‌ی سفارشی «${title.trim()}» ایجاد شد.`);
    setOpen(false);
    setTitle("");
    setSlug("");
  };

  const togglePageVisibility = (id: string) =>
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)));

  const addExtension = () => {
    const clean = extInput.trim().replace(/^\./, "").toLowerCase();
    if (!clean) return;
    if (extensions.includes(clean)) {
      notify("این پسوند از قبل در فهرست مجاز است.", "warning");
      return;
    }
    setExtensions((prev) => [...prev, clean]);
    notify(`پسوند «.${clean}» به فهرست فایل‌های مجاز افزوده شد.`);
    setExtInput("");
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-ink-900">صفحات سفارشی</h3>
          <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setOpen(true)}>صفحه جدید</Button>
        </div>
        <div className="card divide-y divide-ink-100">
          {pages.map((p) => (
            <button key={p.id} onClick={() => togglePageVisibility(p.id)} className="w-full p-3 flex items-center justify-between text-right hover:bg-ink-50">
              <div>
                <p className="text-sm font-medium text-ink-900">{p.title}</p>
                <p className="text-xs text-ink-400">{p.slug}</p>
              </div>
              {p.visible ? <Eye size={15} className="text-emerald-600" /> : <EyeOff size={15} className="text-ink-300" />}
            </button>
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
          {extensions.map((ext) => (
            <Badge key={ext} tone="neutral">.{ext}</Badge>
          ))}
          <input
            value={extInput}
            onChange={(e) => setExtInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExtension()}
            placeholder="docx"
            className="w-20 text-xs border border-ink-200 rounded-md px-2 py-1 outline-none focus:border-brand-400"
          />
          <button onClick={addExtension} className="text-xs text-brand-600 font-medium px-2">+ افزودن پسوند</button>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="ایجاد صفحه‌ی سفارشی جدید">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان صفحه</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: درباره‌ی ما" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">آدرس صفحه (slug)</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="/about" className="input-field" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitPage}>ایجاد صفحه</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function UsersSection({ tenant, roles, notify }: { tenant: Tenant; roles: RoleDef[]; notify: Notify }) {
  const { holdings, companies, companiesOf, session, managedCompanyIds } = useTenancy();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // مدیر شرکت فقط کاربران شرکت خودش را می‌بیند؛ مدیر هلدینگ کاربران هلدینگش را
  const visibleUsers = orgUsers.filter(
    (u) => session.level === "سیستم" || (u.companyIds ?? []).some((cid) => managedCompanyIds.includes(cid))
  );
  const manageableHoldings = holdings.filter(
    (h) => session.level === "سیستم" || companiesOf(h.id).some((c) => managedCompanyIds.includes(c.id))
  );
  const [assignments, setAssignments] = useState<RoleAssignment>(initialRoleAssignments);

  const assignRole = (userId: string, roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    setAssignments((prev) => {
      const current = prev[userId];
      const level = role?.scope ?? "شرکت";
      // اگر سطح نقش عوض شود، دامنه‌ی قبلی تا جای ممکن حفظ می‌شود
      const grant: RoleGrant =
        level === "سیستم"
          ? { roleId, level }
          : level === "هلدینگ"
            ? { roleId, level, holdingId: current?.holdingId ?? holdings[0]?.id }
            : { roleId, level, holdingId: current?.holdingId ?? companies[0]?.holdingId, companyId: current?.companyId ?? companies[0]?.id };
      return { ...prev, [userId]: grant };
    });
    const user = orgUsers.find((u) => u.id === userId);
    if (user && role) {
      notify(`نقش «${role.title}» با ${role.permissions.length.toLocaleString("fa-IR")} دسترسی به «${user.name}» تخصیص یافت.`);
    }
  };

  const assignScope = (userId: string, value: string) => {
    setAssignments((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      if (value === "system") return { ...prev, [userId]: { ...current, level: "سیستم", holdingId: undefined, companyId: undefined } };
      if (value.startsWith("h:")) {
        const holdingId = value.slice(2);
        return { ...prev, [userId]: { ...current, level: "هلدینگ", holdingId, companyId: undefined } };
      }
      const companyId = value.slice(2);
      const c = companies.find((x) => x.id === companyId);
      return { ...prev, [userId]: { ...current, level: "شرکت", holdingId: c?.holdingId, companyId } };
    });
    const user = orgUsers.find((u) => u.id === userId);
    if (user) notify(`دامنه‌ی دسترسی «${user.name}» به‌روزرسانی شد.`, "info");
  };

  const scopeValue = (g?: RoleGrant) =>
    !g || g.level === "سیستم" ? "system" : g.level === "هلدینگ" ? `h:${g.holdingId}` : `c:${g.companyId}`;

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const estimatedRows = Math.max(3, Math.round(file.size / 80));
    notify(`فایل «${file.name}» پردازش شد — ${estimatedRows.toLocaleString("fa-IR")} کاربر برای سازمان «${tenant.name}» وارد شدند.`);
    e.target.value = "";
  };

  const downloadSample = () => {
    const csv = "نام و نام خانوادگی,شماره موبایل,سمت سازمانی\nکاربر نمونه یک,09121234567,کارشناس روابط‌عمومی\nکاربر نمونه دو,09351234567,کارشناس منابع انسانی\n";
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "نمونه-واردسازی-کاربران.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify("فایل نمونه دانلود شد.", "info");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="کل کاربران" value={tenant.users.toLocaleString("fa-IR")} icon={<Users size={16} />} tone="brand" />
        <StatCard label="کاربران فعال این هفته" value="۸۶۴" tone="success" />
        <StatCard label="در انتظار تایید" value="۱۲" tone="warning" />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <UserCog size={15} className="text-ink-500" /> تخصیص نقش به کاربران
          </h3>
          <span className="text-[11px] text-ink-400">نقش‌های سفارشی را از بخش «نقش‌ها و دسترسی» تعریف کنید</span>
        </div>
        <p className="text-xs text-ink-400 mb-3">
          هر کاربر دقیقاً به اندازه‌ی دسترسی‌های تیک‌خورده‌ی نقشِ تخصیص‌یافته، به بخش‌های سامانه دسترسی خواهد داشت.
          {session.level !== "سیستم" && " شما فقط کاربران زیرمجموعه‌ی خودتان را می‌بینید."}
        </p>
        {visibleUsers.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-400 border border-ink-100 rounded-lg">
            در دامنه‌ی شما کاربری ثبت نشده است.
          </p>
        )}
        <div className="divide-y divide-ink-100 border border-ink-100 rounded-lg">
          {visibleUsers.map((u) => {
            const grant = assignments[u.id];
            const assigned = roles.find((r) => r.id === grant?.roleId) ?? roles.find((r) => r.id === "r4");
            return (
              <div key={u.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: u.avatarColor }}>
                    {u.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{u.name}</p>
                    <p className="text-[11px] text-ink-400 truncate">
                      {u.role} · {(u.companyIds ?? []).length > 0
                        ? (u.companyIds ?? []).map((cid) => companies.find((c) => c.id === cid)?.name ?? cid).join(" + ")
                        : "سطح سیستم"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {assigned && (
                    <span className="text-[11px] text-ink-400 hidden md:block">
                      {assigned.permissions.length.toLocaleString("fa-IR")} دسترسی
                    </span>
                  )}
                  <select
                    value={grant?.roleId ?? "r4"}
                    onChange={(e) => assignRole(u.id, e.target.value)}
                    aria-label={`نقش ${u.name}`}
                    className="text-xs border border-ink-200 rounded-md px-2 py-1.5 outline-none focus:border-brand-400 bg-white"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}{!r.system ? " (سفارشی)" : ""}
                      </option>
                    ))}
                  </select>
                  <select
                    value={scopeValue(grant)}
                    onChange={(e) => assignScope(u.id, e.target.value)}
                    aria-label={`دامنه‌ی دسترسی ${u.name}`}
                    className="text-xs border border-ink-200 rounded-md px-2 py-1.5 outline-none focus:border-brand-400 bg-white max-w-[170px]"
                  >
                    {session.level === "سیستم" && <option value="system">کل سیستم</option>}
                    {manageableHoldings.map((h) => (
                      <optgroup key={h.id} label={h.name}>
                        {session.level !== "شرکت" && <option value={`h:${h.id}`}>کل {h.name}</option>}
                        {companiesOf(h.id)
                          .filter((c) => managedCompanyIds.includes(c.id))
                          .map((c) => (
                            <option key={c.id} value={`c:${c.id}`}>{c.name}</option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold text-ink-900 mb-1">واردسازی دسته‌ای کاربران</h3>
        <p className="text-xs text-ink-400 mb-3">فایل اکسل حاوی نام، شماره موبایل و سمت سازمانی کاربران را بارگذاری کنید.</p>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <Button variant="primary" icon={<Upload size={14} />} onClick={() => fileInputRef.current?.click()}>بارگذاری فایل اکسل</Button>
          <Button variant="secondary" icon={<Download size={14} />} onClick={downloadSample}>دانلود نمونه فایل</Button>
        </div>
      </div>
    </div>
  );
}

function IntegrationsSection({
  integrations,
  setIntegrations,
  notify,
}: {
  integrations: Integration[];
  setIntegrations: (fn: (prev: Integration[]) => Integration[]) => void;
  notify: Notify;
}) {
  const typeIcon = { "وب‌هوک ورودی": Webhook, "وب‌هوک خروجی": Webhook, بات: Bot, "دستور اسلش": Slash } as const;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<Integration["type"]>("وب‌هوک ورودی");
  const [channel, setChannel] = useState("");

  const submit = () => {
    if (!name.trim() || !channel.trim()) {
      notify("نام و کانال هدف الزامی است.", "warning");
      return;
    }
    const newIntegration: Integration = { id: `ig-${Date.now()}`, name: name.trim(), type, channel: channel.trim(), status: "فعال", createdBy: currentUser.name };
    setIntegrations((prev) => [newIntegration, ...prev]);
    notify(`یکپارچه‌سازی «${newIntegration.name}» ایجاد شد و اکنون فعال است.`);
    setOpen(false);
    setName("");
    setChannel("");
    setType("وب‌هوک ورودی");
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 bg-brand-50 border-brand-200 flex items-start gap-3">
        <Webhook size={18} className="text-brand-700 shrink-0 mt-0.5" />
        <p className="text-xs text-brand-800 leading-6">
          وب‌هوک‌های ورودی/خروجی، بات‌ها و دستورهای اسلش به کانال‌های ارتباطی متصل می‌شوند تا ابزارهای دیگر سازمان
          (CI/CD، فرم‌ساز، تیکتینگ و...) بتوانند به‌صورت خودکار در گفتگوها پیام بدهند یا از آن‌ها داده بگیرند.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900">یکپارچه‌سازی‌های فعال</h3>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setOpen(true)}>افزودن یکپارچه‌سازی</Button>
      </div>

      <div className="card divide-y divide-ink-100">
        {integrations.map((i) => {
          const Icon = typeIcon[i.type];
          return (
            <div key={i.id} className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">
                  <Icon size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">{i.name}</p>
                  <p className="text-xs text-ink-400">{i.type} · کانال: {i.channel} · سازنده: {i.createdBy}</p>
                </div>
              </div>
              <Badge tone={i.status === "فعال" ? "success" : "neutral"}>{i.status}</Badge>
            </div>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="افزودن یکپارچه‌سازی جدید">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام یکپارچه‌سازی</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: اعلان استقرار نسخه‌ی جدید" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نوع</label>
            <select value={type} onChange={(e) => setType(e.target.value as Integration["type"])} className="input-field">
              <option value="وب‌هوک ورودی">وب‌هوک ورودی</option>
              <option value="وب‌هوک خروجی">وب‌هوک خروجی</option>
              <option value="بات">بات</option>
              <option value="دستور اسلش">دستور اسلش</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">کانال هدف</label>
            <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="فاز-یک-فنی" className="input-field" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>ایجاد</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SecurityToggleCard({ title, description, icon, defaultOn, notify }: { title: string; description: string; icon?: React.ReactNode; defaultOn: boolean; notify: Notify }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="card p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5">{icon}{title}</p>
        <p className="text-xs text-ink-400 mt-0.5">{description}</p>
      </div>
      <Toggle
        on={on}
        onChange={() => {
          setOn((v) => !v);
          notify(`${title}: ${!on ? "فعال" : "غیرفعال"} شد.`, "info");
        }}
      />
    </div>
  );
}

function SecuritySection({
  guestAccounts,
  setGuestAccounts,
  notify,
}: {
  guestAccounts: GuestAccount[];
  setGuestAccounts: (fn: (prev: GuestAccount[]) => GuestAccount[]) => void;
  notify: Notify;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [channels, setChannels] = useState("");
  const [expires, setExpires] = useState("");

  const submit = () => {
    if (!name.trim() || !org.trim()) {
      notify("نام و سازمان مهمان الزامی است.", "warning");
      return;
    }
    const newGuest: GuestAccount = {
      id: `gu-${Date.now()}`,
      name: name.trim(),
      org: org.trim(),
      channels: channels.split("،").map((c) => c.trim()).filter(Boolean),
      expires: expires.trim() || "نامشخص",
    };
    setGuestAccounts((prev) => [...prev, newGuest]);
    notify(`دعوت‌نامه‌ی مهمان برای «${newGuest.name}» ارسال شد.`);
    setOpen(false);
    setName("");
    setOrg("");
    setChannels("");
    setExpires("");
  };

  const exportCompliance = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      tenant: "گزارش جامع انطباق و رخدادهای امنیتی",
      events: [
        "۳ تلاش ناموفق ورود از IP ناشناس",
        "اسکن دوره‌ای فایل‌های میزبان با موفقیت انجام شد",
        "درخواست خروجی استعلام‌پذیر (eDiscovery) برای واحد حقوقی ثبت شد",
      ],
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "گزارش-انطباق.json";
    a.click();
    URL.revokeObjectURL(url);
    notify("خروجی انطباق آماده و دانلود شد.", "info");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SecurityToggleCard title="نمایش کپچا در فرم ورود" description="جلوگیری از ورود ربات‌ها به فرم احراز هویت" defaultOn notify={notify} />
        <SecurityToggleCard title="اسکن ضدویروس پیوست‌ها (ClamAV)" description="عدم ذخیره‌ی فایل‌های آلوده و اطلاع‌رسانی به کاربر" defaultOn notify={notify} />
        <SecurityToggleCard title="محدودسازی نرخ درخواست" description="حداکثر ۶۰ درخواست در دقیقه به ازای هر کاربر" defaultOn notify={notify} />
        <SecurityToggleCard title="ثبت کامل رخدادها (Audit Log)" description="آماده برای ارائه به نهادهای نظارتی مانند افتا" defaultOn notify={notify} />
        <SecurityToggleCard
          title="برچسب طبقه‌بندی پیام (Classification Banner)"
          description="نمایش نوار «محرمانه / عمومی / ویژه» بالای کانال‌های حساس"
          icon={<Tag size={13} className="text-ink-400" />}
          defaultOn={false}
          notify={notify}
        />
        <SecurityToggleCard title="پیام خودسوز (Burn-on-Read)" description="حذف خودکار پیام‌های بسیار حساس پس از مشاهده" defaultOn={false} notify={notify} />
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <UserCog size={15} className="text-ink-500" /> حساب‌های مهمان (Guest Accounts)
          </h3>
          <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setOpen(true)}>دعوت مهمان</Button>
        </div>
        <p className="text-xs text-ink-400 mb-3">دسترسی محدود برای افراد خارج از سازمان (مثل ناظر یا مشاور) فقط به کانال‌های مشخص.</p>
        {guestAccounts.length === 0 ? (
          <p className="text-xs text-ink-400">حساب مهمانی ثبت نشده.</p>
        ) : (
          <div className="space-y-2">
            {guestAccounts.map((g) => (
              <div key={g.id} className="flex items-center justify-between text-xs border border-ink-100 rounded-lg p-2.5">
                <div>
                  <p className="font-medium text-ink-800">{g.name}</p>
                  <p className="text-ink-400 mt-0.5">{g.org} · دسترسی: {g.channels.join("، ") || "—"}</p>
                </div>
                <span className="text-ink-400">انقضا {g.expires}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-1.5">
          <Ban size={15} className="text-rose-600" /> کاربران مسدودشده
        </h3>
        <p className="text-xs text-ink-400">در حال حاضر کاربر مسدودشده‌ای وجود ندارد.</p>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-ink-900">آخرین رخدادهای امنیتی</h3>
          <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={exportCompliance}>خروجی انطباق (Compliance Export)</Button>
        </div>
        <ul className="space-y-2 text-xs text-ink-500">
          <li className="flex items-center gap-2"><AlertTriangle size={13} className="text-amber-500" /> ۳ تلاش ناموفق ورود از IP ناشناس — ۲ ساعت پیش</li>
          <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-500" /> اسکن دوره‌ای فایل‌های میزبان با موفقیت انجام شد — امروز ۰۳:۰۰</li>
          <li className="flex items-center gap-2"><FileWarning size={13} className="text-ink-400" /> درخواست خروجی استعلام‌پذیر (eDiscovery) برای واحد حقوقی ثبت شد — دیروز</li>
        </ul>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="دعوت حساب مهمان جدید" description="حساب مهمان فقط به کانال‌های مشخص‌شده دسترسی دارد و به سایر اطلاعات سازمان دسترسی ندارد.">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام و نام خانوادگی</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: مهندس ناظر طرح" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">سازمان مهمان</label>
            <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="مثلاً: شرکت مشاور فنی" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">کانال‌های قابل دسترس (با «،» جدا کنید)</label>
            <input value={channels} onChange={(e) => setChannels(e.target.value)} placeholder="فاز-یک-فنی" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">تاریخ انقضا</label>
            <input value={expires} onChange={(e) => setExpires(e.target.value)} placeholder="۱۴۰۵/۰۶/۰۱" className="input-field" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>ارسال دعوت‌نامه</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
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
            <h3 className="text-sm font-bold text-ink-900">تعامل بین اعضای مجموعه‌های مختلف بنیاد</h3>
            <Toggle on={crossTenant} onChange={() => setCrossTenant(!crossTenant)} />
          </div>
          <p className="text-xs text-ink-500 mt-2 leading-6">
            با فعال‌سازی این گزینه، اعضای این سازمان می‌توانند با اعضای سایر مجموعه‌هایی که از این سامانه استفاده
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
