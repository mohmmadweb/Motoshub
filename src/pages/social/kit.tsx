// ---------------------------------------------------------------------------
// اجزای مشترک بخش شبکه اجتماعی — همه روی SocialContext (یعنی همان API) کار می‌کنند:
// سطح دسترسی (privacy)، دسته/موضوع (core/categories)، برچسب (core/tags)،
// پیوست (uploaded_files)، واکنش (core/reactions)، نظر (core/comments) و انتخاب کاربر.
// ---------------------------------------------------------------------------
import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Globe2, Users, Lock, Paperclip, X, Upload, Hash, Code2, CornerDownLeft, Check, Trash2, Clock, Search, FileText, Image as ImageIcon, Film } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Avatar from "../../components/Avatar";
import { useSocial } from "../../context/SocialContext";
import { useTenancy } from "../../context/TenancyContext";
import { useToast } from "../../components/ui/ToastProvider";
import { users } from "../../data/mock";
import { dayNum } from "../../pm/jalali";
import { API_BASE, fmtEndpoint, type Ep } from "../../social/endpoints";
import type { Attachment, EntityName, Privacy, Publishable } from "../../social/types";
import { privacyLabel } from "../../social/types";

export const fa = (n: number) => n.toLocaleString("fa-IR");
/** «۱۴۰۵/۰۳/۰۸ ۰۹:۳۰:۰۰» → «۱۴۰۵/۰۳/۰۸ ۰۹:۳۰» */
export const stamp = (s: string | null | undefined) => (s ? s.replace(/:[۰-۹0-9]{2}$/, "") : "—");
export const dateOf = (s: string | null | undefined) => (s ? s.split(" ")[0] : "");

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-ink-600 block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-ink-400 mt-1 leading-5">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- API
/** نشان کوچک «API» — endpointهایی را که این بخش فراخوانی می‌کند نمایش می‌دهد (برای تحویل به تیم بک‌اند) */
export function ApiChip({ items }: { items: { label: string; ep: Ep }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button onClick={() => setOpen((v) => !v)} className="text-[11px] px-2 py-1 rounded-md border border-ink-200 text-ink-500 hover:text-ink-800 flex items-center gap-1" title="endpointهای Motoshub Social API که این بخش استفاده می‌کند">
        <Code2 size={12} /> API
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <span className="absolute z-40 top-full mt-1 left-0 w-[420px] max-w-[88vw] bg-white border border-ink-200 rounded-xl shadow-lg p-3 block">
            <span className="block text-[11px] text-ink-400 mb-2" dir="ltr">
              {API_BASE}
            </span>
            {items.map((i) => (
              <span key={i.label} className="flex items-center justify-between gap-3 py-1 border-b border-ink-100 last:border-0">
                <span className="text-[11.5px] text-ink-700">{i.label}</span>
                <code dir="ltr" className="text-[10.5px] text-brand-700 bg-brand-50 rounded px-1.5 py-0.5 whitespace-nowrap">
                  {fmtEndpoint(i.ep)}
                </code>
              </span>
            ))}
          </span>
        </>
      )}
    </span>
  );
}

// ---------------------------------------------------------------- کاربر
export function UserLine({ id, sub, size = 28, link = true }: { id: string; sub?: ReactNode; size?: number; link?: boolean }) {
  const u = users.find((x) => x.id === id);
  const body = (
    <span className="flex items-center gap-2 min-w-0">
      <Avatar name={u?.name ?? "؟"} color={u?.avatarColor} size={size} />
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium text-ink-800 truncate">{u?.name ?? "کاربر"}</span>
        {sub !== undefined && <span className="block text-[10.5px] text-ink-400 truncate">{sub}</span>}
      </span>
    </span>
  );
  return link ? (
    <Link to={`/dashboard/profile/${id}`} className="hover:opacity-90 min-w-0">
      {body}
    </Link>
  ) : (
    body
  );
}

