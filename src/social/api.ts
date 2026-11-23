// ---------------------------------------------------------------------------
// لایه‌ی «پاسخ API» شبکه اجتماعی (DATA_ALIGNMENT §1): انبار دمو به‌خاطر سازگاری با صفحه‌های دیگر
// شناسه‌های متنی (مثل news-nw1) و چند فیلد قدیمی را نگه می‌دارد؛ این فایل از همان داده دقیقاً
// شکلی را می‌سازد که سرویس social پشت Kong برمی‌گرداند:
//   شناسه‌ی عددی int64، user_id عددی، user تو در تو، is_owner، view_count، reaction_counts، my_reaction،
//   categories [{id,title}] و tags [{id,name}] در پاسخ (category_ids/tags فقط در درخواست)،
//   پیوست واقعی { id, entity_name, entity_id, attachment, attachment_url, type, kind, size(بایت), user_id, created_at }،
//   و فهرست‌ها در پاکت `{ data, meta }` (paginate از src/api/envelopes.ts).
// SocialContext این تبدیل‌ها را با `api.*` در اختیار صفحه‌ها (دکمه‌ی «API») و تیم بک‌اند می‌گذارد.
// ---------------------------------------------------------------------------
import { paginate, type PageQuery, type SocialPage } from "../api/envelopes";
import type {
  Attachment,
  Category,
  Chat,
  ChatRole,
  ChatType,
  ContentItem,
  EntityName,
  ApiEventMemberStatus,
  ApiPrivacy,
  Faq,
  FileFolder,
  FileItem,
  ForumPost,
  Friendship,
  FriendshipStatus,
  MediaPost,
  MediaPostType,
  Message,
  MessageType,
  OwnerType,
  ReactionRecord,
  SocialEvent,
  Tag,
  Topic,
} from "./types";

// ---------------------------------------------------------------- شناسه‌ها
/** شناسه‌ی عددیِ پایدار برای شناسه‌ی متنی دمو (FNV-1a ۳۲ بیتی) — همیشه برای یک رشته همان عدد */
export function apiId(key: string | null | undefined): number {
  if (!key) return 0;
  const digits = /^\d+$/.test(key) ? Number(key) : NaN;
  if (Number.isSafeInteger(digits)) return digits;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 2_000_000_000 + 1000;
}
const optId = (k: string | null | undefined) => (k ? apiId(k) : null);
/** ارقام فارسی ← لاتین (API تاریخ‌ها را با ارقام لاتین برمی‌گرداند) */
export const enDigits = (s: string | null | undefined) => (s == null ? s ?? null : s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
/** «۳٫۲ مگابایت» → بایت */
export function bytesOf(sz: string | number): number {
  if (typeof sz === "number") return Math.round(sz);
  const n = Number(sz.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٫,]/g, ".").replace(/[^\d.]/g, "")) || 0;
  return Math.round(sz.includes("گیگ") ? n * 1024 ** 3 : sz.includes("مگ") ? n * 1024 ** 2 : sz.includes("کیلو") ? n * 1024 : n);
}

// ---------------------------------------------------------------- اشکال پاسخ
/** UserSerializer (computed `user`) */
export type UserMiniApi = { id: number; username: string; first_name: string; last_name: string; display_name: string; avatar_url: string | null };
export type CategoryRefApi = { id: number; title: string };
export type TagRefApi = { id: number; name: string };
/** Attachment (مدل core) */
export type AttachmentApi = { id: number; entity_name: string; entity_id: number; attachment: string; attachment_url: string; type: string; kind: "image" | "video" | "audio" | "document" | "file"; size: number; user_id: number; created_at: string };
export type ReactionCountsApi = Record<string, number>;

