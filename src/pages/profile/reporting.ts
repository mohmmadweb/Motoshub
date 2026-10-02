// ---------------------------------------------------------------------------
// «زنجیره‌ی گزارش‌دهی» — از عضویت اصلی فرد به بالا: برای هر لایه، مدیرِ آن واحد
// (دارنده‌ی نقش مدیریتی در خودِ واحد) یا «سرپرست» ثبت‌شده‌ی واحد.
// مدیر مستقیم را می‌توان به‌صورت محلی تعیین کرد (managerId) — کلید motoshub.managers.v1.
// در بک‌اند: فیلد اختیاری manager_id روی Membership.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useState } from "react";
import { ancestorsOrSelf, bindingLive, isAdminRole, type IamState, type ScopeNode } from "../../iam/model";
import { users } from "../../data/mock";

const KEY = "motoshub.managers.v1";

function read(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** نگاشت محلی «کاربر ← مدیر مستقیم» */
export function useManagerOverrides() {
  const [map, setMap] = useState<Record<string, string>>(read);
  useEffect(() => {
    const on = (e: StorageEvent) => e.key === KEY && setMap(read());
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);
  const setManager = useCallback((userId: string, managerId: string | null) => {
    setMap((prev) => {
      const next = { ...prev };
      if (managerId) next[userId] = managerId;
      else delete next[userId];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* نادیده */
      }
      return next;
    });
  }, []);
  return { map, setManager };
}

export type ChainLink = { scope: ScopeNode; userId?: string; name: string; title: string; source: "override" | "role" | "lead" };

/** زنجیره از مدیر مستقیم تا بالاترین لایه (بدون تکرار و بدون خودِ فرد) */
export function reportingChain(iam: IamState, userId: string, today: string, overrides: Record<string, string>): ChainLink[] {
  const mems = iam.memberships.filter((m) => m.userId === userId && m.status === "active");
  const home = mems.find((m) => m.primary) ?? mems[0];
  if (!home) return [];
  const seen = new Set<string>([userId]);
  const out: ChainLink[] = [];
  const self = users.find((u) => u.id === userId);
  const ov = overrides[userId];
  const homeNode = iam.scopes.find((s) => s.id === home.scopeId);
  if (ov && homeNode) {
    const u = users.find((x) => x.id === ov);
    if (u) {
      seen.add(u.id);
      out.push({ scope: homeNode, userId: u.id, name: u.name, title: "مدیر مستقیم (تعیین‌شده)", source: "override" });
    }
  }
  ancestorsOrSelf(iam, home.scopeId).forEach((node) => {
    const admins = iam.bindings
      .filter((b) => b.scopeId === node.id && bindingLive(b, today) && isAdminRole(iam.roles.find((r) => r.id === b.roleId)))
      .filter((b) => !seen.has(b.userId));
    const b = admins[0];
    if (b) {
      const u = users.find((x) => x.id === b.userId);
      seen.add(b.userId);
      out.push({ scope: node, userId: b.userId, name: u?.name ?? b.userId, title: iam.roles.find((r) => r.id === b.roleId)?.name ?? "مدیر", source: "role" });
      return;
    }
    if (node.lead && node.lead !== self?.name && !out.some((x) => x.name === node.lead)) {
      const u = users.find((x) => x.name === node.lead);
      if (u && seen.has(u.id)) return;
      if (u) seen.add(u.id);
      out.push({ scope: node, userId: u?.id, name: node.lead, title: "سرپرست واحد", source: "lead" });
    }
  });
  return out;
}
