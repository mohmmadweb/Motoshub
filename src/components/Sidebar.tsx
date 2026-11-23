import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BookMarked,
  BookOpen,
  Briefcase,
  Calendar,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Contact,
  FolderOpen,
  FolderTree,
  Hash,
  Image,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Mail,
  Megaphone,
  MessageCircleQuestion,
  MessagesSquare,
  Newspaper,
  NotebookPen,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useTenancy } from "../context/TenancyContext";
import { useSocial } from "../context/SocialContext";
import { useEffectiveBranding } from "../iam/hooks";
import { BrandMark } from "../iam/BrandMark";
import { allPermissionIds } from "../data/mock";
import { useI18n } from "../i18n";
import { BrandLeaf } from "./ui/brand-leaf";
import { ICON_STROKE, ICON_STROKE_ACTIVE } from "./ui/Icon";

// ===========================================================================
// منوی کاریز (MENU.md §1) — همان درخت منوی کلاینت واقعی با انحراف‌های D1…D8.
//  - بخش (section) = سرتیتر غیرقابل‌کلیک؛ «داشبورد» همیشه باز، بقیه وقتی زیرآیتمشان فعال است
//    (یا کاربر بازش کرده) باز می‌شوند.
//  - گروه (group) = زیرمنوی جمع‌شونده داخل یک بخش («راهبری دسترسی»، «تنظیمات سامانه»)؛
//    فقط وقتی دیده می‌شود که دست‌کم یک فرزند مجاز داشته باشد (D7).
//  - هر آیتم با perm / anyPerm / adminOnly فیلتر می‌شود؛ بخش خالی نمایش داده نمی‌شود.
//  - آیتم‌های ماژول‌هایی که صفحه‌شان هنوز ساخته نشده پشت NAV_MODULES خاموش‌اند (WP2-b روشنشان می‌کند).
// برچسب‌ها با useI18n ترجمه می‌شوند (کلید = متن فارسی).
// ===========================================================================

/**
 * ماژول‌هایی که منو و مسیرشان با یک کلید روشن/خاموش می‌شود (App.tsx مسیرها را هم با همین
 * کلیدها سوار می‌کند). WP2-b فقط مقدار را true می‌کند.
 */
export const NAV_MODULES = {
  faqs: true, // سوالات متداول — pages/social/FaqPage (WP6)
  meetings: true, // صفحه‌ی جلسه /meetings/:id — pages/meetings/MeetingPage (WP5)
  monitoring: true, // مانیتورینگ — pages/monitoring/MonitoringPage (WP5)
  secretariat: true, // دبیرخانه — pages/secretariat/SecretariatPage (WP8)
  customers: true, // پرونده مشتریان — pages/customers/{CustomersPage,CustomerFilePage} (WP8)
} satisfies Record<string, boolean>;
export type NavModule = keyof typeof NAV_MODULES;
export const isModuleEnabled = (m: NavModule) => NAV_MODULES[m];

/** «تنظیمات پروژه»: پیش‌فرض‌های سراسری پروژه‌ها */
export const PROJECT_SETTINGS_PERMS = ["projects.create", "settings.system"];
/** «دسته‌بندی‌ها»: خواندن برای دارندگان هر مجوز مدیریتیِ (*.manage)، ویرایش با taxonomy.manage */
export const MANAGE_PERMS = allPermissionIds.filter((p) => p.endsWith(".manage"));

export type NavLeaf = {
  id: string;
  to: string;
  label: string;
  icon?: LucideIcon;
  /** فقط مسیر دقیق فعال است */
  end?: boolean;
  perm?: string;
  anyPerm?: string[];
  adminOnly?: boolean;
  /** آیتم‌های «مدیریت سیستم» که به یک بخش از صفحه‌ی تنظیمات می‌رسند (?section=&tab=) */
  section?: string;
  tab?: string;
  module?: NavModule;
  count?: "chat";
};
export type NavGroup = { id: string; label: string; icon: LucideIcon; children: NavLeaf[] };
export type NavEntry = NavLeaf | NavGroup;
export type NavSectionId = "home" | "people" | "content" | "social" | "work" | "office" | "admin";
export type NavSection = { id: NavSectionId; title: string; alwaysOpen?: boolean; items: NavEntry[] };

