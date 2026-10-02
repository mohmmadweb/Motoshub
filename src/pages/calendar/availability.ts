// ---------------------------------------------------------------------------
// تشخیص هم‌پوشانی و «پیدا کردن زمان مشترک» — مشترک بین فرم جلسه‌ی پروژه، فرم رویداد و ساخت سریع تقویم.
// منابع مشغولی هر نفر: جلسات پروژه (با تکرار)، رویدادهایی که پذیرفته، بلوک‌های شخصی «مشغول»،
// مرخصی‌های ثبت‌شده در کارکرد (تایم‌شیت) و تعطیلات رسمی (src/pm/holidays.ts).
// توابع خالص‌اند؛ useAvailability داده‌ی زنده‌ی انبارها را به آن‌ها می‌دهد.
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import { users } from "../../data/mock";
import { useSocial } from "../../context/SocialContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useTimesheet } from "../../context/TimesheetContext";
import { useTenancy } from "../../context/TenancyContext";
import { dayNum, fa, fromDayNum, weekdayOf, weekDayNames } from "../../pm/jalali";
import { holidayOn as officialHoliday } from "../../pm/holidays";
import type { ProjectState } from "../../pm/types";
import type { EventMember, SocialEvent } from "../../social/types";
import type { Person as TsPerson, TimeEntry } from "../../timesheet/types";
import { useEventVisibility } from "../social/EventsCalendar";
import { busyOf, fmtRange, type PersonalItem } from "./model";
import { usePersonalItems } from "./store";

// ---------------------------------------------------------------- انواع
/** شرکت‌کننده: شناسه‌ی کاربر (اگر کاربر سامانه است) + نام نمایشی */
export type Attendee = { id?: string; name: string };
export type BusyKind = "meeting" | "event" | "personal" | "leave";
export type BusyItem = { key: string; kind: BusyKind; person: string; title: string; start: number; end: number };

export type AvailabilityCtx = {
  events: SocialEvent[];
  eventMembers: EventMember[];
  projects: ProjectState[];
  personal: PersonalItem[];
  timeEntries: TimeEntry[];
  roster: TsPerson[];
  meId: string;
  canSeeEvent: (ev: SocialEvent) => boolean;
};

export type ConflictReport = {
  items: BusyItem[];
  /** افرادی که در این بازه جلسه/رویداد دارند */
  meeting: string[];
  /** افرادی که فقط بلوک شخصی «مشغول» دارند */
  busy: string[];
  /** افرادی که مرخصی‌اند */
  leave: string[];
  /** تعطیل رسمی یا جمعه */
  holiday?: string;
};

export type Slot = { day: number; date: string; start: number; end: number };

export type WorkPolicy = { start: number; end: number; thursday: boolean; thursdayEnd: number };
/** ساعات کاری پیش‌فرض: شنبه تا چهارشنبه ۸ تا ۱۶، پنجشنبه تعطیل */
export const defaultWorkPolicy: WorkPolicy = { start: 8 * 60, end: 16 * 60, thursday: false, thursdayEnd: 13 * 60 };

// ---------------------------------------------------------------- شرکت‌کنندگان
export function attendeeFromName(name: string, projectMembers?: { name: string; userId?: string }[]): Attendee {
  const m = projectMembers?.find((x) => x.name === name);
  const u = users.find((x) => x.name === name);
  return { id: m?.userId ?? u?.id, name };
}
export function attendeeFromId(id: string): Attendee {
  const u = users.find((x) => x.id === id);
  return { id, name: u?.name ?? id };
}

