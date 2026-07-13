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
import Badge from "../components/ui/Badge";
import Avatar from "../components/Avatar";
import { users } from "../data/mock";

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

      <footer className="px-6 lg:px-16 py-6 text-center text-xs text-ink-400 border-t border-ink-100 flex items-center justify-center gap-2">
        <Layers size={14} /> پروتوتایپ داخلی — داده‌های این نسخه نمایشی است.
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
          این موضوع در دسته‌بندی «{item.category}» ایجاد شده است. در نسخه‌ی واقعی محتوای کامل موضوع از API انجمن بارگذاری می‌شود.
        </p>
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-ink-100 text-xs text-ink-400">
          <span className="flex items-center gap-1"><MessageCircle size={13} /> {item.replies} پاسخ</span>
          <span className="flex items-center gap-1"><Eye size={13} /> {item.views} بازدید</span>
        </div>
      </div>
      <div className="card p-4">
        <p className="text-xs text-ink-400 flex items-center gap-1.5 mb-3">
          <MessageCircle size={13} /> {item.replies} پاسخ (برای مشاهده‌ی پاسخ‌ها وارد شوید)
        </p>
        <div className="h-16 bg-ink-50 rounded-lg flex items-center justify-center">
          <p className="text-xs text-ink-400">پاسخ‌ها فقط برای اعضای سازمان نمایش داده می‌شود</p>
        </div>
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
          <Star size={14} className="fill-amber-500 text-amber-500" /> {item.rating}
        </span>
      </div>
      <p className="text-sm leading-8 text-ink-700 mb-6">{item.excerpt}</p>
      <div className="card p-4 bg-ink-50 border-ink-100">
        <p className="text-xs text-ink-500">متن کامل این یادداشت در نسخه‌ی واقعی از API بلاگ بارگذاری می‌شود.</p>
      </div>
      <div className="flex items-center gap-1.5 mt-4">
        {item.tags.map((t) => <Badge key={t} tone="neutral" icon={<Hash size={10} />}>{t}</Badge>)}
      </div>
    </div>
  );
}

function EventDetail({ item }: { item: EventItem }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-ink-900 mb-4 leading-8">{item.title}</h1>
      <div className="card p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-ink-700">
            <CalendarDays size={16} className="text-brand-600 shrink-0" />
            <div>
              <p className="font-medium">{item.jalaliDate}</p>
              <p className="text-xs text-ink-400">{item.time}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-ink-700">
            <MapPin size={16} className="text-brand-600 shrink-0" />
            <p>{item.location}</p>
          </div>
          <div className="flex items-center gap-2 text-ink-700">
            <Users size={16} className="text-brand-600 shrink-0" />
            <p>{item.attendees} شرکت‌کننده</p>
          </div>
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
      <div className="w-full h-56 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: item.color }}>
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
  return (
    <div>
      <h1 className="text-xl font-bold text-ink-900 mb-4 leading-8">{item.title}</h1>
      <div className="card p-5 mb-4 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">
          <FileText size={20} />
        </span>
        <div>
          <p className="text-sm font-medium">{item.title}</p>
          <p className="text-xs text-ink-400 mt-1">{item.category} · مالک: {item.owner} · بروزرسانی {item.updatedAt}</p>
          <p className="text-xs text-ink-400">{item.size}</p>
        </div>
      </div>
      <p className="text-sm leading-8 text-ink-700 mb-4">
        این سند در دسته‌بندی «{item.category}» قرار دارد. در نسخه‌ی واقعی محتوای کامل سند از API مدیریت دانش بارگذاری می‌شود.
      </p>
      <div className="card p-4 bg-ink-50 border-ink-100">
        <p className="text-xs text-ink-500">برای دانلود این سند، باید وارد حساب سازمانی شوید.</p>
      </div>
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
      <p className="text-xs text-ink-400 mb-6">{item.date}</p>
      <p className="text-sm leading-8 text-ink-700 mb-4">{item.summary}</p>
      <div className="card p-4 bg-ink-50 border-ink-100">
        <p className="text-xs text-ink-500">متن کامل این خبر در نسخه‌ی واقعی از API اخبار بارگذاری می‌شود.</p>
      </div>
      <div className="flex items-center gap-1.5 mt-4 text-xs text-ink-400">
        <MessageCircle size={13} /> {item.comments} نظر
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
      <div className="card p-4 bg-ink-50 border-ink-100">
        <p className="text-xs text-ink-500">برای مشاهده‌ی پست‌ها و گفتگوهای این گروه، باید وارد حساب سازمانی شوید.</p>
      </div>
    </div>
  );
}
