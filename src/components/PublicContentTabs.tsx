import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MessagesSquare,
  NotebookPen,
  CalendarDays,
  Image as ImageIcon,
  BookOpen,
  Newspaper,
  Users,
  Eye,
  MessageCircle,
  CheckCircle2,
  Star,
  Hash,
  MapPin,
  Video,
  PlayCircle,
  FileText,
  Pin,
  Globe2,
} from "lucide-react";
import { useContent } from "../context/ContentContext";
import type { ForumTopic, BlogPost, EventItem, MediaItem, KnowledgeDoc, NewsItem, Group } from "../data/mock";
import Tabs from "./ui/Tabs";
import Badge, { type BadgeTone } from "./ui/Badge";
import EmptyState from "./ui/EmptyState";

export type ModuleTab = "forum" | "blog" | "events" | "media" | "knowledge" | "news" | "groups";

const typeTone: Record<string, BadgeTone> = {
  قرارداد: "warning",
  آموزشی: "success",
  "صورت‌جلسه": "neutral",
  گزارش: "brand",
};

export default function PublicContentTabs({
  linkMode = "app",
  activeTab,
  onTabChange,
  showTabs = true,
}: {
  linkMode?: "app" | "public";
  activeTab?: ModuleTab;
  onTabChange?: (tab: ModuleTab) => void;
  showTabs?: boolean;
}) {
  const { forumTopics, blogPosts, events, mediaItems, knowledgeDocs, newsItems, groups } = useContent();
  const [internalTab, setInternalTab] = useState<ModuleTab>("forum");
  const tab = activeTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;

  const publicForum = forumTopics.filter((t) => t.visibility === "عمومی");
  const publicBlog = blogPosts.filter((b) => b.visibility === "عمومی");
  const publicEvents = events.filter((e) => e.visibility === "عمومی");
  const publicMedia = mediaItems.filter((m) => m.visibility === "عمومی");
  const publicKnowledge = knowledgeDocs.filter((d) => d.visibility === "عمومی");
  const publicNews = newsItems.filter((n) => n.visibility === "عمومی");
  const publicGroups = groups.filter((g) => g.privacy === "عمومی");

  // appPath: used when linkMode==="app" (inside dashboard)
  // publicPath: used when linkMode==="public" (public showcase — links to public detail page)
  const link = (appPath: string, publicPath: string) =>
    linkMode === "app" ? appPath : publicPath;

  return (
    <div>
      {showTabs && (
        <Tabs
          tabs={[
            { id: "forum", label: "انجمن", count: publicForum.length },
            { id: "blog", label: "بلاگ", count: publicBlog.length },
            { id: "events", label: "رویدادها", count: publicEvents.length },
            { id: "media", label: "تصاویر و ویدیو", count: publicMedia.length },
            { id: "knowledge", label: "مدیریت دانش", count: publicKnowledge.length },
            { id: "news", label: "اخبار", count: publicNews.length },
            { id: "groups", label: "گروه‌ها", count: publicGroups.length },
          ]}
          active={tab}
          onChange={setTab}
        />
      )}

      {tab === "forum" && <ForumTab items={publicForum} link={link} />}
      {tab === "blog" && <BlogTab items={publicBlog} link={link} />}
      {tab === "events" && <EventsTab items={publicEvents} link={link} />}
      {tab === "media" && <MediaTab items={publicMedia} link={link} />}
      {tab === "knowledge" && <KnowledgeTab items={publicKnowledge} link={link} />}
      {tab === "news" && <NewsTab items={publicNews} link={link} />}
      {tab === "groups" && <GroupsTab items={publicGroups} link={link} />}
    </div>
  );
}

type LinkFn = (appPath: string, publicPath: string) => string;

