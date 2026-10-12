// هوک دنبال‌کردن «موضوعات پرسش و پاسخ» (F06) — فقط موضوع (دنبال‌کردن افراد در سامانه وجود ندارد).
// داده و اکشن‌ها در ./core (بدون وابستگی به React).
import { useTenancy } from "../../context/TenancyContext";
import { useLocalStore } from "../../iam/store";
import { topicFollowStore, setTopicFollow, setTopicNotify } from "./core";

export * from "./core";

export function useTopicFollows() {
  const s = useLocalStore(topicFollowStore);
  const { actingUser } = useTenancy();
  const me = actingUser.id;
  return {
    me,
    state: s,
    isFollowingTopic: (tid: string) => s.topicFollows.some((x) => x.user_id === me && x.topic_id === tid),
    topicFollow: (tid: string) => s.topicFollows.find((x) => x.user_id === me && x.topic_id === tid),
    followTopic: (tid: string, on: boolean) => setTopicFollow(me, tid, on),
    setTopicNotify: (tid: string, on: boolean) => setTopicNotify(me, tid, on),
    topicFollowers: (tid: string) => s.topicFollows.filter((x) => x.topic_id === tid).map((x) => x.user_id),
    myTopicFollows: s.topicFollows.filter((x) => x.user_id === me),
    activitiesOf: (tid: string) => s.activities.filter((a) => a.topic_id === tid),
  };
}
