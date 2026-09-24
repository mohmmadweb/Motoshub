// ---------------------------------------------------------------------------
// «میز کار من» — داشبورد شخصیِ کاربرِ واردشده.
// هرچه در سامانه به همین کاربر مربوط است یک‌جا: اعلان‌ها (شخصی، پروژه، صندوق
// ورودی)، پیام‌های خوانده‌نشده، جاهایی که منشن شده، تسک‌های او در همه‌ی پروژه‌ها،
// تأییدهای منتظر تصمیم او (پروژه و مدیریت دانش)، جلسات و دعوت‌ها و پروژه‌هایش.
// با تعویض کاربر از «مشاهده به‌عنوان» همه‌چیز از نو محاسبه می‌شود.
// ---------------------------------------------------------------------------
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useInbox } from "../../context/InboxContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { useContent } from "../../context/ContentContext";
import { personalFor } from "../../data/personal";
import { myWork, bucketOf } from "../../pm/myWork";
import { isDone, projectProgress } from "../../pm/selectors";
import { dayNum, fa } from "../../pm/jalali";
import { priorityTone } from "../project/shared";
import { ProjectIcon } from "../project/projectIcons";

type FeedItem = { key: string; icon: typeof Bell; tone: string; text: string; meta: string; to: string; unread: boolean; seq: number };

