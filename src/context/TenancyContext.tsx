import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  systemIdentity as initialIdentity,
  holdings as initialHoldings,
  companies as initialCompanies,
  buildSessionScope,
  isVisibleForSession,
  publishableScopes,
  scopeOwnerLabel,
  type Company,
  type ContentScope,
  type Holding,
  type Scoped,
  type ScopeLevel,
  type SessionScope,
  type SystemIdentity,
} from "../data/tenancy";
import { currentUser, users as allUsers, initialRoleAssignments, roles as allRoles, type UserProfile } from "../data/mock";

type TenancyValue = {
  // --- هویت این نصب ---
  identity: SystemIdentity;
  updateIdentity: (patch: Partial<SystemIdentity>) => void;

  // --- ساختار سازمانی ---
  holdings: Holding[];
  companies: Company[];
  companiesOf: (holdingId: string) => Company[];
  holdingOf: (companyId?: string) => Holding | undefined;
  addHolding: (h: Omit<Holding, "id">) => Holding;
  updateHolding: (id: string, patch: Partial<Holding>) => void;
  removeHolding: (id: string) => void;
  addCompany: (c: Omit<Company, "id">) => Company;
  updateCompany: (id: string, patch: Partial<Company>) => void;
  removeCompany: (id: string) => void;

  // --- نشستِ کاربر (دامنه از روی کاربر محاسبه می‌شود، نه انتخاب او) ---
  /** کاربری که وارد شده — در پروتوتایپ قابل تعویض است تا سناریوها دیده شوند */
  actingUser: UserProfile;
  setActingUser: (userId: string) => void;
  session: SessionScope;

  // --- دامنه‌ی فعال ---
  activeHoldingId?: string;
  activeCompanyId?: string;
  setScope: (holdingId?: string, companyId?: string) => void;
  /** برچسب خوانای دامنه‌ی فعال، برای هدر و عنوان صفحه‌ها */
  activeScopeLabel: string;
  /** آیا راهبر در حال «مشاهده به‌عنوان» یک دامنه‌ی دیگر است */
  isViewingAs: boolean;
  /** دامنه‌هایی که این کاربر مجاز است در آن‌ها منتشر کند */
  allowedPublishScopes: ContentScope[];

  // --- زنجیره‌ی واگذاری اختیار ---
  /** آیا این کاربر به پنل راهبری دسترسی دارد (نقشِ مدیریتی) */
  canAccessAdmin: boolean;
  /** دسترسی مؤثر — از نقشِ تخصیص‌یافته به کاربر */
  hasPermission: (id: string) => boolean;
  /** آیا این کاربر می‌تواند هلدینگ بسازد/حذف کند */
  canManageHoldings: boolean;
  /** هلدینگ‌هایی که این کاربر اختیار مدیریتشان را دارد */
  managedHoldingIds: string[];
  /** شرکت‌هایی که این کاربر اختیار مدیریتشان را دارد */
  managedCompanyIds: string[];

  // --- کمک‌تابع‌ها برای ماژول‌ها ---
  /** آیا این آیتم در دامنه‌ی فعال دیده می‌شود؟ */
  visible: (item: Scoped) => boolean;
  /** فیلترکردن یک فهرست بر اساس دامنه‌ی فعال */
  filterScoped: <T extends Scoped>(items: T[]) => T[];
  /** برچسب مالکِ یک آیتم (سراسری / نام هلدینگ / نام شرکت) */
  ownerLabel: (item: Scoped) => string;
  /** دامنه‌ای که آیتمِ تازه‌ساخته‌شده در دامنه‌ی فعال باید بگیرد */
  defaultScopeForNew: () => Scoped;
};

const TenancyContext = createContext<TenancyValue | null>(null);

