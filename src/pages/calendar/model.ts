// ---------------------------------------------------------------------------
// مدل «تقویم یکپارچه» — لایه‌ها، تعطیلات رسمی ۱۴۰۵، کمکی‌های ساعت، چیدمان بلوک‌های
// هم‌پوشان و محاسبه‌ی «آزاد/مشغول» برای تقویم تیم و یافتن زمان مشترک.
// ---------------------------------------------------------------------------
import { dayNum, fromDayNum, weekdayOf, toEnDigits, fa } from "../../pm/jalali";
import { isDone } from "../../pm/selectors";
import type { ProjectState } from "../../pm/types";
import type { EventMember, SocialEvent } from "../../social/types";
import { occursOn } from "../social/EventsCalendar";

// ---------------------------------------------------------------- لایه‌ها
export type Layer = "events" | "meetings" | "tasks" | "milestones" | "sprints" | "personal" | "holidays";
export const layerOrder: Layer[] = ["events", "meetings", "tasks", "milestones", "sprints", "personal", "holidays"];
export const layerMeta: Record<Layer, { label: string; color: string }> = {
  events: { label: "رویدادها", color: "#1f4f99" },
  meetings: { label: "جلسات پروژه", color: "#7c3aed" },
  tasks: { label: "سررسید وظایف", color: "#d97706" },
  milestones: { label: "نقاط عطف", color: "#db2777" },
  sprints: { label: "اسپرینت‌ها", color: "#0d9488" },
  personal: { label: "یادآورها و بلوک‌های من", color: "#059669" },
  holidays: { label: "تعطیلات رسمی", color: "#e11d48" },
};

/** یک قلم نمایشی در تقویم (یک «وقوع» در یک روز) */
export type CalItem = {
  key: string;
  layer: Layer;
  title: string;
  day: number;
  /** دقیقه از نیمه‌شب؛ null = تمام‌روز */
  start: number | null;
  end: number | null;
  color: string;
  sub?: string;
  /** دعوت بی‌پاسخ — خط‌چین */
  tentative?: boolean;
  /** انجام‌شده/لغوشده — کم‌رنگ */
  dim?: boolean;
  link?: string;
  details?: [string, string][];
  personalId?: string;
  /** شرکت در «مشغول»؛ برای آزاد/مشغول */
  busy?: boolean;
  /** برچسب نوع در پاپ‌اوور (پیش‌فرض: نام لایه) */
  kindLabel?: string;
  /** برای خروجی ics */
  description?: string;
  location?: string;
};

// ---------------------------------------------------------------- یادآور/بلوک شخصی
export type Repeat = "none" | "daily" | "weekly";
export const repeatLabel: Record<Repeat, string> = { none: "بدون تکرار", daily: "هر روز کاری", weekly: "هر هفته" };
export type PersonalItem = {
  id: string;
  ownerId: string;
  title: string;
  date: string;
  start: string;
  end: string;
  repeat: Repeat;
  color: string;
  /** خصوصی: همکاران فقط «مشغول» می‌بینند */
  private: boolean;
  /** در آزاد/مشغول حساب شود */
  busy: boolean;
  note?: string;
};
export const personalColors = ["#059669", "#1f4f99", "#7c3aed", "#d97706", "#db2777", "#0891b2", "#64748b"];

export function personalOccursOn(p: PersonalItem, day: number): boolean {
  const s = dayNum(p.date);
  if (s === null || day < s) return false;
  if (p.repeat === "none") return day === s;
  if (p.repeat === "weekly") return (day - s) % 7 === 0;
  return weekdayOf(fromDayNum(day)) !== 6; // هر روز کاری (جز جمعه)
}

// ---------------------------------------------------------------- ساعت
/** «۰۹:۳۰» → 570 */
export function toMin(t: string | undefined): number | null {
  const m = toEnDigits(t || "").match(/(\d{1,2})\s*:\s*(\d{1,2})/);
  if (!m) return null;
  return Math.min(24 * 60, Number(m[1]) * 60 + Number(m[2]));
}
/** 570 → «۰۹:۳۰» */
export function fmtMin(m: number): string {
  const x = Math.max(0, Math.min(24 * 60, Math.round(m)));
  return `${fa(Math.floor(x / 60)).padStart(2, "۰")}:${fa(x % 60).padStart(2, "۰")}`;
}
export const fmtRange = (a: number | null, b: number | null) => (a === null ? "تمام روز" : `${fmtMin(a)}–${fmtMin(b ?? a)}`);
/** گزینه‌های ساعت هر ۱۵ دقیقه */
export const timeOptions = Array.from({ length: (22 - 6) * 4 + 1 }, (_, i) => 6 * 60 + i * 15);

