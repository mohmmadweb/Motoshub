// ---------------------------------------------------------------------------
// ساختار «تنظیمات سامانه» در یک آرایه: گروه ← بخش ← زبانه‌ی داخلی.
// برای جابه‌جایی منو کافی است بخش‌ها را بین گروه‌ها جابه‌جا کنید؛ هر بخش و زبانه مجوز خودش را دارد
// (perms خالی = برای همه). نشانی: /dashboard/settings?section=<بخش>&tab=<زبانه>
// شناسه‌های قدیمی ?section= در legacySectionMap به بخش + زبانه‌ی جدید نگاشت می‌شوند.
// keywords: برچسب فیلدهای داخلی برای جستجوی «جستجو در تنظیمات».
// ---------------------------------------------------------------------------
import type { ReactNode } from "react";
import {
  Activity,
  BellRing,
  Brush,
  ClipboardCheck,
  Clock,
  Globe2,
  Languages,
  LayoutGrid,
  HardDrive,
  KeyRound,
  Layers,
  Library,
  LogIn,
  MessagesSquare,
  Network,
  Plug,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import Admin from "../Admin";
import { MyAppearanceTab } from "../Appearance";
import { settingsMeta } from "../../context/SettingsContext";
import { systemVarMeta } from "./systemVars";
import { StructureSection } from "./iam/StructureSection";
import { MembersSection } from "./iam/MembersSection";
import { RolesSection } from "./iam/RolesSection";
import { BindingsSection } from "./iam/BindingsSection";
import { AccessReviewSection } from "./iam/AccessReviewSection";
import { SectionHead } from "./iam/shared";
import UnifiedAuditSection from "./UnifiedAuditSection";
import ChannelsSection from "./ChannelsSection";
import ClassificationSection from "./ClassificationSection";
import LoginPolicySection from "./LoginPolicySection";
import AccessRequestsSection from "./AccessRequestsSection";
import SodSection from "./SodSection";
import { ScopedKeysCard } from "./ScopedSettingsSection";
import InviteImportSection from "./InviteImportSection";
import { BrandOrgTab } from "./BrandSection";
import LanguagesSection from "./LanguagesSection";
import SlideshowSection from "./SlideshowSection";
import ExperienceSection from "./ExperienceSection";
import { OrgPublicFieldsCard } from "../org/OrgProfile";
import { AwardSettingsTab, ContractsSettingsTab, FundSettingsTab } from "./InnovationSettings";
import WorkflowParamsCard from "./WorkflowParams";
import { KnowledgeSettingsPanel, NotificationQueuePanel, SocialSettingsPanel, TimesheetSettingsPanel } from "./ModuleSettings";
import { SystemVarsCard } from "../AdminSections";
import { useToast } from "../../components/ui/ToastProvider";
import FeaturedUsersSection from "./FeaturedUsersSection";
import CaptchaSection from "./CaptchaSection";
import RateLimitSection from "./RateLimitSection";
import AutoBlockSection from "./AutoBlockSection";
import AntivirusSection from "./AntivirusSection";

/** ورودی رندر هر بخش/زبانه */
export type RenderCtx = { tab: string | null };
/** داده‌ی شمارنده‌ها (نشان کنار زبانه/بخش) */
export type CountCtx = { pendingRequests: number };

export type SettingsTabDef = { id: string; label: string; perms?: string[]; keywords?: string[]; count?: (c: CountCtx) => number | undefined; render: (c: RenderCtx) => ReactNode };
export type SettingsSectionDef = {
  id: string;
  label: string;
  icon: LucideIcon;
  perms: string[];
  keywords?: string[];
  /** شمارنده‌ی کنار بخش در منو (مثلاً درخواست‌های در انتظار) */
  count?: (c: CountCtx) => number | undefined;
  tabs?: SettingsTabDef[];
  render?: (c: RenderCtx) => ReactNode;
};
export type SettingsGroupDef = { id: string; title: string; sections: SettingsSectionDef[] };

const paramLabels = (module: string) => settingsMeta.filter((m) => m.module === module).map((m) => m.label);
const varLabels = (area: string) => systemVarMeta.filter((m) => m.area === area).map((m) => m.label);

/** هدر ساده برای بخش‌های قدیمی که خودشان عنوان ندارند */
function Head({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return <SectionHead icon={<Icon size={18} />} title={title} description={description} />;
}
function SessionVars() {
  const { notify } = useToast();
  return <SystemVarsCard areas={["session"]} notify={notify} auditArea="ورود و احراز هویت" />;
}

export const settingsGroups: SettingsGroupDef[] = [
  {
    id: "org",
    title: "سازمان و دسترسی",
    sections: [
      { id: "structure", label: "ساختار سازمانی", icon: Network, perms: ["iam.structure.view", "iam.structure.manage"], keywords: ["هلدینگ", "شرکت", "واحد", "درخت سازمانی"], render: () => <StructureSection /> },
      {
        id: "members",
        label: "اعضا",
        icon: Users,
        perms: ["iam.members.manage", "users.import", "users.create"],
        tabs: [
          { id: "list", label: "اعضا و عضویت‌ها", perms: ["iam.members.manage"], keywords: ["عضویت", "تعلیق", "مشاهده به‌عنوان"], render: () => <MembersSection /> },
          { id: "invite", label: "دعوت و واردسازی", perms: ["users.import", "users.create", "iam.members.manage"], keywords: ["دعوت", "واردسازی", "اکسل", "CSV", "فایل نمونه"], render: () => <InviteImportSection /> },
          { id: "featured", label: "کاربران برجسته", perms: ["relations.featured.manage", "iam.members.manage"], keywords: ["برجسته", "دوستی خودکار", "دنبال‌کردن خودکار", "اعضای جدید"], render: () => <FeaturedUsersSection /> },
        ],
      },
      { id: "roles", label: "نقش‌ها و مجوزها", icon: KeyRound, perms: ["roles.list", "roles.create", "roles.edit"], keywords: ["مجوز", "نقش سفارشی"], render: () => <RolesSection /> },
      {
        id: "bindings",
        label: "تخصیص نقش",
        icon: UserCheck,
        perms: ["roles.assign"],
        count: (c) => c.pendingRequests,
        tabs: [
          { id: "list", label: "تخصیص‌ها", keywords: ["بازه‌ی اعتبار", "تخصیص گروهی", "لغو نقش"], render: () => <BindingsSection /> },
          { id: "requests", label: "درخواست‌ها", count: (c) => c.pendingRequests, keywords: ["درخواست دسترسی", "زمان‌دار", "تأیید", "رد"], render: () => <AccessRequestsSection /> },
        ],
      },
      {
        id: "review",
        label: "بازبینی و تفکیک وظایف",
        icon: ClipboardCheck,
        perms: ["iam.review.manage"],
        tabs: [
          { id: "review", label: "بازبینی دسترسی‌ها", keywords: ["بازبینی دوره‌ای", "انقضا", "بدون استفاده"], render: () => <AccessReviewSection /> },
          { id: "sod", label: "تفکیک وظایف", keywords: ["SoD", "تعارض", "مجوزهای ناسازگار"], render: () => <SodSection /> },
        ],
      },
    ],
  },
  {
    id: "brand",
    title: "برند و ظاهر",
    sections: [
      {
        id: "brand",
        label: "برند و ظاهر",
        icon: Brush,
        perms: [],
        tabs: [
          {
            id: "org",
            label: "برند سازمان",
            perms: ["settings.branding"],
            keywords: ["لوگو", "رنگ برند", "نام نمایشی", "زیرعنوان", "دامنه", "ارث‌بری", "قفل", "پروفایل سازمانی", "فیلدهای عمومی"],
            render: () => (
              <div className="space-y-4">
                <BrandOrgTab />
                <OrgPublicFieldsCard />
              </div>
            ),
          },
          { id: "slideshow", label: "اسلایدشو", perms: ["settings.branding"], keywords: ["اسلاید", "اسلایدر", "بنر", "صفحه‌ی عمومی", "بالای داشبورد", "پخش خودکار"], render: () => <SlideshowSection /> },
          { id: "me", label: "ظاهر من", keywords: ["حالت تیره", "روشن", "رنگ تأکید", "اندازه‌ی متن", "فونت", "اوقات شرعی", "شهر"], render: () => <MyAppearanceTab /> },
        ],
      },
      { id: "languages", label: "زبان‌ها", icon: Languages, perms: ["settings.system"], keywords: ["ترجمه", "انگلیسی", "عربی", "راست‌چین", "چپ‌چین", "زبان پیش‌فرض", "JSON"], render: () => <LanguagesSection /> },
      { id: "experience", label: "ابزارک‌ها و راهنما", icon: LayoutGrid, perms: ["settings.system"], keywords: ["تور محصول", "راهنمای تعاملی", "اجرای خودکار", "اوقات شرعی", "شهر پیش‌فرض"], render: () => <ExperienceSection /> },
    ],
  },
  {
    id: "knowledge",
    title: "دانش",
    sections: [{ id: "knowledge", label: "مدیریت دانش", icon: Library, perms: ["knowledge.settings"], keywords: ["طبقه‌بندی اسناد", "گردش کار سند", "تأییدکنندگان", "سطوح دسترسی سند", "برچسب‌ها"], render: () => <KnowledgeSettingsPanel /> }],
  },
  {
    id: "innovation",
    title: "نوآوری",
    sections: [
      {
        id: "innovation",
        label: "دانش و نوآوری",
        icon: Sparkles,
        perms: ["settings.system", "funds.allocate", "funds.monitor"],
        tabs: [
          { id: "funds", label: "صندوق نوآوری", perms: ["settings.system", "funds.allocate", "funds.monitor"], keywords: [...paramLabels("funds"), "اختلاف داوران"], render: () => <FundSettingsTab /> },
          { id: "contracts", label: "قراردادها", perms: ["settings.system"], keywords: paramLabels("contracts"), render: () => <ContractsSettingsTab /> },
          { id: "award", label: "جایزه", perms: ["settings.system"], keywords: paramLabels("award"), render: () => <AwardSettingsTab /> },
        ],
      },
    ],
  },
  {
    id: "social",
    title: "شبکه‌ی اجتماعی",
    sections: [{ id: "social", label: "شبکه‌ی اجتماعی و نظارت محتوا", icon: MessagesSquare, perms: ["social.dashboards", "social.settings", "comments.moderate"], keywords: ["صف بازبینی", "گزارش تخلف", "تأیید نظر", "واکنش‌ها", "تأیید محتوا پیش از انتشار"], render: () => <SocialSettingsPanel /> }],
  },
  {
    id: "timesheet",
    title: "کارکرد و مرخصی",
    sections: [{ id: "timesheet", label: "کارکرد و مرخصی", icon: Clock, perms: ["timesheet.approve", "timesheet.finance"], keywords: ["ساعت موظف", "پنجشنبه", "تعطیلات", "سقف مرخصی", "یادآوری کارکرد"], render: () => <TimesheetSettingsPanel /> }],
  },
  {
    id: "notifications",
    title: "اعلان‌ها و کانال‌ها",
    sections: [
      {
        id: "notifications",
        label: "اعلان‌ها و کانال‌ها",
        icon: BellRing,
        perms: ["settings.system"],
        tabs: [
          { id: "channels", label: "کانال‌ها (پیامک/ایمیل)", keywords: ["درگاه پیامک", "کاوه‌نگار", "فرستنده‌ی ایمیل", "پوش", "ارسال آزمایشی", "سهمیه"], render: () => <ChannelsSection /> },
          { id: "queue", label: "صف و خلاصه‌ی روزانه", keywords: varLabels("notify"), render: () => <NotificationQueuePanel /> },
        ],
      },
    ],
  },
  {
    id: "security",
    title: "ورود و امنیت",
    sections: [
      {
        id: "login",
        label: "ورود و احراز هویت",
        icon: LogIn,
        perms: ["settings.security"],
        tabs: [
          {
            id: "sso",
            label: "ورود یکپارچه (SSO)",
            keywords: ["LDAP", "Active Directory", "SAML", "OpenID", "هویت سیستم", "ایجاد خودکار حساب", "ورود محلی"],
            render: () => (
              <>
                <Head icon={LogIn} title="ورود یکپارچه و هویت سامانه" description="منبع هویت سازمان (AD/LDAP یا IdP)، نام و دامنه‌ی سامانه." />
                <Admin section="system-identity" />
              </>
            ),
          },
          { id: "captcha", label: "کپچا", keywords: ["کپچا", "CAPTCHA", "تلاش ناموفق", "بازیابی گذرواژه", "تاریخچه‌ی ورود", "مدت نگهداری"], render: () => <CaptchaSection /> },
          { id: "policy", label: "سیاست ورود و OTP", keywords: ["تأیید دومرحله‌ای", "رمز یک‌بارمصرف", "OTP", "گذرواژه", "IP مورد اعتماد"], render: () => <LoginPolicySection part="policy" /> },
          {
            id: "session",
            label: "نشست و قفل حساب",
            keywords: ["خروج خودکار", "مهلت نشست", ...varLabels("session")],
            render: () => (
              <div className="space-y-4">
                <LoginPolicySection part="session" />
                <SessionVars />
                <ScopedKeysCard keys={["security.sessionTimeoutMin"]} title="مهلت نشست — بازنویسی در این واحد" />
              </div>
            ),
          },
        ],
      },
      {
        id: "security",
        label: "امنیت و انطباق",
        icon: ShieldCheck,
        perms: ["settings.security"],
        tabs: [
          {
            id: "general",
            label: "امنیت و انطباق",
            keywords: ["کپچا", "ضدویروس", "حساب مهمان", "کاربران مسدود", "خروجی انطباق", "رخدادهای امنیتی"],
            render: () => (
              <>
                <Head icon={ShieldCheck} title="امنیت و انطباق" description="کنترل‌های امنیتی، حساب‌های مهمان و خروجی انطباق." />
                <Admin section="security" />
              </>
            ),
          },
          { id: "antivirus", label: "ضدویروس", keywords: ["ClamAV", "ویروس", "قرنطینه", "EICAR", "اسکن", "ضدویروس"], render: () => <AntivirusSection /> },
          { id: "rate-limit", label: "محدودیت درخواست‌ها", keywords: ["Rate Limit", "۴۲۹", "سقف درخواست", "Retry-After", "کاربران محدودشده", "IP سفید"], render: () => <RateLimitSection /> },
          { id: "auto-block", label: "مسدودسازی خودکار", keywords: ["مسدودسازی", "قفل حساب", "کاربران مسدودشده", "فقط‌خواندنی", "گزارش تخلف"], render: () => <AutoBlockSection /> },
          { id: "classification", label: "طبقه‌بندی اطلاعات", keywords: ["نوار طبقه‌بندی", "محرمانه", "سطح پیش‌فرض"], render: () => <ClassificationSection /> },
        ],
      },
      { id: "audit-log", label: "لاگ ممیزی", icon: Layers, perms: ["iam.audit.view"], keywords: ["تاریخچه‌ی تغییرات", "قبل و بعد", "خروجی CSV", "ممیزی"], render: ({ tab }) => <UnifiedAuditSection key={tab ?? ""} preset={tab} /> },
    ],
  },
  {
    id: "infra",
    title: "زیرساخت",
    sections: [
      {
        id: "modules",
        label: "ماژول‌ها و منوها",
        icon: Plug,
        perms: ["settings.modules", "settings.pages"],
        tabs: [
          {
            id: "modules",
            label: "بازارچه‌ی ماژول‌ها",
            perms: ["settings.modules"],
            keywords: ["فعال‌سازی ماژول"],
            render: () => (
              <>
                <Head icon={Plug} title="بازارچه‌ی ماژول‌ها" description="افزودن یا برداشتن ماژول‌ها بدون اثر روی داده‌ها." />
                <Admin section="modules" />
              </>
            ),
          },
          {
            id: "pages",
            label: "صفحات و منوها",
            perms: ["settings.pages"],
            keywords: ["صفحه‌ی سفارشی", "منوی ناوبری"],
            render: () => (
              <>
                <Head icon={Plug} title="صفحات و منوها" description="صفحه‌های سفارشی و نمایش منوهای ناوبری." />
                <Admin section="pages" />
              </>
            ),
          },
        ],
      },
      {
        id: "system",
        label: "تنظیمات کلی",
        icon: SlidersHorizontal,
        perms: ["settings.system"],
        keywords: [...varLabels("upload"), ...varLabels("content"), "پسوندهای مجاز فایل", "حالت تعمیر", ...paramLabels("infra")],
        render: () => (
          <div className="space-y-5">
            <Admin section="system" />
            <Admin section="file-types" />
            <WorkflowParamsCard module="infra" title="محدودیت نرخ درخواست" description="همین عدد در «امنیت و انطباق ← محدودسازی نرخ درخواست» نمایش داده می‌شود." />
          </div>
        ),
      },
      {
        id: "integrations",
        label: "یکپارچه‌سازی و اتوماسیون",
        icon: Webhook,
        perms: ["settings.system"],
        keywords: ["وب‌هوک", "بات", "دستور اسلش"],
        render: () => (
          <>
            <Head icon={Webhook} title="یکپارچه‌سازی و اتوماسیون" />
            <Admin section="integrations" />
          </>
        ),
      },
      {
        id: "network",
        label: "تعامل بین‌سازمانی",
        icon: Globe2,
        perms: ["settings.system"],
        render: () => (
          <>
            <Head icon={Globe2} title="تعامل بین‌سازمانی" />
            <Admin section="network" />
          </>
        ),
      },
      {
        id: "monitor",
        label: "پایش زنده‌ی سامانه",
        icon: Activity,
        perms: ["settings.system"],
        keywords: ["کاربران آنلاین", "CPU", "حافظه"],
        render: () => (
          <>
            <Head icon={Activity} title="پایش زنده‌ی سامانه" />
            <Admin section="monitor" />
          </>
        ),
      },
      {
        id: "storage",
        label: "فضای ذخیره‌سازی",
        icon: HardDrive,
        perms: ["settings.storage"],
        keywords: ["دیسک", "پشتیبان‌گیری", "فایل‌های موقت"],
        render: () => (
          <>
            <Head icon={HardDrive} title="فضای ذخیره‌سازی" />
            <Admin section="storage" />
          </>
        ),
      },
    ],
  },
];

/** شناسه‌های قدیمی ?section= → بخش + زبانه‌ی جدید (پیوندهای قدیمی، اعلان‌ها و نشانک‌ها کار می‌کنند) */
export const legacySectionMap: Record<string, { section: string; tab?: string }> = {
  antivirus: { section: "security", tab: "antivirus" },
  captcha: { section: "login", tab: "captcha" },
  "rate-limit": { section: "security", tab: "rate-limit" },
  "auto-block": { section: "security", tab: "auto-block" },
  featured: { section: "members", tab: "featured" },
  import: { section: "members", tab: "invite" },
  "access-requests": { section: "bindings", tab: "requests" },
  sod: { section: "review", tab: "sod" },
  audit: { section: "audit-log", tab: "org" },
  "audit-all": { section: "audit-log" },
  branding: { section: "brand", tab: "org" },
  scoped: { section: "brand", tab: "org" },
  appearance: { section: "brand", tab: "me" },
  slideshow: { section: "brand", tab: "slideshow" },
  slides: { section: "brand", tab: "slideshow" },
  tours: { section: "experience" },
  prayer: { section: "experience" },
  pages: { section: "modules", tab: "pages" },
  workflow: { section: "innovation", tab: "funds" },
  channels: { section: "notifications", tab: "channels" },
  identity: { section: "login", tab: "sso" },
  "system-identity": { section: "login", tab: "sso" },
  "login-policy": { section: "login", tab: "policy" },
  classification: { section: "security", tab: "classification" },
};
