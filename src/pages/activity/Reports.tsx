// تب «گزارش‌ها»: گزارش پویای ساعت‌ها (بر اساس پروژه/تسک/روز/منبع/نوع/شخص) با نمودار SVG،
// و «تجمیع فعالیت‌ها» = هرچه این شخص در دوره در سامانه انجام داده (تسک‌ها، دانش، محتوا، پیام، جلسه).
import { useMemo, useState } from "react";
import { occurrenceDates } from "../../pm/recurrence";
import { Link } from "react-router-dom";
import { BookOpen, CalendarCheck, ChartBar, ChartPie, CircleCheck, FileText, ListChecks, MessageSquare, Newspaper, Users, Video, Activity } from "lucide-react";
import EmptyState from "../../components/ui/EmptyState";
import { useKnowledge } from "../../context/KnowledgeContext";
import { useSocial } from "../../context/SocialContext";
import { dayNum, fa, weekDayNames, weekdayOf } from "../../pm/jalali";
import { counts, daysBetween, entryTypeLabel, expectedOn, fh, inRange, isLeave, shortDate, sourceLabel, teamLabel, type Period, type Person, type TimeEntry } from "../../timesheet/types";
import { useTs } from "./lib";
import { DayColumns, Donut, HBarChart, palette, type Datum } from "./ui";

type Dim = "project" | "task" | "day" | "source" | "type" | "person";
const dimLabel: Record<Dim, string> = { project: "پروژه", task: "تسک", day: "روز", source: "منبع", type: "نوع", person: "شخص" };

