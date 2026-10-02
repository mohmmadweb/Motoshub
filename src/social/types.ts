// ---------------------------------------------------------------------------
// مدل داده‌ی «شبکه اجتماعی» — دقیقاً مطابق Motoshub Social API
// (https://social.shub.ir/api/docs/ · OpenAPI 3.0.3 · v1.0.0).
// نام فیلدها همان نام‌های API است (snake_case) تا اتصال به بک‌اند یک‌به‌یک باشد.
// تاریخ‌ها مثل API به شکل «۱۴۰۵/۰۶/۳۱ ۱۱:۱۲:۵۱» (شمسی) نگه‌داری می‌شوند.
// ---------------------------------------------------------------------------

/** Privacy5eeEnum / Privacy9f4Enum */
export type Privacy = "ME" | "FRIENDS" | "EVERYONE";

/** entity_name در /core/categories/{entity_name}/ ، /core/comments/{entity_name}/ و /core/reactions/{entity_name}/ */
export type EntityName = "blog" | "news" | "magazine" | "media" | "event" | "topic" | "post" | "channel" | "group";

/** کلید ماژول‌های محتوایی: /content/blogs ، /content/news ، /content/magazines */
export type ContentKind = "blogs" | "news" | "magazines";

export type Attachment = { id: string; name: string; size: string; mime: string };

/** Category */
export type Category = { id: string; title: string; entity_name: EntityName; parent_id: string | null; created_at: string; updated_at: string };

/** Tag */
export type Tag = { id: string; name: string; created_at: string; updated_at: string };

/** Comment — با تأیید مدیر (approve) */
export type Comment = {
  id: string;
  user_id: string;
  entity_name: EntityName;
  entity_id: string;
  content: string;
  parent_id: string | null;
  level: number;
  approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  /** «پیشنهادی» — پنهان‌شده توسط ناظر پس از گزارش تخلف */
  moderation?: Moderation | null;
};

/** AllowedReaction */
export type AllowedReaction = { id: string; code: string; emoji: string; is_active: boolean };

/** واکنش ثبت‌شده (ReactionToggleRequest: entity_id, reaction_code) */
export type ReactionRecord = { entity_name: EntityName; entity_id: string; user_id: string; reaction_code: string };

/** فیلدهای مشترک همه‌ی موجودیت‌های قابل انتشار */
/** واحد سازمانیِ مالکِ محتوا (لایه‌ی پیاز) — مستقل از privacy */
export type OrgScoped = import("../data/tenancy").Scoped;

