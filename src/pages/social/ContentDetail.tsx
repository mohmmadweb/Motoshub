// ---------------------------------------------------------------------------
// جزئیات مجله / بلاگ / خبر — /content/{kind}/{id}/
// متن کامل، پیوست‌ها (…/attachments/)، واکنش‌ها، نظرها و اقدام‌های صاحب/مدیر.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen, Newspaper, Pencil, Trash2, Send, EyeOff, Eye, Lock, Paperclip } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useSocial } from "../../context/SocialContext";
import { useTenancy } from "../../context/TenancyContext";
import { endpoints } from "../../social/endpoints";
import type { Attachment } from "../../social/types";
import { contentEntity, contentKindLabel } from "../../social/types";
import { ApiChip, AttachmentList, AttachmentPicker, CategoryBadges, CommentsPanel, Poster, PrivacyBadge, PublishBadge, ReactionBar, TagList, UserLine, fa, stamp } from "./kit";
import { ContentEditor, permPrefix } from "./ContentModule";

export default function ContentDetail({ section }: { section: "magazines" | "news" }) {
  const { id = "" } = useParams();
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<Attachment[]>([]);

  const item = s.content.find((x) => x.id === id && (section === "news" ? x.kind === "news" : x.kind !== "news"));

  // POST view — یک بار در هر بار باز شدن صفحه
  const viewed = useRef<string | null>(null);
  useEffect(() => {
    if (item && viewed.current !== id) {
      viewed.current = id;
      s.viewContent(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!item]);

  const listTitle = section === "news" ? "اخبار سازمان" : "مجلات";
  const listPath = section === "news" ? "/dashboard/news" : `/dashboard/magazines${item?.kind === "blogs" ? "?tab=blog" : ""}`;
  const crumbs = [{ label: "شبکه اجتماعی" }, { label: listTitle, to: listPath }];

  const manager = item ? hasPermission(`${permPrefix(item.kind)}.manage`) : false;
  const owner = !!item && item.user_id === s.me;
  const canEdit = owner || manager;
  const allowed = !!item && s.canView(item, manager) && ((item.is_public && !item.is_draft) || canEdit);

  if (!item || !allowed)
    return (
      <div>
        <PageHeader title={listTitle} breadcrumb={crumbs} />
        <EmptyState
          icon={item ? <Lock size={22} /> : section === "news" ? <Newspaper size={22} /> : <BookOpen size={22} />}
          title={item ? "اجازه‌ی مشاهده‌ی این مطلب را ندارید" : "مطلب پیدا نشد"}
          description={item ? "سطح دسترسی (privacy) این مطلب اجازه‌ی نمایش به شما را نمی‌دهد یا هنوز منتشر نشده است." : "ممکن است حذف شده باشد."}
        />
      </div>
    );

  const kind = item.kind;
  const label = contentKindLabel[kind];
  const entity = contentEntity[kind];
  const published = item.is_public && !item.is_draft;

  const togglePublish = () => {
    s.publishContent(item.id, !published);
    notify(published ? `انتشار ${label} لغو شد.` : `${label} منتشر شد.`, published ? "info" : "success");
  };
  const remove = () =>
    confirm({
      title: `حذف «${item.title}»؟`,
      message: "مطلب همراه با نظرهایش حذف می‌شود و قابل بازگشت نیست.",
      onConfirm: () => {
        s.deleteContent(item.id);
        notify(`${label} حذف شد.`, "info");
        navigate(listPath);
      },
    });
  const uploadMore = () => {
    if (!adding.length) return;
    s.addContentAttachments(item.id, adding);
    notify(`${fa(adding.length)} پیوست اضافه شد.`, "success");
    setAdding([]);
  };

  return (
    <div>
      <PageHeader
        title={item.title}
        breadcrumb={[...crumbs, { label: label }]}
        actions={
          <>
            <ApiChip
              items={[
                { label: `جزئیات ${label}`, ep: { method: "GET", path: `/content/${kind}/${item.id}/` } },
                { label: "ویرایش", ep: endpoints.contentUpdate(kind, item.id) },
                { label: "انتشار", ep: endpoints.contentPublish(kind, item.id) },
                { label: "لغو انتشار", ep: endpoints.contentUnpublish(kind, item.id) },
                { label: "حذف", ep: endpoints.contentDelete(kind, item.id) },
                { label: "افزودن پیوست", ep: endpoints.contentAttach(kind, item.id) },
                { label: "واکنش", ep: endpoints.reactionToggle(entity) },
                { label: "نظرها", ep: endpoints.comments(entity) },
                { label: "ثبت نظر", ep: endpoints.commentCreate(entity) },
              ]}
            />
            {canEdit && (
              <>
                <Button size="sm" icon={<Pencil size={13} />} onClick={() => setEditing(true)}>
                  ویرایش
                </Button>
                <Button size="sm" icon={published ? <EyeOff size={13} /> : <Send size={13} />} onClick={togglePublish}>
                  {published ? "لغو انتشار" : "انتشار"}
                </Button>
                <Button size="sm" variant="ghost" icon={<Trash2 size={13} />} onClick={remove} className="!text-rose-600">
                  حذف
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <article className="lg:col-span-2 card overflow-hidden">
          <Poster color={item.poster} className="h-44 sm:h-56 !rounded-none">
            <span className="flex flex-wrap gap-1">
              <PublishBadge item={item} />
              {item.privacy !== "EVERYONE" && <PrivacyBadge value={item.privacy} />}
            </span>
          </Poster>
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <UserLine id={item.user_id} size={32} sub={item.published_at ? `انتشار ${stamp(item.published_at)}` : `ایجاد ${stamp(item.created_at)}`} />
              <span className="text-[11px] text-ink-400 flex items-center gap-1">
                <Eye size={12} /> {fa(item.views)} بازدید
                {item.updated_at !== item.created_at && <span className="mr-2">· ویرایش {stamp(item.updated_at)}</span>}
              </span>
            </div>
            {item.excerpt && <p className="text-[13px] text-ink-600 leading-7 border-r-2 border-brand-300 pr-3">{item.excerpt}</p>}
            <div className="text-[14px] text-ink-800 leading-8 whitespace-pre-wrap">{item.content}</div>
            {(item.category_ids.length > 0 || item.tags.length > 0) && (
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-ink-100">
                <CategoryBadges ids={item.category_ids} />
                <TagList tags={item.tags} />
              </div>
            )}
            <div className="pt-3 border-t border-ink-100">
              <ReactionBar entity={entity} id={item.id} />
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          {(item.attachments.length > 0 || canEdit) && (
            <div className="card p-4 space-y-3">
              <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
                <Paperclip size={14} /> پیوست‌ها ({fa(item.attachments.length)})
              </p>
              {item.attachments.length ? (
                <AttachmentList
                  items={item.attachments}
                  onRemove={
                    canEdit
                      ? (aid) => {
                          s.removeContentAttachment(item.id, aid);
                          notify("پیوست حذف شد.", "info");
                        }
                      : undefined
                  }
                />
              ) : (
                <p className="text-xs text-ink-400">پیوستی ندارد.</p>
              )}
              {canEdit && (
                <div className="space-y-2">
                  <AttachmentPicker value={adding} onChange={setAdding} label="افزودن پیوست (POST …/attachments/)" />
                  {adding.length > 0 && (
                    <Button size="sm" variant="primary" onClick={uploadMore}>
                      بارگذاری {fa(adding.length)} فایل
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="card p-4">
            <CommentsPanel entity={entity} id={item.id} ownerId={item.user_id} allowAdd={item.add_comment} show={item.show_comment} />
          </div>
        </aside>
      </div>

      <ContentEditor open={editing} onClose={() => setEditing(false)} kind={kind} item={item} />
    </div>
  );
}
