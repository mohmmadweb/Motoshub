// ---------------------------------------------------------------------------
// «میزکار من» (v6.8 `#home`) — قهرمان «امروز» + کارت‌هایی که هر کدام خلاصه‌ی یک صفحه‌ی منوست:
// عنوان کارت = برچسب دقیق همان صفحه در منو، «مشاهده همه» به همان صفحه و هر ردیف به خود آیتم.
// داده از هوک‌های میزکار ماژول‌ها (قرارداد C4): pm/desk، MeetingsContext.useMeetingsDesk،
// social/desk، office/desk. بدون کارت پیشنهادی، هشدار مدیریتی یا اسلایدشو؛ تنها مناسبت = «تولد همکاران».
// چیدمان (ترتیب/پهنا/پنهان) و فیلتر سراسری هر کاربر حفظ شده است.
// ---------------------------------------------------------------------------
import { useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  BriefcaseBusiness,
  Cake,
  CalendarDays,
  ChevronLeft,
  CircleHelp,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  GripVertical,
  Inbox,
  KanbanSquare,
  LayoutGrid,
  MapPin,
  MessagesSquare,
  Newspaper,
  Plus,
  RotateCcw,
  Timer,
  UserPlus,
} from "lucide-react";
import HeroToday from "../../components/ui/HeroToday";
import Card from "../../components/ui/Card";
import ListRow, { ListRowTime } from "../../components/ui/ListRow";
import FilterBar from "../../components/ui/FilterBar";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import StatCard from "../../components/ui/StatCard";
import EmptyState from "../../components/ui/EmptyState";
import Progress from "../../components/ui/Progress";
import Avatar from "../../components/Avatar";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useInbox } from "../../context/InboxContext";
import { useSocial } from "../../context/SocialContext";
import { useMeetings, useMeetingsDesk } from "../../context/MeetingsContext";
import { usePmDesk, taskHref } from "../../pm/desk";
import { useSocialDesk } from "../../social/desk";
import { useOfficeDesk } from "../../office/desk";
import { useKmDesk } from "../../km/desk";
import { personalFor } from "../../data/personal";
import { users } from "../../data/mock";
import { myWork } from "../../pm/myWork";
import { isDone, projectProgress } from "../../pm/selectors";
import { dayNum, fa, formatJalali, monthLength, monthNames, parseJalali, weekDayNames, weekdayOf } from "../../pm/jalali";
import { ProjectIcon } from "../project/projectIcons";
import { PinnedCard, usePinnedReports } from "../../reports/PinnedReports";
import { ReportBuilderModal } from "../../reports/ModuleReportsButton";
import { resolveRange } from "../../reports/engine";
import type { GlobalFilter, ReportModule, ReportSpec } from "../../reports/types";
import { EMPTY_FILTER, mergeOrder, spanClass, useUserLayout, type Span } from "./layout";
import { GlobalFilterBar } from "./GlobalFilterBar";
import { usePendingAccessRequests } from "../../iam/hooks";
import { useWriteGuard, WriteBlockNotice } from "../../iam/useWriteGuard";

// ------------------------------------------------------------------ ردیف‌های صف «فعالیت و وظایف من»

type Prio = "high" | "medium" | "low";
type QKind = "task" | "approval" | "removal" | "minutes" | "doc" | "mention" | "access" | "personal";
type QAction = { id: string; label: string; tone?: "primary" | "danger"; run: () => void; undo?: () => void; done: string };
type QRow = { id: string; kind: QKind; title: string; meta: string; due?: string; prio: Prio; href: string; project?: string; actions: QAction[] };

const kindLabel: Record<QKind, string> = { task: "کار", approval: "منتظر تأیید", removal: "درخواست حذف", minutes: "صورتجلسه", doc: "سند دانش", mention: "اشاره", access: "درخواست دسترسی", personal: "کار" };
const prioLabel: Record<Prio, string> = { high: "فوری", medium: "مهم", low: "عادی" };
const prioTone = { high: "danger", medium: "warning", low: "success" } as const;
const PRIO_RANK: Record<Prio, number> = { high: 0, medium: 1, low: 2 };
const normPrio = (p?: string): Prio => (p === "زیاد" || p === "high" || p === "بحرانی" ? "high" : p === "متوسط" || p === "medium" ? "medium" : "low");

/** کارت داشبورد: عنوان = برچسب منو و لینک «مشاهده همه» */
function DeskCard({ id, title, to, icon, description, count, children, flush = true }: { id?: string; title: string; to: string; icon: ReactNode; description?: string; count?: number; children: ReactNode; flush?: boolean }) {
  return (
    <Card
      id={id}
      title={
        <>
          {title}
          {count ? <span className="ms-2 align-middle min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full text-xs font-bold bg-ink-100 text-ink-600">{fa(count)}</span> : null}
        </>
      }
      titleHref={to}
      icon={icon}
      description={description}
      flush={flush}
      className="h-full flex flex-col"
      bodyClassName="flex-1"
      actions={
        <Link to={to} className="text-[13px] text-[var(--color-link)] hover:underline inline-flex items-center gap-0.5 whitespace-nowrap">
          مشاهده همه <ChevronLeft size={14} />
        </Link>
      }
    >
      {children}
    </Card>
  );
}
const Empty = ({ children }: { children: ReactNode }) => <p className="text-[13px] text-ink-500 px-5 py-4">{children}</p>;

