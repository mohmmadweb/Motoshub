// ---------------------------------------------------------------------------
// مدل داده‌ی «شبکه اجتماعی» — دقیقاً مطابق Motoshub Social API
// (درگاه Kong: https://api.shub.ir/api/v1/social/… · DATA_ALIGNMENT §1).
// نام فیلدها همان نام‌های API است (snake_case) تا اتصال به بک‌اند یک‌به‌یک باشد.
// شکل دقیق پاسخ‌های API (شناسه‌ی عددی، user تو در تو، is_owner، reaction_counts، …) در
// src/social/api.ts ساخته می‌شود؛ این فایل مدل انبار دمو است و فیلدهای واقعی را هم نگه می‌دارد.
// تاریخ‌ها مثل API به شکل «۱۴۰۵/۰۶/۳۱ ۱۱:۱۲:۵۱» (شمسی) نگه‌داری می‌شوند.
// ---------------------------------------------------------------------------

/** Privacy5eeEnum / Privacy9f4Enum — مقادیری که دمو می‌سازد */
export type Privacy = "ME" | "FRIENDS" | "EVERYONE";
/** enum کامل API: SCOPE = اعضای واحد سازمانی مالک. انبار دمو هنوز SCOPE نمی‌سازد چون گزارش‌ساز (reports/sources.ts، WP4)
 *  نگاشت سه‌مقداری دارد؛ پس از هم‌ترازی آن، Privacy همین نوع می‌شود. */
export type ApiPrivacy = Privacy | "SCOPE";

/** entity_name در /social/categories/{entity_name}/ ، /social/comments/{entity_name}/ و /social/reactions/{entity_name}/
 *  = EntityNameChoices واقعی API؛ post و poll «پیشنهادی» (پاسخ پرسش و نظرسنجی محتوا) */
export type EntityName =
  | "blog"
  | "news"
  | "magazine"
  | "forum"
  | "event"
  | "media"
  | "messaging_chat"
  | "messaging_group"
  | "messaging_channel"
  | "file_manager_folder"
  | "comment"
  | "faq"
  | "post"
  | "poll";
/** نام‌های قدیمی دمو (topic/group/channel) — فقط برای سازگاری فراخوانی‌های قدیمی؛ در انبار به نام واقعی تبدیل می‌شوند */
export type LegacyEntityName = "topic" | "group" | "channel";
const LEGACY_ENTITY: Record<LegacyEntityName, EntityName> = { topic: "forum", group: "messaging_group", channel: "messaging_channel" };
/** نام قدیمی ← نام واقعی EntityNameChoices */
export const normEntity = (e: EntityName | LegacyEntityName | string): EntityName => (e in LEGACY_ENTITY ? LEGACY_ENTITY[e as LegacyEntityName] : (e as EntityName));

/** کلید ماژول‌های محتوایی: /social/blogs ، /social/news ، /social/magazines */
export type ContentKind = "blogs" | "news" | "magazines";

export type Attachment = { id: string; name: string; size: string; mime: string };

/** Category — parent_id ↔ API `parent`؛ user_id و is_active از مدل واقعی */
export type Category = { id: string; title: string; entity_name: EntityName; parent_id: string | null; created_at: string; updated_at: string; user_id?: string; is_active?: boolean };

/** Tag */
export type Tag = { id: string; name: string; created_at: string; updated_at: string; user_id?: string; is_active?: boolean };

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
  /** شمارنده‌ی بازدید (API: view_count) */
  view_count?: number;
  /** @deprecated نام قدیمی دمو برای view_count — همگام نگه داشته می‌شود تا گزارش‌ها کار کنند */
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
  /** شمارنده‌ی بازدید (API: view_count) */
  view_count?: number;
  /** «پیشنهادی» — منبع پست: بارگذاری مستقیم (پیش‌فرض) یا ویدیوی آپارات */
  source?: "upload" | "aparat";
  /** «پیشنهادی» — فراداده‌ی ویدیوی آپارات (وقتی source = aparat) */
  aparat?: AparatVideo | null;
};

/** EventMemberStatusEnum / MemberTypeEnum (مقادیری که دمو می‌سازد) */
export type EventMemberStatus = "invited" | "accepted" | "declined" | "joined";
/** enum کامل API — pending = درخواست عضویت در انتظار تأیید (همان توضیح ApiPrivacy) */
export type ApiEventMemberStatus = EventMemberStatus | "pending";
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
  /** @deprecated متن نشانی دمو — همان address است؛ برای سازگاری صفحه‌های دیگر نگه داشته می‌شود */
  location: string;
  /** API: استان، شهر و نشانی جداگانه (به‌جای location) */
  province_id?: number | null;
  city_id?: number | null;
  address?: string;
  /** API: برگزاری حضوری (is_hybrid = is_online && is_offline محاسبه می‌شود) */
  is_offline?: boolean;
  /** API: پیوستن آزاد بدون دعوت */
  allow_join?: boolean;
  /** API: آخرین یادآوری سرور */
  last_reminded_at?: string | null;
  /** شمارنده‌ی بازدید (API: view_count) */
  view_count?: number;
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
  /** API: زمان آخرین پاسخ (posts_count در api.ts از پاسخ‌ها محاسبه می‌شود) */
  last_reply_at?: string | null;
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
/** ChatMember — فیلدهای واقعی: role، last_read_message_id، is_muted، is_pinned، pinned_at
 *  (دمو هنوز muted_by/last_read روی Chat را هم نگه می‌دارد؛ api.ts از روی آن‌ها این فیلدها را می‌سازد) */
