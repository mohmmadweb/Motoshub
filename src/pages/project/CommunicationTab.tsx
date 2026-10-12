import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Megaphone, Plus, Lock, ChevronLeft, MessagesSquare } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/ToastProvider";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useSocial } from "../../context/SocialContext";
import { users } from "../../data/mock";
import { fa } from "../../pm/jalali";
import type { ProjectState } from "../../pm/types";
import { Field, SectionTitle, useProjectPage } from "./shared";

/** شناسه‌ی کاربری اعضای پروژه (مدیر پروژه + اعضا) */
export function projectUserIds(p: ProjectState): string[] {
  const byName = (n: string) => users.find((u) => u.name === n)?.id;
  return [...new Set([byName(p.meta.manager), ...p.members.map((m) => m.userId ?? byName(m.name))].filter((x): x is string => !!x))];
}
const chatPath = (type: string, id: string) => (type === "channel" ? `/dashboard/channels/${id}` : `/dashboard/groups/${id}`);

/**
 * «کانال‌ها و گفتگو»ی پروژه = گروه‌ها/کانال‌های واقعی پیام‌رسان سامانه (گروه‌ها و کانال‌ها)،
 * خصوصی و فقط با اعضای پروژه، با نام یکتای «KEY · نام پروژه». گفتگو در صفحه‌ی خود پیام‌رسان انجام می‌شود.
 */
