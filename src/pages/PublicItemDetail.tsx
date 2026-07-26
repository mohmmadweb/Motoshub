import { Link, useParams } from "react-router-dom";
import {
  Lock,
  LogIn,
  Layers,
  ArrowRight,
  MessagesSquare,
  NotebookPen,
  CalendarDays,
  Image as ImageIcon,
  BookOpen,
  Newspaper,
  Users,
  CheckCircle2,
  Eye,
  MessageCircle,
  Star,
  Hash,
  MapPin,
  PlayCircle,
  Video,
  FileText,
  Pin,
  Globe2,
} from "lucide-react";
import { useContent } from "../context/ContentContext";
import SiteHeader from "../components/SiteHeader";
import CreditFooter from "../components/CreditFooter";
import Badge from "../components/ui/Badge";
import Avatar from "../components/Avatar";
import { users, posts } from "../data/mock";
import { mediaImg, bgStyle } from "../data/images";
import { Download, ExternalLink, Clock, History as HistoryIcon } from "lucide-react";

type Section = "forum" | "blog" | "events" | "media" | "knowledge" | "news" | "groups";

const sectionLabel: Record<Section, string> = {
  forum: "انجمن",
  blog: "بلاگ",
  events: "رویدادها",
  media: "تصاویر و ویدیو",
  knowledge: "مدیریت دانش",
  news: "اخبار",
  groups: "گروه‌ها",
};

const sectionIcon: Record<Section, typeof MessagesSquare> = {
  forum: MessagesSquare,
  blog: NotebookPen,
  events: CalendarDays,
  media: ImageIcon,
  knowledge: BookOpen,
  news: Newspaper,
  groups: Users,
};

const validSections: Section[] = ["forum", "blog", "events", "media", "knowledge", "news", "groups"];

