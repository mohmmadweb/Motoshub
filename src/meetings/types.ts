// ---------------------------------------------------------------------------
// جلسه و صورتجلسه (DATA_ALIGNMENT §3) — یک موجودیت مثل API واقعی (`Meetings` + `MeetingActionItem`).
//   - MeetingApi       دقیقاً مطابق سریالایزر workspace `projects/{project_id}/meetings/`
//   - MeetingProposed  «پیشنهادی» (میزیتو «صورتجلسه سازمانی»): نوع، محل، نقش‌ها، حضور و غیاب،
//                      وضعیت صورتجلسه، قاعده‌ی امضا، پیامک، الگو — `/workspace/meetings/` (project = null)
// تاریخ‌ها در انبار ISO میلادی‌اند و فقط هنگام نمایش شمسی می‌شوند.
// ---------------------------------------------------------------------------
import type { Ep } from "../api/envelopes";

/** meeting_type: ۱ حضوری (In Person) · ۲ برخط (Video) */
export type MeetingTypeCode = 1 | 2;
/** status: ۱ برنامه‌ریزی‌شده · ۲ برگزارشده · ۳ لغوشده */
export type MeetingStatusCode = 1 | 2 | 3;
export const meetingStatusLabel: Record<MeetingStatusCode, string> = { 1: "برنامه‌ریزی‌شده", 2: "برگزارشده", 3: "لغوشده" };
export const meetingTypeLabel: Record<MeetingTypeCode, string> = { 1: "حضوری", 2: "برخط" };

export type ParticipantRole = "chair" | "secretary" | "member" | "guest";
export const roleLabel: Record<ParticipantRole, string> = { chair: "رئیس جلسه", secretary: "دبیر جلسه", member: "عضو", guest: "مدعو" };
export type Attendance = "present" | "absent" | "unknown";
export const attendanceLabel: Record<Attendance, string> = { present: "حاضر", absent: "غایب", unknown: "نامشخص" };
export type SignatureState = "pending" | "signed" | "rejected";

export type MeetingParticipant = {
  id: string;
  /** عضو سازمان (شناسه‌ی کاربر)؛ null برای مدعو بیرونی */
  principal_id: string | null;
  /** نام نمایشی (عضو) */
  name: string;
  /** مدعو بیرونی: نام و موبایل */
  external_name?: string;
  external_mobile?: string;
  role: ParticipantRole;
  attendance: Attendance;
  absence_reason?: string;
  signature?: { state: SignatureState; at?: string; note?: string };
};

export type MinutesStatus = "draft" | "forming" | "awaiting_signature" | "signed";
export const minutesStatusLabel: Record<MinutesStatus, string> = { draft: "پیش‌نویس", forming: "در حال تشکیل جلسه", awaiting_signature: "در انتظار امضا", signed: "امضاشده" };
export type SignRule = { mode: "majority" | "all" | "named"; signer_ids?: string[] };
export const signRuleLabel: Record<SignRule["mode"], string> = { majority: "اکثریت حاضران (نصف + ۱)", all: "همه‌ی حاضران", named: "امضاکنندگان مشخص" };

export type SmsKind = "invite" | "reminder" | "changed" | "cancel" | "sign_request" | "custom";
export const smsKindLabel: Record<SmsKind, string> = { invite: "دعوت‌نامه", reminder: "یادآوری", changed: "تغییر زمان/محل", cancel: "لغو جلسه", sign_request: "درخواست امضا", custom: "پیامک دلخواه" };
export type SmsLogEntry = { id: string; kind: SmsKind; at: string; recipients: string[]; text: string; by: string };

/** مصوبه (MeetingActionItem) — به کار تبدیل می‌شود و پیگیری از وضعیت همان کار است */
export type MeetingResolution = {
  id: string;
  description: string;
  /** نام مسئول */
  assignee: string;
  /** ISO */
  due_date: string | null;
  /** پروژه‌ی مقصد کار (شناسه‌ی دمو) */
  project: string | null;
  /** کار ساخته‌شده (شناسه‌ی دمو) */
  linked_task: string | null;
};

/** دقیقاً مطابق سریالایزر Meetings */
export type MeetingApi = {
  id: number;
  project: number | null;
  title: string;
  meeting_date: string;
  meeting_time: string;
  duration_minutes: number;
  meeting_type: MeetingTypeCode;
  status: MeetingStatusCode;
  description: string;
  meeting_link: string | null;
  topics_discussed: string[];
  decisions: string[];
  attendees: string[];
  tasks: number[];
  resolution_count: number;
  follow_up_count: number;
  created_at: string;
  updated_at: string;
};

