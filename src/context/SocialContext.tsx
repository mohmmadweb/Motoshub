// ---------------------------------------------------------------------------
// انبار «شبکه اجتماعی» — شبیه‌ساز Motoshub Social API در مرورگر.
// هر اکشن معادل یک endpoint است (نگاشت کامل در src/social/endpoints.ts)؛
// برای اتصال واقعی، بدنه‌ی اکشن با fetch همان آدرس جایگزین می‌شود.
// اعلان‌های شخصی (درخواست دوستی، دعوت رویداد، منشن، پیام، پاسخ، محتوای جدید)
// از همین‌جا به صندوق ورودی می‌روند.
// ---------------------------------------------------------------------------
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
} from "../social/types";
import { contentKindLabel } from "../social/types";
import { withDemoScopes, type Scoped as OrgScopedT } from "../data/tenancy";

const KEY = "motoshub.social.v1";
const VERSION = 3;

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
};

function initial(): Store {
  const categories = seedCategories();
  const ev = seedEvents(categories);
  const forum = seedForum(categories);
  const msg = seedMessaging(categories);
  const files = seedFiles();
  return {
    version: VERSION,
    seq: 5000,
    categories,
    tags: seedTags(),
    content: withDemoScopes(seedContent(categories), 2),
    media: withDemoScopes(seedMedia(categories), 5),
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
    files: files.files,
    fileTrash: files.trash,
    settings: seedSettings(),
  };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Store>;
      // نسخه‌ی هم‌خوان: فیلدهای تازه‌ای که در ذخیره‌ی قدیمی نیستند از داده‌ی نمونه پر می‌شوند
      if (s && s.version === VERSION) {
        const base = initial();
        const out = { ...base } as Record<string, unknown>;
        (Object.keys(base) as (keyof Store)[]).forEach((k) => {
          const v = s[k];
          if (v !== undefined && v !== null && (Array.isArray(base[k]) ? Array.isArray(v) : true)) out[k] = v;
        });
        return out as Store;
      }
    }
  } catch {
    /* ذخیره‌ساز در دسترس نیست */
  }
  return initial();
}

// ---------------------------------------------------------------- ورودی‌ها (هم‌شکل *StoreRequest)
export type PublishFields = { privacy: Privacy; category_ids: string[]; tags: string[]; is_draft: boolean; published_date?: string; published_time?: string; uploaded_files?: Attachment[]; send_notification?: boolean };
export type ContentInput = PublishFields & { id?: string; title: string; excerpt: string; content: string; poster: string | null; add_comment: boolean; show_comment: boolean; announcement?: { requires_ack: boolean; pin_until: string | null } | null };
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
export type MessageInput = { content: string; type?: MessageType; parent_message_id?: string | null; uploaded_files?: Attachment[]; tags?: string[]; in_thread?: boolean };
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
  canView: (item: { user_id: string; privacy: Privacy } & Partial<OrgScopedT>, override?: boolean) => boolean;
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
  createShare: (id: string, days: number, allowDownload: boolean) => FileShare | null;
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
};

const SocialContext = createContext<Ctx | null>(null);

