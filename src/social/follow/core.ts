// ---------------------------------------------------------------------------
// دنبال‌کردن «موضوعات پرسش و پاسخ» (F06) — فقط موضوع؛ دنبال‌کردن افراد و «کاربران برجسته» حذف شده است.
//   topic_follow  { topic_id, user_id, created_at, notify, seen_at }           — سازنده و پاسخ‌دهنده خودکار
//   topic_activity{ topic_id, kind, actor, created_at }                        — پذیرش پاسخ، قفل، …
// انبار مستقل در مرورگر (همان کلید قدیمی motoshub.follows.v1؛ فیلدهای حذف‌شده‌ی قدیمی نادیده گرفته می‌شوند).
// (این فایل به React/کانتکست وابسته نیست؛ هوک در store.ts)
// ---------------------------------------------------------------------------
import { users } from "../../data/mock";
import { createLocalStore } from "../../iam/store";
import { nowClock } from "../../pm/jalali";
import { DEMO_REF_DATE } from "../../pm/seed";

export type TopicFollow = { topic_id: string; user_id: string; created_at: string; notify: boolean; /** آخرین بازدید — فعالیت‌های بعد از آن «خوانده‌نشده» است */ seen_at: string; auto?: boolean };
export type TopicActivityKind = "answer" | "accepted" | "locked" | "unlocked" | "summary";
export const topicActivityLabel: Record<TopicActivityKind, string> = { answer: "پاسخ جدید", accepted: "پاسخ پذیرفته شد", locked: "قفل شد", unlocked: "باز شد", summary: "جمع‌بندی شد" };
export type TopicActivity = { id: string; topic_id: string; kind: TopicActivityKind; actor: string; created_at: string };

type State = {
  seq: number;
  topicFollows: TopicFollow[];
  activities: TopicActivity[];
};

/** مهر زمان هم‌قالب SocialContext: «۱۴۰۵/۰۳/۰۸ ۱۰:۲۲:۰۰» */
export const nowStamp = () => `${DEMO_REF_DATE} ${nowClock()}:۰۰`;
const OLD = "۱۴۰۵/۰۲/۲۰ ۰۹:۰۰:۰۰";
const WEEK_AGO = "۱۴۰۵/۰۳/۰۱ ۰۸:۰۰:۰۰";

function seed(): State {
  const tf = (user_id: string, ids: string[]): TopicFollow[] => ids.map((t) => ({ topic_id: t, user_id, created_at: OLD, notify: true, seen_at: WEEK_AGO }));
  return {
    seq: 0,
    topicFollows: [
      ...tf("u1", ["tp-f1", "tp-f3", "tp-f6", "tp-f9"]),
      ...tf("u2", ["tp-f3", "tp-f7", "tp-f2"]),
      ...tf("u4", ["tp-f1", "tp-f5"]),
      ...tf("u5", ["tp-f2", "tp-f4", "tp-f8"]),
      ...tf("u3", ["tp-f10", "tp-f1"]),
      ...tf("u12", ["tp-f2", "tp-f6"]),
      ...tf("u13", ["tp-f4"]),
      ...tf("u7", ["tp-f5", "tp-f1"]),
    ],
    activities: [],
  };
}

export const topicFollowStore = createLocalStore<State>("motoshub.follows.v1", seed, (raw) => {
  const r = raw as Partial<State> | null;
  if (!r || typeof r !== "object") return null;
  const d = seed();
  // داده‌ی قدیمی ممکن است follows/featured/autoLinks داشته باشد — نادیده گرفته می‌شود
  return { seq: typeof r.seq === "number" ? r.seq : 0, topicFollows: Array.isArray(r.topicFollows) ? r.topicFollows : d.topicFollows, activities: Array.isArray(r.activities) ? r.activities : [] };
});

const set = topicFollowStore.set;
const uname = (id: string) => users.find((u) => u.id === id)?.name ?? id;

// ---------------------------------------------------------------- موضوعات (F06)
export function setTopicFollow(me: string, topicId: string, on: boolean, opts: { auto?: boolean } = {}) {
  set((s) => {
    const has = s.topicFollows.some((x) => x.user_id === me && x.topic_id === topicId);
    if (on === has) return s;
    return {
      ...s,
      topicFollows: on ? [...s.topicFollows, { topic_id: topicId, user_id: me, created_at: nowStamp(), notify: true, seen_at: nowStamp(), ...(opts.auto ? { auto: true } : {}) }] : s.topicFollows.filter((x) => !(x.user_id === me && x.topic_id === topicId)),
    };
  });
}
/** دنبال‌کردن خودکار (سازنده/پاسخ‌دهنده) — اگر قبلاً لغو نکرده باشد، فقط یک بار */
export function autoFollowTopic(me: string, topicId: string) {
  const s = topicFollowStore.get();
  if (s.topicFollows.some((x) => x.user_id === me && x.topic_id === topicId)) return false;
  setTopicFollow(me, topicId, true, { auto: true });
  return true;
}
export function setTopicNotify(me: string, topicId: string, notify: boolean) {
  set((s) => ({ ...s, topicFollows: s.topicFollows.map((x) => (x.user_id === me && x.topic_id === topicId ? { ...x, notify } : x)) }));
}
export function markTopicSeen(me: string, topicId: string) {
  const s = topicFollowStore.get();
  if (!s.topicFollows.some((x) => x.user_id === me && x.topic_id === topicId)) return;
  set((st) => ({ ...st, topicFollows: st.topicFollows.map((x) => (x.user_id === me && x.topic_id === topicId ? { ...x, seen_at: nowStamp() } : x)) }));
}
export function logTopicActivity(topicId: string, kind: TopicActivityKind, actor: string) {
  set((s) => ({ ...s, seq: s.seq + 1, activities: [{ id: `ta${s.seq + 1}`, topic_id: topicId, kind, actor, created_at: nowStamp() }, ...s.activities].slice(0, 500) }));
}
/** نام دنبال‌کنندگانِ موضوع که اعلانشان روشن است (به‌جز exclude) — برای InboxContext.send */
export function topicFollowerNames(topicId: string, exclude: string[] = []) {
  return topicFollowStore
    .get()
    .topicFollows.filter((x) => x.topic_id === topicId && x.notify && !exclude.includes(x.user_id))
    .map((x) => uname(x.user_id));
}
