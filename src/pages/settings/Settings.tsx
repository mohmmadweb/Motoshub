// «تنظیمات سامانه» — جایگزین پنل راهبری. همه‌ی تنظیمات در یک جا، گروه‌بندی‌شده و هرکدام با
// مجوز جداگانه؛ هر مدیر فقط بخش‌هایی را می‌بیند که در کانتکست فعلی اختیارش را دارد.
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Settings as SettingsIcon, Network, Users, KeyRound, UserCheck, ClipboardCheck, History, Palette, Brush, MessagesSquare, LogIn, ShieldCheck, Plug, LayoutTemplate, Webhook, Globe2, Gauge, Activity, SlidersHorizontal, HardDrive, UserPlus, Layers, ShieldAlert, BellRing, Smartphone, Inbox, Scale, PaintBucket, Eye } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { useTenancy } from "../../context/TenancyContext";
import Admin, { type SectionId } from "../Admin";
import Appearance from "../Appearance";
import SocialAdmin from "../social/SocialAdmin";
import { StructureSection } from "./iam/StructureSection";
import { MembersSection } from "./iam/MembersSection";
import { RolesSection } from "./iam/RolesSection";
import { BindingsSection } from "./iam/BindingsSection";
import { AccessReviewSection } from "./iam/AccessReviewSection";
import { AuditSection } from "./iam/AuditSection";
import UnifiedAuditSection from "./UnifiedAuditSection";
import ChannelsSection from "./ChannelsSection";
import ClassificationSection from "./ClassificationSection";
import LoginPolicySection from "./LoginPolicySection";
import AccessRequestsSection from "./AccessRequestsSection";
import SodSection from "./SodSection";
import ScopedSettingsSection from "./ScopedSettingsSection";
import { ScopeSelect } from "./iam/shared";
import { ADMIN_PERMS, ROOT_ID, descendantsOrSelf } from "../../iam/model";

/** مجوزهایی که «مدیریت تنظیمات» در یک واحد را ممکن می‌کنند (برای انتخابگر واحد تحت مدیریت) */
const SETTINGS_PERMS = [...ADMIN_PERMS, "settings.branding", "settings.security", "settings.pages", "iam.audit.view", "iam.review.manage"];
type Sec = { id: string; label: string; icon: typeof Network; perms: string[]; legacy?: SectionId };
const groups: { title: string; items: Sec[] }[] = [
  {
    title: "سازمان و دسترسی",
    items: [
      { id: "structure", label: "ساختار سازمانی", icon: Network, perms: ["iam.structure.view", "iam.structure.manage"] },
      { id: "members", label: "اعضا و عضویت‌ها", icon: Users, perms: ["iam.members.manage"] },
      { id: "roles", label: "نقش‌ها و مجوزها", icon: KeyRound, perms: ["roles.list", "roles.create", "roles.edit"] },
      { id: "bindings", label: "تخصیص نقش", icon: UserCheck, perms: ["roles.assign"] },
      { id: "access-requests", label: "درخواست‌های دسترسی", icon: Inbox, perms: ["roles.assign"] },
      { id: "review", label: "بازبینی دسترسی‌ها", icon: ClipboardCheck, perms: ["iam.review.manage"] },
      { id: "sod", label: "تفکیک وظایف", icon: Scale, perms: ["iam.review.manage"] },
      { id: "audit", label: "تاریخچه‌ی تغییرات", icon: History, perms: ["iam.audit.view"] },
      { id: "import", label: "واردسازی و دعوت کاربران", icon: UserPlus, perms: ["users.import", "users.create"], legacy: "users" },
    ],
  },
  {
    title: "ظاهر و برندسازی",
    items: [
      { id: "branding", label: "برندسازی سازمان", icon: Palette, perms: ["settings.branding"], legacy: "branding" },
      { id: "scoped", label: "برند و تنظیمات لایه‌ای", icon: PaintBucket, perms: ["settings.branding", "settings.security", "settings.system"] },
      { id: "appearance", label: "ظاهر و نمایش", icon: Brush, perms: [] },
    ],
  },
  {
    title: "ماژول‌ها",
    items: [
      { id: "social", label: "شبکه‌ی اجتماعی و نظارت محتوا", icon: MessagesSquare, perms: ["social.dashboards", "social.settings", "comments.moderate"] },
      { id: "modules", label: "بازارچه‌ی ماژول‌ها", icon: Plug, perms: ["settings.modules"], legacy: "modules" },
      { id: "pages", label: "صفحات و منوها", icon: LayoutTemplate, perms: ["settings.pages"], legacy: "pages" },
      { id: "workflow", label: "پارامترهای گردش کار", icon: Gauge, perms: ["settings.system"], legacy: "workflow" },
      { id: "integrations", label: "یکپارچه‌سازی و اتوماسیون", icon: Webhook, perms: ["settings.system"], legacy: "integrations" },
      { id: "channels", label: "کانال‌های اطلاع‌رسانی (پیامک/ایمیل)", icon: BellRing, perms: ["settings.system"] },
    ],
  },
  {
    title: "ورود، امنیت و زیرساخت",
    items: [
      { id: "identity", label: "ورود یکپارچه (SSO)", icon: LogIn, perms: ["settings.security"], legacy: "system-identity" },
      { id: "security", label: "امنیت و انطباق", icon: ShieldCheck, perms: ["settings.security"], legacy: "security" },
      { id: "login-policy", label: "سیاست ورود و تأیید دومرحله‌ای", icon: Smartphone, perms: ["settings.security"] },
      { id: "classification", label: "طبقه‌بندی اطلاعات", icon: ShieldAlert, perms: ["settings.security"] },
      { id: "audit-all", label: "لاگ ممیزی یکپارچه", icon: Layers, perms: ["iam.audit.view"] },
      { id: "network", label: "تعامل بین‌سازمانی", icon: Globe2, perms: ["settings.system"], legacy: "network" },
      { id: "monitor", label: "پایش زنده‌ی سامانه", icon: Activity, perms: ["settings.system"], legacy: "monitor" },
      { id: "system", label: "تنظیمات کلی سیستم", icon: SlidersHorizontal, perms: ["settings.system"], legacy: "system" },
      { id: "storage", label: "فضای ذخیره‌سازی", icon: HardDrive, perms: ["settings.storage"], legacy: "storage" },
    ],
  },
];

