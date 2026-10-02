// ---------------------------------------------------------------------------
// نوار باریک «طبقه‌بندی اطلاعات» بالای صفحه — بالاترین سطح طبقه‌بندی داده‌ی صفحه‌ی جاری:
//   عادی · داخلی · محرمانه · خیلی محرمانه
// سطح مؤثر = بیشینه‌ی (پیش‌فرض سامانه، بازنویسی مسیر، سطحی که صفحه بالا برده، سطح سند دانشِ باز).
// پیکربندی در localStorage (motoshub.classification.v1) و از «تنظیمات ← طبقه‌بندی اطلاعات».
//
// بالا بردن سطح از داخل یک صفحه:
//   const { raise } = useClassification();
//   useEffect(() => raise("محرمانه"), [raise]);      // تابع برگشتی، سطح را هنگام خروج برمی‌دارد
// یا کوتاه‌تر: useRaiseClassification(doc.access === "محرمانه" ? "محرمانه" : undefined);
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useKnowledge } from "../context/KnowledgeContext";

export type ClassLevel = "عادی" | "داخلی" | "محرمانه" | "خیلی محرمانه";
export const classLevels: ClassLevel[] = ["عادی", "داخلی", "محرمانه", "خیلی محرمانه"];
export const classRank = (l: ClassLevel) => classLevels.indexOf(l);
export const classStyle: Record<ClassLevel, string> = {
  عادی: "bg-emerald-600 text-white",
  داخلی: "bg-sky-700 text-white",
  محرمانه: "bg-amber-400 text-[#2b1d00]",
  "خیلی محرمانه": "bg-rose-700 text-white",
};

export type RouteOverride = { id: string; route: string; level: ClassLevel };
export type ClassificationConfig = { enabled: boolean; defaultLevel: ClassLevel; overrides: RouteOverride[]; autoKnowledge: boolean };

const KEY = "motoshub.classification.v1";
const DEFAULTS: ClassificationConfig = {
  enabled: false,
  defaultLevel: "داخلی",
  autoKnowledge: true,
  overrides: [
    { id: "r1", route: "/dashboard/settings", level: "محرمانه" },
    { id: "r2", route: "/dashboard/funds", level: "محرمانه" },
  ],
};

// ------------------------------------------------------------------ انبار ساده (بیرون از React)
function readConfig(): ClassificationConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ClassificationConfig>) };
  } catch {
    /* بدون حافظه */
  }
  return DEFAULTS;
}
let config: ClassificationConfig = readConfig();
let raised: { token: number; level: ClassLevel }[] = [];
let snapshot = { config, raised };
let counter = 0;
const listeners = new Set<() => void>();
const emit = () => {
  snapshot = { config, raised };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => snapshot;

export function setClassificationConfig(patch: Partial<ClassificationConfig>) {
  config = { ...config, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    /* نادیده */
  }
  emit();
}

/** سطح طبقه‌بندی که یک صفحه اعلام می‌کند؛ تابع برگشتی آن را برمی‌دارد */
function raiseLevel(level: ClassLevel): () => void {
  const token = ++counter;
  raised = [...raised, { token, level }];
  emit();
  return () => {
    raised = raised.filter((r) => r.token !== token);
    emit();
  };
}

/** دسترسی به پیکربندی و بالا بردن سطح صفحه */
export function useClassification() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const raise = useCallback((level: ClassLevel) => raiseLevel(level), []);
  const pageLevel = snap.raised.reduce<ClassLevel | null>((m, r) => (!m || classRank(r.level) > classRank(m) ? r.level : m), null);
  return { config: snap.config, setConfig: setClassificationConfig, raise, pageLevel };
}

/** میان‌بُر: تا وقتی کامپوننت روی صفحه است، سطح را بالا نگه می‌دارد (undefined = هیچ) */
export function useRaiseClassification(level?: ClassLevel | null) {
  useEffect(() => (level ? raiseLevel(level) : undefined), [level]);
}

/** «عمومی» در مدیریت دانش معادل «عادی» در نوار است */
const fromAccess = (a: string): ClassLevel => (a === "خیلی محرمانه" ? "خیلی محرمانه" : a === "محرمانه" ? "محرمانه" : a === "داخلی" ? "داخلی" : "عادی");
const maxLevel = (xs: (ClassLevel | null | undefined)[]) => xs.reduce<ClassLevel>((m, x) => (x && classRank(x) > classRank(m) ? x : m), "عادی");

/** سطح مؤثر برای یک مسیر (بدون سند/صفحه) — برای پیش‌نمایش در تنظیمات */
export function routeLevel(cfg: ClassificationConfig, pathname: string): ClassLevel {
  const match = cfg.overrides.filter((o) => o.route && pathname.startsWith(o.route)).sort((a, b) => b.route.length - a.route.length)[0];
  return match ? match.level : cfg.defaultLevel;
}

export default function ClassificationBanner() {
  const { config: cfg, pageLevel } = useClassification();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const km = useKnowledge();
  const docId = pathname.startsWith("/dashboard/knowledge") ? params.get("doc") : null;
  const docLevel = useMemo(() => {
    if (!cfg.autoKnowledge || !docId) return null;
    const d = km.docs.find((x) => x.id === docId);
    return d && km.canSee(d) ? fromAccess(d.access) : null;
  }, [cfg.autoKnowledge, docId, km]);

  if (!cfg.enabled) return null;
  const level = maxLevel([routeLevel(cfg, pathname), pageLevel, docLevel]);
  return (
    <div role="note" aria-label={`طبقه‌بندی اطلاعات این صفحه: ${level}`} className={`w-full h-6 flex items-center justify-center gap-1.5 text-[11.5px] font-bold tracking-wide select-none ${classStyle[level]}`}>
      <ShieldAlert size={12} aria-hidden />
      طبقه‌بندی: {level}
    </div>
  );
}
