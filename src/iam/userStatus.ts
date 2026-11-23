// ---------------------------------------------------------------------------
// وضعیت کاربر (میزیتو: «تعیین وضعیت (Status) برای کاربر») — «پیشنهادی»:
// `GET/PUT identity/me/status/` → `{ code: available | busy | in_meeting | on_leave | custom, text, until }`.
// هر کاربر وضعیت خودش را تعیین می‌کند (منوی آواتار و نمایه) و بقیه کنار نامش می‌بینند.
// ---------------------------------------------------------------------------
import { createLocalStore, useLocalStore } from "./store";

export type UserStatusCode = "available" | "busy" | "in_meeting" | "on_leave" | "custom";
export type UserStatusApi = { code: UserStatusCode; text: string; until: string | null };

export const statusLabel: Record<UserStatusCode, string> = {
  available: "در دسترس",
  busy: "مشغول",
  in_meeting: "در جلسه",
  on_leave: "مرخصی",
  custom: "وضعیت دلخواه",
};
/** رنگ نقطه‌ی وضعیت (Pill/Badge dot) */
export const statusDot: Record<UserStatusCode, "success" | "danger" | "warning" | "neutral" | "info"> = {
  available: "success",
  busy: "danger",
  in_meeting: "warning",
  on_leave: "neutral",
  custom: "info",
};

export const userStatusEndpoint = { get: { method: "GET", path: "/identity/me/status/", proposed: true }, put: { method: "PUT", path: "/identity/me/status/", proposed: true } } as const;

export const userStatusStore = createLocalStore<Record<string, UserStatusApi>>("kariz.userStatus.v1", () => ({ u2: { code: "in_meeting", text: "", until: null } }), (raw) => (raw && typeof raw === "object" ? (raw as Record<string, UserStatusApi>) : null));

export const useUserStatuses = () => useLocalStore(userStatusStore);
export function useUserStatus(userId: string): UserStatusApi {
  const all = useUserStatuses();
  return all[userId] ?? { code: "available", text: "", until: null };
}
export const setUserStatus = (userId: string, st: UserStatusApi) => userStatusStore.set((prev) => ({ ...prev, [userId]: st }));
export const statusText = (st: UserStatusApi) => (st.code === "custom" ? st.text || statusLabel.custom : st.text ? `${statusLabel[st.code]} — ${st.text}` : statusLabel[st.code]);
