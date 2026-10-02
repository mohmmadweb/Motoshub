// ---------------------------------------------------------------------------
// قواعد دسترسی سند (بند ۸) و حل تأییدکننده‌ی مراحل گردش کار (بند ۹) — توابع خالص،
// تا همان منطق در «چه کسانی می‌بینند»، کارتابل و بک‌اند یکسان پیاده شود.
//
// دیدن سند:
//   مالک / ثبت‌کننده / تأییدکنندگان / کاربرانی که به‌نام در ACL آمده‌اند  → همیشه
//   در غیر این صورت: «سطح دسترسی» اجازه دهد  و  (ACL خالی باشد یا یکی از ردیف‌ها منطبق باشد)
// دانلود:
//   مالک/ثبت‌کننده → همیشه · «فقط مشاهده» روی سند → بسته
//   در غیر این صورت: سیاست سطح (accessPolicy) یا ردیف ACL منطبق با تیک «دانلود»
// ---------------------------------------------------------------------------
import { ROOT_ID, ancestorsOrSelf, bindingLive, isAdminRole, isAncestorOrSelf, type IamState } from "../iam/model";
import { users } from "../data/mock";
import type { AccessLevel, AccessPolicy, KAclEntry, KDoc, KWfStep, KWfTemplate, WfApprover } from "./types";

export const DEFAULT_ACCESS_POLICY: Record<AccessLevel, AccessPolicy> = {
  عمومی: { download: true, watermark: false },
  داخلی: { download: true, watermark: false },
  محرمانه: { download: false, watermark: true },
  "خیلی محرمانه": { download: false, watermark: true },
};

/** مشخصات کسی که دسترسی‌اش سنجیده می‌شود */
export type AccessSubject = { userId?: string; name: string; perm: (p: string) => boolean; scopeIds: string[]; roleIds: string[]; titles: string[] };

export function subjectFor(iam: IamState, userId: string, today: string): AccessSubject {
  const u = users.find((x) => x.id === userId);
  const live = iam.bindings.filter((b) => b.userId === userId && bindingLive(b, today));
  const perms = new Set(live.flatMap((b) => iam.roles.find((r) => r.id === b.roleId && r.active)?.permissions ?? []));
  const mems = iam.memberships.filter((m) => m.userId === userId && m.status === "active");
  return {
    userId,
    name: u?.name ?? userId,
    perm: (p) => perms.has(p),
    scopeIds: [...new Set([...mems.map((m) => m.scopeId), ...live.map((b) => b.scopeId)])],
    roleIds: [...new Set(live.map((b) => b.roleId))],
    titles: [...new Set(mems.map((m) => m.title).filter((t): t is string => !!t))],
  };
}

export function aclEntryMatches(e: KAclEntry, s: AccessSubject, iam: IamState): boolean {
  switch (e.kind) {
    case "user":
      return e.id === s.userId;
    case "scope":
      return s.scopeIds.some((id) => isAncestorOrSelf(iam, e.id, id));
    case "role":
      return s.roleIds.includes(e.id);
    case "title":
      return s.titles.includes(e.id);
  }
}

export function levelAllows(level: AccessLevel, s: AccessSubject) {
  if (level === "عمومی" || level === "داخلی") return true;
  if (level === "محرمانه") return s.perm("knowledge.confidential");
  return s.perm("knowledge.confidential") && s.perm("knowledge.approve");
}

export type AccessVerdict = { view: boolean; download: boolean; via: string };

