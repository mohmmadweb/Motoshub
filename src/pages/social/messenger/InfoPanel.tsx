// ---------------------------------------------------------------------------
// پنل اطلاعات گروه/کانال: توضیح، حریم، اعضا و نقش‌ها، تنظیمات مدیر، خروج و حذف.
// rename ، set_description ، privacy ، set-wall-photo ، publish/unpublish ، add-member ، remove-member ، leave ، DELETE
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Link } from "react-router-dom";
import { FolderOpen, Globe2, Lock, LogOut, Shield, ShieldOff, Trash2, UserMinus, UserPlus, Check, CalendarDays, Eye, EyeOff } from "lucide-react";
import Drawer from "../../../components/ui/Drawer";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Toggle from "../../../components/ui/Toggle";
import { useSocial } from "../../../context/SocialContext";
import { useTenancy } from "../../../context/TenancyContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { useConfirm } from "../../../components/ui/ConfirmProvider";
import { CategoryBadges, Field, TagList, UserLine, UserPicker, fa, stamp } from "../kit";
import type { Chat } from "../../../social/types";
import { ChatAvatar, modeConf, wallPalette, type MessengerMode } from "./shared";

export default function InfoPanel({ mode, chat, open, onClose, onGone }: { mode: MessengerMode; chat: Chat; open: boolean; onClose: () => void; onGone: () => void }) {
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const confirm = useConfirm();
  const conf = modeConf[mode];
  const me = s.me;
  const manage = hasPermission(conf.managePerm);
  const isOwner = chat.owner_id === me;
  const isAdmin = isOwner || s.chatRole(chat) === "admin" || manage;
  const member = s.isMember(chat);
  const [title, setTitle] = useState(chat.title);
  const [desc, setDesc] = useState(chat.description);
  const [adding, setAdding] = useState(false);
  const [newMembers, setNewMembers] = useState<string[]>([]);
  const children = s.chats.filter((c) => c.parent === chat.id && !c.deleted_at);
  const wall = chat.wall_photo ?? chat.profile_photos[0] ?? "#1f4f99";

  const members = [...chat.members].sort((a, b) => (a.user_id === chat.owner_id ? -1 : b.user_id === chat.owner_id ? 1 : a.role === b.role ? 0 : a.role === "admin" ? -1 : 1));

  const leave = () => {
    const r = s.leaveChat(chat.id); // POST …/leave/
    if (!r.ok) return notify(r.error, "warning");
    notify(`از «${chat.title}» خارج شدید.`, "success");
    onClose();
    if (chat.is_private) onGone();
  };

  const remove = () =>
    confirm({
      title: `${conf.noun} «${chat.title}» حذف شود؟`,
      message: `همه‌ی پیام‌ها و ${conf.subNoun}‌های آن هم حذف می‌شوند.`,
      confirmLabel: `حذف ${conf.noun}`,
      onConfirm: () => {
        s.deleteChat(chat.id); // DELETE …/{id}/
        notify(`${conf.noun} حذف شد.`, "success");
        onClose();
        onGone();
      },
    });

  const section = "border-t border-ink-100 pt-4 mt-4";

  return (
    <Drawer open={open} onClose={onClose} title={`اطلاعات ${conf.noun}`}>
      <div className="-mt-1">
        {/* دیوار و عنوان */}
        <div className="rounded-xl h-24 relative mb-10" style={{ background: `linear-gradient(135deg, ${wall}, color-mix(in srgb, ${wall} 55%, #000))` }}>
          <span className="absolute -bottom-7 right-4 rounded-full ring-4 ring-white">
            <ChatAvatar chat={chat} me={me} size={56} />
          </span>
        </div>
        <p className="text-base font-bold text-ink-900">{chat.title}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {chat.is_private ? (
            <Badge tone="neutral" icon={<Lock size={10} />}>
              خصوصی
            </Badge>
          ) : (
            <Badge tone="success" icon={<Globe2 size={10} />}>
              عمومی
            </Badge>
          )}
          {!chat.is_public && <Badge tone="warning">در فهرست عمومی نمایش داده نمی‌شود</Badge>}
          <span className="text-[11px] text-ink-400 flex items-center gap-1">
            <CalendarDays size={11} /> ساخته‌شده {stamp(chat.created_at)}
          </span>
        </div>
        {chat.description && <p className="text-[13px] text-ink-700 leading-6 mt-3 whitespace-pre-wrap">{chat.description}</p>}
        <div className="mt-2 space-y-1.5">
          <CategoryBadges ids={chat.category_ids} />
          <TagList tags={chat.tags} />
        </div>
        {conf.owner && (
          <Link to={`/dashboard/files?owner=${conf.owner}:${chat.id}`} className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-700 hover:underline">
            <FolderOpen size={13} /> فایل‌های {conf.noun}
          </Link>
        )}

        {/* تنظیمات مدیر */}
        {isAdmin && (
          <div className={`${section} space-y-3`}>
            <p className="text-sm font-bold text-ink-900">تنظیمات</p>
            <Field label="نام (rename)">
              <div className="flex gap-2">
                <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Button
                  size="sm"
                  icon={<Check size={13} />}
                  disabled={!title.trim() || title === chat.title}
                  onClick={() => {
                    s.updateChat(chat.id, { title: title.trim() });
                    notify("نام تغییر کرد.", "success");
                  }}
                >
                  ذخیره
                </Button>
              </div>
            </Field>
            <Field label="توضیح (set_description)">
              <textarea className="input-field min-h-[64px]" value={desc} onChange={(e) => setDesc(e.target.value)} />
              {desc !== chat.description && (
                <Button
                  size="sm"
                  className="mt-1.5"
                  icon={<Check size={13} />}
                  onClick={() => {
                    s.updateChat(chat.id, { description: desc.trim() });
                    notify("توضیح ذخیره شد.", "success");
                  }}
                >
                  ذخیره‌ی توضیح
                </Button>
              )}
            </Field>
            <div className="rounded-lg bg-ink-50 border border-ink-100 divide-y divide-ink-100">
              <label className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs text-ink-700">
                <span>
                  خصوصی (privacy)
                  <span className="block text-[10.5px] text-ink-400">عضویت فقط با دعوت مدیر</span>
                </span>
                <Toggle on={chat.is_private} onChange={() => s.updateChat(chat.id, { is_private: !chat.is_private })} />
              </label>
              <label className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs text-ink-700">
                <span>
                  نمایش در فهرست عمومی (publish / unpublish)
                  <span className="block text-[10.5px] text-ink-400">در «کشف {conf.title}» دیده شود</span>
                </span>
                <Toggle
                  on={chat.is_public}
                  onChange={() => {
                    s.updateChat(chat.id, { is_public: !chat.is_public });
                    notify(chat.is_public ? "از فهرست عمومی برداشته شد." : "در فهرست عمومی منتشر شد.", "info");
                  }}
                />
              </label>
            </div>
            <Field label="رنگ دیوار (set-wall-photo) و نمایه (profile_photos)">
              <div className="flex gap-1.5 flex-wrap">
                {wallPalette.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => s.updateChat(chat.id, { wall_photo: c, profile_photos: [c, ...chat.profile_photos.filter((x) => x !== c)] })}
                    className={`w-7 h-7 rounded-lg border-2 ${wall === c ? "border-ink-900" : "border-transparent"}`}
                    style={{ background: c }}
                    aria-label={`رنگ ${c}`}
                  />
                ))}
              </div>
            </Field>
          </div>
        )}

        {/* تاپیک‌ها / زیرکانال‌ها */}
        {children.length > 0 && (
          <div className={section}>
            <p className="text-sm font-bold text-ink-900 mb-2">
              {mode === "channels" ? "زیرکانال‌ها" : "تاپیک‌ها"} ({fa(children.length)})
            </p>
            <div className="space-y-1">
              {children.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-xs bg-ink-50 rounded-md px-2.5 py-1.5">
                  <span className="flex-1 truncate text-ink-700">{c.title}</span>
                  {c.is_private && <Lock size={11} className="text-ink-400" />}
                  {isAdmin && (
                    <button
                      onClick={() =>
                        confirm({
                          title: `«${c.title}» حذف شود؟`,
                          confirmLabel: "حذف",
                          onConfirm: () => {
                            s.deleteChat(c.id);
                            notify("حذف شد.", "success");
                          },
                        })
                      }
                      className="text-ink-400 hover:text-rose-600"
                      aria-label="حذف"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* اعضا */}
        <div className={section}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-ink-900">اعضا ({fa(chat.members.length)})</p>
            {isAdmin && (
              <Button size="sm" variant="ghost" icon={<UserPlus size={13} />} onClick={() => setAdding((v) => !v)}>
                افزودن عضو
              </Button>
            )}
          </div>
          {adding && (
            <div className="mb-3 space-y-2">
              <UserPicker value={newMembers} onChange={setNewMembers} exclude={chat.members.map((m) => m.user_id)} />
              <Button
                size="sm"
                variant="primary"
                disabled={!newMembers.length}
                onClick={() => {
                  newMembers.forEach((u) => s.addChatMember(chat.id, u, "member")); // POST …/add-member/
                  notify(`${fa(newMembers.length)} عضو اضافه شد.`, "success");
                  setNewMembers([]);
                  setAdding(false);
                }}
              >
                افزودن {newMembers.length ? fa(newMembers.length) : ""} نفر
              </Button>
            </div>
          )}
          <div className="divide-y divide-ink-100">
            {members.map((m) => {
              const owner = m.user_id === chat.owner_id;
              return (
                <div key={m.user_id} className="flex items-center gap-2 py-2">
                  <span className="flex-1 min-w-0">
                    <UserLine id={m.user_id} size={28} sub={`عضو از ${m.joined_at.split(" ")[0]}`} />
                  </span>
                  {owner ? <Badge tone="navy">مالک</Badge> : m.role === "admin" ? <Badge tone="brand">مدیر</Badge> : null}
                  {isAdmin && !owner && m.user_id !== me && (
                    <span className="flex items-center">
                      <button
                        onClick={() => {
                          const role = m.role === "admin" ? "member" : "admin";
                          s.addChatMember(chat.id, m.user_id, role);
                          notify(role === "admin" ? `${s.userName(m.user_id)} مدیر شد.` : `مدیریت ${s.userName(m.user_id)} برداشته شد.`, "success");
                        }}
                        className="p-1.5 rounded-md text-ink-400 hover:text-brand-700 hover:bg-ink-50"
                        title={m.role === "admin" ? "برداشتن مدیریت" : "مدیر کردن"}
                        aria-label={m.role === "admin" ? "برداشتن مدیریت" : "مدیر کردن"}
                      >
                        {m.role === "admin" ? <ShieldOff size={14} /> : <Shield size={14} />}
                      </button>
                      <button
                        onClick={() =>
                          confirm({
                            title: `${s.userName(m.user_id)} از «${chat.title}» حذف شود؟`,
                            confirmLabel: "حذف عضو",
                            onConfirm: () => {
                              s.removeChatMember(chat.id, m.user_id); // POST …/remove-member/
                              notify("عضو حذف شد.", "success");
                            },
                          })
                        }
                        className="p-1.5 rounded-md text-ink-400 hover:text-rose-600 hover:bg-ink-50"
                        title="حذف عضو"
                        aria-label="حذف عضو"
                      >
                        <UserMinus size={14} />
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* خروج / حذف */}
        <div className={`${section} flex flex-wrap gap-2`}>
          {member && !isOwner && (
            <Button variant="secondary" icon={<LogOut size={14} />} onClick={leave}>
              خروج از {conf.noun}
            </Button>
          )}
          {(isOwner || manage) && (
            <Button variant="danger" icon={<Trash2 size={14} />} onClick={remove}>
              حذف {conf.noun}
            </Button>
          )}
          {!isAdmin && (
            <span className="text-[11px] text-ink-400 flex items-center gap-1 w-full">
              {chat.is_public ? <Eye size={11} /> : <EyeOff size={11} />} تنظیمات فقط برای مدیران {conf.noun} قابل تغییر است.
            </span>
          )}
        </div>
      </div>
    </Drawer>
  );
}
