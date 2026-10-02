// ---------------------------------------------------------------------------
// مدل هویت و دسترسی (IAM) — هم‌راستا با Identity بک‌اند (motonext2: scopes / roles /
// bindings / memberships / audits). ساختار «پیازی»:
//
//   سیستم ← هلدینگ ← شرکت ← واحد
//
// - نقش‌ها سفارشی‌اند: مدیرِ هر واحد برای همان واحد نقش می‌سازد و از فهرست مجوزهای ریز
//   به آن دسترسی می‌دهد. نقش در همان واحد و زیرمجموعه‌هایش (در انواع مجاز) قابل تخصیص است.
// - تخصیص (binding) = کاربر + نقش + واحد (+ بازه‌ی اعتبار). کاربر می‌تواند هم‌زمان چند نقش
//   داشته باشد؛ دسترسی مؤثر = اجتماعِ مجوزهای همه‌ی نقش‌های معتبرش.
// - نقشی که در یک واحد تخصیص یافته، در همه‌ی زیرمجموعه‌های آن واحد هم اعتبار دارد.
// - هر مدیر فقط زیرمجموعه‌ی خودش را اداره می‌کند و مدیرِ هم‌سطح یا بالاتر را نمی‌تواند تغییر دهد.
// - هیچ مدیری نمی‌تواند مجوزی بدهد که خودش ندارد (جلوگیری از افزایش امتیاز).
// ---------------------------------------------------------------------------

export type ScopeType = "system" | "holding" | "company" | "unit";

export const scopeTypeLabel: Record<ScopeType, string> = { system: "سیستم", holding: "هلدینگ", company: "شرکت", unit: "واحد" };
/** کدام نوع می‌تواند زیرِ کدام نوع ساخته شود */
export const childTypes: Record<ScopeType, ScopeType[]> = { system: ["holding"], holding: ["company"], company: ["unit"], unit: ["unit"] };

export type ScopeNode = {
  id: string;
  type: ScopeType;
  name: string;
  code: string;
  parentId: string | null;
  active: boolean;
  color?: string;
  /** حوزه‌ی فعالیت (شرکت) */
  field?: string;
  /** مدیرعامل/سرپرست (نمایشی) */
  lead?: string;
  createdAt: string;
};

export type Role = {
  id: string;
  name: string;
  code: string;
  description: string;
  /** واحدی که نقش در آن تعریف شده — مالکِ نقش */
  createdIn: string;
  /** انواع واحدی که این نقش در آن‌ها قابل تخصیص است */
  allowedTypes: ScopeType[];
  permissions: string[];
  /** نقش پایه‌ی سامانه — حذف‌شدنی نیست */
  builtIn?: boolean;
  active: boolean;
  createdBy: string;
  updatedAt: string;
};

export type Binding = {
  id: string;
  userId: string;
  roleId: string;
  scopeId: string;
  validFrom?: string;
  validUntil?: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
  /** دلیل/شماره‌ی ابلاغ */
  note?: string;
};

export type MembershipStatus = "active" | "suspended";
export type Membership = { id: string; userId: string; scopeId: string; status: MembershipStatus; primary: boolean; createdAt: string; title?: string };

export type AuditEvent =
  | "scope.created"
  | "scope.updated"
  | "scope.deactivated"
  | "scope.activated"
  | "role.created"
  | "role.updated"
  | "role.deleted"
  | "binding.created"
  | "binding.revoked"
  | "membership.created"
  | "membership.suspended"
  | "membership.activated"
  | "membership.removed"
  | "review.completed";

export const auditLabel: Record<AuditEvent, string> = {
  "scope.created": "ایجاد واحد",
  "scope.updated": "ویرایش واحد",
  "scope.deactivated": "غیرفعال‌سازی واحد",
  "scope.activated": "فعال‌سازی واحد",
  "role.created": "ایجاد نقش",
  "role.updated": "ویرایش نقش",
  "role.deleted": "حذف نقش",
  "binding.created": "تخصیص نقش",
  "binding.revoked": "لغو تخصیص نقش",
  "membership.created": "افزودن عضویت",
  "membership.suspended": "تعلیق عضویت",
  "membership.activated": "فعال‌سازی عضویت",
  "membership.removed": "حذف عضویت",
  "review.completed": "بازبینی دسترسی",
};

