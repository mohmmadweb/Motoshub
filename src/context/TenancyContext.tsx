// ---------------------------------------------------------------------------
// زمینه‌ی سازمان و دسترسی — روی موتور IAM (src/iam/model.ts) ساخته شده است.
// API قبلی (hasPermission، session، filterScoped، canManageItem و …) حفظ شده تا
// ماژول‌ها بدون تغییر کار کنند؛ اما همه‌چیز اکنون از درخت واحدها، نقش‌های سفارشی،
// تخصیص‌های چندگانه (اجتماع مجوزها) و تاریخچه‌ی تغییرناپذیر محاسبه می‌شود.
// ---------------------------------------------------------------------------
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { systemIdentity as initialIdentity, type Company, type ContentScope, type Holding, type Scoped, type ScopeLevel, type SessionScope, type SystemIdentity } from "../data/tenancy";
import { currentUser, users as allUsers, type UserProfile, type RoleDef, type RoleGrant } from "../data/mock";
import { DEMO_REF_DATE } from "../pm/seed";
import { addDays, nowClock } from "../pm/jalali";
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
  sodConflicts,
  sodPermsIn,
  type AccessRequest,
  type SodConfig,
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
import { migrateIam, seedIam } from "../iam/seed";
import { loginPolicyStore, otpRequiredFor } from "../iam/loginPolicy";
import { onSettingsChange } from "../iam/settingsAudit";
import { OtpForm } from "../iam/OtpChallenge";
import Modal from "../components/ui/Modal";

/** نتیجه‌ی یک بررسی؛ `warning` یعنی مجاز است ولی باید به کاربر هشدار داد (مثلاً تفکیک وظایف) */
export type Check = { ok: true; warning?: string } | { ok: false; reason: string };
const ok: Check = { ok: true };
const no = (reason: string): Check => ({ ok: false, reason });

export type RoleInput = Pick<Role, "name" | "code" | "description" | "allowedTypes" | "permissions"> & { id?: string; createdIn: string };
export type BindingInput = { userId: string; roleId: string; scopeId: string; validFrom?: string; validUntil?: string; note?: string };
export type AccessRequestInput = { roleId: string; scopeId: string; durationDays: number | null; reason: string; perm?: string };
/** «مشاهده به‌عنوان کاربر» رسمی و ممیزی‌شده (جدا از پرسوناهای دمو) — فقط‌خواندنی */
export type Impersonation = { userId: string; by: string; reason: string; startedAt: string; minutes: number; endsAt: number };
const RO_REASON = "حالت فقط‌خواندنی";

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
  /** جابه‌جایی پرسونای دمو؛ اگر سیاست ورود برای این کاربر OTP بخواهد، اول مرحله‌ی کد نمایش داده می‌شود */
  setActingUser: (userId: string, opts?: { otpVerified?: boolean }) => void;
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

  // ======================= موج ۴: حاکمیت دسترسی =======================
  /** در حالت «مشاهده به‌عنوان» همه‌ی اکشن‌های IAM رد می‌شوند */
  readOnly: boolean;
  /** کاربرِ واقعی (مدیری که «مشاهده به‌عنوان» را شروع کرده) */
  realActingUser: UserProfile;
  impersonation: Impersonation | null;
  checkImpersonate: (userId: string) => Check;
  startImpersonation: (userId: string, reason: string, minutes: number) => Check;
  endImpersonation: () => void;
  /** آیا ورود/جابه‌جایی به این کاربر طبق سیاست ورود OTP می‌خواهد؟ */
  otpRequired: (userId: string) => boolean;
  // درخواست دسترسی (JIT)
  checkRequestAccess: (input: AccessRequestInput) => Check;
  requestAccess: (input: AccessRequestInput) => Check & { id?: string };
  checkDecideRequest: (r: AccessRequest) => Check;
  approveRequest: (id: string, note?: string) => Check & { validUntil?: string };
  rejectRequest: (id: string, reason: string) => Check;
  cancelRequest: (id: string) => Check;
  // تفکیک وظایف
  canEditSod: boolean;
  saveSod: (cfg: SodConfig, summary: string) => Check;
};

const ACTING_USER_KEY = "motoshub.actingUser.v1";
const IAM_KEY = "motoshub.iam.v1";
const CTX_KEY = "motoshub.iamContext.v1";
const IMP_KEY = "motoshub.impersonation.v1";

