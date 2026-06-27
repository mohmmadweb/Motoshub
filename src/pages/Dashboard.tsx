import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ImagePlus, BarChart3, Paperclip, Hash, CalendarDays, MapPin } from "lucide-react";
import { api } from "../lib/api";
import { groups, users, currentUser, events, type Post } from "../data/mock";
import PostCard from "../components/PostCard";
import Avatar from "../components/Avatar";
import Badge from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";

export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.feed.list().then((data) => {
      setPosts(data);
      setLoading(false);
    });
  }, []);

  const nextEvent = events[0];

  return (
    <div>
      <PageHeader title={`خوش آمدید، ${currentUser.name}`} description="نمای کلی فعالیت‌های گروه‌ها، انجمن و رویدادهای سازمان شما" />

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
    </div>
  );
}
