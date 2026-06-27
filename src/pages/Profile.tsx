import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Briefcase, ShieldCheck, MessageCircle, Laptop, Smartphone, MapPin, LogOut } from "lucide-react";
import { users, posts, projects, activeSessions } from "../data/mock";
import Avatar from "../components/Avatar";
import Badge from "../components/ui/Badge";
import PostCard from "../components/PostCard";
import Tabs from "../components/ui/Tabs";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";

type TabId = "activity" | "organization" | "security";

export default function Profile() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<TabId>((params.get("tab") as TabId) || "activity");
  const user = users.find((u) => u.id === id) ?? users[0];
  const userPosts = posts.filter((p) => p.authorId === user.id);
  const userProjects = projects.filter((p) => p.tasks.some((t) => t.assignee === user.name));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <aside className="space-y-4">
        <div className="card p-5 text-center">
          <Avatar name={user.name} color={user.avatarColor} size={72} online={user.online} />
          <h1 className="font-bold mt-3 text-ink-900">{user.name}</h1>
          <p className="text-sm text-ink-500">{user.role}</p>
          <p className="text-xs text-ink-400 mt-1">{user.org}</p>
          <Button variant="primary" icon={<MessageCircle size={14} />} className="w-full justify-center mt-4">
            ارسال پیام
          </Button>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold mb-3 text-ink-900">مهارت‌ها و تخصص‌ها</h3>
          <div className="flex flex-wrap gap-1.5">
            {user.skills.map((s) => (
              <Badge key={s} tone="brand">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </aside>

      <div>
        <Tabs<TabId>
          tabs={[
            { id: "activity", label: "فعالیت‌ها" },
            { id: "organization", label: "اطلاعات سازمانی" },
            { id: "security", label: "امنیت و نشست‌ها" },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === "activity" && (
          <div className="space-y-4">
            {userPosts.length === 0 ? (
              <EmptyState title="پستی ثبت نشده" />
            ) : (
              userPosts.map((p) => <PostCard key={p.id} post={p} />)
            )}
          </div>
        )}

        {tab === "organization" && (
          <div className="card p-5">
            <h3 className="text-sm font-bold mb-4 text-ink-900 flex items-center gap-1.5">
              <Briefcase size={15} className="text-brand-600" /> پروفایل سازمانی
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-5">
              <div>
                <dt className="text-xs text-ink-400 mb-1">سازمان</dt>
                <dd className="text-ink-800 font-medium">{user.org}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-400 mb-1">سمت سازمانی</dt>
                <dd className="text-ink-800 font-medium">{user.role}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-400 mb-1">سطح دسترسی</dt>
                <dd><Badge tone="navy">عضو عادی</Badge></dd>
              </div>
            </dl>
            <h4 className="text-xs font-bold text-ink-500 mb-2">پروژه‌های در حال فعالیت</h4>
            {userProjects.length === 0 ? (
              <p className="text-xs text-ink-400">پروژه فعالی ثبت نشده.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {userProjects.map((p) => (
                  <li key={p.id} className="text-ink-700">{p.name}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "security" && (
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="text-sm font-bold mb-4 text-ink-900 flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-brand-600" /> نشست‌های فعال
              </h3>
              <div className="space-y-3">
                {activeSessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">
                      {s.device.includes("Android") || s.device.includes("iPhone") ? <Smartphone size={15} /> : <Laptop size={15} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-800">
                        {s.device} {s.current && <Badge tone="success">نشست فعلی</Badge>}
                      </p>
                      <p className="text-xs text-ink-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={11} /> {s.location} · {s.ip} · {s.lastActive}
                      </p>
                    </div>
                    {!s.current && (
                      <Button variant="secondary" size="sm" icon={<LogOut size={12} />}>
                        پایان نشست
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