export default function PublicItemDetail() {
  const { section, id } = useParams<{ section: string; id: string }>();
  const content = useContent();

  const sec = validSections.includes(section as Section) ? (section as Section) : null;
  if (!sec || !id) return <NotFound />;

  const item = findItem(content, sec, id);
  if (!item) return <NotFound />;

  const isPrivate =
    "visibility" in item ? item.visibility === "خصوصی" : "privacy" in item ? item.privacy === "خصوصی" : false;

  if (isPrivate) return <PrivateBlock section={sec} />;

  const SectionIcon = sectionIcon[sec];

  return (
    <div dir="rtl" className="min-h-screen bg-white flex flex-col">
      <SiteHeader />

      <div className="px-6 lg:px-16 py-4 max-w-4xl mx-auto w-full">
        <nav className="flex items-center gap-1.5 text-xs text-ink-400">
          <Link to="/" className="hover:text-brand-700">بنیاد مستضعفان</Link>
          <ArrowRight size={11} className="rotate-180" />
          <Link to={`/public/${sec}`} className="hover:text-brand-700">{sectionLabel[sec]}</Link>
          <ArrowRight size={11} className="rotate-180" />
          <span className="text-ink-600 font-medium truncate max-w-[200px]">{getTitle(item, sec)}</span>
        </nav>
      </div>

      <main className="px-6 lg:px-16 pb-16 max-w-4xl mx-auto flex-1 w-full">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-lg bg-navy-900 text-white flex items-center justify-center shrink-0">
            <SectionIcon size={15} />
          </span>
          <span className="text-[11px] text-ink-400 font-medium">{sectionLabel[sec]}</span>
          <Badge tone="success" icon={<Globe2 size={10} />}>عمومی</Badge>
        </div>

        {sec === "forum" && <ForumDetail item={item as unknown as ForumTopic} />}
        {sec === "blog" && <BlogDetail item={item as unknown as BlogPost} />}
        {sec === "events" && <EventDetail item={item as unknown as EventItem} />}
        {sec === "media" && <MediaDetail item={item as unknown as MediaItem} />}
        {sec === "knowledge" && <KnowledgeDetail item={item as unknown as KnowledgeDoc} />}
        {sec === "news" && <NewsDetail item={item as unknown as NewsItem} />}
        {sec === "groups" && <GroupsDetail item={item as unknown as Group} />}

        <div className="mt-8 card p-4 flex items-center justify-between gap-3 bg-ink-50 border-ink-100">
          <p className="text-xs text-ink-500 leading-5">برای ارسال نظر، پاسخ‌دادن و تعامل با این محتوا باید وارد حساب سازمانی خود شوید.</p>
          <Link to="/login" className="btn bg-navy-900 text-white hover:bg-navy-800 text-xs px-3.5 py-2 shrink-0">
            <LogIn size={13} /> ورود
          </Link>
        </div>
      </main>

      <footer className="px-6 lg:px-16 py-5 text-center text-xs text-ink-400 border-t border-ink-100">
        <p className="flex items-center justify-center gap-2">
          <Layers size={14} /> پروتوتایپ داخلی — داده‌های این نسخه نمایشی است.
        </p>
        <CreditFooter />
      </footer>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function findItem(content: ReturnType<typeof useContent>, sec: Section, id: string) {
  switch (sec) {
    case "forum": return content.forumTopics.find((t) => t.id === id) ?? null;
    case "blog": return content.blogPosts.find((b) => b.id === id) ?? null;
    case "events": return content.events.find((e) => e.id === id) ?? null;
    case "media": return content.mediaItems.find((m) => m.id === id) ?? null;
    case "knowledge": return content.knowledgeDocs.find((d) => d.id === id) ?? null;
    case "news": return content.newsItems.find((n) => n.id === id) ?? null;
    case "groups": return content.groups.find((g) => g.id === id) ?? null;
  }
}

function getTitle(item: NonNullable<ReturnType<typeof findItem>>, sec: Section): string {
  if (sec === "groups") return (item as { name: string }).name;
  return (item as { title: string }).title;
}

// ─── error states ─────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div dir="rtl" className="min-h-screen bg-white flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <span className="w-14 h-14 rounded-xl bg-ink-100 text-ink-400 flex items-center justify-center mb-4">
          <FileText size={24} />
        </span>
        <h1 className="text-lg font-bold text-ink-900 mb-2">محتوا پیدا نشد</h1>
        <p className="text-sm text-ink-500">این آیتم وجود ندارد یا حذف شده است.</p>
        <Link to="/" className="mt-6 btn bg-navy-900 text-white hover:bg-navy-800 text-xs px-4 py-2">
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </div>
  );
}