export default function CommunicationTab() {
  const { p, pid, canEdit } = useProjectPage();
  const pm = useProjectsPM();
  const s = useSocial();
  const { notify } = useToast();
  const [open, setOpen] = useState<null | { type: "group" | "channel"; suffix: string }>(null);
  const base = `${p.meta.key ?? p.meta.name} · ${p.meta.name}`;
  const chats = (p.meta.chatIds ?? []).map((id) => s.chats.find((c) => c.id === id && !c.deleted_at)).filter((c): c is NonNullable<typeof c> => !!c);
  const memberIds = useMemo(() => projectUserIds(p), [p]);
  const memberKey = memberIds.join(",");

  // عضویت گروه/کانال همیشه برابر اعضای پروژه می‌ماند (افزودن تازه‌واردها، حذف خارج‌شده‌ها؛ سازنده می‌ماند)
  useEffect(() => {
    if (!canEdit) return;
    chats.forEach((c) => {
      memberIds.filter((u) => !c.members.some((m) => m.user_id === u)).forEach((u) => s.addChatMember(c.id, u));
      c.members.filter((m) => !memberIds.includes(m.user_id) && m.user_id !== c.owner_id).forEach((m) => s.removeChatMember(c.id, m.user_id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberKey, (p.meta.chatIds ?? []).join(","), canEdit]);

  const create = (type: "group" | "channel", suffix: string) => {
    let title = suffix.trim() ? `${base} · ${suffix.trim()}` : base;
    for (let n = 2; s.chats.some((c) => !c.deleted_at && c.title === title); n++) title = `${suffix.trim() ? `${base} · ${suffix.trim()}` : base} (${fa(n)})`;
    const input = { title, description: `${type === "channel" ? "کانال اطلاع‌رسانی" : "گروه گفتگوی"} پروژه‌ی «${p.meta.name}» — فقط اعضای پروژه`, is_private: true, category_ids: [], tags: [], member_ids: memberIds };
    const id = type === "channel" ? s.createChannel(input) : s.createGroup(input);
    s.updateChat(id, { is_public: false });
    pm.linkChat(pid, id);
    notify(`${type === "channel" ? "کانال" : "گروه"} «${title}» ساخته شد و ${fa(memberIds.length)} عضو پروژه به آن اضافه شدند.`);
    setOpen(null);
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        icon={<MessagesSquare size={15} className="text-brand-600" />}
        title="کانال‌ها و گفتگو"
        hint="گفتگوی پروژه در «گروه‌ها» و «کانال‌ها»ی پیام‌رسان سامانه انجام می‌شود. فقط اعضای پروژه عضو آن‌ها هستند و با تغییر تیم خودکار به‌روز می‌شوند."
        action={
          canEdit &&
          chats.length > 0 && (
            <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setOpen({ type: "group", suffix: "" })}>
              گروه یا کانال جدید
            </Button>
          )
        }
      />

      {chats.length === 0 ? (
        <div className="card p-8 flex flex-col items-center text-center gap-2">
          <span className="w-12 h-12 rounded-xl bg-ink-100 text-ink-400 flex items-center justify-center mb-1">
            <Users size={20} />
          </span>
          <p className="text-sm font-bold text-ink-800">هنوز گروه گفتگویی برای این پروژه ساخته نشده</p>
          <p className="text-xs text-ink-500 max-w-md leading-6">گروه «{base}» در پیام‌رسان ساخته می‌شود و همه‌ی {fa(memberIds.length)} عضو پروژه به آن اضافه می‌شوند.</p>
          {canEdit && (
            <Button variant="primary" className="mt-2" icon={<Plus size={14} />} onClick={() => create("group", "")}>
              ساخت گروه گفتگوی پروژه
            </Button>
          )}
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {chats.map((c) => {
            const last = s.lastMessage(c.id);
            const unread = s.isMember(c) ? s.unreadCount(c) : 0;
            return (
              <Link key={c.id} to={chatPath(c.chat_type, c.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-ink-50">
                <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.chat_type === "channel" ? "bg-navy-50 text-navy-700" : "bg-brand-50 text-brand-700"}`}>{c.chat_type === "channel" ? <Megaphone size={17} /> : <Users size={17} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                    <span className="truncate">{c.title}</span>
                    <Lock size={11} className="text-ink-400 shrink-0" />
                  </span>
                  <span className="block text-[11.5px] text-ink-400 truncate">
                    {c.chat_type === "channel" ? "کانال" : "گروه"} · {fa(c.members.length)} عضو{last ? ` · ${s.userName(last.user_id)}: ${last.content}` : " · هنوز پیامی نیست"}
                  </span>
                </span>
                {unread > 0 && <span className="text-[10px] rounded-full bg-brand-600 text-white px-1.5 min-w-5 text-center">{fa(unread)}</span>}
                <span className="text-xs text-brand-700 whitespace-nowrap hidden sm:inline">باز کردن</span>
                <ChevronLeft size={15} className="text-ink-300 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title="گروه یا کانال جدید پروژه" description="خصوصی و فقط با اعضای پروژه — در «گروه‌ها» یا «کانال‌ها»ی پیام‌رسان باز می‌شود." width="max-w-md">
        {open && (
          <div className="space-y-3">
            <Field label="نوع">
              <div className="grid grid-cols-2 gap-2">
                {(["group", "channel"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setOpen({ ...open, type: t })} className={`rounded-lg border p-2.5 text-right text-xs ${open.type === t ? "border-brand-400 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-600"}`}>
                    <span className="flex items-center gap-1 font-bold text-[13px]">{t === "group" ? <Users size={13} /> : <Megaphone size={13} />} {t === "group" ? "گروه" : "کانال"}</span>
                    <span className="block mt-0.5 text-[10.5px] text-ink-500">{t === "group" ? "همه پیام می‌دهند" : "فقط مدیران پیام می‌دهند (اطلاع‌رسانی)"}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="نام" hint={`نام نهایی: «${open.suffix.trim() ? `${base} · ${open.suffix.trim()}` : base}»`}>
              <input className="input-field" value={open.suffix} onChange={(e) => setOpen({ ...open, suffix: e.target.value })} placeholder="مثلاً: عمرانی (اختیاری)" />
            </Field>
            <div className="flex gap-2 pt-1">
              <Button variant="primary" className="flex-1 justify-center" onClick={() => create(open.type, open.suffix)}>
                ساخت
              </Button>
              <Button variant="secondary" onClick={() => setOpen(null)}>
                انصراف
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
