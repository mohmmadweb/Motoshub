// ---------------------------------------------------------------------------
// «پیشنهادی» — F02 پیش‌نمایش لینک (۱.۲.۶) و F05 تشخیص لینک آپارات (۱.۱۱.۲).
// شبیه‌ساز GET /core/link-preview/?url=… : واکشی سمت سرور با کش ۲۴ ساعته، فقط http/https.
// در دمو یک جدول نمونه‌ی URL → متادیتا (og:title / og:description / og:image) داریم؛
// نشانی ناشناخته یک کارت حداقلی (دامنه) می‌گیرد و نشانی نامعتبر/در دسترس‌نبودنی «شکست» است.
// ---------------------------------------------------------------------------
import type { AparatVideo, LinkPreview } from "./types";
import { feedLinkPreviews } from "./feedCatalog";

/** نخستین نشانی http/https در متن (نشانه‌گذاری فارسی انتهایی جدا می‌شود) */
export const URL_RE = /https?:\/\/[^\s<>«»"']+/i;
export const URL_RE_G = /(https?:\/\/[^\s<>«»"']+)/gi;
export const trimUrl = (u: string) => u.replace(/[.,،؛:!?؟)\]}»]+$/, "");
export function firstUrl(text: string): string | null {
  const m = URL_RE.exec(text ?? "");
  return m ? trimUrl(m[0]) : null;
}
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ------------------------------------------------------------------ آپارات
/** aparat.com/v/{hash} ← hash */
export function aparatHash(input: string): string | null {
  const s = input.trim();
  const m = /aparat\.com\/(?:v|video\/video\/embed\/videohash)\/([A-Za-z0-9]{4,12})/i.exec(s);
  if (m) return m[1];
  // شناسه‌ی خالی ویدیو
  return /^[A-Za-z0-9]{5,10}$/.test(s) ? s : null;
}
export const aparatEmbedUrl = (hash: string) => `https://www.aparat.com/video/video/embed/videohash/${hash}/vt/frame`;
export const aparatPageUrl = (hash: string) => `https://www.aparat.com/v/${hash}`;

/** فراداده‌ی نمونه‌ی ویدیوهای آپارات (در نسخه‌ی متصل از API عمومی آپارات واکشی می‌شود) */
export const APARAT_SAMPLES: Record<string, AparatVideo> = {
  qW3eR: { hash: "qW3eR", title: "گزارش تصویری افتتاح کارگاه‌های اشتغال خرد در قلعه‌گنج", thumbnail: "#0d9488", duration: "۰۴:۳۲", channel: "bonyad_tv" },
  Zx81k: { hash: "Zx81k", title: "مستند «آبادانی» — روایت طرح‌های محرومیت‌زدایی بنیاد", thumbnail: "#b45309", duration: "۱۸:۰۵", channel: "bonyad_tv" },
  Lm4Pt: { hash: "Lm4Pt", title: "نشست تخصصی بازیافت حرارت در صنایع انرژی‌بر", thumbnail: "#7c3aed", duration: "۵۲:۱۰", channel: "bonyad_tv" },
  Hy7Ds: { hash: "Hy7Ds", title: "آموزش ثبت طرح در صندوق نوآوری — قدم‌به‌قدم", thumbnail: "#1f4f99", duration: "۰۷:۴۵", channel: "bonyad_tv" },
  Pq2Vn: { hash: "Pq2Vn", title: "گفت‌وگوی ویژه با برگزیدگان جایزه‌ی نوآوری", thumbnail: "#be123c", duration: "۲۴:۱۸", channel: "bonyad_tv" },
};
/** ویدیوهایی که «همگام‌سازی کانال» از کانال سازمان می‌آورد */
export const APARAT_CHANNEL_FEED: Record<string, string[]> = { bonyad_tv: ["Hy7Ds", "Pq2Vn", "Lm4Pt"] };

export function aparatMeta(hash: string): AparatVideo {
  return APARAT_SAMPLES[hash] ?? { hash, title: `ویدیوی آپارات ${hash}`, thumbnail: "#334155", duration: "—", channel: "aparat" };
}