function ForumTab({ items, link }: { items: ForumTopic[]; link: LinkFn }) {
  if (items.length === 0) return <EmptyState icon={<MessagesSquare size={18} />} title="هنوز موضوع عمومی‌ای در انجمن ثبت نشده" />;
  return (
    <div className="card divide-y divide-ink-100">
      {items.map((t) => (
        <Link key={t.id} to={link(`/dashboard/forum/${t.id}`, `/public/forum/${t.id}`)} className="p-4 flex items-center justify-between gap-4 hover:bg-ink-50/60">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm truncate text-ink-900">{t.title}</h3>
              {t.solved && (
                <Badge tone="success" icon={<CheckCircle2 size={11} />}>
                  حل‌شده
                </Badge>
              )}
            </div>
            <p className="text-xs text-ink-400 mt-1">
              توسط {t.author} · دسته: {t.category} · آخرین فعالیت {t.lastActivity}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-ink-500 shrink-0">
            <span className="flex items-center gap-1">
              <MessageCircle size={13} /> {t.replies}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={13} /> {t.views}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function BlogTab({ items, link }: { items: BlogPost[]; link: LinkFn }) {
  if (items.length === 0) return <EmptyState icon={<NotebookPen size={18} />} title="هنوز یادداشت عمومی‌ای در بلاگ منتشر نشده" />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((b) => (
        <Link key={b.id} to={link("/dashboard/blog", `/public/blog/${b.id}`)} className="card p-5 block hover:border-brand-300 transition-colors">
          <h3 className="font-bold text-sm text-ink-900">{b.title}</h3>
          <p className="text-xs text-ink-500 mt-2 leading-6">{b.excerpt}</p>
          <div className="flex items-center gap-1.5 mt-3">
            {b.tags.map((t) => (
              <Badge key={t} tone="neutral" icon={<Hash size={10} />}>
                {t}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-ink-100 text-xs text-ink-400">
            <span>
              {b.author} · {b.date}
            </span>
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <Star size={13} className="fill-amber-500 text-amber-500" /> {b.rating}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function EventsTab({ items, link }: { items: EventItem[]; link: LinkFn }) {
  if (items.length === 0) return <EmptyState icon={<CalendarDays size={18} />} title="هنوز رویداد عمومی‌ای منتشر نشده" />;
  return (
    <div className="space-y-3">
      {items.map((e) => (
        <Link key={e.id} to={link("/dashboard/events", `/public/events/${e.id}`)} className="card p-4 flex items-start gap-4 hover:border-brand-300 transition-colors">
          <div className="w-14 h-14 rounded-lg bg-navy-900 text-white flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] text-navy-300">{e.jalaliDate.split("/")[1] ?? "—"}</span>
            <span className="text-base font-bold leading-tight">{e.jalaliDate.split("/")[2] ?? "—"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-ink-900">{e.title}</h3>
            <p className="text-xs text-ink-500 mt-1 leading-6">{e.description}</p>
            <div className="flex items-center gap-4 mt-2.5 text-[11px] text-ink-400 flex-wrap">
              <span className="flex items-center gap-1">
                <CalendarDays size={12} /> {e.jalaliDate} · {e.time}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {e.location}
              </span>
              <span className="flex items-center gap-1">
                <Users size={12} /> {e.attendees} شرکت‌کننده
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2.5">
              {e.hashtags.map((h) => (
                <Badge key={h} tone="neutral" icon={<Hash size={10} />}>
                  {h}
                </Badge>
              ))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function MediaTab({ items, link }: { items: MediaItem[]; link: LinkFn }) {
  if (items.length === 0) return <EmptyState icon={<ImageIcon size={18} />} title="هنوز تصویر یا ویدیوی عمومی‌ای بارگذاری نشده" />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((m) => (
        <Link key={m.id} to={link("/dashboard/media", `/public/media/${m.id}`)} className="card overflow-hidden block">
          <div className="h-28 flex items-center justify-center relative shrink-0" style={{ backgroundColor: m.color }}>
            {m.kind === "video" ? <PlayCircle size={28} className="text-white" /> : <ImageIcon size={28} className="text-white" />}
            <span className="absolute top-2 right-2">
              <Badge tone="navy" icon={m.kind === "video" ? <Video size={10} /> : <ImageIcon size={10} />}>
                {m.kind === "video" ? "ویدیو" : "تصویر"}
              </Badge>
            </span>
          </div>
          <div className="p-3">
            <p className="text-xs font-semibold text-ink-900 truncate">{m.title}</p>
            <p className="text-[11px] text-ink-400 mt-1">{m.album} · {m.uploadedBy}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-ink-400">{m.date}</span>
              <span className="flex items-center gap-1 text-amber-600 text-[11px] font-medium">
                <Star size={11} className="fill-amber-500 text-amber-500" /> {m.rating}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function KnowledgeTab({ items, link }: { items: KnowledgeDoc[]; link: LinkFn }) {
  if (items.length === 0) return <EmptyState icon={<BookOpen size={18} />} title="هنوز سند عمومی‌ای منتشر نشده" />;
  return (
    <div className="card divide-y divide-ink-100">
      {items.map((d) => (
        <Link key={d.id} to={link("/dashboard/knowledge", `/public/knowledge/${d.id}`)} className="p-4 flex items-center justify-between gap-4 hover:bg-ink-50/60">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">
              <FileText size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-900 truncate">{d.title}</p>
              <p className="text-xs text-ink-400 mt-0.5">{d.category} · مالک: {d.owner} · بروزرسانی {d.updatedAt}</p>
            </div>
          </div>
          <Badge tone={typeTone[d.type]}>{d.type}</Badge>
        </Link>
      ))}
    </div>
  );
}

function NewsTab({ items, link }: { items: NewsItem[]; link: LinkFn }) {
  if (items.length === 0) return <EmptyState icon={<Newspaper size={18} />} title="هنوز خبر عمومی‌ای منتشر نشده" />;
  return (
    <div className="space-y-3">
      {items.map((n) => (
        <Link key={n.id} to={link("/dashboard/news", `/public/news/${n.id}`)} className="card p-5 block hover:border-brand-300 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-sm text-ink-900 flex-1">{n.title}</h3>
            {n.pinned && (
              <Badge tone="brand" icon={<Pin size={11} />}>
                مهم
              </Badge>
            )}
          </div>
          <p className="text-xs text-ink-500 leading-6">{n.summary}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100 text-xs text-ink-400">
            <span>{n.date}</span>
            <span className="flex items-center gap-1">
              <MessageCircle size={13} /> {n.comments} نظر
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function GroupsTab({ items, link }: { items: Group[]; link: LinkFn }) {
  if (items.length === 0) return <EmptyState icon={<Users size={18} />} title="هنوز گروه عمومی‌ای در این پلتفرم منتشر نشده" />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((g) => (
        <Link key={g.id} to={link(`/dashboard/groups/${g.id}`, `/public/groups/${g.id}`)} className="card p-4 flex flex-col gap-3 hover:border-brand-300 transition-colors">
          <div className="flex items-center justify-between">
            <span
              className="w-11 h-11 rounded-lg flex items-center justify-center text-white font-bold text-base"
              style={{ backgroundColor: g.color }}
            >
              {g.name.slice(0, 1)}
            </span>
            <Badge tone="success" icon={<Globe2 size={10} />}>عمومی</Badge>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-ink-900">{g.name}</h3>
            <p className="text-xs text-ink-500 mt-1 line-clamp-2">{g.description}</p>
          </div>
          <div className="flex items-center justify-between text-xs text-ink-400 pt-2 border-t border-ink-100">
            <span className="flex items-center gap-1"><Users size={13} /> {g.members.toLocaleString("fa-IR")} عضو</span>
            <span className="text-ink-400">{g.category}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
