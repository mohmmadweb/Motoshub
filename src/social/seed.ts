// ---------------------------------------------------------------------------
// داده‌ی نمونه‌ی شبکه اجتماعی در قالب Motoshub Social API.
// همه‌ی محتوای قبلی دمو (اخبار، بلاگ، رسانه، رویداد، انجمن، گروه، کانال،
// گفتگوها و دوستی‌ها) به مدل API منتقل شده — چیزی از دمو حذف نشده است.
// ---------------------------------------------------------------------------
import {
  users,
  newsItems,
  blogPosts,
  mediaItems,
  events as legacyEvents,
  forumTopics,
  groups as legacyGroups,
  posts as legacyPosts,
  channels as legacyChannels,
  channelMessages,
  chatThreads,
  eventCategories,
  newsTopics,
} from "../data/mock";
import { personalData } from "../data/personal";
import { DEMO_REF_DATE } from "../pm/seed";
import { addDays } from "../pm/jalali";
import type {
  AllowedReaction,
  Attachment,
  Category,
  Chat,
  Comment,
  ContentItem,
  EntityName,
  EventMember,
  FileFolder,
  FileItem,
  ForumPost,
  Friendship,
  MediaPost,
  Message,
  Privacy,
  ReactionRecord,
  Setting,
  SocialEvent,
  Tag,
  TrashedFile,
} from "./types";

export const SOCIAL_TODAY = DEMO_REF_DATE;
export const at = (date: string, time = "۱۰:۰۰:۰۰") => `${date} ${time.length === 5 ? `${time}:۰۰` : time}`;
const NOW = at(SOCIAL_TODAY, "۰۹:۳۰:۰۰");
const nameToId = (name: string) => users.find((u) => u.name === name)?.id ?? "u1";
const priv = (v: "عمومی" | "خصوصی"): Privacy => (v === "خصوصی" ? "FRIENDS" : "EVERYONE");
const isJalali = (s: string) => /^[۰-۹]{4}\/[۰-۹]{2}\/[۰-۹]{2}$/.test(s);
const dateOr = (s: string, fallback: string) => (isJalali(s) ? s : fallback);
const att = (id: string, name: string, size: string, mime: string): Attachment => ({ id, name, size, mime });

const posterColors = ["#1f4f99", "#0d9488", "#b45309", "#7c3aed", "#be123c", "#15803d", "#0369a1", "#a16207"];

// ------------------------------------------------------------------ دسته‌ها
function cats(entity: EntityName, titles: string[], prefix: string): Category[] {
  return titles.map((t, i) => ({ id: `${prefix}${i + 1}`, title: t, entity_name: entity, parent_id: null, created_at: at("۱۴۰۵/۰۱/۱۵"), updated_at: at("۱۴۰۵/۰۱/۱۵") }));
}
export function seedCategories(): Category[] {
  const news = cats("news", newsTopics, "cn");
  const magazine = cats("magazine", ["پرونده‌ی ویژه", "گزارش میدانی", "گفت‌وگو", "یادداشت سردبیر"], "cm");
  const blog = cats("blog", ["تجربه‌نگاری", "فناوری و نوآوری", "مدیریت و رهبری"], "cb");
  const media = cats("media", [...new Set(mediaItems.map((m) => m.album))], "cmd");
  const event = cats("event", eventCategories, "ce");
  const topic = cats("topic", [...new Set(forumTopics.map((t) => t.category))], "ct");
  const group = cats("group", [...new Set(legacyGroups.map((g) => g.category))], "cg");
  const channel = cats("channel", ["اطلاع‌رسانی", "هماهنگی واحدها", "فناوری و پژوهش"], "cc");
  // زیرموضوع نمونه (parent_id)
  const sub: Category[] = [
    { id: "cn-sub1", title: "اشتغال‌زایی", entity_name: "news", parent_id: news[1]?.id ?? null, created_at: at("۱۴۰۵/۰۲/۰۱"), updated_at: at("۱۴۰۵/۰۲/۰۱") },
    { id: "ct-sub1", title: "هوش مصنوعی", entity_name: "topic", parent_id: topic[0]?.id ?? null, created_at: at("۱۴۰۵/۰۲/۰۱"), updated_at: at("۱۴۰۵/۰۲/۰۱") },
  ];
  return [...news, ...sub, ...magazine, ...blog, ...media, ...event, ...topic, ...group, ...channel];
}
const catId = (all: Category[], entity: EntityName, title?: string) => (title ? all.find((c) => c.entity_name === entity && c.title === title)?.id : undefined);

