// داده‌ی نمونه‌ی IAM — درخت سازمان، نقش‌های پایه و سفارشی، عضویت‌ها، تخصیص‌ها و تاریخچه.
import { holdings, companies } from "../data/tenancy";
import { roles as baseRoles, allPermissionIds } from "../data/mock";
import { DEMO_REF_DATE } from "../pm/seed";
import { addDays } from "../pm/jalali";
import { ROOT_ID, type AccessRequest, type Audit, type Binding, type IamState, type Membership, type Role, type ScopeNode, type ScopeType, type SodConfig } from "./model";

export const IAM_VERSION = 3;
const D = DEMO_REF_DATE;
const at = (d: string, t = "۰۹:۰۰") => `${d} ${t}`;

const units: { id: string; parent: string; name: string }[] = [
  { id: "u-bank-credit", parent: "c-bank-sina", name: "واحد اعتبارسنجی" },
  { id: "u-bank-it", parent: "c-bank-sina", name: "فناوری اطلاعات" },
  { id: "u-behnoush-prod", parent: "c-behnoush", name: "معاونت تولید" },
  { id: "u-behnoush-hr", parent: "c-behnoush", name: "منابع انسانی" },
  { id: "u-saba-ops", parent: "c-saba-niru", name: "بهره‌برداری نیروگاه" },
  { id: "u-ferdows-lab", parent: "c-ferdows-agri", name: "آزمایشگاه زیست‌فناوری" },
];

function scopes(): ScopeNode[] {
  return [
    { id: ROOT_ID, type: "system", name: "بنیاد مستضعفان انقلاب اسلامی", code: "bonyad", parentId: null, active: true, color: "#1f4f99", createdAt: at("۱۴۰۴/۱۰/۰۱") },
    ...holdings.map((h, i) => ({ id: h.id, type: "holding" as ScopeType, name: h.name, code: `H${String(i + 1).padStart(2, "0")}`, parentId: ROOT_ID, active: h.active, color: h.color, lead: h.lead, createdAt: at("۱۴۰۴/۱۰/۱۵") })),
    ...companies.map((c, i) => ({ id: c.id, type: "company" as ScopeType, name: c.name, code: `C${String(i + 1).padStart(3, "0")}`, parentId: c.holdingId, active: c.active, field: c.field, createdAt: at("۱۴۰۴/۱۱/۰۱") })),
    ...units.map((u, i) => ({ id: u.id, type: "unit" as ScopeType, name: u.name, code: `U${String(i + 1).padStart(3, "0")}`, parentId: u.parent, active: true, createdAt: at("۱۴۰۵/۰۱/۲۰") })),
  ];
}

const ALL: ScopeType[] = ["system", "holding", "company", "unit"];
const without = (prefixes: string[], ids: string[] = []) => allPermissionIds.filter((p) => !prefixes.some((x) => p.startsWith(x)) && !ids.includes(p));
const base = (id: string) => baseRoles.find((r) => r.id === id)!;

