// ---------------------------------------------------------------------------
// پیامک جلسه (شبیه‌سازی‌شده؛ ارسال واقعی از تأمین‌کننده‌ی پیامک سامانه — «تنظیمات پیامک»).
// هر ارسال در sms_log جلسه ثبت می‌شود.
// ---------------------------------------------------------------------------
import type { MeetingParticipant, SmsKind } from "./types";

type M = { title: string; date: string; time: string; location: string; meeting_type: 1 | 2; link: string | null };

export function smsText(kind: SmsKind, m: M): string {
  const where = m.meeting_type === 2 ? `برخط${m.link ? ` (${m.link})` : ""}` : m.location || "محل اعلام می‌شود";
  switch (kind) {
    case "invite":
      return `دعوت به جلسه‌ی «${m.title}» — ${m.date} ساعت ${m.time}، ${where}. کاریز`;
    case "reminder":
      return `یادآوری: جلسه‌ی «${m.title}» ${m.date} ساعت ${m.time}، ${where}. کاریز`;
    case "changed":
      return `تغییر جلسه‌ی «${m.title}»: زمان جدید ${m.date} ساعت ${m.time}، ${where}. کاریز`;
    case "cancel":
      return `جلسه‌ی «${m.title}» (${m.date} ساعت ${m.time}) لغو شد. کاریز`;
    case "sign_request":
      return `صورتجلسه‌ی «${m.title}» آماده‌ی امضای شماست؛ در کاریز امضا کنید.`;
    default:
      return "";
  }
}

/** گیرندگان پیامک: اعضا (شماره‌ی نمایه) و مدعوان بیرونی (شماره‌ی ثبت‌شده) */
export const smsRecipients = (ps: MeetingParticipant[], onlyPresent = false) => ps.filter((p) => !onlyPresent || p.attendance === "present").map((p) => (p.principal_id ? p.name : `${p.external_name ?? p.name}${p.external_mobile ? ` (${p.external_mobile})` : ""}`));