export const GRID_START = 7 * 60;
export const GRID_END = 20 * 60;
export const HOUR_PX = 48;

// ---------------------------------------------------------------- تعطیلات رسمی ۱۴۰۵
/** تعطیلات خورشیدی ثابت + پیش‌بینی تعطیلات قمری ۱۴۰۵ (قطعیت با رؤیت هلال) */
export const holidays1405: { date: string; title: string; lunar?: boolean }[] = [
  { date: "۱۴۰۵/۰۱/۰۱", title: "جشن نوروز" },
  { date: "۱۴۰۵/۰۱/۰۲", title: "عید نوروز" },
  { date: "۱۴۰۵/۰۱/۰۳", title: "عید نوروز" },
  { date: "۱۴۰۵/۰۱/۰۴", title: "عید نوروز" },
  { date: "۱۴۰۵/۰۱/۱۲", title: "روز جمهوری اسلامی" },
  { date: "۱۴۰۵/۰۱/۱۳", title: "روز طبیعت" },
  { date: "۱۴۰۵/۰۱/۲۵", title: "شهادت امام جعفر صادق (ع)", lunar: true },
  { date: "۱۴۰۵/۰۳/۰۶", title: "عید سعید قربان", lunar: true },
  { date: "۱۴۰۵/۰۳/۱۴", title: "رحلت امام خمینی (ره) · عید غدیر خم" },
  { date: "۱۴۰۵/۰۳/۱۵", title: "قیام ۱۵ خرداد" },
  { date: "۱۴۰۵/۰۴/۰۳", title: "تاسوعای حسینی", lunar: true },
  { date: "۱۴۰۵/۰۴/۰۴", title: "عاشورای حسینی", lunar: true },
  { date: "۱۴۰۵/۰۵/۱۳", title: "اربعین حسینی", lunar: true },
  { date: "۱۴۰۵/۰۵/۲۱", title: "رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)", lunar: true },
  { date: "۱۴۰۵/۰۵/۲۲", title: "شهادت امام رضا (ع)", lunar: true },
  { date: "۱۴۰۵/۰۵/۳۰", title: "شهادت امام حسن عسکری (ع)", lunar: true },
  { date: "۱۴۰۵/۰۶/۰۸", title: "میلاد رسول اکرم (ص) و امام جعفر صادق (ع)", lunar: true },
  { date: "۱۴۰۵/۰۸/۲۲", title: "شهادت حضرت فاطمه زهرا (س)", lunar: true },
  { date: "۱۴۰۵/۱۰/۰۱", title: "ولادت امام علی (ع) و روز پدر", lunar: true },
  { date: "۱۴۰۵/۱۰/۱۵", title: "مبعث رسول اکرم (ص)", lunar: true },
  { date: "۱۴۰۵/۱۱/۰۳", title: "ولادت حضرت قائم (عج)", lunar: true },
  { date: "۱۴۰۵/۱۱/۲۲", title: "پیروزی انقلاب اسلامی" },
  { date: "۱۴۰۵/۱۲/۰۸", title: "شهادت امام علی (ع)", lunar: true },
  { date: "۱۴۰۵/۱۲/۱۸", title: "عید سعید فطر", lunar: true },
  { date: "۱۴۰۵/۱۲/۱۹", title: "تعطیل به مناسبت عید فطر", lunar: true },
  { date: "۱۴۰۵/۱۲/۲۹", title: "روز ملی شدن صنعت نفت" },
];
const holidayMap = new Map<number, { title: string; lunar?: boolean }>();
holidays1405.forEach((h) => {
  const d = dayNum(h.date);
  if (d === null) return;
  const prev = holidayMap.get(d);
  holidayMap.set(d, prev ? { title: `${prev.title} · ${h.title}` } : { title: h.title, lunar: h.lunar });
});
export const holidayOn = (day: number) => holidayMap.get(day);
export const isFriday = (day: number) => weekdayOf(fromDayNum(day)) === 6;
export const isOffDay = (day: number) => isFriday(day) || holidayMap.has(day);

