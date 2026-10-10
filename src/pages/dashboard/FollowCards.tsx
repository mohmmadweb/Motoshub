// ---------------------------------------------------------------------------
// داده و ردیف‌های کارت‌های «دنبال‌شده» داشبورد:
//  • موضوعات دنبال‌شده (F06 · ۱.۱۳.۶): آخرین فعالیت هر موضوع + شمار خوانده‌نشده
//  • فید «دنبال‌شده‌ها» (F08 · ۱.۱۸.۵): محتوای عمومیِ افرادی که دنبال می‌کنید، با فیلتر نوع
// فقط محتوای مجاز نمایش داده می‌شود (منتشرشده + قواعد حریم خصوصی canView).
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BookMarked, CalendarClock, CheckCircle2, Image as ImageIcon, Lock, MessageCircle, MessagesSquare, Newspaper } from "lucide-react";
import { useSocial } from "../../context/SocialContext";
import { useFollows, topicActivityLabel, type TopicActivityKind } from "../../social/follow/store";
import { stamp } from "../social/kit";
import Avatar from "../../components/Avatar";
import { users } from "../../data/mock";

type Act = { kind: TopicActivityKind; actor: string; created_at: string };
export type FollowedTopicRow = { id: string; title: string; unread: number; last?: Act; locked: boolean };

