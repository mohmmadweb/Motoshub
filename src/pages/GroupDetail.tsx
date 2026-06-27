import { useState } from "react";
import { useParams } from "react-router-dom";
import { groups, posts, users } from "../data/mock";
import PostCard from "../components/PostCard";
import Badge from "../components/Badge";
import Avatar from "../components/Avatar";

const tabs = ["پست‌ها", "انجمن گروه", "اعضا", "اسناد"] as const;

export default function GroupDetail() {
  const { id } = useParams();
  const group = groups.find((g) => g.id === id);
  const [tab, setTab] = useState<typeof tabs[number]>("پست‌ها");

  if (!group) return <p>گروه پیدا نشد.</p>;

  const groupPosts = posts.filter((p) => p.groupId === group.id);
  const members = users.slice(0, group.members > 4 ? 4 : group.members);

  return (
    <div>
      <div
        className="rounded-2xl p-6 text-white mb-5 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${group.color}, #2a1d6b)` }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold">{group.name}</h1>
            <Badge tone={group.privacy === "خصوصی" ? "yellow" : "green"}>{group.privacy}</Badge>
          </div>
          <p className="text-sm text-white/80">{group.description}</p>
          <p className="text-xs text-white/60 mt-2">{group.members.toLocaleString("fa-IR")} عضو · دسته‌بندی: {group.category}</p>
        </div>
        <button className="bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-4 py-2 rounded-xl backdrop-blur">
          عضو شده‌اید ✓
        </button>
      </div>

      <div className="flex items-center gap-1 border-b border-ink-100 mb-5">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
              tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-ink-400 hover:text-ink-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "پست‌ها" && (
        <div className="space-y-4">
          {groupPosts.length === 0 ? (
            <div className="card p-8 text-center text-sm text-ink-400">هنوز پستی در این گروه ثبت نشده.</div>
          ) : (
            groupPosts.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </div>
      )}

      {tab === "انجمن گروه" && (
        <div className="card p-8 text-center text-sm text-ink-400">تالار گفتگوی این گروه — به‌زودی متصل به ماژول انجمن.</div>
      )}

      {tab === "اعضا" && (
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-2">
              <Avatar name={m.name} color={m.avatarColor} online={m.online} />
              <div>
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-ink-400">{m.role}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "اسناد" && (
        <div className="card p-8 text-center text-sm text-ink-400">اسناد گروه — متصل به ماژول مدیریت دانش.</div>
      )}
    </div>
  );
}