export default function Settings() {
  const t = useTenancy();
  const { hasPermission, contextNode, scopePath, contextId, readOnly } = t;
  // واحدهایی که کاربر می‌تواند تنظیماتشان را مدیریت کند (انتخاب = ایستادن در آن واحد)
  const adminNodes = useMemo(() => {
    const ids = new Set(t.reachable.filter((n) => SETTINGS_PERMS.some((p) => t.canAdmin(n.id, p))).map((n) => n.id));
    return descendantsOrSelf(t.iam, ROOT_ID).filter((n) => ids.has(n.id));
  }, [t]);
  const [params, setParams] = useSearchParams();
  const visible = groups.map((g) => ({ ...g, items: g.items.filter((s) => !s.perms.length || s.perms.some((p) => hasPermission(p))) })).filter((g) => g.items.length);
  const all = visible.flatMap((g) => g.items);
  const current = all.find((s) => s.id === params.get("section")) ?? all[0];
  const go = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("section", id);
    setParams(next, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="تنظیمات سامانه"
        description={`در حال مدیریت: ${scopePath(contextId)} — هر بخش فقط برای کسانی دیده می‌شود که در این واحد اختیارش را دارند.`}
        icon={<SettingsIcon size={18} />}
        actions={
          adminNodes.length > 1 ? (
            <ScopeSelect value={adminNodes.some((n) => n.id === contextId) ? contextId : ""} onChange={(id) => id && t.setContext(id)} nodes={adminNodes} allLabel={adminNodes.some((n) => n.id === contextId) ? undefined : "واحد تحت مدیریت…"} className="w-full sm:w-72" ariaLabel="واحد تحت مدیریت" />
          ) : undefined
        }
      />
      {readOnly && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
          <Eye size={14} className="shrink-0" /> حالت فقط‌خواندنی (مشاهده به‌عنوان کاربر) — هیچ تنظیمی قابل تغییر نیست.
        </div>
      )}
      {/* موبایل */}
      <select className="input-field mb-4 lg:hidden" value={current?.id} onChange={(e) => go(e.target.value)} aria-label="بخش تنظیمات">
        {visible.map((g) => (
          <optgroup key={g.title} label={g.title}>
            {g.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-5">
        <nav className="hidden lg:block card p-2 h-fit sticky top-20 space-y-3" aria-label="بخش‌های تنظیمات">
          {visible.map((g) => (
            <div key={g.title}>
              <p className="text-[10.5px] font-bold text-ink-400 px-2.5 pt-1 pb-1">{g.title}</p>
              {g.items.map((s) => (
                <button
                  key={s.id}
                  onClick={() => go(s.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-right ${current?.id === s.id ? "bg-navy-900 text-white" : "text-ink-600 hover:bg-ink-50"}`}
                >
                  <s.icon size={15} className="shrink-0" />
                  {s.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <fieldset disabled={readOnly} className="min-w-0 border-0 p-0 m-0">
          {!current && <p className="text-sm text-ink-500">در «{contextNode.name}» به هیچ بخشی از تنظیمات دسترسی ندارید.</p>}
          {current?.id === "structure" && <StructureSection />}
          {current?.id === "members" && <MembersSection />}
          {current?.id === "roles" && <RolesSection />}
          {current?.id === "bindings" && <BindingsSection />}
          {current?.id === "review" && <AccessReviewSection />}
          {current?.id === "audit" && <AuditSection />}
          {current?.id === "audit-all" && <UnifiedAuditSection />}
          {current?.id === "channels" && <ChannelsSection />}
          {current?.id === "classification" && <ClassificationSection />}
          {current?.id === "appearance" && <Appearance embedded />}
          {current?.id === "social" && <SocialAdmin embedded />}
          {current?.id === "login-policy" && <LoginPolicySection />}
          {current?.id === "access-requests" && <AccessRequestsSection />}
          {current?.id === "sod" && <SodSection />}
          {current?.id === "scoped" && <ScopedSettingsSection />}
          {current?.legacy && <Admin key={current.legacy} section={current.legacy} />}
        </fieldset>
      </div>
    </div>
  );
}
