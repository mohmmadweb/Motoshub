// ---------------------------------------------------------------------------
// دنبال‌کردن افراد و موضوعات + کاربران برجسته (F06 · F08 · F09)
//   follow        { follower_id, followee_id, created_at }                    — بدون نیاز به تأیید
//   topic_follow  { topic_id, user_id, created_at, notify, seen_at }           — سازنده و پاسخ‌دهنده خودکار
//   topic_activity{ topic_id, kind, actor, created_at }                        — پذیرش پاسخ، قفل، …
//   featured_user { user_id, order, note, auto_connect: friend|follow|none, scope_id }
// انبار مستقل در مرورگر (motoshub.follows.v1) — جدا از SocialContext. سایر ماژول‌ها فقط می‌خوانند.
// (این فایل به React/کانتکست وابسته نیست تا TenancyProvider هم بتواند آن را صدا بزند؛ هوک در store.ts)
// ---------------------------------------------------------------------------
import { users } from "../../data/mock";
import { createLocalStore } from "../../iam/store";
import { ROOT_ID } from "../../iam/model";
import { nowClock } from "../../pm/jalali";
import { DEMO_REF_DATE } from "../../pm/seed";

export type Follow = { follower_id: string; followee_id: string; created_at: string };
export type TopicFollow = { topic_id: string; user_id: string; created_at: string; notify: boolean; /** آخرین بازدید — فعالیت‌های بعد از آن «خوانده‌نشده» است */ seen_at: string; auto?: boolean };
export type TopicActivityKind = "answer" | "accepted" | "locked" | "unlocked" | "summary";
export const topicActivityLabel: Record<TopicActivityKind, string> = { answer: "پاسخ جدید", accepted: "پاسخ پذیرفته شد", locked: "قفل شد", unlocked: "باز شد", summary: "جمع‌بندی شد" };
export type TopicActivity = { id: string; topic_id: string; kind: TopicActivityKind; actor: string; created_at: string };
export type AutoConnect = "friend" | "follow" | "none";
export const autoConnectLabel: Record<AutoConnect, string> = { friend: "دوستی خودکار", follow: "دنبال‌کردن خودکار", none: "بدون ارتباط خودکار" };
export type FeaturedUser = { user_id: string; order: number; note: string; auto_connect: AutoConnect; scope_id: string };
/** ارتباطِ خودکار «دوستی» با برجسته (بدون نیاز به درخواست) */
export type AutoLink = { user_id: string; featured_id: string; scope_id: string; created_at: string };

type State = {
  seq: number;
  follows: Follow[];
  topicFollows: TopicFollow[];
  activities: TopicActivity[];
  featured: FeaturedUser[];
  /** «ارتباط خودکار برای اعضای جدید» به تفکیک لایه */
  autoNew: Record<string, boolean>;
  autoLinks: AutoLink[];
};

/** مهر زمان هم‌قالب SocialContext: «۱۴۰۵/۰۳/۰۸ ۱۰:۲۲:۰۰» */
export const nowStamp = () => `${DEMO_REF_DATE} ${nowClock()}:۰۰`;
const OLD = "۱۴۰۵/۰۲/۲۰ ۰۹:۰۰:۰۰";
const WEEK_AGO = "۱۴۰۵/۰۳/۰۱ ۰۸:۰۰:۰۰";

function seed(): State {
  const f = (a: string, b: string): Follow => ({ follower_id: a, followee_id: b, created_at: OLD });
  const pairs: [string, string[]][] = [
    ["u1", ["u2", "u5", "u9"]],
    ["u2", ["u1", "u4", "u6"]],
    ["u3", ["u2", "u5", "u1"]],
    ["u4", ["u2", "u1", "u13"]],
    ["u5", ["u2", "u6", "u1"]],
    ["u6", ["u2", "u9"]],
    ["u7", ["u9", "u2", "u1"]],
    ["u9", ["u2", "u7"]],
    ["u12", ["u2", "u9", "u1"]],
    ["u13", ["u2", "u4", "u1"]],
  ];
  const tf = (user_id: string, ids: string[]): TopicFollow[] => ids.map((t) => ({ topic_id: t, user_id, created_at: OLD, notify: true, seen_at: WEEK_AGO }));
  return {
    seq: 0,
    follows: pairs.flatMap(([a, bs]) => bs.map((b) => f(a, b))),
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
    featured: [
      { user_id: "u2", order: 1, note: "رئیس بنیاد — پیام‌ها و ابلاغیه‌های کلان", auto_connect: "follow", scope_id: ROOT_ID },
      { user_id: "u1", order: 2, note: "روابط عمومی و پایگاه اطلاع‌رسانی", auto_connect: "friend", scope_id: ROOT_ID },
    ],
    autoNew: { [ROOT_ID]: true },
    autoLinks: [],
  };
}

