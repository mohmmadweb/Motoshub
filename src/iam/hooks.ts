// هوک‌های موج ۴ IAM — برای استفاده در داشبورد، هدر/منو و تنظیمات.
import { useMemo } from "react";
import { users } from "../data/mock";
import { useTenancy, type Check } from "../context/TenancyContext";
import { emitSettingsChange } from "./settingsAudit";
import { useLocalStore } from "./store";
import { initialsOf, resolveScoped, scopedMetaOf, scopedStore, type Resolved, type ScopedKey, type ScopedValue } from "./scopedSettings";
import { isAncestorOrSelf, type AccessRequest } from "./model";

export type PendingRequest = AccessRequest & { userName: string; roleName: string; scopeName: string };

/**
 * درخواست‌های دسترسیِ در انتظار که کاربرِ فعلی می‌تواند بررسی کند (مدیرانی که در آن واحد
 * اختیار «تخصیص نقش» دارند). برای کارت داشبورد: لینک بررسی = /dashboard/settings?section=access-requests
 */
export function usePendingAccessRequests(): { items: PendingRequest[]; count: number; link: string } {
  const t = useTenancy();
  return useMemo(() => {
    const items = t.iam.requests
      .filter((r) => r.status === "pending" && t.checkDecideRequest(r).ok)
      .map((r) => ({
        ...r,
        userName: users.find((u) => u.id === r.userId)?.name ?? r.userId,
        roleName: t.iam.roles.find((x) => x.id === r.roleId)?.name ?? "—",
        scopeName: t.scopeLabel(r.scopeId),
      }));
    return { items, count: items.length, link: "/dashboard/settings?section=access-requests" };
  }, [t]);
}

/** درخواست‌های خودِ کاربر (برای «نقش و دسترسی من») */
export function useMyAccessRequests() {
  const t = useTenancy();
  return useMemo(() => t.iam.requests.filter((r) => r.userId === t.actingUser.id), [t]);
}

export type EffectiveBranding = { name: string; tagline: string; color: string; logo: string; initials: string; sourceScopeId: string | null; scopeId: string };

/** برند مؤثر در کانتکست فعلی (یا یک واحد مشخص) — نام، زیرعنوان، رنگ و لوگو با ارث‌بری لایه‌ای */
export function useEffectiveBranding(scopeId?: string): EffectiveBranding {
  const { iam, contextId } = useTenancy();
  const state = useLocalStore(scopedStore);
  const id = scopeId ?? contextId;
  return useMemo(() => {
    const r = (k: ScopedKey) => resolveScoped(state, iam, id, k);
    const name = String(r("brand.name").value);
    return {
      name,
      tagline: String(r("brand.tagline").value),
      color: String(r("brand.color").value),
      logo: String(r("brand.logo").value ?? ""),
      initials: initialsOf(name),
      sourceScopeId: r("brand.name").source,
      scopeId: id,
    };
  }, [state, iam, id]);
}

/** خواندن/نوشتن تنظیمات لایه‌ای با بررسی اختیار، قفل والد، حالت فقط‌خواندنی و ثبت در تاریخچه */
export function useScopedSettings(scopeId?: string) {
  const t = useTenancy();
  const state = useLocalStore(scopedStore);
  const id = scopeId ?? t.contextId;
  const resolve = (k: ScopedKey): Resolved => resolveScoped(state, t.iam, id, k);
  const no = (reason: string): Check => ({ ok: false, reason });

  const canEdit = (k: ScopedKey): Check => {
    if (t.readOnly) return no("حالت فقط‌خواندنی");
    const meta = scopedMetaOf(k);
    if (!t.canAdmin(id, meta.perm)) return no("برای تغییر این تنظیم در این واحد اختیار ندارید.");
    const r = resolve(k);
    if (r.status === "locked") return no(`«${t.scopeLabel(r.lockedBy)}» این تنظیم را برای زیرمجموعه‌ها قفل کرده است.`);
    return { ok: true };
  };

  const write = (k: ScopedKey, fn: (e: { values: Partial<Record<ScopedKey, ScopedValue>>; locks: ScopedKey[] }) => void, summary: string, before: unknown, after: unknown) => {
    scopedStore.set((s) => {
      const byScope = { ...s.byScope };
      const e = { values: { ...(byScope[id]?.values ?? {}) }, locks: [...(byScope[id]?.locks ?? [])] };
      fn(e);
      byScope[id] = e;
      return { ...s, byScope };
    });
    const short = (v: unknown) => (typeof v === "string" && v.startsWith("data:") ? "[تصویر]" : v);
    emitSettingsChange({ area: "تنظیمات لایه‌ای", summary: `${scopedMetaOf(k).label} در «${t.scopeLabel(id)}» — ${summary}`, before: { [k]: short(before) }, after: { [k]: short(after) }, scopeId: id });
  };

  const setValue = (k: ScopedKey, v: ScopedValue): Check => {
    const c = canEdit(k);
    if (!c.ok) return c;
    const prev = resolve(k).value;
    if (prev === v) return { ok: true };
    write(k, (e) => (e.values[k] = v), "بازنویسی شد", prev, v);
    return { ok: true };
  };
  const clearValue = (k: ScopedKey): Check => {
    const c = canEdit(k);
    if (!c.ok) return c;
    const prev = state.byScope[id]?.values[k];
    if (prev === undefined) return { ok: true };
    write(k, (e) => delete e.values[k], "به مقدار ارث‌رسیده برگشت", prev, "(ارث)");
    return { ok: true };
  };
  const setLock = (k: ScopedKey, locked: boolean): Check => {
    const c = canEdit(k);
    if (!c.ok) return c;
    write(k, (e) => (e.locks = locked ? [...new Set([...e.locks, k])] : e.locks.filter((x) => x !== k)), locked ? "برای زیرمجموعه‌ها قفل شد" : "قفل برداشته شد", !locked, locked);
    return { ok: true };
  };

  /** واحدهای زیرمجموعه که این کلید را بازنویسی کرده‌اند (برای هشدار قبل از قفل) */
  const overriddenBelow = (k: ScopedKey) => Object.entries(state.byScope).filter(([sid, e]) => sid !== id && e.values[k] !== undefined && isAncestorOrSelf(t.iam, id, sid)).map(([sid]) => sid);

  return { scopeId: id, resolve, canEdit, setValue, clearValue, setLock, overriddenBelow, state };
}
