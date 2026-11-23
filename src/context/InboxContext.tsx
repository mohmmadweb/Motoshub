// ---------------------------------------------------------------------------
// صندوق اعلان‌های شخصی (غیر از پروژه) — طبق سند «بخش‌هایی که به اعلان شخصی نیاز دارد»:
//  ۱) ارسال درخواست دوستی  ۲) پذیرش/رد درخواست  ۳) انتشار محتوای جدید (مجله، خبر،
//  عکس، ویدیو، انجمن، رویداد)  ۴) پیام شخصی  ۵) منشن در گروه/کانال  ۶) پیام کانال‌هایی
//  که اعلانشان روشن است  ۷) دعوت به رویداد  ۸) پاسخ به موضوع/نظر کاربر در انجمن
// + رویدادهای مدیریت دانش (سند جدید، تأیید/رد، ارجاع، موعد بازبینی، …)
// شکل ذخیره = `Notification` واقعی سرویس اعلان (DATA_ALIGNMENT §8): هر گیرنده یک ردیف با
// recipient_id/actor_id عددی، event_type، entity_type/entity_id، data (متن و پیوند)، is_read، is_visible.
// قرارداد C5: `notify({ recipient_id, actor_id, event_type, entity_type, entity_id, data })`؛
// امضای قدیمی `send(نام‌ها | "*", نوع، متن، پیوند)` هم پذیرفته می‌شود (همگانی = یک ردیف برای هر کاربر).
// ---------------------------------------------------------------------------
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTenancy } from "./TenancyContext";
import { users } from "../data/mock";
import { paginate, type PageQuery, type SocialPage } from "../api/envelopes";

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
  | "chat_added"
  | "group_message"
  | "announcement"
  | "timesheet"
  | "report"
  | "access"
  // F06/F12 — دنبال‌کردن موضوع پرسش و پاسخ، امنیت حساب
  | "topic_follow"
  | "security"
  // دبیرخانه و مشتریان (WP8) و «انتقال کار»
  | "letter_received"
  | "letter_referred"
  | "letter_paraph"
  | "crm_shared"
  | "handover";

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
  group_message: "پیام گروه",
  announcement: "اطلاعیه‌ی رسمی",
  timesheet: "یادآوری کارکرد",
  report: "گزارش زمان‌بندی‌شده",
  access: "درخواست دسترسی",
  topic_follow: "موضوع دنبال‌شده",
  security: "امنیت حساب",
  letter_received: "نامه‌ی رسیده",
  letter_referred: "ارجاع نامه",
  letter_paraph: "پاراف نامه",
  crm_shared: "اشتراک پرونده‌ی مشتری",
  handover: "انتقال کار",
};

/** event_type → entity_type پیش‌فرض (EntityNameChoices) وقتی فرستنده نگفته باشد */
const entityOfKind: Partial<Record<InboxKind, string>> = {
  friend_request: "friendship",
  friend_accept: "friendship",
  friend_reject: "friendship",
  direct_message: "message",
  channel_message: "message",
  group_message: "message",
  mention: "message",
  chat_added: "chat",
  event_invite: "event",
  reply: "forum_post",
  topic_follow: "forum_topic",
  knowledge: "knowledge_document",
  announcement: "news",
  letter_received: "letter",
  letter_referred: "letter",
  letter_paraph: "letter",
  crm_shared: "customer_file",
};

/** گروه‌های event_type برای زبانه‌های v6.8 (نوع mention «پیشنهادی» است) */
export const actionKinds: InboxKind[] = ["friend_request", "event_invite", "access", "letter_received", "letter_referred", "letter_paraph", "timesheet", "handover"];
export const mentionKinds: InboxKind[] = ["mention"];

/** نوع‌هایی که همیشه تحویل می‌شوند (بی‌صدا، ساعات سکوت و خلاصه‌ی روزانه رویشان اثر ندارد) */
export const urgentKinds: InboxKind[] = ["announcement"];
/** نوع‌های کم‌اهمیت که در «خلاصه‌ی روزانه» جمع می‌شوند */
export const digestKinds: InboxKind[] = ["new_content", "channel_message", "group_message", "chat_added"];

/** ردیف واقعی `Notification` (`/notification/notifications/`) */
export type Notification = {
  /** uuid7 */
  id: string;
  recipient_id: number;
  actor_id: number | null;
  /** slug `EventType.code` */
  event_type: InboxKind;
  /** EntityNameChoices */
  entity_type: string | null;
  entity_id: string | number | null;
  /** بار اعلان؛ متن و پیوند از روی آن ساخته می‌شود. priority «پیشنهادی» */
  data: { text: string; link: string; priority?: "urgent" | "normal"; broadcast?: boolean; actor_name?: string; time_label?: string; [k: string]: unknown };
  is_read: boolean;
  is_visible: boolean;
  created_at: string;
};

