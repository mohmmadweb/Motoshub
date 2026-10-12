// ---------------------------------------------------------------------------
// انبار «شبکه اجتماعی» — شبیه‌ساز Motoshub Social API در مرورگر.
// هر اکشن معادل یک endpoint است (نگاشت کامل در src/social/endpoints.ts)؛
// برای اتصال واقعی، بدنه‌ی اکشن با fetch همان آدرس جایگزین می‌شود.
// اعلان‌های شخصی (درخواست دوستی، دعوت رویداد، منشن، پیام، پاسخ، محتوای جدید)
// از همین‌جا به صندوق ورودی می‌روند.
// ---------------------------------------------------------------------------
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTenancy } from "./TenancyContext";
import { useInbox } from "./InboxContext";
import { users } from "../data/mock";
import { nowClock, dayNum, addDays } from "../pm/jalali";
import {
  SOCIAL_TODAY,
  at,
  seedAllowedReactions,
  seedCategories,
  seedComments,
  seedContent,
  seedEvents,
  seedFiles,
  seedForum,
  seedFriendships,
  seedMedia,
  seedMessaging,
  seedReactions,
  seedSettings,
  seedTags,
  seedReviewContent,
  seedSharedFiles,
  seedFileEvents,
  seedReports,
  seedModerationLog,
  seedPolls,
  seedLinkMessages,
  seedFeeds,
  seedAparat,
  seedV5Files,
  seedFeatureLog,
  RSS_BOT_ID,
} from "../social/seed";
import type {
  AllowedReaction,
  Attachment,
  Category,
  Chat,
  ChatRole,
  Comment,
  ContentItem,
  ContentKind,
  DashboardStat,
  EntityName,
  EventMember,
  EventMemberStatus,
  FileFolder,
  FileItem,
  ForumPost,
  Friendship,
  MediaPost,
  Message,
  MessageType,
  OwnerType,
  Privacy,
  ReactionRecord,
  Setting,
  SocialEvent,
  SocialModule,
  Tag,
  Topic,
  TrashedFile,
  FileShare,
  Vote,
  Announcement,
  AbuseReport,
  FileEvent,
  FileEventAction,
  Moderation,
  ModerationEvent,
  ReportReason,
  ReportTargetType,
  ViewRecord,
  Poll,
  PollVote,
  RssFeed,
  FeedItem,
  AparatChannelLink,
  FeatureEvent,
  Mention,
} from "../social/types";
import { fetchFeed as fetchFeedSim, matchesKeywords } from "../social/feedCatalog";
import { aparatHash, aparatMeta, APARAT_CHANNEL_FEED } from "../social/linkPreview";
import { av, scheduleDue, type QuarantineItem } from "../social/av";
import { contentKindLabel } from "../social/types";
import { withDemoScopes, type Scoped as OrgScopedT } from "../data/tenancy";
import { ROOT_ID } from "../iam/model";

const KEY = "motoshub.social.v1";
/** ۴: بازبینی پیش از انتشار، گزارش تخلف، فعالیت فایل، «اشتراک‌گذاشته با من» و آمار بازدید
 *  ۵: نظرسنجی، پیش‌نمایش لینک، خبرخوان RSS، آپارات و فایل نمونه‌ی ضدویروس (اقلام F01–F05، F13) */
const VERSION = 5;
/** پیام‌ها، رسانه‌ها و فایل‌های نمونه‌ی نسخه‌ی ۵ — به ذخیره‌ی نسخه‌های ۳ و ۴ هم افزوده می‌شوند */
const isV5Msg = (id: string) => /^msg-(poll|lp|irna|isna)/.test(id);
const V5_MEDIA = ["media-ap1", "media-ap2"];
const V5_FILES = ["fl-av1"];
/** آیتم‌های نمونه‌ای که در نسخه‌ی ۴ اضافه شده‌اند — به ذخیره‌ی نسخه‌ی ۳ هم افزوده می‌شوند */
const V4_CONTENT = ["blog-rv1", "blog-rv2"];
const V4_FILES = ["fl8", "fl9"];

type Store = {
  version: number;
  seq: number;
  categories: Category[];
  tags: Tag[];
  content: ContentItem[];
  media: MediaPost[];
  events: SocialEvent[];
  eventMembers: EventMember[];
  topics: Topic[];
  posts: ForumPost[];
  chats: Chat[];
  messages: Message[];
  friendships: Friendship[];
  comments: Comment[];
  reactions: ReactionRecord[];
  allowedReactions: AllowedReaction[];
  folders: FileFolder[];
  files: FileItem[];
  /** «پیشنهادی» — سطل بازیافت فایل‌ها */
  fileTrash: TrashedFile[];
  settings: Setting[];
  /** «پیشنهادی» — گزارش‌های تخلف */
  reports: AbuseReport[];
  /** «پیشنهادی» — رویدادهای نظارت و بازبینی (برای لاگ ممیزی یکپارچه) */
  moderationLog: ModerationEvent[];
  /** «پیشنهادی» — فعالیت فایل‌ها */
  fileEvents: FileEvent[];
  /** «پیشنهادی» — بازدیدهای ثبت‌شده‌ی کاربران در همین مرورگر */
  viewLog: ViewRecord[];
  /** «پیشنهادی» — F01 نظرسنجی‌ها و آرا */
  polls: Poll[];
  pollVotes: PollVote[];
  /** «پیشنهادی» — F03 خوراک‌های RSS/Atom گروه‌ها و کانال‌ها */
  feeds: RssFeed[];
  /** «پیشنهادی» — F05 کانال‌های آپارات متصل */
  aparatChannels: AparatChannelLink[];
  /** «پیشنهادی» — رویدادهای ممیزی F01–F05 */
  featureLog: FeatureEvent[];
};

function initial(): Store {
  const categories = seedCategories();
  const ev = seedEvents(categories);
  const forum = seedForum(categories);
  const msg0 = seedMessaging(categories);
  const pl = seedPolls(msg0.chats, msg0.messages);
  const fd = seedFeeds(seedLinkMessages(pl.messages));
  const msg = { chats: msg0.chats, messages: fd.messages };
  const ap = seedAparat(categories);
  const files = seedFiles();
  const allFiles = [...files.files, ...seedSharedFiles(), ...seedV5Files()];
  return {
    version: VERSION,
    seq: 5000,
    categories,
    tags: seedTags(),
    content: withDemoScopes([...seedContent(categories), ...seedReviewContent(categories)], 2),
    media: withDemoScopes([...ap.media, ...seedMedia(categories)], 5),
    events: withDemoScopes(ev.events, 1),
    eventMembers: ev.members,
    topics: withDemoScopes(forum.topics, 4),
    posts: forum.posts,
    chats: msg.chats,
    messages: msg.messages,
    friendships: seedFriendships(),
    comments: seedComments(),
    reactions: seedReactions(),
    allowedReactions: seedAllowedReactions(),
    folders: files.folders,
    files: allFiles,
    fileTrash: files.trash,
    settings: seedSettings(),
    reports: seedReports(msg.messages),
    moderationLog: seedModerationLog(),
    fileEvents: seedFileEvents(allFiles, files.trash),
    viewLog: [],
    polls: pl.polls,
    pollVotes: pl.votes,
    // زمان‌بندی واکشی خوراک از همین لحظه‌ی باز شدن دمو شروع می‌شود
    feeds: fd.feeds.map((f) => ({ ...f, last_fetched_ms: Date.now() })),
    aparatChannels: ap.channels,
    featureLog: seedFeatureLog(),
  };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Store>;
      // نسخه‌ی هم‌خوان: فیلدهای تازه‌ای که در ذخیره‌ی قدیمی نیستند از داده‌ی نمونه پر می‌شوند.
      // ذخیره‌ی نسخه‌ی ۳ هم بدون از دست رفتن داده‌ی کاربر به ۴ ارتقا می‌یابد.
      if (s && (s.version === VERSION || s.version === 3 || s.version === 4)) {
        const base = initial();
        const out = { ...base } as Record<string, unknown>;
        (Object.keys(base) as (keyof Store)[]).forEach((k) => {
          const v = s[k];
          if (v !== undefined && v !== null && (Array.isArray(base[k]) ? Array.isArray(v) : true)) out[k] = v;
        });
        const st = out as Store;
        if (s.version === 3) {
          const haveC = new Set(st.content.map((x) => x.id));
          const haveF = new Set([...st.files, ...st.fileTrash].map((x) => x.id));
          st.content = [...st.content, ...base.content.filter((x) => V4_CONTENT.includes(x.id) && !haveC.has(x.id))];
          st.files = [...st.files, ...base.files.filter((x) => V4_FILES.includes(x.id) && !haveF.has(x.id))];
          st.version = 4;
        }
        if ((s.version ?? 0) < 5) {
          // ۴ ← ۵: پیام‌های نظرسنجی/خبرخوان/لینک، پست‌های آپارات و فایل نمونه‌ی ضدویروس
          const haveM = new Set(st.messages.map((x) => x.id));
          const pollOf = new Map(base.polls.map((p) => [p.message_id, p.id]));
          st.messages = [...st.messages.map((m) => (pollOf.has(m.id) ? { ...m, poll_id: pollOf.get(m.id) } : m)), ...base.messages.filter((x) => isV5Msg(x.id) && !haveM.has(x.id))];
          const haveMd = new Set(st.media.map((x) => x.id));
          st.media = [...base.media.filter((x) => V5_MEDIA.includes(x.id) && !haveMd.has(x.id)), ...st.media];
          const haveF = new Set([...st.files, ...st.fileTrash].map((x) => x.id));
          st.files = [...st.files, ...base.files.filter((x) => V5_FILES.includes(x.id) && !haveF.has(x.id))];
          st.version = VERSION;
        }
        // پوسترهای تصویری نمونه: آیتم نمونه‌ای که هنوز پوستر رنگی قدیمی دارد و ویرایش نشده، پوستر تازه می‌گیرد
        const seedPoster = <T extends { id: string; poster: string | null; updated_at: string }>(x: T, b: T | undefined): T =>
          b && (typeof x.poster !== "string" || x.poster.startsWith("#")) && !(b.poster ?? "").startsWith("#") && x.poster !== b.poster && x.updated_at === b.updated_at ? { ...x, poster: b.poster } : x;
        const baseC = new Map(base.content.map((x) => [x.id, x]));
        const baseM = new Map(base.media.map((x) => [x.id, x]));
        st.content = st.content.map((x) => seedPoster(x, baseC.get(x.id)));
        st.media = st.media.map((x) => seedPoster(x, baseM.get(x.id)));
        // تنظیم‌های تازه‌ای که در ذخیره‌ی قدیمی نیستند
        const haveS = new Set(st.settings.map((x) => x.key));
        st.settings = [...st.settings, ...base.settings.filter((x) => !haveS.has(x.key))];
        st.feeds = st.feeds.map((f) => ({ ...f, last_fetched_ms: f.last_fetched_ms || Date.now() }));
        return st;
      }
    }
  } catch {
    /* ذخیره‌ساز در دسترس نیست */
  }
  return initial();
}

// ---------------------------------------------------------------- ورودی‌ها (هم‌شکل *StoreRequest)
export type PublishFields = { privacy: Privacy; category_ids: string[]; tags: string[]; is_draft: boolean; published_date?: string; published_time?: string; uploaded_files?: Attachment[]; send_notification?: boolean };
export type ContentInput = PublishFields & { id?: string; title: string; excerpt: string; content: string; poster: string | null; add_comment: boolean; show_comment: boolean; announcement?: { requires_ack: boolean; pin_until: string | null } | null; content_format?: "markdown" | "plain"; /** «پیشنهادی» — ذخیره و ارسال برای بازبینی (کاربران بدون مجوز manage) */ submit_review?: boolean };
/** ورودی گزارش تخلف */
export type ReportInput = { target_type: ReportTargetType; target_id: string; parent_ref?: string | null; target_owner_id: string; target_excerpt: string; reason: ReportReason; note: string };
/** پیشوند مجوز هر نوع محتوا */
export const contentPerm = (k: ContentKind) => (k === "news" ? "news" : k === "blogs" ? "blog" : "magazines");
export type MediaInput = PublishFields & { id?: string; caption: string; post_type: MediaPost["post_type"]; poster: string | null; add_comment: boolean; show_comment: boolean };
export type EventInput = PublishFields & {
  id?: string;
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
  repeat_days: number[];
};
export type TopicInput = PublishFields & { id?: string; title: string; content: string };
export type ChatInput = { title: string; description: string; is_private: boolean; category_ids: string[]; tags: string[]; slug?: string; member_ids?: string[] };
export type MessageInput = { content: string; type?: MessageType; parent_message_id?: string | null; uploaded_files?: Attachment[]; tags?: string[]; in_thread?: boolean; /** «پیشنهادی» — منشن‌ها با شناسه */ mentions?: Mention[]; /** «پیشنهادی» — فرستنده پیش‌نمایش لینک را حذف کرده */ preview_hidden?: boolean };
/** «پیشنهادی» — ورودی ساخت نظرسنجی (POST /core/polls/) */
export type PollInput = Pick<Poll, "question" | "media" | "multiple" | "max_choices" | "anonymous" | "allow_change" | "show_results" | "closes_at"> & { options: { text: string; image: string | null }[] };
/** نمای محاسبه‌شده‌ی یک نظرسنجی برای کاربر جاری */
export type PollView = { poll: Poll; counts: Record<string, number>; total: number; voters: number; mine: string[]; closed: boolean; showResults: boolean; canManage: boolean; canVote: boolean; chat: Chat | undefined };
/** «پیشنهادی» — ورودی خوراک RSS */
export type FeedInput = { id?: string; chat_id: string; url: string; title: string; interval_minutes: number; keywords: string[]; max_items: number; is_active: boolean };
/** «@همه» — منشن گروهی (فقط مدیران گروه/کانال) */
export const MENTION_ALL = "@همه";
export type Result = { ok: true; id?: string } | { ok: false; error: string };

/** جمع رأی‌ها (پیشنهادی) */
export const voteScore = (v?: Record<string, Vote>) => Object.values(v ?? {}).reduce<number>((a, b) => a + b, 0);
/** حداکثر پیام سنجاق‌شده در هر گفتگو */
export const MAX_PINNED = 5;
/** مهلت بازگردانی از سطل بازیافت (روز) */
export const TRASH_DAYS = 30;
/** «۳٫۲ مگابایت» / «۴۸۰ کیلوبایت» → بایت */
export function parseSize(sz: string): number {
  const n = Number(sz.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٫,]/g, ".").replace(/[^\d.]/g, "")) || 0;
  return sz.includes("گیگ") ? n * 1024 ** 3 : sz.includes("مگ") ? n * 1024 ** 2 : sz.includes("کیلو") ? n * 1024 : n;
}