export const isGroup = (e: NavEntry): e is NavGroup => "children" in e;

export const navSections: NavSection[] = [
  {
    id: "home",
    title: "داشبورد",
    alwaysOpen: true,
    items: [
      { id: "desk", to: "/dashboard", label: "میزکار من", icon: LayoutDashboard, end: true },
      { id: "calendar", to: "/calendar", label: "تقویم کاری من", icon: Calendar, perm: "calendar.view" },
      { id: "files", to: "/files", label: "مدیریت فایل‌های من", icon: FolderOpen, perm: "files.use" },
    ],
  },
  {
    id: "people",
    title: "همکاران",
    items: [
      { id: "members", to: "/members", label: "اعضای سازمان", icon: Users, perm: "members.view" },
      { id: "friends", to: "/friends", label: "ارتباطات من", icon: UserPlus, perm: "relations.use" },
    ],
  },
  {
    id: "content",
    title: "دانش و محتوا",
    items: [
      { id: "news", to: "/news", label: "اخبار سازمان", icon: Newspaper, perm: "news.list" },
      { id: "blogs", to: "/blogs", label: "وبلاگ‌ها", icon: NotebookPen, perm: "blog.list" },
      { id: "magazines", to: "/magazines", label: "مجلات", icon: BookMarked, perm: "magazines.list" },
      { id: "media", to: "/media", label: "رسانه", icon: Image, perm: "media.list" },
      { id: "forums", to: "/forums", label: "پرسش و پاسخ", icon: CircleHelp, perm: "forum.list" },
      { id: "faqs", to: "/faqs", label: "سوالات متداول", icon: MessageCircleQuestion, module: "faqs" },
      { id: "hashtags", to: "/hashtags", label: "هشتگ‌ها", icon: Hash },
      { id: "categories", to: "/categories", label: "دسته‌بندی‌ها", icon: FolderTree, anyPerm: MANAGE_PERMS },
    ],
  },
  {
    id: "social",
    title: "شبکه اجتماعی",
    items: [
      { id: "conversations", to: "/conversations", label: "گفتگوها", icon: MessagesSquare, perm: "chat.view", count: "chat" },
      { id: "groups", to: "/groups", label: "گروه‌ها", icon: UsersRound, perm: "groups.list" },
      { id: "channels", to: "/channels", label: "کانال‌ها", icon: Megaphone, perm: "channels.list" },
      { id: "events", to: "/events", label: "رویدادها و جلسات", icon: CalendarDays, perm: "events.list" },
    ],
  },
  {
    id: "work",
    title: "پروژه‌ها و فعالیت‌ها",
    items: [
      { id: "projects", to: "/projects", label: "پروژه‌ها", icon: Briefcase, perm: "projects.list" },
      { id: "knowledge", to: "/knowledge", label: "مدیریت دانش", icon: BookOpen, perm: "knowledge.list" },
      { id: "activities", to: "/activities", label: "فعالیت و وظایف من", icon: ListChecks, perm: "projects.list" },
      { id: "activity-report", to: "/activity-report", label: "گزارش فعالیت‌های من", icon: Timer, perm: "timesheet.log" },
      { id: "project-settings", to: "/project-settings", label: "تنظیمات پروژه", icon: SlidersHorizontal, anyPerm: PROJECT_SETTINGS_PERMS },
      { id: "monitoring", to: "/monitoring", label: "مانیتورینگ", icon: ChartColumn, perm: "monitoring.view", module: "monitoring" },
    ],
  },
  {
    id: "office",
    title: "دبیرخانه و مشتریان",
    items: [
      { id: "secretariat", to: "/secretariat", label: "دبیرخانه", icon: Mail, anyPerm: ["secretariat.view", "secretariat.register"], module: "secretariat" },
      { id: "customers", to: "/customers", label: "پرونده مشتریان", icon: Contact, perm: "crm.view", module: "customers" },
    ],
  },
  {
    id: "admin",
    title: "مدیریت سیستم",
    items: [
      {
        id: "access-admin",
        label: "راهبری دسترسی",
        icon: ShieldCheck,
        children: [
          { id: "admin-overview", to: "/admin", label: "نمای کلی", end: true, adminOnly: true },
          { id: "admin-units", to: "/admin/units", label: "واحدها", section: "structure", anyPerm: ["iam.structure.view", "iam.structure.manage"] },
          { id: "admin-people", to: "/admin/people", label: "افراد", section: "members", anyPerm: ["iam.members.manage", "users.import", "users.create"] },
          { id: "admin-access-new", to: "/admin/access/new", label: "افزودن دسترسی", section: "bindings", perm: "roles.assign" },
          { id: "admin-roles", to: "/admin/roles", label: "نقش‌ها", section: "roles", anyPerm: ["roles.list", "roles.create", "roles.edit"] },
          { id: "admin-history", to: "/admin/history", label: "تاریخچه", section: "audit-log", perm: "iam.audit.view" },
          { id: "admin-platform", to: "/admin/platform", label: "راهبری سامانه", section: "modules", anyPerm: ["settings.modules", "settings.pages", "settings.system", "settings.storage"] },
        ],
      },
      { id: "my-access", to: "/my-access", label: "نقش و دسترسی من", icon: KeyRound },
      {
        id: "system-settings",
        label: "تنظیمات سامانه",
        icon: Settings,
        children: [
          { id: "settings", to: "/settings", label: "تنظیمات عمومی", end: true },
          { id: "sms-providers", to: "/sms-providers", label: "تنظیمات پیامک", section: "notifications", tab: "channels", perm: "settings.system" },
          { id: "settings-organization", to: "/settings/organization", label: "تنظیمات سازمان", section: "brand", tab: "org", perm: "settings.branding" },
          { id: "settings-notifications", to: "/settings/notifications", label: "مدیریت اعلان", section: "notifications", tab: "queue", perm: "settings.system" },
        ],
      },
      { id: "tickets", to: "/tickets", label: "تیکت پشتیبانی", icon: LifeBuoy, perm: "tickets.create" },
    ],
  },
];

