// ---------------------------------------------------------------------------
// ویرایش‌های «نمایه‌ی من» — فقط فیلدهایی که `PATCH identity/me/` واقعاً می‌پذیرد
// (SelfProfileUpdateSerializer: first_name, last_name, email, username) + تصویر
// (`POST me/profile-photos/` و `PUT me/profile-photo/`). سایر فیلدها از منبع سازمانی‌اند و قفل‌اند.
// ---------------------------------------------------------------------------
import { createLocalStore, useLocalStore } from "../../iam/store";
import type { UserProfile } from "../../data/mock";

export type SelfProfilePatch = { first_name?: string; last_name?: string; email?: string; username?: string; avatar_url?: string };
export const editableFields: { key: keyof Omit<SelfProfilePatch, "avatar_url">; label: string; dir?: "ltr" }[] = [
  { key: "first_name", label: "نام" },
  { key: "last_name", label: "نام خانوادگی" },
  { key: "email", label: "رایانامه", dir: "ltr" },
  { key: "username", label: "نام کاربری", dir: "ltr" },
];

export const profileEndpoints = {
  get: { method: "GET", path: "/identity/me/" },
  patch: { method: "PATCH", path: "/identity/me/" },
  changePassword: { method: "POST", path: "/identity/me/change-password/" },
  revokeSessions: { method: "POST", path: "/identity/me/revoke-sessions/" },
  uploadPhoto: { method: "POST", path: "/identity/me/profile-photos/" },
  setPhoto: { method: "PUT", path: "/identity/me/profile-photo/" },
} as const;

const store = createLocalStore<Record<string, SelfProfilePatch>>("kariz.selfProfile.v1", () => ({}), (r) => (r && typeof r === "object" ? (r as Record<string, SelfProfilePatch>) : null));

/** مقدار مؤثر هر فیلد (ویرایش کاربر یا داده‌ی نمونه) */
export function useSelfProfile(u: UserProfile) {
  const all = useLocalStore(store);
  const p = all[u.id] ?? {};
  const [first, ...rest] = u.name.split(" ");
  const base = { first_name: rest.length ? first : u.name, last_name: rest.join(" "), email: u.email ?? "", username: u.username ?? "" };
  const v = { ...base, ...p };
  return {
    values: v as Required<Omit<SelfProfilePatch, "avatar_url">> & { avatar_url?: string },
    displayName: `${v.first_name} ${v.last_name}`.trim() || u.name,
    patch: (next: SelfProfilePatch) => store.set((prev) => ({ ...prev, [u.id]: { ...prev[u.id], ...next } })),
  };
}
