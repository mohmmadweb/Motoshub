// ---------------------------------------------------------------------------
// چیدمان داشبورد هر کاربر: ترتیب ویجت‌ها، پهنا (۱ تا ۴ ستون)، پنهان‌ها و فیلتر سراسری.
// ماندگار در localStorage («motoshub.dashboardLayout.v1») به تفکیک شناسه‌ی کاربر.
// ---------------------------------------------------------------------------
import { useCallback, useState } from "react";
import type { GlobalFilter } from "../../reports/types";

export const LAYOUT_KEY = "motoshub.dashboardLayout.v1";
export type Span = 1 | 2 | 3 | 4;
export type UserLayout = { order: string[]; spans: Record<string, Span>; hidden: string[]; filter?: GlobalFilter };

export const EMPTY_FILTER: GlobalFilter = { range: { preset: "all" } };

/** کلاس پهنا — رشته‌های ثابت تا Tailwind آن‌ها را بسازد */
export const spanClass: Record<Span, string> = {
  1: "col-span-1",
  2: "col-span-1 md:col-span-2",
  3: "col-span-1 md:col-span-2 lg:col-span-3",
  4: "col-span-1 md:col-span-2 lg:col-span-4",
};

type AllLayouts = Record<string, UserLayout>;

function readAll(): AllLayouts {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    const v = raw ? (JSON.parse(raw) as AllLayouts) : {};
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
function writeAll(v: AllLayouts) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(v));
  } catch {
    /* ذخیره‌ساز در دسترس نیست */
  }
}

/** ادغام ترتیب ذخیره‌شده با ویجت‌های موجود: ویجت تازه در جای پیش‌فرضش درج می‌شود */
export function mergeOrder(saved: string[] | undefined, available: string[], defaults: string[]): string[] {
  const avail = new Set(available);
  const out = (saved ?? []).filter((id) => avail.has(id));
  const rank = (id: string) => {
    const i = defaults.indexOf(id);
    return i < 0 ? defaults.length : i;
  };
  available
    .filter((id) => !out.includes(id))
    .sort((a, b) => rank(a) - rank(b))
    .forEach((id) => {
      // پس از نزدیک‌ترین ویجتِ قبلی در ترتیب پیش‌فرض
      const r = rank(id);
      let at = -1;
      out.forEach((x, i) => {
        if (rank(x) <= r) at = i;
      });
      out.splice(at + 1, 0, id);
    });
  return out;
}

export function useUserLayout(userId: string) {
  const [all, setAll] = useState<AllLayouts>(readAll);
  const mine: UserLayout | undefined = all[userId];
  const update = useCallback(
    (fn: (cur: UserLayout) => UserLayout | undefined) => {
      setAll((prev) => {
        const cur = prev[userId] ?? { order: [], spans: {}, hidden: [] };
        const nextMine = fn(cur);
        const next = { ...prev };
        if (nextMine) next[userId] = nextMine;
        else delete next[userId];
        writeAll(next);
        return next;
      });
    },
    [userId]
  );
  return { layout: mine, update };
}
