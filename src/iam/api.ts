// ---------------------------------------------------------------------------
// شکل واقعی داده‌های سرویس identity (DATA_ALIGNMENT §7) — نگاشت وضعیت IAM دمو به همان شکلی که
// `iam/tenant/*` برمی‌گرداند: Scope/ScopeType، Role، RoleBinding، Membership، AuthorizationAuditEvent
// و access-profile. پاکت فهرست identity: `{ count, page, page_size, data, meta }` (paginate از api/envelopes).
// موارد بدون معادل در بک‌اند با «پیشنهادی» مشخص شده‌اند.
// ---------------------------------------------------------------------------
import { users } from "../data/mock";
import { ROOT_ID, type Audit, type Binding, type IamState, type Membership, type MembershipStatus, type Role, type ScopeNode, type ScopeType } from "./model";

/** UUID قطعی برای شناسه‌های رشته‌ای دمو (واحد، نقش، …) */
export function uuidFor(kind: string, id: string): string {
  let h = 7;
  for (const c of `${kind}:${id}`) h = (h * 31 + c.charCodeAt(0)) % 1e12;
  return `00000000-0000-4000-9000-${String(h).padStart(12, "0")}`;
}
/** شناسه‌ی عددی قطعی (int64 در بک‌اند) */
export function intFor(kind: string, id: string): number {
  let h = 11;
  for (const c of `${kind}:${id}`) h = (h * 33 + c.charCodeAt(0)) % 1e6;
  return h + 1;
}
export const principalIdOf = (userId: string) => users.find((u) => u.id === userId)?.principal_id ?? uuidFor("user", userId);
export const userIdOf = (userId: string) => users.find((u) => u.id === userId)?.user_id ?? intFor("user", userId);

// ------------------------------------------------------------------ انواع واقعی

/** `ScopeType` — داده‌ی tenant (نه enum ثابت) */
export type ScopeTypeApi = { id: number; code: ScopeType; name: string; is_root: boolean };
/** `ScopeTypeEdge` — کدام نوع زیر کدام نوع */
export type ScopeTypeEdgeApi = { parent_type_id: number; child_type_id: number };
export type ScopeApi = { id: number; tenant_id: number; parent_id: number | null; type_id: number; type_code: ScopeType; name: string; code: string; path: string; depth: number; is_active: boolean };
export type RoleApi = { id: number; code: string; name: string; description: string; created_in_scope: number; is_administrator: boolean; is_built_in: boolean; is_active: boolean; permissions: string[] };
export type RoleBindingApi = { id: number; principal_id: string; role: number; scope: number; valid_from: string | null; valid_until: string | null; is_active: boolean };
export type MembershipApi = { id: number; principal_id: string; scope: number; status: MembershipStatus; valid_from: string | null; valid_until: string | null; /** «پیشنهادی» — سِمت */ title?: string | null };
export type AuthorizationAuditEventApi = {
  id: number;
  actor_principal_id: string;
  affected_principal_id: string | null;
  scope_id: number;
  event_type: string;
  target_type: string;
  target_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  source: "api" | "admin" | "system";
  correlation_id: string;
  created_at: string;
};
/** `GET iam/tenant/access-profile/` */
export type AccessProfile = {
  contract_version: string;
  principal_id: string;
  tenant_id: number;
  scope_id: number;
  authorization_revision: number;
  effective_permissions: string[];
  administration_permissions: string[];
  memberships: { scope_id: number; scope_name: string; status: MembershipStatus; is_primary: boolean }[];
};

export const TENANT_ID = 2;
const TYPES: ScopeType[] = ["system", "holding", "company", "unit"];
const TYPE_NAME: Record<ScopeType, string> = { system: "سیستم", holding: "هلدینگ", company: "شرکت", unit: "واحد" };

export const scopeTypesApi = (): ScopeTypeApi[] => TYPES.map((code, i) => ({ id: i + 1, code, name: TYPE_NAME[code], is_root: code === "system" }));
export const scopeTypeEdgesApi = (): ScopeTypeEdgeApi[] => [
  { parent_type_id: 1, child_type_id: 2 },
  { parent_type_id: 2, child_type_id: 3 },
  { parent_type_id: 3, child_type_id: 4 },
  { parent_type_id: 4, child_type_id: 4 },
];

export const scopeIntId = (id: string) => (id === ROOT_ID ? 1 : intFor("scope", id));

export function toScopeApi(s: IamState, n: ScopeNode): ScopeApi {
  const chain: ScopeNode[] = [];
  let cur: ScopeNode | undefined = n;
  while (cur) {
    chain.unshift(cur);
    cur = cur.parentId ? s.scopes.find((x) => x.id === cur!.parentId) : undefined;
  }
  return {
    id: scopeIntId(n.id),
    tenant_id: TENANT_ID,
    parent_id: n.parentId ? scopeIntId(n.parentId) : null,
    type_id: TYPES.indexOf(n.type) + 1,
    type_code: n.type,
    name: n.name,
    code: n.code,
    path: chain.map((x) => x.code).join("/"),
    depth: chain.length - 1,
    is_active: n.active,
  };
}

export const toRoleApi = (r: Role, adminPerms: string[]): RoleApi => ({
  id: intFor("role", r.id),
  code: r.code,
  name: r.name,
  description: r.description,
  created_in_scope: scopeIntId(r.createdIn),
  is_administrator: r.permissions.some((p) => adminPerms.includes(p)),
  is_built_in: !!r.builtIn,
  is_active: r.active,
  permissions: [...r.permissions],
});

export const toBindingApi = (b: Binding): RoleBindingApi => ({
  id: intFor("binding", b.id),
  principal_id: principalIdOf(b.userId),
  role: intFor("role", b.roleId),
  scope: scopeIntId(b.scopeId),
  valid_from: b.validFrom ?? null,
  valid_until: b.validUntil ?? null,
  is_active: b.active,
});

export const toMembershipApi = (m: Membership): MembershipApi => ({
  id: intFor("membership", m.id),
  principal_id: principalIdOf(m.userId),
  scope: scopeIntId(m.scopeId),
  status: m.status,
  valid_from: m.validFrom ?? null,
  valid_until: m.validUntil ?? null,
  title: m.title ?? null,
});

export const toAuditApi = (a: Audit): AuthorizationAuditEventApi => ({
  id: a.seq,
  actor_principal_id: principalIdOf(a.actorId),
  affected_principal_id: a.affectedUserId ? principalIdOf(a.affectedUserId) : null,
  scope_id: scopeIntId(a.scopeId),
  event_type: a.event,
  target_type: a.targetType,
  target_id: a.targetId,
  before: a.before ?? null,
  after: a.after ?? null,
  source: a.kind === "security" ? "system" : "admin",
  correlation_id: uuidFor("audit", a.id),
  created_at: a.at,
});

export function buildAccessProfile(s: IamState, userId: string, scopeId: string, effective: Iterable<string>, adminPerms: string[]): AccessProfile {
  const eff = [...new Set(effective)].sort();
  return {
    contract_version: "3.0",
    principal_id: principalIdOf(userId),
    tenant_id: TENANT_ID,
    scope_id: scopeIntId(scopeId),
    authorization_revision: s.seq,
    effective_permissions: eff,
    administration_permissions: eff.filter((p) => adminPerms.includes(p)),
    memberships: s.memberships
      .filter((m) => m.userId === userId)
      .map((m) => ({ scope_id: scopeIntId(m.scopeId), scope_name: s.scopes.find((x) => x.id === m.scopeId)?.name ?? "", status: m.status, is_primary: m.primary })),
  };
}
