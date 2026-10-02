// ---------------------------------------------------------------------------
// زمینه‌ی سازمان و دسترسی — روی موتور IAM (src/iam/model.ts) ساخته شده است.
// API قبلی (hasPermission، session، filterScoped، canManageItem و …) حفظ شده تا
// ماژول‌ها بدون تغییر کار کنند؛ اما همه‌چیز اکنون از درخت واحدها، نقش‌های سفارشی،
// تخصیص‌های چندگانه (اجتماع مجوزها) و تاریخچه‌ی تغییرناپذیر محاسبه می‌شود.
// ---------------------------------------------------------------------------
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { systemIdentity as initialIdentity, type Company, type ContentScope, type Holding, type Scoped, type ScopeLevel, type SessionScope, type SystemIdentity } from "../data/tenancy";
import { currentUser, users as allUsers, type UserProfile, type RoleDef, type RoleGrant } from "../data/mock";
import { DEMO_REF_DATE } from "../pm/seed";
import { nowClock } from "../pm/jalali";
import {
  ADMIN_PERMS,
  ROOT_ID,
  adminAnchor,
  ancestorsOrSelf,
  assignableRoles,
  bindingLive,
  bindingsApplying,
  byId,
  childTypes,
  descendantsOrSelf,
  effectiveIn,
  isAdminRole,
  isAncestorOrSelf,
  pathLabel,
  reachableScopes,
  scopeTypeLabel,
  type Audit,
  type AuditEvent,
  type Binding,
  type IamState,
  type Membership,
  type MembershipStatus,
  type Role,
  type ScopeNode,
  type ScopeType,
} from "../iam/model";
import { IAM_VERSION, seedIam } from "../iam/seed";

export type Check = { ok: true } | { ok: false; reason: string };
const ok: Check = { ok: true };
const no = (reason: string): Check => ({ ok: false, reason });

export type RoleInput = Pick<Role, "name" | "code" | "description" | "allowedTypes" | "permissions"> & { id?: string; createdIn: string };
export type BindingInput = { userId: string; roleId: string; scopeId: string; validFrom?: string; validUntil?: string; note?: string };

type TenancyValue = {
  // --- هویت این نصب ---
  identity: SystemIdentity;
  updateIdentity: (patch: Partial<SystemIdentity>) => void;

  // --- ساختار سازمانی (سازگار با کد قبلی) ---
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

  // --- نشست ---
  actingUser: UserProfile;
  setActingUser: (userId: string) => void;
  session: SessionScope;
  /** نقش اصلیِ کاربر در کانتکست فعلی (برای نمایش) */
  role: RoleDef;
  grant?: RoleGrant;

  // --- کانتکست (واحدی که کاربر در آن ایستاده) ---
  activeHoldingId?: string;
  activeCompanyId?: string;
  setScope: (holdingId?: string, companyId?: string) => void;
  activeScopeLabel: string;
  isViewingAs: boolean;
  allowedPublishScopes: ContentScope[];

  // --- دسترسی ---
  canAccessAdmin: boolean;
  hasPermission: (id: string) => boolean;
  canManageHoldings: boolean;
  canModerateGroup: (group: { id: string; scope?: string; holdingId?: string; companyId?: string }) => boolean;
  canManageItem: (item: Scoped, editPerm?: string) => boolean;
  managedHoldingIds: string[];
  managedCompanyIds: string[];

  visible: (item: Scoped) => boolean;
  filterScoped: <T extends Scoped>(items: T[]) => T[];
  ownerLabel: (item: Scoped) => string;
  defaultScopeForNew: () => Scoped;

  // ======================= IAM =======================
  iam: IamState;
  today: string;
  /** واحد فعال */
  contextId: string;
  contextNode: ScopeNode;
  setContext: (scopeId: string) => void;
  /** واحدهایی که کاربرِ فعلی می‌تواند در آن‌ها بایستد */
  reachable: ScopeNode[];
  /** تخصیص‌های معتبرِ کاربرِ فعلی که در کانتکست اعمال می‌شوند */
  myBindings: (Binding & { role: Role; scope: ScopeNode })[];
  /** مجوز → منبع‌ها (نقش و واحد) در کانتکست فعلی */
  effective: Map<string, { roleId: string; scopeId: string }[]>;
  /** دسترسی مؤثرِ هر کاربر در هر واحد */
  effectiveOf: (userId: string, scopeId: string) => Map<string, { roleId: string; scopeId: string }[]>;
  rolesOf: (userId: string) => (Binding & { role: Role; scope: ScopeNode; live: boolean })[];
  primaryRoleOf: (userId: string) => Role | undefined;
  membershipsOf: (userId: string) => (Membership & { scope: ScopeNode })[];
  membersOf: (scopeId: string, includeDescendants?: boolean) => Membership[];
  /** اعضایی که کاربرِ فعلی (در کانتکست) حق دیدنشان را دارد */
  visibleUserIds: () => string[];
  scopePath: (id: string) => string;
  scopeLabel: (id?: string) => string;
  scopeTypeLabel: Record<ScopeType, string>;
  assignableRoles: (scopeId: string) => Role[];
  isAdminRole: (r?: Role) => boolean;

  // مجوزها/اختیارات مدیریتی
  canAdmin: (scopeId: string, perm: string) => boolean;
  checkCreateScope: (parentId: string, type: ScopeType) => Check;
  checkEditScope: (scopeId: string) => Check;
  checkRole: (input: RoleInput, existing?: Role) => Check;
  checkDeleteRole: (role: Role) => Check;
  checkAssign: (input: BindingInput) => Check;
  checkRevoke: (b: Binding) => Check;
  checkMembership: (userId: string, scopeId: string) => Check;
  /** مجوزهایی که کاربرِ فعلی می‌تواند به یک نقش در این واحد بدهد (بدون افزایش امتیاز) */
  grantablePermissions: (scopeId: string) => Set<string>;

  // اکشن‌ها (هرکدام تاریخچه ثبت می‌کند)
  createScope: (parentId: string, type: ScopeType, name: string, extra?: Partial<ScopeNode>) => Check & { id?: string };
  updateScope: (id: string, patch: Partial<Pick<ScopeNode, "name" | "code" | "color" | "field" | "lead">>) => Check;
  setScopeActive: (id: string, active: boolean) => Check;
  saveRole: (input: RoleInput) => Check & { id?: string };
  deleteRole: (id: string) => Check;
  assignRole: (input: BindingInput) => Check;
  revokeBinding: (id: string) => Check;
  addMembership: (userId: string, scopeId: string, title?: string) => Check;
  setMembershipStatus: (id: string, status: MembershipStatus) => Check;
  removeMembership: (id: string) => Check;
  completeReview: (scopeId: string, revokedIds: string[]) => void;
  resetIam: () => void;
};

