import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  LogIn, MessagesSquare, NotebookPen, CalendarDays,
  Image as ImageIcon, BookOpen, Newspaper, Users, CheckCircle2,
  Star, MapPin, PlayCircle,
  FileText, ArrowLeft, Clock, Search, ChevronLeft, Share2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useContent } from "../context/ContentContext";
import SiteHeader from "../components/SiteHeader";
import PublicFooter from "../components/PublicFooter";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import { useToast } from "../components/ui/ToastProvider";
import type {
  ForumTopic, BlogPost, EventItem, MediaItem, KnowledgeDoc, NewsItem, Group,
} from "../data/mock";
import { newsImg, blogImg, mediaImg, eventImg, bgStyle } from "../data/images";

type Section = "forum" | "blog" | "events" | "media" | "knowledge" | "news" | "groups";
const validSections: Section[] = ["forum", "blog", "events", "media", "knowledge", "news", "groups"];

// ─── Shell ────────────────────────────────────────────────────────────────────
export default function PublicShowcase() {
  const { section } = useParams();
  const c = useContent();

  const sec: Section = validSections.includes(section as Section) ? (section as Section) : "forum";

  const publicForum     = c.forumTopics.filter((t) => t.visibility === "عمومی");
  const publicBlog      = c.blogPosts.filter((b) => b.visibility === "عمومی");
  const publicEvents    = c.events.filter((e) => e.visibility === "عمومی");
  const publicMedia     = c.mediaItems.filter((m) => m.visibility === "عمومی");
  const publicKnowledge = c.knowledgeDocs.filter((d) => d.visibility === "عمومی");
  const publicNews      = c.newsItems.filter((n) => n.visibility === "عمومی");
  const publicGroups    = c.groups.filter((g) => g.privacy === "عمومی");

  return (
    <div dir="rtl" className="min-h-screen bg-[#f6f7f8] flex flex-col">
      <SiteHeader />

      {/* Content */}
      <main className="flex-1">
        {sec === "forum"     && <ForumSection     items={publicForum} />}
        {sec === "blog"      && <BlogSection      items={publicBlog} />}
        {sec === "events"    && <EventsSection    items={publicEvents} />}
        {sec === "media"     && <MediaSection     items={publicMedia} />}
        {sec === "knowledge" && <KnowledgeSection items={publicKnowledge} />}
        {sec === "news"      && <NewsSection      items={publicNews} />}
        {sec === "groups"    && <GroupsSection    items={publicGroups} />}
      </main>

      {/* Login CTA */}
      <div className="bg-navy-900 py-8">
        <div className="px-6 lg:px-12 max-w-7xl mx-auto flex items-center justify-between gap-6 flex-wrap">
          <div>
            <p className="text-white font-bold text-base mb-1">برای مشارکت وارد شوید</p>
            <p className="text-navy-300 text-sm">ارسال پیام، نظر، ثبت‌نام رویداد و دسترسی کامل نیاز به ورود دارد.</p>
          </div>
          <Link
            to="/login"
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-6 py-3 rounded-lg shrink-0 transition-colors"
          >
            <LogIn size={15} /> ورود به پلتفرم
          </Link>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

// ─── FORUM — StackOverflow style ──────────────────────────────────────────────
const tagColor: Record<string, string> = {
  معماری:   "bg-blue-50   text-blue-700   border-blue-200",
  "بک‌اند": "bg-teal-50   text-teal-700   border-teal-200",
  "فرانت‌اند": "bg-purple-50 text-purple-700 border-purple-200",
  امنیت:    "bg-red-50    text-red-700    border-red-200",
  عمومی:    "bg-gray-50   text-gray-600   border-gray-200",
  فناوری:   "bg-amber-50  text-amber-700  border-amber-200",
};

function ForumSection({ items }: { items: ForumTopic[] }) {
  const [sort, setSort] = useState<"newest" | "oldest" | "hottest" | "views" | "replies">("newest");
  const [status, setStatus] = useState<"all" | "unanswered" | "solved" | "open">("all");
  const [q, setQ] = useState("");

  const filtered = items
    .filter((t) =>
      status === "unanswered" ? t.replies === 0 :
      status === "solved" ? t.solved :
      status === "open" ? !t.solved : true
    )
    .filter((t) => !q || t.title.includes(q) || t.author.includes(q));

  const sorted = [...filtered].sort((a, b) =>
    sort === "oldest" ? 0 :
    sort === "hottest" ? b.replies + b.views / 50 - (a.replies + a.views / 50) :
    sort === "views" ? b.views - a.views :
    sort === "replies" ? b.replies - a.replies : 0
  );
  const shown = sort === "oldest" ? [...sorted].reverse() : sorted;

  const totalAnswers = items.reduce((s, t) => s + t.replies, 0);
  const solvedCount = items.filter((t) => t.solved).length;

  return (
    <div className="px-4 lg:px-12 max-w-5xl mx-auto py-7">
      {/* سربرگ صفحه */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">سوالات عمومی انجمن</h1>
          <p className="text-sm text-ink-400 mt-1">
            {items.length.toLocaleString("fa-IR")} سوال &nbsp;·&nbsp; {totalAnswers.toLocaleString("fa-IR")} پاسخ &nbsp;·&nbsp; {solvedCount.toLocaleString("fa-IR")} حل‌شده
          </p>
        </div>
        {/* طرح سوال — پاسخ روشن به «سوال جدید از کجا؟»: نیاز به ورود دارد */}
        <Link
          to="/login"
          title="برای طرح سوال باید وارد حساب سازمانی شوید"
          className="btn bg-navy-900 text-white hover:bg-navy-800 text-[13px] px-4 py-2.5 shrink-0"
        >
          <MessagesSquare size={14} /> طرح سوال جدید
        </Link>
      </div>

      {/* جستجو + فیلترهای کشویی (به‌جای سه دکمه — مقیاس‌پذیر) */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-sm border border-ink-200 rounded-lg bg-white focus:outline-none focus:border-brand-400"
            placeholder="جستجو در سوالات…"
            aria-label="جستجو در سوالات"
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-ink-500">
          مرتب‌سازی:
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="text-xs border border-ink-200 rounded-lg px-2.5 py-2 bg-white outline-none focus:border-brand-400"
          >
            <option value="newest">جدیدترین</option>
            <option value="oldest">قدیمی‌ترین</option>
            <option value="hottest">داغ‌ترین</option>
            <option value="views">پربازدیدترین</option>
            <option value="replies">بیشترین پاسخ</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-ink-500">
          وضعیت:
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="text-xs border border-ink-200 rounded-lg px-2.5 py-2 bg-white outline-none focus:border-brand-400"
          >
            <option value="all">همه</option>
            <option value="unanswered">بدون پاسخ</option>
            <option value="solved">حل‌شده</option>
            <option value="open">باز</option>
          </select>
        </label>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<MessagesSquare size={20} />} title={q ? "سوالی با این مشخصات پیدا نشد" : "هنوز سوال عمومی‌ای ثبت نشده"} />
      ) : (
        <div className="bg-white rounded-xl border border-ink-200 divide-y divide-ink-100 overflow-hidden shadow-sm">
          {shown.map((t) => (
            <Link
              key={t.id}
              to={`/public/forum/${t.id}`}
              className="block px-5 py-4 hover:bg-ink-50/50 transition-colors group"
            >
              {/* همه‌ی اطلاعات یک سوال کنار هم — بدون ستون آمار جدا */}
              <h3 className="text-[15px] font-semibold text-brand-700 group-hover:text-brand-800 transition-colors leading-6">
                {t.title}
              </h3>
              <p className="text-[12px] text-ink-400 mt-1.5">
                <span className={`inline-block ml-1.5 text-[11px] font-medium px-2 py-0.5 rounded border align-middle ${tagColor[t.category] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                  {t.category}
                </span>
                {t.lastActivity} · توسط <span className="text-brand-600 font-medium">{t.author}</span>
              </p>
              <p className="text-[12px] text-ink-500 mt-2 flex items-center gap-4">
                <span className="font-semibold">{t.replies.toLocaleString("fa-IR")} پاسخ</span>
                <span>{t.views.toLocaleString("fa-IR")} بازدید</span>
                {t.solved ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><CheckCircle2 size={12} /> حل‌شده</span>
                ) : t.replies === 0 ? (
                  <span className="text-amber-700 font-medium">بدون پاسخ</span>
                ) : (
                  <span className="text-ink-400">باز</span>
                )}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAGAZINE TEMPLATE — shared by Blog & News ────────────────────────────────
type MagCard = {
  id: string; title: string; subtitle: string; meta: string;
  category: string; accent: string; to: string; featured?: boolean;
};

function MagazineLayout({ cards, emptyIcon, emptyTitle }: {
  cards: MagCard[]; emptyIcon: ReactNode; emptyTitle: string;
}) {
  const [visible, setVisible] = useState(9);
  if (cards.length === 0)
    return <div className="px-6 py-16 max-w-5xl mx-auto"><EmptyState icon={emptyIcon} title={emptyTitle} /></div>;

  const [hero, ...rest] = cards;

  return (
    <div className="px-4 lg:px-12 max-w-6xl mx-auto py-5 space-y-4">
      {/* Hero */}
      <Link
        to={hero.to}
        className="relative flex items-end min-h-44 md:min-h-48 rounded-2xl overflow-hidden group shadow-md"
        style={bgStyle(blogImg(hero.id), hero.accent)}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="relative p-6 md:p-8 max-w-2xl">
          <span className="inline-block text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full mb-3 backdrop-blur-sm">
            {hero.category}
          </span>
          <h2 className="text-2xl font-extrabold text-white leading-8 mb-2 group-hover:text-brand-200 transition-colors">
            {hero.title}
          </h2>
          <p className="text-white/70 text-sm leading-6 line-clamp-2 mb-4">{hero.subtitle}</p>
          <span className="text-white/80 text-xs font-medium">{hero.meta}</span>
        </div>
      </Link>

      {/* Grid */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rest.slice(0, visible).map((card) => (
            <Link
              key={card.id}
              to={card.to}
              className="group bg-white rounded-xl border border-ink-200 overflow-hidden hover:border-brand-300 hover:shadow-sm transition-all"
            >
              <div className="h-40 flex items-center justify-center relative" style={bgStyle(blogImg(card.id), card.accent)}>
                {!blogImg(card.id) && <span className="text-white/20 font-black text-6xl select-none">{card.title.slice(0, 1)}</span>}
                <span className="absolute inset-0 bg-black/20" />
                <span className="absolute top-3 right-3 text-[11px] font-semibold bg-white/90 text-ink-700 px-2.5 py-0.5 rounded-full">
                  {card.category}
                </span>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-bold text-ink-900 leading-6 mb-1.5 line-clamp-2 group-hover:text-brand-700 transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-ink-400 line-clamp-2 leading-5">{card.subtitle}</p>
                <p className="text-xs text-ink-500 mt-3 pt-3 border-t border-ink-100">{card.meta}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* صفحه‌بندی — کاربر بداند به انتهای فهرست رسیده یا نه */}
      {rest.length > visible ? (
        <div className="text-center pt-1">
          <button
            onClick={() => setVisible((v) => v + 9)}
            className="btn bg-white border border-ink-200 text-ink-700 hover:bg-ink-50 text-sm px-6 py-2.5"
          >
            مشاهده بیشتر ({(rest.length - visible).toLocaleString("fa-IR")} مورد دیگر)
          </button>
        </div>
      ) : rest.length > 6 ? (
        <p className="text-center text-[11.5px] text-ink-400 pt-1">— پایان فهرست —</p>
      ) : null}
    </div>
  );
}

// Accent palette
const accents = ["#1f4f99", "#0d9488", "#7c3aed", "#b45309", "#0f172a", "#dc2626"];

function BlogSection({ items }: { items: BlogPost[] }) {
  // یک سلسله‌مراتب روشن: هیرو → فهرست. کارت‌های تکراری «پربازدیدترین» حذف و به تب تبدیل شدند.
  const [tab, setTab] = useState<"newest" | "top">("newest");
  const [cat, setCat] = useState<string>("همه");
  const [q, setQ] = useState("");

  const categories = ["همه", ...Array.from(new Set(items.flatMap((b) => b.tags)))];

  const filtered = items
    .filter((b) => cat === "همه" || b.tags.includes(cat))
    .filter((b) => !q || b.title.includes(q) || b.excerpt.includes(q) || b.author.includes(q));

  const ordered = [...filtered].sort((a, b) =>
    tab === "top" ? b.rating - a.rating : (a.date < b.date ? 1 : -1)
  );

  const cards: MagCard[] = ordered.map((b, i) => ({
    id: b.id, title: b.title, subtitle: b.excerpt,
    meta: `${b.author} · ${b.date} · ★ ${b.rating.toLocaleString("fa-IR")}`,
    category: b.tags[0] ?? "مقاله",
    accent: accents[i % accents.length],
    to: `/public/blog/${b.id}`,
  }));

  return (
    <div>
      <div className="px-4 lg:px-12 max-w-6xl mx-auto pt-7">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-ink-900">بلاگ</h1>
            <p className="text-sm text-ink-400 mt-1">{items.length.toLocaleString("fa-IR")} یادداشت عمومی</p>
          </div>
          <div className="relative w-64 max-w-full">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pr-9 pl-4 py-2 text-sm border border-ink-200 rounded-lg bg-white focus:outline-none focus:border-brand-400"
              placeholder="جستجو در یادداشت‌ها…"
              aria-label="جستجو در بلاگ"
            />
          </div>
        </div>

        {/* تب مرتب‌سازی + دسته‌بندی‌های قابل کلیک */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <div className="flex items-center gap-1 bg-white border border-ink-200 rounded-lg p-1 shadow-sm">
            {([["newest", "جدیدترین"], ["top", "پرامتیازترین"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === k ? "bg-navy-900 text-white" : "text-ink-500 hover:bg-ink-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  cat === c ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-600 border-ink-200 hover:border-brand-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
      <MagazineLayout cards={cards} emptyIcon={<NotebookPen size={20} />} emptyTitle={q || cat !== "همه" ? "یادداشتی با این مشخصات پیدا نشد" : "هنوز یادداشت عمومی‌ای منتشر نشده"} />
    </div>
  );
}

// ─── NEWS — سلسله‌مراتب نزولی + برجسته‌ها + آرشیو ماهانه ─────────────────────
const jMonths = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const faToNum = (s: string) => Number(s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
const monthOf = (date: string) => faToNum(date.split("/")[1] ?? "0");

function NewsSection({ items }: { items: NewsItem[] }) {
  const [month, setMonth] = useState<number | null>(null);
  const [q, setQ] = useState("");

  const sorted = [...items].sort((a, b) => (a.date < b.date ? 1 : -1)); // جدیدترین اول
  const filtered = sorted
    .filter((n) => month === null || monthOf(n.date) === month)
    .filter((n) => !q || n.title.includes(q) || n.summary.includes(q));

  // فقط شناسه‌ها — برای تگ‌های کوچکِ ارجاعی روی کارت‌های استاندارد (نه کارت رنگی هم‌وزن هیرو)
  const mostViewedId = [...items].sort((a, b) => b.views - a.views)[0]?.id;
  const mostDiscussedId = [...items].sort((a, b) => b.comments - a.comments)[0]?.id;

  // یک خبر شاخص: سنجاق‌شده اگر بود، وگرنه جدیدترین
  const heroPick = filtered.find((n) => n.pinned) ?? filtered[0];
  const rest = filtered.filter((n) => n.id !== heroPick?.id);
  const second = rest.slice(0, 2);
  const others = rest.slice(2);

  const refTag = (n: NewsItem) =>
    n.id === mostViewedId ? { label: "پربازدیدترین", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" } :
    n.id === mostDiscussedId ? { label: "داغ‌ترین گفتگو", cls: "bg-amber-50 text-amber-700 border-amber-200" } : null;

  if (items.length === 0)
    return <div className="px-6 py-16 max-w-5xl mx-auto"><EmptyState icon={<Newspaper size={20} />} title="هنوز خبر عمومی‌ای منتشر نشده" /></div>;

  return (
    <div className="px-4 lg:px-12 max-w-6xl mx-auto py-5 space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">اخبار بنیاد</h1>
          <p className="text-sm text-ink-400 mt-1">{items.length.toLocaleString("fa-IR")} خبر عمومی</p>
        </div>
        <div className="relative w-64 max-w-full">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-sm border border-ink-200 rounded-lg bg-white focus:outline-none focus:border-brand-400"
            placeholder="جستجو در اخبار…"
            aria-label="جستجو در اخبار"
          />
        </div>
      </div>

      {/* آرشیو ماهانه */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setMonth(null)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${month === null ? "bg-navy-900 text-white border-navy-900" : "bg-white text-ink-500 border-ink-200 hover:bg-ink-50"}`}
        >
          همه‌ی سال
        </button>
        {jMonths.map((m, i) => {
          const count = items.filter((n) => monthOf(n.date) === i + 1).length;
          return (
            <button
              key={m}
              onClick={() => setMonth(month === i + 1 ? null : i + 1)}
              disabled={count === 0}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
                month === i + 1 ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-600 border-ink-200 hover:border-brand-300"
              }`}
            >
              {m}{count > 0 && <span className="mr-1 text-[10px] opacity-70">({count.toLocaleString("fa-IR")})</span>}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Newspaper size={20} />} title={q ? "خبری با این مشخصات پیدا نشد" : "در این ماه خبری منتشر نشده"} />
      ) : (
        <>
          {/* تنها یک خبر شاخص — بدون رقابت بصری با کارت‌های هم‌وزن */}
          {heroPick && (
            <Link
              to={`/public/news/${heroPick.id}`}
              className="relative flex items-end min-h-64 rounded-2xl overflow-hidden group shadow-md"
              style={bgStyle(newsImg(heroPick.id), accents[0])}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="relative p-6 md:p-9 max-w-3xl">
                <span className="inline-block text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full mb-3 backdrop-blur-sm">
                  {heroPick.pinned ? "اطلاعیه مهم" : "خبر شاخص"}
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white leading-10 mb-2 group-hover:text-brand-200 transition-colors">
                  {heroPick.title}
                </h2>
                <p className="text-white/70 text-sm leading-7 line-clamp-2 mb-3">{heroPick.summary}</p>
                <span className="text-white/80 text-xs font-medium flex items-center gap-3">
                  {heroPick.date} <span>· {heroPick.views.toLocaleString("fa-IR")} بازدید</span> <span>· {heroPick.comments.toLocaleString("fa-IR")} نظر</span>
                </span>
              </div>
            </Link>
          )}

          {/* سطح ۲ */}
          {second.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {second.map((n, i) => {
                const tag = refTag(n);
                return (
                  <Link
                    key={n.id}
                    to={`/public/news/${n.id}`}
                    className="relative flex items-end min-h-40 rounded-xl overflow-hidden group shadow-sm"
                    style={bgStyle(newsImg(n.id), accents[(i + 1) % accents.length])}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    {tag && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold bg-white/90 text-ink-700 border border-white px-2 py-0.5 rounded-full">
                        {tag.label}
                      </span>
                    )}
                    <div className="relative p-5">
                      <h3 className="text-base font-extrabold text-white leading-7 line-clamp-2 group-hover:text-brand-200 transition-colors">{n.title}</h3>
                      <p className="text-white/70 text-[11px] mt-2 font-medium">{n.date} · {n.views.toLocaleString("fa-IR")} بازدید</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* سطح ۳ */}
          {others.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {others.map((n) => {
                const tag = refTag(n);
                return (
                  <Link key={n.id} to={`/public/news/${n.id}`} className="group bg-white rounded-xl border border-ink-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all">
                    {tag && (
                      <span className={`inline-block text-[10px] font-bold border px-2 py-0.5 rounded-full mb-2 ${tag.cls}`}>{tag.label}</span>
                    )}
                    <p className="text-[13px] font-bold text-ink-900 leading-6 line-clamp-2 group-hover:text-brand-700 transition-colors">{n.title}</p>
                    <p className="text-xs text-ink-500 mt-2.5 pt-2.5 border-t border-ink-50 flex items-center gap-2">
                      {n.date} <span>· {n.views.toLocaleString("fa-IR")} بازدید</span>
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── MEDIA — Gallery ──────────────────────────────────────────────────────────
// مدت‌زمان نمایشی ویدیو — قطعی از روی شناسه تا هر بار یکسان بماند
const mockDuration = (id: string) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  const mins = 1 + (h % 12);
  const secs = h % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

function MediaSection({ items }: { items: MediaItem[] }) {
  const [filter, setFilter] = useState<"all" | "photo" | "video">("all");
  const [topic, setTopic] = useState<string>("همه");
  const [sort, setSort] = useState<"newest" | "oldest" | "rating">("newest");
  const [q, setQ] = useState("");

  const topics = ["همه", ...Array.from(new Set(items.map((m) => m.album)))];
  const filtered = items
    .filter((m) => (filter === "all" ? true : m.kind === filter))
    .filter((m) => (topic === "همه" ? true : m.album === topic))
    .filter((m) => !q || m.title.includes(q) || m.album.includes(q) || m.uploadedBy.includes(q));
  const sorted = [...filtered].sort((a, b) =>
    sort === "rating" ? b.rating - a.rating :
    sort === "oldest" ? (a.date > b.date ? 1 : -1) : (a.date < b.date ? 1 : -1)
  );

  return (
    <div className="px-4 lg:px-12 max-w-6xl mx-auto py-7">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold text-ink-900">گالری رسانه‌ی عمومی</h1>
        <div className="relative w-64 max-w-full">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-sm border border-ink-200 rounded-lg bg-white focus:outline-none focus:border-brand-400"
            placeholder="جستجو در گالری…"
            aria-label="جستجو در گالری رسانه"
          />
        </div>
      </div>

      {/* فیلترهای برچسب‌دار — تا «همه»ی دو فیلتر با هم اشتباه نشود */}
      <div className="flex items-center gap-x-5 gap-y-2 flex-wrap mb-3">
        <label className="flex items-center gap-2 text-xs font-medium text-ink-500">
          نوع محتوا:
          <span className="flex items-center gap-1 bg-white border border-ink-200 rounded-lg p-1 shadow-sm">
            {(["all", "photo", "video"] as const).map((k) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filter === k ? "bg-navy-900 text-white" : "text-ink-500 hover:bg-ink-50"
                }`}
              >
                {k === "all" ? "همه" : k === "photo" ? "تصاویر" : "ویدیو"}
              </button>
            ))}
          </span>
        </label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
          مرتب‌سازی:
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="text-xs border border-ink-200 rounded-lg px-2.5 py-2 bg-white outline-none focus:border-brand-400"
          >
            <option value="newest">جدیدترین</option>
            <option value="oldest">قدیمی‌ترین</option>
            <option value="rating">پرامتیازترین</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-5">
        <span className="text-xs font-medium text-ink-500">موضوع:</span>
        {topics.map((t) => {
          const count = t === "همه" ? items.length : items.filter((m) => m.album === t).length;
          return (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                topic === t ? "bg-brand-600 text-white border-brand-600" : "bg-white text-ink-600 border-ink-200 hover:border-brand-300"
              }`}
            >
              {t} <span className="text-[10px] opacity-70">({count.toLocaleString("fa-IR")})</span>
            </button>
          );
        })}
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={<ImageIcon size={20} />} title={q ? "رسانه‌ای با این مشخصات پیدا نشد" : "هنوز رسانه‌ی عمومی‌ای بارگذاری نشده"} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map((m) => (
            <Link key={m.id} to={`/public/media/${m.id}`}
              className="group bg-white rounded-xl border border-ink-200 overflow-hidden hover:border-brand-300 hover:shadow-md transition-all"
            >
              <div className="h-44 flex items-center justify-center relative" style={bgStyle(mediaImg(m.id), m.color)}>
                <span className="absolute inset-0 bg-black/25" />
                {m.kind === "video"
                  ? <PlayCircle size={44} className="text-white/80 group-hover:text-white transition-colors" />
                  : <ImageIcon  size={44} className="text-white/80 group-hover:text-white transition-colors" />}
                <span className="absolute top-3 right-3 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-black/50 text-white">
                  {m.kind === "video" ? "ویدیو" : "تصویر"}
                </span>
                {m.kind === "video" && (
                  <span className="absolute bottom-3 right-3 text-[11px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-md" dir="ltr">
                    {mockDuration(m.id)}
                  </span>
                )}
                <span className="absolute bottom-3 left-3 flex items-center gap-1 text-white text-[11px] font-semibold bg-black/30 px-2 py-0.5 rounded-md">
                  <Star size={10} className="fill-amber-400 text-amber-400" /> {m.rating.toLocaleString("fa-IR")}
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-ink-900 group-hover:text-brand-700 transition-colors leading-6 line-clamp-2">{m.title}</p>
                <p className="text-xs text-ink-400 mt-0.5">{m.album}</p>
                <p className="text-xs text-ink-500 mt-2 font-medium">{m.uploadedBy} · {m.date}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── EVENTS — Evand style ─────────────────────────────────────────────────────
// «امروزِ» نمایشی سامانه — مبنای تشخیص رویداد آینده/گذشته
const TODAY_KEY = 14050513; // ۱۴۰۵/۰۵/۱۳
const dateKey = (jalali: string) => {
  const [y, m, d] = jalali.split("/").map(faToNum);
  return (y || 0) * 10000 + (m || 0) * 100 + (d || 0);
};
const eventStatus = (e: EventItem): { label: string; cls: string; upcoming: boolean } => {
  const k = dateKey(e.jalaliDate);
  if (k > TODAY_KEY) return { label: "در حال ثبت‌نام", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", upcoming: true };
  if (k === TODAY_KEY) return { label: "امروز برگزار می‌شود", cls: "bg-brand-50 text-brand-700 border-brand-200", upcoming: true };
  return { label: "برگزار شده", cls: "bg-ink-100 text-ink-500 border-ink-200", upcoming: false };
};
// ظرفیت نمایشی — قطعی از روی شناسه
const mockCapacity = (e: EventItem) => {
  let h = 0;
  for (const ch of e.id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return e.attendees + 20 + (h % 80);
};

function EventsSection({ items }: { items: EventItem[] }) {
  const { notify } = useToast();
  const [time, setTime] = useState<"all" | "upcoming" | "past">("all");
  const [mode, setMode] = useState<"all" | "حضوری" | "آنلاین">("all");
  const [q, setQ] = useState("");

  const filtered = items
    .filter((e) => (time === "all" ? true : time === "upcoming" ? eventStatus(e).upcoming : !eventStatus(e).upcoming))
    .filter((e) => (mode === "all" ? true : e.mode === mode))
    .filter((e) => !q || e.title.includes(q) || e.location.includes(q));

  // هیرو = نزدیک‌ترین رویدادِ پیشِ رو؛ اگر نبود، آخرین برگزارشده
  const upcoming = filtered.filter((e) => eventStatus(e).upcoming).sort((a, b) => dateKey(a.jalaliDate) - dateKey(b.jalaliDate));
  const past = filtered.filter((e) => !eventStatus(e).upcoming).sort((a, b) => dateKey(b.jalaliDate) - dateKey(a.jalaliDate));
  const featured = upcoming[0] ?? past[0];
  const upcomingRest = upcoming.filter((e) => e.id !== featured?.id);
  const pastRest = past.filter((e) => e.id !== featured?.id);

  const share = (e: EventItem) => {
    const url = `${window.location.origin}/#/public/events/${e.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => notify("پیوند رویداد کپی شد.", "success"));
    } else {
      notify(url, "info");
    }
  };

  const Row = ({ e, dimmed }: { e: EventItem; dimmed?: boolean }) => {
    const st = eventStatus(e);
    return (
      <Link
        to={`/public/events/${e.id}`}
        className={`group bg-white rounded-xl border border-ink-200 p-4 flex items-center gap-4 hover:border-brand-300 hover:shadow-sm transition-all ${dimmed ? "opacity-75" : ""}`}
      >
        <div className={`w-14 h-14 rounded-xl text-white flex flex-col items-center justify-center shrink-0 ${dimmed ? "bg-ink-300" : "bg-navy-900"}`}>
          <span className={`text-[9px] leading-none ${dimmed ? "text-white/70" : "text-navy-400"}`}>{e.jalaliDate.split("/")[1] ?? "—"}</span>
          <span className="text-base font-bold leading-tight">{e.jalaliDate.split("/")[2] ?? "—"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-ink-900 group-hover:text-brand-700 transition-colors truncate">
            {e.title}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-ink-400 flex-wrap">
            <span className={`font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
            <span className={`font-bold px-2 py-0.5 rounded-full ${e.mode === "آنلاین" ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-600"}`}>{e.mode}</span>
            <span className="flex items-center gap-1"><Clock  size={11} /> {e.time}</span>
            <span className="flex items-center gap-1"><MapPin size={11} /> {e.location}</span>
            <span className="flex items-center gap-1"><Users  size={11} /> {e.attendees.toLocaleString("fa-IR")} از {mockCapacity(e).toLocaleString("fa-IR")} ظرفیت</span>
          </div>
        </div>
        <ArrowLeft size={14} className="text-ink-300 group-hover:text-brand-500 transition-colors shrink-0" />
      </Link>
    );
  };

  return (
    <div className="px-4 lg:px-12 max-w-4xl mx-auto py-7 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">رویدادها و جلسات عمومی</h1>
          <p className="text-sm text-ink-400 mt-1">{items.length.toLocaleString("fa-IR")} رویداد عمومی</p>
        </div>
        <div className="relative w-64 max-w-full">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-sm border border-ink-200 rounded-lg bg-white focus:outline-none focus:border-brand-400"
            placeholder="جستجو در رویدادها…"
            aria-label="جستجو در رویدادها"
          />
        </div>
      </div>

      {/* فیلترها */}
      <div className="flex items-center gap-x-5 gap-y-2 flex-wrap">
        <label className="flex items-center gap-2 text-xs font-medium text-ink-500">
          زمان:
          <span className="flex items-center gap-1 bg-white border border-ink-200 rounded-lg p-1 shadow-sm">
            {([["all", "همه"], ["upcoming", "آینده"], ["past", "گذشته"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTime(k)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${time === k ? "bg-navy-900 text-white" : "text-ink-500 hover:bg-ink-50"}`}
              >
                {label}
              </button>
            ))}
          </span>
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-ink-500">
          نوع برگزاری:
          <span className="flex items-center gap-1 bg-white border border-ink-200 rounded-lg p-1 shadow-sm">
            {(["all", "حضوری", "آنلاین"] as const).map((k) => (
              <button key={k} onClick={() => setMode(k)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === k ? "bg-navy-900 text-white" : "text-ink-500 hover:bg-ink-50"}`}
              >
                {k === "all" ? "همه" : k}
              </button>
            ))}
          </span>
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<CalendarDays size={20} />} title={q ? "رویدادی با این مشخصات پیدا نشد" : "هنوز رویداد عمومی‌ای منتشر نشده"} />
      ) : (
        <>
          {/* رویداد شاخص = نزدیک‌ترین رویداد پیشِ رو */}
          {featured && (
            <div className="bg-white rounded-2xl border border-ink-200 overflow-hidden shadow-sm">
              <Link to={`/public/events/${featured.id}`} className="block group">
                <div className="relative p-6 lg:p-8 flex items-start gap-5" style={bgStyle(eventImg(featured.id), "#182536")}>
                  <span className="absolute inset-0 bg-navy-900/80" />
                  <div className="relative w-20 h-20 rounded-2xl bg-brand-500 text-white flex flex-col items-center justify-center shrink-0 shadow-lg">
                    <span className="text-xs text-brand-100 font-medium leading-none">{featured.jalaliDate.split("/")[1] ?? "—"}</span>
                    <span className="text-3xl font-black leading-tight">{featured.jalaliDate.split("/")[2] ?? "—"}</span>
                    <span className="text-[10px] text-brand-200 leading-none mt-0.5">{featured.jalaliDate.split("/")[0]}</span>
                  </div>
                  <div className="relative min-w-0">
                    <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full border mb-2 bg-white/95 ${eventStatus(featured).upcoming ? "text-emerald-700 border-emerald-200" : "text-ink-500 border-ink-200"}`}>
                      {eventStatus(featured).upcoming ? "رویداد بعدی — " + eventStatus(featured).label : "آخرین رویداد برگزارشده"}
                    </span>
                    <h2 className="text-xl font-extrabold text-white group-hover:text-brand-200 transition-colors leading-7 mb-3">
                      {featured.title}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-navy-300 flex-wrap">
                      <span className="flex items-center gap-1.5"><Clock    size={13} /> {featured.time}</span>
                      <span className="flex items-center gap-1.5"><MapPin   size={13} /> {featured.location}</span>
                      <span className="flex items-center gap-1.5"><Users    size={13} /> {featured.attendees.toLocaleString("fa-IR")} از {mockCapacity(featured).toLocaleString("fa-IR")} ظرفیت</span>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${featured.mode === "آنلاین" ? "bg-brand-500/30 text-brand-200" : "bg-white/10 text-white"}`}>
                        {featured.mode}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-5 lg:px-7 pt-5">
                  <p className="text-sm text-ink-600 leading-7">{featured.description}</p>
                </div>
              </Link>
              {/* CTAهای واقعی رویداد */}
              <div className="p-5 lg:px-7 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {featured.hashtags.map((h) => (
                    <span key={h} className="text-[11px] bg-ink-100 text-ink-500 px-2 py-0.5 rounded-md">#{h}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {eventStatus(featured).upcoming && (
                    <Link to="/login" title="ثبت‌نام نیاز به ورود دارد" className="btn bg-brand-500 text-white hover:bg-brand-600 text-[13px] px-4 py-2">
                      ثبت‌نام در رویداد
                    </Link>
                  )}
                  <button
                    onClick={() => notify("رویداد به تقویم شما اضافه شد. (نمایشی)", "success")}
                    className="btn bg-white border border-ink-200 text-ink-700 hover:bg-ink-50 text-[13px] px-3.5 py-2"
                  >
                    <CalendarDays size={13} /> افزودن به تقویم
                  </button>
                  <button
                    onClick={() => share(featured)}
                    className="btn bg-white border border-ink-200 text-ink-700 hover:bg-ink-50 text-[13px] px-3.5 py-2"
                  >
                    <Share2 size={13} /> اشتراک‌گذاری
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* گروه‌بندی زمانی: پیشِ رو / برگزارشده */}
          {upcomingRest.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-ink-500">رویدادهای پیشِ رو</p>
              {upcomingRest.map((e) => <Row key={e.id} e={e} />)}
            </div>
          )}
          {pastRest.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-ink-400">برگزارشده</p>
              {pastRest.map((e) => <Row key={e.id} e={e} dimmed />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── KNOWLEDGE — KB / Docs style ──────────────────────────────────────────────
const typeTone: Record<string, BadgeTone> = {
  قرارداد: "warning", آموزشی: "success", "صورت‌جلسه": "neutral", گزارش: "brand",
};

const kbCategories = [
  { type: "آموزشی",    label: "اسناد آموزشی",  icon: BookOpen,  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { type: "گزارش",     label: "گزارش‌ها",       icon: FileText,  cls: "bg-brand-50 text-brand-700 border-brand-200"     },
  { type: "قرارداد",   label: "قراردادها",      icon: FileText,  cls: "bg-amber-50 text-amber-700 border-amber-200"     },
  { type: "صورت‌جلسه", label: "صورت‌جلسات",     icon: FileText,  cls: "bg-ink-50 text-ink-600 border-ink-200"           },
];

function KnowledgeSection({ items }: { items: KnowledgeDoc[] }) {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<string>("همه");
  const [sort, setSort] = useState<"newest" | "oldest" | "title">("newest");

  const filtered = items
    .filter((d) => {
      const matchType   = activeType === "همه" || d.type === activeType;
      const matchSearch = !search || d.title.includes(search) || d.owner.includes(search);
      return matchType && matchSearch;
    })
    .sort((a, b) =>
      sort === "title" ? a.title.localeCompare(b.title, "fa") :
      sort === "oldest" ? (a.updatedAt > b.updatedAt ? 1 : -1) : (a.updatedAt < b.updatedAt ? 1 : -1)
    );

  return (
    <div className="px-4 lg:px-12 max-w-5xl mx-auto py-7 space-y-6">
      {/* Hero search */}
      <div className="bg-gradient-to-l from-navy-800 to-navy-900 rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-extrabold text-white mb-2">بانک دانش عمومی بنیاد مستضعفان</h1>
        <p className="text-navy-300 text-sm mb-6">مستندات آموزشی، گزارش‌ها و اسناد عمومی سازمان</p>
        <div className="relative max-w-lg mx-auto">
          <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-11 pl-4 py-3 text-sm border border-ink-200 rounded-xl bg-white focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            placeholder="جستجو در عنوان سند یا نام مالک…"
          />
        </div>
      </div>

      {/* دسته‌ها — با حالتِ فعالِ روشن تا با کارتِ محتوا اشتباه نشوند */}
      <p className="text-xs font-medium text-ink-500 -mb-3">فیلتر بر اساس نوع سند{activeType !== "همه" && <button onClick={() => setActiveType("همه")} className="mr-2 text-brand-600 hover:underline">(حذف فیلتر)</button>}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kbCategories.map((cat) => {
          const count  = items.filter((d) => d.type === cat.type).length;
          const active = activeType === cat.type;
          return (
            <button
              key={cat.type}
              onClick={() => setActiveType(active ? "همه" : cat.type)}
              className={`p-4 rounded-xl border text-right transition-all ${
                active ? cat.cls + " shadow-sm" : "bg-white border-ink-200 text-ink-600 hover:bg-ink-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <cat.icon size={20} className="mb-2 opacity-60" />
                {active && <CheckCircle2 size={15} className="opacity-80" />}
              </div>
              <p className="text-sm font-semibold">{cat.label}</p>
              <p className="text-xs mt-0.5 opacity-60">{count.toLocaleString("fa-IR")} سند</p>
            </button>
          );
        })}
      </div>

      {/* Document list */}
      <div className="flex items-center justify-between gap-3 flex-wrap -mb-2">
        <p className="text-xs text-ink-400">
          {filtered.length.toLocaleString("fa-IR")} سند
          {activeType !== "همه" && ` در دسته‌ی «${kbCategories.find((c) => c.type === activeType)?.label ?? activeType}»`}
        </p>
        <label className="flex items-center gap-1.5 text-xs text-ink-500">
          مرتب‌سازی:
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="text-xs border border-ink-200 rounded-lg px-2.5 py-2 bg-white outline-none focus:border-brand-400"
          >
            <option value="newest">آخرین به‌روزرسانی</option>
            <option value="oldest">قدیمی‌ترین</option>
            <option value="title">عنوان (الفبا)</option>
          </select>
        </label>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={<BookOpen size={20} />} title="سندی با این مشخصات پیدا نشد" />
      ) : (
        <div className="bg-white rounded-xl border border-ink-200 divide-y divide-ink-100 overflow-hidden shadow-sm">
          {filtered.map((d) => (
            <Link
              key={d.id}
              to={`/public/knowledge/${d.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-ink-50/50 transition-colors group"
            >
              <span className="w-10 h-10 rounded-lg bg-ink-50 border border-ink-100 flex items-center justify-center shrink-0 text-ink-400 group-hover:text-brand-600 transition-colors">
                <FileText size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-900 group-hover:text-brand-700 transition-colors truncate">{d.title}</p>
                <p className="text-xs text-ink-400 mt-0.5">{d.category} · مالک: {d.owner} · {d.updatedAt}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tone={typeTone[d.type]}>{d.type}</Badge>
                <ChevronLeft size={14} className="text-ink-300 group-hover:text-brand-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── GROUPS ───────────────────────────────────────────────────────────────────
function GroupsSection({ items }: { items: Group[] }) {
  const [sort, setSort] = useState<"members" | "created" | "activity">("activity");
  const sortedItems = [...items].sort((a, b) =>
    sort === "members" ? b.members - a.members :
    sort === "created" ? (a.createdAt < b.createdAt ? 1 : -1) :
    (a.lastActivityAt < b.lastActivityAt ? 1 : -1)
  );

  return (
    <div className="px-4 lg:px-12 max-w-5xl mx-auto py-7">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold text-ink-900">گروه‌های عمومی</h1>
        <div className="flex items-center gap-1 bg-white border border-ink-200 rounded-lg p-1 shadow-sm">
          {([["activity", "آخرین فعالیت"], ["members", "بیشترین عضو"], ["created", "جدیدترین گروه"]] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${sort === k ? "bg-navy-900 text-white" : "text-ink-500 hover:bg-ink-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Users size={20} />} title="هنوز گروه عمومی‌ای منتشر نشده" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedItems.map((g) => (
            <Link
              key={g.id}
              to={`/public/groups/${g.id}`}
              className="group bg-white rounded-xl border border-ink-200 p-5 hover:border-brand-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                  style={{ backgroundColor: g.color }}
                >
                  {g.name.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-ink-900 group-hover:text-brand-700 transition-colors truncate">{g.name}</h3>
                  <p className="text-xs text-ink-400">{g.category}</p>
                </div>
              </div>
              <p className="text-xs text-ink-500 leading-6 line-clamp-2 mb-3">{g.description}</p>
              <div className="grid grid-cols-3 gap-1 pt-3 border-t border-ink-100 text-[10.5px] text-ink-400">
                <span className="flex flex-col"><b className="text-ink-700 text-[12px]">{g.members.toLocaleString("fa-IR")}</b> عضو</span>
                <span className="flex flex-col"><b className="text-ink-700 text-[12px]">{g.createdAt.split("/")[0]}</b> سال ساخت</span>
                <span className="flex flex-col"><b className="text-ink-700 text-[11px] leading-4">{g.lastActivityRel}</b> فعالیت</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