/** انتخاب چند کاربر با جستجو (دعوت، افزودن عضو، …) */
export function UserPicker({ value, onChange, exclude = [], placeholder = "جستجوی نام…" }: { value: string[]; onChange: (ids: string[]) => void; exclude?: string[]; placeholder?: string }) {
  const [q, setQ] = useState("");
  const list = users.filter((u) => !exclude.includes(u.id) && (!q || u.name.includes(q) || u.role.includes(q) || u.org.includes(q)));
  return (
    <div>
      <div className="relative mb-2">
        <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input className="input-field !pr-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
      </div>
      <div className="max-h-56 overflow-y-auto border border-ink-200 rounded-lg divide-y divide-ink-100">
        {list.map((u) => {
          const on = value.includes(u.id);
          return (
            <label key={u.id} className={`flex items-center gap-2 px-2.5 py-1.5 cursor-pointer ${on ? "bg-brand-50/60" : "hover:bg-ink-50"}`}>
              <input type="checkbox" checked={on} onChange={() => onChange(on ? value.filter((x) => x !== u.id) : [...value, u.id])} className="accent-[var(--color-brand-600)]" />
              <Avatar name={u.name} color={u.avatarColor} size={24} />
              <span className="min-w-0">
                <span className="block text-xs text-ink-800 truncate">{u.name}</span>
                <span className="block text-[10.5px] text-ink-400 truncate">{u.role}</span>
              </span>
            </label>
          );
        })}
        {list.length === 0 && <p className="text-xs text-ink-400 p-3">کاربری پیدا نشد.</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- privacy
const privIcon: Record<Privacy, typeof Globe2> = { EVERYONE: Globe2, FRIENDS: Users, ME: Lock };
export function PrivacyBadge({ value }: { value: Privacy }) {
  const I = privIcon[value];
  return (
    <Badge tone={value === "EVERYONE" ? "success" : value === "FRIENDS" ? "brand" : "neutral"} icon={<I size={10} />}>
      {privacyLabel[value]}
    </Badge>
  );
}
export function PrivacySelect({ value, onChange }: { value: Privacy; onChange: (v: Privacy) => void }) {
  return (
    <Field label="چه کسانی ببینند؟ (privacy)">
      <div className="grid grid-cols-3 gap-2">
        {(["EVERYONE", "FRIENDS", "ME"] as Privacy[]).map((p) => {
          const I = privIcon[p];
          return (
            <button key={p} type="button" onClick={() => onChange(p)} className={`flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border ${value === p ? "border-brand-400 bg-brand-50 text-brand-700 font-medium" : "border-ink-200 text-ink-500 hover:bg-ink-50"}`}>
              <I size={12} /> {privacyLabel[p]}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/** وضعیت انتشار یک آیتم */
export function PublishBadge({ item }: { item: Pick<Publishable, "is_draft" | "is_public" | "published_at"> }) {
  const { today } = useSocial();
  if (item.is_draft) return <Badge tone="warning">پیش‌نویس</Badge>;
  if (!item.is_public) return <Badge tone="neutral">لغو انتشار</Badge>;
  if (item.published_at && (dayNum(dateOf(item.published_at)) ?? 0) > (dayNum(today) ?? 0))
    return (
      <Badge tone="navy" icon={<Clock size={10} />}>
        زمان‌بندی‌شده
      </Badge>
    );
  return null;
}

// ---------------------------------------------------------------- category / tag
export function CategoryPicker({ entity, value, onChange }: { entity: EntityName; value: string[]; onChange: (ids: string[]) => void }) {
  const { categoriesOf } = useSocial();
  const cats = categoriesOf(entity);
  const roots = cats.filter((c) => !c.parent_id || !cats.some((x) => x.id === c.parent_id));
  const chip = (id: string, title: string, child = false) => {
    const on = value.includes(id);
    return (
      <button key={id} type="button" onClick={() => onChange(on ? value.filter((x) => x !== id) : [...value, id])} className={`text-[11.5px] px-2.5 py-1 rounded-md border ${on ? "bg-brand-50 border-brand-300 text-brand-700" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}>
        {child && "↳ "}
        {title}
      </button>
    );
  };
  return (
    <Field label="موضوع (دسته)">
      <div className="flex flex-wrap gap-1.5">
        {roots.flatMap((r) => [chip(r.id, r.title), ...cats.filter((c) => c.parent_id === r.id).map((c) => chip(c.id, c.title, true))])}
        {cats.length === 0 && <span className="text-[11px] text-ink-400">موضوعی برای این بخش تعریف نشده — از «هشتگ‌ها و موضوعات» بسازید.</span>}
      </div>
    </Field>
  );
}

export function TagInput({ value, onChange }: { value: string[]; onChange: (t: string[]) => void }) {
  const { tags } = useSocial();
  const [q, setQ] = useState("");
  const add = (t: string) => {
    const n = t.trim().replace(/^#/, "").replace(/\s+/g, "‌");
    if (n && !value.includes(n)) onChange([...value, n]);
    setQ("");
  };
  const sugg = q ? tags.filter((t) => t.name.includes(q.replace(/^#/, "")) && !value.includes(t.name)).slice(0, 6) : [];
  return (
    <Field label="هشتگ‌ها" hint="Enter بزنید؛ هشتگ جدید خودکار به فهرست هشتگ‌ها اضافه می‌شود.">
      <div className="flex flex-wrap items-center gap-1.5 border border-ink-200 rounded-lg px-2 py-1.5 bg-white">
        {value.map((t) => (
          <span key={t} className="text-[11.5px] bg-ink-100 text-ink-700 rounded px-1.5 py-0.5 flex items-center gap-1">
            #{t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`حذف ${t}`}>
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(q);
            }
          }}
          className="flex-1 min-w-[100px] text-xs outline-none bg-transparent py-1"
          placeholder="افزودن هشتگ…"
        />
      </div>
      {sugg.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {sugg.map((t) => (
            <button key={t.id} type="button" onClick={() => add(t.name)} className="text-[11px] text-brand-700 bg-brand-50 rounded px-1.5 py-0.5">
              #{t.name}
            </button>
          ))}
        </div>
      )}
    </Field>
  );
}

export function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <Link key={t} to={`/dashboard/topics?tag=${encodeURIComponent(t)}`} className="text-[11px] text-brand-700 hover:underline flex items-center">
          <Hash size={10} />
          {t}
        </Link>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------- attachments
const sizeOf = (b: number) => (b > 1_048_576 ? `${(b / 1_048_576).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} مگابایت` : `${Math.max(1, Math.round(b / 1024)).toLocaleString("fa-IR")} کیلوبایت`);
export const toAttachments = (files: FileList | File[]): Attachment[] =>
  [...files].map((f, i) => ({ id: `at${Date.now().toString(36)}${i}`, name: f.name, size: sizeOf(f.size), mime: f.type || "application/octet-stream" }));

export function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return Film;
  return FileText;
}

/** انتخاب چند فایل (uploaded_files) با کشیدن و رها کردن */
export function AttachmentPicker({ value, onChange, accept, label = "پیوست‌ها (uploaded_files)" }: { value: Attachment[]; onChange: (a: Attachment[]) => void; accept?: string; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <Field label={label}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onChange([...value, ...toAttachments(e.dataTransfer.files)]);
        }}
        className={`rounded-lg border-2 border-dashed p-3 text-center ${over ? "border-brand-400 bg-brand-50" : "border-ink-200"}`}
      >
        <input ref={ref} type="file" multiple accept={accept} className="hidden" onChange={(e) => e.target.files && onChange([...value, ...toAttachments(e.target.files)])} />
        <button type="button" onClick={() => ref.current?.click()} className="text-xs text-brand-700 flex items-center gap-1 mx-auto">
          <Upload size={13} /> انتخاب فایل‌ها یا کشیدن و رها کردن
        </button>
      </div>
      {value.length > 0 && (
        <div className="mt-2 space-y-1">
          {value.map((a) => {
            const I = fileIcon(a.mime);
            return (
              <div key={a.id} className="flex items-center gap-2 text-xs bg-ink-50 rounded-md px-2 py-1">
                <I size={13} className="text-ink-400" />
                <span className="flex-1 truncate">{a.name}</span>
                <span className="text-ink-400">{a.size}</span>
                <button type="button" onClick={() => onChange(value.filter((x) => x.id !== a.id))} className="text-ink-400 hover:text-rose-600" aria-label="حذف پیوست">
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Field>
  );
}

export function AttachmentList({ items, onRemove }: { items: Attachment[]; onRemove?: (id: string) => void }) {
  const { notify } = useToast();
  if (!items.length) return null;
  return (
    <div className="space-y-1">
      {items.map((a) => {
        const I = fileIcon(a.mime);
        return (
          <div key={a.id} className="flex items-center gap-2 text-xs border border-ink-100 rounded-md px-2.5 py-1.5">
            <Paperclip size={12} className="text-ink-400" />
            <I size={13} className="text-ink-400" />
            <button onClick={() => notify(`دریافت «${a.name}» — در نسخه‌ی متصل از …/attachments/{id}/content/ دانلود می‌شود.`, "info")} className="flex-1 text-right truncate text-brand-700 hover:underline">
              {a.name}
            </button>
            <span className="text-ink-400">{a.size}</span>
            {onRemove && (
              <button onClick={() => onRemove(a.id)} className="text-ink-400 hover:text-rose-600" aria-label="حذف پیوست">
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- publish options
export type PublishState = { privacy: Privacy; category_ids: string[]; tags: string[]; is_draft: boolean; published_date: string; published_time: string; send_notification: boolean; add_comment?: boolean; show_comment?: boolean };
/** گزینه‌های انتشار مشترک همه‌ی *StoreRequest ها */
export function PublishOptions({ entity, value, onChange, comments = true, notifyOption = true }: { entity: EntityName; value: PublishState; onChange: (v: PublishState) => void; comments?: boolean; notifyOption?: boolean }) {
  const set = (p: Partial<PublishState>) => onChange({ ...value, ...p });
  return (
    <div className="space-y-3">
      <PrivacySelect value={value.privacy} onChange={(privacy) => set({ privacy })} />
      <CategoryPicker entity={entity} value={value.category_ids} onChange={(category_ids) => set({ category_ids })} />
      <TagInput value={value.tags} onChange={(tags) => set({ tags })} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg bg-ink-50 border border-ink-100 p-3">
        {comments && (
          <>
            <label className="flex items-center gap-2 text-xs text-ink-700">
              <input type="checkbox" checked={value.add_comment ?? true} onChange={(e) => set({ add_comment: e.target.checked })} className="accent-[var(--color-brand-600)]" /> امکان ثبت نظر (add_comment)
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-700">
              <input type="checkbox" checked={value.show_comment ?? true} onChange={(e) => set({ show_comment: e.target.checked })} className="accent-[var(--color-brand-600)]" /> نمایش نظرها (show_comment)
            </label>
          </>
        )}
        {notifyOption && (
          <label className="flex items-center gap-2 text-xs text-ink-700">
            <input type="checkbox" checked={value.send_notification} onChange={(e) => set({ send_notification: e.target.checked })} className="accent-[var(--color-brand-600)]" /> ارسال اعلان به همه (send_notification)
          </label>
        )}
        <label className="flex items-center gap-2 text-xs text-ink-700">
          <input type="checkbox" checked={value.is_draft} onChange={(e) => set({ is_draft: e.target.checked })} className="accent-[var(--color-brand-600)]" /> ذخیره به‌صورت پیش‌نویس (is_draft)
        </label>
      </div>
      {!value.is_draft && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="تاریخ انتشار (اختیاری)" hint="خالی = همین حالا">
            <input className="input-field" value={value.published_date} onChange={(e) => set({ published_date: e.target.value })} placeholder="۱۴۰۵/۰۳/۱۰" />
          </Field>
          <Field label="ساعت انتشار">
            <input className="input-field" value={value.published_time} onChange={(e) => set({ published_time: e.target.value })} placeholder="۰۹:۰۰" />
          </Field>
        </div>
      )}
    </div>
  );
}
export const defaultPublish = (over: Partial<PublishState> = {}): PublishState => ({ privacy: "EVERYONE", category_ids: [], tags: [], is_draft: false, published_date: "", published_time: "", send_notification: true, add_comment: true, show_comment: true, ...over });

// ---------------------------------------------------------------- reactions
export function ReactionBar({ entity, id, compact = false }: { entity: EntityName; id: string; compact?: boolean }) {
  const { allowedReactions, reactionSummary, toggleReaction } = useSocial();
  const sum = reactionSummary(entity, id);
  const active = allowedReactions.filter((r) => r.is_active);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {active.map((r) => {
        const n = sum.counts[r.code] ?? 0;
        const mine = sum.mine === r.code;
        if (compact && !n && !mine) return null;
        return (
          <button
            key={r.code}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleReaction(entity, id, r.code);
            }}
            title={r.code}
            className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${mine ? "border-brand-300 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}
          >
            <span>{r.emoji}</span>
            {n > 0 && <span className="tabular-nums">{fa(n)}</span>}
          </button>
        );
      })}
      {compact && sum.total === 0 && <span className="text-[11px] text-ink-300">بدون واکنش</span>}
    </div>
  );
}

// ---------------------------------------------------------------- comments
/** نظرها با پاسخ تو در تو و تأیید مدیر (core/comments) */
export function CommentsPanel({ entity, id, ownerId, allowAdd = true, show = true }: { entity: EntityName; id: string; ownerId: string; allowAdd?: boolean; show?: boolean }) {
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const moderator = hasPermission("comments.moderate") || ownerId === s.me;
  const list = s.commentsFor(entity, id, moderator);
  const roots = list.filter((c) => !c.parent_id);
  const submit = () => {
    if (!text.trim()) return;
    const c = s.addComment(entity, id, text.trim(), replyTo);
    setText("");
    setReplyTo(null);
    notify(c.approved ? "نظر ثبت شد." : "نظر ثبت شد و پس از تأیید مدیر نمایش داده می‌شود.", c.approved ? "success" : "info");
  };
  const Item = ({ c, depth }: { c: (typeof list)[number]; depth: number }) => (
    <div className={depth ? "mr-8 mt-2" : ""}>
      <div className={`rounded-lg p-3 ${c.approved ? "bg-ink-50" : "bg-amber-50 border border-amber-200"}`}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <UserLine id={c.user_id} size={22} sub={stamp(c.created_at)} />
          <span className="flex items-center gap-1">
            {!c.approved && <Badge tone="warning">در انتظار تأیید</Badge>}
            {!c.approved && moderator && (
              <button onClick={() => s.approveComment(c.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="تأیید (POST …/approve/)" aria-label="تأیید نظر">
                <Check size={13} />
              </button>
            )}
            {(moderator || c.user_id === s.me) && (
              <button onClick={() => s.deleteComment(c.id)} className="p-1 text-ink-400 hover:text-rose-600" aria-label="حذف نظر">
                <Trash2 size={12} />
              </button>
            )}
          </span>
        </div>
        <p className="text-[13px] text-ink-800 leading-6 whitespace-pre-wrap">{c.content}</p>
        {allowAdd && depth < 2 && (
          <button onClick={() => setReplyTo(c.id)} className="text-[11px] text-brand-700 mt-1 flex items-center gap-1">
            <CornerDownLeft size={11} /> پاسخ
          </button>
        )}
      </div>
      {list.filter((x) => x.parent_id === c.id).map((r) => (
        <Item key={r.id} c={r} depth={depth + 1} />
      ))}
    </div>
  );
  if (!show) return <p className="text-xs text-ink-400">نمایش نظرها برای این مطلب غیرفعال است.</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-ink-900">نظرها ({fa(list.filter((c) => c.approved).length)})</p>
      {roots.map((c) => (
        <Item key={c.id} c={c} depth={0} />
      ))}
      {roots.length === 0 && <p className="text-xs text-ink-400">هنوز نظری ثبت نشده است.</p>}
      {allowAdd ? (
        <div className="space-y-2">
          {replyTo && (
            <p className="text-[11px] text-ink-500 flex items-center gap-1">
              پاسخ به نظر «{s.userName(list.find((c) => c.id === replyTo)?.user_id ?? "")}»
              <button onClick={() => setReplyTo(null)} className="text-ink-400 hover:text-rose-600" aria-label="لغو پاسخ">
                <X size={11} />
              </button>
            </p>
          )}
          <textarea className="input-field min-h-[70px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="نظر خود را بنویسید… (برای منشن: ‎@نام_خانوادگی)" />
          <Button variant="primary" size="sm" onClick={submit}>
            ثبت نظر
          </Button>
        </div>
      ) : (
        <p className="text-xs text-ink-400">ثبت نظر برای این مطلب بسته است.</p>
      )}
    </div>
  );
}

/** برچسب کوتاه یک دسته */
export function CategoryBadges({ ids }: { ids: string[] }) {
  const { categoryTitle } = useSocial();
  if (!ids.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {ids.map((id) => (
        <Badge key={id} tone="brand">
          {categoryTitle(id)}
        </Badge>
      ))}
    </span>
  );
}

/** پوستر رنگی (در پروتوتایپ به‌جای تصویر آپلودشده) */
export function Poster({ color, children, className = "h-32" }: { color: string | null; children?: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg flex items-end p-3 text-white ${className}`} style={{ background: `linear-gradient(135deg, ${color ?? "#1f4f99"}, color-mix(in srgb, ${color ?? "#1f4f99"} 55%, #000))` }}>
      {children}
    </div>
  );
}

export const posterPalette = ["#1f4f99", "#0d9488", "#b45309", "#7c3aed", "#be123c", "#15803d", "#0369a1", "#a16207"];
export function PosterPicker({ value, onChange }: { value: string | null; onChange: (c: string) => void }) {
  return (
    <Field label="پوستر (poster)">
      <div className="flex gap-1.5 flex-wrap">
        {posterPalette.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)} className={`w-8 h-8 rounded-lg border-2 ${value === c ? "border-ink-900" : "border-transparent"}`} style={{ background: c }} aria-label={`پوستر ${c}`} />
        ))}
      </div>
    </Field>
  );
}
