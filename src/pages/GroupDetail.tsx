import { useState } from "react";
import { useParams } from "react-router-dom";
import { Lock, Globe2, Flag, UserPlus, FileText, MessagesSquare } from "lucide-react";
import { groups, posts, users } from "../data/mock";
import PostCard from "../components/PostCard";
import Badge from "../components/ui/Badge";
import Avatar from "../components/Avatar";
import Tabs from "../components/ui/Tabs";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";

type TabId = "posts" | "forum" | "members" | "docs";

export default function GroupDetail() {
  const { id } = useParams();
  const group = groups.find((g) => g.id === id);
  const [tab, setTab] = useState<TabId>("posts");

  if (!group) return <p>گروه پیدا نشد.</p>;

  const groupPosts = posts.filter((p) => p.groupId === group.id);
  const members = users.slice(0, group.members > 4 ? 4 : group.members);

  return (
    <div>
      <div className="rounded-lg border border-ink-200 bg-navy-900 p-6 mb-5 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <span className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-xl shrink-0" style={{ backgroundColor: group.color }}>
            {group.name.slice(0, 1)}
          </span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-white">{group.name}</h1>
              <Badge tone={group.privacy === "خصوصی" ? "warning" : "success"} icon={group.privacy === "خصوصی" ? <Lock size={11} /> : <Globe2 size={11} />}>
                {group.privacy}
              </Badge>
            </div>
            <p className="text-sm text-navy-200">{group.description}</p>
            <p className="text-xs text-navy-300 mt-2">{group.members.toLocaleString("fa-IR")} عضو · دسته‌بندی: {group.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Flag size={13} />}>
            گزارش تخلف
          </Button>
          <Button variant="primary" size="sm" icon={<UserPlus size={13} />}>
            عضو شده‌اید
          </Button>
        </div>
      </div>

      <Tabs<TabId>
        tabs={[
          { id: "posts", label: "پست‌ها", count: groupPosts.length },
          { id: "forum", label: "انجمن گروه" },
          { id: "members", label: "اعضا و ناظمان", count: group.members },
          { id: "docs", label: "اسناد گروه" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "posts" && (
        <div className="space-y-4">
          {groupPosts.length === 0 ? (
            <EmptyState title="هنوز پستی در این گروه ثبت نشده" />
          ) : (
            groupPosts.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </div>
      )}

      {tab === "forum" && (
        <EmptyState icon={<MessagesSquare size={20} />} title="تالار گفتگوی این گروه" description="موضوعات این گروه از ماژول انجمن سراسری فیلتر و این‌جا نمایش داده می‌شود." />
      )}

      {tab === "members" && (
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map((m, i) => (
            <div key={m.id} className="flex items-center gap-3 p-2">
              <Avatar name={m.name} color={m.avatarColor} online={m.online} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{m.name}</p>
                <p className="text-xs text-ink-400 truncate">{m.role}</p>
              </div>
              {i === 0 && <Badge tone="navy">ناظم گروه</Badge>}
            </div>
          ))}
        </div>
      )}

      {tab === "docs" && (
        <EmptyState icon={<FileText size={20} />} title="اسناد گروه" description="اسناد بارگذاری‌شده در این گروه، از ماژول مدیریت دانش با دسته‌بندی این گروه نمایش داده می‌شود." />
      )}
    </div>
  );
}
