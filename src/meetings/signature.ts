// ---------------------------------------------------------------------------
// فرایند امضای صورتجلسه (میزیتو): قاعده‌ی قابل تنظیم، پیش‌فرض اکثریت حاضران (نصف + ۱).
// امضاکنندگان = حاضرانِ عضو سازمان (مدعو بیرونی حساب ندارد)؛ «مشخص» = فهرست انتخاب‌شده.
// ---------------------------------------------------------------------------
import type { MeetingParticipant, SignRule } from "./types";

type M = { participants: MeetingParticipant[]; sign_rule: SignRule };

export const DEFAULT_SIGN_RULE: SignRule = { mode: "majority" };

/** کسانی که امضایشان شمرده می‌شود */
export function signersOf(m: M): MeetingParticipant[] {
  if (m.sign_rule.mode === "named") return m.participants.filter((x) => m.sign_rule.signer_ids?.includes(x.id));
  return m.participants.filter((x) => x.attendance === "present" && !!x.principal_id);
}
/** تعداد امضای لازم */
export function neededSignatures(m: M): number {
  const n = signersOf(m).length;
  if (m.sign_rule.mode === "majority") return n ? Math.floor(n / 2) + 1 : 0;
  return n;
}
export const signedCount = (m: M) => signersOf(m).filter((x) => x.signature?.state === "signed").length;
export const isFullySigned = (m: M) => neededSignatures(m) > 0 && signedCount(m) >= neededSignatures(m);
export const canSign = (m: M, principalId: string) => signersOf(m).some((x) => x.principal_id === principalId && x.signature?.state !== "signed");