export type ChatMember = { user_id: string; role: ChatRole; joined_at: string; last_read_message_id?: string | null; is_muted?: boolean; is_pinned?: boolean; pinned_at?: string | null };

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

/** TypeEnum — audio = پیام صوتی (گفتگوی دو نفره)، service = رویداد سیستمی، poll، location */
export type MessageType = "text" | "sticker" | "audio" | "service" | "poll" | "location";
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
  /** @deprecated نام دمو برای is_edited */
  edited: boolean;
  /** API */
  is_edited?: boolean;
  message_uid?: string;
  service_event?: "member_joined" | "member_left" | "photo_changed" | "title_changed" | null;
  metadata?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
  published_at?: string | null;
  /** API: مدت پیام صوتی (ثانیه) — فقط برای type = audio */
  audio_duration?: number | null;
  /** «پیشنهادی» — واکنش اموجی روی پیام: reaction_code ← شناسه‌ی کاربران */
  reactions?: Record<string, string[]>;
  /** «پیشنهادی» — پاسخ در رشته (thread): ریشه = parent_message_id و پیام در جریان اصلی نمی‌آید */
  in_thread?: boolean;
  /** «پیشنهادی» — پنهان‌شده توسط ناظر */
  moderation?: Moderation | null;
  /** «پیشنهادی» — نظرسنجیِ پیوست این پیام (/social/polls/{id}/) */
  poll_id?: string | null;
  /** «پیشنهادی» — منشن‌ها با شناسه‌ی کاربر (به‌جای تطبیق نام) */
  mentions?: Mention[];
  /** «پیشنهادی» — فرستنده پیش‌نمایش لینک را حذف کرده است */
  preview_hidden?: boolean;
  /** «پیشنهادی» — پیامی که بات «خبرخوان» از یک خوراک RSS/Atom منتشر کرده */
  feed_item?: { feed_id: string; guid: string; title: string; link: string } | null;
};

/** PinnedMessage (API) — دمو سنجاق‌ها را در Chat.pinned_message_ids نگه می‌دارد؛ api.ts این شکل را می‌سازد */
export type PinnedMessage = { id: string; chat_id: string; message_id: string; user_id: string; is_for_everyone: boolean; created_at: string };

/** «پیشنهادی» — منشن در بدنه‌ی پیام/محتوا */
export type Mention = { user_id: string; offset: number; length: number };
export type FriendshipStatus = "pending" | "accepted" | "declined" | "blocked";
export type Friendship = { id: string; sender_id: string; receiver_id: string; status: FriendshipStatus; blocked_by: string | null; created_at: string; updated_at: string };

/** OwnerTypeEnum — مدیر فایل: کاربر، گروه یا کانال */
export type OwnerType = "user" | "group" | "channel";
/** FileManagerFolder */
export type FileFolder = { id: string; owner_type: OwnerType; owner_id: string; name: string; parent_id: string | null; created_by_user_id: string; created_at: string; updated_at: string; /** API */ is_root?: boolean; /** API: حجم بایت (در api.ts از فایل‌ها جمع زده می‌شود) */ size?: number };
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
/** «پیشنهادی» — لینک اشتراک (الگوی Seafile: انقضا، رمز اختیاری، فقط مشاهده/دریافت) */
export type FileShare = {
  token: string;
  expires_on: string;
  created_by: string;
  created_at: string;
  allow_download: boolean;
  /** «پیشنهادی» — اشتراک با افراد مشخص (در «اشتراک‌گذاشته با من» آن‌ها) */
  shared_with?: string[];
  /** «پیشنهادی» — لینک رمزدار؛ در API فقط password_hash نگه داشته می‌شود — دمو فقط «دارد/ندارد» را نگه می‌دارد */
  has_password?: boolean;
};
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

