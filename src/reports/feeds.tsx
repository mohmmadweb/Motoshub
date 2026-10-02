// پل داده‌ی استورهای «کارکرد» و «تیکت» به گزارش‌ساز — بدون import متقابل.
// ردیف‌ها با همان محدوده‌ی دیدِ صفحه‌ی خود ماژول منتشر می‌شوند (کاربر فقط داده‌ای را گزارش می‌گیرد که می‌بیند).
import { useEffect, useMemo } from "react";
import { useTenancy } from "../context/TenancyContext";
import { useTicketsMaybe } from "../context/TicketsContext";
import { useTs } from "../pages/activity/lib";
import { entryTypeLabel, isLeave, sourceLabel, teamLabel } from "../timesheet/types";
import { isBreached, statusShort, vendorById } from "../pages/tickets/model";
import { fromDayNum } from "../pm/jalali";
import { descendantsOrSelf } from "../iam/model";
import { getSource, publishSourceRows, registerSource } from "./sources";
import type { Field, Row } from "./types";

const dim = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, type: "dimension", kind: "string", ...extra });
const num = (key: string, label: string, format: Field["format"] = "number"): Field => ({ key, label, type: "measure", kind: "number", format });
const date = (key: string, label: string): Field => ({ key, label, type: "date", kind: "date" });
const flag = (key: string, label: string): Field => ({ key, label, type: "dimension", kind: "bool" });

const reviewLabel = { accepted: "پذیرفته", pending: "در انتظار بررسی", rejected: "ردشده" } as const;

function registerOnce() {
  const ts = getSource("timesheet.entries");
  if (ts)
    registerSource({
      ...ts,
      fields: [
        dim("user", "فرد"),
        dim("team", "تیم"),
        dim("project", "پروژه"),
        dim("activity", "نوع کارکرد"),
        dim("source", "منبع ثبت"),
        dim("status", "وضعیت بازبینی"),
        flag("leave", "مرخصی"),
        num("hours", "ساعت", "hours"),
        date("date", "تاریخ"),
      ],
    });
  const tk = getSource("tickets.tickets");
  if (tk)
    registerSource({
      ...tk,
      fields: [
        dim("subject", "عنوان"),
        dim("status", "وضعیت"),
        dim("priority", "اولویت", { order: ["بحرانی", "زیاد", "متوسط", "کم"] }),
        dim("severity", "شدت", { order: ["مسدودکننده", "شدید", "متوسط", "جزئی"] }),
        dim("category", "نوع"),
        dim("module", "بخش سامانه"),
        dim("assignee", "کارشناس سازنده"),
        dim("requester", "گزارش‌دهنده"),
        flag("slaBreached", "نقض SLA"),
        num("resolutionHours", "زمان حل", "hours"),
        num("satisfaction", "رضایت (از ۵)"),
        date("createdAt", "تاریخ ثبت"),
        date("closedAt", "تاریخ حل"),
      ],
    });
}

function TimesheetFeed() {
  const { ts, me, teamPeople, projectName } = useTs();
  const rows = useMemo<Row[]>(() => {
    const people = new Map([me, ...teamPeople].map((p) => [p.id, p]));
    return ts.entries
      .filter((e) => people.has(e.personId) && e.review !== "rejected")
      .map((e) => {
        const p = people.get(e.personId)!;
        return {
          id: e.id,
          user: p.name,
          team: teamLabel[p.team],
          project: projectName(e.projectId),
          activity: entryTypeLabel[e.type],
          source: sourceLabel[e.source],
          status: reviewLabel[e.review],
          leave: isLeave(e.type),
          hours: e.hours,
          date: e.date,
        } satisfies Row;
      });
  }, [ts.entries, me, teamPeople, projectName]);
  useEffect(() => publishSourceRows("timesheet.entries", rows), [rows]);
  return null;
}

function TicketsFeed() {
  const tk = useTicketsMaybe();
  const { actingUser, iam, contextId, hasPermission } = useTenancy();
  const rows = useMemo<Row[]>(() => {
    if (!tk) return [];
    const org = hasPermission("tickets.view-org") ? new Set(descendantsOrSelf(iam, contextId).map((s) => s.id)) : null;
    const day = (ts?: number) => (ts === undefined ? null : fromDayNum(Math.floor(ts / 1440)));
    return tk.tickets
      .filter((t) => tk.isVendor || t.reporterId === actingUser.id || org?.has(t.reporterScopeId))
      .map((t) => ({
        id: t.id,
        subject: t.title,
        status: statusShort[t.status],
        priority: t.priority,
        severity: t.severity,
        category: t.type,
        module: t.module,
        assignee: vendorById(t.assigneeId)?.name ?? "تخصیص‌نیافته",
        requester: t.reporterName,
        slaBreached: isBreached(t, tk.now),
        resolutionHours: t.resolvedAt !== undefined ? Math.round(((t.resolvedAt - t.createdAt) / 60) * 10) / 10 : null,
        satisfaction: t.rating?.score ?? null,
        createdAt: day(t.createdAt),
        closedAt: day(t.resolvedAt),
      }));
  }, [tk, actingUser.id, iam, contextId, hasPermission]);
  useEffect(() => publishSourceRows("tickets.tickets", rows), [rows]);
  return null;
}

/** یک‌بار داخل همه‌ی Providerها mount شود */
registerOnce();

export default function ReportFeeds() {
  return (
    <>
      <TimesheetFeed />
      <TicketsFeed />
    </>
  );
}
