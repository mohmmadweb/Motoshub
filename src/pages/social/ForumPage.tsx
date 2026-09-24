// ---------------------------------------------------------------------------
// «پرسش و پاسخ» — فهرست پرسش‌ها (Topic) مطابق /forums/forums/topics/
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessagesSquare, Pin, Lock, Plus, Search, Eye, MessageCircle, Clock, Hash } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { useSocial } from "../../context/SocialContext";
import { useTenancy } from "../../context/TenancyContext";
import { endpoints } from "../../social/endpoints";
import type { Attachment, Topic } from "../../social/types";
import { ApiChip, AttachmentList, AttachmentPicker, CategoryBadges, Field, PublishBadge, PublishOptions, UserLine, defaultPublish, fa, stamp, type PublishState } from "./kit";

type Sort = "activity" | "views" | "unanswered";
type Scope = "all" | "mine" | "unanswered";

/** ویرایشگر پرسش — هم‌شکل TopicStoreRequest (title, content, uploaded_files, privacy, category_ids, tags, is_draft, published_date/time, send_notification) */
export function TopicEditor({ open, onClose, topic, onSaved }: { open: boolean; onClose: () => void; topic?: Topic | null; onSaved?: (id: string) => void }) {
  // با کلید باز/بسته شدن، فرم از نو ساخته می‌شود
  return open ? <TopicForm key={topic?.id ?? "new"} onClose={onClose} topic={topic ?? null} onSaved={onSaved} /> : null;
}

