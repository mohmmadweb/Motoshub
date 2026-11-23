// ---------------------------------------------------------------------------
// قرارداد C4 — ردیف‌های «میزکار من» از بخش شبکه اجتماعی.
// هر کارت داشبورد عنوانش برچسب منو است و هر ردیف به رکورد خودش پیوند دارد:
//   «اخبار سازمان» ← news · «رویدادها و جلسات» ← events · «گفتگوها» ← chats · «پرسش و پاسخ» ← followedTopics
// ---------------------------------------------------------------------------
import { useSocial } from "../context/SocialContext";
import { dayNum } from "../pm/jalali";
import { useTopicFollows } from "./follow/store";

export type DeskRow = {
  id: string;
  kind: "news" | "event" | "chat" | "topic";
  title: string;
  meta: string;
  /** موعد (تاریخ شمسی) — برای رویداد */
  due?: string;
  priority?: "high" | "normal";
  href: string;
  actions?: { label: string; href: string }[];
};
export type SocialDesk = { news: DeskRow[]; events: DeskRow[]; chats: DeskRow[]; followedTopics: DeskRow[] };

const fa = (n: number) => n.toLocaleString("fa-IR");
const datePart = (s: string | null | undefined) => (s ?? "").split(" ")[0];

/** ردیف‌های داشبورد بخش اجتماعی (هر فهرست حداکثر `limit` ردیف) */
export function useSocialDesk(limit = 5): SocialDesk {
  const s = useSocial();
  const f = useTopicFollows();
  const today = dayNum(s.today) ?? 0;

  const news: DeskRow[] = s.content
    .filter((x) => x.kind === "news" && x.is_public && !x.is_draft && !x.deleted_at && s.canView(x))
    .sort((a, b) => Number(!!b.announcement?.pin_until) - Number(!!a.announcement?.pin_until) || (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    .slice(0, limit)
    .map((x): DeskRow => {
      const needsAck = !!x.announcement?.requires_ack && !x.announcement.acks[s.me];
      return { id: x.id, kind: "news", title: x.title, meta: `${s.userName(x.user_id)} · ${datePart(x.published_at)}${needsAck ? " · نیازمند تأیید خواندن" : ""}`, priority: x.announcement ? "high" : "normal", href: `/news/${x.id}` };
    });

  const events: DeskRow[] = s.events
    .filter((x) => !x.deleted_at && x.is_public && !x.is_draft && s.canView(x) && (dayNum(x.end_date || x.start_date) ?? 0) >= today)
    .sort((a, b) => (dayNum(a.start_date) ?? 0) - (dayNum(b.start_date) ?? 0) || a.start_time.localeCompare(b.start_time))
    .slice(0, limit)
    .map((x): DeskRow => {
      const mine = s.myEventStatus(x.id);
      return {
        id: x.id,
        kind: "event",
        title: x.title,
        meta: `${x.start_date} · ${x.start_time}${x.is_online ? " · برخط" : x.address || x.location ? ` · ${x.address || x.location}` : ""}`,
        due: x.start_date,
        priority: mine?.status === "invited" ? "high" : "normal",
        href: `/events/${x.id}`,
        ...(mine?.status === "invited" ? { actions: [{ label: "پاسخ به دعوت", href: `/events/${x.id}` }] } : {}),
      };
    });

  const chats: DeskRow[] = s
    .myChats(["direct_message", "group", "channel"])
    .filter((c) => !c.parent && s.unreadCount(c) > 0 && !c.muted_by.includes(s.me))
    .slice(0, limit)
    .map((c): DeskRow => {
      const last = s.lastMessage(c.id);
      const title = c.chat_type === "direct_message" ? s.userName(c.receiver && c.receiver !== s.me ? c.receiver : c.members.find((m) => m.user_id !== s.me)?.user_id ?? c.owner_id) : c.title;
      const base = c.chat_type === "group" ? "/groups" : c.chat_type === "channel" ? "/channels" : "/conversations";
      const body = last ? (last.type === "audio" ? "پیام صوتی" : last.type === "sticker" ? "برچسب" : last.content || "پیوست") : "";
      return { id: c.id, kind: "chat", title, meta: `${fa(s.unreadCount(c))} پیام نخوانده${body ? ` · ${body.slice(0, 50)}` : ""}`, href: `${base}/${c.id}` };
    });

  const followedTopics: DeskRow[] = f.myTopicFollows
    .map((tf) => ({ tf, t: s.topics.find((x) => x.id === tf.topic_id && !x.deleted_at) }))
    .filter((x): x is { tf: typeof x.tf; t: NonNullable<typeof x.t> } => !!x.t && s.canView(x.t))
    .map(({ tf, t }) => ({ t, fresh: f.activitiesOf(t.id).filter((a) => a.created_at > tf.seen_at && a.actor !== s.me).length }))
    .sort((a, b) => b.fresh - a.fresh || b.t.updated_at.localeCompare(a.t.updated_at))
    .slice(0, limit)
    .map(({ t, fresh }): DeskRow => ({
      id: t.id,
      kind: "topic",
      title: t.title,
      meta: `${fa(s.posts.filter((p) => p.topic_id === t.id && !p.deleted_at).length)} پاسخ${fresh ? ` · ${fa(fresh)} فعالیت تازه` : ""}${t.accepted_post_id ? " · حل‌شده" : ""}`,
      priority: fresh ? "high" : "normal",
      href: `/forums/${t.id}`,
    }));

  return { news, events, chats, followedTopics };
}
