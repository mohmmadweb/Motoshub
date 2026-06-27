import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { groups, users, currentUser, type Post } from "../data/mock";
import PostCard from "../components/PostCard";
import Avatar from "../components/Avatar";
import Badge from "../components/Badge";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.feed.list().then((data) => {
      setPosts(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <Avatar name={currentUser.name} color={currentUser.avatarColor} />
            <input
              placeholder="چه چیزی در ذهن دارید؟ یک پست، نظرسنجی یا سند به اشتراک بگذارید…"
              className="flex-1 bg-ink-50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-ink-500">
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-ink-50">🖼️ تصویر/ویدیو</button>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-ink-50">📊 نظرسنجی</button>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-ink-50">📎 سند</button>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-ink-50">#️⃣ هشتگ</button>
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
          <h3 className="font-bold text-sm mb-3">گروه‌های من</h3>
          <div className="space-y-2.5">
            {groups.slice(0, 4).map((g) => (
              <Link key={g.id} to={`/app/groups/${g.id}`} className="flex items-center gap-2.5 hover:bg-ink-50 rounded-lg p-1.5 -m-1.5">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: g.color }}>
                  {g.name.slice(0, 1)}
                </span>
                <span className="flex-1 text-xs font-medium truncate">{g.name}</span>
                {g.unread > 0 && <Badge tone="brand">{g.unread}</Badge>}
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-bold text-sm mb-3">کاربران آنلاین</h3>
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

        <div className="card p-4 bg-brand-50 border-brand-100">
          <h3 className="font-bold text-sm mb-1">🗓️ رویداد پیش‌رو</h3>
          <p className="text-xs text-ink-600">جلسه بازبینی فاز اول پروژه — ۱۴۰۵/۰۳/۰۱ ساعت ۱۰:۰۰</p>
        </div>
      </aside>
    </div>
  );
}
