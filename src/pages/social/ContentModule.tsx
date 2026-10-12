// ---------------------------------------------------------------------------
// «مجلات» (مجله + بلاگ) و «اخبار سازمان» — /content/{magazines|blogs|news}/
// فهرست منتشرشده‌ها / پیش‌نویس‌ها، جستجو، فیلتر موضوع و فرم ساخت/ویرایش هم‌شکل
// Blog/News/MagazineStoreRequest. ویرایشگر (ContentEditor) در صفحه‌ی جزئیات هم استفاده می‌شود.
// ---------------------------------------------------------------------------
import { ReportBuilderModal } from "../../reports/ModuleReportsButton";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Newspaper, Plus, Search, Eye, Megaphone, Send, Save, Undo2, MoreVertical, Pencil, EyeOff, Trash2, User, CalendarDays, ChevronLeft, Settings, FolderTree, BarChart3 } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import Toggle from "../../components/ui/Toggle";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import Badge from "../../components/ui/Badge";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useT } from "../../i18n";
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
  CoverImage,
  Field,
  PosterPicker,
  PublishBadge,
  PublishOptions,
  dateOf,
  defaultPublish,
  fa,
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

// ---------------------------------------------------------------- کارت (هم‌شکل motodev)
/** کارت محتوا: کاور ۱۶:۹، عنوان، خلاصه، برچسب‌ها (۲ + «N+»)، نویسنده · تاریخ و دکمه‌ی «مشاهده»؛
 *  منوی «…» (ویرایش/انتشار/حذف) فقط برای صاحب یا مدیر */
