import Avatar from "./Avatar";
import Badge from "./Badge";
import { users, groups, type Post } from "../data/mock";

export default function PostCard({ post }: { post: Post }) {
  const author = users.find((u) => u.id === post.authorId);
  const group = groups.find((g) => g.id === post.groupId);

  return (
    <article className="card p-4">
      <div className="flex items-start gap-3">
        <Avatar name={author?.name ?? "?"} color={author?.avatarColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{author?.name}</span>
            {group && (
              <>
                <span className="text-ink-300">در</span>
                <span className="text-brand-600 font-medium">{group.name}</span>
              </>
            )}
            {post.pinned && <Badge tone="brand">سنجاق‌شده</Badge>}
          </div>
          <p className="text-xs text-ink-400 mt-0.5">{post.time}</p>

          <p className="mt-3 text-sm leading-7 text-ink-800">{post.content}</p>

          {post.attachment?.type === "poll" && (
            <div className="mt-3 rounded-xl border border-ink-100 p-3 bg-ink-50 text-sm">
              <p className="font-medium mb-2">📊 نظرسنجی: {post.attachment.label}</p>
              <div className="space-y-1.5">
                <div className="h-2 rounded-full bg-ink-200 overflow-hidden">
                  <div className="h-full bg-brand-500" style={{ width: "62%" }} />
                </div>
                <p className="text-xs text-ink-400">۶۲٪ از ۴۸ رأی</p>
              </div>
            </div>
          )}

          {post.attachment?.type === "doc" && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-ink-100 p-3 bg-ink-50 text-sm">
              <span>📄</span>
              <span className="font-medium">{post.attachment.label}</span>
            </div>
          )}

          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {post.tags.map((t) => (
              <Badge key={t} tone="ink">#{t}</Badge>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-5 text-ink-400 text-sm border-t border-ink-100 pt-3">
            <button className="flex items-center gap-1 hover:text-rose-500">❤️ {post.likes}</button>
            <button className="flex items-center gap-1 hover:text-brand-600">💬 {post.comments}</button>
            <button className="flex items-center gap-1 hover:text-ink-700">↗️ اشتراک‌گذاری</button>
          </div>
        </div>
      </div>
    </article>
  );
}
