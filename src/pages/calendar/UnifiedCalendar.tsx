// ---------------------------------------------------------------------------
// «تعامل و همکاری › تقویم» — تقویم یکپارچه‌ی شخصی/تیمی (/dashboard/calendar)
// لایه‌ها: رویدادهای اجتماعی، جلسات پروژه، سررسید وظایف، نقاط عطف، مرز اسپرینت‌ها،
// یادآورها/بلوک‌های شخصی (localStorage) و تعطیلات رسمی ۱۴۰۵ — نماهای روز/هفته/ماه/فهرست،
// تقویم تیم (آزاد/مشغول کنار هم) و «یافتن زمان مشترک»، خروجی .ics.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Download, Plus, Search, Users, Sparkles, Eye, EyeOff } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Toggle from "../../components/ui/Toggle";
import { useToast } from "../../components/ui/ToastProvider";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import Avatar from "../../components/Avatar";
import { useTenancy } from "../../context/TenancyContext";
import { useSocial } from "../../context/SocialContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { users } from "../../data/mock";
import { dayNum, fromDayNum, parseJalali, formatJalali, monthNames, monthLength, weekdayOf, weekDayNames, toEnDigits, fa } from "../../pm/jalali";
import { EventEditor, useEventVisibility } from "../social/EventsCalendar";
import { defaultPublish } from "../social/kit";
import { busyOf, collectItems, fmtMin, fmtRange, layerMeta, layerOrder, personalRule, type CalItem, type Layer, type PersonalItem } from "./model";
import { splitDelete, splitEdit, type EditScope } from "../../pm/recurrence";
import type { PMMeeting, ProjectState } from "../../pm/types";
import { SeriesScopeDialog } from "./RecurrenceFields";
import { slotLabel, useAvailability, type Slot } from "./availability";
import { useCalendarStore, type CalView } from "./store";
import { buildIcs, downloadIcs, appUrl } from "./ics";
import { TimeGrid, DayHead, MonthView, AgendaView, MiniMonth, FreeBusyMatrix, ItemPopover, useNowMin, type Column, type PopState, type FbRow } from "./views";
import QuickCreate, { type QuickInit, type QuickEventInput } from "./QuickCreate";

const views: { id: CalView; label: string }[] = [
  { id: "day", label: "روز" },
  { id: "week", label: "هفته" },
  { id: "month", label: "ماه" },
  { id: "list", label: "فهرست" },
];
const durations = [30, 45, 60, 90, 120];
const MAX_TEAM = 6;

