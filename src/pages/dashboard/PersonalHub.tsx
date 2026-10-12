// ---------------------------------------------------------------------------
// «میز کار من» — داشبورد شخصی. هر کارت خلاصه‌ی یک صفحه‌ی منوست: عنوان کارت = برچسب همان
// صفحه در منو، «مشاهده همه» به همان صفحه و هر ردیف به خودِ آیتم لینک دارد.
// کارت‌ها: کاشی‌های خلاصه، مدیریت سامانه (فقط راهبران)، گزارش‌های سنجاق‌شده، فعالیت و وظایف من،
// رویدادها و جلسات، اخبار سازمان، پروژه‌های من، گفتگوها، پرسش و پاسخ (موضوعات دنبال‌شده)، اوقات شرعی.
// ---------------------------------------------------------------------------
import { PinnedCard, usePinnedReports } from "../../reports/PinnedReports";
import { occurrenceDates } from "../../pm/recurrence";
import { ReportBuilderModal } from "../../reports/ModuleReportsButton";
import { resolveRange } from "../../reports/engine";
import type { GlobalFilter, ReportSpec } from "../../reports/types";
import { useMemo, useState, type DragEvent, type ReactNode } from "react";
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
  Timer,
  Video,
  Megaphone,
  Gauge,
  Newspaper,
  GripVertical,
  ArrowUp,
  ArrowDown,
  EyeOff,
  Eye,
  LayoutGrid,
  RotateCcw,
  Filter as FilterIcon,
  BellRing,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useInbox } from "../../context/InboxContext";
import { useKnowledge } from "../../context/KnowledgeContext";
import { useSocial } from "../../context/SocialContext";
import { personalFor } from "../../data/personal";
import { users } from "../../data/mock";
import { myWork, bucketOf } from "../../pm/myWork";
import { isDone, projectProgress } from "../../pm/selectors";
import { dayNum, fa, addDays as addDaysJ } from "../../pm/jalali";
import { priorityTone } from "../project/shared";
import { ProjectIcon } from "../project/projectIcons";
import { dateOf } from "../social/kit";
import Button from "../../components/ui/Button";
import { EMPTY_FILTER, mergeOrder, spanClass, useUserLayout, type Span } from "./layout";
import { GlobalFilterBar } from "./GlobalFilterBar";
import { usePendingAccessRequests } from "../../iam/hooks";
import { useWriteGuard, WriteBlockNotice } from "../../iam/useWriteGuard";
import { FollowedTopicRows, useFollowedTopics } from "./FollowCards";
import PrayerTimesWidget, { usePrayerTimes } from "../../components/PrayerTimes";