/**
 * مسیرهای «مدیریت سیستم» که یک بخش از صفحه‌ی تنظیمات را باز می‌کنند (App.tsx با SettingsAlias
 * سوارشان می‌کند): مسیر ← بخش/زبانه‌ی پیش‌فرض.
 */
export const SETTINGS_ALIASES: Record<string, { section: string; tab?: string }> = {
  "/admin/units": { section: "structure" },
  "/admin/people": { section: "members" },
  "/admin/access/new": { section: "bindings" },
  "/admin/roles": { section: "roles" },
  "/admin/history": { section: "audit-log" },
  "/admin/platform": { section: "modules" },
  "/sms-providers": { section: "notifications", tab: "channels" },
  "/settings/organization": { section: "brand", tab: "org" },
  "/settings/notifications": { section: "notifications", tab: "queue" },
  "/members/import-export": { section: "members", tab: "invite" },
};
const isSettingsFamily = (p: string) => p === "/settings" || p.startsWith("/settings/") || p === "/admin" || p.startsWith("/admin/") || p === "/sms-providers";

// ---------------------------------------------------------------------------
// نشانی‌های قدیمی دمو (/dashboard/<x>) ← مسیرهای واقعی. همه‌ی پیوندهای داخلی صفحه‌ها که هنوز
// /dashboard/… می‌سازند از این راه کار می‌کنند (App.tsx ← LegacyRedirect).
// ---------------------------------------------------------------------------
export const LEGACY_PATHS: Record<string, string> = {
  dashboard: "/dashboard",
  "my-work": "/activities",
  members: "/members",
  connections: "/friends",
  friends: "/friends",
  magazines: "/magazines",
  news: "/news",
  media: "/media",
  forum: "/forums",
  topics: "/hashtags",
  categories: "/categories",
  chat: "/conversations",
  groups: "/groups",
  channels: "/channels",
  calendar: "/calendar",
  events: "/events",
  files: "/files",
  blog: "/blogs",
  tickets: "/tickets",
  activity: "/activity-report",
  settings: "/settings",
  "project-settings": "/project-settings",
  org: "/org",
  access: "/my-access",
  search: "/globalsearch",
  profile: "/profile",
  knowledge: "/knowledge",
  projects: "/projects",
  notifications: "/notifications",
  admin: "/admin",
};
/** نشانی‌های قدیمیِ بازنشسته: مقصد ثابت، بقیه‌ی مسیر دور ریخته می‌شود (پارامترها می‌مانند) */
const LEGACY_FIXED: Record<string, string> = {
  "project-teams": "/projects",
  "social-admin": "/settings?section=social",
  appearance: "/settings?section=general",
  help: "/knowledge/help",
  polls: "/dashboard",
  competitions: "/dashboard",
  reports: "/dashboard",
  assistant: "/dashboard",
  // بخش «نوآوری و پژوهش» حذف شد
  contracts: "/dashboard",
  funds: "/dashboard",
  research: "/dashboard",
  award: "/dashboard",
  training: "/dashboard",
};

