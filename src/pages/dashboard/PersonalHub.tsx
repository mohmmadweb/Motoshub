// ---------------------------------------------------------------------------
// «میز کار من» — داشبورد شخصی و نقش‌محور.
// کارت‌های ثابت برای همه: کارهای من، جلسات و رویدادهای پیش‌رو، اعلان‌های مهم سازمان،
// پروژه‌های فعال من، محتوای پیشنهادی، افراد و گروه‌های پیشنهادی + صندوق ورودی
// (اعلان‌ها، پیام‌ها و منشن‌ها، منتظر تصمیم من).
// کارت نقش: مدیر سامانه / مدیر محتوا / مدیر پروژه / مدیر گروه هر کدام میز کار خودشان را دارند.
// ---------------------------------------------------------------------------
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  MessageCircle,
  AtSign,
  ListTodo,
  ShieldCheck,
  CalendarClock,
  ChevronLeft,
  CheckCircle2,
  Circle,
  KanbanSquare,
  BookOpen,
  UserPlus,
  Inbox,
  Timer,
  Video,
  Megaphone,
  Sparkles,
  UsersRound,
  Gauge,
  FileClock,
  Check,
  Plus,
  Newspaper,
  Image as ImageIcon,
  MessagesSquare,
  BookMarked,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Avatar from "../../components/Avatar";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useInbox } from "../../context/InboxContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { useSocial } from "../../context/SocialContext";
import { useToast } from "../../components/ui/ToastProvider";
import { personalFor } from "../../data/personal";
import { users } from "../../data/mock";
import { myWork, bucketOf } from "../../pm/myWork";
import { isDone, isOverdue, projectProgress } from "../../pm/selectors";
import { dayNum, fa } from "../../pm/jalali";
import { priorityTone } from "../project/shared";
import { ProjectIcon } from "../project/projectIcons";
import { dateOf } from "../social/kit";
import { entityLabel, type SocialModule } from "../../social/types";

type FeedItem = { key: string; icon: typeof Bell; tone: string; text: string; meta: string; to: string; unread: boolean; seq: number };

