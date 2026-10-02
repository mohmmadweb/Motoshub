// کمکی‌های مشترک صفحه‌ی «گزارش فعالیت‌های من»: داده‌ی ترکیبی کارکرد (ثبت‌ها + تایمر پروژه +
// ساعت ثابت)، محدوده‌ی دید مدیر، نام پروژه/تسک و شبیه‌ساز همگام‌سازی ابزارهای بیرونی.
import { useMemo } from "react";
import { useTenancy } from "../../context/TenancyContext";
import { useProjectsPM } from "../../context/ProjectsContext";
import { useTimesheet, type NewEntry } from "../../context/TimesheetContext";
import { addDays, dayNum, fa } from "../../pm/jalali";
import type { ProjectState } from "../../pm/types";
import {
  daysBetween,
  fixedEntries,
  inRange,
  isOffDay,
  type Integration,
  type IntegrationKind,
  type Person,
  type TimeEntry,
  type TsSettings,
} from "../../timesheet/types";

export type ProjectOpt = { id: string; name: string; color: string; tasks: { id: string; title: string; assignee: string }[] };

/** همه‌ی داده‌ای که تب‌ها لازم دارند */
export function useTs() {
  const ts = useTimesheet();
  const ten = useTenancy();
  const pm = useProjectsPM();
  const { actingUser, filterScoped, hasPermission, contextNode, contextId, iam, visibleUserIds } = ten;

  const me: Person = useMemo(
    () =>
      ts.roster.find((p) => p.userId === actingUser.id) ?? {
        id: actingUser.id,
        userId: actingUser.id,
        name: actingUser.name,
        title: actingUser.role,
        team: "staff",
        avatarColor: actingUser.avatarColor,
        leaveUsedBefore: 0,
      },
    [ts.roster, actingUser],
  );

  /** پروژه‌هایی که کاربر می‌بیند (برای ثبت زمان) */
  const myProjects: ProjectOpt[] = useMemo(() => {
    const scoped = filterScoped(pm.projects.map((p) => ({ ...p.meta, _p: p }))).map((x) => x._p);
    const member = pm.projects.filter((p) => p.members.some((m) => m.userId === actingUser.id || m.name === actingUser.name));
    const all = [...scoped, ...member.filter((p) => !scoped.includes(p))].filter((p) => !p.meta.archived);
    return all.map(toOpt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pm.projects, actingUser.id, contextId]);

  const allProjects = useMemo(() => pm.projects.map(toOpt), [pm.projects]);
  const projectName = (id?: string) => (id ? allProjects.find((p) => p.id === id)?.name ?? "پروژه‌ی حذف‌شده" : "بدون پروژه");
  const projectColor = (id?: string) => (id ? allProjects.find((p) => p.id === id)?.color ?? "#94a3b8" : "#94a3b8");
  const taskTitle = (pid?: string, tid?: string) => (pid && tid ? allProjects.find((p) => p.id === pid)?.tasks.find((t) => t.id === tid)?.title : undefined);

  /** ثبت‌های تایمر پروژه‌ها برای یک نفر (فقط‌خواندنی) */
  const projectLogs = (p: Person): TimeEntry[] =>
    pm.projects.flatMap((pr) =>
      pr.timeLogs
        .filter((l) => l.member === p.name)
        .map((l) => ({
          id: `pl-${pr.meta.id}-${l.id}`,
          personId: p.id,
          date: l.date,
          hours: l.hours,
          type: "work" as const,
          projectId: pr.meta.id,
          taskId: l.taskId,
          description: l.note || "ثبت زمان در پروژه",
          source: "timer" as const,
          review: "accepted" as const,
          createdAt: l.date,
          readOnly: true,
          aggregate: l.hours > 12,
        })),
    );

  /** همه‌ی ورودی‌های یک نفر در بازه (ثبت‌شده + تایمر پروژه + ساعت ثابت) — ردشده‌ها حذف می‌شوند */
  const entriesOf = (p: Person, start: string, end: string, opts: { pending?: boolean } = {}): TimeEntry[] => {
    const own = ts.entries.filter((e) => e.personId === p.id && inRange(e.date, start, end) && (e.review === "accepted" || (opts.pending && e.review === "pending")));
    const logs = projectLogs(p).filter((e) => inRange(e.date, start, end));
    const fixed = fixedEntries(p, ts.settings, daysBetween(start, end), ts.today, ts.entries);
    return [...own, ...logs, ...fixed];
  };

  /** کارکنانی که مدیر در کانتکست فعلی می‌بیند */
  const teamPeople: Person[] = useMemo(() => {
    if (!hasPermission("timesheet.team") && !hasPermission("timesheet.finance")) return [];
    if (contextNode.type === "system") return ts.roster;
    const scopes = new Set<string>();
    const walkDown = (id: string) => {
      scopes.add(id);
      iam.scopes.filter((s) => s.parentId === id).forEach((s) => walkDown(s.id));
    };
    walkDown(contextId);
    let cur = iam.scopes.find((s) => s.id === contextId);
    while (cur?.parentId) {
      scopes.add(cur.parentId);
      cur = iam.scopes.find((s) => s.id === cur!.parentId);
    }
    const ids = new Set(visibleUserIds());
    return ts.roster.filter((p) => (p.userId ? ids.has(p.userId) : !!p.scopeId && scopes.has(p.scopeId)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ts.roster, contextId, iam, hasPermission]);

  return { ts, ten, pm, me, myProjects, allProjects, projectName, projectColor, taskTitle, entriesOf, teamPeople };
}

const toOpt = (p: ProjectState): ProjectOpt => ({
  id: p.meta.id,
  name: p.meta.name,
  color: p.meta.color,
  tasks: p.tasks.map((t) => ({ id: t.id, title: t.title, assignee: t.assignee })),
});

/** روزهای بازه تا امروز (برای محاسبه‌ی کسری تا این لحظه) */
export function daysToDate(start: string, end: string, today: string): string[] {
  const t = dayNum(today)!;
  return daysBetween(start, end).filter((d) => dayNum(d)! <= t);
}

// ---------------------------------------------------------------- شبیه‌ساز همگام‌سازی
function rng(seedStr: string) {
  let a = 0;
  for (let i = 0; i < seedStr.length; i++) a = (Math.imul(a, 31) + seedStr.charCodeAt(i)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const defaultExternal: Record<IntegrationKind, string> = {
  gitlab: "bonyad/km-portal",
  github: "bonyad-org/km-web",
  jira: "KMS",
  clockify: "Motoshub",
  toggl: "Motoshub",
  calendar: "تقویم کاری",
};

const genericWork = ["رفع اشکال گزارش‌شده", "بازآرایی کد ماژول جستجو", "افزودن تست خودکار", "به‌روزرسانی مستندات API", "پیاده‌سازی فیلتر تاریخ", "بهبود کارایی بارگذاری صفحه"];

export type SyncResult = { entries: NewEntry[]; skipped: number; duplicates: number; days: number };

/**
 * تولید ورودی‌های واقع‌نما از ابزار بیرونی برای بازه‌ی «آخرین همگام‌سازی تا امروز»:
 * GitLab: زمان ثبت‌شده با /spend در issue (time_stats) + درخواست‌های ادغام (بر اساس قاعده)
 * GitHub: کامیت/PR/بازبینی ← زمان تخمینی با قاعده‌ی قابل تنظیم (سقف روزانه)
 * Jira: worklog ها · Clockify/Toggl: time entry ها · تقویم: جلسات پروژه‌ها
 */
export function simulateSync(
  integ: Integration,
  person: Person,
  projects: ProjectState[],
  existing: TimeEntry[],
  settings: TsSettings,
  today: string,
): SyncResult {
  const from = integ.lastSync ? integ.lastSync.split(" ")[0] : addDays(today, -7);
  const days = daysBetween(from, today).filter((d) => !isOffDay(settings, d));
  const out: NewEntry[] = [];
  const mapped = (ext: string) => integ.mappings.find((m) => m.external === ext)?.projectId || undefined;
  const externals = integ.mappings.length ? integ.mappings.map((m) => m.external) : [defaultExternal[integ.kind]];
  const pickTask = (pid: string | undefined, r: () => number) => {
    const p = projects.find((x) => x.meta.id === pid);
    if (!p || !p.tasks.length) return undefined;
    const mine = p.tasks.filter((t) => t.assignee === person.name);
    const pool = mine.length ? mine : p.tasks;
    return pool[Math.floor(r() * pool.length)];
  };
  const base = (date: string, hours: number, ext: string, desc: string, ref: string, r: () => number): NewEntry => {
    const projectId = mapped(ext);
    const t = pickTask(projectId, r);
    return {
      personId: person.id,
      date,
      hours: Math.round(hours * 4) / 4,
      type: "work",
      projectId,
      taskId: t?.id,
      description: t && !desc.includes("—") ? `${desc} — ${t.title}` : desc,
      source: integ.kind,
      review: "pending",
      externalRef: ref,
      externalProject: ext,
    };
  };

  days.forEach((date) => {
    const r = rng(`${integ.kind}|${person.id}|${date}`);
    const ext = externals[Math.floor(r() * externals.length)];
    const n = 100 + Math.floor(r() * 180);
    const work = genericWork[Math.floor(r() * genericWork.length)];
    const k = integ.kind;
    if (k === "gitlab") {
      const h = [0.5, 1, 1.5, 2, 2.5, 3][Math.floor(r() * 6)];
      out.push(base(date, h, ext, `/spend ${h}h — ${work}`, `${ext}#${n}@${date}`, r));
      if (r() < 0.5) {
        const mr = n + 7;
        out.push(base(date, integ.rule.prMinutes / 60, ext, `درخواست ادغام !${fa(mr)} — بازبینی و ادغام`, `${ext}!${mr}@${date}`, r));
      }
    } else if (k === "github") {
      const commits = 1 + Math.floor(r() * 6);
      const prs = r() < 0.35 ? 1 : 0;
      const reviews = r() < 0.4 ? 1 + Math.floor(r() * 2) : 0;
      const minutes = commits * integ.rule.commitMinutes + prs * integ.rule.prMinutes + reviews * integ.rule.reviewMinutes;
      const h = Math.min(integ.rule.maxPerDay, minutes / 60);
      const parts = [`${fa(commits)} کامیت`, prs ? `${fa(prs)} PR` : "", reviews ? `${fa(reviews)} بازبینی` : ""].filter(Boolean).join("، ");
      out.push(base(date, h, ext, `${parts} در ${ext} (تخمینی)`, `${ext}@${date}`, r));
    } else if (k === "jira") {
      const h = [1, 1.5, 2, 3, 4][Math.floor(r() * 5)];
      out.push(base(date, h, ext, `Worklog ${ext}-${n}: ${work}`, `${ext}-${n}#wl@${date}`, r));
    } else if (k === "clockify" || k === "toggl") {
      const h = [1, 2, 2.5, 3, 4][Math.floor(r() * 5)];
      out.push(base(date, h, ext, `${k === "toggl" ? "Toggl" : "Clockify"}: ${work}`, `${k}:${ext}:${date}`, r));
    } else if (k === "calendar") {
      projects.forEach((p) =>
        p.meetings
          .filter((m) => dayNum(m.date) === dayNum(date) && m.status !== "لغوشده" && m.participants.includes(person.name))
          .forEach((m) => out.push({ ...base(date, m.duration / 60, p.meta.name, `جلسه: ${m.title}`, `gcal:${p.meta.id}-${m.id}`, r), projectId: p.meta.id, taskId: undefined })),
      );
      if (r() < 0.45) out.push(base(date, 0.5, ext, "جلسه: هماهنگی روزانه‌ی تیم", `gcal:daily@${date}`, r));
    }
  });

  // حذف موارد قبلاً واردشده و علامت‌گذاری تکراری‌ها (همان روز + تسک + منبع)
  const refs = new Set(existing.filter((e) => e.personId === person.id && e.externalRef).map((e) => e.externalRef));
  let skipped = 0;
  let duplicates = 0;
  const fresh = out.filter((e) => {
    if (e.externalRef && refs.has(e.externalRef)) {
      skipped++;
      return false;
    }
    return true;
  });
  fresh.forEach((e) => {
    const dup = existing.find(
      (x) =>
        x.personId === person.id &&
        x.review !== "rejected" &&
        x.source === e.source &&
        dayNum(x.date) === dayNum(e.date) &&
        (e.taskId ? x.taskId === e.taskId : !x.taskId && x.projectId === e.projectId),
    );
    if (dup) {
      e.duplicateOf = dup.id;
      duplicates++;
    }
  });
  return { entries: fresh, skipped, duplicates, days: days.length };
}

/** خروجی CSV با BOM تا اکسل فارسی را درست نشان دهد */
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
