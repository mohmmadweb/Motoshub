// ---------------------------------------------------------------------------
// جزئیات مجله / بلاگ / خبر — /content/{kind}/{id}/
// متن کامل، پیوست‌ها (…/attachments/)، واکنش‌ها، نظرها و اقدام‌های صاحب/مدیر.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen, Newspaper, Pencil, Trash2, Send, EyeOff, Eye, Lock, Paperclip, Megaphone, BadgeCheck, BellRing, Pin, Users, CheckCircle2, Undo2, Clock } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useSocial } from "../../context/SocialContext";
import { useTenancy } from "../../context/TenancyContext";
import { endpoints } from "../../social/endpoints";
import type { Attachment, ContentItem } from "../../social/types";
import { contentEntity, contentKindLabel } from "../../social/types";
import { ApiChip, AttachmentList, AttachmentPicker, CategoryBadges, CommentsPanel, Poster, PrivacyBadge, PublishBadge, ReactionBar, TagList, UserLine, fa, stamp } from "./kit";
import { ContentEditor, permPrefix } from "./ContentModule";
import { MarkdownView } from "../knowledge/Markdown";
import { HiddenBanner, ReportButton, ReviewBadge } from "./moderation";
import { AnalyticsButton, useCompanyOf } from "./ItemAnalytics";