const ACTING_USER_KEY = "motoshub.actingUser.v1";
const IAM_KEY = "motoshub.iam.v1";
const CTX_KEY = "motoshub.iamContext.v1";

function loadIam(): IamState {
  try {
    const raw = localStorage.getItem(IAM_KEY);
    if (raw) {
      const s = JSON.parse(raw) as IamState;
      if (s.version === IAM_VERSION) return s;
    }
  } catch {
    /* بدون حافظه‌ی مرورگر */
  }
  return seedIam();
}
const readJson = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};

const ROLE_RANK = ["r1", "r6", "r7", "r2", "r3", "r5"];
const levelOf = (t?: ScopeType): ScopeLevel => (t === "system" ? "سیستم" : t === "holding" ? "هلدینگ" : "شرکت");

const TenancyContext = createContext<TenancyValue | null>(null);

export function TenancyProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<SystemIdentity>(initialIdentity);
  const [iam, setIam] = useState<IamState>(loadIam);
  const today = DEMO_REF_DATE;
  const [actingUserId, setActingUserId] = useState<string>(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(ACTING_USER_KEY);
    } catch {
      /* نادیده */
    }
    return saved && allUsers.some((u) => u.id === saved) ? saved : currentUser.id;
  });
  const [ctxMap, setCtxMap] = useState<Record<string, string>>(() => readJson(CTX_KEY, {}));

  useEffect(() => {
    try {
      localStorage.setItem(IAM_KEY, JSON.stringify(iam));
    } catch {
      /* نادیده */
    }
  }, [iam]);
  useEffect(() => {
    try {
      localStorage.setItem(CTX_KEY, JSON.stringify(ctxMap));
    } catch {
      /* نادیده */
    }
  }, [ctxMap]);

  const actingUser = allUsers.find((u) => u.id === actingUserId) ?? currentUser;
  const me = actingUser.id;

  // ---------------------------------------------------------------- کانتکست
  const reachable = useMemo(() => reachableScopes(iam, me, today), [iam, me, today]);
  const primaryScope = useMemo(() => {
    const ms = iam.memberships.filter((m) => m.userId === me && m.status === "active");
    return ms.find((m) => m.primary)?.scopeId ?? ms[0]?.scopeId ?? reachable[0]?.id ?? ROOT_ID;
  }, [iam, me, reachable]);
  const contextId = ctxMap[me] && reachable.some((r) => r.id === ctxMap[me]) ? ctxMap[me] : primaryScope;
  const contextNode = byId(iam, contextId) ?? iam.scopes[0];

  const value = useMemo<TenancyValue>(() => {
    const scopes = iam.scopes;
    const node = (id?: string | null) => byId(iam, id);
    const roleById = (id: string) => iam.roles.find((r) => r.id === id);
    const effective = effectiveIn(iam, me, contextId, today);
    const hasPermission = (p: string) => effective.has(p);
    const effectiveOf = (userId: string, scopeId: string) => effectiveIn(iam, userId, scopeId, today);
    const permsAt = (scopeId: string) => new Set(effectiveIn(iam, me, scopeId, today).keys());
    const canAdmin = (scopeId: string, perm: string) => permsAt(scopeId).has(perm);
    const myAnchors = adminAnchor(iam, me, today);
    const isRootAdmin = myAnchors.includes(ROOT_ID);
    /** آیا `scopeId` اکیداً زیرِ یکی از واحدهای مدیریتی من است؟ */
    const strictlyBelowMyAnchor = (scopeId: string) => isRootAdmin || myAnchors.some((a) => a !== scopeId && isAncestorOrSelf(iam, a, scopeId));

    // ------------------------------------------------ قوانین مدیریتی
    const checkCreateScope = (parentId: string, type: ScopeType): Check => {
      const p = node(parentId);
      if (!p) return no("واحد والد پیدا نشد.");
      if (!p.active) return no("واحد والد غیرفعال است.");
      if (!childTypes[p.type].includes(type)) return no(`زیر «${scopeTypeLabel[p.type]}» نمی‌توان «${scopeTypeLabel[type]}» ساخت.`);
      if (!canAdmin(parentId, "iam.structure.manage")) return no("برای ساخت زیرمجموعه در این واحد اختیار مدیریتی ندارید.");
      return ok;
    };
    const checkEditScope = (scopeId: string): Check => {
      const n = node(scopeId);
      if (!n) return no("واحد پیدا نشد.");
      if (!n.parentId) return isRootAdmin ? ok : no("فقط مدیر سامانه سیستم را ویرایش می‌کند.");
      // هر واحد را مدیرِ لایه‌ی بالاتر اداره می‌کند
      if (!canAdmin(n.parentId, "iam.structure.manage")) return no("این واحد را فقط مدیرِ لایه‌ی بالاتر می‌تواند ویرایش کند.");
      return ok;
    };
    const grantablePermissions = (scopeId: string) => permsAt(scopeId);
    const checkRole = (input: RoleInput, existing?: Role): Check => {
      const where = node(input.createdIn);
      if (!where) return no("واحد نقش پیدا نشد.");
      if (!input.name.trim()) return no("نام نقش الزامی است.");
      if (!input.allowedTypes.length) return no("حداقل یک نوع واحد مجاز برای تخصیص انتخاب کنید.");
      if (!canAdmin(input.createdIn, existing ? "roles.edit" : "roles.create")) return no(`برای ${existing ? "ویرایش" : "ساخت"} نقش در «${where.name}» اختیار ندارید.`);
      if (existing?.builtIn && !isRootAdmin) return no("نقش‌های پایه را فقط مدیر سامانه ویرایش می‌کند.");
      const mine = grantablePermissions(input.createdIn);
      const extra = input.permissions.filter((p) => !mine.has(p) && !(existing?.permissions ?? []).includes(p));
      if (extra.length) return no(`نمی‌توانید مجوزی بدهید که خودتان ندارید (${extra.length.toLocaleString("fa-IR")} مجوز).`);
      // نوع مجاز باید هم‌سطح یا پایین‌تر از واحدِ تعریف باشد
      const order: ScopeType[] = ["system", "holding", "company", "unit"];
      if (input.allowedTypes.some((t) => order.indexOf(t) < order.indexOf(where.type))) return no("نقش فقط در همان سطح یا زیرمجموعه‌ها قابل تخصیص است.");
      return ok;
    };
    const checkDeleteRole = (r: Role): Check => {
      if (r.builtIn) return no("نقش‌های پایه حذف‌شدنی نیستند؛ می‌توانید مجوزهایشان را تغییر دهید.");
      if (!canAdmin(r.createdIn, "roles.delete")) return no("حذف این نقش فقط از مدیرِ واحد سازنده یا بالاتر برمی‌آید.");
      return ok;
    };
    const checkAssign = (b: BindingInput): Check => {
      const n = node(b.scopeId);
      const r = roleById(b.roleId);
      if (!n || !r) return no("واحد یا نقش نامعتبر است.");
      if (!n.active) return no("واحد غیرفعال است.");
      if (!assignableRoles(iam, b.scopeId).some((x) => x.id === r.id)) return no(`نقش «${r.name}» در «${n.name}» قابل تخصیص نیست.`);
      if (!canAdmin(b.scopeId, "roles.assign")) return no("در این واحد اختیار تخصیص نقش ندارید.");
      const mine = permsAt(b.scopeId);
      if (r.permissions.some((p) => !mine.has(p))) return no("این نقش مجوزهایی دارد که خودتان ندارید؛ تخصیص آن ممکن نیست.");
      if (isAdminRole(r) && !strictlyBelowMyAnchor(b.scopeId)) return no("مدیرِ هم‌سطح یا بالاتر را فقط مدیرِ لایه‌ی بالاتر تعیین می‌کند.");
      if (b.validFrom && b.validUntil && b.validUntil < b.validFrom) return no("تاریخ پایان قبل از تاریخ شروع است.");
      if (iam.bindings.some((x) => x.active && x.userId === b.userId && x.roleId === b.roleId && x.scopeId === b.scopeId)) return no("این نقش در این واحد از قبل به کاربر داده شده است.");
      return ok;
    };
    const checkRevoke = (b: Binding): Check => {
      const r = roleById(b.roleId);
      if (!canAdmin(b.scopeId, "roles.assign")) return no("در این واحد اختیار لغو تخصیص ندارید.");
      if (isAdminRole(r) && !strictlyBelowMyAnchor(b.scopeId)) return no("نقش مدیرِ هم‌سطح یا بالاتر را فقط مدیرِ لایه‌ی بالاتر لغو می‌کند.");
      if (b.userId === me && isAdminRole(r)) return no("نقش مدیریتی خودتان را نمی‌توانید لغو کنید.");
      return ok;
    };
    const checkMembership = (userId: string, scopeId: string): Check => {
      if (!canAdmin(scopeId, "iam.members.manage")) return no("در این واحد اختیار مدیریت اعضا ندارید.");
      const targetAdmin = adminAnchor(iam, userId, today).filter((a) => isAncestorOrSelf(iam, a, scopeId));
      if (userId !== me && targetAdmin.length && !targetAdmin.every((a) => strictlyBelowMyAnchor(a))) return no("این کاربر مدیرِ هم‌سطح یا بالاتر است.");
      return ok;
    };

    // ------------------------------------------------ نوشتن + تاریخچه
    const commit = (fn: (s: IamState) => IamState, a?: { event: AuditEvent; scopeId: string; targetType: Audit["targetType"]; targetId: string; summary: string; affectedUserId?: string; before?: Record<string, unknown>; after?: Record<string, unknown> }) =>
      setIam((prev) => {
        const next = fn(structuredClone(prev));
        if (!a) return next;
        const seq = next.seq + 1;
        return { ...next, seq, audits: [{ ...a, id: `a${seq}`, seq, actorId: me, at: `${today} ${nowClock()}` }, ...next.audits] };
      });
    const uname = (id: string) => allUsers.find((u) => u.id === id)?.name ?? id;
    const nid = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e3)}`;

    const createScope: TenancyValue["createScope"] = (parentId, type, name, extra = {}) => {
      const c = checkCreateScope(parentId, type);
      if (!c.ok) return c;
      if (!name.trim()) return no("نام واحد الزامی است.");
      const id = extra.id ?? nid(type === "holding" ? "h-" : type === "company" ? "c-" : "u-");
      const code = extra.code || `${type[0].toUpperCase()}${(scopes.length + 1).toString().padStart(3, "0")}`;
      commit((s) => ({ ...s, scopes: [...s.scopes, { id, type, name: name.trim(), code, parentId, active: true, createdAt: `${today} ${nowClock()}`, ...extra }] }), {
        event: "scope.created",
        scopeId: id,
        targetType: "scope",
        targetId: id,
        summary: `${scopeTypeLabel[type]} «${name.trim()}» زیر «${node(parentId)?.name}» ساخته شد.`,
      });
      return { ok: true, id };
    };
    const updateScope: TenancyValue["updateScope"] = (id, patch) => {
      const c = checkEditScope(id);
      if (!c.ok) return c;
      const before = node(id)!;
      commit((s) => ({ ...s, scopes: s.scopes.map((x) => (x.id === id ? { ...x, ...patch } : x)) }), {
        event: "scope.updated",
        scopeId: id,
        targetType: "scope",
        targetId: id,
        summary: `مشخصات «${before.name}» ویرایش شد${patch.name && patch.name !== before.name ? ` (نام جدید: «${patch.name}»)` : ""}.`,
        before: { name: before.name, code: before.code },
        after: patch,
      });
      return ok;
    };
    const setScopeActive: TenancyValue["setScopeActive"] = (id, active) => {
      const c = checkEditScope(id);
      if (!c.ok) return c;
      const n = node(id)!;
      const sub = descendantsOrSelf(iam, id).map((x) => x.id);
      commit((s) => ({ ...s, scopes: s.scopes.map((x) => (active ? (x.id === id ? { ...x, active } : x) : sub.includes(x.id) ? { ...x, active: false } : x)) }), {
        event: active ? "scope.activated" : "scope.deactivated",
        scopeId: id,
        targetType: "scope",
        targetId: id,
        summary: active ? `«${n.name}» دوباره فعال شد.` : `«${n.name}» و ${(sub.length - 1).toLocaleString("fa-IR")} زیرمجموعه‌اش غیرفعال شدند؛ دسترسی از این مسیر قطع شد و سوابق حفظ می‌شوند.`,
      });
      return ok;
    };
    const saveRole: TenancyValue["saveRole"] = (input) => {
      const existing = input.id ? roleById(input.id) : undefined;
      const c = checkRole(input, existing);
      if (!c.ok) return c;
      const id = existing?.id ?? nid("role-");
      const role: Role = { ...(existing ?? { builtIn: false, active: true, createdBy: me }), ...input, id, updatedAt: `${today} ${nowClock()}`, active: existing?.active ?? true, createdBy: existing?.createdBy ?? me } as Role;
      const added = input.permissions.filter((p) => !(existing?.permissions ?? []).includes(p)).length;
      const removed = (existing?.permissions ?? []).filter((p) => !input.permissions.includes(p)).length;
      commit((s) => ({ ...s, roles: existing ? s.roles.map((r) => (r.id === id ? role : r)) : [...s.roles, role] }), {
        event: existing ? "role.updated" : "role.created",
        scopeId: input.createdIn,
        targetType: "role",
        targetId: id,
        summary: existing
          ? `نقش «${role.name}» ویرایش شد (${added.toLocaleString("fa-IR")} مجوز اضافه، ${removed.toLocaleString("fa-IR")} مجوز حذف).`
          : `نقش «${role.name}» در «${node(input.createdIn)?.name}» با ${input.permissions.length.toLocaleString("fa-IR")} مجوز ساخته شد.`,
        before: existing ? { permissions: existing.permissions.length } : undefined,
        after: { permissions: input.permissions.length, allowedTypes: input.allowedTypes },
      });
      return { ok: true, id };
    };
    const deleteRole: TenancyValue["deleteRole"] = (id) => {
      const r = roleById(id);
      if (!r) return no("نقش پیدا نشد.");
      const c = checkDeleteRole(r);
      if (!c.ok) return c;
      const n = iam.bindings.filter((b) => b.roleId === id && b.active).length;
      commit((s) => ({ ...s, roles: s.roles.filter((x) => x.id !== id), bindings: s.bindings.map((b) => (b.roleId === id ? { ...b, active: false } : b)) }), {
        event: "role.deleted",
        scopeId: r.createdIn,
        targetType: "role",
        targetId: id,
        summary: `نقش «${r.name}» حذف شد و ${n.toLocaleString("fa-IR")} تخصیص آن لغو شد.`,
      });
      return ok;
    };
    const assignRole: TenancyValue["assignRole"] = (b) => {
      const c = checkAssign(b);
      if (!c.ok) return c;
      const r = roleById(b.roleId)!;
      const n = node(b.scopeId)!;
      const id = nid("b");
      const chain = ancestorsOrSelf(iam, b.scopeId).map((x) => x.id);
      const hasMembership = iam.memberships.some((m) => m.userId === b.userId && chain.includes(m.scopeId) && m.status === "active");
      commit(
        (s) => ({
          ...s,
          bindings: [...s.bindings, { id, ...b, active: true, createdBy: me, createdAt: `${today} ${nowClock()}` }],
          // تخصیص بدون عضویت معنا ندارد — عضویت خودکار ساخته می‌شود
          memberships: hasMembership ? s.memberships : [...s.memberships, { id: nid("m"), userId: b.userId, scopeId: b.scopeId, status: "active", primary: !s.memberships.some((m) => m.userId === b.userId), createdAt: `${today} ${nowClock()}` }],
        }),
        {
          event: "binding.created",
          scopeId: b.scopeId,
          targetType: "binding",
          targetId: id,
          affectedUserId: b.userId,
          summary: `نقش «${r.name}» در «${n.name}» به «${uname(b.userId)}» داده شد${b.validUntil ? ` (تا ${b.validUntil})` : ""}.`,
          after: { role: r.name, validFrom: b.validFrom, validUntil: b.validUntil },
        }
      );
      return ok;
    };
    const revokeBinding: TenancyValue["revokeBinding"] = (id) => {
      const b = iam.bindings.find((x) => x.id === id);
      if (!b) return no("تخصیص پیدا نشد.");
      const c = checkRevoke(b);
      if (!c.ok) return c;
      const r = roleById(b.roleId);
      commit((s) => ({ ...s, bindings: s.bindings.map((x) => (x.id === id ? { ...x, active: false } : x)) }), {
        event: "binding.revoked",
        scopeId: b.scopeId,
        targetType: "binding",
        targetId: id,
        affectedUserId: b.userId,
        summary: `نقش «${r?.name}» از «${uname(b.userId)}» در «${node(b.scopeId)?.name}» گرفته شد.`,
      });
      return ok;
    };
    const addMembership: TenancyValue["addMembership"] = (userId, scopeId, title) => {
      const c = checkMembership(userId, scopeId);
      if (!c.ok) return c;
      if (iam.memberships.some((m) => m.userId === userId && m.scopeId === scopeId)) return no("این کاربر از قبل عضو این واحد است.");
      const id = nid("m");
      commit((s) => ({ ...s, memberships: [...s.memberships, { id, userId, scopeId, status: "active", primary: !s.memberships.some((m) => m.userId === userId), createdAt: `${today} ${nowClock()}`, title }] }), {
        event: "membership.created",
        scopeId,
        targetType: "membership",
        targetId: id,
        affectedUserId: userId,
        summary: `«${uname(userId)}» عضو «${node(scopeId)?.name}» شد.`,
      });
      return ok;
    };
    const setMembershipStatus: TenancyValue["setMembershipStatus"] = (id, status) => {
      const m = iam.memberships.find((x) => x.id === id);
      if (!m) return no("عضویت پیدا نشد.");
      const c = checkMembership(m.userId, m.scopeId);
      if (!c.ok) return c;
      if (m.userId === me) return no("عضویت خودتان را نمی‌توانید تعلیق کنید.");
      commit((s) => ({ ...s, memberships: s.memberships.map((x) => (x.id === id ? { ...x, status } : x)) }), {
        event: status === "active" ? "membership.activated" : "membership.suspended",
        scopeId: m.scopeId,
        targetType: "membership",
        targetId: id,
        affectedUserId: m.userId,
        summary: `عضویت «${uname(m.userId)}» در «${node(m.scopeId)?.name}» ${status === "active" ? "فعال" : "معلق"} شد${status === "suspended" ? "؛ نقش‌های این واحد تا رفع تعلیق اعمال نمی‌شوند" : ""}.`,
      });
      return ok;
    };
    const removeMembership: TenancyValue["removeMembership"] = (id) => {
      const m = iam.memberships.find((x) => x.id === id);
      if (!m) return no("عضویت پیدا نشد.");
      const c = checkMembership(m.userId, m.scopeId);
      if (!c.ok) return c;
      if (m.userId === me) return no("عضویت خودتان را نمی‌توانید حذف کنید.");
      const sub = new Set(descendantsOrSelf(iam, m.scopeId).map((x) => x.id));
      commit((s) => ({ ...s, memberships: s.memberships.filter((x) => x.id !== id), bindings: s.bindings.map((b) => (b.userId === m.userId && sub.has(b.scopeId) ? { ...b, active: false } : b)) }), {
        event: "membership.removed",
        scopeId: m.scopeId,
        targetType: "membership",
        targetId: id,
        affectedUserId: m.userId,
        summary: `«${uname(m.userId)}» از «${node(m.scopeId)?.name}» خارج شد و نقش‌هایش در این واحد و زیرمجموعه‌ها لغو شد.`,
      });
      return ok;
    };
    const completeReview: TenancyValue["completeReview"] = (scopeId, revokedIds) =>
      commit((s) => ({ ...s, bindings: s.bindings.map((b) => (revokedIds.includes(b.id) ? { ...b, active: false } : b)) }), {
        event: "review.completed",
        scopeId,
        targetType: "review",
        targetId: scopeId,
        summary: `بازبینی دسترسی‌های «${node(scopeId)?.name}» انجام شد: ${revokedIds.length.toLocaleString("fa-IR")} تخصیص لغو و بقیه تأیید شد.`,
      });

    // ------------------------------------------------ سازگاری با API قبلی
    const holdings: Holding[] = scopes.filter((x) => x.type === "holding").map((h) => ({ id: h.id, name: h.name, color: h.color ?? "#1f4f99", lead: h.lead, active: h.active }));
    const companies: Company[] = scopes
      .filter((x) => x.type === "company")
      .map((c) => ({ id: c.id, name: c.name, holdingId: c.parentId ?? "", field: c.field, users: iam.memberships.filter((m) => descendantsOrSelf(iam, c.id).some((d) => d.id === m.scopeId)).length * 23 + 40, active: c.active }));
    const companyNode = contextNode.type === "unit" ? ancestorsOrSelf(iam, contextId).find((x) => x.type === "company") : contextNode.type === "company" ? contextNode : undefined;
    const holdingNode = ancestorsOrSelf(iam, contextId).find((x) => x.type === "holding");
    const activeHoldingId = holdingNode?.id;
    const activeCompanyId = companyNode?.id;
    const memberHoldingIds = [...new Set(reachable.flatMap((r) => ancestorsOrSelf(iam, r.id)).filter((x) => x.type === "holding").map((x) => x.id))];
    const memberCompanyIds = [...new Set(reachable.filter((r) => r.type === "company").map((r) => r.id))];
    const session: SessionScope = {
      level: levelOf(contextNode.type),
      memberHoldingIds,
      memberCompanyIds,
      canSwitch: reachable.length > 1,
      switchable: reachable
        .filter((r) => r.type !== "unit")
        .map((r) => ({ holdingId: r.type === "holding" ? r.id : r.type === "company" ? r.parentId ?? undefined : undefined, companyId: r.type === "company" ? r.id : undefined, label: r.type === "system" ? `کل ${identity.shortName}` : r.name })),
    };
    const applying = bindingsApplying(iam, me, contextId, today);
    const sorted = [...applying].sort((a, b) => {
      const ia = ROLE_RANK.indexOf(a.roleId);
      const ib = ROLE_RANK.indexOf(b.roleId);
      return (ia < 0 ? 50 : ia) - (ib < 0 ? 50 : ib);
    });
    const primary = sorted[0] ? roleById(sorted[0].roleId) : undefined;
    const role: RoleDef = {
      id: primary?.id ?? "r4",
      title: primary?.name ?? "کاربر عادی",
      scope: levelOf(node(sorted[0]?.scopeId)?.type),
      members: 0,
      description: primary?.description ?? "",
      permissions: [...effective.keys()],
      system: primary?.builtIn,
    };
    const grant: RoleGrant | undefined = sorted[0]
      ? { roleId: sorted[0].roleId, level: levelOf(node(sorted[0].scopeId)?.type), holdingId: activeHoldingId, companyId: activeCompanyId }
      : undefined;
    const canAccessAdmin = [...ADMIN_PERMS, "iam.audit.view", "settings.branding"].some((p) => effective.has(p));
    const managed = (perm: string) => {
      const set = new Set<string>();
      iam.bindings
        .filter((b) => b.userId === me && bindingLive(b, today) && roleById(b.roleId)?.permissions.includes(perm))
        .forEach((b) => descendantsOrSelf(iam, b.scopeId).forEach((d) => set.add(d.id)));
      return set;
    };
    const managedSet = managed("iam.members.manage");
    const managedHoldingIds = holdings.filter((h) => managedSet.has(h.id)).map((h) => h.id);
    const managedCompanyIds = companies.filter((c) => managedSet.has(c.id)).map((c) => c.id);

    const ownerScope = (item: Scoped) => (!item.scope || item.scope === "سراسری" ? ROOT_ID : item.scope === "هلدینگ" ? item.holdingId ?? ROOT_ID : item.companyId ?? item.holdingId ?? ROOT_ID);
    // لایه‌ی پیاز: محتوای خودِ واحد + همه‌ی زیرمجموعه‌ها (+ اعلان‌های لایه‌های بالاتر، فقط‌خواندنی)
    const subtree = new Set(descendantsOrSelf(iam, contextId).map((x) => x.id));
    const chain = new Set(ancestorsOrSelf(iam, contextId).map((x) => x.id));
    const visible = (item: Scoped) => {
      const o = ownerScope(item);
      return subtree.has(o) || chain.has(o);
    };
    const scopeLabel = (id?: string) => node(id)?.name ?? "—";

    const mkHoldingNode = (h: Omit<Holding, "id">, id: string): ScopeNode => ({ id, type: "holding", name: h.name, code: id, parentId: ROOT_ID, active: h.active, color: h.color, lead: h.lead, createdAt: `${today} ${nowClock()}` });

    return {
      identity,
      updateIdentity: (patch) => setIdentity((prev) => ({ ...prev, ...patch })),
      holdings,
      companies,
      companiesOf: (hid) => companies.filter((c) => c.holdingId === hid),
      holdingOf: (cid) => holdings.find((h) => h.id === companies.find((c) => c.id === cid)?.holdingId),
      addHolding: (h) => {
        const id = `h-${Date.now()}`;
        commit((s) => ({ ...s, scopes: [...s.scopes, mkHoldingNode(h, id)] }), { event: "scope.created", scopeId: id, targetType: "scope", targetId: id, summary: `هلدینگ «${h.name}» ساخته شد.` });
        return { ...h, id };
      },
      updateHolding: (id, patch) => void commit((s) => ({ ...s, scopes: s.scopes.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeHolding: (id) => void setScopeActive(id, false),
      addCompany: (c) => {
        const id = `c-${Date.now()}`;
        commit((s) => ({ ...s, scopes: [...s.scopes, { id, type: "company", name: c.name, code: id, parentId: c.holdingId, active: c.active, field: c.field, createdAt: `${today} ${nowClock()}` }] }), {
          event: "scope.created",
          scopeId: id,
          targetType: "scope",
          targetId: id,
          summary: `شرکت «${c.name}» ساخته شد.`,
        });
        return { ...c, id };
      },
      updateCompany: (id, patch) => void commit((s) => ({ ...s, scopes: s.scopes.map((x) => (x.id === id ? { ...x, ...(patch.name ? { name: patch.name } : {}), ...(patch.field ? { field: patch.field } : {}), ...(patch.active !== undefined ? { active: patch.active } : {}) } : x)) })),
      removeCompany: (id) => void setScopeActive(id, false),

      actingUser,
      setActingUser: (userId) => {
        setActingUserId(userId);
        try {
          localStorage.setItem(ACTING_USER_KEY, userId);
        } catch {
          /* نادیده */
        }
      },
      session,
      role,
      grant,

      activeHoldingId,
      activeCompanyId,
      setScope: (holdingId, companyId) => {
        const target = companyId ?? holdingId ?? ROOT_ID;
        const pick = reachable.find((r) => r.id === target) ? target : reachable[0]?.id;
        if (pick) setCtxMap((m) => ({ ...m, [me]: pick }));
      },
      activeScopeLabel: contextNode.type === "system" ? `کل ${identity.shortName}` : contextNode.name,
      isViewingAs: contextId !== primaryScope,
      allowedPublishScopes: contextNode.type === "system" ? ["سراسری", "هلدینگ", "شرکت"] : contextNode.type === "holding" ? ["هلدینگ", "شرکت"] : ["شرکت"],

      canAccessAdmin,
      hasPermission,
      canManageHoldings: canAdmin(ROOT_ID, "iam.structure.manage"),
      canModerateGroup: (g) => effective.has("groups.manage") || (effective.has("groups.create") && visible(g as Scoped)),
      canManageItem: (item, editPerm) => {
        if (item.authorId && item.authorId === me) return true;
        const isManager = editPerm ? effective.has(editPerm) : canAccessAdmin;
        if (!isManager) return false;
        return subtree.has(ownerScope(item));
      },
      managedHoldingIds,
      managedCompanyIds,
      visible,
      filterScoped: <T extends Scoped>(items: T[]) => items.filter(visible),
      ownerLabel: (item) => (ownerScope(item) === ROOT_ID ? "سراسری" : scopeLabel(ownerScope(item))),
      defaultScopeForNew: () => {
        if (companyNode) return { scope: "شرکت" as ContentScope, holdingId: holdingNode?.id, companyId: companyNode.id };
        if (holdingNode) return { scope: "هلدینگ" as ContentScope, holdingId: holdingNode.id };
        return { scope: "سراسری" as ContentScope };
      },

      // ======================= IAM =======================
      iam,
      today,
      contextId,
      contextNode,
      setContext: (scopeId) => reachable.some((r) => r.id === scopeId) && setCtxMap((m) => ({ ...m, [me]: scopeId })),
      reachable,
      myBindings: applying.map((b) => ({ ...b, role: roleById(b.roleId)!, scope: node(b.scopeId)! })),
      effective,
      effectiveOf,
      rolesOf: (userId) =>
        iam.bindings
          .filter((b) => b.userId === userId && b.active)
          .map((b) => ({ ...b, role: roleById(b.roleId)!, scope: node(b.scopeId)!, live: bindingLive(b, today) }))
          .filter((x) => x.role && x.scope),
      primaryRoleOf: (userId) => {
        const bs = iam.bindings.filter((b) => b.userId === userId && bindingLive(b, today));
        bs.sort((a, b) => {
          const ia = ROLE_RANK.indexOf(a.roleId);
          const ib = ROLE_RANK.indexOf(b.roleId);
          return (ia < 0 ? 50 : ia) - (ib < 0 ? 50 : ib);
        });
        return bs[0] ? roleById(bs[0].roleId) : undefined;
      },
      membershipsOf: (userId) => iam.memberships.filter((m) => m.userId === userId).map((m) => ({ ...m, scope: node(m.scopeId)! })).filter((m) => m.scope),
      membersOf: (scopeId, includeDescendants = false) => {
        const set = includeDescendants ? new Set(descendantsOrSelf(iam, scopeId).map((x) => x.id)) : new Set([scopeId]);
        return iam.memberships.filter((m) => set.has(m.scopeId));
      },
      visibleUserIds: () => {
        if (contextNode.type === "system") return allUsers.map((u) => u.id);
        const ids = new Set(iam.memberships.filter((m) => m.status === "active" && (subtree.has(m.scopeId) || chain.has(m.scopeId))).map((m) => m.userId));
        return allUsers.filter((u) => ids.has(u.id)).map((u) => u.id);
      },
      scopePath: (id) => pathLabel(iam, id),
      scopeLabel,
      scopeTypeLabel,
      assignableRoles: (scopeId) => assignableRoles(iam, scopeId),
      isAdminRole,
      canAdmin,
      checkCreateScope,
      checkEditScope,
      checkRole,
      checkDeleteRole,
      checkAssign,
      checkRevoke,
      checkMembership,
      grantablePermissions,
      createScope,
      updateScope,
      setScopeActive,
      saveRole,
      deleteRole,
      assignRole,
      revokeBinding,
      addMembership,
      setMembershipStatus,
      removeMembership,
      completeReview,
      resetIam: () => setIam(seedIam()),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, iam, me, contextId, reachable, primaryScope]);

  return <TenancyContext.Provider value={value}>{children}</TenancyContext.Provider>;
}

export function useTenancy() {
  const ctx = useContext(TenancyContext);
  if (!ctx) throw new Error("useTenancy must be used within TenancyProvider");
  return ctx;
}