// ------------------------------------------------------------------ لینک داخلی سامانه
export type InternalRef = { kind: "news" | "blog" | "magazines" | "events" | "groups" | "channels" | "media" | "forum"; id: string };
/** https://demo.shub.ir/#/dashboard/news/{id} و مسیرهای هم‌شکل ← نوع و شناسه‌ی محتوا */
export function internalRef(url: string): InternalRef | null {
  const m = /^https?:\/\/[^/]*shub\.ir\/(?:#\/)?dashboard\/(news|blog|magazines|events|groups|channels|media|forum)\/([^/?#\s]+)/i.exec(url);
  return m ? { kind: m[1].toLowerCase() as InternalRef["kind"], id: decodeURIComponent(m[2]) } : null;
}

// ------------------------------------------------------------------ جدول نمونه‌ی متادیتا
const P = (url: string, site_name: string, title: string, description: string, image: string | null): LinkPreview => ({ url, final_url: url, title, description, image, site_name, favicon: null, fetched_at: "" });
/** کش نمونه: دامنه‌های پرکاربرد (هر نشانیِ همان دامنه که جدا ثبت نشده، کارت دامنه را می‌گیرد) */
const SAMPLES: LinkPreview[] = [
  P("https://www.irna.ir/news/85123456", "ایرنا", "اجرای ۲۴۰ طرح محرومیت‌زدایی در استان‌های کم‌برخوردار", "بنیاد مستضعفان از آغاز اجرای ۲۴۰ طرح آبادانی و اشتغال‌زایی در قلعه‌گنج، لنده و چالدران با مشارکت هلدینگ‌ها خبر داد.", "#1f4f99"),
  P("https://www.isna.ir/news/1405030812345", "ایسنا", "رونمایی از سامانه‌ی یکپارچه‌ی شبکه‌ی دانشمندان", "سامانه‌ی جدید با هدف اتصال پژوهشگران برگزیده به مسائل صنایع و ثبت تجربه‌ها راه‌اندازی شد.", "#0369a1"),
  P("https://www.mehrnews.com/news/6123456", "خبرگزاری مهر", "نشست تخصصی بازیافت حرارت در صنایع انرژی‌بر برگزار شد", "متخصصان ترمودینامیک دو راهکار ORC و مبدل صفحه‌ای را برای کوره‌های صنعتی مقایسه کردند.", "#b45309"),
  P("https://www.tasnimnews.com/fa/news/1405/03/07/3123456", "خبرگزاری تسنیم", "گزارش عملکرد فصلی طرح‌های اشتغال خرد", "بیش از ۱۲ هزار فرصت شغلی در سه ماه نخست سال ایجاد شد.", "#15803d"),
  P("https://fa.wikipedia.org/wiki/چرخه_رانکین_آلی", "ویکی‌پدیا", "چرخه رانکین آلی — ویکی‌پدیا، دانشنامهٔ آزاد", "چرخهٔ رانکین آلی (ORC) چرخه‌ای ترمودینامیکی است که به‌جای آب از سیال آلی با نقطه‌ی جوش پایین استفاده می‌کند.", "#64748b"),
  P("https://github.com/motoshub/social-api", "GitHub", "motoshub/social-api — Motoshub Social API", "OpenAPI 3.0.3 specification and reference backend for the Motoshub social network.", "#0f172a"),
  P("https://www.digikala.com/product/dkp-1234567", "دیجی‌کالا", "لپ‌تاپ ۱۴ اینچی مخصوص کارهای مهندسی", "مشخصات فنی، قیمت و نظرهای خریداران.", "#be123c"),
  P("https://www.isna.ir/", "ایسنا", "خبرگزاری دانشجویان ایران — ایسنا", "آخرین اخبار علمی، دانشگاهی و اجتماعی.", "#0369a1"),
  P("https://www.irna.ir/", "ایرنا", "خبرگزاری جمهوری اسلامی — ایرنا", "اخبار ایران و جهان.", "#1f4f99"),
];
const BY_URL = new Map([...SAMPLES, ...feedLinkPreviews()].map((x) => [x.url, x]));
const DOMAIN_CARD = new Map(SAMPLES.filter((x) => new URL(x.url).pathname === "/").map((x) => [domainOf(x.url), x]));
const SITE_NAMES: Record<string, string> = Object.fromEntries(SAMPLES.map((x) => [domainOf(x.url), x.site_name]));

/** «شکست» شبیه‌سازی‌شده: نشانی بدون دامنه‌ی معتبر یا با پسوند .invalid/.local */
const unreachable = (d: string) => !d || !d.includes(".") || /\.(invalid|local|test)$/.test(d) || d.startsWith("localhost");

/**
 * واکشی پیش‌نمایش از کش نمونه (همگام). null = شکست ← فقط لینک ساده.
 * `blocked`: فهرست دامنه‌های مسدود (تنظیم core.link_preview.blocked_domains)
 */
export function lookupPreview(url: string, blocked: string[] = []): LinkPreview | null {
  const u = trimUrl(url);
  if (!/^https?:\/\//i.test(u)) return null;
  const d = domainOf(u);
  if (unreachable(d) || blocked.some((b) => b && (d === b || d.endsWith(`.${b}`)))) return null;
  const hit = BY_URL.get(u);
  if (hit) return hit;
  const dom = DOMAIN_CARD.get(d);
  if (dom) return { ...dom, url: u, final_url: u };
  // نشانی ناشناخته: کارت حداقلی با نام دامنه (og:title در دسترس نبود)
  const path = decodeURIComponent(new URL(u).pathname).replace(/^\/|\/$/g, "").split("/").pop() ?? "";
  return { url: u, final_url: u, title: path ? path.replace(/[-_]+/g, " ") : d, description: "", image: null, site_name: SITE_NAMES[d] ?? d, favicon: null, fetched_at: "" };
}

/** نشانی‌هایی که در همین نشست «واکشی» شده‌اند — بار اول حالت اسکلت نمایش داده می‌شود */
const fetched = new Set<string>();
export const wasFetched = (url: string) => fetched.has(url);
export const markFetched = (url: string) => void fetched.add(url);
/** تأخیر شبیه‌سازی‌شده‌ی واکشی سمت سرور */
export const PREVIEW_DELAY_MS = 650;

export const parseBlocked = (v: unknown) =>
  String(v ?? "")
    .split(/[,،\s]+/)
    .map((x) => x.trim().replace(/^www\./, ""))
    .filter(Boolean);
