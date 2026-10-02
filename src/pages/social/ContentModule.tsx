// ---------------------------------------------------------------------------
// «مجلات» (مجله + بلاگ) و «اخبار سازمان» — /content/{magazines|blogs|news}/
// فهرست منتشرشده‌ها / پیش‌نویس‌ها، جستجو، فیلتر موضوع و فرم ساخت/ویرایش هم‌شکل
// Blog/News/MagazineStoreRequest. ویرایشگر (ContentEditor) در صفحه‌ی جزئیات هم استفاده می‌شود.
// ---------------------------------------------------------------------------
import ModuleReportsButton from "../../reports/ModuleReportsButton";
import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Newspaper, Plus, Search, MessageSquare, SmilePlus, Eye, Megaphone, BadgeCheck, Send, Save, Undo2 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import Toggle from "../../components/ui/Toggle";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import Badge from "../../components/ui/Badge";
import { useToast } from "../../components/ui/ToastProvider";
import { useSocial } from "../../context/SocialContext";
import { useTenancy } from "../../context/TenancyContext";
import { dayNum } from "../../pm/jalali";
import { endpoints } from "../../social/endpoints";
import type { Attachment, ContentItem, ContentKind, Publishable } from "../../social/types";
import { contentEntity, contentKindLabel } from "../../social/types";
import {
  ApiChip,
  AttachmentPicker,
  AttachmentList,
  Field,
  Poster,
  PosterPicker,
  PrivacyBadge,
  PublishBadge,
  PublishOptions,
  UserLine,
  dateOf,
  defaultPublish,
  fa,
  stamp,
  type PublishState,
} from "./kit";
import { MarkdownEditor } from "../knowledge/Markdown";
import { HiddenBadge, ReviewBadge } from "./moderation";

/** متن ساده‌ی قدیمی ← Markdown (هر خط یک پاراگراف می‌ماند) */
export const plainToMd = (t: string) => t.replace(/\r/g, "").replace(/([^\n])\n(?!\n)/g, "$1\n\n");

// ---------------------------------------------------------------- کمکی‌های مشترک (با صفحه‌ی رسانه)
export type StatusFilter = "published" | "drafts" | "all";
export const statusTabs: { id: StatusFilter; label: string }[] = [
  { id: "published", label: "منتشرشده" },
  { id: "drafts", label: "پیش‌نویس‌های من" },
  { id: "all", label: "همه" },
];

/**
 * قاعده‌ی نمایش در فهرست:
 * منتشرشده = is_public && !is_draft (زمان‌بندی‌شده‌ی آینده فقط برای صاحب/مدیر)،
 * پیش‌نویس = is_draft و (صاحب یا مدیر)، لغو انتشارشده فقط برای صاحب/مدیر.
 */
export function matchesStatus(x: Publishable, status: StatusFilter, me: string, manager: boolean, today: string) {
  const mine = x.user_id === me || manager;
  const future = !!x.published_at && (dayNum(dateOf(x.published_at)) ?? 0) > (dayNum(today) ?? 0);
  const published = x.is_public && !x.is_draft && (!future || mine);
  const draft = x.is_draft && mine;
  if (status === "published") return published;
  if (status === "drafts") return draft;
  return published || draft || (mine && !x.is_public);
}

/** نوار کوچک آمار داشبورد کاربر */
export function StatStrip({ items }: { items: { title: string; value: number }[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] text-ink-500 mb-4">
      {items.map((s) => (
        <span key={s.title}>
          {s.title}: <b className="text-ink-800 tabular-nums">{fa(s.value)}</b>
        </span>
      ))}
    </div>
  );
}