// ---------------------------------------------------------------- مشغولی یک نفر در یک روز
function leavesOf(att: Attendee, day: number, ctx: AvailabilityCtx, policy: WorkPolicy): BusyItem[] {
  const person = ctx.roster.find((p) => (att.id && (p.userId === att.id || p.id === att.id)) || p.name === att.name);
  const pid = person?.id ?? att.id;
  if (!pid) return [];
  return ctx.timeEntries
    .filter((e) => e.personId === pid && e.review !== "rejected" && (e.type === "leave_daily" || e.type === "leave_hourly") && dayNum(e.date) === day)
    .map((e) =>
      e.type === "leave_daily"
        ? { key: `lv:${e.id}`, kind: "leave" as const, person: att.name, title: "مرخصی روزانه", start: 0, end: 24 * 60 }
        : // زمانِ مرخصی ساعتی ثبت نمی‌شود؛ پایان روز کاری فرض می‌شود
          { key: `lv:${e.id}`, kind: "leave" as const, person: att.name, title: `مرخصی ساعتی (${fa(e.hours)} ساعت)`, start: Math.max(policy.start, policy.end - Math.round(e.hours * 60)), end: policy.end },
    );
}

/** همه‌ی بلوک‌های مشغول یک نفر در یک روز. exclude: کلیدهایی که نادیده گرفته می‌شوند (مثل خود جلسه‌ای که ویرایش می‌شود) */
export function busyForDay(att: Attendee, day: number, ctx: AvailabilityCtx, exclude: string[] = [], policy: WorkPolicy = defaultWorkPolicy): BusyItem[] {
  const skip = (k: string) => exclude.some((x) => k === x || k.startsWith(`${x}:`));
  const base = busyOf(att.id ?? `name:${att.name}`, att.name, day, ctx)
    .filter((b) => !skip(b.key))
    .map<BusyItem>((b) => ({ key: b.key, kind: b.source === "رویداد" ? "event" : b.source === "جلسه‌ی پروژه" ? "meeting" : "personal", person: att.name, title: b.title, start: b.start, end: b.end }));
  return [...base, ...leavesOf(att, day, ctx, policy)].sort((a, b) => a.start - b.start);
}

export function offDayReason(day: number, policy: WorkPolicy = defaultWorkPolicy): string | undefined {
  const wd = weekdayOf(fromDayNum(day));
  const h = officialHoliday(day);
  if (h) return `تعطیل رسمی: ${h.title}`;
  if (wd === 6) return "جمعه";
  if (wd === 5 && !policy.thursday) return "پنجشنبه (غیرکاری)";
  return undefined;
}

// ---------------------------------------------------------------- هم‌پوشانی
export function conflictsAt(attendees: Attendee[], date: string, start: number, end: number, ctx: AvailabilityCtx, exclude: string[] = []): ConflictReport {
  const day = dayNum(date);
  const r: ConflictReport = { items: [], meeting: [], busy: [], leave: [] };
  if (day === null || end <= start) return r;
  const h = officialHoliday(day);
  if (h) r.holiday = h.title;
  else if (weekdayOf(fromDayNum(day)) === 6) r.holiday = "جمعه";
  const seen = new Set<string>();
  attendees.forEach((a) => {
    const k = a.id ?? a.name;
    if (seen.has(k)) return;
    seen.add(k);
    const hits = busyForDay(a, day, ctx, exclude).filter((b) => b.start < end && b.end > start);
    r.items.push(...hits);
    if (hits.some((b) => b.kind === "leave")) r.leave.push(a.name);
    else if (hits.some((b) => b.kind === "meeting" || b.kind === "event")) r.meeting.push(a.name);
    else if (hits.length) r.busy.push(a.name);
  });
  return r;
}

export const hasConflict = (r: ConflictReport) => r.meeting.length + r.busy.length + r.leave.length > 0 || !!r.holiday;

/** «۲ نفر در این زمان جلسه دارند / ۱ نفر مرخصی است» */
export function conflictText(r: ConflictReport): string {
  const parts: string[] = [];
  if (r.holiday) parts.push(`این روز ${r.holiday.startsWith("جمعه") ? "جمعه است" : `تعطیل است (${r.holiday})`}`);
  if (r.meeting.length) parts.push(`${fa(r.meeting.length)} نفر در این زمان جلسه دارند`);
  if (r.busy.length) parts.push(`${fa(r.busy.length)} نفر در این زمان مشغول‌اند`);
  if (r.leave.length) parts.push(`${fa(r.leave.length)} نفر مرخصی ${r.leave.length > 1 ? "هستند" : "است"}`);
  return parts.join(" / ");
}