/** «@نام_خانوادگی» → شناسه‌ی کاربر */
function mentionedIds(text: string): string[] {
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
  const { actingUser, hasPermission, visible: orgVisible, defaultScopeForNew, visibleUserIds, membersOf } = useTenancy();
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
  const userName = (id: string) => userById(id)?.name ?? "کاربر";
  const names = (ids: string[]) => ids.filter((i) => i !== me).map(userName);
  const nid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
  const upd = (fn: (s: Store) => Store) => setStore((prev) => fn(prev));

  const friendIds = (uid = me) =>
    store.friendships.filter((f) => f.status === "accepted" && (f.sender_id === uid || f.receiver_id === uid)).map((f) => (f.sender_id === uid ? f.receiver_id : f.sender_id));
  const areFriends = (a: string, b: string) => store.friendships.some((f) => f.status === "accepted" && ((f.sender_id === a && f.receiver_id === b) || (f.sender_id === b && f.receiver_id === a)));
  // دو لایه: (۱) لایه‌ی سازمانی (پیاز) — محتوای واحد خودم، زیرمجموعه‌ها و اعلان‌های لایه‌های بالاتر؛ (۲) privacy خودِ آیتم
  const canView = (item: { user_id: string; privacy: Privacy } & Partial<OrgScopedT>, override = false) =>
    override || item.user_id === me || (orgVisible(item) && (item.privacy === "EVERYONE" || (item.privacy === "FRIENDS" && areFriends(me, item.user_id))));
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
      store.comments.filter((c) => c.entity_name === entity && c.entity_id === entityId && (c.approved || includeUnapproved || c.user_id === me)).sort((a, b) => a.created_at.localeCompare(b.created_at)),

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
      upd((s) => ({ ...s, files: [...s.files, ...files.map((f) => ({ id: nid("fl"), owner_type, owner_id, folder_id, name: f.name, size: f.size, mime: f.mime, created_by_user_id: me, created_at: now() }))] })),
    deleteFile: (id) =>
      upd((s) => {
        const f = s.files.find((x) => x.id === id);
        if (!f) return s;
        return { ...s, files: s.files.filter((x) => x.id !== id), fileTrash: [{ ...f, trashed_at: now(), trashed_by: me }, ...s.fileTrash] };
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
        return { ...s, fileTrash: s.fileTrash.filter((x) => x.id !== id), files: [{ ...file, folder_id }, ...s.files] };
      });
      return { ok: true };
    },
    purgeFile: (id) => upd((s) => ({ ...s, fileTrash: s.fileTrash.filter((x) => x.id !== id) })),
    emptyTrash: () => upd((s) => ({ ...s, fileTrash: s.fileTrash.filter((x) => x.trashed_by !== me && x.created_by_user_id !== me) })),
    toggleStar: (id) => upd((s) => ({ ...s, files: s.files.map((f) => (f.id !== id ? f : { ...f, starred_by: (f.starred_by ?? []).includes(me) ? (f.starred_by ?? []).filter((u) => u !== me) : [...(f.starred_by ?? []), me] })) })),
    openFile: (id) => upd((s) => ({ ...s, files: s.files.map((f) => (f.id === id ? { ...f, opened_at: { ...(f.opened_at ?? {}), [me]: now() } } : f)) })),
    uploadVersion: (id, file) =>
      upd((s) => ({
        ...s,
        files: s.files.map((f) => {
          if (f.id !== id) return f;
          const v = f.version ?? 1;
          return { ...f, size: file.size, mime: file.mime || f.mime, version: v + 1, created_at: now(), created_by_user_id: me, versions: [{ id: nid("fv"), version: v, size: f.size, created_at: f.created_at, created_by_user_id: f.created_by_user_id }, ...(f.versions ?? [])] };
        }),
      })),
    restoreVersion: (id, versionId) =>
      upd((s) => ({
        ...s,
        files: s.files.map((f) => {
          const old = f.id === id ? (f.versions ?? []).find((v) => v.id === versionId) : undefined;
          if (!old) return f;
          const v = f.version ?? 1;
          // بازگردانی = نسخه‌ی تازه با محتوای نسخه‌ی قدیمی؛ نسخه‌ی فعلی در تاریخچه می‌ماند
          return { ...f, size: old.size, version: v + 1, created_at: now(), created_by_user_id: me, versions: [{ id: nid("fv"), version: v, size: f.size, created_at: f.created_at, created_by_user_id: f.created_by_user_id }, ...(f.versions ?? [])] };
        }),
      })),
    createShare: (id, days, allowDownload) => {
      if (!store.files.some((f) => f.id === id)) return null;
      const share: FileShare = { token: Math.random().toString(36).slice(2, 10), expires_on: addDays(SOCIAL_TODAY, days), created_by: me, created_at: now(), allow_download: allowDownload };
      upd((s) => ({ ...s, files: s.files.map((f) => (f.id === id ? { ...f, share } : f)) }));
      return share;
    },
    revokeShare: (id) => upd((s) => ({ ...s, files: s.files.map((f) => (f.id === id ? { ...f, share: null } : f)) })),

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
        };
        const ann = (prev?: Announcement | null): Announcement | null =>
          kind === "news" && input.announcement ? { requires_ack: input.announcement.requires_ack, pin_until: input.announcement.pin_until, acks: prev?.acks ?? {}, last_reminder_at: prev?.last_reminder_at ?? null } : null;
        if (existing)
          return {
            ...s,
            content: s.content.map((x) =>
              x.id === id ? { ...x, ...base, announcement: input.announcement === undefined ? x.announcement : ann(x.announcement), is_public: !input.is_draft, published_at: input.is_draft ? null : x.published_at ?? pub, attachments: [...x.attachments, ...(input.uploaded_files ?? [])] } : x
            ),
          };
        const item: ContentItem = { ...defaultScopeForNew(), ...base, announcement: ann(), id, kind, user_id: me, is_active: true, is_public: !input.is_draft, attachments: input.uploaded_files ?? [], published_at: pub, created_at: now(), deleted_at: null, views: 0 };
        return { ...s, content: [item, ...s.content] };
      });
      const cLink = `/dashboard/${kind === "news" ? "news" : kind === "blogs" ? "blog" : "magazines"}/${id}`;
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
      upd((s) => ({ ...s, content: s.content.map((x) => (x.id === id ? { ...x, is_public: publish, is_draft: publish ? false : x.is_draft, published_at: publish ? x.published_at ?? now() : x.published_at, updated_at: now() } : x)) })),
    addContentAttachments: (id, files) => upd((s) => ({ ...s, content: s.content.map((x) => (x.id === id ? { ...x, attachments: [...x.attachments, ...files] } : x)) })),
    removeContentAttachment: (id, aid) => upd((s) => ({ ...s, content: s.content.map((x) => (x.id === id ? { ...x, attachments: x.attachments.filter((a) => a.id !== aid) } : x)) })),
    viewContent: (id) => upd((s) => ({ ...s, content: s.content.map((x) => (x.id === id ? { ...x, views: x.views + 1 } : x)) })),
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
    chatMessages: (chatId) => store.messages.filter((m) => m.chat_id === chatId).sort((a, b) => a.seq - b.seq),
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
        const m: Message = { id: nid("msg"), chat_id: chatId, user_id: me, content: input.content, type: input.type ?? "text", parent_message_id: input.parent_message_id ?? null, attachments: input.uploaded_files ?? [], tags: input.tags ?? [], forwarded_from: null, seq: newSeq, created_at: now(), updated_at: now(), edited: false, ...(input.in_thread && input.parent_message_id ? { in_thread: true } : {}) };
        return { ...s, seq: newSeq, messages: [...s.messages, m], chats: s.chats.map((c) => (c.id === chatId ? { ...c, updated_at: now(), last_read: { ...c.last_read, [me]: newSeq } } : c)) };
      });
      const link = chat.chat_type === "channel" ? `/dashboard/channels/${chat.parent ?? chatId}` : chat.chat_type === "group" ? `/dashboard/groups/${chat.parent ?? chatId}` : `/dashboard/chat/${chatId}`;
      const listeners = chat.members.map((m) => m.user_id).filter((u) => u !== me && !chat.muted_by.includes(u));
      const ids = mentionedIds(input.content).filter((u) => chat.members.some((m) => m.user_id === u));
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
  };

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const c = useContext(SocialContext);
  if (!c) throw new Error("useSocial must be used within SocialProvider");
  return c;
}
