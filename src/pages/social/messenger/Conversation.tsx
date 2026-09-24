// ---------------------------------------------------------------------------
// پنل گفتگو: سربرگ، تاپیک‌ها/زیرکانال‌ها، پیام‌ها (گروه‌بندی روزانه) و نوار نوشتن.
// اقدام‌ها ← messaging: …/{id}/messages/ ، mark-read ، mute ، messages/{id}/ (PATCH/DELETE) ، forward ، save
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Bell,
  BellOff,
  Info,
  MoreVertical,
  CornerUpLeft,
  Pencil,
  Trash2,
  Forward,
  Bookmark,
  Paperclip,
  Smile,
  SendHorizontal,
  X,
  Plus,
  Lock,
  Megaphone,
  LogIn,
  MessageSquare,
} from "lucide-react";
import Avatar from "../../../components/Avatar";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Toggle from "../../../components/ui/Toggle";
import { useSocial } from "../../../context/SocialContext";
import { useTenancy } from "../../../context/TenancyContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { useConfirm } from "../../../components/ui/ConfirmProvider";
import { AttachmentList, Field, TagList, fa, toAttachments } from "../kit";
import type { Attachment, Chat, Message } from "../../../social/types";
import { ChatAvatar, RichText, chatTitle, modeConf, otherUserId, stickers, tagsIn, timeOf, type MessengerMode } from "./shared";

