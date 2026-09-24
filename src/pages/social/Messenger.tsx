// ---------------------------------------------------------------------------
// پیام‌رسان — یک صفحه برای سه مسیر:
//   /dashboard/chat(/:id)      گفتگوها  ← direct-messages ، saved-messages ، bots
//   /dashboard/groups(/:id)    گروه‌ها  ← groups (+ topics)
//   /dashboard/channels(/:id)  کانال‌ها ← channels (+ sub-channels)
// همه‌ی اقدام‌ها از useSocial() (شبیه‌ساز ماژول messaging در Motoshub Social API) می‌آیند.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MessageCircle, UsersRound, Megaphone, Search, Plus, BellOff, Lock, LogIn, PenSquare, Compass } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Toggle from "../../components/ui/Toggle";
import Avatar from "../../components/Avatar";
import { useSocial } from "../../context/SocialContext";
import { useTenancy } from "../../context/TenancyContext";
import { useToast } from "../../components/ui/ToastProvider";
import { users } from "../../data/mock";
import { endpoints } from "../../social/endpoints";
import type { Chat, Message } from "../../social/types";
import { ApiChip, CategoryPicker, Field, TagInput, UserPicker, fa } from "./kit";
import Conversation from "./messenger/Conversation";
import InfoPanel from "./messenger/InfoPanel";
import { ChatAvatar, apiSeg, chatTitle, modeConf, shortWhen, type ApiSeg, type MessengerMode } from "./messenger/shared";

const modeIcon = { chat: MessageCircle, groups: UsersRound, channels: Megaphone };
const modeDesc = {
  chat: "پیام‌های مستقیم، پیام‌های ذخیره‌شده و بات‌ها",
  groups: "گفتگوی گروهی با تاپیک‌ها؛ گروه‌های عمومی را کشف کنید و عضو شوید",
  channels: "انتشار یک‌طرفه‌ی پیام توسط مدیران، با زیرکانال‌ها",
};

type Tab = "mine" | "discover";
const emptyForm = { title: "", description: "", slug: "", is_private: false, category_ids: [] as string[], tags: [] as string[], member_ids: [] as string[] };

