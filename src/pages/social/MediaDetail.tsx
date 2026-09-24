// ---------------------------------------------------------------------------
// جزئیات پست رسانه — /media/media/posts/{id}/
// نمایشگر بزرگ (آلبوم با نوار بندانگشتی)، کپشن، واکنش‌ها، نظرها و اقدام‌های صاحب/مدیر.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Image as ImageIcon, Lock, Pencil, Trash2, Send, EyeOff, Play, ChevronRight, ChevronLeft } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Badge from "../../components/ui/Badge";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useSocial } from "../../context/SocialContext";
import { useTenancy } from "../../context/TenancyContext";
import { endpoints } from "../../social/endpoints";
import { mediaTypeLabel } from "../../social/types";
import { ApiChip, CategoryBadges, CommentsPanel, Poster, PrivacyBadge, PublishBadge, ReactionBar, TagList, UserLine, fa, fileIcon, stamp } from "./kit";
import { MediaEditor, mediaTypeIcon } from "./MediaPage";

export default function MediaDetail() {
  const { id = "" } = useParams();
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [idx, setIdx] = useState(0);

  const m = s.media.find((x) => x.id === id);
  const manager = hasPermission("media.manage");
  const owner = !!m && m.user_id === s.me;
  const canEdit = owner || manager;
  const allowed = !!m && s.canView(m, manager) && ((m.is_public && !m.is_draft) || canEdit);
  const crumbs = [{ label: "شبکه اجتماعی" }, { label: "رسانه", to: "/dashboard/media" }];

  if (!m || !allowed)
    return (
      <div>
        <PageHeader title="رسانه" breadcrumb={crumbs} />
        <EmptyState
          icon={m ? <Lock size={22} /> : <ImageIcon size={22} />}
          title={m ? "اجازه‌ی مشاهده‌ی این پست را ندارید" : "پست رسانه پیدا نشد"}
          description={m ? "سطح دسترسی (privacy) این پست اجازه‌ی نمایش به شما را نمی‌دهد یا هنوز منتشر نشده است." : "ممکن است حذف شده باشد."}
        />
      </div>
    );

  const published = m.is_public && !m.is_draft;
  const TypeIcon = mediaTypeIcon[m.post_type];
  const files = m.attachments;
  const cur = files[Math.min(idx, Math.max(0, files.length - 1))];
  const isAlbum = m.post_type === "album" && files.length > 0;
  const showsVideo = m.post_type === "video" || (cur?.mime.startsWith("video/") ?? false);
  const title = m.caption ? (m.caption.length > 48 ? `${m.caption.slice(0, 48)}…` : m.caption) : `${mediaTypeLabel[m.post_type]} بدون کپشن`;

  const togglePublish = () => {
    s.publishMedia(m.id, !published);
    notify(published ? "انتشار پست لغو شد." : "پست منتشر شد.", published ? "info" : "success");
  };
  const remove = () =>
    confirm({
      title: "حذف این پست رسانه؟",
      message: "پست و فایل‌هایش حذف می‌شوند و قابل بازگشت نیست.",
      onConfirm: () => {
        s.deleteMedia(m.id);
        notify("پست رسانه حذف شد.", "info");
        navigate("/dashboard/media");
      },
    });
  const step = (d: number) => setIdx((i) => (i + d + files.length) % files.length);

  return (
    <div>
      <PageHeader
        title={title}
        breadcrumb={[...crumbs, { label: mediaTypeLabel[m.post_type] }]}
        actions={
          <>
            <ApiChip
              items={[
                { label: "جزئیات پست", ep: { method: "GET", path: `/media/media/posts/${m.id}/` } },
                { label: "ویرایش", ep: endpoints.mediaUpdate(m.id) },
                { label: "انتشار", ep: endpoints.mediaPublish(m.id) },
                { label: "لغو انتشار", ep: endpoints.mediaUnpublish(m.id) },
                { label: "حذف", ep: endpoints.mediaDelete(m.id) },
                { label: "واکنش", ep: endpoints.reactionToggle("media") },
                { label: "نظرها", ep: endpoints.comments("media") },
                { label: "ثبت نظر", ep: endpoints.commentCreate("media") },
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
        <div className="lg:col-span-2 space-y-3">
          <div className="card overflow-hidden">
            <Poster color={m.poster} className="h-64 sm:h-96 !rounded-none !p-0 !items-stretch">
              <div className="relative w-full flex flex-col justify-between p-3">
                <span className="flex items-start justify-between gap-2">
                  <span className="flex flex-wrap gap-1">
                    <PublishBadge item={m} />
                    {m.privacy !== "EVERYONE" && <PrivacyBadge value={m.privacy} />}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] bg-black/35 rounded-md px-2 py-0.5">
                    <TypeIcon size={12} /> {mediaTypeLabel[m.post_type]}
                    {isAlbum && ` · ${fa(idx + 1)} از ${fa(files.length)}`}
                  </span>
                </span>
                {showsVideo ? (
                  <button onClick={() => notify("پخش ویدیو — در نسخه‌ی متصل فایل از سرور استریم می‌شود.", "info")} className="self-center w-16 h-16 rounded-full bg-black/40 hover:bg-black/55 flex items-center justify-center" aria-label="پخش">
                    <Play size={28} fill="currentColor" />
                  </button>
                ) : (
                  <span className="self-center opacity-70">
                    <ImageIcon size={40} />
                  </span>
                )}
                <span className="text-[11.5px] opacity-90 truncate" dir="auto">
                  {cur?.name ?? "بدون فایل"}
                </span>
                {isAlbum && files.length > 1 && (
                  <>
                    <button onClick={() => step(-1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 hover:bg-black/55 flex items-center justify-center" aria-label="قبلی">
                      <ChevronRight size={18} />
                    </button>
                    <button onClick={() => step(1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 hover:bg-black/55 flex items-center justify-center" aria-label="بعدی">
                      <ChevronLeft size={18} />
                    </button>
                  </>
                )}
              </div>
            </Poster>
          </div>

          {isAlbum && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {files.map((a, i) => {
                const I = fileIcon(a.mime);
                return (
                  <button
                    key={a.id}
                    onClick={() => setIdx(i)}
                    title={a.name}
                    className={`shrink-0 w-16 h-16 rounded-lg flex flex-col items-center justify-center gap-1 text-white border-2 ${i === idx ? "border-brand-500" : "border-transparent opacity-70 hover:opacity-100"}`}
                    style={{ background: `color-mix(in srgb, ${m.poster ?? "#1f4f99"} ${100 - (i % 4) * 15}%, #000)` }}
                  >
                    <I size={16} />
                    <span className="text-[10px] tabular-nums">{fa(i + 1)}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="card p-5 space-y-4">
            <UserLine id={m.user_id} size={32} sub={m.published_at ? `انتشار ${stamp(m.published_at)}` : `ایجاد ${stamp(m.created_at)}`} />
            {m.caption ? <p className="text-[14px] text-ink-800 leading-7 whitespace-pre-wrap">{m.caption}</p> : <p className="text-xs text-ink-400">بدون کپشن</p>}
            {(m.category_ids.length > 0 || m.tags.length > 0) && (
              <div className="flex flex-wrap items-center gap-3">
                <CategoryBadges ids={m.category_ids} />
                <TagList tags={m.tags} />
              </div>
            )}
            {!isAlbum && files.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {files.map((a) => (
                  <Badge key={a.id} tone="neutral">
                    {a.name} · {a.size}
                  </Badge>
                ))}
              </div>
            )}
            <div className="pt-3 border-t border-ink-100">
              <ReactionBar entity="media" id={m.id} />
            </div>
          </div>
        </div>

        <aside className="card p-4 h-fit">
          <CommentsPanel entity="media" id={m.id} ownerId={m.user_id} allowAdd={m.add_comment} show={m.show_comment} />
        </aside>
      </div>

      <MediaEditor open={editing} onClose={() => setEditing(false)} item={m} />
    </div>
  );
}