export default function Conversation({ mode, root, initialSub, onBack, onInfo }: { mode: MessengerMode; root: Chat; initialSub: string | null; onBack: () => void; onInfo: () => void }) {
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const conf = modeConf[mode];
  const me = s.me;

  const [subId, setSubId] = useState<string | null>(initialSub);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [reply, setReply] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [forwarding, setForwarding] = useState<Message | null>(null);
  const [subModal, setSubModal] = useState(false);
  const [subForm, setSubForm] = useState({ title: "", description: "", is_private: root.is_private });
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<number | null>(null);

  const isRoom = root.chat_type === "group" || root.chat_type === "channel";
  const children = isRoom ? s.chats.filter((c) => c.parent === root.id && !c.deleted_at) : [];
  const active = children.find((c) => c.id === subId) ?? root;
  const manage = isRoom && hasPermission(conf.managePerm);
  const isAdmin = isRoom && (root.owner_id === me || s.chatRole(root) === "admin" || manage);
  const rootMember = s.isMember(root);
  const member = s.isMember(active);
  const canRead = rootMember || !root.is_private || manage;
  const canPost = member && (active.chat_type !== "channel" || s.chatRole(active) === "admin");
  const muted = active.muted_by.includes(me);
  const msgs = canRead ? s.chatMessages(active.id) : [];

  // POST …/mark-read/ هنگام باز کردن گفتگو و رسیدن پیام تازه
  useEffect(() => {
    if (member && s.unreadCount(active) > 0) s.markRead(active.id);
    endRef.current?.scrollIntoView({ block: "end" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.id, msgs.length]);

  useEffect(() => {
    setReply(null);
    setEditing(null);
    setText("");
    setFiles([]);
  }, [active.id]);

  const resetComposer = () => {
    setText("");
    setFiles([]);
    setReply(null);
    setEditing(null);
  };

  const send = () => {
    if (editing) {
      if (!text.trim()) return notify("متن پیام خالی است.", "warning");
      s.editMessage(editing.id, text.trim()); // PATCH messages/{id}/
      notify("پیام ویرایش شد.", "success");
      return resetComposer();
    }
    const content = text.trim();
    const r = s.sendMessage(active.id, { content, type: "text", parent_message_id: reply?.id ?? null, uploaded_files: files, tags: tagsIn(content) });
    if (!r.ok) return notify(r.error, "warning");
    resetComposer();
    s.markRead(active.id);
  };

  const sendSticker = (emoji: string) => {
    setStickerOpen(false);
    const r = s.sendMessage(active.id, { content: emoji, type: "sticker", parent_message_id: reply?.id ?? null });
    if (!r.ok) return notify(r.error, "warning");
    setReply(null);
    s.markRead(active.id);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
    if (e.key === "Escape" && (editing || reply)) resetComposer();
  };

  const join = (chat: Chat) => {
    const r = s.joinChat(chat.id);
    if (r.ok) return notify(`به «${chat.title}» پیوستید.`, "success");
    // تاپیک/زیرکانال خصوصی: عضو گروه مادر با همان نقش اضافه می‌شود
    if (chat.parent && rootMember) {
      s.addChatMember(chat.id, me, s.chatRole(root) ?? "member");
      return notify(`به «${chat.title}» پیوستید.`, "success");
    }
    notify(r.error, "warning");
  };

  const del = (m: Message) =>
    confirm({
      title: "این پیام حذف شود؟",
      message: "پیام برای همه‌ی اعضا حذف می‌شود.",
      confirmLabel: "حذف پیام",
      onConfirm: () => {
        s.deleteMessage(m.id); // DELETE messages/{id}/
        notify("پیام حذف شد.", "success");
      },
    });

  const createSub = () => {
    if (!subForm.title.trim()) return notify("عنوان را وارد کنید.", "warning");
    // POST groups/{id}/topics/ یا channels/{id}/sub-channels/
    const id = s.createSubChat(root.id, { title: subForm.title.trim(), description: subForm.description.trim(), is_private: subForm.is_private, category_ids: root.category_ids, tags: [] });
    setSubModal(false);
    setSubForm({ title: "", description: "", is_private: root.is_private });
    setSubId(id);
    notify(`${conf.subNoun} «${subForm.title.trim()}» ساخته شد.`, "success");
  };

  // ------------------------------------------------------------ سربرگ
  const other = otherUserId(root, me);
  const otherUser = other ? s.userById(other) : undefined;
  const subtitle =
    root.chat_type === "saved_messages"
      ? "یادداشت‌ها و پیام‌های ذخیره‌شده"
      : root.chat_type === "bot"
        ? "بات"
        : root.chat_type === "direct_message"
          ? otherUser?.role ?? "پیام مستقیم"
          : `${fa(root.members.length)} عضو${root.is_private ? " · خصوصی" : ""}`;

  let lastDay = "";
  let lastAuthor = "";

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* ---------------- header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-ink-100 bg-white">
        <button onClick={onBack} className="md:hidden p-1.5 -mr-1 rounded-lg text-ink-500 hover:bg-ink-100" aria-label="بازگشت به فهرست">
          <ChevronRight size={18} />
        </button>
        <button onClick={isRoom ? onInfo : undefined} className={`flex items-center gap-2.5 min-w-0 flex-1 text-right ${isRoom ? "cursor-pointer" : "cursor-default"}`}>
          <ChatAvatar chat={root} me={me} size={38} />
          <span className="min-w-0">
            <span className="block text-[13.5px] font-bold text-ink-900 truncate">{chatTitle(root, me)}</span>
            <span className="block text-[11px] text-ink-400 truncate">{subtitle}</span>
          </span>
        </button>
        {isRoom && !rootMember && !root.is_private && (
          <Button size="sm" variant="primary" icon={<LogIn size={13} />} onClick={() => join(root)}>
            عضویت
          </Button>
        )}
        {member && root.chat_type !== "saved_messages" && (
          <button
            onClick={() => {
              s.toggleMute(active.id); // PATCH …/mute/
              notify(muted ? "اعلان‌ها روشن شد." : "اعلان‌ها بی‌صدا شد.", "info");
            }}
            className={`p-2 rounded-lg hover:bg-ink-100 ${muted ? "text-amber-600" : "text-ink-500"}`}
            title={muted ? "روشن کردن اعلان‌ها" : "بی‌صدا کردن"}
            aria-label={muted ? "روشن کردن اعلان‌ها" : "بی‌صدا کردن"}
          >
            {muted ? <BellOff size={17} /> : <Bell size={17} />}
          </button>
        )}
        {isRoom ? (
          <button onClick={onInfo} className="p-2 rounded-lg text-ink-500 hover:bg-ink-100" title="اطلاعات" aria-label="اطلاعات">
            <Info size={17} />
          </button>
        ) : (
          other && (
            <Link to={`/dashboard/profile/${other}`} className="p-2 rounded-lg text-ink-500 hover:bg-ink-100" title="پروفایل" aria-label="پروفایل">
              <Info size={17} />
            </Link>
          )
        )}
      </div>

      {/* ---------------- topics / sub-channels */}
      {isRoom && canRead && (children.length > 0 || isAdmin) && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-ink-100 bg-white overflow-x-auto">
          {[root, ...children].map((c) => {
            const on = c.id === active.id;
            const n = s.isMember(c) ? s.unreadCount(c) : 0;
            return (
              <button key={c.id} onClick={() => setSubId(c.id === root.id ? null : c.id)} className={`shrink-0 text-[11.5px] px-2.5 py-1 rounded-full border flex items-center gap-1 ${on ? "bg-brand-50 border-brand-300 text-brand-700 font-medium" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}>
                {c.id === root.id ? conf.rootChip : c.title.replace(/^تاپیک:\s*/, "")}
                {c.is_private && c.id !== root.id && <Lock size={10} />}
                {n > 0 && !on && <span className="min-w-[16px] h-4 px-1 rounded-full bg-brand-600 text-white text-[9.5px] flex items-center justify-center">{fa(n)}</span>}
              </button>
            );
          })}
          {isAdmin && (
            <button onClick={() => setSubModal(true)} className="shrink-0 text-[11.5px] px-2 py-1 rounded-full border border-dashed border-ink-300 text-ink-500 hover:text-brand-700 flex items-center gap-0.5">
              <Plus size={12} /> {conf.subNoun}
            </button>
          )}
        </div>
      )}

      {/* ---------------- messages */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-ink-50 px-3 py-3">
        {!canRead ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-ink-400">
            <Lock size={28} />
            <p className="text-sm text-ink-600">این {conf.noun} خصوصی است.</p>
            <p className="text-xs">فقط با دعوت مدیر می‌توانید عضو شوید.</p>
          </div>
        ) : msgs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-ink-400">
            <MessageSquare size={28} />
            <p className="text-xs">هنوز پیامی نیست{canPost ? "؛ اولین پیام را بفرستید." : "."}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {msgs.map((m) => {
              const day = m.created_at.split(" ")[0];
              const newDay = day !== lastDay;
              lastDay = day;
              const showAuthor = isRoom && m.user_id !== me && (newDay || lastAuthor !== m.user_id);
              lastAuthor = m.user_id;
              const own = m.user_id === me;
              const canEdit = own && m.type === "text" && !m.forwarded_from;
              const canDelete = own || isAdmin;
              const parent = m.parent_message_id ? msgs.find((x) => x.id === m.parent_message_id) : undefined;
              const author = s.userById(m.user_id);
              const extraTags = m.tags.filter((t) => !m.content.includes(`#${t}`));
              const actions = [
                canPost && { k: "reply", label: "پاسخ", icon: CornerUpLeft, run: () => (setEditing(null), setReply(m)) },
                canEdit && { k: "edit", label: "ویرایش", icon: Pencil, run: () => (setReply(null), setEditing(m), setText(m.content)) },
                { k: "fwd", label: "فوروارد", icon: Forward, run: () => setForwarding(m) },
                root.chat_type !== "saved_messages" && {
                  k: "save",
                  label: "ذخیره",
                  icon: Bookmark,
                  run: () => {
                    s.saveMessage(m.id); // POST messages/{id}/save/
                    notify("در «پیام‌های ذخیره‌شده» ذخیره شد.", "success");
                  },
                },
                canDelete && { k: "del", label: "حذف", icon: Trash2, run: () => del(m), danger: true },
              ].filter(Boolean) as { k: string; label: string; icon: typeof Pencil; run: () => void; danger?: boolean }[];
              return (
                <div key={m.id}>
                  {newDay && (
                    <div className="flex justify-center my-3">
                      <span className="text-[10.5px] text-ink-500 bg-white border border-ink-100 rounded-full px-2.5 py-0.5">{day}</span>
                    </div>
                  )}
                  <div id={`m-${m.id}`} className={`group flex items-end gap-2 justify-start ${own ? "" : "flex-row-reverse"} ${showAuthor ? "mt-2" : ""}`}>
                    {isRoom && !own && <span className="w-7 shrink-0">{showAuthor && <Avatar name={author?.name ?? "؟"} color={author?.avatarColor} size={28} />}</span>}
                    <div
                      className="relative max-w-[82%] sm:max-w-[70%] min-w-0"
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setMenu(m.id);
                      }}
                      onTouchStart={() => {
                        pressTimer.current = window.setTimeout(() => setMenu(m.id), 450);
                      }}
                      onTouchEnd={() => pressTimer.current && window.clearTimeout(pressTimer.current)}
                      onTouchMove={() => pressTimer.current && window.clearTimeout(pressTimer.current)}
                    >
                      <div className={m.type === "sticker" && !parent && !m.forwarded_from ? "" : `rounded-2xl px-3 py-2 border ${own ? "bg-brand-50 border-brand-100 rounded-br-md" : "bg-white border-ink-100 rounded-bl-md"}`}>
                        {showAuthor && (
                          <Link to={`/dashboard/profile/${m.user_id}`} className="block text-[11.5px] font-bold mb-0.5 hover:underline" style={{ color: author?.avatarColor }}>
                            {author?.name ?? "کاربر"}
                          </Link>
                        )}
                        {m.forwarded_from && (
                          <p className="text-[10.5px] text-ink-500 mb-1 flex items-center gap-1">
                            <Forward size={11} /> فوروارد شده از {s.userName(m.forwarded_from.user_id)}
                            {(() => {
                              const src = s.chats.find((c) => c.id === m.forwarded_from!.chat_id);
                              return src && (src.chat_type === "group" || src.chat_type === "channel") ? ` · ${src.title}` : "";
                            })()}
                          </p>
                        )}
                        {m.parent_message_id && (
                          <button
                            onClick={() => document.getElementById(`m-${m.parent_message_id}`)?.scrollIntoView({ block: "center", behavior: "smooth" })}
                            className="block w-full text-right border-r-2 border-brand-400 bg-ink-50 rounded-md px-2 py-1 mb-1.5"
                          >
                            <span className="block text-[10.5px] font-medium text-brand-700">{parent ? s.userName(parent.user_id) : "پیام"}</span>
                            <span className="block text-[11px] text-ink-500 truncate">{parent ? (parent.type === "sticker" ? `برچسب ${parent.content}` : parent.content || "پیوست") : "این پیام حذف شده است."}</span>
                          </button>
                        )}
                        {m.type === "sticker" ? (
                          <p className="text-5xl leading-none py-1 select-none">{m.content}</p>
                        ) : (
                          m.content && (
                            <p className="text-[13px] text-ink-800 leading-6 whitespace-pre-wrap break-words">
                              <RichText text={m.content} />
                            </p>
                          )
                        )}
                        {m.attachments.length > 0 && (
                          <div className="mt-1.5">
                            <AttachmentList items={m.attachments} />
                          </div>
                        )}
                        {extraTags.length > 0 && (
                          <div className="mt-1">
                            <TagList tags={extraTags} />
                          </div>
                        )}
                        <p className="text-[10px] text-ink-400 mt-0.5 flex items-center gap-1 justify-end">
                          {m.edited && <span>ویرایش‌شده ·</span>}
                          {timeOf(m.created_at)}
                        </p>
                      </div>
                      {/* منوی اقدام‌ها (هاور یا نگه‌داشتن لمسی) */}
                      <button
                        onClick={() => setMenu(menu === m.id ? null : m.id)}
                        className={`absolute top-1 ${own ? "-left-7" : "-right-7"} p-1 rounded-md text-ink-400 hover:bg-white hover:text-ink-700 opacity-60 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100`}
                        aria-label="اقدام‌های پیام"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {menu === m.id && (
                        <>
                          <span className="fixed inset-0 z-30" onClick={() => setMenu(null)} />
                          <div className={`absolute z-40 top-7 ${own ? "right-0" : "left-0"} w-40 bg-white border border-ink-200 rounded-xl shadow-lg py-1`}>
                            {actions.map((a) => (
                              <button
                                key={a.k}
                                onClick={() => {
                                  setMenu(null);
                                  a.run();
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-right hover:bg-ink-50 ${a.danger ? "text-rose-600" : "text-ink-700"}`}
                              >
                                <a.icon size={13} /> {a.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* ---------------- composer */}
      {canRead && (
        <div className="border-t border-ink-100 bg-white">
          {!member ? (
            <div className="p-3 flex items-center justify-center gap-2 text-xs text-ink-500 flex-wrap">
              {active.parent && rootMember ? (
                <>
                  برای ارسال پیام در این {conf.subNoun} عضو آن شوید.
                  <Button size="sm" variant="primary" icon={<LogIn size={13} />} onClick={() => join(active)}>
                    پیوستن
                  </Button>
                </>
              ) : (
                <>
                  برای ارسال پیام ابتدا عضو {conf.noun} شوید.
                  {!root.is_private && (
                    <Button size="sm" variant="primary" icon={<LogIn size={13} />} onClick={() => join(root)}>
                      عضویت
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : !canPost ? (
            <p className="p-3 text-center text-xs text-ink-500 flex items-center justify-center gap-1.5">
              <Megaphone size={13} /> فقط مدیران کانال پیام می‌فرستند
            </p>
          ) : (
            <>
              {(reply || editing) && (
                <div className="flex items-center gap-2 px-3 pt-2">
                  {reply ? <CornerUpLeft size={14} className="text-brand-600 shrink-0" /> : <Pencil size={14} className="text-brand-600 shrink-0" />}
                  <div className="flex-1 min-w-0 border-r-2 border-brand-400 pr-2">
                    <p className="text-[11px] font-medium text-brand-700">{reply ? `پاسخ به ${s.userName(reply.user_id)}` : "ویرایش پیام"}</p>
                    <p className="text-[11px] text-ink-500 truncate">{(reply ?? editing)!.content || "پیوست"}</p>
                  </div>
                  <button onClick={resetComposer} className="p-1 text-ink-400 hover:text-rose-600" aria-label="لغو">
                    <X size={14} />
                  </button>
                </div>
              )}
              {files.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-3 pt-2">
                  {files.map((f) => (
                    <span key={f.id} className="text-[11px] bg-ink-100 text-ink-700 rounded-md px-2 py-0.5 flex items-center gap-1 max-w-[220px]">
                      <Paperclip size={11} className="shrink-0" />
                      <span className="truncate">{f.name}</span>
                      <button onClick={() => setFiles(files.filter((x) => x.id !== f.id))} aria-label="حذف پیوست">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-1.5 p-2">
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) setFiles([...files, ...toAttachments(e.target.files)]);
                    e.target.value = "";
                  }}
                />
                {!editing && (
                  <>
                    <button onClick={() => fileRef.current?.click()} className="p-2 rounded-lg text-ink-500 hover:bg-ink-100" title="پیوست فایل (uploaded_files)" aria-label="پیوست فایل">
                      <Paperclip size={18} />
                    </button>
                    <span className="relative">
                      <button onClick={() => setStickerOpen((v) => !v)} className="p-2 rounded-lg text-ink-500 hover:bg-ink-100" title="برچسب (type: sticker)" aria-label="برچسب">
                        <Smile size={18} />
                      </button>
                      {stickerOpen && (
                        <>
                          <span className="fixed inset-0 z-30" onClick={() => setStickerOpen(false)} />
                          <div className="absolute z-40 bottom-full mb-2 right-0 w-56 bg-white border border-ink-200 rounded-xl shadow-lg p-2 grid grid-cols-4 gap-1">
                            {stickers.map((e) => (
                              <button key={e} onClick={() => sendSticker(e)} className="text-3xl leading-none p-1.5 rounded-lg hover:bg-ink-100">
                                {e}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </span>
                  </>
                )}
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onKey}
                  rows={Math.min(5, Math.max(1, text.split("\n").length))}
                  placeholder="پیام… (Enter ارسال، Shift+Enter خط جدید، ‎@نام_خانوادگی برای منشن)"
                  className="flex-1 min-w-0 resize-none bg-ink-50 border border-transparent focus:border-brand-300 focus:bg-white rounded-xl px-3 py-2 text-[13px] leading-6 outline-none"
                />
                <button onClick={send} disabled={!text.trim() && !files.length} className="p-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40" aria-label={editing ? "ذخیره ویرایش" : "ارسال"}>
                  <SendHorizontal size={17} className="-scale-x-100" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---------------- forward */}
      <Modal open={!!forwarding} onClose={() => setForwarding(null)} title="فوروارد پیام" description="گفتگوی مقصد را انتخاب کنید (POST messages/{id}/forward/)">
        <div className="max-h-80 overflow-y-auto divide-y divide-ink-100 border border-ink-100 rounded-lg">
          {s
            .myChats()
            .filter((c) => c.id !== active.id && (c.chat_type !== "channel" || s.chatRole(c) === "admin"))
            .map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  if (!forwarding) return;
                  s.forwardMessage(forwarding.id, c.id);
                  setForwarding(null);
                  notify(`به «${chatTitle(c, me)}» فوروارد شد.`, "success");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-right hover:bg-ink-50"
              >
                <ChatAvatar chat={c} me={me} size={30} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] text-ink-800 truncate">{chatTitle(c, me)}</span>
                  <span className="block text-[10.5px] text-ink-400">{c.parent ? `${conf.subNoun || "زیرمجموعه"} · ` : ""}{{ group: "گروه", channel: "کانال", direct_message: "پیام مستقیم", saved_messages: "ذخیره‌شده", bot: "بات" }[c.chat_type]}</span>
                </span>
              </button>
            ))}
        </div>
      </Modal>

      {/* ---------------- new topic / sub-channel */}
      <Modal open={subModal} onClose={() => setSubModal(false)} title={`${conf.subNoun} جدید در «${root.title}»`} description={mode === "channels" ? "POST channels/{id}/sub-channels/" : "POST groups/{id}/topics/"}>
        <div className="space-y-3">
          <Field label="عنوان (title)">
            <input className="input-field" value={subForm.title} onChange={(e) => setSubForm({ ...subForm, title: e.target.value })} autoFocus />
          </Field>
          <Field label="توضیح (description)">
            <textarea className="input-field min-h-[70px]" value={subForm.description} onChange={(e) => setSubForm({ ...subForm, description: e.target.value })} />
          </Field>
          <label className="flex items-center justify-between gap-2 text-xs text-ink-700">
            خصوصی (is_private)
            <Toggle on={subForm.is_private} onChange={() => setSubForm({ ...subForm, is_private: !subForm.is_private })} />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setSubModal(false)}>
              انصراف
            </Button>
            <Button variant="primary" onClick={createSub}>
              ساخت {conf.subNoun}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