function ContentCard({ x, manager, onEdit }: { x: ContentItem; manager: boolean; onEdit: (x: ContentItem) => void }) {
  const s = useSocial();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [menu, setMenu] = useState(false);
  const label = contentKindLabel[x.kind];
  const canEdit = x.user_id === s.me || manager;
  const published = x.is_public && !x.is_draft;
  const pendingReview = x.review?.status === "pending";
  const path = contentPath(x);
  const extraTags = x.tags.length - 2;

  const togglePublish = () => {
    setMenu(false);
    if (!published && !manager) {
      const r = s.submitForReview(x.id);
      return notify(r.ok ? `${label} برای بازبینی فرستاده شد.` : r.error, r.ok ? "success" : "warning");
    }
    s.publishContent(x.id, !published);
    notify(published ? `انتشار ${label} لغو شد.` : `${label} منتشر شد.`, published ? "info" : "success");
  };
  const remove = () => {
    setMenu(false);
    confirm({
      title: `حذف «${x.title}»؟`,
      message: "مطلب همراه با نظرهایش حذف می‌شود و قابل بازگشت نیست.",
      onConfirm: () => {
        s.deleteContent(x.id);
        notify(`${label} حذف شد.`, "info");
      },
    });
  };
  const menuItem = "w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-right hover:bg-ink-50";

  return (
    <div className="card p-5 flex flex-col min-w-0">
      <Link to={path} className="block" tabIndex={-1} aria-hidden>
        <CoverImage key={x.poster ?? "none"} src={x.poster} alt={x.title} icon={x.kind === "magazines" ? <Newspaper size={56} strokeWidth={1.25} /> : undefined}>
          {(x.announcement || x.is_draft || !x.is_public || x.review || x.moderation?.hidden) && (
            <>
              {x.announcement && (
                <Badge tone="danger" icon={<Megaphone size={10} />}>
                  اطلاعیه‌ی رسمی
                </Badge>
              )}
              <ReviewBadge review={x.review} />
              <HiddenBadge m={x.moderation} />
              {!x.review || x.review.status === "approved" ? <PublishBadge item={x} /> : null}
            </>
          )}
        </CoverImage>
      </Link>
      <div className="mt-4 flex items-center gap-2 min-w-0">
        <Link to={path} className="flex-1 min-w-0 text-[15px] font-bold text-ink-900 truncate hover:text-brand-700" title={x.title}>
          {x.title}
        </Link>
        {canEdit && (
          <span className="relative shrink-0">
            <button type="button" onClick={() => setMenu((v) => !v)} className="w-7 h-7 rounded-md flex items-center justify-center text-ink-500 hover:bg-ink-100" aria-label="گزینه‌ها" aria-expanded={menu}>
              <MoreVertical size={16} />
            </button>
            {menu && (
              <>
                <span className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
                <span className="absolute z-40 top-full mt-1 left-0 w-44 bg-white border border-ink-200 rounded-lg shadow-lg py-1 block">
                  <button type="button" className={`${menuItem} text-ink-700`} onClick={() => (setMenu(false), onEdit(x))}>
                    <Pencil size={13} /> ویرایش
                  </button>
                  {!(pendingReview && !manager) && (
                    <button type="button" className={`${menuItem} text-ink-700`} onClick={togglePublish}>
                      {published ? <EyeOff size={13} /> : <Send size={13} />} {published ? "لغو انتشار" : manager ? "انتشار" : "ارسال برای بازبینی"}
                    </button>
                  )}
                  <button type="button" className={`${menuItem} text-rose-600`} onClick={remove}>
                    <Trash2 size={13} /> حذف
                  </button>
                </span>
              </>
            )}
          </span>
        )}
      </div>
      <p className="mt-2 text-[13px] text-ink-600 leading-6 line-clamp-2 min-h-[3rem]">{x.excerpt}</p>
      <div className="mt-2 flex items-center gap-1 min-h-[22px] min-w-0">
        {x.tags.slice(0, 2).map((t) => (
          <span key={t} className="text-[10.5px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-800 truncate max-w-[45%]">
            {t}
          </span>
        ))}
        {extraTags > 0 && <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-800 shrink-0">{fa(extraTags)}+</span>}
      </div>
      <div className="mt-auto pt-4">
        <div className="border-t border-ink-100 pt-3 flex items-center justify-between gap-2 text-[12px] text-ink-500">
          <span className="flex items-center gap-1 min-w-0">
            <User size={13} className="shrink-0" />
            <span className="truncate">{s.userName(x.user_id)}</span>
          </span>
          <span className="flex items-center gap-1 shrink-0 tabular-nums">
            <CalendarDays size={13} />
            {dateOf(x.published_at ?? x.created_at)}
          </span>
        </div>
        <Link to={path} className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-[13px] font-medium py-2.5">
          مشاهده <ChevronLeft size={15} />
        </Link>
      </div>
    </div>
  );
}

/** ردیف دسته‌ها بالای شبکه (اسکرول افقی با پیکان) */
function CategoryChips({ cats, value, onChange }: { cats: { id: string; title: string }[]; value: string; onChange: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflow(el.scrollWidth > el.clientWidth + 4);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [cats.length]);
  const chip = (active: boolean) => `shrink-0 whitespace-nowrap text-[12px] px-3 py-1.5 rounded-full transition-colors ${active ? "bg-brand-700 text-white font-medium" : "bg-brand-50 text-brand-800 hover:bg-brand-100"}`;
  return (
    <div className="flex items-center gap-2 mb-5 min-w-0">
      <div ref={ref} className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" className={chip(!value)} onClick={() => onChange("")}>
          همه
        </button>
        {cats.map((c) => (
          <button key={c.id} type="button" className={chip(value === c.id)} onClick={() => onChange(value === c.id ? "" : c.id)}>
            {c.title}
          </button>
        ))}
      </div>
      {overflow && (
        <button type="button" onClick={() => ref.current?.scrollBy({ left: -240, behavior: "smooth" })} className="shrink-0 w-7 h-7 rounded-full border border-ink-200 bg-white text-ink-600 flex items-center justify-center hover:bg-ink-50" aria-label="دسته‌های بیشتر">
          <ChevronLeft size={15} />
        </button>
      )}
    </div>
  );
}

/** چرخ‌دنده‌ی مدیر: دسته‌بندی‌ها، تنظیمات و بازبینی محتوا، گزارش‌ساز */
function GearMenu({ onReports }: { onReports: () => void }) {
  const { hasPermission } = useTenancy();
  const [open, setOpen] = useState(false);
  const socialSettings = ["social.dashboards", "social.settings", "comments.moderate"].some((p) => hasPermission(p));
  const item = "w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink-700 text-right hover:bg-ink-50";
  return (
    <span className="relative shrink-0">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-9 h-9 rounded-lg border border-ink-200 bg-white text-ink-600 flex items-center justify-center hover:bg-ink-50" aria-label="تنظیمات" title="تنظیمات" aria-expanded={open}>
        <Settings size={17} />
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <span className="absolute z-40 top-full mt-1 right-0 w-56 bg-white border border-ink-200 rounded-lg shadow-lg py-1 block">
            <Link to="/dashboard/categories" className={item} onClick={() => setOpen(false)}>
              <FolderTree size={14} /> دسته‌بندی‌ها
            </Link>
            {socialSettings && (
              <Link to="/dashboard/settings?section=social" className={item} onClick={() => setOpen(false)}>
                <Settings size={14} /> تنظیمات و بازبینی محتوا
              </Link>
            )}
            <button type="button" className={item} onClick={() => (setOpen(false), onReports())}>
              <BarChart3 size={14} /> گزارش‌ساز
            </button>
          </span>
        </>
      )}
    </span>
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
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<"new" | "old">("new");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [reports, setReports] = useState(false);

  const t = useT();
  const title = t(section === "news" ? "اخبار سازمان" : section === "blogs" ? "وبلاگ‌ها" : "مجلات");
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);

  const cats = s.categoriesOf(entity);
  // اطلاعیه‌های رسمیِ سنجاق‌شده (تا تاریخشان) بالای فهرست اخبار
  const pinnedNow = (x: ContentItem) => !!x.announcement?.pin_until && (dayNum(x.announcement.pin_until) ?? 0) >= (dayNum(s.today) ?? 0);
  const when = (x: ContentItem) => x.published_at ?? x.created_at;
  const list = s.content
    .filter((x) => x.kind === kind && s.canView(x, manager))
    .filter((x) => matchesStatus(x, status, s.me, manager, s.today))
    .filter((x) => !cat || x.category_ids.includes(cat))
    .filter((x) => !q || x.title.includes(q) || x.excerpt.includes(q) || x.tags.some((tg) => tg.includes(q)))
    .sort((a, b) => Number(pinnedNow(b)) - Number(pinnedNow(a)) || (sort === "new" ? when(b).localeCompare(when(a)) : when(a).localeCompare(when(b))));

  const label = contentKindLabel[kind];
  const addLabel = section === "news" ? "ایجاد خبر جدید" : section === "blogs" ? "افزودن وبلاگ" : "ایجاد مجله";
  const searchLabel = section === "news" ? "جستجوی اخبار…" : section === "blogs" ? "جستجوی وبلاگ…" : "جستجو در مجلات…";

  return (
    <div className="max-w-[1076px] mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xl font-bold text-ink-900 whitespace-nowrap">{title}</h1>
          {manager && <GearMenu onReports={() => setReports(true)} />}
        </div>
        <div className="relative flex-1 min-w-[200px] sm:max-w-[330px]">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field !pr-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchLabel} aria-label={searchLabel} />
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:mr-auto">
          <ApiChip
            items={[
              { label: `فهرست ${label}‌های منتشرشده`, ep: endpoints.contentList(kind) },
              { label: `پیش‌نویس‌های ${label}`, ep: endpoints.contentDrafts(kind) },
              { label: `ساخت ${label}`, ep: endpoints.contentCreate(kind) },
              { label: "موضوع‌ها", ep: endpoints.categories(entity) },
              ...(section === "news"
                ? [
                    { label: "اطلاعیه‌های سنجاق‌شده در میز کار", ep: endpoints.newsPinned() },
                    { label: "تأیید خواندن", ep: endpoints.newsAcknowledge("{id}") },
                    { label: "وضعیت خواندن", ep: endpoints.newsReadStatus("{id}") },
                  ]
                : []),
            ]}
          />
          <select className="input-field !w-auto" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="فیلتر وضعیت">
            <option value="all">همه</option>
            <option value="published">منتشرشده</option>
            <option value="drafts">پیش‌نویس‌های من</option>
          </select>
          <select className="input-field !w-auto" value={sort} onChange={(e) => setSort(e.target.value as "new" | "old")} aria-label="مرتب‌سازی">
            <option value="new">جدیدترین</option>
            <option value="old">قدیمی‌ترین</option>
          </select>
          {canCreate && (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreating(true)} className="!bg-brand-700 hover:!bg-brand-800">
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      {cats.length > 0 && <CategoryChips cats={cats} value={cat} onChange={setCat} />}

      {list.length === 0 ? (
        <EmptyState
          icon={status === "drafts" ? <Eye size={22} /> : section === "news" ? <Newspaper size={22} /> : <BookOpen size={22} />}
          title={status === "drafts" ? "پیش‌نویسی ندارید" : `${label}ی پیدا نشد`}
          description={q || cat ? "جستجو یا دسته را تغییر دهید." : canCreate ? `با دکمه‌ی «${addLabel}» اولین ${label} را بنویسید.` : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((x) => (
            <ContentCard key={x.id} x={x} manager={manager} onEdit={setEditing} />
          ))}
        </div>
      )}

      <ContentEditor open={creating} onClose={() => setCreating(false)} kind={kind} />
      <ContentEditor open={!!editing} onClose={() => setEditing(null)} kind={kind} item={editing ?? undefined} />
      <ReportBuilderModal open={reports} onClose={() => setReports(false)} module="content" />
    </div>
  );
}
