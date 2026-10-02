// انبار کوچکِ مبتنی بر localStorage با اشتراک (useSyncExternalStore) — برای تنظیماتی که
// هم در صفحه‌ها و هم در TenancyProvider خوانده می‌شوند (سیاست ورود، تنظیمات لایه‌ای).
import { useSyncExternalStore } from "react";

export type LocalStore<T> = {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (fn: () => void) => () => void;
  reset: () => void;
};

export function createLocalStore<T>(key: string, defaults: () => T, normalize: (raw: unknown) => T | null = (r) => r as T): LocalStore<T> {
  let cache: T | undefined;
  const listeners = new Set<() => void>();
  const read = (): T => {
    if (cache !== undefined) return cache;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const v = normalize(JSON.parse(raw));
        if (v) return (cache = v);
      }
    } catch {
      /* بدون حافظه‌ی مرورگر */
    }
    return (cache = defaults());
  };
  const write = (v: T) => {
    cache = v;
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* نادیده */
    }
    listeners.forEach((l) => l());
  };
  return {
    get: read,
    set: (next) => write(typeof next === "function" ? (next as (p: T) => T)(read()) : next),
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    reset: () => write(defaults()),
  };
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
