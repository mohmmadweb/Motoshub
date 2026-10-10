// ---------------------------------------------------------------------------
// F16 «راهنمای تعاملی برخط (تور محصول)» (۱.۲۱.۶)
//  - GuidedTourHost: لایه‌ی تور (در AppLayout سوار است) — برجسته‌سازی عنصر، متن کوتاه، قبلی/بعدی/رد شدن،
//    نوار پیشرفت، پیوند به مقاله‌ی مرکز راهنما؛ راست‌چین و سازگار با موبایل (کارت پایین صفحه).
//  - اجرای خودکار «آشنایی کلی» در اولین ورود هر کاربر (قابل خاموش‌کردن توسط راهبر)،
//    پیشنهاد تور مرتبط در اولین ورود به هر بخش، ادامه از همان گام (resumable).
//  - startTour(id) از هر جا (دکمه‌ی سربرگ، منوی حساب، مرکز راهنما).
//  - TourLauncherCard: فهرست تورها در مرکز راهنما · TourAdminCard: روشن/خاموش اجرای خودکار.
// مدل API: tour { id, title, role_scope, steps[{selector, route, title, body, help_article}] }
//          tour_progress { user_id, tour_id, completed_at }
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, ChevronLeft, ChevronRight, Compass, Play, RotateCcw, X } from "lucide-react";
import Button from "./ui/Button";
import Toggle from "./ui/Toggle";
import { useToast } from "./ui/ToastProvider";
import { createLocalStore, useLocalStore } from "../iam/store";
import { useTenancy } from "../context/TenancyContext";
import { emitSettingsChange } from "../iam/settingsAudit";
import { platformEndpoints } from "../lib/platformEndpoints";
import { ApiChip } from "../pages/social/kit";
import { useI18n } from "../i18n";

export type TourStep = { selector?: string; route?: string; title: string; body: string; help_article?: string };
export type Tour = { id: string; title: string; summary: string; role_scope: "all" | "admin"; base_route?: string; perm?: string; steps: TourStep[] };

