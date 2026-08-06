// ---------------------------------------------------------------------------
// مدل چندسطحی سازمان — منبع واحد حقیقت
//
//   سیستم (این نصب = این مشتری)
//     └── هلدینگ (n)
//           └── شرکت (n)
//                 └── کاربر
//
// هر نصبِ محصول متعلق به یک مشتری است؛ هویت و پیکربندی SSO آن در
// systemIdentity نگه‌داری می‌شود. تفکیک واقعیِ داده در سطح هلدینگ/شرکت است.
// ---------------------------------------------------------------------------

export type ContentScope = "سراسری" | "هلدینگ" | "شرکت";

/** سطحی که یک نقش/تخصیص یا یک کاربر در آن عمل می‌کند */
export type ScopeLevel = "سیستم" | "هلدینگ" | "شرکت" | "گروه";

export type Holding = {
  id: string;
  name: string;
  color: string;
  /** مدیرعامل/راهبر هلدینگ */
  lead?: string;
  active: boolean;
};

export type Company = {
  id: string;
  name: string;
  holdingId: string;
  /** حوزه‌ی فعالیت */
  field?: string;
  users: number;
  active: boolean;
};

/** هر آیتم محتوایی/کاری این سه فیلد را دارد تا دامنه‌ی انتشارش مشخص باشد */
export type Scoped = {
  /** نبودِ این فیلد یعنی «سراسری» — تا داده‌های قدیمی بدون تغییر معتبر بمانند */
  scope?: ContentScope;
  holdingId?: string;
  companyId?: string;
  /**
   * سازنده‌ی آیتم — مبنای «مالکیت». هر کاربر آنچه خودش ساخته را کامل مدیریت می‌کند.
   * نبودِ این فیلد یعنی آیتمِ قدیمی/سیستمی که مالکِ مشخصی ندارد (فقط مدیرِ همان دامنه اداره‌اش می‌کند).
   */
  authorId?: string;
};

export type SsoProvider = "بدون SSO" | "LDAP / Active Directory" | "SAML 2.0" | "OpenID Connect" | "ورود با موبایل (OTP)";

export type SystemIdentity = {
  /** نام مشتری‌ای که این نصب برای اوست */
  name: string;
  shortName: string;
  domain: string;
  /** رنگ برند این نصب */
  color: string;
  ssoProvider: SsoProvider;
  ssoEndpoint: string;
  ssoDomainHint: string;
  /** همگام‌سازی خودکار کاربران از منبع هویت سازمان */
  autoProvision: boolean;
  /** اجازه‌ی ورود با نام‌کاربری/گذرواژه‌ی محلی در کنار SSO */
  allowLocalLogin: boolean;
};

// ---------------------------------------------------------------------------

export const systemIdentity: SystemIdentity = {
  name: "بنیاد مستضعفان انقلاب اسلامی",
  shortName: "بنیاد",
  domain: "shub.ir",
  color: "#1f4f99",
  ssoProvider: "LDAP / Active Directory",
  ssoEndpoint: "ldaps://ad.bonyad.local:636",
  ssoDomainHint: "bonyad.local",
  autoProvision: true,
  allowLocalLogin: true,
};

export const holdings: Holding[] = [
  { id: "h-ferdows", name: "هلدینگ کشاورزی فردوس پارس", color: "#0d9488", lead: "مهندس رضا فرهمند", active: true },
  { id: "h-sina-food", name: "هلدینگ صنایع غذایی سینا", color: "#b45309", lead: "دکتر مریم ساعی", active: true },
  { id: "h-saba", name: "هلدینگ برق و انرژی صبا", color: "#0f172a", lead: "مهندس کاوه نظری", active: true },
  { id: "h-paya", name: "هلدینگ پایا ترابر سینا", color: "#7c3aed", lead: "مهندس سعید آروین", active: true },
  { id: "h-mali", name: "هلدینگ مالی و سرمایه‌گذاری سینا", color: "#1f4f99", lead: "دکتر نگار توکلی", active: true },
];