export default function Reports({ period }: { period: Period }) {
  const { ts, ten, me, teamPeople, entriesOf, projectName, projectColor, taskTitle } = useTs();
  const isManager = ten.hasPermission("timesheet.team") && teamPeople.length > 0;
  const [subject, setSubject] = useState<string>(me.id); // شناسه‌ی شخص یا «all»
  const [dim, setDim] = useState<Dim>("project");
  const [chart, setChart] = useState<"bar" | "pie">("bar");
  const people: Person[] = subject === "all" ? teamPeople : [teamPeople.find((p) => p.id === subject) ?? me];
  const person = subject === "all" ? null : people[0];

  const entries: (TimeEntry & { _person: Person })[] = useMemo(
    () => people.flatMap((p) => entriesOf(p, period.start, period.end).filter((e) => counts(e) || e.aggregate).map((e) => ({ ...e, _person: p }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subject, ts.entries, period.key, teamPeople],
  );
  const work = entries.filter((e) => !isLeave(e.type));
  const total = work.reduce((a, e) => a + e.hours, 0);

  const data: Datum[] = useMemo(() => {
    const m = new Map<string, Datum>();
    const add = (k: string, label: string, v: number, color?: string) => {
      const d = m.get(k) ?? { label, value: 0, color };
      d.value += v;
      m.set(k, d);
    };
    const src = dim === "type" ? entries : work;
    src.forEach((e) => {
      if (dim === "project") add(e.projectId ?? "-", projectName(e.projectId), e.hours, projectColor(e.projectId));
      else if (dim === "task") add(`${e.projectId}/${e.taskId ?? "-"}`, taskTitle(e.projectId, e.taskId) ?? (e.projectId ? `${projectName(e.projectId)} — بدون تسک` : "کار عمومی"), e.hours);
      else if (dim === "source") add(e.source, sourceLabel[e.source], e.hours);
      else if (dim === "type") add(e.type, entryTypeLabel[e.type], e.hours);
      else if (dim === "person") add(e._person.id, e._person.name, e.hours, e._person.avatarColor);
    });
    return [...m.values()].sort((a, b) => b.value - a.value).slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, dim]);

  const days = daysBetween(period.start, period.end);
  const dayData = days.map((d) => ({ label: shortDate(d), value: work.filter((e) => !e.aggregate && dayNum(e.date) === dayNum(d)).reduce((a, e) => a + e.hours, 0) / Math.max(1, people.length), off: expectedOn(ts.settings, d) === 0 }));
  const dims: Dim[] = ["project", "task", "day", "source", "type", ...(subject === "all" ? (["person"] as Dim[]) : [])];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {isManager && (
          <select className="input-field !w-auto !py-1.5 !text-xs max-w-[200px]" value={subject} onChange={(e) => (setSubject(e.target.value), e.target.value !== "all" && dim === "person" && setDim("project"))} aria-label="شخص">
            <option value={me.id}>خودم</option>
            <option value="all">همه‌ی تیم ({fa(teamPeople.length)} نفر)</option>
            {teamPeople
              .filter((p) => p.id !== me.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {teamLabel[p.team]}
                </option>
              ))}
          </select>
        )}
        <div className="flex rounded-lg border border-ink-200 overflow-x-auto text-xs max-w-full">
          {dims.map((d) => (
            <button key={d} onClick={() => setDim(d)} className={`px-2.5 py-1.5 whitespace-nowrap ${dim === d ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-ink-50"}`}>
              {dimLabel[d]}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {dim !== "day" && (
          <div className="flex rounded-lg border border-ink-200 overflow-hidden">
            {(
              [
                ["bar", ChartBar, "میله‌ای"],
                ["pie", ChartPie, "دایره‌ای"],
              ] as const
            ).map(([id, Icon, label]) => (
              <button key={id} onClick={() => setChart(id)} className={`w-8 h-8 flex items-center justify-center ${chart === id ? "bg-brand-600 text-white" : "text-ink-500 hover:bg-ink-50"}`} title={label} aria-label={label}>
                <Icon size={14} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4">
        <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap">
          <p className="text-[13px] font-bold text-ink-800">
            ساعت کار بر اساس {dimLabel[dim]}
            {dim === "day" && people.length > 1 && <span className="font-normal text-ink-400"> (میانگین هر نفر)</span>}
          </p>
          <p className="text-xs text-ink-500">
            جمع: <b className="text-ink-900">{fh(total)}</b> ساعت · {person ? person.name : `${fa(people.length)} نفر`}
          </p>
        </div>
        {dim === "day" ? (
          <DayColumns data={dayData} expected={days.map((d) => expectedOn(ts.settings, d, person ?? undefined))} />
        ) : data.length === 0 ? (
          <p className="text-xs text-ink-400 text-center py-8">در این دوره ساعتی ثبت نشده است.</p>
        ) : chart === "bar" ? (
          <HBarChart data={data} />
        ) : (
          <Donut data={data.map((d, i) => ({ ...d, color: d.color ?? palette[i % palette.length] }))} />
        )}
        {dim === "day" && (
          <p className="text-[10px] text-ink-400 mt-2">
            سبز = رسیدن به ساعت موظف · نارنجی = کمتر · خط‌چین = ساعت موظف روز · زمینه‌ی خاکستری = تعطیل
          </p>
        )}
      </div>

      {person ? <ActivityFeed person={person} period={period} /> : <p className="text-xs text-ink-400 text-center">برای دیدن «تجمیع فعالیت‌ها» یک نفر را انتخاب کنید.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- تجمیع فعالیت‌ها
type Item = { date: string; time: string; icon: typeof Activity; tone: string; text: string; meta?: string; link?: string };

function ActivityFeed({ person, period }: { person: Person; period: Period }) {
  const { pm } = useTs();
  const km = useKnowledge();
  const social = useSocial();
  const name = person.name;
  const uid = person.userId;
  const inP = (d?: string | null) => !!d && inRange(d, period.start, period.end);
  const timeOf = (s?: string | null) => (s ?? "").split(" ")[1]?.slice(0, 5) ?? "";

  const { items, stats } = useMemo(() => {
    const items: Item[] = [];
    let done = 0;
    let taskActs = 0;
    let meetings = 0;
    // پروژه‌ها: تاریخچه‌ی کارهای شخص
    pm.projects.forEach((p) => {
      p.logs
        .filter((l) => l.actor === name && inP(l.date))
        .forEach((l) => {
          const completed = l.event === "TASK_STATUS_CHANGED" && (l.metadata.new_kind === "done" || l.metadata.new_status === "انجام‌شده");
          if (completed) done++;
          else if (l.event.startsWith("TASK_")) taskActs++;
          items.push({
            date: l.date,
            time: l.time,
            icon: completed ? CircleCheck : ListChecks,
            tone: completed ? "bg-emerald-50 text-emerald-700" : "bg-brand-50 text-brand-700",
            text: l.description,
            meta: p.meta.name,
            link: `/dashboard/projects/${p.meta.id}`,
          });
        });
      p.meetings
        .filter((m) => m.status !== "لغوشده" && m.participants.includes(name))
        .flatMap((m) => occurrenceDates(m.recurrence, m.date, dayNum(period.start) ?? 0, dayNum(period.end) ?? 0).map((date) => ({ ...m, date })))
        .filter((m) => inP(m.date))
        .forEach((m) => {
          meetings++;
          items.push({ date: m.date, time: m.time, icon: Video, tone: "bg-navy-50 text-navy-700", text: `جلسه: ${m.title}`, meta: `${p.meta.name} · ${fa(m.duration)} دقیقه`, link: `/dashboard/projects/${p.meta.id}?tab=minutes` });
        });
    });
    // مدیریت دانش
    let docs = 0;
    km.logs
      .filter((l) => l.actor === name && inP(l.at))
      .forEach((l) => {
        docs++;
        items.push({ date: l.at.split(" ")[0], time: timeOf(l.at), icon: BookOpen, tone: "bg-amber-50 text-amber-700", text: `${l.action}: «${l.entity.title}»`, meta: "مدیریت دانش", link: "/dashboard/knowledge" });
      });
    km.docs
      .filter((d) => (d.author === name || d.owner === name) && inP(d.updatedAt) && !km.logs.some((l) => l.actor === name && l.entity.id === d.id))
      .forEach((d) => {
        docs++;
        items.push({ date: d.updatedAt, time: "", icon: FileText, tone: "bg-amber-50 text-amber-700", text: `سند «${d.title}» (نسخه‌ی ${fa(d.version)}) به‌روز شد`, meta: "مدیریت دانش", link: "/dashboard/knowledge" });
      });
    // شبکه‌ی اجتماعی
    let posts = 0;
    let messages = 0;
    if (uid) {
      social.content
        .filter((c) => c.user_id === uid && inP(c.created_at))
        .forEach((c) => {
          posts++;
          items.push({ date: c.created_at.split(" ")[0], time: timeOf(c.created_at), icon: Newspaper, tone: "bg-rose-50 text-rose-600", text: `${c.is_draft ? "پیش‌نویس" : "انتشار"}: «${c.title}»`, meta: "محتوا" });
        });
      social.topics
        .filter((t) => t.user_id === uid && inP(t.created_at))
        .forEach((t) => {
          posts++;
          items.push({ date: t.created_at.split(" ")[0], time: timeOf(t.created_at), icon: MessageSquare, tone: "bg-rose-50 text-rose-600", text: `پرسش «${t.title}»`, meta: "پرسش و پاسخ" });
        });
      const replies = social.posts.filter((x) => x.user_id === uid && inP(x.created_at));
      posts += replies.length;
      // پیام‌ها: یک ردیف خلاصه برای هر روز
      const byDay = new Map<number, { date: string; n: number; chats: Set<string> }>();
      social.messages
        .filter((m) => m.user_id === uid && inP(m.created_at))
        .forEach((m) => {
          messages++;
          const d = m.created_at.split(" ")[0];
          const k = dayNum(d) ?? 0;
          const cur = byDay.get(k) ?? { date: d, n: 0, chats: new Set<string>() };
          cur.n++;
          cur.chats.add(m.chat_id);
          byDay.set(k, cur);
        });
      byDay.forEach((v) => items.push({ date: v.date, time: "", icon: MessageSquare, tone: "bg-sky-50 text-sky-700", text: `${fa(v.n)} پیام در ${fa(v.chats.size)} گفتگو`, meta: "گفتگوها", link: "/dashboard/chat" }));
      // رویدادهایی که پذیرفته/شرکت کرده
      social.eventMembers
        .filter((m) => m.user_id === uid && (m.status === "accepted" || m.status === "joined"))
        .forEach((m) => {
          const ev = social.events.find((e) => e.id === m.event_id);
          if (!ev || !inP(ev.start_date)) return;
          meetings++;
          items.push({ date: ev.start_date, time: ev.start_time, icon: CalendarCheck, tone: "bg-navy-50 text-navy-700", text: `رویداد: ${ev.title}`, meta: ev.is_online ? "برخط" : ev.location, link: `/dashboard/events/${ev.id}` });
        });
    }
    items.sort((a, b) => (dayNum(b.date) ?? 0) - (dayNum(a.date) ?? 0) || b.time.localeCompare(a.time));
    return { items, stats: { done, taskActs, docs, posts, messages, meetings } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pm.projects, km.logs, km.docs, social.content, social.messages, social.eventMembers, name, uid, period.key]);

  const groups = useMemo(() => {
    const m: { date: string; items: Item[] }[] = [];
    items.forEach((i) => {
      const g = m.find((x) => dayNum(x.date) === dayNum(i.date));
      if (g) g.items.push(i);
      else m.push({ date: i.date, items: [i] });
    });
    return m;
  }, [items]);

  const tiles: [string, number, typeof Activity][] = [
    ["تسک انجام‌شده", stats.done, CircleCheck],
    ["اقدام روی تسک‌ها", stats.taskActs, ListChecks],
    ["فعالیت دانشی", stats.docs, BookOpen],
    ["محتوا و پرسش/پاسخ", stats.posts, Newspaper],
    ["پیام", stats.messages, MessageSquare],
    ["جلسه و رویداد", stats.meetings, Users],
  ];

  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-2">
        <Activity size={15} className="text-ink-500" />
        <p className="text-[13px] font-bold text-ink-800">تجمیع فعالیت‌ها</p>
        <span className="text-xs text-ink-400 truncate">— {name} در {period.label}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-ink-100 border-b border-ink-100">
        {tiles.map(([l, v, Icon]) => (
          <div key={l} className="bg-white p-2.5 text-center">
            <Icon size={14} className="mx-auto text-ink-400" />
            <p className="text-base font-bold text-ink-900 mt-0.5">{fa(v)}</p>
            <p className="text-[10px] text-ink-500 leading-tight">{l}</p>
          </div>
        ))}
      </div>
      {groups.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={<Activity size={20} />} title="فعالیتی در این دوره ثبت نشده" description="تسک‌ها، اسناد دانش، محتوا، پیام‌ها و جلسات این شخص این‌جا جمع می‌شوند." />
        </div>
      ) : (
        <div className="p-4 space-y-4 max-h-[560px] overflow-y-auto">
          {groups.map((g) => (
            <div key={g.date}>
              <p className="text-[11px] font-bold text-ink-500 mb-1.5">
                {weekDayNames[weekdayOf(g.date)]} {shortDate(g.date)}
              </p>
              <ol className="relative border-r border-ink-200 mr-3 space-y-2">
                {g.items.map((i, k) => {
                  const body = (
                    <>
                      <p className="text-[13px] text-ink-800 leading-6">{i.text}</p>
                      <p className="text-[11px] text-ink-400">
                        {i.time && <span className="tabular-nums">{i.time}</span>}
                        {i.time && i.meta && " · "}
                        {i.meta}
                      </p>
                    </>
                  );
                  return (
                    <li key={k} className="pr-5 relative">
                      <span className={`absolute -right-3 top-0.5 w-6 h-6 rounded-full flex items-center justify-center ${i.tone}`}>
                        <i.icon size={12} />
                      </span>
                      {i.link ? (
                        <Link to={i.link} className="block hover:opacity-80">
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