function Panel({ title, icon, to, linkLabel = "همه", count, children }: { title: string; icon: ReactNode; to?: string; linkLabel?: string; count?: number; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-100 p-3.5 flex flex-col min-w-0">
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

export default function PersonalHub({ header }: { header: ReactNode }) {
  const { actingUser, hasPermission } = useTenancy();
  const pm = useProjectsPM();
  const inbox = useInbox();
  const km = useKnowledge();
  const { events } = useContent();
  const me = actingUser.name;
  const personal = personalFor(actingUser.id);
  const w = myWork(pm.projects, me);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const ref = dayNum(pm.refDate)!;

  // ---------------------------------------------------------------- شمارنده‌ها
  const pmNotifs = pm.store.notifications.filter((n) => n.recipient === me);
  const unreadNotifs = personal.notifications.filter((n) => !n.read).length + pmNotifs.filter((n) => !n.read).length + inbox.unread;
  const dmUnread = inbox.mine.filter((i) => i.kind === "direct_message" && !inbox.isRead(i));
  const unreadMessages = personal.chats.reduce((s, c) => s + c.unread, 0) + dmUnread.length;
  const inboxMentions = inbox.mine.filter((i) => i.kind === "mention" || i.kind === "reply");
  const mentionCount = personal.mentions + inboxMentions.filter((i) => !inbox.isRead(i)).length + w.mentions.length;
  const kmReview = hasPermission("knowledge.list") ? km.docs.filter((d) => d.status === "در بررسی" && km.isApprover(d)) : [];
  const kmDue = hasPermission("knowledge.list") ? km.docs.filter((d) => d.owner === me && d.status !== "آرشیو" && (dayNum(d.reviewDate) ?? 9e9) - ref <= 14) : [];
  const decisions = w.approvals.length + kmReview.length;
  const overdue = w.open.filter((x) => bucketOf(x.t, pm.refDate) === "overdue").length;
  const meetings = pm.projects
    .filter((p) => !p.meta.archived)
    .flatMap((p) => p.meetings.filter((m) => m.status === "برنامه‌ریزی‌شده" && m.participants.includes(me) && (dayNum(m.date) ?? 0) >= ref).map((m) => ({ p, m })))
    .sort((a, b) => (dayNum(a.m.date) ?? 0) - (dayNum(b.m.date) ?? 0));
  const invites = inbox.mine.filter((i) => i.kind === "event_invite");
  const friendReqs = personal.incoming.length + inbox.mine.filter((i) => i.kind === "friend_request" && !inbox.isRead(i)).length;
  const myProjects = pm.projects.filter((p) => !p.meta.archived && (p.members.some((m) => m.name === me || m.userId === actingUser.id) || p.meta.manager === me));

  const tiles = [
    { icon: Bell, label: "اعلان خوانده‌نشده", value: unreadNotifs, to: "/dashboard/notifications", tone: "text-brand-600" },
    { icon: MessageCircle, label: "پیام خوانده‌نشده", value: unreadMessages, to: "/dashboard/chat", tone: "text-emerald-600" },
    { icon: AtSign, label: "منشن و پاسخ", value: mentionCount, to: "/dashboard/notifications", tone: "text-amber-600" },
    { icon: ListTodo, label: overdue ? `تسک باز · ${fa(overdue)} عقب` : "تسک باز من", value: w.open.length, to: "/dashboard/my-work", tone: overdue ? "text-rose-600" : "text-navy-600" },
    { icon: ShieldCheck, label: "منتظر تصمیم من", value: decisions, to: "/dashboard/my-work", tone: "text-violet-600" },
    { icon: CalendarClock, label: "جلسه و دعوت پیش‌رو", value: meetings.length + invites.length, to: "/dashboard/events", tone: "text-sky-600" },
  ];

  // ---------------------------------------------------------------- صندوق ورودی یکپارچه
  const feed: FeedItem[] = [
    ...inbox.mine.map((i) => ({ key: `ib-${i.id}`, icon: Inbox, tone: "text-brand-500", text: i.text, meta: i.time, to: i.link, unread: !inbox.isRead(i), seq: 10_000 + i.seq })),
    ...pmNotifs.map((n) => ({ key: `pm-${n.id}`, icon: KanbanSquare, tone: "text-navy-500", text: n.text, meta: `${n.projectName} · ${n.time}`, to: `/dashboard/projects/${n.projectId}?tab=${n.link.tab}${n.link.entityId ? `&focus=${n.link.entityId}` : ""}`, unread: !n.read, seq: n.seq })),
    ...personal.notifications.map((n, i) => ({ key: `ps-${n.id}`, icon: Bell, tone: "text-amber-500", text: n.text, meta: n.time, to: "/dashboard/notifications", unread: !n.read, seq: 500 - i })),
  ]
    .sort((a, b) => Number(b.unread) - Number(a.unread) || b.seq - a.seq)
    .slice(0, 6);

  const complete = (pid: string, tid: string) => {
    const p = pm.getProject(pid);
    const done = p?.columns.find((c) => c.kind === "done")?.id;
    if (done) pm.moveTask(pid, tid, done);
  };

  return (
    <div className="card p-4 mb-5">
      <div className="mb-4 pb-3 border-b border-ink-100">{header}</div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
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
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs p-2.5 flex items-center gap-2 flex-wrap">
          <Timer size={13} /> تایمر شما روشن است:
          {w.timers.map((x) => (
            <Link key={x.t.id} to={`/dashboard/projects/${x.p.meta.id}?tab=board&focus=${x.t.id}`} className="underline">
              {x.t.title}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Panel title="کارهای من" icon={<ListTodo size={14} className="text-navy-600" />} to="/dashboard/my-work" count={w.open.length + personal.tasks.length}>
          {w.open.slice(0, 5).map((x) => {
            const late = bucketOf(x.t, pm.refDate) === "overdue";
            return (
              <div key={x.t.id} className="flex items-center gap-2 text-[12px] rounded-lg border border-ink-100 px-2.5 py-1.5">
                <button onClick={() => complete(x.p.meta.id, x.t.id)} disabled={!hasPermission("projects.tasks")} aria-label={`انجام شد: ${x.t.title}`} className="shrink-0">
                  <Circle size={15} className="text-ink-300 hover:text-brand-500" />
                </button>
                <Link to={`/dashboard/projects/${x.p.meta.id}?tab=board&focus=${x.t.id}`} className="flex-1 min-w-0">
                  <span className="block truncate text-ink-800 hover:text-brand-700">{x.t.title}</span>
                  <span className="block truncate text-[10.5px] text-ink-400">{x.p.meta.name}</span>
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

        <Panel title="پیام‌ها و منشن‌ها" icon={<AtSign size={14} className="text-amber-600" />} to="/dashboard/chat" linkLabel="گفتگو" count={unreadMessages + mentionCount}>
          {personal.chats
            .filter((c) => c.unread > 0)
            .map((c) => (
              <Link key={c.id} to="/dashboard/chat" className="flex items-center gap-2 text-[12px] text-ink-700 hover:text-brand-700 rounded-lg border border-ink-100 px-2.5 py-1.5">
                <MessageCircle size={12} className="text-emerald-500 shrink-0" />
                <span className="flex-1 truncate">
                  <b className="font-medium">{c.with}:</b> {c.lastMessage}
                </span>
                <Badge tone="brand">{fa(c.unread)}</Badge>
              </Link>
            ))}
          {dmUnread.slice(0, 2).map((i) => (
            <Link key={i.id} to={i.link} className="flex items-center gap-2 text-[12px] text-ink-700 hover:text-brand-700 rounded-lg border border-ink-100 px-2.5 py-1.5">
              <MessageCircle size={12} className="text-emerald-500 shrink-0" />
              <span className="flex-1 truncate">{i.text}</span>
            </Link>
          ))}
          {inboxMentions.slice(0, 2).map((i) => (
            <Link key={i.id} to={i.link} className="flex items-center gap-2 text-[12px] text-ink-700 hover:text-brand-700 rounded-lg border border-ink-100 px-2.5 py-1.5">
              <AtSign size={12} className="text-amber-500 shrink-0" />
              <span className="flex-1 truncate">{i.text}</span>
            </Link>
          ))}
          {w.mentions.slice(0, 3).map(({ p, t, c }) => (
            <Link key={c.id + t.id} to={`/dashboard/projects/${p.meta.id}?tab=board&focus=${t.id}`} className="flex items-center gap-2 text-[12px] text-ink-700 hover:text-brand-700 rounded-lg border border-ink-100 px-2.5 py-1.5">
              <AtSign size={12} className="text-amber-500 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block truncate">
                  «{c.author}» در تسک «{t.title}»
                </span>
                <span className="block truncate text-[10.5px] text-ink-400">{c.text}</span>
              </span>
            </Link>
          ))}
          {personal.mentions > 0 && (
            <Link to="/dashboard/chat" className="block text-[11px] text-ink-500 hover:text-brand-700 px-1">
              {fa(personal.mentions)} منشن در کانال‌های گفتگو
            </Link>
          )}
          {unreadMessages + mentionCount === 0 && <Empty>پیام یا منشن تازه‌ای ندارید.</Empty>}
        </Panel>

        <Panel title="منتظر تصمیم من" icon={<ShieldCheck size={14} className="text-violet-600" />} to="/dashboard/my-work" count={decisions + kmDue.length}>
          {w.approvals.map((x) => (
            <Link key={x.t.id} to={`/dashboard/projects/${x.p.meta.id}?tab=board&focus=${x.t.id}`} className="flex items-center gap-2 text-[12px] text-ink-700 hover:text-brand-700 rounded-lg border border-amber-200 bg-amber-50/40 px-2.5 py-1.5">
              <ShieldCheck size={12} className="text-amber-600 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block truncate">تأیید تسک «{x.t.title}»</span>
                <span className="block truncate text-[10.5px] text-ink-400">
                  درخواست {x.t.approval!.requestedBy} · {x.p.meta.name}
                </span>
              </span>
            </Link>
          ))}
          {kmReview.map((d) => (
            <Link key={d.id} to={`/dashboard/knowledge?tab=workflow&doc=${d.id}`} className="flex items-center gap-2 text-[12px] text-ink-700 hover:text-brand-700 rounded-lg border border-ink-100 px-2.5 py-1.5">
              <BookOpen size={12} className="text-brand-500 shrink-0" />
              <span className="flex-1 truncate">بررسی سند «{d.title}»</span>
            </Link>
          ))}
          {kmDue.slice(0, 2).map((d) => (
            <Link key={d.id} to={`/dashboard/knowledge?tab=review&doc=${d.id}`} className="flex items-center gap-2 text-[12px] text-ink-700 hover:text-brand-700 rounded-lg border border-ink-100 px-2.5 py-1.5">
              <BookOpen size={12} className="text-ink-400 shrink-0" />
              <span className="flex-1 truncate">بازنگری سند «{d.title}»</span>
              <span className="text-[10.5px] text-ink-400 shrink-0">{d.reviewDate}</span>
            </Link>
          ))}
          {friendReqs > 0 && (
            <Link to="/dashboard/friends" className="flex items-center gap-2 text-[12px] text-ink-700 hover:text-brand-700 rounded-lg border border-ink-100 px-2.5 py-1.5">
              <UserPlus size={12} className="text-sky-500 shrink-0" />
              <span className="flex-1 truncate">{fa(friendReqs)} درخواست دوستی منتظر پاسخ</span>
            </Link>
          )}
          {decisions + kmDue.length + friendReqs === 0 && <Empty>چیزی منتظر تصمیم شما نیست.</Empty>}
        </Panel>

        <Panel title="جلسات و دعوت‌های پیش‌رو" icon={<CalendarClock size={14} className="text-sky-600" />} to="/dashboard/events" linkLabel="رویدادها" count={meetings.length + invites.length}>
          {meetings.slice(0, 3).map(({ p, m }) => (
            <Link key={p.meta.id + m.id} to={`/dashboard/projects/${p.meta.id}?tab=minutes&focus=${m.id}`} className="flex items-center gap-2 text-[12px] text-ink-700 hover:text-brand-700 rounded-lg border border-ink-100 px-2.5 py-1.5">
              <Video size={12} className="text-sky-500 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block truncate">{m.title}</span>
                <span className="block truncate text-[10.5px] text-ink-400">{p.meta.name}</span>
              </span>
              <span className="text-[10.5px] text-ink-400 shrink-0">
                {m.date} · {m.time}
              </span>
            </Link>
          ))}
          {invites.slice(0, 2).map((i) => (
            <Link key={i.id} to={i.link} className="flex items-center gap-2 text-[12px] text-ink-700 hover:text-brand-700 rounded-lg border border-ink-100 px-2.5 py-1.5">
              <CalendarClock size={12} className="text-sky-500 shrink-0" />
              <span className="flex-1 truncate">{i.text}</span>
            </Link>
          ))}
          {meetings.length + invites.length === 0 && events[0] && (
            <Link to="/dashboard/events" className="flex items-center gap-2 text-[12px] text-ink-700 hover:text-brand-700 rounded-lg border border-ink-100 px-2.5 py-1.5">
              <CalendarClock size={12} className="text-sky-500 shrink-0" />
              <span className="flex-1 truncate">رویداد سازمان: {events[0].title}</span>
              <span className="text-[10.5px] text-ink-400 shrink-0">{events[0].jalaliDate}</span>
            </Link>
          )}
        </Panel>

        <Panel title="پروژه‌های من" icon={<KanbanSquare size={14} className="text-brand-600" />} to="/dashboard/projects" count={myProjects.length}>
          {myProjects.slice(0, 4).map((p) => {
            const mine = p.tasks.filter((t) => t.assignee === me && !t.archived && !isDone(p, t)).length;
            const role = p.members.find((m) => m.name === me || m.userId === actingUser.id)?.role ?? (p.meta.manager === me ? "مدیر پروژه" : "");
            return (
              <Link key={p.meta.id} to={`/dashboard/projects/${p.meta.id}`} className="flex items-center gap-2 text-[12px] rounded-lg border border-ink-100 px-2.5 py-1.5 hover:border-brand-300">
                <span style={{ color: p.meta.color }} className="shrink-0">
                  <ProjectIcon name={p.meta.icon} size={14} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-ink-800">{p.meta.name}</span>
                  <span className="block text-[10.5px] text-ink-400 truncate">
                    {role}
                    {mine ? ` · ${fa(mine)} تسک باز شما` : ""}
                  </span>
                </span>
                <span className="text-[11px] text-ink-600 shrink-0">{fa(projectProgress(p))}٪</span>
              </Link>
            );
          })}
          {myProjects.length === 0 && <Empty>عضو پروژه‌ای نیستید.</Empty>}
        </Panel>
      </div>
    </div>
  );
}
