// ---------------------------------------------------------------------------
// موتور قاعده‌محور دستیار (نسخه‌ی نمایشی، بدون مدل زبانی): پرسش فارسی را نرمال می‌کند،
// نیت را با واژه‌های کلیدی تشخیص می‌دهد و پاسخ را از داده‌ی زنده‌ای می‌سازد که کاربر
// اجازه‌ی دیدنش را دارد (src/pages/search/liveData.ts). هر پاسخ = متن کوتاه + کارت‌های پیونددار.
// ---------------------------------------------------------------------------
import { useCallback } from "react";
import { useTenancy } from "../../context/TenancyContext";
import { useSocial } from "../../context/SocialContext";
import { useKnowledge, docSearchText } from "../../context/KnowledgeContext";
import { useTimesheet } from "../../context/TimesheetContext";
import { matchesAll, normalizeFa, queryTerms } from "../../km/text";
import { addDays, dayNum, weekdayOf } from "../../pm/jalali";
import { bucketOf, myWork } from "../../pm/myWork";
import { isDone } from "../../pm/selectors";
import { daysBetween, fmtHM, periodOf, periodStatusLabel, summarize } from "../../timesheet/types";
import { isOpen, statusShort, priorityTone } from "../tickets/model";
import { assistantSamples } from "../../data/mockDaneshmand";
import type { BadgeTone } from "../../components/ui/Badge";
import { contentLink, datePart, useVisibleData } from "../search/liveData";

export type AnswerCard = { title: string; sub?: string; to?: string; badge?: string; tone?: BadgeTone };
export type Answer = { text: string; cards?: AnswerCard[]; intent?: string };

export const INTENT_SAMPLES = [
  "کارهای عقب‌افتاده‌ی من",
  "جلسات این هفته",
  "خلاصه‌ی پروژه سامانه یکپارچه",
  "اسناد درباره‌ی امنیت اطلاعات",
  "چه کسی متخصص هوش مصنوعی است؟",
  "گزارش کارکرد این دوره",
  "تیکت‌های باز من",
  "اطلاعیه‌هایی که تأیید نکرده‌ام",
];

const fa = (n: number) => n.toLocaleString("fa-IR");
/** واژه‌های پرکاربرد که در استخراج «موضوع» حذف می‌شوند */
const STOP = new Set(["درباره", "دربارهی", "درباره ی", "در", "مورد", "زمینه", "حوزه", "ی", "از", "به", "با", "را", "که", "است", "هست", "کیست", "چه", "کسی", "کسانی", "اسناد", "سند", "مستندات", "مستند", "متخصص", "خبره", "کارشناس", "کارشناسان", "متخصصان", "خبرگان", "لطفا", "بده", "بگو", "نشان", "بده؟", "چیست", "چی", "?", "؟", "های", "ها", "مرتبط", "مربوط"]);

/** موضوعِ پس از «درباره/در زمینه/متخصص …» */
function topicOf(qn: string, anchors: string[]): string[] {
  let rest = qn;
  for (const a of anchors) {
    const i = qn.indexOf(a);
    if (i >= 0) {
      rest = qn.slice(i + a.length);
      break;
    }
  }
  return rest
    .replace(/[؟?!.،,]/g, " ")
    .split(" ")
    .map((w) => w.replace(/^ی$/, "").trim())
    .filter((w) => w.length > 1 && !STOP.has(w));
}