export function evaluateAccess(d: KDoc, s: AccessSubject, iam: IamState, policy: Record<AccessLevel, AccessPolicy>): AccessVerdict {
  const entries = d.acl?.entries ?? [];
  const isOwner = d.owner === s.name || d.author === s.name;
  const named = entries.find((e) => e.kind === "user" && e.id === s.userId);
  let view = false;
  let via = "";
  if (isOwner) [view, via] = [true, d.owner === s.name ? "مالک سند" : "ثبت‌کننده"];
  else if (d.approvers.includes(s.name)) [view, via] = [true, "تأییدکننده"];
  else if (named) [view, via] = [true, "نام‌برده در فهرست دسترسی"];
  else if (levelAllows(d.access, s)) {
    if (!entries.length) [view, via] = [true, d.access === "عمومی" || d.access === "داخلی" ? `سطح «${d.access}»` : "مجوز اسناد محرمانه"];
    else {
      const m = entries.find((e) => aclEntryMatches(e, s, iam));
      if (m) [view, via] = [true, "فهرست دسترسی"];
    }
  }
  if (!view) return { view, download: false, via: "" };
  let download = false;
  if (isOwner) download = true;
  else if (d.acl?.viewOnly) download = false;
  else if ((policy[d.access] ?? DEFAULT_ACCESS_POLICY[d.access]).download) download = true;
  else download = entries.some((e) => e.download && aclEntryMatches(e, s, iam));
  return { view, download, via };
}

// ---------------------------------------------------------------------------
// گردش کار
// ---------------------------------------------------------------------------

/** قالب گردش کار مناسب نوع سند (قالب اختصاصی، وگرنه پیش‌فرض) */
export function templateFor(templates: KWfTemplate[], docType: string): KWfTemplate | undefined {
  return templates.find((t) => t.docTypes.includes(docType)) ?? templates.find((t) => !t.docTypes.length) ?? templates[0];
}

/** شناسه‌ی واحد IAM متناظر با دامنه‌ی سند */
export const docScopeId = (d: KDoc) => d.companyId ?? d.holdingId ?? ROOT_ID;

const nameOf = (userId: string) => users.find((u) => u.id === userId)?.name ?? userId;

/** نام افرادی که می‌توانند این مرحله را انجام دهند (بدون جانشین‌ها) */
export function resolveApprover(a: WfApprover, d: KDoc, iam: IamState, today: string): string[] {
  switch (a.kind) {
    case "user":
      return a.id ? [a.id] : [];
    case "owner":
      return [d.owner];
    case "role":
      return [...new Set(iam.bindings.filter((b) => b.roleId === a.id && bindingLive(b, today)).map((b) => nameOf(b.userId)))];
    case "scopeManager": {
      // نزدیک‌ترین مدیر از واحدِ سند به بالا
      for (const node of ancestorsOrSelf(iam, docScopeId(d))) {
        const mgrs = iam.bindings.filter((b) => b.scopeId === node.id && bindingLive(b, today) && isAdminRole(iam.roles.find((r) => r.id === b.roleId))).map((b) => nameOf(b.userId));
        if (mgrs.length) return [...new Set(mgrs)];
      }
      return [];
    }
  }
}

export function approverLabel(a: WfApprover, iam: IamState): string {
  switch (a.kind) {
    case "user":
      return a.id ?? "—";
    case "owner":
      return "مالک سند";
    case "role":
      return `نقش «${iam.roles.find((r) => r.id === a.id)?.name ?? a.id}»`;
    case "scopeManager":
      return "مدیرِ واحد/شرکتِ سند";
  }
}

/** همه‌ی کسانی که الان می‌توانند مرحله را پیش ببرند: تأییدکننده + جانشین ثابت + جانشین موقت فعال */
export function stepActors(step: KWfStep, d: KDoc, iam: IamState, today: string, delegations: { from: string; to: string; until: string }[]): { primary: string[]; deputies: { name: string; for: string }[] } {
  const primary = resolveApprover(step.approver, d, iam, today);
  const deputies: { name: string; for: string }[] = [];
  if (step.substitute && !primary.includes(step.substitute)) deputies.push({ name: step.substitute, for: primary.join("، ") || "—" });
  delegations.filter((x) => x.until >= today && primary.includes(x.from) && !primary.includes(x.to)).forEach((x) => deputies.push({ name: x.to, for: x.from }));
  // هر نفر یک بار
  const seen = new Set<string>();
  return { primary, deputies: deputies.filter((x) => (seen.has(x.name) ? false : (seen.add(x.name), true))) };
}
