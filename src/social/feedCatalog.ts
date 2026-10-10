// ---------------------------------------------------------------------------
// «پیشنهادی» — F03 داده‌ی نمونه‌ی خوراک‌های RSS/Atom (شبیه‌ساز واکشی سمت سرور).
// هر خوراک یک فهرست مطلب دارد؛ واکشی دوره‌ای مطالب منتشرنشده را به‌ترتیب برمی‌دارد.
// نشانی ناشناخته‌ای که شبیه خوراک باشد (rss / feed / atom / .xml) چند مطلب عمومی می‌گیرد،
// و نشانی دیگر خطای «قالب RSS/Atom معتبر نیست» می‌دهد.
// ---------------------------------------------------------------------------
import type { FeedItem, LinkPreview } from "./types";

const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const I = (guid: string, title: string, summary: string, link: string, published: string): FeedItem => ({ guid, title, summary, link, published });

export const FEED_CATALOG: Record<string, { title: string; site: string; color: string; items: FeedItem[] }> = {
  "https://www.irna.ir/rss": {
    title: "ایرنا — اقتصادی",
    site: "ایرنا",
    color: "#1f4f99",
    items: [
      I("irna-1", "آغاز اجرای طرح‌های آبادانی در ۱۲ شهرستان کم‌برخوردار", "با مشارکت هلدینگ‌های بنیاد، ۲۴۰ طرح زیرساختی و اشتغال‌زا در دست اجراست.", "https://www.irna.ir/news/85120001", "۱۴۰۵/۰۳/۰۶ ۰۹:۱۰"),
      I("irna-2", "رشد ۱۸ درصدی تسهیلات اشتغال خرد در فصل بهار", "گزارش رسمی نشان می‌دهد سهم مناطق مرزی از تسهیلات اشتغال خرد افزایش یافته است.", "https://www.irna.ir/news/85120002", "۱۴۰۵/۰۳/۰۷ ۱۱:۴۰"),
      I("irna-3", "افتتاح کارگاه‌های قالی‌بافی روستایی در چالدران", "۳۵ کارگاه خانگی با حمایت بنیاد علوی به بهره‌برداری رسید.", "https://www.irna.ir/news/85120003", "۱۴۰۵/۰۳/۰۸ ۰۸:۲۰"),
      I("irna-4", "برنامه‌ی ملی بهره‌وری انرژی در صنایع فولاد تصویب شد", "بازیافت حرارت و بهینه‌سازی کوره‌ها در اولویت برنامه قرار گرفت.", "https://www.irna.ir/news/85120004", "۱۴۰۵/۰۳/۰۸ ۱۰:۰۵"),
      I("irna-5", "نمایشگاه دستاوردهای فناورانه‌ی صنایع بنیاد برگزار می‌شود", "بیش از ۸۰ شرکت دانش‌بنیان دستاوردهای خود را عرضه می‌کنند.", "https://www.irna.ir/news/85120005", "۱۴۰۵/۰۳/۰۸ ۱۲:۳۰"),
      I("irna-6", "تفاهم‌نامه‌ی همکاری آموزش فنی‌وحرفه‌ای در مناطق محروم", "آموزش ۵ هزار نفر در رشته‌های پرتقاضای بازار کار هدف‌گذاری شد.", "https://www.irna.ir/news/85120006", "۱۴۰۵/۰۳/۰۸ ۱۴:۱۵"),
    ],
  },
  "https://www.isna.ir/rss/tp/5": {
    title: "ایسنا — علم و فناوری",
    site: "ایسنا",
    color: "#0369a1",
    items: [
      I("isna-1", "رونمایی از نسل جدید حسگرهای صنعتی ساخت داخل", "یک تیم فناور در پارک فناوری پردیس حسگر دمای کوره با دقت بالا ساخت.", "https://www.isna.ir/news/1405030612001", "۱۴۰۵/۰۳/۰۶ ۱۰:۰۰"),
      I("isna-2", "ورزش همگانی در تعطیلات تابستان", "برنامه‌ی ورزش‌های صبحگاهی در بوستان‌ها اعلام شد.", "https://www.isna.ir/news/1405030712002", "۱۴۰۵/۰۳/۰۷ ۰۸:۰۰"),
      I("isna-3", "فراخوان جایزه‌ی نوآوری اجتماعی منتشر شد", "طرح‌های فناورانه با اثر اجتماعی تا پایان تیر ثبت می‌شوند.", "https://www.isna.ir/news/1405030712003", "۱۴۰۵/۰۳/۰۷ ۱۵:۳۰"),
      I("isna-4", "کاربرد هوش مصنوعی در پایش مصرف انرژی کارخانه‌ها", "پژوهشگران شریف مدلی برای پیش‌بینی مصرف کوره‌های صنعتی ارائه کردند.", "https://www.isna.ir/news/1405030812004", "۱۴۰۵/۰۳/۰۸ ۰۹:۴۵"),
      I("isna-5", "سامانه‌ی ملی ثبت تجربه‌های فناورانه راه‌اندازی شد", "تجربه‌های پروژه‌های فناوری در یک مخزن دانش مشترک ثبت می‌شود.", "https://www.isna.ir/news/1405030812005", "۱۴۰۵/۰۳/۰۸ ۱۳:۰۰"),
    ],
  },
};

const SAMPLE_TITLES = ["گزارش تازه درباره‌ی برنامه‌های توسعه‌ی منطقه‌ای", "نشست هم‌اندیشی فعالان نوآوری برگزار شد", "انتشار آمار فصلی بهره‌وری صنایع", "فراخوان تازه برای طرح‌های پژوهشی کاربردی"];

/** واکشی شبیه‌سازی‌شده‌ی خوراک: { items } یا { error } */
export function fetchFeed(url: string): { title: string; items: FeedItem[] } | { error: string } {
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) return { error: "نشانی باید با http:// یا https:// شروع شود." };
  const hit = FEED_CATALOG[u];
  if (hit) return { title: hit.title, items: hit.items };
  const d = domainOf(u);
  if (!d || !d.includes(".")) return { error: "نشانی معتبر نیست." };
  if (!/rss|feed|atom|\.xml/i.test(u)) return { error: "پاسخ سرور قالب RSS/Atom معتبر نداشت." };
  return {
    title: d,
    items: SAMPLE_TITLES.map((t, i) => I(`${d}-${i + 1}`, t, `خلاصه‌ی مطلب از ${d}.`, `https://${d}/news/${1000 + i}`, `۱۴۰۵/۰۳/۰۸ ۰${i + 7}:۰۰`)),
  };
}

/** فیلتر کلیدواژه: اگر فهرست خالی باشد همه‌ی مطالب پذیرفته می‌شوند */
export const matchesKeywords = (it: FeedItem, kw: string[]) => !kw.length || kw.some((k) => k && (it.title.includes(k) || it.summary.includes(k)));

/** پیش‌نمایش لینکِ مطالب خوراک (og:title همان عنوان مطلب است) */
export function feedLinkPreviews(): LinkPreview[] {
  return Object.values(FEED_CATALOG).flatMap((f) => f.items.map((it) => ({ url: it.link, final_url: it.link, title: it.title, description: it.summary, image: f.color, site_name: f.site, favicon: null, fetched_at: "" })));
}
