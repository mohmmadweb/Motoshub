// ---------------------------------------------------------------------------
// endpointهای «پیشنهادی» امکانات سکو (زبان‌ها، اسلایدشو، تور محصول، اوقات شرعی، پروفایل سازمانی).
// در API فعلی نیستند؛ رابط کاربری رفتارشان را شبیه‌سازی می‌کند و در دکمه‌ی API صفحه با برچسب «پیشنهادی» دیده می‌شوند.
// ---------------------------------------------------------------------------
import type { Ep } from "../social/endpoints";

const p = (method: Ep["method"] | "PUT", path: string): Ep => ({ method: method as Ep["method"], path, proposed: true });

export const platformEndpoints = {
  // F14 — زبان‌ها
  languages: () => p("GET", "/core/languages/"),
  languageCreate: () => p("POST", "/core/languages/"),
  translations: (code: string) => p("GET", `/core/languages/${code}/translations/`),
  translationsPut: (code: string) => p("PUT", `/core/languages/${code}/translations/`),
  // F15 — اسلایدشو
  slides: () => p("GET", "/core/slides/"),
  slideCreate: () => p("POST", "/core/slides/"),
  slideUpdate: (id: string) => p("PATCH", `/core/slides/${id}/`),
  slideDelete: (id: string) => p("DELETE", `/core/slides/${id}/`),
  slidesReorder: () => p("POST", "/core/slides/reorder/"),
  // F16 — تور محصول
  tours: () => p("GET", "/core/tours/"),
  tourComplete: (id: string) => p("POST", `/core/tours/${id}/complete/`),
  // F17 — اوقات شرعی
  prayerTimes: () => p("GET", "/core/prayer-times/?city_id={id}&date={date}"),
  cities: () => p("GET", "/core/cities/?q={q}"),
  // F18 — پروفایل سازمانی
  orgProfile: (id: string) => p("GET", `/identity/iam/scopes/${id}/profile/`),
  orgProfileUpdate: (id: string) => p("PATCH", `/identity/iam/scopes/${id}/profile/`),
};