export const tours: Tour[] = [
  {
    id: "intro",
    title: "آشنایی کلی",
    summary: "منو، جستجو، تغییر سازمان یا نقش، اعلان‌ها و گزارش مشکل — در کمتر از یک دقیقه.",
    role_scope: "all",
    steps: [
      { route: "/dashboard", title: "به موتوشاب خوش آمدید", body: "این تور کوتاه بخش‌های اصلی را نشان می‌دهد. هر وقت خواستید رد شوید؛ از «راهنمای تعاملی» در سربرگ یا مرکز راهنما دوباره اجرا می‌شود.", help_article: "intro" },
      { selector: "[data-tour=nav], [data-tour=nav-mobile]", title: "منوی اصلی", body: "همه‌ی بخش‌ها در هفت دسته: داشبورد، همکاران، دانش و محتوا، شبکه اجتماعی، پروژه و فعالیت‌ها، دانش و نوآوری و تنظیمات سامانه. هر نقش فقط بخش‌های مجاز خودش را می‌بیند.", help_article: "faq-menu" },
      { selector: "[data-tour=search]", title: "جستجوی سراسری", body: "در همه‌ی محتوا، افراد، پروژه‌ها و اسناد جستجو کنید. با Ctrl+K هم به هر صفحه سریع بروید.", help_article: "intro" },
      { selector: "[data-tour=scope]", title: "تغییر سازمان یا نقش", body: "اگر در چند شرکت یا با چند نقش عضو هستید، از اینجا «کانتکست» کاری را عوض کنید؛ دسترسی‌ها و داده‌ها با آن تغییر می‌کند.", help_article: "context" },
      { selector: "[data-tour=notifications]", title: "اعلان‌ها", body: "دعوت‌ها، پاسخ‌ها، منشن‌ها و کارهای ارجاعی اینجا جمع می‌شوند.", help_article: "intro" },
      { selector: "[aria-label='گزارش مشکل به تیم سازنده']", title: "گزارش مشکل", body: "از هر صفحه یک تیکت برای تیم سازنده ثبت کنید؛ نشانی صفحه و مشخصات مرورگر خودکار پیوست می‌شود.", help_article: "report-anywhere" },
      { selector: "[data-tour=tour-button], [data-tour=avatar]", title: "پایان تور", body: "هر زمان خواستید، تورهای دیگر (گروه‌ها، محتوا، دانش، پروژه‌ها) را از همین‌جا یا مرکز راهنما اجرا کنید.", help_article: "faq-help" },
    ],
  },
  {
    id: "social",
    title: "گروه‌ها و گفتگو",
    summary: "گفتگوی مستقیم، گروه‌های دارای تاپیک و کانال‌های اطلاع‌رسانی.",
    role_scope: "all",
    base_route: "/dashboard/groups",
    perm: "groups.list",
    steps: [
      { route: "/dashboard/groups", selector: "main h1", title: "گروه‌ها", body: "گروه‌های عضو شما و گروه‌های عمومی سازمان؛ هر گروه می‌تواند تاپیک‌های جدا داشته باشد.", help_article: "chat" },
      { route: "/dashboard/chat", selector: "main h1", title: "گفتگوها", body: "پیام مستقیم، پیام‌های ذخیره‌شده و بات‌ها. با @ همکاران را منشن کنید.", help_article: "chat" },
      { route: "/dashboard/channels", selector: "main h1", title: "کانال‌ها", body: "انتشار یک‌طرفه‌ی پیام توسط مدیران — برای اطلاعیه‌ها و خبرنامه‌ها.", help_article: "chat" },
    ],
  },
  {
    id: "content",
    title: "انتشار محتوا",
    summary: "خبر، وبلاگ، مجله، رسانه و دسته‌بندی‌ها.",
    role_scope: "all",
    base_route: "/dashboard/news",
    perm: "news.list",
    steps: [
      { route: "/dashboard/news", selector: "main h1", title: "اخبار سازمان", body: "خبرها با دامنه‌ی انتشار (سراسری/هلدینگ/شرکت)، سطح دسترسی و زمان‌بندی منتشر می‌شوند.", help_article: "content" },
      { route: "/dashboard/blog", selector: "main h1", title: "وبلاگ‌ها", body: "تجربه‌ها و یادداشت‌های همکاران؛ ممکن است پیش از انتشار بازبینی شوند.", help_article: "content" },
      { route: "/dashboard/topics", selector: "main h1", title: "هشتگ‌ها", body: "هر هشتگ مطالب مرتبط همه‌ی بخش‌ها را کنار هم می‌آورد.", help_article: "content" },
    ],
  },
  {
    id: "knowledge",
    title: "مدیریت دانش",
    summary: "بانک دانش، درس‌آموخته‌ها و مرکز راهنما.",
    role_scope: "all",
    base_route: "/dashboard/knowledge",
    perm: "knowledge.list",
    steps: [
      { route: "/dashboard/knowledge", selector: "main h1", title: "مدیریت دانش", body: "اسناد، مصوبات و درس‌آموخته‌ها با طبقه‌بندی، سطح دسترسی و گردش کار تأیید.", help_article: "km-bank" },
      { route: "/dashboard/knowledge?tab=help", selector: "main h1", title: "مرکز راهنما", body: "مقاله‌ها، پرسش‌های پرتکرار و تورهای تعاملی همین‌جاست.", help_article: "faq-help" },
    ],
  },
  {
    id: "projects",
    title: "پروژه‌ها",
    summary: "پروژه‌های من، کارهای من و گزارش فعالیت.",
    role_scope: "all",
    base_route: "/dashboard/projects",
    perm: "projects.list",
    steps: [
      { route: "/dashboard/projects", selector: "main h1", title: "پروژه‌های من", body: "بورد، گانت، بودجه، ریسک و جلسات هر پروژه — با دسترسی بخش‌به‌بخش اعضا.", help_article: "projects" },
      { route: "/dashboard/my-work", selector: "main h1", title: "فعالیت و وظایف من", body: "همه‌ی تسک‌های شما در همه‌ی پروژه‌ها، مرتب بر اساس سررسید.", help_article: "my-work" },
      { route: "/dashboard/activity", selector: "main h1", title: "گزارش فعالیت‌های من", body: "ثبت کارکرد روزانه و مرخصی و ارسال برای تأیید.", help_article: "activity" },
    ],
  },
  {
    id: "admin",
    title: "راهبری",
    summary: "مدیریت سامانه: ساختار، نقش‌ها، برند و لاگ ممیزی (ویژه‌ی راهبران).",
    role_scope: "admin",
    base_route: "/dashboard/settings",
    steps: [
      { route: "/dashboard/settings", selector: "main h1", title: "مدیریت سامانه", body: "همه‌ی تنظیمات به تفکیک ماژول؛ هر مدیر فقط بخش‌هایی را می‌بیند که در واحد فعلی اختیارش را دارد.", help_article: "settings" },
      { selector: "nav[aria-label='بخش‌های تنظیمات'], select[aria-label='بخش تنظیمات']", title: "بخش‌ها و جستجو", body: "بین بخش‌ها جابه‌جا شوید یا با «جستجو در تنظیمات» مستقیم به یک فیلد برسید.", help_article: "settings" },
      { route: "/dashboard/settings?section=roles", selector: "main h1", title: "نقش‌ها و مجوزها", body: "نقش سفارشی بسازید و فقط مجوزهایی را بدهید که خودتان دارید (بدون افزایش امتیاز).", help_article: "custom-roles" },
      { route: "/dashboard/settings?section=audit-log", selector: "main h1", title: "لاگ ممیزی", body: "هر تغییر با قبل/بعد ثبت می‌شود و خروجی CSV دارد.", help_article: "audit" },
    ],
  },
];

