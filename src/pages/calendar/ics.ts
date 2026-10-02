// ---------------------------------------------------------------------------
// خروجی iCalendar (RFC 5545) — برای «افزودن به تقویم من» و خروجی بازه‌ی دیده‌شده‌ی تقویم.
// تاریخ‌های شمسی به میلادی تبدیل می‌شوند؛ منطقه‌ی زمانی Asia/Tehran (+۰۳:۳۰).
// ---------------------------------------------------------------------------
import { parseJalali, jalaliToGregorian } from "../../pm/jalali";
import type { SocialEvent } from "../../social/types";
import { toMin } from "./model";

export type IcsEvent = {
  uid: string;
  title: string;
  /** تاریخ شمسی شروع «۱۴۰۵/۰۳/۰۸» */
  date: string;
  /** تاریخ شمسی پایان (پیش‌فرض = شروع) */
  endDate?: string;
  /** دقیقه از نیمه‌شب؛ null = تمام‌روز */
  start: number | null;
  end: number | null;
  description?: string;
  location?: string;
  url?: string;
  rrule?: string;
};

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

function gDate(jalali: string): [number, number, number] | null {
  const p = parseJalali(jalali);
  return p ? jalaliToGregorian(p[0], p[1], p[2]) : null;
}
const ymd = ([y, m, d]: [number, number, number]) => `${y}${pad(m)}${pad(d)}`;
const hm = (min: number) => `${pad(Math.floor(min / 60))}${pad(min % 60)}00`;

function escapeText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** شکستن خطوط بلندتر از ۷۵ بایت (UTF-8) */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = parts.length ? 74 : 75;
    if (bytes + b > limit) {
      parts.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

/** آدرس مطلق داخل برنامه (HashRouter) */
export function appUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${window.location.pathname}#${path}`;
}

export function buildIcs(events: IcsEvent[], calName = "تقویم موتوشاب"): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Motoshub//Unified Calendar//FA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calName)}`,
    "X-WR-TIMEZONE:Asia/Tehran",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Tehran",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0330",
    "TZOFFSETTO:+0330",
    "TZNAME:+0330",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
  events.forEach((e) => {
    const s = gDate(e.date);
    if (!s) return;
    const en = gDate(e.endDate || e.date) ?? s;
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@motoshub`, `DTSTAMP:${stamp}`);
    if (e.start === null) {
      // تمام‌روز: DTEND روز بعد از آخرین روز
      const after = new Date(Date.UTC(en[0], en[1] - 1, en[2] + 1));
      lines.push(`DTSTART;VALUE=DATE:${ymd(s)}`, `DTEND;VALUE=DATE:${after.getUTCFullYear()}${pad(after.getUTCMonth() + 1)}${pad(after.getUTCDate())}`);
    } else {
      const endMin = Math.max(e.end ?? e.start + 60, e.start + 1);
      lines.push(`DTSTART;TZID=Asia/Tehran:${ymd(s)}T${hm(e.start)}`, `DTEND;TZID=Asia/Tehran:${ymd(en)}T${hm(Math.min(endMin, 23 * 60 + 59))}`);
    }
    if (e.rrule) lines.push(`RRULE:${e.rrule}`);
    lines.push(`SUMMARY:${escapeText(e.title)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const byDay = ["SA", "SU", "MO", "TU", "WE", "TH", "FR"];

/** یک رویداد اجتماعی → VEVENT (تکرار هفتگی با RRULE) */
export function socialEventToIcs(ev: SocialEvent): IcsEvent {
  const st = toMin(ev.start_time);
  const en = toMin(ev.end_time);
  const repeat = ev.is_repeat && ev.repeat_days.length > 0;
  return {
    uid: `event-${ev.id}`,
    title: ev.title,
    date: ev.start_date,
    endDate: repeat ? ev.start_date : ev.end_date || ev.start_date,
    start: st,
    end: st === null ? null : (en ?? st + 60),
    description: [ev.description, ev.is_online && ev.meeting_link ? `لینک جلسه: ${ev.meeting_link}` : ""].filter(Boolean).join("\n\n"),
    location: ev.is_online ? ev.meeting_link || "آنلاین" : ev.location,
    url: appUrl(`/dashboard/events/${ev.id}`),
    rrule: repeat ? `FREQ=WEEKLY;BYDAY=${[...ev.repeat_days].sort().map((d) => byDay[d]).join(",")}` : undefined,
  };
}
