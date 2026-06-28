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
} from "lucide-react";
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

type SectionId = "tenants" | "modules" | "branding" | "roles" | "pages" | "users" | "integrations" | "security" | "network";

const sections: { id: SectionId; label: string; icon: typeof Settings }[] = [
  { id: "tenants", label: "سازمان‌های مشتری", icon: Building2 },
  { id: "modules", label: "بازارچه‌ی ماژول‌ها", icon: Plug },
  { id: "branding", label: "برندسازی سازمان", icon: Palette },
  { id: "roles", label: "نقش‌ها و دسترسی", icon: KeyRound },
  { id: "pages", label: "صفحات و منوها", icon: LayoutTemplate },
  { id: "users", label: "کاربران و واردسازی", icon: Users },
  { id: "integrations", label: "یکپارچه‌سازی و اتوماسیون", icon: Webhook },
  { id: "security", label: "امنیت و انطباق", icon: ShieldCheck },
  { id: "network", label: "تعامل بین‌سازمانی", icon: Network },
];

const tenantPalette = ["#1f4f99", "#2a66bd", "#0d9488", "#7c3aed", "#b45309", "#0f172a"];

export default function Admin() {
  const [section, setSection] = useState<SectionId>("tenants");
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [activeTenant, setActiveTenant] = useState(initialTenants[0].id);
  const tenant = tenants.find((t) => t.id === activeTenant) ?? tenants[0];
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

  const addTenant = (t: Tenant) => {
    setTenants((prev) => [...prev, t]);
    setActiveTenant(t.id);
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
            <TenantsSection tenants={tenants} activeTenant={activeTenant} setActiveTenant={setActiveTenant} onAdd={addTenant} notify={notify} />
          )}

          {section === "modules" && (
            <ModulesSection enabledModules={enabledModules} toggleModule={toggleModule} />
          )}

          {section === "branding" && <BrandingSection tenant={tenant} notify={notify} />}

          {section === "roles" && <RolesSection roles={roles} setRoles={setRoles} notify={notify} />}

          {section === "pages" && <PagesSection pages={pages} setPages={setPages} extensions={extensions} setExtensions={setExtensions} notify={notify} />}

          {section === "users" && <UsersSection tenant={tenant} notify={notify} />}

          {section === "integrations" && <IntegrationsSection integrations={integrations} setIntegrations={setIntegrations} notify={notify} />}

          {section === "security" && <SecuritySection guestAccounts={guestAccounts} setGuestAccounts={setGuestAccounts} notify={notify} />}

          {section === "network" && (
            <NetworkSection crossTenant={crossTenant} setCrossTenant={setCrossTenant} />
          )}
        </div>
      </div>
    </div>
  );
}

type Notify = (message: string, tone?: "success" | "info" | "warning") => void;