function roles(): Role[] {
  const mk = (r: Omit<Role, "active" | "createdBy" | "updatedAt">): Role => ({ ...r, active: true, createdBy: "u1", updatedAt: at("۱۴۰۵/۰۱/۱۰") });
  return [
    mk({ id: "r1", name: "مدیر سامانه", code: "system-admin", description: "همه‌ی مجوزها در کل سامانه؛ ساخت هلدینگ و مدیریت مدیران هلدینگ.", createdIn: ROOT_ID, allowedTypes: ["system"], permissions: [...allPermissionIds], builtIn: true }),
    mk({
      id: "r6",
      name: "مدیر هلدینگ",
      code: "holding-admin",
      description: "اداره‌ی کامل هلدینگ: ساخت شرکت‌های زیرمجموعه، تعریف نقش برای هلدینگ، تخصیص نقش به اعضا و مدیران شرکت‌ها.",
      createdIn: ROOT_ID,
      allowedTypes: ["holding"],
      permissions: without(["settings.storage", "settings.modules", "tickets.vendor"], ["settings.system", "iam.impersonate", "companies.publish-global"]),
      builtIn: true,
    }),
    mk({
      id: "r7",
      name: "مدیر شرکت",
      code: "company-admin",
      description: "اداره‌ی کامل شرکت: ساخت واحدهای داخلی، تعریف نقش برای شرکت و تخصیص آن به اعضای شرکت.",
      createdIn: ROOT_ID,
      allowedTypes: ["company"],
      permissions: [...without(["settings.", "tickets.vendor", "companies."], ["iam.impersonate"]), "settings.branding"],
      builtIn: true,
    }),
    mk({ id: "r2", name: "مدیر محتوا", code: "content-manager", description: base("r2").description, createdIn: ROOT_ID, allowedTypes: ALL, permissions: [...base("r2").permissions, "blog.list", "blog.create", "blog.manage", "calendar.view", "timesheet.log", "tickets.create", "award.list", "award.submit"], builtIn: true }),
    mk({ id: "r3", name: "مدیر پروژه", code: "project-manager", description: base("r3").description, createdIn: ROOT_ID, allowedTypes: ALL, permissions: [...base("r3").permissions, "blog.list", "blog.create", "calendar.view", "calendar.team", "timesheet.log", "timesheet.team", "timesheet.approve", "timesheet.integrations", "tickets.create", "award.list", "award.submit"], builtIn: true }),
    mk({ id: "r5", name: "مدیر گروه", code: "group-manager", description: base("r5").description, createdIn: ROOT_ID, allowedTypes: ALL, permissions: [...base("r5").permissions, "blog.list", "blog.create", "calendar.view", "timesheet.log", "tickets.create", "award.list", "award.submit"], builtIn: true }),
    mk({ id: "r4", name: "کاربر عادی", code: "member", description: base("r4").description, createdIn: ROOT_ID, allowedTypes: ALL, permissions: [...base("r4").permissions, "blog.list", "blog.create", "calendar.view", "timesheet.log", "timesheet.integrations", "tickets.create", "iam.structure.view", "award.list", "award.submit"], builtIn: true }),
    // نقش‌های سفارشی که مدیران لایه‌های پایین‌تر ساخته‌اند
    {
      id: "rh-sina-fin",
      name: "کارشناس مالی هلدینگ",
      code: "sina-finance",
      description: "تعریف‌شده توسط مدیر هلدینگ صنایع غذایی سینا — تأیید هزینه‌ها و کارکرد ماهانه در هلدینگ و شرکت‌هایش.",
      createdIn: "h-sina-food",
      allowedTypes: ["holding", "company"],
      permissions: ["projects.list", "projects.budget", "projects.expenses", "projects.expenses.approve", "projects.reports", "reports.view", "reports.export", "timesheet.team", "timesheet.approve", "timesheet.finance"],
      active: true,
      createdBy: "u2",
      updatedAt: at("۱۴۰۵/۰۲/۱۲"),
    },
    {
      id: "rc-bank-credit",
      name: "کارشناس اعتبارسنجی",
      code: "bank-credit-analyst",
      description: "تعریف‌شده توسط مدیر بانک سینا — دسترسی به اسناد محرمانه‌ی دانش و گزارش‌های واحد اعتبارسنجی.",
      createdIn: "c-bank-sina",
      allowedTypes: ["company", "unit"],
      permissions: ["knowledge.list", "knowledge.upload", "knowledge.confidential", "knowledge.reports", "reports.view", "reports.export", "files.use"],
      active: true,
      createdBy: "u13",
      updatedAt: at("۱۴۰۵/۰۲/۲۰"),
    },
    {
      id: "rc-behnoush-prod",
      name: "سرپرست تولید",
      code: "behnoush-production-lead",
      description: "تعریف‌شده توسط مدیر بهنوش ایران — مدیریت پروژه‌ها و زمان کاری تیم‌های تولید.",
      createdIn: "c-behnoush",
      allowedTypes: ["company", "unit"],
      permissions: ["projects.list", "projects.create", "projects.tasks", "projects.members", "projects.meetings", "timesheet.team", "timesheet.approve", "calendar.team", "events.create"],
      active: true,
      createdBy: "u1",
      updatedAt: at("۱۴۰۵/۰۲/۲۵"),
    },
  ];
}