function TopicForm({ onClose, topic, onSaved }: { onClose: () => void; topic: Topic | null; onSaved?: (id: string) => void }) {
  const { saveTopic } = useSocial();
  const { notify } = useToast();
  const [title, setTitle] = useState(topic?.title ?? "");
  const [content, setContent] = useState(topic?.content ?? "");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [pub, setPub] = useState<PublishState>(() =>
    defaultPublish(topic ? { privacy: topic.privacy, category_ids: topic.category_ids, tags: topic.tags, is_draft: topic.is_draft, send_notification: false } : {})
  );
  const [error, setError] = useState("");

  const submit = () => {
    if (!title.trim()) return setError("عنوان پرسش الزامی است.");
    if (!content.trim()) return setError("متن پرسش الزامی است.");
    const id = saveTopic({
      id: topic?.id,
      title: title.trim(),
      content: content.trim(),
      privacy: pub.privacy,
      category_ids: pub.category_ids,
      tags: pub.tags,
      is_draft: pub.is_draft,
      published_date: pub.published_date || undefined,
      published_time: pub.published_time || undefined,
      uploaded_files: files,
      send_notification: pub.send_notification,
    });
    notify(topic ? "پرسش ویرایش شد." : pub.is_draft ? "پرسش به‌صورت پیش‌نویس ذخیره شد." : "پرسش منتشر شد.", "success");
    onSaved?.(id);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={topic ? "ویرایش پرسش" : "پرسش جدید"} description={topic ? "PATCH /forums/forums/topics/{id}/" : "POST /forums/forums/topics/"} width="max-w-2xl">
      <div className="space-y-4">
        <Field label="عنوان (title)">
          <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="پرسش خود را کوتاه و روشن بنویسید" />
        </Field>
        <Field label="متن پرسش (content)" hint="برای منشن: ‎@نام_خانوادگی">
          <textarea className="input-field min-h-[140px]" value={content} onChange={(e) => setContent(e.target.value)} placeholder="جزئیات، آنچه امتحان کرده‌اید و انتظارتان از پاسخ…" />
        </Field>
        {topic && topic.attachments.length > 0 && (
          <Field label="پیوست‌های فعلی">
            <AttachmentList items={topic.attachments} />
          </Field>
        )}
        <AttachmentPicker value={files} onChange={setFiles} label={topic ? "افزودن پیوست (uploaded_files)" : undefined} />
        <PublishOptions entity="topic" value={pub} onChange={setPub} comments={false} notifyOption={!topic} />
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex items-center gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>
            انصراف
          </Button>
          <Button variant="primary" onClick={submit}>
            {topic ? "ذخیره" : pub.is_draft ? "ذخیره پیش‌نویس" : "ثبت پرسش"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function ForumPage() {
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const moderator = hasPermission("forum.moderate");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState<Sort>("activity");
  const [scope, setScope] = useState<Scope>("all");
  const [editorOpen, setEditorOpen] = useState(false);

  const cats = s.categoriesOf("topic");
  const roots = cats.filter((c) => !c.parent_id || !cats.some((x) => x.id === c.parent_id));

  const answers = useMemo(() => {
    const m: Record<string, number> = {};
    s.posts.forEach((p) => {
      if (!p.deleted_at) m[p.topic_id] = (m[p.topic_id] ?? 0) + 1;
    });
    return m;
  }, [s.posts]);

  const visible = s.topics.filter((t) => !t.deleted_at && s.canView(t, moderator) && (t.is_public && !t.is_draft ? true : t.user_id === s.me || moderator));

  const list = (() => {
    const catIds = cat ? [cat, ...cats.filter((c) => c.parent_id === cat).map((c) => c.id)] : [];
    const needle = q.trim();
    const out = visible.filter(
      (t) =>
        (!needle || t.title.includes(needle) || t.content.includes(needle) || t.tags.some((x) => x.includes(needle.replace(/^#/, "")))) &&
        (!catIds.length || t.category_ids.some((c) => catIds.includes(c))) &&
        (scope !== "mine" || t.user_id === s.me) &&
        (scope !== "unanswered" || !answers[t.id]) &&
        (sort !== "unanswered" || !answers[t.id])
    );
    const cmp = (a: Topic, b: Topic) => (sort === "views" ? b.view_count - a.view_count : b.updated_at.localeCompare(a.updated_at));
    return out.sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || cmp(a, b));
  })();

  const scopes: { id: Scope; label: string }[] = [
    { id: "all", label: "همه" },
    { id: "mine", label: "پرسش‌های من" },
    { id: "unanswered", label: "بی‌پاسخ" },
  ];

  return (
    <div>
      <PageHeader
        title="پرسش و پاسخ"
        description="پرسش‌های همکاران، پاسخ‌های تو در تو و تجربه‌های مشترک"
        icon={<MessagesSquare size={20} />}
        actions={
          <span className="flex items-center gap-2 flex-wrap">
            <ApiChip
              items={[
                { label: "فهرست پرسش‌ها", ep: endpoints.topicList() },
                { label: "موضوع‌ها", ep: endpoints.categories("topic") },
                { label: "ثبت پرسش", ep: endpoints.topicCreate() },
                { label: "ویرایش پرسش", ep: endpoints.topicUpdate("{id}") },
              ]}
            />
            {hasPermission("forum.create") && (
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => setEditorOpen(true)}>
                پرسش جدید
              </Button>
            )}
          </span>
        }
      />

      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field !pr-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در عنوان، متن یا هشتگ…" />
        </div>
        <select className="input-field !w-auto min-w-[140px]" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="موضوع">
          <option value="">همه‌ی موضوع‌ها</option>
          {roots.flatMap((r) => [
            <option key={r.id} value={r.id}>
              {r.title}
            </option>,
            ...cats
              .filter((c) => c.parent_id === r.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {"↳ "}
                  {c.title}
                </option>
              )),
          ])}
        </select>
        <select className="input-field !w-auto min-w-[140px]" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="مرتب‌سازی">
          <option value="activity">تازه‌ترین فعالیت</option>
          <option value="views">بیشترین بازدید</option>
          <option value="unanswered">بی‌پاسخ‌ها</option>
        </select>
        <div className="flex rounded-lg border border-ink-200 p-0.5 bg-ink-50">
          {scopes.map((x) => (
            <button key={x.id} onClick={() => setScope(x.id)} className={`text-xs px-3 py-1.5 rounded-md whitespace-nowrap ${scope === x.id ? "bg-white shadow-sm text-brand-700 font-medium" : "text-ink-500 hover:text-ink-800"}`}>
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<MessagesSquare size={22} />} title="پرسشی پیدا نشد" description="فیلترها را تغییر دهید یا اولین پرسش را ثبت کنید." />
      ) : (
        <div className="card divide-y divide-ink-100">
          {list.map((t) => {
            const n = answers[t.id] ?? 0;
            return (
              <Link key={t.id} to={`/dashboard/forum/${t.id}`} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-ink-50/60">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    {t.is_pinned && <Pin size={13} className="text-brand-600 shrink-0" aria-label="سنجاق‌شده" />}
                    {t.is_locked && <Lock size={13} className="text-amber-600 shrink-0" aria-label="قفل‌شده" />}
                    <span className="text-[14px] font-bold text-ink-900 leading-6">{t.title}</span>
                    <PublishBadge item={t} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <UserLine id={t.user_id} size={20} link={false} />
                    <CategoryBadges ids={t.category_ids} />
                    {/* لینک هشتگ داخل لینک ردیف مجاز نیست؛ فقط نمایش */}
                    {t.tags.map((x) => (
                      <span key={x} className="text-[11px] text-brand-700 flex items-center">
                        <Hash size={10} />
                        {x}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[11.5px] text-ink-500 shrink-0">
                  <span className={`flex items-center gap-1 ${n ? "text-emerald-700" : "text-ink-400"}`} title="پاسخ‌ها">
                    <MessageCircle size={13} /> {fa(n)} پاسخ
                  </span>
                  <span className="flex items-center gap-1" title="بازدید">
                    <Eye size={13} /> {fa(t.view_count)}
                  </span>
                  <span className="flex items-center gap-1" title="آخرین فعالیت">
                    <Clock size={12} /> {stamp(t.updated_at)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <TopicEditor open={editorOpen} onClose={() => setEditorOpen(false)} />
    </div>
  );
}
