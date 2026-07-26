import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  LogIn, Layers, MessagesSquare, NotebookPen, CalendarDays,
  Image as ImageIcon, BookOpen, Newspaper, Users, CheckCircle2,
  Star, MapPin, PlayCircle,
  FileText, ArrowLeft, Clock, Search, ChevronLeft,
} from "lucide-react";
import type { ReactNode } from "react";
import { useContent } from "../context/ContentContext";
import SiteHeader from "../components/SiteHeader";
import CreditFooter from "../components/CreditFooter";
import Badge, { type BadgeTone } from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
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

      <footer className="bg-navy-950 py-4 text-center text-xs text-navy-400">
        <p className="flex items-center justify-center gap-2">
          <Layers size={12} /> بنیاد مستضعفان — پروتوتایپ داخلی — داده‌های این نسخه نمایشی است.
        </p>
        <CreditFooter dark />
      </footer>
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
  const [sort, setSort] = useState<"newest" | "active" | "unanswered">("newest");

  const sorted = [...items].sort((a, b) =>
    sort === "unanswered" ? a.replies - b.replies :
    sort === "active"     ? b.replies - a.replies : 0
  );

  const totalAnswers = items.reduce((s, t) => s + t.replies, 0);
  const solvedCount  = items.filter((t) => t.solved).length;

  return (
    <div className="px-4 lg:px-12 max-w-5xl mx-auto py-7">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">سوالات عمومی انجمن</h1>
          <p className="text-sm text-ink-400 mt-1">
            {items.length.toLocaleString("fa-IR")} سوال &nbsp;·&nbsp; {totalAnswers.toLocaleString("fa-IR")} پاسخ &nbsp;·&nbsp; {solvedCount.toLocaleString("fa-IR")} حل‌شده
          </p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="pr-9 pl-4 py-2 text-sm border border-ink-200 rounded-lg bg-white focus:outline-none focus:border-brand-400 w-52"
            placeholder="جستجو در سوالات…"
          />
        </div>
      </div>

      {/* Sort bar */}
      <div className="flex items-center gap-1 mb-4">
        {(["newest", "active", "unanswered"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setSort(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              sort === f
                ? "bg-navy-900 text-white border-navy-900"
                : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
            }`}
          >
            {f === "newest" ? "جدیدترین" : f === "active" ? "پرفعالیت‌ترین" : "بدون پاسخ"}
          </button>
        ))}
      </div>

      {/* داغ‌ترین گفتگوها */}
      {items.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {[...items].sort((a, b) => b.replies - a.replies).slice(0, 2).map((t) => (
            <Link key={t.id} to={`/public/forum/${t.id}`} className="group rounded-xl bg-gradient-to-l from-navy-800 to-navy-900 p-4 text-white shadow-sm hover:shadow-md transition-shadow">
              <span className="inline-block text-[10.5px] font-bold bg-rose-500/25 text-rose-300 rounded-full px-2.5 py-1 mb-2">🔥 داغ‌ترین گفتگو</span>
              <p className="text-[13px] font-bold leading-6 line-clamp-2 group-hover:underline">{t.title}</p>
              <p className="text-[10.5px] text-navy-300 mt-2">{t.replies.toLocaleString("fa-IR")} پاسخ · {t.views.toLocaleString("fa-IR")} بازدید · {t.author}</p>
            </Link>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={<MessagesSquare size={20} />} title="هنوز سوال عمومی‌ای ثبت نشده" />
      ) : (
        <div className="bg-white rounded-xl border border-ink-200 divide-y divide-ink-100 overflow-hidden shadow-sm">
          {sorted.map((t) => (
            <Link
              key={t.id}
              to={`/public/forum/${t.id}`}
              className="flex hover:bg-ink-50/50 transition-colors group"
            >
              {/* Stats sidebar */}
              <div className="flex flex-col items-center gap-2 w-28 shrink-0 px-3 py-4 border-l border-ink-100 bg-ink-50/40 text-center">
                <div>
                  <p className="text-xl font-bold text-ink-800 leading-tight">{t.replies.toLocaleString("fa-IR")}</p>
                  <p className="text-[10px] text-ink-400 mt-0.5">پاسخ</p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                  t.solved
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-white text-ink-400 border-ink-200"
                }`}>
                  {t.solved ? <span className="flex items-center gap-1"><CheckCircle2 size={10} />حل‌شده</span> : "باز"}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-500">{t.views.toLocaleString("fa-IR")}</p>
                  <p className="text-[10px] text-ink-400">بازدید</p>
                </div>
              </div>

              {/* Question body */}
              <div className="flex-1 px-5 py-4 min-w-0">
                <h3 className="text-[15px] font-semibold text-brand-700 group-hover:text-brand-800 transition-colors leading-6 mb-2.5">
                  {t.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${tagColor[t.category] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                    {t.category}
                  </span>
                  <span className="text-[11px] text-ink-400 mr-auto">
                    پرسش توسط <span className="text-brand-600 font-medium">{t.author}</span> · {t.lastActivity}
                  </span>
                </div>
              </div>
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
  if (cards.length === 0)
    return <div className="px-6 py-16 max-w-5xl mx-auto"><EmptyState icon={emptyIcon} title={emptyTitle} /></div>;

  const [hero, ...rest] = cards;

  return (
    <div className="px-4 lg:px-12 max-w-6xl mx-auto py-7 space-y-6">
      {/* Hero */}
      <Link
        to={hero.to}
        className="relative flex items-end min-h-64 rounded-2xl overflow-hidden group shadow-md"
        style={bgStyle(blogImg(hero.id), hero.accent)}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="relative p-7 md:p-10 max-w-2xl">
          <span className="inline-block text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full mb-3 backdrop-blur-sm">
            {hero.category}
          </span>
          <h2 className="text-2xl font-extrabold text-white leading-8 mb-2 group-hover:text-brand-200 transition-colors">
            {hero.title}
          </h2>
          <p className="text-white/70 text-sm leading-6 line-clamp-2 mb-4">{hero.subtitle}</p>
          <span className="text-white/50 text-xs">{hero.meta}</span>
        </div>
      </Link>

      {/* Grid */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rest.map((card) => (
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
                <p className="text-[11px] text-ink-300 mt-3 pt-3 border-t border-ink-100">{card.meta}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Accent palette
const accents = ["#1f4f99", "#0d9488", "#7c3aed", "#b45309", "#0f172a", "#dc2626"];

function BlogSection({ items }: { items: BlogPost[] }) {
  const topRated = [...items].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const cards: MagCard[] = items.map((b, i) => ({
    id: b.id, title: b.title, subtitle: b.excerpt,
    meta: `${b.author} · ${b.date} · ★ ${b.rating.toLocaleString("fa-IR")}`,
    category: b.tags[0] ?? "مقاله",
    accent: accents[i % accents.length],
    to: `/public/blog/${b.id}`,
  }));
  return (
    <div>
      {topRated.length > 0 && (
        <div className="px-4 lg:px-12 max-w-6xl mx-auto pt-7">
          <p className="text-xs font-bold text-ink-500 mb-2 flex items-center gap-1.5">
            <Star size={13} className="fill-amber-400 text-amber-400" /> پرامتیازترین یادداشت‌ها
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topRated.map((b, i) => (
              <Link key={b.id} to={`/public/blog/${b.id}`} className="group bg-white rounded-xl border border-amber-200/70 p-4 hover:border-amber-400 hover:shadow-sm transition-all relative">
                <span className="absolute -top-2.5 right-3 text-[10px] font-black bg-amber-400 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                  {(i + 1).toLocaleString("fa-IR")}
                </span>
                <p className="text-[12.5px] font-bold text-ink-900 leading-6 line-clamp-2 group-hover:text-brand-700">{b.title}</p>
                <p className="text-[11px] text-ink-400 mt-2 flex items-center gap-1.5">
                  <Star size={11} className="fill-amber-400 text-amber-400" /> {b.rating.toLocaleString("fa-IR")} · {b.author}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
      <MagazineLayout cards={cards} emptyIcon={<NotebookPen size={20} />} emptyTitle="هنوز یادداشت عمومی‌ای منتشر نشده" />
    </div>
  );
}

// ─── NEWS — سلسله‌مراتب نزولی + برجسته‌ها + آرشیو ماهانه ─────────────────────
const jMonths = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const faToNum = (s: string) => Number(s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
const monthOf = (date: string) => faToNum(date.split("/")[1] ?? "0");

function NewsSection({ items }: { items: NewsItem[] }) {
  const [month, setMonth] = useState<number | null>(null);

  const sorted = [...items].sort((a, b) => (a.date < b.date ? 1 : -1)); // جدیدترین اول
  const filtered = month === null ? sorted : sorted.filter((n) => monthOf(n.date) === month);

  const mostViewed = [...items].sort((a, b) => b.views - a.views)[0];
  const mostDiscussed = [...items].sort((a, b) => b.comments - a.comments)[0];
  const latest = sorted[0];

  const [hero, ...rest] = filtered;
  const second = rest.slice(0, 2);
  const others = rest.slice(2);

  if (items.length === 0)
    return <div className="px-6 py-16 max-w-5xl mx-auto"><EmptyState icon={<Newspaper size={20} />} title="هنوز خبر عمومی‌ای منتشر نشده" /></div>;

  return (
    <div className="px-4 lg:px-12 max-w-6xl mx-auto py-7 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">اخبار بنیاد</h1>
          <p className="text-sm text-ink-400 mt-1">{items.length.toLocaleString("fa-IR")} خبر عمومی</p>
        </div>
      </div>

      {/* برجسته‌ها — چیزی که باید ناخودآگاه دیده شود */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { tag: "تازه‌ترین خبر", n: latest, cls: "from-brand-600 to-brand-800", icon: <Newspaper size={13} /> },
          { tag: "پربازدیدترین", n: mostViewed, cls: "from-emerald-600 to-emerald-800", icon: <Star size={13} /> },
          { tag: "داغ‌ترین گفتگو", n: mostDiscussed, cls: "from-amber-500 to-orange-700", icon: <MessagesSquare size={13} /> },
        ].map(({ tag, n, cls, icon }) => (
          <Link key={tag} to={`/public/news/${n.id}`} className={`group rounded-xl bg-gradient-to-l ${cls} p-4 text-white shadow-sm hover:shadow-md transition-shadow`}>
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold bg-white/20 rounded-full px-2.5 py-1 mb-2 backdrop-blur-sm">
              {icon} {tag}
            </span>
            <p className="text-[13px] font-bold leading-6 line-clamp-2 group-hover:underline">{n.title}</p>
            <p className="text-[10.5px] text-white/70 mt-2 flex items-center gap-2">
              {n.date}
              <span>· {n.views.toLocaleString("fa-IR")} بازدید</span>
              <span>· {n.comments.toLocaleString("fa-IR")} نظر</span>
            </p>
          </Link>
        ))}
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
        <EmptyState icon={<Newspaper size={20} />} title="در این ماه خبری منتشر نشده" />
      ) : (
        <>
          {/* سطح ۱ — بزرگ‌ترین: جدیدترین خبرِ فیلتر فعلی */}
          {hero && (
            <Link
              to={`/public/news/${hero.id}`}
              className="relative flex items-end min-h-72 rounded-2xl overflow-hidden group shadow-md"
              style={bgStyle(newsImg(hero.id), accents[0])}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="relative p-7 md:p-10 max-w-3xl">
                <span className="inline-block text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full mb-3 backdrop-blur-sm">
                  {hero.pinned ? "اطلاعیه مهم" : "خبر"}
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white leading-10 mb-2 group-hover:text-brand-200 transition-colors">
                  {hero.title}
                </h2>
                <p className="text-white/70 text-sm leading-7 line-clamp-2 mb-4">{hero.summary}</p>
                <span className="text-white/50 text-xs flex items-center gap-3">
                  {hero.date} <span>· {hero.views.toLocaleString("fa-IR")} بازدید</span> <span>· {hero.comments.toLocaleString("fa-IR")} نظر</span>
                </span>
              </div>
            </Link>
          )}

          {/* سطح ۲ — نصف اندازه: دو خبر بعدی */}
          {second.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {second.map((n, i) => (
                <Link
                  key={n.id}
                  to={`/public/news/${n.id}`}
                  className="relative flex items-end min-h-40 rounded-xl overflow-hidden group shadow-sm"
                  style={bgStyle(newsImg(n.id), accents[(i + 1) % accents.length])}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="relative p-5">
                    <h3 className="text-base font-extrabold text-white leading-7 line-clamp-2 group-hover:text-brand-200 transition-colors">{n.title}</h3>
                    <p className="text-white/50 text-[11px] mt-2">{n.date} · {n.views.toLocaleString("fa-IR")} بازدید</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* سطح ۳ — کوچک: بقیه */}
          {others.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {others.map((n) => (
                <Link key={n.id} to={`/public/news/${n.id}`} className="group bg-white rounded-xl border border-ink-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all">
                  <p className="text-[13px] font-bold text-ink-900 leading-6 line-clamp-2 group-hover:text-brand-700 transition-colors">{n.title}</p>
                  <p className="text-[11px] text-ink-400 mt-2.5 pt-2.5 border-t border-ink-50 flex items-center gap-2">
                    {n.date} <span>· {n.views.toLocaleString("fa-IR")} بازدید</span>
                  </p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── MEDIA — Gallery ──────────────────────────────────────────────────────────
function MediaSection({ items }: { items: MediaItem[] }) {
  const [filter, setFilter] = useState<"all" | "photo" | "video">("all");
  const [topic, setTopic] = useState<string>("همه");
  const topics = ["همه", ...Array.from(new Set(items.map((m) => m.album)))];
  const filtered = items
    .filter((m) => (filter === "all" ? true : m.kind === filter))
    .filter((m) => (topic === "همه" ? true : m.album === topic));

  return (
    <div className="px-4 lg:px-12 max-w-6xl mx-auto py-7">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold text-ink-900">گالری رسانه‌ی عمومی</h1>
        <div className="flex items-center gap-1 bg-white border border-ink-200 rounded-lg p-1 shadow-sm">
          {(["all", "photo", "video"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === k ? "bg-navy-900 text-white" : "text-ink-500 hover:bg-ink-50"
              }`}
            >
              {k === "all" ? "همه" : k === "photo" ? "تصاویر" : "ویدیو"}
            </button>
          ))}
        </div>
      </div>

      {/* موضوع‌ها (آلبوم‌ها) — ساختار موضوعی گالری */}
      <div className="flex items-center gap-1.5 flex-wrap mb-5">
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

      {filtered.length === 0 ? (
        <EmptyState icon={<ImageIcon size={20} />} title="هنوز رسانه‌ی عمومی‌ای بارگذاری نشده" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m) => (
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
                <span className="absolute bottom-3 left-3 flex items-center gap-1 text-white text-[11px] font-semibold bg-black/30 px-2 py-0.5 rounded-md">
                  <Star size={10} className="fill-amber-400 text-amber-400" /> {m.rating.toLocaleString("fa-IR")}
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-ink-900 group-hover:text-brand-700 transition-colors truncate">{m.title}</p>
                <p className="text-xs text-ink-400 mt-0.5">{m.album}</p>
                <p className="text-[11px] text-ink-300 mt-2">{m.uploadedBy} · {m.date}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── EVENTS — Evand style ─────────────────────────────────────────────────────
function EventsSection({ items }: { items: EventItem[] }) {
  const [featured, ...rest] = items;

  return (
    <div className="px-4 lg:px-12 max-w-4xl mx-auto py-7 space-y-5">
      <h1 className="text-2xl font-extrabold text-ink-900">رویدادها و جلسات عمومی</h1>

      {items.length === 0 ? (
        <EmptyState icon={<CalendarDays size={20} />} title="هنوز رویداد عمومی‌ای منتشر نشده" />
      ) : (
        <>
          {/* Featured */}
          {featured && (
            <Link
              to={`/public/events/${featured.id}`}
              className="block group bg-white rounded-2xl border border-ink-200 overflow-hidden shadow-sm hover:shadow-md hover:border-brand-300 transition-all"
            >
              {/* Hero band */}
              <div className="relative p-6 lg:p-8 flex items-start gap-5" style={bgStyle(eventImg(featured.id), "#182536")}>
                <span className="absolute inset-0 bg-navy-900/80" />
                <div className="relative w-20 h-20 rounded-2xl bg-brand-500 text-white flex flex-col items-center justify-center shrink-0 shadow-lg">
                  <span className="text-xs text-brand-100 font-medium leading-none">{featured.jalaliDate.split("/")[1] ?? "—"}</span>
                  <span className="text-3xl font-black leading-tight">{featured.jalaliDate.split("/")[2] ?? "—"}</span>
                  <span className="text-[10px] text-brand-200 leading-none mt-0.5">{featured.jalaliDate.split("/")[0]}</span>
                </div>
                <div className="relative min-w-0">
                  <span className="text-[11px] font-semibold text-brand-300 mb-1 block">رویداد ویژه</span>
                  <h2 className="text-xl font-extrabold text-white group-hover:text-brand-200 transition-colors leading-7 mb-3">
                    {featured.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-navy-300 flex-wrap">
                    <span className="flex items-center gap-1.5"><Clock    size={13} /> {featured.time}</span>
                    <span className="flex items-center gap-1.5"><MapPin   size={13} /> {featured.location}</span>
                    <span className="flex items-center gap-1.5"><Users    size={13} /> {featured.attendees.toLocaleString("fa-IR")} شرکت‌کننده</span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${featured.mode === "آنلاین" ? "bg-brand-500/30 text-brand-200" : "bg-white/10 text-white"}`}>
                      {featured.mode === "آنلاین" ? "🖥 آنلاین" : "📍 حضوری"}
                    </span>
                  </div>
                </div>
              </div>
              {/* Body */}
              <div className="p-5 lg:p-7">
                <p className="text-sm text-ink-600 leading-7 mb-4">{featured.description}</p>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {featured.hashtags.map((h) => (
                      <span key={h} className="text-[11px] bg-ink-100 text-ink-500 px-2 py-0.5 rounded-md">#{h}</span>
                    ))}
                  </div>
                  <span className="flex items-center gap-1 text-brand-600 font-semibold text-sm">
                    اطلاعات بیشتر <ArrowLeft size={14} />
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Remaining */}
          {rest.length > 0 && (
            <div className="space-y-3">
              {rest.map((e) => (
                <Link
                  key={e.id}
                  to={`/public/events/${e.id}`}
                  className="group bg-white rounded-xl border border-ink-200 p-4 flex items-center gap-4 hover:border-brand-300 hover:shadow-sm transition-all"
                >
                  <div className="w-14 h-14 rounded-xl bg-navy-900 text-white flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] text-navy-400 leading-none">{e.jalaliDate.split("/")[1] ?? "—"}</span>
                    <span className="text-base font-bold leading-tight">{e.jalaliDate.split("/")[2] ?? "—"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-ink-900 group-hover:text-brand-700 transition-colors truncate">
                      {e.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-ink-400 flex-wrap">
                      <span className={`font-bold px-2 py-0.5 rounded-full ${e.mode === "آنلاین" ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-600"}`}>{e.mode}</span>
                      <span className="flex items-center gap-1"><Clock  size={11} /> {e.time}</span>
                      <span className="flex items-center gap-1"><MapPin size={11} /> {e.location}</span>
                      <span className="flex items-center gap-1"><Users  size={11} /> {e.attendees.toLocaleString("fa-IR")} نفر</span>
                    </div>
                  </div>
                  <ArrowLeft size={14} className="text-ink-300 group-hover:text-brand-500 transition-colors shrink-0" />
                </Link>
              ))}
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

  const filtered = items.filter((d) => {
    const matchType   = activeType === "همه" || d.type === activeType;
    const matchSearch = !search || d.title.includes(search) || d.owner.includes(search);
    return matchType && matchSearch;
  });

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

      {/* Category chips */}
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
              <cat.icon size={20} className="mb-2 opacity-60" />
              <p className="text-sm font-semibold">{cat.label}</p>
              <p className="text-xs mt-0.5 opacity-60">{count.toLocaleString("fa-IR")} سند</p>
            </button>
          );
        })}
      </div>

      {/* Document list */}
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
