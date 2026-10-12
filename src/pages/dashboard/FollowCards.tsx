// ---------------------------------------------------------------------------
// داده و ردیف‌های کارت «پرسش و پاسخ» میز کار: موضوعات دنبال‌شده (F06 · ۱.۱۳.۶) —
// آخرین فعالیت هر موضوع + شمار خوانده‌نشده؛ فقط موضوع‌های مجاز (canView).
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Lock, MessageCircle } from "lucide-react";
import { useSocial } from "../../context/SocialContext";
import { useTopicFollows, topicActivityLabel, type TopicActivityKind } from "../../social/follow/store";
import { stamp } from "../social/kit";
import { users } from "../../data/mock";

type Act = { kind: TopicActivityKind; actor: string; created_at: string };
export type FollowedTopicRow = { id: string; title: string; unread: number; last?: Act; locked: boolean };

export function useFollowedTopics(): FollowedTopicRow[] {
  const s = useSocial();
  const f = useTopicFollows();
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