type Progress = { completed_at?: string; skipped_at?: string; step?: number; offered?: boolean };
type TourState = { settings: { autorun: boolean }; progress: Record<string, Record<string, Progress>> };
export const tourStore = createLocalStore<TourState>("motoshub.tours.v1", () => ({ settings: { autorun: true }, progress: {} }));

const EVT = "motoshub:tour";
/** اجرای یک تور از هر جای برنامه */
export function startTour(id: string, fromStep = 0) {
  window.dispatchEvent(new CustomEvent(EVT, { detail: { id, step: fromStep } }));
}

function useTourAccess() {
  const { canAccessAdmin, hasPermission } = useTenancy();
  return (t: Tour) => (t.role_scope !== "admin" || canAccessAdmin || hasPermission("settings.system")) && (!t.perm || hasPermission(t.perm));
}
const helpHref = (id: string) => `/dashboard/knowledge?tab=help&article=${encodeURIComponent(id)}`;

/** اولین عنصر دیده‌شدنی از فهرست انتخابگرها */
function findTarget(selector?: string): HTMLElement | null {
  if (!selector) return null;
  for (const sel of selector.split(",")) {
    try {
      const el = document.querySelector(sel.trim()) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el;
      }
    } catch {
      /* انتخابگر نامعتبر */
    }
  }
  return null;
}

