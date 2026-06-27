import { useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Bell, BellOff, Send } from "lucide-react";
import { forumTopics, users } from "../data/mock";
import Avatar from "../components/Avatar";
import Badge from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";

export default function ForumTopic() {
  const { id } = useParams();
  const topic = forumTopics.find((t) => t.id === id);
  const [following, setFollowing] = useState(false);

  if (!topic) return <p>موضوع پیدا نشد.</p>;

  const author = users.find((u) => u.name === topic.author) ?? users[0];

  return (
    <div>
      <PageHeader
        title={topic.title}
        breadcrumb={[{ label: "انجمن", to: "/app/forum" }, { label: topic.category }]}
        actions={
          <Button variant={following ? "primary" : "secondary"} size="sm" icon={following ? <Bell size={13} /> : <BellOff size={13} />} onClick={() => setFollowing((v) => !v)}>
            {following ? "دنبال‌می‌کنید" : "دنبال کردن موضوع"}
          </Button>
        }
      />

      <div className="card p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={author.name} color={author.avatarColor} />
          <div>
            <p className="text-sm font-medium">{author.name}</p>
            <p className="text-xs text-ink-400">{topic.lastActivity}</p>
          </div>
          {topic.solved && (
            <Badge tone="success" icon={<CheckCircle2 size={11} />}>
              حل‌شده
            </Badge>
          )}
        </div>
        <p className="text-sm leading-7 text-ink-800">
          متن کامل سوال/موضوع در این بخش نمایش داده می‌شود. این یک نمونه‌ی نمایشی برای ساختار صفحه‌ی موضوع انجمن است؛
          در نسخه‌ی واقعی محتوای کامل از API انجمن خوانده می‌شود.
        </p>
      </div>

      <h3 className="text-sm font-bold mb-3 text-ink-700">{topic.replies} پاسخ</h3>
      <div className="space-y-3 mb-4">
        {users.slice(1, 3).map((u, i) => (
          <div key={u.id} className="card p-4">
            <div className="flex items-center gap-2.5 mb-2">
              <Avatar name={u.name} color={u.avatarColor} size={32} />
              <p className="text-xs font-medium">{u.name}</p>
              {i === 0 && <Badge tone="success">پاسخ پذیرفته‌شده</Badge>}
            </div>
            <p className="text-sm text-ink-700 leading-7">
              نمونه‌ی متن پاسخ برای نمایش ساختار رشته‌ی پرسش‌و‌پاسخ ذیل هر موضوع انجمن.
            </p>
          </div>
        ))}
      </div>

      <div className="card p-3 flex items-center gap-2">
        <input className="input-field" placeholder="پاسخ خود را بنویسید…" />
        <Button variant="primary" icon={<Send size={14} />}>
          ارسال
        </Button>
      </div>
    </div>
  );
}
