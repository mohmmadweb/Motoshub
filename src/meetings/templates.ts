// ---------------------------------------------------------------------------
// الگوهای صورتجلسه (میزیتو «تعریف الگو جهت سهولت در تعریف پارامترهای اصلی صورتجلسات و اعضای جلسه»):
// فقط مشخصات جلسه و اعضا ذخیره می‌شود؛ ساخت الگو با مدیران سامانه/پروژه.
// ---------------------------------------------------------------------------
import type { MeetingParticipant, MeetingTemplate } from "./types";
import { DEFAULT_SIGN_RULE } from "./signature";

export const seedMeetingTemplates = (): MeetingTemplate[] => [
  {
    id: "mtpl1",
    name: "کمیته‌ی راهبری ماهانه",
    title_pattern: "کمیته‌ی راهبری — {ماه}",
    kind: "organizational",
    meeting_type: 1,
    duration_minutes: 90,
    location: "سالن جلسات طبقه‌ی سوم",
    agenda: ["گزارش پیشرفت پروژه‌ها", "تصمیم‌های بودجه‌ای", "پیگیری مصوبات جلسه‌ی قبل"],
    participants: [
      { principal_id: "u1", name: "پایگاه اطلاع‌رسانی بنیاد", role: "chair" },
      { principal_id: "u4", name: "وحید خاوئی", role: "secretary" },
      { principal_id: "u5", name: "محسن مردعلی", role: "member" },
      { principal_id: "u2", name: "حسین دهقان", role: "member" },
    ],
    reminder: { enabled: true, minutes_before: 60 },
    sign_rule: { ...DEFAULT_SIGN_RULE },
    created_by: "پایگاه اطلاع‌رسانی بنیاد",
  },
];

const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
/** عنوان از الگو: {ماه} و {تاریخ} جایگزین می‌شوند */
export function titleFromPattern(pattern: string, jalaliDate: string): string {
  const m = Number(jalaliDate.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).split("/")[1] ?? 0);
  return pattern.replace("{ماه}", MONTHS[m - 1] ?? "").replace("{تاریخ}", jalaliDate);
}

export const participantsFromTemplate = (t: MeetingTemplate, seq: () => string): MeetingParticipant[] => t.participants.map((p) => ({ ...p, id: seq(), attendance: "unknown" }));