export const busyKindLabel: Record<BusyKind, string> = { meeting: "جلسه‌ی پروژه", event: "رویداد", personal: "بلوک شخصی", leave: "مرخصی" };

// ---------------------------------------------------------------- زمان مشترک
/**
 * نخستین N بازه‌ی آزاد مشترک در ساعات کاری (پیش‌فرض شنبه تا چهارشنبه ۸ تا ۱۶)، از روز fromDay به بعد.
 * بازه‌ها با هم هم‌پوشانی ندارند؛ امروز از ساعت فعلی (گردشده به ۱۵ دقیقه) شروع می‌شود.
 */
export function findSlots(
  attendees: Attendee[],
  duration: number,
  ctx: AvailabilityCtx,
  opts: { fromDay: number; todayN: number; nowMin: number; count?: number; exclude?: string[]; policy?: WorkPolicy; horizon?: number },
): Slot[] {
  const policy = opts.policy ?? defaultWorkPolicy;
  const count = opts.count ?? 3;
  const out: Slot[] = [];
  const dur = Math.max(15, duration);
  let workdays = 0;
  for (let d = Math.max(opts.fromDay, opts.todayN); out.length < count && workdays < (opts.horizon ?? 20) && d < opts.todayN + 90; d++) {
    if (offDayReason(d, policy)) continue;
    workdays++;
    const wd = weekdayOf(fromDayNum(d));
    const ws = policy.start;
    const we = wd === 5 ? policy.thursdayEnd : policy.end;
    let t = ws;
    if (d === opts.todayN) t = Math.max(ws, Math.ceil(opts.nowMin / 15) * 15);
    const busy = attendees.flatMap((a) => busyForDay(a, d, ctx, opts.exclude ?? [], policy));
    while (t + dur <= we && out.length < count) {
      const clash = busy.filter((b) => b.start < t + dur && b.end > t);
      if (!clash.length) {
        out.push({ day: d, date: fromDayNum(d), start: t, end: t + dur });
        t += dur;
      } else t = Math.max(t + 15, Math.ceil(Math.max(...clash.map((b) => b.end)) / 15) * 15);
    }
  }
  return out;
}

export const slotLabel = (s: Slot) => `${weekDayNames[weekdayOf(s.date)]} ${s.date} · ${fmtRange(s.start, s.end)}`;

// ---------------------------------------------------------------- هوک
export function useAvailability() {
  const social = useSocial();
  const pm = useProjectsPM();
  const ts = useTimesheet();
  const { actingUser, today } = useTenancy();
  const canSeeEvent = useEventVisibility();
  const personal = usePersonalItems();
  const ctx: AvailabilityCtx = {
    events: social.events,
    eventMembers: social.eventMembers,
    projects: pm.projects.filter((p) => !p.meta.archived),
    personal,
    timeEntries: ts.entries,
    roster: ts.roster,
    meId: actingUser.id,
    canSeeEvent,
  };
  const todayN = dayNum(today) ?? 0;
  return useMemo(
    () => ({
      ctx,
      todayN,
      check: (attendees: Attendee[], date: string, start: number, end: number, exclude?: string[]) => conflictsAt(attendees, date, start, end, ctx, exclude),
      suggest: (attendees: Attendee[], duration: number, o: { fromDate?: string; exclude?: string[]; count?: number; policy?: WorkPolicy } = {}) => {
        const now = new Date();
        return findSlots(attendees, duration, ctx, { fromDay: Math.max(todayN, dayNum(o.fromDate) ?? todayN), todayN, nowMin: now.getHours() * 60 + now.getMinutes(), exclude: o.exclude, count: o.count, policy: o.policy });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [social.events, social.eventMembers, pm.projects, personal, ts.entries, ts.roster, actingUser.id, todayN],
  );
}
