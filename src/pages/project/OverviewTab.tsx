import { CalendarClock, CheckCircle2, Flag, History, ListChecks, Lock, ShieldAlert, Wallet, AlertTriangle, PiggyBank, Video } from "lucide-react";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/ui/StatCard";
import { useProjectsPM } from "../../context/ProjectsContext";
import { activeTasks, analyzeRisks, budgetUsage, isDone, isOverdue, isWaiting, kindOf, paidTotal, projectProgress, riskLevelLabel, riskTypeLabel } from "../../pm/selectors";
import { dayNum, fa, fmtShort } from "../../pm/jalali";
import { eventByCode, categoryLabel } from "../../pm/events";
import type { LifecyclePhase } from "../../pm/types";
import { Progress, SectionTitle, useProjectPage } from "./shared";

export const phases: { id: LifecyclePhase; hint: string }[] = [
  { id: "برنامه‌ریزی", hint: "تعریف هدف، زمان، بودجه و تیم" },
  { id: "اجرا", hint: "انجام تسک‌ها" },
  { id: "نظارت", hint: "بررسی پیشرفت، زمان و هزینه" },
  { id: "بررسی", hint: "بررسی کیفیت و نتایج" },
  { id: "تکمیل", hint: "پایان تسک‌ها و تحویل" },
  { id: "اختتام", hint: "گزارش نهایی و آرشیو" },
];