export function useFollowedTopics(): FollowedTopicRow[] {
  const s = useSocial();
  const f = useFollows();
  return useMemo(() => {
    return f.myTopicFollows
      .map((tf): FollowedTopicRow | null => {
        const t = s.topics.find((x) => x.id === tf.topic_id);
        if (!t || t.deleted_at || !s.canView(t)) return null;
        const logged = f.activitiesOf(t.id).filter((a) => a.kind !== "answer");
        const acts: Act[] = [
          ...s.posts.filter((p) => p.topic_id === t.id && !p.deleted_at).map((p) => ({ kind: "answer" as const, actor: p.user_id, created_at: p.created_at })),
          ...logged,
        ];
        // وضعیت‌های قدیمی‌تر از داده‌ی نمونه (پیش از ثبت فعالیت‌ها)
        const acc = t.accepted_post_id ? s.posts.find((p) => p.id === t.accepted_post_id) : undefined;
        if (acc && !logged.some((a) => a.kind === "accepted")) acts.push({ kind: "accepted", actor: t.user_id, created_at: acc.created_at });
        if (t.is_locked && !logged.some((a) => a.kind === "locked")) acts.push({ kind: "locked", actor: "", created_at: t.published_at ?? t.created_at });
        acts.sort((a, b) => b.created_at.localeCompare(a.created_at));
        const unread = acts.filter((a) => a.actor !== f.me && a.created_at > tf.seen_at).length;
        return { id: t.id, title: t.title, unread, last: acts[0], locked: t.is_locked };
      })
      .filter((x): x is FollowedTopicRow => !!x)
      .sort((a, b) => b.unread - a.unread || (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.state, s.topics, s.posts]);
}

const uname = (id: string) => users.find((u) => u.id === id)?.name ?? "";
const actText = (a: Act) => (a.kind === "answer" ? `پاسخ ${uname(a.actor)}` : a.actor ? `${topicActivityLabel[a.kind]} · ${uname(a.actor)}` : topicActivityLabel[a.kind]);

export function FollowedTopicRows({ rows, max = 5 }: { rows: FollowedTopicRow[]; max?: number }) {
  return (
    <>
      {rows.slice(0, max).map((r) => {
        const Icon = r.last?.kind === "accepted" ? CheckCircle2 : r.last?.kind === "locked" ? Lock : MessageCircle;
        return (
          <Link key={r.id} to={`/dashboard/forum/${r.id}`} className={`flex items-center gap-2 text-[12px] rounded-lg border px-2.5 py-1.5 hover:border-brand-300 ${r.unread ? "border-brand-100 bg-brand-50/40" : "border-ink-100"}`}>
            <Icon size={12} className={`shrink-0 ${r.last?.kind === "accepted" ? "text-emerald-500" : r.last?.kind === "locked" ? "text-amber-500" : "text-brand-500"}`} />
            <span className="flex-1 min-w-0">
              <span className={`block truncate ${r.unread ? "text-ink-900 font-medium" : "text-ink-700"}`}>{r.title}</span>
              {r.last && (
                <span className="block truncate text-[10.5px] text-ink-400">
                  {actText(r.last)} · {stamp(r.last.created_at)}
                </span>
              )}
            </span>
            {r.unread > 0 && <span className="text-[10px] font-bold bg-brand-600 text-white rounded-full px-1.5 shrink-0">{r.unread.toLocaleString("fa-IR")}</span>}
          </Link>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------- فید دنبال‌شده‌ها
export type FeedType = "all" | "content" | "media" | "event" | "qa";
export const feedTypeLabel: Record<FeedType, string> = { all: "همه", content: "بلاگ و خبر", media: "رسانه", event: "رویداد", qa: "پرسش و پاسخ" };
type FeedRow = { key: string; type: Exclude<FeedType, "all">; label: string; title: string; user: string; at: string; to: string; icon: typeof Newspaper };

const contentPath = (kind: string, id: string) => `/dashboard/${kind === "news" ? "news" : kind === "blogs" ? "blog" : "magazines"}/${id}`;

export function useFollowingFeed(type: FeedType): FeedRow[] {
  const s = useSocial();
  const f = useFollows();
  const ids = new Set(f.following());
  return useMemo(() => {
    type Pub = Parameters<typeof s.canView>[0] & { is_public: boolean; is_draft: boolean; deleted_at: string | null };
    const visible = (x: Pub) => x.is_public && !x.is_draft && !x.deleted_at && s.canView(x);
    const ok = (x: Pub) => ids.has(x.user_id) && visible(x);
    const rows: FeedRow[] = [
      ...s.content.filter(ok).map((c) => ({ key: c.id, type: "content" as const, label: c.kind === "news" ? "خبر" : c.kind === "blogs" ? "بلاگ" : "مجله", title: c.title, user: c.user_id, at: c.published_at ?? c.created_at, to: contentPath(c.kind, c.id), icon: c.kind === "news" ? Newspaper : BookMarked })),
      ...s.media.filter(ok).map((m) => ({ key: m.id, type: "media" as const, label: "رسانه", title: m.caption, user: m.user_id, at: m.published_at ?? m.created_at, to: `/dashboard/media/${m.id}`, icon: ImageIcon })),
      ...s.events.filter(ok).map((e) => ({ key: e.id, type: "event" as const, label: "رویداد", title: e.title, user: e.user_id, at: e.published_at ?? e.created_at, to: `/dashboard/events/${e.id}`, icon: CalendarClock })),
      ...s.topics.filter(ok).map((t) => ({ key: t.id, type: "qa" as const, label: "پرسش", title: t.title, user: t.user_id, at: t.published_at ?? t.created_at, to: `/dashboard/forum/${t.id}`, icon: MessagesSquare })),
      ...s.posts
        .filter((p) => ids.has(p.user_id) && !p.deleted_at && !p.parent_id)
        .map((p) => ({ p, t: s.topics.find((x) => x.id === p.topic_id) }))
        .filter((x) => !!x.t && visible(x.t))
        .map(({ p, t }) => ({ key: p.id, type: "qa" as const, label: "پاسخ", title: `در «${t!.title}»`, user: p.user_id, at: p.created_at, to: `/dashboard/forum/${t!.id}`, icon: MessageCircle })),
    ];
    return rows.filter((r) => type === "all" || r.type === type).sort((a, b) => b.at.localeCompare(a.at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, f.state, s.content, s.media, s.events, s.topics, s.posts]);
}

export function FeedRows({ rows, max = 5 }: { rows: FeedRow[]; max?: number }) {
  return (
    <>
      {rows.slice(0, max).map((r) => {
        const u = users.find((x) => x.id === r.user);
        return (
          <Link key={r.key} to={r.to} className="flex items-center gap-2 text-[12px] text-ink-700 hover:text-brand-700 rounded-lg border border-ink-100 px-2.5 py-1.5">
            {u ? <Avatar name={u.name} color={u.avatarColor} size={20} /> : <r.icon size={12} className="text-brand-500 shrink-0" />}
            <span className="flex-1 min-w-0">
              <span className="block truncate">{r.title}</span>
              <span className="block truncate text-[10.5px] text-ink-400">
                {u?.name} · {r.label} · {stamp(r.at)}
              </span>
            </span>
          </Link>
        );
      })}
    </>
  );
}