function TenantsSection({
  tenants,
  activeTenant,
  setActiveTenant,
  onAdd,
  notify,
}: {
  tenants: Tenant[];
  activeTenant: string;
  setActiveTenant: (id: string) => void;
  onAdd: (t: Tenant) => void;
  notify: Notify;
}) {
  const planTone = { پایه: "neutral", "حرفه‌ای": "warning", سازمانی: "brand" } as const;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [plan, setPlan] = useState<Tenant["plan"]>("پایه");

  const submit = () => {
    if (!name.trim() || !domain.trim()) {
      notify("نام سازمان و دامنه الزامی است.", "warning");
      return;
    }
    const newTenant: Tenant = {
      id: `tn-${Date.now()}`,
      name: name.trim(),
      domain: domain.trim(),
      plan,
      users: 1,
      logoColor: tenantPalette[tenants.length % tenantPalette.length],
      modules: ["شبکه اجتماعی"],
    };
    onAdd(newTenant);
    notify(`سازمان «${newTenant.name}» با موفقیت روی پلتفرم موتوشاب ایجاد شد.`);
    setOpen(false);
    setName("");
    setDomain("");
    setPlan("پایه");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-ink-900">سازمان‌های مستقل روی این پلتفرم</h3>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setOpen(true)}>
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

      <Modal open={open} onClose={() => setOpen(false)} title="افزودن سازمان مشتری جدید" description="هر سازمان جدید، نمونه‌ی کاملاً مستقلی از موتوشاب با اعضا و دامنه‌ی اختصاصی خودش دریافت می‌کند.">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">نام سازمان</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: گروه صنعتی ایران‌خودرو" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">دامنه‌ی اختصاصی</label>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="motoshub.irankhodro.com" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">طرح اشتراک</label>
            <select value={plan} onChange={(e) => setPlan(e.target.value as Tenant["plan"])} className="input-field">
              <option value="پایه">پایه</option>
              <option value="حرفه‌ای">حرفه‌ای</option>
              <option value="سازمانی">سازمانی</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>ایجاد سازمان</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
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

function BrandingSection({ tenant, notify }: { tenant: Tenant; notify: Notify }) {
  const [color, setColor] = useState(tenant.logoColor);
  const [domain, setDomain] = useState(tenant.domain);
  const [displayName, setDisplayName] = useState("موتوشاب");
  const [logoName, setLogoName] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const colorOptions = ["#1f4f99", "#2a66bd", "#0d9488", "#7c3aed", "#b45309", "#0f172a"];

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoName(file.name);
    notify(`لوگوی «${file.name}» بارگذاری شد. پس از ذخیره در سراسر سازمان «${tenant.name}» اعمال می‌شود.`, "info");
    e.target.value = "";
  };

  const save = () => notify(`تغییرات برندسازی سازمان «${tenant.name}» ذخیره شد.`);

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
          <input ref={logoInputRef} type="file" accept="image/png,image/svg+xml" className="hidden" onChange={handleLogo} />
          <button onClick={() => logoInputRef.current?.click()} className="flex items-center gap-2 border border-dashed border-ink-300 rounded-lg px-4 py-3 text-xs text-ink-500 hover:border-brand-400">
            <Upload size={14} /> {logoName ?? "بارگذاری فایل PNG/SVG"}
          </button>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-600 block mb-2">دامنه‌ی اختصاصی</label>
          <input value={domain} onChange={(e) => setDomain(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-600 block mb-2">نام نمایشی پلتفرم برای این سازمان</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-field" />
        </div>
        <Button variant="primary" onClick={save}>ذخیره‌ی برندسازی</Button>
      </div>

      <div className="card p-0 overflow-hidden h-fit">
        <p className="text-[11px] text-ink-400 px-3 pt-3">پیش‌نمایش زنده</p>
        <div className="p-3">
          <div className="rounded-lg overflow-hidden border border-ink-200">
            <div className="h-9 flex items-center gap-2 px-3" style={{ backgroundColor: color }}>
              <span className="w-4 h-4 rounded bg-white/30" />
              <span className="text-white text-[11px] font-medium">{displayName}</span>
            </div>
            <div className="p-3 bg-ink-50 space-y-2">
              <div className="h-2 w-3/4 rounded bg-ink-200" />
              <div className="h-2 w-1/2 rounded bg-ink-200" />
              <button className="text-[10px] text-white rounded px-2 py-1 mt-1" style={{ backgroundColor: color }}>
                دکمه‌ی نمونه
              </button>
            </div>
          </div>
          <p className="text-[11px] text-ink-400 mt-2 truncate">دامنه: {domain}</p>
        </div>
      </div>
    </div>
  );
}

function RolesSection({ roles, setRoles, notify }: { roles: RoleDef[]; setRoles: (fn: (prev: RoleDef[]) => RoleDef[]) => void; notify: Notify }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<RoleDef["scope"]>("سازمان");
  const [description, setDescription] = useState("");

  const submit = () => {
    if (!title.trim()) {
      notify("عنوان نقش الزامی است.", "warning");
      return;
    }
    const newRole: RoleDef = { id: `role-${Date.now()}`, title: title.trim(), scope, description: description.trim() || "بدون توضیحات", members: 0 };
    setRoles((prev) => [...prev, newRole]);
    notify(`نقش «${newRole.title}» ایجاد شد. اکنون می‌توانید آن را به کاربران تخصیص دهید.`);
    setOpen(false);
    setTitle("");
    setDescription("");
    setScope("سازمان");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-ink-900">نقش‌ها و سطوح دسترسی</h3>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setOpen(true)}>
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

      <Modal open={open} onClose={() => setOpen(false)} title="ایجاد نقش دسترسی جدید">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">عنوان نقش</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: ناظر مالی پروژه" className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">دامنه‌ی اعمال</label>
            <select value={scope} onChange={(e) => setScope(e.target.value as RoleDef["scope"])} className="input-field">
              <option value="پلتفرم">پلتفرم</option>
              <option value="سازمان">سازمان</option>
              <option value="گروه">گروه</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 block mb-1.5">توضیحات</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-16" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={submit}>ایجاد نقش</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>
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

function UsersSection({ tenant, notify }: { tenant: Tenant; notify: Notify }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const estimatedRows = Math.max(3, Math.round(file.size / 80));
    notify(`فایل «${file.name}» پردازش شد — ${estimatedRows.toLocaleString("fa-IR")} کاربر برای سازمان «${tenant.name}» وارد شدند.`);
    e.target.value = "";
  };

  const downloadSample = () => {
    const csv = "نام و نام خانوادگی,شماره موبایل,سمت سازمانی\nرضا سمیع‌زاده,09121234567,توسعه‌دهنده بک‌اند\nمریم کاظمی‌نیا,09351234567,کارشناس منابع انسانی\n";
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
