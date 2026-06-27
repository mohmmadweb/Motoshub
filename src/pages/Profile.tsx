import { useParams } from "react-router-dom";
import { users, posts, projects } from "../data/mock";
import Avatar from "../components/Avatar";
import Badge from "../components/Badge";
import PostCard from "../components/PostCard";

export default function Profile() {
  const { id } = useParams();
  const user = users.find((u) => u.id === id) ?? users[0];
  const userPosts = posts.filter((p) => p.authorId === user.id);
  const userProjects = projects.filter((p) => p.tasks.some((t) => t.assignee === user.name));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <aside className="space-y-4">
        <div className="card p-5 text-center">
          <Avatar name={user.name} color={user.avatarColor} size={72} online={user.online} />
          <h1 className="font-bold mt-3">{user.name}</h1>
          <p className="text-sm text-ink-500">{user.role}</p>
          <p className="text-xs text-ink-400 mt-1">{user.org}</p>
          <button className="mt-4 w-full bg-brand-600 text-white text-sm font-medium py-2 rounded-xl hover:bg-brand-700">
            ارسال پیام
          </button>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold mb-3">مهارت‌ها و تخصص‌ها</h3>
          <div className="flex flex-wrap gap-1.5">
            {user.skills.map((s) => (
              <Badge key={s} tone="brand">{s}</Badge>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold mb-3">پروژه‌های در حال فعالیت</h3>
          {userProjects.length === 0 ? (
            <p className="text-xs text-ink-400">پروژه فعالی ثبت نشده.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {userProjects.map((p) => (
                <li key={p.id} className="text-ink-600">📊 {p.name}</li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="space-y-4">
        <h2 className="font-bold text-sm text-ink-500">فعالیت‌های اخیر</h2>
        {userPosts.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-400">پستی ثبت نشده.</div>
        ) : (
          userPosts.map((p) => <PostCard key={p.id} post={p} />)
        )}
      </div>
    </div>
  );
}