export const companies: Company[] = [
  { id: "c-dashtnaz", name: "کشت و صنعت دشت ناز ساری", holdingId: "h-ferdows", field: "کشاورزی", users: 148, active: true },
  { id: "c-ferdows-agri", name: "موسسه تحقیقات کشاورزی بنیاد", holdingId: "h-ferdows", field: "پژوهش کشاورزی", users: 62, active: true },
  { id: "c-behnoush", name: "بهنوش ایران", holdingId: "h-sina-food", field: "صنایع غذایی", users: 310, active: true },
  { id: "c-zamzam", name: "زمزم ایران", holdingId: "h-sina-food", field: "نوشیدنی", users: 275, active: true },
  { id: "c-pak", name: "لبنیات پاک", holdingId: "h-sina-food", field: "لبنیات", users: 194, active: true },
  { id: "c-saba-niru", name: "نیروگاه‌های صبا", holdingId: "h-saba", field: "تولید برق", users: 221, active: true },
  { id: "c-energy-sina", name: "انرژی گستر سینا", holdingId: "h-saba", field: "بهینه‌سازی انرژی", users: 87, active: true },
  { id: "c-sina-rail", name: "سینا ریل پارس", holdingId: "h-paya", field: "حمل‌ونقل ریلی", users: 133, active: true },
  { id: "c-azadrah", name: "آزادراه تهران - شمال", holdingId: "h-paya", field: "زیرساخت راه", users: 96, active: true },
  { id: "c-bank-sina", name: "بانک سینا", holdingId: "h-mali", field: "بانکداری", users: 402, active: true },
  { id: "c-bime-sina", name: "بیمه سینا", holdingId: "h-mali", field: "بیمه", users: 168, active: true },
];

// --- سازگاری با کدِ قبلی که ساختار تودرتو می‌خواست --------------------------

export type SubCompany = { id: string; name: string };

/** نمای تودرتوی هلدینگ‌ها (مشتق‌شده از همان دو آرایه‌ی بالا) */
export const holdingsNested: (Holding & { companies: SubCompany[] })[] = holdings.map((h) => ({
  ...h,
  companies: companies.filter((c) => c.holdingId === h.id).map(({ id, name }) => ({ id, name })),
}));

export const allCompanies: (SubCompany & { holdingId: string; holdingName: string })[] = companies.map((c) => ({
  id: c.id,
  name: c.name,
  holdingId: c.holdingId,
  holdingName: holdings.find((h) => h.id === c.holdingId)?.name ?? "",
}));

// --- کمک‌تابع‌های دامنه ------------------------------------------------------

/** برچسب خوانا برای مالکِ یک آیتم دامنه‌دار */
export function scopeOwnerLabel(item: Scoped, hs: Holding[] = holdings, cs: Company[] = companies): string {
  if (!item.scope || item.scope === "سراسری") return "سراسری";
  if (item.scope === "هلدینگ") return hs.find((h) => h.id === item.holdingId)?.name ?? "هلدینگ";
  return cs.find((c) => c.id === item.companyId)?.name ?? "شرکت";
}

/**
 * آیا این آیتم برای بیننده‌ای که در دامنه‌ی (holdingId, companyId) ایستاده دیده می‌شود؟
 * - سراسری: همیشه
 * - هلدینگ: اگر بیننده در همان هلدینگ باشد
 * - شرکت: اگر بیننده دقیقاً همان شرکت باشد
 * بیننده‌ای که در سطح سیستم ایستاده (بدون هلدینگ فعال) همه‌چیز را می‌بیند.
 */
export function isVisibleInScope(item: Scoped, viewHoldingId?: string, viewCompanyId?: string): boolean {
  if (!viewHoldingId) return true; // سطح سیستم — دید کامل
  if (!item.scope || item.scope === "سراسری") return true;
  if (item.scope === "هلدینگ") return item.holdingId === viewHoldingId;
  if (!viewCompanyId) return item.holdingId === viewHoldingId; // کل هلدینگ، بدون شرکت مشخص
  return item.companyId === viewCompanyId;
}

/**
 * دامنه‌ی نمایشی برای داده‌ی نمونه — تا در دمو با عوض‌کردن هلدینگ/شرکت،
 * فهرست‌ها واقعاً تغییر کنند. الگو: یکی سراسری، یکی هلدینگ، یکی شرکت.
 */
export function demoScopeFor(index: number, salt = 0): Scoped {
  const i = index + salt;
  const mod = i % 3;
  if (mod === 0) return { scope: "سراسری" };
  if (mod === 1) {
    const h = holdings[i % holdings.length];
    return { scope: "هلدینگ", holdingId: h.id };
  }
  const c = companies[i % companies.length];
  return { scope: "شرکت", holdingId: c.holdingId, companyId: c.id };
}

/** افزودن دامنه‌ی نمونه به یک فهرست، بدون دست‌زدن به آیتم‌هایی که از قبل دامنه دارند */
export function withDemoScopes<T extends Scoped>(items: T[], salt = 0): T[] {
  return items.map((item, i) => (item.scope ? item : { ...item, ...demoScopeFor(i, salt) }));
}

// ---------------------------------------------------------------------------
// نشستِ کاربر — دامنه از روی «کاربر» محاسبه می‌شود، نه از روی انتخابِ او
// ---------------------------------------------------------------------------

