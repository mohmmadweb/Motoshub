import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AtSign, Heart, MessageCircle, Settings, CheckSquare, Bell, CheckCheck, Circle, CheckCircle2, Trash2, KanbanSquare, Mail, Smartphone, MessageSquareText, MonitorSmartphone, Moon, Radio, SlidersHorizontal } from "lucide-react";
import { type Notification } from "../data/mock";
import { personalFor } from "../data/personal";
import { useTenancy } from "../context/TenancyContext";
import { useProjectsPM } from "../context/ProjectsContext";
import { useInbox, inboxKindLabel, type InboxItem, type InboxKind } from "../context/InboxContext";
import { UserPlus, Megaphone, Mail as MailIcon, CalendarPlus, Reply, Hash, BookOpen, UserCheck, UserX } from "lucide-react";
import { categoryLabel, channelLabel, eventByCode, type EventCategory } from "../pm/events";
import type { NotifChannel, PMNotification } from "../pm/types";
import PageHeader from "../components/ui/PageHeader";
import Tabs from "../components/ui/Tabs";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Toggle from "../components/ui/Toggle";
import EmptyState from "../components/ui/EmptyState";
import RowActions from "../components/ui/RowActions";
import { useToast } from "../components/ui/ToastProvider";
import { useConfirm } from "../components/ui/ConfirmProvider";

const typeIcon: Record<Notification["type"], typeof AtSign> = {
  mention: AtSign,
  like: Heart,
  comment: MessageCircle,
  system: Settings,
  task: CheckSquare,
};
const chIcon: Record<NotifChannel, typeof Mail> = { inapp: MonitorSmartphone, email: Mail, sms: MessageSquareText, push: Smartphone };
const prTone = { کم: "neutral", عادی: "neutral", مهم: "warning", فوری: "danger" } as const;

type FilterId = "all" | "unread" | "projects" | "outbox" | "prefs";
const kindIcon: Record<InboxKind, typeof AtSign> = {
  friend_request: UserPlus,
  friend_accept: UserCheck,
  friend_reject: UserX,
  new_content: Megaphone,
  direct_message: MailIcon,
  mention: AtSign,
  channel_message: Hash,
  event_invite: CalendarPlus,
  reply: Reply,
  knowledge: BookOpen,
  chat_added: UserPlus,
};

/** ترجیحات اعلانِ هر کاربر (فقط در مرورگر همین کاربر) */
type Prefs = { channels: Record<string, NotifChannel[]>; quiet: boolean; quietFrom: string; quietTo: string; digest: boolean; mutedProjects: string[] };
const prefCats: EventCategory[] = ["task", "dependency", "milestone", "risk", "issue", "budget", "expense", "meeting", "communication", "member", "project", "playbook"];
const defaultPrefs = (): Prefs => ({
  channels: Object.fromEntries(prefCats.map((c) => [c, c === "budget" || c === "risk" ? ["inapp", "email", "sms"] : c === "communication" || c === "task" || c === "dependency" ? ["inapp", "push"] : ["inapp", "email"]])),
  quiet: true,
  quietFrom: "۲۲:۰۰",
  quietTo: "۰۷:۰۰",
  digest: true,
  mutedProjects: [],
});
function loadPrefs(uid: string): Prefs {
  try {
    const raw = localStorage.getItem(`motoshub.notifprefs.${uid}`);
    if (raw) return { ...defaultPrefs(), ...JSON.parse(raw) };
  } catch {
    /* ذخیره‌ساز در دسترس نیست */
  }
  return defaultPrefs();
}

