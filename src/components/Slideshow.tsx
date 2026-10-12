// ---------------------------------------------------------------------------
// F15 «مدیریت اسلایدشو» (۱.۲۱.۴) — انبار اسلایدها + اسلایدر دسترس‌پذیر.
//  - LandingSlideshow: اسلایدر صفحه‌ی عمومی (فقط مخاطب «عمومی»). اسلایدشوی میز کار حذف شده است.
//  - Slider: قبلی/بعدی، نشانگرها، پخش خودکار با توقف روی hover/focus، کلیدهای جهت‌نما.
// مدل API: slide { id, image_desktop, image_mobile, title, subtitle, cta_text, cta_url,
//   starts_at, ends_at, audience, scope_id, order, is_active, placement }
// مدیریت: «تنظیمات سامانه ← برند و ظاهر ← اسلایدشو» (src/pages/settings/SlideshowSection.tsx)
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { createLocalStore, useLocalStore } from "../iam/store";
import { useTenancy } from "../context/TenancyContext";
import { descendantsOrSelf } from "../iam/model";
import { dayNum } from "../pm/jalali";
import { useI18n } from "../i18n";

export type SlideAudience = "public" | "members" | "scope";
export type SlidePlacement = "landing" | "dashboard" | "both";
export type Slide = {
  id: string;
  image_desktop: string;
  image_mobile: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_url: string;
  starts_at: string;
  ends_at: string;
  audience: SlideAudience;
  scope_id: string | null;
  order: number;
  is_active: boolean;
  placement: SlidePlacement;
  updated_at: string;
};
export type SliderSettings = { enabled: boolean; interval_sec: number; autoplay: boolean; indicators: boolean };
type SlideState = { slides: Slide[]; settings: Record<"landing" | "dashboard", SliderSettings>; seq: number };

export const audienceLabel: Record<SlideAudience, string> = { public: "عمومی", members: "اعضا", scope: "لایه‌ی سازمانی" };
export const placementLabel: Record<SlidePlacement, string> = { landing: "صفحه‌ی عمومی", dashboard: "داشبورد", both: "هر دو" };

const S = (o: Partial<Slide> & Pick<Slide, "id" | "title" | "image_desktop" | "order">): Slide => ({
  image_mobile: "",
  subtitle: "",
  cta_text: "",
  cta_url: "",
  starts_at: "",
  ends_at: "",
  audience: "public",
  scope_id: null,
  is_active: true,
  placement: "both",
  updated_at: "۱۴۰۵/۰۳/۰۱ ۰۹:۰۰",
  ...o,
});
const seed = (): SlideState => ({
  seq: 10,
  settings: { landing: { enabled: true, interval_sec: 6, autoplay: true, indicators: true }, dashboard: { enabled: true, interval_sec: 8, autoplay: true, indicators: true } },
  slides: [
    S({ id: "sl1", order: 1, image_desktop: "/img/lab.jpg", title: "هفته‌ی پژوهش و فناوری بنیاد", subtitle: "فراخوان طرح‌های پژوهشی ۱۴۰۵ تا پایان خرداد باز است.", cta_text: "مشاهده‌ی فرصت‌ها", cta_url: "/dashboard/research", starts_at: "۱۴۰۵/۰۳/۰۱", ends_at: "۱۴۰۵/۰۳/۳۱", placement: "both" }),
    S({ id: "sl2", order: 2, image_desktop: "/img/expo.jpg", title: "جایزه‌ی نوآوری و فناوری — دوره‌ی سوم", subtitle: "ثبت آثار شرکت‌ها و تیم‌های فناور زیرمجموعه آغاز شد.", cta_text: "ثبت اثر", cta_url: "/dashboard/award", placement: "both" }),
    S({ id: "sl3", order: 3, image_desktop: "/img/training.jpg", title: "دوره‌ی مدیریت پروژه‌ی چابک", subtitle: "ویژه‌ی مدیران پروژه — ثبت‌نام در سامانه‌ی آموزش.", cta_text: "ثبت‌نام", cta_url: "/dashboard/training", audience: "members", placement: "dashboard", starts_at: "۱۴۰۵/۰۲/۲۰", ends_at: "۱۴۰۵/۰۴/۱۵" }),
    S({ id: "sl4", order: 4, image_desktop: "/img/energy.jpg", title: "نشست هم‌اندیشی بهره‌وری انرژی", subtitle: "ویژه‌ی کارکنان هلدینگ برق و انرژی صبا — سه‌شنبه، سالن همایش‌ها.", cta_text: "رویدادها", cta_url: "/dashboard/events", audience: "scope", scope_id: "h-saba", placement: "dashboard" }),
    S({ id: "sl5", order: 5, image_desktop: "/img/meeting.jpg", title: "همایش سالانه‌ی مدیران ۱۴۰۴", subtitle: "گزارش تصویری همایش.", cta_text: "رسانه", cta_url: "/dashboard/media", starts_at: "۱۴۰۵/۰۱/۱۵", ends_at: "۱۴۰۵/۰۲/۳۰", placement: "both" }),
  ],
});
export const slideStore = createLocalStore<SlideState>("motoshub.slides.v1", seed, (r) => {
  const x = r as SlideState;
  return x && Array.isArray(x.slides) && x.settings ? x : null;
});

/** وضعیت زمانی یک اسلاید نسبت به امروز */
export function slideStatus(s: Slide, today: string): "inactive" | "scheduled" | "expired" | "live" {
  if (!s.is_active) return "inactive";
  const t = dayNum(today) ?? 0;
  if (s.starts_at && (dayNum(s.starts_at) ?? 0) > t) return "scheduled";
  if (s.ends_at && (dayNum(s.ends_at) ?? 0) < t) return "expired";
  return "live";
}