export default function ContentDetail({ section }: { section: "magazines" | "news" | "blogs" }) {
  const { id = "" } = useParams();
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<Attachment[]>([]);

  const item = s.content.find((x) => x.id === id && x.kind === section);

  // POST view — یک بار در هر بار باز شدن صفحه
  const viewed = useRef<string | null>(null);
  useEffect(() => {
    if (item && viewed.current !== id) {
      viewed.current = id;
      s.viewContent(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!item]);

  const listTitle = section === "news" ? "اخبار سازمان" : section === "blogs" ? "وبلاگ" : "مجلات";
  const listPath = section === "news" ? "/dashboard/news" : section === "blogs" ? "/dashboard/blog" : "/dashboard/magazines";
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

  // «پیشنهادی» — بازبینی پیش از انتشار: نویسنده‌ی بدون مجوز manage به‌جای «انتشار»، «ارسال برای بازبینی» دارد
  const review = item.review;
  const pendingReview = review?.status === "pending";
  const togglePublish = () => {
    if (!published && !manager) {
      const r = s.submitForReview(item.id);
      return notify(r.ok ? `${label} برای بازبینی فرستاده شد.` : r.error, r.ok ? "success" : "warning");
    }
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
                { label: "ارسال برای بازبینی", ep: endpoints.contentSubmitReview(kind, item.id) },
                { label: "تأیید و انتشار", ep: endpoints.contentApproveReview(kind, item.id) },
                { label: "برگشت با یادداشت", ep: endpoints.contentReturnReview(kind, item.id) },
                { label: "آمار مطلب", ep: endpoints.contentAnalytics(kind, item.id) },
                { label: "گزارش تخلف", ep: endpoints.reportCreate() },
                ...(item.announcement
                  ? [
                      { label: "خواندم و پذیرفتم", ep: endpoints.newsAcknowledge(item.id) },
                      { label: "وضعیت خواندن", ep: endpoints.newsReadStatus(item.id) },
                      { label: "یادآوری به نخوانده‌ها", ep: endpoints.newsRemind(item.id) },
                    ]
                  : []),
              ]}
            />
            {canEdit && <AnalyticsButton entity="content" item={item} />}
            {!owner && <ReportButton target={{ target_type: "content", target_id: item.id, target_owner_id: item.user_id, target_excerpt: item.title }} />}
            {canEdit && (
              <>
                <Button size="sm" icon={<Pencil size={13} />} onClick={() => setEditing(true)}>
                  ویرایش
                </Button>
                {!(pendingReview && !manager) && (
                  <Button size="sm" icon={published ? <EyeOff size={13} /> : <Send size={13} />} onClick={togglePublish}>
                    {published ? "لغو انتشار" : manager ? "انتشار" : "ارسال برای بازبینی"}
                  </Button>
                )}
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
          {(review && review.status !== "approved") || item.moderation?.hidden ? (
            <div className="p-3 border-b border-ink-100 space-y-2">
              <HiddenBanner m={item.moderation} onUnhide={() => (s.unhide("content", item.id), notify("مطلب دوباره برای مخاطبان نمایش داده می‌شود.", "success"))} />
              {review && review.status !== "approved" && <ReviewBox item={item} manager={manager} owner={owner} />}
            </div>
          ) : null}
          {item.announcement && (
            <div className="flex items-center gap-2 flex-wrap px-4 py-2 bg-rose-50 border-b border-rose-200 text-[12px] text-rose-600">
              <Megaphone size={14} className="shrink-0" />
              <b>اطلاعیه‌ی رسمی</b>
              {item.announcement.requires_ack && <span className="text-ink-600">· نیاز به تأیید خواندن</span>}
              {item.announcement.pin_until && (
                <span className="text-ink-600 flex items-center gap-1">
                  · <Pin size={11} /> سنجاق در میز کار تا {item.announcement.pin_until}
                </span>
              )}
            </div>
          )}
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
            {item.content_format === "markdown" ? <MarkdownView md={item.content} className="!text-[14px] !leading-8 !text-ink-800" /> : <div className="text-[14px] text-ink-800 leading-8 whitespace-pre-wrap">{item.content}</div>}
            {item.announcement?.requires_ack && !owner && published && <AckBox item={item} />}
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
          {item.announcement && canEdit && published && <ReadStatusPanel item={item} />}
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

// ---------------------------------------------------------------- بازبینی پیش از انتشار («پیشنهادی»)
function ReviewBox({ item, manager, owner }: { item: ContentItem; manager: boolean; owner: boolean }) {
  const s = useSocial();
  const { notify } = useToast();
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState("");
  const rv = item.review!;
  const last = [...rv.history].reverse()[0];
  if (rv.status === "pending")
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap text-[12.5px] text-amber-800">
          <Clock size={14} className="shrink-0" />
          <span className="flex-1 min-w-[180px] leading-6">
            <ReviewBadge review={rv} /> ارسال‌شده توسط {s.userName(rv.submitted_by)} در {stamp(rv.submitted_at)}
            {!manager && owner && " — پس از تأیید مدیر منتشر می‌شود."}
          </span>
          {manager && !returning && (
            <span className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="primary"
                icon={<CheckCircle2 size={13} />}
                onClick={() => {
                  const r = s.approveReview(item.id);
                  notify(r.ok ? "تأیید و منتشر شد؛ نویسنده مطلع شد." : r.error, r.ok ? "success" : "warning");
                }}
              >
                تأیید و انتشار
              </Button>
              <Button size="sm" icon={<Undo2 size={13} />} onClick={() => setReturning(true)}>
                برگشت با یادداشت
              </Button>
            </span>
          )}
        </div>
        {returning && (
          <div className="flex gap-2 flex-wrap">
            <input className="input-field flex-1 min-w-[200px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="چه چیزی باید اصلاح شود؟" autoFocus />
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                const r = s.returnReview(item.id, note);
                notify(r.ok ? "مطلب با یادداشت به نویسنده برگشت." : r.error, r.ok ? "success" : "warning");
                if (r.ok) setReturning(false);
              }}
            >
              ثبت برگشت
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReturning(false)}>
              انصراف
            </Button>
          </div>
        )}
      </div>
    );
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 flex items-start gap-2 flex-wrap text-[12.5px] text-rose-700">
      <Undo2 size={14} className="shrink-0 mt-1" />
      <span className="flex-1 min-w-[180px] leading-6">
        برگشت برای اصلاح توسط {s.userName(rv.reviewed_by ?? "")}
        {rv.reviewed_at ? ` در ${stamp(rv.reviewed_at)}` : ""}: «{rv.note ?? last?.note ?? "—"}»
      </span>
      {owner && (
        <Button
          size="sm"
          icon={<Send size={13} />}
          onClick={() => {
            const r = s.submitForReview(item.id);
            notify(r.ok ? "دوباره برای بازبینی فرستاده شد." : r.error, r.ok ? "success" : "warning");
          }}
        >
          ارسال دوباره
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- اطلاعیه‌ی رسمی («پیشنهادی»)
/** دکمه‌ی «خواندم و پذیرفتم» برای خواننده */
function AckBox({ item }: { item: ContentItem }) {
  const s = useSocial();
  const { notify } = useToast();
  const when = item.announcement?.acks[s.me];
  if (when)
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12.5px] text-emerald-700 flex items-center gap-2">
        <BadgeCheck size={16} className="shrink-0" /> شما این اطلاعیه را در {stamp(when)} خواندید و پذیرفتید.
      </div>
    );
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-3 flex-wrap">
      <p className="text-[12.5px] text-amber-800 flex-1 min-w-[180px] leading-6">این اطلاعیه نیاز به تأیید خواندن دارد. پس از مطالعه‌ی کامل، تأیید کنید.</p>
      <Button
        variant="primary"
        size="sm"
        icon={<BadgeCheck size={14} />}
        onClick={() => {
          s.acknowledge(item.id);
          notify("تأیید خواندن ثبت شد.", "success");
        }}
      >
        خواندم و پذیرفتم
      </Button>
    </div>
  );
}

