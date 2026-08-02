import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  systemIdentity as initialIdentity,
  holdings as initialHoldings,
  companies as initialCompanies,
  isVisibleInScope,
  scopeOwnerLabel,
  type Company,
  type ContentScope,
  type Holding,
  type Scoped,
  type SystemIdentity,
} from "../data/tenancy";

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

  // --- دامنه‌ی فعال (سوییچر هدر) ---
  activeHoldingId?: string;
  activeCompanyId?: string;
  setScope: (holdingId?: string, companyId?: string) => void;
  /** برچسب خوانای دامنه‌ی فعال، برای هدر و عنوان صفحه‌ها */
  activeScopeLabel: string;
  /** آیا راهبر در حال «مشاهده به‌عنوان» یک دامنه‌ی دیگر است */
  isViewingAs: boolean;

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
  const [activeHoldingId, setActiveHoldingId] = useState<string | undefined>(undefined);
  const [activeCompanyId, setActiveCompanyId] = useState<string | undefined>(undefined);

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

    const visible = (item: Scoped) => isVisibleInScope(item, activeHoldingId, activeCompanyId);

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

      activeHoldingId,
      activeCompanyId,
      setScope: (holdingId, companyId) => {
        setActiveHoldingId(holdingId);
        setActiveCompanyId(companyId);
      },
      activeScopeLabel,
      isViewingAs: !!activeHoldingId,

      visible,
      filterScoped: <T extends Scoped>(items: T[]) => items.filter(visible),
      ownerLabel: (item) => scopeOwnerLabel(item, holdings, companies),
      defaultScopeForNew: () => {
        if (activeCompanyId) {
          const c = companies.find((x) => x.id === activeCompanyId);
          return { scope: "شرکت" as ContentScope, holdingId: c?.holdingId, companyId: activeCompanyId };
        }
        if (activeHoldingId) return { scope: "هلدینگ" as ContentScope, holdingId: activeHoldingId };
        return { scope: "سراسری" as ContentScope };
      },
    };
  }, [identity, holdings, companies, activeHoldingId, activeCompanyId]);

  return <TenancyContext.Provider value={value}>{children}</TenancyContext.Provider>;
}

export function useTenancy() {
  const ctx = useContext(TenancyContext);
  if (!ctx) throw new Error("useTenancy must be used within TenancyProvider");
  return ctx;
}
