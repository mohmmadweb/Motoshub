// داده‌ی نمونه‌ی صورتجلسه‌های سازمانی (پیشنهادی `/workspace/meetings/`)
import { isoDate } from "../pm/api";
import { DEFAULT_SIGN_RULE } from "./signature";
import type { MeetingParticipant, OrgMeeting } from "./types";

const P = (id: string, principal: string | null, name: string, role: MeetingParticipant["role"], attendance: MeetingParticipant["attendance"], extra: Partial<MeetingParticipant> = {}): MeetingParticipant => ({ id, principal_id: principal, name, role, attendance, ...extra });
const at = (d: string, t = "09:00") => `${isoDate(d)}T${t}:00Z`;

export function seedOrgMeetings(): OrgMeeting[] {
  const base = (x: Partial<OrgMeeting> & Pick<OrgMeeting, "id" | "title" | "meeting_date" | "meeting_time">): OrgMeeting => ({
    project: null,
    duration_minutes: 60,
    meeting_type: 1,
    status: 1,
    description: "",
    meeting_link: null,
    topics_discussed: [],
    decisions: [],
    attendees: [],
    tasks: [],
    resolution_count: 0,
    follow_up_count: 0,
    created_at: `${x.meeting_date}T08:00:00Z`,
    updated_at: `${x.meeting_date}T08:00:00Z`,
    kind: "organizational",
    location: "",
    labels: [],
    template_id: null,
    participants: [],
    minutes_status: "draft",
    sign_rule: { ...DEFAULT_SIGN_RULE },
    sms_log: [],
    reminder: { enabled: true, minutes_before: 60 },
    agenda: [],
    minutes_text: "",
    resolutions: [],
    organizer: "پایگاه اطلاع‌رسانی بنیاد",
    project_ref: null,
    ...x,
  });
  return [
    base({
      id: 9001,
      title: "کمیته‌ی راهبری تحول دیجیتال — خرداد",
      meeting_date: isoDate("۱۴۰۵/۰۳/۰۵")!,
      meeting_time: "10:00",
      duration_minutes: 90,
      status: 2,
      location: "سالن جلسات طبقه‌ی سوم",
      labels: ["کمیته‌ی راهبری"],
      template_id: "mtpl1",
      description: "مرور پیشرفت پروژه‌های تحول دیجیتال و تصمیم درباره‌ی بودجه‌ی فاز دوم.",
      agenda: ["گزارش پیشرفت پروژه‌ها", "تصمیم‌های بودجه‌ای", "پیگیری مصوبات جلسه‌ی قبل"],
      participants: [
        P("pa1", "u1", "پایگاه اطلاع‌رسانی بنیاد", "chair", "present", { signature: { state: "pending" } }),
        P("pa2", "u4", "وحید خاوئی", "secretary", "present", { signature: { state: "signed", at: at("۱۴۰۵/۰۳/۰۶", "11:20") } }),
        P("pa3", "u5", "محسن مردعلی", "member", "present", { signature: { state: "signed", at: at("۱۴۰۵/۰۳/۰۶", "12:05") } }),
        P("pa4", "u2", "حسین دهقان", "member", "present", { signature: { state: "pending" } }),
        P("pa5", "u3", "محمد سعیدی‌کیا", "member", "present", { signature: { state: "pending" } }),
        P("pa6", "u12", "دکتر یاسمن روشن", "member", "absent", { absence_reason: "مأموریت" }),
        P("pa7", null, "مهندس رضا کاظمی", "guest", "present", { external_name: "مهندس رضا کاظمی", external_mobile: "09121234567" }),
      ],
      minutes_status: "awaiting_signature",
      minutes_text: "۱. گزارش پیشرفت دو پروژه‌ی فعال ارائه شد؛ پروژه‌ی قلعه‌گنج طبق برنامه است.\n۲. بودجه‌ی فاز دوم سامانه‌ی مدیریت دانش با ۱۰٪ کاهش تصویب شد.\n۳. مقرر شد گزارش ماهانه‌ی پیشرفت به‌صورت یکسان برای همه‌ی پروژه‌ها تهیه شود.",
      decisions: ["تصویب بودجه‌ی فاز دوم با ۱۰٪ کاهش", "قالب یکسان گزارش ماهانه"],
      resolutions: [
        { id: "rs1", description: "تهیه‌ی قالب یکسان گزارش ماهانه‌ی پیشرفت پروژه‌ها", assignee: "وحید خاوئی", due_date: isoDate("۱۴۰۵/۰۳/۱۵"), project: "pr1", linked_task: null },
        { id: "rs2", description: "اصلاح برنامه‌ی بودجه‌ی فاز دوم سامانه‌ی دانش", assignee: "محسن مردعلی", due_date: isoDate("۱۴۰۵/۰۳/۲۰"), project: "pr1", linked_task: null },
      ],
      sms_log: [
        { id: "sm1", kind: "invite", at: at("۱۴۰۵/۰۲/۳۰", "09:00"), recipients: ["وحید خاوئی", "محسن مردعلی", "حسین دهقان", "محمد سعیدی‌کیا", "دکتر یاسمن روشن", "مهندس رضا کاظمی (09121234567)"], text: "دعوت به جلسه‌ی «کمیته‌ی راهبری تحول دیجیتال — خرداد» — ۱۴۰۵/۰۳/۰۵ ساعت ۱۰:۰۰، سالن جلسات طبقه‌ی سوم. کاریز", by: "وحید خاوئی" },
        { id: "sm2", kind: "sign_request", at: at("۱۴۰۵/۰۳/۰۶", "10:00"), recipients: ["پایگاه اطلاع‌رسانی بنیاد", "وحید خاوئی", "محسن مردعلی", "حسین دهقان", "محمد سعیدی‌کیا"], text: "صورتجلسه‌ی «کمیته‌ی راهبری تحول دیجیتال — خرداد» آماده‌ی امضای شماست؛ در کاریز امضا کنید.", by: "وحید خاوئی" },
      ],
    }),
    base({
      id: 9002,
      title: "جلسه‌ی هماهنگی تحویل مدارس قلعه‌گنج",
      meeting_date: isoDate("۱۴۰۵/۰۳/۱۲")!,
      meeting_time: "09:30",
      meeting_type: 2,
      meeting_link: "https://meet.shub.ir/QGJ-org-9002",
      project: 1,
      project_ref: "pr1",
      organizer: "محسن مردعلی",
      labels: ["عمرانی"],
      agenda: ["وضعیت ساخت مدارس", "برنامه‌ی بازدید نظارتی", "هماهنگی با آموزش‌وپرورش"],
      participants: [
        P("pb1", "u5", "محسن مردعلی", "chair", "unknown"),
        P("pb2", "u4", "وحید خاوئی", "secretary", "unknown"),
        P("pb3", "u1", "پایگاه اطلاع‌رسانی بنیاد", "member", "unknown"),
        P("pb4", null, "نماینده‌ی آموزش‌وپرورش", "guest", "unknown", { external_name: "نماینده‌ی آموزش‌وپرورش", external_mobile: "09171112233" }),
      ],
      minutes_status: "forming",
      sms_log: [{ id: "sm3", kind: "invite", at: at("۱۴۰۵/۰۳/۰۷", "15:00"), recipients: ["وحید خاوئی", "پایگاه اطلاع‌رسانی بنیاد", "نماینده‌ی آموزش‌وپرورش (09171112233)"], text: "دعوت به جلسه‌ی «جلسه‌ی هماهنگی تحویل مدارس قلعه‌گنج» — ۱۴۰۵/۰۳/۱۲ ساعت ۰۹:۳۰، برخط. کاریز", by: "محسن مردعلی" }],
    }),
    base({
      id: 9003,
      title: "شورای فناوری اطلاعات",
      meeting_date: isoDate("۱۴۰۵/۰۳/۱۸")!,
      meeting_time: "11:00",
      location: "اتاق جلسات معاونت",
      kind: "simple",
      participants: [P("pc1", "u1", "پایگاه اطلاع‌رسانی بنیاد", "chair", "unknown"), P("pc2", "u3", "محمد سعیدی‌کیا", "member", "unknown"), P("pc3", "u2", "حسین دهقان", "member", "unknown")],
      agenda: ["امنیت سامانه‌ها", "برنامه‌ی پشتیبان‌گیری"],
    }),
  ];
}
