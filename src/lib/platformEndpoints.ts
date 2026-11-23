// ---------------------------------------------------------------------------
// endpointهای «پیشنهادی» امکانات سکو (زبان‌ها، اسلایدشو، تور محصول، پروفایل سازمانی).
// در API فعلی نیستند؛ رابط کاربری رفتارشان را شبیه‌سازی می‌کند و در دکمه‌ی API صفحه با برچسب «پیشنهادی» دیده می‌شوند.
// ---------------------------------------------------------------------------
import type { Ep } from "../api/envelopes";

const p = (method: Ep["method"] | "PUT", path: string): Ep => ({ method: method as Ep["method"], path, proposed: true });

export const platformEndpoints = {
  // F14 — زبان‌ها
  languages: () => p("GET", "/social/languages/"),
  languageCreate: () => p("POST", "/social/languages/"),
  translations: (code: string) => p("GET", `/social/languages/${code}/translations/`),
  translationsPut: (code: string) => p("PUT", `/social/languages/${code}/translations/`),
  // F15 — اسلایدشو
  slides: () => p("GET", "/social/slides/"),
  slideCreate: () => p("POST", "/social/slides/"),
  slideUpdate: (id: string) => p("PATCH", `/social/slides/${id}/`),
  slideDelete: (id: string) => p("DELETE", `/social/slides/${id}/`),
  slidesReorder: () => p("POST", "/social/slides/reorder/"),
  // F16 — تور محصول
  tours: () => p("GET", "/social/tours/"),
  tourComplete: (id: string) => p("POST", `/social/tours/${id}/complete/`),
  // F18 — پروفایل سازمانی
  orgProfile: (id: string) => p("GET", `/identity/iam/scopes/${id}/profile/`),
  orgProfileUpdate: (id: string) => p("PATCH", `/identity/iam/scopes/${id}/profile/`),
  // میزیتو «سایر امکانات» — وضعیت کاربر، سِمت‌ها، انتقال کار
  myStatus: () => p("GET", "/identity/me/status/"),
  myStatusUpdate: () => p("PUT", "/identity/me/status/"),
  positionTitles: () => p("GET", "/identity/iam/tenant/position-titles/"),
  handover: (principalId: string) => p("POST", `/identity/iam/tenant/principals/${principalId}/handover/`),
};
