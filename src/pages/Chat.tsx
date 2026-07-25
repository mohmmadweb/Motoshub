import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Search,
  Paperclip,
  Send,
  Check,
  CheckCheck,
  Phone,
  Video,
  MoreVertical,
  Hash,
  Lock,
  Pin,
  Bookmark,
  Users,
  Bold,
  Italic,
  Code,
  Link2,
  Slash,
  ThumbsUp,
  Heart,
  Smile,
  CheckCircle2,
  MessageSquareText,
  X,
  Star,
  Reply,
  Forward,
  Copy,
  Pencil,
  Trash2,
  Mic,
  Play,
  Image as ImageIcon,
  FileText,
  BarChart3,
  ChevronDown,
  BellOff,
  Ban,
  Eraser,
} from "lucide-react";
import {
  channels,
  channelMessages as initialChannelMessages,
  chatThreads as initialChatThreads,
  users,
  currentUser,
  userPresence,
  integrations,
  type Channel,
  type ChannelMessage,
  type ReactionIcon,
} from "../data/mock";
import Avatar from "../components/Avatar";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import Drawer from "../components/ui/Drawer";
import Toggle from "../components/ui/Toggle";
import { useToast } from "../components/ui/ToastProvider";

const reactionIconMap: Record<ReactionIcon, typeof ThumbsUp> = { ThumbsUp, Heart, Smile, CheckCircle2 };

// واکنش‌های سریع (محتوای پیام — نه آیکون ساختاری)
const quickEmojis = ["👍", "❤️", "🔥", "🙏", "👏", "😂", "🎉", "✅"];

type Selection = { kind: "channel" | "dm"; id: string };

type DmMsg = {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
  kind?: "text" | "voice" | "file" | "photo";
  meta?: { duration?: string; fileName?: string; size?: string };
  replyTo?: { author: string; text: string };
  forwardedFrom?: string;
  edited?: boolean;
  pinned?: boolean;
  reactions?: { emoji: string; count: number; mine?: boolean }[];
};

type DmThreadState = {
  id: string;
  with: string;
  avatarColor: string;
  online?: boolean;
  lastMessage: string;
  time: string;
  unread: number;
  messages: DmMsg[];
};

const nowFa = () => new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });

// پس‌زمینه پترن‌دار گفتگو: کلاس chat-surface در index.css (با نسخه تیره)

