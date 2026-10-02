// ---------------------------------------------------------------------------
// PWA: ثبت سرویس‌ورکر (فقط در بیلد تولید) و نگه‌داشتن رویداد «نصب اپلیکیشن»
// (beforeinstallprompt) تا دکمه‌ی InstallAppButton هر زمان که روی صفحه آمد از آن استفاده کند.
// فراخوانی: registerPWA() یک بار در src/main.tsx پیش از render.
// ---------------------------------------------------------------------------

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type InstallState = {
  /** مرورگر اجازه‌ی نمایش پنجره‌ی نصب داده است (Chrome/Edge/Android) */
  canPrompt: boolean;
  /** اپ همین حالا به‌صورت نصب‌شده (standalone) اجرا می‌شود */
  installed: boolean;
  /** iOS/iPadOS سافاری — نصب فقط از منوی «اشتراک‌گذاری ← افزودن به صفحه‌ی اصلی» */
  ios: boolean;
};

let deferred: BeforeInstallPromptEvent | null = null;
let installedFlag = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
const isIos = () => typeof navigator !== "undefined" && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

let snapshot: InstallState = { canPrompt: false, installed: false, ios: false };
function refresh() {
  snapshot = { canPrompt: !!deferred, installed: installedFlag || isStandalone(), ios: isIos() };
  emit();
}

export function subscribeInstall(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export const getInstallState = () => snapshot;

/** نمایش پنجره‌ی نصب مرورگر؛ نتیجه: accepted | dismissed | unavailable */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  const ev = deferred;
  deferred = null;
  await ev.prompt();
  const choice = await ev.userChoice.catch(() => ({ outcome: "dismissed" as const }));
  if (choice.outcome === "accepted") installedFlag = true;
  refresh();
  return choice.outcome;
}

let registered = false;
export function registerPWA() {
  if (registered || typeof window === "undefined") return;
  registered = true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    refresh();
  });
  window.addEventListener("appinstalled", () => {
    installedFlag = true;
    deferred = null;
    refresh();
  });
  refresh();

  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) {
    // در توسعه هیچ سرویس‌ورکری نباید پاسخ‌ها را کش کند
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => undefined);
    return;
  }
  const base = import.meta.env.BASE_URL || "/";
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => undefined);
  });
}
