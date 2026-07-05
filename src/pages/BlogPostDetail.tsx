import { useParams } from "react-router-dom";
import { NotebookPen, Star, Hash, Send, MessageCircle } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { users } from "../data/mock";
import Avatar from "../components/Avatar";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { VisibilityToggle, VisibilityBadge } from "../components/ui/VisibilityControl";
import { useToast } from "../components/ui/ToastProvider";

export default function BlogPostDetail() {
  const { id } = useParams();
  const { blogPosts, setBlogPosts } = useContent();
  const { notify } = useToast();
  const post = blogPosts.find((b) => b.id === id);

  if (!post) return (
    <div className="card p-8 text-center text-sm text-ink-400">یادداشت پیدا نشد.</div>
  );

  const author = users.find((u) => u.name === post.author) ?? users[0];

  const toggleVisibility = () => {
    const next = post.visibility === "عمومی" ? "خصوصی" : "عمومی";
    setBlogPosts((prev) => prev.map((b) => b.id === post.id ? { ...b, visibility: next } : b));
    notify(`«${post.title}» به ${next} تغییر یافت.`, next === "عمومی" ? "success" : "info");
  };

  return (
    <div>
      <PageHeader
        title={post.title}
        breadcrumb={[{ label: "بلاگ", to: "/dashboard/blog" }, { label: post.title }]}
        icon={<NotebookPen size={18} />}
        actions={
          <div className="flex items-center gap-2">
            <VisibilityBadge visibility={post.visibility} />
            <VisibilityToggle visibility={post.visibility} onChange={toggleVisibility} size="sm" />
          </div>
        }
      />

      <div className="max-w-3xl space-y-4">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Avatar name={author.name} color={author.avatarColor} />
              <div>
                <p className="text-sm font-semibold">{author.name}</p>
                <p className="text-xs text-ink-400">{post.date}</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-sm text-amber-600 font-medium">
              <Star size={15} className="fill-amber-500 text-amber-500" /> {post.rating}
            </span>
          </div>

          <h1 className="text-xl font-bold text-ink-900 mb-4 leading-8">{post.title}</h1>
          <p className="text-sm text-ink-700 leading-8">{post.excerpt}</p>

          <div className="flex items-center gap-1.5 mt-6 flex-wrap">
            {post.tags.map((t) => (
              <Badge key={t} tone="neutral" icon={<Hash size={10} />}>{t}</Badge>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-ink-600 mb-3 flex items-center gap-1.5">
            <MessageCircle size={13} /> نظرات
          </p>
          <div className="flex items-center gap-2">
            <input className="input-field flex-1" placeholder="نظر یا سوال خود را بنویسید…" />
            <Button variant="primary" icon={<Send size={14} />}>ارسال</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