type Ctx = Store & {
  me: string;
  today: string;
  now: () => string;
  // ------------------------------------------------ کمکی
  userName: (id: string) => string;
  userById: (id: string) => (typeof users)[number] | undefined;
  areFriends: (a: string, b: string) => boolean;
  friendIds: (uid?: string) => string[];
  /** قواعد privacy: ME فقط صاحب، FRIENDS صاحب و دوستان، EVERYONE همه */
  canView: (item: { user_id: string; privacy: Privacy; moderation?: Moderation | null } & Partial<OrgScopedT>, override?: boolean) => boolean;
  categoriesOf: (entity: EntityName) => Category[];
  categoryTitle: (id: string) => string;
  setting: (key: string) => Setting["value"] | undefined;
  // ------------------------------------------------ core
  addComment: (entity: EntityName, entityId: string, content: string, parentId?: string | null, autoApprove?: boolean) => Comment;
  approveComment: (id: string) => void;
  deleteComment: (id: string) => void;
  commentsFor: (entity: EntityName, entityId: string, includeUnapproved?: boolean) => Comment[];
  toggleReaction: (entity: EntityName, entityId: string, code: string) => void;
  reactionSummary: (entity: EntityName, entityId: string) => { counts: Record<string, number>; mine: string | null; total: number };
  saveAllowedReaction: (r: Omit<AllowedReaction, "id"> & { id?: string }) => void;
  saveTag: (t: { id?: string; name: string }) => Result;
  deleteTag: (id: string) => void;
  saveCategory: (c: { id?: string; entity_name: EntityName; title: string; parent_id: string | null }) => Result;
  deleteCategory: (id: string) => void;
  /** «پیشنهادی» — انتقال همه‌ی آیتم‌های یک دسته به دسته‌ی دیگر (پیش از حذف) — تعداد آیتم‌های منتقل‌شده */
  reassignCategory: (fromId: string, toId: string) => Result & { moved?: number };
  updateSetting: (key: string, value: Setting["value"]) => void;
  // ------------------------------------------------ فایل
  createFolder: (owner_type: OwnerType, owner_id: string, name: string, parent_id: string | null) => string;
  updateFolder: (id: string, patch: { name?: string; parent_id?: string | null }) => void;
  deleteFolder: (id: string) => void;
  uploadFiles: (owner_type: OwnerType, owner_id: string, folder_id: string | null, files: Attachment[]) => void;
  /** انتقال به سطل بازیافت (۳۰ روز قابل بازگردانی) */
  deleteFile: (id: string) => void;
  restoreFile: (id: string) => Result;
  purgeFile: (id: string) => void;
  emptyTrash: () => void;
  toggleStar: (id: string) => void;
  openFile: (id: string) => void;
  uploadVersion: (id: string, file: Attachment) => void;
  restoreVersion: (id: string, versionId: string) => void;
  createShare: (id: string, days: number, allowDownload: boolean, sharedWith?: string[]) => FileShare | null;
  revokeShare: (id: string) => void;
  // ------------------------------------------------ content
  saveContent: (kind: ContentKind, input: ContentInput) => string;
  deleteContent: (id: string) => void;
  publishContent: (id: string, publish: boolean) => void;
  addContentAttachments: (id: string, files: Attachment[]) => void;
  removeContentAttachment: (id: string, attachmentId: string) => void;
  viewContent: (id: string) => void;
  /** «پیشنهادی» — اطلاعیه‌ی رسمی */
  acknowledge: (id: string) => void;
  remindUnread: (id: string) => number;
  /** مخاطبان یک آیتم (بر اساس دامنه‌ی سازمانی و privacy) — بدون نویسنده */
  audienceOf: (item: { user_id: string; privacy: Privacy } & Partial<OrgScopedT>) => string[];
  /** اطلاعیه‌های رسمیِ سنجاق‌شده در میز کار که هنوز تاریخشان نگذشته */
  pinnedAnnouncements: () => ContentItem[];
  // ------------------------------------------------ media
  saveMedia: (input: MediaInput) => string;
  deleteMedia: (id: string) => void;
  publishMedia: (id: string, publish: boolean) => void;
  // ------------------------------------------------ events
  saveEvent: (input: EventInput) => string;
  deleteEvent: (id: string) => void;
  publishEvent: (id: string, publish: boolean) => void;
  eventMembersOf: (id: string) => EventMember[];
  participantCount: (id: string) => number;
  myEventStatus: (id: string) => EventMember | undefined;
  inviteToEvent: (id: string, userIds: string[]) => number;
  rsvp: (id: string, status: "accepted" | "declined") => Result;
  joinEvent: (id: string) => Result;
  leaveEvent: (id: string) => void;
  addEventMember: (id: string, userId: string) => Result;
  removeEventMember: (id: string, userId: string) => void;
  setEventRole: (id: string, userId: string, organizer: boolean) => void;
  // ------------------------------------------------ forums
  saveTopic: (input: TopicInput) => string;
  deleteTopic: (id: string) => void;
  pinTopic: (id: string) => void;
  lockTopic: (id: string) => void;
  publishTopic: (id: string, publish: boolean) => void;
  viewTopic: (id: string) => void;
  createPost: (topicId: string, content: string, parentId?: string | null, files?: Attachment[]) => Result;
  updatePost: (id: string, content: string) => void;
  deletePost: (id: string) => void;
  voteTopic: (id: string, v: Vote) => Result;
  votePost: (id: string, v: Vote) => Result;
  acceptAnswer: (topicId: string, postId: string | null) => Result;
  markDuplicate: (topicId: string, targetId: string | null) => Result;
  // ------------------------------------------------ messaging
  myChats: (type?: Chat["chat_type"] | Chat["chat_type"][]) => Chat[];
  chatMessages: (chatId: string) => Message[];
  unreadCount: (chat: Chat) => number;
  lastMessage: (chatId: string) => Message | undefined;
  isMember: (chat: Chat, uid?: string) => boolean;
  chatRole: (chat: Chat, uid?: string) => ChatRole | null;
  createGroup: (input: ChatInput) => string;
  createChannel: (input: ChatInput) => string;
  createSubChat: (parentId: string, input: ChatInput) => string;
  openDirect: (userId: string, firstMessage?: string) => string;
  ensureSaved: () => string;
  sendMessage: (chatId: string, input: MessageInput) => Result;
  editMessage: (id: string, content: string) => void;
  deleteMessage: (id: string) => void;
  forwardMessage: (id: string, chatId: string) => void;
  saveMessage: (id: string) => void;
  toggleMessageReaction: (id: string, code: string) => void;
  togglePinMessage: (chatId: string, messageId: string) => Result;
  markRead: (chatId: string) => void;
  toggleMute: (chatId: string) => void;
  joinChat: (chatId: string) => Result;
  leaveChat: (chatId: string) => Result;
  addChatMember: (chatId: string, userId: string, role?: ChatRole) => void;
  removeChatMember: (chatId: string, userId: string) => void;
  updateChat: (chatId: string, patch: Partial<Pick<Chat, "title" | "description" | "is_private" | "wall_photo" | "profile_photos" | "is_public" | "category_ids" | "tags">>) => void;
  deleteChat: (chatId: string) => void;
  // ------------------------------------------------ relations
  relationWith: (userId: string) => { f?: Friendship; state: "none" | "friends" | "sent" | "received" | "blocked" | "blocked_me" };
  sendFriendRequest: (userId: string) => Result;
  respondFriend: (id: string, accept: boolean) => void;
  cancelFriendRequest: (id: string) => void;
  unfriend: (id: string) => void;
  blockUser: (userId: string) => void;
  unblock: (id: string) => void;
  // ------------------------------------------------ dashboards
  dashboard: (module: SocialModule, who: "admin" | "user") => DashboardStat[];
  resetSocial: () => void;
  // ------------------------------------------------ «پیشنهادی» — بازبینی پیش از انتشار
  /** ارسال برای بازبینی (کاربر بدون مجوز manage) */
  submitForReview: (id: string, note?: string) => Result;
  /** تأیید و انتشار (مدیر) */
  approveReview: (id: string, note?: string) => Result;
  /** برگشت با یادداشت (مدیر) */
  returnReview: (id: string, note: string) => Result;
  /** بازبین‌های یک مطلب: دارندگان مجوز manage در دامنه‌ی مالک */
  reviewersOf: (item: ContentItem) => string[];
  // ------------------------------------------------ «پیشنهادی» — گزارش تخلف و نظارت
  canModerate: boolean;
  reportAbuse: (input: ReportInput) => Result;
  myReportOn: (type: ReportTargetType, id: string) => AbuseReport | undefined;
  resolveReport: (id: string, decision: "dismiss" | "hide" | "remove_warn", note: string) => Result;
  unhide: (type: ReportTargetType, id: string) => void;
  // ------------------------------------------------ «پیشنهادی» — آمار و فایل
  viewMedia: (id: string) => void;
  viewsOf: (entity: ViewRecord["entity"], id: string) => ViewRecord[];
  renameFile: (id: string, name: string) => Result;
  logFileDownload: (id: string) => void;
  fileActivity: (id: string) => FileEvent[];
  // ------------------------------------------------ «پیشنهادی» — F01 نظرسنجی
  pollView: (id: string) => PollView | null;
  createPoll: (chatId: string, input: PollInput) => Result;
  votePoll: (id: string, optionIds: string[]) => Result;
  closePoll: (id: string) => Result;
  reopenPoll: (id: string) => Result;
  deletePoll: (id: string) => Result;
  /** رأی‌دهندگان (فقط در حالت با نام و برای سازنده/مدیر) */
  pollVoters: (id: string) => PollVote[];
  /** شبیه‌سازی رأی یکی از اعضای دیگر (نمایش لحظه‌ای ۱.۳.۵) */
  simulatePollVote: (id: string) => void;
  myPolls: () => { created: Poll[]; participated: Poll[] };
  /** گفتگوهایی که کاربر می‌تواند در آن نظرسنجی بگذارد */
  pollTargets: () => Chat[];
  // ------------------------------------------------ «پیشنهادی» — F02 پیش‌نمایش لینک
  hidePreview: (messageId: string) => void;
  // ------------------------------------------------ «پیشنهادی» — F03 خبرخوان
  feedsOf: (chatId: string) => RssFeed[];
  saveFeed: (input: FeedInput) => Result;
  deleteFeed: (id: string) => void;
  toggleFeed: (id: string) => void;
  fetchFeedNow: (id: string) => Result & { published?: number };
  testFeed: (url: string) => { ok: true; title: string; items: FeedItem[] } | { ok: false; error: string };
  // ------------------------------------------------ «پیشنهادی» — F05 آپارات
  importAparat: (input: { url: string; caption?: string; privacy: Privacy; category_ids: string[]; tags: string[] }) => Result;
  linkAparatChannel: (username: string, auto_publish: boolean, album_id: string | null) => Result;
  unlinkAparatChannel: (id: string) => void;
  syncAparatChannel: (id: string) => Result & { imported?: number };
  // ------------------------------------------------ «پیشنهادی» — F13 ضدویروس (اسکن دوره‌ای فایل‌های میزبان)
  avScanHosted: (trigger: "schedule" | "manual") => { scanned: number; infected: number };
  /** آزادسازی فایل قرنطینه‌شده به درایو مبدأ */
  releaseQuarantined: (q: QuarantineItem) => Result;
};

const SocialContext = createContext<Ctx | null>(null);

/** «@نام_خانوادگی» → شناسه‌ی کاربر؛ اگر منشن‌ها با شناسه آمده باشند همان‌ها ملاک‌اند */
function mentionedIds(text: string, explicit?: Mention[]): string[] {
  if (explicit?.length) return [...new Set(explicit.map((m) => m.user_id))];
  const out = new Set<string>();
  (text.match(/@[^\s،.,!؟?]+/g) ?? []).forEach((tok) => {
    const n = tok.slice(1).replace(/_/g, " ");
    const u = users.find((x) => x.name === n);
    if (u) out.add(u.id);
  });
  return [...out];
}

const fa = (n: number) => n.toLocaleString("fa-IR");
/** رأی دوباره با همان جهت = برداشتن رأی */
function toggleVote(votes: Record<string, Vote> | undefined, v: Vote, me: string): Record<string, Vote> {
  const next = { ...(votes ?? {}) };
  if (next[me] === v) delete next[me];
  else next[me] = v;
  return next;
}
/** چند روز از یک «تاریخ ساعت» شمسی تا امروزِ دمو گذشته است */
const diffDaysFrom = (stampStr: string) => {
  const a = dayNum(stampStr.split(" ")[0]);
  const b = dayNum(SOCIAL_TODAY);
  return a == null || b == null ? null : b - a;
};