function Panel({ title, icon, to, linkLabel = "همه", count, children, className = "" }: { title: string; icon: ReactNode; to?: string; linkLabel?: string; count?: number; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-ink-100 p-3.5 flex flex-col min-w-0 ${className}`}>
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-bold text-ink-800 flex items-center gap-1.5">
          {icon} {title}
          {count !== undefined && count > 0 && <span className="text-[10px] font-medium bg-ink-100 text-ink-600 rounded-full px-1.5">{fa(count)}</span>}
        </p>
        {to && (
          <Link to={to} className="text-[11px] text-brand-700 hover:underline flex items-center">
            {linkLabel} <ChevronLeft size={12} />
          </Link>
        )}
      </div>
      <div className="space-y-1.5 flex-1">{children}</div>
    </div>
  );
}
const Empty = ({ children }: { children: ReactNode }) => <p className="text-[11.5px] text-ink-400 py-1">{children}</p>;
const Row = ({ to, icon, children, extra, tone = "border-ink-100" }: { to: string; icon: ReactNode; children: ReactNode; extra?: ReactNode; tone?: string }) => (
  <Link to={to} className={`flex items-center gap-2 text-[12px] text-ink-700 hover:text-brand-700 rounded-lg border px-2.5 py-1.5 ${tone}`}>
    <span className="shrink-0">{icon}</span>
    <span className="flex-1 min-w-0">{children}</span>
    {extra}
  </Link>
);
const Two = ({ a, b }: { a: ReactNode; b?: ReactNode }) => (
  <>
    <span className="block truncate">{a}</span>
    {b && <span className="block truncate text-[10.5px] text-ink-400">{b}</span>}
  </>
);

export default function PersonalHub({ header }: { header: ReactNode }) {
  const { actingUser, hasPermission, role } = useTenancy();
  const pm = useProjectsPM();
  const inbox = useInbox();
  const km = useKnowledge();
  const s = useSocial();
  const { notify } = useToast();
  const navigate = useNavigate();
  const me = actingUser.name;
  const meId = actingUser.id;
  const personal = personalFor(actingUser.id);
  const w = myWork(pm.projects, me);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const ref = dayNum(pm.refDate)!;

  // ---------------------------------------------------------------- شمارنده‌ها
  const pmNotifs = pm.store.notifications.filter((n) => n.recipient === me);
  const unreadNotifs = personal.notifications.filter((n) => !n.read).length + pmNotifs.filter((n) => !n.read).length + inbox.unread;
  const myChats = s.myChats(["direct_message", "group", "channel", "bot"]);
  const unreadChats = myChats.filter((c) => s.unreadCount(c) > 0 && !c.muted_by.includes(meId));
  const unreadMessages = unreadChats.reduce((a, c) => a + s.unreadCount(c), 0);
  const inboxMentions = inbox.mine.filter((i) => i.kind === "mention" || i.kind === "reply");
  const mentionCount = inboxMentions.filter((i) => !inbox.isRead(i)).length + w.mentions.length;
  const kmReview = hasPermission("knowledge.list") ? km.docs.filter((d) => d.status === "در بررسی" && km.isApprover(d)) : [];
  const friendReqs = s.friendships.filter((f) => f.status === "pending" && f.receiver_id === meId);
  const eventInvites = s.eventMembers.filter((m) => m.user_id === meId && m.status === "invited").map((m) => s.events.find((e) => e.id === m.event_id)).filter((e): e is NonNullable<typeof e> => !!e && (dayNum(e.start_date) ?? 0) >= ref);
  const decisions = w.approvals.length + kmReview.length + friendReqs.length + eventInvites.length;
  const overdue = w.open.filter((x) => bucketOf(x.t, pm.refDate) === "overdue").length;

  // جلسات پروژه + رویدادهایی که عضو/دعوت‌شده‌ام
  const agenda = [
    ...pm.projects
      .filter((p) => !p.meta.archived)
      .flatMap((p) => p.meetings.filter((m) => m.status === "برنامه‌ریزی‌شده" && m.participants.includes(me) && (dayNum(m.date) ?? 0) >= ref).map((m) => ({ key: `m-${p.meta.id}-${m.id}`, title: m.title, sub: p.meta.name, date: m.date, time: m.time, to: `/dashboard/projects/${p.meta.id}?tab=minutes&focus=${m.id}`, kind: "meeting" as const }))),
    ...s.events
      .filter((e) => !e.is_draft && (dayNum(e.start_date) ?? 0) >= ref && s.eventMembers.some((m) => m.event_id === e.id && m.user_id === meId && m.status !== "declined"))
      .map((e) => {
        const st = s.eventMembers.find((m) => m.event_id === e.id && m.user_id === meId)?.status;
        return { key: `e-${e.id}`, title: e.title, sub: e.is_online ? "آنلاین" : e.location, date: e.start_date, time: e.start_time, to: `/dashboard/events/${e.id}`, kind: st === "invited" ? ("invite" as const) : ("event" as const) };
      }),
  ].sort((a, b) => (dayNum(a.date) ?? 0) - (dayNum(b.date) ?? 0) || a.time.localeCompare(b.time));

  const myProjects = pm.projects.filter((p) => !p.meta.archived && (p.members.some((m) => m.name === me || m.userId === meId) || p.meta.manager === me));

  // اعلان‌های مهم سازمان: آخرین اخبار و مجله‌ی منتشرشده + اطلاعیه‌های سراسری
  const important = s.content
    .filter((c) => c.is_public && !c.is_draft && (c.kind === "news" || c.kind === "magazines") && s.canView(c))
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    .slice(0, 4);

  // محتوای پیشنهادی: هم‌پوشانی برچسب با مهارت‌های کاربر و برچسب‌هایی که با آن‌ها تعامل داشته
  const interest = new Set<string>([
    ...actingUser.skills.flatMap((k) => k.split(/[\s‌]+/)),
    ...s.reactions.filter((r) => r.user_id === meId).flatMap((r) => [...s.content, ...s.media, ...s.topics].find((x) => x.id === r.entity_id)?.tags ?? []),
  ]);
  const score = (tags: string[], at: string | null) => tags.reduce((a, t) => a + ([...interest].some((k) => k && (t.includes(k) || k.includes(t))) ? 3 : 0), 0) + (at ? (dayNum(dateOf(at)) ?? 0) / 10000 : 0);
  const suggested = [
    ...s.content.filter((c) => c.is_public && !c.is_draft && c.user_id !== meId && s.canView(c)).map((c) => ({ id: c.id, title: c.title, tags: c.tags, at: c.published_at, to: `/dashboard/${c.kind === "news" ? "news" : "magazines"}/${c.id}`, icon: c.kind === "news" ? Newspaper : BookMarked, type: c.kind === "news" ? "خبر" : c.kind === "blogs" ? "بلاگ" : "مجله" })),
    ...s.topics.filter((t) => t.is_public && !t.is_draft && t.user_id !== meId && s.canView(t)).map((t) => ({ id: t.id, title: t.title, tags: t.tags, at: t.published_at, to: `/dashboard/forum/${t.id}`, icon: MessagesSquare, type: "پرسش" })),
    ...s.media.filter((m) => m.is_public && !m.is_draft && m.user_id !== meId && s.canView(m)).map((m) => ({ id: m.id, title: m.caption, tags: m.tags, at: m.published_at, to: `/dashboard/media/${m.id}`, icon: ImageIcon, type: "رسانه" })),
  ]
    .map((x) => ({ ...x, sc: score(x.tags, x.at) }))
    .sort((a, b) => b.sc - a.sc)
    .slice(0, 4);

  // افراد و گروه‌های پیشنهادی
  const myFriends = s.friendIds();
  const people = users
    .filter((u) => u.id !== meId && s.relationWith(u.id).state === "none")
    .map((u) => {
      const mutual = s.friendIds(u.id).filter((x) => myFriends.includes(x)).length;
      const skills = u.skills.filter((k) => actingUser.skills.includes(k)).length;
      return { u, mutual, why: mutual ? `${fa(mutual)} ارتباط مشترک` : u.org === actingUser.org ? "هم‌سازمانی" : skills ? "مهارت مشترک" : u.role, sc: mutual * 3 + (u.org === actingUser.org ? 2 : 0) + skills * 2 };
    })
    .sort((a, b) => b.sc - a.sc)
    .slice(0, 3);
  const groupsToJoin = s.chats.filter((c) => c.chat_type === "group" && !c.parent && !c.is_private && c.is_public && !s.isMember(c)).slice(0, 2);

  // صندوق ورودی یکپارچه
  const feed: FeedItem[] = [
    ...inbox.mine.map((i) => ({ key: `ib-${i.id}`, icon: Inbox, tone: "text-brand-500", text: i.text, meta: i.time, to: i.link, unread: !inbox.isRead(i), seq: 10_000 + i.seq })),
    ...pmNotifs.map((n) => ({ key: `pm-${n.id}`, icon: KanbanSquare, tone: "text-navy-500", text: n.text, meta: `${n.projectName} · ${n.time}`, to: `/dashboard/projects/${n.projectId}?tab=${n.link.tab}${n.link.entityId ? `&focus=${n.link.entityId}` : ""}`, unread: !n.read, seq: n.seq })),
    ...personal.notifications.map((n, i) => ({ key: `ps-${n.id}`, icon: Bell, tone: "text-amber-500", text: n.text, meta: n.time, to: "/dashboard/notifications", unread: !n.read, seq: 500 - i })),
  ]
    .sort((a, b) => Number(b.unread) - Number(a.unread) || b.seq - a.seq)
    .slice(0, 5);

  const tiles = [
    { icon: ListTodo, label: overdue ? `تسک باز · ${fa(overdue)} عقب` : "تسک‌های باز من", value: w.open.length, to: "/dashboard/my-work", tone: overdue ? "text-rose-600" : "text-navy-600" },
    { icon: CalendarClock, label: "جلسه و رویداد پیش‌رو", value: agenda.length, to: "/dashboard/events", tone: "text-sky-600" },
    { icon: Bell, label: "اعلان خوانده‌نشده", value: unreadNotifs, to: "/dashboard/notifications", tone: "text-brand-600" },
    { icon: MessageCircle, label: "پیام خوانده‌نشده", value: unreadMessages, to: "/dashboard/chat", tone: "text-emerald-600" },
    { icon: AtSign, label: "منشن و پاسخ", value: mentionCount, to: "/dashboard/notifications", tone: "text-amber-600" },
    { icon: ShieldCheck, label: "منتظر تصمیم من", value: decisions, to: "/dashboard/my-work", tone: "text-violet-600" },
  ];

  const complete = (pid: string, tid: string) => {
    const p = pm.getProject(pid);
    const done = p?.columns.find((c) => c.kind === "done")?.id;
    if (done) pm.moveTask(pid, tid, done);
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="mb-4 pb-3 border-b border-ink-100">{header}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {tiles.map((t) => (
            <Link key={t.label} to={t.to} className="rounded-lg border border-ink-100 bg-ink-50/50 p-3 hover:border-brand-300 transition-colors">
              <p className="text-[11px] text-ink-400 flex items-center gap-1.5 mb-1 truncate">
                <t.icon size={13} className={`${t.tone} shrink-0`} /> {t.label}
              </p>
              <p className="text-lg font-bold text-ink-900 leading-6">{fa(t.value)}</p>
            </Link>
          ))}
        </div>
        {w.timers.length > 0 && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs p-2.5 flex items-center gap-2 flex-wrap">
            <Timer size={13} /> تایمر شما روشن است:
            {w.timers.map((x) => (
              <Link key={x.t.id} to={`/dashboard/projects/${x.p.meta.id}?tab=board&focus=${x.t.id}`} className="underline">
                {x.t.title}
              </Link>
            ))}
          </div>
        )}
      </div>

      <RolePanel roleId={role.id} roleTitle={role.title} />

      <div className="card p-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* ۱) کارهای من */}
        <Panel title="کارهای من" icon={<ListTodo size={14} className="text-navy-600" />} to="/dashboard/my-work" count={w.open.length + personal.tasks.length}>
          {w.open.slice(0, 5).map((x) => {
            const late = bucketOf(x.t, pm.refDate) === "overdue";
            return (
              <div key={x.t.id} className="flex items-center gap-2 text-[12px] rounded-lg border border-ink-100 px-2.5 py-1.5">
                <button onClick={() => complete(x.p.meta.id, x.t.id)} disabled={!hasPermission("projects.tasks")} aria-label={`انجام شد: ${x.t.title}`} className="shrink-0">
                  <Circle size={15} className="text-ink-300 hover:text-brand-500" />
                </button>
                <Link to={`/dashboard/projects/${x.p.meta.id}?tab=board&focus=${x.t.id}`} className="flex-1 min-w-0">
                  <Two a={<span className="text-ink-800 hover:text-brand-700">{x.t.title}</span>} b={x.p.meta.name} />
                </Link>
                <Badge tone={priorityTone[x.t.priority]}>{x.t.priority}</Badge>
                <span className={`text-[10.5px] shrink-0 ${late ? "text-rose-600 font-medium" : "text-ink-400"}`}>{x.t.due}</span>
              </div>
            );
          })}
          {personal.tasks.map((a) => {
            const done = doneIds.includes(a.id);
            return (
              <div key={a.id} className={`flex items-center gap-2 text-[12px] rounded-lg border px-2.5 py-1.5 ${done ? "border-emerald-200 bg-emerald-50/50" : "border-ink-100"}`}>
                <button onClick={() => setDoneIds((prev) => (prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id]))} aria-label={done ? "بازگردانی به در انتظار" : "علامت‌گذاری به‌عنوان انجام‌شده"} className="shrink-0">
                  {done ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Circle size={15} className="text-ink-300 hover:text-brand-500" />}
                </button>
                <Link to={a.to} className={`flex-1 truncate ${done ? "line-through text-ink-400" : "text-ink-700 hover:text-brand-700"}`}>
                  {a.text}
                </Link>
                {a.late && !done && <Badge tone="danger">تاخیر</Badge>}
              </div>
            );
          })}
          {w.open.length + personal.tasks.length === 0 && <Empty>کاری در انتظار شما نیست. 🎉</Empty>}
        </Panel>

        {/* ۲) جلسات و رویدادهای پیش‌رو */}
        <Panel title="جلسات و رویدادهای پیش‌رو" icon={<CalendarClock size={14} className="text-sky-600" />} to="/dashboard/events" linkLabel="تقویم" count={agenda.length}>
          {agenda.slice(0, 5).map((a) => (
            <Row key={a.key} to={a.to} icon={a.kind === "meeting" ? <Video size={12} className="text-sky-500" /> : <CalendarClock size={12} className={a.kind === "invite" ? "text-amber-500" : "text-sky-500"} />} extra={<span className="text-[10.5px] text-ink-400 shrink-0">{a.date} · {a.time}</span>}>
              <Two a={a.title} b={a.kind === "invite" ? "دعوت — منتظر پاسخ شما" : a.sub} />
            </Row>
          ))}
          {agenda.length === 0 && <Empty>جلسه یا رویدادی در پیش ندارید.</Empty>}
        </Panel>

        {/* ۳) اعلان‌های مهم سازمان */}
        <Panel title="اعلان‌های مهم سازمان" icon={<Megaphone size={14} className="text-rose-600" />} to="/dashboard/news" linkLabel="اخبار">
          {important.map((c) => (
            <Row key={c.id} to={`/dashboard/${c.kind === "news" ? "news" : "magazines"}/${c.id}`} icon={c.kind === "news" ? <Newspaper size={12} className="text-rose-500" /> : <BookMarked size={12} className="text-brand-500" />} extra={<span className="text-[10.5px] text-ink-400 shrink-0">{dateOf(c.published_at)}</span>}>
              <Two a={c.title} b={c.kind === "news" ? "خبر سازمان" : "مجله"} />
            </Row>
          ))}
          {important.length === 0 && <Empty>اعلان تازه‌ای نیست.</Empty>}
        </Panel>

        {/* ۴) پروژه‌های فعال من */}
        <Panel title="پروژه‌های فعال من" icon={<KanbanSquare size={14} className="text-brand-600" />} to="/dashboard/projects" count={myProjects.length}>
          {myProjects.slice(0, 4).map((p) => {
            const mine = p.tasks.filter((t) => t.assignee === me && !t.archived && !isDone(p, t)).length;
            const r = p.members.find((m) => m.name === me || m.userId === meId)?.role ?? (p.meta.manager === me ? "مدیر پروژه" : "");
            return (
              <Row key={p.meta.id} to={`/dashboard/projects/${p.meta.id}`} icon={<span style={{ color: p.meta.color }}><ProjectIcon name={p.meta.icon} size={14} /></span>} extra={<span className="text-[11px] text-ink-600 shrink-0">{fa(projectProgress(p))}٪</span>}>
                <Two a={p.meta.name} b={`${r}${mine ? ` · ${fa(mine)} تسک باز شما` : ""}`} />
              </Row>
            );
          })}
          {myProjects.length === 0 && <Empty>عضو پروژه‌ی فعالی نیستید.</Empty>}
        </Panel>

        {/* ۵) محتوای پیشنهادی */}
        <Panel title="پیشنهاد برای شما" icon={<Sparkles size={14} className="text-amber-500" />} to="/dashboard/topics" linkLabel="موضوعات">
          {suggested.map((x) => (
            <Row key={x.id} to={x.to} icon={<x.icon size={12} className="text-brand-500" />} extra={<Badge tone="neutral">{x.type}</Badge>}>
              <Two a={x.title} b={x.tags.length ? x.tags.slice(0, 3).map((t) => `#${t}`).join(" ") : undefined} />
            </Row>
          ))}
          {suggested.length === 0 && <Empty>فعلاً پیشنهادی نداریم.</Empty>}
        </Panel>

        {/* ۶) افراد و گروه‌های پیشنهادی */}
        <Panel title="همکاری پیشنهادی" icon={<UsersRound size={14} className="text-emerald-600" />} to="/dashboard/members" linkLabel="اعضا">
          {people.map(({ u, why }) => (
            <div key={u.id} className="flex items-center gap-2 text-[12px] rounded-lg border border-ink-100 px-2.5 py-1.5">
              <Avatar name={u.name} color={u.avatarColor} size={24} />
              <Link to={`/dashboard/profile/${u.id}`} className="flex-1 min-w-0">
                <Two a={<span className="text-ink-800">{u.name}</span>} b={why} />
              </Link>
              {hasPermission("relations.use") && (
                <button
                  onClick={() => {
                    const r = s.sendFriendRequest(u.id);
                    notify(r.ok ? `درخواست ارتباط برای «${u.name}» ارسال شد.` : r.error, r.ok ? "success" : "warning");
                  }}
                  className="text-[11px] text-brand-700 border border-brand-200 rounded-md px-2 py-0.5 hover:bg-brand-50 flex items-center gap-0.5"
                >
                  <UserPlus size={11} /> ارتباط
                </button>
              )}
            </div>
          ))}
          {groupsToJoin.map((g) => (
            <div key={g.id} className="flex items-center gap-2 text-[12px] rounded-lg border border-ink-100 px-2.5 py-1.5">
              <span className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-white text-[10px] font-bold" style={{ background: g.profile_photos[0] ?? "#0d9488" }}>
                {g.title.slice(0, 1)}
              </span>
              <Link to={`/dashboard/groups/${g.id}`} className="flex-1 min-w-0">
                <Two a={<span className="text-ink-800">{g.title}</span>} b={`گروه · ${fa(g.members.length)} عضو`} />
              </Link>
              {hasPermission("groups.list") && (
                <button
                  onClick={() => {
                    const r = s.joinChat(g.id);
                    if (r.ok) navigate(`/dashboard/groups/${g.id}`);
                    else notify(r.error, "warning");
                  }}
                  className="text-[11px] text-emerald-700 border border-emerald-200 rounded-md px-2 py-0.5 hover:bg-emerald-50"
                >
                  عضویت
                </button>
              )}
            </div>
          ))}
          {people.length + groupsToJoin.length === 0 && <Empty>پیشنهاد تازه‌ای نیست.</Empty>}
        </Panel>

        {/* صندوق ورودی */}
        <Panel title="تازه‌ترین اعلان‌ها" icon={<Bell size={14} className="text-brand-600" />} to="/dashboard/notifications" count={unreadNotifs}>
          {feed.map((f) => (
            <Link key={f.key} to={f.to} className={`flex items-start gap-2 text-[12px] rounded-lg border px-2.5 py-1.5 hover:border-brand-300 ${f.unread ? "border-brand-100 bg-brand-50/40" : "border-ink-100"}`}>
              <f.icon size={13} className={`${f.tone} shrink-0 mt-0.5`} />
              <span className="flex-1 min-w-0">
                <span className={`block line-clamp-2 leading-5 ${f.unread ? "text-ink-900 font-medium" : "text-ink-600"}`}>{f.text}</span>
                <span className="block text-[10.5px] text-ink-400 truncate">{f.meta}</span>
              </span>
            </Link>
          ))}
          {feed.length === 0 && <Empty>اعلانی ندارید.</Empty>}
        </Panel>

        <Panel title="پیام‌ها و منشن‌ها" icon={<AtSign size={14} className="text-amber-600" />} to="/dashboard/chat" linkLabel="گفتگوها" count={unreadMessages + mentionCount}>
          {unreadChats.slice(0, 3).map((c) => {
            const last = s.lastMessage(c.id);
            const base = c.chat_type === "group" ? "groups" : c.chat_type === "channel" ? "channels" : "chat";
            const title = c.chat_type === "direct_message" ? s.userName(c.members.find((m) => m.user_id !== meId)?.user_id ?? "") : c.title;
            return (
              <Row key={c.id} to={`/dashboard/${base}/${c.parent ?? c.id}`} icon={<MessageCircle size={12} className="text-emerald-500" />} extra={<Badge tone="brand">{fa(s.unreadCount(c))}</Badge>}>
                <Two a={title} b={last ? `${c.chat_type === "direct_message" ? "" : `${s.userName(last.user_id)}: `}${last.content}` : undefined} />
              </Row>
            );
          })}
          {inboxMentions.slice(0, 2).map((i) => (
            <Row key={i.id} to={i.link} icon={<AtSign size={12} className="text-amber-500" />}>
              <Two a={i.text} />
            </Row>
          ))}
          {w.mentions.slice(0, 2).map(({ p, t, c }) => (
            <Row key={c.id + t.id} to={`/dashboard/projects/${p.meta.id}?tab=board&focus=${t.id}`} icon={<AtSign size={12} className="text-amber-500" />}>
              <Two a={`«${c.author}» در تسک «${t.title}»`} b={c.text} />
            </Row>
          ))}
          {unreadMessages + mentionCount === 0 && <Empty>پیام یا منشن تازه‌ای ندارید.</Empty>}
        </Panel>

        <Panel title="منتظر تصمیم من" icon={<ShieldCheck size={14} className="text-violet-600" />} count={decisions}>
          {w.approvals.map((x) => (
            <Row key={x.t.id} to={`/dashboard/projects/${x.p.meta.id}?tab=board&focus=${x.t.id}`} icon={<ShieldCheck size={12} className="text-amber-600" />} tone="border-amber-200 bg-amber-50/40">
              <Two a={`تأیید تسک «${x.t.title}»`} b={`درخواست ${x.t.approval!.requestedBy} · ${x.p.meta.name}`} />
            </Row>
          ))}
          {eventInvites.slice(0, 2).map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-[12px] rounded-lg border border-ink-100 px-2.5 py-1.5">
              <CalendarClock size={12} className="text-sky-500 shrink-0" />
              <Link to={`/dashboard/events/${e.id}`} className="flex-1 min-w-0">
                <Two a={`دعوت: ${e.title}`} b={`${e.start_date} · ${e.start_time}`} />
              </Link>
              <button onClick={() => { const r = s.rsvp(e.id, "accepted"); notify(r.ok ? "حضور شما ثبت شد." : r.error, r.ok ? "success" : "warning"); }} className="text-[11px] text-emerald-700 border border-emerald-200 rounded-md px-1.5 py-0.5">
                می‌آیم
              </button>
              <button onClick={() => s.rsvp(e.id, "declined")} className="text-[11px] text-ink-500 border border-ink-200 rounded-md px-1.5 py-0.5">
                نه
              </button>
            </div>
          ))}
          {friendReqs.slice(0, 2).map((f) => (
            <div key={f.id} className="flex items-center gap-2 text-[12px] rounded-lg border border-ink-100 px-2.5 py-1.5">
              <UserPlus size={12} className="text-sky-500 shrink-0" />
              <span className="flex-1 truncate">درخواست ارتباط از «{s.userName(f.sender_id)}»</span>
              <button onClick={() => s.respondFriend(f.id, true)} className="p-0.5 text-emerald-600" aria-label="پذیرش">
                <Check size={14} />
              </button>
            </div>
          ))}
          {kmReview.slice(0, 2).map((d) => (
            <Row key={d.id} to={`/dashboard/knowledge?tab=workflow&doc=${d.id}`} icon={<BookOpen size={12} className="text-brand-500" />}>
              <Two a={`بررسی سند «${d.title}»`} />
            </Row>
          ))}
          {decisions === 0 && <Empty>چیزی منتظر تصمیم شما نیست.</Empty>}
        </Panel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// کارت نقش — هر نقش میز کار مخصوص خودش را دارد
