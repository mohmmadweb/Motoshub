// endpointهای «پیشنهادی» دنبال‌کردن موضوعات پرسش و پاسخ (F06) — هم‌قالب src/social/endpoints.ts
import type { Ep } from "../endpoints";

const p = (method: Ep["method"], path: string): Ep => ({ method, path, proposed: true });

export const followEndpoints = {
  topicFollow: (id: string) => p("POST", `/forums/forums/topics/${id}/follow/`),
  topicUnfollow: (id: string) => p("DELETE", `/forums/forums/topics/${id}/follow/`),
  topicsFollowed: () => p("GET", "/forums/forums/topics/followed/"),
  topicsFollowedActivity: () => p("GET", "/forums/forums/topics/followed/activity/"),
};