export function SocialProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(load);
  const { actingUser, hasPermission, visible: orgVisible, defaultScopeForNew, visibleUserIds, membersOf, effectiveOf } = useTenancy();
  const inbox = useInbox();
  const me = actingUser.id;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      /* پر بودن حافظه — دمو بدون ماندگاری ادامه می‌دهد */
    }
  }, [store]);

  const now = () => at(SOCIAL_TODAY, `${nowClock()}:۰۰`);
  const userById = (id: string) => users.find((u) => u.id === id);
  const userName = (id: string) => (id === RSS_BOT_ID ? "خبرخوان" : userById(id)?.name ?? "کاربر");
  const names = (ids: string[]) => ids.filter((i) => i !== me).map(userName);
  const nid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
  const upd = (fn: (s: Store) => Store) => setStore((prev) => fn(prev));

  const friendIds = (uid = me) =>
    store.friendships.filter((f) => f.status === "accepted" && (f.sender_id === uid || f.receiver_id === uid)).map((f) => (f.sender_id === uid ? f.receiver_id : f.sender_id));
  const areFriends = (a: string, b: string) => store.friendships.some((f) => f.status === "accepted" && ((f.sender_id === a && f.receiver_id === b) || (f.sender_id === b && f.receiver_id === a)));
  // دو لایه: (۱) لایه‌ی سازمانی (پیاز) — محتوای واحد خودم، زیرمجموعه‌ها و اعلان‌های لایه‌های بالاتر؛ (۲) privacy خودِ آیتم
  const canModerate = hasPermission("comments.moderate");
  // آیتمِ پنهان‌شده توسط ناظر فقط برای صاحبش، ناظران و مدیر ماژول دیده می‌شود
  const canView = (item: { user_id: string; privacy: Privacy; moderation?: Moderation | null } & Partial<OrgScopedT>, override = false) =>
    !(item.moderation?.hidden && item.user_id !== me && !canModerate && !override) &&
    (override || item.user_id === me || (orgVisible(item) && (item.privacy === "EVERYONE" || (item.privacy === "FRIENDS" && areFriends(me, item.user_id)))));
  /** دامنه‌ی IAM مالک یک آیتم */
  const ownerSid = (x: Partial<OrgScopedT>) => (!x.scope || x.scope === "سراسری" ? ROOT_ID : x.scope === "هلدینگ" ? x.holdingId ?? ROOT_ID : x.companyId ?? x.holdingId ?? ROOT_ID);
  /** کاربرانی که در دامنه‌ی آیتم مجوز مشخصی دارند */
  const holdersOf = (perm: string, x: Partial<OrgScopedT>) => users.filter((u) => effectiveOf(u.id, ownerSid(x)).has(perm)).map((u) => u.id);
  const modEv = (st: Store, e: Omit<ModerationEvent, "id" | "at" | "actor_id">): Store => ({ ...st, moderationLog: [{ ...e, id: nid("mv"), at: now(), actor_id: me }, ...st.moderationLog].slice(0, 1000) });
  const fileEv = (st: Store, f: { id: string; name: string }, action: FileEventAction, detail?: string): Store => ({ ...st, fileEvents: [...st.fileEvents, { id: nid("fe"), file_id: f.id, file_name: f.name, user_id: me, action, at: now(), detail }].slice(-3000) });
  /** گیرندگان اعلان محتوای جدید: فقط کسانی که بر اساس واحد سازمانی و privacy می‌توانند آن را ببینند */
  const audienceFor = (privacy: Privacy) => {
    const ids = visibleUserIds().filter((u) => u !== me && (privacy === "EVERYONE" || (privacy === "FRIENDS" && areFriends(me, u))));
    return ids.map(userName);
  };

  /** برچسب‌های تازه در /core/tags/ ثبت می‌شوند (TagStoreRequest) */
  const withTags = (s: Store, tags: string[]): Store => {
    const missing = tags.map((t) => t.trim().replace(/^#/, "")).filter((t) => t && !s.tags.some((x) => x.name === t));
    if (!missing.length) return s;
    return { ...s, tags: [...s.tags, ...[...new Set(missing)].map((name) => ({ id: nid("tg"), name, created_at: now(), updated_at: now() }))] };
  };
  /** مخاطبان واقعی آیتم: اعضای فعال دامنه‌ی مالک (و زیرمجموعه‌ها) + قاعده‌ی privacy */
  const audienceOf = (item: { user_id: string; privacy: Privacy } & Partial<OrgScopedT>) => {
    if (item.privacy === "ME") return [];
    const sid = !item.scope || item.scope === "سراسری" ? null : item.scope === "هلدینگ" ? item.holdingId : item.companyId ?? item.holdingId;
    const pool = sid ? new Set(membersOf(sid, true).filter((m) => m.status === "active").map((m) => m.userId)) : null;
    return users.map((u) => u.id).filter((u) => u !== item.user_id && (!pool || pool.has(u)) && (item.privacy === "EVERYONE" || areFriends(item.user_id, u)));
  };
  const publishedAt = (i: PublishFields) => (i.is_draft ? null : i.published_date ? at(i.published_date, i.published_time || "۰۹:۰۰") : now());
  const isAdminish = hasPermission("social.settings");

  // ================================================================ «پیشنهادی» — کمکی‌های F01–F05 و F13
  const fx = (st: Store, area: FeatureEvent["area"], action: string, target: string, note?: string): Store => ({ ...st, featureLog: [{ id: nid("fx"), at: now(), actor_id: me, area, action, target, note }, ...st.featureLog].slice(0, 1000) });
  const settingVal = (key: string) => store.settings.find((x) => x.key === key)?.value;
  const chatLink = (c: Chat) => (c.chat_type === "channel" ? `/dashboard/channels/${c.parent ?? c.id}` : c.chat_type === "group" ? `/dashboard/groups/${c.parent ?? c.id}` : `/dashboard/chat/${c.id}`);
  const isChatAdminOf = (c: Chat) => c.owner_id === me || c.members.find((m) => m.user_id === me)?.role === "admin" || hasPermission(c.chat_type === "channel" ? "channels.manage" : "groups.manage");
  /** نظرسنجی بسته‌شده (دستی یا با گذشتن تاریخ پایان) */
  const pollClosed = (p: Poll) => p.is_closed || (!!p.closes_at && p.closes_at <= now());
  const canManagePoll = (p: Poll) => {
    const c = store.chats.find((x) => x.id === p.entity_id);
    return p.owner === me || (!!c && isChatAdminOf(c));
  };
  /** شمارنده‌های هم‌شکل API (votes_count و total_votes) از روی آرا */
  const recount = (s: Store, pollId: string): Store => {
    const vs = s.pollVotes.filter((v) => v.poll_id === pollId);
    return { ...s, polls: s.polls.map((p) => (p.id !== pollId ? p : { ...p, total_votes: vs.length, options: p.options.map((o) => ({ ...o, votes_count: vs.filter((v) => v.option_ids.includes(o.id)).length })) })) };
  };
  /** یک بار واکشی خوراک: مطالب تازه‌ی منطبق با کلیدواژه‌ها (تا سقف max_items) به‌صورت پیام بات «خبرخوان» */
  const doFetch = (s: Store, feedId: string): { s: Store; published: number; error: string | null } => {
    const f = s.feeds.find((x) => x.id === feedId);
    if (!f) return { s, published: 0, error: "خوراک پیدا نشد." };
    const r = fetchFeedSim(f.url);
    const stamp = { last_fetched_at: now(), last_fetched_ms: Date.now() };
    if ("error" in r) return { s: { ...s, feeds: s.feeds.map((x) => (x.id === feedId ? { ...x, ...stamp, last_error: r.error } : x)) }, published: 0, error: r.error };
    const fresh = r.items.filter((it) => !f.published_guids.includes(it.guid) && matchesKeywords(it, f.keywords)).slice(0, Math.max(1, f.max_items));
    let seq = s.seq;
    const msgs: Message[] = fresh.map((it) => {
      seq += 1;
      return { id: nid("msg"), chat_id: f.chat_id, user_id: RSS_BOT_ID, content: `${it.title}\n${it.summary}\n${it.link}`, type: "text", parent_message_id: null, attachments: [], tags: [], forwarded_from: null, seq, created_at: now(), updated_at: now(), edited: false, feed_item: { feed_id: f.id, guid: it.guid, title: it.title, link: it.link } };
    });
    return {
      s: { ...s, seq, messages: [...s.messages, ...msgs], feeds: s.feeds.map((x) => (x.id === feedId ? { ...x, ...stamp, last_error: null, items_published: x.items_published + msgs.length, published_guids: [...x.published_guids, ...fresh.map((it) => it.guid)] } : x)) },
      published: msgs.length,
      error: null,
    };
  };
  const avAdmins = () => users.filter((u) => u.id !== me && effectiveOf(u.id, ROOT_ID).has("settings.security")).map((u) => u.id);
  const newAparatPost = (hash: string, extra: { caption?: string; privacy?: Privacy; category_ids?: string[]; tags?: string[]; is_draft?: boolean }): MediaPost => {
    const v = aparatMeta(hash);
    return { ...defaultScopeForNew(), id: nid("media-"), user_id: me, caption: extra.caption?.trim() || v.title, post_type: "video", poster: v.thumbnail, is_active: true, is_public: !extra.is_draft, is_draft: !!extra.is_draft, add_comment: true, show_comment: true, privacy: extra.privacy ?? "EVERYONE", category_ids: extra.category_ids ?? [], tags: extra.tags ?? ["آپارات"], attachments: [], published_at: extra.is_draft ? null : now(), created_at: now(), updated_at: now(), deleted_at: null, source: "aparat", aparat: v };
  };

  // ================================================================ اکشن‌ها
  const value: Ctx = {
    ...store,
    me,
    today: SOCIAL_TODAY,
    now,
    userName,
    userById,
    areFriends,
    friendIds,
    canView,
    categoriesOf: (entity) => store.categories.filter((c) => c.entity_name === entity),
    categoryTitle: (id) => store.categories.find((c) => c.id === id)?.title ?? "—",
    setting: (key) => store.settings.find((s) => s.key === key)?.value,

    // ---------------------------------------------------------------- core/comments
    addComment: (entity, entityId, content, parentId = null, autoApprove) => {
      const needApproval = store.settings.find((s) => s.key === "core.comments.require_approval")?.value === true;
      const approved = autoApprove ?? (!needApproval || hasPermission("comments.moderate"));
      const parent = parentId ? store.comments.find((c) => c.id === parentId) : undefined;
      const c: Comment = { id: nid("cmt"), user_id: me, entity_name: entity, entity_id: entityId, content, parent_id: parentId, level: parent ? parent.level + 1 : 0, approved, approved_at: approved ? now() : null, approved_by: approved ? me : null, created_at: now(), updated_at: now() };
      upd((s) => ({ ...s, comments: [...s.comments, c] }));
      const ids = mentionedIds(content);
      if (ids.length) inbox.send(names(ids), "mention", `«${actingUser.name}» شما را در یک نظر منشن کرد: «${content.slice(0, 60)}»`, "/dashboard/notifications");
      if (parent && parent.user_id !== me) inbox.send([userName(parent.user_id)], "reply", `«${actingUser.name}» به نظر شما پاسخ داد.`, "/dashboard/notifications");
      return c;
    },
    approveComment: (id) => upd((s) => ({ ...s, comments: s.comments.map((c) => (c.id === id ? { ...c, approved: true, approved_at: now(), approved_by: me } : c)) })),
    deleteComment: (id) => upd((s) => ({ ...s, comments: s.comments.filter((c) => c.id !== id && c.parent_id !== id) })),
    commentsFor: (entity, entityId, includeUnapproved = false) =>
      store.comments
        .filter((c) => c.entity_name === entity && c.entity_id === entityId && (c.approved || includeUnapproved || c.user_id === me) && (!c.moderation?.hidden || c.user_id === me || canModerate))
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),

    // ---------------------------------------------------------------- core/reactions
    toggleReaction: (entity, entityId, code) =>
      upd((s) => {
        const mine = s.reactions.find((r) => r.entity_name === entity && r.entity_id === entityId && r.user_id === me);
        const rest = s.reactions.filter((r) => r !== mine);
        return { ...s, reactions: mine?.reaction_code === code ? rest : [...rest, { entity_name: entity, entity_id: entityId, user_id: me, reaction_code: code }] };
      }),
    reactionSummary: (entity, entityId) => {
      const rs = store.reactions.filter((r) => r.entity_name === entity && r.entity_id === entityId);
      const counts: Record<string, number> = {};
      rs.forEach((r) => (counts[r.reaction_code] = (counts[r.reaction_code] ?? 0) + 1));
      return { counts, mine: rs.find((r) => r.user_id === me)?.reaction_code ?? null, total: rs.length };
    },
    saveAllowedReaction: (r) =>
      upd((s) => (r.id ? { ...s, allowedReactions: s.allowedReactions.map((x) => (x.id === r.id ? { ...x, ...r, id: x.id } : x)) } : { ...s, allowedReactions: [...s.allowedReactions, { ...r, id: nid("ar") }] })),

    // ---------------------------------------------------------------- core/tags & categories
    saveTag: ({ id, name }) => {
      const n = name.trim().replace(/^#/, "");
      if (!n) return { ok: false, error: "نام برچسب الزامی است." };
      if (store.tags.some((t) => t.name === n && t.id !== id)) return { ok: false, error: "این برچسب وجود دارد." };
      const old = store.tags.find((t) => t.id === id);
      upd((s) => {
        if (!old) return { ...s, tags: [...s.tags, { id: nid("tg"), name: n, created_at: now(), updated_at: now() }] };
        const ren = (arr: string[]) => arr.map((t) => (t === old.name ? n : t));
        return {
          ...s,
          tags: s.tags.map((t) => (t.id === id ? { ...t, name: n, updated_at: now() } : t)),
          content: s.content.map((x) => ({ ...x, tags: ren(x.tags) })),
          media: s.media.map((x) => ({ ...x, tags: ren(x.tags) })),
          events: s.events.map((x) => ({ ...x, tags: ren(x.tags) })),
          topics: s.topics.map((x) => ({ ...x, tags: ren(x.tags) })),
          chats: s.chats.map((x) => ({ ...x, tags: ren(x.tags) })),
        };
      });
      return { ok: true };
    },
    deleteTag: (id) =>
      upd((s) => {
        const t = s.tags.find((x) => x.id === id);
        if (!t) return s;
        const drop = (arr: string[]) => arr.filter((x) => x !== t.name);
        return { ...s, tags: s.tags.filter((x) => x.id !== id), content: s.content.map((x) => ({ ...x, tags: drop(x.tags) })), media: s.media.map((x) => ({ ...x, tags: drop(x.tags) })), events: s.events.map((x) => ({ ...x, tags: drop(x.tags) })), topics: s.topics.map((x) => ({ ...x, tags: drop(x.tags) })), chats: s.chats.map((x) => ({ ...x, tags: drop(x.tags) })) };
      }),
    saveCategory: (c) => {
      if (!c.title.trim()) return { ok: false, error: "عنوان موضوع الزامی است." };
      if (c.id && c.parent_id === c.id) return { ok: false, error: "موضوع نمی‌تواند والد خودش باشد." };
      upd((s) =>
        c.id
          ? { ...s, categories: s.categories.map((x) => (x.id === c.id ? { ...x, title: c.title.trim(), parent_id: c.parent_id, updated_at: now() } : x)) }
          : { ...s, categories: [...s.categories, { id: nid("cat"), entity_name: c.entity_name, title: c.title.trim(), parent_id: c.parent_id, created_at: now(), updated_at: now() }] }
      );
      return { ok: true };
    },
    deleteCategory: (id) =>
      upd((s) => {
        const drop = (arr: string[]) => arr.filter((x) => x !== id);
        return {
          ...s,
          categories: s.categories.filter((c) => c.id !== id).map((c) => (c.parent_id === id ? { ...c, parent_id: null } : c)),
          content: s.content.map((x) => ({ ...x, category_ids: drop(x.category_ids) })),
          media: s.media.map((x) => ({ ...x, category_ids: drop(x.category_ids) })),
          events: s.events.map((x) => ({ ...x, category_ids: drop(x.category_ids) })),
          topics: s.topics.map((x) => ({ ...x, category_ids: drop(x.category_ids) })),
          chats: s.chats.map((x) => ({ ...x, category_ids: drop(x.category_ids) })),
        };
      }),
    reassignCategory: (fromId, toId) => {
      const from = store.categories.find((c) => c.id === fromId);
      const to = store.categories.find((c) => c.id === toId);
      if (!from || !to) return { ok: false, error: "دسته‌بندی پیدا نشد." };
      if (fromId === toId) return { ok: false, error: "مبدأ و مقصد یکی است." };
      if (from.entity_name !== to.entity_name) return { ok: false, error: "دسته‌ی مقصد باید از همان بخش باشد." };
      const swap = (ids: string[]) => (ids.includes(fromId) ? [...new Set(ids.map((x) => (x === fromId ? toId : x)))] : ids);
      const has = (x: { category_ids: string[] }) => x.category_ids.includes(fromId);
      const moved = [store.content, store.media, store.events, store.topics, store.chats].reduce((n, arr) => n + (arr as { category_ids: string[] }[]).filter(has).length, 0);
      upd((s) =>
        fx(
          {
            ...s,
            content: s.content.map((x) => (has(x) ? { ...x, category_ids: swap(x.category_ids) } : x)),
            media: s.media.map((x) => (has(x) ? { ...x, category_ids: swap(x.category_ids) } : x)),
            events: s.events.map((x) => (has(x) ? { ...x, category_ids: swap(x.category_ids) } : x)),
            topics: s.topics.map((x) => (has(x) ? { ...x, category_ids: swap(x.category_ids) } : x)),
            chats: s.chats.map((x) => (has(x) ? { ...x, category_ids: swap(x.category_ids) } : x)),
          },
          "category",
          "انتقال آیتم‌های دسته‌بندی",
          `«${from.title}» ← «${to.title}»`,
          `${fa(moved)} آیتم`
        )
      );
      return { ok: true, moved };
    },
    updateSetting: (key, v) => upd((s) => ({ ...s, settings: s.settings.map((x) => (x.key === key ? { ...x, value: v, updated_at: now() } : x)) })),

    // ---------------------------------------------------------------- core/file-manager
    createFolder: (owner_type, owner_id, name, parent_id) => {
      const id = nid("fd");
      upd((s) => ({ ...s, folders: [...s.folders, { id, owner_type, owner_id, name, parent_id, created_by_user_id: me, created_at: now(), updated_at: now() }] }));
      return id;
    },
    updateFolder: (id, patch) => upd((s) => ({ ...s, folders: s.folders.map((f) => (f.id === id ? { ...f, ...patch, updated_at: now() } : f)) })),
    deleteFolder: (id) =>
      upd((s) => {
        const gone = new Set([id]);
        let grew = true;
        while (grew) {
          grew = false;
          s.folders.forEach((f) => {
            if (f.parent_id && gone.has(f.parent_id) && !gone.has(f.id)) {
              gone.add(f.id);
              grew = true;
            }
          });
        }
        // فایل‌های داخل پوشه‌ها به سطل بازیافت می‌روند (۳۰ روز قابل بازگردانی)
        const inside = s.files.filter((f) => f.folder_id && gone.has(f.folder_id));
        return { ...s, folders: s.folders.filter((f) => !gone.has(f.id)), files: s.files.filter((f) => !f.folder_id || !gone.has(f.folder_id)), fileTrash: [...inside.map((f) => ({ ...f, trashed_at: now(), trashed_by: me })), ...s.fileTrash] };
      }),
    uploadFiles: (owner_type, owner_id, folder_id, files) =>
      upd((s) => {
        const fresh: FileItem[] = files.map((f) => ({ id: nid("fl"), owner_type, owner_id, folder_id, name: f.name, size: f.size, mime: f.mime, created_by_user_id: me, created_at: now() }));
        return fresh.reduce((acc, f) => fileEv(acc, f, "upload", f.size), { ...s, files: [...s.files, ...fresh] });
      }),
    deleteFile: (id) =>
      upd((s) => {
        const f = s.files.find((x) => x.id === id);
        if (!f) return s;
        return fileEv({ ...s, files: s.files.filter((x) => x.id !== id), fileTrash: [{ ...f, trashed_at: now(), trashed_by: me }, ...s.fileTrash] }, f, "delete");
      }),
    restoreFile: (id) => {
      const t = store.fileTrash.find((x) => x.id === id);
      if (!t) return { ok: false, error: "فایل در سطل بازیافت نیست." };
      if ((diffDaysFrom(t.trashed_at) ?? 0) > TRASH_DAYS) return { ok: false, error: `مهلت ${fa(TRASH_DAYS)} روزه‌ی بازگردانی گذشته است.` };
      upd((s) => {
        const { trashed_at: _a, trashed_by: _b, ...file } = t;
        void _a;
        void _b;
        // اگر پوشه‌ی اصلی دیگر نیست، به ریشه‌ی همان درایو برمی‌گردد
        const folder_id = file.folder_id && s.folders.some((f) => f.id === file.folder_id) ? file.folder_id : null;
        return fileEv({ ...s, fileTrash: s.fileTrash.filter((x) => x.id !== id), files: [{ ...file, folder_id }, ...s.files] }, file, "restore");
      });
      return { ok: true };
    },
    purgeFile: (id) =>
      upd((s) => {
        const t = s.fileTrash.find((x) => x.id === id);
        const next = { ...s, fileTrash: s.fileTrash.filter((x) => x.id !== id) };
        return t ? fileEv(next, t, "purge") : next;
      }),
    emptyTrash: () => upd((s) => ({ ...s, fileTrash: s.fileTrash.filter((x) => x.trashed_by !== me && x.created_by_user_id !== me) })),
    toggleStar: (id) => upd((s) => ({ ...s, files: s.files.map((f) => (f.id !== id ? f : { ...f, starred_by: (f.starred_by ?? []).includes(me) ? (f.starred_by ?? []).filter((u) => u !== me) : [...(f.starred_by ?? []), me] })) })),
    openFile: (id) => upd((s) => ({ ...s, files: s.files.map((f) => (f.id === id ? { ...f, opened_at: { ...(f.opened_at ?? {}), [me]: now() } } : f)) })),
    uploadVersion: (id, file) =>
      upd((s) => {
        const cur = s.files.find((f) => f.id === id);
        if (!cur) return s;
        const v = cur.version ?? 1;
        const next = { ...cur, size: file.size, mime: file.mime || cur.mime, version: v + 1, created_at: now(), created_by_user_id: me, versions: [{ id: nid("fv"), version: v, size: cur.size, created_at: cur.created_at, created_by_user_id: cur.created_by_user_id }, ...(cur.versions ?? [])] };
        return fileEv({ ...s, files: s.files.map((f) => (f.id === id ? next : f)) }, cur, "version", `نسخه‌ی ${fa(v + 1)} · ${file.size}`);
      }),
    restoreVersion: (id, versionId) =>
      upd((s) => {
        const cur = s.files.find((f) => f.id === id);
        const old = cur ? (cur.versions ?? []).find((v) => v.id === versionId) : undefined;
        if (!cur || !old) return s;
        const v = cur.version ?? 1;
        // بازگردانی = نسخه‌ی تازه با محتوای نسخه‌ی قدیمی؛ نسخه‌ی فعلی در تاریخچه می‌ماند
        const next = { ...cur, size: old.size, version: v + 1, created_at: now(), created_by_user_id: me, versions: [{ id: nid("fv"), version: v, size: cur.size, created_at: cur.created_at, created_by_user_id: cur.created_by_user_id }, ...(cur.versions ?? [])] };
        return fileEv({ ...s, files: s.files.map((f) => (f.id === id ? next : f)) }, cur, "restore_version", `نسخه‌ی ${fa(old.version)} ← نسخه‌ی ${fa(v + 1)}`);
      }),
    createShare: (id, days, allowDownload, sharedWith) => {
      const file = store.files.find((f) => f.id === id);
      if (!file) return null;
      const people = [...new Set((sharedWith ?? []).filter((u) => u !== me))];
      const share: FileShare = { token: Math.random().toString(36).slice(2, 10), expires_on: addDays(SOCIAL_TODAY, days), created_by: me, created_at: now(), allow_download: allowDownload, ...(people.length ? { shared_with: people } : {}) };
      upd((s) => fileEv({ ...s, files: s.files.map((f) => (f.id === id ? { ...f, share } : f)) }, file, "share", people.length ? `با ${people.map(userName).join("، ")} · تا ${share.expires_on}` : `لینک تا ${share.expires_on}`));
      if (people.length) inbox.send(names(people), "new_content", `«${actingUser.name}» فایل «${file.name}» را با شما به اشتراک گذاشت (تا ${share.expires_on}).`, "/dashboard/files?view=shared");
      return share;
    },
    revokeShare: (id) =>
      upd((s) => {
        const f = s.files.find((x) => x.id === id);
        const next = { ...s, files: s.files.map((x) => (x.id === id ? { ...x, share: null } : x)) };
        return f ? fileEv(next, f, "unshare") : next;
      }),

    // ---------------------------------------------------------------- content
    saveContent: (kind, input) => {
      const id = input.id ?? nid(kind === "news" ? "news-" : kind === "blogs" ? "blog-" : "mag-");
      const pub = publishedAt(input);
      upd((s0) => {
        const s = withTags(s0, input.tags);
        const existing = s.content.find((x) => x.id === id);
        const base = {
          title: input.title,
          excerpt: input.excerpt,
          content: input.content,
          poster: input.poster,
          privacy: input.privacy,
          category_ids: input.category_ids,
          tags: input.tags,
          is_draft: input.is_draft,
          add_comment: input.add_comment,
          show_comment: input.show_comment,
          updated_at: now(),
          ...(input.content_format ? { content_format: input.content_format } : {}),
        };
        // «پیشنهادی» — ارسال برای بازبینی: پیش‌نویس می‌ماند و در صف بازبین‌ها قرار می‌گیرد
        const reviewOf = (prev?: ContentItem["review"]): ContentItem["review"] =>
          input.submit_review
            ? { status: "pending", submitted_by: me, submitted_at: now(), reviewed_by: null, reviewed_at: null, note: null, history: [...(prev?.history ?? []), { action: "submit", by: me, at: now() }] }
            : prev && prev.status !== "approved" && !input.is_draft
              ? // مدیر مطلبِ در صف را مستقیم منتشر کرد = تأیید بازبینی
                { ...prev, status: "approved", reviewed_by: me, reviewed_at: now(), history: [...prev.history, { action: "approve", by: me, at: now() }] }
              : prev;
        const ann = (prev?: Announcement | null): Announcement | null =>
          kind === "news" && input.announcement ? { requires_ack: input.announcement.requires_ack, pin_until: input.announcement.pin_until, acks: prev?.acks ?? {}, last_reminder_at: prev?.last_reminder_at ?? null } : null;
        if (existing)
          return {
            ...s,
            content: s.content.map((x) =>
              x.id === id ? { ...x, ...base, review: reviewOf(x.review), announcement: input.announcement === undefined ? x.announcement : ann(x.announcement), is_public: !input.is_draft, published_at: input.is_draft ? null : x.published_at ?? pub, attachments: [...x.attachments, ...(input.uploaded_files ?? [])] } : x
            ),
          };
        const item: ContentItem = { ...defaultScopeForNew(), ...base, review: reviewOf(null) ?? null, announcement: ann(), id, kind, user_id: me, is_active: true, is_public: !input.is_draft, attachments: input.uploaded_files ?? [], published_at: pub, created_at: now(), deleted_at: null, views: 0 };
        return { ...s, content: [item, ...s.content] };
      });
      if (input.submit_review) {
        const scope = store.content.find((x) => x.id === id) ?? defaultScopeForNew();
        const rv = holdersOf(`${contentPerm(kind)}.manage`, scope).filter((u) => u !== me);
        if (rv.length) inbox.send(names(rv), "reply", `«${actingUser.name}» ${contentKindLabel[kind]} «${input.title}» را برای بازبینی پیش از انتشار فرستاد.`, "/dashboard/settings?section=social&social_tab=review");
        upd((st) => modEv(st, { action: "review_submit", target_type: "content", target_id: id, target_title: input.title, owner_id: me }));
      }
      const cLink = `/dashboard/${kind === "news" ? "news" : kind === "blogs" ? "blog" : "magazines"}/${id}`;
      // منشن در متن بلاگ/خبر/مجله — فقط افراد تازه‌منشن‌شده و فقط پس از انتشار اعلان می‌گیرند
      if (!input.is_draft && !input.submit_review) {
        const prev = new Set(input.id ? mentionedIds(store.content.find((x) => x.id === input.id)?.content ?? "") : []);
        const fresh = mentionedIds(input.content).filter((u) => !prev.has(u) && u !== me);
        if (fresh.length) inbox.send(names(fresh), "mention", `«${actingUser.name}» شما را در ${contentKindLabel[kind]} «${input.title}» منشن کرد.`, cLink);
      }
      // اطلاعیه‌ی رسمی همیشه (و «فوری») به همه‌ی مخاطبان دامنه می‌رود
      if (!input.id && !input.is_draft && kind === "news" && input.announcement)
        inbox.send(
          audienceOf({ user_id: me, privacy: input.privacy, ...defaultScopeForNew() }).map(userName),
          "announcement",
          `اطلاعیه‌ی رسمی: «${input.title}»${input.announcement.requires_ack ? " — لطفاً پس از مطالعه «خواندم و پذیرفتم» را بزنید." : ""}`,
          cLink,
          { urgent: true }
        );
      else if (!input.id && !input.is_draft && input.send_notification) inbox.send(audienceFor(input.privacy), "new_content", `${contentKindLabel[kind]} جدید: «${input.title}»`, cLink);
      return id;
    },
    deleteContent: (id) => upd((s) => ({ ...s, content: s.content.filter((x) => x.id !== id), comments: s.comments.filter((c) => c.entity_id !== id) })),
    publishContent: (id, publish) =>
      upd((s) => ({
        ...s,
        content: s.content.map((x) =>
          x.id === id
            ? {
                ...x,
                is_public: publish,
                is_draft: publish ? false : x.is_draft,
                published_at: publish ? x.published_at ?? now() : x.published_at,
                updated_at: now(),
                // انتشار مستقیم مطلبِ در صف بازبینی = تأیید آن
                review: publish && x.review && x.review.status !== "approved" ? { ...x.review, status: "approved", reviewed_by: me, reviewed_at: now(), history: [...x.review.history, { action: "approve", by: me, at: now() }] } : x.review,
              }
            : x
        ),
      })),
    addContentAttachments: (id, files) => upd((s) => ({ ...s, content: s.content.map((x) => (x.id === id ? { ...x, attachments: [...x.attachments, ...files] } : x)) })),
    removeContentAttachment: (id, aid) => upd((s) => ({ ...s, content: s.content.map((x) => (x.id === id ? { ...x, attachments: x.attachments.filter((a) => a.id !== aid) } : x)) })),
    viewContent: (id) => upd((s) => ({ ...s, content: s.content.map((x) => (x.id === id ? { ...x, views: x.views + 1 } : x)), viewLog: [...s.viewLog, { entity: "content" as const, id, user_id: me, at: now() }].slice(-3000) })),
    acknowledge: (id) => upd((s) => ({ ...s, content: s.content.map((x) => (x.id === id && x.announcement && !x.announcement.acks[me] ? { ...x, announcement: { ...x.announcement, acks: { ...x.announcement.acks, [me]: now() } } } : x)) })),
    remindUnread: (id) => {
      const x = store.content.find((c) => c.id === id);
      if (!x?.announcement) return 0;
      const pending = audienceOf(x).filter((u) => !x.announcement!.acks[u]);
      if (!pending.length) return 0;
      upd((s) => ({ ...s, content: s.content.map((c) => (c.id === id && c.announcement ? { ...c, announcement: { ...c.announcement, last_reminder_at: now() } } : c)) }));
      inbox.send(pending.map(userName), "announcement", `یادآوری: اطلاعیه‌ی رسمی «${x.title}» را بخوانید و «خواندم و پذیرفتم» را بزنید.`, `/dashboard/news/${id}`, { urgent: true });
      return pending.length;
    },
    audienceOf,
    pinnedAnnouncements: () =>
      store.content
        .filter((x) => x.kind === "news" && x.announcement?.pin_until && x.is_public && !x.is_draft && canView(x) && (dayNum(x.announcement.pin_until) ?? 0) >= (dayNum(SOCIAL_TODAY) ?? 0))
        .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? "")),

    // ---------------------------------------------------------------- media
    saveMedia: (input) => {
      const id = input.id ?? nid("media-");
      const pub = publishedAt(input);
      upd((s0) => {
        const s = withTags(s0, input.tags);
        const existing = s.media.find((x) => x.id === id);
        const base = { caption: input.caption, post_type: input.post_type, poster: input.poster, privacy: input.privacy, category_ids: input.category_ids, tags: input.tags, is_draft: input.is_draft, add_comment: input.add_comment, show_comment: input.show_comment, updated_at: now() };
        if (existing) return { ...s, media: s.media.map((x) => (x.id === id ? { ...x, ...base, is_public: input.is_draft ? false : true, published_at: input.is_draft ? null : x.published_at ?? pub, attachments: [...x.attachments, ...(input.uploaded_files ?? [])] } : x)) };
        const m: MediaPost = { ...defaultScopeForNew(), ...base, id, user_id: me, is_active: true, is_public: !input.is_draft, attachments: input.uploaded_files ?? [], published_at: pub, created_at: now(), deleted_at: null };
        return { ...s, media: [m, ...s.media] };
      });
      if (!input.id && !input.is_draft && input.send_notification) inbox.send(audienceFor(input.privacy), "new_content", `رسانه‌ی جدید: «${input.caption}»`, `/dashboard/media/${id}`);
      return id;
    },
    deleteMedia: (id) => upd((s) => ({ ...s, media: s.media.filter((x) => x.id !== id) })),
    publishMedia: (id, publish) => upd((s) => ({ ...s, media: s.media.map((x) => (x.id === id ? { ...x, is_public: publish, is_draft: publish ? false : x.is_draft, published_at: publish ? x.published_at ?? now() : x.published_at } : x)) })),

    // ---------------------------------------------------------------- events
    saveEvent: (input) => {
      const id = input.id ?? nid("ev-");
      const pub = publishedAt(input);
      upd((s0) => {
        const s = withTags(s0, input.tags);
        const { uploaded_files, published_date: _d, published_time: _t, send_notification: _n, ...rest } = input;
        void _d;
        void _t;
        void _n;
        const existing = s.events.find((x) => x.id === id);
        if (existing) return { ...s, events: s.events.map((x) => (x.id === id ? { ...x, ...rest, id, is_public: input.is_draft ? false : true, published_at: input.is_draft ? null : x.published_at ?? pub, attachments: [...x.attachments, ...(uploaded_files ?? [])], updated_at: now() } : x)) };
        const ev: SocialEvent = { ...defaultScopeForNew(), ...rest, id, user_id: me, is_active: true, is_public: !input.is_draft, attachments: uploaded_files ?? [], published_at: pub, created_at: now(), updated_at: now(), deleted_at: null };
        return { ...s, events: [ev, ...s.events], eventMembers: [...s.eventMembers, { id: nid("em"), event_id: id, user_id: me, status: "joined", member_type: "owner", created_at: now(), updated_at: now() }] };
      });
      if (!input.id && !input.is_draft && input.send_notification) inbox.send(audienceFor(input.privacy), "new_content", `رویداد جدید: «${input.title}» — ${input.start_date}`, `/dashboard/events/${id}`);
      return id;
    },
    deleteEvent: (id) => upd((s) => ({ ...s, events: s.events.filter((x) => x.id !== id), eventMembers: s.eventMembers.filter((m) => m.event_id !== id) })),
    publishEvent: (id, publish) => upd((s) => ({ ...s, events: s.events.map((x) => (x.id === id ? { ...x, is_public: publish, is_draft: publish ? false : x.is_draft, published_at: publish ? x.published_at ?? now() : x.published_at } : x)) })),
    eventMembersOf: (id) => store.eventMembers.filter((m) => m.event_id === id),
    participantCount: (id) => store.eventMembers.filter((m) => m.event_id === id && (m.status === "accepted" || m.status === "joined")).length,
    myEventStatus: (id) => store.eventMembers.find((m) => m.event_id === id && m.user_id === me),
    inviteToEvent: (id, userIds) => {
      const ev = store.events.find((x) => x.id === id);
      const fresh = userIds.filter((u) => !store.eventMembers.some((m) => m.event_id === id && m.user_id === u));
      if (!ev || !fresh.length) return 0;
      upd((s) => ({ ...s, eventMembers: [...s.eventMembers, ...fresh.map((u) => ({ id: nid("em"), event_id: id, user_id: u, status: "invited" as EventMemberStatus, member_type: "member" as const, created_at: now(), updated_at: now() }))] }));
      inbox.send(names(fresh), "event_invite", `«${actingUser.name}» شما را به رویداد «${ev.title}» (${ev.start_date} ساعت ${ev.start_time}) دعوت کرد.`, `/dashboard/events/${id}`);
      return fresh.length;
    },
    rsvp: (id, status) => {
      const ev = store.events.find((x) => x.id === id);
      if (!ev) return { ok: false, error: "رویداد پیدا نشد." };
      const mine = store.eventMembers.find((m) => m.event_id === id && m.user_id === me);
      const count = store.eventMembers.filter((m) => m.event_id === id && (m.status === "accepted" || m.status === "joined") && m.user_id !== me).length;
      if (status === "accepted" && ev.capacity > 0 && count >= ev.capacity) return { ok: false, error: "ظرفیت رویداد تکمیل است." };
      upd((s) => ({
        ...s,
        eventMembers: mine
          ? s.eventMembers.map((m) => (m === mine ? { ...m, status, updated_at: now() } : m))
          : [...s.eventMembers, { id: nid("em"), event_id: id, user_id: me, status, member_type: "member", created_at: now(), updated_at: now() }],
      }));
      if (ev.user_id !== me) inbox.send([userName(ev.user_id)], "event_invite", `«${actingUser.name}» دعوت رویداد «${ev.title}» را ${status === "accepted" ? "پذیرفت" : "رد کرد"}.`, `/dashboard/events/${id}`);
      return { ok: true };
    },
    joinEvent: (id) => {
      const ev = store.events.find((x) => x.id === id);
      if (!ev) return { ok: false, error: "رویداد پیدا نشد." };
      if (ev.privacy === "ME" && ev.user_id !== me) return { ok: false, error: "این رویداد خصوصی است." };
      if (ev.privacy === "FRIENDS" && !areFriends(me, ev.user_id) && ev.user_id !== me) return { ok: false, error: "فقط دوستان برگزارکننده می‌توانند عضو شوند." };
      const count = store.eventMembers.filter((m) => m.event_id === id && (m.status === "accepted" || m.status === "joined")).length;
      if (ev.capacity > 0 && count >= ev.capacity) return { ok: false, error: "ظرفیت رویداد تکمیل است." };
      const mine = store.eventMembers.find((m) => m.event_id === id && m.user_id === me);
      upd((s) => ({
        ...s,
        eventMembers: mine ? s.eventMembers.map((m) => (m === mine ? { ...m, status: "joined", updated_at: now() } : m)) : [...s.eventMembers, { id: nid("em"), event_id: id, user_id: me, status: "joined", member_type: "member", created_at: now(), updated_at: now() }],
      }));
      return { ok: true };
    },
    leaveEvent: (id) => upd((s) => ({ ...s, eventMembers: s.eventMembers.filter((m) => !(m.event_id === id && m.user_id === me && m.member_type !== "owner")) })),
    addEventMember: (id, userId) => {
      if (store.eventMembers.some((m) => m.event_id === id && m.user_id === userId)) return { ok: false, error: "این کاربر عضو رویداد است." };
      upd((s) => ({ ...s, eventMembers: [...s.eventMembers, { id: nid("em"), event_id: id, user_id: userId, status: "joined", member_type: "member", created_at: now(), updated_at: now() }] }));
      return { ok: true };
    },
    removeEventMember: (id, userId) => upd((s) => ({ ...s, eventMembers: s.eventMembers.filter((m) => !(m.event_id === id && m.user_id === userId && m.member_type !== "owner")) })),
    setEventRole: (id, userId, organizer) =>
      upd((s) => ({ ...s, eventMembers: s.eventMembers.map((m) => (m.event_id === id && m.user_id === userId && m.member_type !== "owner" ? { ...m, member_type: organizer ? "organizer" : "member", updated_at: now() } : m)) })),

    // ---------------------------------------------------------------- forums
    saveTopic: (input) => {
      const id = input.id ?? nid("tp-");
      const pub = publishedAt(input);
      upd((s0) => {
        const s = withTags(s0, input.tags);
        const existing = s.topics.find((x) => x.id === id);
        const base = { title: input.title, content: input.content, privacy: input.privacy, category_ids: input.category_ids, tags: input.tags, is_draft: input.is_draft, updated_at: now() };
        if (existing) return { ...s, topics: s.topics.map((x) => (x.id === id ? { ...x, ...base, is_public: !input.is_draft, published_at: input.is_draft ? null : x.published_at ?? pub, attachments: [...x.attachments, ...(input.uploaded_files ?? [])] } : x)) };
        const t: Topic = { ...defaultScopeForNew(), ...base, id, user_id: me, view_count: 0, is_pinned: false, is_locked: false, is_active: true, is_public: !input.is_draft, attachments: input.uploaded_files ?? [], published_at: pub, created_at: now(), deleted_at: null };
        return { ...s, topics: [t, ...s.topics] };
      });
      if (!input.id && !input.is_draft && input.send_notification) inbox.send(audienceFor(input.privacy), "new_content", `پرسش جدید: «${input.title}»`, `/dashboard/forum/${id}`);
      const ids = mentionedIds(input.content);
      if (ids.length) inbox.send(names(ids), "mention", `«${actingUser.name}» شما را در پرسش «${input.title}» منشن کرد.`, `/dashboard/forum/${id}`);
      return id;
    },
    deleteTopic: (id) => upd((s) => ({ ...s, topics: s.topics.filter((t) => t.id !== id), posts: s.posts.filter((p) => p.topic_id !== id) })),
    pinTopic: (id) => upd((s) => ({ ...s, topics: s.topics.map((t) => (t.id === id ? { ...t, is_pinned: !t.is_pinned } : t)) })),
    lockTopic: (id) => upd((s) => ({ ...s, topics: s.topics.map((t) => (t.id === id ? { ...t, is_locked: !t.is_locked } : t)) })),
    publishTopic: (id, publish) => upd((s) => ({ ...s, topics: s.topics.map((t) => (t.id === id ? { ...t, is_public: publish, is_draft: publish ? false : t.is_draft, published_at: publish ? t.published_at ?? now() : t.published_at } : t)) })),
    viewTopic: (id) => upd((s) => ({ ...s, topics: s.topics.map((t) => (t.id === id ? { ...t, view_count: t.view_count + 1 } : t)) })),
    createPost: (topicId, content, parentId = null, files = []) => {
      const t = store.topics.find((x) => x.id === topicId);
      if (!t) return { ok: false, error: "پرسش پیدا نشد." };
      if (t.is_locked && !hasPermission("forum.moderate")) return { ok: false, error: "این پرسش قفل شده و پاسخ جدید نمی‌پذیرد." };
      const p: ForumPost = { id: nid("pst"), topic_id: topicId, parent_id: parentId, user_id: me, content, attachments: files, tags: [], created_at: now(), updated_at: now(), deleted_at: null };
      upd((s) => ({ ...s, posts: [...s.posts, p], topics: s.topics.map((x) => (x.id === topicId ? { ...x, updated_at: now() } : x)) }));
      const parent = parentId ? store.posts.find((x) => x.id === parentId) : undefined;
      const notify = new Set<string>([t.user_id, ...(parent ? [parent.user_id] : []), ...store.posts.filter((x) => x.topic_id === topicId).map((x) => x.user_id)]);
      notify.delete(me);
      if (notify.size) inbox.send(names([...notify]), "reply", `«${actingUser.name}» در پرسش «${t.title}» پاسخ داد.`, `/dashboard/forum/${topicId}`);
      const ids = mentionedIds(content);
      if (ids.length) inbox.send(names(ids), "mention", `«${actingUser.name}» شما را در پرسش «${t.title}» منشن کرد.`, `/dashboard/forum/${topicId}`);
      return { ok: true, id: p.id };
    },
    voteTopic: (id, v) => {
      const t = store.topics.find((x) => x.id === id);
      if (!t) return { ok: false, error: "پرسش پیدا نشد." };
      if (t.user_id === me) return { ok: false, error: "به پرسش خودتان نمی‌توانید رأی دهید." };
      upd((s) => ({ ...s, topics: s.topics.map((x) => (x.id !== id ? x : { ...x, votes: toggleVote(x.votes, v, me) })) }));
      return { ok: true };
    },
    votePost: (id, v) => {
      const p = store.posts.find((x) => x.id === id);
      if (!p) return { ok: false, error: "پاسخ پیدا نشد." };
      if (p.user_id === me) return { ok: false, error: "به پاسخ خودتان نمی‌توانید رأی دهید." };
      upd((s) => ({ ...s, posts: s.posts.map((x) => (x.id !== id ? x : { ...x, votes: toggleVote(x.votes, v, me) })) }));
      return { ok: true };
    },
    acceptAnswer: (topicId, postId) => {
      const t = store.topics.find((x) => x.id === topicId);
      if (!t) return { ok: false, error: "پرسش پیدا نشد." };
      if (t.user_id !== me && !hasPermission("forum.moderate")) return { ok: false, error: "فقط صاحب پرسش یا ناظر می‌تواند پاسخ را بپذیرد." };
      const p = postId ? store.posts.find((x) => x.id === postId && x.topic_id === topicId && !x.deleted_at) : undefined;
      if (postId && !p) return { ok: false, error: "پاسخ پیدا نشد." };
      upd((s) => ({ ...s, topics: s.topics.map((x) => (x.id === topicId ? { ...x, accepted_post_id: postId, updated_at: now() } : x)) }));
      if (p && p.user_id !== me) inbox.send([userName(p.user_id)], "reply", `پاسخ شما در پرسش «${t.title}» به‌عنوان پاسخ پذیرفته شد.`, `/dashboard/forum/${topicId}`);
      return { ok: true };
    },
    markDuplicate: (topicId, targetId) => {
      const t = store.topics.find((x) => x.id === topicId);
      if (!t) return { ok: false, error: "پرسش پیدا نشد." };
      if (t.user_id !== me && !hasPermission("forum.moderate")) return { ok: false, error: "فقط صاحب پرسش یا ناظر می‌تواند پرسش را تکراری علامت بزند." };
      const target = targetId ? store.topics.find((x) => x.id === targetId) : undefined;
      if (targetId && (!target || targetId === topicId)) return { ok: false, error: "پرسش مقصد معتبر نیست." };
      if (target?.duplicate_of === topicId) return { ok: false, error: "پرسش مقصد خودش تکراریِ همین پرسش است." };
      upd((s) => ({ ...s, topics: s.topics.map((x) => (x.id === topicId ? { ...x, duplicate_of: targetId, is_locked: !!targetId, updated_at: now() } : x)) }));
      if (target && t.user_id !== me) inbox.send([userName(t.user_id)], "reply", `پرسش شما «${t.title}» تکراریِ «${target.title}» علامت خورد و قفل شد.`, `/dashboard/forum/${targetId}`);
      return { ok: true };
    },
    updatePost: (id, content) => upd((s) => ({ ...s, posts: s.posts.map((p) => (p.id === id ? { ...p, content, updated_at: now() } : p)) })),
    deletePost: (id) =>
      upd((s) => {
        const hasReplies = s.posts.some((p) => p.parent_id === id && !p.deleted_at);
        return { ...s, posts: hasReplies ? s.posts.map((p) => (p.id === id ? { ...p, deleted_at: now(), content: "" } : p)) : s.posts.filter((p) => p.id !== id) };
      }),

    // ---------------------------------------------------------------- messaging
    myChats: (type) => {
      const types = type ? (Array.isArray(type) ? type : [type]) : null;
      const lastSeq = (id: string) => Math.max(0, ...store.messages.filter((m) => m.chat_id === id).map((m) => m.seq));
      return store.chats.filter((c) => !c.deleted_at && (!types || types.includes(c.chat_type)) && c.members.some((m) => m.user_id === me)).sort((a, b) => lastSeq(b.id) - lastSeq(a.id));
    },
    chatMessages: (chatId) => store.messages.filter((m) => m.chat_id === chatId && (!m.moderation?.hidden || m.user_id === me || canModerate)).sort((a, b) => a.seq - b.seq),
    unreadCount: (chat) => {
      const lr = chat.last_read[me] ?? 0;
      return store.messages.filter((m) => m.chat_id === chat.id && m.seq > lr && m.user_id !== me).length;
    },
    lastMessage: (chatId) => store.messages.filter((m) => m.chat_id === chatId).sort((a, b) => b.seq - a.seq)[0],
    isMember: (chat, uid = me) => chat.members.some((m) => m.user_id === uid),
    chatRole: (chat, uid = me) => chat.members.find((m) => m.user_id === uid)?.role ?? null,
    createGroup: (input) => {
      const id = nid("grp");
      const memberIds = [...new Set([me, ...(input.member_ids ?? [])])];
      upd((s0) => {
        const s = withTags(s0, input.tags);
        const c: Chat = { id, chat_type: "group", title: input.title, description: input.description, slug: input.slug || id, parent: null, is_private: input.is_private, is_public: true, owner_id: me, members: memberIds.map((u) => ({ user_id: u, role: u === me ? "admin" : "member", joined_at: now() })), receiver: null, category_ids: input.category_ids, tags: input.tags, profile_photos: ["#0d9488"], wall_photo: null, muted_by: [], last_read: {}, created_at: now(), updated_at: now(), deleted_at: null };
        return { ...s, chats: [c, ...s.chats] };
      });
      if (memberIds.length > 1) inbox.send(names(memberIds), "chat_added", `«${actingUser.name}» شما را به گروه «${input.title}» اضافه کرد.`, `/dashboard/groups/${id}`);
      return id;
    },
    createChannel: (input) => {
      const id = nid("chn");
      upd((s0) => {
        const s = withTags(s0, input.tags);
        const c: Chat = { id, chat_type: "channel", title: input.title, description: input.description, slug: input.slug || id, parent: null, is_private: input.is_private, is_public: true, owner_id: me, members: [{ user_id: me, role: "admin", joined_at: now() }], receiver: null, category_ids: input.category_ids, tags: input.tags, profile_photos: ["#1f4f99"], wall_photo: null, muted_by: [], last_read: {}, created_at: now(), updated_at: now(), deleted_at: null };
        return { ...s, chats: [c, ...s.chats] };
      });
      return id;
    },
    createSubChat: (parentId, input) => {
      const parent = store.chats.find((c) => c.id === parentId);
      const id = nid(parent?.chat_type === "channel" ? "sub" : "tpc");
      if (!parent) return id;
      upd((s) => ({ ...s, chats: [{ ...parent, id, parent: parentId, title: input.title, description: input.description, slug: input.slug || id, is_private: input.is_private, category_ids: input.category_ids, tags: input.tags, owner_id: me, last_read: {}, muted_by: [], created_at: now(), updated_at: now() }, ...s.chats] }));
      return id;
    },
    openDirect: (userId, firstMessage) => {
      const existing = store.chats.find((c) => c.chat_type === "direct_message" && c.members.some((m) => m.user_id === me) && c.members.some((m) => m.user_id === userId));
      const id = existing?.id ?? nid("dm");
      // POST /direct-messages/ (target_user_id + content): گفتگو و اولین پیام با هم ساخته می‌شوند
      upd((s) => {
        let next = s;
        if (!existing)
          next = {
            ...next,
            chats: [{ id, chat_type: "direct_message", title: userName(userId), description: "", slug: id, parent: null, is_private: true, is_public: false, owner_id: me, members: [me, userId].map((u) => ({ user_id: u, role: "member" as ChatRole, joined_at: now() })), receiver: userId, category_ids: [], tags: [], profile_photos: [], wall_photo: null, muted_by: [], last_read: {}, created_at: now(), updated_at: now(), deleted_at: null }, ...next.chats],
          };
        if (firstMessage?.trim()) {
          const seq = next.seq + 1;
          next = { ...next, seq, messages: [...next.messages, { id: nid("msg"), chat_id: id, user_id: me, content: firstMessage, type: "text", parent_message_id: null, attachments: [], tags: [], forwarded_from: null, seq, created_at: now(), updated_at: now(), edited: false }] };
        }
        return next;
      });
      if (firstMessage?.trim()) inbox.send([userName(userId)], "direct_message", `پیام جدید از «${actingUser.name}»: ${firstMessage.slice(0, 70)}`, `/dashboard/chat/${id}`);
      return id;
    },
    ensureSaved: () => {
      const existing = store.chats.find((c) => c.chat_type === "saved_messages" && c.owner_id === me);
      if (existing) return existing.id;
      const id = `saved-${me}`;
      upd((s) => (s.chats.some((c) => c.id === id) ? s : { ...s, chats: [...s.chats, { id, chat_type: "saved_messages", title: "پیام‌های ذخیره‌شده", description: "", slug: id, parent: null, is_private: true, is_public: false, owner_id: me, members: [{ user_id: me, role: "admin", joined_at: now() }], receiver: null, category_ids: [], tags: [], profile_photos: [], wall_photo: null, muted_by: [], last_read: {}, created_at: now(), updated_at: now(), deleted_at: null }] }));
      return id;
    },
    sendMessage: (chatId, input) => {
      const chat = store.chats.find((c) => c.id === chatId);
      if (!chat) return { ok: false, error: "گفتگو پیدا نشد." };
      if (!chat.members.some((m) => m.user_id === me)) return { ok: false, error: "برای ارسال پیام ابتدا عضو شوید." };
      if (chat.chat_type === "channel" && chat.members.find((m) => m.user_id === me)?.role !== "admin") return { ok: false, error: "در کانال فقط مدیران می‌توانند پیام بفرستند." };
      if (chat.chat_type === "direct_message" && chat.receiver && store.friendships.some((f) => f.status === "blocked" && ((f.sender_id === me && f.receiver_id === chat.receiver) || (f.receiver_id === me && f.sender_id === chat.receiver))))
        return { ok: false, error: "به دلیل مسدودسازی، ارسال پیام ممکن نیست." };
      if (!input.content.trim() && !input.uploaded_files?.length) return { ok: false, error: "پیام خالی است." };
      let newSeq = 0;
      upd((s0) => {
        const s = withTags(s0, input.tags ?? []);
        newSeq = s.seq + 1;
        const m: Message = {
          id: nid("msg"),
          chat_id: chatId,
          user_id: me,
          content: input.content,
          type: input.type ?? "text",
          parent_message_id: input.parent_message_id ?? null,
          attachments: input.uploaded_files ?? [],
          tags: input.tags ?? [],
          forwarded_from: null,
          seq: newSeq,
          created_at: now(),
          updated_at: now(),
          edited: false,
          ...(input.in_thread && input.parent_message_id ? { in_thread: true } : {}),
          ...(input.mentions?.length ? { mentions: input.mentions } : {}),
          ...(input.preview_hidden ? { preview_hidden: true } : {}),
        };
        return { ...s, seq: newSeq, messages: [...s.messages, m], chats: s.chats.map((c) => (c.id === chatId ? { ...c, updated_at: now(), last_read: { ...c.last_read, [me]: newSeq } } : c)) };
      });
      const link = chat.chat_type === "channel" ? `/dashboard/channels/${chat.parent ?? chatId}` : chat.chat_type === "group" ? `/dashboard/groups/${chat.parent ?? chatId}` : `/dashboard/chat/${chatId}`;
      const listeners = chat.members.map((m) => m.user_id).filter((u) => u !== me && !chat.muted_by.includes(u));
      const isChatAdmin = chat.members.find((m) => m.user_id === me)?.role === "admin" || chat.owner_id === me;
      // «@همه» فقط برای مدیران گروه/کانال همه‌ی اعضا را خبر می‌کند
      const all = isChatAdmin && (chat.chat_type === "group" || chat.chat_type === "channel") && input.content.includes(MENTION_ALL);
      const ids = (all ? chat.members.map((m) => m.user_id).filter((u) => u !== me) : mentionedIds(input.content, input.mentions)).filter((u) => chat.members.some((m) => m.user_id === u));
      const preview = input.content.length > 70 ? `${input.content.slice(0, 70)}…` : input.content;
      const thread = !!(input.in_thread && input.parent_message_id);
      if (chat.chat_type === "direct_message") inbox.send(names(listeners), "direct_message", `پیام جدید از «${actingUser.name}»: ${preview}`, link);
      if (ids.length) inbox.send(names(ids), "mention", `«${actingUser.name}» شما را در «${chat.title}» منشن کرد: ${preview}`, link);
      if (thread) {
        // پاسخ در رشته فقط به شرکت‌کنندگان همان رشته (که گفتگو را بی‌صدا نکرده‌اند) اطلاع داده می‌شود
        const root = store.messages.find((m) => m.id === input.parent_message_id);
        const people = new Set([root?.user_id ?? "", ...store.messages.filter((m) => m.in_thread && m.parent_message_id === input.parent_message_id).map((m) => m.user_id)]);
        const to = [...people].filter((u) => u && u !== me && !ids.includes(u) && (u === root?.user_id || !chat.muted_by.includes(u)));
        if (to.length) inbox.send(names(to), "reply", `«${actingUser.name}» در رشته‌ی گفتگو در «${chat.title}» پاسخ داد: ${preview}`, link);
        return { ok: true };
      }
      if (chat.chat_type === "channel") inbox.send(names(listeners.filter((u) => !ids.includes(u))), "channel_message", `پیام جدید در کانال «${chat.title}»: ${preview}`, link);
      if (chat.chat_type === "group") inbox.send(names(listeners.filter((u) => !ids.includes(u))), "group_message", `${actingUser.name} در گروه «${chat.title}»: ${preview}`, link);
      if (input.parent_message_id) {
        const parent = store.messages.find((m) => m.id === input.parent_message_id);
        if (parent && parent.user_id !== me && !ids.includes(parent.user_id)) inbox.send([userName(parent.user_id)], "reply", `«${actingUser.name}» به پیام شما در «${chat.title}» پاسخ داد.`, link);
      }
      return { ok: true };
    },
    editMessage: (id, content) => upd((s) => ({ ...s, messages: s.messages.map((m) => (m.id === id ? { ...m, content, edited: true, updated_at: now() } : m)) })),
    // حذف پیام ریشه، پاسخ‌های رشته‌اش را هم حذف می‌کند و از سنجاق‌ها برداشته می‌شود
    deleteMessage: (id) =>
      upd((s) => ({
        ...s,
        // نظرسنجیِ پیوست پیام هم حذف می‌شود
        polls: s.polls.filter((p) => p.message_id !== id),
        messages: s.messages.filter((m) => m.id !== id && !(m.in_thread && m.parent_message_id === id)),
        chats: s.chats.map((c) => (c.pinned_message_ids?.includes(id) ? { ...c, pinned_message_ids: c.pinned_message_ids.filter((x) => x !== id) } : c)),
      })),
    toggleMessageReaction: (id, code) =>
      upd((s) => ({
        ...s,
        messages: s.messages.map((m) => {
          if (m.id !== id) return m;
          const cur = m.reactions?.[code] ?? [];
          const next = { ...(m.reactions ?? {}), [code]: cur.includes(me) ? cur.filter((u) => u !== me) : [...cur, me] };
          if (!next[code].length) delete next[code];
          return { ...m, reactions: next };
        }),
      })),
    togglePinMessage: (chatId, messageId) => {
      const c = store.chats.find((x) => x.id === chatId);
      if (!c) return { ok: false, error: "گفتگو پیدا نشد." };
      const pins = c.pinned_message_ids ?? [];
      if (!pins.includes(messageId) && pins.length >= MAX_PINNED) return { ok: false, error: `حداکثر ${fa(MAX_PINNED)} پیام را می‌توان سنجاق کرد؛ ابتدا یکی را بردارید.` };
      upd((s) => ({ ...s, chats: s.chats.map((x) => (x.id === chatId ? { ...x, pinned_message_ids: pins.includes(messageId) ? pins.filter((p) => p !== messageId) : [...pins, messageId] } : x)) }));
      return { ok: true };
    },
    forwardMessage: (id, chatId) =>
      upd((s) => {
        const src = s.messages.find((m) => m.id === id);
        const target = s.chats.find((c) => c.id === chatId);
        const role = target?.members.find((m) => m.user_id === me)?.role;
        // فقط به گفتگویی که عضوش هستم؛ در کانال فقط اگر مدیر باشم
        if (!src || !target || !role || (target.chat_type === "channel" && role !== "admin")) return s;
        const seq = s.seq + 1;
        return { ...s, seq, messages: [...s.messages, { ...src, id: nid("msg"), chat_id: chatId, user_id: me, parent_message_id: null, forwarded_from: { chat_id: src.chat_id, user_id: src.user_id }, seq, created_at: now(), updated_at: now(), edited: false }] };
      }),
    saveMessage: (id) => {
      const saved = value.ensureSaved();
      setTimeout(() => value.forwardMessage(id, saved), 0);
    },
    markRead: (chatId) =>
      upd((s) => {
        const top = Math.max(0, ...s.messages.filter((m) => m.chat_id === chatId).map((m) => m.seq));
        return { ...s, chats: s.chats.map((c) => (c.id === chatId && (c.last_read[me] ?? 0) < top ? { ...c, last_read: { ...c.last_read, [me]: top } } : c)) };
      }),
    toggleMute: (chatId) => upd((s) => ({ ...s, chats: s.chats.map((c) => (c.id === chatId ? { ...c, muted_by: c.muted_by.includes(me) ? c.muted_by.filter((u) => u !== me) : [...c.muted_by, me] } : c)) })),
    joinChat: (chatId) => {
      const c = store.chats.find((x) => x.id === chatId);
      if (!c) return { ok: false, error: "پیدا نشد." };
      if (c.is_private && !isAdminish) return { ok: false, error: "این گفتگو خصوصی است؛ فقط با دعوت مدیر می‌توانید عضو شوید." };
      // عضویت در گروه/کانال به تاپیک‌ها و زیرکانال‌هایش هم سرایت می‌کند
      upd((s) => ({ ...s, chats: s.chats.map((x) => ((x.id === chatId || x.parent === chatId) && !x.members.some((m) => m.user_id === me) ? { ...x, members: [...x.members, { user_id: me, role: "member", joined_at: now() }] } : x)) }));
      return { ok: true };
    },
    leaveChat: (chatId) => {
      const c = store.chats.find((x) => x.id === chatId);
      if (!c) return { ok: false, error: "پیدا نشد." };
      if (c.owner_id === me) return { ok: false, error: "مالک نمی‌تواند خارج شود؛ ابتدا گفتگو را حذف یا مالکیت را منتقل کنید." };
      upd((s) => ({ ...s, chats: s.chats.map((x) => (x.id === chatId || x.parent === chatId ? { ...x, members: x.members.filter((m) => m.user_id !== me) } : x)) }));
      return { ok: true };
    },
    addChatMember: (chatId, userId, role = "member") => {
      const c = store.chats.find((x) => x.id === chatId);
      const isNew = c && !c.members.some((m) => m.user_id === userId);
      upd((s) => ({
        ...s,
        chats: s.chats.map((x) =>
          x.id !== chatId && x.parent !== chatId ? x : x.members.some((m) => m.user_id === userId) ? { ...x, members: x.members.map((m) => (m.user_id === userId ? { ...m, role } : m)) } : { ...x, members: [...x.members, { user_id: userId, role, joined_at: now() }] }
        ),
      }));
      if (c && isNew) inbox.send([userName(userId)], "chat_added", `«${actingUser.name}» شما را به ${c.chat_type === "channel" ? "کانال" : "گروه"} «${c.title}» اضافه کرد.`, `/dashboard/${c.chat_type === "channel" ? "channels" : "groups"}/${chatId}`);
    },
    removeChatMember: (chatId, userId) => upd((s) => ({ ...s, chats: s.chats.map((x) => ((x.id === chatId || x.parent === chatId) && x.owner_id !== userId ? { ...x, members: x.members.filter((m) => m.user_id !== userId) } : x)) })),
    updateChat: (chatId, patch) => upd((s) => ({ ...s, chats: s.chats.map((x) => (x.id === chatId ? { ...x, ...patch, updated_at: now() } : x)) })),
    deleteChat: (chatId) => upd((s) => ({ ...s, chats: s.chats.filter((x) => x.id !== chatId && x.parent !== chatId), messages: s.messages.filter((m) => m.chat_id !== chatId) })),

    // ---------------------------------------------------------------- relations
    relationWith: (userId) => {
      const f = store.friendships.find((x) => (x.sender_id === me && x.receiver_id === userId) || (x.sender_id === userId && x.receiver_id === me));
      if (!f || f.status === "declined") return { f, state: "none" };
      if (f.status === "blocked") return { f, state: f.blocked_by === me ? "blocked" : "blocked_me" };
      if (f.status === "accepted") return { f, state: "friends" };
      return { f, state: f.sender_id === me ? "sent" : "received" };
    },
    sendFriendRequest: (userId) => {
      const rel = value.relationWith(userId);
      if (rel.state === "blocked" || rel.state === "blocked_me") return { ok: false, error: "ارتباط با این کاربر مسدود است." };
      if (rel.state !== "none") return { ok: false, error: "درخواست یا دوستی از قبل وجود دارد." };
      const max = Number(store.settings.find((s) => s.key === "relations.friendships.max_friends")?.value ?? 1000);
      if (friendIds().length >= max) return { ok: false, error: `سقف ${max} دوست پر شده است.` };
      upd((s) => ({ ...s, friendships: [...s.friendships.filter((f) => f !== rel.f), { id: nid("fr"), sender_id: me, receiver_id: userId, status: "pending", blocked_by: null, created_at: now(), updated_at: now() }] }));
      inbox.send([userName(userId)], "friend_request", `«${actingUser.name}» برای شما درخواست ارتباط فرستاد.`, "/dashboard/connections?tab=requests");
      return { ok: true };
    },
    respondFriend: (id, accept) => {
      const f = store.friendships.find((x) => x.id === id);
      upd((s) => ({ ...s, friendships: s.friendships.map((x) => (x.id === id ? { ...x, status: accept ? "accepted" : "declined", updated_at: now() } : x)) }));
      if (f) inbox.send([userName(f.sender_id)], accept ? "friend_accept" : "friend_reject", accept ? `«${actingUser.name}» درخواست ارتباط شما را پذیرفت.` : `«${actingUser.name}» درخواست ارتباط شما را نپذیرفت.`, "/dashboard/connections");
    },
    cancelFriendRequest: (id) => upd((s) => ({ ...s, friendships: s.friendships.filter((x) => x.id !== id) })),
    unfriend: (id) => upd((s) => ({ ...s, friendships: s.friendships.filter((x) => x.id !== id) })),
    blockUser: (userId) =>
      upd((s) => {
        const f = s.friendships.find((x) => (x.sender_id === me && x.receiver_id === userId) || (x.sender_id === userId && x.receiver_id === me));
        const rec: Friendship = { id: f?.id ?? nid("fr"), sender_id: me, receiver_id: userId, status: "blocked", blocked_by: me, created_at: f?.created_at ?? now(), updated_at: now() };
        return { ...s, friendships: [...s.friendships.filter((x) => x !== f), rec] };
      }),
    unblock: (id) => upd((s) => ({ ...s, friendships: s.friendships.filter((x) => x.id !== id) })),

    // ---------------------------------------------------------------- dashboards (هم‌شکل DashboardStats)
    dashboard: (module, who) => {
      const mine = who === "user";
      const st = (title: string, value: number, key: string): DashboardStat => ({ title, value, key });
      const pub = <T extends { is_public: boolean; is_draft: boolean }>(a: T[]) => a.filter((x) => x.is_public && !x.is_draft).length;
      switch (module) {
        case "content": {
          const c = mine ? store.content.filter((x) => x.user_id === me) : store.content;
          return [
            st("مجله‌ی منتشرشده", pub(c.filter((x) => x.kind === "magazines")), "magazines_published"),
            st("خبر منتشرشده", pub(c.filter((x) => x.kind === "news")), "news_published"),
            st("بلاگ منتشرشده", pub(c.filter((x) => x.kind === "blogs")), "blogs_published"),
            st("پیش‌نویس", c.filter((x) => x.is_draft).length, "drafts"),
            st("بازدید", c.reduce((a, x) => a + x.views, 0), "views"),
            st("نظر در انتظار تأیید", store.comments.filter((x) => !x.approved && ["news", "blog", "magazine"].includes(x.entity_name) && (!mine || c.some((i) => i.id === x.entity_id))).length, "comments_pending"),
          ];
        }
        case "media": {
          const m = mine ? store.media.filter((x) => x.user_id === me) : store.media;
          return [st("پست رسانه", pub(m), "posts"), st("تصویر", m.filter((x) => x.post_type === "image").length, "images"), st("ویدیو", m.filter((x) => x.post_type === "video").length, "videos"), st("آلبوم", m.filter((x) => x.post_type === "album").length, "albums")];
        }
        case "events": {
          const ids = mine ? store.eventMembers.filter((x) => x.user_id === me).map((x) => x.event_id) : store.events.map((x) => x.id);
          const evs = store.events.filter((x) => ids.includes(x.id));
          const today = dayNum(SOCIAL_TODAY) ?? 0;
          return [
            st("رویداد", evs.length, "events"),
            st("پیش‌رو", evs.filter((x) => (dayNum(x.start_date) ?? 0) >= today).length, "upcoming"),
            st(mine ? "دعوت پاسخ‌داده‌نشده" : "دعوت در انتظار پاسخ", store.eventMembers.filter((x) => x.status === "invited" && (!mine || x.user_id === me)).length, "pending_invitations"),
            st("شرکت‌کننده", store.eventMembers.filter((x) => ids.includes(x.event_id) && (x.status === "accepted" || x.status === "joined")).length, "participants"),
          ];
        }
        case "forums": {
          const t = mine ? store.topics.filter((x) => x.user_id === me) : store.topics;
          const p = mine ? store.posts.filter((x) => x.user_id === me) : store.posts;
          return [st("پرسش", t.length, "topics"), st("پاسخ", p.filter((x) => !x.deleted_at).length, "posts"), st("بی‌پاسخ", t.filter((x) => !store.posts.some((y) => y.topic_id === x.id)).length, "unanswered"), st("بازدید", t.reduce((a, x) => a + x.view_count, 0), "views")];
        }
        case "messaging": {
          const cs = mine ? store.chats.filter((c) => c.members.some((m) => m.user_id === me)) : store.chats;
          const ids = new Set(cs.map((c) => c.id));
          return [
            st("گروه", cs.filter((c) => c.chat_type === "group" && !c.parent).length, "groups"),
            st("کانال", cs.filter((c) => c.chat_type === "channel" && !c.parent).length, "channels"),
            st("گفتگوی مستقیم", cs.filter((c) => c.chat_type === "direct_message").length, "direct_messages"),
            st(mine ? "پیام نخوانده" : "پیام", mine ? cs.reduce((a, c) => a + value.unreadCount(c), 0) : store.messages.filter((m) => ids.has(m.chat_id)).length, mine ? "unread" : "messages"),
          ];
        }
        case "relations": {
          const f = mine ? store.friendships.filter((x) => x.sender_id === me || x.receiver_id === me) : store.friendships;
          return [
            st("ارتباط برقرارشده", f.filter((x) => x.status === "accepted").length, "friends"),
            st(mine ? "درخواست دریافتی" : "درخواست در انتظار", f.filter((x) => x.status === "pending" && (!mine || x.receiver_id === me)).length, "requests"),
            st("درخواست ارسالی", f.filter((x) => x.status === "pending" && (!mine || x.sender_id === me)).length, "sent"),
            st("مسدود", f.filter((x) => x.status === "blocked" && (!mine || x.blocked_by === me)).length, "blocked"),
          ];
        }
      }
    },
    resetSocial: () => setStore(initial()),

    // ---------------------------------------------------------------- «پیشنهادی» — بازبینی پیش از انتشار
    reviewersOf: (item) => holdersOf(`${contentPerm(item.kind)}.manage`, item),
    submitForReview: (id, note) => {
      const x = store.content.find((c) => c.id === id);
      if (!x) return { ok: false, error: "مطلب پیدا نشد." };
      if (x.user_id !== me) return { ok: false, error: "فقط نویسنده می‌تواند مطلب را برای بازبینی بفرستد." };
      if (x.review?.status === "pending") return { ok: false, error: "این مطلب از قبل در انتظار بازبینی است." };
      upd((s) =>
        modEv(
          { ...s, content: s.content.map((c) => (c.id === id ? { ...c, is_draft: true, is_public: false, updated_at: now(), review: { status: "pending", submitted_by: me, submitted_at: now(), reviewed_by: null, reviewed_at: null, note: null, history: [...(c.review?.history ?? []), { action: "submit", by: me, at: now(), ...(note ? { note } : {}) }] } } : c)) },
          { action: "review_submit", target_type: "content", target_id: id, target_title: x.title, owner_id: x.user_id, note }
        )
      );
      const rv = holdersOf(`${contentPerm(x.kind)}.manage`, x).filter((u) => u !== me);
      if (rv.length) inbox.send(names(rv), "reply", `«${actingUser.name}» ${contentKindLabel[x.kind]} «${x.title}» را برای بازبینی پیش از انتشار فرستاد.`, "/dashboard/settings?section=social&social_tab=review");
      return { ok: true };
    },
    approveReview: (id, note) => {
      const x = store.content.find((c) => c.id === id);
      if (!x) return { ok: false, error: "مطلب پیدا نشد." };
      if (!hasPermission(`${contentPerm(x.kind)}.manage`)) return { ok: false, error: "فقط مدیر این بخش می‌تواند تأیید و منتشر کند." };
      upd((s) =>
        modEv(
          {
            ...s,
            content: s.content.map((c) =>
              c.id === id ? { ...c, is_draft: false, is_public: true, published_at: c.published_at ?? now(), updated_at: now(), review: { ...(c.review ?? { submitted_by: c.user_id, submitted_at: now(), history: [] }), status: "approved", reviewed_by: me, reviewed_at: now(), note: note ?? null, history: [...(c.review?.history ?? []), { action: "approve", by: me, at: now(), ...(note ? { note } : {}) }] } } : c
            ),
          },
          { action: "review_approve", target_type: "content", target_id: id, target_title: x.title, owner_id: x.user_id, note }
        )
      );
      const link = `/dashboard/${x.kind === "news" ? "news" : x.kind === "blogs" ? "blog" : "magazines"}/${id}`;
      if (x.user_id !== me) inbox.send([userName(x.user_id)], "reply", `${contentKindLabel[x.kind]} «${x.title}» پس از بازبینی تأیید و منتشر شد.${note ? ` یادداشت بازبین: «${note}»` : ""}`, link);
      return { ok: true };
    },
    returnReview: (id, note) => {
      const x = store.content.find((c) => c.id === id);
      if (!x) return { ok: false, error: "مطلب پیدا نشد." };
      if (!hasPermission(`${contentPerm(x.kind)}.manage`)) return { ok: false, error: "فقط مدیر این بخش می‌تواند مطلب را برگرداند." };
      if (!note.trim()) return { ok: false, error: "یادداشت برگشت الزامی است." };
      upd((s) =>
        modEv(
          {
            ...s,
            content: s.content.map((c) =>
              c.id === id ? { ...c, is_draft: true, is_public: false, updated_at: now(), review: { ...(c.review ?? { submitted_by: c.user_id, submitted_at: now(), history: [] }), status: "returned", reviewed_by: me, reviewed_at: now(), note: note.trim(), history: [...(c.review?.history ?? []), { action: "return", by: me, at: now(), note: note.trim() }] } } : c
            ),
          },
          { action: "review_return", target_type: "content", target_id: id, target_title: x.title, owner_id: x.user_id, note: note.trim() }
        )
      );
      const link = `/dashboard/${x.kind === "news" ? "news" : x.kind === "blogs" ? "blog" : "magazines"}/${id}`;
      if (x.user_id !== me) inbox.send([userName(x.user_id)], "reply", `${contentKindLabel[x.kind]} «${x.title}» برای اصلاح برگشت خورد: «${note.trim()}»`, link);
      return { ok: true };
    },

    // ---------------------------------------------------------------- «پیشنهادی» — گزارش تخلف و نظارت
    canModerate,
    reportAbuse: (input) => {
      if (input.target_owner_id === me) return { ok: false, error: "نمی‌توانید مورد خودتان را گزارش کنید." };
      if (store.reports.some((r) => r.reporter_id === me && r.target_type === input.target_type && r.target_id === input.target_id && r.status === "open")) return { ok: false, error: "گزارش شما درباره‌ی این مورد قبلاً ثبت شده و در صف بررسی است." };
      const r: AbuseReport = { ...input, id: nid("rp"), reporter_id: me, status: "open", created_at: now(), note: input.note.trim() };
      upd((s) => modEv({ ...s, reports: [r, ...s.reports] }, { action: "report", target_type: input.target_type, target_id: input.target_id, target_title: input.target_excerpt, owner_id: input.target_owner_id, note: input.note.trim(), report_id: r.id }));
      const mods = users.filter((u) => u.id !== me && effectiveOf(u.id, ROOT_ID).has("comments.moderate")).map((u) => u.id);
      if (mods.length) inbox.send(names(mods), "reply", `گزارش تخلف تازه (${input.target_type === "content" ? "محتوا" : input.target_type === "comment" ? "نظر" : input.target_type === "message" ? "پیام" : "رسانه"}): «${input.target_excerpt.slice(0, 50)}»`, "/dashboard/settings?section=social&social_tab=reports");
      return { ok: true, id: r.id };
    },
    myReportOn: (type, id) => store.reports.find((r) => r.reporter_id === me && r.target_type === type && r.target_id === id),
    resolveReport: (id, decision, note) => {
      const r = store.reports.find((x) => x.id === id);
      if (!r) return { ok: false, error: "گزارش پیدا نشد." };
      if (!canModerate) return { ok: false, error: "فقط ناظران می‌توانند گزارش‌ها را رسیدگی کنند." };
      if (decision !== "dismiss" && !note.trim()) return { ok: false, error: "دلیل اقدام را بنویسید (در لاگ ممیزی و اعلان صاحب مورد ثبت می‌شود)." };
      const mod: Moderation = { hidden: true, by: me, at: now(), reason: note.trim() || "گزارش تخلف", report_id: id };
      const status = decision === "dismiss" ? "dismissed" : decision === "hide" ? "hidden" : "removed";
      upd((s0) => {
        let s: Store = { ...s0, reports: s0.reports.map((x) => (x.id === id || (decision !== "dismiss" && x.status === "open" && x.target_type === r.target_type && x.target_id === r.target_id) ? { ...x, status, resolved_by: me, resolved_at: now(), resolution_note: note.trim() || null } : x)) };
        if (decision === "hide") {
          if (r.target_type === "content") s = { ...s, content: s.content.map((x) => (x.id === r.target_id ? { ...x, moderation: mod } : x)) };
          if (r.target_type === "media") s = { ...s, media: s.media.map((x) => (x.id === r.target_id ? { ...x, moderation: mod } : x)) };
          if (r.target_type === "comment") s = { ...s, comments: s.comments.map((x) => (x.id === r.target_id ? { ...x, moderation: mod } : x)) };
          if (r.target_type === "message") s = { ...s, messages: s.messages.map((x) => (x.id === r.target_id ? { ...x, moderation: mod } : x)) };
        }
        if (decision === "remove_warn") {
          if (r.target_type === "content") s = { ...s, content: s.content.filter((x) => x.id !== r.target_id), comments: s.comments.filter((c) => c.entity_id !== r.target_id) };
          if (r.target_type === "media") s = { ...s, media: s.media.filter((x) => x.id !== r.target_id) };
          if (r.target_type === "comment") s = { ...s, comments: s.comments.filter((x) => x.id !== r.target_id && x.parent_id !== r.target_id) };
          if (r.target_type === "message") s = { ...s, messages: s.messages.filter((x) => x.id !== r.target_id && !(x.in_thread && x.parent_message_id === r.target_id)) };
        }
        return modEv(s, { action: decision, target_type: r.target_type, target_id: r.target_id, target_title: r.target_excerpt, owner_id: r.target_owner_id, note: note.trim() || undefined, report_id: id });
      });
      if (decision !== "dismiss" && r.target_owner_id !== me)
        inbox.send(
          [userName(r.target_owner_id)],
          decision === "remove_warn" ? "announcement" : "reply",
          decision === "remove_warn" ? `اخطار ناظر: «${r.target_excerpt.slice(0, 50)}» به دلیل «${note.trim()}» حذف شد. تکرار تخلف به محدودیت حساب منجر می‌شود.` : `ناظر «${r.target_excerpt.slice(0, 50)}» را برای دیگران پنهان کرد: «${note.trim()}»`,
          "/dashboard/notifications",
          decision === "remove_warn" ? { urgent: true } : undefined
        );
      if (r.reporter_id !== me) inbox.send([userName(r.reporter_id)], "reply", decision === "dismiss" ? `گزارش شما بررسی شد؛ تخلفی احراز نشد.${note.trim() ? ` («${note.trim()}»)` : ""}` : "گزارش شما بررسی و اقدام لازم انجام شد. سپاس از همراهی‌تان.", "/dashboard/notifications");
      return { ok: true };
    },
    unhide: (type, id) =>
      upd((s0) => {
        const src = type === "content" ? s0.content.find((x) => x.id === id) : type === "media" ? s0.media.find((x) => x.id === id) : type === "comment" ? s0.comments.find((x) => x.id === id) : s0.messages.find((x) => x.id === id);
        if (!src) return s0;
        const title = "title" in src ? src.title : "caption" in src ? src.caption : src.content.slice(0, 60);
        const clear = <T extends { id: string; moderation?: Moderation | null }>(arr: T[]) => arr.map((x) => (x.id === id ? { ...x, moderation: null } : x));
        const s =
          type === "content" ? { ...s0, content: clear(s0.content) } : type === "media" ? { ...s0, media: clear(s0.media) } : type === "comment" ? { ...s0, comments: clear(s0.comments) } : { ...s0, messages: clear(s0.messages) };
        return modEv(s, { action: "unhide", target_type: type, target_id: id, target_title: title, owner_id: src.user_id });
      }),

    // ---------------------------------------------------------------- «پیشنهادی» — آمار و فایل
    viewMedia: (id) => upd((s) => ({ ...s, viewLog: [...s.viewLog, { entity: "media" as const, id, user_id: me, at: now() }].slice(-3000) })),
    viewsOf: (entity, id) => store.viewLog.filter((v) => v.entity === entity && v.id === id),
    renameFile: (id, name) => {
      const f = store.files.find((x) => x.id === id);
      const n = name.trim();
      if (!f) return { ok: false, error: "فایل پیدا نشد." };
      if (!n) return { ok: false, error: "نام فایل را وارد کنید." };
      if (n === f.name) return { ok: true };
      upd((s) => fileEv({ ...s, files: s.files.map((x) => (x.id === id ? { ...x, name: n } : x)) }, { id, name: n }, "rename", `از «${f.name}»`));
      return { ok: true };
    },
    logFileDownload: (id) =>
      upd((s) => {
        const f = s.files.find((x) => x.id === id);
        return f ? fileEv(s, f, "download") : s;
      }),
    fileActivity: (id) => store.fileEvents.filter((e) => e.file_id === id).sort((a, b) => b.at.localeCompare(a.at)),

    // ---------------------------------------------------------------- «پیشنهادی» — F01 نظرسنجی
    pollView: (id) => {
      const poll = store.polls.find((p) => p.id === id);
      if (!poll) return null;
      const vs = store.pollVotes.filter((v) => v.poll_id === id);
      const counts = Object.fromEntries(poll.options.map((o) => [o.id, vs.filter((v) => v.option_ids.includes(o.id)).length]));
      const mine = vs.find((v) => v.user_id === me)?.option_ids ?? [];
      const closed = pollClosed(poll);
      const canManage = canManagePoll(poll);
      const chat = store.chats.find((c) => c.id === poll.entity_id);
      const member = !!chat && chat.members.some((m) => m.user_id === me);
      // «بلافاصله»: پس از رأی دادن (یا پایان)؛ «پس از پایان»: فقط پس از بسته شدن — سازنده و مدیر همیشه می‌بینند
      const showResults = canManage || closed || (poll.show_results === "always" && mine.length > 0);
      return { poll, counts, total: Object.values(counts).reduce((a, b) => a + b, 0), voters: vs.length, mine, closed, showResults, canManage, canVote: member && !closed && (mine.length === 0 || poll.allow_change), chat };
    },
    createPoll: (chatId, input) => {
      const chat = store.chats.find((c) => c.id === chatId);
      if (settingVal("core.polls.enabled") === false) return { ok: false, error: "نظرسنجی در تنظیمات سامانه خاموش است." };
      if (!chat || (chat.chat_type !== "group" && chat.chat_type !== "channel")) return { ok: false, error: "نظرسنجی فقط در گروه و کانال ممکن است." };
      if (!chat.members.some((m) => m.user_id === me)) return { ok: false, error: "برای ساخت نظرسنجی ابتدا عضو شوید." };
      if (chat.chat_type === "channel" && chat.members.find((m) => m.user_id === me)?.role !== "admin") return { ok: false, error: "در کانال فقط مدیران می‌توانند نظرسنجی بگذارند." };
      const q = input.question.trim();
      const opts = input.options.map((o) => ({ ...o, text: o.text.trim() })).filter((o) => o.text);
      const maxOpts = Number(settingVal("core.polls.max_options") ?? 10) || 10;
      if (!q) return { ok: false, error: "پرسش نظرسنجی الزامی است." };
      if (opts.length < 2) return { ok: false, error: "دست‌کم دو گزینه لازم است." };
      if (opts.length > maxOpts) return { ok: false, error: `حداکثر ${fa(maxOpts)} گزینه مجاز است.` };
      if (new Set(opts.map((o) => o.text)).size !== opts.length) return { ok: false, error: "گزینه‌ی تکراری دارید." };
      if (input.anonymous && settingVal("core.polls.allow_anonymous") === false) return { ok: false, error: "نظرسنجی ناشناس در تنظیمات سامانه مجاز نیست." };
      if (input.closes_at && input.closes_at <= now()) return { ok: false, error: "تاریخ و ساعت پایان باید در آینده باشد." };
      const pid = nid("poll");
      const mid = nid("msg");
      const tags = [...new Set((q.match(/#[^\s،.,!؟?#]+/g) ?? []).map((x) => x.slice(1)))];
      const max = input.multiple ? Math.min(Math.max(1, input.max_choices || opts.length), opts.length) : 1;
      upd((s0) => {
        const s = withTags(s0, tags);
        const seq = s.seq + 1;
        const m: Message = { id: mid, chat_id: chatId, user_id: me, content: q, type: "text", parent_message_id: null, attachments: [], tags, forwarded_from: null, seq, created_at: now(), updated_at: now(), edited: false, poll_id: pid };
        const poll: Poll = { id: pid, question: q, media: input.media, options: opts.map((o, i) => ({ id: `${pid}-o${i + 1}`, text: o.text, image: o.image, votes_count: 0 })), multiple: input.multiple, max_choices: max, anonymous: input.anonymous, allow_change: input.allow_change, show_results: input.show_results, closes_at: input.closes_at, is_closed: false, total_votes: 0, entity_name: chat.chat_type as "group" | "channel", entity_id: chatId, message_id: mid, owner: me, tags, created_at: now() };
        return fx({ ...s, seq, polls: [poll, ...s.polls], messages: [...s.messages, m], chats: s.chats.map((c) => (c.id === chatId ? { ...c, updated_at: now(), last_read: { ...c.last_read, [me]: seq } } : c)) }, "poll", "ایجاد نظرسنجی", q, chat.title);
      });
      const listeners = chat.members.map((m) => m.user_id).filter((u) => u !== me && !chat.muted_by.includes(u));
      const ids = mentionedIds(q).filter((u) => chat.members.some((m) => m.user_id === u));
      if (ids.length) inbox.send(names(ids), "mention", `«${actingUser.name}» شما را در نظرسنجی «${chat.title}» منشن کرد: ${q.slice(0, 60)}`, chatLink(chat));
      inbox.send(names(listeners.filter((u) => !ids.includes(u))), chat.chat_type === "channel" ? "channel_message" : "group_message", `نظرسنجی تازه در «${chat.title}»: ${q.slice(0, 70)}`, chatLink(chat));
      return { ok: true, id: pid };
    },
    votePoll: (id, optionIds) => {
      const p = store.polls.find((x) => x.id === id);
      if (!p) return { ok: false, error: "نظرسنجی پیدا نشد." };
      const chat = store.chats.find((c) => c.id === p.entity_id);
      if (!chat?.members.some((m) => m.user_id === me)) return { ok: false, error: "فقط اعضا می‌توانند رأی دهند." };
      if (pollClosed(p)) return { ok: false, error: "این نظرسنجی پایان یافته است." };
      const prev = store.pollVotes.find((v) => v.poll_id === id && v.user_id === me);
      if (prev && !p.allow_change) return { ok: false, error: "تغییر رأی در این نظرسنجی مجاز نیست." };
      const ids = [...new Set(optionIds)].filter((o) => p.options.some((x) => x.id === o));
      if (!ids.length && !prev) return { ok: false, error: "گزینه‌ای انتخاب نشده است." };
      if (!p.multiple && ids.length > 1) return { ok: false, error: "فقط یک گزینه قابل انتخاب است." };
      if (ids.length > p.max_choices) return { ok: false, error: `حداکثر ${fa(p.max_choices)} گزینه قابل انتخاب است.` };
      upd((s0) => {
        const rest = s0.pollVotes.filter((v) => !(v.poll_id === id && v.user_id === me));
        const s = { ...s0, pollVotes: ids.length ? [...rest, { poll_id: id, user_id: me, option_ids: ids, voted_at: now() }] : rest };
        // در نظرسنجی ناشناس گزینه‌ی انتخابی در لاگ ممیزی ثبت نمی‌شود
        const note = p.anonymous ? "ناشناس" : ids.map((o) => p.options.find((x) => x.id === o)?.text).join("، ");
        return fx(recount(s, id), "poll", !ids.length ? "پس‌گرفتن رأی" : prev ? "تغییر رأی" : "رأی در نظرسنجی", p.question, note);
      });
      return { ok: true };
    },
    closePoll: (id) => {
      const p = store.polls.find((x) => x.id === id);
      if (!p) return { ok: false, error: "نظرسنجی پیدا نشد." };
      if (!canManagePoll(p)) return { ok: false, error: "فقط سازنده یا مدیر می‌تواند نظرسنجی را ببندد." };
      upd((s) => fx({ ...s, polls: s.polls.map((x) => (x.id === id ? { ...x, is_closed: true, closed_at: now() } : x)) }, "poll", "بستن زودهنگام نظرسنجی", p.question));
      const voters = store.pollVotes.filter((v) => v.poll_id === id && v.user_id !== me).map((v) => v.user_id);
      const chat = store.chats.find((c) => c.id === p.entity_id);
      if (voters.length && chat) inbox.send(names(voters), "reply", `نظرسنجی «${p.question.slice(0, 50)}» بسته شد؛ نتیجه را ببینید.`, chatLink(chat));
      return { ok: true };
    },
    reopenPoll: (id) => {
      const p = store.polls.find((x) => x.id === id);
      if (!p) return { ok: false, error: "نظرسنجی پیدا نشد." };
      if (!canManagePoll(p)) return { ok: false, error: "فقط سازنده یا مدیر می‌تواند نظرسنجی را بازگشایی کند." };
      // اگر تاریخ پایان گذشته باشد، بازگشایی آن را برمی‌دارد (بی‌پایان تا بستن دستی)
      upd((s) => fx({ ...s, polls: s.polls.map((x) => (x.id === id ? { ...x, is_closed: false, closed_at: null, closes_at: x.closes_at && x.closes_at <= now() ? null : x.closes_at } : x)) }, "poll", "بازگشایی نظرسنجی", p.question));
      return { ok: true };
    },
    deletePoll: (id) => {
      const p = store.polls.find((x) => x.id === id);
      if (!p) return { ok: false, error: "نظرسنجی پیدا نشد." };
      if (!canManagePoll(p)) return { ok: false, error: "فقط سازنده یا مدیر می‌تواند نظرسنجی را حذف کند." };
      upd((s) =>
        fx(
          {
            ...s,
            polls: s.polls.filter((x) => x.id !== id),
            pollVotes: s.pollVotes.filter((v) => v.poll_id !== id),
            comments: s.comments.filter((c) => !(c.entity_name === "poll" && c.entity_id === id)),
            reactions: s.reactions.filter((r) => !(r.entity_name === "poll" && r.entity_id === id)),
            messages: s.messages.filter((m) => m.id !== p.message_id && !(m.in_thread && m.parent_message_id === p.message_id)),
          },
          "poll",
          "حذف نظرسنجی",
          p.question
        )
      );
      return { ok: true };
    },
    pollVoters: (id) => {
      const p = store.polls.find((x) => x.id === id);
      if (!p || p.anonymous || !canManagePoll(p)) return [];
      return store.pollVotes.filter((v) => v.poll_id === id).sort((a, b) => a.voted_at.localeCompare(b.voted_at));
    },
    simulatePollVote: (id) =>
      upd((s) => {
        const p = s.polls.find((x) => x.id === id);
        if (!p || pollClosed(p)) return s;
        const chat = s.chats.find((c) => c.id === p.entity_id);
        const voted = new Set(s.pollVotes.filter((v) => v.poll_id === id).map((v) => v.user_id));
        const pool = (chat?.members ?? []).map((m) => m.user_id).filter((u) => u !== me && !voted.has(u));
        if (!pool.length) return s;
        const u = pool[Math.floor(Math.random() * pool.length)];
        const shuffled = [...p.options].sort(() => Math.random() - 0.5);
        const k = p.multiple ? 1 + Math.floor(Math.random() * p.max_choices) : 1;
        return recount({ ...s, pollVotes: [...s.pollVotes, { poll_id: id, user_id: u, option_ids: shuffled.slice(0, k).map((o) => o.id), voted_at: now() }] }, id);
      }),
    myPolls: () => {
      const okChat = (p: Poll) => store.chats.some((c) => c.id === p.entity_id && !c.deleted_at && (c.members.some((m) => m.user_id === me) || !c.is_private));
      const votedIds = new Set(store.pollVotes.filter((v) => v.user_id === me).map((v) => v.poll_id));
      const byDate = (a: Poll, b: Poll) => b.created_at.localeCompare(a.created_at);
      return { created: store.polls.filter((p) => p.owner === me).sort(byDate), participated: store.polls.filter((p) => p.owner !== me && votedIds.has(p.id) && okChat(p)).sort(byDate) };
    },
    pollTargets: () => store.chats.filter((c) => !c.deleted_at && (c.chat_type === "group" || c.chat_type === "channel") && c.members.some((m) => m.user_id === me) && (c.chat_type === "group" || c.members.find((m) => m.user_id === me)?.role === "admin")),

    // ---------------------------------------------------------------- «پیشنهادی» — F02 پیش‌نمایش لینک
    hidePreview: (messageId) => upd((s) => ({ ...s, messages: s.messages.map((m) => (m.id === messageId && (m.user_id === me || canModerate) ? { ...m, preview_hidden: true } : m)) })),

    // ---------------------------------------------------------------- «پیشنهادی» — F03 خبرخوان
    feedsOf: (chatId) => store.feeds.filter((f) => f.chat_id === chatId),
    saveFeed: (input) => {
      const chat = store.chats.find((c) => c.id === input.chat_id);
      if (!chat || (chat.chat_type !== "group" && chat.chat_type !== "channel")) return { ok: false, error: "گفتگو پیدا نشد." };
      if (!isChatAdminOf(chat)) return { ok: false, error: "فقط مدیر گروه/کانال می‌تواند خوراک را مدیریت کند." };
      const url = input.url.trim();
      if (!/^https?:\/\/\S+\.\S+/i.test(url)) return { ok: false, error: "نشانی خوراک باید با http:// یا https:// شروع شود." };
      const minI = Number(settingVal("messaging.feeds.min_interval_minutes") ?? 15) || 15;
      if (input.interval_minutes < minI || input.interval_minutes > 1440) return { ok: false, error: `فاصله‌ی بررسی باید بین ${fa(minI)} دقیقه و ۲۴ ساعت باشد.` };
      const mine = store.feeds.filter((f) => f.chat_id === input.chat_id);
      const maxF = Number(settingVal("messaging.feeds.max_per_chat") ?? 5) || 5;
      if (!input.id && mine.length >= maxF) return { ok: false, error: `سقف ${fa(maxF)} خوراک برای هر گروه/کانال پر شده است.` };
      if (mine.some((f) => f.url === url && f.id !== input.id)) return { ok: false, error: "این خوراک قبلاً اضافه شده است." };
      const title = input.title.trim() || (() => {
        const r = fetchFeedSim(url);
        return "title" in r ? r.title : url;
      })();
      const id = input.id ?? nid("feed");
      upd((s0) => {
        const base = { url, title, interval_minutes: input.interval_minutes, keywords: input.keywords, max_items: Math.min(10, Math.max(1, input.max_items)), is_active: input.is_active };
        if (input.id) return fx({ ...s0, feeds: s0.feeds.map((f) => (f.id === id ? { ...f, ...base } : f)) }, "feed", "ویرایش خوراک", title, chat.title);
        const f: RssFeed = { ...base, id, chat_type: chat.chat_type as "group" | "channel", chat_id: chat.id, last_fetched_at: null, last_error: null, items_published: 0, published_guids: [], last_fetched_ms: 0, created_by: me };
        const s1 = fx({ ...s0, feeds: [...s0.feeds, f] }, "feed", "افزودن خوراک", title, `${chat.title} — ${url}`);
        // نخستین واکشی بلافاصله پس از افزودن
        return f.is_active ? doFetch(s1, id).s : s1;
      });
      return { ok: true, id };
    },
    deleteFeed: (id) =>
      upd((s) => {
        const f = s.feeds.find((x) => x.id === id);
        return f ? fx({ ...s, feeds: s.feeds.filter((x) => x.id !== id) }, "feed", "حذف خوراک", f.title) : s;
      }),
    toggleFeed: (id) =>
      upd((s) => {
        const f = s.feeds.find((x) => x.id === id);
        return f ? fx({ ...s, feeds: s.feeds.map((x) => (x.id === id ? { ...x, is_active: !x.is_active, last_fetched_ms: Date.now() } : x)) }, "feed", f.is_active ? "غیرفعال کردن خوراک" : "فعال کردن خوراک", f.title) : s;
      }),
    fetchFeedNow: (id) => {
      const f = store.feeds.find((x) => x.id === id);
      if (!f) return { ok: false, error: "خوراک پیدا نشد." };
      const r = doFetch(store, id);
      upd((s) => fx(doFetch(s, id).s, "feed", "واکشی دستی خوراک", f.title, r.error ?? `${fa(r.published)} مطلب`));
      return r.error ? { ok: false, error: r.error } : { ok: true, published: r.published };
    },
    testFeed: (url) => {
      const r = fetchFeedSim(url);
      return "error" in r ? { ok: false, error: r.error } : { ok: true, title: r.title, items: [...r.items].reverse().slice(0, 3) };
    },

    // ---------------------------------------------------------------- «پیشنهادی» — F05 آپارات
    importAparat: (input) => {
      if (settingVal("media.aparat.enabled") === false) return { ok: false, error: "اتصال آپارات در تنظیمات سامانه خاموش است." };
      if (!hasPermission("media.upload") && !hasPermission("media.manage")) return { ok: false, error: "مجوز افزودن رسانه را ندارید." };
      const hash = aparatHash(input.url);
      if (!hash) return { ok: false, error: "لینک آپارات معتبر نیست (نمونه: https://www.aparat.com/v/qW3eR)." };
      if (store.media.some((m) => m.aparat?.hash === hash)) return { ok: false, error: "این ویدیو قبلاً به رسانه اضافه شده است." };
      const post = newAparatPost(hash, { caption: input.caption, privacy: input.privacy, category_ids: input.category_ids, tags: input.tags.length ? input.tags : ["آپارات"] });
      upd((s0) => fx({ ...withTags(s0, post.tags), media: [post, ...s0.media] }, "aparat", "افزودن ویدیو از آپارات", post.caption, hash));
      return { ok: true, id: post.id };
    },
    linkAparatChannel: (username, auto_publish, album_id) => {
      const u = username.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?aparat\.com\//i, "");
      if (!/^[A-Za-z0-9_.]{3,40}$/.test(u)) return { ok: false, error: "نام کاربری کانال آپارات معتبر نیست." };
      if (store.aparatChannels.some((c) => c.username === u)) return { ok: false, error: "این کانال قبلاً متصل شده است." };
      upd((s) => fx({ ...s, aparatChannels: [...s.aparatChannels, { id: nid("apc"), username: u, title: u, album_id, auto_publish, last_synced_at: null, imported: [], created_by: me }] }, "aparat", "اتصال کانال آپارات", u));
      return { ok: true };
    },
    unlinkAparatChannel: (id) =>
      upd((s) => {
        const c = s.aparatChannels.find((x) => x.id === id);
        return c ? fx({ ...s, aparatChannels: s.aparatChannels.filter((x) => x.id !== id) }, "aparat", "قطع اتصال کانال آپارات", c.username) : s;
      }),
    syncAparatChannel: (id) => {
      const c = store.aparatChannels.find((x) => x.id === id);
      if (!c) return { ok: false, error: "کانال پیدا نشد." };
      const have = new Set([...c.imported, ...store.media.map((m) => m.aparat?.hash).filter(Boolean) as string[]]);
      const fresh = (APARAT_CHANNEL_FEED[c.username] ?? []).filter((h) => !have.has(h));
      const posts = fresh.map((h) => newAparatPost(h, { category_ids: c.album_id ? [c.album_id] : [], is_draft: !c.auto_publish }));
      upd((s) =>
        fx({ ...s, media: [...posts, ...s.media], aparatChannels: s.aparatChannels.map((x) => (x.id === id ? { ...x, last_synced_at: now(), imported: [...x.imported, ...fresh] } : x)) }, "aparat", "همگام‌سازی کانال آپارات", c.username, posts.length ? `${fa(posts.length)} ویدیو${c.auto_publish ? " منتشر" : " به‌صورت پیش‌نویس"} وارد شد` : "ویدیوی تازه‌ای نبود")
      );
      return { ok: true, imported: posts.length };
    },

    // ---------------------------------------------------------------- «پیشنهادی» — F13 ضدویروس
    avScanHosted: (trigger) => {
      type Hosted = { id: string; name: string; size: string; mime: string; owner: QuarantineItem["origin"]; by: string; kind: "file" | "message" | "content" | "media"; parent: string };
      const hosted: Hosted[] = [
        ...store.files.map((f) => ({ id: f.id, name: f.name, size: f.size, mime: f.mime, owner: { owner_type: f.owner_type, owner_id: f.owner_id, folder_id: f.folder_id }, by: f.created_by_user_id, kind: "file" as const, parent: f.id })),
        ...store.messages.flatMap((m) => m.attachments.map((a) => ({ ...a, owner: null, by: m.user_id, kind: "message" as const, parent: m.id }))),
        ...store.content.flatMap((c) => c.attachments.map((a) => ({ ...a, owner: null, by: c.user_id, kind: "content" as const, parent: c.id }))),
        ...store.media.flatMap((m) => m.attachments.map((a) => ({ ...a, owner: null, by: m.user_id, kind: "media" as const, parent: m.id }))),
      ];
      const { infected } = av.scanHosted(me, hosted, trigger);
      if (infected.length) {
        const bad = new Set(infected.map((x) => x.id));
        upd((s) => ({
          ...s,
          files: s.files.filter((f) => !bad.has(f.id)),
          messages: s.messages.map((m) => (m.attachments.some((a) => bad.has(a.id)) ? { ...m, attachments: m.attachments.filter((a) => !bad.has(a.id)) } : m)),
          content: s.content.map((c) => (c.attachments.some((a) => bad.has(a.id)) ? { ...c, attachments: c.attachments.filter((a) => !bad.has(a.id)) } : c)),
          media: s.media.map((m) => (m.attachments.some((a) => bad.has(a.id)) ? { ...m, attachments: m.attachments.filter((a) => !bad.has(a.id)) } : m)),
        }));
        const admins = avAdmins();
        if (admins.length) inbox.send(names(admins), "report", `ضدویروس: ${fa(infected.length)} فایل آلوده در اسکن ${trigger === "schedule" ? "زمان‌بندی‌شده" : "دستی"} قرنطینه شد.`, "/dashboard/settings?section=antivirus", { urgent: true });
        const owners = [...new Set(infected.map((x) => x.by))].filter((u) => u !== me);
        if (owners.length) inbox.send(names(owners), "report", "یکی از فایل‌های شما در اسکن دوره‌ای ضدویروس آلوده تشخیص داده شد و به قرنطینه رفت.", "/dashboard/notifications");
      }
      return { scanned: hosted.length, infected: infected.length };
    },
    releaseQuarantined: (q) => {
      if (!hasPermission("settings.security")) return { ok: false, error: "فقط راهبر امنیت می‌تواند فایل را آزاد کند." };
      if (q.origin) {
        const o = q.origin;
        upd((s) => fileEv({ ...s, files: [{ id: nid("fl"), owner_type: o.owner_type, owner_id: o.owner_id, folder_id: o.folder_id && s.folders.some((f) => f.id === o.folder_id) ? o.folder_id : null, name: q.file_name, size: q.size, mime: q.mime, created_by_user_id: q.uploaded_by, created_at: now() }, ...s.files] }, { id: q.id, name: q.file_name }, "restore", "آزادسازی از قرنطینه‌ی ضدویروس"));
      }
      av.resolve(me, q.id, "released");
      if (q.uploaded_by !== me) inbox.send([userName(q.uploaded_by)], "report", q.origin ? `فایل «${q.file_name}» پس از بررسی راهبر از قرنطینه آزاد و به درایو برگردانده شد.` : `فایل «${q.file_name}» پس از بررسی راهبر آزاد شد؛ می‌توانید دوباره آن را پیوست کنید.`, "/dashboard/notifications");
      return { ok: true };
    },
  };

  // «پیشنهادی» — زمان‌سنج‌ها: واکشی دوره‌ای خوراک‌ها (F03) و اسکن زمان‌بندی‌شده‌ی ضدویروس (F13)
  const latest = useRef(value);
  latest.current = value;
  const fetchRef = useRef(doFetch);
  fetchRef.current = doFetch;
  useEffect(() => {
    const tick = () =>
      setStore((prev) => {
        const due = prev.feeds.filter((f) => f.is_active && f.last_fetched_ms + f.interval_minutes * 60_000 <= Date.now());
        return due.reduce((s, f) => fetchRef.current(s, f.id).s, prev);
      });
    const h = window.setInterval(tick, 30_000);
    return () => window.clearInterval(h);
  }, []);
  useEffect(() => {
    const check = () => {
      if (scheduleDue()) latest.current.avScanHosted("schedule");
    };
    const first = window.setTimeout(check, 1500);
    const h = window.setInterval(check, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(h);
    };
  }, []);

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const c = useContext(SocialContext);
  if (!c) throw new Error("useSocial must be used within SocialProvider");
  return c;
}
