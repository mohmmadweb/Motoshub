import { useSearchParams } from "react-router-dom";

// تب فعال را در URL نگه می‌دارد (?tab=...) تا لینک‌پذیر باشد و با رفت‌وبرگشت گم نشود
export function useTabParam<T extends string>(defaultTab: T, valid: readonly T[]): [T, (t: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") as T | null;
  const tab = raw && valid.includes(raw) ? raw : defaultTab;
  const setTab = (t: T) => {
    const next = new URLSearchParams(params);
    if (t === defaultTab) next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
  };
  return [tab, setTab];
}
