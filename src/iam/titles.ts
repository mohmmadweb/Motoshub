// ---------------------------------------------------------------------------
// فهرست مدیریت‌شده‌ی سِمت‌های سازمانی (میزیتو: «تعریف عناوین سِمت‌های سازمانی»).
// «پیشنهادی» — Membership واقعی فیلد عنوان ندارد؛ پیشنهاد: `iam/tenant/position-titles/`
// `{ id, name, is_active }` و فیلد `title_id` روی Membership. عضویت‌ها سِمت را از همین فهرست می‌گیرند.
// ---------------------------------------------------------------------------
import { createLocalStore, useLocalStore } from "./store";

export type PositionTitle = { id: string; name: string; active: boolean };

const DEFAULTS = ["راهبر سامانه", "مدیرعامل هلدینگ", "مدیر هلدینگ", "مدیر شرکت", "رئیس روابط عمومی", "مدیر پروژه", "سرپرست آزمایشگاه", "کارشناس", "کارشناس ارشد", "مسئول دبیرخانه"];

export const titlesStore = createLocalStore<PositionTitle[]>(
  "kariz.positionTitles.v1",
  () => DEFAULTS.map((name, i) => ({ id: `pt${i + 1}`, name, active: true })),
  (raw) => (Array.isArray(raw) ? (raw as PositionTitle[]).filter((x) => x && typeof x.name === "string") : null),
);

export const usePositionTitles = () => useLocalStore(titlesStore);

/** endpoint پیشنهادی برای دکمه‌ی API */
export const titlesEndpoint = { method: "GET", path: "/identity/iam/tenant/position-titles/", proposed: true } as const;
