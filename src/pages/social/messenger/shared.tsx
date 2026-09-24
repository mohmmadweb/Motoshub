// ---------------------------------------------------------------------------
// کمکی‌های مشترک پیام‌رسان (گفتگوها / گروه‌ها / کانال‌ها) — ماژول messaging در Motoshub Social API
// ---------------------------------------------------------------------------
import { Fragment } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Bot, Megaphone, Users } from "lucide-react";
import Avatar from "../../../components/Avatar";
import { users } from "../../../data/mock";
import type { Chat, ChatType, EntityName, OwnerType } from "../../../social/types";

export type MessengerMode = "chat" | "groups" | "channels";

export const modeConf: Record<
  MessengerMode,
  { base: string; title: string; types: ChatType[]; listPerm: string; createPerm: string; managePerm: string; entity: EntityName | null; owner: OwnerType | null; noun: string; subNoun: string; rootChip: string }
> = {
  chat: { base: "/dashboard/chat", title: "گفتگوها", types: ["direct_message", "saved_messages", "bot"], listPerm: "chat.view", createPerm: "chat.view", managePerm: "chat.view", entity: null, owner: null, noun: "گفتگو", subNoun: "", rootChip: "" },
  groups: { base: "/dashboard/groups", title: "گروه‌ها", types: ["group"], listPerm: "groups.list", createPerm: "groups.create", managePerm: "groups.manage", entity: "group", owner: "group", noun: "گروه", subNoun: "تاپیک", rootChip: "عمومی" },
  channels: { base: "/dashboard/channels", title: "کانال‌ها", types: ["channel"], listPerm: "channels.list", createPerm: "channels.create", managePerm: "channels.manage", entity: "channel", owner: "channel", noun: "کانال", subNoun: "زیرکانال", rootChip: "کانال اصلی" },
};

/** بخش مسیر API برای هر نوع گفتگو */
export type ApiSeg = "channels" | "groups" | "direct-messages" | "saved-messages" | "bots";
export const apiSeg = (t: ChatType): ApiSeg =>
  t === "channel" ? "channels" : t === "group" ? "groups" : t === "saved_messages" ? "saved-messages" : t === "bot" ? "bots" : "direct-messages";

/** برای پیام مستقیم: طرف مقابل */
export const otherUserId = (c: Chat, me: string) => (c.chat_type === "direct_message" ? (c.receiver && c.receiver !== me ? c.receiver : c.members.find((m) => m.user_id !== me)?.user_id ?? null) : null);

export const chatTitle = (c: Chat, me: string) => {
  if (c.chat_type === "saved_messages") return "پیام‌های ذخیره‌شده";
  const o = otherUserId(c, me);
  if (o) return users.find((u) => u.id === o)?.name ?? c.title;
  return c.title;
};

export const chatColor = (c: Chat, me: string) => {
  const o = otherUserId(c, me);
  if (o) return users.find((u) => u.id === o)?.avatarColor ?? "#64748b";
  return c.profile_photos[0] ?? (c.chat_type === "channel" ? "#1f4f99" : "#0d9488");
};

export function ChatAvatar({ chat, me, size = 40 }: { chat: Chat; me: string; size?: number }) {
  const icon = chat.chat_type === "saved_messages" ? Bookmark : chat.chat_type === "bot" ? Bot : null;
  if (icon) {
    const I = icon;
    return (
      <span className="rounded-full flex items-center justify-center shrink-0 bg-brand-100 text-brand-700" style={{ width: size, height: size }}>
        <I size={size * 0.45} />
      </span>
    );
  }
  if (chat.chat_type === "group" || chat.chat_type === "channel") {
    const I = chat.chat_type === "channel" ? Megaphone : Users;
    return (
      <span className="rounded-full flex items-center justify-center shrink-0 text-white" style={{ width: size, height: size, background: chatColor(chat, me) }}>
        <I size={size * 0.42} />
      </span>
    );
  }
  return <Avatar name={chatTitle(chat, me)} color={chatColor(chat, me)} size={size} />;
}

/** «۱۴۰۵/۰۶/۳۱ ۱۱:۱۲:۵۱» → «۱۱:۱۲» */
export const timeOf = (s: string) => (s.split(" ")[1] ?? "").slice(0, 5);
/** زمان کوتاه برای فهرست: امروز ← ساعت ، وگرنه ← تاریخ بدون سال */
export const shortWhen = (s: string, today: string) => {
  const [d] = s.split(" ");
  return d === today ? timeOf(s) : d.slice(5);
};

/** منشن‌ها (@نام_خانوادگی) و هشتگ‌ها (#برچسب) درون متن */
const TOKEN = /(@[^\s،.,!؟?]+|#[^\s،.,!؟?#]+)/g;
export const tagsIn = (text: string) => [...new Set((text.match(/#[^\s،.,!؟?#]+/g) ?? []).map((t) => t.slice(1)))];

export function RichText({ text }: { text: string }) {
  const parts = text.split(TOKEN);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("@") && p.length > 1) {
          const name = p.slice(1).replace(/_/g, " ");
          const u = users.find((x) => x.name === name);
          return u ? (
            <Link key={i} to={`/dashboard/profile/${u.id}`} className="text-brand-700 font-medium bg-brand-50 rounded px-0.5 hover:underline">
              @{name}
            </Link>
          ) : (
            <span key={i} className="text-brand-700 font-medium">
              {p}
            </span>
          );
        }
        if (p.startsWith("#") && p.length > 1)
          return (
            <Link key={i} to={`/dashboard/topics?tag=${encodeURIComponent(p.slice(1))}`} className="text-brand-700 hover:underline">
              {p}
            </Link>
          );
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

export const stickers = ["👍", "❤️", "😂", "🎉", "🙏", "🔥", "👏", "😍", "🤔", "😢", "✅", "🚀"];
export const wallPalette = ["#1f4f99", "#0d9488", "#b45309", "#7c3aed", "#be123c", "#15803d", "#0369a1", "#a16207"];