export const privacyLabel: Record<ApiPrivacy, string> = { ME: "فقط خودم", FRIENDS: "دوستان", EVERYONE: "همه", SCOPE: "اعضای واحد" };
export const contentKindLabel: Record<ContentKind, string> = { blogs: "بلاگ", news: "خبر", magazines: "مجله" };
export const contentEntity: Record<ContentKind, EntityName> = { blogs: "blog", news: "news", magazines: "magazine" };
export const chatTypeLabel: Record<ChatType, string> = { saved_messages: "پیام‌های ذخیره‌شده", direct_message: "پیام مستقیم", group: "گروه", channel: "کانال", bot: "بات" };
export const eventStatusLabel: Record<EventMemberStatus, string> = { invited: "دعوت‌شده", accepted: "می‌آیم", declined: "نمی‌آیم", joined: "عضو شده" };
export const memberTypeLabel: Record<MemberType, string> = { owner: "برگزارکننده‌ی اصلی", organizer: "هماهنگ‌کننده", member: "شرکت‌کننده" };
export const mediaTypeLabel: Record<MediaPostType, string> = { image: "تصویر", video: "ویدیو", album: "آلبوم" };
export const entityLabel: Record<EntityName, string> = {
  blog: "بلاگ",
  news: "اخبار",
  magazine: "مجلات",
  media: "رسانه",
  event: "رویدادها",
  forum: "پرسش و پاسخ",
  post: "پاسخ‌ها",
  messaging_chat: "گفتگوها",
  messaging_channel: "کانال‌ها",
  messaging_group: "گروه‌ها",
  file_manager_folder: "پوشه‌ها",
  comment: "نظرها",
  faq: "سوالات متداول",
  poll: "نظرسنجی‌ها",
};

// ===================================================================== سوالات متداول (/social/faqs/)
/** Faq — فیلدهای واقعی FaqDetailSerializer؛ دسته‌ها از /social/categories/faq/ */
export type Faq = OrgScoped & {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  is_active: boolean;
  is_public: boolean;
  is_draft: boolean;
  published_at: string | null;
  view_count: number;
  /** درخواست: category_ids (پاسخ: categories) */
  category_ids: string[];
  tags: string[];
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};


// ===================================================================== «پیشنهادی» — اقلام باقی‌مانده (F01–F05)
/** F01 — گزینه‌ی نظرسنجی؛ image در پروتوتایپ یک رنگ است */
export type PollOption = { id: string; text: string; image: string | null; votes_count: number };
/** F01 — نظرسنجی (POST /social/polls/) — روی پیام گروه/کانال یا پست عمومی */
export type Poll = {
  id: string;
  question: string;
  /** تصویر یا ویدیوی خود پرسش (۱.۳.۱) */
  media: Attachment[];
  options: PollOption[];
  multiple: boolean;
  max_choices: number;
  anonymous: boolean;
  allow_change: boolean;
  show_results: "always" | "after_close";
  /** «تاریخ ساعت» شمسی پایان — null یعنی بی‌پایان */
  closes_at: string | null;
  is_closed: boolean;
  closed_at?: string | null;
  total_votes: number;
  /** فقط در پاسخ API برای کاربر جاری */
  my_votes?: string[];
  entity_name: "group" | "channel" | "post";
  entity_id: string;
  /** پیامی که نظرسنجی در آن منتشر شده */
  message_id: string | null;
  owner: string;
  tags: string[];
  created_at: string;
};
export type PollVote = { poll_id: string; user_id: string; option_ids: string[]; voted_at: string };

/** F02 — پیش‌نمایش لینک (GET /social/link-preview/?url=) — image در پروتوتایپ رنگ است */
export type LinkPreview = { url: string; final_url: string; title: string; description: string; image: string | null; site_name: string; favicon: string | null; fetched_at: string };

/** F03 — خوراک RSS/Atom متصل به گروه/کانال */
export type RssFeed = {
  id: string;
  chat_type: "group" | "channel";
  chat_id: string;
  url: string;
  title: string;
  interval_minutes: number;
  keywords: string[];
  max_items: number;
  is_active: boolean;
  last_fetched_at: string | null;
  last_error: string | null;
  items_published: number;
  /** فقط پروتوتایپ — شناسه‌ی مطالب منتشرشده و زمان واقعی آخرین واکشی برای زمان‌بندی */
  published_guids: string[];
  last_fetched_ms: number;
  created_by: string;
};
/** مطلب یک خوراک */
export type FeedItem = { guid: string; title: string; summary: string; link: string; published: string };

/** F05 — ویدیوی آپارات */
export type AparatVideo = { hash: string; title: string; thumbnail: string | null; duration: string; channel: string };
/** F05 — اتصال کانال آپارات سازمان */
export type AparatChannelLink = { id: string; username: string; title: string; album_id: string | null; auto_publish: boolean; last_synced_at: string | null; imported: string[]; created_by: string };

/** رویدادهای ممیزی اقلام F01–F05 (رأی، بستن نظرسنجی، خوراک، آپارات) برای لاگ ممیزی یکپارچه */
export type FeatureEvent = { id: string; at: string; actor_id: string; area: "poll" | "feed" | "aparat" | "link_preview" | "category" | "friendship"; action: string; target: string; note?: string };