function membershipsAndBindings(): { memberships: Membership[]; bindings: Binding[] } {
  const memberships: Membership[] = [];
  const bindings: Binding[] = [];
  let m = 0;
  let b = 0;
  const mem = (userId: string, scopeId: string, primary = false, title?: string) => memberships.push({ id: `m${++m}`, userId, scopeId, status: "active", primary, createdAt: at("۱۴۰۵/۰۱/۰۵"), title });
  const bind = (userId: string, roleId: string, scopeId: string, extra: Partial<Binding> = {}) =>
    bindings.push({ id: `b${++b}`, userId, roleId, scopeId, active: true, createdBy: "u1", createdAt: at("۱۴۰۵/۰۱/۰۶"), ...extra });

  mem("u1", ROOT_ID, true, "راهبر سامانه");
  bind("u1", "r1", ROOT_ID);

  // چند نقش هم‌زمان: مدیر محتوای کل سامانه + مدیر هلدینگ سینا
  mem("u2", ROOT_ID, true, "رئیس روابط عمومی");
  mem("u2", "h-sina-food", false, "مدیر هلدینگ");
  bind("u2", "r2", ROOT_ID);
  bind("u2", "r6", "h-sina-food");

  mem("u4", "h-ferdows", true, "مدیرعامل هلدینگ");
  bind("u4", "r6", "h-ferdows");
  bind("u4", "r3", "h-ferdows");

  mem("u13", "c-bank-sina", true, "مدیر شرکت");
  bind("u13", "r7", "c-bank-sina");
  bind("u13", "rc-bank-credit", "u-bank-credit", { createdBy: "u13" });

  mem("u5", "c-saba-niru", true, "مدیر پروژه");
  bind("u5", "r3", "c-saba-niru");
  bind("u5", "r4", "c-saba-niru");

  mem("u7", "c-ferdows-agri", true, "سرپرست آزمایشگاه");
  bind("u7", "r5", "c-ferdows-agri");

  mem("u3", "c-behnoush", true);
  bind("u3", "r4", "c-behnoush");

  mem("u6", "c-behnoush", true);
  bind("u6", "r4", "c-behnoush");
  bind("u6", "rc-behnoush-prod", "u-behnoush-prod");

  mem("u8", "c-sina-rail", true);
  bind("u8", "r4", "c-sina-rail");
  mem("u9", "c-energy-sina", true);
  mem("u9", "c-saba-niru");
  bind("u9", "r4", "c-energy-sina");
  bind("u9", "r4", "c-saba-niru");
  mem("u10", "c-dashtnaz", true);
  bind("u10", "r4", "c-dashtnaz");
  mem("u11", "c-zamzam", true);
  bind("u11", "r4", "c-zamzam");
  // تخصیص موقت با تاریخ پایان — نمونه‌ی «دسترسی زمان‌دار»
  mem("u12", "c-pak", true);
  mem("u12", "c-zamzam");
  mem("u12", "h-sina-food");
  bind("u12", "r4", "c-pak");
  bind("u12", "rh-sina-fin", "h-sina-food", { createdBy: "u2", validFrom: addDays(D, -20), validUntil: addDays(D, 40), note: "پوشش مرخصی کارشناس مالی هلدینگ" });
  // نمونه‌ی عضویتِ معلق
  memberships.push({ id: `m${++m}`, userId: "u11", scopeId: "c-pak", status: "suspended", primary: false, createdAt: at("۱۴۰۵/۰۲/۰۱") });
  return { memberships, bindings };
}

function audits(): Audit[] {
  const rows: Omit<Audit, "id" | "seq">[] = [
    { at: at("۱۴۰۵/۰۲/۱۲", "۱۰:۱۰"), actorId: "u2", event: "role.created", scopeId: "h-sina-food", targetType: "role", targetId: "rh-sina-fin", summary: "نقش «کارشناس مالی هلدینگ» در هلدینگ صنایع غذایی سینا ساخته شد (۱۰ مجوز)." },
    { at: at("۱۴۰۵/۰۲/۲۰", "۱۱:۲۵"), actorId: "u13", event: "scope.created", scopeId: "u-bank-credit", targetType: "scope", targetId: "u-bank-credit", summary: "واحد «واحد اعتبارسنجی» زیر بانک سینا ساخته شد." },
    { at: at("۱۴۰۵/۰۲/۲۰", "۱۱:۴۰"), actorId: "u13", event: "role.created", scopeId: "c-bank-sina", targetType: "role", targetId: "rc-bank-credit", summary: "نقش «کارشناس اعتبارسنجی» در بانک سینا ساخته شد (۷ مجوز)." },
    { at: at("۱۴۰۵/۰۲/۲۰", "۱۱:۴۵"), actorId: "u13", event: "binding.created", scopeId: "u-bank-credit", targetType: "binding", targetId: "b-seed", affectedUserId: "u13", summary: "نقش «کارشناس اعتبارسنجی» در «واحد اعتبارسنجی» به «مهندس بردیا کوشا» داده شد." },
    { at: at("۱۴۰۵/۰۲/۲۸", "۰۹:۰۵"), actorId: "u1", event: "membership.suspended", scopeId: "c-pak", targetType: "membership", targetId: "m-seed", affectedUserId: "u11", summary: "عضویت «دکتر شایان مهرورز» در لبنیات پاک معلق شد." },
    { at: at(addDays(D, -20), "۰۸:۳۰"), actorId: "u2", event: "binding.created", scopeId: "h-sina-food", targetType: "binding", targetId: "b-seed2", affectedUserId: "u12", summary: "نقش «کارشناس مالی هلدینگ» تا " + addDays(D, 40) + " به «دکتر یاسمن روشن» داده شد (دسترسی زمان‌دار).", after: { validUntil: addDays(D, 40) } },
  ];
  return rows.map((r, i) => ({ ...r, id: `a${i + 1}`, seq: i + 1 }));
}