export function useAssistantEngine() {
  const t = useTenancy();
  const s = useSocial();
  const km = useKnowledge();
  const ts = useTimesheet();
  const v = useVisibleData();
  const me = t.actingUser;

  return useCallback(
    (question: string): Answer => {
      const qn = normalizeFa(question);
      const has = (...ws: string[]) => ws.some((w) => qn.includes(normalizeFa(w)));
      const today = t.today;
      const todayN = dayNum(today) ?? 0;
      const sampleOf = () => assistantSamples.find((x) => qn.includes(normalizeFa(x.q.slice(0, 8))) || normalizeFa(x.q).includes(qn.slice(0, 8)));

      // پرسش‌های نمونه‌ی صندوق نوآور (رفتار قبلی) وقتی عیناً پرسیده شوند
      const exact = assistantSamples.find((x) => normalizeFa(x.q) === qn);
      if (exact) return { intent: "sample", text: exact.a };

      // ------------------------------------------------ ۱) کارهای عقب‌افتاده
      if (has("عقب", "معوق", "دیرکرد", "سررسید گذشته", "overdue") && !has("تیکت")) {
        const w = myWork(v.projects, me.name);
        const late = w.open.filter((x) => bucketOf(x.t, today) === "overdue");
        if (!late.length) return { intent: "overdue", text: `هیچ کار عقب‌افتاده‌ای ندارید — ${fa(w.open.length)} کار باز دارید که سررسیدشان نگذشته.`, cards: [{ title: "کارهای من", sub: "همه‌ی کارهای باز", to: "/dashboard/my-work" }] };
        return {
          intent: "overdue",
          text: `${fa(late.length)} کار عقب‌افتاده دارید (از ${fa(w.open.length)} کار باز). قدیمی‌ترین‌ها اول:`,
          cards: late.slice(0, 8).map((x) => ({ title: `${x.t.key ? `${x.t.key} — ` : ""}${x.t.title}`, sub: `${x.p.meta.name} · سررسید ${x.t.due} (${fa(todayN - (dayNum(x.t.due) ?? todayN))} روز گذشته)`, to: `/dashboard/projects/${x.p.meta.id}?tab=board&focus=${x.t.key ?? x.t.id}`, badge: x.t.priority, tone: x.t.priority === "بحرانی" || x.t.priority === "زیاد" ? "danger" : "warning" })),
        };
      }

      // ------------------------------------------------ ۲) جلسات این هفته
      if (has("جلسه", "جلسات", "میتینگ", "رویداد") && !has("صورت جلسه")) {
        const start = addDays(today, -weekdayOf(today));
        const end = addDays(start, 6);
        const [a, b] = [dayNum(start) ?? 0, dayNum(end) ?? 0];
        const inWeek = (d?: string) => {
          const n = dayNum(d);
          return n !== null && n >= a && n <= b;
        };
        const pmMeetings = v.projects.flatMap((p) => p.meetings.filter((m) => m.status !== "لغوشده" && inWeek(m.date) && (m.participants.includes(me.name) || p.meta.manager === me.name)).map((m) => ({ p, m })));
        const events = v.events.filter((e) => inWeek(datePart(e.start_date)) && (e.user_id === s.me || ["accepted", "joined", "invited"].includes(s.myEventStatus(e.id)?.status ?? "")));
        const cards: AnswerCard[] = [
          ...pmMeetings.map(({ p, m }) => ({ title: m.title, sub: `${m.date} · ساعت ${m.time} · ${p.meta.name}`, to: `/dashboard/projects/${p.meta.id}?tab=minutes`, badge: m.mode, tone: "brand" as BadgeTone, _d: dayNum(m.date) ?? 0 })),
          ...events.map((e) => ({ title: e.title, sub: `${datePart(e.start_date)} · ${e.start_time} · ${e.is_online ? "آنلاین" : e.location}`, to: `/dashboard/events/${e.id}`, badge: "رویداد", tone: "success" as BadgeTone, _d: dayNum(datePart(e.start_date)) ?? 0 })),
        ]
          .sort((x, y) => x._d - y._d)
          .map(({ _d, ...c }) => (void _d, c));
        if (!cards.length) return { intent: "meetings", text: `در هفته‌ی جاری (${start} تا ${end}) جلسه یا رویدادی برای شما ثبت نشده است.`, cards: [{ title: "تقویم", to: "/dashboard/calendar" }] };
        return { intent: "meetings", text: `هفته‌ی جاری (${start} تا ${end}): ${fa(cards.length)} جلسه و رویداد.`, cards };
      }

      // ------------------------------------------------ ۷) تیکت‌های باز من
      if (has("تیکت")) {
        const mine = v.tickets.filter((x) => x.reporterId === me.id && isOpen(x.status));
        if (!mine.length) return { intent: "tickets", text: "تیکت بازی ندارید.", cards: [{ title: "تیکت پشتیبانی", sub: "ثبت تیکت جدید", to: "/dashboard/tickets?new=1" }] };
        return { intent: "tickets", text: `${fa(mine.length)} تیکت باز دارید:`, cards: mine.map((x) => ({ title: `${x.id} — ${x.title}`, sub: `${x.module} · اولویت ${x.priority}`, to: `/dashboard/tickets?id=${x.id}`, badge: statusShort[x.status], tone: priorityTone[x.priority] })) };
      }

      // ------------------------------------------------ ۸) اطلاعیه‌های تأییدنشده
      if (has("اطلاعیه", "بخشنامه")) {
        const pending = v.content.filter((c) => c.kind === "news" && c.announcement?.requires_ack && !c.announcement.acks[s.me] && c.is_public && !c.is_draft);
        if (!pending.length) return { intent: "acks", text: "همه‌ی اطلاعیه‌های رسمی را تأیید کرده‌اید.", cards: [{ title: "اخبار سازمان", to: "/dashboard/news" }] };
        return { intent: "acks", text: `${fa(pending.length)} اطلاعیه‌ی رسمی منتظر «خواندم و پذیرفتم» شماست:`, cards: pending.map((c) => ({ title: c.title, sub: datePart(c.published_at ?? c.created_at), to: contentLink(c.kind, c.id), badge: "نیاز به تأیید", tone: "warning" as BadgeTone })) };
      }

      // ------------------------------------------------ ۶) گزارش کارکرد
      if (has("کارکرد", "تایم شیت", "تایمشیت", "ساعت کار", "اضافه کار", "کسر کار", "مرخصی")) {
        const period = periodOf(today);
        const endD = (dayNum(period.end) ?? 0) < todayN ? period.end : today;
        const days = daysBetween(period.start, endD);
        const person = ts.personById(me.id);
        const sum = summarize(ts.entries.filter((e) => e.personId === me.id), ts.settings, days, person);
        const rec = ts.periodRecord(me.id, period.key);
        return {
          intent: "timesheet",
          text: `دوره‌ی ${period.label} (${period.start} تا ${period.end}) — تا امروز ${fmtHM(sum.worked)} کارکرد در برابر ${fmtHM(sum.expected)} موظف؛ ${sum.balance >= 0 ? `${fmtHM(sum.balance)} اضافه‌کار` : `${fmtHM(-sum.balance)} کسر کار`}.`,
          cards: [
            { title: "کارکرد ثبت‌شده", sub: `کار ${fmtHM(sum.work)} · دورکاری ${fmtHM(sum.remote)} · مأموریت ${fmtHM(sum.mission)}`, to: "/dashboard/activity", badge: periodStatusLabel[rec.status], tone: "brand" },
            { title: "مرخصی", sub: `${fmtHM(sum.leaveHours)} ساعتی · ${fa(sum.leaveDays)} روز`, to: "/dashboard/activity" },
            ...(sum.missingDays ? [{ title: `${fa(sum.missingDays)} روز کاری بدون ثبت`, sub: "برای ارسال دوره، کارکرد این روزها را کامل کنید.", to: "/dashboard/activity", badge: "ناقص", tone: "warning" as BadgeTone }] : []),
          ],
        };
      }

      // ------------------------------------------------ ۵) چه کسی متخصص … است
      if (has("متخصص", "خبره", "کارشناس", "چه کسی", "کی بلده")) {
        const topic = topicOf(qn, ["متخصص", "خبره", "کارشناس", "در زمینه", "درباره"]);
        if (!topic.length) return { intent: "experts", text: "موضوع را هم بگویید؛ مثلاً «چه کسی متخصص هوش مصنوعی است؟»", cards: [{ title: "بانک خبرگان", to: "/dashboard/knowledge?tab=experts" }] };
        const visible = new Set(v.people.map((u) => u.id));
        const expertHits = km.experts.filter((e) => matchesAll(`${e.name} ${e.title} ${e.areas.join(" ")} ${e.topics.join(" ")} ${e.experience}`, topic));
        const peopleHits = v.people.filter((u) => matchesAll(`${u.role} ${u.skills.join(" ")}`, topic) && !expertHits.some((e) => e.userId === u.id || e.name === u.name));
        const authors = new Map<string, number>();
        v.docs.filter((d) => matchesAll(docSearchText(d, false), topic)).forEach((d) => authors.set(d.owner, (authors.get(d.owner) ?? 0) + 1));
        const cards: AnswerCard[] = [
          ...expertHits.map((e) => {
            const u = v.people.find((x) => x.id === e.userId || x.name === e.name);
            return { title: e.name, sub: `${e.title} · ${e.areas.slice(0, 3).join("، ")}`, to: u && visible.has(u.id) ? `/dashboard/profile/${u.id}` : "/dashboard/knowledge?tab=experts", badge: "خبره‌ی ثبت‌شده", tone: "success" as BadgeTone };
          }),
          ...peopleHits.map((u) => ({ title: u.name, sub: `${u.role} · ${u.skills.slice(0, 3).join("، ")}`, to: `/dashboard/profile/${u.id}`, badge: "مهارت", tone: "brand" as BadgeTone })),
          ...[...authors.entries()]
            .filter(([n]) => !expertHits.some((e) => e.name === n) && !peopleHits.some((u) => u.name === n))
            .slice(0, 3)
            .map(([n, c]) => {
              const u = v.people.find((x) => x.name === n);
              return { title: n, sub: `نویسنده‌ی ${fa(c)} سند مرتبط`, to: u ? `/dashboard/profile/${u.id}` : undefined, badge: "نویسنده", tone: "neutral" as BadgeTone };
            }),
        ];
        if (!cards.length) return { intent: "experts", text: `برای «${topic.join(" ")}» خبره‌ی ثبت‌شده یا فردی با این مهارت در دید شما پیدا نشد.`, cards: [{ title: "پرسش را در پرسش و پاسخ مطرح کنید", to: "/dashboard/forum" }] };
        return { intent: "experts", text: `برای «${topic.join(" ")}» این افراد را پیدا کردم:`, cards: cards.slice(0, 8) };
      }

      // ------------------------------------------------ ۴) اسناد درباره‌ی …
      if (has("سند", "اسناد", "مستند", "دستورالعمل", "آیین نامه")) {
        const topic = topicOf(qn, ["درباره", "در مورد", "در زمینه", "اسناد", "سند", "مستندات"]);
        if (!topic.length) return { intent: "docs", text: "موضوع اسناد را بگویید؛ مثلاً «اسناد درباره‌ی امنیت اطلاعات».", cards: [{ title: "مدیریت دانش", to: "/dashboard/knowledge?tab=search" }] };
        const hits = v.docs.filter((d) => d.status !== "آرشیو" && matchesAll(docSearchText(d, true), topic));
        if (!hits.length) return { intent: "docs", text: `سندی درباره‌ی «${topic.join(" ")}» که اجازه‌ی دیدنش را داشته باشید پیدا نشد.`, cards: [{ title: "جستجوی سراسری", to: `/dashboard/search?q=${encodeURIComponent(topic.join(" "))}&tab=docs` }] };
        return {
          intent: "docs",
          text: `${fa(hits.length)} سند درباره‌ی «${topic.join(" ")}» پیدا شد${hits.length > 6 ? " (۶ مورد اول)" : ""}:`,
          cards: [
            ...hits.slice(0, 6).map((d) => ({ title: d.title, sub: `${d.code} · ${d.owner} · ${d.status}`, to: `/dashboard/knowledge?doc=${d.id}`, badge: d.access, tone: (d.access === "محرمانه" || d.access === "خیلی محرمانه" ? "danger" : "neutral") as BadgeTone })),
            ...(hits.length > 6 ? [{ title: "همه‌ی نتایج", to: `/dashboard/search?q=${encodeURIComponent(topic.join(" "))}&tab=docs` }] : []),
          ],
        };
      }

      // ------------------------------------------------ ۳) خلاصه‌ی پروژه X
      if (has("پروژه")) {
        const words = qn.split(" ").filter((w) => w.length > 2 && !["پروژه", "خلاصه", "خلاصهی", "وضعیت", "گزارش", "چی", "شد"].includes(w));
        const scored = v.projects
          .map((p) => {
            const name = normalizeFa(`${p.meta.name} ${p.meta.key ?? ""}`);
            return { p, score: words.filter((w) => name.includes(w)).length };
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score);
        const p = scored[0]?.p;
        if (!p) {
          const smp = sampleOf();
          if (smp) return { intent: "sample", text: smp.a };
          const mine = v.projects.filter((x) => !x.meta.archived && (x.meta.manager === me.name || x.members.some((m) => m.userId === me.id || m.name === me.name)));
          return { intent: "project", text: "نام پروژه را پیدا نکردم. پروژه‌های شما:", cards: mine.slice(0, 8).map((x) => ({ title: x.meta.name, sub: `${x.meta.phase} · سلامت ${x.meta.health}`, to: `/dashboard/projects/${x.meta.id}` })) };
        }
        const tasks = p.tasks.filter((x) => !x.archived);
        const done = tasks.filter((x) => isDone(p, x)).length;
        const late = tasks.filter((x) => !isDone(p, x) && (dayNum(x.due) ?? 9e9) < todayN);
        const risks = p.risks.filter((r) => r.status !== "بسته");
        const nextMs = p.milestones.filter((m) => m.status !== "انجام‌شده").sort((a, b) => (dayNum(a.due) ?? 9e9) - (dayNum(b.due) ?? 9e9))[0];
        const spent = p.expenses.filter((e) => e.status === "تأییدشده" || e.status === "پرداخت‌شده").reduce((a, e) => a + e.amount, 0);
        const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
        return {
          intent: "project",
          text: `«${p.meta.name}» — فاز ${p.meta.phase}، سلامت ${p.meta.health}. ${fa(done)} از ${fa(tasks.length)} کار انجام شده (${fa(pct)}٪)؛ ${fa(late.length)} کار عقب‌افتاده و ${fa(risks.length)} ریسک باز. مهلت: ${p.meta.deadline}.`,
          cards: [
            { title: "بورد پروژه", sub: `مدیر: ${p.meta.manager}`, to: `/dashboard/projects/${p.meta.id}`, badge: p.meta.health, tone: p.meta.health === "سبز" ? "success" : p.meta.health === "زرد" ? "warning" : "danger" },
            ...(nextMs ? [{ title: `نقطه‌ی عطف بعدی: ${nextMs.title}`, sub: `سررسید ${nextMs.due}`, to: `/dashboard/projects/${p.meta.id}?tab=milestones`, badge: nextMs.status, tone: (nextMs.status === "در خطر" ? "danger" : "neutral") as BadgeTone }] : []),
            ...(p.budget.total ? [{ title: "بودجه", sub: `مصرف ${fa(Math.round((spent / p.budget.total) * 100))}٪ از کل`, to: `/dashboard/projects/${p.meta.id}?tab=budget` }] : []),
            ...late.slice(0, 3).map((x) => ({ title: `${x.key ? `${x.key} — ` : ""}${x.title}`, sub: `${x.assignee} · سررسید ${x.due}`, to: `/dashboard/projects/${p.meta.id}?tab=board&focus=${x.key ?? x.id}`, badge: "عقب‌افتاده", tone: "danger" as BadgeTone })),
          ],
        };
      }

      // ------------------------------------------------ پرسش‌های نمونه‌ی قبلی (صندوق نوآور)
      const sample = sampleOf();
      if (sample) return { intent: "sample", text: sample.a };

      // ------------------------------------------------ جستجوی عمومی به‌عنوان آخرین راه
      const terms = queryTerms(question).filter((w) => w.length > 1 && !STOP.has(w));
      if (terms.length) {
        const docHits = v.docs.filter((d) => matchesAll(docSearchText(d, false), terms)).length;
        const contentHits = v.content.filter((c) => matchesAll(`${c.title} ${c.excerpt}`, terms)).length;
        if (docHits || contentHits)
          return { intent: "search", text: `این پرسش را نشناختم، اما ${fa(docHits)} سند و ${fa(contentHits)} مطلب مرتبط پیدا شد.`, cards: [{ title: `جستجوی «${terms.join(" ")}»`, to: `/dashboard/search?q=${encodeURIComponent(terms.join(" "))}` }] };
      }
      return {
        intent: "help",
        text: "در نسخه‌ی نمایشی، دستیار این پرسش‌ها را از داده‌ی زنده‌ی سامانه پاسخ می‌دهد: کارهای عقب‌افتاده، جلسات این هفته، خلاصه‌ی یک پروژه، اسناد درباره‌ی یک موضوع، متخصص یک حوزه، گزارش کارکرد دوره، تیکت‌های باز و اطلاعیه‌های تأییدنشده.",
      };
    },
    [t, s, km, ts, v, me]
  );
}