function Panel({ title, icon, to, linkLabel = "مشاهده همه", count, children, className = "", filtered }: { title: string; icon: ReactNode; to?: string; linkLabel?: string; count?: number; children: ReactNode; className?: string; filtered?: boolean }) {
  return (
    <div className={`card p-3.5 h-full flex flex-col min-w-0 ${className}`}>
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-bold text-ink-800 flex items-center gap-1.5">
          {icon} {title}
          {count !== undefined && count > 0 && <span className="text-[10px] font-medium bg-ink-100 text-ink-600 rounded-full px-1.5">{fa(count)}</span>}
          {filtered && <FilterIcon size={11} className="text-brand-500" aria-label="فیلتر سراسری اعمال شده" />}
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

type Widget = { id: string; title: string; span: Span; node: ReactNode };

export default function PersonalHub({ header }: { header: ReactNode }) {
  const { actingUser, hasPermission, filterScoped, visibleUserIds } = useTenancy();
  const tn = useTenancy();
  const pm = useProjectsPM();
  const inbox = useInbox();
  const km = useKnowledge();
  const s = useSocial();
  const me = actingUser.name;
  const meId = actingUser.id;
  const personal = personalFor(actingUser.id);
  const w = myWork(pm.projects, me);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const ref = dayNum(pm.refDate)!;
  // موضوعات دنبال‌شده (F06)، مسدودی حساب (F12) و ابزارک اوقات شرعی
  const followedTopics = useFollowedTopics();
  const topicUnread = followedTopics.reduce((a, r) => a + r.unread, 0);
  const prayer = usePrayerTimes();
  const guard = useWriteGuard();

  // ---------------------------------------------------------------- چیدمان و فیلتر سراسری (برای هر کاربر)
  const { layout, update } = useUserLayout(meId);
  const filter: GlobalFilter = layout?.filter ?? EMPTY_FILTER;
  const setFilter = (f: GlobalFilter) => update((cur) => ({ ...cur, filter: f }));
  const [edit, setEdit] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [openReport, setOpenReport] = useState<ReportSpec | null>(null);
  const pinnedReports = usePinnedReports();
  const range = useMemo(() => resolveRange(filter.range, pm.refDate), [filter.range, pm.refDate]);
  const inRange = (d: string) => {
    if (range.from === undefined && range.to === undefined) return true;
    const n = dayNum(d);
    return n !== null && (range.from === undefined || n >= range.from) && (range.to === undefined || n <= range.to);
  };
  const byProject = (name: string) => !filter.project || name === filter.project;
  const filterOn = filter.range.preset !== "all" || !!filter.project || !!filter.person;
  const projectNames = filterScoped(pm.projects.map((p) => ({ ...p.meta, _p: p })))
    .filter((x) => !x.archived)
    .map((x) => x.name);
  const visIds = new Set(visibleUserIds());
  const peopleNames = users.filter((u) => visIds.has(u.id) || u.id === meId).map((u) => u.name);
  // کارهای فرد انتخاب‌شده در فیلتر (پیش‌فرض: خودم)
  const wTasks = filter.person && filter.person !== me ? myWork(pm.projects, filter.person) : w;
  const taskList = wTasks.open.filter((x) => byProject(x.p.meta.name) && inRange(x.t.due));

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
  const accessReqs = usePendingAccessRequests();
  const decisions = w.approvals.length + kmReview.length + friendReqs.length + eventInvites.length + accessReqs.count;
  const overdue = w.open.filter((x) => bucketOf(x.t, pm.refDate) === "overdue").length;

  // جلسات پروژه + رویدادهایی که عضو/دعوت‌شده‌ام
  const agenda = [
    ...pm.projects
      .filter((p) => !p.meta.archived)
      .flatMap((p) =>
        p.meetings
          .filter((m) => m.status === "برنامه‌ریزی‌شده" && m.participants.includes(me))
          // جلسات تکرارشونده: هر وقوع در ۶۰ روز آینده یک ردیف
          .flatMap((m) => occurrenceDates(m.recurrence, m.date, ref, ref + 60).map((date) => ({ m, date })))
          .map(({ m, date }) => ({ key: `m-${p.meta.id}-${m.id}-${date}`, title: m.title, sub: p.meta.name, date, time: m.time, to: `/dashboard/projects/${p.meta.id}?tab=minutes&focus=${m.id}`, kind: "meeting" as const })),
      ),
    ...s.events
      .filter((e) => !e.is_draft && (dayNum(e.start_date) ?? 0) >= ref && s.eventMembers.some((m) => m.event_id === e.id && m.user_id === meId && m.status !== "declined"))
      .map((e) => {
        const st = s.eventMembers.find((m) => m.event_id === e.id && m.user_id === meId)?.status;
        return { key: `e-${e.id}`, title: e.title, sub: e.is_online ? "آنلاین" : e.location, date: e.start_date, time: e.start_time, to: `/dashboard/events/${e.id}`, kind: st === "invited" ? ("invite" as const) : ("event" as const) };
      }),
  ].sort((a, b) => (dayNum(a.date) ?? 0) - (dayNum(b.date) ?? 0) || a.time.localeCompare(b.time));
  const agendaShown = agenda.filter((a) => inRange(a.date) && (!filter.project || (a.kind === "meeting" && a.sub === filter.project)));

  const myProjects = pm.projects.filter((p) => !p.meta.archived && (p.members.some((m) => m.name === me || m.userId === meId) || p.meta.manager === me));
  const projectsWho = filter.person && filter.person !== me ? pm.projects.filter((p) => !p.meta.archived && (p.members.some((m) => m.name === filter.person) || p.meta.manager === filter.person)) : myProjects;
  const projectsShown = projectsWho.filter((p) => byProject(p.meta.name));

  // «اخبار سازمان»: آخرین خبرهای منتشرشده؛ اطلاعیه‌های رسمیِ سنجاق‌شده اول می‌آیند
  const pinned = s.pinnedAnnouncements();
  const important = [
    ...pinned,
    ...s.content
      .filter((c) => c.is_public && !c.is_draft && c.kind === "news" && s.canView(c) && !pinned.includes(c))
      .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? "")),
  ].slice(0, Math.max(4, pinned.length));
  const needsAck = (c: (typeof important)[number]) => !!c.announcement?.requires_ack && !c.announcement.acks[meId] && c.user_id !== meId;

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

  // ---------------------------------------------------------------- ویجت‌ها
  const isSysAdmin = canSeeAdminPanel(tn);
  const widgetList: Widget[] = [
    {
      id: "summary",
      title: "خلاصه‌ی امروز",
      span: 4,
      node: (
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
        {guard.block && <WriteBlockNotice block={guard.block} className="mt-3" />}
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
      ),
    },
    ...(isSysAdmin ? [{ id: "role", title: "مدیریت سامانه", span: 4 as Span, node: <AdminPanel /> }] : []),
    ...pinnedReports.map((r) => ({ id: `report:${r.id}`, title: `گزارش: ${r.name}`, span: 2 as Span, node: <PinnedCard spec={r} filter={filter} onOpen={() => setOpenReport(r)} /> })),
    {
      id: "tasks",
      title: "فعالیت و وظایف من",
      span: 2,
      node: (
        <Panel title="فعالیت و وظایف من" icon={<ListTodo size={14} className="text-navy-600" />} to="/dashboard/my-work" count={taskList.length + (wTasks === w && !filterOn ? personal.tasks.length : 0)} filtered={filterOn}>
          {taskList.slice(0, 5).map((x) => {
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
          {(wTasks === w && !filterOn ? personal.tasks : []).map((a) => {
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
          {taskList.length + (wTasks === w && !filterOn ? personal.tasks.length : 0) === 0 && <Empty>{filterOn ? "با این فیلتر کاری پیدا نشد." : "کاری در انتظار شما نیست. 🎉"}</Empty>}
        </Panel>
      ),
    },
    {
      id: "agenda",
      title: "رویدادها و جلسات",
      span: 2,
      node: (
        <Panel title="رویدادها و جلسات" icon={<CalendarClock size={14} className="text-sky-600" />} to="/dashboard/events" count={agendaShown.length} filtered={filterOn}>
          {agendaShown.slice(0, 5).map((a) => (
            <Row key={a.key} to={a.to} icon={a.kind === "meeting" ? <Video size={12} className="text-sky-500" /> : <CalendarClock size={12} className={a.kind === "invite" ? "text-amber-500" : "text-sky-500"} />} extra={<span className="text-[10.5px] text-ink-400 shrink-0">{a.date} · {a.time}</span>}>
              <Two a={a.title} b={a.kind === "invite" ? "دعوت — منتظر پاسخ شما" : a.sub} />
            </Row>
          ))}
          {agendaShown.length === 0 && <Empty>{filterOn ? "با این فیلتر جلسه‌ای پیدا نشد." : "جلسه یا رویدادی در پیش ندارید."}</Empty>}
        </Panel>
      ),
    },
    {
      id: "announce",
      title: "اخبار سازمان",
      span: 1,
      node: (
        <Panel title="اخبار سازمان" icon={<Newspaper size={14} className="text-rose-600" />} to="/dashboard/news">
          {important.map((c) => (
            <Row key={c.id} to={`/dashboard/news/${c.id}`} icon={c.announcement ? <Megaphone size={12} className="text-rose-500" /> : <Newspaper size={12} className="text-rose-500" />} extra={<span className="text-[10.5px] text-ink-400 shrink-0">{dateOf(c.published_at)}</span>}>
              <Two a={c.title} b={c.announcement ? (needsAck(c) ? "اطلاعیه‌ی رسمی · منتظر تأیید شما" : "اطلاعیه‌ی رسمی") : undefined} />
            </Row>
          ))}
          {important.length === 0 && <Empty>خبر تازه‌ای نیست.</Empty>}
        </Panel>
      ),
    },
    {
      id: "projects",
      title: "پروژه‌های من",
      span: 1,
      node: (
        <Panel title="پروژه‌های من" icon={<KanbanSquare size={14} className="text-brand-600" />} to="/dashboard/projects" count={projectsShown.length} filtered={filterOn}>
          {projectsShown.slice(0, 4).map((p) => {
            const mine = p.tasks.filter((t) => t.assignee === me && !t.archived && !isDone(p, t)).length;
            const r = p.members.find((m) => m.name === me || m.userId === meId)?.role ?? (p.meta.manager === me ? "مدیر پروژه" : "");
            return (
              <Row key={p.meta.id} to={`/dashboard/projects/${p.meta.id}`} icon={<span style={{ color: p.meta.color }}><ProjectIcon name={p.meta.icon} size={14} /></span>} extra={<span className="text-[11px] text-ink-600 shrink-0">{fa(projectProgress(p))}٪</span>}>
                <Two a={p.meta.name} b={`${r}${mine ? ` · ${fa(mine)} تسک باز شما` : ""}`} />
              </Row>
            );
          })}
          {projectsShown.length === 0 && <Empty>{filterOn ? "با این فیلتر پروژه‌ای پیدا نشد." : "عضو پروژه‌ی فعالی نیستید."}</Empty>}
        </Panel>
      ),
    },
    {
      id: "messages",
      title: "گفتگوها",
      span: 2,
      node: (
        <Panel title="گفتگوها" icon={<MessageCircle size={14} className="text-emerald-600" />} to="/dashboard/chat" count={unreadMessages}>
          {unreadChats.slice(0, 5).map((c) => {
            const last = s.lastMessage(c.id);
            const base = c.chat_type === "group" ? "groups" : c.chat_type === "channel" ? "channels" : "chat";
            const title = c.chat_type === "direct_message" ? s.userName(c.members.find((m) => m.user_id !== meId)?.user_id ?? "") : c.title;
            return (
              <Row key={c.id} to={`/dashboard/${base}/${c.parent ?? c.id}`} icon={<MessageCircle size={12} className="text-emerald-500" />} extra={<Badge tone="brand">{fa(s.unreadCount(c))}</Badge>}>
                <Two a={title} b={last ? `${c.chat_type === "direct_message" ? "" : `${s.userName(last.user_id)}: `}${last.content}` : undefined} />
              </Row>
            );
          })}
          {unreadChats.length === 0 && <Empty>پیام خوانده‌نشده‌ای ندارید.</Empty>}
        </Panel>
      ),
    },
    ...(hasPermission("forum.list")
      ? [
          {
            id: "topics",
            title: "پرسش و پاسخ",
            span: 1 as Span,
            node: (
              <Panel title="پرسش و پاسخ" icon={<BellRing size={14} className="text-brand-600" />} to="/dashboard/forum?scope=followed" count={topicUnread}>
                <FollowedTopicRows rows={followedTopics} />
                {followedTopics.length === 0 && <Empty>موضوعی را دنبال نمی‌کنید؛ در صفحه‌ی هر پرسش «دنبال کردن» را بزنید.</Empty>}
              </Panel>
            ),
          },
        ]
      : []),
    ...(prayer.enabled ? [{ id: "prayer", title: "اوقات شرعی", span: 1 as Span, node: <PrayerTimesWidget className="h-full" /> }] : []),
  ];
  const DEFAULT_ORDER = ["summary", "role", ...pinnedReports.map((r) => `report:${r.id}`), "tasks", "agenda", "announce", "projects", "messages", "topics", "prayer"];
  const byId = new Map(widgetList.map((x) => [x.id, x]));
  const order = mergeOrder(layout?.order, widgetList.map((x) => x.id), DEFAULT_ORDER);
  const hidden = new Set(layout?.hidden ?? []);
  const spanOf = (x: Widget): Span => layout?.spans[x.id] ?? x.span;
  const setOrder = (next: string[]) => update((cur) => ({ ...cur, order: next }));
  const visibleOrder = order.filter((id) => !hidden.has(id));
  const move = (id: string, dir: -1 | 1) => {
    const i = visibleOrder.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= visibleOrder.length) return;
    const next = [...order];
    const a = next.indexOf(visibleOrder[i]);
    const b = next.indexOf(visibleOrder[j]);
    [next[a], next[b]] = [next[b], next[a]];
    setOrder(next);
  };
  const dropOn = (target: string) => {
    if (!dragId || dragId === target) return;
    const next = order.filter((x) => x !== dragId);
    next.splice(next.indexOf(target), 0, dragId);
    setOrder(next);
    setDragId(null);
  };
  const hiddenWidgets = order.filter((id) => hidden.has(id)).map((id) => byId.get(id)).filter((x): x is Widget => !!x);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <GlobalFilterBar value={filter} onChange={setFilter} projects={projectNames} people={peopleNames} />
        <div className="flex items-center gap-1.5 mr-auto">
          {edit && (
            <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={() => update((cur) => ({ order: [], spans: {}, hidden: [], filter: cur.filter }))}>
              بازنشانی
            </Button>
          )}
          <Button size="sm" variant={edit ? "primary" : "secondary"} icon={<LayoutGrid size={13} />} onClick={() => setEdit((v) => !v)}>
            {edit ? "پایان چیدمان" : "چیدمان"}
          </Button>
        </div>
      </div>

      {edit && (
        <div className="card p-3 text-[11.5px] text-ink-600 flex items-center gap-2 flex-wrap">
          <span className="text-ink-500">با کشیدن یا دکمه‌های بالا/پایین جابه‌جا کنید؛ پهنای هر کارت ۱ تا ۴ ستون است.</span>
          {hiddenWidgets.length > 0 && <span className="text-ink-400">پنهان‌ها:</span>}
          {hiddenWidgets.map((x) => (
            <button key={x.id} type="button" onClick={() => update((cur) => ({ ...cur, hidden: cur.hidden.filter((h) => h !== x.id) }))} className="inline-flex items-center gap-1 rounded-full border border-ink-200 px-2 py-0.5 hover:bg-ink-50 max-w-[200px]">
              <Eye size={11} className="shrink-0" /> <span className="truncate">{x.title}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
        {visibleOrder.map((id, idx) => {
          const x = byId.get(id);
          if (!x) return null;
          const sp = spanOf(x);
          return (
            <div
              key={id}
              className={`${spanClass[sp]} min-w-0 flex flex-col ${edit ? "rounded-xl outline-2 outline-dashed outline-brand-300 outline-offset-2" : ""} ${dragId === id ? "opacity-50" : ""}`}
              draggable={edit}
              onDragStart={(e: DragEvent) => {
                setDragId(id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e: DragEvent) => {
                if (edit && dragId) e.preventDefault();
              }}
              onDrop={(e: DragEvent) => {
                e.preventDefault();
                dropOn(id);
              }}
            >
              {edit && (
                <div className="flex items-center gap-1 mb-1.5 rounded-lg bg-brand-50 border border-brand-200 px-1.5 py-1 text-[11px] text-brand-900">
                  <GripVertical size={13} className="cursor-move text-brand-500 shrink-0" />
                  <span className="truncate flex-1 font-medium">{x.title}</span>
                  <span className="hidden md:flex items-center gap-0.5" role="group" aria-label="پهنا">
                    {([1, 2, 3, 4] as Span[]).map((n) => (
                      <button key={n} type="button" onClick={() => update((cur) => ({ ...cur, spans: { ...cur.spans, [id]: n } }))} aria-label={`پهنای ${n} ستون`} className={`w-5 h-5 rounded text-[10px] ${sp === n ? "bg-brand-600 text-white" : "hover:bg-brand-100"}`}>
                        {fa(n)}
                      </button>
                    ))}
                  </span>
                  <button type="button" onClick={() => move(id, -1)} disabled={idx === 0} aria-label="انتقال به قبل" className="w-6 h-6 rounded hover:bg-brand-100 flex items-center justify-center disabled:opacity-30">
                    <ArrowUp size={12} />
                  </button>
                  <button type="button" onClick={() => move(id, 1)} disabled={idx === visibleOrder.length - 1} aria-label="انتقال به بعد" className="w-6 h-6 rounded hover:bg-brand-100 flex items-center justify-center disabled:opacity-30">
                    <ArrowDown size={12} />
                  </button>
                  <button type="button" onClick={() => update((cur) => ({ ...cur, hidden: [...new Set([...cur.hidden, id])] }))} aria-label="پنهان کردن" className="w-6 h-6 rounded hover:bg-brand-100 flex items-center justify-center">
                    <EyeOff size={12} />
                  </button>
                </div>
              )}
              <div className={`flex-1 min-w-0 ${edit ? "pointer-events-none select-none" : ""}`}>{x.node}</div>
            </div>
          );
        })}
      </div>
      {openReport && <ReportBuilderModal open onClose={() => setOpenReport(null)} module={openReport.module} initialReportId={openReport.id} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// «مدیریت سامانه» — خلاصه‌ی ساختار و دسترسی‌های واحد فعلی، فقط برای راهبران
// (از روی مجوزها، نه نام نقش — تا با نقش‌های سفارشی هم کار کند)
// ---------------------------------------------------------------------------
function canSeeAdminPanel(t: { hasPermission: (p: string) => boolean }) {
  return t.hasPermission("settings.system") || t.hasPermission("iam.members.manage") || t.hasPermission("roles.assign");
}

function AdminPanel() {
  const t = useTenancy();
  const node = t.contextNode;
  const sub = t.iam.scopes.filter((x) => x.active && t.scopePath(x.id).startsWith(t.scopePath(node.id)));
  const subIds = new Set(sub.map((x) => x.id));
  const members = t.iam.memberships.filter((m) => subIds.has(m.scopeId));
  const live = t.iam.bindings.filter((b) => b.active && subIds.has(b.scopeId));
  const expiring = live.filter((b) => b.validUntil && b.validUntil >= t.today && b.validUntil <= addDaysJ(t.today, 45));
  const suspended = members.filter((m) => m.status === "suspended");
  const roles = t.iam.roles.filter((r) => subIds.has(r.createdIn));
  const audits = t.iam.audits.filter((a) => subIds.has(a.scopeId)).slice(0, 4);
  const tiles = [
    { label: "زیرمجموعه‌ها", value: sub.length - 1, to: "/dashboard/settings?section=structure" },
    { label: "عضویت‌ها", value: members.length, to: "/dashboard/settings?section=members" },
    { label: "نقش‌های تعریف‌شده", value: roles.length, to: "/dashboard/settings?section=roles" },
    { label: "تخصیص‌های فعال", value: live.length, to: "/dashboard/settings?section=bindings" },
    { label: "دسترسی رو به انقضا", value: expiring.length, to: "/dashboard/settings?section=review" },
    { label: "عضویت معلق", value: suspended.length, to: "/dashboard/settings?section=members" },
  ];
  return (
    <Panel title="مدیریت سامانه" icon={<Gauge size={14} className="text-brand-600" />} to="/dashboard/settings">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {tiles.map((x) => (
          <Link key={x.label} to={x.to} className="rounded-lg border border-ink-100 p-2.5 hover:border-brand-300">
            <p className="text-[11px] text-ink-500">{x.label}</p>
            <p className="text-lg font-bold text-ink-900">{fa(x.value)}</p>
          </Link>
        ))}
      </div>
      {audits.map((a) => (
        <Link key={a.id} to="/dashboard/settings?section=audit-log" className="block text-[11.5px] text-ink-600 hover:text-brand-700 truncate">
          <span className="text-ink-400">{a.at} · </span>
          {a.summary}
        </Link>
      ))}
    </Panel>
  );
}
