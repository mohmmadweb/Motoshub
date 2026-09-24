// ---------------------------------------------------------------------------
// نگاشت «اقدام در رابط کاربری ← endpoint در Motoshub Social API».
// هر دکمه‌ی بخش شبکه اجتماعی دقیقاً یکی از این فراخوانی‌ها را شبیه‌سازی می‌کند؛
// تیم بک‌اند با جایگزینی بدنه‌ی اکشن‌های SocialContext با fetch همین آدرس‌ها وصل می‌کند.
// ---------------------------------------------------------------------------
import type { ContentKind, EntityName, OwnerType } from "./types";

export const API_BASE = "https://social.shub.ir/api/v1";

export type Ep = { method: "GET" | "POST" | "PATCH" | "DELETE"; path: string };
const e = (method: Ep["method"], path: string): Ep => ({ method, path });

export const endpoints = {
  // ---------------- core
  categories: (entity: EntityName) => e("GET", `/core/categories/${entity}/`),
  categoryCreate: (entity: EntityName) => e("POST", `/core/categories/${entity}/`),
  categoryUpdate: (entity: EntityName, id: string) => e("PATCH", `/core/categories/${entity}/${id}/`),
  categoryDelete: (entity: EntityName, id: string) => e("DELETE", `/core/categories/${entity}/${id}/`),
  comments: (entity: EntityName) => e("GET", `/core/comments/${entity}/published/`),
  commentCreate: (entity: EntityName) => e("POST", `/core/comments/${entity}/`),
  commentDelete: (entity: EntityName, id: string) => e("DELETE", `/core/comments/${entity}/${id}/`),
  commentsUnapproved: (entity: EntityName) => e("GET", `/core/comments/${entity}/unapproved/`),
  commentApprove: (entity: EntityName, id: string) => e("POST", `/core/comments/${entity}/${id}/approve/`),
  reactionToggle: (entity: EntityName) => e("POST", `/core/reactions/${entity}/`),
  reactionSummary: (entity: EntityName) => e("GET", `/core/reactions/${entity}/summary/`),
  allowedReactions: () => e("GET", "/core/allowed-reactions/all/"),
  tags: () => e("GET", "/core/tags/all/"),
  tagCreate: () => e("POST", "/core/tags/"),
  tagUpdate: (id: string) => e("PATCH", `/core/tags/${id}/`),
  tagDelete: (id: string) => e("DELETE", `/core/tags/${id}/`),
  settings: () => e("GET", "/core/settings/all/"),
  folders: (o: OwnerType, id: string) => e("GET", o === "user" ? "/core/file-manager/user/folders/" : `/core/file-manager/${o}/${id}/folders/`),
  folderCreate: (o: OwnerType, id: string) => e("POST", o === "user" ? "/core/file-manager/user/folders/" : `/core/file-manager/${o}/${id}/folders/`),
  folderUpdate: (o: OwnerType, id: string, f: string) => e("PATCH", o === "user" ? `/core/file-manager/user/folders/${f}/` : `/core/file-manager/${o}/${id}/folders/${f}/`),
  folderDelete: (o: OwnerType, id: string, f: string) => e("DELETE", o === "user" ? `/core/file-manager/user/folders/${f}/` : `/core/file-manager/${o}/${id}/folders/${f}/`),
  fileUpload: (o: OwnerType, id: string) => e("POST", o === "user" ? "/core/file-manager/user/files/" : `/core/file-manager/${o}/${id}/files/`),
  fileDelete: (o: OwnerType, id: string, f: string) => e("DELETE", o === "user" ? `/core/file-manager/user/files/${f}/` : `/core/file-manager/${o}/${id}/files/${f}/`),
  fileDownload: (o: OwnerType, id: string, f: string) => e("GET", o === "user" ? `/core/file-manager/user/files/${f}/download/` : `/core/file-manager/${o}/${id}/files/${f}/download/`),

  // ---------------- content (blogs / news / magazines)
  contentList: (k: ContentKind) => e("GET", `/content/${k}/published/`),
  contentDrafts: (k: ContentKind) => e("GET", `/content/${k}/drafted/`),
  contentCreate: (k: ContentKind) => e("POST", `/content/${k}/`),
  contentUpdate: (k: ContentKind, id: string) => e("PATCH", `/content/${k}/${id}/`),
  contentDelete: (k: ContentKind, id: string) => e("DELETE", `/content/${k}/${id}/`),
  contentPublish: (k: ContentKind, id: string) => e("POST", `/content/${k}/${id}/publish/`),
  contentUnpublish: (k: ContentKind, id: string) => e("POST", `/content/${k}/${id}/unpublish/`),
  contentAttach: (k: ContentKind, id: string) => e("POST", `/content/${k}/${id}/attachments/`),
  contentSetting: (k: ContentKind, key: string) => e("PATCH", `/content/${k}/setting/${key}/`),

  // ---------------- media
  mediaList: () => e("GET", "/media/media/posts/published/"),
  mediaCreate: () => e("POST", "/media/media/posts/"),
  mediaUpdate: (id: string) => e("PATCH", `/media/media/posts/${id}/`),
  mediaDelete: (id: string) => e("DELETE", `/media/media/posts/${id}/`),
  mediaPublish: (id: string) => e("POST", `/media/media/posts/${id}/publish/`),
  mediaUnpublish: (id: string) => e("POST", `/media/media/posts/${id}/unpublish/`),

  // ---------------- events
  eventList: () => e("GET", "/events/events/published/"),
  eventCreate: () => e("POST", "/events/events/"),
  eventUpdate: (id: string) => e("PATCH", `/events/events/${id}/`),
  eventDelete: (id: string) => e("DELETE", `/events/events/${id}/`),
  eventPublish: (id: string) => e("POST", `/events/events/${id}/publish/`),
  eventUnpublish: (id: string) => e("POST", `/events/events/${id}/unpublish/`),
  eventInvite: (id: string) => e("POST", `/events/events/${id}/invite/`),
  eventInvitations: (id: string) => e("GET", `/events/events/${id}/invitations/`),
  eventRsvp: (id: string) => e("POST", `/events/events/${id}/rsvp/`),
  eventJoin: (id: string) => e("POST", `/events/events/${id}/join/`),
  eventLeave: (id: string) => e("POST", `/events/events/${id}/leave/`),
  eventMembers: (id: string) => e("GET", `/events/events/${id}/members/`),
  eventMemberAdd: (id: string) => e("POST", `/events/events/${id}/members/`),
  eventMemberRemove: (id: string, u: string) => e("DELETE", `/events/events/${id}/members/${u}/`),
  eventPromote: (id: string, u: string) => e("POST", `/events/events/${id}/members/${u}/promote/`),
  eventDemote: (id: string, u: string) => e("POST", `/events/events/${id}/members/${u}/demote/`),

  // ---------------- forums
  topicList: () => e("GET", "/forums/forums/topics/published/"),
  topicCreate: () => e("POST", "/forums/forums/topics/"),
  topicUpdate: (id: string) => e("PATCH", `/forums/forums/topics/${id}/`),
  topicDelete: (id: string) => e("DELETE", `/forums/forums/topics/${id}/`),
  topicPin: (id: string) => e("POST", `/forums/forums/topics/${id}/pin/`),
  topicLock: (id: string) => e("POST", `/forums/forums/topics/${id}/lock/`),
  topicPublish: (id: string) => e("POST", `/forums/forums/topics/${id}/publish/`),
  topicUnpublish: (id: string) => e("POST", `/forums/forums/topics/${id}/unpublish/`),
  topicPosts: (id: string) => e("GET", `/forums/forums/topics/${id}/posts/`),
  postCreate: () => e("POST", "/forums/forums/posts/"),
  postUpdate: (id: string) => e("PATCH", `/forums/forums/posts/${id}/`),
  postDelete: (id: string) => e("DELETE", `/forums/forums/posts/${id}/`),

  // ---------------- messaging
  chatsMy: () => e("GET", "/messaging/messaging/my/"),
  chatList: (t: "channels" | "groups" | "direct-messages" | "saved-messages" | "bots") => e("GET", `/messaging/messaging/${t}/my/`),
  chatCreate: (t: "channels" | "groups" | "direct-messages" | "saved-messages" | "bots") => e("POST", `/messaging/messaging/${t}/`),
  chatDelete: (t: string, id: string) => e("DELETE", `/messaging/messaging/${t}/${id}/`),
  chatMessages: (t: string, id: string) => e("GET", `/messaging/messaging/${t}/${id}/messages/`),
  chatSend: (t: string, id: string) => e("POST", `/messaging/messaging/${t}/${id}/messages/`),
  chatMarkRead: (t: string, id: string) => e("POST", `/messaging/messaging/${t}/${id}/mark-read/`),
  chatMute: (t: string, id: string) => e("PATCH", `/messaging/messaging/${t}/${id}/mute/`),
  chatJoin: (t: string, id: string) => e("POST", `/messaging/messaging/${t}/${id}/join/`),
  chatLeave: (t: string, id: string) => e("POST", `/messaging/messaging/${t}/${id}/leave/`),
  chatMembers: (t: string, id: string) => e("GET", `/messaging/messaging/${t}/${id}/members/`),
  chatAddMember: (t: string, id: string) => e("POST", `/messaging/messaging/${t}/${id}/add-member/`),
  chatRemoveMember: (t: string, id: string) => e("POST", `/messaging/messaging/${t}/${id}/remove-member/`),
  chatRename: (t: string, id: string) => e("POST", `/messaging/messaging/${t}/${id}/rename/`),
  chatDescription: (t: string, id: string) => e("POST", `/messaging/messaging/${t}/${id}/set_description/`),
  chatPrivacy: (t: string, id: string) => e("POST", `/messaging/messaging/${t}/${id}/privacy/`),
  chatWall: (t: string, id: string) => e("POST", `/messaging/messaging/${t}/${id}/set-wall-photo/`),
  chatPublish: (t: string, id: string) => e("POST", `/messaging/messaging/${t}/${id}/publish/`),
  chatUnpublish: (t: string, id: string) => e("POST", `/messaging/messaging/${t}/${id}/unpublish/`),
  groupInvite: (id: string) => e("POST", `/messaging/messaging/groups/${id}/invite/`),
  groupTopic: (id: string) => e("POST", `/messaging/messaging/groups/${id}/topics/`),
  subChannel: (id: string) => e("POST", `/messaging/messaging/channels/${id}/sub-channels/`),
  messageUpdate: (id: string) => e("PATCH", `/messaging/messaging/messages/${id}/`),
  messageDelete: (id: string) => e("DELETE", `/messaging/messaging/messages/${id}/`),
  messageForward: (id: string) => e("POST", `/messaging/messaging/messages/${id}/forward/`),
  messageSave: (id: string) => e("POST", `/messaging/messaging/messages/${id}/save/`),
  realtime: () => e("GET", "/messaging/chats/realtime/"),

  // ---------------- relations
  friends: () => e("GET", "/relations/relations/friendships/"),
  friendRequests: () => e("GET", "/relations/relations/friendships/requests/"),
  friendSent: () => e("GET", "/relations/relations/friendships/sent-requests/"),
  friendBlocked: () => e("GET", "/relations/relations/friendships/blocked/"),
  friendSend: () => e("POST", "/relations/relations/friendships/send-request/"),
  friendRespond: (id: string) => e("POST", `/relations/relations/friendships/${id}/respond/`),
  friendCancel: (id: string) => e("DELETE", `/relations/relations/friendships/${id}/delete-sent-request/`),
  friendUnfriend: (id: string) => e("DELETE", `/relations/relations/friendships/${id}/unfriend/`),
  friendBlock: (id: string) => e("POST", `/relations/relations/friendships/${id}/block/`),
  friendUnblock: (id: string) => e("POST", `/relations/relations/friendships/${id}/unblock/`),

  // ---------------- dashboards (هر ماژول: admin و user)
  dashboard: (m: "content/content" | "events/events" | "forums/forums" | "media/media" | "messaging/messaging" | "relations/relations", who: "admin" | "user") => e("GET", `/${m}/dashboards/${who}/`),
};

export const fmtEndpoint = (x: Ep) => `${x.method} ${x.path}`;
