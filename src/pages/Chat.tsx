import { useMemo, useState } from "react";
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
  type ChatThread,
  type ReactionIcon,
} from "../data/mock";
import Avatar from "../components/Avatar";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import Drawer from "../components/ui/Drawer";

const reactionIconMap: Record<ReactionIcon, typeof ThumbsUp> = { ThumbsUp, Heart, Smile, CheckCircle2 };

type Selection = { kind: "channel" | "dm"; id: string };

export default function Chat() {
  const [selection, setSelection] = useState<Selection>({ kind: "channel", id: channels[0].id });
  const [messages, setMessages] = useState<ChannelMessage[]>(initialChannelMessages);
  const [dmThreads, setDmThreads] = useState<ChatThread[]>(initialChatThreads);
  const [draft, setDraft] = useState("");
  const [threadFor, setThreadFor] = useState<ChannelMessage | null>(null);
  const [panel, setPanel] = useState<"none" | "pinned" | "saved" | "members">("none");
  const [favorites, setFavorites] = useState<string[]>(["ch1"]);

  const activeChannel = selection.kind === "channel" ? channels.find((c) => c.id === selection.id) : undefined;
  const activeDm = selection.kind === "dm" ? dmThreads.find((c) => c.id === selection.id) : undefined;

  const channelMsgs = useMemo(() => messages.filter((m) => m.channelId === selection.id), [messages, selection]);

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

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    if (selection.kind === "channel") {
      const newMsg: ChannelMessage = { id: `cm-${Date.now()}`, channelId: selection.id, authorId: currentUser.id, text, time: "اکنون" };
      setMessages((prev) => [...prev, newMsg]);
    } else {
      setDmThreads((prev) =>
        prev.map((t) => (t.id === selection.id ? { ...t, lastMessage: text, time: "اکنون", messages: [...t.messages, { from: "me", text, time: "اکنون", read: false }] } : t))
      );
    }
    setDraft("");
  };

  const pinnedMsgs = messages.filter((m) => m.channelId === selection.id && m.pinned);
  const savedMsgs = messages.filter((m) => m.saved);
  const slashCommands = integrations.filter((i) => i.type === "دستور اسلش" && i.status === "فعال");
  const showSlashHint = draft.startsWith("/");

  const grouped = {
    favorites: channels.filter((c) => favorites.includes(c.id)),
    channels: channels.filter((c) => c.category === "کانال‌ها" && !favorites.includes(c.id)),
    archived: channels.filter((c) => c.category === "بایگانی‌شده"),
  };

  return (
    <div className="card overflow-hidden grid grid-cols-1 md:grid-cols-[260px_1fr] h-[calc(100vh-7.5rem)]">
      <div className="border-l border-ink-100 overflow-y-auto flex flex-col bg-ink-50/40">
        <div className="p-3 border-b border-ink-100">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input placeholder="جستجوی کانال یا فرد…" className="input-field !pr-8" />
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
            {dmThreads.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelection({ kind: "dm", id: c.id })}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-right ${
                  selection.kind === "dm" && selection.id === c.id ? "bg-brand-50" : "hover:bg-ink-100/60"
                }`}
              >
                <Avatar name={c.with} color={c.avatarColor} size={24} online={c.online} />
                <span className={`flex-1 text-[13px] truncate ${c.unread > 0 ? "font-semibold text-ink-900" : "text-ink-600"}`}>{c.with}</span>
                {c.unread > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-white text-[10px] flex items-center justify-center">{c.unread}</span>
                )}
              </button>
            ))}
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

      <div className="grid" style={{ gridTemplateColumns: threadFor ? "1fr 320px" : "1fr" }}>
        <div className="flex flex-col bg-white min-w-0">
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
          {activeDm && (
            <div className="flex items-center gap-2.5 p-3 border-b border-ink-100">
              <Avatar name={activeDm.with} color={activeDm.avatarColor} online={activeDm.online} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink-900">{activeDm.with}</p>
                <p className="text-[11px] text-ink-400">{activeDm.online ? "آنلاین" : "آخرین بازدید: امروز ۰۹:۲۰"}</p>
              </div>
              <button className="w-8 h-8 rounded-full hover:bg-ink-100 flex items-center justify-center text-ink-500">
                <Phone size={15} />
              </button>
              <button className="w-8 h-8 rounded-full hover:bg-ink-100 flex items-center justify-center text-ink-500">
                <Video size={15} />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#f7f8fa]">
            <div className="flex justify-center mb-2">
              <span className="text-[10px] bg-white text-ink-400 rounded-full px-3 py-1 shadow-sm border border-ink-100">امروز</span>
            </div>

            {activeChannel &&
              (channelMsgs.length === 0 ? (
                <EmptyState icon={<Hash size={18} />} title="هنوز پیامی در این کانال نیست" />
              ) : (
                channelMsgs.map((m) => {
                  const author = users.find((u) => u.id === m.authorId);
                  return (
                    <div key={m.id} className="group flex items-start gap-2.5 py-2 px-2 -mx-2 rounded-lg hover:bg-white">
                      <Avatar name={author?.name ?? "?"} color={author?.avatarColor} size={32} status={userPresence[m.authorId]} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-ink-900">{author?.name}</span>
                          <span className="text-[11px] text-ink-400">{m.time}</span>
                          {m.pinned && (
                            <Badge tone="brand" icon={<Pin size={10} />}>
                              سنجاق
                            </Badge>
                          )}
                        </div>
                        <p className="text-[13px] text-ink-800 leading-6 mt-0.5">{m.text}</p>

                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {(m.reactions ?? []).map((r) => {
                            const Icon = reactionIconMap[r.icon];
                            return (
                              <button
                                key={r.icon}
                                onClick={() => toggleReaction(m.id, r.icon)}
                                className={`flex items-center gap-1 text-[11px] rounded-full px-1.5 py-0.5 border ${
                                  r.reactedByMe ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-white border-ink-200 text-ink-500"
                                }`}
                              >
                                <Icon size={11} /> {r.count}
                              </button>
                            );
                          })}

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            <button onClick={() => toggleReaction(m.id, "ThumbsUp")} className="w-6 h-6 rounded-md hover:bg-ink-100 flex items-center justify-center text-ink-400">
                              <ThumbsUp size={12} />
                            </button>
                            <button onClick={() => togglePin(m.id)} className="w-6 h-6 rounded-md hover:bg-ink-100 flex items-center justify-center text-ink-400">
                              <Pin size={12} />
                            </button>
                            <button onClick={() => toggleSave(m.id)} className="w-6 h-6 rounded-md hover:bg-ink-100 flex items-center justify-center text-ink-400">
                              <Bookmark size={12} />
                            </button>
                          </div>

                          {m.threadReplies !== undefined && m.threadReplies > 0 ? (
                            <button onClick={() => setThreadFor(m)} className="flex items-center gap-1 text-[11px] text-brand-600 font-medium hover:underline">
                              <MessageSquareText size={12} /> {m.threadReplies} پاسخ در رشته
                            </button>
                          ) : (
                            <button onClick={() => setThreadFor(m)} className="text-[11px] text-ink-400 hover:text-brand-600">
                              پاسخ در رشته
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ))}

            {activeDm &&
              activeDm.messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "me" ? "justify-start" : "justify-end"} py-1`}>
                  <div
                    className={`max-w-[68%] px-3 py-2 text-[13px] leading-6 shadow-sm ${
                      m.from === "me" ? "bg-brand-600 text-white rounded-2xl rounded-tl-sm" : "bg-white text-ink-800 rounded-2xl rounded-tr-sm"
                    }`}
                  >
                    <p>{m.text}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${m.from === "me" ? "text-white/70" : "text-ink-400"}`}>
                      <span>{m.time}</span>
                      {m.from === "me" && (m.read ? <CheckCheck size={13} /> : <Check size={13} />)}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="border-t border-ink-100 bg-white">
            {showSlashHint && (
              <div className="mx-3 mt-2 border border-ink-200 rounded-lg overflow-hidden">
                {slashCommands.map((cmd) => (
                  <div key={cmd.id} className="px-3 py-2 text-xs flex items-center gap-2 hover:bg-ink-50">
                    <Slash size={12} className="text-brand-600" />
                    <span className="font-medium">{cmd.name}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 px-3 pt-2 text-ink-400">
              <button className="w-7 h-7 rounded-md hover:bg-ink-100 flex items-center justify-center">
                <Bold size={13} />
              </button>
              <button className="w-7 h-7 rounded-md hover:bg-ink-100 flex items-center justify-center">
                <Italic size={13} />
              </button>
              <button className="w-7 h-7 rounded-md hover:bg-ink-100 flex items-center justify-center">
                <Code size={13} />
              </button>
              <button className="w-7 h-7 rounded-md hover:bg-ink-100 flex items-center justify-center">
                <Link2 size={13} />
              </button>
            </div>
            <div className="p-3 flex items-center gap-2">
              <button className="w-9 h-9 rounded-full hover:bg-ink-100 flex items-center justify-center text-ink-500 shrink-0">
                <Paperclip size={16} />
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder={activeChannel ? `پیامی برای # ${activeChannel.name} بنویسید…` : "پیام خود را بنویسید…"}
                className="flex-1 bg-ink-100 rounded-full px-4 py-2.5 text-sm outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={!draft.trim()}
                className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0 hover:bg-brand-700 disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>

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
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-right ${active ? "bg-brand-50" : "hover:bg-ink-100/60"} ${muted ? "opacity-60" : ""}`}
    >
      {channel.type === "private" ? <Lock size={13} className="text-ink-400 shrink-0" /> : <Hash size={13} className="text-ink-400 shrink-0" />}
      <span className={`flex-1 text-[13px] truncate ${channel.unread > 0 ? "font-semibold text-ink-900" : "text-ink-600"}`}>{channel.name}</span>
      {channel.mentions > 0 && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center">{channel.mentions}</span>
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
    <div className="flex items-center justify-between gap-3 p-3 border-b border-ink-100 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onToggleFavorite} className={`shrink-0 ${favorited ? "text-amber-500" : "text-ink-300 hover:text-ink-400"}`}>
          <Star size={15} fill={favorited ? "currentColor" : "none"} />
        </button>
        {channel.type === "private" ? <Lock size={14} className="text-ink-400 shrink-0" /> : <Hash size={14} className="text-ink-400 shrink-0" />}
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-900 leading-4">{channel.name}</p>
          <p className="text-[11px] text-ink-400 truncate">{channel.topic}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onTogglePanel("members")} className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-md ${activePanel === "members" ? "bg-ink-100" : "hover:bg-ink-100"}`}>
          <Users size={13} /> {channel.members}
        </button>
        <button onClick={() => onTogglePanel("pinned")} className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-md ${activePanel === "pinned" ? "bg-ink-100" : "hover:bg-ink-100"}`}>
          <Pin size={13} /> {channel.pinnedCount}
        </button>
        <button onClick={() => onTogglePanel("saved")} className={`px-2 py-1.5 rounded-md ${activePanel === "saved" ? "bg-ink-100" : "hover:bg-ink-100"}`}>
          <Bookmark size={13} />
        </button>
        <button className="px-2 py-1.5 rounded-md hover:bg-ink-100 text-ink-500">
          <Phone size={14} />
        </button>
        <button className="px-2 py-1.5 rounded-md hover:bg-ink-100 text-ink-500">
          <Video size={14} />
        </button>
        <button className="px-2 py-1.5 rounded-md hover:bg-ink-100 text-ink-500">
          <MoreVertical size={14} />
        </button>
      </div>
    </div>
  );
}
