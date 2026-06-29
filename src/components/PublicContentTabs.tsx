import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MessagesSquare,
  NotebookPen,
  CalendarDays,
  Image as ImageIcon,
  BookOpen,
  Eye,
  MessageCircle,
  CheckCircle2,
  Star,
  Hash,
  MapPin,
  Users,
  Video,
  PlayCircle,
  FileText,
} from "lucide-react";
import { useContent } from "../context/ContentContext";
import type { ForumTopic, BlogPost, EventItem, MediaItem, KnowledgeDoc } from "../data/mock";
import Tabs from "./ui/Tabs";
import Badge, { type BadgeTone } from "./ui/Badge";
import EmptyState from "./ui/EmptyState";

type ModuleTab = "forum" | "blog" | "events" | "media" | "knowledge";

const typeTone: Record<string, BadgeTone> = {
  قرارداد: "warning",
  آموزشی: "success",
  "صورت‌جلسه": "neutral",
  گزارش: "brand",
};

export default function PublicContentTabs({ linkMode = "app" }: { linkMode?: "app" | "login" }) {
  const { forumTopics, blogPosts, events, mediaItems, knowledgeDocs } = useContent();
  const [tab, setTab] = useState<ModuleTab>("forum");

  const publicForum = forumTopics.filter((t) => t.visibility === "عمومی");
  const publicBlog = blogPosts.filter((b) => b.visibility === "عمومی");
  const publicEvents = events.filter((e) => e.visibility === "عمومی");
  const publicMedia = mediaItems.filter((m) => m.visibility === "عمومی");
  const publicKnowledge = knowledgeDocs.filter((d) => d.visibility === "عمومی");

  const link = (appPath: string) => (linkMode === "app" ? appPath : "/login");

  return (
    <div>
      <Tabs
        tabs={[
          { id: "forum", label: "انجمن", count: publicForum.length },
          { id: "blog", label: "بلاگ", count: publicBlog.length },
          { id: "events", label: "رویدادها", count: publicEvents.length },
          { id: "media", label: "تصاویر و ویدیو", count: publicMedia.length },
          { id: "knowledge", label: "مدیریت دانش", count: publicKnowledge.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "forum" && <ForumTab items={publicForum} link={link} />}
      {tab === "blog" && <BlogTab items={publicBlog} link={link} />}
      {tab === "events" && <EventsTab items={publicEvents} link={link} />}
      {tab === "media" && <MediaTab items={publicMedia} link={link} />}
      {tab === "knowledge" && <KnowledgeTab items={publicKnowledge} link={link} />}
    </div>
  );
}

function ForumTab({ items, link }: { items: ForumTopic[]; link: (p: string) => string }) {
  if (items.length === 0) return <EmptyState icon={<MessagesSquare size={18} />} title="هنوز موضوع عمومی‌ای در انجمن ثبت نشده" />;
  return (
    <div className="card divide-y divide-ink-100">
      {items.map((t) => (
        <Link key={t.id} to={link(`/app/forum/${t.id}`)} className="p-4 flex items-center justify-between gap-4 hover:bg-ink-50/60">
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

function BlogTab({ items, link }: { items: BlogPost[]; link: (p: string) => string }) {
  if (items.length === 0) return <EmptyState icon={<NotebookPen size={18} />} title="هنوز یادداشت عمومی‌ای در بلاگ منتشر نشده" />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((b) => (
        <Link key={b.id} to={link("/app/blog")} className="card p-5 block hover:border-brand-300 transition-colors">
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

function EventsTab({ items, link }: { items: EventItem[]; link: (p: string) => string }) {
  if (items.length === 0) return <EmptyState icon={<CalendarDays size={18} />} title="هنوز رویداد عمومی‌ای منتشر نشده" />;
  return (
    <div className="space-y-3">
      {items.map((e) => (
        <Link key={e.id} to={link("/app/events")} className="card p-4 flex items-start gap-4 hover:border-brand-300 transition-colors">
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

function MediaTab({ items, link }: { items: MediaItem[]; link: (p: string) => string }) {
  if (items.length === 0) return <EmptyState icon={<ImageIcon size={18} />} title="هنوز تصویر یا ویدیوی عمومی‌ای بارگذاری نشده" />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((m) => (
        <Link key={m.id} to={link("/app/media")} className="card overflow-hidden block">
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

function KnowledgeTab({ items, link }: { items: KnowledgeDoc[]; link: (p: string) => string }) {
  if (items.length === 0) return <EmptyState icon={<BookOpen size={18} />} title="هنوز سند عمومی‌ای منتشر نشده" />;
  return (
    <div className="card divide-y divide-ink-100">
      {items.map((d) => (
        <Link key={d.id} to={link("/app/knowledge")} className="p-4 flex items-center justify-between gap-4 hover:bg-ink-50/60">
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
