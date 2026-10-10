// هوک دنبال‌کردن (F06 · F08 · F09) — قرارداد مشترک: سایر ماژول‌ها فقط‌خواندنی import می‌کنند.
// داده و اکشن‌ها در ./core (بدون وابستگی به React تا TenancyProvider هم بتواند صدا بزند).
import { useTenancy } from "../../context/TenancyContext";
import { useLocalStore } from "../../iam/store";
import { followStore, setFollow, setTopicFollow, setTopicNotify } from "./core";

export * from "./core";

export function useFollows() {
  const s = useLocalStore(followStore);
  const { actingUser } = useTenancy();
  const me = actingUser.id;
  const following = (uid = me) => s.follows.filter((x) => x.follower_id === uid).map((x) => x.followee_id);
  const followers = (uid = me) => s.follows.filter((x) => x.followee_id === uid).map((x) => x.follower_id);
  return {
    me,
    state: s,
    // افراد (F08)
    isFollowing: (uid: string) => s.follows.some((x) => x.follower_id === me && x.followee_id === uid),
    follow: (uid: string, on: boolean) => setFollow(me, uid, on),
    following,
    followers,
    /** دوستی خودکار با برجسته (دوطرفه نمایش داده می‌شود) */
    isAutoFriend: (uid: string, of = me) => s.autoLinks.some((x) => (x.user_id === of && x.featured_id === uid) || (x.user_id === uid && x.featured_id === of)),
    autoFriendsOf: (uid = me) => [...new Set(s.autoLinks.filter((x) => x.user_id === uid || x.featured_id === uid).map((x) => (x.user_id === uid ? x.featured_id : x.user_id)))],
    // موضوعات (F06)
    isFollowingTopic: (tid: string) => s.topicFollows.some((x) => x.user_id === me && x.topic_id === tid),
    topicFollow: (tid: string) => s.topicFollows.find((x) => x.user_id === me && x.topic_id === tid),
    followTopic: (tid: string, on: boolean) => setTopicFollow(me, tid, on),
    setTopicNotify: (tid: string, on: boolean) => setTopicNotify(me, tid, on),
    topicFollowers: (tid: string) => s.topicFollows.filter((x) => x.topic_id === tid).map((x) => x.user_id),
    myTopicFollows: s.topicFollows.filter((x) => x.user_id === me),
    activitiesOf: (tid: string) => s.activities.filter((a) => a.topic_id === tid),
    // برجسته‌ها (F09)
    isFeatured: (uid: string, scopeIds?: string[]) => s.featured.some((x) => x.user_id === uid && (!scopeIds || scopeIds.includes(x.scope_id))),
    featuredIn: (scopeIds: string[]) => s.featured.filter((x) => scopeIds.includes(x.scope_id)).sort((a, b) => scopeIds.indexOf(a.scope_id) - scopeIds.indexOf(b.scope_id) || a.order - b.order),
  };
}