// ---------------------------------------------------------------- گردآوری اقلام
export type CollectInput = {
  from: number;
  to: number;
  layers: Record<Layer, boolean>;
  meId: string;
  meName: string;
  events: SocialEvent[];
  eventMembers: EventMember[];
  visibleEvent: (ev: SocialEvent) => boolean;
  projects: ProjectState[];
  personal: PersonalItem[];
};

const evLink = (id: string) => `/dashboard/events/${id}`;
export const meetingLink = (pid: string, id: string) => `/dashboard/projects/${pid}?tab=minutes&focus=${id}`;
export const taskLink = (pid: string, id: string) => `/dashboard/projects/${pid}?tab=board&focus=${id}`;

/** پروژه‌هایی که کاربر در آن‌ها عضو/مدیر است */
export function myProjects(projects: ProjectState[], meId: string, meName: string) {
  return projects.filter((p) => !p.meta.archived && (p.meta.manager === meName || p.members.some((m) => m.userId === meId || m.name === meName) || p.tasks.some((t) => t.assignee === meName)));
}

export function collectItems(x: CollectInput): CalItem[] {
  const out: CalItem[] = [];
  const days: number[] = [];
  for (let d = x.from; d <= x.to; d++) days.push(d);

  // رویدادهای اجتماعی که عضو/دعوت‌شده‌ام
  if (x.layers.events) {
    const mine = new Map(x.eventMembers.filter((m) => m.user_id === x.meId && m.status !== "declined").map((m) => [m.event_id, m]));
    x.events.forEach((ev) => {
      const m = mine.get(ev.id);
      if (!m || !x.visibleEvent(ev)) return;
      days.forEach((d) => {
        if (!occursOn(ev, d)) return;
        const st = toMin(ev.start_time);
        out.push({
          key: `ev:${ev.id}:${d}`,
          layer: "events",
          title: ev.title,
          day: d,
          start: st,
          end: st === null ? null : (toMin(ev.end_time) ?? st + 60),
          color: layerMeta.events.color,
          sub: ev.is_online ? "آنلاین" : ev.location || "حضوری",
          tentative: m.status === "invited",
          link: evLink(ev.id),
          busy: m.status !== "invited",
          description: ev.description,
          location: ev.is_online ? ev.meeting_link : ev.location,
          details: [
            ["نوع", "رویداد"],
            ["وضعیت من", m.member_type === "owner" ? "برگزارکننده" : m.status === "invited" ? "دعوت‌شده (بی‌پاسخ)" : m.status === "accepted" ? "می‌آیم" : "عضو شده"],
            ["مکان", ev.is_online ? "آنلاین" : ev.location || "—"],
          ],
        });
      });
    });
  }

  const mineP = myProjects(x.projects, x.meId, x.meName);

  // جلسات پروژه که شرکت‌کننده‌ام
  if (x.layers.meetings)
    x.projects
      .filter((p) => !p.meta.archived)
      .forEach((p) =>
        p.meetings.forEach((mt) => {
          if (!mt.participants.includes(x.meName)) return;
          const d = dayNum(mt.date);
          if (d === null || d < x.from || d > x.to) return;
          const st = toMin(mt.time);
          const cancelled = mt.status === "لغوشده";
          out.push({
            key: `mt:${p.meta.id}:${mt.id}`,
            layer: "meetings",
            title: mt.title,
            day: d,
            start: st,
            end: st === null ? null : st + (mt.duration || 60),
            color: layerMeta.meetings.color,
            sub: p.meta.name,
            dim: cancelled,
            busy: !cancelled,
            link: meetingLink(p.meta.id, mt.id),
            description: mt.description,
            location: mt.mode,
            details: [
              ["پروژه", p.meta.name],
              ["نحوه‌ی برگزاری", mt.mode],
              ["وضعیت", mt.status],
              ["شرکت‌کنندگان", mt.participants.join("، ")],
            ],
          });
        }),
      );

  // سررسید وظایف من
  if (x.layers.tasks)
    mineP.forEach((p) =>
      p.tasks.forEach((t) => {
        if (t.archived || t.assignee !== x.meName) return;
        const d = dayNum(t.due);
        if (d === null || d < x.from || d > x.to) return;
        const done = isDone(p, t);
        out.push({
          key: `tk:${p.meta.id}:${t.id}`,
          layer: "tasks",
          title: t.title,
          day: d,
          start: null,
          end: null,
          color: layerMeta.tasks.color,
          sub: p.meta.name,
          dim: done,
          link: taskLink(p.meta.id, t.id),
          details: [
            ["پروژه", p.meta.name],
            ["سررسید", t.due],
            ["اولویت", t.priority],
            ["پیشرفت", done ? "انجام‌شده" : `${fa(t.progress)}٪`],
          ],
        });
      }),
    );

  // نقاط عطف پروژه‌های من
  if (x.layers.milestones)
    mineP.forEach((p) =>
      p.milestones.forEach((ms) => {
        const d = dayNum(ms.due);
        if (d === null || d < x.from || d > x.to) return;
        out.push({
          key: `ms:${p.meta.id}:${ms.id}`,
          layer: "milestones",
          title: ms.title,
          day: d,
          start: null,
          end: null,
          color: layerMeta.milestones.color,
          sub: p.meta.name,
          dim: ms.status === "انجام‌شده",
          link: `/dashboard/projects/${p.meta.id}?tab=milestones`,
          details: [
            ["پروژه", p.meta.name],
            ["وضعیت", ms.status],
            ["مسئول", ms.owner || "—"],
          ],
        });
      }),
    );

  // مرز اسپرینت‌ها
  if (x.layers.sprints)
    mineP.forEach((p) =>
      (p.sprints ?? []).forEach((sp) => {
        (
          [
            ["start", sp.start, `آغاز ${sp.name}`],
            ["end", sp.end, `پایان ${sp.name}`],
          ] as const
        ).forEach(([k, date, title]) => {
          const d = dayNum(date);
          if (d === null || d < x.from || d > x.to) return;
          out.push({
            key: `sp:${p.meta.id}:${sp.id}:${k}`,
            layer: "sprints",
            title,
            day: d,
            start: null,
            end: null,
            color: layerMeta.sprints.color,
            sub: p.meta.name,
            dim: sp.status === "تکمیل‌شده",
            link: `/dashboard/projects/${p.meta.id}?tab=sprints`,
            details: [
              ["پروژه", p.meta.name],
              ["بازه", `${sp.start} تا ${sp.end}`],
              ["هدف", sp.goal || "—"],
              ["وضعیت", sp.status],
            ],
          });
        });
      }),
    );

  // یادآورها/بلوک‌های شخصی
  if (x.layers.personal)
    x.personal
      .filter((p) => p.ownerId === x.meId)
      .forEach((p) =>
        days.forEach((d) => {
          if (!personalOccursOn(p, d)) return;
          const st = toMin(p.start);
          out.push({
            key: `pr:${p.id}:${d}`,
            layer: "personal",
            title: p.title,
            day: d,
            start: st,
            end: st === null ? null : Math.max(st + 15, toMin(p.end) ?? st + 30),
            color: p.color,
            sub: p.private ? "خصوصی" : undefined,
            busy: p.busy,
            personalId: p.id,
            description: p.note,
            details: [
              ["تکرار", repeatLabel[p.repeat]],
              ["نمایش به همکاران", p.private ? "فقط «مشغول»" : "عنوان نمایش داده می‌شود"],
              ["آزاد/مشغول", p.busy ? "مشغول" : "آزاد"],
              ...(p.note ? ([["یادداشت", p.note]] as [string, string][]) : []),
            ],
          });
        }),
      );

  if (x.layers.holidays)
    days.forEach((d) => {
      const h = holidayOn(d);
      if (h)
        out.push({
          key: `hd:${d}`,
          layer: "holidays",
          title: h.title,
          day: d,
          start: null,
          end: null,
          color: layerMeta.holidays.color,
          details: [["نوع", h.lunar ? "تعطیل رسمی (قمری — قطعیت با رؤیت هلال)" : "تعطیل رسمی"]],
        });
    });

  return out.sort((a, b) => a.day - b.day || (a.start ?? -1) - (b.start ?? -1) || a.title.localeCompare(b.title, "fa"));
}