/** پنل «وضعیت خواندن» برای ناشر: درصد کل، تفکیک شرکت، نخوانده‌ها و یادآوری */
function ReadStatusPanel({ item }: { item: ContentItem }) {
  const s = useSocial();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const ann = item.announcement!;
  const audience = s.audienceOf(item);
  const done = audience.filter((u) => ann.acks[u]);
  const pending = audience.filter((u) => !ann.acks[u]);
  const pct = audience.length ? Math.round((done.length / audience.length) * 100) : 0;

  /** شرکتِ هر کاربر: عضویت اصلی (یا اولین عضویت فعال)؛ واحد ← شرکتِ بالادست */
  const companyOf = useCompanyOf();
  const groups = new Map<string, { total: number; done: number }>();
  audience.forEach((u) => {
    const k = companyOf(u);
    const g = groups.get(k) ?? { total: 0, done: 0 };
    g.total += 1;
    if (ann.acks[u]) g.done += 1;
    groups.set(k, g);
  });
  const rows = [...groups.entries()].sort((a, b) => b[1].total - a[1].total);
  const remind = () => {
    const n = s.remindUnread(item.id);
    notify(n ? `یادآوری برای ${fa(n)} نفر ارسال شد.` : "همه خوانده‌اند؛ یادآوری لازم نیست.", n ? "success" : "info");
  };
  const bar = (p: number, tone = "bg-emerald-500") => (
    <span className="block h-1.5 rounded-full bg-ink-100 overflow-hidden">
      <span className={`block h-full rounded-full ${tone}`} style={{ width: `${p}%` }} />
    </span>
  );

  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
        <BadgeCheck size={15} className="text-emerald-600" /> وضعیت خواندن
      </p>
      {!ann.requires_ack ? (
        <p className="text-xs text-ink-400">این اطلاعیه تأیید خواندن نمی‌خواهد؛ {fa(audience.length)} نفر مخاطب آن هستند.</p>
      ) : (
        <>
          <div className="flex items-end justify-between gap-2">
            <span className="text-2xl font-bold text-ink-900 tabular-nums">{fa(pct)}٪</span>
            <span className="text-[11.5px] text-ink-500">
              {fa(done.length)} از {fa(audience.length)} نفر تأیید کرده‌اند
            </span>
          </div>
          {bar(pct)}
          <div className="space-y-2 pt-1">
            {rows.map(([label, g]) => {
              const p = g.total ? Math.round((g.done / g.total) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex items-center justify-between gap-2 text-[11.5px] mb-0.5">
                    <span className="text-ink-700 truncate min-w-0">{label}</span>
                    <span className="text-ink-500 tabular-nums shrink-0">
                      {fa(g.done)}/{fa(g.total)} · {fa(p)}٪
                    </span>
                  </div>
                  {bar(p, p >= 80 ? "bg-emerald-500" : p >= 40 ? "bg-amber-500" : "bg-rose-500")}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-ink-100">
            <Button size="sm" icon={<Users size={13} />} onClick={() => setOpen(true)} disabled={!pending.length}>
              نخوانده‌ها ({fa(pending.length)})
            </Button>
            <Button size="sm" variant="primary" icon={<BellRing size={13} />} onClick={remind} disabled={!pending.length}>
              یادآوری به نخوانده‌ها
            </Button>
          </div>
          {ann.last_reminder_at && <p className="text-[10.5px] text-ink-400">آخرین یادآوری: {stamp(ann.last_reminder_at)}</p>}
        </>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="نخوانده‌ها" description={`${fa(pending.length)} نفر هنوز «خواندم و پذیرفتم» را نزده‌اند.`}>
        <div className="max-h-80 overflow-y-auto divide-y divide-ink-100 border border-ink-100 rounded-lg">
          {pending.map((u) => (
            <div key={u} className="flex items-center justify-between gap-2 px-3 py-2">
              <UserLine id={u} size={26} sub={companyOf(u)} />
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-3">
          <Button variant="primary" size="sm" icon={<BellRing size={13} />} onClick={() => (remind(), setOpen(false))}>
            یادآوری به همه‌ی نخوانده‌ها
          </Button>
        </div>
      </Modal>
    </div>
  );
}
