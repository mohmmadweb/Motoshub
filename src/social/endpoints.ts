// ---------------------------------------------------------------------------
// نگاشت «اقدام در رابط کاربری ← endpoint در API کاریز» — مسیرهای عمومی درگاه Kong
// (https://api.shub.ir/api/v1 · DATA_ALIGNMENT §0.1). مسیرهای داخلی سرویس‌ها
// (/core/…، /content/…، /forums/forums/…، /messaging/messaging/…) دیگر استفاده نمی‌شوند.
// هر دکمه‌ی بخش شبکه اجتماعی دقیقاً یکی از این فراخوانی‌ها را شبیه‌سازی می‌کند؛
// تیم بک‌اند با جایگزینی بدنه‌ی اکشن‌های SocialContext با fetch همین آدرس‌ها وصل می‌کند.
// ---------------------------------------------------------------------------
import type { Ep } from "../api/envelopes";
import type { ContentKind, EntityName, LegacyEntityName, OwnerType } from "./types";
import { normEntity } from "./types";

/** نوع Ep از src/api/envelopes.ts (قرارداد C2) — برای سازگاری واردکننده‌های قدیمی از اینجا هم صادر می‌شود */
export type { Ep } from "../api/envelopes";

/** درگاه عمومی (Kong) — همان نشانی کلاینت وب و موبایل */
export const API_BASE = "https://api.shub.ir/api/v1";

const e = (method: Ep["method"], path: string): Ep => ({ method, path });
/** endpoint «پیشنهادی» — رابط کاربری آن را شبیه‌سازی می‌کند ولی هنوز در API کاریز وجود ندارد */
const p = (method: Ep["method"], path: string): Ep => ({ method, path, proposed: true });
type Ent = EntityName | LegacyEntityName;
const en = (x: Ent) => normEntity(x);
/** ریشه‌ی مدیر فایل: درایو شخصی یا درایو گروه/کانال */
const fm = (o: OwnerType, id: string) => (o === "user" ? "/social/file-manager/user" : `/social/file-manager/${o}/${id}`);
/** content/* در Kong بدون پیشوند content می‌آید: /social/news/ ، /social/blogs/ ، /social/magazines/ */
const ct = (k: ContentKind) => `/social/${k}`;
const MSG = "/social/messaging";
type ChatSeg = "channels" | "groups" | "direct-messages" | "saved-messages" | "bots";