export function GuidedTourHost() {
  const st = useLocalStore(tourStore);
  const { actingUser, isViewingAs } = useTenancy();
  const allowed = useTourAccess();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { dir } = useI18n();
  const [run, setRun] = useState<{ tour: Tour; step: number } | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [offer, setOffer] = useState<Tour | null>(null);
  const me = actingUser.id;
  const mine = st.progress[me] ?? {};
  const setProg = useCallback((id: string, p: Progress) => tourStore.set((s) => ({ ...s, progress: { ...s.progress, [me]: { ...(s.progress[me] ?? {}), [id]: { ...(s.progress[me]?.[id] ?? {}), ...p } } } })), [me]);
  const stamp = () => new Date().toISOString();

  // اجرای دستی
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; step: number }>).detail;
      const t = tours.find((x) => x.id === d.id);
      if (t) {
        setOffer(null);
        setRun({ tour: t, step: Math.min(d.step ?? 0, t.steps.length - 1) });
      }
    };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);

  // اجرای خودکار «آشنایی کلی» در اولین ورود هر کاربر (نه در «مشاهده به‌عنوان»)
  // فقط روی میز کار شروع می‌شود تا کسی که با پیوند مستقیم وارد صفحه‌ای شده از آن بیرون کشیده نشود
  useEffect(() => {
    if (!st.settings.autorun || isViewingAs || run || pathname !== "/dashboard") return;
    const p = mine.intro;
    if (p?.completed_at || p?.skipped_at || p?.step !== undefined) return;
    const tm = setTimeout(() => setRun({ tour: tours[0], step: 0 }), 900);
    return () => clearTimeout(tm);
  }, [me, st.settings.autorun, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // پیشنهاد تور مرتبط در اولین ورود به هر بخش
  useEffect(() => {
    if (run || isViewingAs) return;
    const t = tours.find((x) => x.base_route && x.id !== "intro" && pathname.startsWith(x.base_route.split("?")[0]) && allowed(x));
    if (!t) return setOffer(null);
    const p = mine[t.id];
    if (p?.offered || p?.completed_at || p?.skipped_at) return;
    setOffer(t);
    setProg(t.id, { offered: true });
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = run ? run.tour.steps[run.step] : null;
  // رفتن به مسیر گام
  useEffect(() => {
    if (!step?.route) return;
    const [path, qs] = step.route.split("?");
    const want = qs ? `?${qs}` : "";
    if (pathname !== path || (qs && search !== want)) navigate(step.route);
  }, [run?.tour.id, run?.step]); // eslint-disable-line react-hooks/exhaustive-deps

  // اندازه‌ی عنصر هدف (با تأخیر کوتاه برای بارگذاری صفحه‌ی lazy)
  useLayoutEffect(() => {
    if (!step) return;
    let alive = true;
    let tries = 0;
    const measure = () => {
      if (!alive) return;
      const el = findTarget(step.selector);
      if (el) {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
        if (step.selector && tries++ < 10) setTimeout(measure, 150);
      }
    };
    measure();
    const re = () => {
      const el = findTarget(step.selector);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    window.addEventListener("resize", re);
    window.addEventListener("scroll", re, true);
    return () => {
      alive = false;
      window.removeEventListener("resize", re);
      window.removeEventListener("scroll", re, true);
    };
  }, [run?.tour.id, run?.step, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // کلیدهای صفحه‌کلید
  useEffect(() => {
    if (!run) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") pause();
      if (e.key === "ArrowLeft") (dir === "rtl" ? next : prev)();
      if (e.key === "ArrowRight") (dir === "rtl" ? prev : next)();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (!run || !step) {
    if (!offer) return null;
    return (
      <div className="fixed z-40 bottom-20 lg:bottom-16 start-4 end-4 sm:end-auto sm:w-80 card p-3 shadow-lg print:hidden" role="dialog" aria-label="پیشنهاد تور">
        <p className="text-[12.5px] font-bold text-ink-900 flex items-center gap-1.5">
          <Compass size={14} className="text-brand-600" /> تور «{offer.title}» را ببینید؟
        </p>
        <p className="text-[11.5px] text-ink-500 mt-1 leading-5">{offer.summary}</p>
        <div className="flex justify-end gap-2 mt-2">
          <Button size="sm" variant="ghost" onClick={() => setOffer(null)}>
            نه، ممنون
          </Button>
          <Button size="sm" variant="primary" icon={<Play size={12} />} onClick={() => startTour(offer.id)}>
            شروع ({offer.steps.length.toLocaleString("fa-IR")} گام)
          </Button>
        </div>
      </div>
    );
  }

  const n = run.tour.steps.length;
  const last = run.step === n - 1;
  function next() {
    if (!run) return;
    if (last) {
      setProg(run.tour.id, { completed_at: stamp(), step: undefined });
      setRun(null);
      return;
    }
    setProg(run.tour.id, { step: run.step + 1 });
    setRun({ ...run, step: run.step + 1 });
  }
  function prev() {
    if (run && run.step > 0) setRun({ ...run, step: run.step - 1 });
  }
  function skip() {
    if (!run) return;
    setProg(run.tour.id, { skipped_at: stamp(), step: undefined });
    setRun(null);
  }
  /** بستن موقت: از همین گام قابل ادامه است */
  function pause() {
    if (!run) return;
    setProg(run.tour.id, { step: run.step });
    setRun(null);
  }

  const pad = 6;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const mobile = vw < 640;
  const W = 320;
  let cardStyle: CSSProperties = {};
  if (!mobile) {
    if (rect) {
      const below = rect.bottom + 12 + 200 < vh;
      const left = Math.min(Math.max(12, rect.left + rect.width / 2 - W / 2), vw - W - 12);
      cardStyle = below ? { top: rect.bottom + 12, left, width: W } : { top: Math.max(12, rect.top - 12 - 220), left, width: W };
    } else cardStyle = { top: vh / 2 - 110, left: vw / 2 - W / 2, width: W };
  }

  return (
    <div className="fixed inset-0 z-[60] print:hidden" role="dialog" aria-modal="true" aria-label={`تور ${run.tour.title}`}>
      {rect ? (
        <div
          className="absolute rounded-xl ring-2 ring-brand-400 pointer-events-none transition-all duration-200"
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px rgba(10,20,40,0.55)" }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(10,20,40,0.55)]" />
      )}
      <div className={`absolute bg-white border border-ink-200 shadow-2xl p-4 ${mobile ? "inset-x-3 bottom-3 rounded-2xl" : "rounded-xl"}`} style={cardStyle} dir={dir}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10.5px] font-bold text-brand-700">
            {run.tour.title} · گام {(run.step + 1).toLocaleString("fa-IR")} از {n.toLocaleString("fa-IR")}
          </span>
          <button onClick={pause} className="w-7 h-7 rounded-md hover:bg-ink-100 text-ink-400 flex items-center justify-center" aria-label="بستن (بعداً ادامه می‌دهم)" title="بستن — بعداً از همین گام ادامه دهید">
            <X size={14} />
          </button>
        </div>
        <div className="h-1 rounded-full bg-ink-100 overflow-hidden mb-3" aria-hidden>
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${((run.step + 1) / n) * 100}%` }} />
        </div>
        <p className="text-[14px] font-bold text-ink-900">{step.title}</p>
        <p className="text-[12.5px] text-ink-600 leading-6 mt-1">{step.body}</p>
        {step.help_article && (
          <Link to={helpHref(step.help_article)} onClick={pause} className="inline-flex items-center gap-1 text-[11.5px] text-brand-700 hover:underline mt-1.5">
            <BookOpen size={12} /> مقاله‌ی مرتبط در مرکز راهنما
          </Link>
        )}
        <div className="flex items-center justify-between gap-2 mt-3">
          <button onClick={skip} className="text-[11.5px] text-ink-500 hover:text-ink-800">
            رد شدن
          </button>
          <div className="flex items-center gap-1.5">
            {run.step > 0 && (
              <Button size="sm" variant="ghost" icon={dir === "rtl" ? <ChevronRight size={13} /> : <ChevronLeft size={13} />} onClick={prev}>
                قبلی
              </Button>
            )}
            <Button size="sm" variant="primary" onClick={next}>
              {last ? "پایان" : "بعدی"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** مرکز راهنما — فهرست تورها با وضعیت هر کاربر */
export function TourLauncherCard() {
  const st = useLocalStore(tourStore);
  const { actingUser } = useTenancy();
  const allowed = useTourAccess();
  const mine = st.progress[actingUser.id] ?? {};
  const list = tours.filter(allowed);
  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <p className="text-[13.5px] font-bold text-ink-900 flex items-center gap-1.5">
          <Compass size={16} className="text-brand-600" /> تورهای تعاملی
        </p>
        <ApiChip items={[{ label: "فهرست تورها", ep: platformEndpoints.tours() }, { label: "ثبت تکمیل تور", ep: platformEndpoints.tourComplete("{id}") }]} />
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {list.map((t) => {
          const p = mine[t.id];
          const resumable = p?.step !== undefined && !p?.completed_at;
          return (
            <li key={t.id} className="rounded-lg border border-ink-100 p-2.5 flex items-start gap-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-ink-800">
                  {t.title}
                  {p?.completed_at && <span className="text-[10px] font-medium text-emerald-700 ms-1.5">✓ دیده‌شده</span>}
                  {resumable && <span className="text-[10px] font-medium text-amber-700 ms-1.5">نیمه‌کاره</span>}
                </p>
                <p className="text-[11px] text-ink-500 leading-5 mt-0.5">{t.summary}</p>
              </div>
              <Button size="sm" variant={p?.completed_at ? "ghost" : "secondary"} icon={p?.completed_at ? <RotateCcw size={12} /> : <Play size={12} />} onClick={() => startTour(t.id, resumable ? p!.step : 0)}>
                {resumable ? `ادامه (گام ${((p!.step ?? 0) + 1).toLocaleString("fa-IR")})` : p?.completed_at ? "دوباره" : "اجرا"}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** راهبر: روشن/خاموش اجرای خودکار در اولین ورود */
export function TourAdminCard() {
  const st = useLocalStore(tourStore);
  const { hasPermission, actingUser } = useTenancy();
  const { notify } = useToast();
  const can = hasPermission("settings.system");
  const done = Object.values(st.progress).filter((p) => p.intro?.completed_at).length;
  return (
    <div className="card p-4 space-y-3">
      <p className="text-[13px] font-bold text-ink-900 flex items-center gap-1.5">
        <Compass size={15} className="text-brand-600" /> راهنمای تعاملی (تور محصول)
      </p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12.5px] text-ink-700">اجرای خودکار «آشنایی کلی» در اولین ورود هر کاربر</span>
        <Toggle
          on={st.settings.autorun}
          disabled={!can}
          label="اجرای خودکار تور"
          onChange={() => {
            tourStore.set((s) => ({ ...s, settings: { autorun: !s.settings.autorun } }));
            emitSettingsChange({ area: "راهنمای تعاملی", summary: st.settings.autorun ? "اجرای خودکار تور خاموش شد" : "اجرای خودکار تور روشن شد", before: { autorun: st.settings.autorun }, after: { autorun: !st.settings.autorun } });
            notify("ذخیره شد.", "success");
          }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[11.5px] text-ink-500">
          {tours.length.toLocaleString("fa-IR")} تور · «آشنایی کلی» را {done.toLocaleString("fa-IR")} کاربر در این مرورگر کامل کرده‌اند.
        </span>
        <Button
          size="sm"
          variant="ghost"
          icon={<RotateCcw size={12} />}
          onClick={() => {
            tourStore.set((s) => ({ ...s, progress: { ...s.progress, [actingUser.id]: {} } }));
            notify("پیشرفت تورهای شما بازنشانی شد (برای نمایش دوباره‌ی اجرای خودکار).", "info");
          }}
        >
          بازنشانی تورهای من
        </Button>
      </div>
    </div>
  );
}