function PrivateBlock({ section }: { section: Section }) {
  return (
    <div dir="rtl" className="min-h-screen bg-white flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <span className="w-14 h-14 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <Lock size={24} />
        </span>
        <h1 className="text-lg font-bold text-ink-900 mb-2">این محتوا خصوصی است</h1>
        <p className="text-sm text-ink-500 max-w-sm">
          دسترسی به این {sectionLabel[section]} محدود است و تنها برای اعضای سازمان قابل مشاهده است.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link to="/login" className="btn bg-navy-900 text-white hover:bg-navy-800 text-sm px-5 py-2.5">
            <LogIn size={14} /> ورود به حساب سازمانی
          </Link>
          <Link to={`/public/${section}`} className="btn border border-ink-200 text-ink-600 hover:bg-ink-50 text-sm px-4 py-2.5">
            بازگشت به لیست
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── section-specific detail views ──────────────────────────────────────────

import type { ForumTopic, BlogPost, EventItem, MediaItem, KnowledgeDoc, NewsItem, Group } from "../data/mock";

function ForumDetail({ item }: { item: ForumTopic }) {
  const author = users.find((u) => u.name === item.author) ?? users[0];
  // پاسخ‌های نمونه — محتوای عمومی برای همه قابل مشاهده است
  const sampleReplies = [
    { u: users[4], text: "تجربه‌ی ما نشان داد استانداردسازی قالب گزارش قبل از هر چیز، زمان جمع‌بندی را نصف می‌کند. پیشنهاد می‌کنم از چارچوب سه‌بخشی (وضعیت، ریسک، نیاز به تصمیم) شروع کنید.", time: "۴ ساعت پیش", accepted: item.solved },
    { u: users[3], text: "نکته‌ی مهم، تعیین متولی واحد برای هر شاخص است؛ در غیر این صورت اعداد دو منبع پیدا می‌کنند و اعتماد از بین می‌رود.", time: "۳ ساعت پیش", accepted: false },
    { u: users[1], text: "جمع‌بندی خوبی بود. لطفاً نسخه‌ی نهایی چارچوب را در بانک دانش هم بارگذاری کنید تا مرجع بماند.", time: "۱ ساعت پیش", accepted: false },
  ].slice(0, Math.max(1, Math.min(3, item.replies)));

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-900 mb-4 leading-8">{item.title}</h1>
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={author.name} color={author.avatarColor} />
          <div>
            <p className="text-sm font-medium">{author.name}</p>
            <p className="text-xs text-ink-400">{item.lastActivity}</p>
          </div>
          {item.solved && <Badge tone="success" icon={<CheckCircle2 size={11} />}>حل‌شده</Badge>}
        </div>
        <p className="text-sm leading-7 text-ink-800">
          در جریان کار روی «{item.category}»، به این پرسش رسیدیم و تجربه‌های عملی همکاران را می‌خواهیم: {item.title} —
          اگر نمونه‌ی اجراشده یا مستندی دارید، ممنون می‌شویم به اشتراک بگذارید.
        </p>
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-ink-100 text-xs text-ink-400">
          <span className="flex items-center gap-1"><MessageCircle size={13} /> {item.replies.toLocaleString("fa-IR")} پاسخ</span>
          <span className="flex items-center gap-1"><Eye size={13} /> {item.views.toLocaleString("fa-IR")} بازدید</span>
        </div>
      </div>

      <p className="text-xs font-bold text-ink-500 mb-2">{item.replies.toLocaleString("fa-IR")} پاسخ</p>
      <div className="space-y-3">
        {sampleReplies.map((r, i) => (
          <div key={i} className={`card p-4 ${r.accepted ? "border-emerald-300 bg-emerald-50/40" : ""}`}>
            <div className="flex items-center gap-3 mb-2">
              <Avatar name={r.u.name} color={r.u.avatarColor} size={30} />
              <div className="flex-1">
                <p className="text-[13px] font-medium">{r.u.name}</p>
                <p className="text-[11px] text-ink-400">{r.time}</p>
              </div>
              {r.accepted && <Badge tone="success" icon={<CheckCircle2 size={11} />}>پاسخ برگزیده</Badge>}
            </div>
            <p className="text-sm leading-7 text-ink-700">{r.text}</p>
          </div>
        ))}
        {item.replies > sampleReplies.length && (
          <p className="text-[11.5px] text-ink-400 text-center">+ {(item.replies - sampleReplies.length).toLocaleString("fa-IR")} پاسخ دیگر</p>
        )}
      </div>
    </div>
  );
}

function BlogDetail({ item }: { item: BlogPost }) {
  const author = users.find((u) => u.name === item.author) ?? users[0];
  return (
    <div>
      <h1 className="text-xl font-bold text-ink-900 mb-4 leading-8">{item.title}</h1>
      <div className="flex items-center gap-3 mb-6">
        <Avatar name={author.name} color={author.avatarColor} />
        <div>
          <p className="text-sm font-medium">{author.name}</p>
          <p className="text-xs text-ink-400">{item.date}</p>
        </div>
        <span className="flex items-center gap-1 text-amber-600 text-sm font-medium mr-auto">
          <Star size={14} className="fill-amber-500 text-amber-500" /> {item.rating.toLocaleString("fa-IR")}
        </span>
      </div>
      <div className="prose-sm max-w-none space-y-4 text-sm leading-8 text-ink-700 mb-6">
        <p className="text-base leading-8 font-medium text-ink-800">{item.excerpt}</p>
        <p>
          آنچه این تجربه را متفاوت کرد، نگاه فرآیندی به مسئله بود: به‌جای راه‌حل مقطعی، چرخه‌ی کاملی از شناخت، اجرا و
          پایش تعریف شد و در هر مرحله ذی‌نفعان درگیر ماندند. نتیجه، نه فقط حل مسئله، بلکه ساخته‌شدن یک الگوی قابل تکرار
          برای واحدهای دیگر بود.
        </p>
        <p>
          سه درس کلیدی این مسیر: (۱) مستندسازی هم‌زمان با اجرا — نه بعد از آن؛ (۲) تعریف شاخص موفقیت پیش از شروع؛
          (۳) اشتراک تجربه در همین بلاگ، که بازخوردهایش دو نقطه‌ی کور مهم را روشن کرد.
        </p>
        <p>
          اگر روی موضوع مشابهی کار می‌کنید، سوال‌هایتان را در بخش نظرات همین یادداشت مطرح کنید تا گفتگو ادامه پیدا کند.
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {item.tags.map((t) => <Badge key={t} tone="neutral" icon={<Hash size={10} />}>{t}</Badge>)}
      </div>
    </div>
  );
}

function EventDetail({ item }: { item: EventItem }) {
  const online = item.mode === "آنلاین";
  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <h1 className="text-xl font-bold text-ink-900 leading-8 flex-1">{item.title}</h1>
        <Badge tone={online ? "brand" : "navy"} icon={online ? <Video size={11} /> : <MapPin size={11} />}>
          {item.mode}
        </Badge>
      </div>

      {/* کارت اطلاعات کلیدی رویداد */}
      <div className="card overflow-hidden mb-5">
        <div className="bg-gradient-to-l from-navy-800 to-navy-900 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-2.5 text-white">
            <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0"><CalendarDays size={17} /></span>
            <div>
              <p className="text-[11px] text-navy-300">زمان</p>
              <p className="text-sm font-bold">{item.jalaliDate}</p>
              <p className="text-[11px] text-navy-300 flex items-center gap-1"><Clock size={10} /> {item.time}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-white">
            <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              {online ? <Video size={17} /> : <MapPin size={17} />}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-navy-300">{online ? "برگزاری آنلاین" : "مکان برگزاری"}</p>
              <p className="text-sm font-bold truncate">{item.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-white">
            <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0"><Users size={17} /></span>
            <div>
              <p className="text-[11px] text-navy-300">شرکت‌کنندگان</p>
              <p className="text-sm font-bold">{item.attendees.toLocaleString("fa-IR")} نفر</p>
            </div>
          </div>
        </div>
        <div className="p-4 flex items-center gap-2 flex-wrap bg-ink-50/50">
          {online && item.joinLink && (
            <a
              href={item.joinLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-brand-600 text-white hover:bg-brand-700 text-xs px-4 py-2"
            >
              <Video size={13} /> ورود به جلسه آنلاین <ExternalLink size={11} />
            </a>
          )}
          {!online && item.mapUrl && (
            <a
              href={item.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-white border border-ink-200 text-ink-700 hover:bg-ink-50 text-xs px-4 py-2"
            >
              <MapPin size={13} /> مشاهده روی نقشه گوگل <ExternalLink size={11} />
            </a>
          )}
          <Link to="/login" className="btn bg-navy-900 text-white hover:bg-navy-800 text-xs px-4 py-2 mr-auto">
            <LogIn size={12} /> ثبت‌نام در رویداد
          </Link>
        </div>
      </div>

      <p className="text-sm leading-8 text-ink-700 mb-4">{item.description}</p>
      <div className="flex items-center gap-1.5">
        {item.hashtags.map((h) => <Badge key={h} tone="neutral" icon={<Hash size={10} />}>{h}</Badge>)}
      </div>
    </div>
  );
}

function MediaDetail({ item }: { item: MediaItem }) {
  return (
    <div>
      <div className="w-full h-64 rounded-xl flex items-center justify-center mb-5 relative overflow-hidden" style={bgStyle(mediaImg(item.id), item.color)}>
        <span className="absolute inset-0 bg-black/25" />
        {item.kind === "video" ? <PlayCircle size={48} className="text-white" /> : <ImageIcon size={48} className="text-white" />}
        <span className="absolute top-4 right-4">
          <Badge tone="navy" icon={item.kind === "video" ? <Video size={10} /> : <ImageIcon size={10} />}>
            {item.kind === "video" ? "ویدیو" : "تصویر"}
          </Badge>
        </span>
      </div>
      <h1 className="text-xl font-bold text-ink-900 mb-2">{item.title}</h1>
      <div className="flex items-center gap-4 text-xs text-ink-400 mb-4">
        <span>{item.album}</span>
        <span>·</span>
        <span>بارگذاری‌شده توسط {item.uploadedBy}</span>
        <span>·</span>
        <span>{item.date}</span>
        <span className="flex items-center gap-1 text-amber-600 font-medium">
          <Star size={12} className="fill-amber-500 text-amber-500" /> {item.rating}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {item.tags.map((t) => <Badge key={t} tone="neutral" icon={<Hash size={10} />}>{t}</Badge>)}
      </div>
    </div>
  );
}

function KnowledgeDetail({ item }: { item: KnowledgeDoc }) {
  const { knowledgeDocs } = useContent();
  const related = knowledgeDocs.filter((d) => d.id !== item.id && d.visibility === "عمومی" && (d.category === item.category || d.type === item.type)).slice(0, 3);

  const download = () => {
    const content = `${item.title}\nدسته‌بندی: ${item.category}\nمالک: ${item.owner}\nآخرین بروزرسانی: ${item.updatedAt}\n\n(خروجی نمایشی پروتوتایپ)`;
    const blob = new Blob(["﻿" + content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-900 mb-4 leading-8">{item.title}</h1>

      {/* شناسنامه سند */}
      <div className="card overflow-hidden mb-5">
        <div className="p-5 flex items-start gap-4">
          <span className="w-14 h-14 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center shrink-0">
            <FileText size={24} />
          </span>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-xs">
            <div><p className="text-ink-400 mb-0.5">نوع سند</p><Badge tone="brand">{item.type}</Badge></div>
            <div><p className="text-ink-400 mb-0.5">دسته‌بندی</p><p className="font-medium text-ink-800">{item.category}</p></div>
            <div><p className="text-ink-400 mb-0.5">مالک</p><p className="font-medium text-ink-800">{item.owner}</p></div>
            <div><p className="text-ink-400 mb-0.5">آخرین به‌روزرسانی</p><p className="font-medium text-ink-800">{item.updatedAt}</p></div>
            <div><p className="text-ink-400 mb-0.5">حجم فایل</p><p className="font-medium text-ink-800">{item.size}</p></div>
            <div><p className="text-ink-400 mb-0.5">نسخه</p><p className="font-medium text-ink-800">نسخه ۳ (نهایی)</p></div>
          </div>
        </div>
        <div className="px-5 py-3 bg-ink-50/60 border-t border-ink-100 flex items-center gap-2">
          <button onClick={download} className="btn bg-brand-600 text-white hover:bg-brand-700 text-xs px-4 py-2">
            <Download size={13} /> دانلود سند
          </button>
          <span className="text-[11px] text-ink-400">دانلود اسناد عمومی برای همه آزاد است.</span>
        </div>
      </div>

      {/* پیش‌نمایش محتوا */}
      <div className="card p-5 mb-5">
        <p className="text-xs font-bold text-ink-900 mb-3">فهرست مطالب</p>
        <ol className="space-y-1.5 text-[13px] text-ink-700 mb-5">
          {["مقدمه و هدف سند", "دامنه کاربرد و مخاطبان", "شرح گام‌به‌گام", "نقش‌ها و مسئولیت‌ها", "پیوست‌ها و فرم‌های مرتبط"].map((t, i) => (
            <li key={t} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-700 text-[10.5px] font-bold flex items-center justify-center shrink-0">
                {(i + 1).toLocaleString("fa-IR")}
              </span>
              {t}
            </li>
          ))}
        </ol>
        <p className="text-xs font-bold text-ink-900 mb-2">چکیده</p>
        <p className="text-sm leading-8 text-ink-700">
          این سند در دسته‌ی «{item.category}» تدوین شده و مرجع رسمی واحدهای سازمان برای موضوع خود است. نسخه‌ی حاضر
          پس از بازبینی دبیرخانه و اعمال بازخورد واحدها نهایی شده و هرگونه تغییر بعدی از طریق چرخه‌ی نسخه‌گذاری همین
          صفحه منتشر می‌شود.
        </p>
      </div>

      {/* تاریخچه نسخه‌ها */}
      <div className="card p-5 mb-5">
        <p className="text-xs font-bold text-ink-900 mb-3 flex items-center gap-1.5"><HistoryIcon size={13} /> تاریخچه نسخه‌ها</p>
        <div className="space-y-2 text-xs">
          {[
            { v: "۳", d: item.updatedAt, by: item.owner, note: "نسخه نهایی — اعمال بازخورد واحدها" },
            { v: "۲", d: "۱۴۰۵/۰۱/۱۵", by: "دبیرخانه", note: "بازبینی ساختار و افزودن پیوست‌ها" },
            { v: "۱", d: "۱۴۰۴/۱۱/۰۲", by: item.owner, note: "ایجاد سند" },
          ].map((r) => (
            <div key={r.v} className="flex items-center gap-3 py-1.5 border-b border-ink-50 last:border-0">
              <Badge tone={r.v === "۳" ? "success" : "neutral"}>نسخه {r.v}</Badge>
              <span className="text-ink-700 flex-1">{r.note}</span>
              <span className="text-ink-400 shrink-0">{r.by} · {r.d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* اسناد مرتبط */}
      {related.length > 0 && (
        <div>
          <p className="text-xs font-bold text-ink-500 mb-2">اسناد مرتبط</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {related.map((d) => (
              <Link key={d.id} to={`/public/knowledge/${d.id}`} className="card p-3.5 hover:border-brand-300 transition-colors group">
                <p className="text-[12.5px] font-semibold text-ink-900 group-hover:text-brand-700 leading-6 line-clamp-2">{d.title}</p>
                <p className="text-[11px] text-ink-400 mt-1.5">{d.type} · {d.updatedAt}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewsDetail({ item }: { item: NewsItem }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-xl font-bold text-ink-900 leading-8 flex-1">{item.title}</h1>
        {item.pinned && <Badge tone="brand" icon={<Pin size={11} />}>مهم</Badge>}
      </div>
      <div className="flex items-center gap-4 text-xs text-ink-400 mb-6">
        <span>{item.date}</span>
        <span className="flex items-center gap-1"><Eye size={13} /> {item.views.toLocaleString("fa-IR")} بازدید</span>
        <span className="flex items-center gap-1"><MessageCircle size={13} /> {item.comments.toLocaleString("fa-IR")} نظر</span>
      </div>
      <div className="space-y-4 text-sm leading-8 text-ink-700 mb-6">
        <p className="text-base leading-8 font-medium text-ink-800">{item.summary}</p>
        <p>
          بر اساس این خبر، برنامه‌ی اجرایی مربوطه با هماهنگی واحدهای ذی‌ربط تدوین شده و جزئیات تکمیلی، زمان‌بندی و
          مسئولیت هر بخش در جلسات هفته‌های آینده به اطلاع ذی‌نفعان می‌رسد. روابط‌عمومی سازمان آماده‌ی پاسخ‌گویی به
          پرسش‌های رسانه‌ها و همکاران است.
        </p>
        <p>
          به‌روزرسانی‌های بعدی این خبر در همین صفحه منتشر می‌شود؛ برای دریافت اعلان، وارد حساب سازمانی شوید و
          این خبر را دنبال کنید.
        </p>
      </div>
      <RelatedNews currentId={item.id} />
    </div>
  );
}

function RelatedNews({ currentId }: { currentId: string }) {
  const { newsItems } = useContent();
  const related = newsItems.filter((n) => n.id !== currentId && n.visibility === "عمومی").slice(0, 3);
  if (related.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-bold text-ink-500 mb-2">اخبار مرتبط</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {related.map((n) => (
          <Link key={n.id} to={`/public/news/${n.id}`} className="card p-3.5 hover:border-brand-300 transition-colors group">
            <p className="text-[12.5px] font-semibold text-ink-900 group-hover:text-brand-700 leading-6 line-clamp-2">{n.title}</p>
            <p className="text-[11px] text-ink-400 mt-1.5 flex items-center gap-2">
              {n.date}
              <span className="flex items-center gap-0.5"><Eye size={10} /> {n.views.toLocaleString("fa-IR")}</span>
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function GroupsDetail({ item }: { item: Group }) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <span className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl shrink-0" style={{ backgroundColor: item.color }}>
          {item.name.slice(0, 1)}
        </span>
        <div>
          <h1 className="text-xl font-bold text-ink-900">{item.name}</h1>
          <p className="text-sm text-ink-500 mt-1">{item.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-ink-400">
            <span className="flex items-center gap-1"><Users size={13} /> {item.members.toLocaleString("fa-IR")} عضو</span>
            <span>·</span>
            <span>{item.category}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "اعضا", value: item.members.toLocaleString("fa-IR") },
          { label: "تاریخ ساخت", value: item.createdAt },
          { label: "آخرین فعالیت", value: item.lastActivityRel },
        ].map((s) => (
          <div key={s.label} className="card p-3 text-center">
            <p className="text-[11px] text-ink-400">{s.label}</p>
            <p className="text-sm font-bold text-ink-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <p className="text-xs font-bold text-ink-500 mb-2">آخرین پست‌های عمومی گروه</p>
      <div className="space-y-3 mb-5">
        {posts.filter((p) => p.groupId === item.id).slice(0, 3).map((p) => {
          const author = users.find((u) => u.id === p.authorId);
          return (
            <div key={p.id} className="card p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <Avatar name={author?.name ?? "?"} color={author?.avatarColor} size={28} />
                <p className="text-[12.5px] font-medium text-ink-900">{author?.name}</p>
                <span className="text-[11px] text-ink-400 mr-auto">{p.time}</span>
              </div>
              <p className="text-sm leading-7 text-ink-700">{p.content}</p>
              <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-ink-50 text-[11px] text-ink-400">
                <span>{p.likes.toLocaleString("fa-IR")} پسند</span>
                <span>{p.comments.toLocaleString("fa-IR")} نظر</span>
              </div>
            </div>
          );
        })}
        {posts.filter((p) => p.groupId === item.id).length === 0 && (
          <div className="card p-4 text-center text-xs text-ink-400">این گروه هنوز پست عمومی ندارد.</div>
        )}
      </div>
      <div className="card p-4 bg-ink-50 border-ink-100 flex items-center justify-between gap-3">
        <p className="text-xs text-ink-500">برای عضویت و ارسال پست در این گروه وارد شوید.</p>
        <Link to="/login" className="btn bg-navy-900 text-white hover:bg-navy-800 text-xs px-3.5 py-2 shrink-0">
          <LogIn size={12} /> پیوستن به گروه
        </Link>
      </div>
    </div>
  );
}