/** نمای سازگار با مصرف‌کننده‌های قبلی (kind/text/link/time/…) روی همان ردیف واقعی */
export type InboxItem = Notification & {
  kind: InboxKind;
  /** نام گیرنده یا «*» برای اعلان همگانی */
  recipient: string;
  actor: string;
  text: string;
  link: string;
  time: string;
  seq: number;
  urgent?: boolean;
};

/** ورودی C5 */
export type NotifyInput = {
  recipient_id: number | number[] | string | string[] | "*";
  actor_id?: number | string | null;
  event_type: InboxKind;
  entity_type?: string | null;
  entity_id?: string | number | null;
  data: { text: string; link: string; priority?: "urgent" | "normal"; [k: string]: unknown };
};

type Store = {
  version: 2;
  seq: number;
  items: Notification[];
  channelSubs: Record<string, string[]>;
  /** نوع‌های اعلانی که هر کاربر خاموش کرده است (نام کاربر ← نوع‌ها) */
  kindOff: Record<string, InboxKind[]>;
};
const KEY = "motoshub.inbox.v1";

const userByName = (n: string) => users.find((u) => u.name === n);
const userById = (id: number) => users.find((u) => u.user_id === id);
/** «u2» / ۲ / «حسین دهقان» → user_id */
function toUserId(ref: number | string | null | undefined): number | null {
  if (ref === null || ref === undefined || ref === "") return null;
  if (typeof ref === "number") return ref;
  const u = users.find((x) => x.id === ref || x.name === ref || x.principal_id === ref);
  return u?.user_id ?? null;
}
/** شناسه‌ی شبه uuid7 (ترتیب زمانی در ابتدای رشته) */
function uuid7(seq: number) {
  const t = Date.now().toString(16).padStart(12, "0");
  const r = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  return `${t.slice(0, 8)}-${t.slice(8, 12)}-7${String(seq % 4096).padStart(3, "0")}-8${r.slice(0, 3)}-${r}${String(seq).padStart(4, "0").slice(-4)}`;
}
const KNOWN = (k: unknown): k is InboxKind => typeof k === "string" && k in inboxKindLabel;

function row(seq: number, recipient_id: number, kind: InboxKind, text: string, link: string, extra: Partial<Notification> & { actorName?: string; urgent?: boolean; broadcast?: boolean; timeLabel?: string } = {}): Notification {
  const { actorName, urgent, broadcast, timeLabel, ...rest } = extra;
  return {
    id: uuid7(seq),
    recipient_id,
    actor_id: rest.actor_id ?? (actorName ? toUserId(actorName) : null),
    event_type: kind,
    entity_type: rest.entity_type ?? entityOfKind[kind] ?? null,
    entity_id: rest.entity_id ?? null,
    data: { text, link, ...(urgent ? { priority: "urgent" as const } : {}), ...(broadcast ? { broadcast: true } : {}), ...(actorName ? { actor_name: actorName } : {}), ...(timeLabel ? { time_label: timeLabel } : {}), seq },
    is_read: rest.is_read ?? false,
    is_visible: rest.is_visible ?? true,
    created_at: rest.created_at ?? new Date().toISOString(),
  };
}

const seed = (): Store => {
  const me = userByName("پایگاه اطلاع‌رسانی بنیاد")?.user_id ?? 1;
  return {
    version: 2,
    seq: 100,
    kindOff: {},
    channelSubs: { "محسن مردعلی": ["ch2"], "وحید خاوئی": ["ch1", "ch2"], "پایگاه اطلاع‌رسانی بنیاد": ["ch1"] },
    items: [
      row(3, me, "mention", "«حسین دهقان» در گروه «ستاد محرومیت‌زدایی» به شما اشاره کرد.", "/groups", { actorName: "حسین دهقان", timeLabel: "۲۵ دقیقه پیش" }),
      row(1, me, "friend_request", "«دکتر نگین فرهمند» برای شما درخواست دوستی فرستاد.", "/friends", { actorName: "دکتر نگین فرهمند", timeLabel: "۲ ساعت پیش" }),
      row(2, me, "reply", "«محسن مردعلی» به موضوع شما در انجمن پاسخ داد.", "/forums", { actorName: "محسن مردعلی", timeLabel: "دیروز" }),
    ],
  };
};

