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
};

/** AllowedReaction */
export type AllowedReaction = { id: string; code: string; emoji: string; is_active: boolean };

/** واکنش ثبت‌شده (ReactionToggleRequest: entity_id, reaction_code) */
export type ReactionRecord = { entity_name: EntityName; entity_id: string; user_id: string; reaction_code: string };

/** فیلدهای مشترک همه‌ی موجودیت‌های قابل انتشار */
export type Publishable = {
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
};

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
};

/** دوستی (relations/friendships) */
export type FriendshipStatus = "pending" | "accepted" | "declined" | "blocked";
export type Friendship = { id: string; sender_id: string; receiver_id: string; status: FriendshipStatus; blocked_by: string | null; created_at: string; updated_at: string };

/** OwnerTypeEnum — مدیر فایل: کاربر، گروه یا کانال */
export type OwnerType = "user" | "group" | "channel";
/** FileManagerFolder */
export type FileFolder = { id: string; owner_type: OwnerType; owner_id: string; name: string; parent_id: string | null; created_by_user_id: string; created_at: string; updated_at: string };
export type FileItem = { id: string; owner_type: OwnerType; owner_id: string; folder_id: string | null; name: string; size: string; mime: string; created_by_user_id: string; created_at: string };

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