export default function Messenger({ mode }: { mode: MessengerMode }) {
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const conf = modeConf[mode];
  const me = s.me;
  const isRoomMode = mode !== "chat";

  const [tab, setTab] = useState<Tab>("mine");
  const [q, setQ] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [newDm, setNewDm] = useState(false);
  const [dmQ, setDmQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // پیام‌های ذخیره‌شده همیشه بالای فهرست گفتگوها
  useEffect(() => {
    if (mode === "chat" && !s.chats.some((c) => c.chat_type === "saved_messages" && c.owner_id === me)) s.ensureSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, me]);

  useEffect(() => {
    setInfoOpen(false);
  }, [id]);

  // ------------------------------------------------------------ انتخاب
  const selected = id ? s.chats.find((c) => c.id === id && !c.deleted_at) : undefined;
  const root = selected?.parent ? s.chats.find((c) => c.id === selected.parent && !c.deleted_at) : selected;
  const initialSub = selected?.parent ? selected.id : null;
  const open = (cid: string) => navigate(`${conf.base}/${cid}`);

  // ------------------------------------------------------------ فهرست
  const match = (c: Chat) => !q.trim() || chatTitle(c, me).includes(q.trim()) || c.description.includes(q.trim());
  const mine = s
    .myChats(conf.types)
    .filter((c) => !c.parent && match(c))
    .sort((a, b) => (a.chat_type === "saved_messages" ? -1 : b.chat_type === "saved_messages" ? 1 : 0));
  const discover = isRoomMode ? s.chats.filter((c) => conf.types.includes(c.chat_type) && !c.parent && !c.deleted_at && !c.is_private && c.is_public && !s.isMember(c) && match(c)) : [];
  const unreadOf = (c: Chat) => s.unreadCount(c) + s.chats.filter((x) => x.parent === c.id && !x.deleted_at && s.isMember(x)).reduce((a, x) => a + s.unreadCount(x), 0);

  const preview = (c: Chat, m: Message | undefined) => {
    if (!m) return c.description || "بدون پیام";
    const body = m.type === "sticker" ? `برچسب ${m.content}` : m.content || (m.attachments.length ? "📎 پیوست" : "");
    if (m.user_id === me && c.chat_type !== "saved_messages") return `شما: ${body}`;
    if (isRoomMode) return `${s.userName(m.user_id).split(" ")[0]}: ${body}`;
    return body;
  };

  // ------------------------------------------------------------ ساخت
  const create = () => {
    if (!form.title.trim()) return notify("عنوان را وارد کنید.", "warning");
    const input = { title: form.title.trim(), description: form.description.trim(), is_private: form.is_private, category_ids: form.category_ids, tags: form.tags };
    const cid = mode === "groups" ? s.createGroup({ ...input, member_ids: form.member_ids }) : s.createChannel({ ...input, slug: form.slug.trim() || undefined });
    notify(`${conf.noun} «${input.title}» ساخته شد.`, "success");
    setCreateOpen(false);
    setForm(emptyForm);
    setTab("mine");
    open(cid);
  };

  const startDirect = (uid: string) => {
    const cid = s.openDirect(uid); // POST direct-messages/
    setNewDm(false);
    setDmQ("");
    open(cid);
  };

  // ------------------------------------------------------------ API
  const seg: ApiSeg = root ? apiSeg(root.chat_type) : mode === "chat" ? "direct-messages" : mode;
  const pid = root?.id ?? "{id}";
  const api = [
    ...(mode === "chat"
      ? [
          { label: "پیام‌های مستقیم من", ep: endpoints.chatList("direct-messages") },
          { label: "پیام‌های ذخیره‌شده", ep: endpoints.chatList("saved-messages") },
          { label: "بات‌ها", ep: endpoints.chatList("bots") },
          { label: "پیام مستقیم جدید", ep: endpoints.chatCreate("direct-messages") },
        ]
      : [
          { label: `${conf.title}ی من`, ep: endpoints.chatList(mode) },
          { label: `ساخت ${conf.noun}`, ep: endpoints.chatCreate(mode) },
          { label: "عضویت", ep: endpoints.chatJoin(mode, pid) },
          { label: "خروج", ep: endpoints.chatLeave(mode, pid) },
          { label: mode === "groups" ? "تاپیک جدید" : "زیرکانال جدید", ep: mode === "groups" ? endpoints.groupTopic(pid) : endpoints.subChannel(pid) },
          { label: "افزودن عضو / تغییر نقش", ep: endpoints.chatAddMember(mode, pid) },
          { label: "حذف عضو", ep: endpoints.chatRemoveMember(mode, pid) },
          { label: "تغییر نام", ep: endpoints.chatRename(mode, pid) },
          { label: "توضیح", ep: endpoints.chatDescription(mode, pid) },
          { label: "حریم خصوصی", ep: endpoints.chatPrivacy(mode, pid) },
          { label: "رنگ دیوار", ep: endpoints.chatWall(mode, pid) },
          { label: "انتشار در فهرست", ep: endpoints.chatPublish(mode, pid) },
          { label: "لغو انتشار", ep: endpoints.chatUnpublish(mode, pid) },
          { label: `حذف ${conf.noun}`, ep: endpoints.chatDelete(mode, pid) },
        ]),
    { label: "پیام‌های گفتگو", ep: endpoints.chatMessages(seg, pid) },
    { label: "ارسال پیام", ep: endpoints.chatSend(seg, pid) },
    { label: "خوانده‌شدن", ep: endpoints.chatMarkRead(seg, pid) },
    { label: "بی‌صدا", ep: endpoints.chatMute(seg, pid) },
    { label: "ویرایش پیام", ep: endpoints.messageUpdate("{id}") },
    { label: "حذف پیام", ep: endpoints.messageDelete("{id}") },
    { label: "فوروارد پیام", ep: endpoints.messageForward("{id}") },
    { label: "ذخیره‌ی پیام", ep: endpoints.messageSave("{id}") },
    { label: "بلادرنگ (WebSocket)", ep: endpoints.realtime() },
  ];

  const Icon = modeIcon[mode];
  const canCreate = mode === "chat" || hasPermission(conf.createPerm);
  const list = tab === "discover" ? discover : mine;
  const friends = s.friendIds();
  const dmUsers = users
    .filter((u) => u.id !== me && (!dmQ.trim() || u.name.includes(dmQ.trim()) || u.role.includes(dmQ.trim())))
    .sort((a, b) => Number(friends.includes(b.id)) - Number(friends.includes(a.id)));

  return (
    <div>
      <PageHeader
        title={conf.title}
        description={modeDesc[mode]}
        icon={<Icon size={20} />}
        actions={
          <>
            <ApiChip items={api} />
            {canCreate && (
              <Button variant="primary" size="sm" icon={mode === "chat" ? <PenSquare size={14} /> : <Plus size={14} />} onClick={() => (mode === "chat" ? setNewDm(true) : setCreateOpen(true))}>
                {mode === "chat" ? "پیام جدید" : `${conf.noun} جدید`}
              </Button>
            )}
          </>
        }
      />

      <div className="card overflow-hidden flex h-[calc(100dvh-12rem)] min-h-[460px]">
        {/* ---------------- list */}
        <aside className={`w-full md:w-80 shrink-0 border-l border-ink-100 flex-col bg-white min-h-0 ${id ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 border-b border-ink-100 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`جستجوی ${conf.noun}…`} className="w-full bg-ink-50 border border-transparent focus:border-brand-300 focus:bg-white rounded-full pr-8 pl-3 py-2 text-[13px] outline-none" />
            </div>
            {isRoomMode && (
              <div className="grid grid-cols-2 gap-1 bg-ink-100 rounded-lg p-0.5">
                {(
                  [
                    ["mine", `${conf.title}ی من`, mine.length],
                    ["discover", `کشف ${conf.title}`, discover.length],
                  ] as const
                ).map(([k, label, n]) => (
                  <button key={k} onClick={() => setTab(k)} className={`text-[11.5px] py-1.5 rounded-md flex items-center justify-center gap-1 ${tab === k ? "bg-white text-ink-900 font-medium shadow-sm" : "text-ink-500"}`}>
                    {k === "discover" && <Compass size={12} />}
                    {label}
                    <span className="text-[10px] text-ink-400">{fa(n)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {list.map((c) => {
              const last = s.lastMessage(c.id);
              const unread = tab === "mine" ? unreadOf(c) : 0;
              const active = root?.id === c.id;
              const muted = c.muted_by.includes(me);
              return (
                <div key={c.id} className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-ink-50 cursor-pointer ${active ? "bg-brand-50" : "hover:bg-ink-50"}`} onClick={() => open(c.id)}>
                  <ChatAvatar chat={c} me={me} size={42} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-ink-900 truncate flex items-center gap-1">
                        {c.is_private && isRoomMode && <Lock size={11} className="text-ink-400 shrink-0" />}
                        <span className="truncate">{chatTitle(c, me)}</span>
                        {muted && <BellOff size={11} className="text-ink-400 shrink-0" />}
                      </span>
                      {last && tab === "mine" && <span className="text-[10.5px] text-ink-400 shrink-0">{shortWhen(last.created_at, s.today)}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className={`text-[11.5px] truncate ${unread ? "text-ink-700" : "text-ink-400"}`}>{tab === "discover" ? `${fa(c.members.length)} عضو · ${c.description || "بدون توضیح"}` : preview(c, last)}</span>
                      {unread > 0 && <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center shrink-0 text-white ${muted ? "bg-ink-400" : "bg-brand-600"}`}>{fa(unread)}</span>}
                      {tab === "discover" && (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<LogIn size={12} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            const r = s.joinChat(c.id); // POST …/join/
                            if (!r.ok) return notify(r.error, "warning");
                            notify(`به «${c.title}» پیوستید.`, "success");
                            setTab("mine");
                            open(c.id);
                          }}
                        >
                          عضویت
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {list.length === 0 && (
              <div className="p-8 text-center text-xs text-ink-400 space-y-2">
                <Icon size={26} className="mx-auto text-ink-300" />
                <p>{q ? "موردی پیدا نشد." : tab === "discover" ? `${conf.noun} عمومی تازه‌ای برای عضویت نیست.` : mode === "chat" ? "هنوز گفتگویی ندارید." : `عضو هیچ ${conf.noun}ی نیستید.`}</p>
                {!q && tab === "mine" && isRoomMode && (
                  <button onClick={() => setTab("discover")} className="text-brand-700 hover:underline">
                    کشف {conf.title}
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ---------------- conversation */}
        <section className={`flex-1 min-w-0 min-h-0 flex-col ${id ? "flex" : "hidden md:flex"}`}>
          {root ? (
            <Conversation key={root.id} mode={mode} root={root} initialSub={initialSub} onBack={() => navigate(conf.base)} onInfo={() => setInfoOpen(true)} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-6 bg-ink-50">
              <Icon size={34} className="text-ink-300" />
              <p className="text-sm text-ink-600">{id ? `این ${conf.noun} پیدا نشد یا حذف شده است.` : `یک ${conf.noun} را از فهرست انتخاب کنید.`}</p>
              {id && (
                <Button size="sm" variant="ghost" onClick={() => navigate(conf.base)}>
                  بازگشت به فهرست
                </Button>
              )}
            </div>
          )}
        </section>
      </div>

      {root && isRoomMode && <InfoPanel key={root.id} mode={mode} chat={root} open={infoOpen} onClose={() => setInfoOpen(false)} onGone={() => navigate(conf.base)} />}

      {/* ---------------- new direct message */}
      <Modal open={newDm} onClose={() => setNewDm(false)} title="پیام جدید" description="مخاطب را انتخاب کنید (POST direct-messages/)">
        <div className="relative mb-2">
          <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input-field !pr-8" value={dmQ} onChange={(e) => setDmQ(e.target.value)} placeholder="جستجوی نام یا نقش…" autoFocus />
        </div>
        <div className="max-h-80 overflow-y-auto border border-ink-100 rounded-lg divide-y divide-ink-100">
          {dmUsers.map((u) => (
            <button key={u.id} onClick={() => startDirect(u.id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-right hover:bg-ink-50">
              <Avatar name={u.name} color={u.avatarColor} size={30} />
              <span className="flex-1 min-w-0">
                <span className="block text-[12.5px] text-ink-800 truncate">{u.name}</span>
                <span className="block text-[10.5px] text-ink-400 truncate">{u.role}</span>
              </span>
              {friends.includes(u.id) && <span className="text-[10.5px] text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5">دوست</span>}
            </button>
          ))}
          {dmUsers.length === 0 && <p className="text-xs text-ink-400 p-3">کاربری پیدا نشد.</p>}
        </div>
      </Modal>

      {/* ---------------- new group / channel */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={`${conf.noun} جدید`} description={mode === "groups" ? "GroupStoreRequest" : "ChannelStoreRequest"} width="max-w-xl">
        <div className="space-y-3">
          <Field label="عنوان (title)">
            <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          </Field>
          <Field label="توضیح (description)">
            <textarea className="input-field min-h-[70px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          {mode === "channels" && (
            <Field label="نشانی کوتاه (slug)" hint="اختیاری؛ حروف لاتین و خط تیره">
              <input className="input-field" dir="ltr" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase() })} placeholder="my-channel" />
            </Field>
          )}
          <label className="flex items-center justify-between gap-2 text-xs text-ink-700 rounded-lg bg-ink-50 border border-ink-100 px-3 py-2.5">
            <span>
              خصوصی (is_private)
              <span className="block text-[10.5px] text-ink-400">عضویت فقط با دعوت مدیر؛ در «کشف {conf.title}» دیده نمی‌شود</span>
            </span>
            <Toggle on={form.is_private} onChange={() => setForm({ ...form, is_private: !form.is_private })} />
          </label>
          {conf.entity && <CategoryPicker entity={conf.entity} value={form.category_ids} onChange={(category_ids) => setForm({ ...form, category_ids })} />}
          <TagInput value={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
          {mode === "groups" && (
            <Field label={`اعضای اولیه (member_ids)${form.member_ids.length ? ` — ${fa(form.member_ids.length)} نفر` : ""}`}>
              <UserPicker value={form.member_ids} onChange={(member_ids) => setForm({ ...form, member_ids })} exclude={[me]} />
            </Field>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              انصراف
            </Button>
            <Button variant="primary" onClick={create}>
              ساخت {conf.noun}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