/** ارتقای ذخیره‌ی نسخه‌ی ۱ (گیرنده = نام یا «*»، readBy/hiddenFor) به ردیف‌های واقعی */
type V1Item = { id: string; kind: string; recipient: string; actor: string; text: string; link: string; time: string; seq: number; readBy?: string[]; hiddenFor?: string[]; urgent?: boolean };
function migrateV1(items: V1Item[]): Notification[] {
  const out: Notification[] = [];
  items.filter((i) => KNOWN(i?.kind)).forEach((i) => {
    const targets = i.recipient === "*" ? users : users.filter((u) => u.name === i.recipient);
    targets.forEach((u) =>
      out.push({
        ...row(i.seq, u.user_id ?? 0, i.kind as InboxKind, i.text, i.link, { actorName: i.actor === "سامانه" ? undefined : i.actor, urgent: i.urgent, broadcast: i.recipient === "*", timeLabel: i.time }),
        id: `${i.id}-${u.user_id}`,
        is_read: (i.readBy ?? []).includes(u.name),
        is_visible: !(i.hiddenFor ?? []).includes(u.name),
      }),
    );
  });
  return out;
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Store> & { items?: unknown[] };
      const base = seed();
      const kindOff = Object.fromEntries(Object.entries(s.kindOff ?? {}).map(([n, ks]) => [n, Array.isArray(ks) ? ks.filter(KNOWN) : []]));
      const items = !Array.isArray(s.items)
        ? base.items
        : s.version === 2
          ? (s.items as Notification[]).filter((i) => i && KNOWN(i.event_type) && typeof i.recipient_id === "number")
          : migrateV1(s.items as V1Item[]);
      return { version: 2, seq: s.seq ?? base.seq, items, channelSubs: s.channelSubs ?? base.channelSubs, kindOff };
    }
  } catch {
    /* ذخیره‌ساز در دسترس نیست */
  }
  return seed();
}

