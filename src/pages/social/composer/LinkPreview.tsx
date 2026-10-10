// ---------------------------------------------------------------------------
// «پیشنهادی» — F02 کارت پیش‌نمایش لینک (۱.۲.۶) و F05 پخش‌کننده‌ی جاسازی‌شده‌ی آپارات (۱.۱۱.۲)
// نخستین نشانی http/https متن ← کارت (تصویر og:image، عنوان og:title، توضیح دوخطی، دامنه).
// لینک داخلی سامانه (خبر، رویداد، گروه، …) کارت داخلی با نوع محتوا؛ لینک آپارات پخش‌کننده.
// بار نخست حالت اسکلت (واکشی سمت سرور)، شکست = فقط لینک ساده (کارتی نمایش داده نمی‌شود).
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Globe, Play, X, Newspaper, CalendarDays, Users, Megaphone, Image as ImageIcon, MessagesSquare, BookOpen } from "lucide-react";
import { useSocial } from "../../../context/SocialContext";
import { aparatEmbedUrl, aparatHash, aparatMeta, aparatPageUrl, domainOf, firstUrl, internalRef, lookupPreview, markFetched, parseBlocked, PREVIEW_DELAY_MS, wasFetched, type InternalRef } from "../../../social/linkPreview";
import type { AparatVideo } from "../../../social/types";

const grad = (c: string | null) => `linear-gradient(135deg, ${c ?? "#334155"}, color-mix(in srgb, ${c ?? "#334155"} 55%, #000))`;