// ---------------------------------------------------------------- آزاد/مشغول همکاران
export type BusyBlock = { key: string; day: number; start: number; end: number; title: string; source: string; link?: string };

export function busyOf(
  userId: string,
  userName: string,
  day: number,
  ctx: { events: SocialEvent[]; eventMembers: EventMember[]; projects: ProjectState[]; personal: PersonalItem[]; meId: string; canSeeEvent: (ev: SocialEvent) => boolean },
): BusyBlock[] {
  const out: BusyBlock[] = [];
  const evIds = new Set(ctx.eventMembers.filter((m) => m.user_id === userId && (m.status === "accepted" || m.status === "joined")).map((m) => m.event_id));
  ctx.events.forEach((ev) => {
    if (!evIds.has(ev.id) || ev.is_draft || !occursOn(ev, day)) return;
    const st = toMin(ev.start_time);
    if (st === null) return;
    const open = ctx.canSeeEvent(ev);
    out.push({ key: `ev:${ev.id}`, day, start: st, end: toMin(ev.end_time) ?? st + 60, title: open ? ev.title : "مشغول", source: "رویداد", link: open ? evLink(ev.id) : undefined });
  });
  ctx.projects.forEach((p) =>
    p.meetings.forEach((mt) => {
      if (mt.status === "لغوشده" || !mt.participants.includes(userName) || dayNum(mt.date) !== day) return;
      const st = toMin(mt.time);
      if (st === null) return;
      out.push({ key: `mt:${p.meta.id}:${mt.id}`, day, start: st, end: st + (mt.duration || 60), title: mt.title, source: "جلسه‌ی پروژه", link: meetingLink(p.meta.id, mt.id) });
    }),
  );
  ctx.personal.forEach((pi) => {
    if (pi.ownerId !== userId || !pi.busy || !personalOccursOn(pi, day)) return;
    const st = toMin(pi.start);
    if (st === null) return;
    out.push({ key: `pr:${pi.id}`, day, start: st, end: Math.max(st + 15, toMin(pi.end) ?? st + 30), title: pi.private && userId !== ctx.meId ? "مشغول" : pi.title, source: "بلوک شخصی" });
  });
  return out.sort((a, b) => a.start - b.start);
}