/** قواعد پیش‌فرض تفکیک وظایف — از مجوزهای واقعی کاتالوگ */
export function defaultSod(): SodConfig {
  return {
    exemptRoleIds: ["r1"],
    rules: [
      { id: "sod-exp", a: "projects.expenses", b: "projects.expenses.approve", title: "ثبت هزینه و تأیید/پرداخت همان هزینه", mode: "warn", active: true },
      { id: "sod-contract", a: "contracts.create", b: "contracts.stage", title: "ثبت قرارداد و تغییر مرحله (تأیید) آن", mode: "warn", active: true },
      { id: "sod-fund", a: "funds.submit", b: "funds.score", title: "ثبت طرح و داوری طرح‌های صندوق", mode: "block", active: true },
      { id: "sod-fund-alloc", a: "funds.score", b: "funds.allocate", title: "داوری طرح و تخصیص منابع به آن", mode: "warn", active: true },
      { id: "sod-award", a: "award.submit", b: "award.judge", title: "ارسال اثر به جایزه و داوری آثار", mode: "block", active: true },
      { id: "sod-payroll", a: "timesheet.approve", b: "timesheet.finance", title: "تأیید کارکرد و خروجی حقوق", mode: "warn", active: true },
    ],
  };
}

function requests(): AccessRequest[] {
  return [
    { id: "rq1", userId: "u3", roleId: "rc-behnoush-prod", scopeId: "u-behnoush-prod", durationDays: 30, reason: "پوشش مرخصی سرپرست تولید در خط بسته‌بندی", status: "pending", createdAt: at(addDays(D, -1), "۱۰:۱۵") },
    { id: "rq2", userId: "u10", roleId: "r3", scopeId: "c-dashtnaz", durationDays: 90, reason: "راهبری پروژه‌ی آبیاری هوشمند فاز ۲", status: "pending", createdAt: at(D, "۰۸:۴۰") },
    { id: "rq3", userId: "u9", roleId: "r3", scopeId: "c-saba-niru", durationDays: 7, reason: "دسترسی موقت برای گزارش ماهانه", status: "rejected", createdAt: at(addDays(D, -6), "۰۹:۳۰"), decidedBy: "u1", decidedAt: at(addDays(D, -5), "۱۱:۰۰"), decisionNote: "گزارش ماهانه با نقش فعلی قابل تهیه است." },
  ];
}

export function seedIam(): IamState {
  const mb = membershipsAndBindings();
  return { version: IAM_VERSION, seq: 100, scopes: scopes(), roles: roles(), bindings: mb.bindings, memberships: mb.memberships, audits: audits(), requests: requests(), sod: defaultSod() };
}

/** بارگذاری مدارا‌گر: نسخه‌ی ۲ (قبل از درخواست/تفکیک وظایف) بدون از دست رفتن تغییرات کاربر ارتقا می‌یابد */
export function migrateIam(raw: unknown): IamState | null {
  const s = raw as Partial<IamState> | null;
  if (!s || typeof s !== "object" || !Array.isArray(s.scopes) || !Array.isArray(s.roles)) return null;
  if (s.version !== 2 && s.version !== IAM_VERSION) return null;
  const out = { ...s, version: IAM_VERSION, requests: Array.isArray(s.requests) ? s.requests : requests(), sod: s.sod && Array.isArray(s.sod.rules) ? s.sod : defaultSod() } as IamState;
  if (s.version === 2) out.roles = out.roles.map((r) => (r.id === "r7" && !r.permissions.includes("settings.branding") ? { ...r, permissions: [...r.permissions, "settings.branding"] } : r));
  return out;
}
