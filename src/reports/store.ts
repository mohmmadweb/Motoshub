// ---------------------------------------------------------------------------
// گزارش‌های ذخیره‌شده — localStorage («motoshub.reports.v1») با اشتراک بین همه‌ی
// نمونه‌های گزارش‌ساز و ویجت داشبورد (useSyncExternalStore).
// ---------------------------------------------------------------------------
import { useMemo, useSyncExternalStore } from "react";
import { useTenancy } from "../context/TenancyContext";
import { isAncestorOrSelf } from "../iam/model";
import type { ReportModule, ReportSpec } from "./types";

const KEY = "motoshub.reports.v1";

let cache: ReportSpec[] | null = null;
const listeners = new Set<() => void>();

function read(): ReportSpec[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as ReportSpec[]) : [];
    cache = Array.isArray(arr) ? arr : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: ReportSpec[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ذخیره‌ساز در دسترس نیست — در حافظه می‌ماند */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
};

export const reportStore = {
  all: read,
  upsert(spec: ReportSpec) {
    const list = read();
    write(list.some((r) => r.id === spec.id) ? list.map((r) => (r.id === spec.id ? spec : r)) : [spec, ...list]);
  },
  patch(id: string, patch: Partial<ReportSpec>) {
    write(read().map((r) => (r.id === id ? { ...r, ...patch } : r)));
  },
  remove(id: string) {
    write(read().filter((r) => r.id !== id));
  },
};

export const newReportId = () => `rp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** گزارش‌هایی که کاربرِ فعلی در کانتکستِ فعلی می‌بیند: گزارش‌های خودش + گزارش‌های اشتراکیِ واحدهای بالادست/همین واحد */
export function useSavedReports(module?: ReportModule) {
  const all = useSyncExternalStore(subscribe, read, read);
  const { actingUser, iam, contextId } = useTenancy();
  return useMemo(() => {
    const canSee = (r: ReportSpec) => r.createdBy === actingUser.id || (r.shared === "scope" && (iam.scopes.some((s) => s.id === r.scope) ? isAncestorOrSelf(iam, r.scope, contextId) : false));
    return all.filter((r) => canSee(r) && (!module || r.module === module));
  }, [all, actingUser.id, iam, contextId, module]);
}