export default function UnifiedCalendar() {
  const { actingUser, hasPermission, visibleUserIds, today } = useTenancy();
  const social = useSocial();
  const pm = useProjectsPM();
  const { notify } = useToast();
  const confirm = useConfirm();
  const visibleEvent = useEventVisibility();
  const cal = useCalendarStore(actingUser.id);
  const nowMin = useNowMin();

  const meId = actingUser.id;
  const meName = actingUser.name;
  const todayN = dayNum(today) ?? 0;
  const canEvent = hasPermission("events.create");
  const canTeam = hasPermission("calendar.team");

  const view = cal.prefs.view;
  const layers = cal.prefs.layers;
  const [cursor, setCursor] = useState(todayN);
  const [pop, setPop] = useState<PopState>(null);
  const [quick, setQuick] = useState<QuickInit | null>(null);
  const [fullEditor, setFullEditor] = useState<{ open: boolean; date?: string }>({ open: false });
  const [pendingInvite, setPendingInvite] = useState<{ id: string; ids: string[] } | null>(null);
  const [q, setQ] = useState("");
  const [duration, setDuration] = useState(60);
  const [slot, setSlot] = useState<{ day: number; start: number; end: number } | null | "none">(null);
  const [alts, setAlts] = useState<Slot[]>([]);
  const av = useAvailability();
  const [scopeAsk, setScopeAsk] = useState<{ title: string; run: (s: EditScope) => void } | null>(null);

  const teamOn = canTeam && cal.prefs.teamOn;
  const teamIds = cal.prefs.team.filter((id) => id !== meId && users.some((u) => u.id === id));

  // ---------------------------------------------------------------- بازه‌ی دیده‌شده
  const [jy, jm] = parseJalali(fromDayNum(cursor)) ?? [1405, 1, 1];
  const weekStart = cursor - weekdayOf(fromDayNum(cursor));
  const monthStart = dayNum(formatJalali(jy, jm, 1)) ?? cursor;
  const range: [number, number] =
    view === "day" ? [cursor, cursor] : view === "week" ? [weekStart, weekStart + 6] : view === "month" ? [monthStart, monthStart + monthLength(jy, jm) - 1] : [cursor, cursor + 29];

  const canEditMeeting = (p: ProjectState) => hasPermission("projects.meetings") && !p.meta.archived && (p.meta.manager === meName || p.members.some((m) => (m.userId === meId || m.name === meName) && m.role !== "مشاهده‌گر"));
  const base = { meId, meName, events: social.events, eventMembers: social.eventMembers, visibleEvent, projects: pm.projects, personal: cal.items, canEditMeeting };
  const items = useMemo(
    () => collectItems({ ...base, from: range[0], to: range[1], layers }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [range[0], range[1], layers, social.events, social.eventMembers, pm.projects, cal.items, meId, meName],
  );
  const counts = useMemo(() => {
    const all = collectItems({ ...base, from: range[0], to: range[1], layers: Object.fromEntries(layerOrder.map((l) => [l, true])) as Record<Layer, boolean> });
    const c = Object.fromEntries(layerOrder.map((l) => [l, 0])) as Record<Layer, number>;
    all.forEach((it) => c[it.layer]++);
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range[0], range[1], social.events, social.eventMembers, pm.projects, cal.items, meId, meName]);
  const dotDays = useMemo(() => {
    const set = new Set<number>();
    collectItems({ ...base, from: cursor - 45, to: cursor + 45, layers: { ...layers, holidays: false } }).forEach((it) => set.add(it.day));
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, layers, social.events, social.eventMembers, pm.projects, cal.items, meId, meName]);

  // دعوت‌ها پس از ثبت رویداد تازه در انبار
  useEffect(() => {
    if (!pendingInvite || !social.events.some((x) => x.id === pendingInvite.id)) return;
    const n = social.inviteToEvent(pendingInvite.id, pendingInvite.ids);
    if (n) notify(`${fa(n)} نفر به رویداد دعوت شدند.`, "success");
    setPendingInvite(null);
  }, [pendingInvite, social, notify]);

  // ---------------------------------------------------------------- ناوبری
  const shift = (dir: 1 | -1) => {
    setPop(null);
    if (view === "day") return setCursor((c) => c + dir);
    if (view === "week") return setCursor((c) => c + dir * 7);
    if (view === "list") return setCursor((c) => c + dir * 30);
    const ny = jm + dir > 12 ? jy + 1 : jm + dir < 1 ? jy - 1 : jy;
    const nm = ((jm + dir + 11) % 12) + 1;
    setCursor(dayNum(formatJalali(ny, nm, 1)) ?? cursor);
  };
  const title =
    view === "day"
      ? `${weekDayNames[weekdayOf(fromDayNum(cursor))]} ${fromDayNum(cursor)}`
      : view === "week"
        ? `${fromDayNum(weekStart)} تا ${fromDayNum(weekStart + 6)}`
        : view === "month"
          ? `${monthNames[jm - 1]} ${fa(jy)}`
          : `${fromDayNum(range[0])} تا ${fromDayNum(range[1])}`;
  const setView = (v: CalView) => {
    setPop(null);
    cal.setPrefs({ view: v });
  };

  // ---------------------------------------------------------------- تعامل
  const openItem = (it: CalItem, e: MouseEvent) => setPop({ item: it, x: e.clientX, y: e.clientY });
  const openQuick = (date: string, start = 10 * 60, extra: Partial<QuickInit> = {}) => {
    setPop(null);
    const s = Math.min(start, 21 * 60);
    setQuick({ date, start: s, end: Math.min(s + 60, 22 * 60), mode: "personal", ...extra });
  };

  const saveEvent = (x: QuickEventInput) => {
    const id = social.saveEvent({
      ...defaultPublish({ send_notification: false }),
      title: x.title,
      description: x.description,
      poster: "#1f4f99",
      start_date: x.date,
      end_date: x.date,
      start_time: x.start,
      end_time: x.end,
      is_online: x.is_online,
      meeting_link: x.is_online ? x.place : "",
      location: x.is_online ? "" : x.place,
      capacity: 0,
      add_comment: true,
      show_comment: true,
      is_repeat: false,
      repeat_days: [],
    });
    if (x.invite.length) setPendingInvite({ id, ids: x.invite });
    notify("رویداد ایجاد شد و در تقویم شما قرار گرفت.", "success");
  };

  // ---------------------------------------------------------------- سری‌های تکرارشونده
  const ruleOfPersonal = (x: PersonalItem) => personalRule(x);
  const setRuleOfPersonal = (x: PersonalItem, r: PersonalItem["rrule"]): PersonalItem => ({ ...x, rrule: r, repeat: "none" });
  /** ذخیره‌ی یک قلم شخصی؛ اگر وقوعی از سری ویرایش شده، دامنه پرسیده می‌شود */
  const savePersonal = (next: Omit<PersonalItem, "id"> & { id?: string }, occDate?: string) => {
    const orig = next.id ? cal.items.find((x) => x.id === next.id) : undefined;
    if (!orig || !personalRule(orig) || !occDate) {
      cal.saveItem(next);
      return;
    }
    const apply = (scope: EditScope) => {
      const r = splitEdit(orig, occDate, scope, { ...orig, ...next, id: orig.id } as PersonalItem, ruleOfPersonal, setRuleOfPersonal);
      if (r.update) cal.saveItem(r.update);
      r.create.forEach((c) => cal.saveItem({ ...c, id: undefined }));
      setScopeAsk(null);
      notify(scope === "one" ? "فقط همین وقوع تغییر کرد." : scope === "following" ? "این وقوع و بعدی‌ها تغییر کرد." : "همه‌ی سری به‌روزرسانی شد.", "success");
    };
    setScopeAsk({ title: `ویرایش «${orig.title}»`, run: apply });
  };

  const removePersonal = (id: string, it?: CalItem) => {
    const orig = cal.items.find((x) => x.id === id);
    if (!orig) return;
    const occ = it?.source?.occDate;
    if (personalRule(orig) && occ) {
      setPop(null);
      setScopeAsk({
        title: `حذف «${orig.title}»`,
        run: (scope) => {
          const r = splitDelete(orig, occ, scope, ruleOfPersonal, setRuleOfPersonal);
          if (r) cal.saveItem(r);
          else cal.removeItem(id);
          setScopeAsk(null);
          notify("حذف شد.", "success");
        },
      });
      return;
    }
    confirm({
      title: "حذف یادآور",
      message: `«${orig.title}» حذف شود؟`,
      confirmLabel: "حذف",
      onConfirm: () => {
        cal.removeItem(id);
        setPop(null);
        notify("حذف شد.", "success");
      },
    });
  };
  const editPersonal = (id: string, it?: CalItem) => {
    const orig = cal.items.find((x) => x.id === id);
    if (!orig) return;
    setPop(null);
    setQuick({ date: orig.date, start: 0, end: 0, mode: "personal", edit: orig, occDate: it?.source?.series ? it.source.occDate : undefined });
  };

  /** کشیدن و رها کردن در نمای روز/هفته */
  const moveItem = (it: CalItem, day: number, start: number, end: number) => {
    const src = it.source;
    if (!src) return;
    const date = fromDayNum(day);
    if (src.kind === "personal") {
      const orig = cal.items.find((x) => x.id === src.id);
      if (!orig) return;
      savePersonal({ ...orig, date, start: fmtMin(start), end: fmtMin(end) }, src.series ? src.occDate : undefined);
      if (!src.series) notify(`«${orig.title}» به ${date} ساعت ${fmtMin(start)} منتقل شد.`, "success");
      return;
    }
    if (src.kind === "meeting" && src.pid) {
      const p = pm.getProject(src.pid);
      const m = p?.meetings.find((x) => x.id === src.id);
      if (!p || !m) return;
      const next: PMMeeting = { ...m, date, time: fmtMin(start), duration: end - start };
      const done = (msg: string) => notify(`${msg} شرکت‌کنندگان مطلع شدند.`, "success");
      if (!m.recurrence) {
        pm.saveMeeting(src.pid, next);
        return done(`جلسه‌ی «${m.title}» به ${date} ساعت ${fmtMin(start)} منتقل شد؛`);
      }
      setScopeAsk({
        title: `جابه‌جایی «${m.title}»`,
        run: (scope) => {
          const r = splitEdit(m, src.occDate, scope, next, (x) => x.recurrence, (x, rr) => ({ ...x, recurrence: rr }));
          if (r.update) pm.saveMeeting(src.pid!, r.update);
          r.create.forEach((c) => pm.saveMeeting(src.pid!, { ...c, id: undefined, seriesOf: m.id }));
          setScopeAsk(null);
          done("جلسه جابه‌جا شد؛");
        },
      });
      return;
    }
    if (src.kind === "event") {
      const ev = social.events.find((x) => x.id === src.id);
      if (!ev) return;
      social.saveEvent({
        id: ev.id,
        title: ev.title,
        description: ev.description,
        poster: ev.poster ?? "#1f4f99",
        start_date: date,
        end_date: date,
        start_time: fmtMin(start),
        end_time: fmtMin(end),
        is_online: ev.is_online,
        meeting_link: ev.meeting_link,
        location: ev.location,
        capacity: ev.capacity,
        add_comment: ev.add_comment,
        show_comment: ev.show_comment,
        is_repeat: false,
        repeat_days: [],
        privacy: ev.privacy,
        category_ids: ev.category_ids,
        tags: ev.tags,
        is_draft: ev.is_draft,
        uploaded_files: [],
        send_notification: false,
      });
      notify(`رویداد «${ev.title}» به ${date} ساعت ${fmtMin(start)} منتقل شد.`, "success");
    }
  };

  const exportIcs = () => {
    if (!items.length) return notify("در بازه‌ی دیده‌شده چیزی برای خروجی نیست.", "info");
    const ics = buildIcs(
      items.map((it) => ({
        uid: it.key.replace(/[^\w-]/g, "-"),
        title: it.title,
        date: fromDayNum(it.day),
        start: it.start,
        end: it.end,
        description: [it.sub, it.description].filter(Boolean).join("\n"),
        location: it.location,
        url: it.link ? appUrl(it.link) : undefined,
      })),
      `تقویم ${meName}`,
    );
    const f = (d: number) => toEnDigits(fromDayNum(d)).replace(/\//g, "-");
    downloadIcs(`calendar-${f(range[0])}_${f(range[1])}.ics`, ics);
    notify(`${fa(items.length)} مورد در فایل ‎.ics‎ ذخیره شد.`, "success");
  };

  // ---------------------------------------------------------------- تیم
  const busyCtx = { events: social.events, eventMembers: social.eventMembers, projects: pm.projects, personal: cal.items, meId, canSeeEvent: visibleEvent };
  const people = [{ id: meId, name: meName, color: actingUser.avatarColor }, ...teamIds.map((id) => users.find((u) => u.id === id)!).map((u) => ({ id: u.id, name: u.name, color: u.avatarColor }))];
  const candidates = useMemo(() => {
    const ids = new Set(visibleUserIds());
    return users.filter((u) => u.id !== meId && ids.has(u.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, visibleUserIds]);
  const shown = candidates.filter((u) => !q || u.name.includes(q) || u.role.includes(q));
  const toggleMate = (id: string) => {
    setSlot(null);
    if (teamIds.includes(id)) return cal.setPrefs({ team: teamIds.filter((x) => x !== id) });
    if (teamIds.length >= MAX_TEAM) return notify(`حداکثر ${fa(MAX_TEAM)} همکار را می‌توانید کنار هم ببینید.`, "warning");
    cal.setPrefs({ team: [...teamIds, id] });
  };
  const findSlot = () => {
    if (!teamIds.length) return notify("ابتدا دست‌کم یک همکار انتخاب کنید.", "warning");
    // جلسات، رویدادها، بلوک‌های مشغول، مرخصی‌های کارکرد و تعطیلات — شنبه تا چهارشنبه ۸ تا ۱۶
    const list = av.suggest(people.map((p) => ({ id: p.id, name: p.name })), duration);
    setAlts(list);
    const r = list[0] ?? null;
    setSlot(r ?? "none");
    if (r) {
      setCursor(r.day);
      if (view === "month" || view === "list") cal.setPrefs({ view: "week" });
    }
  };

  const personBlockClick = (p: { id: string; name: string }, b: ReturnType<typeof busyOf>[number], e: MouseEvent) =>
    setPop({
      item: {
        key: `${p.id}:${b.key}`,
        layer: b.source === "رویداد" ? "events" : b.source === "جلسه‌ی پروژه" ? "meetings" : "personal",
        title: b.title,
        day: b.day,
        start: b.start,
        end: b.end,
        color: users.find((u) => u.id === p.id)?.avatarColor ?? "#64748b",
        link: b.link,
        kindLabel: `تقویم ${p.name}`,
        details: [
          ["همکار", p.name],
          ["منبع", b.source],
        ],
      },
      x: e.clientX,
      y: e.clientY,
    });

  // ---------------------------------------------------------------- ستون‌های شبکه‌ی زمانی
  const myColumn = (d: number, key: string, head: Column["head"]): Column => ({
    key,
    day: d,
    head,
    today: d === todayN,
    allDay: items.filter((it) => it.day === d && it.start === null).map((it) => ({ key: it.key, title: it.title, color: it.color, dim: it.dim, onClick: (e: MouseEvent) => openItem(it, e) })),
    blocks: items
      .filter((it) => it.day === d && it.start !== null)
      .map((it) => ({
        key: it.key,
        start: it.start!,
        end: it.end ?? it.start! + 30,
        title: it.title,
        sub: it.sub,
        color: it.color,
        tentative: it.tentative,
        dim: it.dim,
        onClick: (e: MouseEvent) => openItem(it, e),
        onMove: it.editable ? (d2: number, s2: number, e2: number) => moveItem(it, d2, s2, e2) : undefined,
      })),
  });
  let columns: Column[] = [];
  if (view === "week") columns = Array.from({ length: 7 }, (_, i) => weekStart + i).map((d) => myColumn(d, String(d), <DayHead day={d} today={d === todayN} />));
  if (view === "day") {
    columns = [myColumn(cursor, "me", teamOn && teamIds.length ? <PersonHead name="من" color={actingUser.avatarColor} /> : <DayHead day={cursor} today={cursor === todayN} />)];
    if (teamOn)
      people.slice(1).forEach((p) =>
        columns.push({
          key: p.id,
          day: cursor,
          head: <PersonHead name={p.name} color={p.color} />,
          today: cursor === todayN,
          allDay: [],
          slot: false,
          blocks: busyOf(p.id, p.name, cursor, busyCtx).map((b) => ({ key: b.key, start: b.start, end: b.end, title: b.title, sub: b.source, color: p.color, locked: b.title === "مشغول", onClick: (e: MouseEvent) => personBlockClick(p, b, e) })),
        }),
      );
  }
  const fbRows: FbRow[] = people.map((p) => ({ id: p.id, name: p.id === meId ? "من" : p.name, color: p.color, busy: (d) => busyOf(p.id, p.name, d, busyCtx) }));
  const slotObj = slot && slot !== "none" ? slot : null;

  return (
    <div>
      <PageHeader
        title="تقویم"
        description="رویدادها، جلسات، سررسیدها و یادآورهای شما در یک تقویم — به‌همراه زمان آزاد همکاران"
        icon={<CalendarRange size={18} />}
        breadcrumb={[{ label: "تعامل و همکاری" }, { label: "تقویم" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" icon={<Download size={14} />} onClick={exportIcs} title="خروجی ‎.ics‎ از بازه‌ی دیده‌شده">
              <span className="hidden sm:inline">خروجی ‎.ics‎</span>
            </Button>
            <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={() => openQuick(fromDayNum(view === "day" ? cursor : todayN))}>
              افزودن
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_270px] gap-4">
        {/* ---------------------------------------------------------- تقویم */}
        <section className="card p-3 sm:p-4 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-1">
              <button onClick={() => shift(-1)} className="p-1.5 rounded-md border border-ink-200 text-ink-600 hover:bg-ink-50" aria-label="قبلی">
                <ChevronRight size={15} />
              </button>
              <button onClick={() => shift(1)} className="p-1.5 rounded-md border border-ink-200 text-ink-600 hover:bg-ink-50" aria-label="بعدی">
                <ChevronLeft size={15} />
              </button>
              <Button size="sm" variant="ghost" onClick={() => setCursor(todayN)}>
                امروز
              </Button>
              <h2 className="text-sm sm:text-base font-bold text-ink-900 mr-1">{title}</h2>
            </div>
            <div className="flex rounded-lg border border-ink-200 p-0.5 bg-ink-50">
              {views.map((v) => (
                <button key={v.id} onClick={() => setView(v.id)} className={`text-xs px-2.5 py-1 rounded-md ${view === v.id ? "bg-white shadow-sm text-brand-700 font-medium" : "text-ink-500 hover:text-ink-800"}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {teamOn && teamIds.length > 0 && view === "week" && (
            <div className="rounded-lg border border-ink-100 p-2.5 mb-3">
              <p className="text-xs font-bold text-ink-700 mb-1.5 flex items-center gap-1.5">
                <Users size={13} className="text-brand-600" /> آزاد / مشغول تیم
              </p>
              <FreeBusyMatrix
                days={Array.from({ length: 7 }, (_, i) => weekStart + i)}
                rows={fbRows}
                todayN={todayN}
                highlight={slotObj}
                onDay={(d) => {
                  setCursor(d);
                  setView("day");
                }}
              />
            </div>
          )}
          {teamOn && teamIds.length > 0 && (view === "month" || view === "list") && <p className="text-[11.5px] text-ink-500 mb-3 rounded-lg bg-ink-50 px-3 py-2">تقویم همکاران در نمای «روز» (کنار هم) و «هفته» (آزاد/مشغول) نمایش داده می‌شود.</p>}

          {(view === "day" || view === "week") && (
            <TimeGrid
              columns={columns}
              nowMin={nowMin}
              minColWidth={view === "day" ? 130 : 88}
              onSlot={(col, min) => openQuick(fromDayNum(col.day), min, teamOn && teamIds.length && canEvent ? { mode: "event", invite: teamIds } : {})}
            />
          )}
          {view === "month" && <MonthView jy={jy} jm={jm} todayN={todayN} items={items} onItem={openItem} onPick={(d) => openQuick(fromDayNum(d))} />}
          {view === "list" && <AgendaView from={range[0]} to={range[1]} todayN={todayN} items={items} onItem={openItem} />}
        </section>

        {/* ---------------------------------------------------------- ستون کناری */}
        <aside className="space-y-4 min-w-0">
          <div className="card p-3">
            <MiniMonth
              cursor={cursor}
              todayN={todayN}
              range={range}
              hasItems={(d) => dotDays.has(d)}
              onPick={(d) => {
                setPop(null);
                setCursor(d);
              }}
            />
          </div>

          <div className="card p-4">
            <p className="text-sm font-bold text-ink-900 mb-2">لایه‌ها</p>
            <div className="space-y-0.5">
              {layerOrder.map((l) => {
                const on = layers[l];
                return (
                  <button
                    key={l}
                    onClick={() => cal.setPrefs({ layers: { ...layers, [l]: !on } })}
                    className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-right hover:bg-ink-50 ${on ? "" : "opacity-50"}`}
                    aria-pressed={on}
                  >
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: on ? layerMeta[l].color : "transparent", border: `2px solid ${layerMeta[l].color}` }} />
                    <span className="flex-1 text-[12.5px] text-ink-700 truncate">{layerMeta[l].label}</span>
                    <span className="text-[10.5px] text-ink-400 tabular-nums">{fa(counts[l])}</span>
                    {on ? <Eye size={12} className="text-ink-400" /> : <EyeOff size={12} className="text-ink-400" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[10.5px] text-ink-400 mt-2 leading-5">جمعه‌ها و تعطیلات رسمی سایه‌دارند. تاریخ تعطیلات قمری با رؤیت هلال قطعی می‌شود.</p>
          </div>

          {canTeam && (
            <div className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
                  <Users size={15} className="text-brand-600" /> تقویم تیم
                </p>
                <Toggle
                  on={teamOn}
                  onChange={() => {
                    setSlot(null);
                    cal.setPrefs({ teamOn: !cal.prefs.teamOn });
                  }}
                  label="تقویم تیم"
                />
              </div>
              {teamOn && (
                <div className="mt-3 space-y-3">
                  {teamIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {teamIds.map((id) => {
                        const u = users.find((x) => x.id === id)!;
                        return (
                          <button key={id} onClick={() => toggleMate(id)} className="flex items-center gap-1 rounded-full border border-ink-200 pl-2 pr-0.5 py-0.5 text-[11px] text-ink-700 hover:border-rose-300" title="حذف از تیم">
                            <Avatar name={u.name} color={u.avatarColor} size={18} />
                            <span className="max-w-[90px] truncate">{u.name}</span>×
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="relative">
                    <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input className="input-field !pr-8 !py-1.5 text-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی همکار…" aria-label="جستجوی همکار" />
                  </div>
                  <div className="max-h-44 overflow-y-auto -mx-1 px-1 space-y-0.5">
                    {shown.length === 0 && <p className="text-[11.5px] text-ink-400">همکاری در محدوده‌ی دسترسی شما پیدا نشد.</p>}
                    {shown.map((u) => {
                      const on = teamIds.includes(u.id);
                      return (
                        <label key={u.id} className={`flex items-center gap-2 rounded-md px-1.5 py-1 cursor-pointer hover:bg-ink-50 ${on ? "bg-brand-50" : ""}`}>
                          <input type="checkbox" className="accent-[var(--color-brand-600)]" checked={on} onChange={() => toggleMate(u.id)} />
                          <Avatar name={u.name} color={u.avatarColor} size={22} />
                          <span className="min-w-0">
                            <span className="block text-[12px] text-ink-800 truncate">{u.name}</span>
                            <span className="block text-[10.5px] text-ink-400 truncate">{u.role}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="rounded-lg border border-ink-100 p-3 space-y-2">
                    <p className="text-xs font-bold text-ink-700 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-600" /> یافتن زمان مشترک
                    </p>
                    <div className="flex items-center gap-2">
                      <select className="input-field !py-1.5 text-xs flex-1" value={duration} onChange={(e) => {
                          setDuration(Number(e.target.value));
                          setSlot(null);
                        }} aria-label="مدت جلسه">
                        {durations.map((d) => (
                          <option key={d} value={d}>
                            {d < 60 ? `${fa(d)} دقیقه` : `${fa(d / 60)} ساعت`}
                          </option>
                        ))}
                      </select>
                      <Button size="sm" variant="primary" onClick={findSlot}>
                        بیاب
                      </Button>
                    </div>
                    <p className="text-[10.5px] text-ink-400 leading-5">ساعات اداری شنبه تا چهارشنبه (۸ تا ۱۶)، با درنظرگرفتن جلسات، مرخصی‌ها و تعطیلات، برای شما و {fa(teamIds.length)} همکار.</p>
                    {slot === "none" && <p className="text-[11.5px] text-rose-600">در ۲۰ روز کاری آینده زمان آزاد مشترکی با این مدت پیدا نشد.</p>}
                    {slotObj && (
                      <div className="rounded-md bg-emerald-50 border border-emerald-200 p-2.5 space-y-2">
                        <p className="text-[12.5px] text-emerald-700 font-medium">
                          {weekDayNames[weekdayOf(fromDayNum(slotObj.day))]} {fromDayNum(slotObj.day)} · {fmtRange(slotObj.start, slotObj.end)}
                        </p>
                        {alts.length > 1 && (
                          <div className="flex flex-wrap gap-1">
                            {alts.map((a) => {
                              const on = a.day === slotObj.day && a.start === slotObj.start;
                              return (
                                <button
                                  key={`${a.day}-${a.start}`}
                                  type="button"
                                  onClick={() => {
                                    setSlot(a);
                                    setCursor(a.day);
                                  }}
                                  className={`text-[10.5px] px-1.5 py-0.5 rounded border tabular-nums ${on ? "border-emerald-500 bg-white text-emerald-800" : "border-emerald-200 text-emerald-700 hover:bg-white"}`}
                                  title={slotLabel(a)}
                                >
                                  {fromDayNum(a.day).slice(5)} · {fmtMin(a.start)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => openQuick(fromDayNum(slotObj.day), slotObj.start, { end: slotObj.end, mode: canEvent ? "event" : "personal", invite: teamIds })}
                          >
                            {canEvent ? "ایجاد جلسه و دعوت" : "رزرو در تقویم من"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setCursor(slotObj.day);
                              setView("day");
                            }}
                          >
                            نمایش روز
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!teamOn && <p className="text-[11.5px] text-ink-400 mt-2 leading-5">زمان‌های مشغول همکاران را کنار تقویم خود ببینید و زمان مشترک برای جلسه پیدا کنید.</p>}
            </div>
          )}
        </aside>
      </div>

      <ItemPopover pop={pop} onClose={() => setPop(null)} onEdit={editPersonal} onDelete={removePersonal} />
      <QuickCreate
        init={quick}
        onClose={() => setQuick(null)}
        canEvent={canEvent}
        meId={meId}
        onSavePersonal={(it) => savePersonal(it, quick?.occDate)}
        onSaveEvent={saveEvent}
        onOpenFull={(date) => setFullEditor({ open: true, date })}
      />
      {canEvent && <EventEditor open={fullEditor.open} initialDate={fullEditor.date} onClose={() => setFullEditor({ open: false })} />}
      <SeriesScopeDialog open={!!scopeAsk} title={scopeAsk?.title ?? ""} onPick={(sc) => scopeAsk?.run(sc)} onClose={() => setScopeAsk(null)} />
    </div>
  );
}

function PersonHead({ name, color }: { name: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <Avatar name={name} color={color} size={24} />
      <span className="block text-[11px] text-ink-700 truncate max-w-full">{name}</span>
    </div>
  );
}

