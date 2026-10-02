// ---------------------------------------------------------------------------
// «تعامل و همکاری › رویداد و جلسات» — مدیریت رویدادها (فهرست / ماه / هفته) روی ماژول events
// از Motoshub Social API، به‌همراه «جلسات پروژه» (فقط‌خواندنی از ProjectsContext) و «دعوت‌های من».
// ویرایشگر رویداد (EventEditor) هم‌شکل EventStoreRequest است و از صفحه‌ی جزئیات هم استفاده می‌شود.
// تقویم یکپارچه‌ی شخصی/تیمی جداگانه در /dashboard/calendar است.
// ---------------------------------------------------------------------------
import ModuleReportsButton from "../../reports/ModuleReportsButton";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarDays, ChevronRight, ChevronLeft, Plus, Video, MapPin, Repeat, Check, X, Clock, CalendarClock, MailQuestion, Users, ExternalLink, CalendarRange } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import EmptyState from "../../components/ui/EmptyState";
import Tabs from "../../components/ui/Tabs";
import JalaliDatePicker from "../../components/ui/JalaliDatePicker";
import { useToast } from "../../components/ui/ToastProvider";
import { useTenancy } from "../../context/TenancyContext";
import { useSocial, type EventInput } from "../../context/SocialContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { endpoints } from "../../social/endpoints";
import type { Attachment, SocialEvent } from "../../social/types";
import type { PMMeeting } from "../../pm/types";
import { eventStatusLabel } from "../../social/types";
import { dayNum, fromDayNum, parseJalali, monthNames, weekDayNames, monthLength, weekdayOf, formatJalali, toEnDigits, fa } from "../../pm/jalali";
import { ApiChip, Field, UserPicker, PosterPicker, AttachmentPicker, AttachmentList, PublishOptions, defaultPublish, type PublishState } from "./kit";

// ---------------------------------------------------------------- کمکی‌ها (مشترک با EventDetail)
const dn = (s: string) => dayNum(s) ?? 0;
/** «۰۹:۳۰» → 930 برای مرتب‌سازی */
export const timeKey = (t: string) => Number(toEnDigits(t || "").replace(/[^\d]/g, "")) || 0;

/** آیا رویداد در این روز برگزار می‌شود؟ (بازه‌ی start..end یا تکرار هفتگی repeat_days با ۰ = شنبه) */
export function occursOn(ev: SocialEvent, day: number): boolean {
  const s = dn(ev.start_date);
  const e = Math.max(s, dn(ev.end_date || ev.start_date));
  if (day >= s && day <= e) return true;
  if (ev.is_repeat && ev.repeat_days.length && day >= s) return ev.repeat_days.includes(weekdayOf(fromDayNum(day)));
  return false;
}

/** نمایش‌پذیری: privacy + پیش‌نویس/لغو انتشار فقط برای صاحب و مدیر */
export function useEventVisibility() {
  const { canView, me } = useSocial();
  const { hasPermission } = useTenancy();
  const manage = hasPermission("events.manage");
  return (ev: SocialEvent) => canView(ev, manage) && ((!ev.is_draft && ev.is_public) || ev.user_id === me || manage);
}

const chipStyle = (c: string | null) => ({ background: `color-mix(in srgb, ${c ?? "#1f4f99"} 14%, transparent)`, borderInlineStart: `3px solid ${c ?? "#1f4f99"}` });

type View = "month" | "week" | "list";
type Scope = "all" | "mine";
type PageTab = "events" | "meetings" | "invites";
const pageTabs: PageTab[] = ["events", "meetings", "invites"];
type Mode = "all" | "online" | "offline";

