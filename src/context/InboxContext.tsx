// ---------------------------------------------------------------------------
// صندوق اعلان‌های شخصی (غیر از پروژه) — طبق سند «بخش‌هایی که به اعلان شخصی نیاز دارد»:
//  ۱) ارسال درخواست دوستی  ۲) پذیرش/رد درخواست  ۳) انتشار محتوای جدید (مجله، خبر،
//  عکس، ویدیو، انجمن، رویداد)  ۴) پیام شخصی  ۵) منشن در گروه/کانال  ۶) پیام کانال‌هایی
//  که اعلانشان روشن است  ۷) دعوت به رویداد  ۸) پاسخ به موضوع/نظر کاربر در انجمن
// + رویدادهای مدیریت دانش (سند جدید، تأیید/رد، ارجاع، موعد بازبینی، …)
// گیرنده با «نام کاربر» یا «*» (همه) مشخص می‌شود؛ وضعیت خوانده‌شدن برای هر کاربر جداست.
// ---------------------------------------------------------------------------
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTenancy } from "./TenancyContext";

export type InboxKind =
  | "friend_request"
  | "friend_accept"
  | "friend_reject"
  | "new_content"
  | "direct_message"
  | "mention"
  | "channel_message"
  | "event_invite"
  | "reply"
  | "knowledge"
  | "chat_added";

export const inboxKindLabel: Record<InboxKind, string> = {
  friend_request: "درخواست دوستی",
  friend_accept: "پذیرش دوستی",
  friend_reject: "رد درخواست دوستی",
  new_content: "محتوای جدید",
  direct_message: "پیام شخصی",
  mention: "منشن",
  channel_message: "پیام کانال",
  event_invite: "دعوت به رویداد",
  reply: "پاسخ به شما",
  knowledge: "مدیریت دانش",
  chat_added: "عضویت در گروه/کانال",
};

export type InboxItem = {
  id: string;
  kind: InboxKind;
  /** نام گیرنده یا «*» برای همه */
  recipient: string;
  actor: string;
  text: string;
  /** مسیر داخل اپ برای باز کردن موضوع اعلان */
  link: string;
  time: string;
  seq: number;
  /** کاربرانی که خوانده‌اند (برای اعلان‌های همگانی لازم است) */
  readBy: string[];
  /** کاربرانی که از فهرست خودشان حذف کرده‌اند */
  hiddenFor: string[];
};

type Store = { seq: number; items: InboxItem[]; channelSubs: Record<string, string[]> };
const KEY = "motoshub.inbox.v1";

const seed = (): Store => ({
  seq: 100,
  channelSubs: { "محسن مردعلی": ["ch2"], "وحید خاوئی": ["ch1", "ch2"], "پایگاه اطلاع‌رسانی بنیاد": ["ch1"] },
  items: [
    { id: "ib1", kind: "friend_request", recipient: "پایگاه اطلاع‌رسانی بنیاد", actor: "دکتر نگین فرهمند", text: "«دکتر نگین فرهمند» برای شما درخواست دوستی فرستاد.", link: "/dashboard/friends", time: "۲ ساعت پیش", seq: 1, readBy: [], hiddenFor: [] },
    { id: "ib2", kind: "reply", recipient: "پایگاه اطلاع‌رسانی بنیاد", actor: "محسن مردعلی", text: "«محسن مردعلی» به موضوع شما در انجمن پاسخ داد.", link: "/dashboard/forum", time: "دیروز", seq: 2, readBy: [], hiddenFor: [] },
  ],
});

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    /* ذخیره‌ساز در دسترس نیست */
  }
  return seed();
}

type Ctx = {
  /** اعلان‌های کاربر جاری (شخصی + همگانی) */
  mine: InboxItem[];
  unread: number;
  all: InboxItem[];
  /** ارسال اعلان؛ انجام‌دهنده خودش اعلان نمی‌گیرد */
  send: (recipients: string[] | "*", kind: InboxKind, text: string, link: string) => void;
  markRead: (id: string, read?: boolean) => void;
  markAllRead: () => void;
  hide: (id: string) => void;
  hideAll: () => void;
  isRead: (item: InboxItem) => boolean;
  /** اشتراک اعلان پیام‌های یک کانال برای کاربر جاری (بند ۶) */
  isSubscribed: (channelId: string) => boolean;
  toggleSubscription: (channelId: string) => void;
  subscribersOf: (channelId: string) => string[];
};

const InboxContext = createContext<Ctx | null>(null);

const clock = () => {
  const d = new Date();
  return `امروز ${d.getHours().toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}:${d.getMinutes().toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}`;
};

export function InboxProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(load);
  const { actingUser } = useTenancy();
  const me = actingUser.name;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      /* نادیده */
    }
  }, [store]);

  const mine = store.items.filter((i) => (i.recipient === me || i.recipient === "*") && i.actor !== me && !i.hiddenFor.includes(me)).sort((a, b) => b.seq - a.seq);
  const isRead = (i: InboxItem) => i.readBy.includes(me);

  const value: Ctx = {
    mine,
    all: [...store.items].sort((a, b) => b.seq - a.seq),
    unread: mine.filter((i) => !isRead(i)).length,
    isRead,
    send: (recipients, kind, text, link) =>
      setStore((prev) => {
        const list = recipients === "*" ? ["*"] : [...new Set(recipients.filter((r) => r && r !== me))];
        let seq = prev.seq;
        const time = clock();
        const fresh: InboxItem[] = list.map((recipient) => ({ id: `ib${++seq}`, kind, recipient, actor: me, text, link, time, seq, readBy: [], hiddenFor: [] }));
        return { ...prev, seq, items: [...fresh, ...prev.items] };
      }),
    markRead: (id, read = true) =>
      setStore((prev) => ({ ...prev, items: prev.items.map((i) => (i.id !== id ? i : { ...i, readBy: read ? [...new Set([...i.readBy, me])] : i.readBy.filter((x) => x !== me) })) })),
    markAllRead: () =>
      setStore((prev) => ({ ...prev, items: prev.items.map((i) => ((i.recipient === me || i.recipient === "*") && !i.readBy.includes(me) ? { ...i, readBy: [...i.readBy, me] } : i)) })),
    hide: (id) => setStore((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, hiddenFor: [...i.hiddenFor, me] } : i)) })),
    hideAll: () => setStore((prev) => ({ ...prev, items: prev.items.map((i) => (i.recipient === me || i.recipient === "*" ? { ...i, hiddenFor: [...new Set([...i.hiddenFor, me])] } : i)) })),
    isSubscribed: (ch) => (store.channelSubs[me] ?? []).includes(ch),
    toggleSubscription: (ch) =>
      setStore((prev) => {
        const cur = prev.channelSubs[me] ?? [];
        return { ...prev, channelSubs: { ...prev.channelSubs, [me]: cur.includes(ch) ? cur.filter((x) => x !== ch) : [...cur, ch] } };
      }),
    subscribersOf: (ch) => Object.entries(store.channelSubs).filter(([, chs]) => chs.includes(ch)).map(([name]) => name),
  };

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error("useInbox must be used within InboxProvider");
  return ctx;
}

/** «@محسن_مردعلی» → «محسن مردعلی» اگر در فهرست نام‌ها باشد */
export function mentionsIn(text: string, names: string[]): string[] {
  const found = new Set<string>();
  (text.match(/@[^\s،.,!؟?]+/g) ?? []).forEach((tok) => {
    const n = tok.slice(1).replace(/_/g, " ");
    const hit = names.find((x) => x === n);
    if (hit) found.add(hit);
  });
  return [...found];
}