export function TenancyProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<SystemIdentity>(initialIdentity);
  const [holdings, setHoldings] = useState<Holding[]>(initialHoldings);
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  // کاربرِ واردشده. در محصول واقعی از توکن می‌آید؛ اینجا برای نمایشِ سناریوها قابل تعویض است.
  const [actingUserId, setActingUserId] = useState<string>(currentUser.id);
  const [activeHoldingId, setActiveHoldingId] = useState<string | undefined>(undefined);
  const [activeCompanyId, setActiveCompanyId] = useState<string | undefined>(undefined);

  const actingUser = allUsers.find((u) => u.id === actingUserId) ?? currentUser;
  const grant = initialRoleAssignments[actingUserId];
  const level: ScopeLevel = grant?.level ?? (actingUser.companyIds?.length ? "شرکت" : "سیستم");

  const session = useMemo(
    () => buildSessionScope(actingUser.companyIds ?? [], level, grant?.holdingId, holdings, companies),
    [actingUser, level, grant?.holdingId, holdings, companies]
  );

  // با عوض‌شدنِ کاربر، دامنه‌ی فعال از روی نشستِ او بازنشانی می‌شود — نه از انتخاب قبلی
  const resetScopeFor = (s: typeof session) => {
    if (s.level === "سیستم") {
      setActiveHoldingId(undefined);
      setActiveCompanyId(undefined);
      return;
    }
    if (s.level === "هلدینگ") {
      setActiveHoldingId(s.memberHoldingIds[0]);
      setActiveCompanyId(undefined);
      return;
    }
    // سطح شرکت: اگر یک عضویت دارد همان، اگر چند تا دارد اولی به‌عنوان پیش‌فرض
    const first = companies.find((c) => c.id === s.memberCompanyIds[0]);
    setActiveHoldingId(first?.holdingId);
    setActiveCompanyId(first?.id);
  };

  const setActingUser = (userId: string) => {
    const u = allUsers.find((x) => x.id === userId) ?? currentUser;
    const g = initialRoleAssignments[userId];
    const lv: ScopeLevel = g?.level ?? (u.companyIds?.length ? "شرکت" : "سیستم");
    const s = buildSessionScope(u.companyIds ?? [], lv, g?.holdingId, holdings, companies);
    setActingUserId(userId);
    resetScopeFor(s);
  };

  const value = useMemo<TenancyValue>(() => {
    const companiesOf = (holdingId: string) => companies.filter((c) => c.holdingId === holdingId);
    const holdingOf = (companyId?: string) => {
      const c = companies.find((x) => x.id === companyId);
      return c ? holdings.find((h) => h.id === c.holdingId) : undefined;
    };

    const activeHolding = holdings.find((h) => h.id === activeHoldingId);
    const activeCompany = companies.find((c) => c.id === activeCompanyId);
    const activeScopeLabel = activeCompany
      ? activeCompany.name
      : activeHolding
        ? activeHolding.name
        : `کل ${identity.shortName}`;

    const visible = (item: Scoped) => isVisibleForSession(item, session, activeHoldingId, activeCompanyId);

    // دسترسی مؤثر از نقشِ کاربر — کاربرِ بدون تخصیص = «عضو عادی» (r4)
    const actingRole = allRoles.find((r) => r.id === (grant?.roleId ?? "r4")) ?? allRoles.find((r) => r.id === "r4");
    const permissionSet = new Set(actingRole?.permissions ?? []);
    const hasPermission = (id: string) => permissionSet.has(id);
    // پنل راهبری: سطح سیستم/هلدینگ همیشه؛ سطح شرکت فقط با نقشِ دارای مجوز مدیریتی
    const canAccessAdmin =
      session.level === "سیستم" ||
      session.level === "هلدینگ" ||
      ["users.create", "users.edit", "roles.edit", "settings.system"].some((p) => permissionSet.has(p));

    // زنجیره‌ی واگذاری: هر سطح فقط زیرمجموعه‌ی خودش را می‌تواند اداره کند
    const managedHoldingIds =
      session.level === "سیستم" ? holdings.map((h) => h.id) : session.level === "هلدینگ" ? session.memberHoldingIds : [];
    const managedCompanyIds =
      session.level === "سیستم"
        ? companies.map((c) => c.id)
        : session.level === "هلدینگ"
          ? companies.filter((c) => session.memberHoldingIds.includes(c.holdingId)).map((c) => c.id)
          : session.memberCompanyIds;

    return {
      identity,
      updateIdentity: (patch) => setIdentity((prev) => ({ ...prev, ...patch })),

      holdings,
      companies,
      companiesOf,
      holdingOf,

      addHolding: (h) => {
        const created: Holding = { ...h, id: `h-${Date.now()}` };
        setHoldings((prev) => [...prev, created]);
        return created;
      },
      updateHolding: (id, patch) => setHoldings((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h))),
      removeHolding: (id) => {
        setHoldings((prev) => prev.filter((h) => h.id !== id));
        setCompanies((prev) => prev.filter((c) => c.holdingId !== id));
        setActiveHoldingId((prev) => (prev === id ? undefined : prev));
        setActiveCompanyId((prev) => (companies.find((c) => c.id === prev)?.holdingId === id ? undefined : prev));
      },

      addCompany: (c) => {
        const created: Company = { ...c, id: `c-${Date.now()}` };
        setCompanies((prev) => [...prev, created]);
        return created;
      },
      updateCompany: (id, patch) => setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))),
      removeCompany: (id) => {
        setCompanies((prev) => prev.filter((c) => c.id !== id));
        setActiveCompanyId((prev) => (prev === id ? undefined : prev));
      },

      actingUser,
      setActingUser,
      session,

      activeHoldingId,
      activeCompanyId,
      setScope: (holdingId, companyId) => {
        setActiveHoldingId(holdingId);
        setActiveCompanyId(companyId);
      },
      activeScopeLabel,
      // «مشاهده به‌عنوان» فقط وقتی معنا دارد که راهبرِ سیستم از دامنه‌ی پیش‌فرضش بیرون رفته باشد
      isViewingAs: session.level === "سیستم" && !!activeHoldingId,
      allowedPublishScopes: publishableScopes(session),

      canAccessAdmin,
      hasPermission,
      canManageHoldings: session.level === "سیستم",
      managedHoldingIds,
      managedCompanyIds,

      visible,
      filterScoped: <T extends Scoped>(items: T[]) => items.filter(visible),
      ownerLabel: (item) => scopeOwnerLabel(item, holdings, companies),
      defaultScopeForNew: () => {
        const allowed = publishableScopes(session);
        if (activeCompanyId && allowed.includes("شرکت")) {
          const c = companies.find((x) => x.id === activeCompanyId);
          return { scope: "شرکت" as ContentScope, holdingId: c?.holdingId, companyId: activeCompanyId };
        }
        if (activeHoldingId && allowed.includes("هلدینگ")) {
          return { scope: "هلدینگ" as ContentScope, holdingId: activeHoldingId };
        }
        if (allowed.includes("سراسری")) return { scope: "سراسری" as ContentScope };
        // کاربرِ سطحِ شرکت که هنوز دامنه‌ی فعالی ندارد → اولین عضویتش
        const c = companies.find((x) => x.id === session.memberCompanyIds[0]);
        return { scope: "شرکت" as ContentScope, holdingId: c?.holdingId, companyId: c?.id };
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, holdings, companies, activeHoldingId, activeCompanyId, session, actingUser]);

  return <TenancyContext.Provider value={value}>{children}</TenancyContext.Provider>;
}

export function useTenancy() {
  const ctx = useContext(TenancyContext);
  if (!ctx) throw new Error("useTenancy must be used within TenancyProvider");
  return ctx;
}