type Ctx = {
  /** اعلان‌های کاربر جاری (نمای سازگار) */
  mine: InboxItem[];
  unread: number;
  /** همه‌ی ردیف‌ها (نمای راهبر) */
  all: InboxItem[];
  /** C5 — ثبت اعلان به شکل واقعی؛ انجام‌دهنده خودش اعلان نمی‌گیرد مگر data.system */
  notify: (n: NotifyInput) => void;
  /** امضای قدیمی؛ انجام‌دهنده خودش اعلان نمی‌گیرد */
  send: (recipients: string[] | "*", kind: InboxKind, text: string, link: string, opts?: { urgent?: boolean; /** فرستنده «سامانه» — به خودِ کاربر هم تحویل می‌شود */ system?: boolean }) => void;
  /** `GET /notification/notifications/` — پاکت `{ data, meta }` برای کاربر جاری */
  list: (q?: PageQuery & { is_read?: boolean; event_types?: InboxKind[] }) => SocialPage<Notification>;
  /** همه‌ی اعلان‌های کاربر جاری، حتی نوع‌های خاموش‌شده (برای صفحه‌ی تنظیمات) */
  mineAll: InboxItem[];
  isKindOn: (kind: InboxKind) => boolean;
  toggleKind: (kind: InboxKind) => void;
  isUrgent: (item: InboxItem) => boolean;
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

const toFa = (n: number) => n.toLocaleString("fa-IR", { minimumIntegerDigits: 2, useGrouping: false });
/** برچسب زمان: «امروز ۱۰:۲۲» یا تاریخ شمسی */
function timeLabel(n: Notification) {
  if (n.data.time_label) return n.data.time_label;
  const d = new Date(n.created_at);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const hm = `${toFa(d.getHours())}:${toFa(d.getMinutes())}`;
  if (d.toDateString() === today.toDateString()) return `امروز ${hm}`;
  return `${new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d)} ${hm}`;
}

function view(n: Notification): InboxItem {
  const actorName = n.data.actor_name ?? (n.actor_id !== null ? userById(n.actor_id)?.name : undefined) ?? "سامانه";
  return {
    ...n,
    kind: n.event_type,
    recipient: n.data.broadcast ? "*" : (userById(n.recipient_id)?.name ?? String(n.recipient_id)),
    actor: actorName,
    text: n.data.text,
    link: n.data.link,
    time: timeLabel(n),
    seq: typeof n.data.seq === "number" ? n.data.seq : 0,
    ...(n.data.priority === "urgent" ? { urgent: true } : {}),
  };
}

export function InboxProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(load);
  const { actingUser } = useTenancy();
  const me = actingUser.name;
  const myId = actingUser.user_id ?? toUserId(actingUser.id) ?? -1;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      /* نادیده */
    }
  }, [store]);

  const isUrgent = (i: InboxItem) => !!i.urgent || urgentKinds.includes(i.kind);
  const off = store.kindOff[me] ?? [];
  const minePlain = store.items.filter((i) => i.recipient_id === myId && i.is_visible && i.actor_id !== myId).sort((a, b) => b.created_at.localeCompare(a.created_at) || Number(b.data.seq ?? 0) - Number(a.data.seq ?? 0));
  const mineAll = minePlain.map(view);
  // ترجیح کاربر: نوع‌های خاموش‌شده نمایش داده نمی‌شوند — مگر اعلان فوری
  const mine = mineAll.filter((i) => isUrgent(i) || !off.includes(i.kind));
  const isRead = (i: InboxItem) => i.is_read;

  /** ساخت ردیف‌ها برای گیرندگان (عدد user_id)؛ actor خودش حذف می‌شود مگر system */
  const push = (recipientIds: number[], kind: InboxKind, text: string, link: string, opts: { actorId: number | null; actorName?: string; urgent?: boolean; broadcast?: boolean; system?: boolean; entity_type?: string | null; entity_id?: string | number | null; extra?: Record<string, unknown> }) =>
    setStore((prev) => {
      let seq = prev.seq;
      const ids = [...new Set(recipientIds)].filter((r) => r > 0 && (opts.system || r !== opts.actorId));
      const fresh = ids.map((rid) => {
        const n = row(++seq, rid, kind, text, link, { actor_id: opts.actorId, actorName: opts.actorName, urgent: opts.urgent, broadcast: opts.broadcast, entity_type: opts.entity_type, entity_id: opts.entity_id });
        if (opts.extra) n.data = { ...opts.extra, ...n.data };
        return n;
      });
      return { ...prev, seq, items: [...fresh, ...prev.items] };
    });

  const allIds = () => users.map((u) => u.user_id ?? 0);

  const value: Ctx = {
    mine,
    mineAll,
    isUrgent,
    isKindOn: (k) => !off.includes(k),
    toggleKind: (k) =>
      setStore((prev) => {
        const cur = prev.kindOff[me] ?? [];
        return { ...prev, kindOff: { ...prev.kindOff, [me]: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] } };
      }),
    all: [...store.items].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(view),
    unread: mine.filter((i) => !i.is_read).length,
    isRead,
    notify: (n) => {
      const refs = n.recipient_id === "*" ? allIds() : (Array.isArray(n.recipient_id) ? n.recipient_id : [n.recipient_id]).map((r) => toUserId(r)).filter((x): x is number => x !== null);
      const actorId = n.actor_id === undefined ? myId : toUserId(n.actor_id);
      const { text, link, priority, ...extra } = n.data;
      push(refs, n.event_type, text, link, { actorId, actorName: actorId !== null ? userById(actorId)?.name : undefined, urgent: priority === "urgent", broadcast: n.recipient_id === "*", system: !!extra.system || n.actor_id === null, entity_type: n.entity_type, entity_id: n.entity_id, extra });
    },
    send: (recipients, kind, text, link, opts) => {
      const ids = recipients === "*" ? allIds() : recipients.map((r) => toUserId(r)).filter((x): x is number => x !== null);
      push(ids, kind, text, link, { actorId: opts?.system ? null : myId, actorName: opts?.system ? undefined : me, urgent: opts?.urgent, broadcast: recipients === "*", system: opts?.system });
    },
    list: (q = {}) => {
      const rows = minePlain.filter((i) => (q.is_read === undefined || i.is_read === q.is_read) && (!q.event_types || q.event_types.includes(i.event_type)));
      return paginate(rows, q);
    },
    markRead: (id, read = true) => setStore((prev) => ({ ...prev, items: prev.items.map((i) => (i.id !== id ? i : { ...i, is_read: read })) })),
    markAllRead: () => setStore((prev) => ({ ...prev, items: prev.items.map((i) => (i.recipient_id === myId && !i.is_read ? { ...i, is_read: true } : i)) })),
    hide: (id) => setStore((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, is_visible: false } : i)) })),
    hideAll: () => setStore((prev) => ({ ...prev, items: prev.items.map((i) => (i.recipient_id === myId ? { ...i, is_visible: false } : i)) })),
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

/** endpointهای واقعی سرویس اعلان (برای دکمه‌ی API) */
export const notificationEndpoints = {
  list: { method: "GET", path: "/notification/notifications/" },
  unreadCount: { method: "GET", path: "/notification/notifications/unread_count/" },
  markRead: { method: "POST", path: "/notification/notifications/{id}/mark_read/" },
  markAllRead: { method: "POST", path: "/notification/notifications/mark_read_all/" },
  eventTypes: { method: "GET", path: "/notification/event-types/" },
  preferences: { method: "GET", path: "/notification/user-notification-types/" },
} as const;

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