export default function Notifications() {
  const [filter, setFilter] = useState<FilterId>("all");
  const { actingUser, canAccessAdmin } = useTenancy();
  const pm = useProjectsPM();
  const inbox = useInbox();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>(() => personalFor(actingUser.id).notifications);
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(actingUser.id));
  const [projectF, setProjectF] = useState("");
  const [recipientF, setRecipientF] = useState("");
  // با تعویض حساب، اعلان‌های همان کاربر بارگذاری می‌شود
  useEffect(() => {
    setItems(personalFor(actingUser.id).notifications);
    setPrefs(loadPrefs(actingUser.id));
  }, [actingUser.id]);
  useEffect(() => {
    try {
      localStorage.setItem(`motoshub.notifprefs.${actingUser.id}`, JSON.stringify(prefs));
    } catch {
      /* نادیده */
    }
  }, [prefs, actingUser.id]);
  const { notify } = useToast();
  const confirm = useConfirm();

  const mine = useMemo(() => pm.store.notifications.filter((n) => n.recipient === actingUser.name && !prefs.mutedProjects.includes(n.projectId)), [pm.store.notifications, actingUser.name, prefs.mutedProjects]);
  const pmUnread = mine.filter((n) => !n.read).length;
  const inboxList = filter === "unread" ? inbox.mine.filter((i) => !inbox.isRead(i)) : inbox.mine;
  const unreadCount = items.filter((n) => !n.read).length + pmUnread + inbox.unread;
  const personalList = filter === "unread" ? items.filter((n) => !n.read) : items;
  const pmList = (filter === "unread" ? mine.filter((n) => !n.read) : mine).filter((n) => !projectF || n.projectId === projectF);
  const outbox = pm.store.notifications.filter((n) => (!projectF || n.projectId === projectF) && (!recipientF || n.recipient === recipientF));

  const toggleRead = (id: string) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));

  const markAll = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    pm.markAllRead(actingUser.name);
    inbox.markAllRead();
    notify("همه‌ی اعلان‌ها خوانده‌شده علامت خوردند.", "info");
  };

  const remove = (n: Notification) =>
    confirm({
      title: "حذف این اعلان؟",
      message: n.text,
      onConfirm: () => {
        setItems((prev) => prev.filter((x) => x.id !== n.id));
        notify("اعلان حذف شد.", "info");
      },
    });

  const clearAll = () =>
    confirm({
      title: "پاک‌کردن همه‌ی اعلان‌ها؟",
      message: `${(items.length + mine.length + inbox.mine.length).toLocaleString("fa-IR")} اعلان حذف می‌شود و قابل بازیابی نیست.`,
      onConfirm: () => {
        setItems([]);
        mine.forEach((n) => pm.removeNotification(n.id));
        inbox.hideAll();
        notify("همه‌ی اعلان‌ها پاک شدند.", "info");
      },
    });

  const openPm = (n: PMNotification) => {
    pm.markRead(n.id);
    navigate(`/dashboard/projects/${n.projectId}?tab=${n.link.tab}${n.link.entityId ? `&focus=${n.link.entityId}` : ""}`);
  };

  const PmRow = ({ n, showRecipient = false }: { n: PMNotification; showRecipient?: boolean }) => {
    const def = eventByCode[n.event];
    return (
      <div className={`p-4 flex items-start gap-3 transition-colors ${!n.read ? "bg-brand-50/40" : ""}`}>
        <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
          <KanbanSquare size={15} />
        </span>
        <button className="flex-1 min-w-0 text-right" onClick={() => openPm(n)}>
          <p className={`text-sm leading-6 ${n.read ? "text-ink-500" : "text-ink-800 font-medium"}`}>{n.text}</p>
          <div className="flex items-center gap-1.5 flex-wrap mt-1 text-xs text-ink-400">
            <span className="text-brand-700">{n.projectName}</span>
            <span>· {def ? categoryLabel[def.category] : ""}</span>
            {showRecipient ? <span className="text-ink-700">· به: {n.recipient}</span> : <span>· چون {n.reason} هستید</span>}
            {n.priority !== "عادی" && <Badge tone={prTone[n.priority]}>{n.priority}</Badge>}
            <span className="flex items-center gap-0.5" title={n.channels.map((c) => channelLabel[c]).join("، ")}>
              {n.channels.map((c) => {
                const I = chIcon[c];
                return <I key={c} size={11} />;
              })}
            </span>
            <span>
              · {n.date} {n.time}
            </span>
          </div>
        </button>
        <button
          onClick={() => pm.markRead(n.id, !n.read)}
          title={n.read ? "علامت‌گذاری به‌عنوان خوانده‌نشده" : "علامت‌گذاری به‌عنوان خوانده‌شده"}
          aria-label={n.read ? "خوانده‌نشده کن" : "خوانده‌شده کن"}
          className="shrink-0 mt-1 text-ink-300 hover:text-brand-600 transition-colors"
        >
          {n.read ? <Circle size={16} /> : <CheckCircle2 size={16} className="text-brand-600" />}
        </button>
        <RowActions onDelete={() => pm.removeNotification(n.id)} size={15} />
      </div>
    );
  };

  const InboxRow = ({ n }: { n: InboxItem }) => {
    const Icon = kindIcon[n.kind];
    const read = inbox.isRead(n);
    return (
      <div className={`p-4 flex items-start gap-3 transition-colors ${!read ? "bg-brand-50/40" : ""}`}>
        <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-600 flex items-center justify-center shrink-0">
          <Icon size={15} />
        </span>
        <button
          className="flex-1 min-w-0 text-right"
          onClick={() => {
            inbox.markRead(n.id);
            navigate(n.link);
          }}
        >
          <p className={`text-sm leading-6 ${read ? "text-ink-500" : "text-ink-800 font-medium"}`}>{n.text}</p>
          <p className="text-xs text-ink-400 mt-1">
            {inboxKindLabel[n.kind]} · {n.time}
            {n.recipient === "*" && " · همگانی"}
          </p>
        </button>
        <button onClick={() => inbox.markRead(n.id, !read)} title={read ? "علامت‌گذاری به‌عنوان خوانده‌نشده" : "علامت‌گذاری به‌عنوان خوانده‌شده"} aria-label={read ? "خوانده‌نشده کن" : "خوانده‌شده کن"} className="shrink-0 mt-1 text-ink-300 hover:text-brand-600 transition-colors">
          {read ? <Circle size={16} /> : <CheckCircle2 size={16} className="text-brand-600" />}
        </button>
        <RowActions onDelete={() => inbox.hide(n.id)} size={15} />
      </div>
    );
  };

  const projectOptions = pm.projects.map((p) => ({ id: p.meta.id, name: p.meta.name }));

  return (
    <div>
      <PageHeader
        title="اعلان‌ها"
        description="اعلان‌های برخط، رایانامه، پیامک و پوش مرتبط با فعالیت‌های شما — از جمله رویدادهای پروژه‌هایی که عضو آن هستید"
        icon={<Bell size={18} />}
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" icon={<CheckCheck size={14} />} onClick={markAll}>
                خواندن همه ({unreadCount.toLocaleString("fa-IR")})
              </Button>
            )}
            {items.length + mine.length + inbox.mine.length > 0 && (
              <Button variant="secondary" size="sm" icon={<Trash2 size={14} />} onClick={clearAll}>
                پاک‌کردن همه
              </Button>
            )}
          </div>
        }
      />

      <Tabs<FilterId>
        tabs={[
          { id: "all", label: "همه", count: items.length + mine.length + inbox.mine.length },
          { id: "unread", label: "خوانده‌نشده", count: unreadCount },
          { id: "projects", label: "پروژه‌ها", count: mine.length },
          ...(canAccessAdmin ? [{ id: "outbox" as FilterId, label: "مرکز ارسال (همه‌ی گیرندگان)", count: pm.store.notifications.length }] : []),
          { id: "prefs", label: "تنظیمات اعلان من" },
        ]}
        active={filter}
        onChange={setFilter}
      />

      {(filter === "projects" || filter === "outbox") && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <select value={projectF} onChange={(e) => setProjectF(e.target.value)} className="input-field !py-1.5 !text-xs !w-auto">
            <option value="">همه‌ی پروژه‌ها</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {filter === "outbox" && (
            <select value={recipientF} onChange={(e) => setRecipientF(e.target.value)} className="input-field !py-1.5 !text-xs !w-auto">
              <option value="">همه‌ی گیرندگان</option>
              {[...new Set(pm.store.notifications.map((n) => n.recipient))].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          )}
          {filter === "outbox" && <span className="text-xs text-ink-400">نمای راهبر: همه‌ی اعلان‌هایی که سامانه برای هر شخص صادر کرده است ({outbox.length.toLocaleString("fa-IR")})</span>}
        </div>
      )}

      {(filter === "all" || filter === "unread") && (
        <div className="card divide-y divide-ink-100">
          {inboxList.map((n) => (
            <InboxRow key={n.id} n={n} />
          ))}
          {pmList.map((n) => (
            <PmRow key={n.id} n={n} />
          ))}
          {personalList.map((n) => {
            const Icon = typeIcon[n.type];
            return (
              <div key={n.id} className={`p-4 flex items-start gap-3 transition-colors ${!n.read ? "bg-brand-50/40" : ""}`}>
                <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center shrink-0">
                  <Icon size={15} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.read ? "text-ink-500" : "text-ink-800 font-medium"}`}>{n.text}</p>
                  <p className="text-xs text-ink-400 mt-1">{n.time}</p>
                </div>
                <button
                  onClick={() => toggleRead(n.id)}
                  title={n.read ? "علامت‌گذاری به‌عنوان خوانده‌نشده" : "علامت‌گذاری به‌عنوان خوانده‌شده"}
                  aria-label={n.read ? "خوانده‌نشده کن" : "خوانده‌شده کن"}
                  className="shrink-0 mt-1 text-ink-300 hover:text-brand-600 transition-colors"
                >
                  {n.read ? <Circle size={16} /> : <CheckCircle2 size={16} className="text-brand-600" />}
                </button>
                <RowActions onDelete={() => remove(n)} size={15} />
              </div>
            );
          })}
          {personalList.length + pmList.length + inboxList.length === 0 && <EmptyState icon={<Bell size={18} />} title={filter === "unread" ? "اعلان خوانده‌نشده‌ای ندارید" : "اعلانی وجود ندارد"} />}
        </div>
      )}

      {filter === "projects" && (
        <div className="card divide-y divide-ink-100">
          {pmList.map((n) => (
            <PmRow key={n.id} n={n} />
          ))}
          {pmList.length === 0 && (
            <EmptyState
              icon={<KanbanSquare size={18} />}
              title="اعلان پروژه‌ای برای شما نیست"
              description={`اعلان‌های پروژه بر اساس نقش «${actingUser.name}» در هر پروژه (مسئول تسک، مدیر پروژه، مسئول ریسک، شرکت‌کننده‌ی جلسه، …) صادر می‌شوند. برای دیدن سناریوی دیگر، از منوی کاربر حساب «محسن مردعلی» یا «وحید خاوئی» را انتخاب کنید.`}
            />
          )}
        </div>
      )}

      {filter === "outbox" && canAccessAdmin && (
        <div className="card divide-y divide-ink-100">
          {outbox.map((n) => (
            <PmRow key={n.id} n={n} showRecipient />
          ))}
          {outbox.length === 0 && <EmptyState icon={<Radio size={18} />} title="هنوز اعلانی صادر نشده" />}
        </div>
      )}

      {filter === "prefs" && (
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-bold text-ink-900 flex items-center gap-1.5 mb-1">
              <SlidersHorizontal size={15} className="text-brand-600" /> کانال‌های دریافت به تفکیک نوع رویداد
            </h3>
            <p className="text-xs text-ink-400 mb-3">مدیر پروژه تعیین می‌کند چه کسی مطلع شود؛ شما تعیین می‌کنید از چه راهی. اعلان‌های «فوری» (مثل عبور بودجه از ۸۰٪ یا ریسک بحرانی) همیشه درون‌برنامه هم ارسال می‌شوند.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[520px]">
                <thead>
                  <tr className="text-ink-400 border-b border-ink-100 text-right">
                    <th className="p-2 font-medium">نوع رویداد</th>
                    {(["inapp", "email", "sms", "push"] as NotifChannel[]).map((c) => {
                      const I = chIcon[c];
                      return (
                        <th key={c} className="p-2 font-medium text-center">
                          <span className="inline-flex items-center gap-1">
                            <I size={12} /> {channelLabel[c]}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {prefCats.map((cat) => (
                    <tr key={cat} className="border-b border-ink-100">
                      <td className="p-2 text-ink-800">{categoryLabel[cat]}</td>
                      {(["inapp", "email", "sms", "push"] as NotifChannel[]).map((c) => {
                        const on = prefs.channels[cat]?.includes(c);
                        return (
                          <td key={c} className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={!!on}
                              onChange={() => setPrefs({ ...prefs, channels: { ...prefs.channels, [cat]: on ? prefs.channels[cat].filter((x) => x !== c) : [...(prefs.channels[cat] ?? []), c] } })}
                              className="accent-[var(--color-brand-600)] w-4 h-4"
                              aria-label={`${categoryLabel[cat]} — ${channelLabel[c]}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5">
                  <Moon size={14} /> ساعات سکوت
                </p>
                <Toggle on={prefs.quiet} onChange={() => setPrefs({ ...prefs, quiet: !prefs.quiet })} label="ساعات سکوت" />
              </div>
              <p className="text-xs text-ink-400">در این بازه پیامک و پوش ارسال نمی‌شود (به‌جز «فوری») و اعلان‌ها در صبح تحویل می‌شوند.</p>
              <div className="flex items-center gap-2 text-xs">
                از <input className="input-field !w-24" value={prefs.quietFrom} onChange={(e) => setPrefs({ ...prefs, quietFrom: e.target.value })} /> تا{" "}
                <input className="input-field !w-24" value={prefs.quietTo} onChange={(e) => setPrefs({ ...prefs, quietTo: e.target.value })} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-ink-100">
                <p className="text-sm font-medium text-ink-900">خلاصه‌ی روزانه</p>
                <Toggle on={prefs.digest} onChange={() => setPrefs({ ...prefs, digest: !prefs.digest })} label="خلاصه‌ی روزانه" />
              </div>
              <p className="text-xs text-ink-400">اعلان‌های کم‌اهمیت (تغییر نام، بارگذاری سند، …) به‌جای تک‌تک، در یک رایانامه‌ی روزانه جمع می‌شوند.</p>
            </div>
            <div className="card p-4">
              <p className="text-sm font-medium text-ink-900 mb-2">بی‌صدا کردن پروژه</p>
              <p className="text-xs text-ink-400 mb-3">اعلان‌های پروژه‌ی بی‌صدا در فهرست شما نمایش داده نمی‌شوند (رویدادهای «فوری» مستثنا هستند).</p>
              {projectOptions.map((p) => {
                const muted = prefs.mutedProjects.includes(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between py-1.5 text-xs">
                    <span className="text-ink-700">{p.name}</span>
                    <Toggle on={!muted} onChange={() => setPrefs({ ...prefs, mutedProjects: muted ? prefs.mutedProjects.filter((x) => x !== p.id) : [...prefs.mutedProjects, p.id] })} label={`اعلان‌های ${p.name}`} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