/** آنچه در لحظه‌ی ورود درباره‌ی دامنه‌ی کاربر می‌دانیم */
export type SessionScope = {
  /** سطحی که نقشِ کاربر به او می‌دهد */
  level: ScopeLevel;
  /** شرکت‌هایی که عضوشان است (از مدیر شرکت گرفته، نه انتخاب خودش) */
  memberCompanyIds: string[];
  /** هلدینگ‌هایی که از راه عضویت یا نقش به آن‌ها تعلق دارد */
  memberHoldingIds: string[];
  /** آیا اصلاً حق دیدنِ سوییچر را دارد */
  canSwitch: boolean;
  /** دامنه‌هایی که مجاز است بینشان جابه‌جا شود */
  switchable: { holdingId?: string; companyId?: string; label: string }[];
};

/**
 * دامنه‌ی نشست را می‌سازد.
 * - سطح سیستم: همه‌چیز؛ سوییچر نقشِ «مشاهده به‌عنوان» دارد.
 * - سطح هلدینگ: کلِ هلدینگِ خودش؛ می‌تواند بین شرکت‌های همان هلدینگ برود.
 * - سطح شرکت: اگر عضو یک شرکت باشد سوییچری نیست؛ اگر عضو چند شرکت باشد،
 *   سوییچر فقط همان شرکت‌ها را نشان می‌دهد.
 */
export function buildSessionScope(
  memberCompanyIds: string[],
  level: ScopeLevel,
  roleHoldingId: string | undefined,
  hs: Holding[] = holdings,
  cs: Company[] = companies
): SessionScope {
  const memberCompanies = cs.filter((c) => memberCompanyIds.includes(c.id));
  const memberHoldingIds = Array.from(new Set(memberCompanies.map((c) => c.holdingId)));

  if (level === "سیستم") {
    const switchable = [
      { label: "کل سیستم" },
      ...hs.flatMap((h) => [
        { holdingId: h.id, label: h.name },
        ...cs.filter((c) => c.holdingId === h.id).map((c) => ({ holdingId: h.id, companyId: c.id, label: c.name })),
      ]),
    ];
    return { level, memberCompanyIds, memberHoldingIds, canSwitch: true, switchable };
  }

  if (level === "هلدینگ") {
    const hid = roleHoldingId ?? memberHoldingIds[0];
    const h = hs.find((x) => x.id === hid);
    const own = cs.filter((c) => c.holdingId === hid);
    return {
      level,
      memberCompanyIds,
      memberHoldingIds: hid ? [hid] : memberHoldingIds,
      canSwitch: own.length > 1,
      switchable: [
        { holdingId: hid, label: h ? `کل ${h.name}` : "کل هلدینگ" },
        ...own.map((c) => ({ holdingId: hid, companyId: c.id, label: c.name })),
      ],
    };
  }

  // سطح شرکت (و گروه) — فقط شرکت‌هایی که واقعاً عضوشان است
  return {
    level,
    memberCompanyIds,
    memberHoldingIds,
    canSwitch: memberCompanies.length > 1,
    switchable: memberCompanies.map((c) => ({ holdingId: c.holdingId, companyId: c.id, label: c.name })),
  };
}

/**
 * آیا آیتم برای این نشست دیده می‌شود؟ (نسخه‌ی چند-عضویتی)
 * سراسری همیشه؛ هلدینگ اگر یکی از هلدینگ‌های کاربر باشد؛ شرکت اگر یکی از شرکت‌های او.
 * وقتی کاربر روی یک دامنه‌ی مشخص ایستاده (activeCompanyId/activeHoldingId)، همان تنگ‌تر عمل می‌کند.
 */
export function isVisibleForSession(
  item: Scoped,
  session: SessionScope,
  activeHoldingId?: string,
  activeCompanyId?: string
): boolean {
  if (session.level === "سیستم" && !activeHoldingId) return true;
  if (!item.scope || item.scope === "سراسری") return true;

  if (activeCompanyId) {
    return item.scope === "شرکت"
      ? item.companyId === activeCompanyId
      : item.holdingId === (activeHoldingId ?? companies.find((c) => c.id === activeCompanyId)?.holdingId);
  }
  if (activeHoldingId) {
    return item.holdingId === activeHoldingId;
  }
  if (item.scope === "هلدینگ") return session.memberHoldingIds.includes(item.holdingId ?? "");
  return session.memberCompanyIds.includes(item.companyId ?? "");
}

/** دامنه‌هایی که این نشست حق دارد محتوا را در آن‌ها منتشر کند */
export function publishableScopes(session: SessionScope): ContentScope[] {
  if (session.level === "سیستم") return ["سراسری", "هلدینگ", "شرکت"];
  if (session.level === "هلدینگ") return ["هلدینگ", "شرکت"];
  return ["شرکت"];
}