export const endpoints = {
  // ---------------- core (دسته، نظر، واکنش، برچسب، تنظیمات)
  categories: (entity: Ent) => e("GET", `/social/categories/${en(entity)}/`),
  categoryCreate: (entity: Ent) => e("POST", `/social/categories/${en(entity)}/`),
  categoryUpdate: (entity: Ent, id: string) => e("PATCH", `/social/categories/${en(entity)}/${id}/`),
  categoryDelete: (entity: Ent, id: string) => e("DELETE", `/social/categories/${en(entity)}/${id}/`),
  comments: (entity: Ent) => e("GET", `/social/comments/${en(entity)}/published/`),
  commentCreate: (entity: Ent) => e("POST", `/social/comments/${en(entity)}/`),
  commentDelete: (entity: Ent, id: string) => e("DELETE", `/social/comments/${en(entity)}/${id}/`),
  commentsUnapproved: (entity: Ent) => e("GET", `/social/comments/${en(entity)}/unapproved/`),
  commentApprove: (entity: Ent, id: string) => e("POST", `/social/comments/${en(entity)}/${id}/approve/`),
  reactionToggle: (entity: Ent) => e("POST", `/social/reactions/${en(entity)}/`),
  reactionSummary: (entity: Ent) => e("GET", `/social/reactions/${en(entity)}/summary/`),
  allowedReactions: () => e("GET", "/social/allowed-reactions/all/"),
  tags: () => e("GET", "/social/tags/all/"),
  tagCreate: () => e("POST", "/social/tags/"),
  tagUpdate: (id: string) => e("PATCH", `/social/tags/${id}/`),
  tagDelete: (id: string) => e("DELETE", `/social/tags/${id}/`),
  settings: () => e("GET", "/social/settings/all/"),

  // ---------------- file-manager
  folders: (o: OwnerType, id: string) => e("GET", `${fm(o, id)}/folders/`),
  folderCreate: (o: OwnerType, id: string) => e("POST", `${fm(o, id)}/folders/`),
  folderUpdate: (o: OwnerType, id: string, f: string) => e("PATCH", `${fm(o, id)}/folders/${f}/`),
  folderDelete: (o: OwnerType, id: string, f: string) => e("DELETE", `${fm(o, id)}/folders/${f}/`),
  files: (o: OwnerType, id: string) => e("GET", `${fm(o, id)}/files/`),
  fileUpload: (o: OwnerType, id: string) => e("POST", `${fm(o, id)}/files/`),
  fileDelete: (o: OwnerType, id: string, f: string) => e("DELETE", `${fm(o, id)}/files/${f}/`),
  fileDownload: (o: OwnerType, id: string, f: string) => e("GET", `${fm(o, id)}/files/${f}/download/`),
  fileBulkDelete: (o: OwnerType, id: string) => e("POST", `${fm(o, id)}/files/bulk-delete/`),
  fileBulkDownload: (o: OwnerType, id: string) => e("POST", `${fm(o, id)}/files/bulk-download/`),
  // «پیشنهادی» — پیش‌نمایش، نسخه، سطل بازیافت، ستاره، اخیر، اشتراک و سهمیه (الگوی Seafile)
  filePreview: (o: OwnerType, id: string, f: string) => p("GET", `${fm(o, id)}/files/${f}/preview/`),
  fileVersions: (o: OwnerType, id: string, f: string) => p("GET", `${fm(o, id)}/files/${f}/versions/`),
  fileVersionUpload: (o: OwnerType, id: string, f: string) => p("POST", `${fm(o, id)}/files/${f}/versions/`),
  fileVersionRestore: (o: OwnerType, id: string, f: string, v: string) => p("POST", `${fm(o, id)}/files/${f}/versions/${v}/restore/`),
  fileTrash: () => p("GET", "/social/file-manager/trash/"),
  fileRestore: (f: string) => p("POST", `/social/file-manager/trash/${f}/restore/`),
  filePurge: (f: string) => p("DELETE", `/social/file-manager/trash/${f}/`),
  fileStar: (f: string) => p("POST", `/social/file-manager/files/${f}/star/`),
  fileStarred: () => p("GET", "/social/file-manager/starred/"),
  fileRecent: () => p("GET", "/social/file-manager/recent/"),
  /** بدنه: { expires_on, allow_download, password?, shared_with? } */
  fileShare: (o: OwnerType, id: string, f: string) => p("POST", `${fm(o, id)}/files/${f}/share-link/`),
  fileShareRevoke: (o: OwnerType, id: string, f: string) => p("DELETE", `${fm(o, id)}/files/${f}/share-link/`),
  /** لینک داخلی: فقط برای کاربرانِ واردشده‌ای که اجازه‌ی خواندن دارند */
  fileInternalLink: (o: OwnerType, id: string, f: string) => p("GET", `${fm(o, id)}/files/${f}/internal-link/`),
  fileQuota: (o: OwnerType, id: string) => p("GET", `${fm(o, id)}/quota/`),
  fileRename: (o: OwnerType, id: string, f: string) => p("PATCH", `${fm(o, id)}/files/${f}/`),
  fileActivity: (o: OwnerType, id: string, f: string) => p("GET", `${fm(o, id)}/files/${f}/activity/`),
  fileSharedWithMe: () => p("GET", "/social/file-manager/shared-with-me/"),

  // ---------------- content (blogs / news / magazines)
  contentList: (k: ContentKind) => e("GET", `${ct(k)}/published/`),
  contentDrafts: (k: ContentKind) => e("GET", `${ct(k)}/drafted/`),
  contentCreate: (k: ContentKind) => e("POST", `${ct(k)}/`),
  contentUpdate: (k: ContentKind, id: string) => e("PATCH", `${ct(k)}/${id}/`),
  contentDelete: (k: ContentKind, id: string) => e("DELETE", `${ct(k)}/${id}/`),
  contentPublish: (k: ContentKind, id: string) => e("POST", `${ct(k)}/${id}/publish/`),
  contentUnpublish: (k: ContentKind, id: string) => e("POST", `${ct(k)}/${id}/unpublish/`),
  contentAttach: (k: ContentKind, id: string) => e("POST", `${ct(k)}/${id}/attachments/`),
  contentPosterDelete: (k: ContentKind, id: string) => e("POST", `${ct(k)}/${id}/poster/delete/`),
  contentSetting: (k: ContentKind, key: string) => e("PATCH", `${ct(k)}/setting/${key}/`),
  // «پیشنهادی» — اطلاعیه‌ی رسمی و تأیید خواندن
  newsAcknowledge: (id: string) => p("POST", `/social/news/${id}/acknowledge/`),
  newsReadStatus: (id: string) => p("GET", `/social/news/${id}/read-status/`),
  newsRemind: (id: string) => p("POST", `/social/news/${id}/remind-unread/`),
  newsPinned: () => p("GET", "/social/news/pinned/"),
  // «پیشنهادی» — بازبینی پیش از انتشار و آمار هر مطلب
  contentSubmitReview: (k: ContentKind, id: string) => p("POST", `${ct(k)}/${id}/submit-review/`),
  contentApproveReview: (k: ContentKind, id: string) => p("POST", `${ct(k)}/${id}/approve/`),
  contentReturnReview: (k: ContentKind, id: string) => p("POST", `${ct(k)}/${id}/return/`),
  contentReviewQueue: (k: ContentKind) => p("GET", `${ct(k)}/pending-review/`),
  contentAnalytics: (k: ContentKind, id: string) => p("GET", `${ct(k)}/${id}/analytics/`),
  mediaAnalytics: (id: string) => p("GET", `/social/media/posts/${id}/analytics/`),

  // ---------------- «پیشنهادی» — گزارش تخلف و صف نظارت
  reportCreate: () => p("POST", "/social/reports/"),
  reportQueue: () => p("GET", "/social/reports/?status=open"),
  reportDismiss: (id: string) => p("POST", `/social/reports/${id}/dismiss/`),
  reportHide: (id: string) => p("POST", `/social/reports/${id}/hide/`),
  reportRemoveWarn: (id: string) => p("POST", `/social/reports/${id}/remove-and-warn/`),

  // ---------------- media
  mediaList: () => e("GET", "/social/media/posts/published/"),
  mediaCreate: () => e("POST", "/social/media/posts/"),
  mediaUpdate: (id: string) => e("PATCH", `/social/media/posts/${id}/`),
  mediaDelete: (id: string) => e("DELETE", `/social/media/posts/${id}/`),
  mediaPublish: (id: string) => e("POST", `/social/media/posts/${id}/publish/`),
  mediaUnpublish: (id: string) => e("POST", `/social/media/posts/${id}/unpublish/`),

  // ---------------- events
  eventList: () => e("GET", "/social/events/published/"),
  eventCreate: () => e("POST", "/social/events/"),
  eventUpdate: (id: string) => e("PATCH", `/social/events/${id}/`),
  eventDelete: (id: string) => e("DELETE", `/social/events/${id}/`),
  eventPublish: (id: string) => e("POST", `/social/events/${id}/publish/`),
  eventUnpublish: (id: string) => e("POST", `/social/events/${id}/unpublish/`),
  eventInvite: (id: string) => e("POST", `/social/events/${id}/invite/`),
  eventInvitations: (id: string) => e("GET", `/social/events/${id}/invitations/`),
  eventRsvp: (id: string) => e("POST", `/social/events/${id}/rsvp/`),
  eventJoin: (id: string) => e("POST", `/social/events/${id}/join/`),
  eventLeave: (id: string) => e("POST", `/social/events/${id}/leave/`),
  eventMembers: (id: string) => e("GET", `/social/events/${id}/members/`),
  eventMemberAdd: (id: string) => e("POST", `/social/events/${id}/members/`),
  eventMemberRemove: (id: string, u: string) => e("DELETE", `/social/events/${id}/members/${u}/`),
  eventPromote: (id: string, u: string) => e("POST", `/social/events/${id}/members/${u}/promote/`),
  eventDemote: (id: string, u: string) => e("POST", `/social/events/${id}/members/${u}/demote/`),

  // ---------------- forums (پرسش و پاسخ)
  topicList: () => e("GET", "/social/forums/topics/published/"),
  topicCreate: () => e("POST", "/social/forums/topics/"),
  topicUpdate: (id: string) => e("PATCH", `/social/forums/topics/${id}/`),
  topicDelete: (id: string) => e("DELETE", `/social/forums/topics/${id}/`),
  topicPin: (id: string) => e("POST", `/social/forums/topics/${id}/pin/`),
  topicLock: (id: string) => e("POST", `/social/forums/topics/${id}/lock/`),
  topicPublish: (id: string) => e("POST", `/social/forums/topics/${id}/publish/`),
  topicUnpublish: (id: string) => e("POST", `/social/forums/topics/${id}/unpublish/`),
  topicPosts: (id: string) => e("GET", `/social/forums/topics/${id}/posts/`),
  postCreate: () => e("POST", "/social/forums/posts/"),
  postUpdate: (id: string) => e("PATCH", `/social/forums/posts/${id}/`),
  postDelete: (id: string) => e("DELETE", `/social/forums/posts/${id}/`),
  // «پیشنهادی» — رأی، پاسخ پذیرفته‌شده، تکراری و پرسش مشابه
  topicVote: (id: string) => p("POST", `/social/forums/topics/${id}/vote/`),
  postVote: (id: string) => p("POST", `/social/forums/posts/${id}/vote/`),
  topicAccept: (id: string) => p("POST", `/social/forums/topics/${id}/accept-answer/`),
  topicDuplicate: (id: string) => p("POST", `/social/forums/topics/${id}/mark-duplicate/`),
  topicSimilar: () => p("GET", "/social/forums/topics/similar/?q="),

  // ---------------- faqs (سوالات متداول)
  faqList: () => e("GET", "/social/faqs/"),
  faqPublished: () => e("GET", "/social/faqs/published/"),
  faqDrafts: () => e("GET", "/social/faqs/drafted/"),
  faqCreate: () => e("POST", "/social/faqs/"),
  faqGet: (id: string) => e("GET", `/social/faqs/${id}/`),
  faqUpdate: (id: string) => e("PATCH", `/social/faqs/${id}/`),
  faqDelete: (id: string) => e("DELETE", `/social/faqs/${id}/`),
  faqPublish: (id: string) => e("POST", `/social/faqs/${id}/publish/`),
  faqUnpublish: (id: string) => e("POST", `/social/faqs/${id}/unpublish/`),
  faqDraft: (id: string) => e("POST", `/social/faqs/${id}/draft/`),
  faqUndraft: (id: string) => e("POST", `/social/faqs/${id}/undraft/`),
  faqPublishedGet: (id: string) => e("GET", `/social/faqs/${id}/published/`),
  faqSetting: () => e("GET", "/social/faqs/setting/"),

  // ---------------- messaging
  chatsMy: () => e("GET", `${MSG}/my/`),
  chatList: (t: ChatSeg) => e("GET", `${MSG}/${t}/my/`),
  chatCreate: (t: ChatSeg) => e("POST", `${MSG}/${t}/`),
  chatDelete: (t: string, id: string) => e("DELETE", `${MSG}/${t}/${id}/`),
  chatMessages: (t: string, id: string) => e("GET", `${MSG}/${t}/${id}/messages/`),
  /** بدنه = MessageStoreSerializer (content، type: text | sticker | location | audio، audio_duration، parent_message_id، uploaded_files، tags) */
  chatSend: (t: string, id: string) => e("POST", `${MSG}/${t}/${id}/messages/`),
  chatMarkRead: (t: string, id: string) => e("POST", `${MSG}/${t}/${id}/mark-read/`),
  chatMute: (t: string, id: string) => e("PATCH", `${MSG}/${t}/${id}/mute/`),
  chatJoin: (t: string, id: string) => e("POST", `${MSG}/${t}/${id}/join/`),
  chatLeave: (t: string, id: string) => e("POST", `${MSG}/${t}/${id}/leave/`),
  chatMembers: (t: string, id: string) => e("GET", `${MSG}/${t}/${id}/members/`),
  chatAddMember: (t: string, id: string) => e("POST", `${MSG}/${t}/${id}/add-member/`),
  chatRemoveMember: (t: string, id: string) => e("POST", `${MSG}/${t}/${id}/remove-member/`),
  chatRename: (t: string, id: string) => e("POST", `${MSG}/${t}/${id}/rename/`),
  chatDescription: (t: string, id: string) => e("POST", `${MSG}/${t}/${id}/set_description/`),
  chatPrivacy: (t: string, id: string) => e("POST", `${MSG}/${t}/${id}/privacy/`),
  chatWall: (t: string, id: string) => e("POST", `${MSG}/${t}/${id}/set-wall-photo/`),
  chatPublish: (t: string, id: string) => e("POST", `${MSG}/${t}/${id}/publish/`),
  chatUnpublish: (t: string, id: string) => e("POST", `${MSG}/${t}/${id}/unpublish/`),
  /** تنظیمات پیام مستقیم (سقف حجم و مدت پیام صوتی: audio_max_size_mb ، audio_max_duration_seconds) */
  chatSettings: (t: ChatSeg) => e("GET", `${MSG}/${t}/setting/`),
  groupInvite: (id: string) => e("POST", `${MSG}/groups/${id}/invite/`),
  groupTopic: (id: string) => e("POST", `${MSG}/groups/${id}/topics/`),
  subChannel: (id: string) => e("POST", `${MSG}/channels/${id}/sub-channels/`),
  messageUpdate: (id: string) => e("PATCH", `${MSG}/messages/${id}/`),
  messageDelete: (id: string) => e("DELETE", `${MSG}/messages/${id}/`),
  messageForward: (id: string) => e("POST", `${MSG}/messages/${id}/forward/`),
  messageSave: (id: string) => e("POST", `${MSG}/messages/${id}/save/`),
  messagePin: (id: string) => e("POST", `${MSG}/messages/${id}/pin/`),
  messageUnpin: (id: string) => e("POST", `${MSG}/messages/${id}/unpin/`),
  messageAttachment: (id: string, a: string) => e("GET", `${MSG}/messages/${id}/attachments/${a}/content/`),
  // «پیشنهادی» — واکنش، رشته و جستجو داخل گفتگو
  messageReact: (id: string) => p("POST", `${MSG}/messages/${id}/reactions/`),
  messageThread: (id: string) => p("GET", `${MSG}/messages/${id}/thread/`),
  chatPinned: (t: string, id: string) => p("GET", `${MSG}/${t}/${id}/pinned/`),
  chatSearch: (t: string, id: string) => p("GET", `${MSG}/${t}/${id}/messages/?q=`),
  /** SSE/realtime در Kong مسیر ندارد (فقط مسیر داخلی سرویس) — برای تیم زیرساخت علامت خورده است */
  realtime: () => p("GET", `${MSG}/chats/realtime/`),

  // ---------------- relations
  friends: () => e("GET", "/social/relations/friendships/"),
  friendRequests: () => e("GET", "/social/relations/friendships/requests/"),
  friendSent: () => e("GET", "/social/relations/friendships/sent-requests/"),
  friendBlocked: () => e("GET", "/social/relations/friendships/blocked/"),
  friendSend: () => e("POST", "/social/relations/friendships/send-request/"),
  friendRespond: (id: string) => e("POST", `/social/relations/friendships/${id}/respond/`),
  friendCancel: (id: string) => e("DELETE", `/social/relations/friendships/${id}/delete-sent-request/`),
  friendUnfriend: (id: string) => e("DELETE", `/social/relations/friendships/${id}/unfriend/`),
  friendBlock: (id: string) => e("POST", `/social/relations/friendships/${id}/block/`),
  friendUnblock: (id: string) => e("POST", `/social/relations/friendships/${id}/unblock/`),
  friendSettings: () => e("GET", "/social/relations/friendships/setting/"),

  // ---------------- اعضای سازمان (identity)
  memberList: () => e("GET", "/identity/iam/tenant/member-directory/"),
  memberGet: (id: string) => e("GET", `/identity/iam/tenant/member-directory/${id}/`),
  myColleagues: () => e("GET", "/identity/me/colleagues/"),
  tenantScopes: () => e("GET", "/identity/iam/tenant/scopes/"),
  myMemberships: () => e("GET", "/identity/me/memberships/"),
  usersImport: () => e("POST", "/identity/users/import/"),
  usersExport: () => e("GET", "/identity/users/export/"),

  // ---------------- «پیشنهادی» — F01 نظرسنجی محتوا (۱.۳.۱–۱.۳.۶، ۱.۹.۶) — نظرسنجیِ پیام در messaging واقعی است
  pollCreate: () => p("POST", "/social/polls/"),
  pollGet: (id: string) => p("GET", `/social/polls/${id}/`),
  pollVote: (id: string) => p("POST", `/social/polls/${id}/vote/`),
  pollClose: (id: string) => p("POST", `/social/polls/${id}/close/`),
  pollReopen: (id: string) => p("POST", `/social/polls/${id}/reopen/`),
  pollDelete: (id: string) => p("DELETE", `/social/polls/${id}/`),
  pollVoters: (id: string) => p("GET", `/social/polls/${id}/voters/?option={id}`),
  pollExport: (id: string) => p("GET", `/social/polls/${id}/export/`),
  pollMine: () => p("GET", "/social/polls/my/?filter=created|participated"),
  // ---------------- «پیشنهادی» — F02 پیش‌نمایش لینک (۱.۲.۶)
  linkPreview: () => p("GET", "/social/link-preview/?url=…"),
  // ---------------- «پیشنهادی» — F03 خبرخوان RSS/Atom (۱.۴.۵)
  feeds: (t: "groups" | "channels", id: string) => p("GET", `${MSG}/${t}/${id}/feeds/`),
  feedCreate: (t: "groups" | "channels", id: string) => p("POST", `${MSG}/${t}/${id}/feeds/`),
  feedUpdate: (t: "groups" | "channels", id: string, f: string) => p("PATCH", `${MSG}/${t}/${id}/feeds/${f}/`),
  feedDelete: (t: "groups" | "channels", id: string, f: string) => p("DELETE", `${MSG}/${t}/${id}/feeds/${f}/`),
  feedTest: (t: "groups" | "channels", id: string) => p("POST", `${MSG}/${t}/${id}/feeds/test/`),
  feedFetchNow: (t: "groups" | "channels", id: string, f: string) => p("POST", `${MSG}/${t}/${id}/feeds/${f}/fetch/`),
  // ---------------- F04 پیشنهاد لحظه‌ای افراد (۱.۶.۳) — فهرست واقعی است؛ پارامتر chat «پیشنهادی»
  memberDirectory: (chat = "{id}") => p("GET", `/identity/iam/tenant/member-directory/?q=…&chat=${chat}&limit=8`),
  // ---------------- «پیشنهادی» — F05 آپارات (۱.۱۱.۲)
  aparatImport: () => p("POST", "/social/media/posts/import-aparat/"),
  aparatChannels: () => p("GET", "/social/media/aparat-channels/"),
  aparatChannelCreate: () => p("POST", "/social/media/aparat-channels/"),
  aparatChannelSync: (id: string) => p("POST", `/social/media/aparat-channels/${id}/sync/`),
  // ---------------- «پیشنهادی» — F13 ضدویروس ClamAV (۱.۱۹.۷–۱.۱۹.۹) — بارگذاری آلوده: پاسخ 422 با کد virus_detected
  avSettings: () => p("GET", "/social/setting/antivirus/"),
  avSettingsUpdate: () => p("PUT", "/social/setting/antivirus/"),
  avScanNow: () => p("POST", "/social/antivirus/scan-now/"),
  avRuns: () => p("GET", "/social/antivirus/runs/"),
  avQuarantine: () => p("GET", "/social/antivirus/quarantine/"),
  avRelease: (id: string) => p("POST", `/social/antivirus/quarantine/${id}/release/`),
  avRescan: (id: string) => p("POST", `/social/antivirus/quarantine/${id}/rescan/`),
  avPurge: (id: string) => p("DELETE", `/social/antivirus/quarantine/${id}/`),
  avUpdateSignatures: () => p("POST", "/social/antivirus/update-signatures/"),

  // ---------------- dashboards (هر ماژول: admin و user) — /social/{module}/dashboards/{who}/
  dashboard: (m: "content/content" | "events/events" | "forums/forums" | "media/media" | "messaging/messaging" | "relations/relations", who: "admin" | "user") =>
    e("GET", `/social/${m.split("/")[0]}/dashboards/${who}/`),
};

export const fmtEndpoint = (x: Ep) => `${x.method} ${x.path}`;
