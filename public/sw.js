/* ---------------------------------------------------------------------------
 * سرویس‌ورکر حداقلی موتوشاب
 *  - صفحه (index.html / ناوبری): اول شبکه، در قطعی اتصال نسخه‌ی ذخیره‌شده
 *  - فایل‌های ساخته‌شده (assets/، فونت، آیکن، تصویر): اول کش (نام فایل‌ها hash دارند)
 *  - HashRouter است؛ همه‌ی مسیرها همان index.html‌اند و نیازی به fallback SPA نیست.
 *  - درخواست‌های توسعه‌ی Vite (/@vite، /src/، node_modules، HMR) هرگز کش نمی‌شوند.
 *    ثبت این فایل فقط در بیلد تولید انجام می‌شود (src/pwa.ts).
 * ------------------------------------------------------------------------- */
const VERSION = "motoshub-v1";
const PAGE_CACHE = `${VERSION}-pages`;
const ASSET_CACHE = `${VERSION}-assets`;
const SCOPE = new URL(self.registration ? self.registration.scope : "./", self.location.href).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((c) => c.addAll([SCOPE, `${SCOPE}manifest.webmanifest`]).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

const isDevRequest = (url) => /\/(@vite|@react-refresh|@fs|src|node_modules)\//.test(url.pathname) || url.searchParams.has("t") || url.pathname.endsWith(".tsx") || url.pathname.endsWith(".ts");
const isAsset = (url) => /\/assets\//.test(url.pathname) || /\.(?:js|css|woff2?|ttf|png|jpe?g|webp|svg|ico|gif)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || isDevRequest(url)) return;

  // ناوبری: اول شبکه
  if (req.mode === "navigate" || url.pathname === SCOPE || url.pathname.endsWith("/index.html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(SCOPE, copy));
          }
          return res;
        })
        .catch(() => caches.match(SCOPE).then((r) => r || caches.match(req)).then((r) => r || new Response("آفلاین هستید.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })))
    );
    return;
  }

  // فایل‌های ساخته‌شده: اول کش
  if (isAsset(url)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok && res.type === "basic") cache.put(req, res.clone());
              return res;
            })
        )
      )
    );
  }
});
