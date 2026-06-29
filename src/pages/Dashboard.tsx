import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ImagePlus,
  BarChart3,
  Paperclip,
  Hash,
  CalendarDays,
  MapPin,
  MessagesSquare,
  NotebookPen,
  Image,
  BookOpen,
  Globe2,
} from "lucide-react";
import { api } from "../lib/api";
import { groups, users, currentUser, type Post } from "../data/mock";
import { useContent } from "../context/ContentContext";
import PostCard from "../components/PostCard";
import Avatar from "../components/Avatar";
import Badge from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import Tabs from "../components/ui/Tabs";
import EmptyState from "../components/ui/EmptyState";

type DashboardTab = "feed" | "public";

type PublicFeedItem = {
  id: string;
  module: "انجمن" | "بلاگ" | "رویداد" | "رسانه" | "دانش";
  icon: typeof MessagesSquare;
  title: string;
  meta: string;
  to: string;
};

export default function Dashboard() {
  const [tab, setTab] = useState<DashboardTab>("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { forumTopics, blogPosts, events, mediaItems, knowledgeDocs } = useContent();

  useEffect(() => {
    api.feed.list().then((data) => {
      setPosts(data);
      setLoading(false);
    });
  }, []);

  const nextEvent = events[0];

  const publicFeed: PublicFeedItem[] = useMemo(() => {
    const items: PublicFeedItem[] = [];
    forumTopics
      .filter((t) => t.visibility === "عمومی")
      .forEach((t) => items.push({ id: `forum-${t.id}`, module: "انجمن", icon: MessagesSquare, title: t.title, meta: `توسط ${t.author} · دسته: ${t.category}`, to: `/app/forum/${t.id}` }));
    blogPosts
      .filter((b) => b.visibility === "عمومی")
      .forEach((b) => items.push({ id: `blog-${b.id}`, module: "بلاگ", icon: NotebookPen, title: b.title, meta: `${b.author} · ${b.date}`, to: "/app/blog" }));
    events
      .filter((e) => e.visibility === "عمومی")
      .forEach((e) => items.push({ id: `event-${e.id}`, module: "رویداد", icon: CalendarDays, title: e.title, meta: `${e.jalaliDate} · ${e.location}`, to: "/app/events" }));
    mediaItems
      .filter((m) => m.visibility === "عمومی")
      .forEach((m) => items.push({ id: `media-${m.id}`, module: "رسانه", icon: Image, title: m.title, meta: `${m.album} · ${m.uploadedBy}`, to: "/app/media" }));
    knowledgeDocs
      .filter((d) => d.visibility === "عمومی")
      .forEach((d) => items.push({ id: `doc-${d.id}`, module: "دانش", icon: BookOpen, title: d.title, meta: `${d.owner} · ${d.updatedAt}`, to: "/app/knowledge" }));
    return items;
  }, [forumTopics, blogPosts, events, mediaItems, knowledgeDocs]);

  const moduleTone: Record<PublicFeedItem["module"], "brand" | "success" | "warning" | "navy" | "neutral"> = {
    انجمن: "brand",
    بلاگ: "success",
    رویداد: "warning",
    رسانه: "navy",
    دانش: "neutral",
  };

  return (
    <div>
      <PageHeader title={`خوش آمدید، ${currentUser.name}`} description="نمای کلی فعالیت‌های گروه‌ها، انجمن و رویدادهای سازمان شما" />

      <Tabs
        tabs={[
          { id: "feed", label: "فید سازمانی" },
          { id: "public", label: "محتوای عمومی", count: publicFeed.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "feed" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-4">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <Avatar name={currentUser.name} color={currentUser.avatarColor} />
                <input
                  placeholder="چه چیزی در ذهن دارید؟ یک پست، نظرسنجی یا سند به اشتراک بگذارید…"
                  className="flex-1 input-field"
                />
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs text-ink-500">
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-ink-50">
                  <ImagePlus size={14} /> تصویر/ویدیو
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-ink-50">
                  <BarChart3 size={14} /> نظرسنجی
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-ink-50">
                  <Paperclip size={14} /> سند
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-ink-50">
                  <Hash size={14} /> هشتگ
                </button>
              </div>
            </div>

            {loading ? (
              <div className="card p-8 text-center text-sm text-ink-400">در حال بارگذاری فید…</div>
            ) : (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            )}
          </div>

          <aside className="space-y-4">
            <div className="card p-4">
              <h3 className="font-bold text-sm mb-3 text-ink-900">گروه‌های من</h3>
              <div className="space-y-2.5">
                {groups.slice(0, 4).map((g) => (
                  <Link key={g.id} to={`/app/groups/${g.id}`} className="flex items-center gap-2.5 hover:bg-ink-50 rounded-lg p-1.5 -m-1.5">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: g.color }}>
                      {g.name.slice(0, 1)}
                    </span>
                    <span className="flex-1 text-xs font-medium truncate">{g.name}</span>
                    {g.unread > 0 && <Badge tone="brand">{g.unread}</Badge>}
                  </Link>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <h3 className="font-bold text-sm mb-3 text-ink-900">کاربران آنلاین</h3>
              <div className="space-y-2.5">
                {users.filter((u) => u.online).map((u) => (
                  <div key={u.id} className="flex items-center gap-2.5">
                    <Avatar name={u.name} color={u.avatarColor} size={32} online />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{u.name}</p>
                      <p className="text-[11px] text-ink-400 truncate">{u.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link to="/app/events" className="card p-4 block hover:border-brand-300 transition-colors">
              <h3 className="font-bold text-sm mb-2 text-ink-900 flex items-center gap-1.5">
                <CalendarDays size={15} className="text-brand-600" /> رویداد پیش‌رو
              </h3>
              <p className="text-xs text-ink-700 font-medium">{nextEvent.title}</p>
              <p className="text-[11px] text-ink-400 mt-1.5 flex items-center gap-1">
                <MapPin size={11} /> {nextEvent.jalaliDate} · {nextEvent.time}
              </p>
            </Link>
          </aside>
        </div>
      ) : (
        <div>
          <div className="card p-3 mb-4 bg-emerald-50 border-emerald-200 flex items-start gap-2.5">
            <Globe2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 leading-6">
              این تب فقط محتوایی را نشان می‌دهد که هنگام ایجاد یا از داخل لیست خودش، روی «عمومی» تنظیم شده — یعنی هر عضو عادی سازمان آن را می‌بیند.
              هر آیتم محتوایی که «خصوصی» باشد در این‌جا نشان داده نمی‌شود.
            </p>
          </div>

          {publicFeed.length === 0 ? (
            <EmptyState icon={<Globe2 size={18} />} title="هنوز محتوای عمومی‌ای ثبت نشده" />
          ) : (
            <div className="card divide-y divide-ink-100">
              {publicFeed.map((item) => (
                <Link key={item.id} to={item.to} className="p-4 flex items-center gap-3 hover:bg-ink-50/60">
                  <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">
                    <item.icon size={15} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{item.title}</p>
                    <p className="text-xs text-ink-400 mt-0.5">{item.meta}</p>
                  </div>
                  <Badge tone={moduleTone[item.module]}>{item.module}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