/** کنترل تکه‌ای (segmented) */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="flex rounded-lg border border-ink-200 p-0.5 bg-ink-50 shrink-0">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap ${value === o.id ? "bg-white text-brand-700 font-medium shadow-sm" : "text-ink-500 hover:text-ink-800"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- ویرایشگر
/** مسیر صفحه‌ی جزئیات یک محتوا */
export const contentPath = (x: Pick<ContentItem, "id" | "kind">) => `/dashboard/${x.kind === "news" ? "news" : x.kind === "blogs" ? "blog" : "magazines"}/${x.id}`;
export const permPrefix = (k: ContentKind) => (k === "news" ? "news" : k === "blogs" ? "blog" : "magazines");

function ContentForm({ kind, item, onDone }: { kind: ContentKind; item?: ContentItem; onDone: (id?: string) => void }) {
  const { saveContent } = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  // «پیشنهادی» — بازبینی پیش از انتشار: بدون مجوز manage، مطلب منتشرنشده فقط «ارسال برای بازبینی» می‌شود
  const manager = hasPermission(`${permPrefix(kind)}.manage`);
  const livePublished = !!item && item.is_public && !item.is_draft;
  const needsReview = !manager && !livePublished;
  const [title, setTitle] = useState(item?.title ?? "");
  const [excerpt, setExcerpt] = useState(item?.excerpt ?? "");
  // ویرایشگر غنی (Markdown راست‌به‌چپ) — متن ساده‌ی قدیمی هنگام ویرایش به Markdown تبدیل می‌شود
  const [content, setContent] = useState(item ? (item.content_format === "markdown" ? item.content : plainToMd(item.content)) : "");
  const [poster, setPoster] = useState<string | null>(item?.poster ?? "#1f4f99");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [pub, setPub] = useState<PublishState>(
    item
      ? defaultPublish({ privacy: item.privacy, category_ids: item.category_ids, tags: item.tags, is_draft: item.is_draft, add_comment: item.add_comment, show_comment: item.show_comment, send_notification: false })
      : defaultPublish()
  );
  const [err, setErr] = useState<string | null>(null);
  const label = contentKindLabel[kind];
  // «پیشنهادی» — اطلاعیه‌ی رسمی (فقط خبر)
  const [official, setOfficial] = useState(!!item?.announcement);
  const [requiresAck, setRequiresAck] = useState(item?.announcement?.requires_ack ?? true);
  const [pinUntil, setPinUntil] = useState(item?.announcement?.pin_until ?? "");

  const save = (mode: "default" | "draft" | "review" = "default") => {
    if (!title.trim()) return setErr("عنوان (title) الزامی است.");
    if (!content.trim()) return setErr("متن (content) الزامی است.");
    const asDraft = needsReview ? true : pub.is_draft;
    const id = saveContent(kind, {
      id: item?.id,
      title: title.trim(),
      excerpt: excerpt.trim(),
      content,
      poster,
      add_comment: pub.add_comment ?? true,
      show_comment: pub.show_comment ?? true,
      privacy: pub.privacy,
      category_ids: pub.category_ids,
      tags: pub.tags,
      is_draft: asDraft,
      published_date: needsReview ? undefined : pub.published_date || undefined,
      published_time: needsReview ? undefined : pub.published_time || undefined,
      uploaded_files: files,
      send_notification: needsReview ? false : pub.send_notification,
      announcement: kind === "news" ? (official ? { requires_ack: requiresAck, pin_until: pinUntil || null } : null) : undefined,
      content_format: "markdown",
      submit_review: needsReview && mode === "review",
    });
    notify(
      needsReview
        ? mode === "review"
          ? `${label} برای بازبینی فرستاده شد؛ پس از تأیید مدیر منتشر می‌شود.`
          : `${label} به‌صورت پیش‌نویس ذخیره شد.`
        : item
          ? `${label} ویرایش شد.`
          : pub.is_draft
            ? `${label} به‌صورت پیش‌نویس ذخیره شد.`
            : `${label} منتشر شد.`,
      "success"
    );
    onDone(id);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-3">
          <Field label="عنوان (title) *">
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`عنوان ${label}`} autoFocus />
          </Field>
          <Field label="خلاصه (excerpt)" hint="در کارت فهرست نمایش داده می‌شود.">
            <textarea className="input-field min-h-[60px]" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </Field>
          <Field label="متن (content) *" hint="ویرایشگر راست‌به‌چپ: عنوان، فهرست، پررنگ، پیوند، جدول و نقل‌قول.">
            <MarkdownEditor value={content} onChange={setContent} minHeight={220} />
          </Field>
          <PosterPicker value={poster} onChange={setPoster} />
          {item && item.attachments.length > 0 && (
            <Field label="پیوست‌های فعلی" hint="حذف پیوست‌های فعلی از صفحه‌ی جزئیات انجام می‌شود.">
              <AttachmentList items={item.attachments} />
            </Field>
          )}
          <AttachmentPicker value={files} onChange={setFiles} label={item ? "افزودن پیوست (uploaded_files)" : undefined} />
        </div>
        <div className="lg:col-span-2 space-y-3">
          {kind === "news" && (
            <div className={`rounded-lg border p-3 space-y-3 ${official ? "border-rose-200 bg-rose-50" : "border-ink-200"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-ink-800 flex items-center gap-1.5">
                  <Megaphone size={14} className="text-rose-600" /> اطلاعیه‌ی رسمی
                </span>
                <Toggle on={official} onChange={() => setOfficial((v) => !v)} label="اطلاعیه‌ی رسمی" />
              </div>
              <p className="text-[11px] text-ink-500 leading-5">به همه‌ی مخاطبانِ دامنه‌ی انتشار، اعلان «فوری» می‌رود (بی‌صدا و ساعات سکوت رویش اثر ندارد).</p>
              {official && (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-ink-700">نیاز به تأیید خواندن</span>
                    <Toggle on={requiresAck} onChange={() => setRequiresAck((v) => !v)} label="نیاز به تأیید خواندن" />
                  </div>
                  <Field label="سنجاق در داشبورد تا تاریخ" hint="خالی = بدون سنجاق">
                    <JalaliDatePicker value={pinUntil} onChange={setPinUntil} placeholder="بدون سنجاق" />
                  </Field>
                </>
              )}
            </div>
          )}
          {item?.review?.status === "returned" && item.review.note && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700 leading-6 flex gap-2">
              <Undo2 size={14} className="shrink-0 mt-1" />
              <span>
                یادداشت بازبین: «{item.review.note}»
              </span>
            </div>
          )}
          {needsReview && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11.5px] text-amber-800 leading-6">
              انتشار در این بخش پس از بازبینی مدیر انجام می‌شود. «ارسال برای بازبینی» را بزنید تا مطلب در صف بازبینی قرار گیرد؛ نتیجه به شما اعلان می‌شود.
            </p>
          )}
          <PublishOptions entity={contentEntity[kind]} value={pub} onChange={setPub} notifyOption={!needsReview && !item && !(kind === "news" && official)} draftOption={!needsReview} />
        </div>
      </div>
      {err && <p className="text-xs text-rose-600">{err}</p>}
      <div className="flex items-center gap-2 pt-2 border-t border-ink-100 flex-wrap">
        {needsReview ? (
          <>
            <Button variant="primary" icon={<Send size={14} />} onClick={() => save("review")}>
              ارسال برای بازبینی
            </Button>
            <Button icon={<Save size={14} />} onClick={() => save("draft")}>
              ذخیره‌ی پیش‌نویس
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={() => save()}>
            {item ? "ذخیره‌ی تغییرات" : pub.is_draft ? "ذخیره‌ی پیش‌نویس" : "انتشار"}
          </Button>
        )}
        <Button variant="ghost" onClick={() => onDone()}>
          انصراف
        </Button>
        <code dir="ltr" className="text-[10.5px] text-ink-400 mr-auto hidden sm:block">
          {item ? `PATCH /content/${kind}/{id}/` : `POST /content/${kind}/`}
        </code>
      </div>
    </div>
  );
}

/** مودال ساخت/ویرایش مجله، بلاگ یا خبر (Blog/News/MagazineStoreRequest) */
export function ContentEditor({ open, onClose, kind, item, onSaved }: { open: boolean; onClose: () => void; kind: ContentKind; item?: ContentItem; onSaved?: (id: string) => void }) {
  const label = contentKindLabel[kind];
  return (
    <Modal open={open} onClose={onClose} title={item ? `ویرایش ${label}` : `${label} جدید`} description={item ? item.title : undefined} width="max-w-3xl">
      {open && (
        <ContentForm
          key={item?.id ?? "new"}
          kind={kind}
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

// ---------------------------------------------------------------- کارت
function ContentCard({ x }: { x: ContentItem }) {
  const s = useSocial();
  const entity = contentEntity[x.kind];
  const reactions = s.reactionSummary(entity, x.id).total;
  const comments = s.commentsFor(entity, x.id).length;
  const ann = x.announcement;
  const needMyAck = !!ann?.requires_ack && x.user_id !== s.me && !ann.acks[s.me] && x.is_public && !x.is_draft;
  return (
    <Link to={contentPath(x)} className="card overflow-hidden flex flex-col hover:border-brand-300 transition-colors">
      <Poster color={x.poster} className="h-28 !rounded-none">
        <span className="flex flex-wrap gap-1">
          {ann && (
            <Badge tone="danger" icon={<Megaphone size={10} />}>
              اطلاعیه‌ی رسمی
            </Badge>
          )}
          {needMyAck && (
            <Badge tone="warning" icon={<BadgeCheck size={10} />}>
              منتظر تأیید شما
            </Badge>
          )}
          <ReviewBadge review={x.review} />
          <HiddenBadge m={x.moderation} />
          {!x.review || x.review.status === "approved" ? <PublishBadge item={x} /> : null}
          {x.privacy !== "EVERYONE" && <PrivacyBadge value={x.privacy} />}
        </span>
      </Poster>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="text-sm font-bold text-ink-900 leading-6 line-clamp-2">{x.title}</h3>
        {x.excerpt && <p className="text-xs text-ink-500 leading-6 line-clamp-2">{x.excerpt}</p>}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2 border-t border-ink-100">
          <UserLine id={x.user_id} size={24} link={false} sub={x.published_at ? stamp(x.published_at) : `ایجاد ${stamp(x.created_at)}`} />
          <span className="flex items-center gap-2.5 text-[11px] text-ink-400 shrink-0">
            <span className="flex items-center gap-0.5" title="واکنش‌ها">
              <SmilePlus size={12} /> {fa(reactions)}
            </span>
            <span className="flex items-center gap-0.5" title="نظرها">
              <MessageSquare size={12} /> {fa(comments)}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------- صفحه
export default function ContentModule({ section }: { section: "magazines" | "news" | "blogs" }) {
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const kind: ContentKind = section;
  const perm = permPrefix(kind);
  const manager = hasPermission(`${perm}.manage`);
  const canCreate = hasPermission(`${perm}.create`) || manager;
  const entity = contentEntity[kind];

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState<StatusFilter>("published");
  const [creating, setCreating] = useState(false);

  const cats = s.categoriesOf(entity);
  // اطلاعیه‌های رسمیِ سنجاق‌شده (تا تاریخشان) بالای فهرست اخبار
  const pinnedNow = (x: ContentItem) => !!x.announcement?.pin_until && (dayNum(x.announcement.pin_until) ?? 0) >= (dayNum(s.today) ?? 0);
  const pool = s.content.filter((x) => x.kind === kind && s.canView(x, manager));
  const list = pool
    .filter((x) => matchesStatus(x, status, s.me, manager, s.today))
    .filter((x) => !cat || x.category_ids.includes(cat))
    .filter((x) => !q || x.title.includes(q) || x.excerpt.includes(q) || x.tags.some((t) => t.includes(q)))
    .sort((a, b) => Number(pinnedNow(b)) - Number(pinnedNow(a)) || (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at));

  const dash = s.dashboard("content", "user");
  const stat = (key: string) => dash.find((d) => d.key === key)?.value ?? 0;
  const statItems =
    section === "news"
      ? [
          { title: "خبرهای منتشرشده‌ی من", value: stat("news_published") },
          { title: "پیش‌نویس", value: stat("drafts") },
          { title: "بازدید", value: stat("views") },
          { title: "نظر در انتظار تأیید", value: stat("comments_pending") },
        ]
      : section === "blogs"
        ? [
            { title: "پست‌های منتشرشده‌ی من", value: stat("blogs_published") },
            { title: "پیش‌نویس", value: stat("drafts") },
            { title: "بازدید", value: stat("views") },
          ]
        : [
            { title: "مجله‌های من", value: stat("magazines_published") },
            { title: "پیش‌نویس", value: stat("drafts") },
            { title: "بازدید", value: stat("views") },
          ];

  const title = section === "news" ? "اخبار سازمان" : section === "blogs" ? "وبلاگ" : "مجلات";
  const label = contentKindLabel[kind];
  const ks: ContentKind[] = [section];

  return (
    <div>
      <PageHeader
        title={title}
        description={section === "news" ? "اخبار و اطلاعیه‌های رسمی سازمان" : section === "blogs" ? "یادداشت‌ها، تجربه‌ها و روایت‌های همکاران" : "مجله‌های سازمانی و شماره‌های ویژه"}
        icon={section === "news" ? <Newspaper size={20} /> : <BookOpen size={20} />}
        actions={
          <>
            <ModuleReportsButton module="content" />
            <ApiChip
              items={[
                ...ks.flatMap((k) => [
                  { label: `فهرست ${contentKindLabel[k]}‌های منتشرشده`, ep: endpoints.contentList(k) },
                  { label: `پیش‌نویس‌های ${contentKindLabel[k]}`, ep: endpoints.contentDrafts(k) },
                  { label: `ساخت ${contentKindLabel[k]}`, ep: endpoints.contentCreate(k) },
                ]),
                { label: "موضوع‌ها", ep: endpoints.categories(entity) },
                { label: "داشبورد کاربر", ep: endpoints.dashboard("content/content", "user") },
                ...(section === "news"
                  ? [
                      { label: "اطلاعیه‌های سنجاق‌شده در میز کار", ep: endpoints.newsPinned() },
                      { label: "تأیید خواندن", ep: endpoints.newsAcknowledge("{id}") },
                      { label: "وضعیت خواندن", ep: endpoints.newsReadStatus("{id}") },
                    ]
                  : []),
              ]}
            />
            {canCreate && (
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreating(true)}>
                جدید
              </Button>
            )}
          </>
        }
      />

      <StatStrip items={statItems} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field !pr-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`جستجو در ${label}‌ها…`} />
        </div>
        <select className="input-field !w-auto min-w-[140px]" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="فیلتر موضوع">
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
          icon={status === "drafts" ? <Eye size={22} /> : section === "news" ? <Newspaper size={22} /> : <BookOpen size={22} />}
          title={status === "drafts" ? "پیش‌نویسی ندارید" : `${label}ی پیدا نشد`}
          description={q || cat ? "جستجو یا فیلتر موضوع را تغییر دهید." : canCreate ? `با دکمه‌ی «جدید» اولین ${label} را بنویسید.` : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((x) => (
            <ContentCard key={x.id} x={x} />
          ))}
        </div>
      )}

      <ContentEditor open={creating} onClose={() => setCreating(false)} kind={kind} />
    </div>
  );
}