/**
 * /dashboard/<x>/<rest>?<q> ← مسیر جدید با حفظ بقیه‌ی مسیر و پارامترها.
 * مسیری که قدیمی نیست یا نگاشت ندارد null برمی‌گرداند. برای صفحه‌هایی که pathname را با
 * پیشوند قدیمی مقایسه می‌کنند هم قابل استفاده است.
 */
export function fromLegacyPath(pathname: string, search = ""): string | null {
  const m = /^\/dashboard\/([^/]+)(\/.*)?$/.exec(pathname);
  if (!m) return null;
  const [, seg, rest = ""] = m;
  const fixed = LEGACY_FIXED[seg];
  const base = fixed ?? (LEGACY_PATHS[seg] ? LEGACY_PATHS[seg] + rest : null);
  if (!base) return null;
  const [path, fixedQuery = ""] = base.split("?");
  const q = new URLSearchParams(search);
  new URLSearchParams(fixedQuery).forEach((v, k) => {
    if (!q.has(k)) q.set(k, v);
  });
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

// ---------------------------------------------------------------------------
// فیلتر دسترسی (سایدبار، منوی موبایل و پالت فرمان)
// ---------------------------------------------------------------------------
type NavCtx = { canAccessAdmin: boolean; hasPermission: (id: string) => boolean };
const leafAllowed = (i: NavLeaf, ctx: NavCtx) =>
  (!i.module || isModuleEnabled(i.module)) &&
  (!i.adminOnly || ctx.canAccessAdmin) &&
  (!i.perm || ctx.hasPermission(i.perm)) &&
  (!i.anyPerm || i.anyPerm.some((p) => ctx.hasPermission(p)));

export function filterNavSections(ctx: NavCtx): NavSection[] {
  return navSections
    .map((s) => ({
      ...s,
      items: s.items
        .map((e) => (isGroup(e) ? { ...e, children: e.children.filter((c) => leafAllowed(c, ctx)) } : e))
        .filter((e) => (isGroup(e) ? e.children.length > 0 : leafAllowed(e, ctx))),
    }))
    .filter((s) => s.items.length > 0);
}

/** همه‌ی آیتم‌های قابل‌کلیک به ترتیب منو (برای پالت فرمان) */
export function flattenNav(sections: NavSection[]) {
  return sections.flatMap((s) =>
    s.items.flatMap((e) => (isGroup(e) ? e.children.map((c) => ({ leaf: c, section: s, group: e as NavGroup | undefined })) : [{ leaf: e, section: s, group: undefined }]))
  );
}

/** شناسه‌ی آیتم فعال منو برای نشانی فعلی */
export function activeLeafId(sections: NavSection[], pathname: string, search: string): string | null {
  const leaves = flattenNav(sections).map((x) => x.leaf);
  if (isSettingsFamily(pathname)) {
    const q = new URLSearchParams(search);
    const alias = SETTINGS_ALIASES[pathname];
    const section = q.get("section") ?? alias?.section;
    const tab = q.get("tab") ?? (q.get("section") ? null : alias?.tab ?? null);
    if (section) {
      const same = leaves.filter((l) => l.section === section);
      const hit = same.find((l) => l.tab && l.tab === tab) ?? same.find((l) => !l.tab) ?? (tab ? undefined : same[0]);
      if (hit) return hit.id;
    }
  }
  let best: NavLeaf | null = null;
  for (const l of leaves) {
    const hit = l.end ? pathname === l.to : pathname === l.to || pathname.startsWith(`${l.to}/`);
    if (hit && (!best || l.to.length > best.to.length)) best = l;
  }
  return best?.id ?? null;
}

// ---------------------------------------------------------------------------
// نشان محصول «کاریز» (دو برگ + نوشته) — پیش‌فرض وقتی واحد برند اختصاصی ندارد
// ---------------------------------------------------------------------------
export const PRODUCT_NAME = "کاریز";

export function KarizMark({ size = 32 }: { size?: number }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }} aria-hidden>
      <BrandLeaf width={size} className="absolute start-0 top-[6%] text-brand-600" />
      <BrandLeaf width={size} className="absolute start-0 top-[40%] text-teal-500" />
    </span>
  );
}