export type Publishable = OrgScoped & {
  id: string;
  user_id: string;
  is_active: boolean;
  /** منتشرشده (POST …/publish/ ← true ، …/unpublish/ ← false) */
  is_public: boolean;
  is_draft: boolean;
  privacy: Privacy;
  category_ids: string[];
  /** نام برچسب‌ها — مثل TagStoreRequest */
  tags: string[];
  attachments: Attachment[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** «پیشنهادی» — پنهان‌شده توسط ناظر پس از گزارش تخلف (برای دیگران دیده نمی‌شود) */
  moderation?: Moderation | null;
};

/** BlogDetail / NewsDetail / MagazineDetail */
export type ContentItem = Publishable & {
  kind: ContentKind;
  title: string;
  excerpt: string;
  content: string;
  /** پوستر — در پروتوتایپ یک رنگ/تصویر */
  poster: string | null;
  add_comment: boolean;
  show_comment: boolean;
  /** فقط پروتوتایپ — شمارنده‌ی بازدید */
  views: number;
  /** «پیشنهادی» — اطلاعیه‌ی رسمی با تأیید خواندن (در API فعلی نیست) */
  announcement?: Announcement | null;
  /** «پیشنهادی» — قالب متن: markdown (ویرایشگر غنی) یا plain (متن ساده‌ی قدیمی؛ پیش‌فرض) */
  content_format?: "markdown" | "plain";
  /** «پیشنهادی» — بازبینی پیش از انتشار */
  review?: ContentReview | null;
};

/** «پیشنهادی» — وضعیت بازبینی پیش از انتشار: draft ← pending («در انتظار بازبینی») ← published / returned */
export type ReviewStatus = "pending" | "returned" | "approved";
export type ReviewEvent = { action: "submit" | "approve" | "return"; by: string; at: string; note?: string };
export type ContentReview = { status: ReviewStatus; submitted_by: string; submitted_at: string; reviewed_by?: string | null; reviewed_at?: string | null; note?: string | null; history: ReviewEvent[] };
export const reviewStatusLabel: Record<ReviewStatus, string> = { pending: "در انتظار بازبینی", returned: "برگشت برای اصلاح", approved: "تأییدشده" };

/** «پیشنهادی» — پنهان‌سازی توسط ناظر */
export type Moderation = { hidden: boolean; by: string; at: string; reason: string; report_id?: string };

/** «پیشنهادی» — گزارش تخلف (محتوا، نظر، پیام، رسانه) */
export type ReportTargetType = "content" | "comment" | "message" | "media";
export type ReportReason = "spam" | "offensive" | "harassment" | "misinformation" | "privacy" | "copyright" | "other";
export type ReportStatus = "open" | "dismissed" | "hidden" | "removed";
export type AbuseReport = {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  /** برای نظر: موجودیتِ والد؛ برای پیام: گفتگو */
  parent_ref?: string | null;
  target_owner_id: string;
  /** خلاصه‌ی متن/عنوان در لحظه‌ی گزارش (پس از حذف هم در صف می‌ماند) */
  target_excerpt: string;
  reporter_id: string;
  reason: ReportReason;
  note: string;
  status: ReportStatus;
  created_at: string;
  resolved_by?: string | null;
  resolved_at?: string | null;
  resolution_note?: string | null;
};
export const reportReasonLabel: Record<ReportReason, string> = {
  spam: "هرزنامه یا تبلیغ",
  offensive: "توهین‌آمیز یا نامناسب",
  harassment: "آزار یا تهدید",
  misinformation: "اطلاعات نادرست",
  privacy: "نقض حریم خصوصی",
  copyright: "نقض حق نشر",
  other: "سایر",
};
export const reportTargetLabel: Record<ReportTargetType, string> = { content: "محتوا", comment: "نظر", message: "پیام", media: "رسانه" };
export const reportStatusLabel: Record<ReportStatus, string> = { open: "باز", dismissed: "ردشده", hidden: "پنهان‌شده", removed: "حذف و اخطار" };

/** «پیشنهادی» — رویداد نظارت و بازبینی (قابل خواندن در لاگ ممیزی یکپارچه) */
export type ModerationAction = "report" | "dismiss" | "hide" | "unhide" | "remove_warn" | "review_submit" | "review_approve" | "review_return";
export type ModerationEvent = { id: string; at: string; actor_id: string; action: ModerationAction; target_type: ReportTargetType; target_id: string; target_title: string; owner_id: string; note?: string; report_id?: string };
export const moderationActionLabel: Record<ModerationAction, string> = {
  report: "گزارش تخلف",
  dismiss: "رد گزارش تخلف",
  hide: "پنهان‌سازی محتوا",
  unhide: "نمایش دوباره‌ی محتوا",
  remove_warn: "حذف و اخطار",
  review_submit: "ارسال برای بازبینی",
  review_approve: "تأیید و انتشار پس از بازبینی",
  review_return: "برگشت با یادداشت",
};

/** «پیشنهادی» — بازدید ثبت‌شده‌ی هر کاربر (آمار آیتم) */
export type ViewRecord = { entity: "content" | "media"; id: string; user_id: string; at: string };

/** «پیشنهادی» — اطلاعیه‌ی رسمی (must-read) روی خبر */
export type Announcement = {
  /** نیاز به «خواندم و پذیرفتم» */
  requires_ack: boolean;
  /** سنجاق در میز کار تا این تاریخ (شمسی) — null یعنی بدون سنجاق */
  pin_until: string | null;
  /** شناسه‌ی کاربر ← زمان تأیید خواندن */
  acks: Record<string, string>;
  /** آخرین یادآوری به نخوانده‌ها */
  last_reminder_at?: string | null;
};

/** PostTypeEnum */
export type MediaPostType = "image" | "video" | "album";
/** MediaPostDetail */
export type MediaPost = Publishable & {
  caption: string;
  post_type: MediaPostType;
  poster: string | null;
  add_comment: boolean;
  show_comment: boolean;
};

/** EventMemberStatusEnum / MemberTypeEnum */
export type EventMemberStatus = "invited" | "accepted" | "declined" | "joined";
export type MemberType = "owner" | "member" | "organizer";
export type EventMember = { id: string; event_id: string; user_id: string; status: EventMemberStatus; member_type: MemberType; created_at: string; updated_at: string };

/** EventDetail */
export type SocialEvent = Publishable & {
  title: string;
  description: string;
  poster: string | null;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  is_online: boolean;
  meeting_link: string;
  location: string;
  capacity: number;
  add_comment: boolean;
  show_comment: boolean;
  is_repeat: boolean;
  /** روزهای تکرار هفته (۰ = شنبه … ۶ = جمعه) */
  repeat_days: number[];
  google_calendar_event_id?: string;
};

/** TopicDetail — پرسش و پاسخ */
export type Topic = Publishable & {
  title: string;
  content: string;
  view_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  /** «پیشنهادی» — رأی کاربران: شناسه‌ی کاربر ← ۱ یا ‎-۱ */
  votes?: Record<string, Vote>;
  /** «پیشنهادی» — پاسخ پذیرفته‌شده (صاحب پرسش یا ناظر) */
  accepted_post_id?: string | null;
  /** «پیشنهادی» — پرسش تکراریِ این پرسش (پرسش قفل و به مقصد پیوند می‌شود) */
  duplicate_of?: string | null;
};

/** «پیشنهادی» — رأی بالا/پایین */
export type Vote = 1 | -1;

/** PostDetail — پاسخ در پرسش و پاسخ (parent_id برای پاسخِ تو در تو) */
export type ForumPost = {
  id: string;
  topic_id: string;
  parent_id: string | null;
  user_id: string;
  content: string;
  attachments: Attachment[];
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** «پیشنهادی» — رأی کاربران روی پاسخ */
  votes?: Record<string, Vote>;
};

/** ChatTypeEnum */
export type ChatType = "saved_messages" | "direct_message" | "group" | "channel" | "bot";
/** RoleEnum */
export type ChatRole = "admin" | "member";
export type ChatMember = { user_id: string; role: ChatRole; joined_at: string };

/** ChatDetail */
export type Chat = {
  id: string;
  chat_type: ChatType;
  title: string;
  description: string;
  slug: string;
  /** زیرکانال (sub-channels) یا تاپیک گروه (topics) */
  parent: string | null;
  is_private: boolean;
  is_public: boolean;
  owner_id: string;
  members: ChatMember[];
  /** برای پیام مستقیم: طرف مقابل */
  receiver: string | null;
  category_ids: string[];
  tags: string[];
  /** عکس پروفایل و دیوار — در پروتوتایپ رنگ */
  profile_photos: string[];
  wall_photo: string | null;
  /** PATCH …/mute/ — برای هر کاربر جدا */
  muted_by: string[];
  /** POST …/mark-read/ — آخرین پیام خوانده‌شده‌ی هر کاربر */
  last_read: Record<string, number>;
  /** «پیشنهادی» — پیام‌های سنجاق‌شده (حداکثر ۵) */
  pinned_message_ids?: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/** TypeEnum */
export type MessageType = "text" | "sticker";
/** Message (MessageStoreRequest: content, type, parent_message_id, uploaded_files, tags) */
export type Message = {
  id: string;
  chat_id: string;
  user_id: string;
  content: string;
  type: MessageType;
  parent_message_id: string | null;
  attachments: Attachment[];
  tags: string[];
  /** POST /messages/{id}/forward/ */
  forwarded_from: { chat_id: string; user_id: string } | null;
  seq: number;
  created_at: string;
  updated_at: string;
  edited: boolean;
  /** «پیشنهادی» — واکنش اموجی روی پیام: reaction_code ← شناسه‌ی کاربران */
  reactions?: Record<string, string[]>;
  /** «پیشنهادی» — پاسخ در رشته (thread): ریشه = parent_message_id و پیام در جریان اصلی نمی‌آید */
  in_thread?: boolean;
  /** «پیشنهادی» — پنهان‌شده توسط ناظر */
  moderation?: Moderation | null;
};

/** دوستی (relations/friendships) */
export type FriendshipStatus = "pending" | "accepted" | "declined" | "blocked";
export type Friendship = { id: string; sender_id: string; receiver_id: string; status: FriendshipStatus; blocked_by: string | null; created_at: string; updated_at: string };

/** OwnerTypeEnum — مدیر فایل: کاربر، گروه یا کانال */
export type OwnerType = "user" | "group" | "channel";
/** FileManagerFolder */
export type FileFolder = { id: string; owner_type: OwnerType; owner_id: string; name: string; parent_id: string | null; created_by_user_id: string; created_at: string; updated_at: string };
export type FileItem = {
  id: string;
  owner_type: OwnerType;
  owner_id: string;
  folder_id: string | null;
  name: string;
  size: string;
  mime: string;
  created_by_user_id: string;
  created_at: string;
  /** «پیشنهادی» — شماره‌ی نسخه‌ی فعلی (پیش‌فرض ۱) */
  version?: number;
  /** «پیشنهادی» — نسخه‌های قبلی */
  versions?: FileVersion[];
  /** «پیشنهادی» — ستاره‌دار برای این کاربران */
  starred_by?: string[];
  /** «پیشنهادی» — آخرین باز کردن هر کاربر (برای «اخیر») */
  opened_at?: Record<string, string>;
  /** «پیشنهادی» — لینک اشتراک با انقضا */
  share?: FileShare | null;
};
/** «پیشنهادی» — یک نسخه‌ی قبلی فایل */
export type FileVersion = { id: string; version: number; size: string; created_at: string; created_by_user_id: string };
/** «پیشنهادی» — لینک اشتراک */
export type FileShare = { token: string; expires_on: string; created_by: string; created_at: string; allow_download: boolean; /** «پیشنهادی» — اشتراک با افراد مشخص (در «اشتراک‌گذاشته با من» آن‌ها) */ shared_with?: string[] };
/** «پیشنهادی» — رویداد فعالیت فایل */
export type FileEventAction = "upload" | "version" | "restore_version" | "rename" | "share" | "unshare" | "download" | "delete" | "restore" | "purge";
export type FileEvent = { id: string; file_id: string; file_name: string; user_id: string; action: FileEventAction; at: string; detail?: string };
export const fileEventLabel: Record<FileEventAction, string> = {
  upload: "بارگذاری",
  version: "نسخه‌ی جدید",
  restore_version: "بازگردانی نسخه",
  rename: "تغییر نام",
  share: "اشتراک‌گذاری",
  unshare: "لغو اشتراک",
  download: "دریافت",
  delete: "انتقال به سطل",
  restore: "بازگردانی از سطل",
  purge: "حذف دائم",
};
/** «پیشنهادی» — فایل در سطل بازیافت (۳۰ روز قابل بازگردانی) */
export type TrashedFile = FileItem & { trashed_at: string; trashed_by: string };

/** ValueTypeEnum + SettingDetail */
export type ValueType = "str" | "int" | "float" | "bool" | "json";
export type Setting = { id: string; app_name: string; scope: string; key: string; value: string | number | boolean; value_type: ValueType; label: string; updated_at: string };

/** DashboardStats */
export type DashboardStat = { title: string; value: number; key: string };

/** ماژول‌هایی که endpoint داشبورد admin/user دارند */
export type SocialModule = "content" | "events" | "forums" | "media" | "messaging" | "relations";

export const privacyLabel: Record<Privacy, string> = { ME: "فقط خودم", FRIENDS: "دوستان", EVERYONE: "همه" };
export const contentKindLabel: Record<ContentKind, string> = { blogs: "بلاگ", news: "خبر", magazines: "مجله" };
export const contentEntity: Record<ContentKind, EntityName> = { blogs: "blog", news: "news", magazines: "magazine" };
export const chatTypeLabel: Record<ChatType, string> = { saved_messages: "پیام‌های ذخیره‌شده", direct_message: "پیام مستقیم", group: "گروه", channel: "کانال", bot: "بات" };
export const eventStatusLabel: Record<EventMemberStatus, string> = { invited: "دعوت‌شده", accepted: "می‌آیم", declined: "نمی‌آیم", joined: "عضو شده" };
export const memberTypeLabel: Record<MemberType, string> = { owner: "برگزارکننده‌ی اصلی", organizer: "هماهنگ‌کننده", member: "شرکت‌کننده" };
export const mediaTypeLabel: Record<MediaPostType, string> = { image: "تصویر", video: "ویدیو", album: "آلبوم" };
export const entityLabel: Record<EntityName, string> = { blog: "بلاگ", news: "اخبار", magazine: "مجلات", media: "رسانه", event: "رویدادها", topic: "پرسش و پاسخ", post: "پاسخ‌ها", channel: "کانال‌ها", group: "گروه‌ها" };
