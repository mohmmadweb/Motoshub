// ---------------------------------------------------------------------------
// ناوبری «مدیریت دانش» (MENU.md §3): ترتیب و برچسب‌های منوی واقعی کاریز با مسیرهای واقعی
// (/knowledge/documents، /knowledge/search، …)؛ بخش‌های اضافه‌ی دمو زیر همان آیتم‌ها می‌مانند.
// همه‌ی پیوندهای داخلی ماژول (اعلان‌ها، میزکار، راهنما) از kmHref ساخته می‌شوند تا یک‌جا عوض شوند.
// نشانی قدیمی `?tab=<بخش>` هنوز پذیرفته می‌شود و به مسیر تازه هدایت می‌شود.
// ---------------------------------------------------------------------------

export type KSection =
  | "dashboard"
  | "bank"
  | "search"
  | "workflow"
  | "review"
  | "archive"
  | "retention"
  | "registry"
  | "processes"
  | "rnd"
  | "glossary"
  | "experience"
  | "experts"
  | "projects"
  | "training"
  | "map"
  | "reports"
  | "settings"
  | "help"
  | "notifications"
  | "feedback"
  | "relations"
  | "versions"
  | "audit";

/** مسیر هر بخش (بدون پارامتر) */
export const KM_SECTION_PATH: Record<KSection, string> = {
  dashboard: "/knowledge",
  notifications: "/knowledge/notifications",
  bank: "/knowledge/documents",
  workflow: "/knowledge/documents/workflow",
  versions: "/knowledge/documents/versions",
  review: "/knowledge/documents/review",
  archive: "/knowledge/documents/archive",
  retention: "/knowledge/documents/retention",
  search: "/knowledge/search",
  registry: "/knowledge/profiles",
  processes: "/knowledge/profiles/processes",
  rnd: "/knowledge/research",
  glossary: "/knowledge/glossary",
  experts: "/knowledge/experts",
  experience: "/knowledge/experiences",
  projects: "/knowledge/experiences/projects",
  audit: "/knowledge/audit",
  settings: "/knowledge/settings",
  help: "/knowledge/help",
  map: "/knowledge/insights",
  relations: "/knowledge/insights/relations",
  feedback: "/knowledge/insights/feedback",
  reports: "/knowledge/insights/reports",
  training: "/knowledge/insights/training",
};

const BY_PATH = new Map(Object.entries(KM_SECTION_PATH).map(([k, v]) => [v, k as KSection]));

/** بخش متناظر با pathname (هر چیز ناشناخته زیر /knowledge ← داشبورد) */
export function sectionOfPath(pathname: string): KSection {
  const p = pathname.replace(/\/+$/, "") || "/";
  return BY_PATH.get(p) ?? "dashboard";
}

/** آیا مقدار یک شناسه‌ی بخش معتبر است (برای ?tab= قدیمی) */
export const isKSection = (x: string | null | undefined): x is KSection => !!x && x in KM_SECTION_PATH;

/** نام‌های دیگری که در پیوندهای قدیمی ?tab= آمده‌اند */
const TAB_ALIAS: Record<string, KSection> = { documents: "bank", docs: "bank", experiences: "experience", lessons: "experience", profiles: "registry", research: "rnd", insights: "map", expert: "experts" };
/** ?tab=<x> قدیمی → بخش (یا null) */
export const sectionOfTab = (x: string | null | undefined): KSection | null => (isKSection(x) ? x : x && TAB_ALIAS[x] ? TAB_ALIAS[x] : null);

/** پیوند به یک بخش با پارامترهای اختیاری (doc، focus، article، new، …) */
export function kmHref(section: KSection, params?: Record<string, string | undefined | null>): string {
  const q = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => v != null && v !== "" && q.set(k, v));
  const qs = q.toString();
  return qs ? `${KM_SECTION_PATH[section]}?${qs}` : KM_SECTION_PATH[section];
}

/** پیوند مستقیم به یک سند (برگه‌ی سند روی بخش داده‌شده، پیش‌فرض «اسناد») */
export const kmDocHref = (docId: string, section: KSection = "bank") => kmHref(section, { doc: docId });