export const followStore = createLocalStore<State>("motoshub.follows.v1", seed, (raw) => {
  const r = raw as Partial<State> | null;
  if (!r || !Array.isArray(r.follows)) return null;
  const d = seed();
  return { seq: r.seq ?? 0, follows: r.follows, topicFollows: r.topicFollows ?? d.topicFollows, activities: r.activities ?? [], featured: r.featured ?? d.featured, autoNew: r.autoNew ?? d.autoNew, autoLinks: r.autoLinks ?? [] };
});

const set = followStore.set;
const uname = (id: string) => users.find((u) => u.id === id)?.name ?? id;

// ---------------------------------------------------------------- افراد (F08)
export function setFollow(me: string, uid: string, on: boolean) {
  if (me === uid) return;
  set((s) => {
    const has = s.follows.some((x) => x.follower_id === me && x.followee_id === uid);
    if (on === has) return s;
    return { ...s, follows: on ? [...s.follows, { follower_id: me, followee_id: uid, created_at: nowStamp() }] : s.follows.filter((x) => !(x.follower_id === me && x.followee_id === uid)) };
  });
}

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
  const s = followStore.get();
  if (s.topicFollows.some((x) => x.user_id === me && x.topic_id === topicId)) return false;
  setTopicFollow(me, topicId, true, { auto: true });
  return true;
}
export function setTopicNotify(me: string, topicId: string, notify: boolean) {
  set((s) => ({ ...s, topicFollows: s.topicFollows.map((x) => (x.user_id === me && x.topic_id === topicId ? { ...x, notify } : x)) }));
}
export function markTopicSeen(me: string, topicId: string) {
  const s = followStore.get();
  if (!s.topicFollows.some((x) => x.user_id === me && x.topic_id === topicId)) return;
  set((st) => ({ ...st, topicFollows: st.topicFollows.map((x) => (x.user_id === me && x.topic_id === topicId ? { ...x, seen_at: nowStamp() } : x)) }));
}
export function logTopicActivity(topicId: string, kind: TopicActivityKind, actor: string) {
  set((s) => ({ ...s, seq: s.seq + 1, activities: [{ id: `ta${s.seq + 1}`, topic_id: topicId, kind, actor, created_at: nowStamp() }, ...s.activities].slice(0, 500) }));
}
/** نام دنبال‌کنندگانِ موضوع که اعلانشان روشن است (به‌جز exclude) — برای InboxContext.send */
export function topicFollowerNames(topicId: string, exclude: string[] = []) {
  return followStore
    .get()
    .topicFollows.filter((x) => x.topic_id === topicId && x.notify && !exclude.includes(x.user_id))
    .map((x) => uname(x.user_id));
}

// ---------------------------------------------------------------- کاربران برجسته (F09)
export function saveFeatured(scopeId: string, list: FeaturedUser[]) {
  set((s) => ({ ...s, featured: [...s.featured.filter((x) => x.scope_id !== scopeId), ...list.map((x, i) => ({ ...x, scope_id: scopeId, order: i + 1 }))] }));
}
export function setAutoNew(scopeId: string, on: boolean) {
  set((s) => ({ ...s, autoNew: { ...s.autoNew, [scopeId]: on } }));
}

/** ارتباط یک عضو با برجسته‌ها طبق auto_connect هر کدام؛ تعداد ارتباط تازه را برمی‌گرداند */
function connect(s: State, userId: string, featured: FeaturedUser[]): { s: State; n: number } {
  let n = 0;
  let follows = s.follows;
  let links = s.autoLinks;
  featured.forEach((f) => {
    if (f.user_id === userId || f.auto_connect === "none") return;
    if (!follows.some((x) => x.follower_id === userId && x.followee_id === f.user_id)) {
      follows = [...follows, { follower_id: userId, followee_id: f.user_id, created_at: nowStamp() }];
      n++;
    }
    if (f.auto_connect === "friend" && !links.some((x) => x.user_id === userId && x.featured_id === f.user_id)) {
      links = [...links, { user_id: userId, featured_id: f.user_id, scope_id: f.scope_id, created_at: nowStamp() }];
      n++;
    }
  });
  return { s: { ...s, follows, autoLinks: links }, n };
}

/** «اعمال روی اعضای فعلی» */
export function applyFeaturedToMembers(scopeId: string, memberIds: string[]) {
  let total = 0;
  set((s) => {
    const fs = s.featured.filter((x) => x.scope_id === scopeId);
    let cur = s;
    new Set(memberIds).forEach((uid) => {
      const r = connect(cur, uid, fs);
      cur = r.s;
      total += r.n;
    });
    return cur;
  });
  return total;
}

/** هنگام عضویت تازه (TenancyContext.addMembership): برجسته‌های همان لایه و لایه‌های بالاتر */
export function applyFeaturedOnJoin(userId: string, chainScopeIds: string[]) {
  const s = followStore.get();
  const fs = s.featured.filter((x) => chainScopeIds.includes(x.scope_id) && s.autoNew[x.scope_id] !== false);
  if (!fs.length) return 0;
  let n = 0;
  set((st) => {
    const r = connect(st, userId, fs);
    n = r.n;
    return r.s;
  });
  return n;
}