export default function OverviewTab() {
  const { p, pid, canEdit, refDate, openTask, goTab } = useProjectPage();
  const pm = useProjectsPM();
  const ts = activeTasks(p);
  const done = ts.filter((t) => isDone(p, t)).length;
  const doing = ts.filter((t) => ["doing", "review"].includes(kindOf(p, t.status))).length;
  const late = ts.filter((t) => isOverdue(p, t, refDate));
  const waiting = ts.filter((t) => isWaiting(p, t));
  const blocked = ts.filter((t) => kindOf(p, t.status) === "blocked");
  const paid = paidTotal(p);
  const ref = dayNum(refDate)!;
  const upcomingMeetings = p.meetings.filter((m) => m.status === "برنامه‌ریزی‌شده" && (dayNum(m.date) ?? 0) >= ref).sort((a, b) => (dayNum(a.date) ?? 0) - (dayNum(b.date) ?? 0));
  const soon = ts.filter((t) => !isDone(p, t) && (dayNum(t.due) ?? 0) >= ref && (dayNum(t.due) ?? 0) - ref <= 7).sort((a, b) => (dayNum(a.due) ?? 0) - (dayNum(b.due) ?? 0));
  const nextMs = p.milestones.filter((m) => m.status !== "انجام‌شده").sort((a, b) => (dayNum(a.due) ?? 0) - (dayNum(b.due) ?? 0))[0];
  const findings = analyzeRisks(p, refDate).slice(0, 4);
  const recent = [...p.logs].sort((a, b) => b.seq - a.seq).slice(0, 8);
  const phaseIdx = phases.findIndex((x) => x.id === p.meta.phase);

  return (
    <div className="space-y-5">
      <div className="card p-3 flex items-center gap-1 overflow-x-auto" aria-label="چرخه‌ی عمر پروژه">
        <span className="text-xs font-bold text-ink-600 ml-2 whitespace-nowrap">چرخه‌ی عمر:</span>
        {phases.map((ph, i) => (
          <button
            key={ph.id}
            disabled={!canEdit}
            onClick={() => pm.updateMeta(pid, { phase: ph.id })}
            title={canEdit ? `${ph.hint} — برای تغییر مرحله کلیک کنید` : ph.hint}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${i === phaseIdx ? "bg-brand-600 text-white font-medium" : i < phaseIdx ? "text-emerald-700 hover:bg-emerald-50" : "text-ink-400 hover:bg-ink-50"}`}
          >
            {i < phaseIdx && <CheckCircle2 size={12} />}
            {ph.id}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="تسک‌ها (انجام‌شده از کل)" value={`${fa(done)} از ${fa(ts.length)}`} hint={`${fa(doing)} در حال انجام`} icon={<ListChecks size={16} />} tone="brand" />
        <StatCard label="تسک‌های عقب‌افتاده" value={fa(late.length)} hint={`${fa(waiting.length)} منتظر پیش‌نیاز · ${fa(blocked.length)} متوقف`} icon={<AlertTriangle size={16} />} tone={late.length ? "danger" : "success"} />
        <StatCard label="بودجه‌ی باقی‌مانده" value={fmtShort(p.budget.total - paid)} hint={`از ${fmtShort(p.budget.total)} ریال`} icon={<PiggyBank size={16} />} tone={p.budget.total - paid < 0 ? "danger" : "success"} />
        <StatCard label="جلسه‌ی بعدی" value={upcomingMeetings[0] ? upcomingMeetings[0].date : "—"} hint={upcomingMeetings[0]?.title} icon={<Video size={16} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4 lg:col-span-2">
          <SectionTitle
            icon={<History size={15} className="text-brand-600" />}
            title="آخرین فعالیت‌ها"
            action={
              <button onClick={() => goTab("history")} className="text-xs text-brand-700 hover:underline">
                تاریخچه‌ی کامل ({fa(p.logs.length)})
              </button>
            }
          />
          <div className="space-y-2.5">
            {recent.map((l) => (
              <div key={l.id} className="flex gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-ink-800 leading-6">{l.description}</p>
                  <p className="text-[11px] text-ink-400">
                    {l.actor} · {l.date} {l.time} · {categoryLabel[eventByCode[l.event]?.category ?? "project"]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-xs font-bold text-ink-900 mb-2">درباره‌ی پروژه</p>
            <p className="text-xs text-ink-600 leading-6">{p.meta.description || "—"}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge tone="brand">{p.meta.category}</Badge>
              <Badge tone="neutral">اولویت: {p.meta.priority}</Badge>
              <Badge tone="neutral">{p.meta.visibility}</Badge>
              {p.meta.tags.map((t) => (
                <Badge key={t} tone="neutral">
                  #{t}
                </Badge>
              ))}
            </div>
            <div className="text-[11px] text-ink-500 mt-3 space-y-1">
              <p>کارفرما: {p.meta.client} · حامی مالی: {p.meta.sponsor}</p>
              <p>فضای کاری: {p.meta.workspace}</p>
              <p>
                بازه: {p.meta.start} تا {p.meta.deadline}
              </p>
            </div>
          </div>

          {nextMs && (
            <button onClick={() => goTab("milestones")} className="card p-4 w-full text-right hover:border-brand-300">
              <p className="text-xs font-bold text-ink-900 flex items-center gap-1">
                <Flag size={13} className="text-brand-600" /> مایل‌ستون بعدی
              </p>
              <p className="text-sm text-ink-800 mt-1.5">{nextMs.title}</p>
              <p className="text-[11px] text-ink-400 mt-1">
                سررسید {nextMs.due} · <span className={nextMs.status === "در خطر" ? "text-rose-600" : ""}>{nextMs.status}</span>
              </p>
            </button>
          )}

          <div className="card p-4">
            <p className="text-xs font-bold text-ink-900 flex items-center gap-1 mb-2">
              <CalendarClock size={13} className="text-amber-600" /> سررسیدهای ۷ روز آینده
            </p>
            {soon.map((t) => (
              <button key={t.id} onClick={() => openTask(t.id)} className="flex justify-between w-full text-xs py-1 text-ink-700 hover:text-brand-700">
                <span className="truncate">{t.title}</span>
                <span className="text-ink-400 shrink-0 mr-2">{t.due}</span>
              </button>
            ))}
            {soon.length === 0 && <p className="text-[11px] text-ink-400">—</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <SectionTitle
            icon={<ShieldAlert size={15} className="text-rose-600" />}
            title="هشدارهای تحلیل خودکار ریسک"
            action={
              <button onClick={() => goTab("risks")} className="text-xs text-brand-700 hover:underline">
                همه
              </button>
            }
          />
          {findings.map((f) => (
            <div key={f.id} className="flex items-start gap-2 py-1.5 border-b border-ink-100 last:border-0">
              <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 shrink-0 ${f.level === "critical" ? "bg-rose-600 text-white" : f.level === "high" ? "bg-rose-50 text-rose-700" : f.level === "medium" ? "bg-amber-50 text-amber-700" : "bg-ink-100 text-ink-600"}`}>{fa(f.score)}</span>
              <div className="min-w-0">
                <p className="text-xs text-ink-800">
                  {riskTypeLabel[f.riskType]} — {f.entityTitle}
                </p>
                <p className="text-[11px] text-ink-400">
                  {f.explanation} ({riskLevelLabel[f.level]})
                </p>
              </div>
            </div>
          ))}
          {findings.length === 0 && <p className="text-[11px] text-ink-400">هشداری نیست.</p>}
        </div>
        <div className="card p-4">
          <SectionTitle icon={<Lock size={15} className="text-amber-600" />} title="کارهای گیرکرده" hint="تسک‌های متوقف یا منتظر پیش‌نیاز" />
          {[...blocked, ...waiting.filter((w) => !blocked.includes(w))].slice(0, 6).map((t) => (
            <button key={t.id} onClick={() => openTask(t.id)} className="flex items-center justify-between w-full py-1.5 text-xs border-b border-ink-100 last:border-0 hover:text-brand-700">
              <span className="text-ink-800 truncate">{t.title}</span>
              <Badge tone={kindOf(p, t.status) === "blocked" ? "danger" : "warning"}>{kindOf(p, t.status) === "blocked" ? "متوقف" : "منتظر"}</Badge>
            </button>
          ))}
          {blocked.length + waiting.length === 0 && <p className="text-[11px] text-ink-400">هیچ کاری گیر نکرده است.</p>}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
              <span className="flex items-center gap-1">
                <Wallet size={12} /> مصرف بودجه در برابر پیشرفت
              </span>
              <span>
                {fa(budgetUsage(p))}٪ / {fa(projectProgress(p))}٪
              </span>
            </div>
            <Progress value={budgetUsage(p)} tone="bg-amber-500" />
            <Progress value={projectProgress(p)} className="mt-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