/** اسلایدهای قابل نمایش در یک مکان برای کاربر فعلی (ترتیب، بازه‌ی زمانی و مخاطب) */
export function useVisibleSlides(where: "landing" | "dashboard") {
  const st = useLocalStore(slideStore);
  const { today, iam, contextId, membershipsOf, actingUser } = useTenancy();
  const mine = new Set(membershipsOf(actingUser.id).map((m) => m.scopeId));
  const inScope = (sid: string | null) => !!sid && (descendantsOrSelf(iam, sid).some((n) => n.id === contextId || mine.has(n.id)));
  const slides = st.slides
    .filter((s) => (s.placement === "both" || s.placement === where) && slideStatus(s, today) === "live")
    .filter((s) => (where === "landing" ? s.audience === "public" : s.audience !== "scope" || inScope(s.scope_id)))
    .sort((a, b) => a.order - b.order);
  return { slides, settings: st.settings[where] };
}

// ------------------------------------------------------------------ اسلایدر
export function Slider({ slides, settings, variant, onDismiss, label }: { slides: Slide[]; settings: SliderSettings; variant: "hero" | "slim"; onDismiss?: () => void; label: string }) {
  const { t, dir } = useI18n();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useRef(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const n = slides.length;
  const idx = n ? i % n : 0;
  useEffect(() => {
    if (!settings.autoplay || paused || n < 2 || reduce.current) return;
    const iv = setInterval(() => setI((x) => (x + 1) % n), Math.max(3, settings.interval_sec) * 1000);
    return () => clearInterval(iv);
  }, [settings.autoplay, settings.interval_sec, paused, n]);
  if (!n) return null;
  const go = (d: number) => setI((x) => (x + d + n) % n);
  const s = slides[idx];
  const onKey = (e: KeyboardEvent) => {
    // در راست‌چین «چپ» یعنی بعدی
    if (e.key === "ArrowLeft") go(dir === "rtl" ? 1 : -1);
    if (e.key === "ArrowRight") go(dir === "rtl" ? -1 : 1);
  };
  const hero = variant === "hero";
  const cta =
    s.cta_text && s.cta_url ? (
      s.cta_url.startsWith("/") ? (
        <Link to={s.cta_url} className={`inline-flex items-center rounded-lg font-medium ${hero ? "bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 text-[13px]" : "bg-white/15 hover:bg-white/25 border border-white/30 text-white px-2.5 py-1 text-[11.5px]"}`}>
          {s.cta_text}
        </Link>
      ) : (
        <a href={s.cta_url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center rounded-lg font-medium ${hero ? "bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 text-[13px]" : "bg-white/15 hover:bg-white/25 border border-white/30 text-white px-2.5 py-1 text-[11.5px]"}`}>
          {s.cta_text}
        </a>
      )
    ) : null;
  const navBtn = "w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-sm";
  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKey}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`relative overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${hero ? "h-64 sm:h-80" : "h-28 sm:h-32"}`}
    >
      <div key={s.id} role="group" aria-roledescription="slide" aria-label={`${(idx + 1).toLocaleString("fa-IR")} از ${n.toLocaleString("fa-IR")}`} className="absolute inset-0">
        <picture>
          {s.image_mobile && <source media="(max-width: 640px)" srcSet={s.image_mobile} />}
          <img src={s.image_desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-l from-navy-950/90 via-navy-950/65 to-navy-950/20" />
        <div className={`relative h-full flex flex-col justify-center ${hero ? "px-6 sm:px-12 max-w-2xl" : "px-4 sm:px-6 pe-14"}`} aria-live={settings.autoplay ? "off" : "polite"}>
          <p className={`font-extrabold text-white ${hero ? "text-xl sm:text-2xl leading-9" : "text-[14px] sm:text-[15px] leading-6 line-clamp-1"}`}>{s.title}</p>
          {s.subtitle && <p className={`text-navy-100 ${hero ? "text-[13.5px] leading-7 mt-2" : "text-[11.5px] leading-5 mt-0.5 line-clamp-1"}`}>{s.subtitle}</p>}
          {cta && <div className={hero ? "mt-4" : "mt-1.5"}>{cta}</div>}
        </div>
      </div>
      {n > 1 && (
        <div className={`absolute bottom-2 start-3 flex items-center gap-1.5 ${hero ? "sm:bottom-4 sm:start-6" : ""}`}>
          <button onClick={() => go(-1)} className={navBtn} aria-label={t("اسلاید قبلی")}>
            {dir === "rtl" ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
          <button onClick={() => go(1)} className={navBtn} aria-label={t("اسلاید بعدی")}>
            {dir === "rtl" ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
          </button>
          {settings.indicators && (
            <span className="flex items-center gap-1 ms-1">
              {slides.map((x, k) => (
                <button key={x.id} onClick={() => setI(k)} aria-label={`اسلاید ${(k + 1).toLocaleString("fa-IR")}`} aria-current={k === idx} className={`h-1.5 rounded-full transition-all ${k === idx ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`} />
              ))}
            </span>
          )}
        </div>
      )}
      {onDismiss && (
        <button onClick={onDismiss} className="absolute top-2 end-2 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center" aria-label={t("بستن")} title="بستن اسلایدشو (با تغییر اسلایدها دوباره نمایش داده می‌شود)">
          <X size={14} />
        </button>
      )}
    </section>
  );
}

/** اسلایدر صفحه‌ی عمومی */
export function LandingSlideshow({ className = "" }: { className?: string }) {
  const { slides, settings } = useVisibleSlides("landing");
  if (!settings.enabled || !slides.length) return null;
  return (
    <div className={className}>
      <Slider slides={slides} settings={settings} variant="hero" label="اسلایدشوی صفحه‌ی اصلی" />
    </div>
  );
}