/** ساعات کاری: شنبه تا چهارشنبه ۸ تا ۱۶، پنجشنبه ۸ تا ۱۳ */
export function workHours(day: number): [number, number] {
  return weekdayOf(fromDayNum(day)) === 5 ? [8 * 60, 13 * 60] : [8 * 60, 16 * 60];
}

/** نخستین بازه‌ی آزاد مشترک در ۱۰ روز کاری آینده */
export function findCommonSlot(busyForDay: (day: number) => { start: number; end: number }[], duration: number, today: number, nowMin: number): { day: number; start: number; end: number } | null {
  let workdays = 0;
  for (let d = today; workdays < 10 && d < today + 40; d++) {
    if (isOffDay(d)) continue;
    workdays++;
    const [ws, we] = workHours(d);
    let t = ws;
    if (d === today) t = Math.max(ws, Math.ceil(nowMin / 15) * 15);
    const busy = busyForDay(d).sort((a, b) => a.start - b.start);
    for (; t + duration <= we; t += 15) {
      const clash = busy.some((b) => b.start < t + duration && b.end > t);
      if (!clash) return { day: d, start: t, end: t + duration };
    }
  }
  return null;
}

// ---------------------------------------------------------------- چیدمان بلوک‌های هم‌پوشان
export function layoutBlocks<T extends { key: string; start: number; end: number }>(items: T[]): Map<string, { col: number; cols: number }> {
  const res = new Map<string, { col: number; cols: number }>();
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  let cluster: T[] = [];
  let colsEnd: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    cluster.forEach((it) => {
      const r = res.get(it.key)!;
      res.set(it.key, { col: r.col, cols: colsEnd.length });
    });
    cluster = [];
    colsEnd = [];
    clusterEnd = -1;
  };
  sorted.forEach((it) => {
    const end = Math.max(it.end, it.start + 15);
    if (cluster.length && it.start >= clusterEnd) flush();
    let col = colsEnd.findIndex((e) => e <= it.start);
    if (col === -1) {
      col = colsEnd.length;
      colsEnd.push(end);
    } else colsEnd[col] = end;
    res.set(it.key, { col, cols: 1 });
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, end);
  });
  if (cluster.length) flush();
  return res;
}