export default function Chat() {
  const [selection, setSelection] = useState<Selection>({ kind: "dm", id: initialChatThreads[0].id });
  const [messages, setMessages] = useState<ChannelMessage[]>(initialChannelMessages);
  const [dmThreads, setDmThreads] = useState<DmThreadState[]>(
    initialChatThreads.map((t) => ({
      ...t,
      messages: t.messages.map((m, i) => ({
        id: `${t.id}-m${i}`,
        from: m.from,
        text: m.text,
        time: m.time,
        status: m.from === "me" ? (m.read ? "read" : "delivered") : undefined,
        kind: "text" as const,
      })),
    }))
  );
  const [draft, setDraft] = useState("");
  const [threadFor, setThreadFor] = useState<ChannelMessage | null>(null);
  const [panel, setPanel] = useState<"none" | "pinned" | "saved" | "members" | "profile">("none");
  const [favorites, setFavorites] = useState<string[]>(["ch1"]);
  const [replyTo, setReplyTo] = useState<DmMsg | null>(null);
  const [editing, setEditing] = useState<DmMsg | null>(null);
  const [forwarding, setForwarding] = useState<DmMsg | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [convSearch, setConvSearch] = useState<string | null>(null);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [showJump, setShowJump] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { notify } = useToast();

  const activeChannel = selection.kind === "channel" ? channels.find((c) => c.id === selection.id) : undefined;
  const activeDm = selection.kind === "dm" ? dmThreads.find((c) => c.id === selection.id) : undefined;

  const channelMsgs = useMemo(() => messages.filter((m) => m.channelId === selection.id), [messages, selection]);

  const scrollToBottom = (smooth = true) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  };

  useEffect(() => {
    scrollToBottom(false);
    setReplyTo(null);
    setEditing(null);
    setConvSearch(null);
    // ورود به گفتگو = خوانده‌شدن
    if (selection.kind === "dm") {
      setDmThreads((prev) => prev.map((t) => (t.id === selection.id ? { ...t, unread: 0 } : t)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  useEffect(() => {
    if (!recording) return;
    const iv = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [recording]);

  const updateDm = (threadId: string, fn: (msgs: DmMsg[]) => DmMsg[], last?: string) => {
    setDmThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, messages: fn(t.messages), ...(last !== undefined ? { lastMessage: last, time: nowFa() } : {}) } : t))
    );
  };

  // شبیه‌سازی تحویل/خواندن + «در حال نوشتن» طرف مقابل
  const simulateDelivery = (threadId: string, msgId: string) => {
    setTimeout(() => updateDm(threadId, (msgs) => msgs.map((m) => (m.id === msgId ? { ...m, status: "delivered" } : m))), 700);
    setTimeout(() => setPeerTyping(true), 1400);
    setTimeout(() => {
      setPeerTyping(false);
      updateDm(threadId, (msgs) => msgs.map((m) => (m.from === "me" ? { ...m, status: "read" } : m)));
    }, 3400);
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text && !editing) return;

    if (editing && activeDm) {
      updateDm(activeDm.id, (msgs) => msgs.map((m) => (m.id === editing.id ? { ...m, text, edited: true } : m)), text);
      setEditing(null);
      setDraft("");
      notify("پیام ویرایش شد.", "info");
      return;
    }

    if (selection.kind === "channel") {
      const newMsg: ChannelMessage = { id: `cm-${Date.now()}`, channelId: selection.id, authorId: currentUser.id, text, time: nowFa() };
      setMessages((prev) => [...prev, newMsg]);
    } else if (activeDm) {
      const id = `dm-${Date.now()}`;
      const msg: DmMsg = {
        id,
        from: "me",
        text,
        time: nowFa(),
        status: "sent",
        kind: "text",
        replyTo: replyTo ? { author: replyTo.from === "me" ? "شما" : activeDm.with, text: replyTo.text } : undefined,
      };
      updateDm(activeDm.id, (msgs) => [...msgs, msg], text);
      simulateDelivery(activeDm.id, id);
    }
    setDraft("");
    setReplyTo(null);
    scrollToBottom();
  };

  const sendVoice = () => {
    if (!activeDm) return;
    const dur = `${Math.floor(recordSecs / 60)}:${String(recordSecs % 60).padStart(2, "0")}`;
    const id = `dm-${Date.now()}`;
    updateDm(
      activeDm.id,
      (msgs) => [...msgs, { id, from: "me", text: "", time: nowFa(), status: "sent", kind: "voice", meta: { duration: dur } }],
      "🎤 پیام صوتی"
    );
    simulateDelivery(activeDm.id, id);
    setRecording(false);
    setRecordSecs(0);
    scrollToBottom();
  };

  const sendAttachment = (kind: "photo" | "file" | "poll") => {
    setAttachOpen(false);
    if (!activeDm) {
      notify("پیوست در کانال‌ها نیز به همین شکل ارسال می‌شود.", "info");
      return;
    }
    const id = `dm-${Date.now()}`;
    if (kind === "poll") {
      updateDm(activeDm.id, (msgs) => [...msgs, { id, from: "me", text: "📊 نظرسنجی: زمان جلسه هفتگی؟ (شنبه ۱۰ / یکشنبه ۱۴)", time: nowFa(), status: "sent", kind: "text" }], "📊 نظرسنجی");
    } else if (kind === "photo") {
      updateDm(activeDm.id, (msgs) => [...msgs, { id, from: "me", text: "", time: nowFa(), status: "sent", kind: "photo", meta: { fileName: "گزارش-بازدید.jpg" } }], "🖼 تصویر");
    } else {
      updateDm(activeDm.id, (msgs) => [...msgs, { id, from: "me", text: "", time: nowFa(), status: "sent", kind: "file", meta: { fileName: "صورتجلسه-هماهنگی.pdf", size: "۱.۲ مگابایت" } }], "📎 فایل");
    }
    simulateDelivery(activeDm.id, id);
    scrollToBottom();
  };

  const toggleDmReaction = (msgId: string, emoji: string) => {
    if (!activeDm) return;
    updateDm(activeDm.id, (msgs) =>
      msgs.map((m) => {
        if (m.id !== msgId) return m;
        const rs = m.reactions ?? [];
        const ex = rs.find((r) => r.emoji === emoji);
        if (ex) {
          const upd = ex.mine ? { ...ex, count: ex.count - 1, mine: false } : { ...ex, count: ex.count + 1, mine: true };
          return { ...m, reactions: rs.map((r) => (r.emoji === emoji ? upd : r)).filter((r) => r.count > 0) };
        }
        return { ...m, reactions: [...rs, { emoji, count: 1, mine: true }] };
      })
    );
  };

  const deleteDmMsg = (msgId: string) => {
    if (!activeDm) return;
    updateDm(activeDm.id, (msgs) => msgs.filter((m) => m.id !== msgId));
    notify("پیام حذف شد.", "info");
  };

  const togglePinDm = (msgId: string) => {
    if (!activeDm) return;
    updateDm(activeDm.id, (msgs) => msgs.map((m) => (m.id === msgId ? { ...m, pinned: !m.pinned } : m)));
  };

  const doForward = (target: Selection) => {
    if (!forwarding) return;
    const from = activeDm?.with ?? (activeChannel ? `# ${activeChannel.name}` : "");
    if (target.kind === "dm") {
      const t = dmThreads.find((x) => x.id === target.id);
      if (t) {
        const id = `dm-${Date.now()}`;
        updateDm(target.id, (msgs) => [...msgs, { ...forwarding, id, from: "me", time: nowFa(), status: "sent", forwardedFrom: from, reactions: undefined, pinned: false }], forwarding.text || "پیام هدایت‌شده");
        notify(`پیام به «${t.with}» هدایت شد.`);
      }
    } else {
      const ch = channels.find((c) => c.id === target.id);
      setMessages((prev) => [...prev, { id: `cm-${Date.now()}`, channelId: target.id, authorId: currentUser.id, text: `↪️ هدایت‌شده از ${from}: ${forwarding.text}`, time: nowFa() }]);
      notify(`پیام به کانال «${ch?.name}» هدایت شد.`);
    }
    setForwarding(null);
  };

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    notify("متن پیام کپی شد.", "info");
  };

  const toggleReaction = (msgId: string, icon: ReactionIcon) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const reactions = m.reactions ?? [];
        const existing = reactions.find((r) => r.icon === icon);
        if (existing) {
          const updated = existing.reactedByMe
            ? { ...existing, count: existing.count - 1, reactedByMe: false }
            : { ...existing, count: existing.count + 1, reactedByMe: true };
          return { ...m, reactions: reactions.map((r) => (r.icon === icon ? updated : r)).filter((r) => r.count > 0) };
        }
        return { ...m, reactions: [...reactions, { icon, count: 1, reactedByMe: true }] };
      })
    );
  };

  const togglePin = (msgId: string) => setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, pinned: !m.pinned } : m)));
  const toggleSave = (msgId: string) => setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, saved: !m.saved } : m)));

  const pinnedMsgs = messages.filter((m) => m.channelId === selection.id && m.pinned);
  const pinnedDm = activeDm?.messages.filter((m) => m.pinned) ?? [];
  const savedMsgs = messages.filter((m) => m.saved);
  const slashCommands = integrations.filter((i) => i.type === "دستور اسلش" && i.status === "فعال");
  const showSlashHint = draft.startsWith("/");

  const q = sidebarQuery.trim();
  const grouped = {
    favorites: channels.filter((c) => favorites.includes(c.id) && c.name.includes(q)),
    channels: channels.filter((c) => c.category === "کانال‌ها" && !favorites.includes(c.id) && c.name.includes(q)),
    archived: channels.filter((c) => c.category === "بایگانی‌شده" && c.name.includes(q)),
    dms: dmThreads.filter((t) => t.with.includes(q)),
  };

  const visibleDmMsgs = activeDm
    ? convSearch !== null && convSearch.trim()
      ? activeDm.messages.filter((m) => m.text.includes(convSearch.trim()))
      : activeDm.messages
    : [];

  return (
    <div className="card overflow-hidden grid grid-cols-1 md:grid-cols-[288px_1fr] h-[calc(100vh-7.5rem)] shadow-md">
      {/* ------------------------------ سایدبار ------------------------------ */}
      <div className="border-l border-ink-100 overflow-y-auto flex flex-col bg-white">
        <div className="p-3 border-b border-ink-100">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={sidebarQuery}
              onChange={(e) => setSidebarQuery(e.target.value)}
              placeholder="جستجوی کانال یا فرد…"
              className="w-full bg-ink-50 border border-transparent focus:border-brand-300 focus:bg-white rounded-full pr-8 pl-3 py-2 text-[13px] outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <SidebarSection title="علاقه‌مندی‌ها">
            {grouped.favorites.map((c) => (
              <ChannelRow key={c.id} channel={c} active={selection.kind === "channel" && selection.id === c.id} onClick={() => setSelection({ kind: "channel", id: c.id })} />
            ))}
          </SidebarSection>

          <SidebarSection title="کانال‌ها">
            {grouped.channels.map((c) => (
              <ChannelRow key={c.id} channel={c} active={selection.kind === "channel" && selection.id === c.id} onClick={() => setSelection({ kind: "channel", id: c.id })} />
            ))}
          </SidebarSection>

          <SidebarSection title="پیام‌های مستقیم">
            {grouped.dms.map((c) => {
              const isActive = selection.kind === "dm" && selection.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelection({ kind: "dm", id: c.id })}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-right transition-colors ${isActive ? "bg-brand-600" : "hover:bg-ink-50"}`}
                >
                  <Avatar name={c.with} color={c.avatarColor} size={38} online={c.online} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`text-[13px] truncate font-semibold ${isActive ? "text-white" : "text-ink-900"}`}>{c.with}</span>
                      <span className={`text-[10px] shrink-0 ${isActive ? "text-white/70" : "text-ink-400"}`}>{c.time}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2 mt-0.5">
                      <span className={`text-[11.5px] truncate ${isActive ? "text-white/80" : c.unread > 0 ? "text-ink-700" : "text-ink-400"}`}>{c.lastMessage}</span>
                      {c.unread > 0 && (
                        <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center shrink-0 ${isActive ? "bg-white text-brand-700" : "bg-brand-600 text-white"}`}>
                          {c.unread.toLocaleString("fa-IR")}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </SidebarSection>

          {grouped.archived.length > 0 && (
            <SidebarSection title="بایگانی‌شده">
              {grouped.archived.map((c) => (
                <ChannelRow key={c.id} channel={c} active={selection.kind === "channel" && selection.id === c.id} onClick={() => setSelection({ kind: "channel", id: c.id })} muted />
              ))}
            </SidebarSection>
          )}
        </div>
      </div>

      {/* ------------------------------ ناحیه گفتگو ------------------------------ */}
      <div className="grid min-w-0" style={{ gridTemplateColumns: threadFor ? "1fr 320px" : "1fr" }}>
        <div className="flex flex-col bg-white min-w-0">
          {/* هدر کانال */}
          {activeChannel && (
            <ChannelHeader
              channel={activeChannel}
              favorited={favorites.includes(activeChannel.id)}
              onToggleFavorite={() =>
                setFavorites((prev) => (prev.includes(activeChannel.id) ? prev.filter((x) => x !== activeChannel.id) : [...prev, activeChannel.id]))
              }
              onTogglePanel={(p) => setPanel((prev) => (prev === p ? "none" : p))}
              activePanel={panel}
            />
          )}

          {/* هدر گفتگوی مستقیم */}
          {activeDm && (
            <div className="flex items-center gap-2.5 px-3 py-2 border-b border-ink-100 bg-white/90 backdrop-blur">
              <button onClick={() => setPanel("profile")} className="flex items-center gap-2.5 min-w-0 flex-1 text-right rounded-lg px-1 py-1 hover:bg-ink-50 transition-colors">
                <Avatar name={activeDm.with} color={activeDm.avatarColor} online={activeDm.online} size={38} />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink-900 truncate">{activeDm.with}</span>
                  {peerTyping ? (
                    <span className="text-[11px] text-brand-600 font-medium flex items-center gap-1">
                      در حال نوشتن
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1 h-1 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: "120ms" }} />
                        <span className="w-1 h-1 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: "240ms" }} />
                      </span>
                    </span>
                  ) : (
                    <span className="block text-[11px] text-ink-400">{activeDm.online ? "آنلاین" : "آخرین بازدید: امروز ۰۹:۲۰"}</span>
                  )}
                </span>
              </button>
              <HeaderIcon title="جستجو در گفتگو" active={convSearch !== null} onClick={() => setConvSearch((s) => (s === null ? "" : null))}>
                <Search size={16} />
              </HeaderIcon>
              <HeaderIcon title="تماس صوتی" onClick={() => notify(`در حال برقراری تماس صوتی با ${activeDm.with}…`, "info")}>
                <Phone size={16} />
              </HeaderIcon>
              <HeaderIcon title="تماس تصویری" onClick={() => notify(`در حال برقراری تماس تصویری با ${activeDm.with}…`, "info")}>
                <Video size={16} />
              </HeaderIcon>
              <DmMenu
                onMute={() => notify("اعلان‌های این گفتگو بی‌صدا شد.", "info")}
                onClear={() => {
                  updateDm(activeDm.id, () => [], "—");
                  notify("تاریخچه گفتگو پاک شد.", "info");
                }}
                onBlock={() => notify(`کاربر ${activeDm.with} مسدود شد.`, "warning")}
              />
            </div>
          )}

          {/* جستجو در گفتگو */}
          {activeDm && convSearch !== null && (
            <div className="px-3 py-2 border-b border-ink-100 bg-ink-50/70 flex items-center gap-2">
              <Search size={13} className="text-ink-400 shrink-0" />
              <input
                autoFocus
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                placeholder="جستجو در این گفتگو…"
                className="flex-1 bg-transparent text-[13px] outline-none"
              />
              <span className="text-[11px] text-ink-400 shrink-0">{visibleDmMsgs.length.toLocaleString("fa-IR")} نتیجه</span>
              <button onClick={() => setConvSearch(null)} className="text-ink-400 hover:text-ink-600 p-1"><X size={14} /></button>
            </div>
          )}

          {/* نوار پیام سنجاق‌شده */}
          {activeDm && pinnedDm.length > 0 && convSearch === null && (
            <button className="w-full flex items-center gap-2 px-3 py-1.5 border-b border-ink-100 bg-white text-right hover:bg-ink-50 transition-colors">
              <span className="w-0.5 self-stretch bg-brand-500 rounded-full" />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-brand-600">پیام سنجاق‌شده</span>
                <span className="block text-[11.5px] text-ink-500 truncate">{pinnedDm[pinnedDm.length - 1].text || "پیام رسانه‌ای"}</span>
              </span>
              <Pin size={13} className="text-ink-400 shrink-0" />
            </button>
          )}

          {/* بدنه پیام‌ها */}
          <div
            ref={scrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 240);
            }}
            className="flex-1 overflow-y-auto px-4 py-3 relative chat-surface"
          >
            <div className="flex justify-center mb-3 sticky top-0 z-10">
              <span className="text-[10.5px] bg-white/90 backdrop-blur text-ink-500 rounded-full px-3 py-1 shadow-sm border border-ink-100 font-medium">امروز</span>
            </div>

            {/* پیام‌های کانال */}
            {activeChannel &&
              (channelMsgs.length === 0 ? (
                <EmptyState icon={<Hash size={18} />} title="هنوز پیامی در این کانال نیست" />
              ) : (
                channelMsgs.map((m) => {
                  const author = users.find((u) => u.id === m.authorId);
                  return (
                    <div key={m.id} className="group flex items-start gap-2.5 py-2 px-2 -mx-2 rounded-xl hover:bg-white/80 transition-colors">
                      <Avatar name={author?.name ?? "?"} color={author?.avatarColor} size={34} status={userPresence[m.authorId]} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-ink-900">{author?.name}</span>
                          <span className="text-[10.5px] text-ink-400">{m.time}</span>
                          {m.pinned && <Badge tone="brand" icon={<Pin size={10} />}>سنجاق</Badge>}
                        </div>
                        <p className="text-[13px] text-ink-800 leading-6 mt-0.5">{m.text}</p>

                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {(m.reactions ?? []).map((r) => {
                            const Icon = reactionIconMap[r.icon];
                            return (
                              <button
                                key={r.icon}
                                onClick={() => toggleReaction(m.id, r.icon)}
                                className={`flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 border transition-colors ${
                                  r.reactedByMe ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-white border-ink-200 text-ink-500 hover:border-ink-300"
                                }`}
                              >
                                <Icon size={11} /> {r.count}
                              </button>
                            );
                          })}

                          <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 max-lg:opacity-100 transition-opacity flex items-center gap-0.5">
                            <MsgIconBtn title="پسندیدن" onClick={() => toggleReaction(m.id, "ThumbsUp")}><ThumbsUp size={12} /></MsgIconBtn>
                            <MsgIconBtn title="سنجاق" onClick={() => togglePin(m.id)}><Pin size={12} /></MsgIconBtn>
                            <MsgIconBtn title="ذخیره" onClick={() => toggleSave(m.id)}><Bookmark size={12} /></MsgIconBtn>
                            <MsgIconBtn title="کپی" onClick={() => copyText(m.text)}><Copy size={12} /></MsgIconBtn>
                            {m.authorId === currentUser.id && (
                              <MsgIconBtn title="حذف" onClick={() => setMessages((prev) => prev.filter((x) => x.id !== m.id))}><Trash2 size={12} /></MsgIconBtn>
                            )}
                          </div>

                          {m.threadReplies !== undefined && m.threadReplies > 0 ? (
                            <button onClick={() => setThreadFor(m)} className="flex items-center gap-1 text-[11px] text-brand-600 font-medium hover:underline">
                              <MessageSquareText size={12} /> {m.threadReplies} پاسخ در رشته
                            </button>
                          ) : (
                            <button onClick={() => setThreadFor(m)} className="text-[11px] text-ink-400 hover:text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              پاسخ در رشته
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ))}

            {/* پیام‌های مستقیم — حباب‌های تلگرامی */}
            {activeDm &&
              visibleDmMsgs.map((m, i) => {
                const mine = m.from === "me";
                const prev = visibleDmMsgs[i - 1];
                const groupedWithPrev = prev && prev.from === m.from;
                return (
                  <div key={m.id} className={`group flex ${mine ? "justify-start" : "justify-end"} ${groupedWithPrev ? "mt-0.5" : "mt-2.5"}`}>
                    {/* اکشن‌های شناور پیام */}
                    <div className={`self-center flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 max-lg:opacity-100 transition-opacity ${mine ? "order-2 mr-1.5" : "order-0 ml-1.5"}`}>
                      <MsgIconBtn title="پاسخ" onClick={() => { setReplyTo(m); setEditing(null); }}><Reply size={13} /></MsgIconBtn>
                      <MsgIconBtn title="هدایت" onClick={() => setForwarding(m)}><Forward size={13} /></MsgIconBtn>
                      {m.text && <MsgIconBtn title="کپی" onClick={() => copyText(m.text)}><Copy size={13} /></MsgIconBtn>}
                      <MsgIconBtn title="سنجاق" onClick={() => togglePinDm(m.id)}><Pin size={13} /></MsgIconBtn>
                      {mine && m.kind === "text" && (
                        <MsgIconBtn title="ویرایش" onClick={() => { setEditing(m); setReplyTo(null); setDraft(m.text); }}><Pencil size={13} /></MsgIconBtn>
                      )}
                      {mine && <MsgIconBtn title="حذف" onClick={() => deleteDmMsg(m.id)}><Trash2 size={13} /></MsgIconBtn>}
                    </div>

                    <div className={`relative max-w-[72%] ${mine ? "order-1" : "order-1"}`}>
                      <div
                        className={`px-3 py-2 text-[13px] leading-6 shadow-sm ${
                          mine
                            ? "bg-gradient-to-b from-brand-600 to-brand-700 text-white rounded-2xl rounded-bl-md"
                            : "bg-white text-ink-800 rounded-2xl rounded-br-md border border-ink-100/60"
                        }`}
                      >
                        {m.forwardedFrom && (
                          <p className={`text-[11px] font-medium mb-1 flex items-center gap-1 ${mine ? "text-white/80" : "text-brand-600"}`}>
                            <Forward size={11} /> هدایت‌شده از {m.forwardedFrom}
                          </p>
                        )}
                        {m.replyTo && (
                          <div className={`mb-1.5 rounded-lg px-2 py-1 border-r-2 ${mine ? "bg-white/15 border-white/60" : "bg-brand-50 border-brand-400"}`}>
                            <p className={`text-[10.5px] font-bold ${mine ? "text-white/90" : "text-brand-700"}`}>{m.replyTo.author}</p>
                            <p className={`text-[11px] truncate ${mine ? "text-white/75" : "text-ink-500"}`}>{m.replyTo.text}</p>
                          </div>
                        )}

                        {m.kind === "voice" ? (
                          <span className="flex items-center gap-2.5 py-0.5 min-w-[180px]">
                            <button className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${mine ? "bg-white/20 hover:bg-white/30" : "bg-brand-600 text-white hover:bg-brand-700"} transition-colors`} title="پخش">
                              <Play size={15} />
                            </button>
                            <span className="flex items-end gap-[2px] h-6 flex-1" aria-hidden>
                              {[9, 14, 7, 17, 11, 20, 8, 15, 12, 18, 6, 13, 10, 16, 8].map((h, j) => (
                                <span key={j} className={`w-[3px] rounded-full ${mine ? "bg-white/70" : "bg-brand-400"}`} style={{ height: `${h}px` }} />
                              ))}
                            </span>
                            <span className={`text-[10.5px] shrink-0 ${mine ? "text-white/80" : "text-ink-400"}`}>{m.meta?.duration}</span>
                          </span>
                        ) : m.kind === "photo" ? (
                          <span className="block">
                            <span className="block w-52 h-32 rounded-lg bg-gradient-to-br from-ink-200 to-ink-300 flex items-center justify-center" role="img" aria-label={m.meta?.fileName}>
                              <ImageIcon size={26} className="text-ink-400" />
                            </span>
                            <span className={`block text-[11px] mt-1 ${mine ? "text-white/80" : "text-ink-500"}`}>{m.meta?.fileName}</span>
                          </span>
                        ) : m.kind === "file" ? (
                          <span className="flex items-center gap-2.5 py-0.5">
                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${mine ? "bg-white/20" : "bg-brand-50 text-brand-600"}`}>
                              <FileText size={16} />
                            </span>
                            <span className="min-w-0">
                              <span className={`block text-[12px] font-medium truncate ${mine ? "text-white" : "text-ink-800"}`}>{m.meta?.fileName}</span>
                              <span className={`block text-[10.5px] ${mine ? "text-white/70" : "text-ink-400"}`}>{m.meta?.size}</span>
                            </span>
                          </span>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        )}

                        <span className={`flex items-center justify-end gap-1 mt-0.5 text-[10px] select-none ${mine ? "text-white/70" : "text-ink-400"}`}>
                          {m.edited && <span>ویرایش‌شده</span>}
                          {m.pinned && <Pin size={10} />}
                          <span>{m.time}</span>
                          {mine &&
                            (m.status === "read" ? (
                              <CheckCheck size={13} className="text-sky-300" />
                            ) : m.status === "delivered" ? (
                              <CheckCheck size={13} />
                            ) : (
                              <Check size={13} />
                            ))}
                        </span>
                      </div>

                      {/* واکنش‌های حباب */}
                      {(m.reactions ?? []).length > 0 && (
                        <div className={`flex gap-1 mt-1 ${mine ? "justify-start" : "justify-end"}`}>
                          {m.reactions!.map((r) => (
                            <button
                              key={r.emoji}
                              onClick={() => toggleDmReaction(m.id, r.emoji)}
                              className={`flex items-center gap-1 text-[11px] rounded-full px-1.5 py-0.5 border shadow-sm transition-colors ${
                                r.mine ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-white border-ink-200 text-ink-600"
                              }`}
                            >
                              <span>{r.emoji}</span> {r.count > 1 && r.count.toLocaleString("fa-IR")}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* نوار واکنش سریع */}
                      <div className={`absolute -top-8 ${mine ? "right-0" : "left-0"} hidden group-hover:flex items-center gap-0.5 bg-white rounded-full shadow-lg border border-ink-100 px-1.5 py-1 z-10`}>
                        {quickEmojis.slice(0, 6).map((e) => (
                          <button key={e} onClick={() => toggleDmReaction(m.id, e)} className="w-6 h-6 rounded-full hover:bg-ink-100 hover:scale-110 transition-transform text-[13px] leading-none" title={`واکنش ${e}`}>
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

            {activeDm && peerTyping && (
              <div className="flex justify-end mt-2">
                <div className="bg-white border border-ink-100/60 rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: "240ms" }} />
                </div>
              </div>
            )}

            {showJump && (
              <button
                onClick={() => scrollToBottom()}
                className="sticky bottom-2 mr-auto ml-0 flex w-9 h-9 rounded-full bg-white shadow-lg border border-ink-200 items-center justify-center text-ink-500 hover:text-brand-600 transition-colors z-10"
                title="رفتن به آخرین پیام"
              >
                <ChevronDown size={17} />
              </button>
            )}
          </div>

          {/* ------------------------------ ورودی پیام ------------------------------ */}
          <div className="border-t border-ink-100 bg-white relative">
            {showSlashHint && (
              <div className="mx-3 mt-2 border border-ink-200 rounded-lg overflow-hidden shadow-sm">
                {slashCommands.map((cmd) => (
                  <div key={cmd.id} className="px-3 py-2 text-xs flex items-center gap-2 hover:bg-ink-50 cursor-pointer">
                    <Slash size={12} className="text-brand-600" />
                    <span className="font-medium">{cmd.name}</span>
                  </div>
                ))}
              </div>
            )}

            {(replyTo || editing) && (
              <div className="mx-3 mt-2 flex items-center gap-2 bg-ink-50 border border-ink-100 rounded-lg px-3 py-2">
                {editing ? <Pencil size={14} className="text-brand-600 shrink-0" /> : <Reply size={14} className="text-brand-600 shrink-0" />}
                <span className="w-0.5 self-stretch bg-brand-500 rounded-full" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold text-brand-700">
                    {editing ? "ویرایش پیام" : `پاسخ به ${replyTo!.from === "me" ? "خودتان" : activeDm?.with ?? ""}`}
                  </span>
                  <span className="block text-[11.5px] text-ink-500 truncate">{(editing ?? replyTo)!.text || "پیام رسانه‌ای"}</span>
                </span>
                <button onClick={() => { setReplyTo(null); setEditing(null); setDraft(""); }} className="text-ink-400 hover:text-ink-600 p-1"><X size={14} /></button>
              </div>
            )}

            {recording ? (
              <div className="p-3 flex items-center gap-3">
                <button onClick={() => { setRecording(false); setRecordSecs(0); }} className="text-ink-400 hover:text-rose-600 p-2" title="لغو ضبط">
                  <Trash2 size={17} />
                </button>
                <span className="flex items-center gap-2 flex-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-sm font-medium text-ink-800 tabular-nums" dir="ltr">
                    {Math.floor(recordSecs / 60)}:{String(recordSecs % 60).padStart(2, "0")}
                  </span>
                  <span className="text-[11.5px] text-ink-400">در حال ضبط پیام صوتی…</span>
                </span>
                <button onClick={sendVoice} className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 active:scale-95 transition-all" title="ارسال پیام صوتی">
                  <Send size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1 px-3 pt-2 text-ink-400">
                  <FormatBtn title="پررنگ"><Bold size={13} /></FormatBtn>
                  <FormatBtn title="مورب"><Italic size={13} /></FormatBtn>
                  <FormatBtn title="کد"><Code size={13} /></FormatBtn>
                  <FormatBtn title="پیوند"><Link2 size={13} /></FormatBtn>
                </div>
                <div className="p-3 pt-2 flex items-end gap-2">
                  {/* پیوست */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => { setAttachOpen((v) => !v); setEmojiOpen(false); }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${attachOpen ? "bg-brand-50 text-brand-600" : "hover:bg-ink-100 text-ink-500"}`}
                      title="پیوست"
                    >
                      <Paperclip size={17} />
                    </button>
                    {attachOpen && (
                      <div className="absolute bottom-12 right-0 bg-white rounded-xl shadow-xl border border-ink-100 py-1.5 w-44 z-20">
                        <AttachItem icon={<ImageIcon size={15} className="text-violet-500" />} label="تصویر یا ویدیو" onClick={() => sendAttachment("photo")} />
                        <AttachItem icon={<FileText size={15} className="text-brand-600" />} label="فایل" onClick={() => sendAttachment("file")} />
                        <AttachItem icon={<BarChart3 size={15} className="text-emerald-600" />} label="نظرسنجی" onClick={() => sendAttachment("poll")} />
                      </div>
                    )}
                  </div>

                  {/* ایموجی */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => { setEmojiOpen((v) => !v); setAttachOpen(false); }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${emojiOpen ? "bg-brand-50 text-brand-600" : "hover:bg-ink-100 text-ink-500"}`}
                      title="شکلک"
                    >
                      <Smile size={17} />
                    </button>
                    {emojiOpen && (
                      <div className="absolute bottom-12 right-0 bg-white rounded-xl shadow-xl border border-ink-100 p-2 grid grid-cols-4 gap-1 z-20">
                        {quickEmojis.map((e) => (
                          <button key={e} onClick={() => { setDraft((d) => d + e); setEmojiOpen(false); }} className="w-9 h-9 rounded-lg hover:bg-ink-100 text-lg transition-colors" title={`درج ${e}`}>
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={1}
                    placeholder={activeChannel ? `پیامی برای # ${activeChannel.name} بنویسید…` : "پیام خود را بنویسید…"}
                    className="flex-1 bg-ink-50 border border-transparent focus:border-brand-300 focus:bg-white rounded-2xl px-4 py-2.5 text-sm outline-none resize-none max-h-32 transition-colors leading-6"
                  />

                  {draft.trim() || editing ? (
                    <button
                      onClick={sendMessage}
                      className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0 hover:bg-brand-700 active:scale-95 transition-all shadow-sm"
                      title={editing ? "ذخیره ویرایش" : "ارسال"}
                    >
                      {editing ? <Check size={17} /> : <Send size={16} />}
                    </button>
                  ) : (
                    <button
                      onClick={() => (activeDm ? setRecording(true) : notify("پیام صوتی در کانال‌ها نیز پشتیبانی می‌شود.", "info"))}
                      className="w-10 h-10 rounded-full hover:bg-ink-100 text-ink-500 hover:text-brand-600 flex items-center justify-center shrink-0 transition-colors"
                      title="ضبط پیام صوتی"
                    >
                      <Mic size={18} />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* رشته پاسخ‌های کانال */}
        {threadFor && (
          <div className="border-r border-ink-100 flex flex-col bg-white">
            <div className="flex items-center justify-between p-3 border-b border-ink-100">
              <h3 className="text-sm font-bold text-ink-900">رشته‌ی پاسخ‌ها</h3>
              <button onClick={() => setThreadFor(null)} className="w-7 h-7 rounded-md hover:bg-ink-100 flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="flex items-start gap-2.5">
                <Avatar name={users.find((u) => u.id === threadFor.authorId)?.name ?? "?"} color={users.find((u) => u.id === threadFor.authorId)?.avatarColor} size={28} />
                <div>
                  <p className="text-xs font-semibold text-ink-900">{users.find((u) => u.id === threadFor.authorId)?.name}</p>
                  <p className="text-xs text-ink-700 mt-0.5">{threadFor.text}</p>
                </div>
              </div>
              <div className="border-t border-ink-100 pt-3 text-[11px] text-ink-400">{threadFor.threadReplies ?? 0} پاسخ</div>
              {users.slice(1, 3).map((u) => (
                <div key={u.id} className="flex items-start gap-2.5">
                  <Avatar name={u.name} color={u.avatarColor} size={28} />
                  <div>
                    <p className="text-xs font-semibold text-ink-900">{u.name}</p>
                    <p className="text-xs text-ink-700 mt-0.5">نمونه‌ی متن پاسخ در رشته.</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-ink-100">
              <input className="input-field" placeholder="پاسخ در رشته…" />
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------ هدایت پیام ------------------------------ */}
      {forwarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setForwarding(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
              <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5"><Forward size={15} className="text-brand-600" /> هدایت پیام به…</h3>
              <button onClick={() => setForwarding(null)} className="w-7 h-7 rounded-md hover:bg-ink-100 flex items-center justify-center"><X size={14} /></button>
            </div>
            <div className="px-4 py-2 bg-ink-50 border-b border-ink-100">
              <p className="text-[11.5px] text-ink-500 truncate">«{forwarding.text || "پیام رسانه‌ای"}»</p>
            </div>
            <div className="max-h-72 overflow-y-auto py-1.5">
              {dmThreads.map((t) => (
                <button key={t.id} onClick={() => doForward({ kind: "dm", id: t.id })} className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-ink-50 text-right transition-colors">
                  <Avatar name={t.with} color={t.avatarColor} size={32} online={t.online} />
                  <span className="text-[13px] font-medium text-ink-900">{t.with}</span>
                </button>
              ))}
              {channels.filter((c) => c.category !== "بایگانی‌شده").map((c) => (
                <button key={c.id} onClick={() => doForward({ kind: "channel", id: c.id })} className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-ink-50 text-right transition-colors">
                  <span className="w-8 h-8 rounded-full bg-navy-900 text-white flex items-center justify-center shrink-0">
                    {c.type === "private" ? <Lock size={13} /> : <Hash size={13} />}
                  </span>
                  <span className="text-[13px] font-medium text-ink-900">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ پنل‌های کناری ------------------------------ */}
      <Drawer open={panel === "profile"} onClose={() => setPanel("none")} title="اطلاعات مخاطب">
        {activeDm && (
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center">
              <Avatar name={activeDm.with} color={activeDm.avatarColor} size={72} online={activeDm.online} />
              <p className="text-base font-bold text-ink-900 mt-3">{activeDm.with}</p>
              <p className="text-xs text-ink-400 mt-0.5">{activeDm.online ? "آنلاین" : "آخرین بازدید: امروز ۰۹:۲۰"}</p>
            </div>
            <div className="card p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-700 flex items-center gap-2"><BellOff size={14} className="text-ink-400" /> بی‌صدا کردن اعلان‌ها</span>
                <Toggle on={false} onChange={() => notify("اعلان‌های این گفتگو بی‌صدا شد.", "info")} />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-ink-900 mb-2">رسانه‌های مشترک</p>
              <div className="grid grid-cols-3 gap-1.5">
                {["#82aee6", "#93a2b8", "#5e7191", "#b6c6de", "#7c94b8", "#a3b3c9"].map((c, i) => (
                  <span key={i} className="aspect-square rounded-lg flex items-center justify-center" style={{ backgroundColor: c }} role="img" aria-label={`رسانه مشترک ${i + 1}`}>
                    <ImageIcon size={17} className="text-white/70" />
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <button onClick={() => notify("تاریخچه گفتگو پاک شد.", "info")} className="w-full flex items-center gap-2 text-[13px] text-ink-700 hover:bg-ink-50 rounded-lg px-3 py-2.5 transition-colors">
                <Eraser size={15} className="text-ink-400" /> پاک‌کردن تاریخچه
              </button>
              <button onClick={() => notify(`کاربر ${activeDm.with} مسدود شد.`, "warning")} className="w-full flex items-center gap-2 text-[13px] text-rose-600 hover:bg-rose-50 rounded-lg px-3 py-2.5 transition-colors">
                <Ban size={15} /> مسدود کردن کاربر
              </button>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={panel === "pinned"} onClose={() => setPanel("none")} title="پیام‌های سنجاق‌شده">
        {pinnedMsgs.length === 0 ? (
          <EmptyState icon={<Pin size={18} />} title="پیام سنجاق‌شده‌ای نیست" />
        ) : (
          <div className="space-y-3">
            {pinnedMsgs.map((m) => (
              <div key={m.id} className="text-sm border-b border-ink-100 pb-3">
                <p className="font-medium text-ink-900">{users.find((u) => u.id === m.authorId)?.name}</p>
                <p className="text-ink-600 mt-1">{m.text}</p>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <Drawer open={panel === "saved"} onClose={() => setPanel("none")} title="پیام‌های ذخیره‌شده">
        {savedMsgs.length === 0 ? (
          <EmptyState icon={<Bookmark size={18} />} title="پیام ذخیره‌شده‌ای نیست" />
        ) : (
          <div className="space-y-3">
            {savedMsgs.map((m) => (
              <div key={m.id} className="text-sm border-b border-ink-100 pb-3">
                <p className="font-medium text-ink-900">{users.find((u) => u.id === m.authorId)?.name}</p>
                <p className="text-ink-600 mt-1">{m.text}</p>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <Drawer open={panel === "members"} onClose={() => setPanel("none")} title={`اعضای ${activeChannel ? "# " + activeChannel.name : ""}`}>
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-2.5">
              <Avatar name={u.name} color={u.avatarColor} size={32} status={userPresence[u.id]} />
              <div>
                <p className="text-sm font-medium">{u.name}</p>
                <p className="text-xs text-ink-400">{u.role}</p>
              </div>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
}

// ---------------------------------------------------------------------------
function MsgIconBtn({ children, title, onClick }: { children: ReactNode; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className="w-7 h-7 rounded-lg bg-white/90 shadow-sm border border-ink-100 hover:bg-ink-50 hover:text-brand-600 flex items-center justify-center text-ink-400 transition-colors">
      {children}
    </button>
  );
}

function FormatBtn({ children, title }: { children: ReactNode; title: string }) {
  return (
    <button title={title} aria-label={title} className="w-7 h-7 rounded-md hover:bg-ink-100 hover:text-ink-600 flex items-center justify-center transition-colors">
      {children}
    </button>
  );
}

function HeaderIcon({ children, title, onClick, active }: { children: ReactNode; title: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${active ? "bg-brand-50 text-brand-600" : "hover:bg-ink-100 text-ink-500"}`}
    >
      {children}
    </button>
  );
}

function AttachItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-ink-50 text-right transition-colors">
      {icon}
      <span className="text-[12.5px] text-ink-800">{label}</span>
    </button>
  );
}

function DmMenu({ onMute, onClear, onBlock }: { onMute: () => void; onClear: () => void; onBlock: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <HeaderIcon title="گزینه‌های بیشتر" active={open} onClick={() => setOpen((v) => !v)}>
        <MoreVertical size={16} />
      </HeaderIcon>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 bg-white rounded-xl shadow-xl border border-ink-100 py-1.5 w-48 z-20">
            <button onClick={() => { onMute(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-ink-50 text-right text-[12.5px] text-ink-800 transition-colors">
              <BellOff size={14} className="text-ink-400" /> بی‌صدا کردن
            </button>
            <button onClick={() => { onClear(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-ink-50 text-right text-[12.5px] text-ink-800 transition-colors">
              <Eraser size={14} className="text-ink-400" /> پاک‌کردن تاریخچه
            </button>
            <button onClick={() => { onBlock(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-rose-50 text-right text-[12.5px] text-rose-600 transition-colors">
              <Ban size={14} /> مسدود کردن
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-2">
      <p className="px-3 py-1 text-[10.5px] font-semibold text-ink-400 uppercase tracking-wide">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ChannelRow({ channel, active, onClick, muted }: { channel: Channel; active: boolean; onClick: () => void; muted?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-right transition-colors ${active ? "bg-brand-600 text-white" : "hover:bg-ink-50"} ${muted ? "opacity-60" : ""}`}
    >
      {channel.type === "private" ? (
        <Lock size={13} className={`shrink-0 ${active ? "text-white/70" : "text-ink-400"}`} />
      ) : (
        <Hash size={13} className={`shrink-0 ${active ? "text-white/70" : "text-ink-400"}`} />
      )}
      <span className={`flex-1 text-[13px] truncate ${active ? "text-white font-semibold" : channel.unread > 0 ? "font-semibold text-ink-900" : "text-ink-600"}`}>{channel.name}</span>
      {channel.mentions > 0 && (
        <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center ${active ? "bg-white text-brand-700" : "bg-rose-600 text-white"}`}>
          {channel.mentions}
        </span>
      )}
      {channel.mentions === 0 && channel.unread > 0 && (
        <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center ${active ? "bg-white text-brand-700" : "bg-ink-300 text-white"}`}>
          {channel.unread}
        </span>
      )}
    </button>
  );
}

function ChannelHeader({
  channel,
  favorited,
  onToggleFavorite,
  onTogglePanel,
  activePanel,
}: {
  channel: Channel;
  favorited: boolean;
  onToggleFavorite: () => void;
  onTogglePanel: (p: "pinned" | "saved" | "members") => void;
  activePanel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-ink-100 flex-wrap bg-white/90 backdrop-blur">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onToggleFavorite} title="افزودن به علاقه‌مندی‌ها" className={`shrink-0 p-1 rounded-md hover:bg-ink-50 transition-colors ${favorited ? "text-amber-500" : "text-ink-300 hover:text-ink-400"}`}>
          <Star size={15} fill={favorited ? "currentColor" : "none"} />
        </button>
        {channel.type === "private" ? <Lock size={14} className="text-ink-400 shrink-0" /> : <Hash size={14} className="text-ink-400 shrink-0" />}
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-900 leading-4">{channel.name}</p>
          <p className="text-[11px] text-ink-400 truncate">{channel.topic}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onTogglePanel("members")} title="اعضا" className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors ${activePanel === "members" ? "bg-brand-50 text-brand-700" : "hover:bg-ink-100"}`}>
          <Users size={13} /> {channel.members}
        </button>
        <button onClick={() => onTogglePanel("pinned")} title="سنجاق‌شده‌ها" className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors ${activePanel === "pinned" ? "bg-brand-50 text-brand-700" : "hover:bg-ink-100"}`}>
          <Pin size={13} /> {channel.pinnedCount}
        </button>
        <button onClick={() => onTogglePanel("saved")} title="ذخیره‌شده‌ها" className={`px-2.5 py-1.5 rounded-full transition-colors ${activePanel === "saved" ? "bg-brand-50 text-brand-700" : "hover:bg-ink-100"}`}>
          <Bookmark size={13} />
        </button>
        <button title="تماس صوتی گروهی" className="px-2.5 py-1.5 rounded-full hover:bg-ink-100 text-ink-500 transition-colors">
          <Phone size={14} />
        </button>
        <button title="جلسه تصویری" className="px-2.5 py-1.5 rounded-full hover:bg-ink-100 text-ink-500 transition-colors">
          <Video size={14} />
        </button>
        <button title="گزینه‌های بیشتر" className="px-2.5 py-1.5 rounded-full hover:bg-ink-100 text-ink-500 transition-colors">
          <MoreVertical size={14} />
        </button>
      </div>
    </div>
  );
}
