// endpointهای «پیشنهادی» دنبال‌کردن و کاربران برجسته (F06 · F08 · F09) — هم‌قالب src/social/endpoints.ts
import type { Ep } from "../endpoints";

const p = (method: Ep["method"], path: string): Ep => ({ method, path, proposed: true });

export const followEndpoints = {
  // F06 — دنبال‌کردن موضوعات پرسش و پاسخ
  topicFollow: (id: string) => p("POST", `/forums/forums/topics/${id}/follow/`),
  topicUnfollow: (id: string) => p("DELETE", `/forums/forums/topics/${id}/follow/`),
  topicsFollowed: () => p("GET", "/forums/forums/topics/followed/"),
  topicsFollowedActivity: () => p("GET", "/forums/forums/topics/followed/activity/"),
  // F08 — دنبال‌کردن افراد و فید داشبورد
  follow: (userId: string) => p("POST", `/relations/follows/${userId}/`),
  unfollow: (userId: string) => p("DELETE", `/relations/follows/${userId}/`),
  following: () => p("GET", "/relations/follows/following/"),
  followers: () => p("GET", "/relations/follows/followers/"),
  followingFeed: () => p("GET", "/relations/dashboards/user/feed/?source=following"),
  // F09 — کاربران برجسته و ارتباط خودکار
  featured: () => p("GET", "/relations/featured-users/"),
  featuredCreate: () => p("POST", "/relations/featured-users/"),
  featuredUpdate: (userId: string) => p("PATCH", `/relations/featured-users/${userId}/`),
  featuredDelete: (userId: string) => p("DELETE", `/relations/featured-users/${userId}/`),
  featuredApplyExisting: () => p("POST", "/relations/featured-users/apply-existing/"),
};
