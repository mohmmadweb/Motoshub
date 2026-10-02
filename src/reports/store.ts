// ---------------------------------------------------------------------------
// گزارش‌های ذخیره‌شده — localStorage («motoshub.reports.v1») با اشتراک بین همه‌ی
// نمونه‌های گزارش‌ساز و ویجت داشبورد (useSyncExternalStore).
// ---------------------------------------------------------------------------
import { useMemo, useSyncExternalStore } from "react";
import { useTenancy } from "../context/TenancyContext";
import { isAncestorOrSelf } from "../iam/model";
import type { ReportModule, ReportSchedule, ReportSpec, ScheduleDelivery, ScheduleFreq } from "./types";
import { dayNum, fromDayNum, monthNames, parseJalali, weekdayOf } from "../pm/jalali";

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

// ---------------------------------------------------------------------------
// زمان‌بندی ارسال گزارش‌های ذخیره‌شده — localStorage («motoshub.reportSchedules.v1»)
// اجراکننده‌ی شبیه‌سازی‌شده هنگام بارگذاری برنامه، برای هر زمان‌بندیِ سررسیده یک بار در
// هر دوره (روز/هفته/ماه/دوره‌ی کارکرد) اعلان درون‌برنامه می‌فرستد و ارسال را ثبت می‌کند.
// ---------------------------------------------------------------------------
const SKEY = "motoshub.reportSchedules.v1";
type SchedState = { schedules: ReportSchedule[]; deliveries: ScheduleDelivery[] };
let scache: SchedState | null = null;
const slisteners = new Set<() => void>();

function sread(): SchedState {
  if (scache) return scache;
  try {
    const raw = localStorage.getItem(SKEY);
    const v = raw ? (JSON.parse(raw) as Partial<SchedState>) : {};
    scache = { schedules: Array.isArray(v.schedules) ? v.schedules : [], deliveries: Array.isArray(v.deliveries) ? v.deliveries : [] };
  } catch {
    scache = { schedules: [], deliveries: [] };
  }
  return scache;
}
function swrite(next: SchedState) {
  scache = next;
  try {
    localStorage.setItem(SKEY, JSON.stringify(next));
  } catch {
    /* در حافظه می‌ماند */
  }
  slisteners.forEach((l) => l());
}
const ssubscribe = (l: () => void) => {
  slisteners.add(l);
  return () => slisteners.delete(l);
};

export const scheduleStore = {
  all: () => sread().schedules,
  upsert(s: ReportSchedule) {
    const st = sread();
    swrite({ ...st, schedules: st.schedules.some((x) => x.id === s.id) ? st.schedules.map((x) => (x.id === s.id ? s : x)) : [s, ...st.schedules] });
  },
  remove(id: string) {
    const st = sread();
    swrite({ ...st, schedules: st.schedules.filter((x) => x.id !== id) });
  },
  recordDelivery(d: ScheduleDelivery) {
    const st = sread();
    swrite({
      schedules: st.schedules.map((x) => (x.id === d.scheduleId ? { ...x, lastPeriod: d.period, lastSentAt: d.at } : x)),
      deliveries: [d, ...st.deliveries].slice(0, 200),
    });
  },
};

export function useSchedules(reportId?: string) {
  const st = useSyncExternalStore(ssubscribe, sread, sread);
  return useMemo(() => ({ schedules: reportId ? st.schedules.filter((s) => s.reportId === reportId) : st.schedules, deliveries: reportId ? st.deliveries.filter((d) => d.reportId === reportId) : st.deliveries }), [st, reportId]);
}

export const newScheduleId = () => `sc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** دوره‌ی جاری هر بسامد — کلید برای جلوگیری از ارسال تکراری + برچسب فارسی */
export function periodOf(freq: ScheduleFreq, today: string): { key: string; label: string } {
  const p = parseJalali(today);
  const t = dayNum(today);
  if (!p || t === null) return { key: today, label: today };
  const [jy, jm, jd] = p;
  switch (freq) {
    case "daily":
      return { key: `d-${t}`, label: `روز ${today}` };
    case "weekly": {
      const start = fromDayNum(t - weekdayOf(today));
      return { key: `w-${start}`, label: `هفته‌ی ${start}` };
    }
    case "monthly":
      return { key: `m-${jy}-${jm}`, label: `${monthNames[jm - 1]} ${jy.toLocaleString("fa-IR", { useGrouping: false })}` };
    case "payroll": {
      // دوره‌ی کارکرد ۲۶ ماه قبل تا ۲۵ همین ماه؛ پس از رسیدن به ۲۵ام، دوره‌ی همین ماه سررسید است
      const z = jy * 12 + (jm - 1) + (jd >= 25 ? 0 : -1);
      const y = Math.floor(z / 12);
      const m = (z % 12) + 1;
      return { key: `p-${y}-${m}`, label: `دوره‌ی کارکرد منتهی به ۲۵ ${monthNames[m - 1]}` };
    }
  }
}