export type Audit = {
  id: string;
  at: string;
  /** ترتیب برای مرتب‌سازی */
  seq: number;
  actorId: string;
  event: AuditEvent;
  scopeId: string;
  targetType: "scope" | "role" | "binding" | "membership" | "review";
  targetId: string;
  affectedUserId?: string;
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

export type IamState = {
  version: number;
  seq: number;
  scopes: ScopeNode[];
  roles: Role[];
  bindings: Binding[];
  memberships: Membership[];
  audits: Audit[];
};

/** مجوزهای «مدیریتی» — نقشی که یکی از این‌ها را داشته باشد نقشِ مدیریتی است */
export const ADMIN_PERMS = [
  "iam.structure.manage",
  "iam.members.manage",
  "roles.create",
  "roles.edit",
  "roles.delete",
  "roles.assign",
  "users.create",
  "users.edit",
  "settings.system",
];

// ---------------------------------------------------------------------------
// توابع خالص روی درخت
// ---------------------------------------------------------------------------
export const ROOT_ID = "sys";

export function byId(s: IamState, id?: string | null) {
  return s.scopes.find((x) => x.id === id);
}
/** زنجیره‌ی والدها از خودِ واحد تا ریشه */
export function ancestorsOrSelf(s: IamState, id: string): ScopeNode[] {
  const out: ScopeNode[] = [];
  let cur = byId(s, id);
  while (cur) {
    out.push(cur);
    cur = cur.parentId ? byId(s, cur.parentId) : undefined;
  }
  return out;
}
export function isAncestorOrSelf(s: IamState, ancestor: string, id: string) {
  return ancestorsOrSelf(s, id).some((x) => x.id === ancestor);
}
export function descendantsOrSelf(s: IamState, id: string): ScopeNode[] {
  const out: ScopeNode[] = [];
  const walk = (pid: string) => {
    const n = byId(s, pid);
    if (!n) return;
    out.push(n);
    s.scopes.filter((c) => c.parentId === pid).forEach((c) => walk(c.id));
  };
  walk(id);
  return out;
}
export function pathLabel(s: IamState, id: string) {
  return ancestorsOrSelf(s, id)
    .reverse()
    .map((x) => x.name)
    .join(" › ");
}
export function depth(s: IamState, id: string) {
  return ancestorsOrSelf(s, id).length - 1;
}

/** آیا تخصیص در تاریخ مرجع معتبر است؟ (تاریخ‌ها شمسی «۱۴۰۵/۰۳/۰۸») */
export function bindingLive(b: Binding, today: string) {
  if (!b.active) return false;
  if (b.validFrom && b.validFrom > today) return false;
  if (b.validUntil && b.validUntil < today) return false;
  return true;
}

/** آیا کاربر در یک واحد (یا والدهایش) عضویت فعال دارد؟ */
export function activeMembershipScopes(s: IamState, userId: string) {
  return s.memberships.filter((m) => m.userId === userId && m.status === "active").map((m) => m.scopeId);
}

/** نقش‌های معتبرِ کاربر که در واحد `scopeId` اعمال می‌شوند (تخصیص در خودِ واحد یا والدهایش) */
export function bindingsApplying(s: IamState, userId: string, scopeId: string, today: string) {
  const chain = new Set(ancestorsOrSelf(s, scopeId).map((x) => x.id));
  const suspended = new Set(s.memberships.filter((m) => m.userId === userId && m.status === "suspended").map((m) => m.scopeId));
  return s.bindings.filter((b) => b.userId === userId && chain.has(b.scopeId) && bindingLive(b, today) && !suspended.has(b.scopeId) && s.roles.find((r) => r.id === b.roleId)?.active);
}

/** دسترسی مؤثر در یک واحد + منبع هر مجوز (برای «چرا این دسترسی را دارم؟») */
export function effectiveIn(s: IamState, userId: string, scopeId: string, today: string) {
  const sources = new Map<string, { roleId: string; scopeId: string }[]>();
  bindingsApplying(s, userId, scopeId, today).forEach((b) => {
    const r = s.roles.find((x) => x.id === b.roleId);
    r?.permissions.forEach((p) => {
      const arr = sources.get(p) ?? [];
      arr.push({ roleId: r.id, scopeId: b.scopeId });
      sources.set(p, arr);
    });
  });
  return sources;
}

/** واحدهایی که کاربر می‌تواند «در آن بایستد» (کانتکست): واحدهای عضویت/تخصیص و زیرمجموعه‌هایشان */
export function reachableScopes(s: IamState, userId: string, today: string) {
  const roots = new Set<string>([
    ...activeMembershipScopes(s, userId),
    ...s.bindings.filter((b) => b.userId === userId && bindingLive(b, today)).map((b) => b.scopeId),
  ]);
  const out = new Map<string, ScopeNode>();
  roots.forEach((r) => descendantsOrSelf(s, r).forEach((n) => n.active && out.set(n.id, n)));
  return [...out.values()];
}

/** آیا نقش مدیریتی است؟ */
export const isAdminRole = (r?: Role) => !!r && r.permissions.some((p) => ADMIN_PERMS.includes(p));

/** نقش‌هایی که در واحد `scopeId` قابل تخصیص‌اند: نقش‌های تعریف‌شده در خودِ واحد یا والدهایش با نوع مجاز */
export function assignableRoles(s: IamState, scopeId: string) {
  const node = byId(s, scopeId);
  if (!node) return [];
  const chain = new Set(ancestorsOrSelf(s, scopeId).map((x) => x.id));
  return s.roles.filter((r) => r.active && chain.has(r.createdIn) && r.allowedTypes.includes(node.type));
}

/** واحدهایی که کاربر در آن‌ها اختیار مدیریتی (یک مجوز مشخص) دارد — به همراه زیرمجموعه‌ها */
export function adminScopes(s: IamState, userId: string, perm: string, today: string) {
  const own = s.bindings.filter((b) => b.userId === userId && bindingLive(b, today) && s.roles.find((r) => r.id === b.roleId)?.permissions.includes(perm));
  const out = new Map<string, ScopeNode>();
  own.forEach((b) => descendantsOrSelf(s, b.scopeId).forEach((n) => out.set(n.id, n)));
  return out;
}

/**
 * عمق بالاترین واحدی که کاربر در آن نقش مدیریتی دارد — مبنای قاعده‌ی
 * «هر مدیر را فقط مدیرِ لایه‌ی بالاتر مدیریت می‌کند».
 */
export function adminAnchor(s: IamState, userId: string, today: string): string[] {
  return s.bindings.filter((b) => b.userId === userId && bindingLive(b, today) && isAdminRole(s.roles.find((r) => r.id === b.roleId))).map((b) => b.scopeId);
}