export function KarizLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <KarizMark size={size} />
      <span className="font-black text-brand-600 leading-none" style={{ fontSize: Math.round(size * 0.72) }}>
        {PRODUCT_NAME}
      </span>
    </span>
  );
}

/** برند مؤثر واحد فعلی (لوگوی سازمان یا نام آن)؛ اگر واحد برندی نداشته باشد نشان کاریز */
export function ShellBrand({ compact = false }: { compact?: boolean }) {
  const brand = useEffectiveBranding();
  const name = brand.name?.trim() || PRODUCT_NAME;
  if (brand.logo)
    return (
      <span className="min-w-0 flex items-center" title={name}>
        <span className={compact ? "max-w-[64px] overflow-hidden" : "max-w-[170px] overflow-hidden"}>
          <BrandMark logo={brand.logo} initials={brand.initials} color={brand.color} size={compact ? 36 : 40} />
        </span>
        <span className="sr-only">{name}</span>
      </span>
    );
  if (name === PRODUCT_NAME) return compact ? <KarizMark size={32} /> : <KarizLogo size={30} />;
  return (
    <span className="min-w-0 flex items-center gap-2" title={name}>
      <BrandMark logo="" initials={brand.initials} color={brand.color} size={compact ? 36 : 34} />
      {!compact && <span className="truncate text-[15px] font-bold text-ink-900">{name}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// درخت منو (سایدبار، ریل جمع‌شده و کشوی موبایل)
// ---------------------------------------------------------------------------
const OPEN_KEY = "motoshub.navOpen.v2";
const RAIL_KEY = "motoshub.navRail.v1";
const readList = (k: string): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(k) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const writeList = (k: string, v: string[]) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* نادیده */
  }
};

function useChatUnread() {
  const s = useSocial();
  return s.myChats(["direct_message", "group"]).reduce((a, c) => a + (c.muted_by.includes(s.me) ? 0 : s.unreadCount(c)), 0);
}
const fa = (n: number) => (n > 99 ? "۹۹+" : n.toLocaleString("fa-IR"));

const itemBase = "flex items-center gap-2.5 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]";
const itemTone = (on: boolean) => (on ? "bg-teal-50 text-teal-700 font-bold" : "text-ink-800 hover:bg-ink-100");

export function NavTree({ onNavigate, mobile = false, rail = false }: { onNavigate?: () => void; mobile?: boolean; rail?: boolean }) {
  const { canAccessAdmin, hasPermission } = useTenancy();
  const { t } = useI18n();
  const { pathname, search } = useLocation();
  const chatUnread = useChatUnread();
  const [opened, setOpened] = useState<string[]>(() => readList(OPEN_KEY));
  const sections = filterNavSections({ canAccessAdmin, hasPermission });
  const activeId = activeLeafId(sections, pathname, search);
  const counter = (l: NavLeaf) => (l.count === "chat" ? chatUnread : 0);
  const toggle = (id: string) =>
    setOpened((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      writeList(OPEN_KEY, next);
      return next;
    });
  const containsActive = (e: NavEntry) => (isGroup(e) ? e.children.some((c) => c.id === activeId) : e.id === activeId);

  if (rail) {
    // ریل ۸۸px: آیکون بالای برچسب ۱۰٫۵px، شمارنده‌ها گوشه‌ای؛ گروه‌ها به اولین فرزند مجاز می‌روند
    return (
      <nav className="flex-1 overflow-y-auto px-2 py-2" data-tour="nav" aria-label="منوی اصلی">
        {sections.map((s, idx) => (
          <div key={s.id} className={idx ? "mt-1.5 pt-1.5 border-t border-border" : ""}>
            {s.items.map((e) => {
              const to = isGroup(e) ? e.children[0].to : e.to;
              const Icon = e.icon ?? Settings;
              const on = containsActive(e);
              const n = isGroup(e) ? 0 : counter(e);
              return (
                <Link
                  key={e.id}
                  to={to}
                  onClick={onNavigate}
                  title={t(e.label)}
                  aria-current={on ? "page" : undefined}
                  className={`${itemBase} ${itemTone(on)} relative flex-col justify-center gap-1 px-1 py-2 text-center`}
                >
                  <Icon size={22} strokeWidth={on ? ICON_STROKE_ACTIVE : ICON_STROKE} aria-hidden />
                  <span className="text-[10.5px] leading-4 line-clamp-2">{t(e.label)}</span>
                  {n > 0 && <span className="absolute top-1 end-3 min-w-[18px] h-[18px] px-1 rounded-full bg-teal-600 text-on-primary text-[10px] leading-[18px] font-bold">{fa(n)}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    );
  }

  const leafLink = (l: NavLeaf, nested = false) => {
    const on = l.id === activeId;
    const n = counter(l);
    return (
      <Link
        key={l.id}
        to={l.to}
        onClick={onNavigate}
        aria-current={on ? "page" : undefined}
        className={`${itemBase} ${itemTone(on)} ${nested ? "ps-9 pe-2.5 py-1.5 text-[13.5px]" : `px-2.5 ${mobile ? "py-2.5" : "py-2"} text-[14px]`} leading-[22px]`}
      >
        {!nested && l.icon && <l.icon size={20} strokeWidth={on ? ICON_STROKE_ACTIVE : ICON_STROKE} className="shrink-0" aria-hidden />}
        <span className="truncate flex-1">{t(l.label)}</span>
        {n > 0 && <span className={`ms-auto shrink-0 rounded-full px-[7px] text-[11.5px] font-bold leading-5 ${on ? "bg-card" : "bg-teal-50"} text-teal-700`}>{fa(n)}</span>}
      </Link>
    );
  };

  return (
    <nav className="flex-1 overflow-y-auto px-2.5 py-2" data-tour={mobile ? undefined : "nav"} aria-label="منوی اصلی">
      {sections.map((s, idx) => {
        const hasActive = s.items.some(containsActive);
        const open = s.alwaysOpen || hasActive || opened.includes(s.id);
        const headId = `nav-sec-${s.id}`;
        return (
          <div key={s.id} className={idx ? "mt-2" : ""}>
            {s.alwaysOpen || hasActive ? (
              <p id={headId} className="px-2.5 pt-2 pb-1 text-[11.5px] font-bold text-ink-500">
                {t(s.title)}
              </p>
            ) : (
              <button
                type="button"
                id={headId}
                onClick={() => toggle(s.id)}
                aria-expanded={open}
                className="w-full flex items-center gap-2 px-2.5 pt-2 pb-1 rounded-md text-[11.5px] font-bold text-ink-500 hover:text-ink-800 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                <span className="flex-1 text-start">{t(s.title)}</span>
                <ChevronDown size={14} className={`transition-transform ${open ? "" : "rotate-90"}`} aria-hidden />
              </button>
            )}
            {open && (
              <div className="space-y-0.5" role="group" aria-labelledby={headId}>
                {s.items.map((e) => {
                  if (!isGroup(e)) return leafLink(e);
                  const gActive = containsActive(e);
                  const gOpen = gActive || opened.includes(e.id);
                  return (
                    <div key={e.id}>
                      <button
                        type="button"
                        onClick={() => !gActive && toggle(e.id)}
                        aria-expanded={gOpen}
                        className={`${itemBase} w-full px-2.5 ${mobile ? "py-2.5" : "py-2"} text-[14px] leading-[22px] ${gActive ? "text-teal-700 font-bold" : "text-ink-800 hover:bg-ink-100"}`}
                      >
                        <e.icon size={20} strokeWidth={gActive ? ICON_STROKE_ACTIVE : ICON_STROKE} className="shrink-0" aria-hidden />
                        <span className="flex-1 truncate text-start">{t(e.label)}</span>
                        <ChevronDown size={15} className={`shrink-0 text-ink-500 transition-transform ${gOpen ? "" : "rotate-90"}`} aria-hidden />
                      </button>
                      {gOpen && <div className="mt-0.5 space-y-0.5">{e.children.map((c) => leafLink(c, true))}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** عرض صفحه ≥ lg؛ زیر آن (۷۶۸–۱۰۲۴) سایدبار همیشه ریل است */
function useIsLg() {
  const q = "(min-width: 1024px)";
  const [lg, setLg] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setLg(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return lg;
}

export default function Sidebar() {
  const { session } = useTenancy();
  const { t } = useI18n();
  const isLg = useIsLg();
  const [railPref, setRailPref] = useState(() => readList(RAIL_KEY).includes("rail"));
  const rail = railPref || !isLg;
  const toggleRail = () =>
    setRailPref((v) => {
      writeList(RAIL_KEY, v ? [] : ["rail"]);
      return !v;
    });

  return (
    <aside data-shell className={`hidden md:flex flex-col shrink-0 h-screen sticky top-0 bg-card border-e border-border ${rail ? "w-[88px]" : "w-[230px]"}`}>
      <div className={`min-h-14 flex items-center gap-2 border-b border-border ${rail ? "flex-col justify-center py-2.5 px-2" : "px-3.5 py-2"}`}>
        <Link to="/dashboard" className="min-w-0 flex-1 flex items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]" aria-label="میزکار من">
          <ShellBrand compact={rail} />
        </Link>
        {isLg && (
          <button
            type="button"
            onClick={toggleRail}
            className="btn btn-ghost btn-icon btn-sm shrink-0"
            aria-label={rail ? "باز کردن منو" : "جمع کردن منو"}
            title={rail ? "باز کردن منو" : "جمع کردن منو"}
          >
            {rail ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        )}
      </div>

      <NavTree rail={rail} />

      {!rail && (
        <div className="m-2.5 rounded-xl border border-border bg-ink-50 p-3 text-[11.5px] text-ink-600">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-ink-900">{t("پلن سازمانی")}</span>
            <span>{session.memberCompanyIds.length > 0 ? `${session.memberCompanyIds.length.toLocaleString("fa-IR")} عضویت` : "دسترسی کامل"}</span>
          </div>
          <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
            <div className="h-full rounded-full bg-teal-500" style={{ width: "62%" }} />
          </div>
        </div>
      )}
    </aside>
  );
}
