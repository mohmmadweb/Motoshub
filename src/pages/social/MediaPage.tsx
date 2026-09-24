// ---------------------------------------------------------------------------
// «رسانه» — /media/media/posts/
// شبکه‌ی کاشی‌های تصویر/ویدیو/آلبوم با فیلتر نوع، موضوع، وضعیت و جستجو در کپشن؛
// فرم بارگذاری هم‌شکل MediaPostStoreRequest. MediaEditor در صفحه‌ی جزئیات هم استفاده می‌شود.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Link } from "react-router-dom";
import { Image as ImageIcon, Film, Layers, Play, Plus, Search, Upload, SmilePlus, MessageSquare } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/ToastProvider";
import { useSocial } from "../../context/SocialContext";
import { useTenancy } from "../../context/TenancyContext";
import { endpoints } from "../../social/endpoints";
import type { Attachment, MediaPost, MediaPostType } from "../../social/types";
import { mediaTypeLabel } from "../../social/types";
import { ApiChip, AttachmentList, AttachmentPicker, Field, Poster, PosterPicker, PrivacyBadge, PublishBadge, PublishOptions, defaultPublish, fa, type PublishState } from "./kit";
import { Segmented, StatStrip, matchesStatus, statusTabs, type StatusFilter } from "./ContentModule";

export const mediaTypeIcon: Record<MediaPostType, typeof ImageIcon> = { image: ImageIcon, video: Film, album: Layers };

// ---------------------------------------------------------------- ویرایشگر
function MediaForm({ item, onDone }: { item?: MediaPost; onDone: (id?: string) => void }) {
  const { saveMedia } = useSocial();
  const { notify } = useToast();
  const [caption, setCaption] = useState(item?.caption ?? "");
  const [postType, setPostType] = useState<MediaPostType>(item?.post_type ?? "image");
  const [poster, setPoster] = useState<string | null>(item?.poster ?? "#0d9488");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [pub, setPub] = useState<PublishState>(
    item
      ? defaultPublish({ privacy: item.privacy, category_ids: item.category_ids, tags: item.tags, is_draft: item.is_draft, add_comment: item.add_comment, show_comment: item.show_comment, send_notification: false })
      : defaultPublish()
  );
  const [err, setErr] = useState<string | null>(null);
  const existing = item?.attachments.length ?? 0;

  const save = () => {
    const total = existing + files.length;
    if (postType === "album" && total < 2) return setErr("آلبوم دست‌کم به ۲ فایل نیاز دارد.");
    if (total < 1) return setErr("دست‌کم یک فایل تصویر یا ویدیو انتخاب کنید.");
    const bad = files.find((f) => !f.mime.startsWith("image/") && !f.mime.startsWith("video/"));
    if (bad) return setErr(`«${bad.name}» تصویر یا ویدیو نیست.`);
    const id = saveMedia({
      id: item?.id,
      caption: caption.trim(),
      post_type: postType,
      poster,
      add_comment: pub.add_comment ?? true,
      show_comment: pub.show_comment ?? true,
      privacy: pub.privacy,
      category_ids: pub.category_ids,
      tags: pub.tags,
      is_draft: pub.is_draft,
      published_date: pub.published_date || undefined,
      published_time: pub.published_time || undefined,
      uploaded_files: files,
      send_notification: pub.send_notification,
    });
    notify(item ? "پست رسانه ویرایش شد." : pub.is_draft ? "پست رسانه به‌صورت پیش‌نویس ذخیره شد." : "پست رسانه منتشر شد.", "success");
    onDone(id);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-3">
          <Field label="نوع پست (post_type) *">
            <Segmented
              value={postType}
              onChange={(v) => {
                setPostType(v);
                setErr(null);
              }}
              options={(["image", "video", "album"] as MediaPostType[]).map((t) => ({ id: t, label: mediaTypeLabel[t] }))}
            />
          </Field>
          <Field label="کپشن (caption)">
            <textarea className="input-field min-h-[90px]" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="توضیح کوتاه… (برای منشن: ‎@نام_خانوادگی)" autoFocus />
          </Field>
          <PosterPicker value={poster} onChange={setPoster} />
          {item && existing > 0 && (
            <Field label="فایل‌های فعلی">
              <AttachmentList items={item.attachments} />
            </Field>
          )}
          <AttachmentPicker value={files} onChange={setFiles} accept="image/*,video/*" label={postType === "album" ? "فایل‌های آلبوم (uploaded_files) — دست‌کم ۲ فایل" : "فایل (uploaded_files)"} />
        </div>
        <div className="lg:col-span-2">
          <PublishOptions entity="media" value={pub} onChange={setPub} notifyOption={!item} />
        </div>
      </div>
      {err && <p className="text-xs text-rose-600">{err}</p>}
      <div className="flex items-center gap-2 pt-2 border-t border-ink-100">
        <Button variant="primary" icon={<Upload size={14} />} onClick={save}>
          {item ? "ذخیره‌ی تغییرات" : pub.is_draft ? "ذخیره‌ی پیش‌نویس" : "بارگذاری و انتشار"}
        </Button>
        <Button variant="ghost" onClick={() => onDone()}>
          انصراف
        </Button>
        <code dir="ltr" className="text-[10.5px] text-ink-400 mr-auto hidden sm:block">
          {item ? "PATCH /media/media/posts/{id}/" : "POST /media/media/posts/"}
        </code>
      </div>
    </div>
  );
}