// ---------------------------------------------------------------------------
function RolePanel({ roleId, roleTitle }: { roleId: string; roleTitle: string }) {
  const s = useSocial();
  const pm = useProjectsPM();
  const { actingUser } = useTenancy();
  const me = actingUser.name;

  if (roleId === "r1") {
    const mods: { m: SocialModule; label: string; to: string }[] = [
      { m: "content", label: "محتوا", to: "/dashboard/magazines" },
      { m: "media", label: "رسانه", to: "/dashboard/media" },
      { m: "forums", label: "پرسش و پاسخ", to: "/dashboard/forum" },
      { m: "events", label: "رویدادها", to: "/dashboard/events" },
      { m: "messaging", label: "پیام‌رسانی", to: "/dashboard/groups" },
      { m: "relations", label: "ارتباطات", to: "/dashboard/members" },
    ];
    const pending = s.comments.filter((c) => !c.approved).length;
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <Gauge size={15} className="text-brand-600" /> میز کار {roleTitle}
          </p>
          <Link to="/dashboard/social-admin" className="text-[11px] text-brand-700 hover:underline flex items-center">
            داشبورد مدیریتی شبکه <ChevronLeft size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {mods.map(({ m, label, to }) => {
            const st = s.dashboard(m, "admin");
            return (
              <Link key={m} to={to} className="rounded-lg border border-ink-100 p-2.5 hover:border-brand-300">
                <p className="text-[11px] font-bold text-ink-600 mb-1">{label}</p>
                {st.slice(0, 2).map((x) => (
                  <p key={x.key} className="text-[11px] text-ink-500 flex justify-between gap-1">
                    <span className="truncate">{x.title}</span>
                    <b className="text-ink-900">{fa(x.value)}</b>
                  </p>
                ))}
              </Link>
            );
          })}
        </div>
        {pending > 0 && (
          <Link to="/dashboard/social-admin" className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            <FileClock size={13} /> {fa(pending)} نظر در صف تأیید است
          </Link>
        )}
      </div>
    );
  }

  if (roleId === "r2") {
    const drafts = [
      ...s.content.filter((c) => c.is_draft).map((c) => ({ id: c.id, title: c.title, type: c.kind === "news" ? "خبر" : c.kind === "blogs" ? "بلاگ" : "مجله", to: `/dashboard/${c.kind === "news" ? "news" : "magazines"}/${c.id}` })),
      ...s.media.filter((m) => m.is_draft).map((m) => ({ id: m.id, title: m.caption, type: "رسانه", to: `/dashboard/media/${m.id}` })),
      ...s.events.filter((e) => e.is_draft).map((e) => ({ id: e.id, title: e.title, type: "رویداد", to: `/dashboard/events/${e.id}` })),
    ];
    const pending = s.comments.filter((c) => !c.approved);
    const st = s.dashboard("content", "admin");
    return (
      <div className="card p-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Panel title={`میز کار ${roleTitle} — پیش‌نویس‌ها`} icon={<FileClock size={14} className="text-amber-600" />} count={drafts.length}>
          {drafts.slice(0, 4).map((d) => (
            <Row key={d.id} to={d.to} icon={<FileClock size={12} className="text-amber-500" />} extra={<Badge tone="warning">{d.type}</Badge>}>
              <Two a={d.title} />
            </Row>
          ))}
          {drafts.length === 0 && <Empty>پیش‌نویسی در صف انتشار نیست.</Empty>}
        </Panel>
        <Panel title="نظرهای منتظر تأیید" icon={<ShieldCheck size={14} className="text-violet-600" />} to="/dashboard/social-admin" count={pending.length}>
          {pending.slice(0, 4).map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-[12px] rounded-lg border border-ink-100 px-2.5 py-1.5">
              <span className="flex-1 min-w-0">
                <Two a={c.content} b={`${s.userName(c.user_id)} · ${entityLabel[c.entity_name]}`} />
              </span>
              <button onClick={() => s.approveComment(c.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" aria-label="تأیید نظر">
                <Check size={14} />
              </button>
            </div>
          ))}
          {pending.length === 0 && <Empty>صف تأیید خالی است.</Empty>}
        </Panel>
        <Panel title="آمار محتوا" icon={<Gauge size={14} className="text-brand-600" />}>
          <div className="grid grid-cols-2 gap-2">
            {st.map((x) => (
              <div key={x.key} className="rounded-lg bg-ink-50 px-2.5 py-2">
                <p className="text-[10.5px] text-ink-400 truncate">{x.title}</p>
                <p className="text-sm font-bold text-ink-900">{fa(x.value)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    );
  }

  if (roleId === "r3") {
    const managed = pm.projects.filter((p) => !p.meta.archived && (p.meta.manager === me || p.members.some((m) => (m.name === me || m.userId === actingUser.id) && (m.role === "مدیر پروژه" || m.role === "مالک"))));
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <KanbanSquare size={15} className="text-brand-600" /> میز کار {roleTitle} — سلامت پروژه‌های تحت مدیریت
          </p>
          <Link to="/dashboard/projects" className="text-[11px] text-brand-700 hover:underline flex items-center">
            همه‌ی پروژه‌ها <ChevronLeft size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {managed.map((p) => {
            const late = p.tasks.filter((t) => !t.archived && isOverdue(p, t, pm.refDate)).length;
            const approvals = p.expenses.filter((e) => e.status === "در انتظار تأیید").length;
            const risks = p.risks.filter((r) => r.status !== "بسته").length;
            const dot = p.meta.health === "سبز" ? "bg-emerald-500" : p.meta.health === "زرد" ? "bg-amber-500" : "bg-rose-500";
            return (
              <Link key={p.meta.id} to={`/dashboard/projects/${p.meta.id}`} className="rounded-lg border border-ink-100 p-3 hover:border-brand-300">
                <p className="text-[12.5px] font-medium text-ink-900 flex items-center gap-1.5 truncate">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} /> {p.meta.name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                    <span className="block h-full bg-brand-500" style={{ width: `${projectProgress(p)}%` }} />
                  </span>
                  <span className="text-[11px] text-ink-600">{fa(projectProgress(p))}٪</span>
                </div>
                <p className="text-[11px] text-ink-500 mt-1.5">
                  <span className={late ? "text-rose-600" : ""}>{fa(late)} تسک عقب</span>، {fa(approvals)} هزینه منتظر تأیید، {fa(risks)} ریسک باز
                </p>
              </Link>
            );
          })}
          {managed.length === 0 && <Empty>پروژه‌ای به مدیریت شما ثبت نشده است.</Empty>}
        </div>
      </div>
    );
  }

  if (roleId === "r5") {
    const mine = s.chats.filter((c) => (c.chat_type === "group" || c.chat_type === "channel") && !c.parent && s.chatRole(c) === "admin");
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <UsersRound size={15} className="text-brand-600" /> میز کار {roleTitle} — گروه‌ها و کانال‌های تحت مدیریت
          </p>
          <Link to="/dashboard/groups" className="text-[11px] text-brand-700 hover:underline flex items-center">
            <Plus size={12} /> گروه جدید
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {mine.map((c) => {
            const topics = s.chats.filter((x) => x.parent === c.id).length;
            const files = s.files.filter((f) => f.owner_type === (c.chat_type === "channel" ? "channel" : "group") && f.owner_id === c.id).length;
            return (
              <Link key={c.id} to={`/dashboard/${c.chat_type === "channel" ? "channels" : "groups"}/${c.id}`} className="rounded-lg border border-ink-100 p-3 hover:border-brand-300 flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-white text-sm font-bold" style={{ background: c.profile_photos[0] ?? "#0d9488" }}>
                  {c.title.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-medium text-ink-900 truncate">{c.title}</span>
                  <span className="block text-[11px] text-ink-500">
                    {c.chat_type === "channel" ? "کانال" : "گروه"} · {fa(c.members.length)} عضو · {fa(topics)} {c.chat_type === "channel" ? "زیرکانال" : "تاپیک"} · {fa(files)} فایل
                  </span>
                </span>
                {s.unreadCount(c) > 0 && <Badge tone="brand">{fa(s.unreadCount(c))}</Badge>}
              </Link>
            );
          })}
          {mine.length === 0 && <Empty>هنوز مدیر گروه یا کانالی نیستید.</Empty>}
        </div>
      </div>
    );
  }
  return null;
}
