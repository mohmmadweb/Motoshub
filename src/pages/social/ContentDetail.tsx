// ---------------------------------------------------------------------------
// جزئیات مجله / بلاگ / خبر — /content/{kind}/{id}/
// متن کامل، پیوست‌ها (…/attachments/)، واکنش‌ها، نظرها و اقدام‌های صاحب/مدیر.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen, Newspaper, Pencil, Trash2, Send, EyeOff, Eye, Lock, Paperclip, Megaphone, BadgeCheck, BellRing, Pin, Users } from "lucide-react";
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
                ...(item.announcement
                  ? [
                      { label: "خواندم و پذیرفتم", ep: endpoints.newsAcknowledge(item.id) },
                      { label: "وضعیت خواندن", ep: endpoints.newsReadStatus(item.id) },
                      { label: "یادآوری به نخوانده‌ها", ep: endpoints.newsRemind(item.id) },
                    ]
                  : []),
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
            <div className="text-[14px] text-ink-800 leading-8 whitespace-pre-wrap">{item.content}</div>
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
  const { iam, membershipsOf, scopeLabel } = useTenancy();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const ann = item.announcement!;
  const audience = s.audienceOf(item);
  const done = audience.filter((u) => ann.acks[u]);
  const pending = audience.filter((u) => !ann.acks[u]);
  const pct = audience.length ? Math.round((done.length / audience.length) * 100) : 0;

  /** شرکتِ هر کاربر: عضویت اصلی (یا اولین عضویت فعال)؛ واحد ← شرکتِ بالادست */
  const companyOf = (uid: string) => {
    const ms = membershipsOf(uid).filter((m) => m.status === "active");
    const m = ms.find((x) => x.primary) ?? ms[0];
    if (!m) return "بدون عضویت";
    let node = m.scope;
    while (node.type === "unit" && node.parentId) {
      const up = iam.scopes.find((x) => x.id === node.parentId);
      if (!up) break;
      node = up;
    }
    return node.type === "company" ? scopeLabel(node.id) : node.type === "holding" ? `ستاد ${scopeLabel(node.id)}` : "ستاد مرکزی";
  };
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