// ---------------------------------------------------------------- آپارات
/** پخش‌کننده‌ی آپارات با نسبت ۱۶:۹ — تا کلیک کاربر فقط تصویر بندانگشتی بار می‌شود */
export function AparatPlayer({ video, className = "" }: { video: AparatVideo; className?: string }) {
  const [play, setPlay] = useState(false);
  return (
    <div className={`rounded-xl overflow-hidden border border-ink-200 bg-black ${className}`}>
      <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
        {play ? (
          <iframe src={aparatEmbedUrl(video.hash)} title={video.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="absolute inset-0 w-full h-full border-0" />
        ) : (
          <button type="button" onClick={() => setPlay(true)} className="absolute inset-0 w-full h-full flex items-center justify-center text-white group" style={{ background: grad(video.thumbnail) }} aria-label={`پخش «${video.title}» از آپارات`}>
            <span className="w-14 h-14 rounded-full bg-black/45 group-hover:bg-black/60 flex items-center justify-center transition-colors">
              <Play size={24} fill="currentColor" className="translate-x-[-1px]" />
            </span>
            <span className="absolute top-2 right-2 text-[10.5px] bg-[#ea1d5d] rounded px-1.5 py-0.5 font-medium">آپارات</span>
            {video.duration !== "—" && <span className="absolute bottom-2 left-2 text-[10.5px] bg-black/60 rounded px-1.5 py-0.5 tabular-nums">{video.duration}</span>}
          </button>
        )}
      </div>
      <div className="px-3 py-2 bg-white">
        <p className="text-[12.5px] font-medium text-ink-800 line-clamp-1">{video.title}</p>
        <a href={aparatPageUrl(video.hash)} target="_blank" rel="noopener noreferrer" className="text-[10.5px] text-ink-400 hover:text-brand-700 flex items-center gap-1" dir="ltr">
          aparat.com/{video.channel} <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- لینک داخلی
const internalMeta: Record<InternalRef["kind"], { label: string; icon: typeof Newspaper }> = {
  news: { label: "خبر", icon: Newspaper },
  blog: { label: "بلاگ", icon: BookOpen },
  magazines: { label: "مجله", icon: BookOpen },
  events: { label: "رویداد", icon: CalendarDays },
  groups: { label: "گروه", icon: Users },
  channels: { label: "کانال", icon: Megaphone },
  media: { label: "رسانه", icon: ImageIcon },
  forum: { label: "پرسش و پاسخ", icon: MessagesSquare },
};
function InternalCard({ r }: { r: InternalRef }) {
  const s = useSocial();
  let title = "";
  let sub = "";
  let color: string | null = null;
  if (r.kind === "news" || r.kind === "blog" || r.kind === "magazines") {
    const x = s.content.find((c) => c.id === r.id);
    if (x && s.canView(x)) [title, sub, color] = [x.title, x.excerpt, x.poster];
  } else if (r.kind === "events") {
    const x = s.events.find((c) => c.id === r.id);
    if (x && s.canView(x)) [title, sub, color] = [x.title, `${x.start_date} · ${x.start_time}${x.is_online ? " · برخط" : x.location ? ` · ${x.location}` : ""}`, x.poster];
  } else if (r.kind === "groups" || r.kind === "channels") {
    const x = s.chats.find((c) => c.id === r.id);
    if (x && (!x.is_private || s.isMember(x))) [title, sub, color] = [x.title, x.description, x.profile_photos[0] ?? null];
  } else if (r.kind === "media") {
    const x = s.media.find((c) => c.id === r.id);
    if (x && s.canView(x)) [title, sub, color] = [x.caption || "پست رسانه", "", x.poster];
  } else if (r.kind === "forum") {
    const x = s.topics.find((c) => c.id === r.id);
    if (x && s.canView(x)) [title, sub] = [x.title, x.content.slice(0, 120)];
  }
  if (!title) return null;
  const M = internalMeta[r.kind];
  return (
    <Link to={`/dashboard/${r.kind}/${r.id}`} className="mt-1.5 flex items-stretch gap-0 rounded-xl border border-ink-200 bg-white overflow-hidden hover:border-brand-300 max-w-md">
      <span className="w-14 shrink-0 flex items-center justify-center text-white" style={{ background: grad(color ?? "#1f4f99") }}>
        <M.icon size={18} />
      </span>
      <span className="min-w-0 px-2.5 py-1.5">
        <span className="text-[10px] text-brand-700 font-medium">موتوشاب · {M.label}</span>
        <span className="block text-[12.5px] font-medium text-ink-800 line-clamp-1">{title}</span>
        {sub && <span className="block text-[11px] text-ink-500 line-clamp-2 leading-5">{sub}</span>}
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------- کارت لینک
/** کارت پیش‌نمایش یک نشانی؛ onRemove = دکمه‌ی «حذف پیش‌نمایش» */
export function LinkPreviewCard({ url, onRemove }: { url: string; onRemove?: () => void }) {
  const s = useSocial();
  const [loading, setLoading] = useState(() => !wasFetched(url));
  useEffect(() => {
    if (wasFetched(url)) return setLoading(false);
    setLoading(true);
    const h = window.setTimeout(() => {
      markFetched(url);
      setLoading(false);
    }, PREVIEW_DELAY_MS);
    return () => window.clearTimeout(h);
  }, [url]);
  if (s.setting("core.link_preview.enabled") === false) return null;
  const remove = onRemove && (
    <button type="button" onClick={onRemove} className="absolute top-1.5 left-1.5 z-10 p-1 rounded-md bg-white/90 text-ink-500 hover:text-rose-600 border border-ink-100" title="حذف پیش‌نمایش" aria-label="حذف پیش‌نمایش">
      <X size={12} />
    </button>
  );
  const hash = /aparat\.com/i.test(url) ? aparatHash(url) : null;
  if (hash)
    return (
      <div className="relative mt-1.5 max-w-md">
        {remove}
        <AparatPlayer video={aparatMeta(hash)} />
      </div>
    );
  const ref = internalRef(url);
  if (ref)
    return (
      <div className="relative">
        {remove}
        <InternalCard r={ref} />
      </div>
    );
  if (loading)
    return (
      <div className="mt-1.5 flex gap-2 rounded-xl border border-ink-200 bg-white p-2 max-w-md animate-pulse" aria-label="در حال واکشی پیش‌نمایش">
        <span className="w-16 h-14 rounded-lg bg-ink-100 shrink-0" />
        <span className="flex-1 space-y-1.5 py-1">
          <span className="block h-2.5 rounded bg-ink-100 w-3/4" />
          <span className="block h-2 rounded bg-ink-100 w-full" />
          <span className="block h-2 rounded bg-ink-100 w-1/3" />
        </span>
      </div>
    );
  const p = lookupPreview(url, parseBlocked(s.setting("core.link_preview.blocked_domains")));
  if (!p) return null; // شکست ← فقط لینک ساده
  return (
    <div className="relative mt-1.5 max-w-md">
      {remove}
      <a href={p.final_url} target="_blank" rel="noopener noreferrer" className="flex items-stretch rounded-xl border border-ink-200 bg-white overflow-hidden hover:border-brand-300">
        {p.image && <span className="w-20 shrink-0" style={{ background: grad(p.image) }} aria-hidden />}
        <span className="min-w-0 px-2.5 py-1.5 flex-1">
          <span className="flex items-center gap-1 text-[10px] text-ink-400" dir="ltr">
            <Globe size={10} /> {domainOf(p.final_url)}
          </span>
          <span className="block text-[12.5px] font-medium text-ink-800 line-clamp-1">{p.title}</span>
          {p.description && <span className="block text-[11px] text-ink-500 line-clamp-2 leading-5">{p.description}</span>}
          {!p.description && <span className="block text-[11px] text-ink-400">{p.site_name}</span>}
        </span>
      </a>
    </div>
  );
}

/** پیش‌نمایش نخستین لینکِ یک متن (پیام، نظر، پست) */
export function TextLinkPreview({ text, hidden, onRemove }: { text: string; hidden?: boolean; onRemove?: () => void }) {
  const url = firstUrl(text);
  if (!url || hidden) return null;
  return <LinkPreviewCard url={url} onRemove={onRemove} />;
}

/** پیش‌نمایش در نگارشگر پیش از ارسال — «حذف پیش‌نمایش» آن را برای همین پیام برمی‌دارد */
export function ComposerLinkPreview({ text, dismissed, onDismiss }: { text: string; dismissed: string | null; onDismiss: (url: string) => void }) {
  const url = firstUrl(text);
  if (!url || dismissed === url) return null;
  return (
    <div className="px-3 pt-2">
      <LinkPreviewCard url={url} onRemove={() => onDismiss(url)} />
    </div>
  );
}