type OwnedApi = { id: number; user_id: number; user: UserMiniApi; is_owner: boolean };
type PublishableApi = OwnedApi & {
  is_active: boolean;
  is_public: boolean;
  is_draft: boolean;
  privacy: ApiPrivacy;
  categories: CategoryRefApi[];
  tags: TagRefApi[];
  attachments: AttachmentApi[];
  published_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
/** NewsDetailSerializer / BlogDetailSerializer / MagazineDetailSerializer */
export type ContentApi = PublishableApi & {
  title: string;
  excerpt: string | null;
  content: string;
  poster: string | null;
  poster_url: string | null;
  add_comment: boolean;
  show_comment: boolean;
  reaction_counts: ReactionCountsApi;
  my_reaction: string | null;
  view_count: number;
};
export type NewsApi = ContentApi;
export type BlogApi = ContentApi;
export type MagazineApi = ContentApi;
/** «پیشنهادی» — افزوده‌های دمو روی خبر (در API نیست) */
export type ContentProposed = Pick<ContentItem, "announcement" | "review" | "content_format" | "moderation">;

/** MediaPostDetailSerializer */
export type MediaPostApi = PublishableApi & { caption: string; post_type: MediaPostType; poster: string | null; poster_url: string | null; add_comment: boolean; show_comment: boolean; reaction_counts: ReactionCountsApi; my_reaction: string | null; view_count: number };

/** EventDetailSerializer */
export type EventApi = PublishableApi & {
  title: string;
  description: string;
  poster: string | null;
  poster_url: string | null;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  is_online: boolean;
  is_offline: boolean;
  is_hybrid: boolean;
  meeting_link: string | null;
  province_id: number | null;
  city_id: number | null;
  address: string | null;
  capacity: number | null;
  participant_count: number;
  available_capacity: number | null;
  allow_join: boolean;
  add_comment: boolean;
  show_comment: boolean;
  is_repeat: boolean;
  repeat_days: number[];
  is_currently_active: boolean;
  google_calendar_event_id: string | null;
  last_reminded_at: string | null;
};
/** EventParticipant */
export type EventParticipantApi = { id: number; event_id: number; user_id: number; status: ApiEventMemberStatus; member_type: "owner" | "member" | "organizer"; created_at: string; updated_at: string };

/** TopicDetailSerializer */
export type TopicApi = PublishableApi & { title: string; content: string; view_count: number; is_pinned: boolean; is_locked: boolean; reaction_counts: ReactionCountsApi; my_reaction: string | null; posts_count: number; last_reply_at: string | null };
/** «پیشنهادی» — رأی، پاسخ پذیرفته‌شده و تکراری (در API نیست) */
export type TopicProposed = { score: number; accepted_post_id: number | null; duplicate_of: number | null };
/** PostDetailSerializer */
export type PostApi = OwnedApi & { topic_id: number; parent_id: number | null; content: string; attachments: AttachmentApi[]; tags: TagRefApi[]; reaction_counts: ReactionCountsApi; my_reaction: string | null; deleted_at: string | null; created_at: string; updated_at: string };

/** FaqDetailSerializer */
export type FaqApi = OwnedApi & { question: string; answer: string; is_active: boolean; is_public: boolean; is_draft: boolean; categories: CategoryRefApi[]; tags: TagRefApi[]; attachments: AttachmentApi[]; published_at: string | null; deleted_at: string | null; created_at: string; updated_at: string; view_count: number };

/** ChatListSerializer */
export type ChatApi = {
  id: number;
  chat_type: ChatType;
  title: string | null;
  description: string | null;
  slug: string | null;
  parent: number | null;
  is_private: boolean;
  is_public: boolean;
  is_pinned: boolean;
  is_muted: boolean;
  folder_ids: number[];
  owner_id: number;
  members_count: number;
  messages_count: number;
  unread_count: number;
  last_message: MessageApi | null;
  profile_photo: string | null;
  receiver: UserMiniApi | null;
  created_at: string;
  updated_at: string;
};
/** ChatMember */
export type ChatMemberApi = { user_id: number; user: UserMiniApi; role: ChatRole; last_read_message_id: number | null; is_muted: boolean; is_pinned: boolean; pinned_at: string | null; joined_at: string };
/** MessageSerializer */
export type MessageApi = {
  id: number;
  message_uid: string;
  chat: number;
  parent_message: number | null;
  seq: number;
  type: MessageType;
  service_event: string | null;
  sender_id: number;
  user: UserMiniApi;
  content: string | null;
  is_edited: boolean;
  audio_duration: number | null;
  forwarded_from: { chat_id: number; user_id: number } | null;
  attachments: AttachmentApi[];
  tags: TagRefApi[];
  reaction_counts: ReactionCountsApi;
  created_at: string;
  updated_at: string;
};
/** PinnedMessageSerializer */
export type PinnedMessageApi = { id: number; chat: number; message: MessageApi; is_for_everyone: boolean; created_at: string };

/** Friendship (+ computed friend) */
export type FriendshipApi = { id: number; sender_id: number; receiver_id: number; status: FriendshipStatus; friend: UserMiniApi; created_at: string; updated_at: string };

/** FileManagerFolder */
export type FolderApi = { id: number; owner_type: OwnerType; owner_id: number; name: string; parent: number | null; is_root: boolean; size: number; created_by_user_id: number; created_at: string; updated_at: string };
export type CategoryApi = { id: number; title: string; entity_name: EntityName; parent: number | null; user_id: number | null; is_active: boolean; created_at: string; updated_at: string };
export type TagApi = { id: number; name: string; user_id: number | null; is_active: boolean; created_at: string; updated_at: string };

// ---------------------------------------------------------------- زمینه‌ی تبدیل
export type ApiCtx = {
  me: string;
  userName: (id: string) => string;
  usernameOf: (id: string) => string;
  categories: Category[];
  tags: Tag[];
  reactions: ReactionRecord[];
  posts: ForumPost[];
  messages: Message[];
  chats: Chat[];
  files: FileItem[];
  eventMembers: { event_id: string; status: ApiEventMemberStatus }[];
  today: string;
};

export function userMini(ctx: ApiCtx, id: string): UserMiniApi {
  const display = ctx.userName(id);
  const [first, ...rest] = display.split(" ");
  return { id: apiId(id), username: ctx.usernameOf(id), first_name: first ?? "", last_name: rest.join(" "), display_name: display, avatar_url: null };
}
const catRefs = (ctx: ApiCtx, ids: string[]): CategoryRefApi[] => ids.map((id) => ({ id: apiId(id), title: ctx.categories.find((c) => c.id === id)?.title ?? "" }));
const tagRefs = (ctx: ApiCtx, names: string[]): TagRefApi[] => names.map((n) => ({ id: apiId(ctx.tags.find((t) => t.name === n)?.id ?? `tag:${n}`), name: n }));
const kindOfMime = (mime: string): AttachmentApi["kind"] => (mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : /pdf|word|sheet|excel|text|presentation/.test(mime) ? "document" : "file");
export function attachmentApi(_ctx: ApiCtx, a: Attachment, entity: string, entityId: string, userId: string, created: string): AttachmentApi {
  const id = apiId(a.id);
  return { id, entity_name: entity, entity_id: apiId(entityId), attachment: a.name, attachment_url: `/media/attachments/${id}/${encodeURIComponent(a.name)}`, type: a.mime, kind: kindOfMime(a.mime), size: bytesOf(a.size), user_id: apiId(userId), created_at: enDigits(created) ?? "" };
}
const reactionsOf = (ctx: ApiCtx, entity: EntityName, id: string) => {
  const rs = ctx.reactions.filter((r) => r.entity_name === entity && r.entity_id === id);
  const counts: ReactionCountsApi = {};
  rs.forEach((r) => (counts[r.reaction_code] = (counts[r.reaction_code] ?? 0) + 1));
  return { reaction_counts: counts, my_reaction: rs.find((r) => r.user_id === ctx.me)?.reaction_code ?? null };
};
const posterOf = (p: string | null) => (p && !p.startsWith("#") ? p : null);
function publishableApi(ctx: ApiCtx, x: { id: string; user_id: string; is_active: boolean; is_public: boolean; is_draft: boolean; privacy: ApiPrivacy; category_ids: string[]; tags: string[]; attachments: Attachment[]; published_at: string | null; deleted_at: string | null; created_at: string; updated_at: string }, entity: string): PublishableApi {
  return {
    id: apiId(x.id),
    user_id: apiId(x.user_id),
    user: userMini(ctx, x.user_id),
    is_owner: x.user_id === ctx.me,
    is_active: x.is_active,
    is_public: x.is_public,
    is_draft: x.is_draft,
    privacy: x.privacy,
    categories: catRefs(ctx, x.category_ids),
    tags: tagRefs(ctx, x.tags),
    attachments: x.attachments.map((a) => attachmentApi(ctx, a, entity, x.id, x.user_id, x.created_at)),
    published_at: enDigits(x.published_at),
    deleted_at: x.deleted_at,
    created_at: enDigits(x.created_at) ?? "",
    updated_at: enDigits(x.updated_at) ?? "",
  };
}

// ---------------------------------------------------------------- تبدیل‌ها
const contentEntity = { news: "news", blogs: "blog", magazines: "magazine" } as const;
export function contentApi(ctx: ApiCtx, x: ContentItem): ContentApi {
  const entity = contentEntity[x.kind];
  return {
    ...publishableApi(ctx, x, entity),
    title: x.title,
    excerpt: x.excerpt || null,
    content: x.content,
    poster: posterOf(x.poster),
    poster_url: posterOf(x.poster),
    add_comment: x.add_comment,
    show_comment: x.show_comment,
    ...reactionsOf(ctx, entity, x.id),
    view_count: x.view_count ?? x.views ?? 0,
  };
}
export function mediaApi(ctx: ApiCtx, x: MediaPost): MediaPostApi {
  return { ...publishableApi(ctx, x, "media"), caption: x.caption, post_type: x.post_type, poster: posterOf(x.poster), poster_url: posterOf(x.poster), add_comment: x.add_comment, show_comment: x.show_comment, ...reactionsOf(ctx, "media", x.id), view_count: x.view_count ?? 0 };
}
export function eventApi(ctx: ApiCtx, x: SocialEvent): EventApi {
  const participants = ctx.eventMembers.filter((m) => m.event_id === x.id && (m.status === "accepted" || m.status === "joined")).length;
  const offline = x.is_offline ?? (!x.is_online || !!(x.address ?? x.location));
  const today = enDigits(ctx.today) ?? "";
  const start = enDigits(x.start_date) ?? "";
  const end = enDigits(x.end_date) ?? start;
  return {
    ...publishableApi(ctx, x, "event"),
    title: x.title,
    description: x.description,
    poster: posterOf(x.poster),
    poster_url: posterOf(x.poster),
    start_date: start,
    end_date: end,
    start_time: enDigits(x.start_time) ?? "",
    end_time: enDigits(x.end_time) ?? "",
    is_online: x.is_online,
    is_offline: offline,
    is_hybrid: x.is_online && offline,
    meeting_link: x.meeting_link || null,
    province_id: x.province_id ?? null,
    city_id: x.city_id ?? null,
    address: (x.address ?? x.location) || null,
    capacity: x.capacity > 0 ? x.capacity : null,
    participant_count: participants,
    available_capacity: x.capacity > 0 ? Math.max(0, x.capacity - participants) : null,
    allow_join: x.allow_join ?? true,
    add_comment: x.add_comment,
    show_comment: x.show_comment,
    is_repeat: x.is_repeat,
    repeat_days: x.repeat_days,
    is_currently_active: start <= today && today <= end,
    google_calendar_event_id: x.google_calendar_event_id ?? null,
    last_reminded_at: x.last_reminded_at ?? null,
  };
}
export function topicApi(ctx: ApiCtx, x: Topic): TopicApi & TopicProposed {
  const posts = ctx.posts.filter((p) => p.topic_id === x.id && !p.deleted_at);
  const last = posts.map((p) => p.created_at).sort().pop() ?? null;
  return {
    ...publishableApi(ctx, x, "forum"),
    title: x.title,
    content: x.content,
    view_count: x.view_count,
    is_pinned: x.is_pinned,
    is_locked: x.is_locked,
    ...reactionsOf(ctx, "forum", x.id),
    posts_count: posts.length,
    last_reply_at: enDigits(x.last_reply_at ?? last),
    score: Object.values(x.votes ?? {}).reduce<number>((a, b) => a + b, 0),
    accepted_post_id: optId(x.accepted_post_id),
    duplicate_of: optId(x.duplicate_of),
  };
}
export function postApi(ctx: ApiCtx, x: ForumPost): PostApi {
  return {
    id: apiId(x.id),
    topic_id: apiId(x.topic_id),
    parent_id: optId(x.parent_id),
    user_id: apiId(x.user_id),
    user: userMini(ctx, x.user_id),
    is_owner: x.user_id === ctx.me,
    content: x.content,
    attachments: x.attachments.map((a) => attachmentApi(ctx, a, "post", x.id, x.user_id, x.created_at)),
    tags: tagRefs(ctx, x.tags),
    ...reactionsOf(ctx, "post", x.id),
    deleted_at: x.deleted_at,
    created_at: enDigits(x.created_at) ?? "",
    updated_at: enDigits(x.updated_at) ?? "",
  };
}
export function faqApi(ctx: ApiCtx, x: Faq): FaqApi {
  return {
    id: apiId(x.id),
    user_id: apiId(x.user_id),
    user: userMini(ctx, x.user_id),
    is_owner: x.user_id === ctx.me,
    question: x.question,
    answer: x.answer,
    is_active: x.is_active,
    is_public: x.is_public,
    is_draft: x.is_draft,
    categories: catRefs(ctx, x.category_ids),
    tags: tagRefs(ctx, x.tags),
    attachments: x.attachments.map((a) => attachmentApi(ctx, a, "faq", x.id, x.user_id, x.created_at)),
    published_at: enDigits(x.published_at),
    deleted_at: x.deleted_at,
    created_at: enDigits(x.created_at) ?? "",
    updated_at: enDigits(x.updated_at) ?? "",
    view_count: x.view_count,
  };
}
export function messageApi(ctx: ApiCtx, m: Message): MessageApi {
  const counts: ReactionCountsApi = {};
  Object.entries(m.reactions ?? {}).forEach(([code, us]) => (counts[code] = us.length));
  return {
    id: apiId(m.id),
    message_uid: m.message_uid ?? `00000000-0000-7000-8000-${apiId(m.id).toString(16).padStart(12, "0")}`,
    chat: apiId(m.chat_id),
    parent_message: optId(m.parent_message_id),
    seq: m.seq,
    type: m.poll_id ? "poll" : m.type,
    service_event: m.service_event ?? null,
    sender_id: apiId(m.user_id),
    user: userMini(ctx, m.user_id),
    content: m.content || null,
    is_edited: m.is_edited ?? m.edited,
    audio_duration: m.type === "audio" ? m.audio_duration ?? null : null,
    forwarded_from: m.forwarded_from ? { chat_id: apiId(m.forwarded_from.chat_id), user_id: apiId(m.forwarded_from.user_id) } : null,
    attachments: m.attachments.map((a) => attachmentApi(ctx, a, "messaging_chat", m.id, m.user_id, m.created_at)),
    tags: tagRefs(ctx, m.tags),
    reaction_counts: counts,
    created_at: enDigits(m.created_at) ?? "",
    updated_at: enDigits(m.updated_at) ?? "",
  };
}
export function chatMemberApi(ctx: ApiCtx, c: Chat, uid: string): ChatMemberApi | null {
  const m = c.members.find((x) => x.user_id === uid);
  if (!m) return null;
  const lastSeq = c.last_read[uid] ?? 0;
  const lastRead = ctx.messages.filter((x) => x.chat_id === c.id && x.seq <= lastSeq).sort((a, b) => b.seq - a.seq)[0];
  return { user_id: apiId(uid), user: userMini(ctx, uid), role: m.role, last_read_message_id: lastRead ? apiId(lastRead.id) : optId(m.last_read_message_id), is_muted: m.is_muted ?? c.muted_by.includes(uid), is_pinned: m.is_pinned ?? false, pinned_at: m.pinned_at ?? null, joined_at: enDigits(m.joined_at) ?? "" };
}
export function chatApi(ctx: ApiCtx, c: Chat): ChatApi {
  const msgs = ctx.messages.filter((m) => m.chat_id === c.id).sort((a, b) => a.seq - b.seq);
  const lr = c.last_read[ctx.me] ?? 0;
  const last = msgs[msgs.length - 1];
  const other = c.chat_type === "direct_message" ? c.receiver && c.receiver !== ctx.me ? c.receiver : c.members.find((m) => m.user_id !== ctx.me)?.user_id ?? null : null;
  const mine = c.members.find((m) => m.user_id === ctx.me);
  return {
    id: apiId(c.id),
    chat_type: c.chat_type,
    title: c.title || null,
    description: c.description || null,
    slug: c.slug || null,
    parent: optId(c.parent),
    is_private: c.is_private,
    is_public: c.is_public,
    is_pinned: mine?.is_pinned ?? false,
    is_muted: mine?.is_muted ?? c.muted_by.includes(ctx.me),
    folder_ids: [],
    owner_id: apiId(c.owner_id),
    members_count: c.members.length,
    messages_count: msgs.length,
    unread_count: msgs.filter((m) => m.seq > lr && m.user_id !== ctx.me).length,
    last_message: last ? messageApi(ctx, last) : null,
    profile_photo: posterOf(c.profile_photos[0] ?? null),
    receiver: other ? userMini(ctx, other) : null,
    created_at: enDigits(c.created_at) ?? "",
    updated_at: enDigits(c.updated_at) ?? "",
  };
}
export function pinnedApi(ctx: ApiCtx, c: Chat): PinnedMessageApi[] {
  return (c.pinned_message_ids ?? [])
    .map((mid) => ctx.messages.find((m) => m.id === mid))
    .filter((m): m is Message => !!m)
    .map((m) => ({ id: apiId(`pin:${c.id}:${m.id}`), chat: apiId(c.id), message: messageApi(ctx, m), is_for_everyone: true, created_at: enDigits(m.updated_at) ?? "" }));
}
export function friendshipApi(ctx: ApiCtx, f: Friendship): FriendshipApi {
  const friend = f.sender_id === ctx.me ? f.receiver_id : f.sender_id;
  return { id: apiId(f.id), sender_id: apiId(f.sender_id), receiver_id: apiId(f.receiver_id), status: f.status, friend: userMini(ctx, friend), created_at: enDigits(f.created_at) ?? "", updated_at: enDigits(f.updated_at) ?? "" };
}
export function folderApi(ctx: ApiCtx, f: FileFolder): FolderApi {
  const size = ctx.files.filter((x) => x.folder_id === f.id).reduce((a, x) => a + bytesOf(x.size), 0);
  return { id: apiId(f.id), owner_type: f.owner_type, owner_id: apiId(f.owner_id), name: f.name, parent: optId(f.parent_id), is_root: f.is_root ?? !f.parent_id, size: f.size ?? size, created_by_user_id: apiId(f.created_by_user_id), created_at: enDigits(f.created_at) ?? "", updated_at: enDigits(f.updated_at) ?? "" };
}
/** فایل مدیر فایل = Attachment با entity_name = file_manager_folder */
export function fileApi(ctx: ApiCtx, f: FileItem): AttachmentApi {
  return attachmentApi(ctx, { id: f.id, name: f.name, size: f.size, mime: f.mime }, "file_manager_folder", f.folder_id ?? `root:${f.owner_type}:${f.owner_id}`, f.created_by_user_id, f.created_at);
}
export function categoryApi(c: Category): CategoryApi {
  return { id: apiId(c.id), title: c.title, entity_name: c.entity_name, parent: optId(c.parent_id), user_id: optId(c.user_id), is_active: c.is_active ?? true, created_at: enDigits(c.created_at) ?? "", updated_at: enDigits(c.updated_at) ?? "" };
}
export function tagApi(t: Tag): TagApi {
  return { id: apiId(t.id), name: t.name, user_id: optId(t.user_id), is_active: t.is_active ?? true, created_at: enDigits(t.created_at) ?? "", updated_at: enDigits(t.updated_at) ?? "" };
}

/** فهرست به شکل پاکت social */
export const page = <T, R>(items: readonly T[], map: (x: T) => R, q?: PageQuery): SocialPage<R> => {
  const pg = paginate(items, q);
  return { data: pg.data.map(map), meta: pg.meta };
};