function loadIam(): IamState {
  try {
    const raw = localStorage.getItem(IAM_KEY);
    if (raw) {
      const s = migrateIam(JSON.parse(raw));
      if (s) return s;
    }
  } catch {
    /* بدون حافظه‌ی مرورگر */
  }
  return seedIam();
}

type AuditInput = Omit<Audit, "id" | "seq" | "actorId" | "at">;
/** افزودن یک رویداد تغییرناپذیر به تاریخچه (تابع خالص — امن برای setState تابعی) */
function withAudit(s: IamState, a: AuditInput, actorId: string, today: string): IamState {
  const seq = s.seq + 1;
  return { ...s, seq, audits: [{ ...a, id: `a${seq}`, seq, actorId, at: `${today} ${nowClock()}` }, ...s.audits] };
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
  const [impersonation, setImpersonation] = useState<Impersonation | null>(() => {
    const v = readJson<Impersonation | null>(IMP_KEY, null);
    return v && v.endsAt > Date.now() && allUsers.some((u) => u.id === v.userId) ? v : null;
  });
  const [pendingOtp, setPendingOtp] = useState<string | null>(null);

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

  useEffect(() => {
    try {
      if (impersonation) localStorage.setItem(IMP_KEY, JSON.stringify(impersonation));
      else localStorage.removeItem(IMP_KEY);
    } catch {
      /* نادیده */
    }
  }, [impersonation]);

  const realActingUser = allUsers.find((u) => u.id === actingUserId) ?? currentUser;
  const realMe = realActingUser.id;
  // در «مشاهده به‌عنوان»، همه‌چیز از دید کاربرِ هدف محاسبه می‌شود (فقط‌خواندنی)
  const impActive = impersonation && impersonation.by === realMe ? impersonation : null;
  const actingUser = (impActive && allUsers.find((u) => u.id === impActive.userId)) || realActingUser;
  const me = actingUser.id;
  const readOnly = !!impActive;

  // پایان خودکارِ «مشاهده به‌عنوان» پس از مهلت + ثبت رویداد
  const realRef = useRef(realMe);
  realRef.current = realMe;
  useEffect(() => {
    if (!impActive) return;
    const tick = () => {
      if (Date.now() < impActive.endsAt) return;
      setIam((prev) => withAudit(prev, { event: "impersonation.ended", scopeId: ROOT_ID, targetType: "review", kind: "impersonation", targetId: impActive.userId, affectedUserId: impActive.userId, summary: `مهلت مشاهده به‌عنوان «${allUsers.find((u) => u.id === impActive.userId)?.name}» تمام شد و نشست خودکار بسته شد.` }, impActive.by, today));
      setImpersonation(null);
    };
    tick();
    const h = window.setInterval(tick, 15000);
    return () => window.clearInterval(h);
  }, [impActive, today]);

  // ---------------------------------------------------------------- کانتکست
  const reachable = useMemo(() => reachableScopes(iam, me, today), [iam, me, today]);
  const primaryScope = useMemo(() => {
    const ms = iam.memberships.filter((m) => m.userId === me && m.status === "active");
    return ms.find((m) => m.primary)?.scopeId ?? ms[0]?.scopeId ?? reachable[0]?.id ?? ROOT_ID;
  }, [iam, me, reachable]);
  const contextId = ctxMap[me] && reachable.some((r) => r.id === ctxMap[me]) ? ctxMap[me] : primaryScope;
  const contextNode = byId(iam, contextId) ?? iam.scopes[0];

  // تغییرات تنظیمات (از هر انبار) → رویداد settings.changed در تاریخچه
  const ctxRef = useRef(contextId);
  ctxRef.current = contextId;
  useEffect(
    () =>
      onSettingsChange((c) =>
        setIam((prev) =>
          withAudit(prev, { event: "settings.changed", scopeId: c.scopeId ?? ctxRef.current, targetType: "review", kind: "settings", targetId: c.area, summary: `${c.area}: ${c.summary}`, before: c.before, after: c.after }, realRef.current, today)
        )
      ),
    [today]
  );

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
      // تفکیک وظایف: تعارض جدیدی که این تخصیص برای همین کاربر در همین واحد می‌سازد
      const before = sodPermsIn(iam, b.userId, b.scopeId, today);
      const after = sodPermsIn(iam, b.userId, b.scopeId, today, b.roleId);
      const fresh = sodConflicts(iam, after).filter((rule) => !(before.has(rule.a) && before.has(rule.b)));
      const blocked = fresh.find((rule) => rule.mode === "block");
      if (blocked) return no(`تفکیک وظایف: «${blocked.title}» — این تخصیص برای این کاربر تعارض وظایف می‌سازد و مسدود است.`);
      if (fresh.length) return { ok: true, warning: `هشدار تفکیک وظایف: ${fresh.map((rule) => `«${rule.title}»`).join("، ")} — کاربر هر دو طرف را خواهد داشت.` };
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
    const commit = (fn: (s: IamState) => IamState, a?: { event: AuditEvent; scopeId: string; targetType: Audit["targetType"]; kind?: Audit["kind"]; targetId: string; summary: string; affectedUserId?: string; before?: Record<string, unknown>; after?: Record<string, unknown> }) =>
      setIam((prev) => {
        const next = fn(structuredClone(prev));
        return a ? withAudit(next, a, realMe, today) : next;
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
    const assignRole = (b: BindingInput): Check & { id?: string } => {
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
      return { ok: true, id, warning: c.warning };
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

    // ------------------------------------------------ درخواست دسترسی (JIT)
    const checkRequestAccess = (input: AccessRequestInput): Check => {
      const n = node(input.scopeId);
      const r = roleById(input.roleId);
      if (!n || !r) return no("واحد یا نقش نامعتبر است.");
      if (!reachable.some((x) => x.id === input.scopeId)) return no("فقط در واحدهایی که عضو آن‌ها هستید می‌توانید درخواست دهید.");
      if (!assignableRoles(iam, input.scopeId).some((x) => x.id === r.id)) return no(`نقش «${r.name}» در «${n.name}» قابل تخصیص نیست.`);
      if (iam.bindings.some((x) => x.userId === me && x.roleId === r.id && x.scopeId === input.scopeId && bindingLive(x, today))) return no("این نقش را در این واحد همین حالا دارید.");
      if (iam.requests.some((x) => x.status === "pending" && x.userId === me && x.roleId === r.id && x.scopeId === input.scopeId)) return no("برای همین نقش در همین واحد درخواست در انتظار دارید.");
      if (input.reason.trim().length < 5) return no("دلیل درخواست را بنویسید.");
      return ok;
    };
    const requestAccess: TenancyValue["requestAccess"] = (input) => {
      const c = checkRequestAccess(input);
      if (!c.ok) return c;
      const id = nid("rq");
      const r = roleById(input.roleId)!;
      const req: AccessRequest = { id, userId: me, roleId: input.roleId, scopeId: input.scopeId, durationDays: input.durationDays, reason: input.reason.trim(), perm: input.perm, status: "pending", createdAt: `${today} ${nowClock()}` };
      commit((s) => ({ ...s, requests: [req, ...s.requests] }), {
        event: "access.requested",
        scopeId: input.scopeId,
        targetType: "review",
        kind: "request",
        targetId: id,
        affectedUserId: me,
        summary: `«${uname(me)}» نقش «${r.name}» را در «${node(input.scopeId)?.name}»${input.durationDays ? ` برای ${input.durationDays.toLocaleString("fa-IR")} روز` : " (دائمی)"} درخواست کرد.`,
        after: { role: r.name, durationDays: input.durationDays, reason: input.reason.trim() },
      });
      return { ok: true, id };
    };
    const checkDecideRequest = (r: AccessRequest): Check => {
      if (r.status !== "pending") return no("این درخواست قبلاً بررسی شده است.");
      if (r.userId === me) return no("درخواست خودتان را نمی‌توانید بررسی کنید.");
      if (!canAdmin(r.scopeId, "roles.assign")) return no("در این واحد اختیار تخصیص نقش ندارید.");
      return ok;
    };
    const approveRequest: TenancyValue["approveRequest"] = (id, note) => {
      const r = iam.requests.find((x) => x.id === id);
      if (!r) return no("درخواست پیدا نشد.");
      const c = checkDecideRequest(r);
      if (!c.ok) return c;
      const validUntil = r.durationDays ? addDays(today, r.durationDays) : undefined;
      const a = assignRole({ userId: r.userId, roleId: r.roleId, scopeId: r.scopeId, validFrom: today, validUntil, note: `درخواست دسترسی ${r.id}${note?.trim() ? ` — ${note.trim()}` : ""}` });
      if (!a.ok) return a;
      const role = roleById(r.roleId);
      commit((s) => ({ ...s, requests: s.requests.map((x) => (x.id === id ? { ...x, status: "approved", decidedBy: me, decidedAt: `${today} ${nowClock()}`, decisionNote: note?.trim() || undefined, bindingId: a.id, validUntil } : x)) }), {
        event: "access.approved",
        scopeId: r.scopeId,
        targetType: "review",
        kind: "request",
        targetId: id,
        affectedUserId: r.userId,
        summary: `درخواست «${uname(r.userId)}» برای نقش «${role?.name}» در «${node(r.scopeId)?.name}» تأیید شد${validUntil ? ` (زمان‌دار تا ${validUntil})` : ""}.`,
        after: { bindingId: a.id, validUntil, note: note?.trim() },
      });
      return { ok: true, validUntil, warning: a.warning };
    };
    const rejectRequest: TenancyValue["rejectRequest"] = (id, reason) => {
      const r = iam.requests.find((x) => x.id === id);
      if (!r) return no("درخواست پیدا نشد.");
      const c = checkDecideRequest(r);
      if (!c.ok) return c;
      if (reason.trim().length < 3) return no("دلیل رد درخواست الزامی است.");
      commit((s) => ({ ...s, requests: s.requests.map((x) => (x.id === id ? { ...x, status: "rejected", decidedBy: me, decidedAt: `${today} ${nowClock()}`, decisionNote: reason.trim() } : x)) }), {
        event: "access.rejected",
        scopeId: r.scopeId,
        targetType: "review",
        kind: "request",
        targetId: id,
        affectedUserId: r.userId,
        summary: `درخواست «${uname(r.userId)}» برای نقش «${roleById(r.roleId)?.name}» رد شد. دلیل: ${reason.trim()}`,
        after: { reason: reason.trim() },
      });
      return ok;
    };
    const cancelRequest: TenancyValue["cancelRequest"] = (id) => {
      const r = iam.requests.find((x) => x.id === id);
      if (!r || r.userId !== me || r.status !== "pending") return no("این درخواست قابل انصراف نیست.");
      commit((s) => ({ ...s, requests: s.requests.map((x) => (x.id === id ? { ...x, status: "cancelled", decidedAt: `${today} ${nowClock()}` } : x)) }), {
        event: "access.cancelled",
        scopeId: r.scopeId,
        targetType: "review",
        kind: "request",
        targetId: id,
        affectedUserId: me,
        summary: `«${uname(me)}» از درخواست نقش «${roleById(r.roleId)?.name}» انصراف داد.`,
      });
      return ok;
    };

    // ------------------------------------------------ تفکیک وظایف
    const canEditSod = canAdmin(ROOT_ID, "iam.review.manage");
    const saveSod: TenancyValue["saveSod"] = (cfg, summary) => {
      if (!canEditSod) return no("قواعد تفکیک وظایف سراسری‌اند و فقط مدیر سامانه تغییرشان می‌دهد.");
      const bad = cfg.rules.find((r) => !r.a || !r.b || r.a === r.b);
      if (bad) return no("هر قاعده باید دو مجوز متفاوت داشته باشد.");
      const before = iam.sod;
      commit((s) => ({ ...s, sod: cfg }), {
        event: "sod.updated",
        scopeId: ROOT_ID,
        targetType: "review",
        kind: "sod",
        targetId: "sod",
        summary,
        before: { rules: before.rules.length, active: before.rules.filter((r) => r.active).length },
        after: { rules: cfg.rules.length, active: cfg.rules.filter((r) => r.active).length },
      });
      return ok;
    };

    // ------------------------------------------------ مشاهده به‌عنوان (رسمی، ممیزی‌شده)
    const myRealPerms = realMe === me ? effective : effectiveIn(iam, realMe, contextId, today);
    const checkImpersonate = (userId: string): Check => {
      if (readOnly) return no("الان در حالت مشاهده به‌عنوان هستید؛ اول آن را پایان دهید.");
      if (!myRealPerms.has("iam.impersonate")) return no("مجوز «مشاهده‌ی سامانه از دید کاربر دیگر» را ندارید.");
      if (userId === realMe) return no("نمی‌توانید خودتان را انتخاب کنید.");
      const targetAdmin = adminAnchor(iam, userId, today);
      if (targetAdmin.length && !targetAdmin.every((a) => strictlyBelowMyAnchor(a))) return no("مشاهده به‌عنوان مدیرِ هم‌سطح یا بالاتر مجاز نیست.");
      return ok;
    };
    const startImpersonation: TenancyValue["startImpersonation"] = (userId, reason, minutes) => {
      const c = checkImpersonate(userId);
      if (!c.ok) return c;
      if (reason.trim().length < 5) return no("دلیل مشاهده (مثلاً شماره‌ی تیکت) الزامی است.");
      const m = Math.max(5, Math.min(240, Math.round(minutes)));
      const startedAt = `${today} ${nowClock()}`;
      commit((s) => s, {
        event: "impersonation.started",
        scopeId: contextId,
        targetType: "review",
        kind: "impersonation",
        targetId: userId,
        affectedUserId: userId,
        summary: `«${uname(realMe)}» مشاهده‌ی سامانه به‌عنوان «${uname(userId)}» را برای ${m.toLocaleString("fa-IR")} دقیقه شروع کرد. دلیل: ${reason.trim()}`,
        after: { reason: reason.trim(), minutes: m },
      });
      setImpersonation({ userId, by: realMe, reason: reason.trim(), startedAt, minutes: m, endsAt: Date.now() + m * 60000 });
      return ok;
    };
    const endImpersonation = () => {
      if (!impActive) return;
      commit((s) => s, {
        event: "impersonation.ended",
        scopeId: ROOT_ID,
        targetType: "review",
        kind: "impersonation",
        targetId: impActive.userId,
        affectedUserId: impActive.userId,
        summary: `«${uname(impActive.by)}» مشاهده به‌عنوان «${uname(impActive.userId)}» را پایان داد (شروع ${impActive.startedAt}).`,
      });
      setImpersonation(null);
    };
    const otpRequired = (userId: string) => otpRequiredFor(loginPolicyStore.get(), iam, userId, today);

    /** در حالت فقط‌خواندنی هر بررسی/اکشنِ نوشتنی رد می‌شود */
    const RO: Check = { ok: false, reason: RO_REASON };
    const guard = <A extends unknown[], R extends Check>(f: (...a: A) => R) => (...a: A): R => (readOnly ? (RO as R) : f(...a));

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
      setActingUser: (userId, opts) => {
        if (impActive) endImpersonation();
        if (!opts?.otpVerified && userId !== realMe && otpRequired(userId)) {
          setPendingOtp(userId);
          return;
        }
        setPendingOtp(null);
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
      checkCreateScope: guard(checkCreateScope),
      checkEditScope: guard(checkEditScope),
      checkRole: guard(checkRole),
      checkDeleteRole: guard(checkDeleteRole),
      checkAssign: guard(checkAssign),
      checkRevoke: guard(checkRevoke),
      checkMembership: guard(checkMembership),
      grantablePermissions,
      createScope: guard(createScope),
      updateScope: guard(updateScope),
      setScopeActive: guard(setScopeActive),
      saveRole: guard(saveRole),
      deleteRole: guard(deleteRole),
      assignRole: guard(assignRole),
      revokeBinding: guard(revokeBinding),
      addMembership: guard(addMembership),
      setMembershipStatus: guard(setMembershipStatus),
      removeMembership: guard(removeMembership),
      completeReview: (scopeId, revokedIds) => {
        if (!readOnly) completeReview(scopeId, revokedIds);
      },
      resetIam: () => {
        if (!readOnly) setIam(seedIam());
      },

      readOnly,
      realActingUser,
      impersonation: impActive,
      checkImpersonate,
      startImpersonation,
      endImpersonation,
      otpRequired,
      checkRequestAccess: guard(checkRequestAccess),
      requestAccess: guard(requestAccess),
      checkDecideRequest: guard(checkDecideRequest),
      approveRequest: guard(approveRequest),
      rejectRequest: guard(rejectRequest),
      cancelRequest: guard(cancelRequest),
      canEditSod: canEditSod && !readOnly,
      saveSod: guard(saveSod),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, iam, me, realMe, impActive, contextId, reachable, primaryScope]);

  const otpUser = pendingOtp ? allUsers.find((u) => u.id === pendingOtp) : undefined;
  return (
    <TenancyContext.Provider value={value}>
      {children}
      {otpUser && (
        <Modal open onClose={() => setPendingOtp(null)} title="تأیید دومرحله‌ای" description="سیاست ورود سازمان برای این نقش رمز یک‌بارمصرف می‌خواهد." width="max-w-sm">
          <OtpForm userName={otpUser.name} channel={loginPolicyStore.get().otpChannel} onCancel={() => setPendingOtp(null)} onVerified={() => value.setActingUser(otpUser.id, { otpVerified: true })} />
        </Modal>
      )}
    </TenancyContext.Provider>
  );
}

export function useTenancy() {
  const ctx = useContext(TenancyContext);
  if (!ctx) throw new Error("useTenancy must be used within TenancyProvider");
  return ctx;
}