// ------------------------------------------------------------------ برچسب‌ها
export function seedTags(): Tag[] {
  const names = new Set<string>(["محرومیت‌زدایی", "قلعه‌گنج", "نوآوری", "تحول‌دیجیتال", "اشتغال", "هوش‌مصنوعی", "انرژی", "کشاورزی", "آموزش", "گزارش"]);
  blogPosts.forEach((b) => b.tags.forEach((t) => names.add(t.replace(/^#/, ""))));
  mediaItems.forEach((m) => m.tags.forEach((t) => names.add(t.replace(/^#/, ""))));
  legacyEvents.forEach((e) => e.hashtags.forEach((t) => names.add(t.replace(/^#/, ""))));
  legacyPosts.forEach((p) => p.tags.forEach((t) => names.add(t.replace(/^#/, ""))));
  return [...names].map((n, i) => ({ id: `tg${i + 1}`, name: n, created_at: at("۱۴۰۵/۰۱/۱۰"), updated_at: at("۱۴۰۵/۰۱/۱۰") }));
}

// ------------------------------------------------------------------ محتوا
export function seedContent(all: Category[]): ContentItem[] {
  const base = { is_active: true, is_public: true, is_draft: false, add_comment: true, show_comment: true, deleted_at: null, attachments: [] as Attachment[] };
  const news: ContentItem[] = newsItems.map((n, i) => {
    const d = dateOr(n.date, addDays(SOCIAL_TODAY, -i * 3));
    return {
      ...base,
      id: `news-${n.id}`,
      kind: "news",
      user_id: "u1",
      title: n.title,
      excerpt: n.summary,
      content: `${n.summary}\n\nبه گزارش پایگاه اطلاع‌رسانی بنیاد، این خبر در دسته‌ی «${n.topic ?? "سازمانی"}» منتشر شده است. جزئیات تکمیلی، پیوست‌ها و گزارش تصویری در ادامه آمده است.`,
      poster: posterColors[i % posterColors.length],
      privacy: priv(n.visibility),
      category_ids: [catId(all, "news", n.topic) ?? "cn5"],
      tags: i % 2 ? ["گزارش"] : ["محرومیت‌زدایی"],
      published_at: at(d, "۰۸:۳۰:۰۰"),
      created_at: at(d, "۰۸:۱۰:۰۰"),
      updated_at: at(d, "۰۸:۳۰:۰۰"),
      views: n.views,
      attachments: i === 0 ? [att("at-n1", "گزارش-تصویری.pdf", "۲٫۴ مگابایت", "application/pdf")] : [],
    };
  });
  const blogs: ContentItem[] = blogPosts.map((b, i) => {
    const d = dateOr(b.date, addDays(SOCIAL_TODAY, -i * 5));
    return {
      ...base,
      id: `blog-${b.id}`,
      kind: "blogs",
      user_id: nameToId(b.author),
      title: b.title,
      excerpt: b.excerpt,
      content: `${b.excerpt}\n\nدر این یادداشت تجربه‌ی اجرایی، چالش‌ها و راهکارهایی را که در عمل جواب داد مرور می‌کنم تا برای همکاران در واحدهای دیگر قابل استفاده باشد.`,
      poster: posterColors[(i + 3) % posterColors.length],
      privacy: priv(b.visibility),
      category_ids: [all.find((c) => c.entity_name === "blog")?.id ?? "cb1"],
      tags: b.tags.map((t) => t.replace(/^#/, "")),
      published_at: at(d, "۱۴:۰۰:۰۰"),
      created_at: at(d, "۱۱:۰۰:۰۰"),
      updated_at: at(d, "۱۴:۰۰:۰۰"),
      views: 120 + i * 37,
    };
  });
  const magazines: ContentItem[] = [
    { title: "ماهنامه‌ی بنیاد — شماره‌ی ۱۲: پرونده‌ی محرومیت‌زدایی", excerpt: "روایت یک سال اجرای طرح آبادانی در قلعه‌گنج، لنده و چالدران؛ از آب‌رسانی تا کارگاه‌های اشتغال.", cat: "پرونده‌ی ویژه", by: "u1", d: "۱۴۰۵/۰۳/۰۱", tags: ["محرومیت‌زدایی", "قلعه‌گنج"] },
    { title: "گزارش میدانی: یک روز در کارگاه خیاطی رمشک", excerpt: "دیدار با بهره‌برداران نخستین کارگاه اشتغال خرد و حرف‌هایشان درباره‌ی درآمد و آینده.", cat: "گزارش میدانی", by: "u4", d: "۱۴۰۵/۰۲/۲۵", tags: ["اشتغال"] },
    { title: "گفت‌وگو با مدیر تحول دیجیتال: سامانه‌ی دانش چه چیزی را عوض کرد؟", excerpt: "از جزیره‌های اطلاعاتی تا بانک دانش یکپارچه؛ گفت‌وگو درباره‌ی موانع و دستاوردها.", cat: "گفت‌وگو", by: "u2", d: "۱۴۰۵/۰۲/۱۰", tags: ["تحول‌دیجیتال"] },
    { title: "یادداشت سردبیر: شماره‌ی تیرماه در راه است", excerpt: "پیش‌نویس شماره‌ی بعد — هنوز منتشر نشده.", cat: "یادداشت سردبیر", by: "u2", d: "۱۴۰۵/۰۳/۰۷", tags: ["گزارش"], draft: true },
  ].map((m, i) => ({
    ...base,
    id: `mag-${i + 1}`,
    kind: "magazines" as const,
    user_id: m.by,
    title: m.title,
    excerpt: m.excerpt,
    content: `${m.excerpt}\n\nمتن کامل این شماره شامل گزارش‌ها، آمار و تصاویر است و نسخه‌ی PDF آن پیوست شده است.`,
    poster: posterColors[(i + 5) % posterColors.length],
    privacy: "EVERYONE" as Privacy,
    category_ids: [catId(all, "magazine", m.cat) ?? "cm1"],
    tags: m.tags,
    is_draft: !!m.draft,
    is_public: !m.draft,
    published_at: m.draft ? null : at(m.d, "۰۹:۰۰:۰۰"),
    created_at: at(m.d, "۰۸:۰۰:۰۰"),
    updated_at: at(m.d, "۰۹:۰۰:۰۰"),
    views: m.draft ? 0 : 340 - i * 60,
    attachments: m.draft ? [] : [att(`at-m${i}`, `ماهنامه-شماره-${12 - i}.pdf`, "۸٫۱ مگابایت", "application/pdf")],
  }));
  // یک پیش‌نویس خبر برای نمایش گردش «پیش‌نویس ← انتشار»
  news.push({ ...news[0], id: "news-draft1", title: "پیش‌نویس: برنامه‌ی بازدید هیئت‌مدیره از چالدران", excerpt: "زمان‌بندی و فهرست بازدیدها در حال نهایی‌شدن است.", is_draft: true, is_public: false, published_at: null, created_at: at(SOCIAL_TODAY, "۰۸:۰۰:۰۰"), updated_at: at(SOCIAL_TODAY, "۰۸:۰۰:۰۰"), views: 0, attachments: [] });
  // اطلاعیه‌های رسمی با تأیید خواندن («پیشنهادی» — announcement)
  const ann = (id: string, by: string, title: string, excerpt: string, body: string, daysAgo: number, pinDays: number, acks: string[]): ContentItem => {
    const d = addDays(SOCIAL_TODAY, -daysAgo);
    return {
      ...base,
      id,
      kind: "news",
      user_id: by,
      title,
      excerpt,
      content: body,
      poster: "#be123c",
      privacy: "EVERYONE",
      scope: "سراسری",
      category_ids: [catId(all, "news", "اطلاعیه") ?? "cn5"],
      tags: ["اطلاعیه"],
      published_at: at(d, "۰۸:۰۰:۰۰"),
      created_at: at(d, "۰۷:۴۵:۰۰"),
      updated_at: at(d, "۰۸:۰۰:۰۰"),
      views: 180 + acks.length * 23,
      add_comment: false,
      announcement: { requires_ack: true, pin_until: addDays(SOCIAL_TODAY, pinDays), acks: Object.fromEntries(acks.map((u, k) => [u, at(d, `۰${(k % 8) + 1}:۳۰:۰۰`)])), last_reminder_at: null },
    };
  };
  const announcements = [
    ann(
      "news-ann1",
      "u1",
      "اطلاعیه‌ی رسمی: دستورالعمل جدید امنیت اطلاعات و رمز عبور",
      "از ۱۵ خرداد ورود دومرحله‌ای برای همه‌ی کاربران سامانه‌ها الزامی است؛ لطفاً دستورالعمل را بخوانید و تأیید کنید.",
      "همکاران گرامی،\n\nبر اساس مصوبه‌ی کمیته‌ی امنیت اطلاعات، از ۱۵ خرداد ۱۴۰۵:\n۱. ورود دومرحله‌ای برای همه‌ی حساب‌ها الزامی است.\n۲. رمز عبور باید دست‌کم ۱۲ نویسه و هر ۹۰ روز یک‌بار تغییر کند.\n۳. ارسال اسناد طبقه‌بندی‌شده از طریق پیام‌رسان‌های عمومی ممنوع است.\n\nلطفاً پس از مطالعه، دکمه‌ی «خواندم و پذیرفتم» را بزنید.",
      2,
      12,
      ["u2", "u4", "u5", "u7", "u9"]
    ),
    ann(
      "news-ann2",
      "u2",
      "ابلاغیه: ساعات کاری ادارات و شرکت‌ها در تابستان",
      "ساعات کاری از ۱ تیر تا ۳۱ مرداد از ۷ تا ۱۴ است؛ مدیران واحدها برنامه‌ی پاسخ‌گویی را تنظیم کنند.",
      "به استناد مصوبه‌ی هیئت عامل، ساعات کاری همه‌ی ادارات ستادی، هلدینگ‌ها و شرکت‌های تابعه از ۱ تیر تا ۳۱ مرداد از ساعت ۷ تا ۱۴ خواهد بود.\n\nمدیران واحدها موظف‌اند برنامه‌ی پاسخ‌گویی به ذی‌نفعان را متناسب با این تغییر تنظیم و اعلام کنند.",
      1,
      6,
      ["u3", "u4", "u6"]
    ),
  ];
  return [...announcements, ...magazines, ...news, ...blogs];
}

// ------------------------------------------------------------------ رسانه
export function seedMedia(all: Category[]): MediaPost[] {
  const posts: MediaPost[] = mediaItems.map((m, i) => {
    const d = dateOr(m.date, addDays(SOCIAL_TODAY, -i * 2));
    return {
      id: `media-${m.id}`,
      user_id: nameToId(m.uploadedBy),
      caption: m.title,
      post_type: m.kind === "video" ? "video" : "image",
      poster: m.color,
      is_active: true,
      is_public: true,
      is_draft: false,
      add_comment: true,
      show_comment: true,
      privacy: priv(m.visibility),
      category_ids: [catId(all, "media", m.album) ?? "cmd1"],
      tags: m.tags.map((t) => t.replace(/^#/, "")),
      attachments: [att(`at-${m.id}`, m.kind === "video" ? `${m.id}.mp4` : `${m.id}.jpg`, m.kind === "video" ? "۴۸ مگابایت" : "۲٫۱ مگابایت", m.kind === "video" ? "video/mp4" : "image/jpeg")],
      published_at: at(d, "۱۲:۰۰:۰۰"),
      created_at: at(d, "۱۱:۴۰:۰۰"),
      updated_at: at(d, "۱۲:۰۰:۰۰"),
      deleted_at: null,
    };
  });
  // آلبوم (post_type = album) با چند فایل
  posts.unshift({
    ...posts[0],
    id: "media-album1",
    caption: "آلبوم افتتاح کارگاه‌های اشتغال قلعه‌گنج",
    post_type: "album",
    poster: "#0d9488",
    attachments: [1, 2, 3, 4, 5].map((n) => att(`at-al${n}`, `kargah-${n}.jpg`, "۱٫۸ مگابایت", "image/jpeg")),
    tags: ["قلعه‌گنج", "اشتغال"],
    published_at: at("۱۴۰۵/۰۳/۰۵", "۱۶:۰۰:۰۰"),
    created_at: at("۱۴۰۵/۰۳/۰۵", "۱۵:۳۰:۰۰"),
  });
  return posts;
}

// ------------------------------------------------------------------ رویدادها
export function seedEvents(all: Category[]): { events: SocialEvent[]; members: EventMember[] } {
  const members: EventMember[] = [];
  const events: SocialEvent[] = legacyEvents.map((ev, i) => {
    const d = dateOr(ev.jalaliDate, addDays(SOCIAL_TODAY, i * 4));
    const [start, end] = (ev.time.match(/[۰-۹]{2}:[۰-۹]{2}/g) ?? ["۱۰:۰۰", "۱۲:۰۰"]) as string[];
    const owner = i % 3 === 0 ? "u1" : i % 3 === 1 ? "u5" : "u4";
    const id = `ev-${ev.id}`;
    members.push({ id: `em-${id}-o`, event_id: id, user_id: owner, status: "joined", member_type: "owner", created_at: NOW, updated_at: NOW });
    ["u2", "u3", "u4", "u5", "u6", "u7"].filter((u) => u !== owner).slice(0, 3 + (i % 3)).forEach((u, k) =>
      members.push({ id: `em-${id}-${u}`, event_id: id, user_id: u, status: k === 0 ? "accepted" : k === 1 ? "invited" : k === 2 ? "joined" : "declined", member_type: k === 0 && i % 2 ? "organizer" : "member", created_at: NOW, updated_at: NOW })
    );
    if (owner !== "u1" && i % 2 === 0) members.push({ id: `em-${id}-u1`, event_id: id, user_id: "u1", status: "invited", member_type: "member", created_at: NOW, updated_at: NOW });
    return {
      id,
      user_id: owner,
      title: ev.title,
      description: ev.description,
      poster: posterColors[(i + 1) % posterColors.length],
      start_date: d,
      end_date: d,
      start_time: start ?? "۱۰:۰۰",
      end_time: end ?? "۱۲:۰۰",
      is_online: ev.mode === "آنلاین",
      meeting_link: ev.joinLink ?? "",
      location: ev.location,
      capacity: ev.capacity ?? 50,
      privacy: priv(ev.visibility),
      is_active: true,
      is_public: true,
      is_draft: false,
      add_comment: true,
      show_comment: true,
      is_repeat: false,
      repeat_days: [],
      category_ids: [catId(all, "event", ev.category) ?? "ce1"],
      tags: ev.hashtags.map((t) => t.replace(/^#/, "")),
      attachments: [],
      published_at: at(addDays(d, -10)),
      created_at: at(addDays(d, -12)),
      updated_at: at(addDays(d, -10)),
      deleted_at: null,
    };
  });
  // رویدادهای نزدیک به «امروز» دمو و یک جلسه‌ی تکرارشونده
  const extra: SocialEvent[] = [
    { title: "جلسه‌ی هفتگی هماهنگی واحدهای ستادی", d: SOCIAL_TODAY, s: "۱۱:۰۰", e: "۱۲:۰۰", online: true, loc: "", repeat: [1], owner: "u1", cap: 30 },
    { title: "کارگاه آموزشی «مستندسازی درس‌آموخته‌ها»", d: addDays(SOCIAL_TODAY, 2), s: "۰۹:۰۰", e: "۱۲:۳۰", online: false, loc: "تهران، ساختمان مرکزی، سالن ۳", repeat: [], owner: "u2", cap: 25 },
    { title: "وبینار «هوش مصنوعی در خط تولید» — پیش‌نویس", d: addDays(SOCIAL_TODAY, 9), s: "۱۵:۰۰", e: "۱۶:۳۰", online: true, loc: "", repeat: [], owner: "u6", cap: 200, draft: true },
  ].map((x, i) => {
    const id = `ev-x${i + 1}`;
    members.push({ id: `em-${id}-o`, event_id: id, user_id: x.owner, status: "joined", member_type: "owner", created_at: NOW, updated_at: NOW });
    ["u1", "u3", "u4", "u5", "u7"].filter((u) => u !== x.owner).forEach((u, k) => members.push({ id: `em-${id}-${u}`, event_id: id, user_id: u, status: k % 3 === 0 ? "invited" : "accepted", member_type: "member", created_at: NOW, updated_at: NOW }));
    return {
      id,
      user_id: x.owner,
      title: x.title,
      description: "دستور جلسه و مستندات پیش از جلسه در بخش پیوست‌ها قرار می‌گیرد.",
      poster: posterColors[(i + 4) % posterColors.length],
      start_date: x.d,
      end_date: x.d,
      start_time: x.s,
      end_time: x.e,
      is_online: x.online,
      meeting_link: x.online ? "https://meet.shub.ir/weekly" : "",
      location: x.loc,
      capacity: x.cap,
      privacy: "EVERYONE" as Privacy,
      is_active: true,
      is_public: !x.draft,
      is_draft: !!x.draft,
      add_comment: true,
      show_comment: true,
      is_repeat: x.repeat.length > 0,
      repeat_days: x.repeat,
      category_ids: [i === 1 ? "ce2" : i === 2 ? "ce3" : "ce1"],
      tags: [i === 2 ? "هوش‌مصنوعی" : "آموزش"],
      attachments: [],
      published_at: x.draft ? null : at(addDays(x.d, -5)),
      created_at: at(addDays(x.d, -6)),
      updated_at: at(addDays(x.d, -5)),
      deleted_at: null,
    };
  });
  return { events: [...extra, ...events], members };
}

// ------------------------------------------------------------------ پرسش و پاسخ
const replyBank = [
  "در واحد ما همین رویه اجرا شد؛ کلیدی‌ترین نکته، تعیین «معیار پذیرش» پیش از شروع کار بود. چک‌لیست اجرایی را در مدیریت دانش گذاشته‌ام.",
  "تجربه‌ی ما نشان داد اگر گزارش پیشرفت ماهانه ثبت نشود، مقایسه‌ی نتایج سخت می‌شود. پیشنهادم تعریف شاخص‌های کلیدی از همان ابتداست.",
  "موافقم؛ فقط باید هزینه‌ی نگهداری را هم از اول در بودجه دید، وگرنه بعد از سال اول پروژه متوقف می‌شود.",
  "اگر مایل باشید جلسه‌ای کوتاه بگذاریم تا نمونه‌ی اجراشده در هلدینگ خودمان را نشان دهم.",
];
export function seedForum(all: Category[]): { topics: import("./types").Topic[]; posts: ForumPost[] } {
  const posts: ForumPost[] = [];
  const topics = forumTopics.map((t, i) => {
    const id = `tp-${t.id}`;
    const author = nameToId(t.author);
    const d = addDays(SOCIAL_TODAY, -i * 2 - 1);
    const n = Math.min(t.replies, 3);
    for (let k = 0; k < n; k++) {
      const u = ["u2", "u5", "u6", "u9", "u4"][(i + k) % 5];
      posts.push({ id: `${id}-p${k + 1}`, topic_id: id, parent_id: null, user_id: u === author ? "u12" : u, content: replyBank[(i + k) % replyBank.length], attachments: [], tags: [], created_at: at(addDays(d, 1), `۱${k}:۱۵:۰۰`), updated_at: at(addDays(d, 1)), deleted_at: null });
    }
    if (n >= 2) posts.push({ id: `${id}-p1r`, topic_id: id, parent_id: `${id}-p1`, user_id: author, content: "ممنون از پاسخ دقیق؛ اگر چک‌لیست را لینک کنید برای همه مفید است.", attachments: [], tags: [], created_at: at(addDays(d, 2)), updated_at: at(addDays(d, 2)), deleted_at: null });
    return {
      id,
      user_id: author,
      title: t.title,
      content: `${t.title}\n\nلطفاً تجربه‌ها و مستنداتی را که در این زمینه دارید به اشتراک بگذارید. به‌ویژه دنبال نمونه‌های اجراشده و درس‌آموخته‌های آن‌ها هستم.`,
      view_count: t.views,
      is_pinned: i === 0,
      is_locked: i === 5,
      is_active: true,
      is_public: true,
      is_draft: false,
      privacy: priv(t.visibility),
      category_ids: [catId(all, "topic", t.category) ?? "ct1"],
      tags: i % 3 === 0 ? ["نوآوری"] : i % 3 === 1 ? ["محرومیت‌زدایی"] : ["تحول‌دیجیتال"],
      // «پیشنهادی» — رأی و پاسخ پذیرفته‌شده
      votes: Object.fromEntries(["u2", "u4", "u5", "u6", "u7", "u9", "u12"].filter((u, k) => u !== author && k < (t.views % 5) + 1).map((u, k) => [u, (k === 3 ? -1 : 1) as 1 | -1])),
      accepted_post_id: i === 0 ? `${id}-p2` : i === 5 ? `${id}-p1` : null,
      duplicate_of: null as string | null,
      attachments: [],
      published_at: at(d),
      created_at: at(d),
      updated_at: at(addDays(d, 2)),
      deleted_at: null,
    };
  });
  // رأی روی پاسخ‌ها
  posts.forEach((p, k) => {
    if (p.parent_id) return;
    const voters = ["u1", "u3", "u4", "u7", "u8", "u10"].filter((u) => u !== p.user_id).slice(0, (k * 7) % 5);
    p.votes = Object.fromEntries(voters.map((u, j) => [u, (j === 2 && k % 3 === 0 ? -1 : 1) as 1 | -1]));
  });
  // یک پرسش تکراری (قفل و پیوند به پرسش اصلی)
  const orig = topics[5];
  if (orig) {
    const d = addDays(SOCIAL_TODAY, -1);
    topics.push({
      ...orig,
      id: "tp-dup1",
      user_id: "u5",
      title: "مصوبات هیات عامل را چطور مستند کنیم که بعداً سریع پیدا شوند؟",
      content: "برای پیگیری مصوبات جلسات هیات عامل، روش مشخصی برای مستندسازی و جستجو داریم؟ الان هر واحد به شکل خودش ثبت می‌کند.",
      view_count: 12,
      is_pinned: false,
      is_locked: true,
      votes: {},
      accepted_post_id: null,
      duplicate_of: orig.id,
      published_at: at(d),
      created_at: at(d),
      updated_at: at(d),
    });
  }
  return { topics, posts };
}

// ------------------------------------------------------------------ پیام‌رسانی
export function seedMessaging(all: Category[]): { chats: Chat[]; messages: Message[] } {
  const chats: Chat[] = [];
  const messages: Message[] = [];
  let seq = 1;
  const pushMsg = (chat_id: string, user_id: string, content: string, time: string, date = SOCIAL_TODAY, extra: Partial<Message> = {}) => {
    const id = `msg${seq}`;
    messages.push({ id, chat_id, user_id, content, type: "text", parent_message_id: null, attachments: [], tags: [], forwarded_from: null, seq: seq++, created_at: at(date, /[۰-۹]{2}:[۰-۹]{2}/.test(time) ? time : "۰۹:۰۰"), updated_at: at(date), edited: false, ...extra });
    return id;
  };
  const baseChat = (x: Partial<Chat> & Pick<Chat, "id" | "chat_type" | "title" | "owner_id" | "members">): Chat => ({
    description: "",
    slug: x.id,
    parent: null,
    is_private: false,
    is_public: true,
    receiver: null,
    category_ids: [],
    tags: [],
    profile_photos: [],
    wall_photo: null,
    muted_by: [],
    last_read: {},
    created_at: at("۱۴۰۵/۰۱/۲۰"),
    updated_at: NOW,
    deleted_at: null,
    ...x,
  });
  const pool = users.map((u) => u.id);

  // گروه‌ها — از «گروه‌های تعاملی» قبلی
  legacyGroups.forEach((g, i) => {
    const owner = g.id === "g1" ? "u7" : pool[i % pool.length];
    const memberIds = [...new Set([owner, "u1", ...pool.slice((i * 3) % 10, ((i * 3) % 10) + 5)])];
    chats.push(
      baseChat({
        id: g.id,
        chat_type: "group",
        title: g.name,
        description: g.description,
        owner_id: owner,
        is_private: g.privacy === "خصوصی",
        members: memberIds.map((u, k) => ({ user_id: u, role: u === owner || (k === 1 && g.id === "g1") ? "admin" : "member", joined_at: at("۱۴۰۵/۰۱/۲۰") })),
        category_ids: [catId(all, "group", g.category) ?? "cg1"],
        tags: [],
        profile_photos: [g.color],
        created_at: at(dateOr(g.createdAt, "۱۴۰۵/۰۱/۲۰")),
      })
    );
    const gp = legacyPosts.filter((p) => p.groupId === g.id);
    gp.forEach((p) => pushMsg(g.id, p.authorId, p.content, p.time, SOCIAL_TODAY, { tags: p.tags.map((t) => t.replace(/^#/, "")) }));
    if (!gp.length) pushMsg(g.id, owner, `به گروه «${g.name}» خوش آمدید. ${g.description}`, "۰۹:۰۰", addDays(SOCIAL_TODAY, -2));
  });
  // تاپیک گروه (POST groups/{id}/topics/)
  chats.push(baseChat({ id: "g1-t1", chat_type: "group", parent: "g1", title: "تاپیک: کارگاه‌های اشتغال", description: "هماهنگی استقرار کارگاه‌ها", owner_id: "u7", members: chats.find((c) => c.id === "g1")!.members }));
  pushMsg("g1-t1", "u4", "برق کارگاه ۳ هفته‌ی آینده وصل می‌شود؛ بعد از آن استقرار چرخ‌ها را شروع می‌کنیم.", "۱۰:۰۵");

  // کانال‌ها
  legacyChannels.forEach((c, i) => {
    const owner = i === 0 ? "u1" : pool[(i + 1) % pool.length];
    const memberIds = [...new Set([owner, "u1", ...pool.slice(i % 8, (i % 8) + 6)])];
    chats.push(
      baseChat({
        id: c.id,
        chat_type: "channel",
        title: c.name,
        description: c.topic,
        slug: c.name,
        owner_id: owner,
        is_private: c.type === "private",
        members: memberIds.map((u) => ({ user_id: u, role: u === owner ? "admin" : "member", joined_at: at("۱۴۰۵/۰۱/۲۰") })),
        category_ids: [i < 2 ? "cc1" : i < 5 ? "cc2" : "cc3"],
        is_public: c.category !== "بایگانی‌شده",
        profile_photos: [posterColors[i % posterColors.length]],
      })
    );
  });
  channelMessages.forEach((m) => pushMsg(m.channelId, m.authorId, m.text, m.time));
  // زیرکانال (POST channels/{id}/sub-channels/)
  chats.push(baseChat({ id: "ch2-sub1", chat_type: "channel", parent: "ch2", title: "ستاد-قلعه‌گنج", slug: "ghale-ganj", description: "زیرکانال پیگیری میدانی قلعه‌گنج", owner_id: "u4", members: chats.find((c) => c.id === "ch2")!.members }));
  pushMsg("ch2-sub1", "u4", "عکس‌های بازدید امروز از مدارس در پوشه‌ی کانال بارگذاری شد.", "۱۱:۲۰");

  // پیام‌های مستقیم — از گفتگوهای قبلی (از دید «پایگاه اطلاع‌رسانی بنیاد»)
  chatThreads.forEach((t) => {
    const other = nameToId(t.with);
    if (other === "u1") return;
    const id = `dm-u1-${other}`;
    chats.push(baseChat({ id, chat_type: "direct_message", title: t.with, owner_id: "u1", receiver: other, is_private: true, is_public: false, members: [{ user_id: "u1", role: "member", joined_at: at("۱۴۰۵/۰۱/۲۰") }, { user_id: other, role: "member", joined_at: at("۱۴۰۵/۰۱/۲۰") }] }));
    t.messages.forEach((m) => pushMsg(id, m.from === "me" ? "u1" : other, m.text, m.time));
  });
  // پیام‌های ذخیره‌شده و بات
  chats.push(baseChat({ id: "saved-u1", chat_type: "saved_messages", title: "پیام‌های ذخیره‌شده", owner_id: "u1", is_private: true, is_public: false, members: [{ user_id: "u1", role: "admin", joined_at: at("۱۴۰۵/۰۱/۲۰") }] }));
  pushMsg("saved-u1", "u1", "یادآوری: ارسال گزارش هفتگی به کارفرما تا پنجشنبه.", "۰۸:۰۰");
  chats.push(baseChat({ id: "bot-system", chat_type: "bot", title: "بات اعلان‌های سامانه", description: "اعلان‌های خودکار سامانه", owner_id: "u1", is_private: true, is_public: false, members: pool.map((u) => ({ user_id: u, role: u === "u1" ? "admin" : "member", joined_at: at("۱۴۰۵/۰۱/۲۰") })) }));
  pushMsg("bot-system", "u1", "🤖 به‌روزرسانی امنیتی سامانه امشب ساعت ۲۳ انجام می‌شود.", "۰۷:۳۰");

  // «پیشنهادی» — واکنش، رشته‌ی گفتگو و سنجاق در گروه g1 و کانال ch1
  const rootG = messages.find((m) => m.chat_id === "g1");
  if (rootG) {
    rootG.reactions = { like: ["u4", "u5", "u7"], insight: ["u1"] };
    pushMsg("g1", "u4", "برای کارگاه رمشک هم همین برنامه را پیاده کنیم؟ هزینه‌ی تجهیز را دارم برآورد می‌کنم.", "۱۰:۴۰", SOCIAL_TODAY, { parent_message_id: rootG.id, in_thread: true });
    pushMsg("g1", rootG.user_id === "u1" ? "u7" : rootG.user_id, "بله؛ برآورد را تا پنجشنبه در پوشه‌ی «مستندات ستاد» بگذارید.", "۱۰:۵۲", SOCIAL_TODAY, { parent_message_id: rootG.id, in_thread: true });
    const g1 = chats.find((c) => c.id === "g1");
    if (g1) g1.pinned_message_ids = [rootG.id];
  }
  const rootC = messages.find((m) => m.chat_id === "ch1");
  if (rootC) {
    rootC.reactions = { clap: ["u2", "u3", "u6", "u9"], love: ["u5"] };
    const ch1 = chats.find((c) => c.id === "ch1");
    if (ch1) ch1.pinned_message_ids = [rootC.id];
  }

  // «خوانده‌شده» تا یکی مانده به آخر برای u1 — تا شمارنده‌ی نخوانده واقعی باشد
  chats.forEach((c) => {
    const ms = messages.filter((m) => m.chat_id === c.id);
    c.members.forEach((m) => (c.last_read[m.user_id] = ms.length > 1 ? ms[ms.length - 2].seq : 0));
  });
  return { chats, messages };
}

// ------------------------------------------------------------------ دوستی‌ها
export function seedFriendships(): Friendship[] {
  const out: Friendship[] = [];
  const has = (a: string, b: string) => out.some((f) => (f.sender_id === a && f.receiver_id === b) || (f.sender_id === b && f.receiver_id === a));
  let n = 1;
  Object.entries(personalData).forEach(([uid, p]) => {
    p.friends.forEach((f) => !has(uid, f) && out.push({ id: `fr${n++}`, sender_id: uid, receiver_id: f, status: "accepted", blocked_by: null, created_at: at("۱۴۰۵/۰۱/۱۰"), updated_at: at("۱۴۰۵/۰۱/۱۲") }));
    p.incoming.forEach((f) => !has(uid, f) && out.push({ id: `fr${n++}`, sender_id: f, receiver_id: uid, status: "pending", blocked_by: null, created_at: at(addDays(SOCIAL_TODAY, -1)), updated_at: at(addDays(SOCIAL_TODAY, -1)) }));
    p.outgoing.forEach((f) => !has(uid, f) && out.push({ id: `fr${n++}`, sender_id: uid, receiver_id: f, status: "pending", blocked_by: null, created_at: at(addDays(SOCIAL_TODAY, -3)), updated_at: at(addDays(SOCIAL_TODAY, -3)) }));
  });
  out.push({ id: `fr${n++}`, sender_id: "u1", receiver_id: "u11", status: "blocked", blocked_by: "u1", created_at: at("۱۴۰۵/۰۲/۰۱"), updated_at: at("۱۴۰۵/۰۲/۰۱") });
  return out;
}

// ------------------------------------------------------------------ نظرها و واکنش‌ها
export function seedComments(): Comment[] {
  const c = (id: string, entity_name: EntityName, entity_id: string, user_id: string, content: string, approved: boolean, parent_id: string | null = null): Comment => ({
    id,
    user_id,
    entity_name,
    entity_id,
    content,
    parent_id,
    level: parent_id ? 1 : 0,
    approved,
    approved_at: approved ? at(SOCIAL_TODAY) : null,
    approved_by: approved ? "u2" : null,
    created_at: at(addDays(SOCIAL_TODAY, -1), "۱۰:۱۰:۰۰"),
    updated_at: at(addDays(SOCIAL_TODAY, -1), "۱۰:۱۰:۰۰"),
  });
  return [
    c("cmt1", "news", "news-nw1", "u4", "خبر خوبی بود؛ امیدوارم برای لنده هم همین سرعت را داشته باشیم.", true),
    c("cmt2", "news", "news-nw1", "u5", "گزارش تصویری هم به زودی بارگذاری می‌شود.", true, "cmt1"),
    c("cmt3", "news", "news-nw1", "u13", "آیا آمار دقیق بهره‌برداران منتشر می‌شود؟", false),
    c("cmt4", "magazine", "mag-1", "u6", "پرونده‌ی کاملی بود، مخصوصاً بخش درس‌آموخته‌ها.", true),
    c("cmt5", "blog", "blog-b1", "u9", "تجربه‌ی مشابهی در صبا داشتیم؛ خوشحال می‌شوم هم‌فکری کنیم.", true),
    c("cmt6", "media", "media-album1", "u3", "عکس‌ها خیلی گویا هستند.", false),
    c("cmt7", "event", "ev-x2", "u7", "اسلایدهای کارگاه قبل از جلسه ارسال می‌شود؟", true),
  ];
}
export const seedAllowedReactions = (): AllowedReaction[] => [
  { id: "ar1", code: "like", emoji: "👍", is_active: true },
  { id: "ar2", code: "love", emoji: "❤️", is_active: true },
  { id: "ar3", code: "clap", emoji: "👏", is_active: true },
  { id: "ar4", code: "insight", emoji: "💡", is_active: true },
  { id: "ar5", code: "celebrate", emoji: "🎉", is_active: true },
  { id: "ar6", code: "sad", emoji: "😢", is_active: false },
];
export function seedReactions(): ReactionRecord[] {
  const r: ReactionRecord[] = [];
  const add = (entity_name: EntityName, entity_id: string, pairs: [string, string][]) => pairs.forEach(([user_id, reaction_code]) => r.push({ entity_name, entity_id, user_id, reaction_code }));
  add("news", "news-nw1", [["u2", "like"], ["u4", "clap"], ["u5", "like"], ["u6", "love"]]);
  add("magazine", "mag-1", [["u3", "insight"], ["u4", "love"], ["u9", "like"]]);
  add("blog", "blog-b1", [["u1", "like"], ["u5", "insight"]]);
  add("media", "media-album1", [["u2", "love"], ["u5", "celebrate"], ["u7", "love"]]);
  add("topic", "tp-f1", [["u2", "insight"], ["u6", "like"]]);
  add("event", "ev-x2", [["u3", "like"]]);
  return r;
}

// ------------------------------------------------------------------ مدیر فایل
export function seedFiles(): { folders: FileFolder[]; files: FileItem[]; trash: TrashedFile[] } {
  const d = at("۱۴۰۵/۰۲/۱۵");
  const folders: FileFolder[] = [
    { id: "fd1", owner_type: "user", owner_id: "u1", name: "گزارش‌ها", parent_id: null, created_by_user_id: "u1", created_at: d, updated_at: d },
    { id: "fd2", owner_type: "user", owner_id: "u1", name: "گزارش‌های فصلی", parent_id: "fd1", created_by_user_id: "u1", created_at: d, updated_at: d },
    { id: "fd3", owner_type: "user", owner_id: "u1", name: "صورت‌جلسات", parent_id: null, created_by_user_id: "u1", created_at: d, updated_at: d },
    { id: "fd4", owner_type: "group", owner_id: "g1", name: "مستندات ستاد", parent_id: null, created_by_user_id: "u7", created_at: d, updated_at: d },
    { id: "fd5", owner_type: "channel", owner_id: "ch2", name: "عکس‌های بازدید", parent_id: null, created_by_user_id: "u4", created_at: d, updated_at: d },
  ];
  const f = (id: string, o: FileItem["owner_type"], oid: string, folder: string | null, name: string, size: string, mime: string, by = "u1"): FileItem => ({ id, owner_type: o, owner_id: oid, folder_id: folder, name, size, mime, created_by_user_id: by, created_at: d });
  const files: FileItem[] = [
    f("fl1", "user", "u1", "fd2", "گزارش-فصل-اول-۱۴۰۵.pdf", "۳٫۲ مگابایت", "application/pdf"),
    f("fl2", "user", "u1", "fd2", "آمار-بهره‌برداران.xlsx", "۴۸۰ کیلوبایت", "application/vnd.ms-excel"),
    f("fl3", "user", "u1", "fd3", "صورت‌جلسه-کمیته-راهبری.docx", "۲۱۰ کیلوبایت", "application/msword"),
    f("fl4", "user", "u1", null, "لوگو-بنیاد.png", "۹۰ کیلوبایت", "image/png"),
    f("fl5", "group", "g1", "fd4", "برنامه‌ی-عملیاتی-ستاد.pdf", "۱٫۱ مگابایت", "application/pdf", "u7"),
    f("fl6", "channel", "ch2", "fd5", "بازدید-مدرسه-رمشک.jpg", "۲٫۷ مگابایت", "image/jpeg", "u4"),
    f("fl7", "user", "u1", "fd3", "یادداشت-جلسه-هماهنگی.txt", "۶ کیلوبایت", "text/plain"),
  ];
  // «پیشنهادی» — نسخه‌ها، ستاره، اخیر و لینک اشتراک
  const fl1 = files[0];
  fl1.version = 3;
  fl1.created_at = at("۱۴۰۵/۰۳/۰۵", "۱۱:۲۰:۰۰");
  fl1.versions = [
    { id: "fv1", version: 2, size: "۳٫۰ مگابایت", created_at: at("۱۴۰۵/۰۲/۲۸", "۰۹:۱۰:۰۰"), created_by_user_id: "u4" },
    { id: "fv2", version: 1, size: "۲٫۶ مگابایت", created_at: d, created_by_user_id: "u1" },
  ];
  fl1.starred_by = ["u1"];
  files[4].starred_by = ["u1", "u7"];
  files[2].opened_at = { u1: at(addDays(SOCIAL_TODAY, -1), "۱۶:۰۵:۰۰") };
  files[3].opened_at = { u1: at(SOCIAL_TODAY, "۰۸:۴۰:۰۰") };
  files[6].opened_at = { u1: at(SOCIAL_TODAY, "۰۹:۱۵:۰۰") };
  files[1].share = { token: "q7m2kx9a", expires_on: addDays(SOCIAL_TODAY, 5), created_by: "u1", created_at: at(addDays(SOCIAL_TODAY, -2)), allow_download: true };
  const trash: TrashedFile[] = [
    { ...f("fl-t1", "user", "u1", "fd1", "پیش‌نویس-قدیمی-بودجه.xlsx", "۳۲۰ کیلوبایت", "application/vnd.ms-excel"), trashed_at: at(addDays(SOCIAL_TODAY, -4), "۱۴:۰۰:۰۰"), trashed_by: "u1" },
    { ...f("fl-t2", "user", "u1", null, "اسکن-نامه‌ی-۱۲۴.pdf", "۱٫۸ مگابایت", "application/pdf"), trashed_at: at(addDays(SOCIAL_TODAY, -26), "۱۰:۰۰:۰۰"), trashed_by: "u1" },
  ];
  return { folders, files, trash };
}

// ------------------------------------------------------------------ تنظیمات (کلیدها هم‌شکل /core/settings/all/)
export function seedSettings(): Setting[] {
  const s = (app: string, key: string, value: Setting["value"], value_type: Setting["value_type"], label: string): Setting => ({ id: key, app_name: app, scope: "global", key, value, value_type, label, updated_at: at("۱۴۰۵/۰۲/۰۱") });
  return [
    s("content", "content.blog.add_comment", true, "bool", "امکان ثبت نظر روی بلاگ"),
    s("content", "content.blog.show_comments", true, "bool", "نمایش نظرها زیر بلاگ"),
    s("content", "content.blog.item_per_page", 10, "int", "تعداد بلاگ در هر صفحه"),
    s("content", "content.news.add_comment", true, "bool", "امکان ثبت نظر روی خبر"),
    s("content", "content.news.item_per_page", 10, "int", "تعداد خبر در هر صفحه"),
    s("content", "content.magazine.item_per_page", 12, "int", "تعداد مجله در هر صفحه"),
    s("core", "core.comments.require_approval", true, "bool", "نظرها پیش از نمایش تأیید شوند"),
    s("media", "media.posts.max_album_items", 20, "int", "حداکثر فایل در هر آلبوم"),
    s("events", "events.default_capacity", 50, "int", "ظرفیت پیش‌فرض رویداد"),
    s("forums", "forums.topics.allow_anonymous", false, "bool", "پرسش ناشناس"),
    s("messaging", "messaging.groups.max_members", 500, "int", "حداکثر اعضای گروه"),
    s("messaging", "messaging.channels.max_members", 5000, "int", "حداکثر اعضای کانال"),
    s("messaging", "messaging.direct-messages.allow_non_friends", true, "bool", "پیام مستقیم به غیر دوستان"),
    s("relations", "relations.friendships.max_friends", 1000, "int", "حداکثر تعداد دوستان"),
  ];
}