/** مودال بارگذاری/ویرایش پست رسانه (MediaPostStoreRequest) */
export function MediaEditor({ open, onClose, item, onSaved }: { open: boolean; onClose: () => void; item?: MediaPost; onSaved?: (id: string) => void }) {
  return (
    <Modal open={open} onClose={onClose} title={item ? "ویرایش پست رسانه" : "بارگذاری رسانه"} width="max-w-3xl">
      {open && (
        <MediaForm
          key={item?.id ?? "new"}
          item={item}
          onDone={(id) => {
            onClose();
            if (id) onSaved?.(id);
          }}
        />
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- کاشی
const tileHeights = ["h-40", "h-56", "h-48", "h-64"];
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function MediaTile({ m }: { m: MediaPost }) {
  const s = useSocial();
  const I = mediaTypeIcon[m.post_type];
  const reactions = s.reactionSummary("media", m.id).total;
  const comments = s.commentsFor("media", m.id).length;
  return (
    <Link to={`/dashboard/media/${m.id}`} className="block mb-3 break-inside-avoid group">
      <div className="relative rounded-xl overflow-hidden">
        <Poster color={m.poster} className={`${tileHeights[hash(m.id) % tileHeights.length]} !rounded-none !p-0 !items-stretch`}>
          <span className="flex flex-col justify-between w-full p-2.5 bg-gradient-to-t from-black/55 via-transparent to-transparent">
            <span className="flex items-start justify-between gap-1">
              <span className="flex flex-wrap gap-1">
                <PublishBadge item={m} />
                {m.privacy !== "EVERYONE" && <PrivacyBadge value={m.privacy} />}
              </span>
              <span className="flex items-center gap-1 text-[11px] bg-black/35 rounded-md px-1.5 py-0.5 shrink-0" title={mediaTypeLabel[m.post_type]}>
                <I size={12} />
                {m.post_type === "album" && fa(m.attachments.length)}
              </span>
            </span>
            {m.post_type === "video" && (
              <span className="self-center w-11 h-11 rounded-full bg-black/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play size={20} className="translate-x-[-1px]" fill="currentColor" />
              </span>
            )}
            <span className="block">
              {m.caption && <span className="block text-[12px] leading-5 line-clamp-2">{m.caption}</span>}
              <span className="flex items-center gap-2.5 text-[10.5px] opacity-85 mt-1">
                <span>{s.userName(m.user_id)}</span>
                <span className="flex items-center gap-0.5">
                  <SmilePlus size={11} /> {fa(reactions)}
                </span>
                <span className="flex items-center gap-0.5">
                  <MessageSquare size={11} /> {fa(comments)}
                </span>
              </span>
            </span>
          </span>
        </Poster>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------- صفحه
export default function MediaPage() {
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const manager = hasPermission("media.manage");
  const canUpload = hasPermission("media.upload") || manager;
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | MediaPostType>("all");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState<StatusFilter>("published");
  const [creating, setCreating] = useState(false);

  const cats = s.categoriesOf("media");
  const list = s.media
    .filter((m) => s.canView(m, manager))
    .filter((m) => matchesStatus(m, status, s.me, manager, s.today))
    .filter((m) => type === "all" || m.post_type === type)
    .filter((m) => !cat || m.category_ids.includes(cat))
    .filter((m) => !q || m.caption.includes(q) || m.tags.some((t) => t.includes(q)))
    .sort((a, b) => (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at));

  const dash = s.dashboard("media", "user");

  return (
    <div>
      <PageHeader
        title="رسانه"
        description="تصویر، ویدیو و آلبوم‌های همکاران"
        icon={<ImageIcon size={20} />}
        actions={
          <>
            <ApiChip
              items={[
                { label: "پست‌های منتشرشده", ep: endpoints.mediaList() },
                { label: "بارگذاری پست", ep: endpoints.mediaCreate() },
                { label: "موضوع‌ها", ep: endpoints.categories("media") },
                { label: "خلاصه‌ی واکنش‌ها", ep: endpoints.reactionSummary("media") },
                { label: "داشبورد کاربر", ep: endpoints.dashboard("media/media", "user") },
              ]}
            />
            {canUpload && (
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreating(true)}>
                بارگذاری
              </Button>
            )}
          </>
        }
      />

      <StatStrip items={dash.map((d) => ({ title: d.key === "posts" ? "پست‌های منتشرشده‌ی من" : d.title, value: d.value }))} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field !pr-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در کپشن‌ها…" />
        </div>
        <Segmented
          value={type}
          onChange={setType}
          options={[{ id: "all" as const, label: "همه" }, ...(["image", "video", "album"] as MediaPostType[]).map((t) => ({ id: t, label: mediaTypeLabel[t] }))]}
        />
        <select className="input-field !w-auto min-w-[130px]" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="فیلتر موضوع">
          <option value="">همه‌ی موضوع‌ها</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.parent_id ? `↳ ${c.title}` : c.title}
            </option>
          ))}
        </select>
        <Segmented value={status} onChange={setStatus} options={statusTabs} />
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<ImageIcon size={22} />}
          title={status === "drafts" ? "پیش‌نویسی ندارید" : "رسانه‌ای پیدا نشد"}
          description={q || cat || type !== "all" ? "جستجو یا فیلترها را تغییر دهید." : canUpload ? "با دکمه‌ی «بارگذاری» اولین تصویر یا ویدیو را منتشر کنید." : undefined}
        />
      ) : (
        <div className="columns-2 md:columns-3 xl:columns-4 gap-3">
          {list.map((m) => (
            <MediaTile key={m.id} m={m} />
          ))}
        </div>
      )}

      <MediaEditor open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
