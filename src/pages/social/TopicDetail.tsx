// ---------------------------------------------------------------------------
// جزئیات پرسش — Topic + پاسخ‌های تو در تو (ForumPost با parent_id)
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MessagesSquare, Pin, PinOff, Lock, Unlock, Eye, Send, Pencil, Trash2, CornerDownLeft, X, Paperclip, Globe2, EyeOff, Calendar } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useSocial } from "../../context/SocialContext";
import { useTenancy } from "../../context/TenancyContext";
import { endpoints } from "../../social/endpoints";
import type { Attachment, ForumPost } from "../../social/types";
import { ApiChip, AttachmentList, AttachmentPicker, CategoryBadges, PrivacyBadge, PublishBadge, ReactionBar, TagList, UserLine, fa, stamp } from "./kit";
import { TopicEditor } from "./ForumPage";

const MAX_DEPTH = 2; // ۳ سطح: ۰، ۱، ۲

export default function TopicDetail() {
  const { id = "" } = useParams();
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const moderator = hasPermission("forum.moderate");

  const topic = s.topics.find((t) => t.id === id);
  const viewed = useRef<string | null>(null);
  useEffect(() => {
    if (topic && viewed.current !== id) {
      viewed.current = id;
      s.viewTopic(id);
    }
    // فقط یک بار برای هر پرسش
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!topic]);

  const [text, setText] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [showFiles, setShowFiles] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  const isOwner = topic?.user_id === s.me;
  const hidden = !topic || topic.deleted_at || !s.canView(topic, moderator) || ((topic.is_draft || !topic.is_public) && !isOwner && !moderator);

  const header = (
    <PageHeader
      title={topic && !hidden ? topic.title : "پرسش"}
      icon={<MessagesSquare size={20} />}
      breadcrumb={[{ label: "پرسش و پاسخ", to: "/dashboard/forum" }, { label: "جزئیات پرسش" }]}
      actions={
        <span className="flex items-center gap-1.5 flex-wrap">
          <ApiChip
            items={[
              { label: "جزئیات پرسش", ep: { method: "GET", path: `/forums/forums/topics/${id}/` } },
              { label: "پاسخ‌ها", ep: endpoints.topicPosts(id) },
              { label: "ثبت پاسخ", ep: endpoints.postCreate() },
              { label: "ویرایش پاسخ", ep: endpoints.postUpdate("{id}") },
              { label: "حذف پاسخ", ep: endpoints.postDelete("{id}") },
              { label: "سنجاق", ep: endpoints.topicPin(id) },
              { label: "قفل", ep: endpoints.topicLock(id) },
              { label: "انتشار", ep: endpoints.topicPublish(id) },
              { label: "لغو انتشار", ep: endpoints.topicUnpublish(id) },
              { label: "ویرایش پرسش", ep: endpoints.topicUpdate(id) },
              { label: "حذف پرسش", ep: endpoints.topicDelete(id) },
              { label: "واکنش پرسش", ep: endpoints.reactionToggle("topic") },
              { label: "واکنش پاسخ", ep: endpoints.reactionToggle("post") },
            ]}
          />
          {topic && !hidden && moderator && (
            <>
              <Button size="sm" icon={topic.is_pinned ? <PinOff size={13} /> : <Pin size={13} />} onClick={() => (s.pinTopic(id), notify(topic.is_pinned ? "سنجاق برداشته شد." : "پرسش سنجاق شد.", "success"))}>
                {topic.is_pinned ? "برداشتن سنجاق" : "سنجاق"}
              </Button>
              <Button size="sm" icon={topic.is_locked ? <Unlock size={13} /> : <Lock size={13} />} onClick={() => (s.lockTopic(id), notify(topic.is_locked ? "پرسش باز شد." : "پرسش قفل شد.", "success"))}>
                {topic.is_locked ? "بازکردن" : "قفل"}
              </Button>
            </>
          )}
          {topic && !hidden && (isOwner || moderator) && (
            <>
              {topic.is_draft || !topic.is_public ? (
                <Button size="sm" icon={<Globe2 size={13} />} onClick={() => (s.publishTopic(id, true), notify("پرسش منتشر شد.", "success"))}>
                  انتشار
                </Button>
              ) : (
                <Button size="sm" icon={<EyeOff size={13} />} onClick={() => (s.publishTopic(id, false), notify("انتشار پرسش لغو شد.", "info"))}>
                  لغو انتشار
                </Button>
              )}
              <Button size="sm" icon={<Pencil size={13} />} onClick={() => setEditorOpen(true)}>
                ویرایش
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 size={13} />}
                onClick={() =>
                  confirm({
                    title: "این پرسش حذف شود؟",
                    message: "همه‌ی پاسخ‌های آن هم حذف می‌شوند.",
                    onConfirm: () => {
                      s.deleteTopic(id);
                      notify("پرسش حذف شد.", "success");
                      navigate("/dashboard/forum");
                    },
                  })
                }
              >
                حذف
              </Button>
            </>
          )}
        </span>
      }
    />
  );

  if (!topic || hidden)
    return (
      <div>
        {header}
        <EmptyState icon={<MessagesSquare size={22} />} title="پرسش پیدا نشد" description="این پرسش وجود ندارد یا اجازه‌ی دیدن آن را ندارید." />
      </div>
    );

  const posts = s.posts.filter((p) => p.topic_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const alive = posts.filter((p) => !p.deleted_at);
  const childrenOf = (pid: string | null) => posts.filter((p) => (pid === null ? !p.parent_id || !posts.some((x) => x.id === p.parent_id) : p.parent_id === pid));
  const hasLiveDescendant = (pid: string): boolean => posts.some((p) => p.parent_id === pid && (!p.deleted_at || hasLiveDescendant(p.id)));

  const canReply = (hasPermission("forum.reply") || moderator) && (!topic.is_locked || moderator);

  const submit = () => {
    if (!text.trim()) return setError("متن پاسخ خالی است.");
    const r = s.createPost(id, text.trim(), replyTo, files);
    if (!r.ok) return setError(r.error);
    setText("");
    setFiles([]);
    setShowFiles(false);
    setReplyTo(null);
    setError("");
    notify("پاسخ ثبت شد.", "success");
  };

  const startReply = (p: ForumPost) => {
    setReplyTo(p.id);
    boxRef.current?.focus();
    boxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const removePost = (p: ForumPost) =>
    confirm({
      title: "این پاسخ حذف شود؟",
      message: hasLiveDescendant(p.id) ? "چون به آن پاسخ داده شده، به‌جای متن «این پاسخ حذف شده است» نمایش داده می‌شود." : undefined,
      onConfirm: () => {
        s.deletePost(p.id);
        if (replyTo === p.id) setReplyTo(null);
        notify("پاسخ حذف شد.", "success");
      },
    });

  // تابع رندر (نه کامپوننت تو در تو) تا textarea ویرایش هنگام تایپ فوکوس را از دست ندهد
  const renderPost = (p: ForumPost, depth: number): ReactNode => {
    const kids = childrenOf(p.id);
    if (p.deleted_at && !hasLiveDescendant(p.id)) return null;
    const mine = p.user_id === s.me;
    return (
      <div key={p.id} className={depth ? "mr-4 sm:mr-8 mt-2 border-r-2 border-ink-100 pr-3" : ""}>
        {p.deleted_at ? (
          <div className="rounded-lg p-3 bg-ink-50 text-xs text-ink-400 italic">این پاسخ حذف شده است</div>
        ) : (
          <div className="rounded-lg p-3 bg-ink-50">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <UserLine id={p.user_id} size={24} sub={`${stamp(p.created_at)}${p.updated_at !== p.created_at && p.updated_at > p.created_at ? " · ویرایش‌شده" : ""}`} />
              <span className="flex items-center gap-0.5 shrink-0">
                {mine && editingId !== p.id && (
                  <button
                    onClick={() => {
                      setEditingId(p.id);
                      setEditText(p.content);
                    }}
                    className="p-1.5 rounded-md text-ink-400 hover:text-brand-600 hover:bg-brand-50"
                    title="ویرایش (PATCH …/posts/{id}/)"
                    aria-label="ویرایش پاسخ"
                  >
                    <Pencil size={13} />
                  </button>
                )}
                {(mine || moderator) && (
                  <button onClick={() => removePost(p)} className="p-1.5 rounded-md text-ink-400 hover:text-rose-600 hover:bg-rose-50" title="حذف (DELETE …/posts/{id}/)" aria-label="حذف پاسخ">
                    <Trash2 size={13} />
                  </button>
                )}
              </span>
            </div>
            {editingId === p.id ? (
              <div className="space-y-2">
                <textarea className="input-field min-h-[70px]" value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      if (!editText.trim()) return;
                      s.updatePost(p.id, editText.trim());
                      setEditingId(null);
                      notify("پاسخ ویرایش شد.", "success");
                    }}
                  >
                    ذخیره
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    انصراف
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-ink-800 leading-7 whitespace-pre-wrap">{p.content}</p>
            )}
            {p.attachments.length > 0 && (
              <div className="mt-2">
                <AttachmentList items={p.attachments} />
              </div>
            )}
            <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
              <ReactionBar entity="post" id={p.id} compact />
              {canReply && depth < MAX_DEPTH && (
                <button onClick={() => startReply(p)} className="text-[11.5px] text-brand-700 flex items-center gap-1">
                  <CornerDownLeft size={12} /> پاسخ
                </button>
              )}
            </div>
          </div>
        )}
        {kids.map((k) => renderPost(k, Math.min(depth + 1, MAX_DEPTH)))}
      </div>
    );
  };

  const roots = childrenOf(null);

  return (
    <div>
      {header}

      <div className="card p-4 sm:p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <UserLine id={topic.user_id} size={34} sub={`ثبت: ${stamp(topic.created_at)}${topic.updated_at !== topic.created_at ? ` · آخرین فعالیت: ${stamp(topic.updated_at)}` : ""}`} />
          <span className="flex items-center gap-1.5 flex-wrap">
            {topic.is_pinned && (
              <span className="text-[11px] text-brand-700 flex items-center gap-1">
                <Pin size={12} /> سنجاق‌شده
              </span>
            )}
            {topic.is_locked && (
              <span className="text-[11px] text-amber-700 flex items-center gap-1">
                <Lock size={12} /> قفل‌شده
              </span>
            )}
            <PublishBadge item={topic} />
            <PrivacyBadge value={topic.privacy} />
          </span>
        </div>
        <p className="text-[14px] text-ink-800 leading-8 whitespace-pre-wrap">{topic.content}</p>
        {topic.attachments.length > 0 && (
          <div className="mt-3">
            <AttachmentList items={topic.attachments} />
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <CategoryBadges ids={topic.category_ids} />
          <TagList tags={topic.tags} />
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap mt-4 pt-3 border-t border-ink-100">
          <ReactionBar entity="topic" id={topic.id} />
          <span className="flex items-center gap-3 text-[11.5px] text-ink-500">
            <span className="flex items-center gap-1">
              <Eye size={13} /> {fa(topic.view_count)} بازدید
            </span>
            {topic.published_at && (
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {stamp(topic.published_at)}
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <p className="text-sm font-bold text-ink-900 mb-3">پاسخ‌ها ({fa(alive.length)})</p>
        <div className="space-y-3">
          {roots.map((p) => renderPost(p, 0))}
          {alive.length === 0 && <p className="text-xs text-ink-400">هنوز پاسخی ثبت نشده است.</p>}
        </div>

        <div className="mt-5 pt-4 border-t border-ink-100">
          {topic.is_locked && !moderator ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 flex items-center gap-2">
              <Lock size={14} /> این پرسش قفل شده و پاسخ جدید نمی‌پذیرد.
            </div>
          ) : !canReply ? (
            <p className="text-xs text-ink-400">شما اجازه‌ی ثبت پاسخ ندارید (forum.reply).</p>
          ) : (
            <div className="space-y-2">
              {topic.is_locked && <p className="text-[11px] text-amber-700">پرسش قفل است؛ شما به‌عنوان ناظر همچنان می‌توانید پاسخ دهید.</p>}
              {replyTo && (
                <p className="text-[11.5px] text-ink-500 flex items-center gap-1">
                  در پاسخ به «{s.userName(posts.find((p) => p.id === replyTo)?.user_id ?? "")}»
                  <button onClick={() => setReplyTo(null)} className="text-ink-400 hover:text-rose-600" aria-label="لغو پاسخ">
                    <X size={12} />
                  </button>
                </p>
              )}
              <textarea ref={boxRef} className="input-field min-h-[90px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="پاسخ خود را بنویسید… (برای منشن: ‎@نام_خانوادگی)" />
              {showFiles && <AttachmentPicker value={files} onChange={setFiles} />}
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="primary" size="sm" icon={<Send size={13} />} onClick={submit}>
                  ثبت پاسخ
                </Button>
                {!showFiles && (
                  <Button variant="ghost" size="sm" icon={<Paperclip size={13} />} onClick={() => setShowFiles(true)}>
                    افزودن پیوست
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <TopicEditor open={editorOpen} onClose={() => setEditorOpen(false)} topic={topic} />
    </div>
  );
}