// ---------------------------------------------------------------- صفحه
export default function EventsCalendar() {
  const s = useSocial();
  const { hasPermission } = useTenancy();
  const { notify } = useToast();
  const visible = useEventVisibility();
  const canCreate = hasPermission("events.create");
  const todayN = dn(s.today);

  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab") as PageTab | null;
  const tab: PageTab = tabParam && pageTabs.includes(tabParam) ? tabParam : "events";
  const setTab = (t: PageTab) => {
    const next = new URLSearchParams(params);
    if (t === "events") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
  };
  const [view, setView] = useState<View>("list");
  const [cursor, setCursor] = useState(todayN);
  const [scope, setScope] = useState<Scope>("all");
  const [cat, setCat] = useState("");
  const [mode, setMode] = useState<Mode>("all");
  const [editor, setEditor] = useState<{ open: boolean; date?: string }>({ open: false });

  const cats = s.categoriesOf("event");
  const events = useMemo(
    () =>
      s.events.filter((ev) => {
        if (!visible(ev)) return false;
        const mine = s.myEventStatus(ev.id);
        if (scope === "mine" && !mine && ev.user_id !== s.me) return false;
        if (cat && !ev.category_ids.includes(cat)) return false;
        if (mode === "online" && !ev.is_online) return false;
        if (mode === "offline" && ev.is_online) return false;
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.events, s.eventMembers, scope, cat, mode, s.me],
  );
  const onDay = (day: number) => events.filter((ev) => occursOn(ev, day)).sort((a, b) => timeKey(a.start_time) - timeKey(b.start_time));

  // ماه جاری نما
  const [jy, jm] = parseJalali(fromDayNum(cursor)) ?? [1405, 1, 1];
  const monthStart = dn(formatJalali(jy, jm, 1));
  const weekStart = cursor - weekdayOf(fromDayNum(cursor));

  const shift = (dir: 1 | -1) => {
    if (view === "week") return setCursor((c) => c + dir * 7);
    if (view === "list") return setCursor((c) => c + dir * 30);
    const ny = jm + dir > 12 ? jy + 1 : jm + dir < 1 ? jy - 1 : jy;
    const nm = ((jm + dir + 11) % 12) + 1;
    setCursor(dn(formatJalali(ny, nm, 1)));
  };
  const title =
    view === "week"
      ? `${fromDayNum(weekStart)} تا ${fromDayNum(weekStart + 6)}`
      : view === "list"
        ? `از ${fromDayNum(Math.max(cursor, todayN))}`
        : `${monthNames[jm - 1]} ${fa(jy)}`;

  const openNew = (date?: string) => {
    if (!canCreate) return;
    setEditor({ open: true, date });
  };

  // ستون کناری
  const allVisible = s.events.filter(visible);
  const pending = allVisible.filter((ev) => s.myEventStatus(ev.id)?.status === "invited" && dn(ev.end_date || ev.start_date) >= todayN);
  const upcoming = allVisible
    .filter((ev) => {
      const m = s.myEventStatus(ev.id);
      return m && (m.status === "accepted" || m.status === "joined") && (dn(ev.start_date) >= todayN || (ev.is_repeat && ev.repeat_days.length));
    })
    .map((ev) => ({ ev, next: nextOccurrence(ev, todayN) }))
    .filter((x) => x.next !== null)
    .sort((a, b) => a.next! - b.next! || timeKey(a.ev.start_time) - timeKey(b.ev.start_time))
    .slice(0, 5);
  const stats = s.dashboard("events", "user");
  const upcomingMeetings = useMyProjectMeetings().filter((x) => x.mine && dn(x.mt.date) >= todayN && x.mt.status === "برنامه‌ریزی‌شده").length;

  const answer = (id: string, status: "accepted" | "declined") => {
    const r = s.rsvp(id, status);
    if (r.ok) notify(status === "accepted" ? "حضور شما ثبت شد." : "پاسخ «نمی‌آیم» ثبت شد.", "success");
    else notify(r.error, "warning");
  };

  return (
    <div>
      <PageHeader
        title="رویداد و جلسات"
        description="ساخت و مدیریت رویدادها، دعوت‌ها و پاسخ‌ها — به‌همراه جلسات پروژه‌های شما"
        icon={<CalendarDays size={18} />}
        breadcrumb={[{ label: "تعامل و همکاری" }, { label: "رویداد و جلسات" }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ModuleReportsButton module="events" />
            <ApiChip
              items={[
                { label: "فهرست رویدادهای منتشرشده", ep: endpoints.eventList() },
                { label: "پیش‌نویس‌ها (صاحب/مدیر)", ep: { method: "GET", path: "/events/events/drafted/" } },
                { label: "ایجاد رویداد", ep: endpoints.eventCreate() },
                { label: "دعوت از کاربران", ep: endpoints.eventInvite("{id}") },
                { label: "پاسخ به دعوت (rsvp)", ep: endpoints.eventRsvp("{id}") },
                { label: "دسته‌های رویداد", ep: endpoints.categories("event") },
                { label: "آمار کاربر", ep: endpoints.dashboard("events/events", "user") },
              ]}
            />
            <Link to="/dashboard/calendar" className="inline-flex">
              <Button icon={<CalendarRange size={14} />}>
                <span className="hidden sm:inline">تقویم من</span>
              </Button>
            </Link>
            {canCreate && (
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => openNew(s.today)}>
                رویداد جدید
              </Button>
            )}
          </div>
        }
      />

      <Tabs<PageTab>
        tabs={[
          { id: "events", label: "رویدادها" },
          { id: "meetings", label: "جلسات پروژه", count: upcomingMeetings || undefined },
          { id: "invites", label: "دعوت‌های من", count: pending.length || undefined },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "meetings" && <ProjectMeetingsTab />}
      {tab === "invites" && <InvitesTab />}

      {tab === "events" && (
      <>
      {/* نوار ابزار: نما + فیلترها */}
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { id: "list", label: "فهرست" },
            { id: "month", label: "ماه" },
            { id: "week", label: "هفته" },
          ]}
        />
        <Segmented<Scope>
          value={scope}
          onChange={setScope}
          options={[
            { id: "all", label: "همه" },
            { id: "mine", label: "رویدادهای من" },
          ]}
        />
        <select className="input-field !w-auto !py-1.5 text-xs" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="دسته">
          <option value="">همه‌ی دسته‌ها</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <select className="input-field !w-auto !py-1.5 text-xs" value={mode} onChange={(e) => setMode(e.target.value as Mode)} aria-label="نوع برگزاری">
          <option value="all">حضوری و آنلاین</option>
          <option value="online">فقط آنلاین</option>
          <option value="offline">فقط حضوری</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* ستون کناری — در موبایل بالای تقویم */}
        <aside className="space-y-4 lg:order-2">
          <div className="card p-4">
            <p className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-1.5">
              <MailQuestion size={15} className="text-amber-600" /> دعوت‌های در انتظار پاسخ
              {pending.length > 0 && <Badge tone="warning">{fa(pending.length)}</Badge>}
            </p>
            {pending.length === 0 && <p className="text-xs text-ink-400">دعوت بی‌پاسخی ندارید.</p>}
            <div className="space-y-2.5">
              {pending.map((ev) => (
                <div key={ev.id} className="rounded-lg border border-ink-100 p-2.5">
                  <Link to={`/dashboard/events/${ev.id}`} className="block text-[12.5px] font-medium text-ink-800 hover:text-brand-700 truncate">
                    {ev.title}
                  </Link>
                  <p className="text-[11px] text-ink-400 mt-0.5">
                    {ev.start_date} · {ev.start_time} · از طرف {s.userName(ev.user_id)}
                  </p>
                  <div className="flex gap-1.5 mt-2">
                    <Button size="sm" variant="primary" icon={<Check size={13} />} onClick={() => answer(ev.id, "accepted")}>
                      می‌آیم
                    </Button>
                    <Button size="sm" variant="secondary" icon={<X size={13} />} onClick={() => answer(ev.id, "declined")}>
                      نمی‌آیم
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <p className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-1.5">
              <CalendarClock size={15} className="text-brand-600" /> پیش‌روی من
            </p>
            {upcoming.length === 0 && <p className="text-xs text-ink-400">رویداد پیش‌رویی ثبت‌نام نکرده‌اید.</p>}
            <div className="space-y-1.5">
              {upcoming.map(({ ev, next }) => (
                <Link key={ev.id} to={`/dashboard/events/${ev.id}`} className="block rounded-md px-2.5 py-1.5 hover:opacity-90" style={chipStyle(ev.poster)}>
                  <span className="block text-[12px] font-medium text-ink-800 truncate">{ev.title}</span>
                  <span className="block text-[10.5px] text-ink-500">
                    {next === todayN ? "امروز" : fromDayNum(next!)} · {ev.start_time}
                  </span>
                </Link>
              ))}
            </div>
            {stats.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-ink-100 text-[11px] text-ink-500">
                {stats.map((x) => (
                  <span key={x.key}>
                    {x.title}: <b className="text-ink-800">{fa(x.value)}</b>
                  </span>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* تقویم */}
        <section className="card p-3 sm:p-4 min-w-0 lg:order-1">
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
            </div>
            <h2 className="text-base font-bold text-ink-900">{title}</h2>
          </div>

          {view === "month" && (
            <MonthGrid jy={jy} jm={jm} monthStart={monthStart} todayN={todayN} onDay={onDay} onPick={canCreate ? (d) => openNew(fromDayNum(d)) : undefined} />
          )}
          {view === "week" && <WeekGrid weekStart={weekStart} todayN={todayN} onDay={onDay} />}
          {view === "list" && <ListView from={Math.max(cursor, todayN)} todayN={todayN} events={events} />}
        </section>
      </div>
      </>
      )}

      <EventEditor open={editor.open} initialDate={editor.date} onClose={() => setEditor({ open: false })} />
    </div>
  );
}

/** نزدیک‌ترین روز برگزاری از امروز به بعد (تا ۹۰ روز) */
function nextOccurrence(ev: SocialEvent, from: number): number | null {
  for (let d = from; d < from + 90; d++) if (occursOn(ev, d)) return d;
  return null;
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="flex rounded-lg border border-ink-200 p-0.5 bg-ink-50">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} className={`text-xs px-2.5 py-1 rounded-md ${value === o.id ? "bg-white shadow-sm text-brand-700 font-medium" : "text-ink-500 hover:text-ink-800"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function EventChip({ ev, compact = false }: { ev: SocialEvent; compact?: boolean }) {
  return (
    <Link
      to={`/dashboard/events/${ev.id}`}
      onClick={(e) => e.stopPropagation()}
      title={`${ev.title} — ${ev.start_time}`}
      className="block rounded px-1.5 py-0.5 text-[10.5px] leading-4 text-ink-800 truncate hover:opacity-80"
      style={chipStyle(ev.poster)}
    >
      {!compact && <span className="text-ink-500 ml-1 tabular-nums">{ev.start_time}</span>}
      {ev.is_repeat && <Repeat size={9} className="inline ml-0.5 text-ink-400" />}
      {ev.title}
    </Link>
  );
}

// ---------------------------------------------------------------- ماه
function MonthGrid({ jy, jm, monthStart, todayN, onDay, onPick }: { jy: number; jm: number; monthStart: number; todayN: number; onDay: (d: number) => SocialEvent[]; onPick?: (d: number) => void }) {
  const offset = weekdayOf(fromDayNum(monthStart));
  const len = monthLength(jy, jm);
  const cells = Array.from({ length: Math.ceil((offset + len) / 7) * 7 }, (_, i) => (i - offset >= 0 && i - offset < len ? monthStart + i - offset : null));
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDayNames.map((w) => (
          <div key={w} className="text-center text-[10.5px] sm:text-[11px] text-ink-400 py-1">
            <span className="sm:hidden">{w.slice(0, 1)}</span>
            <span className="hidden sm:inline">{w}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="min-h-[56px] sm:min-h-[96px] rounded-lg bg-ink-50/50" />;
          const list = onDay(d);
          const isToday = d === todayN;
          return (
            <div
              key={i}
              onClick={() => onPick?.(d)}
              className={`min-h-[56px] sm:min-h-[96px] rounded-lg border p-1 min-w-0 ${isToday ? "border-brand-400 bg-brand-50/40" : "border-ink-100"} ${onPick ? "cursor-pointer hover:border-brand-200" : ""} ${d < todayN ? "opacity-70" : ""}`}
              title={onPick ? "کلیک: رویداد جدید در این روز" : undefined}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[11px] tabular-nums ${isToday ? "bg-brand-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold" : "text-ink-600"}`}>{fa(d - monthStart + 1)}</span>
              </div>
              {/* موبایل: نقطه‌ی رنگی */}
              <div className="flex flex-wrap gap-0.5 sm:hidden">
                {list.slice(0, 4).map((ev) => (
                  <Link key={ev.id} to={`/dashboard/events/${ev.id}`} onClick={(e) => e.stopPropagation()} className="w-2 h-2 rounded-full" style={{ background: ev.poster ?? "#1f4f99" }} aria-label={ev.title} />
                ))}
              </div>
              <div className="hidden sm:block space-y-0.5">
                {list.slice(0, 3).map((ev) => (
                  <EventChip key={ev.id} ev={ev} compact />
                ))}
                {list.length > 3 && <span className="block text-[10px] text-ink-400 px-1">+{fa(list.length - 3)} رویداد دیگر</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- هفته
function WeekGrid({ weekStart, todayN, onDay }: { weekStart: number; todayN: number; onDay: (d: number) => SocialEvent[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
      {Array.from({ length: 7 }, (_, i) => weekStart + i).map((d, i) => {
        const list = onDay(d);
        const isToday = d === todayN;
        return (
          <div key={d} className={`rounded-lg border p-2 min-w-0 sm:min-h-[220px] ${isToday ? "border-brand-400 bg-brand-50/40" : "border-ink-100"}`}>
            <p className={`text-[11.5px] mb-2 flex sm:block items-center gap-2 ${isToday ? "text-brand-700 font-bold" : "text-ink-600"}`}>
              <span className="block">{weekDayNames[i]}</span>
              <span className="block text-[10.5px] text-ink-400 font-normal">{fromDayNum(d)}</span>
            </p>
            <div className="space-y-1">
              {list.map((ev) => (
                <Link key={ev.id} to={`/dashboard/events/${ev.id}`} className="block rounded-md px-1.5 py-1 hover:opacity-85" style={chipStyle(ev.poster)}>
                  <span className="block text-[10.5px] text-ink-500 tabular-nums">
                    {ev.start_time}–{ev.end_time}
                  </span>
                  <span className="block text-[11.5px] font-medium text-ink-800 leading-5 break-words">{ev.title}</span>
                  <span className="block text-[10px] text-ink-400 truncate">{ev.is_online ? "آنلاین" : ev.location || "حضوری"}</span>
                </Link>
              ))}
              {list.length === 0 && <p className="text-[10.5px] text-ink-300">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- فهرست
function ListView({ from, todayN, events }: { from: number; todayN: number; events: SocialEvent[] }) {
  const s = useSocial();
  const groups: { day: number; list: SocialEvent[] }[] = [];
  for (let d = from; d < from + 60; d++) {
    const list = events
      .filter((ev) => (ev.is_repeat && ev.repeat_days.length ? occursOn(ev, d) : Math.max(dn(ev.start_date), from) === d && occursOn(ev, d)))
      .sort((a, b) => timeKey(a.start_time) - timeKey(b.start_time));
    if (list.length) groups.push({ day: d, list });
  }
  if (!groups.length) return <EmptyState icon={<CalendarDays size={22} />} title="رویدادی در ۶۰ روز آینده نیست" description="فیلترها را تغییر دهید یا رویداد جدیدی بسازید." />;
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.day}>
          <p className="text-xs font-bold text-ink-700 mb-1.5">
            {weekDayNames[weekdayOf(fromDayNum(g.day))]} {fromDayNum(g.day)} {g.day === todayN && <Badge tone="brand">امروز</Badge>}
          </p>
          <div className="space-y-1.5">
            {g.list.map((ev) => {
              const st = s.myEventStatus(ev.id);
              return (
                <Link key={ev.id} to={`/dashboard/events/${ev.id}`} className="flex items-center gap-3 rounded-lg border border-ink-100 p-2.5 hover:bg-ink-50">
                  <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: ev.poster ?? "#1f4f99" }} />
                  <span className="text-[11.5px] text-ink-500 tabular-nums shrink-0 w-[74px]">
                    <Clock size={11} className="inline ml-1" />
                    {ev.start_time}–{ev.end_time}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-ink-800 truncate">{ev.title}</span>
                    <span className="block text-[11px] text-ink-400 truncate">
                      {ev.is_online ? (
                        <>
                          <Video size={11} className="inline ml-1" />
                          آنلاین
                        </>
                      ) : (
                        <>
                          <MapPin size={11} className="inline ml-1" />
                          {ev.location || "حضوری"}
                        </>
                      )}
                    </span>
                  </span>
                  {st && <Badge tone={st.status === "invited" ? "warning" : st.status === "declined" ? "neutral" : "success"}>{st.member_type === "owner" ? "برگزارکننده" : eventStatusLabel[st.status]}</Badge>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- جلسات پروژه (فقط‌خواندنی)
type MeetingRow = { pid: string; project: string; color: string; mt: PMMeeting; mine: boolean };

/** جلسات پروژه‌هایی که کاربر می‌بیند (محدوده‌ی سازمانی + عمومی یا عضو) */
function useMyProjectMeetings(): MeetingRow[] {
  const pm = useProjectsPM();
  const { filterScoped, actingUser } = useTenancy();
  return useMemo(() => {
    const me = actingUser.name;
    const visible = filterScoped(pm.projects.map((p) => ({ ...p.meta, _p: p }))).map((x) => x._p);
    return visible
      .filter((p) => !p.meta.archived)
      .flatMap((p) => {
        const member = p.meta.manager === me || p.members.some((m) => m.userId === actingUser.id || m.name === me);
        return p.meetings
          .filter((mt) => member || p.meta.visibility === "عمومی سازمان" || mt.participants.includes(me))
          .map((mt) => ({ pid: p.meta.id, project: p.meta.name, color: p.meta.color, mt, mine: mt.participants.includes(me) }));
      });
  }, [pm.projects, filterScoped, actingUser]);
}

const meetingTone: Record<string, "brand" | "success" | "neutral"> = { "برنامه‌ریزی‌شده": "brand", "برگزارشده": "success", "لغوشده": "neutral" };

function ProjectMeetingsTab() {
  const rows = useMyProjectMeetings();
  const s = useSocial();
  const todayN = dn(s.today);
  const [when, setWhen] = useState<"upcoming" | "past" | "all">("upcoming");
  const [who, setWho] = useState<"mine" | "all">("mine");
  const list = rows
    .filter((r) => (who === "mine" ? r.mine : true))
    .filter((r) => (when === "upcoming" ? dn(r.mt.date) >= todayN : when === "past" ? dn(r.mt.date) < todayN : true))
    .sort((a, b) => (when === "past" ? -1 : 1) * (dn(a.mt.date) - dn(b.mt.date) || timeKey(a.mt.time) - timeKey(b.mt.time)));
  return (
    <div>
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          value={when}
          onChange={setWhen}
          options={[
            { id: "upcoming", label: "پیش‌رو" },
            { id: "past", label: "گذشته" },
            { id: "all", label: "همه" },
          ]}
        />
        <Segmented
          value={who}
          onChange={setWho}
          options={[
            { id: "mine", label: "جلساتی که در آن هستم" },
            { id: "all", label: "همه‌ی جلسات پروژه‌ها" },
          ]}
        />
        <span className="text-[11px] text-ink-400 mr-auto">ثبت و ویرایش جلسه از تب «جلسات» هر پروژه انجام می‌شود.</span>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Users size={22} />} title="جلسه‌ای پیدا نشد" description="فیلتر زمان یا «همه‌ی جلسات پروژه‌ها» را امتحان کنید." />
      ) : (
        <div className="card divide-y divide-ink-100">
          {list.map((r) => (
            <Link key={`${r.pid}:${r.mt.id}`} to={`/dashboard/projects/${r.pid}?tab=minutes&focus=${r.mt.id}`} className={`flex items-center gap-3 p-3 hover:bg-ink-50 ${r.mt.status === "لغوشده" ? "opacity-60" : ""}`}>
              <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: r.color }} />
              <span className="shrink-0 w-[86px] text-[11.5px] text-ink-500 tabular-nums">
                <span className="block text-ink-700">{r.mt.date}</span>
                <span className="block">
                  <Clock size={11} className="inline ml-1" />
                  {r.mt.time} · {fa(r.mt.duration)} دقیقه
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[13px] font-medium text-ink-800 truncate ${r.mt.status === "لغوشده" ? "line-through" : ""}`}>{r.mt.title}</span>
                <span className="block text-[11px] text-ink-400 truncate">
                  {r.project} · {r.mt.mode === "ویدیویی" ? <Video size={11} className="inline mx-0.5" /> : <MapPin size={11} className="inline mx-0.5" />}
                  {r.mt.mode} · {fa(r.mt.participants.length)} شرکت‌کننده
                </span>
              </span>
              <span className="hidden sm:flex items-center gap-1.5 shrink-0">
                {r.mine && <Badge tone="navy">شرکت‌کننده‌ام</Badge>}
                <Badge tone={meetingTone[r.mt.status] ?? "neutral"}>{r.mt.status}</Badge>
              </span>
              <ExternalLink size={13} className="text-ink-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- دعوت‌های من
function InvitesTab() {
  const s = useSocial();
  const { notify } = useToast();
  const visible = useEventVisibility();
  const todayN = dn(s.today);
  const [changing, setChanging] = useState<string | null>(null);
  const rows = s.eventMembers
    .filter((m) => m.user_id === s.me && m.member_type !== "owner" && m.status !== "joined")
    .map((m) => ({ m, ev: s.events.find((e) => e.id === m.event_id) }))
    .filter((x): x is { m: (typeof x)["m"]; ev: SocialEvent } => !!x.ev && visible(x.ev));
  const isPast = (ev: SocialEvent) => dn(ev.end_date || ev.start_date) < todayN && !ev.is_repeat;
  const pending = rows.filter((x) => x.m.status === "invited" && !isPast(x.ev)).sort((a, b) => dn(a.ev.start_date) - dn(b.ev.start_date));
  const answered = rows.filter((x) => x.m.status !== "invited").sort((a, b) => dn(b.ev.start_date) - dn(a.ev.start_date));
  const expired = rows.filter((x) => x.m.status === "invited" && isPast(x.ev));

  const answer = (id: string, status: "accepted" | "declined") => {
    const r = s.rsvp(id, status);
    if (r.ok) {
      setChanging(null);
      notify(status === "accepted" ? "حضور شما ثبت شد." : "پاسخ «نمی‌آیم» ثبت شد.", "success");
    } else notify(r.error, "warning");
  };
  const rsvpButtons = (id: string) => (
    <>
      <Button size="sm" variant="primary" icon={<Check size={13} />} onClick={() => answer(id, "accepted")}>
        می‌آیم
      </Button>
      <Button size="sm" variant="secondary" icon={<X size={13} />} onClick={() => answer(id, "declined")}>
        نمی‌آیم
      </Button>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="text-sm font-bold text-ink-900 p-3 pb-1 flex items-center gap-1.5">
          <MailQuestion size={15} className="text-amber-600" /> در انتظار پاسخ {pending.length > 0 && <Badge tone="warning">{fa(pending.length)}</Badge>}
        </p>
        {pending.length === 0 ? (
          <p className="text-xs text-ink-400 px-3 pb-3">دعوت بی‌پاسخی ندارید.</p>
        ) : (
          <div className="divide-y divide-ink-100">
            {pending.map(({ ev }) => (
              <InviteRow key={ev.id} ev={ev} from={s.userName(ev.user_id)}>
                {rsvpButtons(ev.id)}
              </InviteRow>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <p className="text-sm font-bold text-ink-900 p-3 pb-1">پاسخ‌داده‌شده</p>
        {answered.length === 0 ? (
          <p className="text-xs text-ink-400 px-3 pb-3">هنوز به دعوتی پاسخ نداده‌اید.</p>
        ) : (
          <div className="divide-y divide-ink-100">
            {answered.map(({ ev, m }) => (
              <InviteRow key={ev.id} ev={ev} from={s.userName(ev.user_id)}>
                {changing === ev.id ? (
                  rsvpButtons(ev.id)
                ) : (
                  <>
                    <Badge tone={m.status === "declined" ? "neutral" : "success"}>{eventStatusLabel[m.status]}</Badge>
                    {!isPast(ev) && (
                      <Button size="sm" variant="ghost" onClick={() => setChanging(ev.id)}>
                        تغییر پاسخ
                      </Button>
                    )}
                  </>
                )}
              </InviteRow>
            ))}
          </div>
        )}
      </div>

      {expired.length > 0 && (
        <div className="card">
          <p className="text-sm font-bold text-ink-500 p-3 pb-1">دعوت‌های منقضی (رویداد برگزار شد)</p>
          <div className="divide-y divide-ink-100 opacity-70">
            {expired.map(({ ev }) => (
              <InviteRow key={ev.id} ev={ev} from={s.userName(ev.user_id)}>
                <Badge tone="neutral">بی‌پاسخ</Badge>
              </InviteRow>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InviteRow({ ev, from, children }: { ev: SocialEvent; from: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3">
      <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: ev.poster ?? "#1f4f99" }} />
      <Link to={`/dashboard/events/${ev.id}`} className="min-w-0 flex-1 group">
        <span className="block text-[13px] font-medium text-ink-800 group-hover:text-brand-700 truncate">{ev.title}</span>
        <span className="block text-[11px] text-ink-400 truncate">
          {ev.start_date} · {ev.start_time}–{ev.end_time} · {ev.is_online ? "آنلاین" : ev.location || "حضوری"} · از طرف {from}
        </span>
      </Link>
      <div className="flex items-center gap-1.5 shrink-0">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------- ویرایشگر (EventStoreRequest)
/**
 * ایجاد/ویرایش رویداد — POST /events/events/ یا PATCH /events/events/{id}/
 * «دعوت از» پس از ذخیره با POST …/{id}/invite/ فرستاده می‌شود.
 */
export function EventEditor({ open, onClose, event, initialDate, onSaved }: { open: boolean; onClose: () => void; event?: SocialEvent | null; initialDate?: string; onSaved?: (id: string) => void }) {
  const s = useSocial();
  const { notify } = useToast();
  const [pendingInvite, setPendingInvite] = useState<{ id: string; ids: string[] } | null>(null);

  // رویداد تازه‌ساخته بعد از ثبت در انبار دعوت‌ها را می‌گیرد
  useEffect(() => {
    if (!pendingInvite || !s.events.some((x) => x.id === pendingInvite.id)) return;
    const n = s.inviteToEvent(pendingInvite.id, pendingInvite.ids);
    notify(n ? `${fa(n)} نفر به رویداد دعوت شدند.` : "همه‌ی افراد انتخاب‌شده قبلاً عضو یا دعوت‌شده بودند.", n ? "success" : "info");
    setPendingInvite(null);
  }, [pendingInvite, s, notify]);

  return (
    <Modal open={open} onClose={onClose} title={event ? "ویرایش رویداد" : "رویداد جدید"} description={event ? `PATCH /events/events/${event.id}/` : "POST /events/events/"} width="max-w-2xl">
      {open && (
        <EditorBody
          event={event ?? null}
          initialDate={initialDate}
          onCancel={onClose}
          onDone={(id, invite) => {
            if (invite.length) setPendingInvite({ id, ids: invite });
            onClose();
            onSaved?.(id);
          }}
        />
      )}
    </Modal>
  );
}

const repeatNames = weekDayNames;

function EditorBody({ event, initialDate, onCancel, onDone }: { event: SocialEvent | null; initialDate?: string; onCancel: () => void; onDone: (id: string, invite: string[]) => void }) {
  const s = useSocial();
  const { notify } = useToast();
  const d0 = initialDate || s.today;
  const [f, setF] = useState({
    title: event?.title ?? "",
    description: event?.description ?? "",
    poster: event?.poster ?? "#1f4f99",
    start_date: event?.start_date ?? d0,
    end_date: event?.end_date ?? d0,
    start_time: event?.start_time ?? "۱۰:۰۰",
    end_time: event?.end_time ?? "۱۱:۰۰",
    is_online: event?.is_online ?? false,
    meeting_link: event?.meeting_link ?? "",
    location: event?.location ?? "",
    capacity: event?.capacity ?? 0,
    is_repeat: event?.is_repeat ?? false,
    repeat_days: event?.repeat_days ?? ([] as number[]),
  });
  const [files, setFiles] = useState<Attachment[]>([]);
  const [pub, setPub] = useState<PublishState>(
    event
      ? defaultPublish({ privacy: event.privacy, category_ids: event.category_ids, tags: event.tags, is_draft: event.is_draft, add_comment: event.add_comment, show_comment: event.show_comment, send_notification: false })
      : defaultPublish(),
  );
  const [invite, setInvite] = useState<string[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  const save = () => {
    if (!f.title.trim()) return notify("عنوان رویداد را وارد کنید.", "warning");
    if (!parseJalali(f.start_date)) return notify("تاریخ شروع را انتخاب کنید.", "warning");
    const end = f.end_date && parseJalali(f.end_date) ? f.end_date : f.start_date;
    if (dn(end) < dn(f.start_date)) return notify("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.", "warning");
    if (dn(end) === dn(f.start_date) && timeKey(f.end_time) && timeKey(f.end_time) < timeKey(f.start_time)) return notify("ساعت پایان قبل از ساعت شروع است.", "warning");
    if (f.is_online && !f.meeting_link.trim()) return notify("برای رویداد آنلاین، لینک جلسه (meeting_link) لازم است.", "warning");
    if (f.is_repeat && !f.repeat_days.length) return notify("روزهای تکرار را انتخاب کنید.", "warning");
    const input: EventInput = {
      id: event?.id,
      title: f.title.trim(),
      description: f.description,
      poster: f.poster,
      start_date: f.start_date,
      end_date: end,
      start_time: f.start_time,
      end_time: f.end_time,
      is_online: f.is_online,
      meeting_link: f.is_online ? f.meeting_link.trim() : "",
      location: f.is_online ? "" : f.location.trim(),
      capacity: Math.max(0, Math.floor(Number(toEnDigits(String(f.capacity))) || 0)),
      add_comment: pub.add_comment ?? true,
      show_comment: pub.show_comment ?? true,
      is_repeat: f.is_repeat,
      repeat_days: f.is_repeat ? [...f.repeat_days].sort() : [],
      privacy: pub.privacy,
      category_ids: pub.category_ids,
      tags: pub.tags,
      is_draft: pub.is_draft,
      published_date: pub.published_date || undefined,
      published_time: pub.published_time || undefined,
      uploaded_files: files,
      send_notification: pub.send_notification,
    };
    const id = s.saveEvent(input);
    notify(event ? "رویداد به‌روزرسانی شد." : pub.is_draft ? "رویداد به‌صورت پیش‌نویس ذخیره شد." : "رویداد ایجاد و منتشر شد.", "success");
    onDone(id, invite);
  };

  return (
    <div className="space-y-4">
      <Field label="عنوان (title)">
        <input className="input-field" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="مثلاً جلسه‌ی هم‌اندیشی ماهانه" autoFocus />
      </Field>
      <Field label="توضیحات (description)">
        <textarea className="input-field min-h-[80px]" value={f.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>
      <PosterPicker value={f.poster} onChange={(poster) => set({ poster })} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="تاریخ شروع (start_date)">
          <JalaliDatePicker value={f.start_date} onChange={(v) => set({ start_date: v, end_date: dn(f.end_date) < dn(v) ? v : f.end_date })} />
        </Field>
        <Field label="تاریخ پایان (end_date)">
          <JalaliDatePicker value={f.end_date} onChange={(v) => set({ end_date: v })} />
        </Field>
        <Field label="ساعت شروع (start_time)">
          <input className="input-field" dir="ltr" value={f.start_time} onChange={(e) => set({ start_time: e.target.value })} placeholder="۱۰:۰۰" />
        </Field>
        <Field label="ساعت پایان (end_time)">
          <input className="input-field" dir="ltr" value={f.end_time} onChange={(e) => set({ end_time: e.target.value })} placeholder="۱۱:۳۰" />
        </Field>
      </div>

      <div className="rounded-lg border border-ink-100 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-ink-700 flex items-center gap-1.5">
            <Video size={13} /> برگزاری آنلاین (is_online)
          </span>
          <Toggle on={f.is_online} onChange={() => set({ is_online: !f.is_online })} label="برگزاری آنلاین" />
        </div>
        {f.is_online ? (
          <Field label="لینک جلسه (meeting_link)">
            <input className="input-field" dir="ltr" value={f.meeting_link} onChange={(e) => set({ meeting_link: e.target.value })} placeholder="https://meet.example.com/…" />
          </Field>
        ) : (
          <Field label="مکان (location)">
            <input className="input-field" value={f.location} onChange={(e) => set({ location: e.target.value })} placeholder="مثلاً سالن جلسات طبقه‌ی سوم" />
          </Field>
        )}
        <Field label="ظرفیت (capacity)" hint="۰ = بدون محدودیت">
          <input className="input-field" type="number" min={0} value={f.capacity} onChange={(e) => set({ capacity: Number(e.target.value) || 0 })} />
        </Field>
      </div>

      <div className="rounded-lg border border-ink-100 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-ink-700 flex items-center gap-1.5">
            <Repeat size={13} /> تکرار هفتگی (is_repeat)
          </span>
          <Toggle on={f.is_repeat} onChange={() => set({ is_repeat: !f.is_repeat })} label="تکرار هفتگی" />
        </div>
        {f.is_repeat && (
          <div className="flex flex-wrap gap-1.5">
            {repeatNames.map((n, i) => {
              const on = f.repeat_days.includes(i);
              return (
                <label key={n} className={`text-xs px-2.5 py-1 rounded-lg border cursor-pointer flex items-center gap-1 ${on ? "border-brand-400 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-500"}`}>
                  <input type="checkbox" className="accent-[var(--color-brand-600)]" checked={on} onChange={() => set({ repeat_days: on ? f.repeat_days.filter((x) => x !== i) : [...f.repeat_days, i] })} />
                  {n}
                </label>
              );
            })}
            <p className="w-full text-[11px] text-ink-400">repeat_days — ۰ = شنبه … ۶ = جمعه</p>
          </div>
        )}
      </div>

      {event && event.attachments.length > 0 && (
        <Field label="پیوست‌های فعلی">
          <AttachmentList items={event.attachments} />
        </Field>
      )}
      <AttachmentPicker value={files} onChange={setFiles} />
      <PublishOptions entity="event" value={pub} onChange={setPub} notifyOption={!event} />

      <div className="rounded-lg border border-ink-100 p-3">
        <button type="button" onClick={() => setShowInvite((v) => !v)} className="text-xs text-brand-700 flex items-center gap-1">
          <Plus size={13} /> دعوت از (اختیاری) {invite.length > 0 && `— ${fa(invite.length)} نفر`}
        </button>
        {showInvite && (
          <div className="mt-2">
            <UserPicker value={invite} onChange={setInvite} exclude={[s.me, ...(event ? s.eventMembersOf(event.id).map((m) => m.user_id) : [])]} />
            <p className="text-[11px] text-ink-400 mt-1">پس از ذخیره با POST /events/events/{"{id}"}/invite/ دعوت‌نامه ارسال می‌شود.</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel}>
          انصراف
        </Button>
        <Button variant="primary" onClick={save}>
          {event ? "ذخیره‌ی تغییرات" : pub.is_draft ? "ذخیره‌ی پیش‌نویس" : "ایجاد رویداد"}
        </Button>
      </div>
    </div>
  );
}