/** «پیشنهادی» */
export type MeetingProposed = {
  kind: "simple" | "organizational";
  location: string;
  labels: string[];
  template_id: string | null;
  participants: MeetingParticipant[];
  minutes_status: MinutesStatus;
  sign_rule: SignRule;
  sms_log: SmsLogEntry[];
  reminder: { enabled: boolean; minutes_before: number };
  agenda: string[];
  /** متن صورتجلسه */
  minutes_text: string;
  resolutions: MeetingResolution[];
  /** برگزارکننده (نام) */
  organizer: string;
  /** پروژه‌ی مرتبط در دمو (صورتجلسه‌ی سازمانی پروژه) */
  project_ref: string | null;
};

/** صورتجلسه‌ی سازمانی در انبار */
export type OrgMeeting = MeetingApi & MeetingProposed;

/** لایه‌ی سازمانی روی جلسه‌ی پروژه (نقش‌ها، حضور، امضا، پیامک) — کلید `${pid}:${mid}` */
export type MeetingOverlay = Pick<MeetingProposed, "kind" | "location" | "labels" | "participants" | "minutes_status" | "sign_rule" | "sms_log" | "reminder">;

/** الگوی صورتجلسه (میزیتو: فقط «مشخصات جلسه» + «اعضا») */
export type MeetingTemplate = {
  id: string;
  name: string;
  title_pattern: string;
  kind: MeetingProposed["kind"];
  meeting_type: MeetingTypeCode;
  duration_minutes: number;
  location: string;
  agenda: string[];
  participants: Pick<MeetingParticipant, "principal_id" | "name" | "external_name" | "external_mobile" | "role">[];
  reminder: MeetingProposed["reminder"];
  sign_rule: SignRule;
  created_by: string;
};

/** مدل یکپارچه‌ی نمایش (جلسه‌ی پروژه یا سازمانی) */
export type ResolutionView = MeetingResolution & { due: string; task_status: string | null; done: boolean };
export type MeetingView = {
  route_id: string;
  source: "org" | "project";
  /** جلسه‌ی پروژه: شناسه‌ی پروژه و جلسه در ProjectsContext */
  pid: string | null;
  mid: string;
  minute_id: string | null;
  project_name: string | null;
  title: string;
  /** تاریخ شمسی نمایشی */
  date: string;
  time: string;
  duration: number;
  meeting_type: MeetingTypeCode;
  link: string | null;
  location: string;
  description: string;
  status: MeetingStatusCode;
  organizer: string;
  agenda: string[];
  minutes_text: string;
  decisions: string[];
  resolutions: ResolutionView[];
  files: { id: string; name: string }[];
  kind: MeetingProposed["kind"];
  labels: string[];
  participants: MeetingParticipant[];
  minutes_status: MinutesStatus;
  sign_rule: SignRule;
  sms_log: SmsLogEntry[];
  reminder: MeetingProposed["reminder"];
  /** شکل API همین جلسه */
  api: MeetingApi;
};

export const routeIdOf = (source: "org" | "project", id: string, pid?: string | null) => (source === "org" ? `o~${id}` : `p~${pid}~${id}`);
export const meetingHref = (v: Pick<MeetingView, "route_id">) => `/meetings/${encodeURIComponent(v.route_id)}`;

const W = "/api/v1/workspace";
const e = (method: Ep["method"], path: string, proposed = false): Ep => ({ method, path: `${W}${path}`, proposed });
export const meetingEndpoints = {
  projectMeetings: e("GET", "/projects/{project_id}/meetings/"),
  recordMinutes: e("POST", "/projects/{project_id}/meetings/{id}/record-minutes/"),
  actionItems: e("GET", "/projects/{project_id}/meetings/{id}/action-items/"),
  convertToTask: e("POST", "/projects/{project_id}/meetings/{id}/action-items/{item_id}/convert-to-task/"),
  orgMeetings: e("GET", "/meetings/?project=&minutes_status=", true),
  participants: e("PUT", "/meetings/{id}/participants/", true),
  sendForSignature: e("POST", "/meetings/{id}/send-for-signature/", true),
  sign: e("POST", "/meetings/{id}/sign/", true),
  sms: e("POST", "/meetings/{id}/sms/", true),
  templates: e("GET", "/meeting-templates/", true),
} satisfies Record<string, Ep>;