/** کارت گزارش سنجاق‌شده → عنوان = برچسب منوی صفحه‌ی ماژول گزارش */
const reportHome: Record<ReportModule, { label: string; to: string }> = {
  projects: { label: "پروژه‌ها", to: "/projects" },
  knowledge: { label: "مدیریت دانش", to: "/knowledge" },
  social: { label: "گفتگوها", to: "/conversations" },
  content: { label: "اخبار سازمان", to: "/news" },
  events: { label: "رویدادها و جلسات", to: "/events" },
  members: { label: "اعضای سازمان", to: "/members" },
  timesheet: { label: "گزارش فعالیت‌های من", to: "/activity-report" },
  tickets: { label: "تیکت پشتیبانی", to: "/tickets" },
};

type Widget = { id: string; title: string; span: Span; node: ReactNode };

export default function PersonalHub({ header }: { header?: ReactNode }) {
  const { actingUser, hasPermission, filterScoped, visibleUserIds, membershipsOf, scopeLabel, today } = useTenancy();
  const pm = useProjectsPM();
  const inbox = useInbox();
  const s = useSocial();
  const meetings = useMeetings();
  const pmDesk = usePmDesk();
  const mtDesk = useMeetingsDesk();
  const social = useSocialDesk(5);
  const office = useOfficeDesk();
  const kmDesk = useKmDesk();
  const accessReqs = usePendingAccessRequests();
  const guard = useWriteGuard();
  const navigate = useNavigate();
  const { notify } = useToast();
  const me = actingUser.name;
  const meId = actingUser.id;
  const personal = personalFor(meId);
  const ref = dayNum(pm.refDate) ?? 0;

  // ---------------------------------------------------------------- چیدمان و فیلتر سراسری
  const { layout, update } = useUserLayout(meId);
  const filter: GlobalFilter = layout?.filter ?? EMPTY_FILTER;
  const setFilter = (f: GlobalFilter) => update((cur) => ({ ...cur, filter: f }));
  const [edit, setEdit] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [openReport, setOpenReport] = useState<ReportSpec | null>(null);
  const pinnedReports = usePinnedReports();
  const range = useMemo(() => resolveRange(filter.range, pm.refDate), [filter.range, pm.refDate]);
  const inRange = (d?: string) => {
    if (range.from === undefined && range.to === undefined) return true;
    const n = d ? dayNum(d) : null;
    return n !== null && (range.from === undefined || n >= range.from) && (range.to === undefined || n <= range.to);
  };
  const filterOn = filter.range.preset !== "all" || !!filter.project || !!filter.person;
  const otherPerson = filter.person && filter.person !== me ? filter.person : null;
  const projectNames = filterScoped(pm.projects.map((p) => ({ ...p.meta, _p: p })))
    .filter((x) => !x.archived)
    .map((x) => x.name);
  const visIds = new Set(visibleUserIds());
  const peopleNames = users.filter((u) => visIds.has(u.id) || u.id === meId).map((u) => u.name);

  // ---------------------------------------------------------------- صف «فعالیت و وظایف من»
  const [hidden, setHiddenRows] = useState<string[]>([]);
  const queue: QRow[] = useMemo(() => {
    const rows: QRow[] = [];
    const projOf = (id: string) => pm.getProject(id.split(":")[1] ?? "");
    if (otherPerson) {
      // نمای کار همکار (فیلتر «شخص») — فقط‌خواندنی
      myWork(pm.projects, otherPerson).open.forEach(({ p, t }) =>
        rows.push({ id: `task:${p.meta.id}:${t.id}`, kind: "task", title: t.title, meta: `${p.meta.name} · ${otherPerson}`, due: t.due, prio: normPrio(t.priority), href: taskHref(p.meta.id, t), project: p.meta.name, actions: [] }),
      );
    } else {
      pmDesk.rows.forEach((r) => {
        const p = projOf(r.id);
        const tid = r.id.split(":")[2];
        const task = p?.tasks.find((t) => t.id === tid);
        const actions: QAction[] = (r.actions ?? []).map((a) => {
          if (r.kind === "task" && a.id === "done" && p && task) {
            const prev = task.status;
            return { id: a.id, label: a.label, tone: a.tone, run: a.run, undo: () => pm.moveTask(p.meta.id, task.id, prev), done: `«${r.title}» انجام شد.` };
          }
          return { id: a.id, label: a.label, tone: a.tone, run: a.run, done: `«${r.title}»: ${a.label} ثبت شد.` };
        });
        rows.push({ id: r.id, kind: r.kind, title: r.title, meta: r.meta, due: r.due, prio: r.kind === "task" && r.bucket === "overdue" ? "high" : normPrio(r.priority), href: r.href, project: p?.meta.name, actions });
      });
      mtDesk.rows
        .filter((r) => r.kind === "minutes_sign")
        .forEach((r) =>
          rows.push({
            id: r.id,
            kind: "minutes",
            title: r.title,
            meta: r.meta,
            prio: "medium",
            href: r.href,
            actions: ("actions" in r ? (r.actions ?? []) : []).map((a) => ({ id: a.id, label: a.label, tone: a.tone, run: a.run, done: `صورتجلسه‌ی «${r.title}» امضا شد.` })),
          }),
        );
      kmDesk.rows.forEach((r) =>
        rows.push({
          id: r.id,
          kind: "doc",
          title: r.title,
          meta: r.meta,
          due: r.due,
          prio: normPrio(r.priority),
          href: r.href,
          actions: (r.actions ?? []).map((a) => ({ id: a.id, label: a.label, tone: a.tone, run: a.run, done: `«${r.title}»: ${a.label} ثبت شد.` })),
        }),
      );
      inbox.mine
        .filter((i) => i.kind === "mention" && !inbox.isRead(i))
        .forEach((i) =>
          rows.push({ id: `mention:${i.id}`, kind: "mention", title: i.text, meta: `${i.actor} · ${i.time}`, prio: "low", href: i.link, actions: [{ id: "read", label: "خواندم", run: () => inbox.markRead(i.id), undo: () => inbox.markRead(i.id, false), done: "اشاره خوانده شد." }] }),
        );
      accessReqs.items.forEach((r) =>
        rows.push({ id: `access:${r.id}`, kind: "access", title: `${r.userName} — نقش «${r.roleName}»`, meta: `${r.scopeName}${r.reason ? ` · ${r.reason}` : ""}`, prio: "medium", href: accessReqs.link, actions: [] }),
      );
      if (!filterOn) personal.tasks.forEach((t) => rows.push({ id: `personal:${t.id}`, kind: "personal", title: t.text, meta: "کار شخصی", prio: t.late ? "high" : "low", href: t.to, actions: [] }));
    }
    return rows.filter((r) => !hidden.includes(r.id) && (!filter.project || r.project === filter.project) && (r.kind !== "task" || inRange(r.due)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pmDesk.rows, mtDesk.rows, kmDesk.rows, inbox.mine, accessReqs.items, personal.tasks, hidden, filter, otherPerson, pm.projects]);

  const [q, setQ] = useState("");
  const [kindF, setKindF] = useState<"" | QKind>("");
  const [prioF, setPrioF] = useState<"" | Prio>("");
  const [sort, setSort] = useState<"prio" | "due">("prio");
  const shown = queue
    .filter((r) => (!q || `${r.title} ${r.meta}`.includes(q)) && (!kindF || r.kind === kindF || (kindF === "task" && r.kind === "personal")) && (!prioF || r.prio === prioF))
    .sort((a, b) => (sort === "prio" ? PRIO_RANK[a.prio] - PRIO_RANK[b.prio] : 0) || (dayNum(a.due ?? "") ?? 9e9) - (dayNum(b.due ?? "") ?? 9e9));
  const urgent = queue.filter((r) => r.prio === "high").length;
  const kindsPresent = [...new Set(queue.map((r) => (r.kind === "personal" ? "task" : r.kind)))];

  const act = (r: QRow, a: QAction) => {
    if (guard.block) return;
    a.run();
    setHiddenRows((h) => [...h, r.id]);
    notify(a.done, {
      tone: "success",
      undo: () => {
        a.undo?.();
        setHiddenRows((h) => h.filter((x) => x !== r.id));
      },
    });
  };

  // ---------------------------------------------------------------- «تقویم کاری من»: جلسه‌ها و رویدادهای پیش‌رو
  const endOf = (start: string, minutes: number) => {
    const m = /(\d{1,2}):(\d{2})/.exec(start.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
    if (!m) return undefined;
    const t = Number(m[1]) * 60 + Number(m[2]) + minutes;
    return `${fa(Math.floor(t / 60) % 24).padStart(2, "۰")}:${fa(t % 60).padStart(2, "۰")}`;
  };
  type Agenda = { id: string; kind: "جلسه" | "رویداد"; title: string; sub: string; date: string; start: string; end?: string; where?: string; pending?: boolean; href: string };
  const agenda: Agenda[] = useMemo(() => {
    const mine = meetings.views.filter((v) => v.status === 1 && (v.organizer === me || v.participants.some((x) => x.principal_id === meId || x.name === me)) && (dayNum(v.date) ?? 0) >= ref);
    const a: Agenda[] = mine.map((v) => ({
      id: `m:${v.route_id}`,
      kind: "جلسه",
      title: v.title,
      sub: v.project_name ?? "صورتجلسه‌ی سازمانی",
      date: v.date,
      start: v.time,
      end: endOf(v.time, v.duration || 60),
      where: v.link ? "برخط" : v.location,
      pending: v.participants.some((x) => (x.principal_id === meId || x.name === me) && (x as { rsvp?: string }).rsvp === "pending"),
      href: `/meetings/${encodeURIComponent(v.route_id)}`,
    }));
    s.events
      .filter((e) => !e.is_draft && !e.deleted_at && (dayNum(e.start_date) ?? 0) >= ref)
      .forEach((e) => {
        const st = s.myEventStatus(e.id)?.status;
        if (!st || st === "declined") return;
        a.push({ id: `e:${e.id}`, kind: "رویداد", title: e.title, sub: e.is_online ? "برخط" : e.address || e.location || "", date: e.start_date, start: e.start_time, end: e.end_time, where: e.is_online ? "برخط" : e.address || e.location, pending: st === "invited", href: `/events/${e.id}` });
      });
    return a.sort((x, y) => (dayNum(x.date) ?? 0) - (dayNum(y.date) ?? 0) || x.start.localeCompare(y.start)).filter((x) => inRange(x.date) && (!filter.project || x.sub === filter.project));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetings.views, s.events, s.eventMembers, me, meId, ref, filter]);
  const todayCount = agenda.filter((x) => dayNum(x.date) === ref).length;

  // ---------------------------------------------------------------- پروژه‌ها
  const who = otherPerson ?? me;
  const projectsShown = pm.projects.filter((p) => !p.meta.archived && (p.members.some((m) => m.name === who || (!otherPerson && m.userId === meId)) || p.meta.manager === who) && (!filter.project || p.meta.name === filter.project));
  const friendReqs = s.friendships.filter((f) => f.status === "pending" && f.receiver_id === meId);
  const w = myWork(pm.projects, me);

  // ---------------------------------------------------------------- «تولد همکاران»: امروز و ۷ روز آینده
  // افراد = همان دید «اعضای سازمان» (اجتماع زیردرخت عضویت‌ها — visibleUserIds)؛ تاریخ از birth_day شمسی.
  const birthdays = useMemo(() => {
    const t0 = dayNum(today) ?? 0;
    const ty = parseJalali(today)?.[0] ?? 0;
    const ids = new Set(visibleUserIds());
    const out: { u: (typeof users)[number]; date: string; days: number }[] = [];
    users.forEach((u) => {
      if (u.id === meId || !ids.has(u.id)) return;
      const b = parseJalali(u.birth_day ?? undefined);
      if (!b) return;
      // ۳۰ اسفند در سال غیرکبیسه ← آخرین روز اسفند
      const on = (y: number) => formatJalali(y, b[1], Math.min(b[2], monthLength(y, b[1])));
      let date = on(ty);
      if ((dayNum(date) ?? 0) < t0) date = on(ty + 1);
      const days = (dayNum(date) ?? 0) - t0;
      if (days <= 7) out.push({ u, date, days });
    });
    return out.sort((a, b) => a.days - b.days || a.u.name.localeCompare(b.u.name, "fa"));
  }, [today, meId, visibleUserIds]);
  const birthdayWhen = (date: string) => {
    const p = parseJalali(date);
    return p ? `${weekDayNames[weekdayOf(date)]} ${fa(p[2])} ${monthNames[p[1] - 1]}` : date;
  };
  const congratulate = (userId: string) => navigate(`/conversations/${s.openDirect(userId)}`);

  // ---------------------------------------------------------------- قهرمان
  const queueRef = useRef<HTMLDivElement>(null);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const firstName = me.startsWith("پایگاه") ? "همکار گرامی" : me;
  const hero = (
    <HeroToday
      name={firstName}
      summary={
        <>
          امروز <b>{fa(queue.length)} مورد</b> منتظر شماست و <b>{fa(todayCount)} جلسه و رویداد</b> در برنامه دارید
          {urgent ? (
            <>
              ؛ <b>{fa(urgent)} مورد فوری</b> را اول ببینید.
            </>
          ) : (
            "."
          )}
        </>
      }
      actions={[
        ...(hasPermission("projects.list") ? [{ label: "کار جدید", icon: <Plus size={18} />, onClick: () => navigate("/activities?new=task"), solid: true }] : []),
        ...(hasPermission("events.list") ? [{ label: "جلسه جدید", icon: <CalendarDays size={18} />, onClick: () => navigate("/events?new=meeting"), solid: false }] : []),
      ]}
      stats={[
        { label: "منتظر شما", value: fa(queue.length), onClick: () => (setPrioF(""), scrollTo("desk-queue")) },
        { label: "جلسه و رویداد", value: fa(todayCount), onClick: () => scrollTo("desk-calendar") },
        { label: "مورد فوری", value: fa(urgent), onClick: () => (setPrioF("high"), scrollTo("desk-queue")) },
      ]}
    />
  );

  // ---------------------------------------------------------------- کارت‌ها
  const widgetList: Widget[] = [
    {
      id: "tasks",
      title: "فعالیت و وظایف من",
      span: 3,
      node: (
        <div ref={queueRef} className="h-full">
          <DeskCard id="desk-queue" title="فعالیت و وظایف من" to="/activities" icon={<Inbox />} count={queue.length} description={otherPerson ? `کارهای باز «${otherPerson}» (فقط مشاهده)` : undefined}>
            <FilterBar search={q} onSearch={setQ} searchPlaceholder="جست‌وجو در موارد…" activeCount={(kindF ? 1 : 0) + (prioF ? 1 : 0)} onClear={q || kindF || prioF ? () => (setQ(""), setKindF(""), setPrioF("")) : undefined}>
              <select className="input-field !w-auto" value={kindF} onChange={(e) => setKindF(e.target.value as QKind | "")} aria-label="نوع">
                <option value="">همه‌ی انواع</option>
                {kindsPresent.map((k) => (
                  <option key={k} value={k}>
                    {kindLabel[k]}
                  </option>
                ))}
              </select>
              <select className="input-field !w-auto" value={prioF} onChange={(e) => setPrioF(e.target.value as Prio | "")} aria-label="فوریت">
                <option value="">همه‌ی فوریت‌ها</option>
                {(["high", "medium", "low"] as Prio[]).map((p) => (
                  <option key={p} value={p}>
                    {prioLabel[p]}
                  </option>
                ))}
              </select>
              <select className="input-field !w-auto" value={sort} onChange={(e) => setSort(e.target.value as "prio" | "due")} aria-label="مرتب‌سازی">
                <option value="prio">بر اساس فوریت</option>
                <option value="due">بر اساس موعد</option>
              </select>
            </FilterBar>
            {guard.block && <WriteBlockNotice block={guard.block} className="mx-5 mt-3" />}
            {w.timers.length > 0 && !otherPerson && (
              <p className="mx-5 mt-3 rounded-[10px] bg-rose-50 text-rose-700 text-[13px] px-3 py-2 flex items-center gap-2 flex-wrap">
                <Timer size={16} /> تایمر شما روشن است:
                {w.timers.map((x) => (
                  <Link key={x.t.id} to={taskHref(x.p.meta.id, x.t)} className="underline">
                    {x.t.title}
                  </Link>
                ))}
              </p>
            )}
            {shown.map((r) => (
              <ListRow
                key={r.id}
                href={r.href}
                priority={r.prio}
                badges={
                  <>
                    <Badge tone={prioTone[r.prio]} dot>
                      {prioLabel[r.prio]}
                    </Badge>
                    <Badge tone="neutral">{kindLabel[r.kind]}</Badge>
                  </>
                }
                due={r.due ? <span className={r.prio === "high" ? "text-rose-600" : ""}>{r.due}</span> : undefined}
                title={r.title}
                subtitle={r.meta}
                actions={
                  r.actions.length ? (
                    r.actions.map((a) => (
                      <Button key={a.id} size="sm" variant={a.tone === "danger" ? "ghost" : "tonal"} onClick={() => act(r, a)} disabled={!!guard.block}>
                        {a.label}
                      </Button>
                    ))
                  ) : r.kind === "mention" || r.kind === "doc" || r.kind === "access" ? (
                    <Button size="sm" variant="outline" onClick={() => navigate(r.href)}>
                      {r.kind === "mention" ? "پاسخ" : "بررسی"}
                    </Button>
                  ) : undefined
                }
              />
            ))}
            {shown.length === 0 && <EmptyState compact title={queue.length ? "با این فیلترها موردی پیدا نشد" : "موردی منتظر شما نیست"} />}
          </DeskCard>
        </div>
      ),
    },
    {
      id: "calendar",
      title: "تقویم کاری من",
      span: 1,
      node: (
        <DeskCard id="desk-calendar" title="تقویم کاری من" to="/calendar" icon={<CalendarDays />} description="جلسه‌ها و رویدادهای پیش‌رو" count={agenda.length}>
          {agenda.slice(0, 6).map((a) => (
            <ListRow
              key={a.id}
              href={a.href}
              lead={<ListRowTime start={a.start} end={a.end} />}
              badges={
                <>
                  <Badge tone={a.kind === "جلسه" ? "brand" : "info"} dot>
                    {a.kind}
                  </Badge>
                  {dayNum(a.date) !== ref && <span className="text-xs text-ink-500">{a.date}</span>}
                </>
              }
              title={a.title}
              subtitle={
                <>
                  {a.where && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} /> {a.where}
                    </span>
                  )}
                  {a.pending && <span className="block text-amber-700 font-medium">پاسخ شما ثبت نشده</span>}
                </>
              }
            />
          ))}
          {agenda.length === 0 && <Empty>{filterOn ? "با این فیلتر جلسه‌ای پیدا نشد." : "جلسه یا رویدادی در پیش ندارید."}</Empty>}
        </DeskCard>
      ),
    },
    {
      id: "events",
      title: "رویدادها و جلسات",
      span: 2,
      node: (
        <DeskCard title="رویدادها و جلسات" to="/events" icon={<CalendarDays />} count={social.events.length + mtDesk.counts.toSign}>
          {social.events.map((r) => (
            <ListRow key={r.id} href={r.href} priority={r.priority === "high" ? "high" : undefined} badges={<Badge tone="info">رویداد</Badge>} due={r.due} title={r.title} subtitle={r.meta} actions={r.actions?.map((a) => (
              <Button key={a.label} size="sm" variant="outline" onClick={() => navigate(a.href)}>
                {a.label}
              </Button>
            ))} />
          ))}
          {mtDesk.rows
            .filter((r) => r.kind === "meeting")
            .slice(0, 3)
            .map((r) => (
              <ListRow key={r.id} href={r.href} badges={<Badge tone="brand">جلسه</Badge>} due={r.due} title={r.title} subtitle={r.meta} />
            ))}
          {social.events.length + mtDesk.rows.length === 0 && <Empty>رویداد یا جلسه‌ی پیش‌رویی نیست.</Empty>}
        </DeskCard>
      ),
    },
    {
      id: "announce",
      title: "اخبار سازمان",
      span: 2,
      node: (
        <DeskCard title="اخبار سازمان" to="/news" icon={<Newspaper />}>
          {social.news.map((r) => (
            <ListRow key={r.id} href={r.href} badges={r.priority === "high" ? <Badge tone="danger">اطلاعیه‌ی رسمی</Badge> : <Badge tone="neutral">خبر</Badge>} title={r.title} subtitle={r.meta} />
          ))}
          {social.news.length === 0 && <Empty>خبر تازه‌ای نیست.</Empty>}
        </DeskCard>
      ),
    },
    {
      id: "messages",
      title: "گفتگوها",
      span: 2,
      node: (
        <DeskCard title="گفتگوها" to="/conversations" icon={<MessagesSquare />} count={social.chats.length}>
          {social.chats.map((r) => (
            <ListRow key={r.id} href={r.href} unread title={r.title} subtitle={r.meta} />
          ))}
          {social.chats.length === 0 && <Empty>پیام خوانده‌نشده‌ای ندارید.</Empty>}
        </DeskCard>
      ),
    },
    ...(hasPermission("members.view") && birthdays.length
      ? [
          {
            id: "birthdays",
            title: "تولد همکاران",
            span: 2 as Span,
            node: (
              <DeskCard title="تولد همکاران" to="/members" icon={<Cake />} count={birthdays.length} description="امروز و ۷ روز آینده">
                {birthdays.map(({ u, date, days }) => {
                  const mem = membershipsOf(u.id).find((m) => m.primary && m.status === "active") ?? membershipsOf(u.id).find((m) => m.status === "active");
                  return (
                    <ListRow
                      key={u.id}
                      href={`/profile/${u.id}`}
                      unread={days === 0}
                      lead={<Avatar name={u.name} color={u.avatarColor} size={40} />}
                      badges={days === 0 ? <Badge tone="success">امروز</Badge> : undefined}
                      due={days === 0 ? undefined : birthdayWhen(date)}
                      title={u.name}
                      subtitle={mem ? `${mem.title ?? u.role} · ${scopeLabel(mem.scopeId)}` : `${u.role} · ${u.org}`}
                      actions={
                        hasPermission("chat.view") ? (
                          <Button size="sm" variant="tonal" onClick={() => congratulate(u.id)}>
                            تبریک
                          </Button>
                        ) : undefined
                      }
                    />
                  );
                })}
              </DeskCard>
            ),
          },
        ]
      : []),
    ...(hasPermission("forum.list")
      ? [
          {
            id: "topics",
            title: "پرسش و پاسخ",
            span: 2 as Span,
            node: (
              <DeskCard title="پرسش و پاسخ" to="/forums" icon={<CircleHelp />} description="موضوع‌هایی که دنبال می‌کنید">
                {social.followedTopics.map((r) => (
                  <ListRow key={r.id} href={r.href} unread={r.priority === "high"} title={r.title} subtitle={r.meta} />
                ))}
                {social.followedTopics.length === 0 && <Empty>موضوعی را دنبال نمی‌کنید؛ در صفحه‌ی هر پرسش «دنبال کردن» را بزنید.</Empty>}
              </DeskCard>
            ),
          },
        ]
      : []),
    ...(hasPermission("projects.list")
      ? [
          {
            id: "projects",
            title: "پروژه‌ها",
            span: 2 as Span,
            node: (
              <DeskCard title="پروژه‌ها" to="/projects" icon={<KanbanSquare />} count={projectsShown.length}>
                {projectsShown.slice(0, 5).map((p) => {
                  const open = p.tasks.filter((t) => t.assignee === who && !t.archived && !isDone(p, t)).length;
                  const pr = projectProgress(p);
                  return (
                    <ListRow
                      key={p.meta.id}
                      href={`/projects/${p.meta.id}`}
                      lead={
                        <span className="w-10 h-10 rounded-[10px] bg-teal-50 text-teal-700 flex items-center justify-center">
                          <ProjectIcon name={p.meta.icon} size={20} />
                        </span>
                      }
                      title={p.meta.name}
                      subtitle={
                        <span className="flex items-center gap-2">
                          <span className="flex-1 min-w-0">
                            <Progress value={pr} />
                          </span>
                          <span className="tabular-nums">{fa(pr)}٪</span>
                          {open ? <span>· {fa(open)} کار باز</span> : null}
                        </span>
                      }
                    />
                  );
                })}
                {projectsShown.length === 0 && <Empty>{filterOn ? "با این فیلتر پروژه‌ای پیدا نشد." : "عضو پروژه‌ی فعالی نیستید."}</Empty>}
              </DeskCard>
            ),
          },
        ]
      : []),
    ...(hasPermission("secretariat.view")
      ? [
          {
            id: "secretariat",
            title: "دبیرخانه",
            span: 2 as Span,
            node: (
              <DeskCard title="دبیرخانه" to="/secretariat" icon={<FileText />} count={office.counts.letters} description="نامه‌های خوانده‌نشده و ارجاع‌های شما">
                {office.rows
                  .filter((r) => r.kind === "letter")
                  .slice(0, 5)
                  .map((r) => (
                    <ListRow key={r.id} href={r.href} priority={r.priority} unread due={r.due} title={r.title} subtitle={r.meta} />
                  ))}
                {office.counts.letters === 0 && <Empty>نامه‌ی خوانده‌نشده‌ای ندارید.</Empty>}
              </DeskCard>
            ),
          },
        ]
      : []),
    ...(hasPermission("crm.view")
      ? [
          {
            id: "customers",
            title: "پرونده مشتریان",
            span: 2 as Span,
            node: (
              <DeskCard title="پرونده مشتریان" to="/customers" icon={<FolderOpen />} count={office.counts.opportunities + office.counts.overdue} description="فرصت‌های فروش نزدیک موعد و دریافت‌های معوق">
                {office.rows
                  .filter((r) => r.kind !== "letter")
                  .slice(0, 5)
                  .map((r) => (
                    <ListRow key={r.id} href={r.href} priority={r.priority} badges={<Badge tone={r.kind === "finance" ? "danger" : "brand"}>{r.kind === "finance" ? "دریافت معوق" : "فرصت فروش"}</Badge>} due={r.due} title={r.title} subtitle={r.meta} />
                  ))}
                {office.counts.opportunities + office.counts.overdue === 0 && <Empty>موردی برای پیگیری نیست.</Empty>}
              </DeskCard>
            ),
          },
        ]
      : []),
    ...(hasPermission("relations.use")
      ? [
          {
            id: "friends",
            title: "ارتباطات من",
            span: 2 as Span,
            node: (
              <DeskCard title="ارتباطات من" to="/friends" icon={<UserPlus />} count={friendReqs.length} description="درخواست‌های ارتباط منتظر پاسخ شما">
                {friendReqs.slice(0, 5).map((f) => (
                  <ListRow
                    key={f.id}
                    href="/friends"
                    title={s.userName(f.sender_id)}
                    subtitle="درخواست ارتباط"
                    actions={
                      <>
                        <Button size="sm" variant="tonal" disabled={!!guard.block} onClick={() => (s.respondFriend(f.id, true), notify("درخواست پذیرفته شد.", "success"))}>
                          پذیرش
                        </Button>
                        <Button size="sm" variant="ghost" disabled={!!guard.block} onClick={() => (s.respondFriend(f.id, false), notify("درخواست رد شد.", "info"))}>
                          رد
                        </Button>
                      </>
                    }
                  />
                ))}
                {friendReqs.length === 0 && <Empty>درخواست تازه‌ای ندارید.</Empty>}
              </DeskCard>
            ),
          },
        ]
      : []),
    ...pinnedReports.map((r) => {
      const home = reportHome[r.module] ?? { label: "گزارش فعالیت‌های من", to: "/activity-report" };
      return {
        id: `report:${r.id}`,
        title: home.label,
        span: 2 as Span,
        node: (
          <DeskCard title={home.label} to={home.to} icon={<BriefcaseBusiness />} flush={false}>
            <PinnedCard spec={r} filter={filter} onOpen={() => setOpenReport(r)} className="!border-0 !p-0 !bg-transparent" />
          </DeskCard>
        ),
      };
    }),
  ];

  const DEFAULT_ORDER = ["tasks", "calendar", "events", "announce", "birthdays", "messages", "topics", "projects", "secretariat", "customers", "friends", ...pinnedReports.map((r) => `report:${r.id}`)];
  const byId = new Map(widgetList.map((x) => [x.id, x]));
  const order = mergeOrder(layout?.order, widgetList.map((x) => x.id), DEFAULT_ORDER);
  const hiddenW = new Set(layout?.hidden ?? []);
  const spanOf = (x: Widget): Span => layout?.spans[x.id] ?? x.span;
  const setOrder = (next: string[]) => update((cur) => ({ ...cur, order: next }));
  const visibleOrder = order.filter((id) => !hiddenW.has(id) && byId.has(id));
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
  const hiddenWidgets = order.filter((id) => hiddenW.has(id)).map((id) => byId.get(id)).filter((x): x is Widget => !!x);

  // ---------------------------------------------------------------- آمار ماژول‌ها (هر کاشی = صفحه‌ی منو)
  const unreadMessages = s.myChats(["direct_message", "group", "channel"]).filter((c) => !c.muted_by.includes(meId)).reduce((n, c) => n + s.unreadCount(c), 0);
  const stats = [
    { label: "فعالیت و وظایف من", value: w.open.length, href: "/activities", caption: "کار باز" },
    { label: "تقویم کاری من", value: agenda.length, href: "/calendar", caption: "جلسه و رویداد پیش‌رو" },
    { label: "گفتگوها", value: unreadMessages, href: "/conversations", caption: "پیام خوانده‌نشده" },
    { label: "پروژه‌ها", value: projectsShown.length, href: "/projects", caption: "پروژه‌ی فعال من" },
  ];

  return (
    <div className="space-y-5">
      {header}
      {hero}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((x) => (
          <StatCard key={x.label} label={x.label} value={x.value} href={x.href} hint={x.caption} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <GlobalFilterBar value={filter} onChange={setFilter} projects={projectNames} people={peopleNames} />
        <div className="flex items-center gap-1.5 ms-auto">
          {edit && (
            <Button size="sm" variant="ghost" icon={<RotateCcw size={16} />} onClick={() => update((cur) => ({ order: [], spans: {}, hidden: [], filter: cur.filter }))}>
              بازنشانی
            </Button>
          )}
          <Button size="sm" variant={edit ? "primary" : "outline"} icon={<LayoutGrid size={16} />} onClick={() => setEdit((v) => !v)}>
            {edit ? "پایان چیدمان" : "چیدمان"}
          </Button>
        </div>
      </div>

      {edit && (
        <div className="card p-3 text-[12.5px] text-ink-600 flex items-center gap-2 flex-wrap">
          <span className="text-ink-500">با کشیدن یا دکمه‌های بالا/پایین جابه‌جا کنید؛ پهنای هر کارت ۱ تا ۴ ستون است.</span>
          {hiddenWidgets.length > 0 && <span className="text-ink-400">پنهان‌ها:</span>}
          {hiddenWidgets.map((x) => (
            <button key={x.id} type="button" onClick={() => update((cur) => ({ ...cur, hidden: cur.hidden.filter((h) => h !== x.id) }))} className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 hover:bg-ink-50 max-w-[200px]">
              <Eye size={12} className="shrink-0" /> <span className="truncate">{x.title}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {visibleOrder.map((id, idx) => {
          const x = byId.get(id)!;
          const sp = spanOf(x);
          return (
            <div
              key={id}
              className={`${spanClass[sp]} min-w-0 flex flex-col ${edit ? "rounded-[14px] outline-2 outline-dashed outline-teal-500 outline-offset-2" : ""} ${dragId === id ? "opacity-50" : ""}`}
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
                <div className="flex items-center gap-1 mb-1.5 rounded-[10px] bg-teal-50 px-1.5 py-1 text-[12px] text-teal-700">
                  <GripVertical size={14} className="cursor-move shrink-0" />
                  <span className="truncate flex-1 font-bold">{x.title}</span>
                  <span className="hidden md:flex items-center gap-0.5" role="group" aria-label="پهنا">
                    {([1, 2, 3, 4] as Span[]).map((n) => (
                      <button key={n} type="button" onClick={() => update((cur) => ({ ...cur, spans: { ...cur.spans, [id]: n } }))} aria-label={`پهنای ${n} ستون`} aria-pressed={sp === n} className={`w-5 h-5 rounded text-[11px] ${sp === n ? "bg-teal-500 text-[var(--color-navy-900)] font-bold" : "hover:bg-white/60"}`}>
                        {fa(n)}
                      </button>
                    ))}
                  </span>
                  <button type="button" onClick={() => move(id, -1)} disabled={idx === 0} aria-label="انتقال به قبل" className="w-6 h-6 rounded hover:bg-white/60 flex items-center justify-center disabled:opacity-30">
                    <ArrowUp size={13} />
                  </button>
                  <button type="button" onClick={() => move(id, 1)} disabled={idx === visibleOrder.length - 1} aria-label="انتقال به بعد" className="w-6 h-6 rounded hover:bg-white/60 flex items-center justify-center disabled:opacity-30">
                    <ArrowDown size={13} />
                  </button>
                  <button type="button" onClick={() => update((cur) => ({ ...cur, hidden: [...new Set([...cur.hidden, id])] }))} aria-label="پنهان کردن" className="w-6 h-6 rounded hover:bg-white/60 flex items-center justify-center">
                    <EyeOff size={13} />
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
